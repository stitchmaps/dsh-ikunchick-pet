// Build the shipped client bundle from the readable source + embedded sprite.
//
//   node scripts/build-client.mjs
//
// Reads lib/client.src.js, replaces the __SPRITE_DATA_URI__ placeholder with a
// base64 data URI of assets/spritesheet.webp, and writes lib/client.js.
// The client half is a single self-contained module (the DSH web module loader
// only hands it `react`, not local files), so the sprite must be inlined.
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const srcPath = path.join(root, 'lib', 'client.src.js')
const assetPath = path.join(root, 'assets', 'spritesheet.webp')
const outPath = path.join(root, 'lib', 'client.js')

const src = await fs.readFile(srcPath, 'utf8')
const placeholder = "'__SPRITE_DATA_URI__'"
if (!src.includes(placeholder)) {
  throw new Error(`placeholder ${placeholder} not found in client.src.js`)
}
const webp = await fs.readFile(assetPath)
const dataUri = 'data:image/webp;base64,' + webp.toString('base64')
const built = src.split(placeholder).join("'" + dataUri + "'")
if (built.includes(placeholder)) throw new Error('placeholder remained after replace')
await fs.writeFile(outPath, built, 'utf8')
console.log(`built ${path.relative(root, outPath)}  (sprite ${(webp.length / 1024).toFixed(1)} KB, bundle ${(built.length / 1024).toFixed(1)} KB)`)
