const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(__dirname);

// The app calls the website through its HTTP API and imports shared code from
// packages/shared, so Metro does not need to crawl the Next.js workspace.
const websiteRoot = path.resolve(__dirname, '../website');
config.watchFolders = config.watchFolders.filter(
  (folder) => path.resolve(folder) !== websiteRoot,
);

// Ignore orphaned nested Expo metadata left by an earlier CLI invocation.
config.resolver.blockList = [
  ...config.resolver.blockList,
  /[/\\]expo[/\\]\.expo(?:[/\\]|$)/,
];

module.exports = config;
