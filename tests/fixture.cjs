// Each fixture executes the real plugin in a fresh VM with real React effects.
// Source is read solely for execution, never for source-pattern assertions.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const React = require('react')
const { createRoot } = require('react-dom/client')
const { JSDOM } = require('jsdom')
const { transformSync } = require('esbuild')

const HISTORY = { messages: [{ role: 'user', text: 'Please review the implementation.' }, { role: 'assistant', text: 'The implementation is ready for review.' }] }
const TEXTS = ['Explain the changes', 'Add regression tests', 'Review the edge cases']
const output = (texts = TEXTS) => ({ text: JSON.stringify({ suggestions: texts.map(text => ({ text, kind: 'ask' })) }) })
function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function atom(value) {
  const listeners = new Set()
  return { get: () => value, set(next) { value = next; for (const fn of listeners) fn() }, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) } }
}
const fixtureGroups = new WeakMap()
async function fixture(t, options = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  if (!fixtureGroups.has(t)) {
    const prior = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT }
    const cleanups = []
    fixtureGroups.set(t, cleanups)
    t.after(async () => {
      try { for (const cleanup of cleanups.reverse()) await cleanup() }
      finally { global.window = prior.window; global.document = prior.document; global.IS_REACT_ACT_ENVIRONMENT = prior.act }
    })
  }
  global.window = dom.window
  global.document = dom.window.document
  global.IS_REACT_ACT_ENVIRONMENT = true
  const storage = options.storage || new Map()
  const calls = [], previews = [], notifications = [], drafts = new Map([['session-1', 'existing draft']]), sends = [], insertions = [], events = new Map()
  const active = atom('session-1'), profile = atom('default'), connectionId = atom('local'), gateway = atom({ status: 'connected' })
  const state = { activeSessionId: active }
  if (options.optionalAtoms !== false) Object.assign(state, { profile, connectionId, gateway })
  const composer = {
    setDraft: async (...args) => { insertions.push(args); if (options.setDraft) return options.setDraft(...args); drafts.set(args[0], args[1]); return true },
    setPredictions: data => {
      const handle = options.setPredictions ? options.setPredictions(data) : Object.freeze({ ...data, revision: previews.length + 1 })
      previews.push(['set', data, handle])
      return handle
    },
    clearPredictions: handle => { previews.push(['clear', handle]); return true },
    insert: (...args) => { throw new Error(`Legacy insertion must not be used: ${args}`) },
    send: (...args) => sends.push(args)
  }
  if (options.getDraft) composer.getDraft = options.getDraft
  if (options.noSetDraft) delete composer.setDraft
  if (options.noPreview) { delete composer.setPredictions; delete composer.clearPredictions }
  const host = {
    state, composer,
    notify: notice => notifications.push(notice),
    onEvent(type, callback) { if (!events.has(type)) events.set(type, new Set()); events.get(type).add(callback); return () => events.get(type).delete(callback) },
    async request(method, params, timeout) {
      calls.push({ method, params, timeout })
      if (options.request) return options.request(method, params, timeout)
      if (method === 'session.history') return options.history || HISTORY
      if (method === 'llm.oneshot') return options.output === undefined ? output() : options.output
      sends.push({ method, params }); throw new Error(`Unexpected RPC ${method}`)
    }
  }
  const atoms = [], chipStyles = []
  const sdk = {
    atom: value => { const result = atom(value); atoms.push(result); return result }, host, cn: (...values) => values.filter(Boolean).join(' '), COMPOSER_AREAS: { bottom: 'composer.bottom' }, haptic() {},
    useValue: value => React.useSyncExternalStore(value.subscribe, value.get),
    Switch: props => React.createElement('button', { role: 'switch', 'aria-checked': props.checked, 'aria-label': props['aria-label'], onClick: () => props.onCheckedChange(!props.checked) }),
    Tip: props => {
      if (props.children?.props.style) chipStyles.push(props.children.props.style)
      return React.createElement('span', { 'data-testid': 'tooltip-wrapper' }, props.children, React.createElement('span', { hidden: true, 'data-testid': 'tooltip-content' }, props.label))
    }
  }
  const source = fs.readFileSync(path.join(__dirname, '..', 'plugin.js'), 'utf8')
  const compiled = transformSync(source, { format: 'cjs', target: 'node22' }).code
  const module = { exports: {} }
  vm.runInNewContext(compiled, {
    module, exports: module.exports, window: dom.window, document: dom.window.document,
    Date: class extends Date { static now() { return options.now ? options.now() : Date.now() } },
    console: { ...console, debug() {} }, setTimeout, clearTimeout,
    require(name) {
      if (name === '@hermes/plugin-sdk') return sdk
      if (name === 'react' || name === 'react/jsx-runtime') return require(name)
      throw new Error(`Non-SDK import: ${name}`)
    }
  }, { filename: 'plugin.js' })
  const contributions = []
  module.exports.default.register({ storage: { get: (key, fallback) => storage.has(key) ? storage.get(key) : fallback, set: (key, value) => storage.set(key, value) }, register: value => contributions.push(value) })
  const root = createRoot(dom.window.document.getElementById('root'))
  let mounted = true
  const act = async fn => { await React.act(async () => { await fn?.(); await Promise.resolve(); await Promise.resolve() }) }
  const unmount = async () => { if (mounted) { await act(() => root.unmount()); mounted = false } }
  fixtureGroups.get(t).push(async () => {
    global.window = dom.window
    global.document = dom.window.document
    await unmount()
    dom.window.close()
  })
  await act(() => root.render(React.createElement(React.Fragment, null, ...contributions.map(c => c.render?.()))))
  return {
    guidance: atoms[0], chipStyles,
    host, active, profile, connectionId, gateway, storage, calls, previews, notifications, drafts, sends, insertions, events,
    exports: module.exports, contributions, act, unmount, document: dom.window.document,
    text: () => dom.window.document.body.textContent,
    button: text => [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === text),
    click: async button => { if (!button) throw new Error('Expected button is absent'); await act(() => button.click()) },
    toggle: async () => act(() => dom.window.document.querySelector('[role="switch"]').click()),
    locale: async value => act(() => { const select = dom.window.document.querySelector('select'); select.value = value; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })) }),
    complete: async (overrides = {}) => act(() => { for (const callback of events.get('message.complete') || []) callback({ session_id: active.get(), payload: { status: 'complete', text: 'done' }, ...overrides }) }),
    retry: async () => act(() => dom.window.document.querySelector('[aria-label="Regenerate predictions"], [aria-label="重新生成预测"]').click())
  }
}
module.exports = { fixture, deferred, HISTORY, TEXTS, output }
