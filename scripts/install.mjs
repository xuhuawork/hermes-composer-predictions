#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pluginId = 'conversation-guidance' // Preserve the original plugin's settings namespace.
const source = fileURLToPath(new URL('../plugin.js', import.meta.url))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

function regularPath(path, directory = false) {
  let stat
  try { stat = lstatSync(path) } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
  if (stat.isSymbolicLink() || !(directory ? stat.isDirectory() : stat.isFile())) {
    throw new Error(`Refusing non-${directory ? 'directory' : 'regular-file'} target: ${path}`)
  }
  return true
}

function atomicWrite(path, data) {
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, data, { flag: 'wx', mode: 0o600 })
    renameSync(temporary, path)
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary)
  }
}

function main(args) {
  let home = process.env.HERMES_HOME || join(homedir(), '.hermes')
  let force = false, dryRun = false, uninstall = false
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--home') {
      const value = args[++index]
      if (!value || value.startsWith('--')) throw new Error('--home requires a directory')
      home = value
    } else if (arg === '--force') force = true
    else if (arg === '--dry-run') dryRun = true
    else if (arg === '--uninstall') uninstall = true
    else if (arg === '--help') {
      console.log('Usage: node scripts/install.mjs [--home DIRECTORY] [--dry-run] [--force] [--uninstall]')
      return
    } else throw new Error(`Unknown option: ${arg}`)
  }
  const root = resolve(home)
  const plugins = join(root, 'desktop-plugins')
  const directory = join(plugins, pluginId)
  const target = join(directory, 'plugin.js')
  const receiptPath = join(directory, '.composer-predictions-install.json')
  // Refuse symlinked plugin directories/files instead of modifying another installation.
  regularPath(plugins, true)
  regularPath(directory, true)
  const installed = regularPath(target)
  const receiptExists = regularPath(receiptPath)
  if (uninstall) {
    if (!installed) {
      console.log(`Not installed: ${target}`)
      return
    }
    if (!receiptExists) throw new Error('No installer receipt; remove a manual installation manually.')
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'))
    if (receipt.id !== pluginId || receipt.sha256 !== hash(readFileSync(target))) {
      throw new Error('Installed file has changed or is not owned by this installer; refusing removal.')
    }
    if (!dryRun) {
      unlinkSync(target)
      unlinkSync(receiptPath)
    }
    console.log(`${dryRun ? 'Would remove' : 'Removed'}: ${target}. Other files and preferences are untouched.`)
    return
  }
  const bytes = readFileSync(source)
  const digest = hash(bytes)
  const changed = installed && hash(readFileSync(target)) !== digest
  if (changed && !force) throw new Error('A different plugin.js already exists. Use --force to back it up and replace it.')
  if (dryRun) {
    console.log(`Would install: ${target}${changed ? ' (with backup)' : ''}`)
    return
  }
  mkdirSync(dirname(target), { recursive: true })
  if (changed) {
    const backup = join(directory, `plugin.js.${randomUUID()}.backup`)
    writeFileSync(backup, readFileSync(target), { flag: 'wx', mode: 0o600 })
    console.log(`Backup: ${backup}`)
  }
  atomicWrite(target, bytes)
  atomicWrite(receiptPath, JSON.stringify({ id: pluginId, sha256: digest }, null, 2) + '\n')
  if (hash(readFileSync(target)) !== digest) throw new Error('Installation verification failed')
  console.log(`Installed and verified: ${target}`)
  console.log('Hermes Desktop normally hot-reloads this file. Fallback: Reload desktop plugins in the command palette.')
}

try { main(process.argv.slice(2)) } catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
