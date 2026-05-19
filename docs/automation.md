# Automation Guide

## Automation Paths

Codex 自动化和项目内外部模型自动化是两条独立路径。

- Codex 自动化：由 Codex/OpenAI 模型完成完整流程，包括实时搜索、网页核验、复杂文件处理、申请包制作和用户确认后的投递步骤。
- 项目内外部模型自动化：由项目读取 `.env.local` 中配置的 API key 调用 DeepSeek、OpenAI、Gemini、Claude 或其他兼容模型，适合在网页内生成报告、核验手动机会链接和生成草稿。
- 项目内外部模型自动化不替代 Codex 自动化，也不允许绕过最终确认。
- 如果两条路径同时可用，涉及机会真实性、截止日期、费用、资格和最终投递的高风险步骤，以 Codex 自动化的核验和用户确认作为准则。

Codex automation and in-app external-model automation are separate paths.

- Codex automation handles the full workflow: live research, webpage verification, complex file work, application package production, and user-confirmed submission steps.
- In-app external-model automation reads the API key configured in `.env.local` and can generate reports, check manually added opportunity links, and draft packages inside the web app.
- In-app external-model automation does not replace Codex automation and cannot bypass final user approval.
- When both paths are available, high-risk facts such as opportunity authenticity, deadline, fee, eligibility, and final submission readiness should be verified through Codex automation and explicit user confirmation.

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
