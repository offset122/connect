
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, commonStyles } from '@/styles/commonStyles';
import DropdownPicker from '@/components/DropdownPicker';
import * as ImagePicker from 'expo-image-picker';
import {
  GENDERS,
  NATIONALITIES,
  SEXUAL_ORIENTATIONS,
  RELATIONSHIP_GOALS,
  COUNTRIES,
  KENYAN_COUNTIES,
  CONSTITUENCIES,
  KENYAN_TRIBES,
  RELIGIONS,
  RELIGIOUSNESS_LEVELS,
  YES_NO_OPTIONS,
  COMPLEXIONS,
  TEETH_STATUS_OPTIONS,
  HIV_STATUS_OPTIONS,
  BLOOD_GROUPS,
  YES_NO_OCCASIONALLY,
  EDUCATION_LEVELS,
  EMPLOYMENT_STATUS_OPTIONS,
  FINANCIAL_STABILITY_OPTIONS,
  YES_NO_MAYBE,
  MARITAL_STATUS_OPTIONS,
  RELATIONSHIP_PERSPECTIVES,
  MALE_BODY_TYPES,
  FEMALE_BODY_TYPES,
} from '@/constants/RegistrationData';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RegistrationFormData {
  // Basic Information
  name: string;
  username: string;
  gender: string;
  age: string;
  nationality: string;
  
  // Sexual & Relationship
  sexualOrientation: string;
  relationshipGoal: string;
  
  // Location
  countryOfResidence: string;
  city: string;
  county: string;
  constituency: string;
  
  // Tribal & Religious
  tribe: string;
  tribeOther: string;
  religion: string;
  religiousness: string;
  believeInMarriage: string;
  
  // Physical Appearance
  heightFt: string;
  heightIn: string;
  weightKg: string;
  bodyType: string;
  complexion: string;
  teethStatus: string;
  hasScars: string;
  scarsDetails: string;
  
  // Health
  hivStatus: string;
  bloodGroup: string;
  hasDisabilities: string;
  disabilitiesDetails: string;
  hasAllergies: string;
  allergiesDetails: string;
  
  // Lifestyle
  smoking: string;
  alcoholConsumption: string;
  hasPets: string;
  petsDetails: string;
  
  // Education & Work
  educationLevel: string;
  fieldOfStudy: string;
  currentProfession: string;
  workCounty: string;
  workConstituency: string;
  employmentStatus: string;
  financialStability: string;
  
  // Preferences
  canRelocate: string;
  canDateWithDisability: string;
  
  // Family
  maritalStatus: string;
  hasChildren: string;
  numberOfChildren: string;
  agesOfChildren: string;
  canDateWithKids: string;
  wantKidsInFuture: string;
  
  // Relationship Perspective
  relationshipPerspective: string;
  
  // Personal Boundaries & Expectations
  doNotContactIf: string;
  thingsIDontDo: string;
  whatIHopeToFind: string;
  whatToExpectFromMe: string;
  myImperfections: string;
  
  // Images
  profileImages: string[];
}

export default function RegistrationScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { user } = useAuth();
  const totalSteps = 10;
  
  const [formData, setFormData] = useState<RegistrationFormData>({
    name: '',
    username: '',
    gender: '',
    age: '',
    nationality: '',
    sexualOrientation: '',
    relationshipGoal: '',
    countryOfResidence: '',
    city: '',
    county: '',
    constituency: '',
    tribe: '',
    tribeOther: '',
    religion: '',
    religiousness: '',
    believeInMarriage: '',
    heightFt: '',
    heightIn: '',
    weightKg: '',
    bodyType: '',
    complexion: '',
    teethStatus: '',
    hasScars: '',
    scarsDetails: '',
    hivStatus: '',
    bloodGroup: '',
    hasDisabilities: '',
    disabilitiesDetails: '',
    hasAllergies: '',
    allergiesDetails: '',
    smoking: '',
    alcoholConsumption: '',
    hasPets: '',
    petsDetails: '',
    educationLevel: '',
    fieldOfStudy: '',
    currentProfession: '',
    workCounty: '',
    workConstituency: '',
    employmentStatus: '',
    financialStability: '',
    canRelocate: '',
    canDateWithDisability: '',
    maritalStatus: '',
    hasChildren: '',
    numberOfChildren: '',
    agesOfChildren: '',
    canDateWithKids: '',
    wantKidsInFuture: '',
    relationshipPerspective: '',
    doNotContactIf: '',
    thingsIDontDo: '',
    whatIHopeToFind: '',
    whatToExpectFromMe: '',
    myImperfections: '',
    profileImages: [],
  });

  // Check authentication on component mount
  React.useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      console.log('Checking authentication status...');

      // Use AuthContext user instead of checking session directly
      if (!user) {
        console.log('No authenticated user found - redirecting to signup');
        router.replace('/signup');
        return;
      }

      console.log('User authenticated:', user.id);
      setCurrentUser(user);

      // Pre-fill email if available
      if (user.email) {
        setFormData((prev) => ({
          ...prev,
          email: user.email
        }));
      }

    } catch (error) {
      console.error('Authentication check error:', error);
      // Redirect to signup if authentication fails
      router.replace('/signup');
    } finally {
      setAuthLoading(false);
    }
  };

  const updateFormData = (field: keyof RegistrationFormData, value: string) => {
    console.log('Updating field:', field, 'with value:', value);
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    console.log('Moving to step:', step + 1);
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
      router.back();
    }
  };

  const handleImagePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (!result.canceled) {
      console.log('Images selected:', result.assets.length);
      const imageUris = result.assets.map((asset) => asset.uri);
      setFormData((prev) => ({
        ...prev,
        profileImages: [...prev.profileImages, ...imageUris].slice(0, 5),
      }));
    }
  };

  const handleSubmit = async () => {
    console.log('Registration: Starting registration submission...');
    setLoading(true);

    try {
      // Verify user is authenticated through AuthContext
      if (!user) {
        console.log('Registration: No authenticated user found');
        router.replace('/signup');
        return;
      }

      console.log('Registration: Using authenticated user:', user.id, 'Email:', user.email);

      // Check if user already exists in users table
      const { data: existingUser, error: checkError } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!checkError && existingUser) {
        console.log('User profile already exists, navigating to payment');
        router.replace('/payment');
        return;
      }

      // Also check if email exists (for admin accounts that might have been manually created)
      const { data: existingEmailUser, error: emailCheckError } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!emailCheckError && existingEmailUser) {
        console.log('Email already exists in database, navigating to payment');
        router.replace('/payment');
        return;
      }

      console.log('No existing user profile found, proceeding with creation');

      // Prepare user data for database - ensure all fields are properly mapped
      const userData = {
        auth_id: user.id,  // Use auth_id as the primary key reference
        email: user.email,
        first_name: formData.name.split(' ')[0] || formData.name,
        last_name: formData.name.split(' ').slice(1).join(' ') || null,
        username: formData.username || null,
        gender: formData.gender || null,
        age: formData.age ? parseInt(formData.age) : null,
        nationality: formData.nationality || null,
        sexual_orientation: formData.sexualOrientation || null,
        relationship_goal: formData.relationshipGoal || null,
        country_of_residence: formData.countryOfResidence || null,
        city: formData.city || null,
        county: formData.county || null,
        constituency: formData.constituency || null,
        tribe: formData.tribe === 'Others' ? formData.tribeOther : formData.tribe,
        tribe_other: formData.tribe === 'Others' ? formData.tribeOther : null,
        religion: formData.religion || null,
        religiousness: formData.religiousness || null,
        believe_in_marriage: formData.believeInMarriage || null,
        height_ft: formData.heightFt ? parseInt(formData.heightFt) : null,
        height_in: formData.heightIn ? parseInt(formData.heightIn) : null,
        weight_kg: formData.weightKg ? parseFloat(formData.weightKg) : null,
        body_type: formData.bodyType || null,
        complexion: formData.complexion || null,
        teeth_status: formData.teethStatus || null,
        has_scars_birthmarks_tattoos: formData.hasScars === 'Yes',
        scars_birthmarks_tattoos_details: formData.scarsDetails || null,
        hiv_status: formData.hivStatus || null,
        blood_group: formData.bloodGroup || null,
        has_disabilities: formData.hasDisabilities === 'Yes',
        disabilities_details: formData.disabilitiesDetails || null,
        has_allergies: formData.hasAllergies === 'Yes',
        allergies_details: formData.allergiesDetails || null,
        smoking: formData.smoking || null,
        alcohol_consumption: formData.alcoholConsumption || null,
        has_pets: formData.hasPets === 'Yes',
        pets_details: formData.petsDetails || null,
        education_level: formData.educationLevel || null,
        field_of_study: formData.fieldOfStudy || null,
        current_profession: formData.currentProfession || null,
        work_county: formData.workCounty || null,
        work_constituency: formData.workConstituency || null,
        employment_status: formData.employmentStatus || null,
        financial_stability: formData.financialStability || null,
        can_relocate: formData.canRelocate || null,
        can_date_with_disability: formData.canDateWithDisability || null,
        marital_status: formData.maritalStatus || null,
        number_of_children: formData.hasChildren === 'Yes' ? (formData.numberOfChildren ? parseInt(formData.numberOfChildren) : 0) : 0,
        children_ages: formData.agesOfChildren || null,
        open_to_dating_with_children: formData.canDateWithKids || null,
        want_kids: formData.wantKidsInFuture || null,
        relationship_perspective: formData.relationshipPerspective || null,
        do_not_contact_if: formData.doNotContactIf || null,
        things_i_dont_do: formData.thingsIDontDo || null,
        what_i_hope_to_find: formData.whatIHopeToFind || null,
        what_to_expect_from_me: formData.whatToExpectFromMe || null,
        imperfections: formData.myImperfections || null,
        profile_images: formData.profileImages,
        is_active: true,
        is_verified: false,
        has_paid: false,
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      console.log('Prepared user data:', { ...userData, profile_images: `[${userData.profile_images.length} images]` });

      // Insert user data - use regular insert since we checked for existing user above
      const { data: insertedData, error: insertError } = await (supabase as any)
        .from('users')
        .insert(userData)
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);

        // If it's a username conflict, suggest a different username
        if (insertError.code === '23505' && insertError.message.includes('username')) {
          Alert.alert(
            'Username Taken',
            'The username you chose is already taken. Please choose a different one.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Go back to step 1 to change username
                  setStep(1);
                }
              }
            ]
          );
          return;
        }

        throw insertError;
      }

      console.log('User profile created successfully:', insertedData);

      // Registration successful
      console.log('Registration: Profile created successfully');

      // Force refresh the auth context to get updated profile data
      console.log('Registration: Profile created successfully, refreshing auth context');

      console.log('Registration: Profile created successfully, redirecting to payment');
      // Redirect to payment after successful registration
      setTimeout(() => {
        router.replace('/payment');
      }, 300);
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Error', 
        error.message || 'Failed to create profile. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepDescription}>Let&apos;s start with the basics</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        placeholderTextColor={colors.textSecondary}
        value={formData.name}
        onChangeText={(text) => updateFormData('name', text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={colors.textSecondary}
        value={formData.username}
        onChangeText={(text) => updateFormData('username', text)}
        autoCapitalize="none"
      />

      <DropdownPicker
        label="Gender"
        value={formData.gender}
        options={GENDERS}
        onSelect={(value) => updateFormData('gender', value)}
        required
      />

      <TextInput
        style={styles.input}
        placeholder="Age (25 and above)"
        placeholderTextColor={colors.textSecondary}
        value={formData.age}
        onChangeText={(text) => updateFormData('age', text)}
        keyboardType="numeric"
      />

      <DropdownPicker
        label="Nationality"
        value={formData.nationality}
        options={NATIONALITIES}
        onSelect={(value) => updateFormData('nationality', value)}
        required
      />
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Sexual & Relationship Preferences</Text>
      <Text style={styles.stepDescription}>Help us understand what you&apos;re looking for</Text>

      <DropdownPicker
        label="Sexual Orientation"
        value={formData.sexualOrientation}
        options={SEXUAL_ORIENTATIONS}
        onSelect={(value) => updateFormData('sexualOrientation', value)}
        required
      />

      <DropdownPicker
        label="Relationship Goal"
        value={formData.relationshipGoal}
        options={RELATIONSHIP_GOALS}
        onSelect={(value) => updateFormData('relationshipGoal', value)}
        required
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Location Details</Text>
      <Text style={styles.stepDescription}>Where do you live?</Text>

      <DropdownPicker
        label="Country of Residence"
        value={formData.countryOfResidence}
        options={COUNTRIES}
        onSelect={(value) => updateFormData('countryOfResidence', value)}
        required
      />

      {formData.countryOfResidence === 'Kenya' ? (
        <>
          <DropdownPicker
            label="County"
            value={formData.county}
            options={KENYAN_COUNTIES}
            onSelect={(value) => {
              updateFormData('county', value);
              updateFormData('constituency', '');
            }}
            required
          />

          <TextInput
            style={styles.input}
            placeholder="Constituency"
            placeholderTextColor={colors.textSecondary}
            value={formData.constituency}
            onChangeText={(text) => updateFormData('constituency', text)}
          />
        </>
      ) : formData.countryOfResidence && formData.countryOfResidence !== '' ? (
        <TextInput
          style={styles.input}
          placeholder="City"
          placeholderTextColor={colors.textSecondary}
          value={formData.city}
          onChangeText={(text) => updateFormData('city', text)}
        />
      ) : null}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tribal & Religious Background</Text>
      <Text style={styles.stepDescription}>Tell us about your background</Text>

      <DropdownPicker
        label="Tribe"
        value={formData.tribe}
        options={KENYAN_TRIBES}
        onSelect={(value) => updateFormData('tribe', value)}
      />

      {formData.tribe === 'Others' && (
        <TextInput
          style={styles.input}
          placeholder="Please specify your tribe"
          placeholderTextColor={colors.textSecondary}
          value={formData.tribeOther}
          onChangeText={(text) => updateFormData('tribeOther', text)}
        />
      )}

      <DropdownPicker
        label="Religion"
        value={formData.religion}
        options={RELIGIONS}
        onSelect={(value) => updateFormData('religion', value)}
        required
      />

      <DropdownPicker
        label="How religious are you?"
        value={formData.religiousness}
        options={RELIGIOUSNESS_LEVELS}
        onSelect={(value) => updateFormData('religiousness', value)}
        required
      />

      <DropdownPicker
        label="Do you believe in marriage?"
        value={formData.believeInMarriage}
        options={YES_NO_OPTIONS}
        onSelect={(value) => updateFormData('believeInMarriage', value)}
        required
      />
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Physical Appearance</Text>
      <Text style={styles.stepDescription}>Describe how you look</Text>

      <View style={styles.row}>
        <View style={styles.halfWidth}>
          <TextInput
            style={styles.input}
            placeholder="Height (ft)"
            placeholderTextColor={colors.textSecondary}
            value={formData.heightFt}
            onChangeText={(text) => updateFormData('heightFt', text)}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfWidth}>
          <TextInput
            style={styles.input}
            placeholder="Height (in)"
            placeholderTextColor={colors.textSecondary}
            value={formData.heightIn}
            onChangeText={(text) => updateFormData('heightIn', text)}
            keyboardType="numeric"
          />
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Weight (kg)"
        placeholderTextColor={colors.textSecondary}
        value={formData.weightKg}
        onChangeText={(text) => updateFormData('weightKg', text)}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Body Type</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bodyTypeScroll}>
        {(formData.gender === 'Male' ? MALE_BODY_TYPES : FEMALE_BODY_TYPES).map((type) => (
          <Pressable
            key={type.id}
            style={[
              styles.bodyTypeCard,
              formData.bodyType === type.id && styles.bodyTypeCardSelected,
            ]}
            onPress={() => updateFormData('bodyType', type.id)}
          >
            <View style={styles.bodyTypeImagePlaceholder}>
              <IconSymbol name="person" size={40} color={colors.textSecondary} />
            </View>
            <Text style={styles.bodyTypeLabel}>{type.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <DropdownPicker
        label="Complexion"
        value={formData.complexion}
        options={COMPLEXIONS}
        onSelect={(value) => updateFormData('complexion', value)}
        required
      />

      <DropdownPicker
        label="Teeth Status"
        value={formData.teethStatus}
        options={TEETH_STATUS_OPTIONS}
        onSelect={(value) => updateFormData('teethStatus', value)}
        required
      />

      <DropdownPicker
        label="Scars / Birthmarks / Tattoos"
        value={formData.hasScars}
        options={YES_NO_OPTIONS}
        onSelect={(value) => updateFormData('hasScars', value)}
        required
      />

      {formData.hasScars === 'Yes' && (
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Please explain"
          placeholderTextColor={colors.textSecondary}
          value={formData.scarsDetails}
          onChangeText={(text) => updateFormData('scarsDetails', text)}
          multiline
          numberOfLines={3}
        />
      )}
    </View>
  );

  const renderStep6 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Health & Lifestyle</Text>
      <Text style={styles.stepDescription}>Help us understand your health and lifestyle</Text>

      <DropdownPicker
        label="HIV Status"
        value={formData.hivStatus}
        options={HIV_STATUS_OPTIONS}
        onSelect={(value) => updateFormData('hivStatus', value)}
        required
      />

      <DropdownPicker
        label="Blood Group"
        value={formData.bloodGroup}
        options={BLOOD_GROUPS}
        onSelect={(value) => updateFormData('bloodGroup', value)}
        required
      />

      <DropdownPicker
        label="Disabilities"
        value={formData.hasDisabilities}
        options={YES_NO_OPTIONS}
        onSelect={(value) => updateFormData('hasDisabilities', value)}
        required
      />

      {formData.hasDisabilities === 'Yes' && (
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Please explain"
          placeholderTextColor={colors.textSecondary}
          value={formData.disabilitiesDetails}
          onChangeText={(text) => updateFormData('disabilitiesDetails', text)}
          multiline
          numberOfLines={3}
        />
      )}

      <DropdownPicker
        label="Allergies"
        value={formData.hasAllergies}
        options={YES_NO_OPTIONS}
        onSelect={(value) => updateFormData('hasAllergies', value)}
        required
      />

      {formData.hasAllergies === 'Yes' && (
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Please explain"
          placeholderTextColor={colors.textSecondary}
          value={formData.allergiesDetails}
          onChangeText={(text) => updateFormData('allergiesDetails', text)}
          multiline
          numberOfLines={3}
        />
      )}

      <DropdownPicker
        label="Smoking"
        value={formData.smoking}
        options={YES_NO_OCCASIONALLY}
        onSelect={(value) => updateFormData('smoking', value)}
        required
      />

      <DropdownPicker
        label="Alcohol Consumption"
        value={formData.alcoholConsumption}
        options={YES_NO_OCCASIONALLY}
        onSelect={(value) => updateFormData('alcoholConsumption', value)}
        required
      />

      <DropdownPicker
        label="Pets"
        value={formData.hasPets}
        options={YES_NO_OPTIONS}
        onSelect={(value) => updateFormData('hasPets', value)}
        required
      />

      {formData.hasPets === 'Yes' && (
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Please explain (type of pets, etc.)"
          placeholderTextColor={colors.textSecondary}
          value={formData.petsDetails}
          onChangeText={(text) => updateFormData('petsDetails', text)}
          multiline
          numberOfLines={3}
        />
      )}
    </View>
  );

  const renderStep7 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Education & Profession</Text>
      <Text style={styles.stepDescription}>Tell us about your education and work</Text>

      <DropdownPicker
        label="Education Level"
        value={formData.educationLevel}
        options={EDUCATION_LEVELS}
        onSelect={(value) => updateFormData('educationLevel', value)}
        required
      />

      <TextInput
        style={styles.input}
        placeholder="Field of Study"
        placeholderTextColor={colors.textSecondary}
        value={formData.fieldOfStudy}
        onChangeText={(text) => updateFormData('fieldOfStudy', text)}
      />

      {formData.countryOfResidence === 'Kenya' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Current Profession"
            placeholderTextColor={colors.textSecondary}
            value={formData.currentProfession}
            onChangeText={(text) => updateFormData('currentProfession', text)}
          />

          <DropdownPicker
            label="Work County"
            value={formData.workCounty}
            options={KENYAN_COUNTIES}
            onSelect={(value) => {
              updateFormData('workCounty', value);
              updateFormData('workConstituency', '');
            }}
          />

          <TextInput
            style={styles.input}
            placeholder="Work Constituency"
            placeholderTextColor={colors.textSecondary}
            value={formData.workConstituency}
            onChangeText={(text) => updateFormData('workConstituency', text)}
          />
        </>
      )}

      <DropdownPicker
        label="Employment Status"
        value={formData.employmentStatus}
        options={EMPLOYMENT_STATUS_OPTIONS}
        onSelect={(value) => updateFormData('employmentStatus', value)}
        required
      />

      <DropdownPicker
        label="Financial Stability"
        value={formData.financialStability}
        options={FINANCIAL_STABILITY_OPTIONS}
        onSelect={(value) => updateFormData('financialStability', value)}
        required
      />

      <DropdownPicker
        label="Can you relocate for love?"
        value={formData.canRelocate}
        options={YES_NO_MAYBE}
        onSelect={(value) => updateFormData('canRelocate', value)}
        required
      />

      <DropdownPicker
        label="Can you date someone with a disability?"
        value={formData.canDateWithDisability}
        options={YES_NO_MAYBE}
        onSelect={(value) => updateFormData('canDateWithDisability', value)}
        required
      />
    </View>
  );

  const renderStep8 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Family & Children</Text>
      <Text style={styles.stepDescription}>Tell us about your family situation</Text>

      <DropdownPicker
        label="Marital Status"
        value={formData.maritalStatus}
        options={MARITAL_STATUS_OPTIONS}
        onSelect={(value) => updateFormData('maritalStatus', value)}
        required
      />

      <DropdownPicker
        label="Have Children"
        value={formData.hasChildren}
        options={YES_NO_OPTIONS}
        onSelect={(value) => updateFormData('hasChildren', value)}
        required
      />

      {formData.hasChildren === 'Yes' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Number of Children"
            placeholderTextColor={colors.textSecondary}
            value={formData.numberOfChildren}
            onChangeText={(text) => updateFormData('numberOfChildren', text)}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Ages of Children (e.g., 5, 8, 12)"
            placeholderTextColor={colors.textSecondary}
            value={formData.agesOfChildren}
            onChangeText={(text) => updateFormData('agesOfChildren', text)}
          />
        </>
      )}

      <DropdownPicker
        label="Can you date someone with kids?"
        value={formData.canDateWithKids}
        options={YES_NO_OPTIONS}
        onSelect={(value) => updateFormData('canDateWithKids', value)}
        required
      />

      <DropdownPicker
        label="Do you want kids in the future?"
        value={formData.wantKidsInFuture}
        options={YES_NO_OPTIONS}
        onSelect={(value) => updateFormData('wantKidsInFuture', value)}
        required
      />

      <DropdownPicker
        label="Perspective on Relationships"
        value={formData.relationshipPerspective}
        options={RELATIONSHIP_PERSPECTIVES}
        onSelect={(value) => updateFormData('relationshipPerspective', value)}
        required
      />
    </View>
  );

  const renderStep9 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personal Boundaries & Expectations</Text>
      <Text style={styles.stepDescription}>Help potential matches understand you better</Text>

      <Text style={styles.label}>Do not contact me if...</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="e.g., you&apos;re not serious about relationships"
        placeholderTextColor={colors.textSecondary}
        value={formData.doNotContactIf}
        onChangeText={(text) => updateFormData('doNotContactIf', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>I don&apos;t do these things (e.g., threesomes)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="List things you&apos;re not comfortable with"
        placeholderTextColor={colors.textSecondary}
        value={formData.thingsIDontDo}
        onChangeText={(text) => updateFormData('thingsIDontDo', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>What I hope to find in a partner</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe your ideal partner"
        placeholderTextColor={colors.textSecondary}
        value={formData.whatIHopeToFind}
        onChangeText={(text) => updateFormData('whatIHopeToFind', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>If I&apos;m to be your partner, expect this from me</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="What can your partner expect from you?"
        placeholderTextColor={colors.textSecondary}
        value={formData.whatToExpectFromMe}
        onChangeText={(text) => updateFormData('whatToExpectFromMe', text)}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>My imperfections (e.g., impatience, anger)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Be honest about your flaws"
        placeholderTextColor={colors.textSecondary}
        value={formData.myImperfections}
        onChangeText={(text) => updateFormData('myImperfections', text)}
        multiline
        numberOfLines={4}
      />
    </View>
  );

  const renderStep10 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Profile Images (Optional)</Text>
      <Text style={styles.stepDescription}>
        These images are only visible to whom you approve
      </Text>

      <Pressable style={styles.uploadButton} onPress={handleImagePick}>
        <IconSymbol name="photo.fill" size={24} color={colors.primary} />
        <Text style={styles.uploadButtonText}>
          {formData.profileImages.length > 0
            ? `${formData.profileImages.length} image(s) selected`
            : 'Upload Images (Max 5)'}
        </Text>
      </Pressable>

      {formData.profileImages.length > 0 && (
        <View style={styles.imagePreviewContainer}>
          {formData.profileImages.map((uri, index) => (
            <View key={index} style={styles.imagePreview}>
              <Text style={styles.imagePreviewText}>Image {index + 1}</Text>
              <Pressable
                onPress={() => {
                  setFormData((prev) => ({
                    ...prev,
                    profileImages: prev.profileImages.filter((_, i) => i !== index),
                  }));
                }}
              >
                <IconSymbol name="xmark" size={20} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.finalNote}>
        <IconSymbol name="info" size={24} color={colors.accent} />
        <Text style={styles.finalNoteText}>
          By completing this registration, you agree to our Terms and Conditions. 
          You&apos;ll be redirected to payment to activate your account.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      <View style={styles.container}>
        {/* Show loading while checking authentication */}
        {authLoading ? (
          <View style={commonStyles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[commonStyles.text, { marginTop: 16 }]}>
              Verifying authentication...
            </Text>
          </View>
        ) : (
          <>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Registration</Text>
          <Text style={styles.stepIndicator}>
            {step}/{totalSteps}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${(step / totalSteps) * 100}%` }]} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
          {step === 6 && renderStep6()}
          {step === 7 && renderStep7()}
          {step === 8 && renderStep8()}
          {step === 9 && renderStep9()}
          {step === 10 && renderStep10()}
        </ScrollView>

        {/* Navigation Buttons */}
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
    padding: 20,
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
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  bodyTypeScroll: {
    marginBottom: 16,
  },
  bodyTypeCard: {
    width: 100,
    marginRight: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  bodyTypeCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  bodyTypeImagePlaceholder: {
    width: 60,
    height: 80,
    backgroundColor: colors.background,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bodyTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 16,
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  imagePreviewContainer: {
    marginBottom: 16,
  },
  imagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  imagePreviewText: {
    fontSize: 14,
    color: colors.text,
  },
  finalNote: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  finalNoteText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 20,
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
});
