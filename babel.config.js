module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Force private-class-field transforms in dev too. Expo Go's Hermes parser
    // rejects untranspiled `#private` syntax shipped by some dependencies;
    // babel-preset-expo skips these transforms in dev by default.
    plugins: [
      '@babel/plugin-transform-private-methods',
      '@babel/plugin-transform-class-properties',
      '@babel/plugin-transform-private-property-in-object',
    ],
  };
};
