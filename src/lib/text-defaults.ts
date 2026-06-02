import { Platform, Text, type TextProps } from 'react-native';

/**
 * Global Text defaults.
 *
 * On Android, `Text` ships with `includeFontPadding: true`, which adds extra
 * font-metric padding and frequently clips the descenders (the tails of
 * g, y, p, q, j) at the bottom of a line. Disabling it app-wide fixes the
 * clipping. We also set `textAlignVertical: 'auto'` and add `paddingBottom: 2`
 * so descenders are not clipped after disabling the built-in padding. Both properties are Android-only;
 * React Native ignores them on iOS/web, so this is a harmless cross-platform
 * default.
 *
 * Text is imported directly from `react-native` across all 26 screens/
 * components in this app (there is no shared Text wrapper), so the most
 * centralized place to apply this is RN's own `Text.defaultProps`. Existing
 * per-component `style` props are merged on top and continue to win, because
 * an array style resolves left-to-right.
 */
const androidTextDefaults = Platform.select({
  android: { includeFontPadding: false, textAlignVertical: 'auto' as const, paddingBottom: 2 },
  default: undefined,
});

if (androidTextDefaults) {
  // RNText carries a mutable `defaultProps` bag. It's typed loosely here
  // because `defaultProps` isn't part of the public component typings.
  const RNText = Text as unknown as { defaultProps?: TextProps };
  RNText.defaultProps = RNText.defaultProps ?? {};
  RNText.defaultProps.style = [
    androidTextDefaults,
    RNText.defaultProps.style,
  ];
}
