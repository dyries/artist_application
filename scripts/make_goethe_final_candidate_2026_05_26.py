from __future__ import annotations

import shutil
import sqlite3
import subprocess
from pathlib import Path


ROOT = Path("/Users/chenyu/Desktop/艺术家")
GOETHE = ROOT / "generated/applications/2026-05-25/residency-goethe-file-not-found-cmaa"
DB = ROOT / "data/artist.sqlite"
FONT = "/System/Library/Fonts/HelveticaNeue.ttc"


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


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


def caption(out: Path, text: str, width: int, size: int, color: str = "#222222") -> None:
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


def build_final_cv() -> None:
    page = GOETHE / "cv-goethe-en-final-page.jpg"
    run(["magick", "-size", "1240x1754", "xc:white", "-colorspace", "sRGB", "-type", "TrueColor", str(page)])
    annotate(page, "Fanzhou Lu", 90, 105, 48)
    annotate(page, "bianzhengtongyi@outlook.com | +86 186 1705 6528 | Shenzhen, China", 90, 150, 22, "#444444")
    annotate(page, "Chinese | Born January 1993", 90, 182, 22, "#444444")

    sections = [
        ("Profile", "Chinese visual artist working across painting, drawing, image research, and installation-oriented projects. Lu's practice examines expression and concealment, self-censorship, political images, religious and historical figures, and the visual strategies through which sensitive knowledge is preserved, displaced, or hidden."),
        ("Education", "University of the Arts London, Camberwell College of Arts - Master of Fine Art (Painting), graduated Dec 2024.\nJiangxi Science & Technology Normal University - Bachelor of Fine Art (Oil Painting), graduated Jul 2018."),
        ("Selected Exhibitions / Residencies / Projects", "LumiNoir Art, London, UK, Aug 2025.\nMercurial, Saga, Japan, Aug 2024.\nPostgraduate Painting Exhibition, University of the Arts London, London, UK, Jul 2024.\nWhere We're Calling From, Copeland Gallery, London, UK, May 2024.\nARTS ITOYA Artist Residency, Saga, Japan, Aug 2024.\nCOPE NYC Artist Residency, New York, USA, Sep-Nov 2019.\nThe 3rd Jiangxi Contemporary Art Exhibition and Landscape 2018 International Art Exchange Exhibition, Nanchang, China, Dec 2017-Jan 2018.\nThe 4th Chinese Lacquer Painting Exhibition, Nanchang, China, Oct 2016-Jan 2017."),
        ("Research / Publication", "Research interests: historical images and visual narrative; image reproduction in contemporary art; art and urban culture; Byzantine art; indirect expression and concealment.\nPublication: 'An analysis of the essential common visual elements and the pathways presented in the system of vaporwave works and art movements,' Art Education Research, Issue 20, 2018.\nResearch assistant: Practice and Research of Teaching Oil Painting on the Human Figure under the Teaching Format of 'Studio' System, 2017-2018."),
        ("Professional Experience", "TWIY BY LARRY LTD., London / Shenzhen - Creative Project & Brand Development Specialist, Oct 2024-Aug 2025.\nAINSON SENSOR TECHNOLOGY CO., LTD., Shanghai - Marketing & Sourcing Coordinator, Oct 2021-Jun 2023.\nST Media Culture & Communication Co., Ltd., Xi'an - Art & Portfolio Instructor, Aug 2020-Aug 2021."),
        ("Language", "Chinese: native. English: TOEFL 96."),
    ]
    y = 250
    for heading, text in sections:
        annotate(page, heading, 90, y, 26)
        img = GOETHE / f"tmp-final-cv-{heading.replace(' ', '-').replace('/', '')}.png"
        caption(img, text, 1060, 20)
        composite(page, img, 90, y + 24)
        y += 85 + max(45, len(text) // 2)
    run(["magick", str(page), str(GOETHE / "cv-goethe-en-final.pdf")])


def main() -> None:
    build_final_cv()
    src_portfolio = GOETHE / "portfolio-preview-goethe-file-not-found-en-v2.pdf"
    final_portfolio = GOETHE / "portfolio-goethe-file-not-found-en-submission-ready.pdf"
    shutil.copyfile(src_portfolio, final_portfolio)

    final_answers = GOETHE / "goethe-gap-form-answers-en-submission-ready.md"
    source_answers = (GOETHE / "goethe-gap-form-answers-en.md").read_text(encoding="utf-8")
    final_answers.write_text(
        source_answers
        + "\n\n# Upload File Attachments\n\n"
        + "- CV: cv-goethe-en-final.pdf\n"
        + "- Portfolio: portfolio-goethe-file-not-found-en-submission-ready.pdf\n\n"
        + "# Internal Notes\n\n"
        + "- Archive fixed: China Modern Art Archive, Beijing.\n"
        + "- TOEFL score used: 96, based on the recent CV.\n"
        + "- Portfolio v2 retained as the current candidate after user said it was acceptable.\n"
        + "- Do not submit without explicit final approval.\n",
        encoding="utf-8",
    )

    (GOETHE / "SUBMISSION-READY-README.md").write_text(
        """# Goethe FILE NOT FOUND Upload-Ready Package

Status: ready for user review, not submitted.

Use these files if the user approves final submission:
- `goethe-gap-form-answers-en-submission-ready.md`
- `cv-goethe-en-final.pdf`
- `portfolio-goethe-file-not-found-en-submission-ready.pdf`

Review/support files:
- `final-review-checklist-zh.md`
- `final-review-zh.docx`
- `upload-manifest-en.md`
- `portfolio-v2-notes.md`

Remaining live-check items inside Goethe GAP:
- account/login state
- hidden required fields
- accepted file formats and file-size limits
- captcha
- legal declarations / consent checkboxes

Boundary:
No submission, payment, login workaround, or legal confirmation has been performed.
""",
        encoding="utf-8",
    )

    conn = sqlite3.connect(DB, timeout=10)
    try:
        row = conn.execute("select id from opportunities where title like '%File Not Found%' order by id desc limit 1").fetchone()
        if row:
            conn.execute("update opportunities set status='package_ready_for_final_review', updated_at=CURRENT_TIMESTAMP where id=?", (row[0],))
            conn.execute(
                "update applications set submission_log='Upload-ready package prepared; awaiting explicit user approval before any submission.', checklist=checklist || char(10) || '2026-05-26: upload-ready files prepared: cv-goethe-en-final.pdf, portfolio-goethe-file-not-found-en-submission-ready.pdf, goethe-gap-form-answers-en-submission-ready.md.', updated_at=CURRENT_TIMESTAMP where opportunity_id=? and package_path=?",
                (row[0], str(GOETHE)),
            )
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
