module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // NativeWind v4 is wired through a Babel *preset* + the jsxImportSource
      // option on babel-preset-expo (not a standalone plugin).
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // react-native-reanimated v4 splits its worklets engine into
      // react-native-worklets; the Babel plugin now lives there. It MUST be
      // the last entry in the plugins array.
      'react-native-worklets/plugin',
    ],
  };
};
