const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.serializer = config.serializer || {};
config.serializer.getPolyfills = () => [
  path.resolve(__dirname, 'polyfills.js'),
];

module.exports = config;
