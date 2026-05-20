// VoiceCall.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import { formatCallDuration, callService } from '@/utils/callService';
import { WebView } from 'react-native-webview';
import { Audio as ExpoAudio } from 'expo-av';

import { supabase } from '@/app/integrations/supabase/client';

// Sound files
const outgoingSound = require('@/assets/outgoing.mp3');
const ringtoneSound = require('@/assets/ringtone.mp3');
const notOnlineSound = require('@/assets/notonline.mp3');

type IncomingMeta = { callId: string; from: string; callType: 'voice' };

export default function VoiceCallScreen() {
  const params = useLocalSearchParams() as any;
  const { remoteUserId: paramRemoteUserId, callDirection, callId: incomingCallId } = params || {};

  const [isReady, setIsReady] = useState(false);
  const [localStream, setLocalStream] = useState<any | null>(null);
  const [remoteStream, setRemoteStream] = useState<any | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRinging, setIsRinging] = useState(callDirection === 'outgoing' || callDirection === 'incoming');
  const [incomingMeta, setIncomingMeta] = useState<IncomingMeta | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar?: string } | null>(null);
  const timerRef = useRef<number | null>(null);
  const webViewRef = useRef<any>(null);
  const currentSoundRef = useRef<ExpoAudio.Sound | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [otherParticipantJoined, setOtherParticipantJoined] = useState(false);

  // Sound management functions
  const playSound = async (soundFile: any, loop: boolean = true) => {
    try {
      console.log('[VoiceCall] Playing sound, loop:', loop);
      // Stop current sound
      if (currentSoundRef.current) {
        await currentSoundRef.current.unloadAsync();
      }

      // Load and play new sound
      const { sound } = await ExpoAudio.Sound.createAsync(soundFile, {
        shouldPlay: true,
        isLooping: loop,
      });
      currentSoundRef.current = sound;
      console.log('[VoiceCall] Sound started, looping:', loop);
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  };

  const stopSound = async () => {
    try {
      console.log('[VoiceCall] Stopping sound');
      if (currentSoundRef.current) {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
        currentSoundRef.current = null;
        console.log('[VoiceCall] Sound stopped');
      }
    } catch (error) {
      console.warn('Error stopping sound:', error);
    }
  };

  // init callService with supabase & current user
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[VoiceCall] Initializing callService');
        const userResp = await supabase.auth.getUser();
        const currentUser = (userResp as any)?.data?.user || (userResp as any)?.user;
        if (!currentUser || !currentUser.id) {
          console.warn('[VoiceCall] No authenticated user found for callService init.');
        } else {
          console.log('[VoiceCall] User authenticated, initializing callService with userId:', currentUser.id);
          callService.init(supabase, currentUser.id, {
            onStateChange: (s: any) => {
              console.log('[VoiceCall] State change:', s);
              if (!mounted) return;
              if (s.localStream) {
                console.log('[VoiceCall] Local stream updated');
                setLocalStream(s.localStream);
              }
              if (s.remoteStream) {
                console.log('[VoiceCall] Remote stream updated');
                setRemoteStream(s.remoteStream);
              }
              if (typeof s.isConnected === 'boolean') {
                console.log('[VoiceCall] Connection state:', s.isConnected);
                setIsConnected(s.isConnected);
                setIsRinging(!s.isConnected && s.isRinging);
              }
              if (s.callStartTime) {
                console.log('[VoiceCall] Call started, starting timer');
                if (timerRef.current) clearInterval(timerRef.current);
                setCallDuration(0);
                timerRef.current = setInterval(() => {
                  setCallDuration((prev) => prev + 1);
                }, 1000) as unknown as number;
              }
              if (s.isRinging !== undefined) {
                console.log('[VoiceCall] Ringing state:', s.isRinging);
                setIsRinging(s.isRinging);
              }
              if (s.roomUrl) {
                console.log('[VoiceCall] Room URL received:', s.roomUrl);
                setRoomUrl(s.roomUrl);
              }
            },
            onIncomingCall: (meta: IncomingMeta) => {
              console.log('[VoiceCall] Incoming call:', meta);
              if (!mounted) return;
              setIncomingMeta(meta);
              setIsRinging(true);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            },
          });
        }
      } catch (e) {
        console.error('[VoiceCall] callService init error', e);
      } finally {
        if (mounted) {
          console.log('[VoiceCall] Init complete, setting ready');
          setIsReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try {
        callService.endCall(true);
      } catch (e) {}
    };
  }, []);

  // Auto-start outgoing call
  useEffect(() => {
    if (!isReady) return;
    console.log('[VoiceCall] Auto-start effect triggered, direction:', callDirection, 'remoteUserId:', paramRemoteUserId);
    (async () => {
      if (callDirection === 'outgoing' && paramRemoteUserId) {
        console.log('[VoiceCall] Starting outgoing voice call');
        try {
          await callService.startCall(paramRemoteUserId, 'voice');
          console.log('[VoiceCall] Outgoing call started successfully');
        } catch (e) {
          console.error('[VoiceCall] startCall error', e);
          Alert.alert('Call error', 'Unable to start voice call.');
          router.back();
        }
      } else if (callDirection === 'incoming' && incomingCallId) {
        console.log('[VoiceCall] Setting up incoming call meta');
        setIncomingMeta({ callId: incomingCallId, from: paramRemoteUserId || 'unknown', callType: 'voice' });
        setIsRinging(true);
      }
    })();
  }, [isReady, callDirection, paramRemoteUserId, incomingCallId]);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      const userId = paramRemoteUserId || incomingMeta?.from;
      if (!userId) return;

      try {
        console.log('[VoiceCall] Fetching user profile for:', userId);
        const { data, error } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', userId)
          .single();

        if (error) {
          console.warn('[VoiceCall] Error fetching user profile:', error);
        } else if (data) {
          setUserProfile({
            name: data.name || 'Unknown User',
            avatar: data.avatar_url,
          });
          console.log('[VoiceCall] User profile loaded:', data);
        }
      } catch (e) {
        console.warn('[VoiceCall] Failed to fetch user profile:', e);
      }
    };

    fetchUserProfile();
  }, [paramRemoteUserId, incomingMeta?.from]);

  // Handle call sounds and timeout
  useEffect(() => {
    console.log('[VoiceCall] Sound useEffect - isRinging:', isRinging, 'direction:', callDirection, 'otherJoined:', otherParticipantJoined);
    if (isRinging && callDirection === 'outgoing' && !otherParticipantJoined) {
      console.log('[VoiceCall] Playing outgoing sound');
      // Play outgoing sound for outgoing calls
      playSound(outgoingSound);

      // Set 30-second timeout for unanswered calls
      callTimeoutRef.current = setTimeout(() => {
        console.log('Call timeout - no answer after 30 seconds');
        playSound(notOnlineSound, false); // Play not online sound once
        setTimeout(() => {
          handleEndCall(); // End call after sound plays
        }, 2000);
      }, 30000);
    } else if (isRinging && callDirection === 'incoming' && !otherParticipantJoined) {
      console.log('[VoiceCall] Playing ringtone');
      // Play ringtone for incoming calls
      playSound(ringtoneSound);

      // Set 30-second timeout for unanswered incoming calls
      callTimeoutRef.current = setTimeout(() => {
        console.log('Incoming call timeout - no answer after 30 seconds');
        stopSound();
        handleDecline(); // Decline the call after timeout
      }, 30000);
    } else if (otherParticipantJoined) {
      console.log('[VoiceCall] Other participant joined, stopping sound');
      // Stop sound when other participant joins (answers)
      stopSound();
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    }

    // Stop sound and clear timeout when component unmounts
    return () => {
      console.log('[VoiceCall] Cleaning up sounds');
      stopSound();
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    };
  }, [isRinging, callDirection, otherParticipantJoined]);

  // Accept incoming call
  const handleAccept = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const id = incomingMeta?.callId;
      if (!id) {
        Alert.alert('No call to accept');
        return;
      }
      await callService.acceptCall(id);
      setIsRinging(false);
    } catch (e) {
      console.error('acceptCall error', e);
      Alert.alert('Error', 'Failed to accept call.');
    }
  };

  // Decline incoming call
  const handleDecline = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      // Note: sendSignal method signature is (callId, senderId, receiverId, type, data)
      // We need to get current user ID for sender
      const userResp = await supabase.auth.getUser();
      const currentUser = (userResp as any)?.data?.user || (userResp as any)?.user;
      if (currentUser?.id) {
        await callService.sendSignal(incomingMeta!.callId, currentUser.id, incomingMeta!.from, 'control', { action: 'decline' }).catch(() => {});
      }
      await callService.endCall();
    } catch (e) {
      console.warn('decline error', e);
    } finally {
      setIsRinging(false);
      router.back();
    }
  };

  // End call
  const handleEndCall = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await callService.endCall();
    } catch (e) {
      console.warn('endCall error', e);
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
      router.back();
    }
  };

  // Toggle mute
  const handleToggleMute = async () => {
    try {
      const next = !isMuted;
      setIsMuted(next);
      await callService.toggleMute(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('toggleMute error', e);
    }
  };

  // Toggle speaker
  const handleToggleSpeaker = async () => {
    try {
      const next = !isSpeakerOn;
      setIsSpeakerOn(next);
      await callService.toggleSpeaker(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('toggleSpeaker error', e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Voice Call UI */}
      <View style={styles.voiceContainer}>
        {roomUrl && (callDirection === 'outgoing' || !isRinging) ? (
          <WebView
            ref={webViewRef}
            source={{ uri: roomUrl }}
            style={styles.webView}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onLoadEnd={() => {
              console.log('[VoiceCall] WebView loaded, injecting join script');
              // Inject JavaScript to automatically join and monitor participants
              const script = `
                console.log('[Daily] Script injected, waiting to join');
                // Auto-join the room
                setTimeout(() => {
                  console.log('[Daily] Looking for join button');
                  let joinButton = document.querySelector('[data-testid="join-button"]') ||
                                document.querySelector('button[data-cy="join-button"]') ||
                                document.querySelector('button.join-button') ||
                                document.querySelector('button[data-testid*="join"]');

                  if (!joinButton) {
                    const buttons = document.querySelectorAll('button');
                    console.log('[Daily] Found', buttons.length, 'buttons');
                    for (let btn of buttons) {
                      const text = btn.textContent.toLowerCase();
                      console.log('[Daily] Button text:', text);
                      if (text.includes('join') || text.includes('start') ||
                          text.includes('enter') || text.includes('continue')) {
                        joinButton = btn;
                        break;
                      }
                    }
                  }

                  if (joinButton) {
                    console.log('[Daily] Found join button, clicking');
                    joinButton.click();

                    // Monitor for other participants joining
                    setTimeout(() => {
                      const checkParticipants = () => {
                        // Try to find participant count or video elements
                        const videos = document.querySelectorAll('video');
                        const participantElements = document.querySelectorAll('[data-participant-id], .participant, [class*="participant"]');
                        console.log('[Daily] Videos:', videos.length, 'Participants:', participantElements.length);

                        // If we find more than 1 video or participant element, someone joined
                        if (videos.length > 1 || participantElements.length > 1) {
                          console.log('[Daily] Other participant joined');
                          window.ReactNativeWebView.postMessage('participant_joined');
                          return;
                        }

                        // Check again in 1 second
                        setTimeout(checkParticipants, 1000);
                      };

                      checkParticipants();
                    }, 2000);
                  } else {
                    console.log('[Daily] No join button found');
                  }
                }, 1500);
              `;
  
              webViewRef.current?.injectJavaScript(script);
            }}
            onMessage={(event) => {
              console.log('[VoiceCall] WebView message:', event.nativeEvent.data);
              if (event.nativeEvent.data === 'participant_joined') {
                console.log('Other participant joined the call');
                setOtherParticipantJoined(true);
                stopSound();
              }
            }}
          />
        ) : (
          <View style={styles.callerInfo}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {userProfile?.avatar ? (
                <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <IconSymbol name="person.fill" size={60} color={colors.card} />
                </View>
              )}
            </View>

            {/* Name and Status */}
            <Text style={styles.callerName}>
              {userProfile?.name || incomingMeta?.from || paramRemoteUserId || 'Unknown User'}
            </Text>
            <Text style={styles.callStatus}>
              {isRinging ? (callDirection === 'outgoing' ? 'Outgoing...' : 'Incoming voice call') : 'Voice Call'}
            </Text>
          </View>
        )}
      </View>

      {/* Header info */}
      <View style={styles.topBar}>
        <View style={styles.topInfo}>
          <Text style={styles.userText}>{userProfile?.name || incomingMeta?.from || paramRemoteUserId || 'Unknown'}</Text>
          {isConnected ? (
            <Text style={styles.durationText}>{formatCallDuration(callDuration)}</Text>
          ) : (
            <Text style={styles.statusText}>
              {isRinging ? (callDirection === 'outgoing' ? 'Outgoing...' : 'Ringing...') : 'Connecting...'}
            </Text>
          )}
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {isRinging && incomingMeta && (
          <View style={styles.incomingActions}>
            <Pressable style={styles.declineButton} onPress={handleDecline}>
              <IconSymbol name="phone.down.fill" size={28} color={colors.card} />
              <Text style={styles.actionText}>Decline</Text>
            </Pressable>

            <Pressable style={styles.acceptButton} onPress={handleAccept}>
              <IconSymbol name="phone.fill" size={28} color={colors.card} />
              <Text style={styles.actionText}>Accept</Text>
            </Pressable>
          </View>
        )}

        {!isRinging && (
          <View style={styles.controlRow}>
            <Pressable style={[styles.roundBtn, isMuted && styles.activeBtn]} onPress={handleToggleMute}>
              <IconSymbol name={isMuted ? 'mic.slash.fill' : 'mic.fill'} size={22} color={colors.card} />
            </Pressable>

            <Pressable style={[styles.roundBtn, isSpeakerOn && styles.activeBtn]} onPress={handleToggleSpeaker}>
              <IconSymbol name={isSpeakerOn ? 'speaker.wave.3.fill' : 'speaker.fill'} size={22} color={colors.card} />
            </Pressable>

            <Pressable style={[styles.endBtn]} onPress={handleEndCall}>
              <IconSymbol name="phone.down.fill" size={28} color={colors.card} />
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  voiceContainer: { flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  webView: { width: '100%', height: '100%' },
  callerInfo: { alignItems: 'center', paddingHorizontal: spacing.xl },
  avatarContainer: { marginBottom: spacing.lg },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerName: { color: colors.card, fontSize: 28, fontWeight: '700', marginBottom: spacing.sm },
  callStatus: { color: 'rgba(255,255,255,0.8)', fontSize: 18, marginBottom: spacing.md },
  durationText: { color: colors.primary, fontWeight: '700', fontSize: 20 },

  topBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
  },
  topInfo: { gap: 4 },
  userText: { color: colors.card, fontWeight: '700', fontSize: 16 },
  statusText: { color: 'rgba(255,255,255,0.8)' },

  controls: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  incomingActions: { flexDirection: 'row', gap: spacing.xl },
  declineButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { color: colors.card, fontSize: 12, marginTop: 4 },

  controlRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBtn: {
    backgroundColor: 'rgba(239,68,68,0.25)',
  },
  endBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
