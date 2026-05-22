import React, { useState, useEffect, useCallback } from "react";
import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet, View, Text, Pressable, Platform, ActivityIndicator, Alert, RefreshControl, useWindowDimensions, Image, ImageBackground, TextInput, Modal } from "react-native";
import { IconSymbol } from "../../../components/IconSymbol";
import DropdownPicker from "../../../components/DropdownPicker";
import { colors, commonStyles, spacing, borderRadius, responsiveStyles, BREAKPOINTS } from "../../../styles/commonStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../integrations/supabase/client";
import { calculateMatchPercentage, getMatchColor } from "../../../utils/matchmaking";
import PhoneNumberRequest from "../../../components/PhoneNumberRequest";
import ConnectionActions from "../../../components/ConnectionActions";
import { LinearGradient } from 'expo-linear-gradient';
import HeaderNotificationButton from '@/components/HeaderNotificationButton';

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

// Get consistent fixed avatar for user without avatar (no random changes)
const getFixedAvatarForUser = (userId: string) => {
  const avatars = [
    'av1.jpg', 'av2.jpg', 'av3.jpg', 'av4.jpg', 'av5.jpg', 'av6.jpg'
  ];
  // Use user id hash to get consistent index that never changes for same user
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatars.length;
  return avatars[index];
};

// --- Type definitions ---
type ConnectionStatus = 'none' | 'pending' | 'accepted' | 'rejected';

type User = {
  id: string;
  auth_id?: string;   // auth UUID — used for notifications and chat routing
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

// Page size for pagination
const PAGE_SIZE = 20;

export default function DiscoverScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  // Cache connections so we don't re-fetch on every filter change
  const [connectionMap, setConnectionMap] = useState<Map<string, ConnectionStatus>>(new Map());
  const [acceptedIds, setAcceptedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'online' | 'new' | 'kenya' | 'diaspora' | 'men' | 'women'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Admin Edit Modal State
  const [showAdminEditModal, setShowAdminEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);
  
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
  const [selectedHasKids, setSelectedHasKids] = useState<string>('');
  const [showFilterButtons, setShowFilterButtons] = useState(true);

  // Kenya counties list
  const kenyaCounties = [
    'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
    'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
    'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu',
    'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa',
    'Muranga', 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua',
    'Nyeri', 'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi',
    'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
  ];

  // Countries list
  const countriesList = [
    'Kenya', 'Uganda', 'Tanzania', 'Rwanda', 'Burundi', 'South Sudan',
    'Ethiopia', 'Somalia', 'United States', 'United Kingdom', 'Canada',
    'Australia', 'Germany', 'France', 'India', 'South Africa', 'Nigeria',
    'Ghana', 'Egypt', 'Morocco'
  ];


  const { width } = useWindowDimensions();
  const router = useRouter();
  const isLarge = width >= BREAKPOINTS.lg;
  const isLandscape = width > 500;
  // Calculate card width: responsive based on screen size
  const cardWidth = isLarge 
    ? (width - (40 * 2) - (isLandscape ? 32 : 24)) / (isLandscape ? 4 : 3)
    : (width - (20 * 2) - 16) / 2;

  /**
   * Build the server-side filtered query based on current filter state.
   * Returns a Supabase query builder ready to be paginated.
   */
  const buildQuery = useCallback(
    (profile: any, excludedAcceptedIds: string[]) => {
      let q = (supabase as any)
        .from('users')
        .select(`
          id,
          auth_id,
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
          has_paid,
          is_admin,
          payment_date,
          subscription_plan,
          subscription_expires_at
        `)
        .eq('is_active', true)
        .eq('has_paid', true)
        .not('is_admin', 'is', true)   // handles both false AND null
        .neq('id', profile.id)
        .not('first_name', 'is', null)
        .not('age', 'is', null)
        .not('gender', 'is', null)
        .gte('age', ageRange.min)
        .lte('age', ageRange.max)
        .order('created_at', { ascending: false });

      // Exclude accepted connections server-side
      if (excludedAcceptedIds.length > 0) {
        q = q.not('id', 'in', `(${excludedAcceptedIds.join(',')})`);
      }

      // ── Server-side filters (only apply if column likely exists) ─────────
      if (selectedGender) q = q.eq('gender', selectedGender);
      if (selectedMaritalStatus) q = q.eq('marital_status', selectedMaritalStatus);
      if (selectedCountry) q = q.eq('country_of_residence', selectedCountry);
      if (selectedCounty) q = q.eq('county', selectedCounty);
      if (selectedProfession) q = q.ilike('current_profession', `%${selectedProfession}%`);

      // Category quick-filters
      if (selectedFilter === 'men') q = q.eq('gender', 'Male');
      if (selectedFilter === 'women') q = q.eq('gender', 'Female');
      if (selectedFilter === 'kenya') q = q.eq('country_of_residence', 'Kenya');
      if (selectedFilter === 'diaspora') q = q.neq('country_of_residence', 'Kenya');
      if (selectedFilter === 'new') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        q = q.gte('created_at', sevenDaysAgo);
      }
      if (selectedFilter === 'online') {
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        q = q.gte('last_login', fifteenMinAgo);
      }

      // Text search (name / location / bio)
      if (searchQuery.trim()) {
        const s = searchQuery.trim();
        q = q.or(
          `first_name.ilike.%${s}%,county.ilike.%${s}%,country_of_residence.ilike.%${s}%,introduce_yourself.ilike.%${s}%,current_profession.ilike.%${s}%`
        );
      }

      return q;
    },
    [
      ageRange,
      selectedGender,
      selectedMaritalStatus,
      selectedCountry,
      selectedCounty,
      selectedProfession,
      selectedFilter,
      searchQuery,
    ]
  );

  /**
   * Map a raw DB row to our User type.
   */
  const mapUser = useCallback(
    (u: any, connMap: Map<string, ConnectionStatus>): User => ({
      id: u.id,
      auth_id: u.auth_id,   // auth UUID for notifications
      name: u.first_name || 'Unknown',
      age: u.age || 0,
      location: u.county || u.country_of_residence || 'Unknown',
      introduce_yourself: u.introduce_yourself,
      avatar: u.avatar || (u.gender === 'Male' ? '👨' : '👩'),
      interests: u.interests || [],
      profileData: u,
      connectionStatus: connMap.get(u.id) || 'none',
    }),
    []
  );

  /**
   * Initial load — fetches current user profile + connections, then page 0.
   */
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setPage(0);
      setHasMore(true);

      // 1. Auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Authentication required. Please log in.');
      setCurrentUserId(user.id);

      // 2. Current user profile (only select what we need)
      const { data: profileRows, error: profileError } = await supabase
        .from('users')
        .select('id, auth_id, first_name, last_name, email, age, gender, avatar, county, city, country_of_residence, is_admin, subscription_expires_at, payment_date, subscription_plan')
        .eq('auth_id', user.id)
        .limit(1);

      const currentProfile = profileRows?.[0] ?? null;
      if (profileError || !currentProfile) throw new Error('Profile not found. Please complete registration.');
      setCurrentUserProfile(currentProfile);

      // 3. Connections (only ids + status — no heavy data)
      const { data: connectionsData } = await (supabase as any)
        .from('connections')
        .select('requester_id, recipient_id, status')
        .or(`requester_id.eq.${currentProfile.id},recipient_id.eq.${currentProfile.id}`);

      const newConnectionMap = new Map<string, ConnectionStatus>();
      const newAcceptedIds: string[] = [];

      connectionsData?.forEach((conn: any) => {
        const otherId = conn.requester_id === currentProfile.id ? conn.recipient_id : conn.requester_id;
        newConnectionMap.set(otherId, conn.status);
        if (conn.status === 'accepted') newAcceptedIds.push(otherId);
      });

      setConnectionMap(newConnectionMap);
      setAcceptedIds(newAcceptedIds);

      // 4. First page of members with server-side filters
      const { data: usersData, error: usersError } = await buildQuery(currentProfile, newAcceptedIds)
        .range(0, PAGE_SIZE - 1);

      if (usersError) {
        console.error('Supabase query error:', JSON.stringify(usersError));
        throw new Error(`Failed to load profiles: ${usersError.message}`);
      }

      const mappedUsers = (usersData ?? []).map((u: any) => mapUser(u, newConnectionMap));
      setUsers(mappedUsers);
      setHasMore((usersData ?? []).length === PAGE_SIZE);
      console.log(`Members loaded: ${mappedUsers.length}`);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setUsers([]);
      Alert.alert('Error', error.message || 'Failed to load profiles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildQuery, mapUser]);

  /**
   * Load the next page (called when user scrolls to the bottom).
   */
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !currentUserProfile) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: usersData, error } = await buildQuery(currentUserProfile, acceptedIds)
        .range(from, to);

      if (error) {
        console.error('Load more error:', JSON.stringify(error));
        throw error;
      }

      const newUsers = (usersData ?? []).map((u: any) => mapUser(u, connectionMap));
      setUsers(prev => [...prev, ...newUsers]);
      setPage(nextPage);
      setHasMore((usersData ?? []).length === PAGE_SIZE);
    } catch (error: any) {
      console.error('Error loading more users:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, currentUserProfile, page, buildQuery, acceptedIds, connectionMap, mapUser]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // The main server-side filters (gender, age, location, marital status, profession, category)
  // are applied in buildQuery. We apply the remaining filters (hiv_status, religion, want_kids,
  // has_children) client-side here since those columns may not exist in all DB versions.
  const filteredUsers = users.filter(user => {
    if (selectedHivStatus && user.profileData?.hiv_status !== selectedHivStatus) return false;
    if (selectedReligion && user.profileData?.religion !== selectedReligion) return false;
    if (selectedWantKids && user.profileData?.want_kids !== selectedWantKids) return false;
    if (selectedHasKids) {
      if (selectedHasKids === 'With Kids' && !user.profileData?.has_children) return false;
      if (selectedHasKids === 'Without Kids' && user.profileData?.has_children) return false;
    }
    return true;
  });

  // --- Utility functions ---

  const handleConnectionUpdate = (targetUserId: string, newStatus: ConnectionStatus) => {
    setUsers(prevUsers =>
      prevUsers.map(u =>
        u.id === targetUserId ? { ...u, connectionStatus: newStatus } : u
      )
    );
    setConnectionMap(prev => {
      const next = new Map(prev);
      next.set(targetUserId, newStatus);
      return next;
    });
    // If accepted, add to excluded list so it won't appear on next fetch
    if (newStatus === 'accepted') {
      setAcceptedIds(prev => [...prev, targetUserId]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };
  
  // --- MODIFIED: Handler for navigating to ProfileView ---
  const handleProfileView = (user: User) => {
    // Do not allow viewing admin profiles
    if (user.profileData?.is_admin) {
      return;
    }
    
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

      // Notify the recipient about the connection request
      const senderName = currentUserProfile.first_name || 'Someone';
      await (supabase as any)
        .from('notifications')
        .insert({
          user_id: targetUser.auth_id ?? targetUser.profileData?.auth_id ?? targetUser.id,
          title: 'New Connection Request 💌',
          body: `${senderName} wants to connect with you! Check your requests to accept or decline.`,
          read: false,
          data: {
            type: 'connection',
            notification_type: 'connection_request',
            related_user_id: currentUserProfile.id,
          },
        });

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
          user_id: targetUser.auth_id ?? targetUser.profileData?.auth_id ?? targetUser.id,
          title: 'Connection Accepted! 🎉',
          body: `${currentUserName} accepted your connection request. You can now message each other!`,
          read: false,
          data: {
            type: 'connection_accepted',
            notification_type: 'connection_accepted',
            related_user_id: currentUserProfile.id,
          },
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
          user_id: targetUser.auth_id ?? targetUser.profileData?.auth_id ?? targetUser.id,
          title: 'Connection Request Declined',
          body: `${currentUserName} declined your connection request.`,
          read: false,
          data: {
            type: 'connection_declined',
            notification_type: 'connection_declined',
            related_user_id: currentUserProfile.id,
          },
        });

      Alert.alert('Declined', `Connection request from ${targetUser.name} has been declined`);
      handleConnectionUpdate(targetUser.id, 'rejected');

    } catch (error: any) {
      console.error('Error declining connection:', error);
      Alert.alert('Error', error.message || 'Failed to decline connection');
    }
  };

  const handleMessage = (targetUser: User) => {
    router.push(`/chat/${targetUser.id}`);
  };

  const handleRequestPhone = async (targetUser: User) => {
    if (!currentUserProfile) return;

    try {
      // Allow phone number requests for any user - no connection required

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

                // Notify the target user
                await (supabase as any)
                  .from('notifications')
                  .insert({
                    user_id: targetUser.auth_id ?? targetUser.profileData?.auth_id ?? targetUser.id,
                    title: 'Phone Number Request 📱',
                    body: `${currentUserProfile.first_name || 'Someone'} is requesting your phone number`,
                    read: false,
                    data: {
                      type: 'phone_request',
                      notification_type: 'phone_request',
                      related_user_id: currentUserProfile.id,
                    },
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
                const { data: existingRequestRows } = await supabase
  .from('photo_requests')
  .select('id, request_status')
  .eq('requester_id', currentUserProfile.id)
  .eq('target_user_id', targetUser.id)
  .limit(1);
const existingRequest = existingRequestRows?.[0] ?? null;

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
                    user_id: targetUser.auth_id ?? targetUser.profileData?.auth_id ?? targetUser.id,
                    title: 'Photo Request 📸',
                    body: `${currentUserProfile.first_name || 'Someone'} wants to view your photos`,
                    read: false,
                    data: {
                      type: 'photo_request',
                      notification_type: 'photo_request',
                      related_user_id: currentUserProfile.id,
                    },
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
      const { data: existingRequestRows } = await (supabase as any)
  .from('phone_number_requests')
  .select('id, request_status')
  .eq('requester_id', currentUserProfile.id)
  .eq('target_user_id', targetUser.id)
  .limit(1);
const existingRequest = existingRequestRows?.[0] ?? null;

      if (existingRequest) {
        if (existingRequest.request_status === 'approved') {
          // Get the phone number
          const { data: userRows } = await (supabase as any)
  .from('users')
  .select('phone_number')
  .eq('id', targetUser.id)
  .limit(1);
const userData = userRows?.[0] ?? null;

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
                    user_id: targetUser.auth_id ?? targetUser.profileData?.auth_id ?? targetUser.id,
                    title: 'Phone Number Request 📱',
                    body: `${currentUserProfile.first_name || 'Someone'} wants your phone number`,
                    read: false,
                    data: {
                      type: 'phone_request',
                      notification_type: 'phone_request',
                      related_user_id: currentUserProfile.id,
                    },
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


  // --- Admin Edit User Handler ---
  const handleAdminEditUser = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      first_name: user.profileData?.first_name || '',
      last_name: user.profileData?.last_name || '',
      email: user.profileData?.email || '',
      age: user.profileData?.age || '',
      gender: user.profileData?.gender || '',
      county: user.profileData?.county || '',
      city: user.profileData?.city || '',
      country_of_residence: user.profileData?.country_of_residence || '',
      nationality: user.profileData?.nationality || '',
      religion: user.profileData?.religion || '',
      marital_status: user.profileData?.marital_status || '',
      number_of_children: user.profileData?.number_of_children || '',
      current_profession: user.profileData?.current_profession || '',
      height_ft: user.profileData?.height_ft || '',
      height_in: user.profileData?.height_in || '',
      weight_kg: user.profileData?.weight_kg || '',
      body_type: user.profileData?.body_type || '',
      complexion: user.profileData?.complexion || '',
      tribe: user.profileData?.tribe || '',
      teeth_state: user.profileData?.teeth_state || '',
      hiv_status: user.profileData?.hiv_status || '',
      blood_group: user.profileData?.blood_group || '',
      smoking: user.profileData?.smoking || '',
      alcohol_consumption: user.profileData?.alcohol_consumption || '',
      has_pets: user.profileData?.has_pets || '',
      can_relocate: user.profileData?.can_relocate || '',
      sexual_orientation: user.profileData?.sexual_orientation || '',
      relationship_goal: user.profileData?.relationship_goal || '',
      want_kids: user.profileData?.want_kids || '',
      open_to_dating_with_children: user.profileData?.open_to_dating_with_children || '',
      can_date_with_disability: user.profileData?.can_date_with_disability || '',
      relationship_perspective: user.profileData?.relationship_perspective || '',
      introduce_yourself: user.profileData?.introduce_yourself || '',
      describe_appearance: user.profileData?.describe_appearance || '',
      looking_for_appearance: user.profileData?.looking_for_appearance || '',
      do_not_contact_me_if: user.profileData?.do_not_contact_me_if || '',
      what_i_hope_to_find: user.profileData?.what_i_hope_to_find || '',
      what_to_expect_from_me: user.profileData?.what_to_expect_from_me || '',
      imperfections: user.profileData?.imperfections || '',
      things_i_dont_do: user.profileData?.things_i_dont_do || '',
      is_active: user.profileData?.is_active || false,
      has_paid: user.profileData?.has_paid || false,
      payment_status: user.profileData?.payment_status || '',
      subscription_plan: user.profileData?.subscription_plan || '',
      subscription_expires_at: user.profileData?.subscription_expires_at || '',
      has_physical_disability: user.profileData?.has_physical_disability || false,
      physical_disability_details: user.profileData?.physical_disability_details || '',
      has_critical_illness: user.profileData?.has_critical_illness || false,
      critical_illness_details: user.profileData?.critical_illness_details || '',
      believe_in_marriage: user.profileData?.believe_in_marriage || '',
      phone_number: user.profileData?.phone_number || '',
      avatar: user.profileData?.avatar || '',
    });
    setShowAdminEditModal(true);
  };

  const handleSaveAdminEdit = async () => {
    if (!editingUser) return;
    
    setSavingEdit(true);
    try {
      // Clean up data before sending to database
      const updateData = {...editFormData};
      
      // Convert empty strings to null for integer fields
      if (updateData.age === '' || updateData.age === 0) {
        updateData.age = null;
      }
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (error) throw error;

      Alert.alert('Success', 'User account updated successfully');
      setShowAdminEditModal(false);
      fetchUsers(); // Refresh the user list
    } catch (error: any) {
      console.error('Error updating user:', error);
      Alert.alert('Error', error.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
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
            title: "Welcome to HC",
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
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.heroTitle}>Welcome to HC</Text>
                  <Text style={styles.heroSubtitle}></Text>
                </View>
              </View>
              
              {/* Search Bar with Filter Toggle */}
              <Pressable 
                style={styles.searchContainer}
                onPress={() => setSearchFocused(true)}
              >
                <View style={styles.searchBar}>
                  <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by age, profession, location..."
                    keyboardType="number-pad"
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
                  <Text style={[
                    styles.statLabel,
                    (() => {
                      if (!currentUserProfile || currentUserProfile.is_admin) return null;
                      const expiry = currentUserProfile.subscription_expires_at
                        ? new Date(currentUserProfile.subscription_expires_at)
                        : currentUserProfile.payment_date
                          ? new Date(new Date(currentUserProfile.payment_date).getTime() + (currentUserProfile.subscription_plan === '90' ? 90 : 30) * 24 * 60 * 60 * 1000)
                          : null;
                      if (!expiry) return null;
                      const days = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                      if (days <= 0) return { color: '#FF3B30' };
                      if (days <= 7) return { color: '#FF9500' };
                      return null;
                    })(),
                  ]}>
                    {(() => {
                      if (!currentUserProfile) return 'My Plan';
                      if (currentUserProfile.is_admin) return 'Unlimited';

                      const planDays = currentUserProfile.subscription_plan === '90' ? 90 : 30;

                      const expiry = currentUserProfile.subscription_expires_at
                        ? new Date(currentUserProfile.subscription_expires_at)
                        : currentUserProfile.payment_date
                          ? new Date(new Date(currentUserProfile.payment_date).getTime() + planDays * 24 * 60 * 60 * 1000)
                          : null;

                      if (!expiry) return 'My Plan';

                      const days = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

                      if (days <= 0) return 'Expired';
                      if (days === 1) return '1 day left';
                      return `${days} days left`;
                    })()}
                  </Text>
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

              {/* Profession */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Profession</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Filter by profession..."
                  placeholderTextColor={colors.textSecondary}
                  value={selectedProfession}
                  onChangeText={setSelectedProfession}
                />
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
                
                <DropdownPicker
                  label=""
                  value={selectedCountry}
                  options={countriesList}
                  onSelect={setSelectedCountry}
                  placeholder="Select Country"
                  searchable
                />
                
                {selectedCountry === 'Kenya' ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <DropdownPicker
                      label=""
                      value={selectedCounty}
                      options={kenyaCounties}
                      onSelect={setSelectedCounty}
                      placeholder="Select County"
                      searchable
                    />
                  </View>
                ) : (
                  <TextInput
                    style={[styles.filterInput, { marginTop: spacing.sm }]}
                    placeholder="City / County"
                    placeholderTextColor={colors.textSecondary}
                    value={selectedCounty}
                    onChangeText={setSelectedCounty}
                  />
                )}
              </View>

              {/* With or Without Kids */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>With or Without Kids</Text>
                <View style={styles.filterOptionsRow}>
                  {['With Kids', 'Without Kids'].map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.filterOption, selectedHasKids === option && styles.filterOptionActive]}
                      onPress={() => setSelectedHasKids(selectedHasKids === option ? '' : option)}
                    >
                      <Text style={[styles.filterOptionText, selectedHasKids === option && styles.filterOptionTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

            </ScrollView>

              {/* Action Buttons OUTSIDE scrollview */}
              <View style={styles.filterActionButtons}>
                <Pressable
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setAgeRange({ min: 18, max: 80 });
                    setSelectedGender('');
                    setSelectedProfession('');
                    setSelectedHasKids('');
                    setSelectedHivStatus('');
                    setSelectedMaritalStatus('');
                    setSelectedCountry('');
                    setSelectedCounty('');
                    setSelectedReligion('');
                    setSelectedWantKids('');
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <IconSymbol name="xmark.circle.fill" size={22} color={colors.card} />
                  <Text style={styles.clearFiltersText}>Clear All</Text>
                </Pressable>

                <Pressable
                  style={styles.searchInButton}
                  onPress={() => {
                    setShowAdvancedFilters(false);
                    setSearchFocused(false);
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <IconSymbol name="checkmark.circle.fill" size={22} color={colors.card} />
                  <Text style={styles.searchInText}>Search</Text>
                </Pressable>
              </View>
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
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 300;
            if (isNearBottom && !loadingMore && hasMore) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
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
                    },
                    user.profileData?.is_admin && styles.adminCard
                  ]}
                >
                  {/* Hero Image Section with Gradient Overlay */}
                  <ImageBackground
                    source={user.avatar ? getAvatarImage(user.avatar) || getAvatarImage(getFixedAvatarForUser(user.id)) : getAvatarImage(getFixedAvatarForUser(user.id))}
                    style={viewMode === 'grid' ? styles.heroImageCard : styles.heroImageCardList}
                    resizeMode="cover"
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.75)']}
                      style={styles.cardGradient}
                    >
                      {/* Like Button - Top Right (Replaced Match Percentage) */}
                      {currentUserProfile?.is_admin ? (
                        <Pressable
                          style={styles.likeButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleAdminEditUser(user);
                          }}
                        >
                          <IconSymbol name="gearshape.fill" size={20} color={colors.primary} />
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.likeButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleConnect(user);
                          }}
                        >
                          <IconSymbol name="heart.fill" size={20} color="#FF6B9D" />
                        </Pressable>
                      )}

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

                  {/* 3. ACTION BLOCK */}
                  <View style={styles.actionsBlock}>
                  {user.connectionStatus === 'none' && (
                    <View style={styles.modernActionRow}>
                      <Pressable 
                        style={styles.connectButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleConnect(user);
                        }}
                      >
                        <IconSymbol name="person.badge.plus.fill" size={15} color="#FFFFFF" />
                        <Text style={styles.connectButtonText} numberOfLines={1}>Connect</Text>
                      </Pressable>
                      <PhoneNumberRequest
                        targetUserName={user.name}
                        targetUserId={user.id}
                        compact={true}
                      />
                    </View>
                  )}

                  {user.connectionStatus === 'pending' && (
                    <View style={styles.modernActionRow}>
                      <View style={styles.sentContainer}>
                        <IconSymbol name="checkmark.circle.fill" size={15} color={colors.success} />
                        <Text style={styles.sentText} numberOfLines={1}>Request Sent</Text>
                      </View>
                      <PhoneNumberRequest
                        targetUserName={user.name}
                        targetUserId={user.id}
                        compact={true}
                      />
                    </View>
                  )}

                  {user.connectionStatus === 'accepted' && (
                    <View style={styles.modernActionRow}>
                      <Pressable 
                        style={styles.messageButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMessage(user);
                        }}
                      >
                        <IconSymbol name="message.fill" size={15} color="#FFFFFF" />
                        <Text style={styles.connectButtonText} numberOfLines={1}>Message</Text>
                      </Pressable>
                      <PhoneNumberRequest
                        targetUserName={user.name}
                        targetUserId={user.id}
                        compact={true}
                      />
                    </View>
                  )}

                  {user.connectionStatus === 'rejected' && (
                    <View style={styles.rejectedContainer}>
                      <IconSymbol name="xmark.circle.fill" size={16} color={colors.textSecondary} />
                      <Text style={styles.rejectedText} numberOfLines={1}>Request Declined</Text>
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
        {/* Load-more spinner */}
        {loadingMore && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
      </ScrollView>


      </View>

      {/* Admin Edit User Modal */}
      <Modal
        visible={showAdminEditModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowAdminEditModal(false)}
      >
        <Pressable
          style={styles.adminModalOverlay}
          onPress={() => setShowAdminEditModal(false)}
        >
          <Pressable
            style={styles.adminModalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.adminModalHeader}>
              <Text style={styles.adminModalTitle}>
                Edit User: {editingUser?.name || ''}
              </Text>
              <Pressable
                style={styles.adminModalClose}
                onPress={() => setShowAdminEditModal(false)}
              >
                <IconSymbol name="xmark" size={18} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.adminModalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>First Name</Text>
                <TextInput
                  style={styles.adminFormInput}
                  value={editFormData.first_name}
                  onChangeText={(text) => setEditFormData({ ...editFormData, first_name: text })}
                  placeholder="First Name"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Last Name</Text>
                <TextInput
                  style={styles.adminFormInput}
                  value={editFormData.last_name}
                  onChangeText={(text) => setEditFormData({ ...editFormData, last_name: text })}
                  placeholder="Last Name"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Email</Text>
                <TextInput
                  style={styles.adminFormInput}
                  value={editFormData.email}
                  onChangeText={(text) => setEditFormData({ ...editFormData, email: text })}
                  placeholder="Email Address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Age</Text>
                <TextInput
                  style={styles.adminFormInput}
                  value={editFormData.age ? editFormData.age.toString() : ''}
                  onChangeText={(text) => setEditFormData({ ...editFormData, age: parseInt(text) || 0 })}
                  placeholder="Age"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Gender</Text>
                <DropdownPicker
                  label=""
                  value={editFormData.gender}
                  options={['Male', 'Female', 'Other']}
                  onSelect={(value) => setEditFormData({ ...editFormData, gender: value })}
                  placeholder="Select Gender"
                />
              </View>



              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Subscription Plan</Text>
                <DropdownPicker
                  label=""
                  value={editFormData.subscription_plan}
                  options={['30', '90']}
                  onSelect={(value) => setEditFormData({ ...editFormData, subscription_plan: value })}
                  placeholder="Select Plan"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Country</Text>
                <DropdownPicker
                  label=""
                  value={editFormData.country_of_residence}
                  options={countriesList}
                  onSelect={(value) => setEditFormData({ ...editFormData, country_of_residence: value })}
                  placeholder="Select Country"
                  searchable
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>County</Text>
                <DropdownPicker
                  label=""
                  value={editFormData.county}
                  options={kenyaCounties}
                  onSelect={(value) => setEditFormData({ ...editFormData, county: value })}
                  placeholder="Select County"
                  searchable
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Subscription Expires At</Text>
                <TextInput
                  style={styles.adminFormInput}
                  value={editFormData.subscription_expires_at}
                  onChangeText={(text) => setEditFormData({ ...editFormData, subscription_expires_at: text })}
                  placeholder="ISO Date string"
                />
              </View>

              {/* Profile Questions Section */}
              <View style={styles.adminFormSectionHeader}>
                <Text style={styles.adminFormSectionTitle}>Profile Questions</Text>
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Introduce Yourself</Text>
                <TextInput
                  style={[styles.adminFormInput, styles.adminFormTextArea]}
                  value={editFormData.introduce_yourself}
                  onChangeText={(text) => setEditFormData({ ...editFormData, introduce_yourself: text })}
                  placeholder="About the user"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Describe Appearance</Text>
                <TextInput
                  style={[styles.adminFormInput, styles.adminFormTextArea]}
                  value={editFormData.describe_appearance}
                  onChangeText={(text) => setEditFormData({ ...editFormData, describe_appearance: text })}
                  placeholder="Physical appearance description"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Looking For</Text>
                <TextInput
                  style={[styles.adminFormInput, styles.adminFormTextArea]}
                  value={editFormData.looking_for_appearance}
                  onChangeText={(text) => setEditFormData({ ...editFormData, looking_for_appearance: text })}
                  placeholder="Partner preferences"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Do Not Contact If</Text>
                <TextInput
                  style={[styles.adminFormInput, styles.adminFormTextArea]}
                  value={editFormData.do_not_contact_me_if}
                  onChangeText={(text) => setEditFormData({ ...editFormData, do_not_contact_me_if: text })}
                  placeholder="Dealbreakers and boundaries"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>What I Hope To Find</Text>
                <TextInput
                  style={[styles.adminFormInput, styles.adminFormTextArea]}
                  value={editFormData.what_i_hope_to_find}
                  onChangeText={(text) => setEditFormData({ ...editFormData, what_i_hope_to_find: text })}
                  placeholder="Relationship goals"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>What To Expect From Me</Text>
                <TextInput
                  style={[styles.adminFormInput, styles.adminFormTextArea]}
                  value={editFormData.what_to_expect_from_me}
                  onChangeText={(text) => setEditFormData({ ...editFormData, what_to_expect_from_me: text })}
                  placeholder="User expectations"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>My Imperfections</Text>
                <TextInput
                  style={[styles.adminFormInput, styles.adminFormTextArea]}
                  value={editFormData.imperfections}
                  onChangeText={(text) => setEditFormData({ ...editFormData, imperfections: text })}
                  placeholder="Honest disclosures"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Things I Don't Do</Text>
                <TextInput
                  style={[styles.adminFormInput, styles.adminFormTextArea]}
                  value={editFormData.things_i_dont_do}
                  onChangeText={(text) => setEditFormData({ ...editFormData, things_i_dont_do: text })}
                  placeholder="Boundaries"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Additional Fields */}
              <View style={styles.adminFormSectionHeader}>
                <Text style={styles.adminFormSectionTitle}>Additional Profile Fields</Text>
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Phone Number</Text>
                <TextInput
                  style={styles.adminFormInput}
                  value={editFormData.phone_number}
                  onChangeText={(text) => setEditFormData({ ...editFormData, phone_number: text })}
                  placeholder="Contact number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.adminFormField}>
                <Text style={styles.adminFormLabel}>Avatar Filename</Text>
                <TextInput
                  style={styles.adminFormInput}
                  value={editFormData.avatar}
                  onChangeText={(text) => setEditFormData({ ...editFormData, avatar: text })}
                  placeholder="Avatar image filename"
                />
              </View>

            </ScrollView>

            <View style={styles.adminModalFooter}>
              <Pressable
                style={[styles.adminModalBtn, styles.adminModalCancelBtn]}
                onPress={() => setShowAdminEditModal(false)}
                disabled={savingEdit}
              >
                <Text style={[styles.adminModalBtnText, styles.adminModalCancelText]}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.adminModalBtn, styles.adminModalSaveBtn, savingEdit && { opacity: 0.6 }]}
                onPress={handleSaveAdminEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={[styles.adminModalBtnText, styles.adminModalSaveText]}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    backgroundColor: colors.card,
  },
  modernActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modernActionColumn: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  phoneButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  // Connect Button - flex:1 so it fills space beside the phone icon
  connectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.secondary,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  connectButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },

  // Message Button
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
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
    gap: 5,
    backgroundColor: colors.background,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
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
     maxHeight: 500,
     paddingBottom: 0,
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
    marginBottom: spacing.lg,
    position: 'sticky',
    bottom: 90,
    backgroundColor: colors.card,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    zIndex: 100,
    borderTopWidth: 5,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  clearFiltersButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  clearFiltersText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
  },
  searchInButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  searchInText: {
    fontSize: 16,
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

  adminCard: {
    opacity: 0.7,
    pointerEvents: 'none',
  },

  // Admin Edit Modal Styles
  adminModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adminModalContainer: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  adminModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  adminModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  adminModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminModalScroll: {
    padding: spacing.lg,
  },
  adminFormField: {
    marginBottom: spacing.md,
  },
  adminFormLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  adminFormInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  adminModalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  adminModalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminModalCancelBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adminModalSaveBtn: {
    backgroundColor: colors.primary,
  },
  adminModalBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  adminModalCancelText: {
    color: colors.text,
  },
  adminModalSaveText: {
    color: colors.card,
  },
});
