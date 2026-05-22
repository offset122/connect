import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, Pressable, Switch, Alert, ActivityIndicator, Image, Linking, useWindowDimensions, Modal, TextInput } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useFocusEffect } from "expo-router";
import { IconSymbol } from "../../components/IconSymbol";
import { colors, commonStyles, responsiveStyles, BREAKPOINTS } from "../../styles/commonStyles";
import { supabase } from "../integrations/supabase/client";
import PhotoRequestManager from "../../components/PhotoRequestManager";

// Helper function to get avatar image from assets
const getAvatarImage = (filename: string | null | undefined) => {
  if (!filename) {
    console.log('No filename provided for avatar');
    return null;
  }

  console.log('Fetching avatar image for:', filename);

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
  const image = avatarMap[filename];
  console.log('Avatar image found:', !!image);
  return image || null;
};

export default function ProfileScreen() {
  const [isOnline, setIsOnline] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

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

      console.log('Fetching profile for auth user:', user.id);

      // Fetch user profile data - only fields from registration
      // Try both auth_id and id to handle different database configurations
      let profileData: any = null;

      // First try with auth_id (newer schema)
      // Query all columns that might exist - Supabase will only return columns that exist
      const { data: authIdData, error: authIdError } = await supabase
        .from('users')
        .select('*, full_photo, passport_photo')
        .eq('auth_id', user.id)
        .maybeSingle();

      // Check for query error (not just null data)
      if (authIdError) {
        console.error('Error querying by auth_id:', authIdError);
        // If it's a real database error (not just no rows), we should handle it
        // but continue to try the fallback method
      }

      if (authIdData) {
        profileData = authIdData;
        console.log('Profile found using auth_id');
      } else if (!authIdError || authIdError.code === 'PGRST116') {
        // Only try fallback if first query didn't have a real error, or if it was just "no rows"
        // Fallback to id (older schema or admin accounts)
        console.log('No profile found with auth_id, trying with id...');
        const { data: idData, error: idError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (idError) {
          console.error('Error querying by id:', idError);
          throw new Error(`Failed to fetch profile: ${idError.message}`);
        }

        if (idData) {
          profileData = idData;
          console.log('Profile found using id');
        }
      }

      if (profileData) {
        console.log('Profile data fetched:', {
          id: (profileData as any).id,
          email: (profileData as any).email,
          first_name: (profileData as any).first_name,
          avatar: (profileData as any).avatar,
          age: (profileData as any).age,
          gender: (profileData as any).gender,
          county: (profileData as any).county,
          country: (profileData as any).country_of_residence,
          profession: (profileData as any).current_profession,
        });

        setUserProfile(profileData);
        setIsOnline((profileData as any)?.online_status || false);

        console.log('User profile loaded with avatar:', (profileData as any).avatar);
      } else {
        console.error('No profile data returned');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // On web, use browser confirm instead of Alert.alert for better UX
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (!confirmed) return;
      await performLogout();
    } else {
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
            onPress: performLogout,
          },
        ]
      );
    }
  };

   const performLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      console.log('User logged out successfully');
      // Clear any cached data
      try {
        await AsyncStorage.clear();
      } catch (clearError) {
        console.warn('Failed to clear AsyncStorage:', clearError);
      }
      // Use replace instead of push for logout
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        alert('Failed to logout. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to logout. Please try again.');
      }
    }
  };

  const verifyPassword = async () => {
    try {
      setLoading(true);
      setPasswordError('');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: deletePassword
      });

      if (signInError) {
        setPasswordError('Incorrect password. Please try again.');
        return;
      }

      // Password verified successfully
      setPasswordVerified(true);
      setShowPasswordModal(false);
      
      // Show final confirmation
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const confirmed = window.confirm('⚠️ FINAL WARNING: This will PERMANENTLY delete your account and ALL associated data. This action CANNOT be undone.\n\nType YES and click OK if you are absolutely sure.');
        if (confirmed) {
          await performAccountDeletion();
        } else {
          setPasswordVerified(false);
          setDeletePassword('');
        }
      } else {
        Alert.alert(
          '⚠️ FINAL CONFIRMATION',
          'This will PERMANENTLY delete your account and ALL associated data. This action CANNOT be undone.\n\nAre you absolutely sure?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setPasswordVerified(false);
                setDeletePassword('');
              }
            },
            {
              text: 'YES, DELETE MY ACCOUNT',
              style: 'destructive',
              onPress: performAccountDeletion,
            },
          ]
        );
      }

    } catch (error) {
      console.error('Password verification error:', error);
      setPasswordError('Failed to verify password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    // Prevent admin account deletion
    if (userProfile?.is_admin) {
      Alert.alert(
        'Account Deletion Not Allowed',
        'Administrator accounts cannot be deleted. Please contact system support if you need assistance with this account.',
        [{ text: 'OK', style: 'cancel' }]
      );
      return;
    }
    // Reset state and open password modal
    setDeletePassword('');
    setPasswordError('');
    setPasswordVerified(false);
    setShowPasswordModal(true);
  };

  const performAccountDeletion = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      // ✅ Use the database function which properly handles full account deletion
      // This function already has SECURITY DEFINER and deletes ALL associated data
      const { error: deleteError } = await supabase
        .rpc('delete_user_account', {
          p_user_id: userProfile.id // Pass the public user profile ID
        });

      if (deleteError) {
        console.error('Database account deletion failed:', deleteError);
        throw deleteError;
      }

      // Clear local storage
      try {
        await AsyncStorage.clear();
      } catch (clearError) {
        console.warn('Failed to clear AsyncStorage:', clearError);
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      
      Alert.alert('Account Deleted', 'Your account has been permanently deleted. All your data has been removed.');
      router.replace('/welcome');

    } catch (error) {
      console.error('Account deletion error:', error);
      Alert.alert('Error', 'Failed to delete account. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnlineStatusToggle = async (value: boolean) => {
    try {
      setIsOnline(value);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userProfile) return;

      // Use the correct id field based on what we have in userProfile
      const updateField = userProfile.auth_id ? 'auth_id' : 'id';
      const updateValue = userProfile.auth_id ? user.id : userProfile.id;

      const { error } = await (supabase as any)
        .from('users')
        .update({
          online_status: value,
          updated_at: new Date().toISOString(),
        })
        .eq(updateField, updateValue);

      if (error) throw error;

      console.log('Online status updated:', value);
    } catch (error) {
      console.error('Error updating online status:', error);
      setIsOnline(!value); // Revert on error
      Alert.alert('Error', 'Failed to update online status');
    }
  };

  const handleHannaHelp = () => {
    const phoneNumber = "254723438717"; // Kenyan number format

    // Note: Linking is imported from 'react-native', which is sufficient.
    const whatsappScheme = `whatsapp://send?phone=${phoneNumber}`;
    const whatsappWeb = `https://wa.me/${phoneNumber}`;

    Linking.canOpenURL(whatsappScheme)
      .then((supported) => {
        if (supported) {
          // Open WhatsApp app
          return Linking.openURL(whatsappScheme);
        } else {
          // Fallback to WhatsApp Web (browser)
          return Linking.openURL(whatsappWeb);
        }
      })
      .catch((err) => {
        console.log("WhatsApp Error:", err);
        Alert.alert("Error", "Failed to open WhatsApp.");
      });
  };

  const calculateDaysRemaining = (expiryDate: string | null, isAdmin: boolean = false) => {
    if (isAdmin) return 'Unlimited';
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
            {userProfile?.avatar ? (
              <>
                {console.log('Rendering avatar image for:', userProfile.avatar)}
                <Image
                  source={getAvatarImage(userProfile.avatar)}
                  style={styles.avatarImage}
                  resizeMode="cover"
                  onError={() => console.log('Avatar image failed to load')}
                  onLoad={() => console.log('Avatar image loaded successfully')}
                />
              </>
            ) : (
              <>
                {console.log('No avatar, using emoji:', userProfile?.gender)}
                <Text style={styles.avatarEmojiLarge}>
                  {userProfile?.gender === 'Male' ? '👨' : '👩'}
                </Text>
              </>
            )}
          </View>
          <Text style={styles.name}>
            {fullName}{userProfile.age ? `, ${userProfile.age}` : ''}
          </Text>
          {(userProfile.county || userProfile.city) && (
            <View style={styles.locationRow}>
              <Text style={[styles.location, { textAlign: 'center' }]} numberOfLines={2}>
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

          {/* Photos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Photos</Text>
              <Pressable onPress={() => router.push({ pathname: '/photo-gallery', params: { isOwnProfile: 'true' } })}>
                <Text style={styles.viewAllText}>View All</Text>
              </Pressable>
            </View>
            {userProfile.full_photo || userProfile.passport_photo ? (
              <View style={styles.photoPreview}>
                {userProfile.full_photo && (
                  <Pressable
                    key="full"
                    style={styles.photoThumb}
                    onPress={() => router.push({ pathname: '/photo-gallery', params: { isOwnProfile: 'true' } })}
                  >
                    <Image 
                      source={{ uri: userProfile.full_photo }} 
                      style={styles.photoThumbImage} 
                      onError={(e) => console.log('Full photo load error:', e.nativeEvent.error)}
                    />
                  </Pressable>
                )}
                {userProfile.passport_photo && (
                  <Pressable
                    key="passport"
                    style={styles.photoThumb}
                    onPress={() => router.push({ pathname: '/photo-gallery', params: { isOwnProfile: 'true' } })}
                  >
                    <Image 
                      source={{ uri: userProfile.passport_photo }} 
                      style={styles.photoThumbImage} 
                      onError={(e) => console.log('Passport photo load error:', e.nativeEvent.error)}
                    />
                  </Pressable>
                )}
              </View>
            ) : (
              <Pressable
                style={styles.addPhotosButton}
                onPress={() => router.push({ pathname: '/photo-gallery', params: { isOwnProfile: 'true' } })}
              >
                <IconSymbol name="photo.badge.plus" size={32} color={colors.primary} />
                <Text style={styles.addPhotosText}>Add Photos</Text>
              </Pressable>
            )}
          </View>

        {/* About Me Section */}
        {userProfile.introduce_yourself && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <Text style={styles.bioText}>{userProfile.introduce_yourself}</Text>
          </View>
        )}


        {/* More About Me */}
        {(userProfile.describe_appearance || userProfile.looking_for_appearance || userProfile.do_not_contact_me_if || userProfile.want_kids || userProfile.believe_in_marriage) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>More About Me</Text>
            {userProfile.describe_appearance && (
              <View style={styles.aboutBlock}>
                <Text style={styles.aboutLabel}>My Appearance</Text>
                <Text style={styles.aboutText}>{userProfile.describe_appearance}</Text>
              </View>
            )}
            {userProfile.looking_for_appearance && (
              <View style={styles.aboutBlock}>
                <Text style={styles.aboutLabel}>What I'm Looking For</Text>
                <Text style={styles.aboutText}>{userProfile.looking_for_appearance}</Text>
              </View>
            )}
            {userProfile.do_not_contact_me_if && (
              <View style={styles.aboutBlock}>
                <Text style={styles.aboutLabel}>Do Not Contact Me If</Text>
                <Text style={styles.aboutText}>{userProfile.do_not_contact_me_if}</Text>
              </View>
            )}
            {userProfile.want_kids && (
              <View style={styles.aboutBlock}>
                <Text style={styles.aboutLabel}>Want Kids in Future</Text>
                <Text style={styles.aboutText}>{userProfile.want_kids}</Text>
              </View>
            )}
            {userProfile.believe_in_marriage && (
              <View style={styles.aboutBlock}>
                <Text style={styles.aboutLabel}>Believe in Marriage</Text>
                <Text style={styles.aboutText}>{userProfile.believe_in_marriage}</Text>
              </View>
            )}
          </View>
        )}

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          {userProfile.current_profession && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Profession</Text>
              <Text style={styles.detailValue}>{userProfile.current_profession}</Text>
            </View>
          )}
          {userProfile.nationality && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Nationality</Text>
              <Text style={styles.detailValue}>{userProfile.nationality}</Text>
            </View>
          )}
          {userProfile.country_of_residence && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Country of Residence</Text>
              <Text style={styles.detailValue}>{userProfile.country_of_residence}</Text>
            </View>
          )}
          {userProfile.marital_status && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Marital Status</Text>
              <Text style={styles.detailValue}>{userProfile.marital_status}</Text>
            </View>
          )}
          {userProfile.number_of_children !== null && userProfile.number_of_children !== undefined && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Have Kids</Text>
              <Text style={styles.detailValue}>
                {userProfile.number_of_children > 0 
                  ? `Yes, ${userProfile.number_of_children} kid${userProfile.number_of_children === 1 ? '' : 's'}` 
                  : 'No'}
              </Text>
            </View>
          )}
        </View>

        {/* Health & Faith */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health & Faith</Text>
          {userProfile.hiv_status && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>HIV Status</Text>
              <Text style={styles.detailValue}>{userProfile.hiv_status}</Text>
            </View>
          )}
          {userProfile.religion && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Religion & Faith Level</Text>
              <Text style={styles.detailValue}>{userProfile.religion}</Text>
            </View>
          )}
          {userProfile.has_physical_disability === true && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Physical Disability</Text>
              <Text style={styles.detailValue}>{userProfile.physical_disability_details || 'Yes'}</Text>
            </View>
          )}
          {userProfile.has_critical_illness === true && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Critical Illness</Text>
              <Text style={styles.detailValue}>{userProfile.critical_illness_details || 'Yes'}</Text>
            </View>
          )}
        </View>
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

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Status</Text>
            <Text style={[
              styles.detailValue,
              userProfile.has_paid ? styles.paidText : styles.unpaidText
            ]}>
              {userProfile.has_paid ? 'Paid' : 'Pending'}
            </Text>
          </View>
          {userProfile.subscription_expires_at && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Subscription Expires</Text>
              <Text style={[styles.detailValue, styles.subscriptionText]}>
                {calculateDaysRemaining(userProfile.subscription_expires_at, userProfile.is_admin)}
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

        {/* Support Section (Fixed Location) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <Pressable
            style={styles.supportButton}
            onPress={() => router.push('/support')}
          >
            <IconSymbol name="questionmark.circle.fill" size={24} color={colors.primary} />
            <Text style={styles.supportButtonText}>Hanna&apos;s Help (WhatsApp)</Text>
            <IconSymbol name="chevron.right" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Account Actions */}
        <View style={{ marginTop: 24, gap: 12 }}>
          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={colors.error} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </Pressable>
          
          <Pressable
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
          >
            <IconSymbol name="trash.fill" size={20} color={colors.card} />
            <Text style={styles.deleteAccountButtonText}>Delete My Account</Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* Password Verification Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPasswordModal}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>Verify Your Identity</Text>
            <Text style={modalStyles.modalSubtitle}>Please enter your account password to continue with account deletion.</Text>
            
            <TextInput
              style={[modalStyles.input, passwordError ? modalStyles.inputError : null]}
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={deletePassword}
              onChangeText={(text) => {
                setDeletePassword(text);
                setPasswordError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            {passwordError ? <Text style={modalStyles.errorText}>{passwordError}</Text> : null}

            <View style={modalStyles.buttonContainer}>
              <Pressable
                style={[modalStyles.button, modalStyles.cancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setDeletePassword('');
                  setPasswordError('');
                }}
              >
                <Text style={modalStyles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[modalStyles.button, modalStyles.verifyButton, !deletePassword.trim() ? modalStyles.buttonDisabled : null]}
                onPress={verifyPassword}
                disabled={!deletePassword.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={modalStyles.verifyButtonText}>Verify Password</Text>
                )}
              </Pressable>
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
    // @ts-ignore for web support (if used)
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
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
    justifyContent: 'center',
    gap: 4,
    marginBottom: 16,
    width: '100%',
  },
  location: {
    fontSize: 16,
    color: colors.textSecondary,
    flex: 5,
    textAlign: 'center',
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
    // @ts-ignore for web support (if used)
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
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
    backgroundColor: colors.error,
    borderRadius: 8,
  },
  deleteAccountButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  photoPreview: {
    flexDirection: 'row',
    gap: 8,
    position: 'relative',
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
  },
  morePhotosOverlay: {
    position: 'absolute',
    right: 8,
    top: 0,
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  morePhotosText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.card,
  },
  addPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    borderStyle: 'dashed',
  },
  addPhotosText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  aboutBlock: {
    marginBottom: 16,
  },
  aboutLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aboutText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    fontWeight: '400',
  },
});

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalView: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 12,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 14,
    elevation: 2,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verifyButton: {
    backgroundColor: colors.error,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  },
  verifyButtonText: {
    color: colors.card,
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16,
  }
});