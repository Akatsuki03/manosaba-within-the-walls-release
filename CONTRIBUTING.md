# 《高墙之内》开发与贡献指南

如果你想改一句显示错误的台词、给日志加一个功能，或修复读档后的重复行动，这份指南从同一件事开始：**在源码目录里改，用独立存档验证，把发行版留作对照。** 不需要维护者的目录、旧数据库或 API Key，就能完成下面的第一个测试和 UI 练习。

**从哪里读：** [首次运行](#quickstart) · [按症状找代码](#map) · [跟做一个新功能](#feature) · [修复与复现](#bugs) · [修改世界规则及存档](#state) · [测试与构建](#verification) · [提交 Issue / PR](#contribute)

<a id="quickstart"></a>
## 1. 从 GitHub 源码开始

先看同目录的 [package.json](./package.json)。如果 `scripts` 只有 `start`，且旁边有 `release-manifest.json`，你拿到的是**玩家发行版**。它适合复现问题，不含完整测试、发行转换与开发文档。回到你取得本项目的 GitHub 页面，进入代码仓库，使用 **Fork → Code → HTTPS** 取得源码地址。发行附件下载地址、游戏素材的上游仓库地址，都不是本项目的源码地址。若发布页没注明对应提交，先向维护者要 commit 或 tag；不要仅凭两边都显示 `0.1.0` 就断定源码完全相同。

以下命令默认使用 **Windows PowerShell、Git、Node.js 24+（带 npm）**。用 `npm.cmd` 可避免 PowerShell 的 npm 脚本执行策略问题。游戏是原生浏览器 JavaScript、Node ESM 和内置 `node:sqlite`；本版本的包未声明第三方 npm 依赖，无需为下面步骤先装打包器、数据库服务或运行 `npm install`。将第一行中的 URL 替换成你自己 Fork 的实际地址。

```powershell
git clone <你的-Fork-HTTPS-地址> manosaba-dev
cd manosaba-dev
git switch -c fix/my-first-change
git rev-parse --short HEAD
node --version
npm.cmd --version
node --input-type=module -e "import { DatabaseSync } from 'node:sqlite'; const db = new DatabaseSync(':memory:'); console.log(db.prepare('SELECT 1 AS ok').get().ok); db.close()"
node --test test/dialogue-format.test.mjs
```

**成功标志：** SQLite 探针打印 `1`，最后一条命令至少执行一项测试且 `fail 0`。SQLite 的实验性警告本身不等于失败。找不到 `node:sqlite` 时检查 `Get-Command node` 指向的版本；找不到测试文件时，先检查当前目录和检出的提交，而不是安装一个同名 npm 包。

### 在不碰原存档的情况下启动

在**源码根目录**打开一个新的 PowerShell 窗口。下面为本次运行创建全新资料目录，另指定一个空的旧设置来源，避免源码启动器从本机已有原型资料自动复制加密模型设置。示例端口是 `3213`，与发行版的默认 `3211` 分开。

```powershell
$scratch = Join-Path (Get-Location) ('.tmp/contributor-' + [guid]::NewGuid().ToString('N'))
$emptySettings = Join-Path $scratch 'empty-source'
New-Item -ItemType Directory -Path $emptySettings -Force | Out-Null
$env:MANOSABA_DATA_DIR = Join-Path $scratch 'world'
$env:PORT = '3213'
Remove-Item Env:MANOSABA_MODEL_SETTINGS_READONLY_DIR -ErrorAction SilentlyContinue
Remove-Item Env:MANOSABA_CREATION_RUNTIME_REVISION -ErrorAction SilentlyContinue
Remove-Item Env:MANOSABA_LOCAL_RELEASE_PROFILE -ErrorAction SilentlyContinue
node scripts/start-llm.mjs --source-dir "$emptySettings"
```

打开 `http://127.0.0.1:3213/`。在**第二个终端**运行：

```powershell
Invoke-RestMethod 'http://127.0.0.1:3213/api/health' | Select-Object application,edition,productVersion
```

预期 `application` 为 `manosaba-local`，`edition` 为 `llm`；记下版本与 Git 提交。查看标题、读健康接口和跑上述测试都不需要模型。要体验真实行动，才在游戏 **Options** 中配置自己的服务并激活预设；一个行动可能产生多次调用。不要为了调一个 CSS 样式购买模型额度。用 `Ctrl+C` 在启动窗口停止服务；要冷读刚才创建的存档，沿用同一 `$scratch` 和资料目录，不要重新执行生成 GUID 的那行。

**与 0.1.0 做 A/B 对照：** 在发行目录另外开一个终端，给它单独的 `MANOSABA_DATA_DIR` 和空闲端口，直接 `npm.cmd start`。发行版不接受源码启动器的 `--source-dir`。不要让两个进程同时打开同一数据库。若维护者按“源码与发行版同级、发行目录名为 `manosaba-within-the-walls-release-0.1.0`”布局，源码另有 `npm.cmd run debug:release:010 -- -CheckOnly` 核对该特定基线；它不是普通克隆的前置条件，也不启动服务。源码默认的新局策略与该发行启动配置可能不同：排查 0.1.0 普通新局差异时，可在**隔离的源码实例**单独设置 `MANOSABA_LOCAL_RELEASE_PROFILE=local0.1.0` 后重启对照；记录此设置。不要同时设置另一创建修订，也不要通过编辑旧存档来模拟新局。

<a id="map"></a>
## 2. 一条行动从哪里经过？

```text
浏览器：输入行动，带上请求身份与预期修订
  → src/server.mjs：/api/act 路由、请求检查
  → src/agents/llm-turn-runner.mjs：需要哪些模型任务，哪些已完成
  → src/prologue.mjs + 领域模块：校验候选、结算、在事务里提交
  → src/presentation/：投递或组合当前玩家可见的结果
  → public/app.js：渲染日志、场景与操作项
```

**要区分三个成功：** 供应商返回 HTTP 200，只说明收到回复；Host 接受并提交，才改变世界；提交已经存在，也不等于浏览器渲染了正确分支。找出这三者首次分歧的位置，通常比改提示词或反复点“重试”更快。

| 要做的事 | 源码从哪里读 | 先用哪个测试定位 |
| --- | --- | --- |
| 台词括号、广播标签、日志样式 | `public/dialogue-format.mjs` → `public/app.js`；静态样式在 `public/style.css` | `test/dialogue-format.test.mjs`。涉及实际排版再用浏览器检查 |
| 开局表单、原创角色、关系输入 | `public/player-creator.mjs`、`public/player-creation-rules.mjs` → `src/creation/player-setup.mjs` → `src/prologue.mjs` | `test/player-creation-rules.test.mjs` → `test/player-creation-http.test.mjs` |
| 模型回复不合格式、任务卡住 | `src/agents/model-gateway.mjs`（请求与解码）、`src/agents/llm-turn-runner.mjs`（编排）、`src/agents/agent-turn-store.mjs`（任务与租约） | `test/llm-turn-runner.test.mjs`；未完成任务恢复看 `test/bounded-recovery.test.mjs` |
| 角色知道了不该知道的事 | `src/characters/actor-knowledge.mjs`、`src/cognition/`；再看 `src/agents/actor-task-packets.mjs` 是否只封入本人所知 | `test/actor-knowledge.test.mjs`、`test/knowledge-runtime-integration.test.mjs` |
| 新世界行为、案件或能力 | `src/world/`、`src/cases/`、`src/world/magic/`；从对应行为回溯至 `src/prologue.mjs` 的真实调用者 | 案件：`test/rp-case-execution-life.test.mjs`；自定义能力：`test/custom-ability-http-integration.test.mjs` |
| 保存成功但读出旧状态 | `src/prologue.mjs` 的 `save` / `load` / `rewind`，`src/world/domain-store.mjs` 的槽与提交锚 | `test/save-management.test.mjs`、`test/rewind.test.mjs` |
| 提交正确但 UI 没更新 | `src/presentation/player-view.mjs`、`src/presentation/player-delivery-worker.mjs`，再看 `/api/view` 与前端消费 | `test/player-view.test.mjs`、`test/player-delivery-worker.test.mjs` |
| 源码有图片、音乐、模块，发行版却缺失 | `src/host/static-assets.mjs`、`scripts/release-files.mjs`、`scripts/release-source.mjs`；音乐还需核目录 `docs/ost-catalog.json` | `test/release-files.test.mjs`，再检查新发行目录里的实际资源 |

想查某个按钮到底调哪段代码，可从已知名字搜索，而不必读完大文件：`git grep -n '/api/act' -- public src` 或 `git grep -n 'publicEventCaption' -- public test`。源码另有 `src/README.md`（模块与状态归属）、`src/presentation/README.md`（交付与视图）和 `docs/release-guide.md`（发行转换）；这些内部导航不会整套复制到玩家版。

<a id="feature"></a>
## 3. 跟做：为书写台词加一个无障碍文字标签

这是**练习提案**，不是当前版本已有功能。需求是“在玩家已经看到的书写条目旁标明『书写』，不只靠颜色区分”。不改 NPC 生成、不增加 HTTP 接口、不写数据库。完成标准：有结构化 `writing` 标记的片段显示标签；普通人说“我在写字”不显示；拆开的旁白片段也不显示。

1. 在 `test/dialogue-format.test.mjs` 的既有命名导入中加入 `writingLabel`，再追加下面的测试。先运行 `node --test --test-name-pattern="writing label" test/dialogue-format.test.mjs`。首次失败应是缺少导出或断言未实现，不应是文件路径错误。

   ```js
   test('writing label follows the delivered fragment, not keywords', () => {
     assert.equal(writingLabel({ delivery: 'writing', text: '请看这行。' }), '书写');
     assert.equal(writingLabel({ delivery: 'speech', text: '我在写字。' }), '');
     assert.equal(writingLabel({ delivery: 'narration', text: '她放下了笔。' }), '');
     assert.equal(writingLabel({ text: '旧条目没有类型' }), '');
   });
   ```

2. 在 `public/dialogue-format.mjs` 中实现小函数，然后重跑同一测试。这里用的是 Host 已投递的类型；不搜索角色姓名或正文关键词。

   ```js
   export function writingLabel(fragment) {
     return fragment?.delivery === 'writing' ? '书写' : '';
   }
   ```

3. 在 `public/app.js` 从同一模块导入 `writingLabel`。找到 `dialogueFragments(entry)` 的循环，在当前 `item` 建好后、正文显示前使用**当前 `fragment`**：

   ```js
   const label = writingLabel(fragment);
   if (label) item.append(element('span', label, 'dialogue-writing-label'));
   ```

4. 在 `public/style.css` 给新类留出间距和清晰对比度；保留可读文字，不往原始 `entry.text` 塞标签，也不使用 `innerHTML` 拼接模型文本。跑完整的 `test/dialogue-format.test.mjs`。浏览器中检查书写、普通发言、旁白三个对照；窄屏不要遮挡说话人。同一条已送达记录刷新后，标签不应累加。没有这三类实机样本时，在 PR 里区分“纯函数已测”和“浏览器未测”。

**如果功能会改变世界，方法不同。** 比如“阅读一张纸条后，只有读者得到一条线索”：先定义纸条和读者的稳定身份、读者可见与可达条件、重复阅读如何处理。由 Host 验证并记录领域事件，再从事件投影读者知识。测试至少有本人读到、未在场的人不知情、旧请求重放不重复授予、命名存档冷读后结论仍在。不要用所有人共用的角色提示，或一段“大家都看到了”的旁白，代替事实与听众范围。

<a id="bugs"></a>
## 4. 修 Bug：用最小证据找到第一处失败

**例：玩家说了一句「集会广播」，UI 却贴了「已播出」。** 第一步不是删掉这几个字。比较两条文字相同的记录：普通对白只有 `delivery: 'speech'`；真正的已播公告还有 Host 给的 `publicEvent: 'warden_assembly_notice'`。在纯函数层运行已有对照：

```powershell
node --test --test-name-pattern="only a closed audience-projected" test/dialogue-format.test.mjs
```

若纯函数通过，看隔离实例 `/api/view` 的对应条目。普通对白已经带错标记，就沿领域事件和玩家投影上查；条目区分正确但屏幕贴错，就查 `public/app.js` 给 `publicEventCaption(entry, fragmentIndex)` 传的是哪条记录、哪一段。修复的断言应同时证明**普通对白不贴、真广播贴一次、第二片段不重复**。文本改成同义句仍应成立。这个例子说明为什么“同一现象”可以由两个不同层次引起。

| 实测现象 | 首先排除 | 记录或对照 |
| --- | --- | --- |
| 改完代码重启，画面完全没变 | 启动的是另一个发行目录，或浏览器仍连旧端口 | 终端的工作目录、端口、`/api/health` 和 Git 提交；版本号相同并不足以区分两个副本 |
| 返回 409 或同一按钮点了两次 | 页面持有旧的 `expectedGeneration` / `expectedRevision`，或同一 `requestId` 携带不同输入 | 保存错误码，刷新玩家视图；验证双击只产生一次提交。不要把版本校验删除来消除报错 |
| 看似“模型没回” | 区分是否发出请求、有无响应、是否解码成功、是否被宿主拒绝 | 记录阶段、状态码与脱敏错误码；`OFFLINE_NETWORK_BLOCKED` 是测试网络守卫，不是供应商欠费证明 |
| 读档后回到错地点或出现重复旧消息 | 用的是标题“继续”还是明确点了命名槽？数据目录、槽标识、分支和提交是否一致？ | 停机备份；用副本做保存 → 停服务 → 重启 → 读同一槽 → 下一行动。若是纯显示错误，避免修改 SQLite |
| `ENOENT` 指向 `.tmp/...`、`test/fixtures/z22-release` 或旧发行目录 | 部分历史对照依赖维护者保留的固定输入，新克隆未必有 | 报路径和测试名，询问可分享的夹具或改跑不依赖它的定向测试。不要下载他人存档、造一个空文件，或把跳过记为通过 |

**上报够用的最小信息：** 操作系统、`node --version`、源码 commit 或发行清单 SHA-256、入口与端口、最短操作步骤、预期、实际、首次出现的错误码、旧档或新局、是否使用真实供应商。公开分享前先移除 API Key、授权头、会话令牌、个人绝对路径和私人对话；通常不需要原始模型报文或整个数据库。

<a id="state"></a>
## 5. 改规则、存档或模型时的约定

- **世界只有一个事实来源。** HTTP 层验证请求，规则层决定能否发生，引擎事务提交。界面只呈现玩家应见的状态。模型输出是候选，不负责宣告成交、宣判投票结果或改变他人记忆。若只是显示问题，先不要增加持久字段。
- **不要把产品版本当存档版本。** `package.json` 的 `0.1.0` 与世界持久化的 `executionRevision` 是两件事。新增会改变旧局语义的契约时，从 `src/content/` 的修订注册、对应规则模块与旧档回归查起。保留旧执行路径与封存输入；新规则由合资格的新局或显式采用进入，不就地重写旧 hash、快照或 pin 来让测试变绿。
- **重试、重新生成、读档是三种操作。** 已提交的行动不得因 HTTP 回执丢失而执行两次。继续未完成请求应尊重原请求、期限与已完成任务；“另开新尝试”走正式 UI 的新身份与父请求；读取旧槽后，旧分支的迟到返回应被忽略或拒绝。改任务或交付时要测试重复请求、超时、关闭再打开和旧租约返回。
- **模型故障先用假传输。** `test:llm` 是本地协议与引擎测试；需要检查模型行为时，先构造一个合法候选、一个无效候选，验证哪步接受、拒绝以及有无提交。只有问题确实依赖供应商时才配置自己的模型和额度；UI 发出一次行动可能含多次供应商请求。不要把测试专用的 `offline-network-guard.mjs` 放进生产调用链。
- **原档只用作来源，不做实验。** 先用自己的窗口停止服务，复制**整个数据目录**到新的隔离位置，保留原件，再启动副本。回退用旧程序配更新前整份备份；别用旧程序直接打开已被新版写过的资料。数据库、模型配置、日志、备份、本机快照密钥都不进 GitHub。

<a id="verification"></a>
## 6. 选对测试，再检查发行结果

以下命令均从**源码根目录**执行。日常先选最接近现象的一项，再加覆盖调用方的一项；不要为修一行样式反复跑完整门禁。

| 变更 | 推荐第一步 | 下一层证据 |
| --- | --- | --- |
| 日志文字与可见性 | `node --test test/dialogue-format.test.mjs test/player-view.test.mjs` | 浏览器实际渲染；若改变公开字段，再验 `/api/view` |
| 创建或存档 | `node --test test/player-creation-rules.test.mjs test/save-management.test.mjs` | `test/player-creation-http.test.mjs`；在隔离资料做一次同槽冷读 |
| 模型协议、任务编排 | `npm.cmd run test:llm` | 非法返回、恢复、重复请求与提交次数；真实供应商表现另记 |
| 图片、声音、内容或发行路径 | `npm.cmd run content:check`，`node --test test/release-files.test.mjs` | 新包的资源实际可读、路由与 MIME 正确；有 UI 变更再查真实画面 |
| 接近提交或候选发行 | `npm.cmd test`（常规离线回归） | `npm.cmd run release:verify`（含常规测试、长回归、运行时与内容/发行检查）；如果刚跑完完整门禁，不必再逐条重跑其组成项 |

对不应外联的定向测试，可用 `node --import ./scripts/offline-network-guard.mjs --test test/dialogue-format.test.mjs`；这个预加载器允许本机回环测试、阻止测试误连外部，不是操作系统沙箱。完整门禁可能依赖历史夹具。把“执行并通过”“因缺夹具未执行”“没有调用真实模型”分开写。

**为什么源码能跑，发行目录却可能缺东西？** 构建器不是复制整个仓库：`scripts/release-files.mjs` 按明确收录的入口收集静态路由、模块依赖、来源说明和历史执行资产；`scripts/release-source.mjs` 做发行转换；`scripts/build-release.mjs` 对最终字节生成清单。新增前端模块或图片时，核对请求 URL、`src/host/static-assets.mjs` 中的映射、正确文件与 MIME、发行收集和真实消费者。不要为一个新图标把整个素材目录、开发工具或个人配置放进包。

```powershell
# 检查发行投影；不创建新的完整发行目录
node scripts/build-release.mjs --check
# 确需独立候选时才构建
npm.cmd run release
```

读取构建结果的 `releaseDirectory`，在**返回的目录**里用新的测试资料启动。默认输出位于源码同级 `<源码目录名>-storage/releases/`，不覆盖你正在对照的基线。验证本次触及的入口，例如页面、资源、命名槽冷读，而非只看到“构建成功”。本指南在源码根目录维护，新构建会把同一文件列入发行清单；先前签收的 Windows 0.1.0 目录里它是**后附文档**，未改写旧清单或其中任何运行文件。严格核对历史整树时应区分这份附件与原包。

<a id="contribute"></a>
## 7. 给评审者一个可以重现的 PR

1. **工作前**看是否已有同类 Issue，从对应分支创建自己的主题分支。一份 PR 解决一个玩家可观察的问题。大功能先描述正常路径、不应触发的情形、旧档行为和需要的反馈，再讨论实现。
2. **提交前**运行 `git status --short` 与 `git diff --check`，用 `git diff` 看实际改动。显式 `git add` 自己的代码、文档和回归测试；不要把 `.tmp/`、模型设置、玩家 SQLite、未脱敏截图/日志或整个构建目录顺手加入。涉及新素材时说明作者、来源、许可及使用范围；可运行不等于可以再分发美术、音乐、字体或角色卡。
3. **在自己的 Fork 提交并 push 主题分支**，到原仓库创建 Pull Request。若只想报错而不改代码，同一模板可用于 Issue，保留“复现”和“实际结果”即可。项目显示为 `private` 的 npm 字段并不是源码或素材的许可声明；以仓库实际许可和素材来源为准。

```text
问题 / 目标：玩家在什么条件下看到什么？
基线：源码 commit 或发行清单摘要；Node、系统；新局 / 旧档。
最小步骤：1. …  2. …  3. …
预期 / 实际：… / …
首个分歧点：界面 / HTTP / 模型候选 / Host 结算 / 存档 / 投递。
改动与边界：改了什么、为何在这一层修；旧局、其他角色或重试是否受影响？
验证：命令 + 结果；一个正例和一个反例；哪些没有测？
附件：最小脱敏片段或可分发的合成夹具；如有 UI 变化，附前后对照。
```

第一次贡献的合格终点不是“我这里能启动”，而是另一位开发者拿到你的分支，能按同一条命令看到问题的对照，并确认修复没有改变不相关的玩法。
