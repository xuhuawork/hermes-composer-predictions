import assert from 'node:assert/strict'
import { test } from 'node:test'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../scripts/install.mjs', import.meta.url))
const source = fileURLToPath(new URL('../plugin.js', import.meta.url))
function fixture(t) {
  const home = mkdtempSync(join(tmpdir(), 'composer-predictions-test-'))
  t.after(() => rmSync(home, { recursive: true, force: true }))
  const directory = join(home, 'desktop-plugins', 'conversation-guidance')
  return { home, directory, target: join(directory, 'plugin.js'),
    run: (...args) => execFileSync(process.execPath, [script, '--home', home, ...args], { encoding: 'utf8' }),
    fail: (...args) => spawnSync(process.execPath, [script, '--home', home, ...args], { encoding: 'utf8' }) }
}

test('catalog artifact is byte-identical and build check detects drift', t => {
  const f = fixture(t)
  const build = fileURLToPath(new URL('../scripts/build.mjs', import.meta.url))
  execFileSync(process.execPath, [build, '--check'])
  const artifact = fileURLToPath(new URL('../desktop/plugin.js', import.meta.url))
  assert.deepEqual(readFileSync(artifact), readFileSync(source))
  // Work on a copy, never mutate the checked-in release artifact in a test.
  const copy = join(f.home, 'repo')
  mkdirSync(join(copy, 'scripts'), { recursive: true })
  mkdirSync(join(copy, 'desktop'))
  writeFileSync(join(copy, 'scripts/build.mjs'), readFileSync(build))
  writeFileSync(join(copy, 'plugin.js'), readFileSync(source))
  writeFileSync(join(copy, 'desktop/plugin.js'), 'stale artifact')
  assert.equal(spawnSync(process.execPath, [join(copy, 'scripts/build.mjs'), '--check']).status, 1)
  execFileSync(process.execPath, [join(copy, 'scripts/build.mjs')])
  assert.deepEqual(readFileSync(join(copy, 'desktop/plugin.js')), readFileSync(source))
  execFileSync(process.execPath, [join(copy, 'scripts/build.mjs'), '--check'])
})

test('dry-run changes nothing; install matches artifact; uninstall preserves unrelated files', t => {
  const f = fixture(t)
  f.run('--dry-run')
  assert.deepEqual(readdirSync(f.home), [])
  f.run()
  assert.deepEqual(readFileSync(f.target), readFileSync(source))
  f.run()
  assert.equal(readdirSync(f.directory).filter(name => name.endsWith('.backup')).length, 0)
  writeFileSync(join(f.directory, 'keep.txt'), 'user file')
  f.run('--uninstall', '--dry-run')
  assert.ok(existsSync(f.target))
  f.run('--uninstall')
  assert.equal(existsSync(f.target), false)
  assert.equal(readFileSync(join(f.directory, 'keep.txt'), 'utf8'), 'user file')
})

test('existing different file requires explicit force and receives a byte-exact backup', t => {
  const f = fixture(t)
  mkdirSync(f.directory, { recursive: true })
  writeFileSync(f.target, 'existing plugin')
  assert.equal(f.fail().status, 1)
  assert.equal(readFileSync(f.target, 'utf8'), 'existing plugin')
  f.run('--force')
  const backup = readdirSync(f.directory).find(name => name.endsWith('.backup'))
  assert.equal(readFileSync(join(f.directory, backup), 'utf8'), 'existing plugin')
  assert.deepEqual(readFileSync(f.target), readFileSync(source))
})

test('uninstall never deletes edited files, even with force', t => {
  const f = fixture(t)
  f.run()
  writeFileSync(f.target, 'edited after installation')
  assert.equal(f.fail('--uninstall', '--force').status, 1)
  assert.equal(readFileSync(f.target, 'utf8'), 'edited after installation')
})

test('uninstall refuses an unowned manual installation', t => {
  const f = fixture(t)
  mkdirSync(f.directory, { recursive: true })
  writeFileSync(f.target, 'manual plugin')
  assert.equal(f.fail('--uninstall').status, 1)
  assert.ok(existsSync(f.target))
})

test('installer respects HERMES_HOME without explicit home', t => {
  const f = fixture(t)
  execFileSync(process.execPath, [script], { env: { ...process.env, HERMES_HOME: f.home } })
  assert.deepEqual(readFileSync(f.target), readFileSync(source))
})

test('symlinked target is refused without touching its destination', { skip: process.platform === 'win32' }, t => {
  const f = fixture(t)
  mkdirSync(f.directory, { recursive: true })
  const destination = join(f.home, 'unrelated.js')
  writeFileSync(destination, 'untouched')
  symlinkSync(destination, f.target)
  assert.equal(f.fail('--force').status, 1)
  assert.equal(readFileSync(destination, 'utf8'), 'untouched')
})

test('invalid flags and missing home fail before any writes', t => {
  const f = fixture(t)
  assert.equal(f.fail('--unknown').status, 1)
  assert.equal(f.fail('--home').status, 1)
  assert.deepEqual(readdirSync(f.home), [])
})
