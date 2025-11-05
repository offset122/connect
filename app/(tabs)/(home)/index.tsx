import React, { useState, useEffect } from "react";
import { Stack } from "expo-router";
import { ScrollView, StyleSheet, View, Text, Pressable, Platform, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/app/integrations/supabase/client";
import { calculateMatchPercentage, getMatchColor, getMatchLabel } from "@/utils/matchmaking";
import PhoneNumberRequest from "@/components/PhoneNumberRequest";
import ConnectionActions from "@/components/ConnectionActions";

type User = {
  id: string;
  name: string;
  age: number;
  location: string;
  bio: string;
  avatar: string;
  interests: string[];
  relationshipGoal?: string;
  matchPercentage?: number;
  profileData?: any;
  connectionStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
};

export default function DiscoverScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Get current authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('User auth error:', userError);
        throw new Error('Authentication required');
      }
      
      if (!user) {
        throw new Error('Please log in to view profiles');
      }

      setCurrentUserId(user.id);

      // Get current user's full profile for matchmaking
      const { data: currentProfile, error: profileError } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Profile not found. Please complete registration.');
      } else {
        setCurrentUserProfile(currentProfile);
        console.log('Current user profile loaded for matchmaking');
      }

      // Get existing connections to exclude from discovery
      const { data: connectionsData } = await (supabase as any)
        .from('connections')
        .select('requester_id, recipient_id, status')
        .or(`requester_id.eq.${currentProfile.id},recipient_id.eq.${currentProfile.id}`);

      // Get list of user IDs to exclude (connected users and current user)
      const excludedIds = new Set([currentProfile.id]);
      connectionsData?.forEach((conn: any) => {
        if (conn.requester_id !== currentProfile.id) excludedIds.add(conn.requester_id);
        if (conn.recipient_id !== currentProfile.id) excludedIds.add(conn.recipient_id);
      });

      // Fetch potential matches (active users not in excluded list)
      // For testing, fetch ALL active users regardless of payment status
      let query = (supabase as any)
        .from('users')
        .select('*')
        .eq('is_active', true)
        .not('id', 'in', `(${Array.from(excludedIds).join(',')})`)
        .limit(50);

      const { data: usersData, error: usersError } = await query;

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw new Error('Failed to load profiles');
      }

      if (!usersData || usersData.length === 0) {
        throw new Error('No new profiles available. Check back later!');
      }

      // Map users data and calculate match percentages
      const mappedUsers: User[] = await Promise.all(
        usersData.map(async (u: any) => {
          const matchPercentage = currentProfile
            ? calculateMatchPercentage(currentProfile, u)
            : 0;

          // Check connection status
          let connectionStatus: 'none' | 'pending' | 'accepted' | 'rejected' = 'none';
          try {
            const { data: connection } = await (supabase as any)
              .from('connections')
              .select('status')
              .or(`and(requester_id.eq.${currentProfile.id},recipient_id.eq.${u.id}),and(requester_id.eq.${u.id},recipient_id.eq.${currentProfile.id})`)
              .single();
            connectionStatus = (connection?.status as any) || 'none';
          } catch (error) {
            connectionStatus = 'none';
          }

          return {
            id: u.id,
            name: u.first_name || 'Unknown',
            age: u.age || 0,
            location: u.county || u.city || 'Unknown',
            bio: u.bio || 'No bio available',
            avatar: u.avatar || (u.gender === 'Male' ? '👨' : '👩'),
            interests: u.interests ? (typeof u.interests === 'string' ? u.interests.split(',') : []) : [],
            relationshipGoal: u.relationship_goal,
            matchPercentage,
            profileData: u,
            connectionStatus,
          };
        })
      );

      // Sort by match percentage (highest first)
      mappedUsers.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));

      setUsers(mappedUsers);
      setCurrentIndex(0);
      console.log('Users loaded:', mappedUsers.length, 'with match percentages');
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setUsers([]);
      Alert.alert('Error', error.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReject = async () => {
    if (currentIndex >= users.length) return;
    
    console.log('Rejected user:', users[currentIndex].name);
    
    if (currentIndex < users.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      Alert.alert('No More Profiles', 'Check back later for new connections!');
    }
  };

  const checkConnectionStatus = async (targetUserId: string) => {
    if (!currentUserId) return 'none';

    try {
      const { data } = await (supabase as any)
        .from('connections')
        .select('status')
        .or(`and(requester_id.eq.${currentUserId},recipient_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},recipient_id.eq.${currentUserId})`)
        .single();

      return (data?.status as any) || 'none';
    } catch (error) {
      return 'none';
    }
  };

  const handleConnect = async () => {
    if (currentIndex >= users.length || !currentUserProfile) return;
    
    const targetUser = users[currentIndex];
    
    try {
      console.log('Sending connection request to:', targetUser.name);
      
      // Create connection request
      const { error } = await (supabase as any)
        .from('connections')
        .insert({
          requester_id: currentUserProfile.id,
          recipient_id: targetUser.id,
          status: 'pending',
        });

      if (error) throw error;

      Alert.alert('Success', `Connection request sent to ${targetUser.name}!`);
      
      // Refresh users to update connection status
      fetchUsers();
    } catch (error) {
      console.error('Error sending connection request:', error);
      Alert.alert('Error', 'Failed to send connection request');
    }
  };

  const handleAccept = async () => {
    if (currentIndex >= users.length || !currentUserProfile) return;
    
    const targetUser = users[currentIndex];
    
    try {
      await (supabase as any)
        .from('connections')
        .update({ status: 'accepted' })
        .eq('requester_id', targetUser.id)
        .eq('recipient_id', currentUserProfile.id);

      Alert.alert('Connected!', `You are now connected with ${targetUser.name}`);
      fetchUsers();
    } catch (error) {
      console.error('Error accepting connection:', error);
      Alert.alert('Error', 'Failed to accept connection');
    }
  };

  const handleDecline = async () => {
    if (currentIndex >= users.length || !currentUserProfile) return;
    
    const targetUser = users[currentIndex];
    
    try {
      await (supabase as any)
        .from('connections')
        .update({ status: 'rejected' })
        .eq('requester_id', targetUser.id)
        .eq('recipient_id', currentUserProfile.id);

      Alert.alert('Declined', `Connection request from ${targetUser.name} has been declined`);
      fetchUsers();
    } catch (error) {
      console.error('Error declining connection:', error);
      Alert.alert('Error', 'Failed to decline connection');
    }
  };

  const handleMessage = () => {
    if (currentIndex >= users.length) return;
    
    const targetUser = users[currentIndex];
    Alert.alert('Messaging', `Open chat with ${targetUser.name}`);
    // Navigate to messages screen
  };

  const handleRequestPhoto = () => {
    if (currentIndex >= users.length) return;
    
    const targetUser = users[currentIndex];
    Alert.alert(
      'Photo Request',
      `Send a request to ${targetUser.name} to view their photos?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: () => {
            Alert.alert('Request Sent!', `Photo request sent to ${targetUser.name}`);
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
        <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.text, { marginTop: 16 }]}>Finding matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentUser = users[currentIndex];

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Discover",
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
        {currentIndex < users.length && currentUser ? (
          <>
            <View style={styles.profileCard}>
              {/* Match Percentage Badge */}
              {currentUser.matchPercentage !== undefined && (
                <View 
                  style={[
                    styles.matchBadge, 
                    { backgroundColor: getMatchColor(currentUser.matchPercentage) }
                  ]}
                >
                  <IconSymbol name="heart.fill" size={16} color="#FFFFFF" />
                  <Text style={styles.matchPercentageText}>
                    {currentUser.matchPercentage}% Match
                  </Text>
                </View>
              )}

              <View style={styles.avatarContainer}>
                <Text style={styles.avatarEmoji}>{currentUser.avatar}</Text>
              </View>
              
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>
                    {currentUser.name}, {currentUser.age}
                  </Text>
                  
                  {/* Online Status Indicator */}
                  <View style={[
                    styles.onlineStatus,
                    currentUser.profileData?.last_login_at &&
                    new Date().getTime() - new Date(currentUser.profileData.last_login_at).getTime() < 15 * 60 * 1000 // 15 minutes
                    ? styles.onlineIndicator : styles.offlineIndicator
                  ]}>
                    <View style={[
                      styles.statusDot,
                      currentUser.profileData?.last_login_at &&
                      new Date().getTime() - new Date(currentUser.profileData.last_login_at).getTime() < 15 * 60 * 1000
                      ? styles.onlineDot : styles.offlineDot
                    ]} />
                    <Text style={[
                      styles.statusText,
                      currentUser.profileData?.last_login_at &&
                      new Date().getTime() - new Date(currentUser.profileData.last_login_at).getTime() < 15 * 60 * 1000
                      ? styles.onlineText : styles.offlineText
                    ]}>
                      {currentUser.profileData?.last_login_at &&
                      new Date().getTime() - new Date(currentUser.profileData.last_login_at).getTime() < 15 * 60 * 1000
                      ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                </View>
                
                {/* Profession */}
                {currentUser.profileData?.current_profession && (
                  <View style={styles.professionRow}>
                    <IconSymbol name="briefcase.fill" size={16} color={colors.textSecondary} />
                    <Text style={styles.profession}>{currentUser.profileData.current_profession}</Text>
                  </View>
                )}
                
                {/* Location - Conditional based on country */}
                {/* Gender */}
                <View style={styles.genderRow}>
                  <IconSymbol name="person.fill" size={14} color={colors.textSecondary} />
                  <Text style={styles.gender}>{currentUser.profileData?.gender || 'Not specified'}</Text>
                </View>

                {/* Location */}
                <View style={styles.locationRow}>
                  <IconSymbol name="location.fill" size={16} color={colors.textSecondary} />
                  <Text style={styles.location}>
                    {currentUser.profileData?.country_of_residence === 'Kenya'
                      ? `${currentUser.profileData?.county || 'Kenya'}, Kenya`
                      : `${currentUser.profileData?.city || currentUser.profileData?.county || ''} ${currentUser.profileData?.country_of_residence || ''}`.trim()
                    }
                  </Text>
                </View>

                {/* Nationality */}
                {currentUser.profileData?.nationality && (
                  <View style={styles.nationalityRow}>
                    <IconSymbol name="globe" size={14} color={colors.textSecondary} />
                    <Text style={styles.nationality}>{currentUser.profileData.nationality}</Text>
                  </View>
                )}

                {currentUser.relationshipGoal && (
                  <View style={styles.goalBadge}>
                    <Text style={styles.goalText}>{currentUser.relationshipGoal}</Text>
                  </View>
                )}
                {currentUser.matchPercentage !== undefined && (
                  <Text style={styles.matchLabel}>
                    {getMatchLabel(currentUser.matchPercentage)}
                  </Text>
                )}
                <Text style={styles.bio}>{currentUser.bio}</Text>
              </View>

              {currentUser.interests && currentUser.interests.length > 0 && (
                <View style={styles.interestsContainer}>
                  <Text style={styles.interestsTitle}>Interests</Text>
                  <View style={styles.interestsList}>
                    {currentUser.interests.map((interest, index) => (
                      <View key={index} style={styles.interestTag}>
                        <Text style={styles.interestText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}


              {/* Connection Actions Component */}
              <View style={styles.actionsRow}>
                <View style={styles.connectionActionsContainer}>
                  <ConnectionActions
                    targetUserName={currentUser.name}
                    targetUserId={currentUser.id}
                    connectionStatus={currentUser.connectionStatus || 'none'}
                    onConnect={handleConnect}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    onMessage={handleMessage}
                    onRequestPhoto={handleRequestPhoto}
                  />
                </View>

                {/* Phone Number Request Button */}
                {currentUser.connectionStatus === 'accepted' && (
                  <View style={styles.phoneRequestContainer}>
                    <PhoneNumberRequest
                      targetUserName={currentUser.name}
                      targetUserId={currentUser.id}
                    />
                  </View>
                )}
              </View>

              <View style={styles.progressIndicator}>
                <Text style={styles.progressText}>
                  {currentIndex + 1} / {users.length}
                </Text>
              </View>
            </View>

            {/* Only show reject button if not connected */}
            {(!currentUser.connectionStatus || currentUser.connectionStatus === 'none') && (
              <View style={styles.actionsContainer}>
                <Pressable 
                  style={styles.rejectButton}
                  onPress={handleReject}
                >
                  <IconSymbol name="xmark" size={32} color={colors.card} />
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <IconSymbol name="heart" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No More Profiles</Text>
            <Text style={styles.emptyText}>
              Check back later for new connections!
            </Text>
            <Pressable style={styles.refreshButton} onPress={fetchUsers}>
              <IconSymbol name="arrow.clockwise" size={20} color={colors.card} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </Pressable>
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
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
    position: 'relative',
  },
  matchBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
    elevation: 4,
  },
  matchPercentageText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarEmoji: {
    fontSize: 64,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineIndicator: {
    backgroundColor: '#00FF41',
    shadowColor: '#00FF41',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 8,
  },
  offlineIndicator: {
    backgroundColor: '#808080',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineDot: {
    backgroundColor: '#00FF41',
    shadowColor: '#00FF41',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 6,
  },
  offlineDot: {
    backgroundColor: '#808080',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  onlineText: {
    color: '#000000',
    fontWeight: '600',
  },
  offlineText: {
    color: colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  connectionActionsContainer: {
    flex: 1,
  },
  phoneRequestContainer: {
    flex: 1,
  },
  professionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  profession: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  location: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  nationalityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  nationality: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  goalBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.card,
  },
  matchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  interestsContainer: {
    marginTop: 8,
  },
  interestsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  interestText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  progressIndicator: {
    marginTop: 16,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 8,
  },
  rejectButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  connectButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 8px rgba(233, 30, 99, 0.3)',
    elevation: 4,
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
    marginBottom: 24,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
  },
});
