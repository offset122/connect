# Android Installation Error Fix Guide

## Problem: "Error parsing package" when installing APK

This error typically occurs due to one of these issues:

## **Common Causes & Solutions:**

### 1. **APK Download Issues**
- **Problem**: Corrupted APK download
- **Solution**: 
  - Re-download the APK from the Expo build link
  - Try downloading on a different device/browser
  - Use a different internet connection

### 2. **Device Android Version**
- **Problem**: APK not compatible with target Android version
- **Solution**: 
  - Check your target device's Android version (Settings > About)
  - EAS builds typically support Android 6.0+ (API level 23+)
  - If device is too old, consider updating Android or using a newer device

### 3. **Installation Permissions**
- **Problem**: Device blocking installation from unknown sources
- **Solution**: 
  - Go to Settings > Security > Unknown Sources (enable)
  - OR Settings > Apps > Special Access > Install Unknown Apps (enable for browser/file manager)
  - Try installing again

### 4. **Package Name Conflicts**
- **Problem**: Device already has an app with same package name
- **Solution**: 
  - Uninstall any existing "Hanna's Connect" or similar apps
  - Clear device cache and try again

### 5. **Build Configuration Issues**
The current build uses:
- **Package Name**: `com.hannas.connect`
- **Version Code**: 5
- **Target SDK**: Latest Android SDK

## **Immediate Fixes to Try:**

### Option A: Fresh Build with Different Configuration
Create a new build with simplified settings:

### Option B: Manual APK Installation Steps
1. **Enable Developer Options**: 
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings > Developer Options
   - Enable "USB Debugging" and "Install via USB"

2. **Clear Everything**:
   - Clear browser cache
   - Re-download APK
   - Restart device
   - Try installation again

3. **Alternative Installation Method**:
   - Send APK via email/WhatsApp to target device
   - Use file manager to locate and install APK

## **Build Configuration Review:**

Current `app.json` settings look correct:
- Package: `com.hannas.connect`
- Version: `1.0.0`
- Version Code: `5`

## **Next Steps:**

1. Try the basic fixes above
2. If still failing, we can create a new build with different settings
3. Consider building for a specific Android version target

**Current Build URL**: 
https://expo.dev/accounts/clemooffset/projects/hannas-connect-iqookc/builds/60f8e4ad-9087-4314-b684-db6fa315ca0a