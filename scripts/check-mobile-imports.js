'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith('.js')) sourceFiles.push(target);
  }
}

walk(path.join(root, 'src'));
for (const entry of ['App.js', 'app.config.js']) sourceFiles.push(path.join(root, entry));

const importPattern = /(?:import\s+(?:[^'";]+?\s+from\s+)?|export\s+[^'";]+?\s+from\s+|require\s*\()\s*['"](\.[^'"]+)['"]/g;
const extensions = ['', '.js', '.jsx', '.json'];
const missing = [];
let checked = 0;

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(importPattern)) {
    checked += 1;
    const requested = path.resolve(path.dirname(file), match[1]);
    const found = extensions.some((extension) => fs.existsSync(requested + extension)) ||
      fs.existsSync(path.join(requested, 'index.js'));
    if (!found) missing.push(`${path.relative(root, file)} -> ${match[1]}`);
  }
}

if (missing.length) {
  console.error('Missing relative mobile imports:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`${checked} relative imports resolved across ${sourceFiles.length} files.`);
