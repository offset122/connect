
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/app/integrations/supabase/client";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    width: 140,
  },
  value: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  actionsContainer: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dangerButton: {
    backgroundColor: 'transparent',
    borderColor: '#EF5350',
  },
  successButton: {
    backgroundColor: 'transparent',
    borderColor: '#66BB6A',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  dangerButtonText: {
    color: '#EF5350',
  },
  successButtonText: {
    color: '#66BB6A',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
  },
  badgeInactive: {
    backgroundColor: '#FFEBEE',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#2E7D32',
  },
  badgeTextInactive: {
    color: '#C62828',
  },
});

export default function AdminUserDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const initializeFormData = (userData: any) => {
    setFormData({ ...userData });
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const hasChanges = () => {
    return Object.keys(formData).some(key => formData[key] !== user?.[key]);
  };

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setUser(data);
      initializeFormData(data);
    } catch (error: any) {
      console.error('Error fetching user details:', error);
      Alert.alert('Error', 'Failed to fetch user details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async () => {
    if (!user) return;

    Alert.alert(
      `${user.is_active ? 'Deactivate' : 'Activate'} Account`,
      `Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} this user's account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user.is_active ? 'Deactivate' : 'Activate',
          style: user.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('users')
                .update({ is_active: !user.is_active })
                .eq('id', user.id);

              if (error) throw error;

              Alert.alert('Success', `User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
              fetchUserDetails();
            } catch (error: any) {
              console.error('Error updating user status:', error);
              Alert.alert('Error', 'Failed to update user status');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBoolean = (value: boolean | null) => {
    if (value === null) return 'N/A';
    return value ? 'Yes' : 'No';
  };

  const calculateDaysRemaining = (expiryDate: string | null): number | string => {
    if (!expiryDate) return 'N/A';
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    return diffDays;
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

  if (!user) {
    return null;
  }

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const updateData: any = {};
      
      // Only include fields that were actually changed
      Object.keys(formData).forEach(key => {
        if (formData[key] !== user[key]) {
          updateData[key] = formData[key];
        }
      });
      
      if (Object.keys(updateData).length === 0) {
        Alert.alert('Info', 'No changes to save');
        setIsEditing(false);
        return;
      }
      
      updateData.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      Alert.alert('Success', 'User profile updated successfully');
      setIsEditing(false);
      fetchUserDetails();
      
    } catch (error: any) {
      console.error('Error updating user:', error);
      Alert.alert('Error', 'Failed to update profile: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges()) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to cancel?',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              initializeFormData(user);
              setIsEditing(false);
            }
          }
        ]
      );
    } else {
      initializeFormData(user);
      setIsEditing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>User Details</Text>
        {!isEditing ? (
          <Pressable
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <IconSymbol name="pencil" size={20} color={colors.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        ) : (
          <View style={styles.editActions}>
            <Pressable
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          <View style={[styles.badge, user.is_active ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={[styles.badgeText, user.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
              {user.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{user.email || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Username:</Text>
            <Text style={styles.value}>{user.username || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>First Name:</Text>
            <Text style={styles.value}>{user.first_name || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Gender:</Text>
            <Text style={styles.value}>{user.gender || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Age:</Text>
            <Text style={styles.value}>{user.age || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Nationality:</Text>
            <Text style={styles.value}>{user.nationality || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Country:</Text>
            <Text style={styles.value}>{user.country_of_residence || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>County:</Text>
            <Text style={styles.value}>{user.county || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>City:</Text>
            <Text style={styles.value}>{user.city || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Religion:</Text>
            <Text style={styles.value}>{user.religion || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Marital Status:</Text>
            <Text style={styles.value}>{user.marital_status || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Profession:</Text>
            <Text style={styles.value}>{user.current_profession || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Children:</Text>
            <Text style={styles.value}>{user.number_of_children || 0}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Believe in Marriage:</Text>
            <Text style={styles.value}>{user.believe_in_marriage || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Physical Disability:</Text>
            <Text style={styles.value}>{formatBoolean(user.has_physical_disability)}</Text>
          </View>
          {user.has_physical_disability && (
            <View style={styles.row}>
              <Text style={styles.label}>Disability Details:</Text>
              <Text style={styles.value}>{user.physical_disability_details || 'N/A'}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Critical Illness:</Text>
            <Text style={styles.value}>{formatBoolean(user.has_critical_illness)}</Text>
          </View>
          {user.has_critical_illness && (
            <View style={styles.row}>
              <Text style={styles.label}>Illness Details:</Text>
              <Text style={styles.value}>{user.critical_illness_details || 'N/A'}</Text>
            </View>
          )}
          <View style={[styles.row, styles.lastRow]}>
            <Text style={styles.label}>Date of Birth:</Text>
            <Text style={styles.value}>{user.date_of_birth || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Has Paid:</Text>
            <Text style={styles.value}>{formatBoolean(user.has_paid)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Status:</Text>
            <Text style={styles.value}>{user.payment_status || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Created At:</Text>
            <Text style={styles.value}>{formatDate(user.created_at)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Updated At:</Text>
            <Text style={styles.value}>{formatDate(user.updated_at)}</Text>
          </View>
          <View style={[styles.row, styles.lastRow]}>
            <Text style={styles.label}>Is Admin:</Text>
            <Text style={styles.value}>{formatBoolean(user.is_admin)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Physical Attributes</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Height:</Text>
            <Text style={styles.value}>
              {user.height_ft && user.height_in ? `${user.height_ft}'${user.height_in}"` : 'N/A'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Weight:</Text>
            <Text style={styles.value}>{user.weight_kg ? `${user.weight_kg} kg` : 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Body Type:</Text>
            <Text style={styles.value}>{user.body_type || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Complexion:</Text>
            <Text style={styles.value}>{user.complexion || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Teeth Status:</Text>
            <Text style={styles.value}>{user.teeth_status || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>HIV Status:</Text>
            <Text style={styles.value}>{user.hiv_status || 'N/A'}</Text>
          </View>
          <View style={[styles.row, styles.lastRow]}>
            <Text style={styles.label}>Blood Group:</Text>
            <Text style={styles.value}>{user.blood_group || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifestyle</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Smoking:</Text>
            <Text style={styles.value}>{user.smoking || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Alcohol:</Text>
            <Text style={styles.value}>{user.alcohol_consumption || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pets:</Text>
            <Text style={styles.value}>{user.has_pets || 'N/A'}</Text>
          </View>
          <View style={[styles.row, styles.lastRow]}>
            <Text style={styles.label}>Can Relocate:</Text>
            <Text style={styles.value}>{user.can_relocate || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Relationship Preferences</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Sexual Orientation:</Text>
            <Text style={styles.value}>{user.sexual_orientation || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Relationship Goal:</Text>
            <Text style={styles.value}>{user.relationship_goal || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Want Kids:</Text>
            <Text style={styles.value}>{user.want_kids || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date With Kids:</Text>
            <Text style={styles.value}>{user.open_to_dating_with_children || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date With Disability:</Text>
            <Text style={styles.value}>{user.can_date_with_disability || 'N/A'}</Text>
          </View>
          <View style={[styles.row, styles.lastRow]}>
            <Text style={styles.label}>Perspective:</Text>
            <Text style={styles.value}>{user.relationship_perspective || 'N/A'}</Text>
          </View>
        </View>

        {user.what_i_hope_to_find && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What I Hope to Find</Text>
            <Text style={styles.value}>{user.what_i_hope_to_find}</Text>
          </View>
        )}

        {user.what_to_expect_from_me && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What to Expect From Me</Text>
            <Text style={styles.value}>{user.what_to_expect_from_me}</Text>
          </View>
        )}

        {user.imperfections && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Imperfections</Text>
            <Text style={styles.value}>{user.imperfections}</Text>
          </View>
        )}

        {user.introduce_yourself && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About User</Text>
            <Text style={styles.value}>{user.introduce_yourself}</Text>
          </View>
        )}

        {user.do_not_contact_if && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Do Not Contact If</Text>
            <Text style={styles.value}>{user.do_not_contact_if}</Text>
          </View>
        )}

        {user.things_i_dont_do && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Things I Don&apos;t Do</Text>
            <Text style={styles.value}>{user.things_i_dont_do}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.actionsContainer}>
        <Pressable
          style={[
            styles.actionButton,
            user.is_active ? styles.dangerButton : styles.successButton
          ]}
          onPress={toggleUserStatus}
        >
          <Text style={[
            styles.buttonText,
            user.is_active ? styles.dangerButtonText : styles.successButtonText
          ]}>
            {user.is_active ? 'Deactivate Account' : 'Activate Account'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
