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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import { colors, commonStyles } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  age: number | null;
  gender: string;
  county: string;
  city: string;
  bio: string;
  interests: string[];
  occupation: string;
  education: string;
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

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    gender: '',
    county: '',
    city: '',
    bio: '',
    interests: '',
    occupation: '',
    education: '',
    height_ft: '',
    height_in: '',
    phone_number: '',
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
      
      // Populate form with existing data
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        age: data.age?.toString() || '',
        gender: data.gender || '',
        county: data.county || '',
        city: data.city || '',
        bio: data.bio || '',
        interests: Array.isArray(data.interests) ? data.interests.join(', ') : data.interests || '',
        occupation: data.occupation || '',
        education: data.education_level || '',
        height_ft: data.height_ft?.toString() || '',
        height_in: data.height_in?.toString() || '',
        phone_number: data.phone_number || '',
      });

      console.log('Profile loaded for editing:', data.first_name);
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (!profile || !user) return;

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
        bio: formData.bio.trim(),
        interests: formData.interests ? formData.interests.split(',').map(i => i.trim()).filter(i => i) : [],
        occupation: formData.occupation.trim(),
        education_level: formData.education.trim(),
        height_ft: formData.height_ft ? parseInt(formData.height_ft) : null,
        height_in: formData.height_in ? parseInt(formData.height_in) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Profile updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
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
          <Pressable style={styles.backButton} onPress={() => router.back()}>
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
            <Text style={styles.inputLabel}>Occupation</Text>
            <TextInput
              style={styles.input}
              value={formData.occupation}
              onChangeText={(value) => handleInputChange('occupation', value)}
              placeholder="Enter occupation"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.fullWidthContainer}>
            <Text style={styles.inputLabel}>Education</Text>
            <TextInput
              style={styles.input}
              value={formData.education}
              onChangeText={(value) => handleInputChange('education', value)}
              placeholder="Enter education level"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* About Me */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          
          <View style={styles.fullWidthContainer}>
            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(value) => handleInputChange('bio', value)}
              placeholder="Tell us about yourself..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fullWidthContainer}>
            <Text style={styles.inputLabel}>Interests (comma-separated)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.interests}
              onChangeText={(value) => handleInputChange('interests', value)}
              placeholder="Reading, Music, Travel, Cooking..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
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
  saveButtonContainer: {
    marginTop: 24,
    paddingBottom: 20,
  },
});