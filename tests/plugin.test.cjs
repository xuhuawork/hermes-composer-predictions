const test = require('node:test')
const assert = require('node:assert/strict')
const { fixture, deferred, HISTORY, TEXTS, output } = require('./fixture.cjs')
const llms = f => f.calls.filter(call => call.method === 'llm.oneshot')
const published = f => f.previews.filter(([type]) => type === 'set')
const status = f => f.document.querySelector('[role="status"]')

for (const locale of ['en', 'zh-CN']) {
  test(`nonempty draft requires a second same-chip click with ${locale} guidance`, async t => {
    const reads = []
    const f = await fixture(t, { storage: new Map([['locale', locale]]), getDraft: async id => { reads.push(id); return 'My unsent work' } })
    await f.click(f.button(TEXTS[0]))
    assert.deepEqual(f.insertions, [])
    assert.equal(f.notifications[0].kind, 'info')
    assert.equal(f.notifications[0].message, locale === 'en' ? 'Draft is not empty. Click the same suggestion again within 5 seconds to replace it.' : '草稿已有内容。请在 5 秒内再次点击同一建议以替换当前草稿。')
    await f.click(f.button(TEXTS[0]))
    assert.deepEqual(f.insertions, [['session-1', TEXTS[0]]])
    assert.deepEqual(reads, ['session-1', 'session-1'])
    assert.deepEqual(f.sends, [])
  })
}

for (const draft of ['', '   \n ', `  ${TEXTS[0]}  `, null]) {
  test(`empty or matching draft (${JSON.stringify(draft)}) inserts once directly`, async t => {
    const f = await fixture(t, { getDraft: async () => draft })
    await f.click(f.button(TEXTS[0]))
    assert.deepEqual(f.insertions, [['session-1', TEXTS[0]]])
    assert.deepEqual(f.notifications, [])
  })
}

test('another chip resets confirmation; expiry requires two new clicks', async t => {
  let now = 100
  const f = await fixture(t, { getDraft: async () => 'existing text', now: () => now })
  await f.click(f.button(TEXTS[0]))
  await f.click(f.button(TEXTS[1]))
  assert.deepEqual(f.insertions, [])
  assert.equal(f.notifications.length, 2)
  now += 5001
  await f.click(f.button(TEXTS[1]))
  assert.deepEqual(f.insertions, [])
  assert.equal(f.notifications.length, 3)
  await f.click(f.button(TEXTS[1]))
  assert.deepEqual(f.insertions, [['session-1', TEXTS[1]]])
})

for (const reset of ['session', 'profile', 'connection', 'disable', 'regenerate']) {
  test(`${reset} resets pending draft replacement confirmation`, async t => {
    const f = await fixture(t, { getDraft: async () => 'unsent text' })
    await f.click(f.button(TEXTS[0]))
    if (reset === 'session') await f.act(() => f.active.set('session-2'))
    else if (reset === 'profile') await f.act(() => f.profile.set('other'))
    else if (reset === 'connection') await f.act(() => f.connectionId.set('other'))
    else if (reset === 'disable') { await f.toggle(); await f.toggle() }
    else await f.retry()
    await f.click(f.button(TEXTS[0]))
    assert.deepEqual(f.insertions, [])
    await f.click(f.button(TEXTS[0]))
    assert.equal(f.insertions.length, 1)
    assert.deepEqual(f.sends, [])
  })
}

test('another chip invalidates confirmation before its asynchronous read returns', async t => {
  const pending = deferred()
  let reads = 0
  const f = await fixture(t, { getDraft: () => ++reads === 2 ? pending.promise : 'unsent text' })
  await f.click(f.button(TEXTS[0]))
  await f.click(f.button(TEXTS[1]))
  await f.click(f.button(TEXTS[0]))
  assert.deepEqual(f.insertions, [])
  await f.act(() => pending.resolve('unsent text'))
  // The late B read cannot replace A's latest pending target.
  await f.click(f.button(TEXTS[0]))
  assert.deepEqual(f.insertions, [['session-1', TEXTS[0]]])
})

test('confirmation expires from click time even when getDraft is slow', async t => {
  let now = 0, reads = 0
  const pending = deferred()
  const f = await fixture(t, { now: () => now, getDraft: () => ++reads === 1 ? pending.promise : 'unsent text' })
  await f.click(f.button(TEXTS[0]))
  now = 6000
  await f.act(() => pending.resolve('unsent text'))
  await f.click(f.button(TEXTS[0]))
  assert.deepEqual(f.insertions, [])
  await f.click(f.button(TEXTS[0]))
  assert.equal(f.insertions.length, 1)
})

test('draft edited between clicks requires fresh confirmation', async t => {
  let draft = 'initial work'
  const f = await fixture(t, { getDraft: async () => draft })
  await f.click(f.button(TEXTS[0]))
  draft = 'new unsent work'
  await f.click(f.button(TEXTS[0]))
  assert.deepEqual(f.insertions, [])
  await f.click(f.button(TEXTS[0]))
  assert.equal(f.insertions.length, 1)
})

test('getDraft failure never overwrites and shows a generic error', async t => {
  const f = await fixture(t, { getDraft: async () => { throw new Error('private') } })
  await f.click(f.button(TEXTS[0]))
  assert.deepEqual(f.insertions, [])
  assert.equal(f.notifications[0].kind, 'error')
  assert.ok(!f.notifications[0].message.includes('private'))
})

test('pending draft read cannot insert after disable or navigation', async t => {
  const pending = deferred()
  const f = await fixture(t, { getDraft: () => pending.promise })
  await f.click(f.button(TEXTS[0]))
  await f.toggle()
  await f.act(() => pending.resolve(''))
  assert.deepEqual(f.insertions, [])
  assert.deepEqual(f.sends, [])
})

test('only default export, English default, and missing optional host atoms work', async t => {
  const f = await fixture(t, { optionalAtoms: false })
  assert.deepEqual(Object.keys(f.exports), ['default'])
  assert.equal(f.exports.default.id, 'conversation-guidance')
  assert.equal(f.document.querySelector('select').value, 'en')
  assert.equal(f.document.querySelector('[role="switch"]').getAttribute('aria-label'), 'Enable composer predictions')
  assert.ok(f.button(TEXTS[0]))
})

test('Chinese locale persists without regeneration; a new mount restores it', async t => {
  const storage = new Map()
  const f = await fixture(t, { storage })
  const before = f.calls.length
  await f.locale('zh-CN')
  assert.equal(storage.get('locale'), 'zh-CN')
  assert.equal(f.calls.length, before)
  assert.equal(f.document.querySelector('[role="switch"]').getAttribute('aria-label'), '启用输入预测')
  await f.unmount()
  const next = await fixture(t, { storage })
  assert.equal(next.document.querySelector('select').value, 'zh-CN')
  assert.ok(next.text().includes('输入预测'))
})

test('invalid persisted locale falls back to English', async t => {
  const f = await fixture(t, { storage: new Map([['locale', 'unsupported']]) })
  assert.equal(f.document.querySelector('select').value, 'en')
  assert.ok(f.text().includes('Composer predictions'))
})

test('off persists, clears previews but not drafts, and completion/remount cause no RPC', async t => {
  const storage = new Map()
  const f = await fixture(t, { storage })
  await f.toggle()
  assert.equal(storage.get('enabled'), false)
  assert.equal(f.button(TEXTS[0]), undefined)
  assert.equal(f.drafts.get('session-1'), 'existing draft')
  assert.equal(f.previews.at(-1)[0], 'clear')
  const count = f.calls.length
  await f.complete()
  assert.equal(f.calls.length, count)
  await f.unmount()
  const next = await fixture(t, { storage })
  assert.equal(next.calls.length, 0)
  assert.equal(next.document.querySelector('[role="switch"]').getAttribute('aria-checked'), 'false')
  await next.toggle()
  assert.equal(storage.get('enabled'), true)
  assert.ok(next.button(TEXTS[0]))
})

for (const phase of ['session.history', 'llm.oneshot']) {
  test(`disable during ${phase} suppresses pending work and late previews`, async t => {
    const pending = deferred()
    const f = await fixture(t, { request: method => method === phase ? pending.promise : method === 'session.history' ? HISTORY : output() })
    assert.ok(f.calls.some(call => call.method === phase))
    await f.toggle()
    const count = llms(f).length, publishCount = published(f).length
    await f.act(() => pending.resolve(phase === 'session.history' ? HISTORY : output()))
    assert.equal(llms(f).length, count)
    assert.equal(published(f).length, publishCount)
    assert.equal(f.button(TEXTS[0]), undefined)
    assert.equal(status(f), null)
  })
  test(`session switch during ${phase} cannot publish an old result`, async t => {
    const pending = deferred()
    const f = await fixture(t, { request: (method, params) => params.session_id === 'session-1' && method === phase ? pending.promise : method === 'session.history' ? HISTORY : output(['Current session suggestion']) })
    await f.act(() => f.active.set('session-2'))
    assert.ok(f.button('Current session suggestion'))
    const before = published(f).length, oldLLMs = llms(f).filter(call => call.params.session_id === 'session-1').length
    await f.act(() => pending.resolve(phase === 'session.history' ? HISTORY : output(['Stale suggestion'])))
    assert.equal(published(f).length, before)
    assert.equal(llms(f).filter(call => call.params.session_id === 'session-1').length, oldLLMs)
    assert.equal(f.button('Stale suggestion'), undefined)
    assert.equal(f.previews.filter(([type]) => type === 'clear').length, 0)
  })
  test(`unmount during ${phase} invalidates pending results and removes subscriptions`, async t => {
    const pending = deferred()
    const f = await fixture(t, { request: method => method === phase ? pending.promise : HISTORY })
    await f.unmount()
    const count = f.calls.length, publishCount = published(f).length
    await f.act(() => pending.resolve(phase === 'session.history' ? HISTORY : output()))
    assert.equal(f.calls.length, count)
    assert.equal(published(f).length, publishCount)
    assert.equal(f.events.get('message.complete')?.size || 0, 0)
    assert.equal(f.previews.filter(([type]) => type === 'clear').length, 0)
  })
}

for (const bad of ['throw', '', 'not JSON', '{"suggestions":[]}', '{"suggestions":"not an array"}']) {
  test(`generation failure (${bad || 'empty'}) is generic and retryable`, async t => {
    let failed = true
    const f = await fixture(t, { request: method => {
      if (method === 'session.history') return HISTORY
      if (!failed) return output()
      if (bad === 'throw') throw new Error('private provider secret')
      return { text: bad }
    } })
    assert.equal(status(f)?.textContent, 'Prediction generation failed. Please retry.')
    assert.ok(!f.text().includes('private provider secret'))
    failed = false
    await f.retry()
    assert.equal(status(f), null)
    assert.ok(f.button(TEXTS[0]))
  })
}

test('successful click calls session-scoped setDraft, replaces existing text and never sends', async t => {
  const f = await fixture(t)
  await f.click(f.button(TEXTS[0]))
  assert.deepEqual(f.insertions, [['session-1', TEXTS[0]]])
  assert.equal(f.drafts.get('session-1'), TEXTS[0])
  assert.deepEqual(f.sends, [])
  assert.ok(f.calls.every(call => ['session.history', 'llm.oneshot'].includes(call.method)))
})

for (const locale of ['en', 'zh-CN']) for (const failure of ['false', 'reject']) {
  test(`setDraft ${failure} shows generic ${locale} notification without submission`, async t => {
    const f = await fixture(t, { storage: new Map([['locale', locale]]), setDraft: () => {
      if (failure === 'reject') throw new Error('secret insertion failure')
      return false
    } })
    await f.click(f.button(TEXTS[0]))
    assert.equal(f.notifications.length, 1)
    const message = f.notifications[0].message
    assert.equal(typeof message, 'string')
    assert.ok(!message.includes('secret'))
    if (locale === 'en') assert.equal(message, 'Could not fill this composer. Please try again.')
    else assert.equal(message, '无法填入当前输入框，请重试。')
    assert.equal(f.drafts.get('session-1'), 'existing draft')
    assert.deepEqual(f.sends, [])
  })
}

test('missing setDraft disables candidate buttons with upgrade guidance', async t => {
  const f = await fixture(t, { noSetDraft: true })
  assert.equal(f.button(TEXTS[0]).disabled, true)
  assert.ok(f.text().includes('Update Hermes Desktop to enable click-to-fill.'))
  await f.click(f.button(TEXTS[0]))
  assert.deepEqual(f.insertions, [])
  assert.deepEqual(f.sends, [])
})

test('missing native preview API retains clickable suggestions', async t => {
  const f = await fixture(t, { noPreview: true })
  for (const text of TEXTS) {
    assert.equal(f.button(text).disabled, false)
    await f.click(f.button(text))
    assert.equal(f.drafts.get('session-1'), text)
  }
  assert.deepEqual(f.insertions, TEXTS.map(text => ['session-1', text]))
  assert.deepEqual(f.sends, [])
})

test('native preview publishes exact candidates and cleans up on unmount', async t => {
  const f = await fixture(t)
  const preview = published(f).at(-1)[1]
  assert.equal(preview.sessionId, 'session-1')
  assert.equal(preview.profile, 'default')
  assert.equal(preview.connectionId, 'local')
  assert.deepEqual(Array.from(preview.suggestions), TEXTS)
  const handle = published(f).at(-1)[2]
  await f.unmount()
  assert.strictEqual(f.previews.at(-1)[1], handle)
})

test('generation uses dedicated task, token budget and explicit timeout', async t => {
  const f = await fixture(t)
  const call = llms(f)[0]
  assert.equal(call.params.task, 'composer_predictions')
  assert.equal(call.params.max_tokens, 1024)
  assert.equal(call.timeout, 150000)
  assert.equal(call.params.session_id, 'session-1')
})

test('context includes only six latest visible messages, excluding system/tool/reasoning', async t => {
  const messages = [
    { role: 'system', text: 'SYSTEM_SECRET' },
    ...Array.from({ length: 8 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', text: `VISIBLE_${index}`, reasoning: 'REASONING_SECRET', reasoning_content: 'HIDDEN_REASONING' })),
    { role: 'tool', text: 'TOOL_SECRET' }
  ]
  const f = await fixture(t, { history: { messages } })
  const input = llms(f)[0].params.input
  for (const excluded of ['VISIBLE_0', 'VISIBLE_1', 'SYSTEM_SECRET', 'TOOL_SECRET', 'REASONING_SECRET', 'HIDDEN_REASONING']) assert.ok(!input.includes(excluded), excluded)
  for (let index = 2; index < 8; index++) assert.ok(input.includes(`VISIBLE_${index}`))
})

test('context text budget is 12000 characters and retains newest text', async t => {
  const f = await fixture(t, { history: { messages: [{ role: 'user', text: 'x'.repeat(10000) }, { role: 'assistant', text: 'y'.repeat(10000) }] } })
  const input = llms(f)[0].params.input
  assert.equal([...input].filter(char => char === 'x').length, 2000)
  assert.equal([...input].filter(char => char === 'y').length, 10000)
})

test('structured content parts preserve visible text but exclude reasoning/tool parts', async t => {
  const f = await fixture(t, { history: { messages: [
    { role: 'user', content: [{ type: 'text', text: 'Visible user content' }, { type: 'image', image: 'IMAGE_SECRET' }] },
    { role: 'assistant', content: [{ type: 'thinking', thinking: 'THINKING_SECRET' }, { type: 'reasoning', text: 'REASONING_SECRET' }, { type: 'tool_result', text: 'TOOL_PART_SECRET' }, { type: 'text', text: 'Visible assistant content' }] }
  ] } })
  const input = llms(f)[0].params.input
  assert.ok(input.includes('Visible user content'))
  assert.ok(input.includes('Visible assistant content'))
  for (const hidden of ['IMAGE_SECRET', 'THINKING_SECRET', 'REASONING_SECRET', 'TOOL_PART_SECRET', '[object Object]']) assert.ok(!input.includes(hidden))
})

for (const candidates of [['First candidate', 'Second candidate'], [{ text: 'First candidate', kind: 'ask' }, { text: 'Second candidate', kind: 'action' }]]) {
  test(`JSON top-level ${typeof candidates[0]} arrays yield usable candidates`, async t => {
    const f = await fixture(t, { output: { text: JSON.stringify(candidates) } })
    assert.ok(f.button('First candidate'))
    assert.ok(f.button('Second candidate'))
    assert.equal(status(f), null)
  })
}

test('candidate normalization deduplicates, rejects oversized text and caps three choices', async t => {
  const f = await fixture(t, { output: output(['  First   candidate ', 'first candidate', 'z'.repeat(241), '', 'Second candidate', 'Third candidate', 'Fourth candidate']) })
  const preview = published(f).at(-1)[1]
  assert.deepEqual(Array.from(preview.suggestions), ['First candidate', 'Second candidate', 'Third candidate'])
})

test('optional profile/gateway atoms work; mismatching-profile completion is ignored', async t => {
  const f = await fixture(t, { optionalAtoms: true })
  assert.ok(f.button(TEXTS[0]))
  const before = f.calls.length
  await f.complete({ profile: 'other-profile' })
  assert.equal(f.calls.length, before)
  await f.complete({ profile: 'default' })
  assert.ok(f.calls.length > before)
})

test('Chinese generation errors remain localized and retryable', async t => {
  const f = await fixture(t, { storage: new Map([['locale', 'zh-CN']]), output: { text: '{}' } })
  assert.equal(status(f)?.textContent, '预测生成失败，请重试。')
  assert.ok(f.document.querySelector('[aria-label="重新生成预测"]'))
})

for (const scope of ['profile', 'connectionId', 'gateway']) {
  test(`${scope} changes invalidate pending work even if the session ID is reused`, async t => {
    const pending = deferred()
    let generation = 0
    const f = await fixture(t, { optionalAtoms: true, request: method => {
      if (method === 'session.history') return HISTORY
      generation += 1
      return generation === 1 ? pending.promise : output(['Fresh scope suggestion'])
    } })
    await f.act(() => f[scope].set(scope === 'gateway' ? { status: 'connected', epoch: 2 } : 'new-scope'))
    assert.ok(f.button('Fresh scope suggestion'))
    const before = published(f).length
    await f.act(() => pending.resolve(output(['Old scope suggestion'])))
    assert.equal(published(f).length, before)
    assert.equal(f.button('Old scope suggestion'), undefined)
    if (scope === 'profile') assert.equal(llms(f).at(-1).params.profile, 'new-scope')
  })
}

test('wrong connection, wrong session and incomplete completion events are ignored', async t => {
  const f = await fixture(t, { optionalAtoms: true })
  const before = f.calls.length
  await f.complete({ connectionId: 'remote' })
  await f.complete({ session_id: 'other-session' })
  await f.complete({ payload: { status: 'streaming', text: 'unfinished' } })
  await f.complete({ payload: { status: 'complete', text: '' } })
  assert.equal(f.calls.length, before)
})

test('late rejection after disable cannot show an error or republish', async t => {
  const pending = deferred()
  const f = await fixture(t, { request: method => method === 'session.history' ? HISTORY : pending.promise })
  await f.toggle()
  await f.act(() => pending.reject(new Error('late private failure')))
  assert.equal(status(f), null)
  assert.equal(published(f).length, 0)
  assert.equal(f.notifications.length, 0)
})

test('non-string candidate text is rejected rather than coerced', async t => {
  const f = await fixture(t, { output: { text: JSON.stringify({ suggestions: [{ text: { secret: true } }, { text: 42 }, { text: 'Valid suggestion' }] }) } })
  assert.deepEqual(Array.from(published(f).at(-1)[1].suggestions), ['Valid suggestion'])
})

for (const messages of [[], [{ role: 'user', text: 'Not answered yet' }]]) {
  test(`history without an eligible assistant reply makes no generation call (${messages.length} messages)`, async t => {
    const f = await fixture(t, { history: { messages } })
    assert.equal(llms(f).length, 0)
    assert.equal(status(f), null)
  })
}

for (const scope of ['active', 'profile', 'connectionId']) {
  test(`${scope} switch clears only the exact owned handle, never the newer preview`, async t => {
    const f = await fixture(t)
    const old = published(f).at(-1)[2]
    await f.act(() => f[scope].set('new-scope'))
    const newer = published(f).at(-1)[2]
    assert.notStrictEqual(newer, old)
    assert.deepEqual(f.previews.filter(([type]) => type === 'clear').map(([, handle]) => handle), [old])
    await f.unmount()
    assert.deepEqual(f.previews.filter(([type]) => type === 'clear').map(([, handle]) => handle), [old, newer])
  })
}

for (const value of [null, '', '   ', 42]) {
  test(`incomplete scope (${JSON.stringify(value)}) suppresses only native publication`, async t => {
    const f = await fixture(t)
    await f.act(() => f.profile.set(value))
    const count = published(f).length
    assert.ok(f.button(TEXTS[0]))
    await f.retry()
    assert.equal(published(f).length, count)
    await f.click(f.button(TEXTS[0]))
    assert.deepEqual(f.insertions, [['session-1', TEXTS[0]]])
    assert.deepEqual(f.sends, [])
  })
}

test('null publication retains chips, exact insertion and never clears an unowned preview', async t => {
  const f = await fixture(t, { setPredictions: () => null })
  assert.equal(published(f).at(-1)[2], null)
  assert.equal(TEXTS.filter(text => f.button(text)).length, 3)
  await f.click(f.button(TEXTS[1]))
  assert.deepEqual(f.insertions, [['session-1', TEXTS[1]]])
  assert.deepEqual(f.sends, [])
  await f.toggle()
  await f.unmount()
  assert.equal(f.previews.filter(([type]) => type === 'clear').length, 0)
})

test('declined republication retains the previous exact handle for unmount cleanup', async t => {
  let decline = false
  const owned = Object.freeze({ publication: Symbol('owned') })
  const f = await fixture(t, { setPredictions: () => decline ? null : owned })
  decline = true
  // Re-publish a new result snapshot without starting a new generation.
  await f.act(() => f.guidance.set({ ...f.guidance.get() }))
  assert.equal(published(f).at(-1)[2], null)
  assert.equal(f.previews.filter(([type]) => type === 'clear').length, 0)
  await f.unmount()
  assert.strictEqual(f.previews.at(-1)[1], owned)
})

test('regeneration clears the previous handle before a declined replacement', async t => {
  let decline = false
  const owned = Object.freeze({ publication: Symbol('owned') })
  const f = await fixture(t, { setPredictions: () => decline ? null : owned })
  decline = true
  await f.retry()
  assert.strictEqual(f.previews.find(([type]) => type === 'clear')[1], owned)
  assert.equal(published(f).at(-1)[2], null)
  await f.unmount()
  assert.equal(f.previews.filter(([type]) => type === 'clear').length, 1)
})

test('timeout rejection shows failure and manual retry restores all three chips', async t => {
  let timeout = true
  const f = await fixture(t, { request: (method, params, duration) => {
    if (method === 'session.history') return HISTORY
    assert.equal(duration, 150000)
    if (timeout) throw Object.assign(new Error('request timed out'), { code: 'TIMEOUT' })
    return output()
  } })
  assert.ok(status(f))
  timeout = false
  await f.retry()
  assert.equal(TEXTS.filter(text => f.button(text)).length, 3)
  assert.equal(status(f), null)
})

test('approved glass styling remains unchanged on every candidate', async t => {
  const f = await fixture(t, { noPreview: true })
  assert.equal(TEXTS.filter(text => f.button(text)).length, 3)
  // Inspect actual React element style props: jsdom cannot parse color-mix borders.
  assert.equal(f.chipStyles.length, 3)
  for (const style of f.chipStyles) {
    assert.equal(style.borderRadius, '8px')
    assert.equal(style.border, '0.5px solid color-mix(in srgb, var(--ui-text-secondary) 18%, transparent)')
    assert.equal(style.backdropFilter, 'blur(12px) saturate(115%)')
    assert.ok(style.backgroundColor.includes('38%'))
  }
  assert.deepEqual(f.sends, [])
})

test('empty session keeps settings available and issues no new RPC', async t => {
  const f = await fixture(t)
  const before = f.calls.length
  await f.act(() => f.active.set(null))
  assert.equal(f.calls.length, before)
  assert.ok(f.document.querySelector('[role="switch"]'))
  assert.equal(f.button(TEXTS[0]), undefined)
  await f.locale('zh-CN')
  assert.equal(f.storage.get('locale'), 'zh-CN')
})
