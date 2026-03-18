import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors, fontFamilies } from '../styles/commonStyles';
import { supabase } from '../app/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

interface PhoneNumberRequestProps {
  targetUserName: string;
  targetUserId: string;
}

export default function PhoneNumberRequest({
  targetUserName,
  targetUserId,
}: PhoneNumberRequestProps) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [requestStatus, setRequestStatus] = useState<
    'none' | 'pending' | 'approved' | 'declined'
  >('none');
  const [userRole, setUserRole] = useState<'requester' | 'target' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hasApproved, setHasApproved] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation();

  // Determine role and load status
  useEffect(() => {
    if (!user) return;

    const isRequester = user.id === targetUserId ? false : true; // Wait—this is wrong!
    // CORRECT LOGIC:
    const isCurrentUserTarget = user.id === targetUserId;
    setUserRole(isCurrentUserTarget ? 'target' : 'requester');

    checkRequestStatus();
  }, [user?.id, targetUserId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (requestStatus === 'pending' && userRole === 'requester') {
      interval = setInterval(() => {
        checkRequestStatus();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [requestStatus, userRole, user?.id, targetUserId]);

  const checkRequestStatus = async () => {
    if (!user) return;

    try {
      let query;
      if (userRole === 'requester') {
        query = supabase
          .from('phone_number_requests')
          .select('request_status')
          .eq('requester_id', user.id)
          .eq('target_user_id', targetUserId);
      } else {
        query = supabase
          .from('phone_number_requests')
          .select('request_status')
          .eq('requester_id', targetUserId) // requester is the other user
          .eq('target_user_id', user.id);
      }

      const { data: existingRequest } = await query.maybeSingle();
      const status = existingRequest?.request_status || 'none';
      setRequestStatus(status as any);
      
      // If status is approved and user is target, set hasApproved to true
      if (status === 'approved' && userRole === 'target') {
        setHasApproved(true);
      }
    } catch (error) {
      console.error('Error checking request status:', error);
    }
  };

  // Handle sending a request (as requester)
  const handlePhoneNumberRequest = async () => {
    if (!user || userRole !== 'requester') return;

    if (requestStatus === 'pending') {
      Alert.alert('Request Pending', `You already have a pending request to ${targetUserName}.`);
      return;
    }

    setRequestStatus('pending');
    setSending(true);
    setLoading(true);

    try {
      const { data: existingRequest } = await (supabase as any)
        .from('phone_number_requests')
        .select('*')
        .eq('requester_id', user.id)
        .eq('target_user_id', targetUserId)
        .maybeSingle();

      if (existingRequest) {
        const status = existingRequest.request_status;
        if (status === 'approved') {
          setRequestStatus('approved');
          Alert.alert(
            '📞 Contact Shared!',
            `${targetUserName} has sent their phone number in your private chat.`,
            [
              { text: 'Open Chat', onPress: () => (navigation as any).navigate('chat', { id: targetUserId }) },
              { text: 'OK' },
            ]
          );
          return;
        } else if (status === 'pending') {
          Alert.alert('Request Pending', `You already have a pending request to ${targetUserName}.`);
          return;
        } else if (status === 'declined') {
          setRequestStatus('declined');
          Alert.alert('Request Declined', `${targetUserName} has declined your request.`);
          return;
        }
      }

      Alert.alert(
        'Request Phone Number',
        `Send a request to ${targetUserName} for their phone number? They’ll be notified and can share it securely via message.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setRequestStatus('none');
              setSending(false);
              setLoading(false);
            },
          },
          {
            text: 'Send Request',
            onPress: async () => {
              try {
                const { error: requestError } = await (supabase as any)
                  .from('phone_number_requests')
                  .insert({
                    requester_id: user.id,
                    target_user_id: targetUserId,
                    request_status: 'pending',
                  });

                if (requestError) throw requestError;

                const { data: userData } = await supabase
                  .from('users')
                  .select('first_name, username')
                  .eq('id', user.id)
                  .single();

                const displayName = (userData?.first_name || userData?.username) || 'Someone';

                await (supabase as any).from('notifications').insert({
                  user_id: targetUserId,
                  type: 'phone_request',
                  title: 'Phone Number Request 📱',
                  body: `${displayName} has requested your phone number.`,
                  description: `${displayName} would like to exchange contact info. You can respond in Connections.`,
                  related_user_id: user.id,
                  read: false,
                  notification_type: 'phone_request',
                });

                Alert.alert(
                  'Request Sent! 📱',
                  `Your request was sent to ${targetUserName}. You’ll get a message if they share their number.`,
                  [{ text: 'OK' }]
                );
              } catch (error: any) {
                console.error('Error sending request:', error);
                Alert.alert('Error', error.message || 'Failed to send request.');
                setRequestStatus('none');
              } finally {
                setSending(false);
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
      setRequestStatus('none');
      setSending(false);
      setLoading(false);
    }
  };


  // Handle approving the request (as target)
  const handleApproveRequest = async () => {
    if (!user || userRole !== 'target') return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('phone_number_requests')
        .update({ request_status: 'approved' })
        .eq('requester_id', targetUserId)
        .eq('target_user_id', user.id);

      if (error) throw error;

      setRequestStatus('approved');
      setHasApproved(true);
      Alert.alert(
        'Request Approved',
        'Now you can enter your phone number to share with ' + targetUserName
      );
    } catch (error: any) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request.');
    } finally {
      setLoading(false);
    }
  };

  // Handle declining the request
  const handleDeclineRequest = async () => {
    if (!user || userRole !== 'target') return;

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('phone_number_requests')
        .update({ request_status: 'declined' })
        .eq('requester_id', targetUserId)
        .eq('target_user_id', user.id);

      if (error) throw error;

      setRequestStatus('declined');
      Alert.alert('Request Declined', `You have declined ${targetUserName}'s request.`);
    } catch (error: any) {
      console.error('Error declining request:', error);
      Alert.alert('Error', 'Failed to decline request.');
    } finally {
      setLoading(false);
    }
  };

  // Handle blocking the user
  const handleBlockUser = async () => {
    if (!user) return;

    Alert.alert(
      'Block User',
      `Are you sure you want to block ${targetUserName}? This will prevent them from contacting you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await (supabase as any)
                .from('blocked_users')
                .insert({
                  blocker_id: user.id,
                  blocked_id: targetUserId,
                });

              if (error) throw error;

              Alert.alert('User Blocked', `${targetUserName} has been blocked.`);
            } catch (error: any) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Handle sharing phone number (as target)
  const handleSharePhoneNumber = async () => {
    if (!user || userRole !== 'target' || !phoneNumber.trim()) {
      Alert.alert('Invalid Input', 'Please enter a valid phone number.');
      return;
    }

    if (!hasApproved) {
      Alert.alert('Not Approved', 'Please approve the request first.');
      return;
    }

    setLoading(true);

    try {
      // Note: Status remains 'approved', we're just sending the phone number

      // Send the phone number via private message (RECOMMENDED)
      const { error: messageError } = await (supabase as any)
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: targetUserId,
          content: `My phone number is: ${phoneNumber}`,
          message_type: 'text',
          delivered: false,
          read: false,
        });

      if (messageError) throw messageError;

      // Notify requester (optional)
      const { data: currentUserData } = await supabase
        .from('users')
        .select('first_name')
        .eq('id', user.id)
        .single();

      await (supabase as any).from('notifications').insert({
        user_id: targetUserId,
        type: 'phone_shared',
        title: 'Phone Number Shared 📞',
        body: `${(currentUserData?.first_name) || 'Someone'} shared their phone number with you.`,
        description: 'Check your private chat for details.',
        related_user_id: user.id,
        read: false,
      });

      setRequestStatus('approved');
      setPhoneNumber(''); // Clear the input
      Alert.alert(
        'Sent! 📞',
        'Your phone number has been sent securely in your private chat.',
        [{ text: 'OK', onPress: () => (navigation as any).navigate('chat', { id: targetUserId }) }]
      );
    } catch (error: any) {
      console.error('Error sharing phone number:', error);
      Alert.alert('Error', 'Failed to send phone number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // UI Logic
  if (userRole === 'target' && requestStatus === 'pending' && !hasApproved) {
    return (
      <View style={styles.approvalContainer}>
        <Text style={styles.promptText}>
          {targetUserName} requested your phone number.
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.approveButton, loading && styles.disabledButton]}
            onPress={handleApproveRequest}
            disabled={loading}
          >
            <Text style={styles.approveButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.declineButton, loading && styles.disabledButton]}
            onPress={handleDeclineRequest}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.declineButtonText}>Decline</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.blockButton, loading && styles.disabledButton]}
            onPress={handleBlockUser}
            disabled={loading}
          >
            <Text style={styles.blockButtonText}>Block</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (userRole === 'target' && hasApproved) {
    return (
      <View style={styles.inputContainer}>
        <Text style={styles.promptText}>
          Enter your phone number to share with {targetUserName}.
        </Text>
        <TextInput
          style={styles.phoneInput}
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.shareButton, loading && styles.disabledButton]}
          onPress={handleSharePhoneNumber}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.shareButtonText}>Send Phone Number</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Default: requester UI
  const isDisabled = loading || sending || requestStatus === 'pending';
  return (
    <TouchableOpacity
      style={[styles.requestButton, isDisabled && styles.requestButtonDisabled]}
      onPress={handlePhoneNumberRequest}
      disabled={isDisabled}
    >
      <View style={styles.requestContent}>
        {loading || sending ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : requestStatus === 'pending' ? (
          <>
            <IconSymbol name="clock.fill" size={20} color="#FF9500" />
            <Text style={[styles.requestText, { color: '#FF9500' }]}>
              Pending
            </Text>
          </>
        ) : requestStatus === 'approved' ? (
          <>
            <IconSymbol name="checkmark.circle.fill" size={20} color="#34C759" />
            <Text style={[styles.requestText, { color: '#34C759' }]}>
              Approved
            </Text>
          </>
        ) : requestStatus === 'declined' ? (
          <>
            <IconSymbol name="xmark.circle.fill" size={20} color="#FF3B30" />
            <Text style={[styles.requestText, { color: '#FF3B30' }]}>
              Declined
            </Text>
          </>
        ) : (
          <>
            <IconSymbol name="phone.fill" size={20} color={colors.primary} />
            <Text style={styles.requestText}>Request Phone</Text>
          </>
        )}
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
  approvalContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    gap: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilies.semibold,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilies.semibold,
  },
  blockButton: {
    flex: 1,
    backgroundColor: '#8E8E93',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  blockButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilies.semibold,
  },
  inputContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    gap: 12,
  },
  promptText: {
    fontSize: 16,
    color: colors.text,
    fontFamily: fontFamilies.regular,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  shareButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fontFamilies.semibold,
  },
});