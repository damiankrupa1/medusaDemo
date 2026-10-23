// Perceptual "difference hash" (dHash) used to spot the same photo published
// twice (re-uploads, re-encodes, small resizes). Exact duplicates are caught
// separately with sha256.
import { loadSharp } from './sharp.mjs'

const sharp = loadSharp()

/** 64-bit dHash as a 16-char hex string. */
export async function dHash(input) {
  const { data } = await sharp(input)
    .rotate()
    .grayscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  let bits = 0n
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits = (bits << 1n) | (data[y * 9 + x] > data[y * 9 + x + 1] ? 1n : 0n)
    }
  }
  return bits.toString(16).padStart(16, '0')
}

export function hammingDistance(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`)
  let count = 0
  while (x) {
    count += Number(x & 1n)
    x >>= 1n
  }
  return count
}

/** Hashes this close (out of 64 bits) are treated as the same picture. */
export const NEAR_DUPLICATE_DISTANCE = 6

/**
 * Hasler & Süsstrunk colourfulness. Black-and-white and sepia photos score
 * below ~10 and can't show a product's colour.
 */
export async function colorfulness(input) {
  const { data } = await sharp(input).resize(64, 64, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  let n = 0
  let sumRg = 0
  let sumYb = 0
  let sumRg2 = 0
  let sumYb2 = 0
  for (let i = 0; i < data.length; i += 3) {
    const rg = data[i] - data[i + 1]
    const yb = 0.5 * (data[i] + data[i + 1]) - data[i + 2]
    sumRg += rg
    sumYb += yb
    sumRg2 += rg * rg
    sumYb2 += yb * yb
    n++
  }
  const meanRg = sumRg / n
  const meanYb = sumYb / n
  const stdRg = Math.sqrt(Math.max(0, sumRg2 / n - meanRg ** 2))
  const stdYb = Math.sqrt(Math.max(0, sumYb2 / n - meanYb ** 2))
  return Math.sqrt(stdRg ** 2 + stdYb ** 2) + 0.3 * Math.sqrt(meanRg ** 2 + meanYb ** 2)
}

export const MIN_COLORFULNESS = 10
