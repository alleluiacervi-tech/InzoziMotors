/*
 * No React hook may run after a component has had a chance to return early.
 *
 * React identifies hooks by call order. A component that returns early on one
 * render (say, "car still loading") and runs past that return on the next
 * calls a different number of hooks, and React throws "Rendered more hooks than
 * during the previous render" — straight to ErrorBoundary.
 *
 * That shipped: VehicleDetailScreen returns early while a car opened by id is
 * loading, and a gallery-prefetch useEffect was added below that return. Every
 * featured slide, deep link and push tap opened a car by id, so every one of
 * them crashed, while cars opened from a list (object present from the first
 * render) worked — which is why it looked random.
 *
 * The rule checked: inside a component (PascalCase) or a custom hook (use*),
 * once a top-level statement can `return`, no later top-level statement may
 * call a hook. It is React's rules-of-hooks for exactly this shape, without
 * adding ESLint to package.json (which mobile-update.yml would treat as a
 * native change and refuse to publish over the air).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const parser = require(path.join(root, 'node_modules/@babel/parser'));
const traverseModule = require(path.join(root, 'node_modules/@babel/traverse'));
const traverse = traverseModule.default || traverseModule;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ClassMethod', 'ObjectMethod']);

/** Visit every node under `node`, not descending into nested functions. */
function visitShallow(node, fn) {
  if (!node || typeof node.type !== 'string') return;
  fn(node);
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' || key === 'trailingComments') continue;
    const value = node[key];
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (child && typeof child.type === 'string' && !FUNCTION_TYPES.has(child.type)) visitShallow(child, fn);
    }
  }
}

function isHookCall(node) {
  if (node.type !== 'CallExpression') return false;
  const callee = node.callee;
  if (callee.type === 'Identifier') return /^use[A-Z]/.test(callee.name);
  return callee.type === 'MemberExpression' && !callee.computed
    && callee.object.type === 'Identifier' && callee.object.name === 'React'
    && /^use[A-Z]/.test(callee.property.name);
}

function functionName(nodePath) {
  const { node, parent } = nodePath;
  if (node.id?.name) return node.id.name;
  if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') return parent.id.name;
  return null;
}

const files = [...walk(path.join(root, 'src')), path.join(root, 'App.js')];
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
    failures.push(`${path.relative(root, file)}: parse error — ${error.message}`);
    continue;
  }

  traverse(ast, {
    Function(nodePath) {
      const name = functionName(nodePath);
      if (!name || !(/^[A-Z]/.test(name) || /^use[A-Z]/.test(name))) return;
      const body = nodePath.node.body;
      if (!body || body.type !== 'BlockStatement') return;

      let returnedAt = null;
      for (const statement of body.body) {
        if (returnedAt !== null) {
          visitShallow(statement, (node) => {
            if (isHookCall(node)) {
              failures.push(
                `${path.relative(root, file)}:${node.loc.start.line} — ${name} calls a hook after the early return on line ${returnedAt}`
              );
            }
          });
        }
        if (returnedAt === null && statement.type !== 'ReturnStatement') {
          visitShallow(statement, (node) => {
            if (node.type === 'ReturnStatement' && returnedAt === null) returnedAt = node.loc.start.line;
          });
        }
      }
    },
  });
}

if (failures.length) {
  console.error(`Hooks after an early return (${failures.length}):`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(`Hook order OK — ${files.length} files checked.`);
