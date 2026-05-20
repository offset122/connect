import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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
          <Pressable 
            style={styles.connectButton} 
            onPress={onConnect}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={`Connect with ${targetUserName}`}
            accessibilityHint="Sends a connection request to this user"
          >
            <View style={styles.actionContent}>
              <IconSymbol name="heart.fill" size={24} color={colors.card} />
              <Text style={styles.actionText}>Connect</Text>
            </View>
          </Pressable>
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
            <Pressable 
              style={styles.messageButton} 
              onPress={onMessage}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={`Message ${targetUserName}`}
              accessibilityHint="Opens chat window with this user"
            >
              <View style={styles.actionContent}>
                <IconSymbol name="message.fill" size={20} color={colors.card} />
                <Text style={styles.actionText}>Message</Text>
              </View>
            </Pressable>
            <Pressable 
              style={styles.photoButton} 
              onPress={onRequestPhoto}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={`Request photos from ${targetUserName}`}
              accessibilityHint="Sends a photo request to this user"
            >
              <View style={styles.actionContent}>
                <IconSymbol name="photo.fill" size={20} color={colors.primary} />
                <Text style={styles.photoText}>Request Photos</Text>
              </View>
            </Pressable>
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
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
    minHeight: 56,
    zIndex: 10,
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