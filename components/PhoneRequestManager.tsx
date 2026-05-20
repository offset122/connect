import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors, spacing, borderRadius } from '../styles/commonStyles';
import { supabase } from '../app/integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

type PhoneRequest = {
  id: string;
  requester_id: string;
  target_user_id: string;
  request_status: 'pending' | 'approved' | 'declined';
  created_at: string;
  requester_name?: string;
};

export default function PhoneRequestManager() {
  const [requests, setRequests] = useState<PhoneRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneInputModal, setPhoneInputModal] = useState<{
    visible: boolean;
    requestId: string;
    requesterId: string;
    requesterName: string;
    phoneNumber: string;
    loading: boolean;
  }>({
    visible: false,
    requestId: '',
    requesterId: '',
    requesterName: '',
    phoneNumber: '',
    loading: false,
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPhoneRequests();
    }
  }, [user]);

  const fetchPhoneRequests = async () => {
    try {
      setLoading(true);

      if (!user) return;

      // Fetch pending phone requests where current user is the target
      const { data: requestsData, error: requestsError } = await (supabase as any)
        .from('phone_number_requests')
        .select('*')
        .eq('target_user_id', user.id)
        .eq('request_status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch requester names
      if (requestsData && requestsData.length > 0) {
        const requesterIds = requestsData.map((req: any) => req.requester_id);
        const { data: usersData } = await (supabase as any)
          .from('users')
          .select('id, first_name, username')
          .in('id', requesterIds);

        const enrichedRequests = requestsData.map((req: any) => {
          const requester = usersData?.find((u: any) => u.id === req.requester_id);
          return {
            ...req,
            requester_name: requester?.first_name || requester?.username || 'Someone',
          };
        });

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching phone requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, requesterId: string, requesterName: string) => {
    setPhoneInputModal({
      visible: true,
      requestId,
      requesterId,
      requesterName,
      phoneNumber: '',
      loading: false,
    });
  };

  const handleSendPhoneNumber = async () => {
    if (!user) return;

    const { requestId, requesterId, requesterName, phoneNumber } = phoneInputModal;

    if (!phoneNumber.trim()) {
      Alert.alert('Invalid Input', 'Please enter a valid phone number.');
      return;
    }

    setPhoneInputModal(prev => ({ ...prev, loading: true }));

    try {
      // First send the actual phone number message - THIS IS THE CRITICAL OPERATION
      const { error: messageError } = await (supabase as any)
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: requesterId,
          content: `📱 My phone number is: ${phoneNumber}`,
          status: 'sent',
          is_deleted: false,
          created_at: new Date().toISOString(),
        });

      // FAIL HARD IF MESSAGE COULD NOT BE SENT - this is what the user cares about most
      if (messageError) throw messageError;

      // Only update request status AFTER message was successfully sent
      const { error: updateError } = await (supabase as any)
        .from('phone_number_requests')
        .update({ request_status: 'approved' })
        .eq('id', requestId);

      if (updateError) {
        console.warn('Request status could not be updated, but phone number was sent successfully:', updateError);
        // Continue execution - request already completed from user perspective
      }

      // Get current user's name.
      // Use .limit(1) instead of .single() to avoid 406 Not Acceptable errors.
      // .single() sends Accept: application/vnd.pgrst.object+json which causes
      // PostgREST to return 406 when there are 0 or >1 matching rows.
      let currentUserName = 'Someone';
      try {
        const { data: currentUserRows } = await (supabase as any)
          .from('users')
          .select('first_name, username')
          .eq('id', user.id)
          .limit(1);

        const currentUserData = currentUserRows?.[0] ?? null;
        currentUserName = currentUserData?.first_name || currentUserData?.username || 'Someone';
      } catch (userFetchError) {
        console.warn('Could not fetch user name, using default:', userFetchError);
      }

      // Create notification for requester - non-critical operation, don't fail whole flow if this fails
      try {
        await (supabase as any)
          .from('notifications')
          .insert({
            user_id: requesterId,
            title: 'Phone Number Shared! 📱',
            body: `${currentUserName} shared their phone number with you. Check your messages.`,
            notification_type: 'phone_response',
            related_user_id: user.id,
            read: false,
          });
      } catch (notificationError) {
        console.warn('Could not send notification, but phone number was shared successfully:', notificationError);
        // Continue execution - notification failure should not block the main action
      }

      // Close modal and reset
      setPhoneInputModal({
        visible: false,
        requestId: '',
        requesterId: '',
        requesterName: '',
        phoneNumber: '',
        loading: false,
      });

      Alert.alert('Sent! 📞', `Phone number shared with ${requesterName}`);

      // Remove from list
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error: any) {
      console.error('Error sending phone number:', error);
      Alert.alert('Error', 'Failed to send phone number. Please try again.');
      setPhoneInputModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDecline = async (requestId: string, requesterId: string, requesterName: string) => {
    try {
      // Update request status
      const { error: updateError } = await (supabase as any)
        .from('phone_number_requests')
        .update({ request_status: 'declined' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Get current user's name.
      // Use .limit(1) instead of .single() to avoid 406 Not Acceptable errors.
      const { data: currentUserRows } = await (supabase as any)
        .from('users')
        .select('first_name, username')
        .eq('id', user?.id)
        .limit(1);

      const currentUserData = currentUserRows?.[0] ?? null;
      const currentUserName = currentUserData?.first_name || currentUserData?.username || 'Someone';

      // Create notification for requester
      await (supabase as any)
        .from('notifications')
        .insert({
          user_id: requesterId,
          title: 'Phone Number Request Declined',
          body: `${currentUserName} declined your phone number request.`,
          notification_type: 'phone_response',
          type: 'phone_response',
          related_user_id: user?.id,
          read: false,
        });

      Alert.alert('Declined', `Request from ${requesterName} has been declined`);

      // Remove from list
      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error: any) {
      console.error('Error declining request:', error);
      Alert.alert('Error', error.message || 'Failed to decline request');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Phone Number Requests</Text>
      <ScrollView style={styles.requestsList}>
        {requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.iconContainer}>
                <IconSymbol name="phone.fill" size={20} color={colors.primary} />
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requesterName}>{request.requester_name}</Text>
                <Text style={styles.requestText}>wants your phone number</Text>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <Pressable
                style={styles.approveButton}
                onPress={() => handleApprove(request.id, request.requester_id, request.requester_name || 'Someone')}
              >
                <IconSymbol name="checkmark" size={18} color={colors.card} />
                <Text style={styles.approveButtonText}>Share</Text>
              </Pressable>

              <Pressable
                style={styles.declineButton}
                onPress={() => handleDecline(request.id, request.requester_id, request.requester_name || 'Someone')}
              >
                <IconSymbol name="xmark" size={18} color={colors.error} />
                <Text style={styles.declineButtonText}>Decline</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Phone Number Input Modal */}
      {phoneInputModal.visible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share Phone Number</Text>
            <Text style={styles.modalSubtitle}>
              Enter your phone number to share with {phoneInputModal.requesterName}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>📱 Phone Number</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="e.g. +254 712 345 678"
                value={phoneInputModal.phoneNumber}
                onChangeText={(text) => setPhoneInputModal(prev => ({ ...prev, phoneNumber: text }))}
                keyboardType="phone-pad"
                editable={!phoneInputModal.loading}
                autoFocus={true}
                maxLength={15}
                placeholderTextColor={colors.textSecondary + '80'}
              />
              <Text style={styles.inputHint}>
                Include country code for international numbers
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setPhoneInputModal({
                  visible: false,
                  requestId: '',
                  requesterId: '',
                  requesterName: '',
                  phoneNumber: '',
                  loading: false,
                })}
                disabled={phoneInputModal.loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.sendButton, phoneInputModal.loading && styles.disabledButton]}
                onPress={handleSendPhoneNumber}
                disabled={phoneInputModal.loading}
              >
                {phoneInputModal.loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendButtonText}>Send Phone Number</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  requestsList: {
    maxHeight: 300,
  },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary + '30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  requestInfo: {
    flex: 1,
  },
  requesterName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  requestText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.card,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.error,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'auto',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    margin: spacing.lg,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    letterSpacing: 0.3,
  },
  phoneInput: {
    borderWidth: 2,
    borderColor: colors.primary + '40',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: 17,
    backgroundColor: colors.background,
    color: colors.text,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  sendButton: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    borderWidth: 0,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
    letterSpacing: 0.5,
  },
  disabledButton: {
    opacity: 0.5,
    shadowOpacity: 0.1,
    elevation: 1,
  },
});
