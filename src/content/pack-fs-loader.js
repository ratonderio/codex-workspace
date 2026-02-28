import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SCOPED_FILES = Object.freeze(['pack', 'stats', 'equipment', 'tasks', 'skills']);

async function readJsonIfExists(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  }
}

export async function loadPackFilesFromDirectory(packsDirectory) {
  const entries = await readdir(packsDirectory, { withFileTypes: true });
  const packDirectoryNames = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const packs = {};

  for (const packId of packDirectoryNames) {
    const packRoot = path.join(packsDirectory, packId);
    const pack = {};

    for (const fileName of SCOPED_FILES) {
      const parsed = await readJsonIfExists(path.join(packRoot, `${fileName}.json`));
      if (parsed !== undefined) {
        pack[fileName] = parsed;
      }
    }

    packs[packId] = pack;
  }

  return packs;
}
