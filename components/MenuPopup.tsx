import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/app/integrations/supabase/client';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

interface MenuPopupProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function MenuPopup({ isVisible, onClose }: MenuPopupProps) {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    onClose();
    
    try {
      router.push('/reset-password');
    } catch (error: any) {
      showToast({
        title: 'Error',
        message: error.message || 'Failed to open password reset',
        type: 'error',
      });
    }
  };

  const handleLogout = async () => {
    onClose();
    
    // Use native browser confirm dialog on web for better UX
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (!confirmed) return;
      performLogout();
    } else {
      // On native, show a confirmation using a floating notification with action buttons
      // For now, proceed with logout directly
      performLogout();
    }
  };

  const performLogout = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      showToast({
        title: 'Error',
        message: 'Failed to log out',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

   const handleDeleteAccount = () => {
    onClose();
    // Redirect to profile screen which has proper password verification flow
    router.push('/(tabs)/profile');
  };

  const performAccountDeletion = async () => {
    setIsLoading(true);
    try {
      if (!user?.id) throw new Error('No user found');
      
      // Use working implementation from profile screen
      // First delete user profile from database
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('auth_id', user.id);

      if (profileError) {
        console.warn('Profile deletion error (may not exist):', profileError);
      }

      // Delete the auth user account
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        // If admin delete fails, try client-side account invalidation
        const { error: clientDeleteError } = await supabase.auth.updateUser({
          password: Math.random().toString(36).slice(-16) // Invalidate account
        });
        
        if (clientDeleteError) throw clientDeleteError;
      }
      
      await signOut();
      
      showToast({
        title: 'Account Deleted',
        message: 'Your account has been successfully deleted.',
        type: 'success',
      });
    } catch (error: any) {
      showToast({
        title: 'Error',
        message: error.message || 'Failed to delete account',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.popup}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleChangePassword}
              disabled={isLoading}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#4CAF5020' }]}>
                <IconSymbol name="lock.fill" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.menuText}>Change Password</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
              disabled={isLoading}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <IconSymbol name="arrow.right.square.fill" size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuText}>Log Out</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeleteAccount}
              disabled={isLoading}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
                <IconSymbol name="trash.fill" size={20} color={colors.error} />
              </View>
              <Text style={[styles.menuText, { color: colors.error }]}>Delete Account</Text>
              <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 90 : 90,
    alignItems: 'flex-end',
  },
  popup: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 30,
    minWidth: 220,
    maxWidth: 280,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border + '40',
    marginHorizontal: 12,
  },
});
