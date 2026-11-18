# Local validation / 本地验证

This records actual local candidate-preparation commands, not a public release or live-window acceptance. 本页为真实本地命令证据，不代表公开发布或真实窗口验收。

## Automated checks / 自动检查

- Node.js `v22.22.3`; specified official CLI interpreter reports Python `3.11.3`. The validator prepares its own isolated managed runtime inside the sandbox home.
- `npm run build`: generated plain-text `desktop/plugin.js` from root `plugin.js`.
- `npm run check`: artifact byte-identity check, syntax checks, real React/jsdom behavior tests and actual installer CLI tests. **78 tests, 78 pass, 0 fail, 0 skipped**.
- Tests cover complete scoped publication, exact opaque handle identity, null preserving prior ownership, stale work/old-handle cleanup, session/profile/connection changes, disable/regeneration/unmount; three chips and exact `setDraft` insertion with no native preview and no sending; persisted switch/locale with no locale-triggered request; `150000ms` forwarding and timeout-error retry.
- Additional draft-protection tests cover empty/whitespace/trimmed-equal/null reads, differing-text first-click preservation, bilingual informational prompt, 5-second second same-chip acceptance, other-chip/reset/expiry/edited-draft paths, read failure, missing-API fallback, late async reads, and slow/overlapping reads. Two async edge cases were reproduced as failing regressions, then fixed: a pending read for another chip must reset confirmation immediately, and the 5-second window starts at click time rather than read completion.
- Glass styling assertions inspect real React element style props (jsdom cannot parse the `color-mix` border): `8px`, `0.5px`, `blur(12px) saturate(115%)`, `38%` remain unchanged. These are not live visual screenshots.
- `npm pack --dry-run --json`: package includes manifest/root source/catalog artifact/build and install scripts/docs/license; no development dependencies. No archive was published.
- Candidate git-index source-tree scan: **24 files**, no local absolute user paths, symlinks or native executable/WebAssembly/bytecode payloads. Local `.git` metadata and ignored `node_modules` test tooling are not release source or package content.
- Plugin source/catalog artifact SHA-256: `0cbe3af48b21f0fae3b3cd2b730243c615c753ca2bb6ab06709163d533eae2af`.

## Official admission / 官方准入

Read the supplied SDK checkout's `website/docs/developer-guide/plugins/catalog-submission.md`, `plugin-catalog/README.md`, `hermes_cli/plugin_validate.py`, and prediction SDK contract. Used the requested interpreter and `PYTHONPATH` pointing to that SDK checkout. All install/validation homes were isolated; no production Desktop plugin/application/core source was overwritten.

Executed command (machine-specific paths represented by environment variables):

```sh
HERMES_HOME="$SANDBOX/validate-home" \
PYTHONDONTWRITEBYTECODE=1 \
PYTHONPATH="$HERMES_SDK_CHECKOUT" \
"$HERMES_VALIDATOR_PYTHON" -m hermes_cli.main plugins validate "$PLUGIN_CHECKOUT" --install-deps --json
```

**Exit 0; 13 checks passed, 0 failures, 1 warning.** Exact machine-readable output: [official-validation.json](official-validation.json).

| Check / 检查 | Actual result / 真实结果 |
| --- | --- |
| manifest / fields | parses; name, version, description present |
| requires_hermes | `>=0.23.0` parses |
| config / env / oauth | no config or oauth; no required env |
| loadable | `desktop/plugin.js` |
| Python dependencies | none declared |
| capability probe | skipped: no `__init__.py` |
| built-in tool collisions | no tools to check |
| security scan | **safe**, no caution warning |
| no core override | passes, no runtime core rebinds |
| desktop surface | **stays inside plugin SDK**, no warning |
| isolation (informational) | portable, host_ready=true |

The sole warning is `no __init__.py — capability probe skipped (manifest-only plugin)`. Reviewed: this is a desktop-only plugin with no Python entrypoint/backend tools/hooks/middleware/env to probe; its manifest explicitly declares empty capabilities. No dummy Python module was added just to hide the warning. Desktop behavior is separately exercised in React tests. 没有 Python 注册并非隐藏能力；唯一 warning 已审查，不伪装成零警告。

Initial dependency preparation encountered a certificate-verification error. Re-ran with `SSL_CERT_FILE` set to the existing interpreter's certifi CA bundle; TLS verification remained enabled and isolated dependency preparation completed. No runtime installation repair or production configuration change was made. An initial overly conservative `>=0.23.2` floor correctly refused the available `0.23.0` CLI; final manifest/catalog floor is the released **0.23.0 baseline actually exercised**, not a native-preview claim.

## Sandboxed installation / 沙盒安装

Created a source-only local Git snapshot in the scratch sandbox; did **not** create a public remote. With independent `HERMES_HOME` values, executed the real CLI:

```sh
"$HERMES_VALIDATOR_PYTHON" -m hermes_cli.main plugins install "file://$SANDBOX/candidate" --no-enable --yes-deps
"$HERMES_VALIDATOR_PYTHON" -m hermes_cli.main plugins install "file://$SANDBOX/candidate" --force --no-enable --yes-deps
"$HERMES_VALIDATOR_PYTHON" -m hermes_cli.main plugins remove conversation-guidance
```

Read back `plugins/conversation-guidance/plugin.yaml` and `desktop/plugin.js`, verified byte equality to the candidate, verified force reinstall, then verified the plugin directory absent after remove. CLI also reported the plugin `0.1.0`, source `git`, not enabled. Custom-source/local-file URL warnings are expected for this sandbox drill and are **not** catalog admission warnings. No source trust/security check was disabled.

In a separate direct-installer home:

```sh
node scripts/install.mjs
node scripts/install.mjs
node scripts/install.mjs --uninstall
```

Verified installed bytes match both root source and catalog entry; unchanged reinstall creates no backup; uninstall leaves neither plugin nor receipt. Automated installer tests also exercise dry run, conflict refusal, byte-exact backup, edited/unowned-file refusal, symlink refusal, and preservation of unrelated files. No live profile was used. Final candidate source (including async guards) was reinstalled/rechecked through both routes after the fixes.

## Remaining gates / 剩余门槛

- No live Desktop window was changed. Real host rendering, keys/IME, focus, theme/layout and actual running gateway/provider integration were not retested here. No new backend request against private history was made; previous probe claims are not carried forward as evidence for this candidate.
- Local tests ran on macOS (`v22.22.3`); cross-platform verification runs in official catalog CI upon submission.
- No public remote, push, tag, release, or catalog PR. The draft's `OWNER` and all-zero SHA are explicit placeholders, not submission-ready public identities. Replace them only after publication authorization; provide real privacy-reviewed UI screenshots and revalidate the final public SHA.

See [release checklist](release-checklist.md) / [发布检查表](release-checklist.zh-CN.md).
