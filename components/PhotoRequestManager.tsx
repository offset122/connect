import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors, spacing, borderRadius } from '../styles/commonStyles';
import { supabase } from '../app/integrations/supabase/client';
import { router } from 'expo-router';
import { notificationService } from '../utils/notificationService';

type PhotoRequest = {
  id: string;
  requester_id: string;
  requester_auth_id?: string;
  target_user_id: string;
  request_status: 'pending' | 'approved' | 'declined';
  created_at: string;
  requester_name?: string;
};

export default function PhotoRequestManager() {
  const [requests, setRequests] = useState<PhotoRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotoRequests();
  }, []);

  const fetchPhotoRequests = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch photo requests where current user is the target
      const { data: requestsData, error: requestsError } = await supabase
        .from('photo_requests')
        .select('*')
        .eq('target_user_id', user.id)
        .eq('request_status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      if (requestsData && requestsData.length > 0) {
        // Fetch requester names AND auth_ids so we can send notifications correctly
        const requesterIds = requestsData.map((req: any) => req.requester_id);
        const { data: usersData } = await supabase
          .from('users')
          .select('id, first_name, auth_id')
          .in('id', requesterIds);

        const requestsWithNames = requestsData.map((req: any) => {
          const requesterUser = usersData?.find((u: any) => u.id === req.requester_id);
          return {
            ...req,
            requester_name: requesterUser?.first_name || 'Someone',
            requester_auth_id: requesterUser?.auth_id ?? req.requester_id,
          };
        });

        setRequests(requestsWithNames);
      }
    } catch (error) {
      console.error('Error fetching photo requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, requesterId: string, requesterAuthId: string) => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('photo_requests')
        .update({ request_status: 'approved' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Get current user (the approver / target of the original request)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('id, first_name')
        .eq('auth_id', user.id)
        .single();

      if (userData) {
        // Grant the approver automatic access to the requester's photos too.
        // Upsert so we don't create duplicates if a reverse request already exists.
        await supabase
          .from('photo_requests')
          .upsert(
            {
              requester_id: userData.id,       // approver is now the requester
              target_user_id: requesterId,     // original requester becomes the target
              request_status: 'approved',
            },
            { onConflict: 'requester_id,target_user_id', ignoreDuplicates: false }
          );

        const approveBody = `${userData.first_name || 'Someone'} approved your photo request. You can now view their photos — and they can view yours!`;

        await supabase
          .from('notifications')
          .insert({
            user_id: requesterAuthId,   // auth UUID — NOT the DB row id
            title: '✅ Photo Request Approved!',
            body: approveBody,
            read: false,
            data: {
              type: 'photo_request_approved',
              notification_type: 'photo_request_approved',
              related_user_id: user.id,
            },
          });

        // Local push for when app is in foreground
        await notificationService.showAppNotification({
          title: '✅ Photo Request Approved!',
          body: approveBody,
          type: 'photo_request_approved',
          data: { requestId, targetUserId: user.id },
        });
      }

      Alert.alert('Approved', 'Photo request approved. You both now have access to each other\'s photos!');
      fetchPhotoRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Failed to approve request');
    }
  };

  const handleDecline = async (requestId: string, requesterId: string, requesterAuthId: string) => {
    try {
      const { error } = await supabase
        .from('photo_requests')
        .update({ request_status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      // Create notification — use requesterAuthId (auth UUID)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('first_name')
          .eq('id', user.id)
          .single();

        const declineBody = `${userData?.first_name || 'Someone'} declined your photo request.`;

        await supabase
          .from('notifications')
          .insert({
            user_id: requesterAuthId,   // auth UUID — NOT the DB row id
            title: '❌ Photo Request Declined',
            body: declineBody,
            read: false,
            data: {
              type: 'photo_request_declined',
              notification_type: 'photo_request_declined',
              related_user_id: user.id,
            },
          });

        await notificationService.showAppNotification({
          title: '❌ Photo Request Declined',
          body: declineBody,
          type: 'photo_request_declined',
          data: { requestId, targetUserId: user.id },
        });
      }

      Alert.alert('Declined', 'Photo request declined');
      fetchPhotoRequests();
    } catch (error) {
      console.error('Error declining request:', error);
      Alert.alert('Error', 'Failed to decline request');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Photo Requests ({requests.length})</Text>
      {requests.map((request) => (
        <View key={request.id} style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <IconSymbol name="photo.stack" size={24} color={colors.primary} />
            <View style={styles.requestInfo}>
              <Text style={styles.requesterName}>{request.requester_name}</Text>
              <Text style={styles.requestText}>wants to view your photos</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <Pressable
              style={styles.approveButton}
              onPress={() => handleApprove(request.id, request.requester_id, request.requester_auth_id ?? request.requester_id)}
            >
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.card} />
              <Text style={styles.approveButtonText}>Approve</Text>
            </Pressable>
            <Pressable
              style={styles.declineButton}
              onPress={() => handleDecline(request.id, request.requester_id, request.requester_auth_id ?? request.requester_id)}
            >
              <IconSymbol name="xmark.circle.fill" size={20} color={colors.error} />
              <Text style={styles.declineButtonText}>Decline</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  requestCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  requestInfo: {
    flex: 1,
  },
  requesterName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  requestText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.card,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
});