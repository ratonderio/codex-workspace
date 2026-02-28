#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEquipmentDefinitions } from '../src/domain/equipment/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const equipmentPath = path.join(rootDir, 'data', 'equipment.json');

async function main() {
  const raw = await readFile(equipmentPath, 'utf8');
  const parsed = JSON.parse(raw);

  const result = validateEquipmentDefinitions(parsed);

  if (!result.isValid) {
    console.error('Content validation failed for data/equipment.json:');
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log('Content validation passed for data/equipment.json.');
}

main().catch((error) => {
  console.error('Failed to validate content:', error.message);
  process.exitCode = 1;
});
