module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated's plugin MUST be listed last — it rewrites
    // worklets after every other transform has run, and an earlier position
    // silently produces code that throws at runtime rather than at build time.
    plugins: ['react-native-reanimated/plugin'],
  };
};
