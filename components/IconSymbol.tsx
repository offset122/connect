// This file is a fallback for using MaterialIcons on Android and web.

import React from "react";
import { SymbolWeight } from "expo-symbols";
import {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.

  // Navigation & Home
  "house.fill": "home",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "arrow.up": "arrow-upward",
  "arrow.down": "arrow-downward",
  "chevron.left": "chevron-left",
  "chevron.right": "chevron-right",
  "chevron.up": "keyboard-arrow-up",
  "chevron.down": "keyboard-arrow-down",
  "arrow.clockwise": "refresh",

  // Communication & Social
  "paperplane.fill": "send",
  "envelope.fill": "mail",
  "phone.fill": "phone",
  "message.fill": "chat",
  "bell.fill": "notifications",
  "heart.fill": "favorite",

  // Actions & Controls
  "plus": "add",
  "minus": "remove",
  "xmark": "close",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "checkmark.circle": "check-circle-outline",
  "checkmark.square.fill": "check-box",
  "checkmark.square": "check-box-outline-blank",
  "multiply": "clear",
  "trash.fill": "delete",
  "trash": "delete-outline",

  // Editing & Creation
  "pencil": "edit",
  "pencil.and.list.clipboard": "edit-note",
  "square.and.pencil": "edit",
  "doc.text.fill": "description",
  "doc.text": "description",
  "folder.fill": "folder",
  "doc.fill": "insert-drive-file",

  // Media & Content
  "photo.fill": "image",
  "camera.fill": "camera-alt",
  "video.fill": "videocam",
  "video.slash.fill": "videocam-off",
  "phone.arrow.up.right.fill": "call-made",
  "person.fill.viewfinder": "person",
  "plus.magnifyingglass": "add",
  "plus.circle.fill": "add-circle",
  "xmark.circle.fill": "cancel",
  "phone.down.fill": "call-end",
  "mic.slash.fill": "mic-off",
  "mic.fill": "mic",
  "speaker.wave.3.fill": "volume-up",
  "speaker.fill": "volume-up",
  "pause.circle.fill": "pause-circle",
  "pause.circle": "pause-circle-outline",
  "camera.rotate.fill": "switch-camera",
  "music.note": "music-note",
  "speaker.wave.2.fill": "volume-up",
  "speaker.slash.fill": "volume-off",
  "play.fill": "play-arrow",
  "pause.fill": "pause",

  // System & Settings
  "gear": "settings",
  "gearshape.fill": "settings",
  "slider.horizontal.3": "tune",
  "line.horizontal.3": "menu",
  "list.bullet": "menu",
  "info.circle.fill": "info",
  "exclamationmark.triangle.fill": "warning",
  "exclamationmark.triangle": "warning-amber",
  "questionmark.circle.fill": "help",
  "questionmark.circle": "help-outline",

  // Shapes & Symbols
  "square": "square",
  "square.grid.3x3": "apps",
  "circle": "circle",
  "triangle.fill": "change-history",
  "star.fill": "star",
  "bookmark.fill": "bookmark",

  // Technology & Code
  "chevron.left.forwardslash.chevron.right": "code",
  "qrcode.viewfinder": "qr-code",
  "wifi": "wifi",
  "antenna.radiowaves.left.and.right": "signal-cellular-alt",
  "battery.100": "battery-full",
  "lock.fill": "lock",

  // Shopping & Commerce
  "cart.fill": "shopping-cart",
  "creditcard.fill": "credit-card",
  "dollarsign.circle.fill": "monetization-on",
  "bag.fill": "shopping-bag",

  // Location & Maps
  "location.fill": "location-on",
  "map.fill": "map",
  "compass.drawing": "explore",

  // Time & Calendar
  "clock.fill": "access-time",
  "calendar": "event",
  "timer": "timer",

  // User & Profile
  "person": "person",
  "person.fill": "person",
  "person.2.fill": "group",
  "person.circle.fill": "account-circle",
  "person.crop.circle.fill": "account-circle",
  "person.fill.checkmark": "verified-user",

  // Work & Globe
  "briefcase.fill": "work",
  "globe": "public",

  // Security
  "shield.fill": "security",

  // Sharing & Export
  "square.and.arrow.up": "share",
  "arrow.up.doc.fill": "file-upload",
  "link": "link",

  // Search & Discovery
  "magnifyingglass": "search",
  "line.3.horizontal.decrease": "filter-list",
  "arrow.up.arrow.down": "sort",

  // Visibility & Display
  "eye.fill": "visibility",
  "lightbulb.fill": "lightbulb",
  "moon.fill": "dark-mode",
  "sun.max.fill": "light-mode",
} as Partial<
  Record<
    import("expo-symbols").SymbolViewProps["name"],
    React.ComponentProps<typeof MaterialIcons>["name"]
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name]}
      style={style as StyleProp<TextStyle>}
    />
  );
}
