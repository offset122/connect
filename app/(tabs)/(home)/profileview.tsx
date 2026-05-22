import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View, Text, Pressable, Platform, Alert, Dimensions, Image, ImageBackground, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '../../../components/IconSymbol';
import safeBack from '../../../utils/safeRouter';
import { colors, commonStyles, spacing, borderRadius } from '../../../styles/commonStyles';
import ConnectionActions from '../../../components/ConnectionActions';
import PhoneNumberRequest from '../../../components/PhoneNumberRequest';
import { supabase } from '../../integrations/supabase/client';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Get screen dimensions
const { height: screenHeight, width: screenWidth } = Dimensions.get('screen');


// Get local avatar image from assets
const getAvatarImage = (filename: string | null | undefined) => {
  if (!filename) return null;
  
  const avatarMap: { [key: string]: any } = {
    '3d-cartoon-portrait-person-practicing-law-related-profession.jpg': require('../../../assets/3d-cartoon-portrait-person-practicing-law-related-profession.jpg'),
    'men1.jpg': require('../../../assets/men1.jpg'),
    'men2.jpg': require('../../../assets/men2.jpg'),
    '2809696b-04f1-4ca8-8194-2ac46919f408.jpg': require('../../../assets/2809696b-04f1-4ca8-8194-2ac46919f408.jpg'),
    'androgynous-avatar-non-binary-queer-person.jpg': require('../../../assets/androgynous-avatar-non-binary-queer-person.jpg'),
    'av6.jpg': require('../../../assets/av6.jpg'),
  };
  return avatarMap[filename] || null;
};

// Get random avatar if user has none
const getRandomAvatar = () => {
  const avatars = [
    '3d-cartoon-portrait-person-practicing-law-related-profession.jpg',
    'men1.jpg',
    'men2.jpg',
    '2809696b-04f1-4ca8-8194-2ac46919f408.jpg',
    'androgynous-avatar-non-binary-queer-person.jpg',
    'av6.jpg'
  ];
  const randomIndex = Math.floor(Math.random() * avatars.length);
  return avatars[randomIndex];
};

// Type definition for user profile from database
type ConnectionStatus = 'none' | 'pending' | 'accepted' | 'rejected';
type UserProfile = {
  id: string;
  auth_id: string;
  email: string | null;
  avatar: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  gender: string | null;
  age: number | null;
  nationality: string | null;
  country_of_residence: string | null;
  city: string | null;
  county: string | null;
  believe_in_marriage: string | null;
  hiv_status: string | null;
  current_profession: string | null;
  marital_status: string | null;
  want_kids: string | null;
  do_not_contact_if: string | null;
  introduce_yourself: string | null;
  describe_appearance: string | null;
  looking_for_appearance: string | null;
  partner_expectations: string | null;
  do_not_contact_me_if: string | null;
  profile_images: any[] | null;
  online_status: boolean | null;
  has_paid: boolean | null;
  last_login: string | null;
  created_at: string | null;
  number_of_children: number | null;
  religion: string | null;
  has_physical_disability: boolean | null;
  physical_disability_details: string | null;
  has_critical_illness: boolean | null;
  critical_illness_details: string | null;
  height_feet?: string | null;
  height_inches?: string | null;
  weight?: string | null;
  complexion?: string | null;
  tribe?: string | null;
  teeth_state?: string | null;
  // Subscription fields
  subscription_plan?: string | null;
  subscription_expires_at?: string | null;
  subscription_activated_at?: string | null;
  connectionStatus?: ConnectionStatus;
};


export default function ProfileViewScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [photoRequestStatus, setPhotoRequestStatus] = useState<'none' | 'pending' | 'approved' | 'declined'>('none');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('none');
  const [sendingPhotoRequest, setSendingPhotoRequest] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Get user ID from params - handle both userId and user object
  const userId = useMemo(() => {
    console.log('ProfileView: Params received:', { userId: params.userId, hasUser: !!params.user });
    
    if (params.userId) {
      console.log('ProfileView: Using userId from params:', params.userId);
      return params.userId as string;
    }
    if (params.user) {
      try {
        const userObj = JSON.parse(params.user as string);
        console.log('ProfileView: Parsed user object, id:', userObj.id);
        return userObj.id;
      } catch (e) {
        console.error('ProfileView: Failed to parse user object:', e);
        return null;
      }
    }
    console.log('ProfileView: No userId found in params');
    return null;
  }, [params.userId, params.user]);

  // Get avatar image or assign random one
  const avatarSource = useMemo(() => {
    if (userProfile?.avatar) {
      return getAvatarImage(userProfile.avatar);
    }
    return getAvatarImage(getRandomAvatar());
  }, [userProfile?.avatar]);

  // Check if user is online
  const isOnline = useMemo(() => {
    return userProfile?.online_status || false;
  }, [userProfile?.online_status]);

  // Computed values
  const displayName = userProfile ? userProfile.first_name + (userProfile.last_name ? ` ${userProfile.last_name}` : '') : '';
  const location = userProfile ? (userProfile.county || userProfile.city || userProfile.country_of_residence || 'Unknown') : 'Unknown';

  // --- Connection Handlers (Simplified for view screen) ---
  const handleConnectionAction = useCallback(async (action: 'connect' | 'accept' | 'decline') => {
    if (!userProfile) return;
    
    const { data: authData } = await supabase.auth.getUser();
    const currentAuthId = authData.user?.id;
    if (!currentAuthId) return Alert.alert("Error", "User not authenticated.");

    const { data: currentUserProfile } = await supabase.from('users').select('id').eq('auth_id', currentAuthId).single();
    if (!currentUserProfile) return Alert.alert("Error", "Could not find your profile.");
    const currentUserId = currentUserProfile.id;

    try {
      if (action === 'connect') {
        const { error } = await (supabase as any).from('connections').upsert({
          requester_id: currentUserId,
          recipient_id: userProfile.id,
          status: 'pending',
        }, { onConflict: 'requester_id,recipient_id', ignoreDuplicates: true });
        if (error) throw error;
        setConnectionStatus('pending');
        Alert.alert('Success', `Connection request sent to ${displayName}!`);
      } else if (action === 'accept' || action === 'decline') {
        const status = action === 'accept' ? 'accepted' : 'rejected';
        const { error } = await supabase.from('connections')
          .update({ status })
          .eq('requester_id', userProfile.id)
          .eq('recipient_id', currentUserId);
        if (error) throw error;
        setConnectionStatus(status as ConnectionStatus);
        Alert.alert('Success', `${displayName}'s request was ${status}.`);
        safeBack(router);
      }
    } catch (error: any) {
      console.error(`Error during ${action}:`, error);
      Alert.alert('Error', error.message || `Failed to perform ${action}.`);
    }
  }, [userProfile, displayName, router]);

  const handleMessage = useCallback(() => {
    if (!userProfile?.id) return;
    router.push(`/chat/${userProfile.id}`);
  }, [userProfile?.id]);

  const handleRequestPhoto = useCallback(async () => {
    if (!userProfile?.id) {
      console.error('No user profile ID available');
      Alert.alert('Error', 'User profile not loaded');
      return;
    }
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Auth error:', authError);
        Alert.alert('Error', 'Please log in to request photos');
        return;
      }

      const { data: currentUserProfile, error: profileError } = await supabase
        .from('users')
        .select('id, first_name')
        .eq('auth_id', user.id)
        .single();

      if (profileError || !currentUserProfile) {
        console.error('Profile fetch error:', profileError);
        Alert.alert('Error', 'Could not find your profile');
        return;
      }

      // Check if requesting own photos
      if (currentUserProfile.id === userProfile.id) {
        Alert.alert('Error', 'You cannot request your own photos');
        return;
      }

      const { data: existingRequest, error: checkError } = await supabase
        .from('photo_requests')
        .select('id, request_status')
        .eq('requester_id', currentUserProfile.id)
        .eq('target_user_id', userProfile.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing request:', checkError);
      }

      if (existingRequest) {
        if (existingRequest.request_status === 'pending') {
          Alert.alert('Already Requested', 'You have already sent a photo request to this user.');
        } else if (existingRequest.request_status === 'approved') {
          Alert.alert('Already Approved', 'This user has already approved your photo request.');
        } else {
          Alert.alert('Request Declined', 'Your previous photo request was declined.');
        }
        return;
      }

      console.log('Inserting photo request:', {
        requester_id: currentUserProfile.id,
        target_user_id: userProfile.id,
      });

      const { error: insertError } = await supabase
        .from('photo_requests')
        .insert({
          requester_id: currentUserProfile.id,
          target_user_id: userProfile.id,
          request_status: 'pending',
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Creating notification for user:', userProfile.id);

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userProfile.auth_id,   // auth UUID so NotificationContext picks it up
          title: 'New Photo Request 📸',
          body: `${currentUserProfile.first_name} wants to see your photos`,
          read: false,
          data: {
            type: 'photo_request',
            notification_type: 'photo_request',
            related_user_id: currentUserProfile.id,
          },
        });

      if (notificationError) {
        console.error('Notification error:', notificationError);
        // Don't throw - notification is not critical
      }

      setPhotoRequestStatus('pending');
      Alert.alert('Success', 'Photo request sent! Waiting for approval.');
    } catch (error: any) {
      console.error('Error requesting photo:', error);
      Alert.alert('Error', error.message || 'Failed to send photo request');
      setSendingPhotoRequest(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userProfile?.id) {
      checkPhotoRequestStatus();
    }
  }, [userProfile?.id]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      
      console.log('ProfileView: Fetching profile for userId:', userId);
      
      // Fetch user profile with all registration data
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          auth_id,
          email,
          avatar,
          first_name,
          last_name,
          username,
          gender,
          age,
          nationality,
          country_of_residence,
          city,
          county,
          believe_in_marriage,
          hiv_status,
          current_profession,
          marital_status,
          want_kids,
          do_not_contact_if,
          introduce_yourself,
          describe_appearance,
          looking_for_appearance,
          partner_expectations,
          do_not_contact_me_if,
          profile_images,
          online_status,
          has_paid,
          last_login,
          created_at,
          number_of_children,
          religion,
          has_physical_disability,
          physical_disability_details,
          has_critical_illness,
          critical_illness_details,
          height_feet,
          height_inches,
          complexion,
          tribe,
          teeth_state
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('ProfileView: Error fetching profile:', error);
        throw error;
      }

      if (data) {
        console.log('ProfileView: Profile data fetched:', {
          id: data.id,
          name: data.first_name,
          age: data.age,
          gender: data.gender,
          profession: data.current_profession,
          nationality: data.nationality,
          marital_status: data.marital_status,
          hiv_status: data.hiv_status,
          religion: data.religion
        });
        setUserProfile(data as UserProfile);
      } else {
        console.log('ProfileView: No data returned from query');
      }
    } catch (error) {
      console.error('ProfileView: Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const checkPhotoRequestStatus = async () => {
    if (!userProfile?.id) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: currentUserProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!currentUserProfile) return;

      // Check photo request status
      const { data: existingRequest } = await supabase
        .from('photo_requests')
        .select('id, request_status')
        .eq('requester_id', currentUserProfile.id)
        .eq('target_user_id', userProfile.id)
        .maybeSingle();

      if (existingRequest) {
        setPhotoRequestStatus(existingRequest.request_status);
      } else {
        setPhotoRequestStatus('none');
      }

      // Check connection status
      const { data: connData } = await (supabase as any)
        .from('connections')
        .select('status, requester_id')
        .or(
          `and(requester_id.eq.${currentUserProfile.id},recipient_id.eq.${userProfile.id}),` +
          `and(requester_id.eq.${userProfile.id},recipient_id.eq.${currentUserProfile.id})`
        )
        .maybeSingle();

      if (connData) {
        setConnectionStatus(connData.status as ConnectionStatus);
      } else {
        setConnectionStatus('none');
      }
    } catch (error) {
      console.error('Error checking statuses:', error);
    }
  };

  // Fallback if user data is missing
  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.errorText, { color: colors.text, marginTop: spacing.md }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userId || !userProfile) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <IconSymbol name="person.crop.circle.badge.xmark" size={64} color={colors.textSecondary} />
          <Text style={styles.errorText}>User profile not found.</Text>
          <Pressable onPress={() => safeBack(router)} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }


  // --- Render Sections ---

  const renderHeroSection = () => (
    <View style={styles.heroContainer}>
      <ImageBackground
        source={avatarSource}
        style={styles.heroImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
          style={styles.gradientOverlay}
        >
          {/* Online Status Badge - Top Right */}
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, isOnline && styles.statusBadgeOnline]}>
              <View style={[styles.statusDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
              <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>

          {/* User Info Card - Bottom Overlay */}
          <View style={styles.heroInfoCard}>
            <Text style={styles.heroName}>{displayName}, {userProfile.age}</Text>
            
            <View style={styles.heroLocationRow}>
              <IconSymbol name="location.fill" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroLocationText}>{location}</Text>
            </View>


            {userProfile.current_profession && (
              <View style={styles.heroProfessionRow}>
                <IconSymbol name="briefcase.fill" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.heroProfessionText}>{userProfile.current_profession}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );

  const renderBio = () => {
    if (!userProfile.introduce_yourself) return null;
    
    return (
      <View style={styles.modernCard}>
        <View style={styles.cardHeader}>
          <IconSymbol name="text.quote" size={24} color={colors.primary} />
          <Text style={styles.cardTitle}>About Me</Text>
        </View>
        <Text style={styles.bioText}>{userProfile.introduce_yourself}</Text>
      </View>
    );
  };

  const renderDetails = () => (
    <View style={styles.modernCard}>
      <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconSymbol name="person.fill" size={24} color={colors.primary} />
          <Text style={styles.cardTitle}>Profile Details</Text>
        </View>
        <Pressable 
          onPress={() => setShowMoreDetails(!showMoreDetails)}
          style={styles.moreDetailsButton}
        >
          <Text style={styles.moreDetailsText}>{showMoreDetails ? 'Show Less' : 'More Details'}</Text>
          <IconSymbol name={showMoreDetails ? "chevron.up" : "chevron.down"} size={18} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.twoColumnGrid}>
        <View style={styles.profileField}>
          <Text style={styles.fieldLabel}>Complexion:</Text>
          <Text style={styles.fieldValue}>{userProfile.complexion || 'Not specified'}</Text>
        </View>

        <View style={styles.profileField}>
          <Text style={styles.fieldLabel}>Height:</Text>
          <Text style={styles.fieldValue}>{userProfile.height_feet && userProfile.height_inches ? `${userProfile.height_feet}' ${userProfile.height_inches}"` : 'Not specified'}</Text>
        </View>

        <View style={styles.profileField}>
          <Text style={styles.fieldLabel}>Profession:</Text>
          <Text style={styles.fieldValue}>{userProfile.current_profession || 'Not specified'}</Text>
        </View>

        <View style={styles.profileField}>
          <Text style={styles.fieldLabel}>Country:</Text>
          <Text style={styles.fieldValue}>{userProfile.country_of_residence || 'Not specified'}</Text>
        </View>

        <View style={styles.profileField}>
          <Text style={styles.fieldLabel}>County:</Text>
          <Text style={styles.fieldValue}>{userProfile.county || 'Not specified'}</Text>
        </View>
      </View>

      {showMoreDetails && (
        <>
          <View style={styles.twoColumnGrid}>
            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Ethnicity:</Text>
              <Text style={styles.fieldValue}>{userProfile.tribe || 'Not specified'}</Text>
            </View>

            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Religion:</Text>
              <Text style={styles.fieldValue}>{userProfile.religion || 'Not specified'}</Text>
            </View>

            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>HIV Status:</Text>
              <Text style={styles.fieldValue}>{userProfile.hiv_status || 'Not specified'}</Text>
            </View>

            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Gender:</Text>
              <Text style={styles.fieldValue}>{userProfile.gender || 'Not specified'}</Text>
            </View>

            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Marital Status:</Text>
              <Text style={styles.fieldValue}>{userProfile.marital_status || 'Not specified'}</Text>
            </View>

            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Children:</Text>
              <Text style={styles.fieldValue}>{userProfile.number_of_children !== null && userProfile.number_of_children !== undefined ? (userProfile.number_of_children > 0 ? `${userProfile.number_of_children} ${userProfile.number_of_children === 1 ? 'child' : 'children'}` : 'None') : 'Not specified'}</Text>
            </View>

            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Weight:</Text>
              <Text style={styles.fieldValue}>{userProfile.weight || 'Not specified'}</Text>
            </View>

            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Teeth Condition:</Text>
              <Text style={styles.fieldValue}>{userProfile.teeth_state || 'Not specified'}</Text>
            </View>
          </View>
          
          <View style={styles.fullWidthField}>
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Looking For:</Text>
            <Text style={styles.fieldValue}>{userProfile.partner_expectations || 'Not specified'}</Text>
          </View>
        </>
      )}
    </View>
  );


  const renderAboutYou = () => {
    if (!showMoreDetails) return null;
    
    const parts = [] as any[];

    if (userProfile.describe_appearance) {
      parts.push(
        <View key="appearance" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>My Appearance</Text>
          <Text style={styles.aboutText}>{userProfile.describe_appearance}</Text>
        </View>
      );
    }

    if (userProfile.looking_for_appearance) {
      parts.push(
        <View key="looking" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>What I'm Looking For</Text>
          <Text style={styles.aboutText}>{userProfile.looking_for_appearance}</Text>
        </View>
      );
    }

    if (userProfile.do_not_contact_me_if) {
      parts.push(
        <View key="donot" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>Do Not Contact Me If</Text>
          <Text style={styles.aboutText}>{userProfile.do_not_contact_me_if}</Text>
        </View>
      );
    }

    if (userProfile.want_kids) {
      parts.push(
        <View key="kids" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>Want Kids in Future</Text>
          <Text style={styles.aboutText}>{userProfile.want_kids}</Text>
        </View>
      );
    }

    if (userProfile.believe_in_marriage) {
      parts.push(
        <View key="marriage" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>Believe in Marriage</Text>
          <Text style={styles.aboutText}>{userProfile.believe_in_marriage}</Text>
        </View>
      );
    }

    // Do you have kids
    if (userProfile.number_of_children !== null && userProfile.number_of_children !== undefined) {
      const hasKidsText = userProfile.number_of_children > 0
        ? `Yes, I have ${userProfile.number_of_children} kid${userProfile.number_of_children === 1 ? '' : 's'}`
        : 'No';
      parts.push(
        <View key="have_kids" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>Do You Have Kids</Text>
          <Text style={styles.aboutText}>{hasKidsText}</Text>
        </View>
      );
    }



    // Complexion
    if (userProfile.complexion) {
      parts.push(
        <View key="complexion" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>Complexion</Text>
          <Text style={styles.aboutText}>{userProfile.complexion}</Text>
        </View>
      );
    }

    // Tribe
    if (userProfile.tribe) {
      parts.push(
        <View key="tribe" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>Tribe</Text>
          <Text style={styles.aboutText}>{userProfile.tribe}</Text>
        </View>
      );
    }

    // State of Teeth
    if (userProfile.teeth_state) {
      parts.push(
        <View key="teeth_state" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>State of Teeth</Text>
          <Text style={styles.aboutText}>{userProfile.teeth_state}</Text>
        </View>
      );
    }

    // Religious level of faith
    if (userProfile.religion) {
      parts.push(
        <View key="religion" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>Religious Level of Faith</Text>
          <Text style={styles.aboutText}>{userProfile.religion}</Text>
        </View>
      );
    }

    // Weight
    if (userProfile.weight) {
      parts.push(
        <View key="weight" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>Weight</Text>
          <Text style={styles.aboutText}>{userProfile.weight}</Text>
        </View>
      );
    }

    // Physical disability
    if (userProfile.has_physical_disability) {
      parts.push(
        <View key="disability" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>Physical Disability</Text>
          <Text style={styles.aboutText}>{userProfile.physical_disability_details || 'Yes'}</Text>
        </View>
      );
    }

    // Critical illness
    if (userProfile.has_critical_illness) {
      parts.push(
        <View key="illness" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>Critical Illness</Text>
          <Text style={styles.aboutText}>{userProfile.critical_illness_details || 'Yes'}</Text>
        </View>
      );
    }

    // As your partner, expect this from me
    if (userProfile.partner_expectations) {
      parts.push(
        <View key="expectations" style={styles.aboutBlock}>
          <Text style={styles.aboutLabel}>As Your Partner, Expect This From Me</Text>
          <Text style={styles.aboutText}>{userProfile.partner_expectations}</Text>
        </View>
      );
    }

    if (parts.length === 0) return null;

    return (
      <View style={styles.modernCard}>
        <View style={styles.cardHeader}>
          <IconSymbol name="doc.text.fill" size={24} color={colors.primary} />
          <Text style={styles.cardTitle}>More About Me</Text>
        </View>
        {parts}
      </View>
    );
  };
  
  const renderActions = () => (
    <View style={styles.actionsContainer}>
      {/* Request Photo Button */}
      <Pressable
        style={[
          styles.photoRequestButton,
          (photoRequestStatus === 'pending' || sendingPhotoRequest) && styles.photoRequestButtonPending,
          photoRequestStatus === 'approved' && styles.photoRequestButtonApproved
        ]}
        onPress={() => {
          if (photoRequestStatus === 'approved') {
            // Navigate to their photo gallery
            router.push({
              pathname: '/photo-gallery' as any,
              params: { userId: userProfile.id, isOwnProfile: 'false' },
            } as any);
          } else {
            handleRequestPhoto();
          }
        }}
        disabled={(photoRequestStatus === 'pending' || sendingPhotoRequest)}
      >
        {sendingPhotoRequest ? (
          <>
            <ActivityIndicator size="small" color="#FF9500" />
            <Text style={[styles.photoRequestButtonTextPending, { color: '#FF9500' }]}>Sending...</Text>
          </>
        ) : photoRequestStatus === 'pending' ? (
          <>
            <IconSymbol name="clock.fill" size={20} color="#FF9500" />
            <Text style={[styles.photoRequestButtonTextPending, { color: '#FF9500' }]}>Waiting for Approval</Text>
          </>
        ) : photoRequestStatus === 'approved' ? (
          <>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
            <Text style={styles.photoRequestButtonTextApproved}>Approved - View Photos</Text>
          </>
        ) : (
          <>
            <IconSymbol name="photo.fill" size={20} color={colors.card} />
            <Text style={styles.photoRequestButtonText}>Request to See Photos</Text>
          </>
        )}
      </Pressable>

      <ConnectionActions
        targetUserName={displayName}
        targetUserId={userProfile.id}
        connectionStatus={connectionStatus}
        onConnect={() => handleConnectionAction('connect')}
        onAccept={() => handleConnectionAction('accept')}
        onDecline={() => handleConnectionAction('decline')}
        onMessage={handleMessage}
        onRequestPhoto={handleRequestPhoto}
      />
      
      {/* Phone Number Request Button - always available */}
      <View style={styles.numberRequestContainer}>
        <PhoneNumberRequest
          targetUserName={displayName}
          targetUserId={userProfile.id}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: displayName,
          headerBackTitle: 'Discover',
          headerTitleStyle: { color: colors.text },
          headerTransparent: true,
          headerBlurEffect: 'light',
        }}
      />
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Hero Image Section */}
        {renderHeroSection()}

        {/* Content Cards */}
        <View style={styles.contentWrapper}>
          {renderBio()}
          {renderDetails()}
          {renderAboutYou()}
          {renderActions()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Component for Details
const DetailItem: React.FC<{ iconName: any; label: string; value: string }> = ({ iconName, label, value }) => {
  return (
    <View style={styles.detailItem}>
      <View style={styles.detailIconContainer}>
        <IconSymbol name={iconName} size={20} color={colors.primary} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
};


// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 18,
    color: colors.error,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    color: colors.card,
    fontWeight: '700',
    fontSize: 16,
  },
  
  // Hero Section - Full Width Image
  heroContainer: {
    width: screenWidth,
    height: screenHeight * 0.65, // 65% of screen height for dramatic effect
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.xl,
  },

  // Status Badge - Top Right with Glassmorphism
  statusBadgeContainer: {
    position: 'absolute',
    top: 60, // Below header
    right: spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  statusBadgeOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  onlineDot: { 
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  offlineDot: { 
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Hero Info Card - Bottom Overlay with Glassmorphism
  heroInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(20px)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: spacing.md,
  },
  heroName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: -0.5,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  heroLocationText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroProfessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  heroProfessionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Content Wrapper
  contentWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 120,
    marginTop: -spacing.xl, // Slight overlap for modern look
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  
  // Modern Card Style
  modernCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  moreDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  moreDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },

  // Bio Section
  bioText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
    fontWeight: '400',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Details Section - Grid Layout
  detailGrid: {
    gap: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },

  // Interests Section
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  interestTag: {
    backgroundColor: colors.primary + '15',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  interestText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },

  // About You Section
  aboutBlock: {
    marginBottom: spacing.lg,
  },
  aboutLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aboutText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    fontWeight: '400',
  },

  // Two column profile grid layout
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  profileField: {
    width: '48%',
    marginBottom: 20,
  },
  fullWidthField: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 22,
  },

  // Actions Section
  actionsContainer: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  numberRequestContainer: {
    marginTop: 0,
  },
   photoRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  photoRequestButtonPending: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: '#FF9500' + '40',
  },
  photoRequestButtonApproved: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.success + '40',
  },
  photoRequestButtonSent: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.success + '40',
  },
   photoRequestButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.card,
    letterSpacing: 0.3,
  },
  photoRequestButtonTextPending: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9500',
  },
  photoRequestButtonTextApproved: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  photoRequestButtonTextSent: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
});
