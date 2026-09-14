/*
 * Every identifier the app reads must resolve to something.
 *
 * scripts/check-module-scope.js evaluates each module's TOP LEVEL, which is why
 * it caught `shadows is not defined` in a StyleSheet. It cannot catch the same
 * mistake one line deeper: a name used inside a function body is only evaluated
 * when that function runs, so a missing import there builds, bundles, exports
 * and ships, then throws the first time the code path renders.
 *
 * That shipped twice. `useMemo` was used in AppContext without being imported —
 * AppProvider wraps every screen, so the app reached ErrorBoundary on launch
 * with "Something went wrong" for everyone on the update.
 *
 * This resolves every identifier against Babel's scope chain: a reference is an
 * error unless it binds to a declaration, a parameter, an import, or a known
 * global. It is the whole class, at any depth, and it runs in milliseconds.
 *
 * What it does not do is type-check or follow property access — `foo.bar` where
 * bar is missing is still invisible. It answers one question completely: does
 * this NAME exist at all?
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const parser = require(path.join(root, 'node_modules/@babel/parser'));
const traverseModule = require(path.join(root, 'node_modules/@babel/traverse'));
const traverse = traverseModule.default || traverseModule;

// Globals a React Native bundle genuinely has. Anything not here and not bound
// in the file is a mistake, which is the point.
const GLOBALS = new Set([
  'console', 'process', 'require', 'module', 'exports', '__DEV__', '__dirname', '__filename',
  'global', 'globalThis', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'setImmediate', 'clearImmediate', 'requestAnimationFrame', 'cancelAnimationFrame',
  'fetch', 'Headers', 'Request', 'Response', 'AbortController', 'AbortSignal',
  'FormData', 'Blob', 'File', 'FileReader', 'URL', 'URLSearchParams', 'WebSocket',
  'XMLHttpRequest', 'localStorage', 'sessionStorage', 'navigator', 'performance',
  'Object', 'Array', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt', 'Math', 'JSON',
  'Date', 'RegExp', 'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError',
  'EvalError', 'URIError', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'WeakRef',
  'Proxy', 'Reflect', 'ArrayBuffer', 'SharedArrayBuffer', 'DataView', 'Intl',
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array',
  'BigUint64Array', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI',
  'decodeURI', 'encodeURIComponent', 'decodeURIComponent', 'escape', 'unescape',
  'NaN', 'Infinity', 'undefined', 'alert', 'queueMicrotask', 'structuredClone',
  'TextEncoder', 'TextDecoder', 'btoa', 'atob', 'Buffer', 'arguments',
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = [...walk(path.join(root, 'src')), path.join(root, 'App.js'), path.join(root, 'index.js')];
const failures = [];

for (const file of files) {
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining',
                'nullishCoalescingOperator', 'dynamicImport', 'exportDefaultFrom'],
    });
  } catch (error) {
    failures.push({ file, name: '(parse error)', line: 0, error: error.message });
    continue;
  }

  const seen = new Set();
  traverse(ast, {
    ReferencedIdentifier(nodePath) {
      const { name } = nodePath.node;
      if (GLOBALS.has(name)) return;
      // JSX intrinsics are lowercase; components are capitalised and must bind.
      if (nodePath.parent.type === 'JSXOpeningElement' && /^[a-z]/.test(name)) return;
      if (nodePath.scope.hasBinding(name, /* noGlobals */ true)) return;
      const line = nodePath.node.loc ? nodePath.node.loc.start.line : 0;
      const key = `${name}:${line}`;
      if (seen.has(key)) return;
      seen.add(key);
      failures.push({ file, name, line });
    },
  });
}

if (failures.length) {
  console.error('These names are used but never declared or imported. Each one throws\n'
              + 'the first time its code path runs:\n');
  for (const f of failures) {
    const rel = path.relative(root, f.file);
    console.error(`  ${rel}:${f.line}  ${f.name}${f.error ? ` — ${f.error}` : ''}`);
  }
  console.error(`\n${failures.length} undefined reference(s).`);
  process.exit(1);
}

console.log(`Every identifier resolves — ${files.length} files checked.`);
