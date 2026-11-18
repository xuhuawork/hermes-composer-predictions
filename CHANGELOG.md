# Changelog

## 0.1.0 — Unreleased candidate

Private pending publication approval. No release date or published artifact is claimed.

### Candidate scope

- Standalone, single-file Hermes Desktop plugin retaining runtime ID `conversation-guidance`.
- Three requested next-step prompts after assistant completion, eligible session opening, or manual refresh; click replaces the editable draft without sending.
- Persisted enable switch and English/Simplified Chinese interface, independent of conversation language; approved glass-style suggestion chips retained.
- Standard SDK `setDraft` integration; optional `getDraft` protects nonempty drafts with a localized same-chip second click within 5 seconds, including asynchronous read/expiry guards. Old hosts without `getDraft` retain direct replacement.
- PR #151206 native preview uses complete session/profile/connection scope and exact opaque cleanup handles; declined publication preserves ownership, missing preview APIs preserve chips.
- Catalog `plugin.yaml`, byte-identical `desktop/plugin.js` build/check, empty backend capabilities, official validation evidence and catalog-entry draft (public identity/SHA pending approval).
- Dedicated `composer_predictions` auxiliary task with `session_id` and backend-controlled model routing.
- Bounded visible-conversation context, stale-result protection, and explicit privacy/cost documentation.
- Local installer with dry run, guarded overwrite, and ownership-aware uninstall; bilingual documentation and release checks.

### Verification boundary

The standalone candidate is not yet live-window verified. Mocked tests are not evidence of native keyboard, IME, or preview behavior. Those require host API support and manual validation before release claims.

## 0.1.0 — 未发布候选版本

获批发布前保持私有；不宣称已有发布日期或已发布产物。

### 候选范围

- 独立单文件 Hermes Desktop 插件，保留运行时 ID `conversation-guidance`。
- 助手回复完成、打开符合条件的会话或手动刷新时请求三条下一步提示；点击替换可编辑草稿，不发送。
- 持久化功能开关及英/简中界面，独立于对话语言；保留已批准的玻璃质感建议按钮。
- 使用标准 SDK `setDraft`；可选 `getDraft` 保护非空草稿，须本地化提示后 5 秒内再点同一条，含异步读取和过期保护；无 `getDraft` 的旧宿主保留直接替换。
- PR #151206 原生预览使用完整 session/profile/connection 和不透明原对象句柄，拒绝发布不丢失所有权，无预览接口不影响芯片。
- 增加目录 `plugin.yaml`、逐字节一致的 `desktop/plugin.js` 构建/检查、空后端能力、官方验证证据和目录条目草案（公开身份/SHA 待批准）。
- 专用辅助任务 `composer_predictions`，携带 `session_id`，由后端控制模型路由。
- 限制可见对话上下文，防止过期结果，并明确隐私/费用说明。
- 提供本地安装脚本、预演、受保护的覆盖、基于所有权的卸载，以及双语文档和发布检查。

### 验证边界

独立候选版本尚未通过真实窗口验证。模拟测试不证明原生键盘、输入法或预览行为；发布前仍需宿主接口支持及手动验证。
