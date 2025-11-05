
import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Image, Linking } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles, spacing, borderRadius, shadows } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Camera from 'expo-camera';
import { Audio } from 'expo-av';

// WebRTC imports
import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  RTCView,
  MediaStream,
} from 'react-native-webrtc';

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  media_type?: 'image' | 'document';
  media_url?: string;
};

type CallState = {
  isConnected: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallInitiator: boolean;
  callId: string | null;
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimer, setCallTimer] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Voice Call Enhancements
  const [audioPermission, setAudioPermission] = useState<boolean | null>(null);
  const [audioSession, setAudioSession] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioInputDevice, setAudioInputDevice] = useState<string>('default');
  const [audioOutputDevice, setAudioOutputDevice] = useState<string>('speaker');
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'poor' | 'unknown'>('unknown');
  const [isCallWaiting, setIsCallWaiting] = useState(false);
  const [callReconnecting, setCallReconnecting] = useState(false);

  // WebRTC state
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [isCallInitiator, setIsCallInitiator] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const localVideoRef = useRef<any>(null);
  const remoteVideoRef = useRef<any>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user) {
        Alert.alert('Error', 'Please log in to view messages');
        router.replace('/login');
        return;
      }

      setCurrentUserId(user.id);

      // Fetch other user details
      const { data: userData, error: userDataError } = await (supabase as any)
        .from('users')
        .select('id, first_name, avatar, gender, online_status')
        .eq('id', id)
        .single();

      if (userDataError) throw userDataError;
      setOtherUser(userData);
      setIsOtherUserOnline(userData.online_status || false);

      // Fetch messages between current user and other user
      const { data: messagesData, error: messagesError } = await (supabase as any)
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setMessages(messagesData || []);
      console.log('Messages loaded:', messagesData?.length);
      
      // Mark messages as read
      await (supabase as any)
        .from('messages')
        .update({ status: 'read' })
        .eq('receiver_id', user.id)
        .eq('sender_id', id)
        .neq('status', 'read');

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          if (payload.new.sender_id === id) {
            setMessages((prev) => [...prev, payload.new as Message]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, currentUserId, fetchMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Use auth.uid() instead of currentUserId to ensure it matches the auth system
      const { data, error } = await (supabase as any)
        .from('messages')
        .insert({
          sender_id: user.id, // Use auth ID from AuthContext
          receiver_id: id,
          content: messageContent,
          status: 'sent',
        })
        .select()
        .single();

      if (error) {
        console.error('Message insert error:', error);
        throw error;
      }

      setMessages((prev) => [...prev, data]);
      console.log('Message sent successfully:', data);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadMedia(result.assets[0].uri, 'image');
      }
      setShowMediaPicker(false);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        await uploadMedia(result.assets[0].uri, 'image');
      }
      setShowMediaPicker(false);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
      });

      if (!result.canceled) {
        await uploadMedia(result.assets[0].uri, 'document');
      }
      setShowMediaPicker(false);
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadMedia = async (uri: string, type: 'image' | 'document') => {
    if (!currentUserId) return;

    try {
      setSending(true);
      
      // Generate unique filename with proper extension
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const fileExtension = type === 'image' ? 'jpg' : 'pdf';
      const fileName = `chat_media_${currentUserId}_${timestamp}_${randomId}.${fileExtension}`;
      const filePath = `messages/${type}/${fileName}`;
      
      // Fetch the file as blob for upload
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload to Supabase Storage using the 'media' bucket
      const { data: uploadData, error: uploadError } = await (supabase as any)
        .storage
        .from('media')
        .upload(filePath, blob, {
          contentType: type === 'image' ? 'image/jpeg' : 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        
        // Handle different types of upload errors
        if (uploadError.message.includes('bucket')) {
          throw new Error('Storage bucket not found. Please contact support.');
        } else if (uploadError.message.includes('auth')) {
          throw new Error('Authentication required for media upload.');
        } else {
          throw new Error('Failed to upload media. Please try again.');
        }
      }

      // Get public URL from Supabase Storage
      const { data: urlData, error: urlError } = (supabase as any)
        .storage
        .from('media')
        .getPublicUrl(filePath);

      if (urlError) {
        console.error('Error getting public URL:', urlError);
        throw new Error('Failed to get media URL.');
      }

      const mediaUrl = urlData.publicUrl;

      const messageData = {
        sender_id: currentUserId,
        receiver_id: id,
        content: type === 'image' ? '[Image]' : '[Document]',
        media_type: type,
        media_url: mediaUrl,
        status: 'sent',
      };

      const { data, error } = await (supabase as any)
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => [...prev, data]);
      console.log('Media message sent:', data);
      scrollToBottom();
    } catch (error) {
      console.error('Error uploading media:', error);
      Alert.alert('Error', 'Failed to send media');
    } finally {
      setSending(false);
    }
  };

  const handleVoiceCall = async () => {
    // Check if user is online first
    if (!otherUser?.online_status) {
      Alert.alert(
        'User Offline',
        `${otherUser?.first_name || 'This user'} is currently offline. Voice calls may not be available.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Anyway', onPress: () => startEnhancedVoiceCall() }
        ]
      );
      return;
    }

    // Request audio permissions
    const hasPermission = await requestAudioPermissions();
    
    if (hasPermission) {
      // User is online and has permissions, start enhanced voice call
      await startEnhancedVoiceCall();
    }
  };

  const requestAudioPermissions = async (): Promise<boolean> => {
    try {
      // Request audio permissions for voice calls
      const { status } = await Audio.requestPermissionsAsync();
      setAudioPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Audio Permission Required',
          'Audio access is needed for voice calls. Please enable audio permissions in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Alert.alert('Settings', 'Please enable audio permissions in your device settings.') }
          ]
        );
        return false;
      }
      
      // Set up audio session
      const audioSession = await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      setAudioSession(audioSession);
      return true;
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      setAudioPermission(false);
      return false;
    }
  };

  const startEnhancedVoiceCall = async () => {
    if (!audioPermission) {
      Alert.alert('Audio Permission Required', 'Please enable audio permissions to make voice calls.');
      return;
    }

    setIsInCall(true);
    setCallType('voice');
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(true); // Default to speaker for better quality
    setIsCallConnected(false);
    setIsCallWaiting(true);
    setNetworkQuality('unknown');
    setCallReconnecting(false);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      // Simulate connection process with loading states
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setIsCallWaiting(false);
      setIsCallConnected(true);
      setNetworkQuality('good');
      
      // Start call timer
      const timer = setInterval(() => {
        setCallDuration(prev => {
          const newDuration = prev + 1;
          
          // Simulate network quality monitoring
          if (newDuration > 0 && newDuration % 30 === 0) {
            const qualities = ['excellent', 'good', 'poor'] as const;
            const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
            setNetworkQuality(randomQuality);
          }
          
          return newDuration;
        });
      }, 1000);
      setCallTimer(timer);
      
      console.log(`Starting enhanced voice call with ${otherUser?.first_name || 'user'}`);
    } catch (error) {
      console.error('Error starting voice call:', error);
      Alert.alert('Call Error', 'Failed to start voice call. Please try again.');
      handleEndCall();
    }
  };

  const handleVideoCall = async () => {
    // Check if user is online first
    if (!otherUser?.online_status) {
      Alert.alert(
        'User Offline',
        `${otherUser?.first_name || 'This user'} is currently offline. Video calls may not be available.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Try Voice Call',
            onPress: () => handleVoiceCall()
          }
        ]
      );
      return;
    }

    // Request camera permissions for video call
    const { status: cameraStatus } = await (Camera as any).requestCameraPermissionsAsync?.() || await (Camera as any).requestPermissionsAsync?.();
    setCameraPermission(cameraStatus === 'granted');

    if (cameraStatus !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Camera access is needed for video calls. Please enable camera permissions in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => Alert.alert('Settings', 'Please enable camera permissions in your device settings.') }
        ]
      );
      return;
    }

    // User has permission and is online, start video call
    setIsInCall(true);
    setCallType('video');
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Start call timer
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    setCallTimer(timer);
    
    console.log(`Starting video call with ${otherUser?.first_name || 'user'}`);
  };

  const handleEndCall = () => {
    if (callTimer) {
      clearInterval(callTimer);
      setCallTimer(null);
    }
    setIsInCall(false);
    setCallType(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const getVoiceCallStatus = () => {
    if (isCallWaiting) return 'Connecting...';
    if (!isCallConnected) return 'Not connected';
    if (isMuted) return 'Muted';
    if (callReconnecting) return 'Reconnecting...';
    return 'Connected';
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const openImage = (url: string) => {
    setSelectedImage(url);
    setShowImageModal(true);
  };

  const downloadFile = (url: string) => {
    Alert.alert(
      'Download',
      'Download this file to your device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Download', onPress: () => Linking.openURL(url) }
      ]
    );
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const renderDateSeparator = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return formatDate(currentMsg.created_at);
    
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    
    if (currentDate !== prevDate) {
      return formatDate(currentMsg.created_at);
    }
    
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
        <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.text, { marginTop: 16 }]}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <View style={styles.headerUserInfo}>
                {otherUser?.avatar ? (
                  <Image source={{ uri: otherUser.avatar }} style={styles.headerAvatar} />
                ) : (
                  <View style={[styles.headerAvatar, styles.defaultHeaderAvatar]}>
                    <Text style={styles.headerAvatarText}>
                      {otherUser?.first_name?.charAt(0) || 'U'}
                    </Text>
                  </View>
                )}
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerName}>
                    {otherUser?.first_name || 'User'}
                  </Text>
                  {otherUser?.online_status && (
                    <Text style={styles.onlineText}>Active now</Text>
                  )}
                </View>
              </View>
            </View>
          ),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <View style={styles.backButtonContainer}>
                <IconSymbol name="chevron.left" size={22} color={colors.primary} />
              </View>
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable onPress={handleVoiceCall} style={styles.headerButton}>
                <View style={styles.headerButtonContainer}>
                  <IconSymbol name="phone.fill" size={20} color={colors.primary} />
                </View>
              </Pressable>
              <Pressable onPress={handleVideoCall} style={styles.headerButton}>
                <View style={styles.headerButtonContainer}>
                  <IconSymbol name="video.fill" size={20} color={colors.primary} />
                </View>
              </Pressable>
            </View>
          ),
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerShadowVisible: true,
        }}
      />
      
      <View style={styles.headerSpacer} />
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {messages.map((message, index) => {
            const isCurrentUser = message.sender_id === currentUserId;
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
            const dateSeparator = renderDateSeparator(message, prevMessage);
            
            // Check if message is grouped with previous message from same sender
            const isGrouped = prevMessage &&
              prevMessage.sender_id === message.sender_id &&
              prevMessage.media_type === message.media_type &&
              !dateSeparator;

            // Check if message is grouped with next message
            const isLastInGroup = !nextMessage ||
              nextMessage.sender_id !== message.sender_id ||
              nextMessage.media_type !== message.media_type;

            return (
              <View key={message.id}>
                {dateSeparator && (
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateSeparatorText}>{dateSeparator}</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.messageContainer,
                    isCurrentUser ? styles.messageContainerRight : styles.messageContainerLeft,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft,
                      !isCurrentUser && isGrouped && styles.messageBubbleTopMargin,
                    ]}
                  >
                    {/* Media Content */}
                    {message.media_type === 'image' && message.media_url && (
                      <Pressable onPress={() => openImage(message.media_url!)} style={styles.imageContainer}>
                        <Image source={{ uri: message.media_url }} style={styles.mediaImage} />
                        <View style={styles.mediaOverlay}>
                          <IconSymbol name="plus.magnifyingglass" size={20} color={colors.card} />
                        </View>
                      </Pressable>
                    )}
                    
                    {message.media_type === 'document' && message.media_url && (
                      <Pressable
                        style={styles.documentPreview}
                        onPress={() => downloadFile(message.media_url!)}
                      >
                        <View style={styles.documentIconContainer}>
                          <IconSymbol name="doc.fill" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.documentContent}>
                          <Text style={styles.documentName}>
                            {message.content === '[Document]' ? 'Document' : message.content}
                          </Text>
                          <Text style={styles.documentSize}>PDF • 2.4 MB</Text>
                        </View>
                        <View style={styles.downloadIcon}>
                          <IconSymbol name="square.and.arrow.up" size={16} color={colors.textSecondary} />
                        </View>
                      </Pressable>
                    )}

                    {/* Text Content */}
                    {!message.media_type && (
                      <Text
                        style={[
                          styles.messageText,
                          isCurrentUser ? styles.messageTextRight : styles.messageTextLeft,
                        ]}
                      >
                        {message.content}
                      </Text>
                    )}

                    {/* Message Footer - only show for last message in group */}
                    {isLastInGroup && (
                      <View style={styles.messageFooter}>
                        <Text
                          style={[
                            styles.messageTime,
                            isCurrentUser ? styles.messageTimeRight : styles.messageTimeLeft,
                          ]}
                        >
                          {formatTime(message.created_at)}
                        </Text>
                        {isCurrentUser && !message.media_type && (
                          <View style={styles.messageStatus}>
                            <IconSymbol
                              name={message.status === 'read' ? 'checkmark.circle.fill' : 'checkmark'}
                              size={14}
                              color={message.status === 'read' ? colors.success : colors.textSecondary}
                            />
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
          
          {/* Typing Indicator */}
          {isTyping && (
            <View style={[styles.messageContainer, styles.messageContainerLeft]}>
              <View style={[styles.messageBubble, styles.messageBubbleLeft]}>
                <View style={styles.typingIndicator}>
                  <View style={styles.typingDot} />
                  <View style={[styles.typingDot, { animationDelay: '0.2s' }]} />
                  <View style={[styles.typingDot, { animationDelay: '0.4s' }]} />
                </View>
              </View>
            </View>
          )}
          
          {messages.length === 0 && !isTyping && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <IconSymbol name="message.circle.fill" size={64} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Start the Conversation</Text>
              <Text style={styles.emptyText}>
                Send a message to {otherUser?.first_name || 'this person'}
              </Text>
              <View style={styles.emptyActions}>
                <Pressable style={styles.emptyActionButton}>
                  <Text style={styles.emptyActionText}>Quick Message</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            {/* Media Attachment Button */}
            <Pressable
              style={styles.mediaButton}
              onPress={() => setShowMediaPicker(true)}
            >
              <IconSymbol name="plus.circle.fill" size={32} color={colors.primary} />
            </Pressable>

            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={colors.textSecondary}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            <Pressable
              style={[
                styles.sendButton,
                (!newMessage.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <IconSymbol name="arrow.up" size={24} color={colors.card} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Media Picker Modal */}
        <Modal
          visible={showMediaPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowMediaPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Share Media</Text>
                <Pressable
                  onPress={() => setShowMediaPicker(false)}
                  style={styles.modalClose}
                >
                  <IconSymbol name="xmark" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>
              
              <View style={styles.mediaOptions}>
                <Pressable style={styles.mediaOption} onPress={takePhoto}>
                  <View style={styles.mediaOptionIcon}>
                    <IconSymbol name="camera.fill" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.mediaOptionText}>Take Photo</Text>
                </Pressable>

                <Pressable style={styles.mediaOption} onPress={pickImage}>
                  <View style={styles.mediaOptionIcon}>
                    <IconSymbol name="photo.fill" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.mediaOptionText}>Choose Photo</Text>
                </Pressable>

                <Pressable style={styles.mediaOption} onPress={pickDocument}>
                  <View style={styles.mediaOptionIcon}>
                    <IconSymbol name="doc.fill" size={32} color={colors.primary} />
                  </View>
                  <Text style={styles.mediaOptionText}>Send Document</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Image Preview Modal */}
        <Modal
          visible={showImageModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowImageModal(false)}
        >
          <View style={styles.imageModalOverlay}>
            <Pressable
              style={styles.imageModalClose}
              onPress={() => setShowImageModal(false)}
            >
              <IconSymbol name="xmark.circle.fill" size={40} color={colors.card} />
            </Pressable>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.fullImage} />
            )}
          </View>
        </Modal>
      </KeyboardAvoidingView>

      {/* Call UI Modal */}
      <Modal
        visible={isInCall && callType !== null}
        animationType="fade"
        transparent={true}
        presentationStyle="overFullScreen"
        onRequestClose={() => {/* Optional: Handle back button */}}
      >
        <View style={styles.callOverlay}>
          <View style={styles.callContainer}>
            {/* Call Header */}
            <View style={styles.callHeader}>
              <Text style={styles.callHeaderText}>
                {callType === 'video' ? 'Video Call' : 'Voice Call'}
              </Text>
              <Text style={styles.callDurationText}>
                {formatCallDuration(callDuration)}
              </Text>
            </View>

            {/* User Info */}
            <View style={styles.callUserInfo}>
              {otherUser?.avatar ? (
                <Image source={{ uri: otherUser.avatar }} style={styles.callAvatar} />
              ) : (
                <View style={[styles.callAvatar, styles.defaultCallAvatar]}>
                  <Text style={styles.callAvatarText}>
                    {otherUser?.first_name?.charAt(0) || 'U'}
                  </Text>
                </View>
              )}
              <Text style={styles.callUserName}>
                {otherUser?.first_name || 'User'}
              </Text>
              <Text style={[
                styles.callStatusText,
                !otherUser?.online_status && styles.callStatusOffline
              ]}>
                {isCallWaiting ? 'Connecting...' :
                 callType === 'voice' && isCallConnected ? getVoiceCallStatus() :
                 isMuted ? 'Muted' :
                 !otherUser?.online_status ? 'User offline - call may not connect' :
                 callType === 'video' && cameraPermission === false ? 'Camera permission needed' : 'Connected'}
              </Text>

              {/* Network Quality Indicator */}
              {callType === 'voice' && isCallConnected && (
                <View style={styles.networkQualityContainer}>
                  <View style={[styles.networkIndicator, styles[`network_${networkQuality}`]]} />
                  <Text style={styles.networkQualityText}>
                    {networkQuality === 'excellent' ? 'Excellent' :
                     networkQuality === 'good' ? 'Good' :
                     networkQuality === 'poor' ? 'Poor' : 'Unknown'} Network
                  </Text>
                </View>
              )}

              {/* Reconnection Status */}
              {callReconnecting && (
                <View style={styles.reconnectingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.reconnectingText}>Reconnecting...</Text>
                </View>
              )}
              
              {/* Audio Permission Warning */}
              {callType === 'voice' && audioPermission === false && (
                <View style={styles.permissionWarning}>
                  <IconSymbol name="mic.slash.fill" size={20} color={colors.warning} />
                  <Text style={styles.permissionWarningText}>Audio access required for voice calls</Text>
                </View>
              )}

              {/* Camera Permission Warning */}
              {callType === 'video' && cameraPermission === false && (
                <View style={styles.permissionWarning}>
                  <IconSymbol name="video.slash.fill" size={20} color={colors.warning} />
                  <Text style={styles.permissionWarningText}>Camera access required for video calls</Text>
                </View>
              )}
            </View>

            {/* Call Controls */}
            <View style={styles.callControls}>
              {/* Mute Button */}
              <Pressable
                style={[
                  styles.callControlButton,
                  isMuted && styles.callControlButtonActive
                ]}
                onPress={handleToggleMute}
              >
                <IconSymbol
                  name={isMuted ? "mic.slash.fill" : "mic.fill"}
                  size={24}
                  color={isMuted ? colors.error : colors.card}
                />
              </Pressable>

              {/* End Call Button */}
              <Pressable
                style={styles.endCallButton}
                onPress={handleEndCall}
              >
                <IconSymbol name="phone.down.fill" size={24} color={colors.card} />
              </Pressable>

              {/* Speaker Button (Voice Call Only) */}
              {callType === 'voice' && (
                <Pressable
                  style={[
                    styles.callControlButton,
                    isSpeakerOn && styles.callControlButtonActive
                  ]}
                  onPress={handleToggleSpeaker}
                >
                  <IconSymbol
                    name={isSpeakerOn ? "speaker.wave.3.fill" : "speaker.fill"}
                    size={24}
                    color={isSpeakerOn ? colors.success : colors.card}
                  />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Enhanced Header Styles
  headerTitle: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    resizeMode: 'cover',
  },
  defaultHeaderAvatar: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 1,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  onlineText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background + '20',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  headerButton: {
    padding: 0,
  },
  headerButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background + '20',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  headerSpacer: {
    height: 8,
  },
  
  // Enhanced Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dateSeparatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    ...shadows.sm,
    elevation: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg + 4,
    marginBottom: spacing.sm + 2,
    ...shadows.md,
    elevation: 3,
  },
  messageBubbleLeft: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageBubbleRight: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
  },
  messageTextLeft: {
    color: colors.text,
    fontWeight: '400',
  },
  messageTextRight: {
    color: colors.card,
    fontWeight: '400',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  messageTimeLeft: {
    color: colors.textSecondary,
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  mediaImage: {
    width: 220,
    height: 160,
    borderRadius: borderRadius.lg,
    resizeMode: 'cover',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // Enhanced Message Layout
  messageContainer: {
    marginBottom: 4,
    maxWidth: '100%',
  },
  messageContainerLeft: {
    alignItems: 'flex-start',
  },
  messageContainerRight: {
    alignItems: 'flex-end',
  },
  messageBubbleTopMargin: {
    marginTop: 2,
  },
  
  // Enhanced Media Elements
  imageContainer: {
    position: 'relative',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  mediaOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentContent: {
    flex: 1,
  },
  documentSize: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  downloadIcon: {
    padding: 8,
  },
  
  // Typing Indicator
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
  },
  
  // Enhanced Empty State
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyActions: {
    marginTop: spacing.lg,
  },
  emptyActionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  emptyActionText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Enhanced Input Area
  inputContainer: {
    backgroundColor: colors.card,
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl + 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  sendButtonDisabled: {
    backgroundColor: colors.disabled,
    ...shadows.sm,
    elevation: 2,
  },
  mediaButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageStatus: {
    marginLeft: 2,
  },
  
  // Enhanced Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    maxHeight: '55%',
    ...shadows.lg,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  modalClose: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  mediaOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  mediaOption: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  mediaOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  mediaOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '95%',
    height: '80%',
    resizeMode: 'contain',
    borderRadius: borderRadius.lg,
  },

  // Call UI Styles
  callOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    zIndex: 1000,
  },
  callContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl * 3,
  },
  callHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  callHeaderText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  callDurationText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
  },
  callUserInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  callAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
  },
  defaultCallAvatar: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callAvatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.card,
  },
  callUserName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  callStatusText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  callStatusOffline: {
    color: colors.warning,
    fontWeight: '600',
  },
  callControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  callControlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  callControlButtonActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
    elevation: 8,
  },
  permissionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    marginTop: 8,
  },
  permissionWarningText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.warning,
  },

  // Enhanced Voice Call Styles
  networkQualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  networkIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  network_excellent: {
    backgroundColor: colors.success,
  },
  network_good: {
    backgroundColor: colors.primary,
  },
  network_poor: {
    backgroundColor: colors.warning,
  },
  network_unknown: {
    backgroundColor: colors.textSecondary,
  },
  networkQualityText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  reconnectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  reconnectingText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
});
