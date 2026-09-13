/*
 * Does the app's JavaScript survive being LOADED?
 *
 * Metro bundles without evaluating, so a bare `ReferenceError` in a module's
 * top level — a style object spreading a token nobody imported — builds
 * cleanly, exports cleanly, uploads to EAS cleanly, and then kills the app
 * on the device before React renders a single frame. ErrorBoundary cannot
 * catch it: there is no tree yet. The store sees a binary that launches to a
 * crash report, and the only fix is another build and another review.
 *
 * That shipped in 1.0.4 (src/screens/SearchScreen.js used `shadows.card`
 * without importing `shadows`, from a commit that landed between the 1.0.3
 * and 1.0.4 bumps) and again in 1.0.5, because nothing in the pipeline ever
 * ran the code.
 *
 * This does. It evaluates the top level of every module reachable from
 * App.js the way Hermes does at launch: our own files for real, against the
 * real theme and the real constants a production build carries. Only
 * node_modules are stubbed, with proxies permissive enough that touching one
 * never fails — so a failure here is our code, not the harness.
 *
 * What it catches: ReferenceError, TypeError on undefined, a throw at import
 * time. What it does not: anything inside a function body, which needs the
 * app running.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const babel = require(path.join(root, 'node_modules/@babel/core'));
const preset = require(path.join(root, 'node_modules/babel-preset-expo'));

const ASSET = /\.(png|jpe?g|gif|svg|ttf|otf|webp|mp4)$/i;
const cache = new Map();
const failures = [];

// Stands in for anything from node_modules. Callable, constructible, and
// every property is another one of these, so no access pattern a module uses
// at import time can throw — `StyleSheet.create({...})`, a destructured hook,
// a decorated component all pass through untouched.
function stub(name) {
  const target = function () { return stub(`${name}()`); };
  return new Proxy(target, {
    get(t, prop) {
      if (prop === '__esModule') return false;
      if (prop === 'prototype') return t.prototype;
      if (typeof prop === 'symbol') return prop === Symbol.toPrimitive ? () => name : undefined;
      return stub(`${name}.${String(prop)}`);
    },
    apply: () => stub(`${name}()`),
    construct: () => stub(`new ${name}`),
    has: () => true,
  });
}

function resolveRelative(from, spec) {
  const base = path.resolve(path.dirname(from), spec);
  const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.json`, path.join(base, 'index.js')];
  return candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile()) || null;
}

function load(file, importedFrom) {
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith('.json')) {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    cache.set(file, parsed);
    return parsed;
  }

  const mod = { exports: {} };
  cache.set(file, mod.exports); // cycles resolve to the partial export, as in Metro
  const code = babel.transformFileSync(file, {
    presets: [preset], babelrc: false, configFile: false, cwd: root,
  }).code;

  const require_ = (spec) => {
    if (spec.startsWith('.')) {
      const target = resolveRelative(file, spec);
      if (!target) return stub(spec);
      if (ASSET.test(target)) return 1; // Metro turns an asset require into a number
      return load(target, file);
    }
    if (spec.startsWith('@babel/runtime')) return require(path.join(root, 'node_modules', spec));
    // React for real: hooks and createContext are called at module scope by
    // context files, and a stub would report those as failures.
    if (spec === 'react') return require(path.join(root, 'node_modules/react'));
    // The manifest a production build actually carries. src/api/client.js
    // throws deliberately when the API host is missing, and that guard is
    // supposed to fire — just not because this harness withheld the value.
    if (spec === 'expo-constants') {
      return {
        __esModule: true,
        default: {
          expoConfig: {
            version: require(path.join(root, 'package.json')).version,
            extra: { apiUrl: 'https://api.sawacars.com', siteUrl: 'https://sawacars.com' },
          },
        },
      };
    }
    return stub(spec);
  };

  try {
    new Function('module', 'exports', 'require', '__DEV__', 'global', code)(
      mod, mod.exports, require_, false, globalThis,
    );
  } catch (error) {
    failures.push({
      file: path.relative(root, file),
      error: `${error.constructor.name}: ${error.message}`,
      importedFrom: importedFrom && path.relative(root, importedFrom),
    });
  }
  cache.set(file, mod.exports);
  return mod.exports;
}

load(path.join(root, 'App.js'), null);

if (failures.length) {
  console.error('These modules throw while the bundle is loading, so the app dies before its first frame:\n');
  for (const failure of failures) {
    console.error(`  ${failure.file}`);
    console.error(`    ${failure.error}`);
    if (failure.importedFrom) console.error(`    imported from ${failure.importedFrom}`);
    console.error('');
  }
  process.exit(1);
}

console.log(`Module scope OK — ${cache.size} modules load without throwing.`);
