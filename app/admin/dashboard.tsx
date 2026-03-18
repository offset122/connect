
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
  is_admin: boolean;
  is_verified: boolean;
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
    backgroundColor: colors.card,
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
    backgroundColor: colors.card,
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
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  card: {
    backgroundColor: colors.card,
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
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
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
  editButton: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
  },
  editButtonText: {
    color: colors.primary,
  },
  renewButton: {
    backgroundColor: 'transparent',
    borderColor: '#4CAF50',
  },
  renewButtonText: {
    color: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderColor: '#EF5350',
  },
  deleteButtonText: {
    color: '#EF5350',
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
    backgroundColor: colors.card,
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
  searchContainer: {
    marginBottom: 20,
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  mpesaCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

export default function AdminDashboardScreen() {
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'mpesa'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mpesaSearchQuery, setMpesaSearchQuery] = useState('');
  const [mpesaResults, setMpesaResults] = useState<any[]>([]);
  const [searchingMpesa, setSearchingMpesa] = useState(false);
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

    const { data: userData } = await (supabase as any)
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

const searchMpesaTransactions = async () => {
  if (!mpesaSearchQuery.trim()) {
    Alert.alert('Error', 'Please enter a search term');
    return;
  }

  setSearchingMpesa(true);
  try {
    const { data, error } = await (supabase as any)
      .from('user_payments')
      .select(`
        id,
        user_id,
        amount,
        currency,
        status,
        transaction_id,
        checkout_request_id,
        mpesa_receipt,
        transaction_date,
        payment_completed,
        created_at,
        user:user_id(
          email,
          first_name,
          username,
          has_paid,
          payment_status
        )
      `)
      .or(`transaction_id.ilike.%${mpesaSearchQuery}%,checkout_request_id.ilike.%${mpesaSearchQuery}%,mpesa_receipt.ilike.%${mpesaSearchQuery}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    setMpesaResults(data || []);
  } catch (error: any) {
    console.error('Error searching M-Pesa transactions:', error);
    Alert.alert('Error', 'Failed to search M-Pesa transactions');
  } finally {
    setSearchingMpesa(false);
  }
};

const clearMpesaSearch = () => {
  setMpesaSearchQuery('');
  setMpesaResults([]);
};

const fetchUsers = async () => {
  try {
    const { data, error } = await (supabase as any)
      .from('users')
      .select('id, email, username, first_name, is_active, is_admin, is_verified, has_paid, payment_date, created_at, account_expiry')
      .order('created_at', { ascending: false });

    if (error) throw error;

    setUsers(data || []);
    
    // Calculate stats
    const totalUsers = data?.length || 0;
    const activeUsers = data?.filter((u: any) => u.is_active).length || 0;
    const paidUsers = data?.filter((u: any) => u.has_paid).length || 0;
    const unpaidUsers = data?.filter((u: any) => !u.has_paid).length || 0;

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
    const { data, error } = await (supabase as any)
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
    const pendingReports = data?.filter((r: any) => r.status === 'pending').length || 0;

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

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
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
      console.log('Admin Dashboard: Toggling user status for userId:', userId, 'from:', currentStatus, 'to:', !currentStatus);

      const { data, error } = await (supabase as any)
        .from('users')
        .update({
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select();

      if (error) {
        console.error('Admin Dashboard: Error updating user status:', error);
        throw error;
      }

      console.log('Admin Dashboard: User status updated successfully:', data);
      Alert.alert('Success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error: any) {
      console.error('Admin Dashboard: Error updating user status:', error);
      Alert.alert('Error', 'Failed to update user status: ' + error.message);
    }
  };

  const viewUserDetails = (userId: string) => {
  router.push(`/admin/user/${userId}`);
};

const renewAccount = async (userId: string, userEmail: string) => {
  Alert.alert(
    'Renew Account',
    `Renew account for ${userEmail}? This will mark them as paid and active for now.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Renew',
        onPress: async () => {
          try {
            const { error } = await (supabase as any)
              .from('users')
              .update({
                has_paid: true,
                payment_status: 'completed',
                is_active: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (error) throw error;

            Alert.alert('Success', 'Account renewed successfully');
            fetchUsers();
          } catch (error: any) {
            console.error('Error renewing account:', error);
            Alert.alert('Error', 'Failed to renew account: ' + error.message);
          }
        },
      },
    ]
  );
};

const deleteAccount = async (userId: string, userEmail: string) => {
  // First get user info to check if they're an admin
  try {
    const { data: userData, error: userError } = await (supabase as any)
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Prevent deleting admin accounts
    if (userData?.is_admin) {
      Alert.alert(
        'Cannot Delete',
        'Admin accounts cannot be deleted. Please demote the user first if you need to remove admin privileges.'
      );
      return;
    }

    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete ${userEmail}'s account? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await (supabase as any)
                .from('users')
                .delete()
                .eq('id', userId);

              if (error) throw error;

              Alert.alert('Success', 'Account deleted successfully');
              fetchUsers();
            } catch (error: any) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  } catch (error: any) {
    console.error('Error checking user admin status:', error);
    Alert.alert('Error', 'Failed to verify user status');
  }
};

const editAccount = async (userId: string, userEmail: string) => {
  console.log('Admin Dashboard: Starting edit account for userId:', userId, 'email:', userEmail);

  // Simple sequential editing for key fields
  const editEmail = async () => {
    return new Promise<string>((resolve) => {
      Alert.prompt(
        'Edit Email',
        `Current email: ${userEmail}`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('') },
          {
            text: 'Next',
            onPress: (value: string | undefined) => resolve(value || '')
          },
        ],
        'plain-text',
        userEmail
      );
    });
  };

  const editUsername = async () => {
    return new Promise<string>((resolve) => {
      Alert.prompt(
        'Edit Username',
        'Enter new username (leave empty to keep current):',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('') },
          {
            text: 'Next',
            onPress: (value: string | undefined) => resolve(value || '')
          },
        ],
        'plain-text'
      );
    });
  };

  const editFirstName = async () => {
    return new Promise<string>((resolve) => {
      Alert.prompt(
        'Edit Full Name',
        'Enter new first name (leave empty to keep current):',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve('') },
          {
            text: 'Save',
            onPress: (value: string | undefined) => resolve(value || '')
          },
        ],
        'plain-text'
      );
    });
  };

  try {
    // Edit email
    const newEmail = await editEmail();
    console.log('Admin Dashboard: Email edit result:', newEmail);
    if (newEmail === '') return; // Cancelled

    // Edit username
    const newUsername = await editUsername();
    console.log('Admin Dashboard: Username edit result:', newUsername);
    if (newUsername === '') return; // Cancelled

    // Edit first name
    const newFirstName = await editFirstName();
    console.log('Admin Dashboard: First name edit result:', newFirstName);
    if (newFirstName === '') return; // Cancelled

    // Prepare update data
    const updateData: any = { updated_at: new Date().toISOString() };

    if (newEmail && newEmail.trim() && newEmail.trim() !== userEmail) {
      updateData.email = newEmail.trim();
    }

    if (newUsername && newUsername.trim()) {
      updateData.username = newUsername.trim();
    }

    if (newFirstName && newFirstName.trim()) {
      updateData.first_name = newFirstName.trim();
    }

    console.log('Admin Dashboard: Prepared update data:', updateData);

    // Check if there's anything to update
    if (Object.keys(updateData).length === 1) { // Only updated_at
      Alert.alert('No Changes', 'No changes were made to the account.');
      return;
    }

    console.log('Admin Dashboard: Updating user with data:', updateData);
    const { data, error } = await (supabase as any)
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Admin Dashboard: Update error:', error);
      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('email')) {
          Alert.alert('Error', 'Email address is already in use by another account.');
        } else if (error.message.includes('username')) {
          Alert.alert('Error', 'Username is already taken.');
        } else {
          Alert.alert('Error', 'Duplicate value entered.');
        }
      } else {
        throw error;
      }
      return;
    }

    console.log('Admin Dashboard: Update successful:', data);
    Alert.alert('Success', 'Account updated successfully');
    fetchUsers();
  } catch (error: any) {
    console.error('Admin Dashboard: Error updating account:', error);
    Alert.alert('Error', 'Failed to update account: ' + error.message);
  }
};

const verifyUserEmail = async (userId: string, userEmail: string) => {
  Alert.alert(
    'Verify User Email',
    `Mark ${userEmail}'s email as verified? This will allow them to access the full app.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Verify',
        onPress: async () => {
          try {
            const { error } = await (supabase as any)
              .from('users')
              .update({
                is_verified: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', userId);

            if (error) throw error;

            Alert.alert('Success', 'User email verified successfully');
            fetchUsers();
          } catch (error: any) {
            console.error('Error verifying user email:', error);
            Alert.alert('Error', 'Failed to verify user email');
          }
        },
      },
    ]
  );
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
        <Pressable
          style={[styles.tab, activeTab === 'mpesa' && styles.activeTab]}
          onPress={() => setActiveTab('mpesa')}
        >
          <Text style={[styles.tabText, activeTab === 'mpesa' && styles.activeTabText]}>
            M-Pesa Search
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
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {user.is_admin && (
                        <View style={[styles.badge, { backgroundColor: '#FF9800' }]}>
                          <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
                            Admin
                          </Text>
                        </View>
                      )}
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
                        styles.editButton,
                        user.is_admin && { opacity: 0.5 } // Dim if user is admin
                      ]}
                      onPress={() => user.is_admin ?
                        Alert.alert('Cannot Edit', 'Admin accounts cannot be edited.') :
                        editAccount(user.id, user.email)
                      }
                    >
                      <Text style={[styles.actionButtonText, styles.editButtonText]}>
                        Edit
                      </Text>
                    </Pressable>

                    {!user.is_verified && (
                      <Pressable
                        style={[styles.actionButton, styles.activateButton]}
                        onPress={() => verifyUserEmail(user.id, user.email)}
                      >
                        <Text style={[styles.actionButtonText, styles.activateButtonText]}>
                          Verify Email
                        </Text>
                      </Pressable>
                    )}
                    
                    <Pressable
                      style={[styles.actionButton, styles.renewButton]}
                      onPress={() => renewAccount(user.id, user.email)}
                    >
                      <Text style={[styles.actionButtonText, styles.renewButtonText]}>
                        Renew
                      </Text>
                    </Pressable>
                    
                    <Pressable
                      style={[
                        styles.actionButton,
                        styles.deleteButton,
                        user.is_admin && { opacity: 0.5 } // Dim if user is admin
                      ]}
                      onPress={() => deleteAccount(user.id, user.email)}
                    >
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                        Delete
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
