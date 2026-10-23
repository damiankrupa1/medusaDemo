// Loads `sharp`, which the monorepo already installs (pnpm allowBuilds), without
// adding a dependency: it is not a direct dependency of any workspace package,
// so it is resolved from pnpm's hoisted store when a plain require fails.
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

export function loadSharp() {
  for (const id of ['sharp', join(REPO_ROOT, 'node_modules', '.pnpm', 'node_modules', 'sharp')]) {
    try {
      return require(id)
    } catch {
      // try the next location
    }
  }
  throw new Error('sharp is not installed - run `pnpm install` in the repository root')
}
