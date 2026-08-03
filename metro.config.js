const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// Metro, constrained to the mobile app.
//
// The Expo project is the repo ROOT, and three unrelated deployables live
// underneath it: backend/, web/ and admin/. By default Metro watches everything
// below the project root, so it crawls three extra node_modules trees — two of
// them containing Next.js — on every start and every file change. That is a
// slow dev server and a large bundler graph for code the app never imports.
//
// blockList removes them from the watch graph entirely. Nothing under src/ or
// assets/ imports from those directories (the deliberate business-logic port in
// web/src/lib/business.ts goes the other way), so there is nothing to resolve
// across the boundary.
//
// Pairs with .easignore, which keeps the same directories out of the build
// upload. Both are needed: one is about the dev/bundle graph, the other about
// what gets tarred and sent to EAS.
// ─────────────────────────────────────────────────────────────────────────────

const config = getDefaultConfig(__dirname);

const EXCLUDED = ['backend', 'web', 'admin'];

const escaped = EXCLUDED.map((dir) =>
  path.join(__dirname, dir).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
);

config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
    ? [config.resolver.blockList]
    : []),
  new RegExp(`^(${escaped.join('|')})${path.sep === '\\' ? '\\\\' : path.sep}.*$`),
];

module.exports = config;
