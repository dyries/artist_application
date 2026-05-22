# 示例申请包预览

自动化生成申请包后，`generated/applications/` 下会出现一个以机会编号和机会名命名的文件夹。下面是一个典型申请包的内容示例，用来说明项目会交付什么。

```text
generated/applications/12-example-residency/
  application-draft.md
  draft-en.md
  draft-zh.md
  checklist.md
  selected-works.md
  opportunity.json
  package-manifest.json
  application-package.docx
  application-package.pdf
  images/
    work-01.jpg
    work-02.jpg
```

## application-draft.md

```markdown
# Example Residency

Organization: Example Foundation
URL: https://example.org/open-call
Deadline: 2026-07-15
Location: Berlin, Germany

## Checklist

- Confirm eligibility for China-based international applicants.
- Confirm whether application fee is waived.
- Review final English statement before submission.
- Prepare 8 selected work images under the requested size.

## English Draft

Draft application text for review. It should be treated as a working draft until the artist confirms factual details, tone, and final submission language.

## 中文草稿

中文审阅草稿，用来帮助艺术家确认表达、事实和材料取舍。最终提交语言应跟随机会要求。

## Suggested Works

- Work Title, 2024. Image: /absolute/path/to/artist-assets/works/work-01.jpg
- Work Title, 2023. Image: /absolute/path/to/artist-assets/works/work-02.jpg
```

## package-manifest.json

```json
{
  "manifestVersion": 1,
  "status": "draft",
  "requiresUserReview": true,
  "files": {
    "applicationDraft": "application-draft.md",
    "draftEn": "draft-en.md",
    "draftZh": "draft-zh.md",
    "checklist": "checklist.md",
    "selectedWorks": "selected-works.md",
    "opportunitySnapshot": "opportunity.json",
    "generatedDocuments": ["application-package.docx", "application-package.pdf"],
    "imagesDir": "images"
  },
  "reviewRules": {
    "bilingualReviewRequired": true,
    "finalSubmissionLanguageMustFollowOpportunity": true,
    "userEditsBecomeSourceOfTruth": true
  }
}
```

`images/` 只会复制项目允许目录中的图片：`artist-assets/works/`、`artist-assets/source-materials/` 和 `artist-assets/inbox/`。其他系统路径会被跳过。
