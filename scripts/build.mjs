#!/usr/bin/env node
// The root plugin.js is the sole source. Catalog installs need a plain copy.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = readFileSync(new URL('../plugin.js', import.meta.url))
const directory = new URL('../desktop/', import.meta.url)
const target = new URL('plugin.js', directory)
if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: node scripts/build.mjs [--check]')
if (process.argv.includes('--check')) {
  let artifact
  try { artifact = readFileSync(target) } catch { throw new Error('Missing desktop/plugin.js; run npm run build') }
  if (!source.equals(artifact)) throw new Error('desktop/plugin.js drifted; run npm run build')
  console.log('Catalog artifact matches plugin.js')
} else {
  mkdirSync(directory, { recursive: true })
  writeFileSync(target, source)
  console.log(`Built ${fileURLToPath(new URL('../desktop/plugin.js', import.meta.url)).split('/').slice(-2).join('/')}`)
}
