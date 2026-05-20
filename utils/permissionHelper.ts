// utils/permissionHelper.ts
// Helper utility for checking and requesting permissions

import { Alert, Linking, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';
import * as Notifications from 'expo-notifications';

/**
 * Check and request microphone permission
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Audio.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }
    
    const { status } = await Audio.requestPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Microphone Permission Required',
        'Please enable microphone access in your device settings to make voice and video calls.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
}

/**
 * Check and request camera permission
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Camera.getCameraPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }
    
    const { status } = await Camera.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in your device settings to make video calls.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return false;
  }
}

/**
 * Check and request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === 'granted') {
      return true;
    }
    
    const { status } = await Notifications.requestPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Notification Permission Required',
        'Please enable notifications in your device settings to receive incoming call alerts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Request all call-related permissions at once
 */
export async function requestCallPermissions(callType: 'voice' | 'video' = 'voice'): Promise<{
  microphone: boolean;
  camera: boolean;
  notifications: boolean;
  allGranted: boolean;
}> {
  const results = {
    microphone: false,
    camera: false,
    notifications: false,
    allGranted: false,
  };
  
  // Always request microphone and notifications
  results.microphone = await requestMicrophonePermission();
  results.notifications = await requestNotificationPermission();
  
  // Request camera only for video calls
  if (callType === 'video') {
    results.camera = await requestCameraPermission();
    results.allGranted = results.microphone && results.camera && results.notifications;
  } else {
    results.camera = true; // Not needed for voice calls
    results.allGranted = results.microphone && results.notifications;
  }
  
  return results;
}

/**
 * Show permissions explanation dialog before requesting
 */
export function showPermissionsExplanation(callType: 'voice' | 'video', onContinue: () => void) {
  const permissions = callType === 'video' 
    ? 'microphone, camera, and notification'
    : 'microphone and notification';
    
  Alert.alert(
    'Permissions Required',
    `To make ${callType} calls, we need access to your ${permissions} permissions. This allows you to:\n\n• Speak during calls\n${callType === 'video' ? '• Share your video\n' : ''}• Receive incoming call notifications`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Continue', onPress: onContinue },
    ]
  );
}

/**
 * Check if all required permissions are granted
 */
export async function checkCallPermissions(callType: 'voice' | 'video' = 'voice'): Promise<boolean> {
  try {
    const [audioStatus, notificationStatus, cameraStatus] = await Promise.all([
      Audio.getPermissionsAsync(),
      Notifications.getPermissionsAsync(),
      callType === 'video' ? Camera.getCameraPermissionsAsync() : Promise.resolve({ status: 'granted' }),
    ]);
    
    const micGranted = audioStatus.status === 'granted';
    const notifGranted = notificationStatus.status === 'granted';
    const camGranted = callType === 'video' ? cameraStatus.status === 'granted' : true;
    
    return micGranted && notifGranted && camGranted;
  } catch (error) {
    console.error('Error checking call permissions:', error);
    return false;
  }
}