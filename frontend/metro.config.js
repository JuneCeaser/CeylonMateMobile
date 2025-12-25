// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow bundling CSV files as assets
config.resolver.assetExts.push('csv');

module.exports = config;
