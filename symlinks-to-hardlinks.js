import { readdir, readlink, mkdir, link } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { join, dirname, basename, relative } from 'node:path';

const options = {
  'symlink-dir': { type: 'string', required: true },
  'raw-dir': { type: 'string', required: true },
  'output-dir': { type: 'string', required: true },
  'execute': { type: 'boolean', default: false },
};

const { values } = parseArgs({ options });
const symlinkDir = values['symlink-dir'];
const rawDir = values['raw-dir'];
const outputDir = values['output-dir'];
const execute = values['execute'];

async function processSymlinks(dir: string) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await processSymlinks(fullPath);
    } else if (entry.isSymbolicLink()) {
      await handleSymlink(fullPath);
    }
  }
}

async function handleSymlink(symlinkPath: string) {
  try {
    const targetPath = await readlink(symlinkPath);
    const rawFilename = basename(targetPath);
    const relativeDir = dirname(relative(symlinkDir, symlinkPath));
    const outputPath = join(outputDir, dirname(relativeDir), rawFilename);
    
    if (!execute) {
      console.log(`[Dry Run] Would hardlink: ${targetPath} -> ${outputPath}`);
      return;
    }

    await mkdir(dirname(outputPath), { recursive: true });
    await link(targetPath, outputPath);
    console.log(`Hardlinked: ${targetPath} -> ${outputPath}`);
  } catch (error) {
    console.error(`Error processing symlink ${symlinkPath}:`, error);
  }
}

console.log(`Starting in ${execute ? 'EXECUTION' : 'DRY RUN'} mode.`);
await processSymlinks(symlinkDir);
