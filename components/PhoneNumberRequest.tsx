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

// Cross-platform alert helper - works on both native and web
const showAlert = (title: string, message?: string) => {
  if (typeof window !== 'undefined') {
    window.alert(`${title}${message ? '\n\n' + message : ''}`);
  } else {
    Alert.alert(title, message);
  }
};

// Cross-platform confirm helper
const showConfirm = (message: string): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    Alert.alert('Confirm', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'OK', onPress: () => resolve(true) },
    ]);
  });
};

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

  useEffect(() => {
    if (!user) return;
    const role = user.id === targetUserId ? 'target' : 'requester';
    setUserRole(role);
    checkRequestStatus(role);
  }, [user?.id, targetUserId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (requestStatus === 'pending' && userRole === 'requester') {
      interval = setInterval(() => {
        checkRequestStatus(userRole);
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [requestStatus, userRole, user?.id, targetUserId]);

  const checkRequestStatus = async (role?: 'requester' | 'target') => {
    if (!user) return;
    const effectiveRole = role ?? userRole;
    if (!effectiveRole) return;

    try {
      const { data, error } = await (supabase as any)
        .from('phone_number_requests')
        .select('request_status')
        .eq('requester_id', effectiveRole === 'requester' ? user.id : targetUserId)
        .eq('target_user_id', effectiveRole === 'requester' ? targetUserId : user.id)
        .limit(1);

      if (error) {
        // Table might not exist - treat as no requests
        console.log('checkRequestStatus: Table may not exist or no access:', error.message);
        setRequestStatus('none');
        return;
      }

      const status = data?.[0]?.request_status ?? 'none';
      console.log('checkRequestStatus result:', status, 'role:', effectiveRole);
      setRequestStatus(status as any);

      if (status === 'approved' && effectiveRole === 'target') {
        setHasApproved(true);
      }
    } catch (err) {
      console.error('checkRequestStatus exception:', err);
      setRequestStatus('none');
    }
  };

  const handlePhoneNumberRequest = async () => {
    console.log('handlePhoneNumberRequest called', { user: !!user, userRole, requestStatus });

    if (!user) {
      showAlert('Error', 'You must be logged in to make a request.');
      return;
    }

    if (!userRole) {
      showAlert('Error', 'Loading... Please wait a moment and try again.');
      return;
    }

    if (userRole !== 'requester') {
      showAlert('Error', 'You cannot make a phone number request from this account.');
      return;
    }

    if (requestStatus === 'pending') {
      showAlert('Request Pending', `You already have a pending request to ${targetUserName}.`);
      return;
    }

    if (requestStatus === 'approved') {
      showAlert('Request Approved', `${targetUserName} has already shared their phone number in your private chat.`);
      return;
    }

    if (requestStatus === 'declined') {
      showAlert(
        'Request Previously Declined',
        `${targetUserName} previously declined your request. You can try again if they'd like to reconsider.`,
      );
      return;
    }

    setSending(true);
    setLoading(true);

    try {
      // Check for existing request
      const { data: rows, error: fetchError } = await (supabase as any)
        .from('phone_number_requests')
        .select('request_status')
        .eq('requester_id', user.id)
        .eq('target_user_id', targetUserId)
        .limit(1);

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      const existingRequest = rows?.[0] ?? null;

      if (existingRequest) {
        const status = existingRequest.request_status;
        if (status === 'approved') {
          setRequestStatus('approved');
          showAlert('📞 Contact Shared!', `${targetUserName} has sent their phone number in your private chat.`);
          setSending(false);
          setLoading(false);
          return;
        } else if (status === 'pending') {
          showAlert('Request Pending', `You already have a pending request to ${targetUserName}.`);
          setSending(false);
          setLoading(false);
          return;
        } else if (status === 'declined') {
          setRequestStatus('declined');
          showAlert('Request Declined', `${targetUserName} has declined your request.`);
          setSending(false);
          setLoading(false);
          return;
        }
      }

      // Confirm before sending
      const confirmed = await showConfirm(
        `Send a request to ${targetUserName} for their phone number? They'll be notified and can share it securely via message.`
      );

      if (!confirmed) {
        setSending(false);
        setLoading(false);
        return;
      }

      // Insert request
      const { error: requestError } = await (supabase as any)
        .from('phone_number_requests')
        .insert({
          requester_id: user.id,
          target_user_id: targetUserId,
          request_status: 'pending',
        });

      if (requestError) throw requestError;

      // Get current user display name
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, username')
        .eq('id', user.id)
        .limit(1);

      const displayName = userData?.[0]?.first_name || userData?.[0]?.username || 'Someone';

      // Send notification
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

      setRequestStatus('pending');
      showAlert('Request Sent! 📱', `Your request was sent to ${targetUserName}. You'll get a message if they share their number.`);
    } catch (error: any) {
      console.error('Error sending request:', error);
      showAlert('Error', error.message || 'Failed to send request.');
      setRequestStatus('none');
    } finally {
      setSending(false);
      setLoading(false);
    }
  };

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
      showAlert('Request Approved', 'Now you can enter your phone number to share with ' + targetUserName);
    } catch (error: any) {
      console.error('Error approving request:', error);
      showAlert('Error', 'Failed to approve request.');
    } finally {
      setLoading(false);
    }
  };

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
      showAlert('Request Declined', `You have declined ${targetUserName}'s request.`);
    } catch (error: any) {
      console.error('Error declining request:', error);
      showAlert('Error', 'Failed to decline request.');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!user) return;

    const confirmed = await showConfirm(
      `Are you sure you want to block ${targetUserName}? This will prevent them from contacting you.`
    );

    if (!confirmed) return;

    try {
      const { error } = await (supabase as any)
        .from('blocked_users')
        .insert({
          blocker_id: user.id,
          blocked_id: targetUserId,
        });

      if (error) throw error;

      showAlert('User Blocked', `${targetUserName} has been blocked.`);
    } catch (error: any) {
      console.error('Error blocking user:', error);
      showAlert('Error', 'Failed to block user. Please try again.');
    }
  };

  const handleSharePhoneNumber = async () => {
    if (!user || userRole !== 'target' || !phoneNumber.trim()) {
      showAlert('Invalid Input', 'Please enter a valid phone number.');
      return;
    }

    if (!hasApproved) {
      showAlert('Not Approved', 'Please approve the request first.');
      return;
    }

    setLoading(true);

    try {
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

      const { data: currentUserData } = await (supabase as any)
        .from('users')
        .select('first_name')
        .eq('id', user.id)
        .limit(1);

      await (supabase as any).from('notifications').insert({
        user_id: targetUserId,
        type: 'phone_shared',
        title: 'Phone Number Shared 📞',
        body: `${currentUserData?.[0]?.first_name || 'Someone'} shared their phone number with you.`,
        description: 'Check your private chat for details.',
        related_user_id: user.id,
        read: false,
      });

      setRequestStatus('approved');
      setPhoneNumber('');
      showAlert('Sent! 📞', 'Your phone number has been sent securely in your private chat.');
      (navigation as any).navigate('chat', { id: targetUserId });
    } catch (error: any) {
      console.error('Error sharing phone number:', error);
      showAlert('Error', 'Failed to send phone number. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Target: pending approval UI
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
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.approveButtonText}>Approve</Text>
            )}
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

  // Target: share phone number UI
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
            <Text style={[styles.requestText, { color: '#FF9500' }]}>Pending</Text>
          </>
        ) : requestStatus === 'approved' ? (
          <>
            <IconSymbol name="checkmark.circle.fill" size={20} color="#34C759" />
            <Text style={[styles.requestText, { color: '#34C759' }]}>Approved</Text>
          </>
        ) : requestStatus === 'declined' ? (
          <>
            <IconSymbol name="xmark.circle.fill" size={20} color="#FF3B30" />
            <Text style={[styles.requestText, { color: '#FF3B30' }]}>Declined</Text>
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