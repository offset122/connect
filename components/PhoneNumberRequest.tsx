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
    // Web: Use properly formatted alert with line breaks
    const webMessage = message ? `${title}\n\n${message}` : title;
    window.alert(webMessage);
  } else {
    // Native: Use React Native Alert
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
  compact?: boolean;
}

export default function PhoneNumberRequest({
  targetUserName,
  targetUserId,
  compact = false,
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

  // Primary init: wait for a valid session then check status
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.warn('PhoneNumberRequest: no active session on mount, waiting for auth event');
        return;
      }
      await checkRequestStatus();
    };

    init();
  }, [user?.id, targetUserId]);

  // Fallback: pick up session if it wasn't ready on mount
  useEffect(() => {
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && user && !userRole && mounted) {
        await checkRequestStatus();
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [user?.id, targetUserId, userRole]);

  // Poll for status updates while a request is pending
  useEffect(() => {
    let interval: number | null = null;
    if (requestStatus === 'pending') {
      interval = setInterval(() => {
        checkRequestStatus();
      }, 30000) as unknown as number;
    }
    return () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };
  }, [requestStatus, user?.id, targetUserId]);

  const checkRequestStatus = async () => {
    if (!user) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.warn('checkRequestStatus: no session, skipping');
      setRequestStatus('none');
      return;
    }

    try {
      // Use .limit(1) instead of .maybeSingle() to avoid 406 Not Acceptable errors.
      // maybeSingle() sets Accept: application/vnd.pgrst.object+json which causes
      // PostgREST to return 406 when multiple rows exist or the client version mismatches.
      // With .limit(1) we get an array and just read index [0].

      // Check outgoing request first (we sent to them).
      const { data: outgoingRows, error: outgoingError } = await (supabase as any)
        .from('phone_number_requests')
        .select('request_status, requester_id, target_user_id')
        .eq('requester_id', user.id)
        .eq('target_user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (outgoingError) {
        console.error('checkRequestStatus outgoing error:', outgoingError);
      }

      const outgoing = outgoingRows?.[0] ?? null;

      if (outgoing) {
        setUserRole('requester');
        setRequestStatus(outgoing.request_status);
        console.log('checkRequestStatus: outgoing row found', outgoing.request_status);
        return;
      }

      // Check incoming request (they sent to us).
      const { data: incomingRows, error: incomingError } = await (supabase as any)
        .from('phone_number_requests')
        .select('request_status, requester_id, target_user_id')
        .eq('requester_id', targetUserId)
        .eq('target_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (incomingError) {
        console.error('checkRequestStatus incoming error:', incomingError);
      }

      const incoming = incomingRows?.[0] ?? null;

      if (incoming) {
        setUserRole('target');
        setRequestStatus(incoming.request_status);
        // Only show the share form if approved but NOT yet shared
        if (incoming.request_status === 'approved') {
          setHasApproved(true);
        } else {
          // 'shared', 'declined', 'pending' — never show the input form
          setHasApproved(false);
        }
        console.log('checkRequestStatus: incoming row found', incoming.request_status);
        return;
      }

      // No row found in either direction — fresh state
      setRequestStatus('none');
      setUserRole(null);
      console.log('checkRequestStatus: no rows found');
    } catch (err) {
      console.error('checkRequestStatus exception:', err);
      setRequestStatus('none');
    }
  };

  const handlePhoneNumberRequest = async () => {
    // Force immediate console output for web debugging
    if (typeof window !== 'undefined') {
      (window as any).lastPhoneClick = Date.now();
    }
    console.log('%c✅ PHONE BUTTON CLICKED!', 'color: green; font-weight: bold; font-size: 14px;');
    console.log('⏱️ Timestamp:', new Date().toISOString());
    console.log('📊 Full State:', { 
      user: !!user, 
      userId: user?.id,
      targetUserId, 
      targetUserName,
      userRole, 
      requestStatus,
      isWeb: typeof window !== 'undefined',
      loading,
      sending,
      isDisabled: loading || sending || requestStatus === 'pending'
    });
    console.trace('Click stack trace:');

    if (!user) {
      showAlert('Error', 'You must be logged in to make a request.');
      return;
    }

    // Don't block when userRole is null — that just means no row exists yet
    // (i.e. this is a brand new request). Only block if we know they are the target.
    if (userRole === 'target') {
      showAlert('Error', 'You cannot make a phone number request from this account.');
      return;
    }

    if (requestStatus === 'pending') {
      showAlert('⏳ Pending Approval', `Your phone number request to ${targetUserName} is already sent and waiting for their approval.\n\nYou will be notified when they respond.`);
      return;
    }

    if (requestStatus === 'approved') {
      showAlert(
        'Request Approved',
        `${targetUserName} has already shared their phone number in your private chat.`,
      );
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        showAlert('Error', 'Your session has expired. Please log in again.');
        return;
      }

      // Use .limit(1) instead of .maybeSingle() to avoid 406 Not Acceptable errors.
      const { data: existingRows, error: fetchError } = await (supabase as any)
        .from('phone_number_requests')
        .select('request_status')
        .eq('requester_id', user.id)
        .eq('target_user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      const existing = existingRows?.[0] ?? null;

      if (existing) {
        const status = existing.request_status;
        if (status === 'approved') {
          setRequestStatus('approved');
          showAlert(
            '📞 Contact Shared!',
            `${targetUserName} has sent their phone number in your private chat.`,
          );
          return;
        } else if (status === 'pending') {
          setRequestStatus('pending');
          showAlert('⏳ Pending Approval', `Your request is already sent to ${targetUserName}.\n\nIt is currently pending their approval. You will receive a notification when they respond.`);
          return;
        } else if (status === 'declined') {
          setRequestStatus('declined');
          showAlert('Request Declined', `${targetUserName} has declined your request.`);
          return;
        }
      }

      // Confirm before sending - web safe implementation
      let confirmed = false;
      try {
        confirmed = await showConfirm(
          `Send a request to ${targetUserName} for their phone number? They'll be notified and can share it securely via message.`,
        );
      } catch (e) {
        // Fallback for web browsers where confirm might be blocked or unavailable
        confirmed = true;
      }

      if (!confirmed) return;

      // Insert request
      const { error: requestError } = await (supabase as any)
        .from('phone_number_requests')
        .insert({
          requester_id: user.id,
          target_user_id: targetUserId,
          request_status: 'pending',
        })
        .select();

      if (requestError) {
        console.error('❌ REQUEST FAILED WITH FULL ERROR:', requestError);
        console.error('Error Code:', requestError.code);
        console.error('Error Message:', requestError.message);
        console.error('Error Details:', requestError.details);
        console.error('Error Hint:', requestError.hint);
        
        // Gracefully handle duplicate request conflicts
        if (requestError.code === '23505' || requestError.code === '409') {
          setRequestStatus('pending');
          setUserRole('requester');
          showAlert('⏳ Request Already Sent', `Your phone number request to ${targetUserName} is already pending approval.\n\nYou will be notified when they respond.`);
          return;
        }
        // Handle RLS policy errors (this is what's actually happening!)
        if (requestError.code === '42501' || requestError.code === '403') {
          showAlert('Permission Error', 'You do not have permission to send requests right now. Please refresh and try again.');
          return;
        }
        // Handle foreign key / user not found errors
        if (requestError.code === '23503') {
          showAlert('Request Error', 'This user account is no longer available.');
          return;
        }
        throw requestError;
      }

      // Get current user display name
      const { data: userData } = await (supabase as any)
        .from('users')
        .select('first_name, username')
        .eq('id', user.id)
        .limit(1);

      const displayName =
        userData?.[0]?.first_name || userData?.[0]?.username || 'Someone';

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
      setUserRole('requester');
      showAlert(
        '✅ Request Sent!',
        `Your phone number request has been successfully sent to ${targetUserName}.\n\n⏳ Status: Pending Approval\n\nThey will be notified and you will receive an alert once they respond.`
      );
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
      showAlert(
        'Request Approved',
        'Now you can enter your phone number to share with ' + targetUserName,
      );
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
      `Are you sure you want to block ${targetUserName}? This will prevent them from contacting you.`,
    );

    if (!confirmed) return;

    try {
      const { error } = await (supabase as any).from('blocked_users').insert({
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
      const { error: messageError } = await (supabase as any).from('messages').insert({
        sender_id: user.id,
        receiver_id: targetUserId,
        content: `My phone number is: ${phoneNumber}`,
        message_type: 'text',
        status: 'sent',
        is_deleted: false,
      });

      if (messageError) throw messageError;

      // Mark the request as 'shared' so the form never shows again
      await (supabase as any)
        .from('phone_number_requests')
        .update({ request_status: 'shared' })
        .eq('requester_id', targetUserId)
        .eq('target_user_id', user.id);

      // Get current user name safely
      let currentUserName = 'Someone';
      try {
        const { data: currentUserData } = await (supabase as any)
          .from('users')
          .select('first_name')
          .eq('id', user.id)
          .limit(1);
        
        currentUserName = currentUserData?.[0]?.first_name || 'Someone';
      } catch (userError) {
        console.warn('Could not fetch user name for notification:', userError);
      }

      // Send notification - non critical, don't fail whole operation if this fails
      try {
        await (supabase as any).from('notifications').insert({
          user_id: targetUserId,
          title: 'Phone Number Shared 📞',
          body: `${currentUserName} shared their phone number with you.`,
          notification_type: 'phone_shared',
          related_user_id: user.id,
          read: false,
        });
      } catch (notificationError) {
        console.warn('Notification failed, but phone number was sent successfully:', notificationError);
      }

      // Update local state so the form disappears immediately
      setRequestStatus('shared' as any);
      setHasApproved(false);
      setPhoneNumber('');
      showAlert('Sent! 📞', 'Your phone number has been sent securely in your private chat.');
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

  // Target: already shared — show confirmation, no form
  if (userRole === 'target' && (requestStatus as string) === 'shared') {
    return (
      <View style={styles.sharedContainer}>
        <IconSymbol name="checkmark.circle.fill" size={18} color="#34C759" />
        <Text style={styles.sharedText}>Phone number shared</Text>
      </View>
    );
  }

  // Target: share phone number UI (approved but not yet shared)
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

  // Default: requester UI (also shown when no request exists yet)
  const isDisabled = loading || sending || requestStatus === 'pending';
  
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactButton, isDisabled && styles.requestButtonDisabled]}
        onPress={handlePhoneNumberRequest}
        disabled={isDisabled}
      >
        {loading || sending ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : requestStatus === 'pending' ? (
          <IconSymbol name="clock.fill" size={13} color="#FF9500" />
        ) : requestStatus === 'approved' ? (
          <IconSymbol name="checkmark.circle.fill" size={13} color="#34C759" />
        ) : requestStatus === 'declined' ? (
          <IconSymbol name="xmark.circle.fill" size={13} color="#FF3B30" />
        ) : (
          <IconSymbol name="phone.fill" size={13} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  }

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
             <Text style={[styles.requestText, { color: '#FF9500' }]}>Pending Approval</Text>
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
  sharedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#E3FAF0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#34C75940',
  },
  sharedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
    fontFamily: fontFamilies.semibold,
  },
  requestButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  compactButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
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
