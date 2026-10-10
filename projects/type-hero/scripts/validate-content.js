#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateEquipmentDefinitions } from '../src/domain/equipment/schema.js';
import { loadPackFilesFromDirectory } from '../src/content/pack-fs-loader.js';
import { mergeContentPacks } from '../src/content/pack-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const packsDir = path.join(rootDir, 'content', 'packs');

async function main() {
  const packs = await loadPackFilesFromDirectory(packsDir);
  const merged = mergeContentPacks({ packs });

  const equipmentValidation = validateEquipmentDefinitions(merged.equipment);
  if (!equipmentValidation.isValid) {
    console.error('Content validation failed for merged pack equipment definitions:');
    equipmentValidation.errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(
    `Content validation passed for ${merged.metadata.length} pack(s): ${merged.resolvedOrder.join(', ')}.`,
  );
}

main().catch((error) => {
  console.error('Failed to validate content:', error.message);
  process.exitCode = 1;
});
