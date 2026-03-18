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
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import safeBack from '../utils/safeRouter';
import { IconSymbol } from '../components/IconSymbol';
import { colors, commonStyles } from '../styles/commonStyles';
import DropdownPicker from '../components/DropdownPicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GENDERS,
  NATIONALITIES,
  COUNTRIES,
  KENYAN_COUNTIES,
} from '../constants/RegistrationData';
import { supabase } from './integrations/supabase/client'; // Fixed path
import { useAuth } from '../contexts/AuthContext';
import APP_CONFIG from '../constants/config';

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
  hivStatus: string;
  religion: string;
  wantKidsInFuture: string;
  believeInMarriage: string;
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

  // Validate numbers
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;

  // Pad with leading zeros
  const formattedDate = `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;

  // Validate if it's a real date
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime()) || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;

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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const { user, checkUserFlow } = useAuth();
  const totalSteps = 3;

  const isSmallScreen = width < 375;
  const contentPadding = isSmallScreen ? 16 : 20;
  const titleFontSize = isSmallScreen ? 20 : 24;
  const textFontSize = isSmallScreen ? 14 : 16;
  const inputFontSize = isSmallScreen ? 14 : 16;
  const avatarSize = isSmallScreen ? 60 : 80;
  const inputPaddingVertical = isSmallScreen ? 12 : 14;
  const inputPaddingHorizontal = isSmallScreen ? 14 : 16;
  const stepMarginBottom = isSmallScreen ? 6 : 8;
  const descriptionMarginBottom = isSmallScreen ? 20 : 24;
  
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

  const [showDatePicker, setShowDatePicker] = useState(false);

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


  // ✅ Enhanced validation: all fields must be answered
  const validateStep = (stepNumber: number): boolean => {
    const baseRequiredFields: { [key: number]: (keyof RegistrationFormData)[] } = {
      1: ['name', 'username', 'gender', 'dateOfBirth', 'nationality', 'countryOfResidence', 'currentProfession', 'maritalStatus', 'hasKids'],
      2: ['hivStatus', 'religion', 'believeInMarriage', 'wantKidsInFuture', 'hasPhysicalDisability', 'hasCriticalIllness'],
      3: ['introduceYourself', 'describeAppearance', 'lookingForAppearance', 'partnerExpectations', 'doNotContactMeIf']
    };

    const fields = baseRequiredFields[stepNumber] || [];
    for (const field of fields) {
      const value = formData[field];
      if (!value || value.trim() === '') {
        Alert.alert('Required Field', `Please provide: ${fieldLabels[field]}.`);
        return false;
      }
    }

    // Step 1 conditionals
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

    // Step 2 conditionals
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

    // Step 3: all already in base list

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

    return (dob >= minDate && dob <= maxDate) ? dob : null;
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

  const handleNext = () => {
    if (step === 1) {
      const dobInput = formData.dateOfBirth.trim();
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

    if (!validateStep(step)) {
      return;
    }

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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!user) {
        router.replace('/signup');
        return;
      }

      // ✅ Convert date to MM/DD/YYYY for database
      const formattedDate = formatDateForDatabase(formData.dateOfBirth);
      if (!formattedDate) {
        throw new Error('Invalid date format for database.');
      }

      const age = calculateAge(formData.dateOfBirth);

      // Prepare common data
      const commonData = {
        auth_id: user.id,
        email: user.email,
        first_name: formData.name.trim().split(' ')[0] || formData.name.trim(),
        last_name: formData.name.trim().split(' ').slice(1).join(' ') || null,
        username: formData.username.trim() || null,
        gender: formData.gender || null,
        age: age,
        date_of_birth: formattedDate, // ✅ MM/DD/YYYY format
        nationality: formData.nationality || null,
        country_of_residence: formData.countryOfResidence || null,
        city: formData.countryOfResidence === 'Kenya' ? null : (formData.city || null),
        county: formData.countryOfResidence === 'Kenya' ? (formData.county || null) : null,
        current_profession: formData.currentProfession || null,
        marital_status: formData.maritalStatus || null,
        number_of_children: formData.hasKids === 'Yes' ? (parseInt(formData.numberOfKids) || 0) : 0,
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

      const { data: existingUser } = await supabase
        .from('users')
        .select('id, has_paid, is_active')
        .eq('auth_id', user.id)
        .maybeSingle();

      if (existingUser) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ ...commonData })
          .eq('id', existingUser.id);

        if (updateError) {
          if (updateError.code === '23505' && updateError.message?.includes('username')) {
            Alert.alert('Username Taken', 'The username you chose is already taken. Please choose a different one.', [{ text: 'OK', onPress: () => setStep(1) }]);
            return;
          }
          throw updateError;
        }

        if (existingUser.has_paid) {
          setTimeout(async () => {
            await checkUserFlow();
            router.replace('/(tabs)/(home)');
          }, 500);
        } else if (!APP_CONFIG.FEATURES.REQUIRE_PAYMENT) {
          // Payment disabled - auto-approve user for testing
          await supabase
            .from('users')
            .update({
              has_paid: true,
              payment_status: 'completed',
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingUser.id);
          setTimeout(async () => {
            await checkUserFlow();
            router.replace('/(tabs)/(home)');
          }, 500);
        } else {
          setTimeout(async () => {
            await checkUserFlow();
            router.replace('/payment-new');
          }, 500);
        }
      } else {
        // Check if email already exists in users table (from previous incomplete registration)
        const { data: existingByEmail } = await supabase
          .from('users')
          .select('id, has_paid, is_active')
          .eq('email', user.email)
          .maybeSingle();

        if (existingByEmail) {
          // Update existing user profile instead of inserting
          const { error: updateError } = await supabase
            .from('users')
            .update({ ...commonData })
            .eq('id', existingByEmail.id);

          if (updateError) {
            if (updateError.code === '23505' && updateError.message?.includes('username')) {
              Alert.alert('Username Taken', 'The username you chose is already taken. Please choose a different one.', [{ text: 'OK', onPress: () => setStep(1) }]);
              return;
            }
            throw updateError;
          }

          if (existingByEmail.has_paid) {
            setTimeout(async () => {
              await checkUserFlow();
              router.replace('/(tabs)/(home)');
            }, 500);
          } else if (!APP_CONFIG.FEATURES.REQUIRE_PAYMENT) {
            // Payment disabled - auto-approve user for testing
            await supabase
              .from('users')
              .update({
                has_paid: true,
                payment_status: 'completed',
                is_active: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingByEmail.id);
            setTimeout(async () => {
              await checkUserFlow();
              router.replace('/(tabs)/(home)');
            }, 500);
          } else {
            setTimeout(async () => {
              await checkUserFlow();
              router.replace('/payment-new');
            }, 500);
          }
          return;
        }

        // New user - insert into users table
        const insertData = {
          ...commonData,
          is_active: true,
          is_verified: false,
          has_paid: !APP_CONFIG.FEATURES.REQUIRE_PAYMENT, // Auto-approve if payment disabled
          payment_status: APP_CONFIG.FEATURES.REQUIRE_PAYMENT ? 'pending' : 'completed',
          created_at: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert(insertData);

        if (insertError) {
          console.log('Insert error details:', JSON.stringify(insertError));
          if (insertError.code === '23505') {
            // Default to email conflict for any unique constraint violation during insert
            // (unless it's clearly a username conflict)
            const isUsernameConflict = insertError.message?.includes('username') || 
                                       insertError.message?.includes('users_username_key') ||
                                       insertError.message?.includes('Username');
            
            if (isUsernameConflict) {
              Alert.alert('Username Taken', 'The username you chose is already taken. Please choose a different one.', [{ text: 'OK', onPress: () => setStep(1) }]);
              return;
            }
            
            // For any other unique constraint (likely email), prompt to login
            Alert.alert('Email Already Registered', 'An account with this email already exists. Please log in instead.', [{ text: 'OK', onPress: () => router.replace('/login') }]);
            return;
          }
          throw insertError;
        }

        setTimeout(async () => {
          await checkUserFlow();
          if (APP_CONFIG.FEATURES.REQUIRE_PAYMENT) {
            router.replace('/payment-new');
          } else {
            router.replace('/(tabs)/(home)');
          }
        }, 500);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registration Error', error?.message || 'Failed to create profile. Please try again.', [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  const getAvatarImage = (filename: string) => {
    const avatarMap: { [key: string]: any } = {
      '3d-cartoon-portrait-person-practicing-law-related-profession.jpg': require('../assets/3d-cartoon-portrait-person-practicing-law-related-profession.jpg'),
      '408535ae-483f-477a-a0e6-3e28d0eabb88.jpg': require('../assets/408535ae-483f-477a-a0e6-3e28d0eabb88.jpg'),
      '2809696b-04f1-4ca8-8194-2ac46919f408.jpg': require('../assets/2809696b-04f1-4ca8-8194-2ac46919f408.jpg'),
      'androgynous-avatar-non-binary-queer-person.jpg': require('../assets/androgynous-avatar-non-binary-queer-person.jpg'),
      'b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg': require('../assets/b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg'),
      'b408535ae-fa0a-4595-9865-d1216fea02e8.jpg': require('../assets/b400cea9-fa0a-4595-9865-d1216fea02e8.jpg'), // Fixed typo
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = formatDateToString(selectedDate);
      updateFormData('dateOfBirth', formatted);
    }
  };

  // ✅ renderStep1, renderStep2, renderStep3 remain mostly the same
  // (no changes needed for UI logic)

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {formData.avatar && (
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
      )}

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
      />

      <Text style={[styles.stepTitle, { fontSize: titleFontSize, marginBottom: stepMarginBottom }]}>1. Age & Identity</Text>
      <Text style={[styles.stepDescription, { fontSize: textFontSize, marginBottom: descriptionMarginBottom }]}>Select your date of birth (must be 25 or older).</Text>

      <Pressable onPress={() => setShowDatePicker(true)}>
        <TextInput
          style={[styles.input, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
          placeholder="Select date of birth"
          placeholderTextColor={colors.textSecondary}
          value={formData.dateOfBirth}
          editable={false}
          pointerEvents="none"
        />
      </Pressable>

      {showDatePicker && (
        <DateTimePicker
          value={parseDateOfBirth(formData.dateOfBirth) || new Date()}
          mode="date"
          display="default"
          minimumDate={new Date(1900, 0, 1)}
          maximumDate={new Date(2000, 11, 30)}
          onChange={handleDateChange}
        />
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
        onSelect={(value) => updateFormData('countryOfResidence', value)}
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
        options={["Single", "Divorced", "Widowed"]}
        onSelect={(value) => updateFormData('maritalStatus', value)}
      />

      <DropdownPicker
        label="Do you have kids?"
        value={formData.hasKids}
        options={["Yes", "No"]}
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
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { fontSize: titleFontSize, marginBottom: stepMarginBottom }]}>2. Health, Faith & Family</Text>
      <Text style={[styles.stepDescription, { fontSize: textFontSize, marginBottom: descriptionMarginBottom }]}>Answer all questions</Text>

      <DropdownPicker
        label="HIV Status"
        value={formData.hivStatus}
        options={["Positive", "Negative"]}
        onSelect={(value) => updateFormData('hivStatus', value)}
      />

      <DropdownPicker
        label="Religion & Level of Faith"
        value={formData.religion}
        options={[
          'Christian – Very religious',
          'Christian – Moderately religious',
          'Christian – Not religious',
          'Muslim – Very religious',
          'Muslim – Moderately religious',
          'Muslim – Not religious',
          'Hindu – Very religious',
          'Hindu – Moderately religious',
          'Hindu – Not religious',
          'Traditional / Spiritual – Very spiritual',
          'Traditional / Spiritual – Moderately spiritual',
          'Traditional / Spiritual – Not spiritual',
          'Atheist – Not religious',
          'Other – Please specify',
        ]}
        onSelect={(value) => updateFormData('religion', value)}
      />

      <DropdownPicker
        label="Do you believe in marriage?"
        value={formData.believeInMarriage}
        options={["Yes I believe in marriage", "No I don't believe in marriage", "Not sure yet"]}
        onSelect={(value) => updateFormData('believeInMarriage', value)}
      />

      <DropdownPicker
        label="Do you hope to have kids in the future?"
        value={formData.wantKidsInFuture}
        options={["Yes", "No", "Maybe / Not sure"]}
        onSelect={(value) => updateFormData('wantKidsInFuture', value)}
      />

      <DropdownPicker
        label="Do you have any physical disability?"
        value={formData.hasPhysicalDisability}
        options={["Yes", "No"]}
        onSelect={(value) => updateFormData('hasPhysicalDisability', value)}
      />

      {formData.hasPhysicalDisability === 'Yes' && (
        <TextInput
          style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
          placeholder="Please explain your physical disability"
          placeholderTextColor={colors.textSecondary}
          value={formData.physicalDisabilityDetails}
          onChangeText={(text) => updateFormData('physicalDisabilityDetails', text)}
          multiline
        />
      )}

      <DropdownPicker
        label="Do you suffer from any critical illness?"
        value={formData.hasCriticalIllness}
        options={["Yes", "No"]}
        onSelect={(value) => updateFormData('hasCriticalIllness', value)}
      />

      {formData.hasCriticalIllness === 'Yes' && (
        <TextInput
          style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
          placeholder="Please explain your critical illness"
          placeholderTextColor={colors.textSecondary}
          value={formData.criticalIllnessDetails}
          onChangeText={(text) => updateFormData('criticalIllnessDetails', text)}
          multiline
        />
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { fontSize: titleFontSize, marginBottom: stepMarginBottom }]}>About You</Text>
      <Text style={[styles.stepDescription, { fontSize: textFontSize, marginBottom: descriptionMarginBottom }]}>Be honest — tell people who you are</Text>

      <Text style={[styles.label, { fontSize: textFontSize }]}>1. Introduce yourself</Text>
      <TextInput
        style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="Include current realities, children, strengths, imperfections..."
        placeholderTextColor={colors.textSecondary}
        value={formData.introduceYourself}
        onChangeText={(text) => updateFormData('introduceYourself', text)}
        multiline
      />

      <Text style={[styles.label, { fontSize: textFontSize }]}>2. Describe your appearance</Text>
      <TextInput
        style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="Complexion, height, weight, body type, hairstyle, tattoos, disabilities..."
        placeholderTextColor={colors.textSecondary}
        value={formData.describeAppearance}
        onChangeText={(text) => updateFormData('describeAppearance', text)}
        multiline
      />

      <Text style={[styles.label, { fontSize: textFontSize }]}>3. What are you looking for (appearance & qualities)</Text>
      <TextInput
        style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="What kind of partner are you hoping to meet? What would they get from you?"
        placeholderTextColor={colors.textSecondary}
        value={formData.lookingForAppearance}
        onChangeText={(text) => updateFormData('lookingForAppearance', text)}
        multiline
      />

      <Text style={[styles.label, { fontSize: textFontSize }]}>4. As your partner, what should you expect from me?</Text>
      <TextInput
        style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="What can your partner expect from you in a relationship?"
        placeholderTextColor={colors.textSecondary}
        value={formData.partnerExpectations}
        onChangeText={(text) => updateFormData('partnerExpectations', text)}
        multiline
      />

      <Text style={[styles.label, { fontSize: textFontSize }]}>5. Do not contact me if</Text>
      <TextInput
        style={[styles.input, styles.textArea, { fontSize: inputFontSize, paddingVertical: inputPaddingVertical, paddingHorizontal: inputPaddingHorizontal }]}
        placeholder="List boundaries / dealbreakers"
        placeholderTextColor={colors.textSecondary}
        value={formData.doNotContactMeIf}
        onChangeText={(text) => updateFormData('doNotContactMeIf', text)}
        multiline
      />
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {authLoading ? (
          <View style={commonStyles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[commonStyles.text, { marginTop: 16 }]}>
              Verifying authentication...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Pressable onPress={handleBack}>
                <IconSymbol name="chevron.left" size={24} color={colors.text} />
              </Pressable>
              <Text style={styles.headerTitle}>Registration</Text>
              <Text style={styles.stepIndicator}>
                {step}/{totalSteps}
              </Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${(step / totalSteps) * 100}%` }]} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}>
              <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { padding: contentPadding }]} keyboardShouldPersistTaps="handled">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
              </ScrollView>
            </KeyboardAvoidingView>

            <View style={styles.buttonContainer}>
              <Pressable
                style={[styles.nextButton, loading && styles.buttonDisabled]}
                onPress={handleNext}
                disabled={loading}
              >
                <Text style={styles.nextButtonText}>
                  {loading ? 'Submitting...' : step === totalSteps ? 'Complete Registration' : 'Next'}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ... styles remain unchanged ...
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