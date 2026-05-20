import React, { useState, useEffect } from 'react';
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
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import safeBack from '../utils/safeRouter';
import { IconSymbol } from '../components/IconSymbol';
import { colors, commonStyles, BREAKPOINTS, responsiveStyles } from '../styles/commonStyles';
import DropdownPicker from '../components/DropdownPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GENDERS,
  NATIONALITIES,
  COUNTRIES,
  KENYAN_COUNTIES,
} from '../constants/RegistrationData';
import { supabase } from './integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import APP_CONFIG from '../constants/config';
// DateTimePicker is native-only; on web we render a plain HTML date input
const isWebPlatform = Platform.OS === 'web';
let DateTimePicker: any = null;
if (!isWebPlatform) {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface RegistrationFormData {
  avatar: string;
  name: string;
  username: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  countryOfResidence: string;
  city: string;
  county: string;
  currentProfession: string;
  maritalStatus: string;
  hasKids: string;
  numberOfKids: string;
  heightFeet: string;
  heightInches: string;
  weight: string;
  complexion: string;
  bodyShape: string;
  tribe: string;
  teethState: string;
  hivStatus: string;
  religion: string;
  wantKidsInFuture: string;
  believeInMarriage: string;
  lookingFor: string;
  hasPhysicalDisability: string;
  physicalDisabilityDetails: string;
  hasCriticalIllness: string;
  criticalIllnessDetails: string;
  introduceYourself: string;
  describeAppearance: string;
  lookingForAppearance: string;
  partnerExpectations: string;
  doNotContactMeIf: string;
}

// ✅ Convert dd/mm/yyyy → MM/DD/YYYY for database compatibility
const formatDateForDatabase = (input: string): string | null => {
  if (!input) return null;
  const parts = input.split('/').map(p => p.trim());
  if (parts.length !== 3) return null;

  let [day, month, year] = parts;
  if (year.length === 2) {
    const currentYear = new Date().getFullYear();
    const century = currentYear.toString().substring(0, 2);
    year = century + year;
  }

  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;

  const formattedDate = `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;

  const date = new Date(y, m - 1, d);
  if (
    isNaN(date.getTime()) ||
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) return null;

  return formattedDate;
};

// ✅ Convert Date object to dd/mm/yyyy string
const formatDateToString = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function RegistrationScreen() {
  const { width } = useWindowDimensions();
  const isLarge = width >= BREAKPOINTS.lg;
  const isSmall = width < BREAKPOINTS.sm;


  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const { user, checkUserFlow } = useAuth();
  const totalSteps = 3;

  const contentPadding = isSmall ? 16 : isLarge ? 24 : 20;
  const titleFontSize = isSmall ? 20 : isLarge ? 28 : 24;
  const textFontSize = isSmall ? 14 : isLarge ? 17 : 16;
  const inputFontSize = isSmall ? 14 : isLarge ? 17 : 16;
  const avatarSize = isSmall ? 60 : isLarge ? 100 : 80;
  const inputPaddingVertical = isSmall ? 12 : isLarge ? 18 : 14;
  const inputPaddingHorizontal = isSmall ? 14 : isLarge ? 20 : 16;
  const stepMarginBottom = isSmall ? 6 : 8;
  const descriptionMarginBottom = isSmall ? 20 : isLarge ? 32 : 24;

  const [formData, setFormData] = useState<RegistrationFormData>({
    avatar: '',
    name: '',
    username: '',
    gender: '',
    dateOfBirth: '',
    nationality: '',
    countryOfResidence: '',
    city: '',
    county: '',
    currentProfession: '',
    maritalStatus: '',
    hasKids: '',
    numberOfKids: '',
    heightFeet: '',
    heightInches: '',
    weight: '',
    complexion: '',
    bodyShape: '',
    tribe: '',
    teethState: '',
    hivStatus: '',
    religion: '',
    wantKidsInFuture: '',
    believeInMarriage: '',
    hasPhysicalDisability: '',
    physicalDisabilityDetails: '',
    hasCriticalIllness: '',
    criticalIllnessDetails: '',
    introduceYourself: '',
    describeAppearance: '',
    lookingForAppearance: '',
    partnerExpectations: '',
    doNotContactMeIf: '',
  });

  const fieldLabels: Record<keyof RegistrationFormData, string> = {
    avatar: 'Avatar',
    name: 'Name',
    username: 'Username',
    gender: 'Gender',
    dateOfBirth: 'Date of birth',
    nationality: 'Nationality',
    countryOfResidence: 'Country of residence',
    city: 'City',
    county: 'County',
    currentProfession: 'Profession',
    maritalStatus: 'Marital status',
    hasKids: 'Have kids',
    numberOfKids: 'Number of kids',
    heightFeet: 'Height (Feet)',
    heightInches: 'Height (Inches)',
    weight: 'Weight',
    complexion: 'Complexion',
    bodyShape: 'Body Shape',
    tribe: 'Tribe',
    teethState: 'Teeth State',
    hivStatus: 'HIV status',
    religion: 'Religion',
    wantKidsInFuture: 'Want kids in future',
    believeInMarriage: 'Believe in marriage',
    hasPhysicalDisability: 'Physical disability',
    physicalDisabilityDetails: 'Physical disability details',
    hasCriticalIllness: 'Critical illness',
    criticalIllnessDetails: 'Critical illness details',
    introduceYourself: 'Introduce yourself',
    describeAppearance: 'Describe appearance',
    lookingForAppearance: 'Looking for (appearance & qualities)',
    partnerExpectations: 'Partner expectations',
    doNotContactMeIf: 'Do not contact me if',
  };

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      if (!user) {
        router.replace('/signup');
        return;
      }
      const savedAvatar = await AsyncStorage.getItem('selectedAvatar');
      if (savedAvatar) {
        setFormData(prev => ({ ...prev, avatar: savedAvatar }));
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/signup');
    } finally {
      setAuthLoading(false);
    }
  };

  const updateFormData = (field: keyof RegistrationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (stepNumber: number): boolean => {
    const baseRequiredFields: { [key: number]: (keyof RegistrationFormData)[] } = {
      1: ['name', 'username', 'gender', 'dateOfBirth', 'nationality', 'countryOfResidence', 'currentProfession', 'maritalStatus', 'hasKids', 'heightFeet', 'complexion', 'bodyShape'],
      2: ['hivStatus', 'religion', 'believeInMarriage', 'wantKidsInFuture', 'hasPhysicalDisability', 'hasCriticalIllness'],
      3: ['introduceYourself', 'describeAppearance', 'lookingForAppearance', 'partnerExpectations', 'doNotContactMeIf'],
    };

    const fields = baseRequiredFields[stepNumber] || [];
    for (const field of fields) {
      const value = formData[field];
      if (!value || value.trim() === '') {
        if (isWebPlatform) {
          window.alert(`Required Field: Please provide ${fieldLabels[field]}.`);
        } else {
          Alert.alert('Required Field', `Please provide: ${fieldLabels[field]}.`);
        }
        return false;
      }
    }

    if (stepNumber === 1) {
      if (formData.countryOfResidence === 'Kenya') {
        if (!formData.county || formData.county.trim() === '') {
          Alert.alert('Required Field', 'Please select your county in Kenya.');
          return false;
        }
      } else if (formData.countryOfResidence) {
        if (!formData.city || formData.city.trim() === '') {
          Alert.alert('Required Field', 'Please enter your city.');
          return false;
        }
      } else {
        Alert.alert('Required Field', 'Please select your country of residence.');
        return false;
      }

      if (formData.hasKids === 'Yes') {
        const num = formData.numberOfKids.trim();
        if (!num || isNaN(Number(num)) || Number(num) < 0) {
          Alert.alert('Invalid Input', 'Please enter a valid number of kids (0 or more).');
          return false;
        }
      }
    }

    if (stepNumber === 2) {
      if (formData.hasPhysicalDisability === 'Yes') {
        if (!formData.physicalDisabilityDetails || formData.physicalDisabilityDetails.trim() === '') {
          Alert.alert('Required Field', 'Please describe your physical disability.');
          return false;
        }
      }
      if (formData.hasCriticalIllness === 'Yes') {
        if (!formData.criticalIllnessDetails || formData.criticalIllnessDetails.trim() === '') {
          Alert.alert('Required Field', 'Please describe your critical illness.');
          return false;
        }
      }
    }

    return true;
  };

  const parseDateOfBirth = (input: string): Date | null => {
    const parts = input.split('/').map(p => p.trim());
    if (parts.length !== 3) return null;

    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31 || month < 0 || month > 11) return null;

    if (year < 100) {
      const thisYear = new Date().getFullYear() % 100;
      const century = year <= thisYear ? 2000 : 1900;
      year = century + year;
    }

    const dob = new Date(year, month, day);
    if (isNaN(dob.getTime())) return null;

    const now = new Date();
    const minAge = 25;
    const maxAge = 120;
    const minDate = new Date(now.getFullYear() - maxAge, now.getMonth(), now.getDate());
    const maxDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());

    return dob >= minDate && dob <= maxDate ? dob : null;
  };

  const calculateAge = (dateOfBirth: string): number => {
    const dob = parseDateOfBirth(dateOfBirth);
    if (!dob) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // ✅ Web-specific error handling for date of birth
  const validateDateOfBirth = (input: string): { valid: boolean; error?: string } => {
    if (!input || input.trim() === '') {
      return { valid: false, error: 'Please enter your date of birth.' };
    }
    
    const dob = parseDateOfBirth(input);
    if (!dob) {
      return { valid: false, error: 'Please enter a valid date in dd/mm/yyyy format.' };
    }
    
    const age = calculateAge(input);
    if (age < 25) {
      return { valid: false, error: 'You must be 25 years or older to register. Please enter a valid date of birth.' };
    }
    
    if (age > 120) {
      return { valid: false, error: 'Please enter a valid date of birth. Age cannot exceed 120 years.' };
    }
    
    return { valid: true };
  };

  // ✅ Handle date change for native DateTimePicker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = formatDateToString(selectedDate);
      updateFormData('dateOfBirth', formatted);
    }
  };

  const handleNext = () => {
    // Clear previous date errors
    setDateError(null);
    
    if (step === 1) {
      const dobInput = formData.dateOfBirth.trim();
      
      // Web-specific validation
      if (isWebPlatform) {
        const validation = validateDateOfBirth(dobInput);
        if (!validation.valid) {
          setDateError(validation.error || 'Invalid date of birth');
          Alert.alert('Age Requirement', validation.error || 'You must be 25 years or older to register.');
          return;
        }
      } else {
        // Native validation
        if (!dobInput) {
          Alert.alert('Validation', 'Please enter your date of birth.');
          return;
        }
        const dob = parseDateOfBirth(dobInput);
        if (!dob) {
          Alert.alert('Invalid Date', 'Please enter a valid date of birth in dd/mm/yyyy format.');
          return;
        }
        const age = calculateAge(dobInput);
        if (age < 25) {
          Alert.alert('Age Requirement', 'You must be 25 years or older to register.');
          return;
        }
      }
    }

    if (!validateStep(step)) return;

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      safeBack(router);
    }
  };

  // ── Helper: navigate after successful save ────────────────────────────────
  // AuthContext.checkUserFlow is NOT called here — it would re-query the DB
  // and race with this navigation. We already know the user's state from the
  // DB operations above, so navigate directly.
  const navigateAfterSave = async (hasPaid: boolean, userId: string) => {
  console.log('[DEBUG] navigateAfterSave START:', {
    hasPaid,
    userId,
    requirePayment: APP_CONFIG.FEATURES.REQUIRE_PAYMENT,
  });

  // 🚫 Enforce payment (NO auto-upgrade)
  if (APP_CONFIG.FEATURES.REQUIRE_PAYMENT && !hasPaid) {
    console.log('[DEBUG] Payment required: redirecting to payment');

    router.replace('/payment-new' as any);
    return;
  }

  // ✅ If payment not required OR user already paid → allow access
  console.log('[DEBUG] Access granted: navigating to home');

  router.replace('/(tabs)/(home)' as any);
};

  const handleSubmit = async () => {
    setLoading(true);

    // Declare nextDestination outside try so finally can navigate
    let navigateFn: (() => Promise<void>) | null = null;
    
    // Fallback timeout to prevent infinite loading on web
    const TIMEOUT_MS = 15000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let isResolved = false;

    const resolveWithTimeout = (fn: () => void | Promise<void>) => {
      if (isResolved) return;
      isResolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      fn();
    };

    try {
      // Set up timeout fallback for web
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          console.warn('Registration timeout - forcing navigation');
          isResolved = true;
          setLoading(false);
          router.replace('/(tabs)/(home)');
        }
      }, TIMEOUT_MS);

      if (!user) {
        router.replace('/signup');
        return;
      }

      const formattedDate = formatDateForDatabase(formData.dateOfBirth);
      if (!formattedDate) throw new Error('Invalid date format for database.');

      const age = calculateAge(formData.dateOfBirth);

      const commonData = {
        auth_id: user.id,
        email: user.email,
        first_name: formData.name.trim().split(' ')[0] || formData.name.trim(),
        last_name: formData.name.trim().split(' ').slice(1).join(' ') || null,
        username: formData.username.trim() || null,
        gender: formData.gender || null,
        age,
        date_of_birth: formattedDate,
        nationality: formData.nationality || null,
        country_of_residence: formData.countryOfResidence || null,
        city: formData.countryOfResidence === 'Kenya' ? null : (formData.city || null),
        county: formData.countryOfResidence === 'Kenya' ? (formData.county || null) : null,
        current_profession: formData.currentProfession || null,
        marital_status: formData.maritalStatus || null,
        number_of_children: formData.hasKids === 'Yes' ? (parseInt(formData.numberOfKids) || 0) : 0,
        height_feet: formData.heightFeet || null,
        height_inches: formData.heightInches || null,
        weight: formData.weight || null,
        complexion: formData.complexion || null,
        body_shape: formData.bodyShape || null,
        tribe: formData.tribe || null,
        teeth_state: formData.teethState || null,
        hiv_status: formData.hivStatus || null,
        religion: formData.religion || null,
        want_kids: formData.wantKidsInFuture || null,
        believe_in_marriage: formData.believeInMarriage || null,
        has_physical_disability: formData.hasPhysicalDisability === 'Yes',
        physical_disability_details: formData.hasPhysicalDisability === 'Yes' ? (formData.physicalDisabilityDetails || null) : null,
        has_critical_illness: formData.hasCriticalIllness === 'Yes',
        critical_illness_details: formData.hasCriticalIllness === 'Yes' ? (formData.criticalIllnessDetails || null) : null,
        introduce_yourself: formData.introduceYourself || null,
        describe_appearance: formData.describeAppearance || null,
        looking_for_appearance: formData.lookingForAppearance || null,
        partner_expectations: formData.partnerExpectations || null,
        do_not_contact_me_if: formData.doNotContactMeIf || null,
        avatar: formData.avatar || null,
        updated_at: new Date().toISOString(),
      };

      // ── 1. Try to find existing record by auth_id ──
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, has_paid')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (existingUser) {
        const { error: updateError } = await supabase
          .from('users')
          .update(commonData)
          .eq('id', existingUser.id);

        if (updateError) {
          if (updateError.code === '23505' && updateError.message?.includes('username')) {
            Alert.alert('Username Taken', 'That username is already taken. Please choose a different one.', [
              { text: 'OK', onPress: () => setStep(1) },
            ]);
            return;
          }
          throw updateError;
        }

        navigateFn = () => navigateAfterSave(existingUser.has_paid, existingUser.id);
        return;
      }

      // ── 2. Fallback: find by email ──
      const { data: existingByEmail } = await supabase
        .from('users')
        .select('id, has_paid')
        .eq('email', user.email)
        .maybeSingle();

      if (existingByEmail) {
        const { error: updateError } = await supabase
          .from('users')
          .update(commonData)
          .eq('id', existingByEmail.id);

        if (updateError) {
          if (updateError.code === '23505' && updateError.message?.includes('username')) {
            Alert.alert('Username Taken', 'That username is already taken. Please choose a different one.', [
              { text: 'OK', onPress: () => setStep(1) },
            ]);
            return;
          }
          throw updateError;
        }

        navigateFn = () => navigateAfterSave(existingByEmail.has_paid, existingByEmail.id);
        return;
      }

      // ── 3. Insert new user ──
      const insertData = {
        ...commonData,
        is_active: true,
        is_verified: false,
        has_paid: false,
        payment_status: 'pending',
        created_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase
        .from('users')
        .insert(insertData)
        .select('id, has_paid')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          const isUsernameConflict =
            insertError.message?.includes('username') ||
            insertError.message?.includes('users_username_key');
          if (isUsernameConflict) {
            Alert.alert('Username Taken', 'That username is already taken. Please choose a different one.', [
              { text: 'OK', onPress: () => setStep(1) },
            ]);
            return;
          }
          Alert.alert('Email Already Registered', 'An account with this email already exists. Please log in instead.', [
            { text: 'OK', onPress: () => router.replace('/login') },
          ]);
          return;
        }
        throw insertError;
      }

      navigateFn = () => navigateAfterSave(inserted?.has_paid ?? false, inserted?.id ?? '');
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Error', error?.message || 'Failed to create profile. Please try again.');
    } finally {
      // Always stop the spinner first
      setLoading(false);
      
      if (navigateFn) {
        // Small tick to let React flush the loading=false state before navigating
        setTimeout(async () => {
          try {
            await navigateFn!();
          } catch (navError) {
            console.error('Navigation error after registration:', navError);
            // Fallback navigation in case of error
            router.replace('/(tabs)/(home)');
          }
        }, 100);
      } else {
        // If navigateFn is null, something went wrong - navigate to home as fallback
        console.warn('No navigateFn set - possible issue in registration flow');
        setTimeout(() => {
          router.replace('/(tabs)/(home)');
        }, 100);
      }
    }
  };

  const getAvatarImage = (filename: string) => {
    const avatarMap: { [key: string]: any } = {
      '3d-cartoon-portrait-person-practicing-law-related-profession.jpg': require('../assets/3d-cartoon-portrait-person-practicing-law-related-profession.jpg'),
      '408535ae-483f-477a-a0e6-3e28d0eabb88.jpg': require('../assets/408535ae-483f-477a-a0e6-3e28d0eabb88.jpg'),
      '2809696b-04f1-4ca8-8194-2ac46919f408.jpg': require('../assets/2809696b-04f1-4ca8-8194-2ac46919f408.jpg'),
      'androgynous-avatar-non-binary-queer-person.jpg': require('../assets/androgynous-avatar-non-binary-queer-person.jpg'),
      'b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg': require('../assets/b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg'),
      'b408535ae-fa0a-4595-9865-d1216fea02e8.jpg': require('../assets/b400cea9-fa0a-4595-9865-d1216fea02e8.jpg'),
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

  // ─── STEP RENDERERS ──────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {formData.avatar ? (
        <View style={styles.avatarPreview}>
          <Text style={[styles.label, { fontSize: textFontSize }]}>Your Selected Avatar</Text>
          <View style={[styles.avatarPreviewContainer, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
            <Image
              source={getAvatarImage(formData.avatar)}
              style={styles.avatarPreviewImage}
              resizeMode="cover"
            />
          </View>
        </View>
      ) : null}

      <Text style={[styles.stepTitle, { fontSize: titleFontSize, marginBottom: stepMarginBottom }]}>
        1. Age & Identity
      </Text>
      <Text style={[styles.stepDescription, { fontSize: textFontSize, marginBottom: descriptionMarginBottom }]}>
        Fill in your personal details. You must be 25 or older.
      </Text>

      <TextInput
        style={[styles.input, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="Name"
        placeholderTextColor={colors.textSecondary}
        value={formData.name}
        onChangeText={(text) => updateFormData('name', text)}
      />

      <TextInput
        style={[styles.input, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="Username"
        placeholderTextColor={colors.textSecondary}
        value={formData.username}
        onChangeText={(text) => updateFormData('username', text)}
        autoCapitalize="none"
      />

      {/* Date of Birth — web uses native <input type="date"> with real-time validation */}
      {isWebPlatform ? (
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.label, { fontSize: textFontSize, marginBottom: 6 }]}>
            Date of Birth
          </Text>
          {/* @ts-ignore – 'input' is valid on web */}
          <input
            type="date"
            value={
              // Convert stored dd/mm/yyyy → yyyy-MM-dd for the HTML input
              formData.dateOfBirth
                ? (() => {
                    const parts = formData.dateOfBirth.split('/');
                    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                    return '';
                  })()
                : ''
            }
            min="1900-01-01"
            max={(() => {
              const d = new Date();
              d.setFullYear(d.getFullYear() - 25);
              return d.toISOString().split('T')[0];
            })()}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const val = e.target.value; // yyyy-MM-dd
              if (!val) {
                setDateError('Please enter your date of birth.');
                updateFormData('dateOfBirth', '');
                return;
              }
              const [y, m, d] = val.split('-');
              const formatted = `${d}/${m}/${y}`;
              updateFormData('dateOfBirth', formatted);
              
              // Validate immediately for web
              const validation = validateDateOfBirth(formatted);
              if (!validation.valid) {
                setDateError(validation.error || 'Invalid date');
              } else {
                setDateError(null);
              }
            }}
            style={{
              width: '100%',
              backgroundColor: colors.card,
              border: `1px solid ${dateError ? '#e53e3e' : colors.border}`,
              borderRadius: 8,
              padding: '14px 16px',
              fontSize: inputFontSize,
              color: colors.text,
              boxSizing: 'border-box',
              outline: 'none',
              cursor: 'pointer',
            } as any}
          />
          {/* Error message display for web */}
          {dateError && (
            <Text style={{ color: '#e53e3e', fontSize: 13, marginTop: 6 }}>
              {dateError}
            </Text>
          )}
        </View>
      ) : (
        <>
          <View style={{ position: 'relative', marginBottom: 16 }}>
            <TextInput
              style={[
                styles.input,
                { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal, marginBottom: 0 },
              ]}
              placeholder="Select date of birth"
              placeholderTextColor={colors.textSecondary}
              value={formData.dateOfBirth}
              editable={false}
              pointerEvents="none"
            />
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={StyleSheet.absoluteFill}
            />
          </View>

          {showDatePicker && DateTimePicker && (
            <DateTimePicker
              value={parseDateOfBirth(formData.dateOfBirth) || new Date(1990, 0, 1)}
              mode="date"
              display="default"
              minimumDate={new Date(1900, 0, 1)}
              maximumDate={new Date(new Date().getFullYear() - 25, new Date().getMonth(), new Date().getDate())}
              onChange={handleDateChange}
            />
          )}
        </>
      )}

      <DropdownPicker
        label="Gender"
        value={formData.gender}
        options={GENDERS}
        onSelect={(value) => updateFormData('gender', value)}
      />

      <TextInput
        style={[styles.input, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="What do you do for a living (Profession)"
        placeholderTextColor={colors.textSecondary}
        value={formData.currentProfession}
        onChangeText={(text) => updateFormData('currentProfession', text)}
      />

      <DropdownPicker
        label="Nationality"
        value={formData.nationality}
        options={NATIONALITIES}
        onSelect={(value) => updateFormData('nationality', value)}
      />

      <DropdownPicker
        label="Country of Residence"
        value={formData.countryOfResidence}
        options={COUNTRIES}
        onSelect={(value) => {
          updateFormData('countryOfResidence', value);
          updateFormData('city', '');
          updateFormData('county', '');
        }}
        searchable
      />

      {formData.countryOfResidence === 'Kenya' ? (
        <DropdownPicker
          label="County (Kenya)"
          value={formData.county}
          options={KENYAN_COUNTIES}
          onSelect={(value) => updateFormData('county', value)}
        />
      ) : formData.countryOfResidence ? (
        <TextInput
          style={[styles.input, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
          placeholder="City"
          placeholderTextColor={colors.textSecondary}
          value={formData.city}
          onChangeText={(text) => updateFormData('city', text)}
        />
      ) : null}

      <DropdownPicker
        label="Marital Status"
        value={formData.maritalStatus}
        options={['Single', 'Divorced', 'Widowed']}
        onSelect={(value) => updateFormData('maritalStatus', value)}
      />

      <DropdownPicker
        label="Do you have kids?"
        value={formData.hasKids}
        options={['Yes', 'No']}
        onSelect={(value) => updateFormData('hasKids', value)}
      />

      {formData.hasKids === 'Yes' && (
        <TextInput
          style={[styles.input, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
          placeholder="How many kids do you have?"
          placeholderTextColor={colors.textSecondary}
          value={formData.numberOfKids}
          onChangeText={(text) => updateFormData('numberOfKids', text)}
          keyboardType="numeric"
        />
      )}

      {/* Height Section */}
      <Text style={[styles.label, { fontSize: textFontSize, marginBottom: 8 }]}>Height</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <TextInput
          style={[styles.input, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal, flex: 1, marginBottom: 0 }]}
          placeholder="Ft"
          placeholderTextColor={colors.textSecondary}
          value={formData.heightFeet}
          onChangeText={(text) => updateFormData('heightFeet', text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          maxLength={1}
        />
        <TextInput
          style={[styles.input, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal, flex: 1, marginBottom: 0 }]}
          placeholder="In"
          placeholderTextColor={colors.textSecondary}
          value={formData.heightInches}
          onChangeText={(text) => updateFormData('heightInches', text.replace(/[^0-9]/g, ''))}
          keyboardType="numeric"
          maxLength={2}
        />
      </View>

      {/* Weight */}
      <TextInput
        style={[styles.input, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="Weight (kg)"
        placeholderTextColor={colors.textSecondary}
        value={formData.weight}
        onChangeText={(text) => updateFormData('weight', text.replace(/[^0-9.]/g, ''))}
        keyboardType="numeric"
      />

      {/* Complexion */}
      <DropdownPicker
        label="Complexion"
        value={formData.complexion}
        options={['Fair', 'Brown', 'Dark']}
        onSelect={(value) => updateFormData('complexion', value)}
      />

      {/* Body Shape - Gender aware */}
      <DropdownPicker
        label="Body Shape"
        value={formData.bodyShape}
        options={
          formData.gender === 'Male'
            ? ['Slim', 'Average', 'Athletic', 'Potbelly']
            : ['Average', 'Curvy', 'Petite', 'Plus size']
        }
        onSelect={(value) => updateFormData('bodyShape', value)}
      />

      {/* Teeth State */}
      <DropdownPicker
        label="State of Teeth"
        value={formData.teethState}
        options={[
          'White and well aligned',
          'Slightly stained but healthy',
          'Crooked or misaligned',
          'Missing teeth'
        ]}
        onSelect={(value) => updateFormData('teethState', value)}
      />

    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { fontSize: titleFontSize, marginBottom: stepMarginBottom }]}>
        2. Health, Faith & Family
      </Text>
      <Text style={[styles.stepDescription, { fontSize: textFontSize, marginBottom: descriptionMarginBottom }]}>
        Answer all questions honestly.
      </Text>

      <DropdownPicker
        label="HIV Status"
        value={formData.hivStatus}
        options={['Negative', 'Positive', 'Prefer not to say']}
        onSelect={(value) => updateFormData('hivStatus', value)}
      />

      <DropdownPicker
        label="Religion"
        value={formData.religion}
        options={['Christian', 'Muslim', 'Hindu', 'Buddhist', 'Jewish', 'Atheist', 'Agnostic', 'Other']}
        onSelect={(value) => updateFormData('religion', value)}
      />

      <DropdownPicker
        label="Do you believe in marriage?"
        value={formData.believeInMarriage}
        options={['Yes', 'No', 'Maybe']}
        onSelect={(value) => updateFormData('believeInMarriage', value)}
      />

      <DropdownPicker
        label="Do you want kids in the future?"
        value={formData.wantKidsInFuture}
        options={['Yes', 'No', 'Maybe']}
        onSelect={(value) => updateFormData('wantKidsInFuture', value)}
      />

      <DropdownPicker
        label="Do you have a physical disability?"
        value={formData.hasPhysicalDisability}
        options={['Yes', 'No']}
        onSelect={(value) => updateFormData('hasPhysicalDisability', value)}
      />

      {formData.hasPhysicalDisability === 'Yes' && (
        <TextInput
          style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingHorizontal: inputPaddingHorizontal }]}
          placeholder="Please describe your physical disability"
          placeholderTextColor={colors.textSecondary}
          value={formData.physicalDisabilityDetails}
          onChangeText={(text) => updateFormData('physicalDisabilityDetails', text)}
          multiline
          numberOfLines={3}
        />
      )}

      <DropdownPicker
        label="Do you have a critical illness?"
        value={formData.hasCriticalIllness}
        options={['Yes', 'No']}
        onSelect={(value) => updateFormData('hasCriticalIllness', value)}
      />

      {formData.hasCriticalIllness === 'Yes' && (
        <TextInput
          style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingHorizontal: inputPaddingHorizontal }]}
          placeholder="Please describe your critical illness"
          placeholderTextColor={colors.textSecondary}
          value={formData.criticalIllnessDetails}
          onChangeText={(text) => updateFormData('criticalIllnessDetails', text)}
          multiline
          numberOfLines={3}
        />
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { fontSize: titleFontSize, marginBottom: stepMarginBottom }]}>
        3. About You & Your Partner
      </Text>
      <Text style={[styles.stepDescription, { fontSize: textFontSize, marginBottom: descriptionMarginBottom }]}>
        Help others get to know you.
      </Text>

      <Text style={[styles.label, { fontSize: textFontSize }]}>Introduce yourself</Text>
      <TextInput
        style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="Tell people about yourself..."
        placeholderTextColor={colors.textSecondary}
        value={formData.introduceYourself}
        onChangeText={(text) => updateFormData('introduceYourself', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={[styles.label, { fontSize: textFontSize }]}>Describe your appearance</Text>
      <TextInput
        style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="Describe your physical appearance..."
        placeholderTextColor={colors.textSecondary}
        value={formData.describeAppearance}
        onChangeText={(text) => updateFormData('describeAppearance', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={[styles.label, { fontSize: textFontSize }]}>Looking for (appearance & qualities)</Text>
      <TextInput
        style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="Describe what you're looking for in a partner..."
        placeholderTextColor={colors.textSecondary}
        value={formData.lookingForAppearance}
        onChangeText={(text) => updateFormData('lookingForAppearance', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={[styles.label, { fontSize: textFontSize }]}>What kind of partner are you in a relationship?</Text>
      <TextInput
        style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="Describe what type of partner you are..."
        placeholderTextColor={colors.textSecondary}
        value={formData.lookingFor}
        onChangeText={(text) => updateFormData('lookingFor', text)}
        multiline
        numberOfLines={3}
      />

      <Text style={[styles.label, { fontSize: textFontSize }]}>Partner expectations</Text>
      <TextInput
        style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="What are your expectations of a partner?"
        placeholderTextColor={colors.textSecondary}
        value={formData.partnerExpectations}
        onChangeText={(text) => updateFormData('partnerExpectations', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={[styles.label, { fontSize: textFontSize }]}>Do not contact me if</Text>
      <TextInput
        style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="Describe who should NOT contact you..."
        placeholderTextColor={colors.textSecondary}
        value={formData.doNotContactMeIf}
        onChangeText={(text) => updateFormData('doNotContactMeIf', text)}
        multiline
        numberOfLines={4}
      />
    </View>
  );

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {authLoading ? (
          <View style={commonStyles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[commonStyles.text, { marginTop: 16 }]}>Verifying authentication...</Text>
          </View>
        ) : (
          <>
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={handleBack}>
                <IconSymbol name="chevron.left" size={24} color={colors.text} />
              </Pressable>
              <Text style={styles.headerTitle}>Registration</Text>
              <Text style={styles.stepIndicator}>{step}/{totalSteps}</Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${(step / totalSteps) * 100}%` as any }]} />
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
            >
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { padding: contentPadding }, responsiveStyles.contentMaxWidth(isLarge)]}
                keyboardShouldPersistTaps="handled"
              >
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
              </ScrollView>
            </KeyboardAvoidingView>

            {/* Bottom button */}
            <View style={[styles.buttonContainer, responsiveStyles.buttonWrapper(isLarge)]}>
              <Pressable
                style={[styles.nextButton, responsiveStyles.button(isLarge), loading && styles.buttonDisabled]}
                onPress={handleNext}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.card} />
                ) : (
                  <Text style={styles.nextButtonText}>
                    {step === totalSteps ? 'Complete Registration' : 'Next'}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  stepIndicator: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  progressContainer: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
  },
  avatarPreview: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarPreviewContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPreviewImage: {
    width: '100%',
    height: '100%',
  },
});