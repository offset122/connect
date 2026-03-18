import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { IconSymbol } from './IconSymbol';
import { colors, fontFamilies } from '@/styles/commonStyles';

interface ConnectionActionsProps {
  targetUserName: string;
  targetUserId: string;
  connectionStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  onConnect?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onMessage?: () => void;
  onRequestPhoto?: () => void;
}

export default function ConnectionActions({ 
  targetUserName, 
  targetUserId, 
  connectionStatus = 'none',
  onConnect,
  onAccept,
  onDecline,
  onMessage,
  onRequestPhoto 
}: ConnectionActionsProps) {
  
  const renderActions = () => {
    switch (connectionStatus) {
      case 'none':
        return (
          <TouchableOpacity style={styles.connectButton} onPress={onConnect}>
            <IconSymbol name="heart.fill" size={24} color={colors.card} />
          </TouchableOpacity>
        );
        
      case 'pending':
        return (
          <View style={styles.pendingContainer}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
            <Text style={styles.pendingText}>Sent</Text>
          </View>
        );
        
      case 'accepted':
        return (
          <View style={styles.acceptedContainer}>
            <TouchableOpacity style={styles.messageButton} onPress={onMessage}>
              <View style={styles.actionContent}>
                <IconSymbol name="message.fill" size={20} color={colors.card} />
                <Text style={styles.actionText}>Message</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={onRequestPhoto}>
              <View style={styles.actionContent}>
                <IconSymbol name="photo.fill" size={20} color={colors.primary} />
                <Text style={styles.photoText}>Request Photos</Text>
              </View>
            </TouchableOpacity>
          </View>
        );
        
      case 'rejected':
        return (
          <View style={styles.rejectedContainer}>
            <Text style={styles.rejectedText}>Request Declined</Text>
            <Text style={styles.rejectedSubtext}>You cannot message or view this profile</Text>
          </View>
        );
        
      default:
        return null;
    }
  };

  return <>{renderActions()}</>;
}

const styles = StyleSheet.create({
  connectButton: {
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
    fontFamily: fontFamilies.semibold,
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.success + '40',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  pendingText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fontFamilies.semibold,
  },
  acceptedContainer: {
    marginTop: 16,
    gap: 12,
  },
  messageButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  photoButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  photoText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    fontFamily: fontFamilies.semibold,
  },
  rejectedContainer: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  rejectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    fontFamily: fontFamilies.semibold,
  },
  rejectedSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: fontFamilies.regular,
    marginTop: 4,
    textAlign: 'center',
  },
});