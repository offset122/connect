import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { IconSymbol } from '../components/IconSymbol';
import { colors, commonStyles, spacing, borderRadius } from '../styles/commonStyles';
import { supabase } from './integrations/supabase/client';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

// Photo type definitions
export interface ProfilePhotos {
  fullPhoto?: string;
  passportPhoto?: string;
}

// ─── Helper: only accept real HTTP(S) URLs, reject stale file:// URIs ───────
const isValidPhotoUrl = (url?: string | null): boolean => {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

// ─── Helper: append cache-buster so React Native re-fetches updated images ──
const bustCache = (url?: string): string | undefined => {
  if (!url) return undefined;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}t=${Date.now()}`;
};

export default function PhotoGalleryScreen() {
  const params = useLocalSearchParams();
  const userId = params.userId as string;
  const isOwnProfile = params.isOwnProfile === 'true';

  const [photos, setPhotos] = useState<ProfilePhotos>({
    fullPhoto: undefined,
    passportPhoto: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ uri: string; type: string } | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<{ uri: string; type: 'full' | 'passport' } | null>(null);
  const [userName, setUserName] = useState('');

  // ─── useFocusEffect: runs every time screen comes into focus (back nav too) ─
  useFocusEffect(
    useCallback(() => {
      // Only show full-screen loader on first mount; silent refresh on re-focus
      const hasPhotos = photos.fullPhoto || photos.passportPhoto;
      fetchPhotos(!hasPhotos);
      if (!isOwnProfile && userId) {
        fetchUserName();
      }
    }, [userId, isOwnProfile])
  );

  const fetchUserName = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('users')
        .select('first_name')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setUserName(data.first_name || 'User');
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  };

  const fetchPhotos = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const targetUserId = isOwnProfile ? user?.id : userId;

      if (!targetUserId) {
        Alert.alert('Error', 'User not found');
        return;
      }

      // ✅ Check if current user has approved photo access when viewing other profiles
      if (!isOwnProfile && user) {
        const { data: accessCheck } = await supabase
          .from('photo_requests')
          .select('request_status')
          .eq('requester_id', user.id)
          .eq('target_user_id', targetUserId)
          .eq('request_status', 'approved')
          .maybeSingle();

        if (!accessCheck) {
          setPhotos({ fullPhoto: undefined, passportPhoto: undefined });
          setLoading(false);
          return;
        }
      }

      const { data, error } = await (supabase as any)
        .from('users')
        .select('full_photo, passport_photo')
        .eq('id', targetUserId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Reject stale local file:// URIs — store clean URLs in state
        setPhotos({
          fullPhoto: isValidPhotoUrl(data.full_photo) ? data.full_photo : undefined,
          passportPhoto: isValidPhotoUrl(data.passport_photo) ? data.passport_photo : undefined,
        });
      } else {
        setPhotos({ fullPhoto: undefined, passportPhoto: undefined });
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      Alert.alert('Error', 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type: 'full' | 'passport') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        setPendingPhoto({ uri: result.assets[0].uri, type });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSavePhoto = async () => {
    if (!pendingPhoto) return;
    await uploadPhoto(pendingPhoto.uri, pendingPhoto.type);
    setPendingPhoto(null);
  };

  const handleCancelPhoto = () => {
    setPendingPhoto(null);
  };

  // ─── Upload using FormData — works correctly on iOS & Android ──────────────
  // The old approach (fetch → blob → arrayBuffer → Uint8Array) fails on mobile
  // because React Native's fetch polyfill does not implement blob.arrayBuffer()
  // reliably. FormData with a { uri, name, type } object is the correct RN pattern.
  const uploadPhoto = async (uri: string, type: 'full' | 'passport') => {
    try {
      setUploading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      // Derive extension from URI (ImagePicker typically returns .jpg/.jpeg/.png)
      const uriParts = uri.split('.');
      const rawExt = uriParts[uriParts.length - 1]?.toLowerCase();
      const ext = rawExt === 'png' ? 'png' : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      // ✅ React Native supports FormData with file:// URIs natively.
      // The networking layer reads the file from disk and encodes it correctly.
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: `${type}.${ext}`,
        type: mimeType,
      } as any);

      // Unique path per user + type so upsert always overwrites the same slot
      const filePath = `${user.id}/${type}.${ext}`;

      // Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, formData, {
          contentType: mimeType,
          upsert: true,
        });

      if (storageError) throw storageError;

      // Get the permanent public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('profile-photos').getPublicUrl(filePath);

      if (!publicUrl) throw new Error('Failed to get public URL from storage');

      // Persist the public URL in the DB
      const column = type === 'full' ? 'full_photo' : 'passport_photo';
      const { error: dbError } = await (supabase as any)
        .from('users')
        .update({ [column]: publicUrl })
        .eq('id', user.id);

      if (dbError) throw dbError;

      // Update local state with clean URL (bust cache so RN re-fetches the image)
      const cachedUrl = bustCache(publicUrl) ?? publicUrl;
      if (type === 'full') {
        setPhotos(prev => ({ ...prev, fullPhoto: cachedUrl }));
      } else {
        setPhotos(prev => ({ ...prev, passportPhoto: cachedUrl }));
      }

      Alert.alert('Success', 'Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (type: 'full' | 'passport') => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return;

            const column = type === 'full' ? 'full_photo' : 'passport_photo';

            const { error } = await (supabase as any)
              .from('users')
              .update({ [column]: null })
              .eq('id', user.id);

            if (error) throw error;

            // Optionally also remove from storage (best-effort; ignore errors)
            const ext = type === 'full'
              ? photos.fullPhoto?.split('.').pop()
              : photos.passportPhoto?.split('.').pop();
            if (ext) {
              await supabase.storage
                .from('profile-photos')
                .remove([`${user.id}/${type}.${ext}`])
                .catch(() => {});
            }

            if (type === 'full') {
              setPhotos(prev => ({ ...prev, fullPhoto: undefined }));
            } else {
              setPhotos(prev => ({ ...prev, passportPhoto: undefined }));
            }

            setSelectedPhoto(null);
            Alert.alert('Success', 'Photo deleted successfully');
          } catch (error) {
            console.error('Error deleting photo:', error);
            Alert.alert('Error', 'Failed to delete photo');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
        <View style={[commonStyles.centerContent, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[commonStyles.text, { marginTop: 16 }]}>Loading photos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasBothPhotos = photos.fullPhoto && photos.passportPhoto;

  return (
    <SafeAreaView style={commonStyles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {isOwnProfile ? 'My Photos' : `${userName}'s Photos`}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* ── Own Profile Upload Section ── */}
          {isOwnProfile && (
            <View style={styles.uploadSection}>
              <Text style={styles.sectionTitle}>Profile Photos</Text>
              <Text style={styles.sectionSubtitle}>
                Upload your full photo and passport size photo
              </Text>

              <View style={styles.photoRow}>
                {/* Full Photo */}
                <View style={styles.photoContainer}>
                  {photos.fullPhoto ? (
                    <Pressable
                      style={styles.photoFrame}
                      onPress={() => setSelectedPhoto({ uri: photos.fullPhoto!, type: 'full' })}
                    >
                      <Image source={{ uri: photos.fullPhoto }} style={styles.photoImage} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.photoOverlay}
                      >
                        <Pressable
                          style={styles.deleteButton}
                          onPress={e => {
                            e.stopPropagation();
                            deletePhoto('full');
                          }}
                        >
                          <IconSymbol name="trash.fill" size={18} color={colors.card} />
                        </Pressable>
                      </LinearGradient>
                      <View style={styles.photoBadge}>
                        <Text style={styles.photoBadgeText}>Full</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.photoFrame, styles.addPhotoFrame]}
                      onPress={() => pickImage('full')}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                      ) : (
                        <>
                          <IconSymbol name="person.fill" size={40} color={colors.primary} />
                          <Text style={styles.addPhotoText}>Full Photo</Text>
                          <Text style={styles.addPhotoHint}>Body shot</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>

                {/* Passport Photo */}
                <View style={styles.photoContainer}>
                  {photos.passportPhoto ? (
                    <Pressable
                      style={styles.photoFrame}
                      onPress={() =>
                        setSelectedPhoto({ uri: photos.passportPhoto!, type: 'passport' })
                      }
                    >
                      <Image source={{ uri: photos.passportPhoto }} style={styles.photoImage} />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.7)']}
                        style={styles.photoOverlay}
                      >
                        <Pressable
                          style={styles.deleteButton}
                          onPress={e => {
                            e.stopPropagation();
                            deletePhoto('passport');
                          }}
                        >
                          <IconSymbol name="trash.fill" size={18} color={colors.card} />
                        </Pressable>
                      </LinearGradient>
                      <View style={styles.photoBadge}>
                        <Text style={styles.photoBadgeText}>Passport</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.photoFrame, styles.addPhotoFrame]}
                      onPress={() => pickImage('passport')}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                      ) : (
                        <>
                          <IconSymbol
                            name="person.crop.rectangle.fill"
                            size={40}
                            color={colors.primary}
                          />
                          <Text style={styles.addPhotoText}>Passport</Text>
                          <Text style={styles.addPhotoHint}>Face photo</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Upload status */}
              {hasBothPhotos ? (
                <View style={styles.statusContainer}>
                  <IconSymbol name="checkmark.circle.fill" size={24} color={colors.success} />
                  <Text style={styles.statusText}>Both photos uploaded!</Text>
                </View>
              ) : (
                <View style={styles.statusContainer}>
                  <IconSymbol
                    name="exclamationmark.circle.fill"
                    size={24}
                    color={colors.warning}
                  />
                  <Text style={styles.statusText}>
                    {!photos.fullPhoto && !photos.passportPhoto
                      ? 'Please upload both photos'
                      : !photos.fullPhoto
                      ? 'Please upload your full photo'
                      : 'Please upload your passport photo'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── View Mode – other profiles ── */}
          {!isOwnProfile && (photos.fullPhoto || photos.passportPhoto) && (
            <View style={styles.viewSection}>
              <View style={styles.photoRow}>
                {photos.fullPhoto && (
                  <View style={styles.photoContainer}>
                    <Pressable
                      style={styles.photoFrame}
                      onPress={() =>
                        setSelectedPhoto({ uri: photos.fullPhoto!, type: 'full' })
                      }
                    >
                      <Image source={{ uri: photos.fullPhoto }} style={styles.photoImage} />
                      <View style={styles.photoBadge}>
                        <Text style={styles.photoBadgeText}>Full</Text>
                      </View>
                    </Pressable>
                  </View>
                )}

                {photos.passportPhoto && (
                  <View style={styles.photoContainer}>
                    <Pressable
                      style={styles.photoFrame}
                      onPress={() =>
                        setSelectedPhoto({ uri: photos.passportPhoto!, type: 'passport' })
                      }
                    >
                      <Image source={{ uri: photos.passportPhoto }} style={styles.photoImage} />
                      <View style={styles.photoBadge}>
                        <Text style={styles.photoBadgeText}>Passport</Text>
                      </View>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Empty state ── */}
          {!photos.fullPhoto && !photos.passportPhoto && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <IconSymbol name="photo.stack" size={64} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {isOwnProfile ? 'No Photos Yet' : 'No Photos Available'}
              </Text>
              <Text style={styles.emptyText}>
                {isOwnProfile
                  ? 'Add your full photo and passport photo to complete your profile'
                  : `${userName} hasn't uploaded any photos yet`}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── Full-screen Photo Viewer Modal ── */}
        <Modal
          visible={selectedPhoto !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedPhoto(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedPhoto(null)}>
            <View style={styles.modalContent}>
              <Pressable style={styles.closeButton} onPress={() => setSelectedPhoto(null)}>
                <IconSymbol name="xmark.circle.fill" size={36} color={colors.card} />
              </Pressable>
              {selectedPhoto && (
                <Image
                  source={{ uri: selectedPhoto.uri }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              )}
              {selectedPhoto && (
                <View style={styles.photoTypeIndicator}>
                  <Text style={styles.photoTypeText}>
                    {selectedPhoto.type === 'full' ? 'Full Photo' : 'Passport Photo'}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </Modal>

        {/* ── Photo Preview & Confirmation Modal ── */}
        <Modal
          visible={pendingPhoto !== null}
          transparent
          animationType="slide"
          onRequestClose={handleCancelPhoto}
        >
          <View style={styles.previewModalOverlay}>
            <View style={styles.previewModalContent}>
              <Text style={styles.previewTitle}>Confirm Photo</Text>

              {pendingPhoto && (
                <Image
                  source={{ uri: pendingPhoto.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}

              <View style={styles.previewActions}>
                <Pressable
                  style={[styles.previewButton, styles.cancelButton]}
                  onPress={handleCancelPhoto}
                  disabled={uploading}
                >
                  <IconSymbol name="xmark.circle.fill" size={20} color={colors.error} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.previewButton, styles.saveButton]}
                  onPress={handleSavePhoto}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={colors.card} />
                  ) : (
                    <>
                      <IconSymbol name="checkmark.circle.fill" size={20} color={colors.card} />
                      <Text style={styles.saveButtonText}>Save Photo</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  uploadSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  photoContainer: {
    alignItems: 'center',
  },
  photoFrame: {
    width: 150,
    height: 200,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  addPhotoFrame: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  addPhotoText: {
    marginTop: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  addPhotoHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    alignItems: 'flex-end',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  photoBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.card,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  viewSection: {
    marginBottom: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
  photoTypeIndicator: {
    position: 'absolute',
    bottom: 60,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  photoTypeText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.card,
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  previewModalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxHeight: '90%',
    padding: spacing.lg,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  previewImage: {
    width: '100%',
    height: 350,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cancelButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  saveButton: {
    backgroundColor: colors.success,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.card,
  },
});