
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Switch, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";

export default function ProfileScreen() {
  const [isOnline, setIsOnline] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        Alert.alert('Error', 'Please log in to view your profile');
        router.replace('/login');
        return;
      }

      // Fetch user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      setUserProfile(profileData);
      setIsOnline((profileData as any)?.online_status || false);
      
      console.log('User profile loaded:', profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              
              console.log('User logged out successfully');
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleOnlineStatusToggle = async (value: boolean) => {
    try {
      setIsOnline(value);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase as any)
        .from('users')
        .update({
          online_status: value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      console.log('Online status updated:', value);
    } catch (error) {
      console.error('Error updating online status:', error);
      setIsOnline(!value); // Revert on error
      Alert.alert('Error', 'Failed to update online status');
    }
  };

  const calculateDaysRemaining = (expiryDate: string | null) => {
    if (!expiryDate) return 'Not set';
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
        <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.text, { marginTop: 16 }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
        <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
          <IconSymbol name="person" size={64} color={colors.textSecondary} />
          <Text style={[commonStyles.title, { marginTop: 16 }]}>Profile Not Found</Text>
          <Pressable style={[styles.editButton, { marginTop: 20 }]} onPress={() => router.replace('/registration')}>
            <Text style={styles.editButtonText}>Complete Registration</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = userProfile.first_name || userProfile.username || 'User';
  const fullName = userProfile.first_name && userProfile.last_name 
    ? `${userProfile.first_name} ${userProfile.last_name}` 
    : displayName;

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Profile",
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
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarEmojiLarge}>
              {userProfile.avatar || (userProfile.gender === 'Male' ? '👨' : '👩')}
            </Text>
          </View>
          <Text style={styles.name}>
            {fullName}{userProfile.age ? `, ${userProfile.age}` : ''}
          </Text>
          {(userProfile.county || userProfile.city) && (
            <View style={styles.locationRow}>
              <IconSymbol name="location.fill" size={16} color={colors.textSecondary} />
              <Text style={styles.location}>
                {userProfile.county || userProfile.city}
                {userProfile.country_of_residence && userProfile.country_of_residence !== 'Kenya' 
                  ? `, ${userProfile.country_of_residence}` 
                  : ''}
              </Text>
            </View>
          )}
          <Pressable style={styles.editButton} onPress={() => router.push('/edit-profile')}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Bio Section */}
        {userProfile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <Text style={styles.bioText}>{userProfile.bio}</Text>
          </View>
        )}

        {/* Relationship Info */}
        {(userProfile.relationship_goal || userProfile.sexual_orientation) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Relationship Preferences</Text>
            {userProfile.relationship_goal && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Looking for</Text>
                <Text style={styles.detailValue}>{userProfile.relationship_goal}</Text>
              </View>
            )}
            {userProfile.sexual_orientation && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Orientation</Text>
                <Text style={styles.detailValue}>{userProfile.sexual_orientation}</Text>
              </View>
            )}
          </View>
        )}

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Show Online Status</Text>
              <Text style={styles.settingDescription}>Let others see when you&apos;re online</Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={handleOnlineStatusToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Show Last Seen</Text>
              <Text style={styles.settingDescription}>Display when you were last active</Text>
            </View>
            <Switch
              value={showLastSeen}
              onValueChange={setShowLastSeen}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.card}
            />
          </View>
        </View>

        {/* Account Details (Non-editable) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{userProfile.email}</Text>
          </View>
          {userProfile.gender && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gender</Text>
              <Text style={styles.detailValue}>{userProfile.gender}</Text>
            </View>
          )}
          {userProfile.complexion && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Complexion</Text>
              <Text style={styles.detailValue}>{userProfile.complexion}</Text>
            </View>
          )}
          {userProfile.number_of_children !== null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Children</Text>
              <Text style={styles.detailValue}>
                {userProfile.number_of_children === 0 ? 'No' : userProfile.number_of_children}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Status</Text>
            <Text style={[
              styles.detailValue, 
              userProfile.has_paid ? styles.paidText : styles.unpaidText
            ]}>
              {userProfile.has_paid ? 'Paid' : 'Pending'}
            </Text>
          </View>
          {userProfile.account_expiry && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Subscription Expires</Text>
              <Text style={[styles.detailValue, styles.subscriptionText]}>
                {calculateDaysRemaining(userProfile.account_expiry)}
              </Text>
            </View>
          )}
        </View>
        {/* Admin Section (Only for Admins) */}
        {userProfile.is_admin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>
            <Pressable 
              style={styles.adminButton}
              onPress={() => router.push('/admin/dashboard')}
            >
              <IconSymbol name="gearshape.fill" size={24} color={colors.primary} />
              <Text style={styles.adminButtonText}>Admin Dashboard</Text>
              <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}


        {/* Support */}
        <View style={styles.section}>
          <Pressable 
            style={styles.supportButton}
            onPress={() => Alert.alert('Support', 'WhatsApp support will open here')}
          >
            <IconSymbol name="questionmark.circle.fill" size={24} color={colors.primary} />
            <Text style={styles.supportButtonText}>Hanna&apos;s Help (WhatsApp)</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <IconSymbol name="arrow.backward.circle" size={24} color={colors.error} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
        </View>
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
  profileHeader: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarEmojiLarge: {
    fontSize: 56,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  location: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  editButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  subscriptionText: {
    color: colors.primary,
  },
  paidText: {
    color: colors.success,
  },
  unpaidText: {
    color: colors.error,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  supportButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  adminButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.error,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
