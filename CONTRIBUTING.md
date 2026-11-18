# Contributing

## English

This is a standalone plugin, not a Hermes core patch. Version 0.1.0 remains private pending publication approval. Use local changes for now; no remote repository or issue-tracker URL is advertised.

### Set up and verify

Use Node.js 22.13+:

```sh
npm ci --ignore-scripts
npm run build
npm run check
```

Root `plugin.js` is the sole source; build its plain-text `desktop/plugin.js` catalog copy with `npm run build`. The check rejects drift. Dependencies are development-only. Test installation in an isolated temporary Hermes home, never against a personal profile by default.

### Preserve these contracts

- Keep runtime ID `conversation-guidance` and existing settings stable.
- Selection replaces an editable draft through standard `setDraft` and never sends. Missing API means disabled controls and an upgrade hint, not private DOM/events.
- Preserve the approved thin-border glass style and readable full-prompt tooltips; do not redesign it incidentally.
- Keep English and Simplified Chinese UI/docs equivalent. Interface locale does not select the conversation language.
- Use `composer_predictions` with `session_id`; model routing belongs to the backend, not a plugin model picker.
- Preserve context limits, enable-state persistence, stale-result guards, and session-scoped cleanup. Do not claim cancellation of issued requests or secret redaction.
- Native preview requires PR #151206: publish complete scope and retain exact opaque handles for cleanup; null must not discard ownership. Distinguish this from chip compatibility and the conservative CLI/catalog manifest floor.
- Protect differing nonempty drafts when public `getDraft` exists: same-chip second click within 5 seconds, resets and stale-read guards. Without it retain direct `setDraft`; never send.

Add behavior tests, not assertions that grep source code. Cover races and missing capabilities, not just the happy path. Report mocked test results separately from live-window validation. Follow the [release checklist](docs/release-checklist.md) for keyboard, IME, and native preview checks.

Do not include private paths, history, credentials, or user screenshots in examples or reports. Use synthetic test fixtures clearly identified as fixtures, never as claimed live results. Keep changes scoped; do not commit, push, tag, publish, or create a remote without explicit authorization.

## 简体中文

这是独立插件，不是 Hermes 核心补丁。0.1.0 在获批发布前保持私有。目前以本地修改为主，不提供虚构的远程仓库或问题跟踪地址。

### 环境与验证

使用 Node.js 22.13+，执行上方的 `npm ci --ignore-scripts`、`npm run build` 和 `npm run check`。

根目录 `plugin.js` 是唯一源码，`npm run build` 生成纯文本 `desktop/plugin.js` 目录副本，检查拒绝漂移。依赖仅用于开发。安装测试应使用隔离临时 home，不应默认操作个人档案。

### 必须保留的约定

- 保持运行时 ID `conversation-guidance` 和已有设置稳定。
- 通过标准 `setDraft` 替换可编辑草稿，绝不发送。缺少接口时禁用控件并提示升级，不使用私有 DOM/事件回退。
- 保留已批准的细边框玻璃质感与完整提示的可读性，不夹带视觉重设计。
- 英文、简体中文界面和文档保持一致；界面语言不决定对话语言。
- 使用 `composer_predictions` 和 `session_id`；模型路由由后端负责，不增加插件模型选择器。
- 保留上下文限制、开关持久化、过期结果防护和会话级清理；不得宣称能取消已发请求或自动脱敏。
- 原生预览需 PR #151206：完整作用域和原对象不透明句柄清理，null 不丢所有权；与芯片兼容和保守 CLI/目录基线分开说明。
- 有公开 `getDraft` 时，其他非空草稿须 5 秒内再次点击同一建议，并重置/防过期读取；无接口保留直接 `setDraft`，不发送。

增加行为测试，不要用搜索源码文本的断言替代测试。覆盖竞态与缺失能力，不只测试成功路径。模拟测试结果与真实窗口验证分别报告。键盘、输入法及原生预览验证遵循[发布检查表](docs/release-checklist.zh-CN.md)。

示例和报告不得包含私人路径、历史、凭据或用户截图。合成测试数据必须明确标为测试夹具，不得伪装成真实运行结果。保持修改范围；未获明确授权不得提交、推送、打标签、发布或创建远程仓库。
