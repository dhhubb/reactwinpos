/**
 * Test runner.
 *
 * The source uses Vite's extensionless imports and `.tsx`, which Node's ESM loader
 * cannot resolve on its own. Each test file is bundled with the esbuild copy that
 * ships with Vite, then executed by `node --test`. No extra dependency required.
 */
import { build } from 'esbuild';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const TEST_DIR = 'src/__tests__';
const outDir = await mkdtemp(join(tmpdir(), 'afritecx-tests-'));

const files = (await readdir(TEST_DIR)).filter(f => f.endsWith('.test.ts'));

const bundles = [];
for (const file of files) {
  const outfile = join(outDir, file.replace(/\.ts$/, '.mjs'));
  await build({
    entryPoints: [join(TEST_DIR, file)],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    packages: 'external',
    logLevel: 'error',
  });
  bundles.push(outfile);
}

const child = spawn(process.execPath, ['--test', ...bundles], { stdio: 'inherit' });
const code = await new Promise(resolve => child.on('exit', resolve));
await rm(outDir, { recursive: true, force: true });
process.exit(Number(code) || 0);
