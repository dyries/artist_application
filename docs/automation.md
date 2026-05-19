# Automation Guide

## Automation Choices

Codex 自动化和项目内外部模型自动化是两条可自由选择、也可以组合使用的路径。

- 只用 Codex：由 Codex/OpenAI 模型完成实时搜索、网页核验、复杂文件处理、申请包制作和用户确认后的投递步骤；项目不需要外部模型 API key。
- 只用项目内外部模型：由项目读取 `.env.local` 中配置的 API key 调用 DeepSeek、OpenAI、Gemini、Claude 或其他兼容模型，在网页内生成报告、核验手动机会链接和生成草稿。
- Codex + 项目内外部模型：项目内模型负责快速草稿和初步整理，Codex 负责更高风险或更复杂的核验、材料理解、文件制作和投递步骤。
- 使用者可以设置每轮最多处理数量，范围是 1-100。
- 使用者可以选择提交审核模式：必须审核、可跳过审核准备、直接申请。
- 直接申请代表使用者对当前运行批次做了预授权；遇到付款、登录、验证码、敏感授权、资格不明、费用不明、材料缺失或不可逆操作时仍必须暂停。
- 费用接受度默认保守（免费/强资助优先），也可以选择接受少量申请费或允许付费项目进入候选池；付费项目必须清楚标注费用和风险，付款前必须暂停确认。
- 机会等级偏好默认高等级优先，也可以选择高等级 + 中等级，或更开放地包含小机构、新空间和实验项目；所有低可信度或新机构风险都要明确标注。
- 如果两条路径同时可用，涉及机会真实性、截止日期、费用、资格和最终投递的高风险步骤，以当前审核模式和 Codex 自动化核验结果作为准则。

Codex automation and in-app external-model automation can be used separately or together.

- Codex only: Codex/OpenAI models handle live research, webpage verification, complex file work, application package production, and user-confirmed submission steps. No external model API key is required in the project.
- In-app external model only: the app reads the API key configured in `.env.local` and can generate reports, check manually added opportunity links, and draft packages inside the web app.
- Codex + in-app external model: the in-app model handles fast drafts and first-pass organization, while Codex handles higher-risk or more complex verification, material interpretation, file production, and submission steps.
- Users can set the maximum number of opportunities per run from 1 to 100.
- Users can choose submission approval mode: review required, review optional, or direct apply.
- Direct apply is pre-authorization for the current run batch; automation must still pause for payment, login, captcha, sensitive authorization, unclear eligibility, unclear fees, missing required materials, or irreversible actions.
- Fee preference defaults to conservative, prioritizing free or strongly funded opportunities. Users may allow modest application fees or paid opportunities in the candidate pool; paid opportunities must show costs and risks clearly, and payment always requires a pause for confirmation.
- Opportunity tier preference defaults to high-tier first. Users may choose high-tier plus credible mid-tier opportunities, or a more open mode that includes small spaces, new organizations, and experimental projects with credibility risks clearly labeled.
- When both paths are available, high-risk facts such as opportunity authenticity, deadline, fee, eligibility, and final submission readiness should follow the selected approval mode and Codex verification results.

## Codex Workspace Export

点击“刷新 Codex 自动化上下文”后，项目会生成或更新：

```text
generated/codex/artist-snapshot.json
generated/codex/automation-instructions.md
```

Codex 自动化必须读取这些文件作为当前项目状态，同时在必要时直接检查原始材料。

Codex automation should read these files as the current workspace state and inspect original source materials whenever excerpts are not enough.

## Manual Opportunity Links

- 用户可以在项目里手动添加展览、驻留、open call、奖项或其他申请页面链接。
- 手动添加的链接必须先作为待核验机会处理，不能直接默认合格。
- 自动化必须核验官网来源、截止日期、资格、费用、资助、材料要求、提交方式和风险。
- 如果页面无法抓取、需要登录、验证码、付款或动态渲染，必须标记风险，并交给 Codex 自动化或用户介入核验。

## External Model Configuration

如果只用 Codex 自动化，可以不配置外部模型 API。

DeepSeek:

```bash
DEEPSEEK_API_KEY=your_key
ARTIST_STUDIO_AI_PROVIDER=deepseek
ARTIST_STUDIO_AI_MODEL=deepseek-chat
```

OpenAI:

```bash
OPENAI_API_KEY=your_key
ARTIST_STUDIO_AI_PROVIDER=openai
ARTIST_STUDIO_AI_MODEL=gpt-4o-mini
```

Gemini:

```bash
GEMINI_API_KEY=your_key
ARTIST_STUDIO_AI_PROVIDER=gemini
ARTIST_STUDIO_AI_MODEL=gemini-1.5-pro
```

Claude:

```bash
ANTHROPIC_API_KEY=your_key
ARTIST_STUDIO_AI_PROVIDER=claude
ARTIST_STUDIO_AI_MODEL=claude-3-5-sonnet-latest
```

OpenAI-compatible:

```bash
ARTIST_STUDIO_AI_API_KEY=your_key
ARTIST_STUDIO_AI_BASE_URL=https://api.deepseek.com/v1
ARTIST_STUDIO_AI_MODEL=deepseek-chat
```

配置后重启 `npm run dev`。

Restart the dev server after changing `.env.local`.
