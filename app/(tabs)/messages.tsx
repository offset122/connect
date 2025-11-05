
import React, { useState, useEffect, useCallback } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable, Platform, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Message = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  userId: string;
};

export default function MessagesScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user) {
        Alert.alert('Error', 'Please log in to view messages');
        router.replace('/login');
        return;
      }

      setCurrentUserId(user.id);

      // Fetch messages where user is either sender or receiver
      const { data: messagesData, error: messagesError } = await (supabase as any)
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          status,
          created_at
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Group messages by conversation (other user)
      const conversationsMap = new Map<string, any>();
      
      messagesData?.forEach((msg: any) => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        
        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            userId: otherUserId,
            lastMessage: msg.content,
            timestamp: msg.created_at,
            unread: msg.receiver_id === user.id && msg.status !== 'read',
            messageId: msg.id,
          });
        }
      });

      // Fetch user details for all conversations
      const userIds = Array.from(conversationsMap.keys());
      
      if (userIds.length === 0) {
        setMessages([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: usersData, error: usersError } = await (supabase as any)
        .from('users')
        .select('id, first_name, avatar, gender')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Map conversations with user details
      const mappedMessages: Message[] = Array.from(conversationsMap.values()).map((conv: any) => {
        const otherUser = usersData?.find((u: any) => u.id === conv.userId);
        
        return {
          id: conv.messageId,
          name: otherUser?.first_name || 'Unknown',
          avatar: otherUser?.avatar || (otherUser?.gender === 'Male' ? '👨' : '👩'),
          lastMessage: conv.lastMessage || '',
          timestamp: formatTimestamp(conv.timestamp),
          unread: conv.unread,
          userId: conv.userId,
        };
      });

      setMessages(mappedMessages);
      console.log('Messages loaded:', mappedMessages.length);
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const handleMessagePress = (userId: string) => {
    console.log('Opening chat with:', userId);
    router.push(`/chat/${userId}`);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
        <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.text, { marginTop: 16 }]}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Messages",
            headerLargeTitle: true,
          }}
        />
      )}
      <ScrollView 
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {messages.length > 0 ? (
          messages.map((message) => (
            <Pressable
              key={message.id}
              style={styles.messageCard}
              onPress={() => handleMessagePress(message.userId)}
            >
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarEmoji}>{message.avatar}</Text>
                {message.unread && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.messageInfo}>
                <View style={styles.messageHeader}>
                  <Text style={[styles.name, message.unread && styles.nameUnread]}>
                    {message.name}
                  </Text>
                  <Text style={styles.timestamp}>{message.timestamp}</Text>
                </View>
                <Text 
                  style={[styles.lastMessage, message.unread && styles.lastMessageUnread]}
                  numberOfLines={1}
                >
                  {message.lastMessage}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </Pressable>
          ))
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol name="message" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Messages Yet</Text>
            <Text style={styles.emptyText}>
              Connect with someone to start chatting!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  messageCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 48,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.card,
  },
  messageInfo: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  nameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  lastMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  lastMessageUnread: {
    color: colors.text,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
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
});
