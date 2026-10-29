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
const kunPath = path.join(root, 'assets', 'click-kun.wav')
const nailongPath = path.join(root, 'assets', 'click-nailong.wav')
const outPath = path.join(root, 'lib', 'client.js')

const src = await fs.readFile(srcPath, 'utf8')
const webp = await fs.readFile(assetPath)
const kun = await fs.readFile(kunPath)
const nailong = await fs.readFile(nailongPath)

const splices = [
  ["'__SPRITE_DATA_URI__'", "'data:image/webp;base64," + webp.toString('base64') + "'"],
  ["'__CLICK_KUN_URI__'", "'data:audio/wav;base64," + kun.toString('base64') + "'"],
  ["'__CLICK_NAILONG_URI__'", "'data:audio/wav;base64," + nailong.toString('base64') + "'"],
]
let built = src
for (const [needle, value] of splices) {
  if (!built.includes(needle)) throw new Error(`placeholder ${needle} not found in client.src.js`)
  built = built.split(needle).join(value)
  if (built.includes(needle)) throw new Error(`placeholder ${needle} remained after replace`)
}
await fs.writeFile(outPath, built, 'utf8')
const kb = (n) => (n / 1024).toFixed(1) + ' KB'
console.log(`built ${path.relative(root, outPath)}  (sprite ${kb(webp.length)}, kun ${kb(kun.length)}, nailong ${kb(nailong.length)}, bundle ${kb(built.length)})`)
