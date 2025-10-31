
import React, { useState, useEffect } from "react";
import { ScrollView, StyleSheet, View, Text, Pressable, Platform, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";

type ConnectionRequest = {
  id: string;
  name: string;
  age: number;
  location: string;
  avatar: string;
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
      const { data: connectionsData, error: connectionsError } = await supabase
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
      connectionsData?.forEach(conn => {
        if (conn.requester_id !== user.id) userIds.add(conn.requester_id);
        if (conn.recipient_id !== user.id) userIds.add(conn.recipient_id);
      });

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, age, county, city, avatar, gender')
        .in('id', Array.from(userIds));

      if (usersError) throw usersError;

      // Map connections with user details
      const mappedConnections: ConnectionRequest[] = connectionsData?.map(conn => {
        const otherUserId = conn.requester_id === user.id ? conn.recipient_id : conn.requester_id;
        const otherUser = usersData?.find(u => u.id === otherUserId);
        
        return {
          id: conn.id,
          name: otherUser?.first_name || 'Unknown',
          age: otherUser?.age || 0,
          location: otherUser?.county || otherUser?.city || 'Unknown',
          avatar: otherUser?.avatar || (otherUser?.gender === 'Male' ? '👨' : '👩'),
          status: conn.status as 'pending' | 'accepted' | 'rejected' | 'liked',
          type: conn.requester_id === user.id ? 'sent' : 'received',
          userId: otherUserId,
        };
      }) || [];

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
      
      const { error } = await supabase
        .from('connections')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

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
      
      const { error } = await supabase
        .from('connections')
        .update({ 
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

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

  const pendingReceived = connections.filter(c => c.status === 'pending' && c.type === 'received');
  const pendingSent = connections.filter(c => c.status === 'pending' && c.type === 'sent');
  const accepted = connections.filter(c => c.status === 'accepted');

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
              <View key={connection.id} style={styles.connectionCard}>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarEmojiSmall}>{connection.avatar}</Text>
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionName}>
                    {connection.name}, {connection.age}
                  </Text>
                  <View style={styles.locationRow}>
                    <IconSymbol name="location.fill" size={14} color={colors.textSecondary} />
                    <Text style={styles.connectionLocation}>{connection.location}</Text>
                  </View>
                </View>
                <View style={styles.actionButtons}>
                  <Pressable 
                    style={styles.acceptButton}
                    onPress={() => handleAccept(connection.id)}
                  >
                    <IconSymbol name="checkmark" size={20} color={colors.card} />
                  </Pressable>
                  <Pressable 
                    style={styles.rejectButtonSmall}
                    onPress={() => handleReject(connection.id)}
                  >
                    <IconSymbol name="xmark" size={20} color={colors.card} />
                  </Pressable>
                </View>
              </View>
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
              <View key={connection.id} style={styles.connectionCard}>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarEmojiSmall}>{connection.avatar}</Text>
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionName}>
                    {connection.name}, {connection.age}
                  </Text>
                  <View style={styles.locationRow}>
                    <IconSymbol name="location.fill" size={14} color={colors.textSecondary} />
                    <Text style={styles.connectionLocation}>{connection.location}</Text>
                  </View>
                </View>
                <View style={styles.statusBadge}>
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
                </View>
              </View>
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
              <View key={connection.id} style={styles.connectionCard}>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarEmojiSmall}>{connection.avatar}</Text>
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={styles.connectionName}>
                    {connection.name}, {connection.age}
                  </Text>
                  <View style={styles.locationRow}>
                    <IconSymbol name="location.fill" size={14} color={colors.textSecondary} />
                    <Text style={styles.connectionLocation}>{connection.location}</Text>
                  </View>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              </View>
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  avatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(76, 175, 80, 0.3)',
    elevation: 2,
  },
  rejectButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 4px rgba(244, 67, 54, 0.3)',
    elevation: 2,
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
});
