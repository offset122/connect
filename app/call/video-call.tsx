// screens/VideoCall.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Camera } from 'expo-camera';
import { Audio as ExpoAudio } from 'expo-av';
import { IconSymbol } from '@/components/IconSymbol';

// Sound files
const outgoingSound = require('@/assets/outgoing.mp3');
const ringtoneSound = require('@/assets/ringtone.mp3');
const notOnlineSound = require('@/assets/notonline.mp3');
import { colors, spacing, borderRadius, shadows } from '@/styles/commonStyles';
import { formatCallDuration, callService } from '@/utils/callService';
import { WebView } from 'react-native-webview';

import { supabase } from '@/app/integrations/supabase/client';

// Conditional WebRTC import for Expo compatibility
let RTCView: any = null;
let webrtcAvailable = false;

try {
  // Try to import react-native-webrtc
  const WebRTC = require('react-native-webrtc');
  RTCView = WebRTC.RTCView;
  webrtcAvailable = true;
} catch (error) {
  console.warn('react-native-webrtc not available. Video calling features will be limited.');
  webrtcAvailable = false;

  // Create a fallback component
  RTCView = ({ streamURL, style, objectFit }: any) => (
    <View style={[style, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}>
      <IconSymbol name="video.slash.fill" size={48} color="#666" />
      <Text style={{ color: '#666', marginTop: 8, textAlign: 'center' }}>
        Video not available{'\n'}WebRTC not supported
      </Text>
    </View>
  );
}

type IncomingMeta = { callId: string; from: string; callType: 'voice' | 'video' };

export default function VideoCallScreen() {
  const params = useLocalSearchParams() as any;
  // expected params: remoteUserId (string), callDirection ('incoming' | 'outgoing'), maybe callId
  const { remoteUserId: paramRemoteUserId, callDirection, callId: incomingCallId } = params || {};

  const [isReady, setIsReady] = useState(false);
  const [localStream, setLocalStream] = useState<any | null>(null);
  const [remoteStream, setRemoteStream] = useState<any | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isRinging, setIsRinging] = useState(callDirection === 'outgoing' || callDirection === 'incoming');
  const [incomingMeta, setIncomingMeta] = useState<IncomingMeta | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar?: string } | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const timerRef = useRef<number | null>(null);
  const webViewRef = useRef<any>(null);
  const currentSoundRef = useRef<ExpoAudio.Sound | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [otherParticipantJoined, setOtherParticipantJoined] = useState(false);

  // Sound management functions
  const playSound = async (soundFile: any, loop: boolean = true) => {
    try {
      console.log('[VideoCall] Playing sound, loop:', loop);
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
      console.log('[VideoCall] Sound started, looping:', loop);
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  };

  const stopSound = async () => {
    try {
      console.log('[VideoCall] Stopping sound');
      if (currentSoundRef.current) {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
        currentSoundRef.current = null;
        console.log('[VideoCall] Sound stopped');
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
        console.log('[VideoCall] Initializing callService');
        // get current user id from supabase auth
        // Supabase JS v2: supabase.auth.getUser()
        const userResp = await supabase.auth.getUser();
        const currentUser = (userResp as any)?.data?.user || (userResp as any)?.user;
        if (!currentUser || !currentUser.id) {
          console.warn('[VideoCall] No authenticated user found for callService init.');
          // you might redirect to login or throw
        } else {
          console.log('[VideoCall] User authenticated, initializing callService with userId:', currentUser.id);
          callService.init(supabase, currentUser.id, {
            onStateChange: (s: any) => {
              console.log('[VideoCall] State change:', s);
              // update local/remote streams and connection states
              if (!mounted) return;
              if (s.localStream) {
                console.log('[VideoCall] Local stream updated');
                setLocalStream(s.localStream);
              }
              if (s.remoteStream) {
                console.log('[VideoCall] Remote stream updated');
                setRemoteStream(s.remoteStream);
              }
              if (typeof s.isConnected === 'boolean') {
                console.log('[VideoCall] Connection state:', s.isConnected);
                setIsConnected(s.isConnected);
                setIsRinging(!s.isConnected && s.isRinging);
              }
              if (s.callStartTime) {
                console.log('[VideoCall] Call started, starting timer');
                // start timer
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                }
                setCallDuration(0);
                timerRef.current = setInterval(() => {
                  setCallDuration((prev) => prev + 1);
                }, 1000) as unknown as number;
              }
              if (s.isRinging !== undefined) {
                console.log('[VideoCall] Ringing state:', s.isRinging);
                setIsRinging(s.isRinging);
              }
              if (s.roomUrl) {
                console.log('[VideoCall] Room URL received:', s.roomUrl);
                setRoomUrl(s.roomUrl);
              }
            },
            onIncomingCall: (meta: IncomingMeta) => {
              console.log('[VideoCall] Incoming call:', meta);
              if (!mounted) return;
              setIncomingMeta(meta);
              setIsRinging(true);
              // Optionally show local incoming UI / vibration
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            },
          });
        }
      } catch (e) {
        console.error('[VideoCall] callService init error', e);
      } finally {
        if (mounted) {
          console.log('[VideoCall] Init complete, setting ready');
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // end any ongoing call and cleanup resources
      try {
        callService.endCall(true);
      } catch (e) {}
    };
  }, []);

  // Auto-start outgoing call if param tells so
  useEffect(() => {
    if (!isReady) return;
    console.log('[VideoCall] Auto-start effect triggered, direction:', callDirection, 'remoteUserId:', paramRemoteUserId);
    (async () => {
      if (callDirection === 'outgoing' && paramRemoteUserId) {
        console.log('[VideoCall] Starting outgoing video call');
        try {
          await callService.startCall(paramRemoteUserId, 'video');
          console.log('[VideoCall] Outgoing call started successfully');
          // startCall will create offer and send signals; onStateChange will update streams
        } catch (e) {
          console.error('[VideoCall] startCall error', e);
          Alert.alert('Call error', 'Unable to start video call.');
          router.back();
        }
      } else if (callDirection === 'incoming' && incomingCallId) {
        console.log('[VideoCall] Setting up incoming call meta');
        // If we already have incomingCallId (deep link), we can set meta and wait for user to accept
        setIncomingMeta({ callId: incomingCallId, from: paramRemoteUserId || 'unknown', callType: 'video' });
        setIsRinging(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, callDirection, paramRemoteUserId, incomingCallId]);

  // Fetch user profile and request permissions
  useEffect(() => {
    const fetchUserProfile = async () => {
      const userId = paramRemoteUserId || incomingMeta?.from;
      if (!userId) return;

      try {
        console.log('[VideoCall] Fetching user profile for:', userId);
        const { data, error } = await supabase
          .from('profiles')
          .select('name, avatar_url')
          .eq('id', userId)
          .single();

        if (error) {
          console.warn('[VideoCall] Error fetching user profile:', error);
        } else if (data) {
          setUserProfile({
            name: data.name || 'Unknown User',
            avatar: data.avatar_url,
          });
          console.log('[VideoCall] User profile loaded:', data);
        }
      } catch (e) {
        console.warn('[VideoCall] Failed to fetch user profile:', e);
      }
    };

    const requestPermissions = async () => {
      try {
        console.log('[VideoCall] Requesting camera and microphone permissions');

        // Request camera permission for video calls
        const cameraPermission = await Camera.requestCameraPermissionsAsync();
        console.log('[VideoCall] Camera permission:', cameraPermission);

        // Request microphone permission (audio is handled by expo-av in callService)
        const audioPermission = await ExpoAudio.getPermissionsAsync();
        console.log('[VideoCall] Audio permission status:', audioPermission);

        if (!audioPermission.granted) {
          const audioRequest = await ExpoAudio.requestPermissionsAsync();
          console.log('[VideoCall] Audio permission requested:', audioRequest);
        }

        // Set permissions granted if both are available
        const hasCamera = cameraPermission.granted;
        const hasAudio = audioPermission.granted;

        if (hasCamera && hasAudio) {
          setPermissionsGranted(true);
          console.log('[VideoCall] All permissions granted');
        } else {
          Alert.alert(
            'Permissions Required',
            'Camera and microphone access are needed for video calls. Please grant permissions in your device settings.',
            [{ text: 'OK' }]
          );
        }
      } catch (e) {
        console.warn('[VideoCall] Permissions error:', e);
        Alert.alert('Permission Error', 'Failed to request camera/microphone permissions.');
      }
    };

    fetchUserProfile();
    requestPermissions();
  }, [paramRemoteUserId, incomingMeta?.from]);

  // Handle call sounds and timeout
  useEffect(() => {
    console.log('[VideoCall] Sound useEffect - isRinging:', isRinging, 'direction:', callDirection, 'otherJoined:', otherParticipantJoined);
    if (isRinging && callDirection === 'outgoing' && !otherParticipantJoined) {
      console.log('[VideoCall] Playing outgoing sound');
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
      console.log('[VideoCall] Playing ringtone');
      // Play ringtone for incoming calls
      playSound(ringtoneSound);

      // Set 30-second timeout for unanswered incoming calls
      callTimeoutRef.current = setTimeout(() => {
        console.log('Incoming call timeout - no answer after 30 seconds');
        stopSound();
        handleDecline(); // Decline the call after timeout
      }, 30000);
    } else if (otherParticipantJoined) {
      console.log('[VideoCall] Other participant joined, stopping sound');
      // Stop sound when other participant joins (answers)
      stopSound();
      if (callTimeoutRef.current) {
        clearTimeout(callTimeoutRef.current);
        callTimeoutRef.current = null;
      }
    }

    // Stop sound and clear timeout when component unmounts
    return () => {
      console.log('[VideoCall] Cleaning up sounds');
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
      await callService.acceptCall(id); // acceptCall will prepare streams and create answer
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
      await callService.sendSignal(
        incomingMeta!.callId, 
        null, // sender - current user id will be filled by callService
        incomingMeta!.from, 
        'control', 
        { action: 'decline' }
      )
        .catch(() => {});
      // callService.rejectIncomingCall exists in earlier file — if so use it:
      if ((callService as any).rejectIncomingCall) {
        await (callService as any).rejectIncomingCall();
      } else {
        await callService.endCall();
      }
    } catch (e) {
      console.warn('decline error', e);
    } finally {
      setIsRinging(false);
      router.back();
    }
  };

  // End call (local hangup)
  const handleEndCall = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await callService.endCall();
    } catch (e) {
      console.warn('endCall error', e);
    } finally {
      // stop timer
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

  // Toggle camera (disable video track)
  const handleToggleVideo = async () => {
    try {
      const next = !isVideoEnabled;
      setIsVideoEnabled(next);
      if (localStream && localStream.getVideoTracks) {
        localStream.getVideoTracks().forEach((t: any) => (t.enabled = next));
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('toggleVideo error', e);
    }
  };

  const handleSwitchCamera = async () => {
    try {
      await callService.switchCamera();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.warn('switchCamera error', e);
    }
  };

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

  // Render helpers: stream -> RTCView expects stream.toURL()
  const remoteStreamURL = remoteStream?.toURL ? remoteStream.toURL() : null;
  const localStreamURL = localStream?.toURL ? localStream.toURL() : null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Daily Video Call */}
      {roomUrl && permissionsGranted && (callDirection === 'outgoing' || !isRinging) ? (
        <WebView
          ref={webViewRef}
          source={{ uri: roomUrl }}
          style={styles.webView}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onLoadEnd={() => {
            console.log('[VideoCall] WebView loaded, injecting join script');
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
            console.log('[VideoCall] WebView message:', event.nativeEvent.data);
            if (event.nativeEvent.data === 'participant_joined') {
              console.log('Other participant joined the call');
              setOtherParticipantJoined(true);
              stopSound();
            }
          }}
        />
      ) : roomUrl && !permissionsGranted ? (
        <View style={styles.permissionsPrompt}>
          <Text style={styles.permissionsTitle}>Permissions Required</Text>
          <Text style={styles.permissionsText}>
            Camera and microphone access are needed for video calls.
            Please grant permissions to continue.
          </Text>
          <Pressable
            style={styles.retryButton}
            onPress={async () => {
              const cameraPerm = await Camera.requestCameraPermissionsAsync();
              const audioPerm = await ExpoAudio.requestPermissionsAsync();
              if (cameraPerm.granted && audioPerm.granted) {
                setPermissionsGranted(true);
              }
            }}
          >
            <Text style={styles.retryText}>Grant Permissions</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderTitle}>
            {isRinging ? 'Incoming video call' : 'Waiting for call to connect...'}
          </Text>
          <Text style={styles.placeholderSubtitle}>{userProfile?.name || incomingMeta?.from || paramRemoteUserId || 'User'}</Text>
        </View>
      )}


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
              <IconSymbol name="video.fill" size={28} color={colors.card} />
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

            <Pressable style={styles.roundBtn} onPress={handleToggleVideo}>
              <IconSymbol name={isVideoEnabled ? 'video.fill' : 'video.slash.fill'} size={22} color={colors.card} />
            </Pressable>

            <Pressable style={styles.roundBtn} onPress={handleSwitchCamera}>
              <IconSymbol name="camera.rotate.fill" size={22} color={colors.card} />
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  remoteContainer: { flex: 1, backgroundColor: '#111' },
  remoteVideo: { width: '100%', height: '100%' },
  webView: { width: '100%', height: '100%' },
  dailyCall: { flex: 1 },
  permissionsPrompt: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  permissionsTitle: { color: colors.card, fontSize: 24, fontWeight: '700', marginBottom: spacing.md },
  permissionsText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, textAlign: 'center', marginBottom: spacing.xl },
  retryButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  retryText: { color: colors.card, fontSize: 16, fontWeight: '600' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  placeholderSubtitle: { color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  localPip: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    width: 140,
    height: 190,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.lg,
    elevation: 8,
  },
  localVideo: { width: '100%', height: '100%' },

  topBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topInfo: { gap: 4 },
  userText: { color: colors.card, fontWeight: '700', fontSize: 16 },
  statusText: { color: 'rgba(255,255,255,0.8)' },
  durationText: { color: colors.primary, fontWeight: '700' },

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
