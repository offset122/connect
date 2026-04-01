import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import safeBack from '../utils/safeRouter';
import { IconSymbol } from "../components/IconSymbol";
import { colors, commonStyles, responsiveStyles, BREAKPOINTS } from "../styles/commonStyles";
import { supabase } from "./integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  gender: string;
  county: string;
  city: string;
  current_profession: string;
  height_ft: number | null;
  height_in: number | null;
  email: string;
  avatar: string | null;
  profile_images: string[];
  profile_picture: string | null;
  phone_number?: string | null;
};

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);

 
 // Avatar options from local assets
 const avatarOptions = [
   { id: 'avatar1', filename: '3d-cartoon-portrait-person-practicing-law-related-profession.jpg', name: 'Avatar 1' },
   { id: 'avatar2', filename: '408535ae-483f-477a-a0e6-3e28d0eabb88.jpg', name: 'Avatar 2' },
   { id: 'avatar3', filename: '2809696b-04f1-4ca8-8194-2ac46919f408.jpg', name: 'Avatar 3' },
   { id: 'avatar4', filename: '11475208.jpg', name: 'Avatar 4' },
   { id: 'avatar6', filename: 'androgynous-avatar-non-binary-queer-person.jpg', name: 'Avatar 6' },
   { id: 'avatar7', filename: 'b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg', name: 'Avatar 7' },
   { id: 'avatar8', filename: 'b400cea9-fa0a-4595-9865-d1216fea02e8.jpg', name: 'Avatar 8' },
 ];

 // Get local avatar image
 const getAvatarImage = (filename: string) => {
   // Import the avatar image from assets
   const avatarMap: { [key: string]: any } = {
     '3d-cartoon-portrait-person-practicing-law-related-profession.jpg': require('../assets/3d-cartoon-portrait-person-practicing-law-related-profession.jpg'),
      '408535ae-483f-477a-a0e6-3e28d0eabb88.jpg': require('../assets/408535ae-483f-477a-a0e6-3e28d0eabb88.jpg'),
      '2809696b-04f1-4ca8-8194-2ac46919f408.jpg': require('../assets/2809696b-04f1-4ca8-8194-2ac46919f408.jpg'),
      'androgynous-avatar-non-binary-queer-person.jpg': require('../assets/androgynous-avatar-non-binary-queer-person.jpg'),
      'b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg': require('../assets/b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg'),
      'b400cea9-fa0a-4595-9865-d1216fea02e8.jpg': require('../assets/b400cea9-fa0a-4595-9865-d1216fea02e8.jpg'),
      'av1.jpg': require('../assets/av1.jpg'),
      'av2.jpg': require('../assets/av2.jpg'),
      'av3.jpg': require('../assets/av3.jpg'),
      'av4.jpg': require('../assets/av4.jpg'),
      'av5.jpg': require('../assets/av5.jpg'),
      'av6.jpg': require('../assets/av6.jpg'),
      'men1.jpg': require('../assets/men1.jpg'),
    'men2.jpg': require('../assets/men2.jpg'),
    'men3.jpg': require('../assets/men3.jpg'),
   };
   return avatarMap[filename] || null;
 };

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    gender: '',
    county: '',
    city: '',
    current_profession: '',
    height_ft: '',
    height_in: '',
    phone_number: '',
    avatar: '',
    // About You fields from registration (read-only)
    introduce_yourself: '',
    describe_appearance: '',
    looking_for_appearance: '',
    do_not_contact_me_if: '',
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  // Debug: Log avatar options on mount
  useEffect(() => {
    console.log('=== Avatar Debug Info ===');
    console.log('Using local assets for avatars');
    console.log('Available avatars:', avatarOptions.length);
    avatarOptions.forEach(avatar => {
      console.log(`  - ${avatar.id}: ${avatar.filename}`);
    });
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('No user ID available');
      }

      console.log('Edit Profile: Fetching profile for user ID:', user.id);

      // Try fetching by database ID first
      let { data, error } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      // If not found, try fetching by auth_id (in case user.id is the auth ID)
      if (!data && !error) {
        console.log('Edit Profile: User not found by ID, trying auth_id...');
        const result = await (supabase as any)
          .from('users')
          .select('*')
          .eq('auth_id', user.id)
          .maybeSingle();
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Edit Profile: Error fetching user:', error);
        throw error;
      }

      if (!data) {
        console.error('Edit Profile: No user profile found');
        throw new Error('User profile not found');
      }

      console.log('Edit Profile: Profile loaded successfully:', data.first_name, data.id);

      setProfile(data);
      
      // Populate form with existing data
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        age: data.age?.toString() || '',
        gender: data.gender || '',
        county: data.county || '',
        city: data.city || '',
        current_profession: data.current_profession || '',
        height_ft: data.height_ft?.toString() || '',
        height_in: data.height_in?.toString() || '',
        phone_number: data.phone_number || '',
        avatar: data.avatar || '',
        introduce_yourself: data.introduce_yourself || '',
        describe_appearance: data.describe_appearance || '',
        looking_for_appearance: data.looking_for_appearance || '',
        do_not_contact_me_if: data.do_not_contact_me_if || '',
      });

      console.log('Edit Profile: Form populated with profile data');
    } catch (error) {
      console.error('Edit Profile: Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !user) {
      Alert.alert('Error', 'Profile data not available');
      return;
    }

    setSaving(true);
    try {
      // Prepare update data
      const updateData: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender.trim(),
        county: formData.county.trim(),
        city: formData.city.trim(),
        current_profession: formData.current_profession.trim(),
        avatar: formData.avatar ? formData.avatar.trim() : null,
        // Include read-only about you fields to preserve existing data
        introduce_yourself: formData.introduce_yourself.trim(),
        describe_appearance: formData.describe_appearance.trim(),
        looking_for_appearance: formData.looking_for_appearance.trim(),
        do_not_contact_me_if: formData.do_not_contact_me_if.trim(),
        updated_at: new Date().toISOString(),
      };

      // Only add height fields if they have values (in case columns don't exist yet)
      if (formData.height_ft) {
        updateData.height_ft = parseInt(formData.height_ft);
      }
      if (formData.height_in) {
        updateData.height_in = parseInt(formData.height_in);
      }

      console.log('Edit Profile: Saving profile with avatar:', updateData.avatar);
      console.log('Edit Profile: Updating user with database ID:', profile.id);

      // Use the profile.id which we fetched, not user.id
      const { error } = await (supabase as any)
        .from('users')
        .update(updateData)
        .eq('id', profile.id);

      if (error) {
        console.error('Edit Profile: Error updating:', error);
        throw error;
      }

      console.log('Edit Profile: Profile saved successfully');

      Alert.alert(
        'Success',
        'Profile updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => safeBack(router),
          },
        ]
      );
    } catch (error: any) {
      console.error('Edit Profile: Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'avatar') {
      console.log('Avatar selected:', value);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserProfile();
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.text, { marginTop: 16 }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => safeBack(router)}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Pressable 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </Pressable>
        </View>

        {/* Avatar Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Avatar</Text>
          <View style={styles.avatarGrid}>
            {avatarOptions.map((avatar, index) => {
              const avatarImage = getAvatarImage(avatar.filename);
              return (
                <Pressable
                  key={avatar.id}
                  style={[
                    styles.avatarOption,
                    formData.avatar === avatar.filename && styles.avatarSelected,
                  ]}
                  onPress={() => handleInputChange('avatar', avatar.filename)}
                >
                  {avatarImage ? (
                    <Image
                      source={avatarImage}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarPlaceholderText}>{index + 1}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.input}
                value={formData.first_name}
                onChangeText={(value) => handleInputChange('first_name', value)}
                placeholder="Enter first name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={formData.last_name}
                onChangeText={(value) => handleInputChange('last_name', value)}
                placeholder="Enter last name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                value={formData.age}
                onChangeText={(value) => handleInputChange('age', value)}
                placeholder="Enter age"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Gender</Text>
              <TextInput
                style={styles.input}
                value={formData.gender}
                onChangeText={(value) => handleInputChange('gender', value)}
                placeholder="Enter gender"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>County</Text>
              <TextInput
                style={styles.input}
                value={formData.county}
                onChangeText={(value) => handleInputChange('county', value)}
                placeholder="Enter county"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={(value) => handleInputChange('city', value)}
                placeholder="Enter city"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Height (ft)</Text>
              <TextInput
                style={styles.input}
                value={formData.height_ft}
                onChangeText={(value) => handleInputChange('height_ft', value)}
                placeholder="5"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={1}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Height (in)</Text>
              <TextInput
                style={styles.input}
                value={formData.height_in}
                onChangeText={(value) => handleInputChange('height_in', value)}
                placeholder="8"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>

          <View style={styles.fullWidthContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone_number}
              onChangeText={(value) => handleInputChange('phone_number', value)}
              placeholder="Enter phone number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          
          <View style={styles.fullWidthContainer}>
            <Text style={styles.inputLabel}>Current Profession</Text>
            <TextInput
              style={styles.input}
              value={formData.current_profession}
              onChangeText={(value) => handleInputChange('current_profession', value)}
              placeholder="Enter your current profession"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

        </View>

        {/* About Me */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>

          <View style={styles.fullWidthContainer}>
            <Text style={styles.inputLabel}>Introduce Yourself</Text>
            {formData.introduce_yourself ? (
              <Text style={styles.readOnlyText}>{formData.introduce_yourself}</Text>
            ) : (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.introduce_yourself}
                onChangeText={(value) => handleInputChange('introduce_yourself', value)}
                placeholder="Include current realities, children, strengths, imperfections..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          </View>

          <View style={styles.fullWidthContainer}>
            <Text style={styles.inputLabel}>Describe Appearance</Text>
            {formData.describe_appearance ? (
              <Text style={styles.readOnlyText}>{formData.describe_appearance}</Text>
            ) : (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.describe_appearance}
                onChangeText={(value) => handleInputChange('describe_appearance', value)}
                placeholder="Complexion, height, weight, body type, hairstyle, tattoos..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          </View>

          <View style={styles.fullWidthContainer}>
            <Text style={styles.inputLabel}>Looking For</Text>
            {formData.looking_for_appearance ? (
              <Text style={styles.readOnlyText}>{formData.looking_for_appearance}</Text>
            ) : (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.looking_for_appearance}
                onChangeText={(value) => handleInputChange('looking_for_appearance', value)}
                placeholder="What kind of partner are you hoping to meet?"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          </View>

          <View style={styles.fullWidthContainer}>
            <Text style={styles.inputLabel}>Do Not Contact If</Text>
            {formData.do_not_contact_me_if ? (
              <Text style={styles.readOnlyText}>{formData.do_not_contact_me_if}</Text>
            ) : (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.do_not_contact_me_if}
                onChangeText={(value) => handleInputChange('do_not_contact_me_if', value)}
                placeholder="List boundaries / dealbreakers"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            )}
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <>
                <IconSymbol name="checkmark" size={20} color={colors.card} />
                <Text style={styles.saveButtonText}>Save Profile</Text>
              </>
            )}
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  saveButtonText: {
    color: colors.card,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputContainer: {
    flex: 1,
  },
  fullWidthContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  textArea: {
    minHeight: 80,
  },
  readOnlyText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    padding: 12,
    backgroundColor: colors.background + '80',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border + '50',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  saveButtonContainer: {
    marginTop: 24,
    paddingBottom: 20,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  avatarOption: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  avatarSelected: {
    borderColor: colors.primary,
  },
  avatarImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#666666',
  },
});
