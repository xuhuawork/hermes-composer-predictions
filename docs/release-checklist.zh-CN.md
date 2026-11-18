# 发布检查表

[English](release-checklist.md) · [README](../README.zh-CN.md)

**状态：** 0.1.0 插件目录候选，仅本地准备。未创建公开仓库、push、目录 PR 或验证真实窗口。勾选项有[本地验证证据](validation.md)，未勾选的发布/真实宿主门槛不宣称通过。

## 本地候选门槛

- [x] 根目录 `plugin.yaml`：版本 `0.1.0`、ID/name `conversation-guidance`、保守 SemVer 基线 `>=0.23.0`、空后端 capabilities/env；目录草案一致。
- [x] 根目录 `plugin.js` 唯一源码，`npm run build` 复制到 `desktop/plugin.js`；`npm run check` 验证字节一致和语法。沙盒故意制造漂移时检查失败。
- [x] 运行时仅 SDK/React 导入，无自更新、核心覆盖/DOM 注入、随包二进制或越界符号链接。
- [x] 完整非空 session/profile/connection 发布与原对象句柄清理；覆盖拒绝/null 所有权、旧结果、切换、重新生成、禁用、卸载。
- [x] 无原生预览时三条芯片仍可点击，填草稿绝不发送；B 方案样式属性保持不变。
- [x] `getDraft` 保护：空/空白/相同直接填；其他文本须本地化 info 提示后 5 秒内再点同一条；换条、超时、草稿编辑、身份切换、禁用、重生重置；读取失败/过期异步结果不覆盖；无接口直接降级填入。
- [x] 持久化开关、默认英文/可选中文；换语言不发请求；`150000ms` 请求超时与失败手动重试覆盖。
- [x] `npm run check` 通过；依赖仅开发使用且不提交。
- [x] 官方 `plugins validate ... --install-deps` 无失败；desktop surface 通过，security scan 为 safe。逐条审查唯一预期 warning：无 `__init__.py`，跳过 Python capability probe；插件无后端注册可探测。
- [x] CLI 在独立 `HERMES_HOME` 对本地快照真实安装、force 重装、remove，读回 manifest/入口字节并确认插件目录删除。
- [x] 直接安装器在隔离 home 验证 dry-run、安装、幂等重装、卸载及冲突/备份/所有权保护；确认插件及收据清除、无关文件保留。
- [x] 中英 README/兼容性披露：当前会话最近六条可见 user/assistant、最多 12,000 文本字符；每次生成一次网关 `llm.oneshot`（`composer_predictions`）；不写历史、不读凭据文件、无外部遥测/运行时 shell/后台进程、仅草稿不发送；本地草稿保护及旧宿主回退；费用和可见秘密风险。
- [x] 区分芯片 `setDraft` 兼容与需要 PR #151206 的原生灰字（Tab / → / Esc）。
- [x] 目录 YAML 草案提供明确的未定公开仓库/维护者/40 位 SHA 占位说明，不虚构公开地址或截图。
- [x] 候选源码树扫描无本机绝对用户路径及二进制/符号链接载荷。

## 真实 Desktop 验证——本任务未执行

- [ ] 安装至真实用户档案前另行获得许可；准备阶段不覆盖现有运行环境。
- [ ] 真实窗口确认加载、生成及任务/模型路由，逐条精确填草稿且不发送。
- [ ] 真实已有草稿的 5 秒二次点击保护、中英通知及重启后偏好持久化。
- [ ] 检查已定稿玻璃样式、悬停/聚焦提示、长中文/URL、窄窗口及主题对比。
- [ ] 含 PR #151206 的宿主验证 Tab 循环、→ 接受、Esc 关闭、正常 Shift+Tab、输入法、输入、竞争菜单/焦点、作用域切换、禁用及热重载。

模拟测试证明插件契约，不等于原生键盘/输入法或真实视觉验收。原样式定义不变，不伪造现场截图。

## 发布门槛——须后续明确批准

- [ ] 授权并创建最终公开仓库（本任务未创建）。
- [ ] 在 `docs/catalog-entry.draft.yaml` 填入维护者/仓库及最终公开提交完整 40 位 SHA，不提交全零占位，重新验证最终公开树。
- [ ] 添加经隐私审查的真实界面截图并固定到 SHA，PR 正文包含 README 的第 13 条披露。
- [ ] push、tag、公开发布或向 NousResearch 提交单文件 `plugin-catalog/conversation-guidance.yaml` PR 前获得许可。本任务允许本地 commit，不授权公开操作。
- [ ] 等待官方目录 CI 与人工维护者审核；`tier: community` 不宣称官方/verified 品牌。

`private: true` 防止意外 npm 发布，不代表 GitHub 私有设置；后续单独批准打包决策前保留。
