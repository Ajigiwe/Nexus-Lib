import fs from 'node:fs'
import path from 'node:path'
import pngToIco from 'png-to-ico'
import Jimp from 'jimp'

const projectRoot = process.cwd()
const srcPng = path.join(projectRoot, 'public', 'bookopen-icon.png')
const outIco = path.join(projectRoot, 'public', 'nexus-logo.ico')

async function main() {
  if (!fs.existsSync(srcPng)) {
    console.error(`[icon] Source PNG not found at ${srcPng}`)
    process.exit(1)
  }
  try {
    // Generate multiple sizes for better Windows/NSIS compatibility
    const sizes = [16, 24, 32, 48, 64, 128, 256]
    const src = await Jimp.read(srcPng)
    const pngBuffers = await Promise.all(
      sizes.map(async (size) => {
        const clone = src.clone()
        clone.contain(size, size, Jimp.RESIZE_BILINEAR)
        return await clone.getBufferAsync(Jimp.MIME_PNG)
      })
    )

    const buf = await pngToIco(pngBuffers)
    fs.writeFileSync(outIco, buf)
    console.log(`[icon] Wrote ${outIco}`)
  } catch (e) {
    console.error('[icon] Failed to generate ICO:', e)
    process.exit(1)
  }
}

main()
