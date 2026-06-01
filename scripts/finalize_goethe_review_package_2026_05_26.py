from __future__ import annotations

import html
import sqlite3
import subprocess
import zipfile
from pathlib import Path


ROOT = Path("/Users/chenyu/Desktop/艺术家")
GOETHE = ROOT / "generated/applications/2026-05-25/residency-goethe-file-not-found-cmaa"
DB = ROOT / "data/artist.sqlite"
FONT = "/System/Library/Fonts/HelveticaNeue.ttc"


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


def paragraph_xml(text: str, style: str | None = None) -> str:
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    chunks = []
    for i, part in enumerate((text or "").split("\n")):
        if i:
            chunks.append("<w:br/>")
        chunks.append(f"<w:t>{html.escape(part)}</w:t>")
    return f"<w:p>{ppr}<w:r>{''.join(chunks)}</w:r></w:p>"


def make_docx(path: Path, title: str, sections: list[tuple[str, list[str]]]) -> None:
    body = [paragraph_xml(title, "Title")]
    for heading, paragraphs in sections:
        body.append(paragraph_xml(heading, "Heading1"))
        for p in paragraphs:
            body.append(paragraph_xml(p))
    document = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{''.join(body)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1200" w:right="1200" w:bottom="1200" w:left="1200" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>'''
    styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/></w:rPr><w:pPr><w:spacing w:after="130" w:line="270" w:lineRule="auto"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:pPr><w:spacing w:after="260"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="25"/></w:rPr><w:pPr><w:spacing w:before="200" w:after="90"/></w:pPr></w:style></w:styles>'''
    types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'''
    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'''
    docrels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'''
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/_rels/document.xml.rels", docrels)
        z.writestr("word/document.xml", document)
        z.writestr("word/styles.xml", styles)


def make_text_image(out: Path, text: str, width: int, size: int, color: str = "#111111") -> None:
    run([
        "magick",
        "-background",
        "none",
        "-fill",
        color,
        "-font",
        FONT,
        "-pointsize",
        str(size),
        "-size",
        f"{width}x",
        f"caption:{text}",
        str(out),
    ])


def composite(base: Path, overlay: Path, x: int, y: int) -> None:
    tmp = base.with_suffix(".tmp.jpg")
    run(["magick", str(base), str(overlay), "-geometry", f"+{x}+{y}", "-composite", "-colorspace", "sRGB", "-type", "TrueColor", str(tmp)])
    tmp.replace(base)


def annotate(base: Path, text: str, x: int, y: int, size: int, color: str = "#111111") -> None:
    tmp = base.with_suffix(".tmp.jpg")
    run([
        "magick",
        str(base),
        "-font",
        FONT,
        "-fill",
        color,
        "-pointsize",
        str(size),
        "-annotate",
        f"+{x}+{y}",
        text,
        "-colorspace",
        "sRGB",
        "-type",
        "TrueColor",
        str(tmp),
    ])
    tmp.replace(base)


def build_cv_pdf() -> None:
    page = GOETHE / "cv-goethe-en-page.jpg"
    run(["magick", "-size", "1240x1754", "xc:white", "-colorspace", "sRGB", "-type", "TrueColor", str(page)])
    annotate(page, "Fanzhou Lu", 90, 105, 48)
    annotate(page, "bianzhengtongyi@outlook.com | +86 186 1705 6528 | Shenzhen, China", 90, 150, 22, "#444444")
    annotate(page, "Chinese | Born January 1993", 90, 182, 22, "#444444")

    sections = [
        ("Profile", "Chinese visual artist working across painting, drawing, image research, and installation-oriented projects. Lu's practice examines expression and concealment, self-censorship, political images, religious and historical figures, and the visual strategies through which sensitive knowledge is preserved, displaced, or hidden."),
        ("Education", "University of the Arts London, Camberwell College of Arts - Master of Fine Art (Painting), graduated Dec 2024.\nJiangxi Science & Technology Normal University - Bachelor of Fine Art (Oil Painting), graduated Jul 2018."),
        ("Selected Exhibitions / Residencies / Projects", "LumiNoir Art, London, UK, Aug 2025.\nMercurial, Saga, Japan, Aug 2024.\nPostgraduate Painting Exhibition, University of the Arts London, London, UK, Jul 2024.\nWhere We're Calling From, Copeland Gallery, London, UK, May 2024.\nARTS ITOYA Artist Residency, Saga, Japan, Aug 2024.\nCOPE NYC Artist Residency, New York, USA, Sep-Nov 2019.\nThe 3rd Jiangxi Contemporary Art Exhibition and Landscape 2018 International Art Exchange Exhibition, Nanchang, China, Dec 2017-Jan 2018.\nThe 4th Chinese Lacquer Painting Exhibition, Nanchang, China, Oct 2016-Jan 2017."),
        ("Research / Publication", "Research interests: historical images and visual narrative; image reproduction in contemporary art; art and urban culture; Byzantine art; indirect expression and concealment.\nPublication: 'An analysis of the essential common visual elements and the pathways presented in the system of vaporwave works and art movements,' Art Education Research, Issue 20, 2018."),
        ("Professional Experience", "TWIY BY LARRY LTD., London / Shenzhen - Creative Project & Brand Development Specialist, Oct 2024-Aug 2025.\nAINSON SENSOR TECHNOLOGY CO., LTD., Shanghai - Marketing & Sourcing Coordinator, Oct 2021-Jun 2023.\nST Media Culture & Communication Co., Ltd., Xi'an - Art & Portfolio Instructor, Aug 2020-Aug 2021."),
        ("Language", "Chinese: native. English: TOEFL 96 according to recent CV; older CV lists TOEFL 92. Confirm preferred score before final upload."),
    ]
    y = 250
    for heading, text in sections:
        annotate(page, heading, 90, y, 26)
        body = GOETHE / f"tmp-cv-{heading.replace(' ', '-').replace('/', '')}.png"
        make_text_image(body, text, 1060, 21, "#222222")
        composite(page, body, 90, y + 24)
        # Approximate vertical advance based on wrapped lines and paragraph breaks.
        y += 95 + max(35, len(text) // 2)
    run(["magick", str(page), str(GOETHE / "cv-goethe-en.pdf")])


def main() -> None:
    portfolio = GOETHE / "portfolio-preview-goethe-file-not-found-en-v2.pdf"
    if not portfolio.exists():
        raise SystemExit("Missing portfolio v2 PDF; run generate_goethe_portfolio_v2_2026_05_26.py first.")

    build_cv_pdf()

    project_description = """Hidden Coordinates: Archival Strategies for Images That Cannot Speak Directly

This project asks how images keep knowledge alive when direct speech becomes unsafe, unfashionable, or institutionally fragile. Starting from my ongoing research into concealment, self-censorship, traditional Chinese visual strategies, and the political afterlives of historical figures, I want to work with the China Modern Art Archive to study how contemporary art materials record not only visible events, but also hesitation, omission, coded expression, humour, and indirect critique.

At CMAA, I would examine artist files, exhibition records, catalogues, critical texts, and available digital resources related to Chinese contemporary art from the late 1970s onward. My focus would be on how artists negotiate the space between visibility and protection: what becomes publicly legible, what remains embedded in form, and what survives only through context, annotation, or memory. Rather than treating missing information as a failure, I want to approach absence as an active archival condition.

The residency would lead to a portable artwork and research report combining drawing, image annotation, and installation logic. The work would map a set of visual tactics: distortion, fragmentation, repetition, historical displacement, humour, and decorative disguise. These tactics connect directly to my current practice, in which I redraw religious and political figures to weaken their authority and expose how power enters the body, the image, and the viewer's reading habits.

The final work will be transportable by plane or post and designed for the BLMK exhibition context. It may take the form of a portfolio-like installation of drawings, archival notes, image fragments, and a concise written score that can be reconfigured without heavy shipping. The report will document the selected archive, research questions, process, materials, and reflections on archives as unstable sites where cultural memory is protected, edited, and sometimes deliberately obscured."""

    final_md = GOETHE / "final-review-checklist-zh.md"
    final_md.write_text(
        f"""# Goethe-Institut FILE NOT FOUND - 最终审核清单

## 当前状态
- 状态：材料准备中，未提交。
- 机会：Goethe-Institut FILE NOT FOUND Artistic Research Residencies。
- 截止：2026-06-07 12:00 GMT+1。
- 语言：英文正式提交；中文仅用于用户审核。
- 选定 archive：China Modern Art Archive, Beijing。

## 已准备上传/复制材料
- 表格答案：`goethe-gap-form-answers-en.md`
- 项目说明：见表格答案中的 Project description。
- CV DOCX：`cv-draft-en.docx`
- CV PDF：`cv-goethe-en.pdf`
- 作品集 PDF：`portfolio-preview-goethe-file-not-found-en-v2.pdf`
- 中文审核文件：`review-zh.docx`

## 仍需用户最终确认
- CV 中 LumiNoir Art、Mercurial、Postgraduate Painting Exhibition、Where We're Calling From 的月份/正式展名是否准确。
- TOEFL 使用 96 还是旧 CV 的 92。
- 若用户补充作品 cm 尺寸，再加入作品集；未确认前不要在对外 PDF 中使用占位尺寸。
- 是否保留 `120 Days Quarantine`，还是替换为更近作品。
- Goethe GAP 是否要求账户登录、验证码或文件格式限制；这些需要进入官方系统后确认。

## 禁止自动完成项
- 未经你再次明确说“提交 Goethe”，不进入最终提交。
- 不代表你确认法律声明、授权条款或个人敏感信息。
- 不付款、不绕过验证码、不创建或使用外部账户提交。
""",
        encoding="utf-8",
    )

    upload_manifest = GOETHE / "upload-manifest-en.md"
    upload_manifest.write_text(
        f"""# Goethe FILE NOT FOUND Upload Manifest

## Applicant
- Name: Fanzhou Lu / 卢泛舟
- Email: bianzhengtongyi@outlook.com
- Phone: +86 186 1705 6528
- Address: No. 248 Shangwu Avenue, Bao'an District, Shenzhen, Guangdong, China
- Date of birth: January 1993
- Nationality: Chinese
- Current city: Shenzhen, China

## Archive
China Modern Art Archive, Beijing, China

## Project title
Hidden Coordinates: Archival Strategies for Images That Cannot Speak Directly

## Project description
{project_description}

## Upload files
- CV: cv-goethe-en.pdf
- Optional portfolio: portfolio-preview-goethe-file-not-found-en-v2.pdf

## Internal review files
- cv-draft-en.docx
- review-zh.docx
- final-review-checklist-zh.md

## Still not final
Do not submit until the user confirms CV facts, portfolio content, and the Goethe GAP fields visible after login.
""",
        encoding="utf-8",
    )

    make_docx(
        GOETHE / "final-review-zh.docx",
        "Goethe FILE NOT FOUND - 最终审核清单",
        [
            ("当前状态", [
                "材料准备中，未提交。正式提交语言为英文；中文文件仅供用户审核。",
                "选定 archive：China Modern Art Archive, Beijing。",
                "截止：2026-06-07 12:00 GMT+1。",
            ]),
            ("已准备材料", [
                "goethe-gap-form-answers-en.md：可复制到 GAP 表格的英文答案。",
                "cv-goethe-en.pdf：英文 CV PDF 草稿。",
                "portfolio-preview-goethe-file-not-found-en-v2.pdf：当前基准作品集。",
                "upload-manifest-en.md：上传清单与字段汇总。",
            ]),
            ("仍需确认", [
                "CV 中部分展览月份/正式名称、TOEFL 分数、作品尺寸 cm。",
                "作品集是否保留 120 Days Quarantine，或替换成更新作品。",
                "进入 Goethe GAP 后是否有额外字段、验证码、账户、法律声明或文件大小限制。",
            ]),
            ("边界", [
                "未经用户明确说提交 Goethe，不提交、不付款、不确认法律声明。",
            ]),
        ],
    )

    conn = sqlite3.connect(DB, timeout=10)
    try:
        row = conn.execute("select id from opportunities where title like '%File Not Found%' order by id desc limit 1").fetchone()
        if row:
            conn.execute(
                "update opportunities set status='ready_review', updated_at=CURRENT_TIMESTAMP where id=?",
                (row[0],),
            )
            conn.execute(
                "update applications set checklist=checklist || char(10) || '2026-05-26: final review checklist, CV PDF, upload manifest, and portfolio v2 prepared; awaiting user confirmation.', submission_log='Ready for user review; not submitted.', updated_at=CURRENT_TIMESTAMP where opportunity_id=? and package_path=?",
                (row[0], str(GOETHE)),
            )
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
