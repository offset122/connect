
import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles, spacing, borderRadius, shadows } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import * as Haptics from 'expo-haptics';

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
};

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        Alert.alert('Error', 'Please log in to view messages');
        return;
      }

      setCurrentUserId(user.id);

      // Fetch other user details
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('id, first_name, avatar, gender, online_status')
        .eq('id', id)
        .single();

      if (userDataError) throw userDataError;
      setOtherUser(userData);

      // Fetch messages between current user and other user
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setMessages(messagesData || []);
      console.log('Messages loaded:', messagesData?.length);
      
      // Mark messages as read
      await supabase
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
    if (!newMessage.trim() || !currentUserId || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: id,
          content: messageContent,
          status: 'sent',
        })
        .select()
        .single();

      if (error) throw error;

      setMessages((prev) => [...prev, data]);
      console.log('Message sent:', data);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
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
              <Text style={styles.headerName}>
                {otherUser?.first_name || 'User'}
              </Text>
              {otherUser?.online_status && (
                <View style={styles.onlineIndicator}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Online</Text>
                </View>
              )}
            </View>
          ),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.primary} />
            </Pressable>
          ),
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerShadowVisible: true,
        }}
      />
      
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
        >
          {messages.map((message, index) => {
            const isCurrentUser = message.sender_id === currentUserId;
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const dateSeparator = renderDateSeparator(message, prevMessage);

            return (
              <View key={message.id}>
                {dateSeparator && (
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateSeparatorText}>{dateSeparator}</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isCurrentUser ? styles.messageBubbleRight : styles.messageBubbleLeft,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isCurrentUser ? styles.messageTextRight : styles.messageTextLeft,
                    ]}
                  >
                    {message.content}
                  </Text>
                  <View style={styles.messageFooter}>
                    <Text
                      style={[
                        styles.messageTime,
                        isCurrentUser ? styles.messageTimeRight : styles.messageTimeLeft,
                      ]}
                    >
                      {formatTime(message.created_at)}
                    </Text>
                    {isCurrentUser && (
                      <IconSymbol
                        name={message.status === 'read' ? 'checkmark.circle.fill' : 'checkmark'}
                        size={14}
                        color={message.status === 'read' ? colors.primary : colors.textSecondary}
                      />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
          
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <IconSymbol name="message" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Start the Conversation</Text>
              <Text style={styles.emptyText}>
                Send a message to {otherUser?.first_name || 'this person'}
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerTitle: {
    alignItems: 'center',
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  onlineText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  messageBubbleLeft: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  messageTextLeft: {
    color: colors.text,
  },
  messageTextRight: {
    color: colors.card,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: 11,
    fontWeight: '500',
  },
  messageTimeLeft: {
    color: colors.textSecondary,
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inputContainer: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  sendButtonDisabled: {
    backgroundColor: colors.disabled,
    ...shadows.sm,
  },
});
