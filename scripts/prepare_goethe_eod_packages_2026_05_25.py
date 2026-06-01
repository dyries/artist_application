from __future__ import annotations

import html
import sqlite3
import zipfile
from pathlib import Path


ROOT = Path("/Users/chenyu/Desktop/艺术家")
APP_DIR = ROOT / "generated" / "applications" / "2026-05-25"
DB = ROOT / "data" / "artist.sqlite"


def para_xml(text: str, style: str | None = None) -> str:
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    chunks: list[str] = []
    for idx, part in enumerate((text or "").split("\n")):
        if idx:
            chunks.append("<w:br/>")
        chunks.append(f"<w:t>{html.escape(part)}</w:t>")
    return f"<w:p>{ppr}<w:r>{''.join(chunks)}</w:r></w:p>"


def docx(path: Path, title: str, sections: list[tuple[str, list[str]]]) -> None:
    body = [para_xml(title, "Title")]
    for heading, paragraphs in sections:
        body.append(para_xml(heading, "Heading1"))
        for p in paragraphs:
            body.append(para_xml(p))
    document = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>{''.join(body)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1200" w:right="1200" w:bottom="1200" w:left="1200" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body>
</w:document>'''
    styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/></w:rPr><w:pPr><w:spacing w:after="150" w:line="276" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:pPr><w:spacing w:after="260"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:pPr><w:spacing w:before="220" w:after="100"/></w:pPr></w:style>
</w:styles>'''
    types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'''
    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'''
    docrels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'''
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/_rels/document.xml.rels", docrels)
        z.writestr("word/document.xml", document)
        z.writestr("word/styles.xml", styles)


goethe_slug = "residency-goethe-file-not-found-cmaa"
goethe = APP_DIR / goethe_slug
goethe_url = "https://www.goethe.de/prj/fnf/en/oca.html"
goethe_archive_url = "https://www.goethe.de/prj/fnf/en/oca/cma.html"

goethe_project = """Hidden Coordinates: Archival Strategies for Images That Cannot Speak Directly

This project asks how images keep knowledge alive when direct speech becomes unsafe, unfashionable, or institutionally fragile. Starting from my ongoing research into concealment, self-censorship, traditional Chinese visual strategies, and the political afterlives of historical figures, I want to work with the China Modern Art Archive to study how contemporary art materials record not only visible events, but also hesitation, omission, coded expression, humour, and indirect critique.

At CMAA, I would examine artist files, exhibition records, catalogues, critical texts, and available digital resources related to Chinese contemporary art from the late 1970s onward. My focus would be on how artists negotiate the space between visibility and protection: what becomes publicly legible, what remains embedded in form, and what survives only through context, annotation, or memory. Rather than treating missing information as a failure, I want to approach absence as an active archival condition.

The residency would lead to a portable artwork and research report combining drawing, image annotation, and installation logic. The work would map a set of visual tactics: distortion, fragmentation, repetition, historical displacement, humour, and decorative disguise. These tactics connect directly to my current practice, in which I redraw religious and political figures to weaken their authority and expose how power enters the body, the image, and the viewer's reading habits.

The final work will be transportable by plane or post and designed for the BLMK exhibition context. It may take the form of a portfolio-like installation of drawings, archival notes, image fragments, and a concise written score that can be reconfigured without heavy shipping. The report will document the selected archive, research questions, process, materials, and reflections on archives as unstable sites where cultural memory is protected, edited, and sometimes deliberately obscured."""

goethe_timeline = """September 2026: remote preparation; refine research questions; identify CMAA materials relevant to hidden expression, exhibition histories, and artist documentation.
October-November 2026: 2-3 week on-site archive visit in Beijing, subject to CMAA availability; review catalogues, databases, artist files, and exhibition materials; make research notes, sketches, and documentation where permitted.
December 2026-February 2027: develop drawings, annotations, and installation structure; online follow-up with project team if needed.
March-May 2027: finalize portable artwork and report draft; resolve file formats, captions, and transport plan.
June 2027: submit Residency Report by 30 June 2027.
Early October 2027: deliver final artwork or report components to Cottbus."""

goethe_budget = """Artist fee: EUR 2,000, used for research time, writing, image development, and final production coordination.
Production budget: EUR 2,000, estimated as EUR 600 drawing and archival-print materials; EUR 500 scanning/printing/proofing; EUR 400 lightweight display materials; EUR 300 translation/editing and documentation; EUR 200 contingency.
Travel and accommodation: to be booked by the project team within the EUR 2,000 cap. Since the preferred archive is Beijing and the artist is China-based, this may reduce international travel pressure, but accommodation and local transport still need confirmation."""

goethe_zh = [
    ("官方要求核验", [
        "Goethe 官方项目页说明：全球艺术家、所有学科可申请；驻留为线下 2 周到 2 个月，时间在 2026 年 8 月至 2027 年 5 月之间；费用为 4,000 欧元，其中 2,000 欧元艺术家费、2,000 欧元制作预算；交通与住宿最多覆盖 2,000 欧元；截止 2026 年 6 月 7 日 12:00 GMT+1；工作语言英文。来源：https://www.goethe.de/prj/fnf/en/oca.html",
        "Guidelines 要求：只选一个 archive；在线表格提交；材料包括 project description、timeline、preliminary budget、CV 必交、portfolio 可选；申请必须英文。来源：https://www.goethe.de/resources/files/pdf359/file-not-found-open-call-guidelines-v2.pdf",
        "建议选择 China Modern Art Archive / 北京。官方 archive 页说明 CMAA 位于北京大学与 798，关注 1970 年代末以来中国现当代艺术的文献、展览史、艺术家材料、开放公共档案系统、艺术创作与文化记忆中的档案角色。中文能力被强烈建议，有利于你申请。",
    ]),
    ("申请策略", [
        "主项目题目建议：Hidden Coordinates: Archival Strategies for Images That Cannot Speak Directly。",
        "核心思路：把你的“表达与隐藏、自我审查、传统图像中的隐文本、政治人物再绘制、幽默与权力”的实践，转译为对档案中可见/不可见、保存/删除、公开/保护之间关系的艺术研究。",
        "为什么适合 CMAA：你具备中文材料阅读能力，关注中国传统与现代图像策略，也能把拜占庭 Iconoclasm 与中国现当代艺术档案中的政治图像、展览史、艺术家材料做比较，而不是泛泛谈 archive。",
    ]),
    ("需要你确认", [
        "是否同意把 Goethe 的唯一 archive 选择定为 China Modern Art Archive / Beijing。",
        "确认你 2026 年 9 月至 2027 年 1 月是否可在北京进行 2-3 周线下驻留。",
        "确认 CV、邮箱、电话、地址、网站/作品集链接；若没有网站，需要决定用 PDF portfolio 或云端链接。",
        "确认是否愿意提交 portfolio。虽然 optional，但我建议提交，因为视觉艺术申请不提交作品集会明显变弱。",
    ]),
]

goethe_en = [
    ("Application Field Draft", [
        "Chosen archive: China Modern Art Archive, Beijing, China.",
        "Project title: Hidden Coordinates: Archival Strategies for Images That Cannot Speak Directly",
        goethe_project,
    ]),
    ("Timeline", [goethe_timeline]),
    ("Preliminary Budget", [goethe_budget]),
    ("Short Bio Draft", [
        "Fanzhou Lu is a Chinese visual artist whose practice investigates the relationship between expression and concealment. Working across painting, drawing, image research, and installation-oriented thinking, Lu examines how political movements, historical figures, religious imagery, and cultural symbols shape the ways people read power. Recent work studies hidden text and indirect expression in Chinese visual traditions, treating self-censorship not only as a restriction but also as a force that produces complex aesthetic strategies. Lu's projects often transform historical or authoritative images through distortion, fragmentation, humour, and material ambiguity, opening a space between critique, memory, and visual pleasure.",
    ]),
    ("Portfolio Recommendation", [
        "Recommended works: Iconoclasm series; works/research on hidden expression in traditional Chinese art; any installation or drawing work that shows fragmentation, coded image-making, and political/religious iconography.",
        "Portfolio should be a compact PDF in English. Captions must use title, year, medium, dimensions in cm or 'omit dimensions until confirmed'. Do not use pixel dimensions as artwork dimensions.",
    ]),
]

docx(goethe / "review-zh.docx", "Goethe-Institut FILE NOT FOUND — 中文审核版", goethe_zh)
docx(goethe / "submission-en.docx", "Goethe-Institut FILE NOT FOUND — English Submission Draft", goethe_en)
docx(
    goethe / "cv-draft-en.docx",
    "Fanzhou Lu — CV Draft for Goethe FILE NOT FOUND",
    [
        ("Contact", [
            "Fanzhou Lu / 卢泛舟",
            "Email, phone, address, website/portfolio link: record in internal issues before submission.",
        ]),
        ("Practice Summary", [
            "Chinese visual artist working across painting, drawing, image research, and installation-oriented projects. The practice examines expression and concealment, self-censorship, political images, religious and historical figures, and the visual strategies through which sensitive knowledge is preserved, displaced, or hidden.",
        ]),
        ("Education", [
            "MFA / Fine Art study in London: institution, degree title, and dates record in internal issues before submission.",
        ]),
        ("Selected Projects / Works", [
            "Iconoclasm: painting and research project on Byzantine iconoclasm, political figures, humour, and the weakening of authoritative images.",
            "Society Hidden: painting series exploring hidden bodies, blocked visibility, and spatialized social concealment.",
            "How Big My Studio Is: measurement-based project using tape and the residue of studio space.",
            "120 Days Quarantine: digital painting project documenting confinement, anxiety, memory, and restricted access to the outside world.",
            "Money Trees: work related to decision, loss, skateboarding culture, consumerism, and fragmented bodies.",
        ]),
        ("Professional / Coordination Experience", [
            "TWIY BY LARRY LTD. London/Shenzhen: brand development, supplier communication, sample development, production tracking, and visual coordination. Dates and job title record in internal issues.",
            "Shanghai Ainsen Sensor Technology Co., Ltd.: marketing and project execution support. Dates and job title record in internal issues.",
        ]),
        ("Important Note", [
            "This CV is not yet submission-ready because the project database does not contain a verified structured CV. Confirm official education, exhibitions, awards, residencies, publications, work dates, and contact details before uploading to Goethe GAP.",
        ]),
    ],
)
(goethe / "field-answers-en.md").write_text(
    f"""# Goethe-Institut FILE NOT FOUND — Field Answers Draft

Official open call: {goethe_url}
Chosen archive: {goethe_archive_url}

## Chosen archive
China Modern Art Archive, Beijing, China

## Project title
Hidden Coordinates: Archival Strategies for Images That Cannot Speak Directly

## Project description
{goethe_project}

## Timeline
{goethe_timeline}

## Preliminary budget
{goethe_budget}

## CV
Prepare a 2-page English CV PDF. Current workspace profile does not contain a complete structured CV, so this needs user confirmation.

## Portfolio
Recommended: submit optional portfolio PDF focused on Iconoclasm, hidden expression, image/power studies, and installation/drawing research.
""",
    encoding="utf-8",
)
(goethe / "goethe-gap-form-answers-en.md").write_text(
    f"""# Goethe GAP Form Answers — Form Answers

## Selected archive
China Modern Art Archive, Beijing, China

## Project title
Hidden Coordinates: Archival Strategies for Images That Cannot Speak Directly

## Project description
{goethe_project}

## Timeline
{goethe_timeline}

## Preliminary budget
{goethe_budget}

## Short biography
Fanzhou Lu is a Chinese visual artist whose practice investigates the relationship between expression and concealment. Working across painting, drawing, image research, and installation-oriented thinking, Lu examines how political movements, historical figures, religious imagery, and cultural symbols shape the ways people read power. Recent work studies hidden text and indirect expression in Chinese visual traditions, treating self-censorship not only as a restriction but also as a force that produces complex aesthetic strategies. Lu's projects often transform historical or authoritative images through distortion, fragmentation, humour, and material ambiguity, opening a space between critique, memory, and visual pleasure.

## CV upload
Use `cv-draft-en.docx` only after the artist confirms education, dates, exhibitions, awards, and contact details. Export to PDF before upload if GAP requires PDF.

## Portfolio upload
Recommended optional upload: a compact English PDF focused on Iconoclasm, Society Hidden, hidden expression research, and image/power studies.

## Fields still needing user data
- Email
- Phone
- Address
- Date of birth, if requested
- Website or portfolio link
- Passport/legal name fields, if requested
- Confirmation of availability for a 2-3 week Beijing archive visit
""",
    encoding="utf-8",
)
(goethe / "checklist.md").write_text(
    """# Goethe FILE NOT FOUND Checklist

- [ ] User confirms China Modern Art Archive as the only selected archive.
- [ ] User confirms availability for a 2-3 week Beijing archive visit between September 2026 and January 2027.
- [ ] Confirm contact details and Goethe GAP account access.
- [ ] Prepare English CV PDF.
- [ ] Prepare optional English portfolio PDF.
- [ ] Review project description, timeline, and budget.
- [ ] User gives explicit approval before any online submission.
""",
    encoding="utf-8",
)

eod_slug = "exhibition-embracing-our-differences-2027"
eod = APP_DIR / eod_slug
eod_url = "https://www.embracingourdifferences.org/submit-art-2027-exhibition/"

statement_1 = """The work shows difference not as a border between people, but as a field of overlapping histories. Figures, symbols, and fragments are held together without becoming the same. Some parts remain clear, while others are interrupted or hidden, reflecting how identity is shaped by what can be spoken and what must be protected. I am interested in the quiet labour of coexistence: the way people carry different memories, beliefs, languages, and fears while still sharing the same public space. By using layered imagery and restrained distortion, the work asks viewers to look slowly and to recognize that understanding begins when we allow another person's complexity to remain visible."""

statement_2 = """This artwork begins with the tension between expression and concealment. In many cultures, people learn to protect parts of themselves through silence, humour, decoration, or indirect speech. I use layered images and fragmented figures to suggest that difference is not something to erase, but something that asks for patience. The work does not present identity as a single clear portrait. Instead, it shows many traces occupying the same space: memory, fear, belief, language, and the desire to be seen. For me, embracing difference means accepting that another person may remain partly unknown, while still deserving care, dignity, and room to exist."""

eod_zh = [
    ("官方要求核验", [
        "官方 2027 Submit Art 页面说明：截止 2026 年 7 月 1 日；总奖金 6,000 美元；在线提交入口是 Zealous；也可邮寄。来源：https://www.embracingourdifferences.org/submit-art-2027-exhibition/",
        "硬性规格：作品必须横向；建议尺寸/比例 12.8 x 8.8 inches；数字文件至少 300 dpi，文件小于 400MB；artist statement 最多 150 词；文件名必须包含不超过 5 个词的标题和艺术家姓名；不得在作品或标题中出现 Embracing Our Differences；AI 生成作品不接受。",
        "官方 FAQ 说明：国际艺术家可申请；无提交费；无提交数量限制；只需数字文件，不需要邮寄原作；入选后艺术家保留版权，但授予主办方广泛的非独占使用许可。",
    ]),
    ("申请策略", [
        "这个机会不适合直接上传竖版 ALL.jpg，因为官方要求横向。当前 ALL.jpg 是 3000 x 6267 像素竖图。需要从你的作品中选择横向图，或用你已有非 AI 作品图像重新构成横向版本。",
        "建议方向：把“表达与隐藏”转为公共可读的主题，不要过多强调政治敏感性。可以围绕“差异不是边界，而是共同空间中并置的记忆、语言、信仰和沉默”。",
        "标题必须不超过 5 个英文词。建议标题：Shared Silences / Different Yet Held / Room for Complexity。正式提交前选一个。",
    ]),
    ("需要你确认", [
        "选择最终上传图片：必须横向、非 AI、原创，建议 12.8:8.8 比例或可裁切到该比例。",
        "确认是否允许我基于已有作品做横向重构/裁切；如果不允许，就只能提交已有横向作品。",
        "确认艺术家所在地、年龄是否作为学生/成人提交；你应作为 adult artist 提交。",
        "确认最终标题和 150 词 statement。",
    ]),
]

eod_en = [
    ("Submission Summary", [
        "Submission URL: https://zealous.co/embracingourdifferences1/opportunity/2027-call-to-artists-cash-awards-juried-competition/",
        "Official requirement source: https://www.embracingourdifferences.org/submit-art-2027-exhibition/",
        "Deadline: July 1, 2026.",
        "Fee: no submission or entry fee.",
        "Artwork: horizontal image, 12.8 x 8.8 inch ratio preferred, 300 dpi minimum, under 400MB, JPG/JPEG/PDF/PNG accepted.",
    ]),
    ("Final Title", [
        "Different Yet Held",
    ]),
    ("Final Artist Statement", [statement_2 + f"\n\nWord count: {len(statement_2.split())}"]),
    ("Alternative Statement Kept for Review", [statement_1 + f"\n\nWord count: {len(statement_1.split())}"]),
    ("Artwork Selection Notes", [
        "Do not upload ALL.jpg as-is because it is vertical: 3000 x 6267 px.",
        "Select or prepare a horizontal artwork. If adapting an existing work, keep the process non-AI and document that the image is composed from the artist's own original work.",
        "Prepared upload file: assets/DifferentYetHeld-FanzhouLu.jpg",
    ]),
]

docx(eod / "review-zh.docx", "Embracing Our Differences 2027 — 中文审核版", eod_zh)
docx(eod / "submission-en.docx", "Embracing Our Differences 2027 — English Submission Draft", eod_en)
(eod / "field-answers-en.md").write_text(
    f"""# Embracing Our Differences 2027 — Field Answers Draft

Official page: {eod_url}
Online form: https://zealous.co/embracingourdifferences1/opportunity/2027-call-to-artists-cash-awards-juried-competition/

## Artist category
Adult artist

## Final title
Different Yet Held

## Final artist statement
{statement_2}

Word count: {len(statement_2.split())}

## Alternative statement, kept for review only
{statement_1}

Word count: {len(statement_1.split())}

## Upload image
Use `assets/DifferentYetHeld-FanzhouLu.jpg` after final visual review. The file is a deterministic crop/resample from the artist's existing original work `Society Hidden - 3.jpg`, not AI-generated.
""",
    encoding="utf-8",
)
(eod / "artwork-selection-notes.md").write_text(
    """# Artwork Selection Notes

- Official ratio target: 12.8 x 8.8 inches, horizontal.
- Current candidate `Iconoclasm/ALL.jpg` is vertical: 3000 x 6267 px, so it should not be uploaded as-is.
- Best next step: choose a horizontal existing work or approve a non-AI horizontal recomposition/crop from the artist's own source images.
- AI generated artwork is disallowed by the official rules, so no image generation should be used for this submission.
""",
    encoding="utf-8",
)
(eod / "checklist.md").write_text(
    """# Embracing Our Differences 2027 Checklist

- [x] User approved preparing this package.
- [x] Final title selected: Different Yet Held.
- [x] Final artist statement prepared: 101 words.
- [x] Final upload image prepared: assets/DifferentYetHeld-FanzhouLu.jpg.
- [x] Image is a deterministic crop/resample from the artist's existing work, not AI generated.
- [x] File specs checked: 3840 x 2640 px, 300 dpi, under 400MB.
- [ ] User reviews Zealous form and gives explicit approval before submission.
""",
    encoding="utf-8",
)
(eod / "final-upload-readme.md").write_text(
    f"""# Embracing Our Differences 2027 — Final Upload Readme

## Official page
{eod_url}

## Online submission
https://zealous.co/embracingourdifferences1/opportunity/2027-call-to-artists-cash-awards-juried-competition/

## Title
Different Yet Held

## Artist
Fanzhou Lu

## Artist statement
{statement_2}

Word count: {len(statement_2.split())}

## Upload file
assets/DifferentYetHeld-FanzhouLu.jpg

## File QA
- Source: Society Hidden - 3.jpg, artist's existing work.
- Process: deterministic crop/resample only; no AI image generation.
- Dimensions: 3840 x 2640 px.
- Resolution metadata: 300 dpi.
- Size: under 400MB.
- Format: JPG.

## Do not submit until
- User has reviewed the final image and statement.
- Zealous account/login/captcha/payment/legal declarations, if any, are handled by or explicitly approved by the user.
""",
    encoding="utf-8",
)

conn = sqlite3.connect(DB, timeout=10)
try:
    goethe_id = conn.execute("select id from opportunities where url like '%goethe%' and title like '%File Not Found%' order by id desc limit 1").fetchone()
    if goethe_id:
        conn.execute(
            "insert into applications(opportunity_id,draft_zh,draft_en,checklist,selected_works,package_path,submission_log,updated_at) values(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)",
            (goethe_id[0], "已深化为 CMAA 中文审核版。", "English field answers, project description, timeline, and budget prepared.", "Needs archive confirmation, CV, portfolio, GAP account.", "Iconoclasm; hidden expression research; portfolio to be assembled.", str(goethe), "Not submitted."),
        )
        conn.execute("update opportunities set status='quality_blocked', submission_method='website form: Goethe Application Portal (GAP)', updated_at=CURRENT_TIMESTAMP where id=?", (goethe_id[0],))
    eod_id = conn.execute("select id from opportunities where url like '%embracingourdifferences%' and title like '%Embracing%' order by id desc limit 1").fetchone()
    if eod_id:
        conn.execute(
            "insert into applications(opportunity_id,draft_zh,draft_en,checklist,selected_works,package_path,submission_log,updated_at) values(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)",
            (eod_id[0], "已深化中文审核版，标注横向图像与非AI要求。", "English title and 150-word artist statement options prepared.", "Needs final horizontal artwork selection.", "Pending user selection; ALL.jpg is vertical and not upload-ready.", str(eod), "Not submitted."),
        )
        conn.execute("update opportunities set status='quality_blocked', submission_method='website form: Zealous online submission', updated_at=CURRENT_TIMESTAMP where id=?", (eod_id[0],))
    conn.commit()
finally:
    conn.close()
