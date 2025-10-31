import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors, fontFamilies } from '@/styles/commonStyles';

interface PhoneNumberRequestProps {
  targetUserName: string;
  targetUserId: string;
}

export default function PhoneNumberRequest({ targetUserName, targetUserId }: PhoneNumberRequestProps) {
  const handlePhoneNumberRequest = async () => {
    try {
      // For demo purposes, show the confirmation
      Alert.alert(
        'Request Phone Number',
        `Send a message to ${targetUserName} requesting their phone number?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Send Request',
            onPress: () => {
              Alert.alert(
                'Request Sent! 📱',
                `Your phone number request has been sent to ${targetUserName}. They will be notified and can choose to share their number with you.`,
                [{ text: 'OK' }]
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error sending phone number request:', error);
      Alert.alert('Error', 'Failed to send request. Please try again.');
    }
  };

  return (
    <TouchableOpacity style={styles.requestButton} onPress={handlePhoneNumberRequest}>
      <View style={styles.requestContent}>
        <IconSymbol name="phone.fill" size={20} color={colors.primary} />
        <Text style={styles.requestText}>pls</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  requestButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
  },
});