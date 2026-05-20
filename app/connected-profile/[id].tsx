import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { IconSymbol } from "@/components/IconSymbol";
import PhoneNumberRequest from "@/components/PhoneNumberRequest";
import { colors, commonStyles } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";

type User = {
  id: string;
  auth_id: string;
  email: string;
  username?: string;
  first_name: string;
  last_name?: string;
  age: number;
  gender: string;
  county: string;
  city: string;
  current_profession?: string;
  education_level?: string;
  height_ft?: number;
  height_in?: number;
  avatar?: string;
  // Updated photo fields
  full_photo?: string;
  passport_photo?: string;
  profile_images?: string[];
  is_verified: boolean;
  nationality?: string;
  country_of_residence?: string;
  // About You fields from registration
  introduce_yourself?: string;
  describe_appearance?: string;
  looking_for_appearance?: string;
  do_not_contact_me_if?: string;
  interests?: string[];
};

type Connection = {
  id: string;
  status: string;
  requester_id: string;
  recipient_id: string;
};

type PhotoRequest = {
  id: string;
  requester_id: string;
  target_user_id: string;
  request_status: 'pending' | 'approved' | 'declined';
};

export default function ConnectedProfileScreen() {
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [canViewPhotos, setCanViewPhotos] = useState(false);

  useEffect(() => {
    if (typeof id === 'string') {
      fetchConnectedUserProfile(id);
    }
  }, [id]);

  const fetchConnectedUserProfile = async (userId: string) => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        Alert.alert('Error', 'Please log in to view this profile');
        return;
      }

      setCurrentUserId(user.id);

      // Verify connection exists (accepted or pending where current user is recipient)
      const { data: connectionData, error: connectionError } = await (supabase as any)
        .from('connections')
        .select('*')
        .or(`and(requester_id.eq.${user.id},recipient_id.eq.${userId}),and(requester_id.eq.${userId},recipient_id.eq.${user.id})`)
        .single();

      if (connectionError || !connectionData) {
        Alert.alert('Access Denied', 'Connection not found');
        router.back();
        return;
      }

      // Check if user has permission to view this profile
      const isAccepted = connectionData.status === 'accepted';
      const isPendingRecipient = connectionData.status === 'pending' && connectionData.recipient_id === user.id;
      const isPendingRequester = connectionData.status === 'pending' && connectionData.requester_id === user.id;
      
      if (!isAccepted && !isPendingRecipient && !isPendingRequester) {
        Alert.alert('Access Denied', 'You can only view profiles of your connections or pending requests');
        router.back();
        return;
      }

      setConnection(connectionData);

      // Fetch user profile
      const { data: userData, error: profileError } = await (supabase as any)
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      setUser(userData);

      // Check if current user has approved photo request
      // Check if there's an approved photo request from current user to this profile owner
      const { data: photoRequestData } = await (supabase as any)
        .from('photo_requests')
        .select('*')
        .eq('requester_id', user.id)
        .eq('target_user_id', userId)
        .eq('request_status', 'approved')
        .maybeSingle();

      // Can view photos if connection is accepted OR photo request is approved
      const hasPhotoAccess = isAccepted || !!photoRequestData;
      setCanViewPhotos(hasPhotoAccess);

      console.log('Connected user profile loaded:', userData.first_name, '| Photo access:', hasPhotoAccess);
    } catch (error) {
      console.error('Error fetching connected user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSendMessage = () => {
    if (user) {
      router.push(`/chat/${user.id}`);
    }
  };

  const handleCall = () => {
    Alert.alert(
      'Call Feature',
      'Voice calling feature will be available soon! For now, you can send messages to chat.',
      [{ text: 'OK' }]
    );
  };

  const requestPhotoAccess = async (targetUserId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if there's already a pending request
      const { data: existingRequest } = await (supabase as any)
        .from('photo_requests')
        .select('*')
        .eq('requester_id', user.id)
        .eq('target_user_id', targetUserId)
        .in('request_status', ['pending', 'approved'])
        .maybeSingle();

      if (existingRequest) {
        if (existingRequest.request_status === 'approved') {
          Alert.alert('Access Granted', 'You already have access to view photos!');
        } else {
          Alert.alert('Pending', 'You already have a pending request. Please wait for a response.');
        }
        return;
      }

      // Create new photo request
      const { error } = await (supabase as any)
        .from('photo_requests')
        .insert({
          requester_id: user.id,
          target_user_id: targetUserId,
          request_status: 'pending',
        });

      if (error) throw error;

      Alert.alert('Request Sent', 'Your photo request has been sent. You will be notified when approved.');
    } catch (error) {
      console.error('Error requesting photo access:', error);
      Alert.alert('Error', 'Failed to send photo request');
    }
  };

  const handleReport = async () => {
    if (!user || reporting) return;

    // Show reporting options
    const reportReasons = [
      'Spam',
      'Fake Profile',
      'Harassment',
      'Inappropriate Content',
      'Threatening Behavior',
      'Scam',
      'Underage User',
      'Other'
    ];

    Alert.alert(
      'Report User',
      'What would you like to report about this user?',
      [
        ...reportReasons.map(reason => ({
          text: reason,
          onPress: () => submitReport(reason)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const submitReport = async (reason: string) => {
    if (!user) return;

    Alert.prompt(
      'Report User',
      'Please provide additional details about your report (optional):',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Submit Report',
          style: 'destructive',
          onPress: async (description?: string) => {
            await submitUserReport(reason, description || '');
          }
        }
      ],
      'default'
    );
  };

  const submitUserReport = async (reason: string, description: string) => {
    try {
      setReporting(true);

      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!currentUser) {
        Alert.alert('Error', 'Please log in to report users');
        return;
      }

      // Insert report
      const { data, error } = await (supabase as any)
        .from('reports')
        .insert({
          reporter_id: currentUser.id,
          reported_user_id: user.id,
          reason: reason,
          description: description,
          status: 'pending'
        })
        .select();

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist, create it
          Alert.alert(
            'Report Submitted',
            'Your report has been noted. Our team will review it shortly. Thank you for helping keep Hanna\'s Connect safe!',
            [{ text: 'OK' }]
          );
        } else {
          throw error;
        }
      } else {
        Alert.alert(
          'Report Submitted',
          'Thank you for your report. Our moderation team will review it and take appropriate action. You are helping keep Hanna\'s Connect safe for everyone.',
          [{ text: 'OK' }]
        );
      }

      console.log('User report submitted:', { reason, description, reportedUser: user.first_name });
    } catch (error: any) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again later.');
    } finally {
      setReporting(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (typeof id === 'string') {
      fetchConnectedUserProfile(id);
    }
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

  if (!user) {
    return (
      <SafeAreaView style={commonStyles.safeArea}>
        <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
          <IconSymbol name="person.2" size={64} color={colors.textSecondary} />
          <Text style={[commonStyles.title, { marginTop: 16 }]}>Profile Not Found</Text>
          <Text style={[commonStyles.text, { marginTop: 8 }]}>This user's profile could not be loaded</Text>
          <Pressable
            style={[styles.goBackButton, { marginTop: 20 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.goBackButtonText}>Go Back</Text>
          </Pressable>
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
          <Text style={styles.headerTitle}>
            {user.first_name}'s Profile
          </Text>
          <View style={styles.verifiedBadge}>
            {user.is_verified && (
              <IconSymbol name="checkmark.seal.fill" size={20} color={colors.success} />
            )}
          </View>
        </View>

        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.defaultAvatar]}>
              <Text style={styles.avatarText}>
                {user.gender === 'Male' ? '👨' : '👩'}
              </Text>
            </View>
          )}
          {user.is_verified && (
            <View style={styles.verifiedIcon}>
              <IconSymbol name="checkmark.seal.fill" size={24} color={colors.success} />
            </View>
          )}
        </View>

        {/* Basic Info */}
        <View style={styles.infoSection}>
          <Text style={styles.name}>
            {user.first_name} {user.last_name}, {user.age}
          </Text>
          
          <View style={styles.locationRow}>
            <IconSymbol name="location.fill" size={16} color={colors.textSecondary} />
            <Text style={styles.location}>
              {user.city}, {user.county}
            </Text>
          </View>

          {user.current_profession && (
            <View style={styles.infoRow}>
              <IconSymbol name="briefcase.fill" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{user.current_profession}</Text>
            </View>
          )}

          {user.education_level && (
            <View style={styles.infoRow}>
              <IconSymbol name="graduationcap.fill" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{user.education_level}</Text>
            </View>
          )}

          {user.height_ft && (
            <View style={styles.infoRow}>
              <IconSymbol name="ruler.fill" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {user.height_ft}'{user.height_in || 0}"
              </Text>
            </View>
          )}
        </View>

{/* Photo Gallery - Only show if user has approved photo request */}
        {canViewPhotos && (user.full_photo || user.passport_photo) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.photoRow}>
              {user.full_photo && (
                <View style={styles.photoItem}>
                  <Image source={{ uri: user.full_photo }} style={styles.photo} />
                  <View style={styles.photoBadge}>
                    <Text style={styles.photoBadgeText}>Full</Text>
                  </View>
                </View>
              )}
              {user.passport_photo && (
                <View style={styles.photoItem}>
                  <Image source={{ uri: user.passport_photo }} style={styles.photo} />
                  <View style={styles.photoBadge}>
                    <Text style={styles.photoBadgeText}>Passport</Text>
                  </View>
                </View>
              )}
            </View>
            {/* View Full Gallery Button */}
            <Pressable
              style={styles.viewGalleryButton}
              onPress={() => router.push({
                pathname: '/photo-gallery' as any,
                params: { userId: user.id, isOwnProfile: 'false' },
              } as any)}
            >
              <IconSymbol name="photo.on.rectangle.angled" size={20} color={colors.card} />
              <Text style={styles.viewGalleryButtonText}>View Full Gallery</Text>
            </Pressable>
          </View>
        )}

        {!canViewPhotos && connection?.status === 'accepted' && (
          <View style={styles.section}>
            <Pressable 
              style={styles.requestPhotosButton}
              onPress={() => requestPhotoAccess(user.id)}
            >
              <IconSymbol name="photo.stack" size={24} color={colors.card} />
              <Text style={styles.requestPhotosButtonText}>Request to View Photos</Text>
            </Pressable>
            <Text style={styles.requestPhotosHint}>
              Send a request to see {user.first_name}'s full and passport photos
            </Text>
          </View>
        )}


        {/* Introduce Yourself (About You) */}
        {user.introduce_yourself && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Introduce Yourself</Text>
            <Text style={styles.bio}>{user.introduce_yourself}</Text>
          </View>
        )}

        {/* Appearance Description */}
        {user.describe_appearance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <Text style={styles.bio}>{user.describe_appearance}</Text>
          </View>
        )}

        {/* Looking For */}
        {user.looking_for_appearance && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Looking For</Text>
            <Text style={styles.bio}>{user.looking_for_appearance}</Text>
          </View>
        )}

        {/* Do Not Contact If */}
        {user.do_not_contact_me_if && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Do Not Contact If</Text>
            <Text style={styles.bio}>{user.do_not_contact_me_if}</Text>
          </View>
        )}

        {/* Interests */}
        {user.interests && Array.isArray(user.interests) && user.interests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.interestsContainer}>
              {user.interests.map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <View style={styles.buttonRow}>
            <Pressable
              style={styles.messageButton}
              onPress={handleSendMessage}
            >
              <IconSymbol name="message.fill" size={20} color={colors.card} />
              <Text style={styles.messageButtonText}>Send Message</Text>
            </Pressable>

            <Pressable
              style={styles.callButton}
              onPress={handleCall}
            >
              <IconSymbol name="phone.fill" size={20} color={colors.card} />
              <Text style={styles.callButtonText}>Call</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.reportButton, reporting && styles.reportButtonDisabled]}
            onPress={handleReport}
            disabled={reporting}
          >
            <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.error} />
            <Text style={styles.reportButtonText}>
              {reporting ? 'Reporting...' : 'Report User'}
            </Text>
          </Pressable>
        </View>

        {/* Phone Number Request */}
        <View style={styles.phoneRequestContainer}>
          <PhoneNumberRequest
            targetUserName={user.first_name}
            targetUserId={user.id}
          />
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
  verifiedBadge: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  profileImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    resizeMode: 'cover',
  },
  defaultAvatar: {
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 80,
  },
  verifiedIcon: {
    position: 'absolute',
    bottom: 0,
    right: '25%',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.success,
  },
  infoSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  location: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 16,
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoItem: {
    width: '48%',
    aspectRatio: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    resizeMode: 'cover',
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  photoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  photoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.card,
  },
  requestPhotosButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  requestPhotosButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
  },
requestPhotosHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  viewGalleryButton: {
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  viewGalleryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
  },
  bio: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  interestText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  messageButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0px 4px 12px rgba(103, 58, 183, 0.3)',
    elevation: 6,
    flex: 1,
  },
  messageButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.card,
  },
  callButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0px 4px 12px rgba(63, 81, 181, 0.3)',
    elevation: 6,
    flex: 1,
  },
  callButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.card,
  },
  reportButton: {
    backgroundColor: colors.background,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: colors.error,
  },
  reportButtonDisabled: {
    opacity: 0.6,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  goBackButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  goBackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
  },
  phoneRequestContainer: {
    marginTop: 20,
  },
});