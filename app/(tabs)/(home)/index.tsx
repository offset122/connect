import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View, Text, Pressable, Platform, ActivityIndicator, Alert, RefreshControl, useWindowDimensions, Image, ImageBackground, TextInput } from "react-native";
import { IconSymbol } from "../../../components/IconSymbol";
import { colors, commonStyles, spacing, borderRadius } from "../../../styles/commonStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../integrations/supabase/client";
import { calculateMatchPercentage, getMatchColor } from "../../../utils/matchmaking";
import PhoneNumberRequest from "../../../components/PhoneNumberRequest";
import ConnectionActions from "../../../components/ConnectionActions";
import { LinearGradient } from 'expo-linear-gradient';

// Get local avatar image from assets
const getAvatarImage = (filename: string | null | undefined) => {
  if (!filename) return null;
  
  const avatarMap: { [key: string]: any } = {
    '3d-cartoon-portrait-person-practicing-law-related-profession.jpg': require('../../../assets/3d-cartoon-portrait-person-practicing-law-related-profession.jpg'),
    '408535ae-483f-477a-a0e6-3e28d0eabb88.jpg': require('../../../assets/408535ae-483f-477a-a0e6-3e28d0eabb88.jpg'),
    '2809696b-04f1-4ca8-8194-2ac46919f408.jpg': require('../../../assets/2809696b-04f1-4ca8-8194-2ac46919f408.jpg'),
    'androgynous-avatar-non-binary-queer-person.jpg': require('../../../assets/androgynous-avatar-non-binary-queer-person.jpg'),
    'b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg': require('../../../assets/b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg'),
    'b400cea9-fa0a-4595-9865-d1216fea02e8.jpg': require('../../../assets/b400cea9-fa0a-4595-9865-d1216fea02e8.jpg'),
    'av1.jpg': require('../../../assets/av1.jpg'),
    'av2.jpg': require('../../../assets/av2.jpg'),
    'av3.jpg': require('../../../assets/av3.jpg'),
    'av4.jpg': require('../../../assets/av4.jpg'),
    'av5.jpg': require('../../../assets/av5.jpg'),
    'av6.jpg': require('../../../assets/av6.jpg'),
    'men1.jpg': require('../../../assets/men1.jpg'),
    'men2.jpg': require('../../../assets/men2.jpg'),
    'men3.jpg': require('../../../assets/men3.jpg'),
  };
  return avatarMap[filename] || null;
};

// Get random avatar if user has none
const getRandomAvatar = () => {
  const avatars = [
    'av1.jpg', 'av2.jpg', 'av3.jpg', 'av4.jpg', 'av5.jpg', 'av6.jpg'
  ];
  const randomIndex = Math.floor(Math.random() * avatars.length);
  return avatars[randomIndex];
};

// --- Type definitions ---
type ConnectionStatus = 'none' | 'pending' | 'accepted' | 'rejected';

type User = {
  id: string;
  name: string;
  age: number;
  location: string;
  introduce_yourself?: string;
  avatar: string;
  interests?: string[];
  matchPercentage?: number;
  profileData?: any;
  connectionStatus?: ConnectionStatus;
};

export default function DiscoverScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'online' | 'new' | 'kenya' | 'diaspora' | 'men' | 'women'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Advanced filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [ageRange, setAgeRange] = useState<{ min: number; max: number }>({ min: 18, max: 80 });
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedProfession, setSelectedProfession] = useState<string>('');
  const [selectedHivStatus, setSelectedHivStatus] = useState<string>('');
  const [selectedMaritalStatus, setSelectedMaritalStatus] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCounty, setSelectedCounty] = useState<string>('');
  const [selectedReligion, setSelectedReligion] = useState<string>('');
  const [selectedWantKids, setSelectedWantKids] = useState<string>('');


  const { width } = useWindowDimensions();
  const router = useRouter();
  // Calculate card width: Total width - (2 * horizontal padding) - (1 * gap) / 2 cards
  const cardWidth = (width - (20 * 2) - 16) / 2;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Authenticate User
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required. Please log in.');
      }
      setCurrentUserId(user.id);

      // 2. Fetch Current User Profile
      const { data: currentProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.id)
        .single();

      if (profileError || !currentProfile) {
        throw new Error('Profile not found. Please complete registration.');
      }
      setCurrentUserProfile(currentProfile);

      // 3. Get Existing Connections and Exclude IDs
      const { data: connectionsData } = await (supabase as any)
        .from('connections')
        .select('requester_id, recipient_id, status')
        .or(`requester_id.eq.${currentProfile.id},recipient_id.eq.${currentProfile.id}`);

      const excludedIds = new Set<string>([currentProfile.id]);
      const connectionMap = new Map<string, ConnectionStatus>();
      
      connectionsData?.forEach((conn: any) => {
        const otherId = conn.requester_id === currentProfile.id ? conn.recipient_id : conn.requester_id;
        
        // Exclude all connected users (pending, accepted, rejected) from the discover list
        excludedIds.add(otherId);
        
        // Map connection status for potential display logic
        connectionMap.set(otherId, conn.status);
      });

      // 4. Fetch Discoverable Users
      const excludedIdsArray = Array.from(excludedIds);
      
      let query = supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          age,
          gender,
          avatar,
          county,
          city,
          nationality,
          country_of_residence,
          current_profession,
          marital_status,
          introduce_yourself,
          interests,
          last_login,
          created_at,
          is_active,
          has_paid
        `)
        .eq('is_active', true)
        .eq('has_paid', true)
        .neq('id', currentProfile.id) // Exclude self
        .limit(50);
        
      if (excludedIdsArray.length > 1) {
          // Exclude already connected users using a NOT IN clause
          query = query.not('id', 'in', `(${excludedIdsArray.filter(id => id !== currentProfile.id).join(',')})`);
      }

      const { data: usersData, error: usersError } = await query;

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw new Error('Failed to load profiles');
      }

      if (!usersData || usersData.length === 0) {
        setUsers([]);
        console.log('No new profiles available.');
        return;
      }

      // 5. Map Users (removed match percentage calculation)
      const mappedUsers: User[] = usersData.map((u: any) => {
        const status = connectionMap.get(u.id) || 'none';

        return {
          id: u.id,
          name: u.first_name || 'Unknown',
          age: u.age || 0,
          location: u.county || u.country_of_residence || 'Unknown',
          introduce_yourself: u.introduce_yourself,
          avatar: u.avatar || (u.gender === 'Male' ? '👨' : '👩'),
          interests: u.interests || [],
          profileData: u,
          connectionStatus: status,
        };
      });
      
      // Sort by most recent (created_at)
      mappedUsers.sort((a, b) => {
        const dateA = new Date(a.profileData?.created_at || 0).getTime();
        const dateB = new Date(b.profileData?.created_at || 0).getTime();
        return dateB - dateA;
      });

      setUsers(mappedUsers);
      console.log('Users loaded:', mappedUsers.length, 'with match percentages');
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setUsers([]);
      Alert.alert('Error', error.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); 

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter and search users
  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.location.toLowerCase().includes(query) ||
        (user.introduce_yourself && user.introduce_yourself.toLowerCase().includes(query)) ||
        (user.profileData?.current_profession && user.profileData.current_profession.toLowerCase().includes(query)) ||
        (user.interests && Array.isArray(user.interests) && user.interests.some(interest => interest.toLowerCase().includes(query)))
      );
    }

    // Apply category filter
    switch (selectedFilter) {
      case 'online':
        filtered = filtered.filter(user =>
          user.profileData?.last_login &&
          new Date().getTime() - new Date(user.profileData.last_login).getTime() < 15 * 60 * 1000
        );
        break;
      case 'new':
        filtered = filtered.filter(user =>
          user.profileData?.created_at &&
          new Date().getTime() - new Date(user.profileData.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
        );
        break;
      case 'kenya':
        filtered = filtered.filter(user => user.profileData?.country_of_residence === 'Kenya');
        break;
      case 'diaspora':
        filtered = filtered.filter(user => user.profileData?.country_of_residence !== 'Kenya');
        break;
      case 'men':
        filtered = filtered.filter(user => user.profileData?.gender === 'Male');
        break;
      case 'women':
        filtered = filtered.filter(user => user.profileData?.gender === 'Female');
        break;
    }

    // Apply advanced filters
    if (ageRange.min > 18 || ageRange.max < 80) {
      filtered = filtered.filter(user => 
        user.age >= ageRange.min && user.age <= ageRange.max
      );
    }

    if (selectedGender) {
      filtered = filtered.filter(user => 
        user.profileData?.gender === selectedGender
      );
    }

    if (selectedProfession) {
      filtered = filtered.filter(user => 
        user.profileData?.current_profession?.toLowerCase().includes(selectedProfession.toLowerCase())
      );
    }

    if (selectedHivStatus) {
      filtered = filtered.filter(user => 
        user.profileData?.hiv_status === selectedHivStatus
      );
    }

    if (selectedMaritalStatus) {
      filtered = filtered.filter(user => 
        user.profileData?.marital_status === selectedMaritalStatus
      );
    }

    if (selectedCountry) {
      filtered = filtered.filter(user => 
        user.profileData?.country_of_residence === selectedCountry
      );
    }

    if (selectedCounty) {
      filtered = filtered.filter(user => 
        user.profileData?.county === selectedCounty
      );
    }

    if (selectedReligion) {
      filtered = filtered.filter(user => 
        user.profileData?.religion === selectedReligion
      );
    }

    if (selectedWantKids) {
      filtered = filtered.filter(user => 
        user.profileData?.want_kids === selectedWantKids
      );
    }

    return filtered;
  }, [users, searchQuery, selectedFilter, ageRange, selectedGender, selectedProfession, selectedHivStatus, selectedMaritalStatus, selectedCountry, selectedCounty, selectedReligion, selectedWantKids]);

  // --- Utility functions ---

  const handleConnectionUpdate = (targetUserId: string, newStatus: ConnectionStatus) => {
    setUsers(prevUsers =>
      prevUsers.map(u =>
        u.id === targetUserId ? { ...u, connectionStatus: newStatus } : u
      )
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };
  
  // --- MODIFIED: Handler for navigating to ProfileView ---
  const handleProfileView = (user: User) => {
    // Pass the user object as a JSON string via navigation parameters
    router.push({
      pathname: '/(tabs)/(home)/profileview', // Ensure this path matches your file structure
      params: { 
        user: JSON.stringify(user)
      }
    });
  };
  // --------------------------------------------------------

  // --- Connection Handlers ---

  const handleConnect = async (targetUser: User) => {
    if (!currentUserProfile) return;

    try {
      const { error } = await (supabase as any)
        .from('connections')
        .insert({
          requester_id: currentUserProfile.id,
          recipient_id: targetUser.id,
          status: 'pending',
        });

      if (error) throw error;

      Alert.alert('Success', `Connection request sent to ${targetUser.name}!`);
      handleConnectionUpdate(targetUser.id, 'pending');

    } catch (error: any) {
      console.error('Error sending connection request:', error);
      Alert.alert('Error', error.message || 'Failed to send connection request');
    }
  };

  const handleAccept = async (targetUser: User) => {
    if (!currentUserProfile) return;

    try {
      const { error } = await (supabase as any)
        .from('connections')
        .update({ status: 'accepted' })
        .eq('requester_id', targetUser.id) // The person we are accepting
        .eq('recipient_id', currentUserProfile.id); // Us

      if (error) throw error;

      // Create notification for the requester
      const currentUserName = currentUserProfile.first_name || currentUserProfile.username || 'Someone';
      await (supabase as any)
        .from('notifications')
        .insert({
          user_id: targetUser.id,
          title: 'Connection Accepted! 🎉',
          body: `${currentUserName} accepted your connection request. You can now message each other!`,
          notification_type: 'connection_accepted',
          type: 'connection_accepted',
          related_user_id: currentUserProfile.id,
          read: false,
        });
      
      Alert.alert('Connected!', `You are now connected with ${targetUser.name}`);
      handleConnectionUpdate(targetUser.id, 'accepted');

    } catch (error: any) {
      console.error('Error accepting connection:', error);
      Alert.alert('Error', error.message || 'Failed to accept connection');
    }
  };

  const handleDecline = async (targetUser: User) => {
    if (!currentUserProfile) return;

    try {
      const { error } = await (supabase as any)
        .from('connections')
        .update({ status: 'rejected' })
        .eq('requester_id', targetUser.id) // The person whose request we are declining
        .eq('recipient_id', currentUserProfile.id); // Us
        
      if (error) throw error;

      // Create notification for the requester
      const currentUserName = currentUserProfile.first_name || currentUserProfile.username || 'Someone';
      await (supabase as any)
        .from('notifications')
        .insert({
          user_id: targetUser.id,
          title: 'Connection Request Declined',
          body: `${currentUserName} declined your connection request.`,
          notification_type: 'connection_declined',
          type: 'connection_declined',
          related_user_id: currentUserProfile.id,
          read: false,
        });

      Alert.alert('Declined', `Connection request from ${targetUser.name} has been declined`);
      handleConnectionUpdate(targetUser.id, 'rejected');

    } catch (error: any) {
      console.error('Error declining connection:', error);
      Alert.alert('Error', error.message || 'Failed to decline connection');
    }
  };

  const handleMessage = (targetUser: User) => {
    Alert.alert('Messaging', `Open chat with ${targetUser.name}`);
  };

  const handleRequestPhone = async (targetUser: User) => {
    if (!currentUserProfile) return;

    try {
      // Check if connection is accepted
      if (targetUser.connectionStatus !== 'accepted') {
        Alert.alert('Not Connected', 'You can only request phone numbers from accepted connections.');
        return;
      }

      Alert.alert(
        'Request Phone Number',
        `Request phone number from ${targetUser.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Request',
            onPress: async () => {
              try {
                // Create a phone request record
                const { error } = await (supabase as any)
                  .from('phone_number_requests')
                  .insert({
                    requester_id: currentUserProfile.id,
                    target_user_id: targetUser.id,
                    request_status: 'pending',
                  });

                if (error) throw error;
                Alert.alert('Request Sent!', `Phone number request sent to ${targetUser.name}`);
              } catch (error: any) {
                console.error('Error sending phone request:', error);
                Alert.alert('Error', error.message || 'Failed to send phone request');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error in phone request:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    }
  };

  const handleRequestPhoto = async (targetUser: User) => {
    if (!currentUserProfile) return;

    try {
      Alert.alert(
        'Photo Request',
        `Send a request to ${targetUser.name} to view their photos?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Request',
            onPress: async () => {
              try {
                // Check if request already exists
                const { data: existingRequest } = await supabase
                  .from('photo_requests')
                  .select('id, request_status')
                  .eq('requester_id', currentUserProfile.id)
                  .eq('target_user_id', targetUser.id)
                  .single();

                if (existingRequest) {
                  if (existingRequest.request_status === 'approved') {
                    // Navigate to photo gallery
                    router.push({
                      pathname: '/photo-gallery',
                      params: { userId: targetUser.id, isOwnProfile: 'false' },
                    });
                  } else if (existingRequest.request_status === 'pending') {
                    Alert.alert('Request Pending', `You already have a pending photo request to ${targetUser.name}`);
                  } else {
                    Alert.alert('Request Declined', `${targetUser.name} has declined your request`);
                  }
                  return;
                }

                // Create new photo request
                const { error: requestError } = await supabase
                  .from('photo_requests')
                  .insert({
                    requester_id: currentUserProfile.id,
                    target_user_id: targetUser.id,
                    request_status: 'pending',
                  });

                if (requestError) throw requestError;

                // Create notification
                await supabase
                  .from('notifications')
                  .insert({
                    user_id: targetUser.id,
                    title: 'Photo Request 📸',
                    body: `${currentUserProfile.first_name || 'Someone'} wants to view your photos`,
                    notification_type: 'photo_request',
                    type: 'photo_request',
                    related_user_id: currentUserProfile.id,
                    read: false,
                  });

                Alert.alert('Success!', `Photo request sent to ${targetUser.name}`);
              } catch (error: any) {
                console.error('Error sending photo request:', error);
                Alert.alert('Error', error.message || 'Failed to send request');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error in photo request:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    }
  };

  const handleRequestNumber = async (targetUser: User) => {
    if (!currentUserProfile) return;

    try {
      // Check if request already exists
      const { data: existingRequest } = await (supabase as any)
        .from('phone_number_requests')
        .select('id, request_status')
        .eq('requester_id', currentUserProfile.id)
        .eq('target_user_id', targetUser.id)
        .single();

      if (existingRequest) {
        if (existingRequest.request_status === 'approved') {
          // Get the phone number
          const { data: userData } = await (supabase as any)
            .from('users')
            .select('phone_number')
            .eq('id', targetUser.id)
            .single();

          Alert.alert(
            'Phone Number Available! 📱',
            `${targetUser.name}'s phone number is: ${userData?.phone_number || 'Not provided'}`,
            [{ text: 'OK' }]
          );
        } else if (existingRequest.request_status === 'pending') {
          Alert.alert('Request Pending', `You already have a pending request to ${targetUser.name}. Please wait for their response.`);
        } else {
          Alert.alert('Request Declined', `${targetUser.name} has declined your request.`);
        }
        return;
      }

      // Send phone number request (like the original handleRequestPhone function)
      Alert.alert(
        'Request Phone Number',
        `Request phone number from ${targetUser.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send Request',
            onPress: async () => {
              try {
                // Create a phone request record
                const { error } = await (supabase as any)
                  .from('phone_number_requests')
                  .insert({
                    requester_id: currentUserProfile.id,
                    target_user_id: targetUser.id,
                    request_status: 'pending',
                  });

                if (error) throw error;

                // Create notification for the target user
                await (supabase as any)
                  .from('notifications')
                  .insert({
                    user_id: targetUser.id,
                    title: 'Phone Number Request 📱',
                    body: `${currentUserProfile.first_name || 'Someone'} wants your phone number`,
                    notification_type: 'phone_request',
                    type: 'phone_request',
                    related_user_id: currentUserProfile.id,
                    read: false,
                  });

                Alert.alert('Request Sent!', `Phone number request sent to ${targetUser.name}`);
              } catch (error: any) {
                console.error('Error sending phone request:', error);
                Alert.alert('Error', error.message || 'Failed to send phone request');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error in request number:', error);
      Alert.alert('Error', error.message || 'An error occurred');
    }
  };



  // --- Rendering ---

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
        <View style={[commonStyles.centerContent, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.text, { marginTop: 16 }]} selectable={false}>Finding matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Discover",
            headerLargeTitle: true,
          }}
        />
      )}
      
      <View style={styles.container}>
        {/* Hero Section with Search */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Discover</Text>
              <Text style={styles.heroSubtitle}>Find your perfect match</Text>
              
              {/* Search Bar with Filter Toggle */}
              <Pressable 
                style={styles.searchContainer}
                onPress={() => setSearchFocused(true)}
              >
                <View style={styles.searchBar}>
                  <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, location, interests..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onFocus={() => setSearchFocused(true)}
                  />
                  {searchQuery.length > 0 ? (
                    <Pressable onPress={() => setSearchQuery('')}>
                      <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
                    </Pressable>
                  ) : (
                    <Pressable 
                      onPress={() => {
                        setShowAdvancedFilters(!showAdvancedFilters);
                        setSearchFocused(false);
                      }}
                    >
                      <IconSymbol 
                        name="slider.horizontal.3" 
                        size={20} 
                        color={showAdvancedFilters ? colors.primary : colors.textSecondary} 
                      />
                    </Pressable>
                  )}
                </View>
              </Pressable>

              {/* Stats Row - Kenya, Diaspora, and New This Week */}
              <View style={styles.statsRow}>
                <Pressable style={[styles.statItem, selectedFilter === 'kenya' && styles.statItemActive]} onPress={() => setSelectedFilter(selectedFilter === 'kenya' ? 'all' : 'kenya')}>
                  <Text style={styles.statLabel}>Kenya</Text>
                </Pressable>
                <View style={styles.statDivider} />
                <Pressable style={[styles.statItem, selectedFilter === 'diaspora' && styles.statItemActive]} onPress={() => setSelectedFilter(selectedFilter === 'diaspora' ? 'all' : 'diaspora')}>
                  <Text style={styles.statLabel}>Diaspora</Text>
                </Pressable>
                <View style={styles.statDivider} />
                <Pressable style={[styles.statItem, selectedFilter === 'new' && styles.statItemActive]} onPress={() => setSelectedFilter(selectedFilter === 'new' ? 'all' : 'new')}>
                  <Text style={styles.statLabel}>New This Week</Text>
                </Pressable>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Floating Stats Row - Online, Men, Women */}
        <View style={styles.floatingStatsContainer}>
          <View style={styles.floatingStatsRow}>
            <Pressable style={[styles.floatingStatItem, selectedFilter === 'online' && styles.floatingStatItemActive]} onPress={() => setSelectedFilter(selectedFilter === 'online' ? 'all' : 'online')}>
              <Text style={[styles.floatingStatLabel, selectedFilter === 'online' && styles.floatingStatLabelActive]}>Online</Text>
            </Pressable>
            <View style={styles.floatingStatDivider} />
            <Pressable style={[styles.floatingStatItem, selectedFilter === 'men' && styles.floatingStatItemActive]} onPress={() => setSelectedFilter(selectedFilter === 'men' ? 'all' : 'men')}>
              <Text style={[styles.floatingStatLabel, selectedFilter === 'men' && styles.floatingStatLabelActive]}>Men</Text>
            </Pressable>
            <View style={styles.floatingStatDivider} />
            <Pressable style={[styles.floatingStatItem, selectedFilter === 'women' && styles.floatingStatItemActive]} onPress={() => setSelectedFilter(selectedFilter === 'women' ? 'all' : 'women')}>
              <Text style={[styles.floatingStatLabel, selectedFilter === 'women' && styles.floatingStatLabelActive]}>Women</Text>
            </Pressable>
          </View>
        </View>

        {/* Advanced Filters Panel - Shows when search is focused or filters toggled */}
        {(showAdvancedFilters || searchFocused) && (
          <View style={styles.advancedFiltersPanel}>
            <ScrollView style={styles.advancedFiltersScroll} showsVerticalScrollIndicator={false}>
              {/* Age Range */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Age Range</Text>
                <View style={styles.ageRangeContainer}>
                  <TextInput
                    style={styles.ageInput}
                    placeholder="Min"
                    keyboardType="number-pad"
                    value={ageRange.min.toString()}
                    onChangeText={(text) => setAgeRange({ ...ageRange, min: parseInt(text) || 18 })}
                  />
                  <Text style={styles.ageRangeSeparator}>to</Text>
                  <TextInput
                    style={styles.ageInput}
                    placeholder="Max"
                    keyboardType="number-pad"
                    value={ageRange.max.toString()}
                    onChangeText={(text) => setAgeRange({ ...ageRange, max: parseInt(text) || 80 })}
                  />
                </View>
              </View>

              {/* Gender */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Gender</Text>
                <View style={styles.filterOptionsRow}>
                  {['Male', 'Female'].map((gender) => (
                    <Pressable
                      key={gender}
                      style={[styles.filterOption, selectedGender === gender && styles.filterOptionActive]}
                      onPress={() => setSelectedGender(selectedGender === gender ? '' : gender)}
                    >
                      <Text style={[styles.filterOptionText, selectedGender === gender && styles.filterOptionTextActive]}>
                        {gender}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Marital Status */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Marital Status</Text>
                <View style={styles.filterOptionsRow}>
                  {['Single', 'Divorced', 'Widowed'].map((status) => (
                    <Pressable
                      key={status}
                      style={[styles.filterOption, selectedMaritalStatus === status && styles.filterOptionActive]}
                      onPress={() => setSelectedMaritalStatus(selectedMaritalStatus === status ? '' : status)}
                    >
                      <Text style={[styles.filterOptionText, selectedMaritalStatus === status && styles.filterOptionTextActive]}>
                        {status}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* HIV Status */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>HIV Status</Text>
                <View style={styles.filterOptionsRow}>
                  {['Positive', 'Negative', 'Unknown'].map((status) => (
                    <Pressable
                      key={status}
                      style={[styles.filterOption, selectedHivStatus === status && styles.filterOptionActive]}
                      onPress={() => setSelectedHivStatus(selectedHivStatus === status ? '' : status)}
                    >
                      <Text style={[styles.filterOptionText, selectedHivStatus === status && styles.filterOptionTextActive]}>
                        {status}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Religion */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Religion</Text>
                <View style={styles.filterOptionsRow}>
                  {['Christian', 'Muslim', 'Hindu', 'Other'].map((religion) => (
                    <Pressable
                      key={religion}
                      style={[styles.filterOption, selectedReligion === religion && styles.filterOptionActive]}
                      onPress={() => setSelectedReligion(selectedReligion === religion ? '' : religion)}
                    >
                      <Text style={[styles.filterOptionText, selectedReligion === religion && styles.filterOptionTextActive]}>
                        {religion}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Want Kids */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Want Children</Text>
                <View style={styles.filterOptionsRow}>
                  {['Yes', 'No', 'Maybe'].map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.filterOption, selectedWantKids === option && styles.filterOptionActive]}
                      onPress={() => setSelectedWantKids(selectedWantKids === option ? '' : option)}
                    >
                      <Text style={[styles.filterOptionText, selectedWantKids === option && styles.filterOptionTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Country/County */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Location</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Country (e.g., Kenya)"
                  placeholderTextColor={colors.textSecondary}
                  value={selectedCountry}
                  onChangeText={setSelectedCountry}
                />
                <TextInput
                  style={[styles.filterInput, { marginTop: spacing.sm }]}
                  placeholder="County (e.g., Nairobi)"
                  placeholderTextColor={colors.textSecondary}
                  value={selectedCounty}
                  onChangeText={setSelectedCounty}
                />
              </View>

              {/* Profession */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Profession</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Enter profession"
                  placeholderTextColor={colors.textSecondary}
                  value={selectedProfession}
                  onChangeText={setSelectedProfession}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.filterActionButtons}>
                <Pressable
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setAgeRange({ min: 18, max: 80 });
                    setSelectedGender('');
                    setSelectedProfession('');
                    setSelectedHivStatus('');
                    setSelectedMaritalStatus('');
                    setSelectedCountry('');
                    setSelectedCounty('');
                    setSelectedReligion('');
                    setSelectedWantKids('');
                  }}
                >
                  <IconSymbol name="xmark.circle.fill" size={20} color={colors.card} />
                  <Text style={styles.clearFiltersText}>Clear All</Text>
                </Pressable>

                <Pressable
                  style={styles.applyFiltersButton}
                  onPress={() => {
                    setShowAdvancedFilters(false);
                    setSearchFocused(false);
                  }}
                >
                  <IconSymbol name="checkmark.circle.fill" size={20} color={colors.card} />
                  <Text style={styles.applyFiltersText}>Apply Filters</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        )}

       

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.contentContainer,
            Platform.OS !== 'ios' && styles.contentContainerWithTabBar
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {filteredUsers.length > 0 ? (
            <View style={viewMode === 'grid' ? styles.profilesGrid : styles.profilesList}>
              {filteredUsers.map((user, index) => (
                <Pressable 
                  key={user.id} 
                  onPress={() => handleProfileView(user)}
                  style={[
                    viewMode === 'grid' ? styles.profileCard : styles.profileCardList,
                    viewMode === 'grid' && { 
                      width: cardWidth,
                      marginRight: index % 2 === 0 ? spacing.lg : 0, 
                    }
                  ]}
                >
                  {/* Hero Image Section with Gradient Overlay */}
                  <ImageBackground
                    source={user.avatar ? getAvatarImage(user.avatar) || getAvatarImage(getRandomAvatar()) : getAvatarImage(getRandomAvatar())}
                    style={viewMode === 'grid' ? styles.heroImageCard : styles.heroImageCardList}
                    resizeMode="cover"
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)']}
                      style={styles.cardGradient}
                    >
                      {/* Like Button - Top Right (Replaced Match Percentage) */}
                      <Pressable 
                        style={styles.likeButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleConnect(user);
                        }}
                      >
                        <IconSymbol name="heart.fill" size={20} color="#FF6B9D" />
                      </Pressable>

                      {/* Online Status Badge - Top Left */}
                      <View style={[
                        styles.statusBadgeCard,
                        user.profileData?.last_login &&
                        new Date().getTime() - new Date(user.profileData.last_login).getTime() < 15 * 60 * 1000
                          && styles.statusBadgeOnline
                      ]}>
                        <View style={[
                          styles.statusDot,
                          user.profileData?.last_login &&
                          new Date().getTime() - new Date(user.profileData.last_login).getTime() < 15 * 60 * 1000
                            ? styles.onlineDot : styles.offlineDot
                        ]} />
                        <Text style={styles.statusTextCard} selectable={false}>
                          {user.profileData?.last_login &&
                          new Date().getTime() - new Date(user.profileData.last_login).getTime() < 15 * 60 * 1000
                            ? 'Online' : 'Offline'}
                        </Text>
                      </View>

                      {/* User Info - Bottom Overlay */}
                      <View style={styles.cardInfoOverlay}>
                        <Text style={styles.cardName} selectable={false}>
                          {user.name}, {user.age}
                        </Text>
                        
                        <View style={styles.cardLocationRow}>
                          <IconSymbol name="location.fill" size={14} color="rgba(255,255,255,0.9)" />
                          <Text style={styles.cardLocation} selectable={false} numberOfLines={1}>
                            {user.profileData?.city && user.profileData?.country_of_residence
                              ? `${user.profileData.city}, ${user.profileData.country_of_residence}`
                              : user.profileData?.county && user.profileData?.country_of_residence === 'Kenya'
                              ? `${user.profileData.county}, Kenya`
                              : user.location || 'Unknown'
                            }
                          </Text>
                        </View>

                        {user.profileData?.current_profession && (
                          <View style={styles.cardProfessionRow}>
                            <IconSymbol name="briefcase.fill" size={12} color="rgba(255,255,255,0.85)" />
                            <Text style={styles.cardProfession} selectable={false} numberOfLines={1}>
                              {user.profileData.current_profession}
                            </Text>
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                  
                  {/* Interests Tags (List View Only) */}
                  {viewMode === 'list' && user.interests && user.interests.length > 0 && (
                    <View style={styles.interestsContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {user.interests.slice(0, 3).map((interest, idx) => (
                          <View key={idx} style={styles.interestTag}>
                            <Text style={styles.interestTagText}>{interest}</Text>
                          </View>
                        ))}
                        {user.interests.length > 3 && (
                          <View style={styles.interestTag}>
                            <Text style={styles.interestTagText}>+{user.interests.length - 3}</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )}

                  {/* 3. ACTION BLOCK - Modern Button Row */}
                  <View style={styles.actionsBlock}>
                  {user.connectionStatus === 'none' && (
                    <View style={styles.modernActionRow}>
                      {/* Connect Button - Primary */}
                      <Pressable 
                        style={styles.connectButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleConnect(user);
                        }}
                      >
                        <IconSymbol name="person.badge.plus.fill" size={18} color="#FFFFFF" />
                        <Text style={styles.connectButtonText}>Connect</Text>
                      </Pressable>

                      {/* Request Number Button - Secondary */}
                      <Pressable 
                        style={styles.requestNumberButtonModern}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRequestNumber(user);
                        }}
                      >
                        <IconSymbol name="phone.fill" size={18} color={colors.primary} />
                      </Pressable>
                    </View>
                  )}

                  {user.connectionStatus === 'pending' && (
                    <View style={styles.modernActionRow}>
                      {/* Sent Status for Connect */}
                      <View style={styles.sentContainer}>
                        <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
                        <Text style={styles.sentText}>Request Sent</Text>
                      </View>

                      {/* Request Number Button - Still clickable */}
                      <Pressable 
                        style={styles.requestNumberButtonModern}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRequestNumber(user);
                        }}
                      >
                        <IconSymbol name="phone.fill" size={18} color={colors.primary} />
                      </Pressable>
                    </View>
                  )}

                  {user.connectionStatus === 'accepted' && (
                    <View style={styles.modernActionRow}>
                      {/* Message Button */}
                      <Pressable 
                        style={styles.messageButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMessage(user);
                        }}
                      >
                        <IconSymbol name="message.fill" size={18} color="#FFFFFF" />
                        <Text style={styles.connectButtonText}>Message</Text>
                      </Pressable>

                      {/* Request Number Button */}
                      <Pressable 
                        style={styles.requestNumberButtonModern}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRequestNumber(user);
                        }}
                      >
                        <IconSymbol name="phone.fill" size={18} color={colors.primary} />
                      </Pressable>
                    </View>
                  )}

                  {user.connectionStatus === 'rejected' && (
                    <View style={styles.rejectedContainer}>
                      <IconSymbol name="xmark.circle.fill" size={20} color={colors.textSecondary} />
                      <Text style={styles.rejectedText}>Request Declined</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <IconSymbol 
                name={searchQuery ? "magnifyingglass" : "heart"} 
                size={64} 
                color={colors.primary} 
              />
            </View>
            <Text style={styles.emptyTitle} selectable={false}>
              {searchQuery ? 'No Results Found' : 'No Profiles Available'}
            </Text>
            <Text style={styles.emptyText} selectable={false}>
              {searchQuery 
                ? `No profiles match "${searchQuery}"`
                : 'Check back later for new connections!'}
            </Text>
            {!searchQuery && (
              <Pressable style={styles.refreshButton} onPress={fetchUsers}>
                <IconSymbol name="arrow.clockwise" size={20} color={colors.card} />
                <Text style={styles.refreshButtonText} selectable={false}>Refresh</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>


      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero Section
  heroSection: {
    marginBottom: spacing.lg,
  },
  heroGradient: {
    paddingTop: Platform.OS === 'ios' ? 0 : spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  heroContent: {
    gap: spacing.md,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.card,
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: -spacing.sm,
  },

  // Search Bar
  searchContainer: {
    marginTop: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing.xs,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.card,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: spacing.sm,
  },
  statItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Floating Stats Row - Below Header
  floatingStatsContainer: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  floatingStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border + '30',
  },
  floatingStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  floatingStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  floatingStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  floatingStatDivider: {
    width: 1,
    backgroundColor: colors.border + '50',
    marginHorizontal: spacing.sm,
  },
  floatingStatItemActive: {
    backgroundColor: colors.primary,
  },
  floatingStatLabelActive: {
    color: colors.card,
  },

  // Filter Section
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  filterScrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterChipTextActive: {
    color: colors.card,
  },
  onlineDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },

  // View Mode Toggle
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewModeButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  viewModeButtonActive: {
    backgroundColor: colors.primary,
  },

  // Grid Layout
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  // List Layout
  profilesList: {
    gap: spacing.lg,
  },
  
  // Modern Profile Card (Grid)
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },

  // Profile Card (List)
  profileCardList: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },

  // Hero Image Card (Grid)
  heroImageCard: {
    width: '100%',
    height: 280,
    position: 'relative',
  },

  // Hero Image Card (List)
  heroImageCardList: {
    width: '100%',
    height: 200,
    position: 'relative',
  },

  // Interests Container (List View)
  interestsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  interestTag: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  interestTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  cardGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },

  // Like Button - Top Right (Replaced Match Badge)
  likeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  // Status Badge - Top Left with Glassmorphism
  statusBadgeCard: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusBadgeOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  onlineDot: { 
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  offlineDot: { 
    backgroundColor: '#9CA3AF',
  },
  statusTextCard: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Card Info Overlay - Bottom
  cardInfoOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(15px)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: -0.3,
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardLocation: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flex: 1,
  },
  cardProfessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardProfession: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    flex: 1,
  },

  // Action Block - Modern Design
  actionsBlock: {
    padding: spacing.md,
    backgroundColor: colors.card,
  },
  modernActionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  
  // Connect Button - Primary (Gradient-style)
  connectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  connectButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Message Button - Primary
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  // Request Number Button - Modern Icon Button
  requestNumberButtonModern: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // Sent Status Container
  sentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.success + '40',
  },
  sentText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },

  // Advanced Filters Panel
  advancedFiltersPanel: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    maxHeight: 400,
  },
  advancedFiltersScroll: {
    padding: spacing.lg,
  },
  filterGroup: {
    marginBottom: spacing.lg,
  },
  filterGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ageRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ageInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  ageRangeSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  filterOptionTextActive: {
    color: colors.card,
  },
  filterInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  filterActionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  clearFiltersButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  clearFiltersText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.card,
  },
  applyFiltersButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  applyFiltersText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.card,
  },

  // Pending State
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight + '20',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary + '40',
  },
  pendingText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },

  // Rejected State
  rejectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  rejectedText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: -0.5,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
    letterSpacing: 0.2,
  },
});