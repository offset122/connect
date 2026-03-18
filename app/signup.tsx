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
  KeyboardAvoidingView,
  Platform
} from "react-native";
import DropdownPicker from '../components/DropdownPicker';
import { supabase } from "./integrations/supabase/client";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import safeBack from '../utils/safeRouter';
import { colors, commonStyles } from "../styles/commonStyles";
import React, { useState } from "react";
import { IconSymbol } from "../components/IconSymbol";
import { useAuth } from "../contexts/AuthContext";
import AsyncStorage from '@react-native-async-storage/async-storage';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputContainer: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
  avatarSection: {
    marginTop: 24,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  avatarOption: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  avatarSelected: {
    borderColor: colors.primary,
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
    fontSize: 28,
    fontWeight: '700',
    color: '#666666',
  },
});

// Avatar list
const AVATAR_OPTIONS = [
  { id: 'avatar1', filename: '3d-cartoon-portrait-person-practicing-law-related-profession.jpg' },
  { id: 'avatar2', filename: 'men1.jpg' },
  { id: 'avatar3', filename: 'men2.jpg' },
  { id: 'avatar4', filename: 'men3.jpg' },
  { id: 'avatar5', filename: '408535ae-483f-477a-a0e6-3e28d0eabb88.jpg' },
  { id: 'avatar6', filename: '2809696b-04f1-4ca8-8194-2ac46919f408.jpg' },
  { id: 'avatar7', filename: 'androgynous-avatar-non-binary-queer-person.jpg' },
  { id: 'avatar8', filename: 'b85ac579-0101-483b-9c95-0f9db7e1fcc6.jpg' },
  { id: 'avatar9', filename: 'b400cea9-fa0a-4595-9865-d1216fea02e8.jpg' },
  { id: 'avatar10', filename: 'av4.jpg' },
  { id: 'avatar11', filename: 'av5.jpg' },
  { id: 'avatar12', filename: 'av6.jpg' },
  { id: 'avatar13', filename: 'av1.jpg' },
  { id: 'avatar14', filename: 'av2.jpg' },
  { id: 'avatar15', filename: 'av3.jpg' },
];

// Countries list
const COUNTRIES = [
  'Kenya',
  'United States',
  'United Kingdom',
  'Afghanistan',
    'Albania',
    'Algeria',
    'Andorra',
    'Angola',
    'Antigua and Barbuda',
    'Argentina',
    'Armenia',
    'Australia',
    'Austria',
    'Azerbaijan',
    'Bahamas',
    'Bahrain',
    'Bangladesh',
    'Barbados',
    'Belarus',
    'Belgium',
    'Belize',
    'Benin',
    'Bhutan',
    'Bolivia',
    'Bosnia and Herzegovina',
    'Botswana',
    'Brazil',
    'Brunei',
    'Bulgaria',
    'Burkina Faso',
    'Burundi',
    'Cabo Verde',
    'Cambodia',
    'Cameroon',
    'Canada',
    'Central African Republic',
    'Chad',
    'Chile',
    'China',
    'Colombia',
    'Comoros',
    'Congo (Congo-Brazzaville)',
    'Costa Rica',
    'Croatia',
    'Cuba',
    'Cyprus',
    'Czechia (Czech Republic)',
    'Democratic Republic of the Congo',
    'Denmark',
    'Djibouti',
    'Dominica',
    'Dominican Republic',
    'Ecuador',
    'Egypt',
    'El Salvador',
    'Equatorial Guinea',
    'Eritrea',
    'Estonia',
    'Eswatini (fmr. "Swaziland")',
    'Ethiopia',
    'Fiji',
    'Finland',
    'France',
    'Gabon',
    'Gambia',
    'Georgia',
    'Germany',
    'Ghana',
    'Greece',
    'Grenada',
    'Guatemala',
    'Guinea',
    'Guinea-Bissau',
    'Guyana',
    'Haiti',
    'Holy See',
    'Honduras',
    'Hungary',
    'Iceland',
    'India',
    'Indonesia',
    'Iran',
    'Iraq',
    'Ireland',
    'Israel',
    'Italy',
    'Jamaica',
    'Japan',
    'Jordan',
    'Kazakhstan',
    'Kiribati',
    'Kuwait',
    'Kyrgyzstan',
    'Laos',
    'Latvia',
    'Lebanon',
    'Lesotho',
    'Liberia',
    'Libya',
    'Liechtenstein',
    'Lithuania',
    'Luxembourg',
    'Madagascar',
    'Malawi',
    'Malaysia',
    'Maldives',
    'Mali',
    'Malta',
    'Marshall Islands',
    'Mauritania',
    'Mauritius',
    'Mexico',
    'Micronesia',
    'Moldova',
    'Monaco',
    'Mongolia',
    'Montenegro',
    'Morocco',
    'Mozambique',
    'Myanmar (formerly Burma)',
    'Namibia',
    'Nauru',
    'Nepal',
    'Netherlands',
    'New Zealand',
    'Nicaragua',
    'Niger',
    'Nigeria',
    'North Korea',
    'North Macedonia',
    'Norway',
    'Oman',
    'Pakistan',
    'Palau',
    'Palestine State',
    'Panama',
    'Papua New Guinea',
    'Paraguay',
    'Peru',
    'Philippines',
    'Poland',
    'Portugal',
    'Qatar',
    'Romania',
    'Russia',
    'Rwanda',
    'Saint Kitts and Nevis',
    'Saint Lucia',
    'Saint Vincent and the Grenadines',
    'Samoa',
    'San Marino',
    'Sao Tome and Principe',
    'Saudi Arabia',
    'Senegal',
    'Serbia',
    'Seychelles',
    'Sierra Leone',
    'Singapore',
    'Slovakia',
    'Slovenia',
    'Solomon Islands',
    'Somalia',
    'South Africa',
    'South Korea',
    'South Sudan',
    'Spain',
    'Sri Lanka',
    'Sudan',
    'Suriname',
    'Sweden',
    'Switzerland',
    'Syria',
    'Taiwan',
    'Tajikistan',
    'Tanzania',
    'Thailand',
    'Timor-Leste',
    'Togo',
    'Tonga',
    'Trinidad and Tobago',
    'Tunisia',
    'Turkey',
    'Turkmenistan',
    'Tuvalu',
    'Uganda',
    'Ukraine',
    'United Arab Emirates',
    'Uruguay',
    'Uzbekistan',
    'Vanuatu',
    'Venezuela',
    'Vietnam',
    'Yemen',
    'Zambia',
    'Zimbabwe',
];

// importer
const getAvatarImage = (filename: string) => {
  const avatarMap = {
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

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signUp } = useAuth();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword || !country) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      if (selectedAvatar) {
        await AsyncStorage.setItem('selectedAvatar', selectedAvatar);
      }

      if (country) {
        await AsyncStorage.setItem('country', country);
      }

      const result = await signUp(email, password);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Signup failed');
        return;
      }

      Alert.alert('Success', 'Account created! Continue to profile setup.');
    } catch (err) {
      Alert.alert('Error', 'Unexpected error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => safeBack(router)}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Sign up to start your journey to finding meaningful connections
            </Text>
          </View>

          <View style={styles.form}>
            {/* Avatar Selection */}
            <View style={styles.avatarSection}>
              <Text style={styles.sectionTitle}>Choose Your Avatar</Text>
              <View style={styles.avatarGrid}>
                {AVATAR_OPTIONS.map((a) => {
                  const avatarImage = getAvatarImage(a.filename);
                  return (
                    <Pressable
                      key={a.id}
                      style={[
                        styles.avatarOption,
                        selectedAvatar === a.filename && styles.avatarSelected,
                      ]}
                      onPress={() => setSelectedAvatar(a.filename)}
                    >
                      {avatarImage ? (
                        <Image source={avatarImage} style={styles.avatarImage} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarPlaceholderText}>?</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

{/* Country */}
            <DropdownPicker
              label="Country"
              value={country}
              options={COUNTRIES}
              onSelect={setCountry}
              placeholder="Select your country"
              required
            />
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <IconSymbol
                    name={showPassword ? "eye.slash.fill" : "eye.fill"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textSecondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <IconSymbol
                    name={showConfirmPassword ? "eye.slash.fill" : "eye.fill"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {/* Signup Button */}
            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </Pressable>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{" "}
              <Text style={styles.link} onPress={() => router.push("/login")}>
                Log In
              </Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
