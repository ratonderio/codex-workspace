import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('index loads bundled script without module imports for file:// compatibility', () => {
  const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(indexHtml, /<script\s+src="app\.bundle\.js"><\/script>/);
  assert.doesNotMatch(indexHtml, /type="module"\s+src="script\.js"/);
});

test('runtime bypasses network fetches when opened over file://', () => {
  const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8');

  assert.match(source, /function isFileProtocol\(\)/);
  assert.match(source, /if \(isFileProtocol\(\)\) \{\s*state\.taskDefinitions = buildDefaultTaskDefinitions\(\);\s*return;\s*\}/s);
  assert.match(source, /async function loadEquipmentDefinitions\(\) \{\s*if \(isFileProtocol\(\)\) \{\s*return;\s*\}/s);
});
