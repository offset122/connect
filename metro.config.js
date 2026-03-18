const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");

// Get Expo base config
const config = getDefaultConfig(__dirname);

// -------------------------------
// Enable Metro cache (Turborepo)
// -------------------------------
config.cacheStores = [
  new FileStore({
    root: path.join(__dirname, "node_modules", ".cache", "metro"),
  }),
];

// -------------------------------
// Support react-native-webrtc
// -------------------------------
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react-native-webrtc": require.resolve("react-native-webrtc"),
};

// Custom resolver removed to avoid resolution issues

module.exports = config;
