
import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable, Platform, ActivityIndicator, Alert, RefreshControl, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import PhoneNumberRequest from "@/components/PhoneNumberRequest";


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

type ConnectionRequest = {
  id: string;
  name: string;
  age: number;
  location: string;
  avatar: string;
  introduce_yourself?: string;
  current_profession?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'liked';
  type: 'sent' | 'received';
  userId: string;
};

export default function ConnectionsScreen() {
  const [connections, setConnections] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        Alert.alert('Error', 'Please log in to view connections');
        return;
      }

      setCurrentUserId(user.id);

      // Fetch connections where user is either requester or recipient
      const { data: connectionsData, error: connectionsError } = await (supabase as any)
        .from('connections')
        .select(`
          id,
          status,
          requester_id,
          recipient_id,
          created_at
        `)
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (connectionsError) throw connectionsError;

      // Fetch user details for all connections
      const userIds = new Set<string>();
      connectionsData?.forEach((conn: any) => {
        if (conn.requester_id !== user.id) userIds.add(conn.requester_id);
        if (conn.recipient_id !== user.id) userIds.add(conn.recipient_id);
      });

      const { data: usersData, error: usersError } = await (supabase as any)
        .from('users')
        .select(`
          id,
          first_name,
          gender,
          age,
          city,
          county,
          avatar,
          introduce_yourself,
          current_profession,
          has_paid,
          is_active
        `)
        .in('id', Array.from(userIds))
        .eq('is_active', true)
        .eq('has_paid', true);

      if (usersError) throw usersError;

      // Map connections with user details
      const mappedConnections: ConnectionRequest[] = connectionsData?.map((conn: any) => {
        const otherUserId = conn.requester_id === user.id ? conn.recipient_id : conn.requester_id;
        const otherUser = usersData?.find((u: any) => u.id === otherUserId);
        
        // Only include complete active paid accounts
        if (!otherUser || !otherUser.is_active || !otherUser.has_paid) {
          return null;
        }
        
        return {
          id: conn.id,
          name: otherUser?.first_name || 'Unknown',
          age: otherUser?.age || 0,
          location: otherUser?.county || otherUser?.city || 'Unknown',
          avatar: otherUser?.avatar || (otherUser?.gender === 'Male' ? '👨' : '👩'),
          introduce_yourself: otherUser?.introduce_yourself,
          current_profession: otherUser?.current_profession,
          status: (conn.status || 'pending').toLowerCase() as 'pending' | 'accepted' | 'rejected' | 'liked',
          type: conn.requester_id === user.id ? 'sent' : 'received',
          userId: otherUserId,
        };
      }).filter(Boolean) || [];

      setConnections(mappedConnections);
      console.log('Connections loaded:', mappedConnections.length);
    } catch (error) {
      console.error('Error fetching connections:', error);
      Alert.alert('Error', 'Failed to load connections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      console.log('Accepting connection:', id);
      
      // Find the connection to get requester info
      const connection = connections.find(c => c.id === id);
      if (!connection) return;

      const { error } = await (supabase as any)
        .from('connections')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Get current user's name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: currentUserData } = await (supabase as any)
          .from('users')
          .select('first_name, username')
          .eq('auth_id', user.id)
          .single();

        const currentUserName = currentUserData?.first_name || currentUserData?.username || 'Someone';

        // Create notification for the requester
        await (supabase as any)
          .from('notifications')
          .insert({
            user_id: connection.userId,
            title: 'Connection Accepted! 🎉',
            body: `${currentUserName} accepted your connection request. You can now message each other!`,
            read: false,
            data: {
              type: 'connection_accepted',
              notification_type: 'connection_accepted',
              related_user_id: currentUserId,
            },
          });
      }

      setConnections(connections.map(conn => 
        conn.id === id ? { ...conn, status: 'accepted' } : conn
      ));

      Alert.alert('Success', 'Connection accepted!');
    } catch (error) {
      console.error('Error accepting connection:', error);
      Alert.alert('Error', 'Failed to accept connection');
    }
  };

  const handleReject = async (id: string) => {
    try {
      console.log('Rejecting connection:', id);
      
      // Find the connection to get requester info
      const connection = connections.find(c => c.id === id);
      if (!connection) return;

      const { error } = await (supabase as any)
        .from('connections')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Get current user's name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: currentUserData } = await (supabase as any)
          .from('users')
          .select('first_name, username')
          .eq('auth_id', user.id)
          .single();

        const currentUserName = currentUserData?.first_name || currentUserData?.username || 'Someone';

        // Create notification for the requester
        await (supabase as any)
          .from('notifications')
          .insert({
            user_id: connection.userId,
            title: 'Connection Request Declined',
            body: `${currentUserName} declined your connection request.`,
            read: false,
            data: {
              type: 'connection_declined',
              notification_type: 'connection_declined',
              related_user_id: currentUserId,
            },
          });
      }

      setConnections(connections.filter(conn => conn.id !== id));

      Alert.alert('Connection Rejected', 'The connection request has been rejected.');
    } catch (error) {
      console.error('Error rejecting connection:', error);
      Alert.alert('Error', 'Failed to reject connection');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchConnections();
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
        <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.text, { marginTop: 16 }]}>Loading connections...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Use lowercase comparison only (bypass TS type warnings with any cast)
  const pendingReceived = connections.filter(c =>
    (c as any).status?.toLowerCase() === 'pending' && c.type === 'received'
  );
  const pendingSent = connections.filter(c =>
    (c as any).status?.toLowerCase() === 'pending' && c.type === 'sent'
  );
  const accepted = connections.filter(c =>
    (c as any).status?.toLowerCase() === 'accepted'
  );
  console.log('DEBUG Connections:', {
    total: connections.length,
    pendingReceived: pendingReceived.length,
    pendingSent: pendingSent.length,
    accepted: accepted.length,
    raw: connections
  });

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Connections",
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
        {pendingReceived.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Requests Received</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingReceived.length}</Text>
              </View>
            </View>
            {pendingReceived.map((connection) => (
              <Pressable 
                key={connection.id} 
                style={styles.connectionCard}
                onPress={() => router.push(`/(tabs)/(home)/profileview?userId=${connection.userId}`)}
              >
                <View style={styles.avatarSmall}>
                  {getAvatarImage(connection.avatar) ? (
                    <Image 
                      source={getAvatarImage(connection.avatar) || getAvatarImage(getRandomAvatar())} 
                      style={styles.avatarImageSmall}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.avatarEmojiSmall}>{connection.avatar}</Text>
                  )}
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionName}>
                    {connection.name}, {connection.age}
                  </Text>
                  <View style={styles.locationRow}>
                    <IconSymbol name="location.fill" size={14} color={colors.textSecondary} />
                    <Text style={styles.connectionLocation}>{connection.location}</Text>
                  </View>
                  {connection.introduce_yourself && (
                    <Text style={styles.bioText} numberOfLines={2}>
                      "{connection.introduce_yourself}"
                    </Text>
                  )}
                  {connection.current_profession && (
                    <Text style={styles.professionText} numberOfLines={1}>
                      {connection.current_profession}
                    </Text>
                  )}
                </View>
                <View style={styles.actionButtons}>
                   <Pressable
                     style={styles.acceptButton}
                     onPress={(e) => {
                       e.stopPropagation();
                       handleAccept(connection.id);
                     }}
                   >
                     <IconSymbol name="checkmark" size={20} color={colors.card} />
                     <Text style={styles.buttonText}>Accept</Text>
                   </Pressable>
                   <Pressable
                     style={styles.rejectButtonSmall}
                     onPress={(e) => {
                       e.stopPropagation();
                       handleReject(connection.id);
                     }}
                   >
                     <IconSymbol name="xmark" size={20} color={colors.card} />
                     <Text style={styles.buttonText}>Not Compatible</Text>
                   </Pressable>
                 </View>
              </Pressable>
            ))}
          </View>
        )}

        {accepted.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Connected</Text>
              <View style={[styles.badge, styles.badgeSuccess]}>
                <Text style={styles.badgeText}>{accepted.length}</Text>
              </View>
            </View>
            {accepted.map((connection) => (
              <Pressable 
                key={connection.id} 
                style={styles.connectionCard}
                onPress={() => router.push(`/(tabs)/(home)/profileview?userId=${connection.userId}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatarLarge}>
                      {getAvatarImage(connection.avatar) ? (
                        <Image 
                          source={getAvatarImage(connection.avatar) || getAvatarImage(getRandomAvatar())} 
                          style={styles.avatarImageLarge}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.avatarEmojiLarge}>{connection.avatar}</Text>
                      )}
                    </View>
                    <View style={styles.onlineIndicator}>
                      <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
                    </View>
                  </View>
                  <View style={styles.headerActions}>
                    <Pressable
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(`/(tabs)/(home)/profileview?userId=${connection.userId}`);
                      }}
                    >
                      <IconSymbol name="person.fill" size={16} color={colors.primary} />
                      <Text style={styles.actionButtonText}>Profile</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (!connection.userId) {
                          Alert.alert('Error', 'Unable to open chat. User not found.');
                          return;
                        }
                        router.push(`/chat/${connection.userId}`);
                      }}
                    >
                      <IconSymbol name="message.fill" size={16} color={colors.secondary} />
                      <Text style={styles.actionButtonText}>Chat</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.nameSection}>
                    <Text style={styles.connectionNameLarge}>
                      {connection.name}, {connection.age}
                    </Text>
                    <View style={styles.locationRow}>
                      <IconSymbol name="location.fill" size={14} color={colors.textSecondary} />
                      <Text style={styles.connectionLocation}>{connection.location}</Text>
                    </View>
                  </View>

                  <View style={styles.detailsSection}>
                  </View>

                  {connection.introduce_yourself && (
                    <View style={styles.bioSection}>
                      <Text style={styles.bioLabel}>About</Text>
                      <Text style={styles.bioTextFull} numberOfLines={3}>
                        {connection.introduce_yourself}
                      </Text>
                    </View>
                  )}
                  {connection.current_profession && (
                    <View style={styles.professionSection}>
                      <Text style={styles.bioLabel}>Profession</Text>
                      <Text style={styles.bioTextFull} numberOfLines={1}>
                        {connection.current_profession}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.phoneRequestContainer}>
                    <PhoneNumberRequest
                      targetUserName={connection.name}
                      targetUserId={connection.userId}
                    />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {pendingSent.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Requests Sent</Text>
              <View style={[styles.badge, styles.badgeWarning]}>
                <Text style={styles.badgeText}>{pendingSent.length}</Text>
              </View>
            </View>
            {pendingSent.map((connection) => (
              <Pressable 
                key={connection.id} 
                style={styles.connectionCard}
                onPress={() => router.push(`/(tabs)/(home)/profileview?userId=${connection.userId}`)}
              >
                <View style={styles.avatarSmall}>
                  {getAvatarImage(connection.avatar) ? (
                    <Image 
                      source={getAvatarImage(connection.avatar) || getAvatarImage(getRandomAvatar())} 
                      style={styles.avatarImageSmall}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.avatarEmojiSmall}>{connection.avatar}</Text>
                  )}
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionName}>
                    {connection.name}, {connection.age}
                  </Text>
                  <View style={styles.locationRow}>
                    <IconSymbol name="location.fill" size={14} color={colors.textSecondary} />
                    <Text style={styles.connectionLocation}>{connection.location}</Text>
                  </View>
                  {connection.introduce_yourself && (
                    <Text style={styles.bioText} numberOfLines={2}>
                      "{connection.introduce_yourself}"
                    </Text>
                  )}
                  {connection.current_profession && (
                    <Text style={styles.professionText} numberOfLines={1}>
                      {connection.current_profession}
                    </Text>
                  )}
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {connections.length === 0 && (
          <View style={styles.emptyState}>
            <IconSymbol name="person.2" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Connections Yet</Text>
            <Text style={styles.emptyText}>
              Start discovering people to make connections!
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  badgeSuccess: {
    backgroundColor: colors.success,
  },
  badgeWarning: {
    backgroundColor: colors.accent,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.card,
  },
  connectionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'column',
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.12)',
    elevation: 4,
  },
  avatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImageSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarEmojiSmall: {
    fontSize: 32,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectionLocation: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.success,
    justifyContent: 'center',
    boxShadow: '0px 2px 4px rgba(76, 175, 80, 0.3)',
    elevation: 2,
  },
  rejectButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.error,
    justifyContent: 'center',
    boxShadow: '0px 2px 4px rgba(244, 67, 54, 0.3)',
    elevation: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.card,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 14,
    color: colors.textSecondary,
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
  connectedActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneRequestMini: {
    marginLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  connectionDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bioText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImageLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarEmojiLarge: {
    fontSize: 40,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 2,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  headerActions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  cardContent: {
    marginBottom: 16,
  },
  nameSection: {
    marginBottom: 12,
  },
  connectionNameLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  detailsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  bioSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  bioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  bioTextFull: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  professionText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },
  professionSection: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  phoneRequestContainer: {
    alignItems: 'center',
  },
});
