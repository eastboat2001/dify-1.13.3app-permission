# Dify 1.13.3 二次开发记录

## 文档作用

本文档用于记录基于 Dify 1.13.3 原始版本进行二次开发时产生的所有代码、配置、数据库、脚本和文档变更。

后续每一次需求开发、问题修复、运行配置调整、依赖变更或临时兼容处理，都需要在本文档中新增一条开发记录。记录的目标是让维护者可以快速回答以下问题：

- 相比 Dify 1.13.3 原始版本，新增、修改或删除了哪些文件。
- 每个变更是为了解决什么需求或问题。
- 变更涉及后端、前端、Docker、中间件、数据库迁移还是运行环境。
- 如何验证本次变更已经生效。
- 如果需要回退，应优先回退哪些文件或配置。

本文档只记录二次开发相关内容，不替代 Git diff、提交记录或代码注释。代码实现细节仍以源码和测试为准；本文档负责保留面向维护和对比的变更说明。

## 记录规则

- 按日期倒序记录，最新日期放在最上方。
- 同一天可以有多条记录，按时间或需求顺序追加。
- 每条记录必须尽量写清楚文件路径，路径相对仓库根目录，例如 `web/app/layout.tsx`。
- 涉及配置文件时，需要说明配置项名称和调整原因。
- 涉及数据库时，需要说明迁移文件、表结构、数据修复或初始化动作。
- 涉及依赖时，需要说明包名、版本、所属模块和引入原因。
- 涉及临时兼容方案时，需要标明“临时处理”以及后续建议。
- 不记录密钥、Token、账号密码等敏感值；如需说明，只写变量名和用途。

## 记录格式

每次开发记录使用以下模板：

```md
## YYYY-MM-DD

### 需求 / 背景

- 说明本次开发、修复或调整的目标。
- 说明触发原因，例如业务需求、运行问题、兼容问题或重构需求。

### 变更摘要

- 用 1-3 条概括本次改动的主要内容。

### 文件变更

| 类型 | 文件路径 | 说明 |
| --- | --- | --- |
| 新增 | `path/to/file` | 新增内容和用途 |
| 修改 | `path/to/file` | 修改点和原因 |
| 删除 | `path/to/file` | 删除原因和影响 |

### 配置 / 环境变更

- 配置项：说明调整内容和原因。
- 环境变量：说明变量名、用途和默认值策略。
- 中间件：说明 Docker、数据库、Redis、向量库等调整。

### 数据库变更

- 迁移文件：`api/migrations/...`
- 表 / 字段：说明新增、修改、删除的结构。
- 数据处理：说明是否需要初始化、补偿或清理历史数据。

### 验证方式

- 命令：`command`
- 结果：说明关键输出、通过条件或剩余风险。

### 与原始版本对比说明

- 说明本次变更相对 Dify 1.13.3 原始版本的差异点。
- 说明是否影响升级、合并上游代码或回退。

### 回退方式

- 说明需要回退的文件、配置或数据库迁移动作。

### 备注 / 后续事项

- 记录未完成事项、临时方案、风险点或后续优化建议。
```

## 2026-06-25

### 需求 / 背景

- 手动测试和 UI 评审发现：应用权限页在“指定工作区编辑者”或“指定团队成员”模式下直接展开完整成员列表。
- 当工作区成员数量较多时，内嵌列表会占据大量竖向空间，搜索、筛选、批量选择和阅读体验都会下降。
- 期望改为“页面摘要 + 弹窗选择器”：页面只展示已选人数和少量成员摘要，点击后在弹窗中搜索、按角色筛选、只看已选、批量选择当前结果，并保留“由编辑权包含”的锁定成员逻辑。

### 变更摘要

- 新增 `MemberPermissionPicker` 弹窗组件，替代权限页原有内嵌长列表。
- 成员选择弹窗支持搜索姓名/邮箱、按角色筛选、只看已选、选择当前结果、清空可取消项。
- 使用权限弹窗继续支持锁定由编辑权继承的成员，锁定成员不可取消。
- 抽出并测试成员筛选、批量选择、清空和摘要计算工具函数。

### 文件变更

| 类型 | 文件路径 | 说明 |
| --- | --- | --- |
| 新增 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/member-picker.tsx` | 新增成员权限选择器组件，提供摘要卡片和弹窗选择体验。 |
| 修改 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/page.tsx` | 用 `MemberPermissionPicker` 替换旧的内嵌成员列表。 |
| 修改 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.ts` | 新增成员筛选、批量添加、清空可取消成员和摘要计算工具函数。 |
| 修改 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.spec.ts` | 新增成员筛选、批量操作和摘要计算单元测试。 |
| 修改 | `web/i18n/en-US/app.json` | 新增成员选择弹窗英文文案。 |
| 修改 | `web/i18n/zh-Hans/app.json` | 新增成员选择弹窗中文文案。 |
| 修改 | `docs/development-records.md` | 追加本次开发记录。 |

### 配置 / 环境变更

- 无。

### 数据库变更

- 无。

### 验证方式

- 红测：`node node_modules/vite-plus/bin/vp test --run "app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.spec.ts"`
  - 结果：新增 5 个用例在实现前失败，原因是成员选择工具函数尚不存在。
- 单元测试：`node node_modules/vite-plus/bin/vp test --run "app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.spec.ts"`
  - 结果：`1 passed`，`14 passed`。
- 类型检查：`node_modules\.bin\tsgo.cmd --noEmit`
  - 结果：通过，无输出错误。
- 目标 lint：`node node_modules/eslint/bin/eslint.js --pass-on-unpruned-suppressions "app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/page.tsx" "app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/member-picker.tsx" "app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.ts" "app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.spec.ts"`
  - 结果：0 errors，4 warnings；warning 为 `page.tsx` 既有 Remixicon 图标可替换为 Tailwind icon class，本次未扩大。

### 与原始版本对比说明

- 相比 Dify 1.13.3 原始版本，继续完善二次开发新增的应用级权限管理前端体验。
- 不涉及后端接口、权限模型、数据库结构或迁移脚本。
- 弹窗使用当前项目推荐的 `@/app/components/base/ui/dialog`，没有继续使用已废弃的 legacy `Modal`。

### 回退方式

- 删除 `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/member-picker.tsx`。
- 回退 `page.tsx` 中对 `MemberPermissionPicker` 的引用，恢复旧的内嵌成员列表。
- 回退 `utils.ts`、`utils.spec.ts` 和 i18n 文案变更。
- 不需要数据库回滚。

### 备注 / 后续事项

- 手动测试时重点确认：成员较多时页面高度保持稳定；弹窗搜索、角色筛选、只看已选、选择当前结果、清空可取消项和锁定成员均符合预期。
- 后续如果接入部门、用户组或组织架构，可以在该弹窗内继续扩展筛选维度，不需要再扩大权限页主体布局。

## 2026-06-25

### 需求 / 背景

- 手动测试发现：当编辑权限选择“指定工作区成员”且包含非创建者时，使用权限中的“仅创建者”虽然会被自动纠正为“指定团队成员”，但界面仍看起来可选择，容易让用户误解。
- 权限规则要求：拥有应用编辑权的成员必须同时拥有使用权，因此当编辑权已覆盖非创建者时，使用权不能设置为“仅创建者”。
- 期望行为：此类情况下“使用权限 / 仅创建者”直接显示为不可选择，并说明禁用原因。

### 变更摘要

- 新增前端工具函数 `isUseOnlyCreatorScopeBlocked`，用于判断“仅创建者”使用范围是否被编辑权继承规则阻止。
- 权限管理页在编辑权覆盖非创建者时，将使用权限“仅创建者”选项置灰，并显示禁用原因。
- 补充中英文 i18n 文案和工具函数单元测试。

### 文件变更

| 类型 | 文件路径 | 说明 |
| --- | --- | --- |
| 修改 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.ts` | 新增“仅创建者使用权限是否应禁用”的判断函数，并复用到权限归一化逻辑。 |
| 修改 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.spec.ts` | 增加编辑权继承使用权导致“仅创建者”不可选的单元测试。 |
| 修改 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/page.tsx` | 使用权限“仅创建者”在不满足规则时置灰，并展示不可选原因。 |
| 修改 | `web/i18n/en-US/app.json` | 新增英文禁用原因文案。 |
| 修改 | `web/i18n/zh-Hans/app.json` | 新增中文禁用原因文案。 |
| 修改 | `docs/development-records.md` | 追加本次开发记录。 |

### 配置 / 环境变更

- 无。

### 数据库变更

- 无。

### 验证方式

- 红测：`node node_modules/vite-plus/bin/vp test --run "app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.spec.ts"`
  - 结果：新增 2 个用例在实现前失败，原因是 `isUseOnlyCreatorScopeBlocked is not a function`。
- 单元测试：`node node_modules/vite-plus/bin/vp test --run "app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.spec.ts"`
  - 结果：`1 passed`，`9 passed`。
- 类型检查：`node_modules\.bin\tsgo.cmd --noEmit`
  - 结果：通过，无输出错误。
- 目标 lint：`node node_modules/eslint/bin/eslint.js --pass-on-unpruned-suppressions "app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/page.tsx" "app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.ts" "app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.spec.ts"`
  - 结果：0 errors，4 warnings；warning 为 `prefer-tailwind-icons`，来源于该页面既有 Remixicon 用法，本次未扩大。

### 与原始版本对比说明

- 相比 Dify 1.13.3 原始版本，继续完善二次开发新增的应用级权限页交互。
- 不涉及后端接口、数据库结构或权限模型变更；仅让前端状态更清楚地表达既有权限规则。

### 回退方式

- 回退本条记录中列出的前端和 i18n 文件改动。
- 不需要数据库回滚。

### 备注 / 后续事项

- 手动测试时重点确认：编辑权限包含非创建者时，“使用权限 / 仅创建者”置灰并显示说明；切回“仅创建者”编辑权限后，该使用权限选项恢复可选。

## 2026-06-25

### 需求 / 背景

- 手动测试发现：非公开 Web App URL 跳转到控制台登录页后，右上角出现 `App with code null not found` 弹窗，但不影响继续登录。
- 根因：跳转过程中 `WebAppStoreProvider` 会把 shareCode 清空为 `null`，但 share layout 的 `Splash` 仍继续调用 `webAppLoginStatus(shareCode!)`，导致请求 `/api/login/status?app_code=null`。
- 期望行为：shareCode 缺失时不应请求任何 Web App 登录状态接口，也不应向后端发送 `app_code=null`。

### 变更摘要

- `webAppLoginStatus` 支持 `null/undefined/空字符串` shareCode，并在缺失时直接返回未登录状态，不请求后端。
- `Splash` 在 shareCode 缺失时跳过 Web App 登录状态检查，避免路由切换到控制台登录页时触发错误请求。
- 新增回归测试覆盖空 shareCode 不请求后端。

### 文件变更

| 类型 | 文件路径 | 说明 |
| --- | --- | --- |
| 修改 | `web/service/webapp-auth.ts` | `webAppLoginStatus` 入参改为可空，缺失 shareCode 时直接返回 `{ userLoggedIn: false, appLoggedIn: false }`。 |
| 新增 | `web/service/webapp-auth.spec.ts` | 覆盖 shareCode 为 `null` 或空字符串时不调用 `getPublic`。 |
| 修改 | `web/app/(shareLayout)/components/splash.tsx` | shareCode 缺失时不再调用 Web App 登录状态检查；同时避免 `shareCode!` 非空断言。 |
| 修改 | `docs/development-records.md` | 追加本次 `app_code=null` 弹窗修复记录。 |
| 修改 | `docs/ai-agent-system-prompt.md` | 补充 Web App 登录状态检查必须先确认 shareCode 有效。 |

### 配置 / 环境变更

- 无。

### 数据库变更

- 无。

### 验证方式

- 红灯验证：`web/node_modules/.bin/vp.cmd test --run webapp-auth.spec.ts`
  - 初始结果：测试失败，`webAppLoginStatus(null)` 仍尝试解构后端响应，符合预期。
- 绿灯验证：`web/node_modules/.bin/vp.cmd test --run webapp-auth.spec.ts`
  - 结果：`1 passed`，`1 passed`。
- 相关测试：`web/node_modules/.bin/vp.cmd test --run webapp-auth.spec.ts web-app-context-utils.spec.ts webapp-signin/utils.spec.ts post-login-redirect.spec.ts`
  - 结果：`4 passed`，`10 passed`。
- 类型检查：`web/node_modules/.bin/tsgo.cmd --noEmit`
  - 结果：通过。
- ESLint：对 `webapp-auth.ts`、`webapp-auth.spec.ts`、`splash.tsx`、`web-app-context.tsx`、`web-app-context-utils.ts`、`web-app-context-utils.spec.ts` 执行 `eslint --quiet`
  - 结果：通过。

### 与原始版本对比说明

- 相比 Dify 1.13.3 原始版本，属于应用级权限二次开发引入的 Web App 登录跳转链路修复。
- 不改变后端权限规则和数据库结构。
- 修复范围仅限前端 Web App 登录状态检查的空 shareCode 防御。

### 回退方式

- 回退 `web/service/webapp-auth.ts` 和 `web/app/(shareLayout)/components/splash.tsx`。
- 删除 `web/service/webapp-auth.spec.ts`。
- 从 `docs/development-records.md` 和 `docs/ai-agent-system-prompt.md` 删除本次记录。

### 备注 / 后续事项

- 后续任何调用 `/api/login/status` 的逻辑都必须确保传入真实 Web App code，不能传 `null`、`undefined` 或空字符串。

## 2026-06-25

### 需求 / 背景

- 手动测试发现：非公开 Web App URL 正常跳转控制台登录页后，右上角出现错误弹窗 `App with code signin not found`，但不影响继续登录。
- 根因：`WebAppStoreProvider` 在路由切换到 `/signin` 时仍短暂存活，原 shareCode 解析逻辑会把路径最后一段 `signin` 当成 Web App code，请求 `/webapp/access-mode?appCode=signin`，后端因此返回找不到应用。
- 期望行为：只有 `/chat/{code}`、`/chatbot/{code}`、`/completion/{code}`、`/workflow/{code}` 这类真实 Web App 路由才能解析 shareCode；控制台路由不能触发 Web App access-mode 查询。

### 变更摘要

- 抽出 Web App shareCode 解析工具，只允许受支持的 Web App 路由返回 code。
- `WebAppStoreProvider` 改用新解析工具，避免 `/signin`、`/apps`、`/account` 等控制台路径被误判。
- 新增回归测试覆盖 Web App 路由解析和控制台路由排除。

### 文件变更

| 类型 | 文件路径 | 说明 |
| --- | --- | --- |
| 新增 | `web/context/web-app-context-utils.ts` | 新增 `getShareCodeFromPathname` 和 `getShareCodeFromRedirectUrl`，仅支持真实 Web App 路由。 |
| 新增 | `web/context/web-app-context-utils.spec.ts` | 覆盖 `/workflow/{code}` 等可解析，`/signin`、`/apps`、`/account` 不解析。 |
| 修改 | `web/context/web-app-context.tsx` | 移除内联 shareCode 解析逻辑，改用新工具。 |
| 修改 | `docs/development-records.md` | 追加本次登录页误报弹窗修复记录。 |
| 修改 | `docs/ai-agent-system-prompt.md` | 补充 Web App shareCode 解析规则。 |

### 配置 / 环境变更

- 无。

### 数据库变更

- 无。

### 验证方式

- 红灯验证：`web/node_modules/.bin/vp.cmd test --run web-app-context-utils.spec.ts`
  - 初始结果：`web-app-context-utils` 不存在，测试失败，符合预期。
- 绿灯验证：`web/node_modules/.bin/vp.cmd test --run web-app-context-utils.spec.ts`
  - 结果：`1 passed`，`4 passed`。
- 相关测试：`web/node_modules/.bin/vp.cmd test --run web-app-context-utils.spec.ts webapp-signin/utils.spec.ts post-login-redirect.spec.ts`
  - 结果：`3 passed`，`9 passed`。
- 类型检查：`web/node_modules/.bin/tsgo.cmd --noEmit`
  - 结果：通过。
- ESLint：对 `web-app-context.tsx`、`web-app-context-utils.ts`、`web-app-context-utils.spec.ts`、`webapp-signin/page.tsx`、`webapp-signin/utils.ts`、`post-login-redirect.ts` 执行 `eslint --quiet`
  - 结果：通过。

### 与原始版本对比说明

- 相比 Dify 1.13.3 原始版本，属于应用级权限二次开发引入的 Web App 登录跳转链路修复。
- 不改变后端权限规则，也不影响公开 Web App URL。
- 修复范围仅限前端 shareCode 解析，避免控制台路由被误当成 Web App code。

### 回退方式

- 回退 `web/context/web-app-context.tsx`。
- 删除 `web/context/web-app-context-utils.ts` 和 `web/context/web-app-context-utils.spec.ts`。
- 从 `docs/development-records.md` 和 `docs/ai-agent-system-prompt.md` 删除本次记录。

### 备注 / 后续事项

- 后续新增 Web App 路由时，需要同步更新 `web/context/web-app-context-utils.ts` 中允许解析 shareCode 的路由集合。

## 2026-06-25

### 需求 / 背景

- 手动测试发现：应用使用权限未设置为“公开访问 URL”时，直接访问 Web App URL 没有跳转控制台登录页，而是显示“Web 应用身份认证已禁用，请联系系统管理员启用。您也可以尝试直接使用应用。”
- 根因：本地应用级权限把 `/webapp/access-mode` 返回为 `private`，但前端 `webapp-signin` 仍沿用企业版 WebAppAuth 判断；在系统级 `webapp_auth.enabled = false` 时直接渲染禁用提示，没有进入控制台登录流程。
- 期望行为：公开访问 URL 可匿名使用；非公开 URL 必须先登录 Dify 控制台账号，并且账号拥有应用使用权。

### 变更摘要

- 新增 Web App 登录分流工具：当企业 WebAppAuth 未启用但本地应用权限要求 `private/private_all` 时，改为跳转控制台 `/signin`。
- 控制台登录后回跳地址改为 sessionStorage 持久化，避免从 Web App 登录页跳转到控制台登录时丢失原始 URL。
- 新增前端回归测试覆盖本地权限登录分流和登录后回跳持久化。

### 文件变更

| 类型 | 文件路径 | 说明 |
| --- | --- | --- |
| 新增 | `web/app/(shareLayout)/webapp-signin/utils.ts` | 新增本地应用权限登录分流判断和 `redirect_url` 解码工具。 |
| 新增 | `web/app/(shareLayout)/webapp-signin/utils.spec.ts` | 覆盖 `private/private_all` 在企业 WebAppAuth 关闭时应走控制台登录，公开访问和外部成员登录不受影响。 |
| 修改 | `web/app/(shareLayout)/webapp-signin/page.tsx` | 在本地应用权限要求登录时设置登录后回跳地址并跳转 `/signin`，不再显示企业 WebAppAuth 禁用提示。 |
| 修改 | `web/app/signin/utils/post-login-redirect.ts` | 将登录后回跳地址同步写入 `sessionStorage`，解析后清理。 |
| 新增 | `web/app/signin/utils/post-login-redirect.spec.ts` | 覆盖登录后回跳地址跨模块重载仍可恢复。 |
| 修改 | `docs/development-records.md` | 追加本次 Web App 非公开 URL 登录跳转修复记录。 |
| 修改 | `docs/ai-agent-system-prompt.md` | 补充本地应用权限下 Web App URL 的登录规则。 |

### 配置 / 环境变更

- 无。

### 数据库变更

- 无。

### 验证方式

- 红灯验证：`web/node_modules/.bin/vp.cmd test --run webapp-signin/utils.spec.ts post-login-redirect.spec.ts`
  - 初始结果：`webapp-signin/utils` 不存在；`post-login-redirect` 跨模块重载后返回 `null`，符合预期。
- 绿灯验证：`web/node_modules/.bin/vp.cmd test --run webapp-signin/utils.spec.ts post-login-redirect.spec.ts`
  - 结果：`2 passed`，`5 passed`。
- 类型检查：`web/node_modules/.bin/tsgo.cmd --noEmit`
  - 结果：通过。
- ESLint：对 `webapp-signin/page.tsx`、`webapp-signin/utils.ts`、`webapp-signin/utils.spec.ts`、`post-login-redirect.ts`、`post-login-redirect.spec.ts` 执行 `eslint --quiet`
  - 结果：通过。

### 与原始版本对比说明

- 相比 Dify 1.13.3 原始版本，属于应用级权限二次开发的 Web App URL 登录流程修复。
- 不启用企业版 WebAppAuth，不改变公开 URL 行为。
- 只影响本地应用级权限配置为非公开的 Web App URL：未登录时会进入控制台登录，登录后再回到原 Web App URL 换取 Web passport。

### 回退方式

- 回退 `web/app/(shareLayout)/webapp-signin/page.tsx`、`utils.ts`、`utils.spec.ts`。
- 回退 `web/app/signin/utils/post-login-redirect.ts` 和删除 `post-login-redirect.spec.ts`。
- 从 `docs/development-records.md` 和 `docs/ai-agent-system-prompt.md` 删除本次记录。

### 备注 / 后续事项

- 手动测试时建议使用无登录态浏览器或隐身窗口访问非公开 Web App URL，确认进入 `/signin`，登录有使用权账号后能回到原 URL；无使用权账号应被拒绝。

## 2026-06-25

### 需求 / 背景

- 手动测试发现应用权限页允许保存“有编辑权但没有使用权”的矛盾配置。
- 业务规则修正为：应用编辑权必然包含应用使用权；使用权限配置不能排除已经拥有编辑权的人。
- 同步明确管理权规则：应用创建者、工作区 Owner、工作区 Admin 可以修改应用权限；普通 Editor 即使有应用编辑权，也不能修改权限，除非他是应用创建者。

### 变更摘要

- 后端 `AppPermissionService.update_permissions()` 增加使用权归一化，任何 API 保存都会兜底保证“编辑者拥有使用权”。
- 前端权限页新增草稿归一化和锁定显示：由编辑权继承来的使用者会自动选中并禁止取消。
- 权限接口响应增加 `creator_id`，用于前端正确处理“仅创建者”编辑范围带来的使用权继承。

### 文件变更

| 类型 | 文件路径 | 说明 |
| --- | --- | --- |
| 修改 | `api/services/app_permission_service.py` | 保存应用权限时归一化使用权：`selected_members` 自动合并编辑者；`only_creator` 在存在非创建者编辑者时自动扩展为 `selected_members`。 |
| 修改 | `api/tests/unit_tests/services/test_app_permission_service.py` | 新增后端单测覆盖“指定编辑者合并进指定使用者”和“仅创建者使用权自动扩展”两种场景。 |
| 修改 | `api/controllers/console/app/app.py` | `GET/PUT /apps/{app_id}/permissions` 响应增加 `creator_id`。 |
| 修改 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.ts` | 新增权限草稿类型、编辑权继承使用权计算和草稿归一化工具。 |
| 修改 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.spec.ts` | 新增前端单测覆盖继承使用权计算和保存前归一化。 |
| 修改 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/page.tsx` | 权限页联动编辑权与使用权；继承来的使用者显示为锁定项，保存前再次归一化 payload。 |
| 修改 | `web/types/app.ts` | 新增 `creator_id` 响应字段和 `AppPermissionUpdatePayload` 类型。 |
| 修改 | `web/service/apps.ts` | 保存应用权限接口改用 `AppPermissionUpdatePayload`，避免把只读响应字段作为请求体。 |
| 修改 | `web/i18n/en-US/app.json` | 新增继承使用权锁定标签英文文案。 |
| 修改 | `web/i18n/zh-Hans/app.json` | 新增继承使用权锁定标签中文文案。 |
| 修改 | `docs/development-records.md` | 追加本次权限逻辑修复记录。 |
| 修改 | `docs/ai-agent-system-prompt.md` | 补充应用级权限维护规则：编辑权必须隐含使用权。 |

### 配置 / 环境变更

- 无。

### 数据库变更

- 无新增迁移。
- 说明：本次修复在服务层和前端保存层归一化权限数据，不改变已有表结构。

### 验证方式

- 红灯验证：`web/node_modules/.bin/vp.cmd test --run utils.spec.ts`
  - 初始结果：新增 5 个前端用例失败，原因是 `getEditInheritedUseMemberIds` 和 `normalizePermissionDraftForEditAccess` 尚未实现，符合预期。
- 绿灯验证：`web/node_modules/.bin/vp.cmd test --run utils.spec.ts`
  - 结果：`44 passed`，`727 passed`。
- 后端测试：`api/.venv/Scripts/python.exe -m pytest tests/unit_tests/services/test_app_permission_service.py -q --no-cov`
  - 结果：`6 passed`，仅有项目既有 Pydantic deprecation warning。
- 类型检查：`web/node_modules/.bin/tsgo.cmd --noEmit`
  - 结果：通过。
- ESLint：对 `permissions/page.tsx`、`permissions/utils.ts`、`permissions/utils.spec.ts`、`service/apps.ts`、`types/app.ts` 执行 `eslint --quiet`
  - 结果：通过。
- Python 编译检查：`api/.venv/Scripts/python.exe -m compileall controllers/console/app/app.py services/app_permission_service.py tests/unit_tests/services/test_app_permission_service.py`
  - 结果：通过。

### 与原始版本对比说明

- 相比 Dify 1.13.3 原始版本，属于已新增应用级权限模块的逻辑修复。
- 不改变应用权限表结构，不影响兼容默认值 `all_editors + public`。
- 后端兜底使得即使前端或第三方调用方发送不一致 payload，也会保存为逻辑一致的权限配置。

### 回退方式

- 回退本条记录中列出的后端服务、控制器、前端页面、工具函数、类型、service 和 i18n 修改。
- 删除新增的前后端单测用例。
- 从 `docs/development-records.md` 和 `docs/ai-agent-system-prompt.md` 删除本次补充内容。

### 备注 / 后续事项

- 手动测试时重点确认：选择“指定工作区编辑者”后，使用权限的“指定团队成员”列表会自动包含这些编辑者，并显示为不可取消的继承项。

## 2026-06-25

### 需求 / 背景

- 修复应用权限管理页在 Owner/应用创建者账号下仍显示只读、保存按钮置灰的问题。
- 现象：当前账号在数据库中既是工作区 `owner`，也是应用 `created_by`，后端权限接口返回 `can_manage: true`，但前端页面仍显示“只有应用创建者或工作区 Owner/管理员可以修改”并禁用所有控件。
- 根因：权限页通过 `useParams()` 获取 `appId`，在当前 Vinext/Next 兼容运行环境下该页面未稳定拿到路由参数，导致权限查询未可靠执行，页面按默认只读状态渲染。

### 变更摘要

- 新增路径解析工具，从当前 pathname 中解析 `/app/{appId}/...` 的应用 ID。
- 权限页改用 `usePathname()` + `getAppIdFromPathname()` 获取 appId，避免依赖不稳定的 `useParams()`。
- 新增前端单元测试覆盖权限页路径解析。

### 文件变更

| 类型 | 文件路径 | 说明 |
| --- | --- | --- |
| 新增 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.ts` | 新增 `getAppIdFromPathname`，从 pathname 解析应用 ID。 |
| 新增 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.spec.ts` | 新增路径解析单元测试。 |
| 修改 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/page.tsx` | 将 appId 获取方式从 `useParams()` 改为 `usePathname()` 解析，确保权限查询可执行。 |
| 修改 | `docs/development-records.md` | 追加本次权限页置灰修复记录。 |

### 配置 / 环境变更

- 无。

### 数据库变更

- 无。

### 验证方式

- 红灯验证：`web/node_modules/.bin/vp.cmd test --run utils.spec.ts`
  - 初始结果：新增测试因 `./utils` 不存在失败，符合预期。
- 绿灯验证：`web/node_modules/.bin/vp.cmd test --run utils.spec.ts`
  - 结果：`44 passed`，`722 passed`。
- 类型检查：`web/node_modules/.bin/tsgo.cmd --noEmit`
  - 结果：通过。
- ESLint：针对 `permissions/page.tsx`、`permissions/utils.ts`、`permissions/utils.spec.ts` 执行 `eslint --quiet`
  - 结果：通过。

### 与原始版本对比说明

- 相比 Dify 1.13.3 原始版本，属于应用级权限二次开发页面的 bugfix。
- 不影响数据库和后端权限规则，只修复前端路由参数获取方式。

### 回退方式

- 回退 `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/page.tsx` 中 appId 获取方式。
- 删除 `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/utils.ts` 和 `utils.spec.ts`。
- 从 `docs/development-records.md` 删除本条记录。

### 备注 / 后续事项

- 后续在当前 Vinext 运行环境中新增动态路由客户端页面时，优先使用 `usePathname()` 或父级传参方式确认动态参数是否可靠。

## 2026-06-25

### 需求 / 背景

- 在 Dify 1.13.3 已有应用兼容的前提下，新增应用级权限管理。
- 权限分为编辑权、使用权、公开 Web App URL 访问和管理权。
- 兼容策略要求：已有应用迁移后仍保持原行为，工作区编辑者不丢失编辑能力，已发布公开 Web App URL 不失效。

### 变更摘要

- 新增应用权限表、权限枚举、权限服务和数据库迁移，默认 `all_editors + public`。
- 控制台应用列表、探索页可用应用列表、应用详情/编辑/删除/权限接口和 Web App URL 访问接入服务端权限校验。
- 前端新增“权限管理”入口、权限配置页、应用卡片权限摘要 tooltip 和相关中英文 i18n 文案。

### 文件变更

| 类型 | 文件路径 | 说明 |
| --- | --- | --- |
| 新增 | `api/models/app_permission.py` | 新增应用权限枚举、`app_permission_settings` 和 `app_permission_members` ORM 模型。 |
| 新增 | `api/services/app_permission_service.py` | 新增应用级权限服务，集中提供编辑、使用、管理、公开访问和列表过滤判断。 |
| 新增 | `api/migrations/versions/2026_06_25_1000-a1b2c3d4e5f6_add_app_permission_tables.py` | 新增权限表迁移，并为已有应用补齐兼容默认权限记录。 |
| 新增 | `api/tests/unit_tests/services/test_app_permission_service.py` | 新增权限服务单元测试，覆盖兼容默认值、指定编辑者不提升普通成员、指定使用者和管理权规则。 |
| 修改 | `api/models/__init__.py` | 导出新增权限模型和枚举。 |
| 修改 | `api/services/app_service.py` | 工作室应用列表按应用编辑权过滤；新建应用写入兼容默认权限；删除应用清理权限记录。 |
| 修改 | `api/controllers/console/wraps.py` | 通用 `edit_permission_required` 增加应用级编辑权校验。 |
| 修改 | `api/controllers/console/app/app.py` | 应用列表/详情返回权限摘要；新增 `GET/PUT /apps/{app_id}/permissions`；删除改为管理权校验；Trace/API 开关等入口接入应用编辑权。 |
| 修改 | `api/controllers/console/explore/installed_app.py` | 探索页已安装应用列表按应用使用权过滤。 |
| 修改 | `api/services/webapp_auth_service.py` | Web App 认证类型和权限检查同时考虑本地应用级使用权限。 |
| 修改 | `api/controllers/web/passport.py` | 非公开 Web App URL 使用控制台登录态换发 Web passport，并校验应用使用权；保留旧单元测试 mock 边界，仅对真实 `App` 实例执行本地权限查询。 |
| 修改 | `api/controllers/web/wraps.py` | Web API passport 校验时按当前应用权限重新校验使用权；保持 `_validate_user_accessibility` 对旧调用方式兼容，异常分支不让本地权限探测覆盖原始 Unauthorized。 |
| 修改 | `api/controllers/web/app.py` | `/webapp/access-mode` 和 `/webapp/permission` 同步考虑本地应用级使用权限。 |
| 修改 | `api/controllers/web/login.py` | Web App 登录状态检查支持本地应用级非公开访问和控制台登录 token。 |
| 新增 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/permissions/page.tsx` | 新增应用权限管理页面，分编辑权限和使用权限两块配置。 |
| 新增 | `web/app/components/apps/permission-summary.ts` | 新增应用卡片权限摘要文案生成工具。 |
| 修改 | `web/app/(commonLayout)/app/(appDetailLayout)/[appId]/layout-main.tsx` | 左侧导航在“编排”和“访问 API”之间新增“权限管理”。 |
| 修改 | `web/app/components/apps/app-card.tsx` | 工作室应用卡片右上角新增应用级权限摘要 tooltip 图标。 |
| 修改 | `web/service/apps.ts` | 新增获取和保存应用权限的前端 service。 |
| 修改 | `web/types/app.ts` | 新增应用权限枚举类型、权限配置响应类型和应用权限摘要字段。 |
| 修改 | `web/i18n/en-US/common.json` | 新增导航文案 `appMenus.permissions`。 |
| 修改 | `web/i18n/zh-Hans/common.json` | 新增导航文案 `appMenus.permissions`。 |
| 修改 | `web/i18n/en-US/app.json` | 新增权限页、保存状态和 tooltip 英文文案。 |
| 修改 | `web/i18n/zh-Hans/app.json` | 新增权限页、保存状态和 tooltip 中文文案。 |
| 修改 | `docs/development-records.md` | 追加本次开发记录。 |
| 修改 | `docs/ai-agent-system-prompt.md` | 补充应用级权限模块的二次开发维护规则。 |

### 配置 / 环境变更

- 无新增环境变量。
- 前端验证时 `pnpm type-check:tsgo` 因当前 pnpm 版本尝试重建 `node_modules` 且非交互环境拒绝执行，改用已安装的本地二进制 `web/node_modules/.bin/tsgo.cmd --noEmit`。

### 数据库变更

- 迁移文件：`api/migrations/versions/2026_06_25_1000-a1b2c3d4e5f6_add_app_permission_tables.py`
- 新增表：
  - `app_permission_settings`
    - `id`
    - `tenant_id`
    - `app_id`
    - `edit_scope`
    - `use_scope`
    - `updated_by`
    - `created_at`
    - `updated_at`
  - `app_permission_members`
    - `id`
    - `tenant_id`
    - `app_id`
    - `permission_type`
    - `account_id`
    - `created_at`
- 迁移初始化：对迁移前已存在的 `apps` 记录批量插入默认权限：
  - `edit_scope = all_editors`
  - `use_scope = public`
- 兼容策略：即使个别应用缺少权限记录，`AppPermissionService` 也按 `all_editors + public` 处理，避免历史数据异常导致线上访问被收紧。

### 验证方式

- 命令：`api/.venv/Scripts/python.exe -m pytest api/tests/unit_tests/services/test_app_permission_service.py -q`
- 结果：`4 passed`，仅有项目既有 Pydantic deprecation warning。
- 命令：`api/.venv/Scripts/python.exe -m pytest api/tests/unit_tests/services/test_app_permission_service.py api/tests/unit_tests/controllers/web/test_wraps.py api/tests/unit_tests/controllers/web/test_passport.py api/tests/unit_tests/controllers/web/test_web_passport.py -q --no-cov`
- 结果：`47 passed`，仅有项目既有 Pydantic / Python 3.13 deprecation / python-magic warning。
- 命令：`api/.venv/Scripts/python.exe -m compileall -q <本次修改的后端文件>`
- 结果：通过。
- 命令：`node -e "JSON.parse(...)"` 校验本次修改的 i18n JSON 文件。
- 结果：通过，输出 `i18n json ok`。
- 命令：`web/node_modules/.bin/tsgo.cmd --noEmit`
- 结果：通过。
- 命令：`node web/node_modules/eslint/bin/eslint.js --no-cache --no-warn-ignored -- <本次修改的前端文件>`
- 结果：无错误；仍有项目既有图标替换、旧 hook 依赖和旧样式类 warning。
- 本地数据库迁移验证：
  - 备份文件：`backups/dify-before-app-permissions-20260625-093613.sql`
  - 迁移前版本：`6b5f9f8b1a2c`
  - 迁移后版本：`a1b2c3d4e5f6 (head)`
  - 当前本地数据：`apps = 1`，`app_permission_settings = 1`，`app_permission_members = 0`
  - 默认权限分布：`all_editors + public = 1`
  - 重复 `app_id` 权限配置：0 条。
- 本地服务健康检查：
  - `http://127.0.0.1:5001/health` 返回 `{"status":"ok","version":"1.13.3"}`
  - `http://localhost:3000` 返回 HTTP 200。

### 与原始版本对比说明

- 相比 Dify 1.13.3 原始版本，新增了应用级权限模型和权限服务。
- 原始版本中工作区编辑者可以编辑全部应用、公开 Web App URL 可匿名访问；本次迁移默认值保留该行为。
- 新功能允许后续手动收紧单个应用的编辑范围、使用范围和 Web App URL 公开性。
- Service API Key 的运行行为未改变；本次仅限制控制台中的管理入口和 Web App URL 访问。

### 回退方式

- 回退前端文件：移除权限页、导航入口、卡片 tooltip、权限 service、类型和 i18n 文案。
- 回退后端文件：移除权限模型、服务、控制台/探索/Web App 接入点和测试。
- 数据库回退：执行 Alembic downgrade，删除 `app_permission_members` 与 `app_permission_settings`。
- 若已上线且用户配置过应用权限，回退会丢失这些应用级权限配置，需先导出或确认业务可接受。

### 备注 / 后续事项

- 后续如继续增强权限 UI，可补充成员搜索、批量选择和更细粒度的管理权转交。
- 建议补充集成测试覆盖真实 Flask 路由、迁移执行和 Web App 私有 URL 登录跳转。
- 前端 `pnpm type-check:tsgo` 在当前本地 pnpm 环境下不能直接运行，后续可统一 Node/pnpm 版本后恢复标准命令。

## 2026-06-24

### 需求 / 背景

- 为后续接手本项目的 AI 助手提供统一系统提示词。
- 用户希望任意 AI 阅读项目代码和该文档后，能清楚如何开始分析、如何源码运行项目、以及如何遵守二次开发规范。

### 变更摘要

- 新增 AI 接手项目系统提示词文档。
- 文档覆盖项目阅读顺序、codegraph 使用要求、源码运行步骤、本地运行注意点、二次开发规范、验证规范和开发记录要求。

### 文件变更

| 类型 | 文件路径 | 说明 |
| --- | --- | --- |
| 新增 | `docs/ai-agent-system-prompt.md` | 面向后续 AI 助手的系统提示词文档，用于项目接手、源码运行和二次开发规范说明。 |
| 修改 | `docs/development-records.md` | 追加本次新增系统提示词文档的开发记录。 |

### 配置 / 环境变更

- 无。

### 数据库变更

- 无。

### 验证方式

- 验证方式：确认 `docs/ai-agent-system-prompt.md` 已创建，并确认 `docs/development-records.md` 已追加本次记录。

### 与原始版本对比说明

- 相比 Dify 1.13.3 原始版本，新增 AI 接手项目的系统提示词文档。
- 此变更不影响运行时行为。

### 回退方式

- 删除 `docs/ai-agent-system-prompt.md`。
- 从 `docs/development-records.md` 删除本条记录。

### 备注 / 后续事项

- 后续如运行方式、端口、依赖或二次开发规范发生变化，需要同步更新 `docs/ai-agent-system-prompt.md`。

## 2026-06-24

### 需求 / 背景

- 为 Dify 1.13.3 后续二次开发建立统一开发记录文档。
- 后续所有二次开发改动需要在本文档中按日期记录，方便与原始版本对比和维护。

### 变更摘要

- 新增二次开发记录文档。
- 约定后续开发记录的用途、规则和固定格式。

### 文件变更

| 类型 | 文件路径 | 说明 |
| --- | --- | --- |
| 新增 | `docs/development-records.md` | 用于记录 Dify 1.13.3 二次开发过程中的代码、配置、数据库、脚本和文档变更。 |

### 配置 / 环境变更

- 无。

### 数据库变更

- 无。

### 验证方式

- 验证方式：确认文档已创建，并包含“文档作用”“记录规则”“记录格式”和首条记录。

### 与原始版本对比说明

- 相比 Dify 1.13.3 原始版本，新增 `docs/development-records.md` 作为二次开发维护台账。
- 此变更不影响运行时行为。

### 回退方式

- 删除 `docs/development-records.md`。

### 备注 / 后续事项

- 后续每个二次开发需求完成时，都需要在本文档顶部按日期新增记录。
