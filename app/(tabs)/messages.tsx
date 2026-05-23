import React, { useState, useEffect, useCallback } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable, Platform, ActivityIndicator, Alert, Modal, RefreshControl, Image, TextInput, Linking, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useFocusEffect } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles, spacing, borderRadius, shadows, responsiveStyles, BREAKPOINTS } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { withTimeout } from '@/utils/withTimeout';

// Get local avatar image from assets
const getAvatarImage = (filename: string | null | undefined) => {
  if (!filename) return null;
  
  const avatarMap: { [key: string]: any } = {
    '3d-cartoon-portrait-person-practicing-law-related-profession.jpg': require('../../assets/3d-cartoon-portrait-person-practicing-law-related-profession.jpg'),
    '408535ae-483f-477a-a0e6-3e28d0eabb88.jpg': require('../../assets/408535ae-483f-477a-a0e6-3e28d0eabb88.jpg'),
    '2809696b-04f1-4ca8-8194-2ac46919f408.jpg': require('../../assets/2809696b-04f1-4ca8-8194-2ac46919f408.jpg'),
    'androgynous-avatar-non-binary-queer-person.jpg': require('../../assets/androgynous-avatar-non-binary-queer-person.jpg'),
    'b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg': require('../../assets/b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg'),
    'b400cea9-fa0a-4595-9865-d1216fea02e8.jpg': require('../../assets/b400cea9-fa0a-4595-9865-d1216fea02e8.jpg'),
    'av1.jpg': require('../../assets/av1.jpg'),
    'av2.jpg': require('../../assets/av2.jpg'),
    'av3.jpg': require('../../assets/av3.jpg'),
    'av4.jpg': require('../../assets/av4.jpg'),
    'av5.jpg': require('../../assets/av5.jpg'),
    'av6.jpg': require('../../assets/av6.jpg'),
    'men1.jpg': require('../../assets/men1.jpg'),
    'men2.jpg': require('../../assets/men2.jpg'),
    'men3.jpg': require('../../assets/men3.jpg'),
  };
  return avatarMap[filename] || null;
};

// Get random avatar if user has none
const getRandomAvatar = () => {
  const avatars = [
    'av1.jpg', 'av2.jpg', 'av3.jpg', 'av4.jpg', 'av5.jpg', 'av6.jpg'
  ];
  const randomIndex = Math.floor(Math.random() * avatars.length);
  return avatars[randomIndex];
};

type Message = {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  unreadCount?: number;
  userId: string;
  isOnline?: boolean;
  isPinned?: boolean;
  lastSeen?: string;
};

export default function MessagesScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');
  const [showChatOptions, setShowChatOptions] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user) {
        Alert.alert('Error', 'Please log in to view messages');
        router.replace('/login');
        return;
      }

      setCurrentUserId(user.id);

      // Fetch messages where user is either sender or receiver (exclude deleted)
      const { data: messagesData, error: messagesError } = await withTimeout(
        (supabase as any)
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
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
      );

      if (messagesError) throw messagesError;

      // Group messages by conversation (other user)
      const conversationsMap = new Map<string, any>();

      messagesData?.forEach((msg: any) => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

        // Parse call history messages
        let displayContent = msg.content;
        if (msg.content.startsWith('[Call:')) {
          try {
            const callDataStr = msg.content.slice(6, -1);
            const callData = JSON.parse(callDataStr);
            const callTypeText = callData.call_type === 'video' ? 'video call' : 'voice call';
            if (callData.status === 'missed') {
              displayContent = `Missed ${callTypeText}`;
            } else if (callData.status === 'ended' && callData.duration) {
              displayContent = `${callTypeText} (${formatCallDuration(callData.duration)})`;
            } else {
              displayContent = callTypeText;
            }
          } catch (e) {
            displayContent = 'Call';
          }
        }

        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            userId: otherUserId,
            lastMessage: displayContent,
            timestamp: msg.created_at,
            unread: msg.receiver_id === user.id && msg.status !== 'read',
            unreadCount: msg.receiver_id === user.id && msg.status !== 'read' ? 1 : 0,
            messageId: msg.id,
          });
        } else {
          // Count unread messages
          const conv = conversationsMap.get(otherUserId);
          if (msg.receiver_id === user.id && msg.status !== 'read') {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }
          // Update last message if this is newer
          if (new Date(msg.created_at) > new Date(conv.timestamp)) {
            conv.lastMessage = displayContent;
            conv.timestamp = msg.created_at;
          }
        }
      });

      // Fetch user details for all conversations
      const userIds = Array.from(conversationsMap.keys());
      
      if (userIds.length === 0) {
        setMessages([]);
        setFilteredMessages([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: usersData, error: usersError } = await withTimeout(
        (supabase as any)
          .from('users')
          .select('id, first_name, avatar, gender, last_login, online_status')
          .in('id', userIds)
      );

      if (usersError) throw usersError;

      // Map conversations with user details
      const mappedMessages: Message[] = Array.from(conversationsMap.values()).map((conv: any) => {
        const otherUser = usersData?.find((u: any) => u.id === conv.userId);
        
        // Check if user is online (last login within 15 minutes)
        const isOnline = otherUser?.last_login && 
          new Date().getTime() - new Date(otherUser.last_login).getTime() < 15 * 60 * 1000;

        return {
          id: conv.messageId,
          name: otherUser?.first_name || 'Unknown',
          avatar: otherUser?.avatar || (otherUser?.gender === 'Male' ? '👨' : '👩'),
          lastMessage: conv.lastMessage || '',
          timestamp: formatTimestamp(conv.timestamp),
          unread: conv.unread,
          unreadCount: conv.unreadCount || 0,
          userId: conv.userId,
          isOnline,
          isPinned: false, // TODO: Implement pinning functionality
          lastSeen: otherUser?.last_login ? formatLastSeen(otherUser.last_login) : undefined,
        };
      });

      // Sort: pinned first, then by timestamp
      mappedMessages.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      setMessages(mappedMessages);
      setFilteredMessages(mappedMessages);
      console.log('Messages loaded:', mappedMessages.length);
    } catch (error) {
      console.error('Error fetching messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Refresh inbox every time the tab comes into focus (e.g. returning from chat)
  useFocusEffect(
    useCallback(() => {
      fetchMessages();
    }, [fetchMessages])
  );

  useEffect(() => {
    // Filter messages based on search and filter type
    let filtered = messages;

    if (searchQuery) {
      filtered = filtered.filter(msg => 
        msg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType === 'unread') {
      filtered = filtered.filter(msg => msg.unread);
    }

    setFilteredMessages(filtered);
  }, [searchQuery, filterType, messages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 15) return 'Active now';
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    if (diffDays === 1) return 'Active yesterday';
    if (diffDays < 7) return `Active ${diffDays}d ago`;

    return 'Active long ago';
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMessagePress = (userId: string) => {
    console.log('Opening chat with:', userId);
    router.push(`/chat/${userId}` as any);
  };

  const handleVoiceCall = (userId: string, userName: string) => {
    console.log('Starting voice call with:', userName);
    router.push(`/chat/${userId}` as any);
    // TODO: Trigger voice call
  };

  const handleVideoCall = (userId: string, userName: string) => {
    console.log('Starting video call with:', userName);
    router.push(`/chat/${userId}` as any);
    // TODO: Trigger video call
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMessages();
  };

  const handleChatLongPress = (message: Message) => {
    setSelectedMessage(message);
    setShowChatOptions(true);
  };

  const handleBlockUser = async (message: Message) => {
    if (!user) return;

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${message.name}? This will prevent them from contacting you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await (supabase as any)
                .from('blocked_users')
                .insert({
                  blocker_id: user.id,
                  blocked_id: message.userId,
                });

              if (error) throw error;

              Alert.alert('User Blocked', `${message.name} has been blocked.`);
              // Refresh messages to hide blocked user's chat
              fetchMessages();
            } catch (error: any) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleReportUser = async (message: Message) => {
    if (!user) return;

    const reportReasons = [
      'Spam',
      'Harassment',
      'Inappropriate Content',
      'Fake Profile',
      'Other',
    ];

    Alert.alert(
      'Report User',
      'What would you like to report about this user?',
      [
        ...reportReasons.map(reason => ({
          text: reason,
          onPress: () => submitReport(message, reason),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const submitReport = async (message: Message, reason: string) => {
    if (!user) return;

    try {
      // Send report via email
      const subject = encodeURIComponent(`Report: ${reason}`);
      const body = encodeURIComponent(`Reporting user: ${message.name} (${message.userId})\nReason: ${reason}\nReported by: ${user.email || user.id}\n\nPlease review this report and take appropriate action.`);
      const mailtoUrl = `mailto:support@hannasconnect.com?subject=${subject}&body=${body}`;

      await Linking.openURL(mailtoUrl);

      // Also insert into database for admin tracking
      const { data, error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: message.userId,
          reason: reason,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Report Sent',
        'Your report has been sent to support@hannasconnect.com. Our team will review it shortly. Thank you for helping keep Hanna\'s Connect safe!',
        [{ text: 'OK' }]
      );

      console.log('User report submitted:', { reason, reportedUser: message.name });
    } catch (error: any) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to send report. Please try again later.');
    }
  };

  const handleDeleteChat = async (message: Message) => {
    if (!user) return;

    Alert.alert(
      'Delete Chat',
      `Are you sure you want to delete this chat with ${message.name}? All messages will be deleted, but you can start chatting again anytime.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Mark all messages in this conversation as deleted
              const { error } = await (supabase as any)
                .from('messages')
                .update({ is_deleted: true })
                .or(`and(sender_id.eq.${user.id},receiver_id.eq.${message.userId}),and(sender_id.eq.${message.userId},receiver_id.eq.${user.id})`);

              if (error) throw error;

              Alert.alert('Chat Deleted', 'All messages have been deleted. You can start chatting again anytime.');
              // Refresh messages to remove the deleted chat
              fetchMessages();
            } catch (error: any) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete chat. Please try again.');
            }
          },
        },
      ]
    );
  };

  const unreadCount = messages.filter(m => m.unread).length;

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
      
      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter Tabs */}
        {messages.length > 0 && (
          <View style={styles.filterContainer}>
            <Pressable
              style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
              onPress={() => setFilterType('all')}
            >
              <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>
                All ({messages.length})
              </Text>
            </Pressable>
            <Pressable
              style={[styles.filterTab, filterType === 'unread' && styles.filterTabActive]}
              onPress={() => setFilterType('unread')}
            >
              <Text style={[styles.filterTabText, filterType === 'unread' && styles.filterTabTextActive]}>
                Unread ({unreadCount})
              </Text>
            </Pressable>
          </View>
        )}

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            Platform.OS !== 'ios' && styles.contentContainerWithTabBar
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {filteredMessages.length > 0 ? (
            filteredMessages.map((message) => (
              <Pressable
                key={message.id}
                style={({ pressed }) => [
                  styles.messageCard,
                  pressed && styles.messageCardPressed,
                  message.unread && styles.messageCardUnread
                ]}
                onPress={() => handleMessagePress(message.userId)}
                onLongPress={() => handleChatLongPress(message)}
                delayLongPress={500}
              >
                <View style={styles.messageContent}>
                  {/* Avatar with Online Status */}
                  <View style={styles.avatarContainer}>
                    {getAvatarImage(message.avatar) ? (
                      <Image 
                        source={getAvatarImage(message.avatar) || getAvatarImage(getRandomAvatar())} 
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarEmoji}>{message.avatar}</Text>
                      </View>
                    )}
                    {message.isOnline && <View style={styles.onlineDot} />}
                    {message.unread && message.unreadCount && message.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>
                          {message.unreadCount > 9 ? '9+' : message.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Message Info */}
                  <View style={styles.messageInfo}>
                    <View style={styles.messageHeader}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.name, message.unread && styles.nameUnread]}>
                          {message.name}
                        </Text>
                        {message.isPinned && (
                          <IconSymbol name="pin.fill" size={14} color={colors.accent} />
                        )}
                      </View>
                      <Text style={[styles.timestamp, message.unread && styles.timestampUnread]}>
                        {message.timestamp}
                      </Text>
                    </View>
                    
                    <Text 
                      style={[styles.lastMessage, message.unread && styles.lastMessageUnread]}
                      numberOfLines={2}
                    >
                      {message.lastMessage}
                    </Text>

                    {!message.isOnline && message.lastSeen && (
                      <Text style={styles.lastSeen}>{message.lastSeen}</Text>
                    )}
                  </View>

                  {/* Quick Actions */}
                  <View style={styles.quickActions}>
                    <Pressable
                      style={styles.quickActionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleVoiceCall(message.userId, message.name);
                      }}
                    >
                      <IconSymbol name="phone.fill" size={18} color={colors.primary} />
                    </Pressable>
                    <Pressable
                      style={styles.quickActionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleVideoCall(message.userId, message.name);
                      }}
                    >
                      <IconSymbol name="video.fill" size={18} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <IconSymbol 
                  name={searchQuery || filterType === 'unread' ? "magnifyingglass" : "message"} 
                  size={56} 
                  color={colors.primary} 
                />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Results Found' : filterType === 'unread' ? 'No Unread Messages' : 'No Messages Yet'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? `No messages match "${searchQuery}"`
                  : filterType === 'unread'
                  ? "You're all caught up!"
                  : 'Connect with someone to start chatting!'}
              </Text>
              {!searchQuery && filterType === 'all' && (
                <Pressable 
                  style={styles.discoverButton}
                  onPress={() => router.push('/(tabs)/(home)')}
                >
                  <IconSymbol name="person.2.fill" size={20} color={colors.card} />
                  <Text style={styles.discoverButtonText}>Discover People</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {/* Chat Options Modal */}
        <Modal
          visible={showChatOptions}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowChatOptions(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Pressable
                onPress={() => setShowChatOptions(false)}
                style={styles.modalClose}
              >
                <IconSymbol name="xmark" size={24} color={colors.textSecondary} />
              </Pressable>
              <Text style={styles.modalTitle}>Chat Options</Text>
              <Text style={styles.modalMessage}>
                What would you like to do with {selectedMessage?.name}?
              </Text>
              <View style={styles.modalOptions}>
                <Pressable
                  style={[styles.modalOption, styles.modalOptionDestructive]}
                  onPress={() => {
                    setShowChatOptions(false);
                    handleBlockUser(selectedMessage!);
                  }}
                >
                  <Text style={[styles.modalOptionText, styles.modalOptionTextDestructive]}>Block User</Text>
                </Pressable>
                <Pressable
                  style={styles.modalOption}
                  onPress={() => {
                    setShowChatOptions(false);
                    handleReportUser(selectedMessage!);
                  }}
                >
                  <Text style={styles.modalOptionText}>Report User</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalOption, styles.modalOptionDestructive]}
                  onPress={() => {
                    setShowChatOptions(false);
                    handleDeleteChat(selectedMessage!);
                  }}
                >
                  <Text style={[styles.modalOptionText, styles.modalOptionTextDestructive]}>Delete Chat</Text>
                </Pressable>
                <Pressable
                  style={styles.modalOption}
                  onPress={() => setShowChatOptions(false)}
                >
                  <Text style={styles.modalOptionText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  filterTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.card,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  messageCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  messageCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  messageCardUnread: {
    backgroundColor: colors.primary + '08',
    borderColor: colors.primary + '20',
    borderWidth: 1.5,
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.card,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderWidth: 2,
    borderColor: colors.card,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.card,
  },
  messageInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  nameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timestampUnread: {
    color: colors.primary,
    fontWeight: '600',
  },
  lastMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 21,
    fontWeight: '400',
    marginBottom: spacing.xs,
  },
  lastMessageUnread: {
    color: colors.text,
    fontWeight: '500',
  },
  lastSeen: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  quickActions: {
    flexDirection: 'column',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  quickActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  discoverButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    maxWidth: 400,
    width: '90%',
    ...shadows.lg,
    elevation: 10,
  },
  modalClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalMessage: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalOptions: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  modalOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalOptionDestructive: {
    backgroundColor: colors.error + '10',
    borderColor: colors.error + '20',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  modalOptionTextDestructive: {
    color: colors.error,
  },
});