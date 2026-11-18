# Release checklist

[简体中文](release-checklist.zh-CN.md) · [README](../README.md)

**Status:** 0.1.0 catalog candidate, local preparation only. No public repository, push, catalog PR, or live-window verification. Checked items have local automated evidence in [validation](validation.md); unchecked publication/live-host gates are not claimed passed.

## Local candidate gates

- [x] Root `plugin.yaml`: version `0.1.0`, ID/name `conversation-guidance`, conservative SemVer floor `>=0.23.0`, empty backend capabilities/env; catalog draft matches.
- [x] Root `plugin.js` is sole source; `npm run build` copies to `desktop/plugin.js`; `npm run check` verifies byte identity and syntax. Drift test fails on a deliberately stale sandbox copy.
- [x] Only SDK/React runtime imports, no self-update, no core patch/DOM injection, no shipped binary or escaping symlink.
- [x] Scoped publication uses nonempty session/profile/connection and exact opaque cleanup handles; tests cover decline/null ownership, stale results, changes, regeneration, disable and unmount.
- [x] Three clickable chips work without native preview; draft insertion never sends. Approved B style props unchanged.
- [x] `getDraft` protection: empty/whitespace/equal → direct; differing text → localized info and same-chip second click within 5 seconds; other chip/expiry/edited draft/identity/disable/regenerate reset; read error/late result cannot overwrite; absent API falls back directly.
- [x] Persisted switch/English default/Chinese selection; locale change makes no request; `150000ms` request timeout and failure/manual retry covered.
- [x] `npm run check` passes. Dependencies remain dev-only and uncommitted.
- [x] Official `plugins validate ... --install-deps`: zero failing checks; desktop surface passes, security scan safe. Review the one expected warning: no `__init__.py`, Python capability probe skipped; no backend registrations to probe.
- [x] Real CLI local-snapshot install / force reinstall / remove under isolated `HERMES_HOME`; verify manifest/entry bytes and removed plugin directory.
- [x] Real direct installer dry-run/install/idempotent reinstall/uninstall, conflict/backup/ownership safeguards under isolated homes; verify plugin/receipt removal and unrelated-file preservation.
- [x] English/Chinese READMEs and compatibility docs disclose: current-session latest six visible user/assistant messages, max 12,000 text chars; one gateway `llm.oneshot` per generation (`composer_predictions`); no history writes, credential-file reads, external telemetry, runtime shell or background process; draft only, never send; local draft read protection and old-host fallback; provider costs/visible-secret risk.
- [x] Separate chip `setDraft` compatibility from native preview requiring PR #151206 (Tab / → / Esc).
- [x] Catalog YAML draft provided, with explicit non-final public repo/maintainer/40-hex SHA placeholders; no invented public URL or screenshot claim.
- [x] Candidate-source tree scanned for local absolute user paths and binary/symlink payloads; none shipped.

## Live Desktop verification — not performed by this task

- [ ] Obtain permission before installing candidate in any real user profile; never overwrite a live installation during preparation.
- [ ] Confirm loading/generation in a real window, task/model routing and all three exact click insertions without send.
- [ ] Confirm 5-second same-chip protection against a real existing draft, English/Chinese notifications, state persistence after restart.
- [ ] Inspect approved glass styling, tooltip focus/hover, long Chinese/URLs, narrow windows and theme contrast.
- [ ] On a PR #151206 host, test Tab wraparound / → accept / Esc hide, normal Shift+Tab, IME, typing, competing menus/focus, scope changes, disable and hot reload.

Mocks validate plugin contracts, not native keyboard/IME or live visual fidelity. Existing style definitions are unchanged; live screenshots are not fabricated.

## Publication gate — explicit later approval required

- [ ] Authorize/create the final public repository (none created here).
- [ ] Set final maintainer/repo and full public 40-character SHA in `docs/catalog-entry.draft.yaml`; never submit the all-zero placeholder. Revalidate the exact published tree.
- [ ] Add real privacy-reviewed UI screenshots, pinned to that SHA; include README rule 13 disclosure in the PR description.
- [ ] Obtain approval before push/tag/publication or opening the one-file `plugin-catalog/conversation-guidance.yaml` PR to NousResearch. Local commits are allowed by this task; public actions are not.
- [ ] Wait for official catalog CI and human maintainer review. `tier: community` is intentional, not official/verified branding.

`private: true` prevents accidental npm publishing; it is not a GitHub visibility setting. Keep it until a separately authorized packaging decision.
