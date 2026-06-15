# Long-Term Project Rules

## Project Goal

- This project is an automated artist application studio for managing artworks, researching opportunities, generating formal portfolio PDFs, preparing application packages, and tracking submissions.
- It is not a generic SaaS dashboard. Product and output quality should match a contemporary gallery archive, editorial art system, or premium creative studio back office.
- The only default user review nodes are opportunity selection and final submission-package approval. Ordinary selection, caption, layout, language, file, and quality decisions are automated.

## Development And Completion

- Before changing code, inspect the existing structure, identify affected files, explain the implementation plan briefly, preserve existing business logic unless the task changes it, reuse components, avoid unrelated rewrites, and update tests when logic changes.
- Before frontend work, read `FRONTEND_STYLE_GUIDE.md` and `UI_ACCEPTANCE_CHECKLIST.md`; verify desktop/mobile behavior and report checklist results and visual validation.
- Figma implementation must follow the exact node workflow in this document and validate the result with Playwright.
- Never commit `artist-assets/`, `generated/`, `data/`, local portfolio QA artifacts, environment files, credentials, portfolio files, application packages, or test-generated materials.
- Every task that changes the project must append `WORKLOG.md` with date/time, goal, files changed, what and why, checks, result, issues, and next steps. Run `npm run check:worklog` when available.

## Rule Synchronization

- 每次用户新增、修改或纠正流程规则、申请包规则、材料规则、自动化规则或安全边界时，必须同步更新项目规则文档和 `src/lib/automationRules.ts`。Codex 自动化说明由该共享规则模块生成。
- 如果规则会影响快照读取，也要同步更新 `generated/codex/artist-snapshot.json`。
- 项目规则和机器规则冲突时，以用户最新对话要求为准，并立即同步 `docs/rules.md` 与 `src/lib/automationRules.ts`。
- 每次代码改动都要删除或替换已经没用的旧代码、旧文案、旧接口或旧规则。为了兼容保留旧接口或旧文件时，必须明确标注兼容用途。
- 每次报错排查、bug 修复、优化或验证结果都必须写入 `WORKLOG.md`。记录必须包含日期时间、问题现象、根因、修改文件、验证命令和仍需注意的风险；不能只把修复过程留在聊天记录或终端输出里。
- 以后所有修改都必须同步三处：本地项目源码/文档、Codex 自动化规则或说明模板、GitHub 远端仓库。完成后要验证本地工作区干净，并确认远端 `main` 已包含最新提交。

## External API Configuration

- 公开 UI 和 GitHub 文档必须把网页内模型能力描述为“外接 API”或“外接模型 API”，不能把项目写成只绑定某一个 provider。
- GitHub 文档必须说明外接 API 配置位置是仓库根目录 `.env.local`，从 `.env.example` 复制，并选择一个 provider block 填入自己的 key、base URL 和模型名。
- 项目应支持多种外接 API 说明：OpenAI-compatible `/chat/completions` 网关、DeepSeek、OpenAI、Gemini、Claude。真实 key 只能放在本地 `.env.local`，不能提交。

## Deployment Security

- 本地 `localhost` 可以直接运行；部署到非本地主机时，必须通过 `ARTIST_STUDIO_AUTH_USER` + `ARTIST_STUDIO_AUTH_PASSWORD` 或 `ARTIST_STUDIO_API_TOKEN` 保护访问。
- 手动机会链接必须是公开 `https://` URL。服务端抓取前必须阻止 localhost、私网、link-local、内网 DNS 解析结果，以及重定向到内网的地址。
- 公开机会页面应优先使用浏览器渲染、公开附件抽取和表单字段识别；静态 HTML 转文本只能作为 fallback。
- 上传、文本提取、网页抓取和图片 metadata 读取必须有默认资源上限；公开部署时不得取消这些限制。
- 自动化生成申请包时，只能复制项目允许材料目录里的图片，不能信任外部模型提供的任意本地路径。

## Review And User Edits

- 默认模式下，生成的申请包、审核稿、DOCX/PDF、表单答案、作品集文字、作品说明、caption、checklist 和邮件草稿都必须先给用户审核。
- 新默认产品流程只有两个用户审核节点：选择申请哪些机会，以及确认最终提交包是否可以提交。中间小问题由 AI 合理判断并记录到 `internal-notes/`，不要频繁要求用户确认。
- 第一次机会审核提交后，系统必须自动继续为已选机会准备申请包；用户不应再被要求手动触发第二次自动化运行。最终提交包如果被用户要求返工，自动化必须自动回到制包/修复流程，并再次回到同一个最终提交前审核节点。
- 如果 `submissionApprovalMode` 是 `review_optional`，自动化可以在机会要求清楚、材料完整、无付款/登录/验证码/敏感授权时减少中间审核材料，但最终外部提交仍必须等待用户确认。
- 如果 `submissionApprovalMode` 是 `direct_apply`，只视为用户对当前运行批次的准备工作做了预授权；最终外部提交仍必须等待用户确认。遇到付款、登录、验证码、敏感授权、法律声明、隐私风险、资格不明、费用不明、材料缺失或不可逆操作时必须暂停。
- 审核文件优先使用 `.docx`，必要时附 `.pdf` 预览；不要只给 Markdown。
- 机会摘要、推荐理由、风险说明、申请摘要、申请正文说明、作品选择说明、portfolio 解释、CV 变动说明、最终提交前检查清单和其他需要用户判断的材料默认中文为主。英文只用于机构要求英文提交的正式材料；英文正式材料必须另配中文审核版。
- 用户可以手动修改任何审核文件或申请包文件；用户修改后的文件是新的事实来源，后续自动化必须读取并沿用用户修改后的版本。
- 如果最终提交语言是英文，而用户修改的是中文审核稿，自动化必须把中文修改理解为内容意图，并同步更新英文最终提交稿；最终英文文件仍必须保持英文。
- 如果用户修改内容和已有规则或机会要求冲突，必须先指出冲突并让用户确认，不能静默覆盖用户修改。

## Opportunity Screening

- 每次搜索要尽量广：使用多组中英文关键词、多地区来源、机构官网、官方 open call 平台和艺术机会平台交叉搜索。
- 每轮深度处理或制作申请包的数量必须遵守 `automationBatchLimit`，范围是 1-100；如果用户在对话里给出更新的数量，以最新指令为准。
- 申请地区可以在页面里选择，默认是全世界。自动化必须按这个地区偏好搜索和排序，不能把它和艺术家当前所在地混为一谈。
- 费用接受度可以在页面里选择，默认是 `conservative`（保守：免费/强资助优先）。`application_fee_ok` 表示可接受少量申请费；`paid_ok` 表示付费展览/驻留也可以进入候选池，但必须完整标注费用、价值判断和风险，付款前仍必须暂停确认。
- 机会等级偏好可以在页面里选择，默认是 `high_tier`（高等级优先）。`balanced` 表示高等级 + 可信中等级机会；`open` 表示也可以看小机构、新空间和实验项目，但必须明确标注可信度和风险。
- 默认按中国艺术家/中国所在地艺术家处理；必须确认机会允许中国人、中国所在地艺术家、国际申请者或不限国籍申请。
- 每轮先建立更大的候选池，再排除过期和明确不符合资格的项目，最终只给用户总计约 5 个跨类别高质量推荐；不得把原始候选池变成用户手工比较任务。
- 机会只有在用户选择后才进入 `selected_by_user`，自动化才可以准备真实申请包。`new`、`recommended`、`confirmed` 不应直接生成真实申请包。
- 用户完成第一次机会审核后，已选机会应直接进入自动制包或返工流程；未选的候选机会应标记为 `not_selected`，不得继续制作真实申请包。
- 在 `conservative` 默认模式下，优先选择无报名费且所有费用由对方承担的机会。
- 在 `conservative` 和 `application_fee_ok` 模式下，展览可以接受合理报名费/申请费，但不能接受展位费、参展费、场地费、墙面费、强制制作费或 pay-to-show 性质费用。
- 在 `conservative` 和 `application_fee_ok` 模式下，驻留可以自付机票/国际交通，但住宿、工作室/项目空间和基本项目费用应由对方承担；优先选择有 stipend、production budget、per diem、材料费、当地交通或其他资助的驻留。
- 在 `conservative` 和 `application_fee_ok` 模式下，若驻留要求自付住宿、项目费或高额 participation fee，默认降级或淘汰，除非艺术匹配度极高且必须明确标注风险。
- 在 `paid_ok` 模式下，可以保留付费展览和付费驻留作为候选，但必须标红费用风险，解释为什么仍值得考虑，并在任何付款前暂停等待用户明确确认。

## Portfolio Rules

- 作品集不是简单打包图片。自动化必须根据机会主题、媒介要求、空间/文件要求和艺术家资料认真选择作品。
- 对外作品集、CV、bio、artist statement、作品说明和表格正文不能暴露“申请包装痕迹”：不要写“for [某机会]”“selected for this open call”“为该驻留挑选”“submission image for...”“draft for...”“ready-to-copy”“final candidate”等内部流程词。机会匹配和选材逻辑只能写在内部 notes/checklist，不进入提交版或用户可直接上传的文件。
- 如果艺术家没有网站、Instagram 或作品集链接，对外 CV/表格不要写 `No website`、`No Instagram`、`None`、`N/A` 等负面占位；只有申请表强制要求该字段时，才在表单里按平台允许方式留空或填入用户确认的替代链接/PDF。
- 对外材料不能保留 `to be confirmed`、`details to be confirmed`、`draft`、`placeholder` 等占位语。事实不确定时，要么先向用户确认，要么在提交版中删去该细节；不确定性只能放在内部审核清单。
- 每个申请包必须严格分为 `internal-notes/`、`user-review/`、`external-submission/`。External submission 不得包含 internal note、review version、application package、generated by AI、FILE NOT FOUND、unknown、missing、TBD 等内部或负面词。
- 定制作品集时，内部可以按机会主题选材和排序，但对外作品集应像自然的 artist portfolio：只呈现艺术家、作品、年份、媒介、尺寸/说明和艺术脉络，不解释“为什么适合这个机会”。
- 申请文字要避免模板化 AI 口吻：少用空泛抽象词堆叠，少用“unstable sites / explores the relationship / acts as a space”等无具体对象的句式；优先使用作品、材料、图像、场景和实际研究动作来写。
- 还应避免 investigates memory、questions boundaries、creates dialogue、liminal、embodied、poetic resonance 等高频 AI 腔表达。正式文字优先写具体作品、材料、图像来源、地点、档案对象、研究动作、制作方式、展示方式、最终产出，以及和机会的具体关系。
- 材料分析必须以 AI 实际读取原始内容为准，不限于图片，也包括文字、PDF、Word、作品集、音频、视频和后续加入的其他媒体。
- 本地资料库必须保留原文件路径、提取文本、OCR、视觉摘要、音视频 metadata/派生 still、嵌入媒体清单和结构化分析状态；某个文件未完整多模态分析时必须明确标记缺口。
- 材料扫描器提取的文本、图片尺寸、格式、路径、系统 metadata、音视频文件信息等只能作为索引和辅助信息，不能替代 AI 对原始内容的阅读、观看、听取、理解、判断和选材。
- 每件入选作品首先要完整、清楚地呈现作品本体；不能只放局部、现场气氛图、过程图或被裁切过的碎片来代表作品。
- 如果作品有很多照片，选择顺序是：先选完整作品图，再根据需要补充现场、细节、空间关系、过程或不同角度图片。
- 生成新作品集前，必须先检查资料库里已有作品集，尤其是 `artist-assets/inbox/portfolio/` 和 `artist-assets/source-materials/` 中的旧作品集 PDF/文档。
- 生成作品集前必须先写 `internal-notes/portfolio-source-audit.json`，覆盖 `data.works` 正式作品记录、正式图片、source materials、已有 portfolio、机会页数/图片数/文件大小/语言/CV/bio/statement/单 PDF 要求、缺失 metadata、低置信事实和实际使用材料。
- 作品集渲染必须基于结构化 `PortfolioPlan` JSON，并写入 `internal-notes/portfolio-plan.json`。不得再依赖 `selectedWorks` 自由文本或 `Image:` 正则解析来决定页面结构。
- `PortfolioPlan` 必须明确页面类型、作品顺序、作品主图、installation/series 的 overview/detail/context/process 角色、排除图片和质量风险。External portfolio 只输出正式 `portfolio.pdf` 和机会要求的变体；可编辑 `portfolio.html` 放在 `internal-notes/editable-render-sources/`，不得作为外部提交文件。
- 如果机会没有明确页数限制，作品集默认自动生成 20 页左右：`targetPages: 20`、`minimumPages: 16`、`maximumPages: 24`。机会明确页数、文件大小、single/combined PDF 或单图上传要求时，以机会要求为准。
- 作品集封面默认是艺术家姓名、`Selected Works`、年份和可用联系方式/网站；不要默认把 opportunity title 当作品集主标题。机会匹配信息只能放 internal notes 或 user review。
- 生成新作品集前还必须记录联网/设计参考，只学习结构、节奏、图文比例、caption 方式、留白和 PDF 作品集惯例，不抄袭具体设计。
- 作品集生成后必须做真实视觉/结构质量检查；检查渲染后的 HTML/PDF 是否缺图、页面空白过多、图片过小、caption 太小、禁用词残留、页数/文件大小超限、planned image 静默跳过。普通问题必须进入最多 3 轮自动修复、重排和复查，不能直接交给用户。
- `internal-notes/portfolio-auto-repair-log.json` 必须记录自动修复过程。user-review 只给最终确认摘要，不能要求用户逐页审核作品集或处理普通 internal issues。
- PortfolioPlan 引用的每张正式图片都必须存在于 `artist-assets/works/`、`artist-assets/source-materials/` 或 `artist-assets/inbox/`，能被 `sharp` 读取，能以稳定唯一文件名复制到 `external-submission/images/`，并能被内部可编辑 HTML 渲染源引用；只有没有任何可用图片或无法自动替代/省略的关键要求才进入 `quality_blocked`。
- 作品集排版必须专业：图片为主，文字克制，caption 对齐一致，图片不拉伸、不乱裁、不用默认文档堆叠。
- 作品尺寸必须以 cm 为单位，不能把图片像素尺寸当作作品尺寸展示。
- 展览如果要求真实作品、运输、安装或当前可用作品，不能默认旧作品还在手里；需要先让用户确认哪些作品可以参展。
- `PortfolioPlan` 可以使用受控主题 `quiet_white`、`warm_archive`、`soft_gray_gallery`、`dark_installation`、`image_research_bluegray` 或 `painting_color_field`；主题统一定义页面背景、文字/强调色、caption、图片框、页码和边距节奏。
- 默认作品集自动修复后仍少于 16 页时必须进入 `quality_blocked`；机会明确只接收单图上传时，生成 `images-for-upload/`，不强制生成默认 20 页 PDF。
- 配置 `ARTIST_STUDIO_PORTFOLIO_RESEARCH_SOURCE_URLS` 时，只抓取公开 HTTPS 设计参考，并记录抓取状态与可复用布局原则；不得捏造或复制参考设计。
- 图片规划前必须用 `sharp` 记录尺寸、比例、方向、格式、文件大小、主色、亮度、质量风险和推荐角色，并让这些结果实际影响选图、主题和布局。
- Playwright 无法生成正式 PDF 而退回文本 PDF 时必须记录内部风险，且不得把申请包标记为专业质量已通过。
- 机会要求短版、单图上传或 combined PDF 时，分别生成 `portfolio-short-10p.pdf`、`images-for-upload/` 或 `combined-application-package.pdf`。

## Figma Application Package Design

- 当用户为申请包 UI、最终提交包审核页、申请包展示页或相关前端体验提供 Figma 文件/Frame/Node 时，必须用 Figma skill 按精确节点实现，不能凭印象重做。
- 编码前必须先对精确节点或 frame 调用 `get_design_context`；如果返回被截断，先用 `get_metadata` 理清文件结构，再只对必要节点重新调用 `get_design_context`。
- 编码前必须对精确 variant 调用 `get_screenshot`，把截图作为视觉参照。
- 实现时必须复用项目已有 design system components、tokens、utilities、routing、state 和 data-fetch patterns，不要创建平行设计系统、随机组件体系或新的 icon package。
- 必须尽量匹配 Figma 的 spacing、layout、hierarchy、responsive behavior，并同时适配 desktop 和 mobile。
- 如果 Figma 返回 localhost image 或 SVG source，直接使用这些来源，不要创建 placeholder。
- 完成后必须用 Playwright 对照 Figma reference 检查外观和行为，并根据差异迭代。
- Figma 设计执行不能改变产品审核边界：默认仍只有“选择机会”和“最终提交包确认”两个用户审核节点。

## Final Submission Archive

- 最终提交或明确标记为最终版本后，必须先把最终提交版复制到 `generated/final-submissions/YYYY-MM-DD/`。
- 文件名写清日期、机会名和文件角色；同一日期文件夹里要有 `README.md` 清单。
- 项目名必须是可读名称，不能只写 slug。
- 归档完成后，申请包文件夹里应清理早期草稿，只保留必要的最终提交文件。

## Test / Mock Isolation

- `ARTIST_STUDIO_RUN_MODE=test` 和 `mock` 必须写入 `generated/test-runs/` 或 `generated/mock-runs/`。
- Test/mock 输出、manifest 和日志必须明确标记 run mode。
- Test/mock 不得创建真实申请记录，不得进入真实 `ready_to_submit`、`submitted`、`waiting` 或 final submission 归档。

## Security Boundaries

- 默认未经最终确认，不发送邮件、不提交网页表单、不付款、不处理验证码。
- `direct_apply` 只预授权准备工作，不预授权最终外部提交；付款、登录、验证码、敏感授权、法律声明、隐私风险、资格不明、费用不明、材料缺失或不可逆操作仍必须暂停。
- 项目代码不保存第三方平台密码；涉及登录、验证码、付款或敏感授权时，需要用户介入。
