import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors, fontFamilies } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PhoneNumberRequestProps {
  targetUserName: string;
  targetUserId: string;
}

export default function PhoneNumberRequest({ targetUserName, targetUserId }: PhoneNumberRequestProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handlePhoneNumberRequest = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Check if request already exists
      const { data: existingRequest } = await (supabase as any)
        .from('phone_number_requests')
        .select('id, request_status')
        .eq('requester_id', user.id)
        .eq('target_user_id', targetUserId)
        .single();

      if (existingRequest) {
        if (existingRequest.request_status === 'approved') {
          // Get the phone number
          const { data: targetUser } = await (supabase as any)
            .from('users')
            .select('phone_number')
            .eq('id', targetUserId)
            .single();

          Alert.alert(
            'Phone Number Available! 📱',
            `${targetUserName}'s phone number is: ${targetUser?.phone_number || 'Not provided'}`,
            [{ text: 'OK' }]
          );
        } else if (existingRequest.request_status === 'pending') {
          Alert.alert('Request Pending', `You already have a pending request to ${targetUserName}. Please wait for their response.`);
        } else {
          Alert.alert('Request Declined', `${targetUserName} has declined your phone number request.`);
        }
        return;
      }

      // Send confirmation alert first
      Alert.alert(
        'Request Phone Number',
        `Send a message to ${targetUserName} requesting their phone number? This will notify them and they can choose to share it with you.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Send Request',
            onPress: async () => {
              try {
                // Create the phone number request in database
                const { error: requestError } = await (supabase as any)
                  .from('phone_number_requests')
                  .insert({
                    requester_id: user.id,
                    target_user_id: targetUserId,
                    request_status: 'pending'
                  });

                if (requestError) throw requestError;

                // Create notification for the target user
                const { data: userData } = await (supabase as any)
                  .from('users')
                  .select('first_name, username')
                  .eq('auth_id', user.id)
                  .single();

                const displayName = userData?.first_name || userData?.username || 'Someone';

                const { error: notificationError } = await (supabase as any)
                  .from('notifications')
                  .insert({
                    user_id: targetUserId,
                    title: 'Phone Number Request 📱',
                    body: `${displayName} has requested your phone number. Check your connections to respond.`,
                    notification_type: 'system'
                  });

                if (notificationError) {
                  console.error('Error creating notification:', notificationError);
                  // Don't fail the whole request if notification fails
                }

                Alert.alert(
                  'Request Sent! 📱',
                  `Your phone number request has been sent to ${targetUserName}. They will be notified and can choose to share their number with you.`,
                  [{ text: 'OK' }]
                );
              } catch (error: any) {
                console.error('Error creating phone request:', error);
                Alert.alert('Error', error.message || 'Failed to send request. Please try again.');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error sending phone number request:', error);
      Alert.alert('Error', 'Failed to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.requestButton, loading && styles.requestButtonDisabled]}
      onPress={handlePhoneNumberRequest}
      disabled={loading}
    >
      <View style={styles.requestContent}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <IconSymbol name="phone.fill" size={20} color={colors.primary} />
        )}
        <Text style={styles.requestText}>
          {loading ? 'Sending...' : 'Request Phone'}
        </Text>
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
  requestButtonDisabled: {
    opacity: 0.6,
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