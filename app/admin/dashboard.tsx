
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/app/integrations/supabase/client";
import { colors, commonStyles } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";

type User = {
  id: string;
  email: string;
  username: string | null;
  first_name: string;
  is_active: boolean;
  has_paid: boolean;
  payment_date: string | null;
  created_at: string;
  account_expiry: string | null;
};

type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter: {
    email: string;
    username: string | null;
  };
  reported_user: {
    email: string;
    username: string | null;
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: colors.primary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.text,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
  },
  badgeInactive: {
    backgroundColor: '#FFEBEE',
  },
  badgePaid: {
    backgroundColor: '#E3F2FD',
  },
  badgeUnpaid: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#2E7D32',
  },
  badgeTextInactive: {
    color: '#C62828',
  },
  badgeTextPaid: {
    color: '#1565C0',
  },
  badgeTextUnpaid: {
    color: '#E65100',
  },
  cardInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  viewButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  deactivateButton: {
    backgroundColor: 'transparent',
    borderColor: '#EF5350',
  },
  activateButton: {
    backgroundColor: 'transparent',
    borderColor: '#66BB6A',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewButtonText: {
    color: '#FFFFFF',
  },
  deactivateButtonText: {
    color: '#EF5350',
  },
  activateButtonText: {
    color: '#66BB6A',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportHeader: {
    marginBottom: 12,
  },
  reportReason: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
});

export default function AdminDashboardScreen() {
  const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    paidUsers: 0,
    unpaidUsers: 0,
    totalReports: 0,
    pendingReports: 0,
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.replace('/admin/login');
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!userData?.is_admin) {
      Alert.alert('Access Denied', 'You do not have admin privileges');
      router.replace('/');
      return;
    }

    fetchData();
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchReports()]);
    setLoading(false);
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, first_name, is_active, has_paid, payment_date, created_at, account_expiry')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
      
      // Calculate stats
      const totalUsers = data?.length || 0;
      const activeUsers = data?.filter(u => u.is_active).length || 0;
      const paidUsers = data?.filter(u => u.has_paid).length || 0;
      const unpaidUsers = data?.filter(u => !u.has_paid).length || 0;

      setStats(prev => ({
        ...prev,
        totalUsers,
        activeUsers,
        paidUsers,
        unpaidUsers,
      }));
    } catch (error: any) {
      console.error('Error fetching users:', error);
      Alert.alert('Error', 'Failed to fetch users');
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          id,
          reporter_id,
          reported_user_id,
          reason,
          description,
          status,
          created_at,
          reporter:reporter_id(email, username),
          reported_user:reported_user_id(email, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(data || []);
      
      const totalReports = data?.length || 0;
      const pendingReports = data?.filter(r => r.status === 'pending').length || 0;

      setStats(prev => ({
        ...prev,
        totalReports,
        pendingReports,
      }));
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      Alert.alert('Error', 'Failed to fetch reports');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/admin/login');
          },
        },
      ]
    );
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('Success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const viewUserDetails = (userId: string) => {
    router.push(`/admin/user/${userId}`);
  };

  const getFilteredUsers = () => {
    let filtered = users;

    // Apply filter
    if (filter === 'paid') {
      filtered = filtered.filter(u => u.has_paid);
    } else if (filter === 'unpaid') {
      filtered = filtered.filter(u => !u.has_paid);
    } else if (filter === 'active') {
      filtered = filtered.filter(u => u.is_active);
    } else if (filter === 'inactive') {
      filtered = filtered.filter(u => !u.is_active);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => 
        u.email?.toLowerCase().includes(query) ||
        u.username?.toLowerCase().includes(query) ||
        u.first_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.activeUsers}</Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.paidUsers}</Text>
            <Text style={styles.statLabel}>Paid Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.unpaidUsers}</Text>
            <Text style={styles.statLabel}>Unpaid Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalReports}</Text>
            <Text style={styles.statLabel}>Total Reports</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pendingReports}</Text>
            <Text style={styles.statLabel}>Pending Reports</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            Users
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
            Reports
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'users' ? (
          <>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by email, username, or name..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.filterContainer}
            >
              <Pressable
                style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                onPress={() => setFilter('all')}
              >
                <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
                  All
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterButton, filter === 'paid' && styles.filterButtonActive]}
                onPress={() => setFilter('paid')}
              >
                <Text style={[styles.filterButtonText, filter === 'paid' && styles.filterButtonTextActive]}>
                  Paid
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterButton, filter === 'unpaid' && styles.filterButtonActive]}
                onPress={() => setFilter('unpaid')}
              >
                <Text style={[styles.filterButtonText, filter === 'unpaid' && styles.filterButtonTextActive]}>
                  Unpaid
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
                onPress={() => setFilter('active')}
              >
                <Text style={[styles.filterButtonText, filter === 'active' && styles.filterButtonTextActive]}>
                  Active
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterButton, filter === 'inactive' && styles.filterButtonActive]}
                onPress={() => setFilter('inactive')}
              >
                <Text style={[styles.filterButtonText, filter === 'inactive' && styles.filterButtonTextActive]}>
                  Inactive
                </Text>
              </Pressable>
            </ScrollView>

            {getFilteredUsers().length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol name="person.3.fill" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No users found</Text>
              </View>
            ) : (
              getFilteredUsers().map((user) => (
                <View key={user.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>
                      {user.first_name || user.username || 'No name'}
                    </Text>
                    <View style={{ flexDirection: 'row' }}>
                      <View style={[styles.badge, user.is_active ? styles.badgeActive : styles.badgeInactive]}>
                        <Text style={[styles.badgeText, user.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                      <View style={[styles.badge, user.has_paid ? styles.badgePaid : styles.badgeUnpaid]}>
                        <Text style={[styles.badgeText, user.has_paid ? styles.badgeTextPaid : styles.badgeTextUnpaid]}>
                          {user.has_paid ? 'Paid' : 'Unpaid'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Email:</Text>
                      <Text style={styles.infoValue}>{user.email}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Username:</Text>
                      <Text style={styles.infoValue}>{user.username || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Joined:</Text>
                      <Text style={styles.infoValue}>{formatDate(user.created_at)}</Text>
                    </View>
                    {user.has_paid && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Payment Date:</Text>
                        <Text style={styles.infoValue}>{formatDate(user.payment_date)}</Text>
                      </View>
                    )}
                    {user.account_expiry && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Expires:</Text>
                        <Text style={styles.infoValue}>{formatDate(user.account_expiry)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      style={[styles.actionButton, styles.viewButton]}
                      onPress={() => viewUserDetails(user.id)}
                    >
                      <Text style={[styles.actionButtonText, styles.viewButtonText]}>
                        View Details
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.actionButton,
                        user.is_active ? styles.deactivateButton : styles.activateButton
                      ]}
                      onPress={() => toggleUserStatus(user.id, user.is_active)}
                    >
                      <Text style={[
                        styles.actionButtonText,
                        user.is_active ? styles.deactivateButtonText : styles.activateButtonText
                      ]}>
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            {reports.length === 0 ? (
              <View style={styles.emptyState}>
                <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No reports found</Text>
              </View>
            ) : (
              reports.map((report) => (
                <View key={report.id} style={styles.reportCard}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportReason}>{report.reason}</Text>
                    <View style={styles.cardInfo}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Reporter:</Text>
                        <Text style={styles.infoValue}>
                          {report.reporter?.username || report.reporter?.email || 'Unknown'}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Reported User:</Text>
                        <Text style={styles.infoValue}>
                          {report.reported_user?.username || report.reported_user?.email || 'Unknown'}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Status:</Text>
                        <Text style={styles.infoValue}>{report.status}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Date:</Text>
                        <Text style={styles.infoValue}>{formatDate(report.created_at)}</Text>
                      </View>
                    </View>
                    {report.description && (
                      <Text style={styles.reportDescription}>{report.description}</Text>
                    )}
                  </View>

                  <View style={styles.cardActions}>
                    <Pressable
                      style={[styles.actionButton, styles.viewButton]}
                      onPress={() => viewUserDetails(report.reported_user_id)}
                    >
                      <Text style={[styles.actionButtonText, styles.viewButtonText]}>
                        View User
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
