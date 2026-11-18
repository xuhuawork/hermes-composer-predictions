# Compatibility and privacy

[简体中文](compatibility.zh-CN.md) · [README](../README.md)

## Two independent Desktop capability layers

| Surface | Contract |
| --- | --- |
| Bottom suggestion chips | Any Desktop with public `host.composer.setDraft(sessionId, text)`; always editable, never submitted. |
| Draft protection | Public `getDraft(sessionId)` when present: empty/whitespace or trimmed-equal draft fills once; different nonempty draft requires a second same-chip click within 5 seconds. |
| Old host without `getDraft` | Direct draft replacement remains available; preserve existing text before clicking. |
| Missing `setDraft` | Disabled chips and upgrade hint, never private DOM/events. |
| Native gray preview | Desktop containing PR #151206; optional `setPredictions` and `clearPredictions`. Not implied by the CLI version. |
| Generation | Existing host gateway `session.history` then one `llm.oneshot`, task `composer_predictions`, active session/profile; timeout 150000ms. |
| Persistent identity | Internal ID `conversation-guidance`, English default / optional `zh-CN`, enabled switch via `ctx.storage`. |

The manifest/catalog floor `>=0.23.0` is a conservative released CLI/catalog baseline, not a promise of native-preview availability or the earliest Desktop version. The CLI alone cannot host the UI. Working generation also requires the gateway's `llm.oneshot` route and configured model.

## Native publication ownership

The plugin publishes `{ sessionId, profile, connectionId, suggestions }` only when all scope fields are nonempty strings. Results are discarded after superseded requests or identity changes; old results are never relabeled with a new scope. It retains the **exact** opaque `ComposerPredictionHandle` object returned by the host, never copies/serializes it and never passes a session string to `clearPredictions`. Declined (`null`) publication leaves an existing owned handle intact. Clear occurs on regeneration, disable, session/profile/connection changes, unmount/hot reload. Old-handle cleanup cannot target another publisher's newer preview under the SDK contract.

The host implements **Tab** wraparound / **ArrowRight** accept into an editable draft / **Escape** hide. Shift+Tab keeps focus navigation. It owns empty-draft, visible/focused/idle receiving composer, IME and slash/mention menu eligibility. No eligible preview means normal keys remain untouched. Acceptance never sends. Missing `setPredictions`, incomplete scope, or a declined publication does not affect three bottom chips/click insertion. Plugin reload cannot add a missing host API. Actual native keyboard/IME behavior still needs live-host verification.

## Draft replacement protection

If `getDraft` exists it is awaited before each write. A nonempty different draft is not overwritten on the first click; localized `info` notification asks for a second click on the same suggestion within 5 seconds. Another suggestion changes the confirmation target and prompts again. Expiry, edited draft, session/profile/connection changes, disable, regeneration, or unmount resets confirmation. An asynchronous read resolving after reset is ignored. Empty/whitespace-only or trimmed-equal drafts insert immediately. A read failure reports a generic error without writing. Without `getDraft`, `setDraft` is called directly for backward compatibility. There is no auto-send and no private DOM access. The SDK does not provide an atomic compare-and-set draft operation: this is click protection, not a transactional editor lock.

## Rule 13 disclosure / data flow

1. After a completed assistant turn (also eligible session open/manual refresh), read the current session history via the existing gateway.
2. Select the latest six nonempty visible user/assistant messages, capped at 12,000 message-text characters, favoring recent text. Exclude system/tool messages and hidden reasoning.
3. Make one auxiliary model request per generation: `llm.oneshot`, `task: 'composer_predictions'`, session/profile, timeout 150000ms. Context plus instructions goes to the host-configured provider; normal provider costs/retention apply. Instructions/formatting are outside the text cap.
4. Filter up to three suggestions and discard stale results. Interface-language changes do not request new suggestions.
5. Only clicking/accepting writes a draft, never history or an automatically sent turn. `getDraft` reads the current draft locally for confirmation, not model context.

No credential-file/store reads, direct third-party network client, external telemetry, runtime shell execution, background processes, self-updater, or extra backend tools/hooks/middleware/env. Only locale/enabled persist; suggestions/handles/confirmations are in memory. The manual installer writes a selected plugin file, receipt and conflict backups only; unrelated data/preferences remain. Visible secrets are **not redacted**. Disabling stops new requests but cannot cancel already-issued calls or their cost. Host diagnostics/provider retention remain outside the plugin's control.

## Troubleshooting

- No suggestions: enable, open an assistant-ended session, then retry `↻`.
- Failure: check gateway/provider/task routing, then manually retry. Do not publish conversation text or credentials in bug reports.
- First click does nothing: read the notification; existing text requires a second same-chip click within 5 seconds on hosts with `getDraft`.
- Chips work but no gray preview: host lacks PR #151206, scope is incomplete, or receiving composer is ineligible.
- Installation refusal: inspect existing files. `--force` backs up differing files on install, never deletes an edited file on uninstall.
