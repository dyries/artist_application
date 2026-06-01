from __future__ import annotations

import html
import shutil
import sqlite3
import subprocess
import zipfile
from pathlib import Path


ROOT = Path("/Users/chenyu/Desktop/艺术家")
GOETHE = ROOT / "generated/applications/2026-05-25/residency-goethe-file-not-found-cmaa"
EOD = ROOT / "generated/applications/2026-05-25/exhibition-embracing-our-differences-2027"
PAGES = GOETHE / "portfolio-pages"
ASSETS = ROOT / "artist-assets/inbox/works"
DB = ROOT / "data/artist.sqlite"
FONT = "/System/Library/Fonts/HelveticaNeue.ttc"

CONTACT = {
    "name": "Fanzhou Lu / 卢泛舟",
    "email": "bianzhengtongyi@outlook.com",
    "phone": "+86 186 1705 6528",
    "address": "No. 248 Shangwu Avenue, Bao'an District, Shenzhen, Guangdong, China",
    "date_of_birth": "January 1993",
    "nationality": "Chinese",
    "city": "Shenzhen, China",
    "website": "",
}


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


def esc(text: str) -> str:
    return html.escape(text)


def para_xml(text: str, style: str | None = None) -> str:
    ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>' if style else ""
    chunks = []
    for i, part in enumerate((text or "").split("\n")):
        if i:
            chunks.append("<w:br/>")
        chunks.append(f"<w:t>{esc(part)}</w:t>")
    return f"<w:p>{ppr}<w:r>{''.join(chunks)}</w:r></w:p>"


def docx(path: Path, title: str, sections: list[tuple[str, list[str]]]) -> None:
    body = [para_xml(title, "Title")]
    for heading, paragraphs in sections:
        body.append(para_xml(heading, "Heading1"))
        for p in paragraphs:
            body.append(para_xml(p))
    document = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>{''.join(body)}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1200" w:right="1200" w:bottom="1200" w:left="1200" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>'''
    styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"/><w:sz w:val="21"/></w:rPr><w:pPr><w:spacing w:after="120" w:line="270" w:lineRule="auto"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:pPr><w:spacing w:after="260"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="25"/></w:rPr><w:pPr><w:spacing w:before="200" w:after="90"/></w:pPr></w:style></w:styles>'''
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


def make_caption(path: Path, text: str, width: int, pointsize: int = 32, fill: str = "#1a1a1a") -> None:
    run([
        "magick",
        "-background",
        "white",
        "-fill",
        fill,
        "-font",
        FONT,
        "-pointsize",
        str(pointsize),
        "-size",
        f"{width}x",
        f"caption:{text}",
        str(path),
    ])


def make_boxed_image(src: Path, out: Path, width: int, height: int) -> None:
    run([
        "magick",
        str(src),
        "-auto-orient",
        "-colorspace",
        "sRGB",
        "-resize",
        f"{width}x{height}>",
        "-background",
        "white",
        "-gravity",
        "center",
        "-extent",
        f"{width}x{height}",
        str(out),
    ])


def new_page(path: Path) -> None:
    run(["magick", "-size", "1600x2200", "xc:white", "-colorspace", "sRGB", "-type", "TrueColor", str(path)])


def composite(base: Path, overlay: Path, x: int, y: int) -> None:
    tmp = base.with_suffix(".tmp.jpg")
    run(["magick", str(base), str(overlay), "-geometry", f"+{x}+{y}", "-composite", "-colorspace", "sRGB", "-type", "TrueColor", str(tmp)])
    tmp.replace(base)


def annotate(base: Path, text: str, x: int, y: int, pointsize: int = 32, color: str = "#111111") -> None:
    tmp = base.with_suffix(".tmp.jpg")
    run([
        "magick",
        str(base),
        "-font",
        FONT,
        "-fill",
        color,
        "-pointsize",
        str(pointsize),
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


def page_with_one_image(index: int, title: str, src: Path, caption: str, image_h: int = 1220) -> Path:
    page = PAGES / f"page-{index:02d}.jpg"
    new_page(page)
    annotate(page, title, 120, 150, 48)
    img = PAGES / f"tmp-{index:02d}-image.jpg"
    make_boxed_image(src, img, 1360, image_h)
    composite(page, img, 120, 250)
    cap = PAGES / f"tmp-{index:02d}-caption.png"
    make_caption(cap, caption, 1360, 30, "#333333")
    composite(page, cap, 120, 250 + image_h + 45)
    annotate(page, str(index), 1480, 2110, 24, "#777777")
    return page


def page_with_three_images(index: int, title: str, images: list[Path], caption: str) -> Path:
    page = PAGES / f"page-{index:02d}.jpg"
    new_page(page)
    annotate(page, title, 120, 150, 48)
    for i, src in enumerate(images):
        img = PAGES / f"tmp-{index:02d}-{i}.jpg"
        make_boxed_image(src, img, 420, 980)
        composite(page, img, 120 + i * 470, 300)
    cap = PAGES / f"tmp-{index:02d}-caption.png"
    make_caption(cap, caption, 1360, 30, "#333333")
    composite(page, cap, 120, 1360)
    annotate(page, str(index), 1480, 2110, 24, "#777777")
    return page


def generate_portfolio() -> None:
    if PAGES.exists():
        shutil.rmtree(PAGES)
    PAGES.mkdir(parents=True, exist_ok=True)
    pages: list[Path] = []

    cover = PAGES / "page-01.jpg"
    new_page(cover)
    annotate(cover, "Fanzhou Lu", 120, 360, 76)
    annotate(cover, "Selected Works", 120, 460, 44)
    annotate(cover, "Archive, concealment, image politics, and indirect expression", 120, 540, 31, "#444444")
    annotate(cover, "Goethe-Institut Artistic Research Residencies", 120, 650, 30, "#444444")
    annotate(cover, "2019-2024", 120, 700, 30, "#444444")
    annotate(cover, "Contact: bianzhengtongyi@outlook.com | +86 186 1705 6528 | Shenzhen, China", 120, 1830, 26, "#555555")
    annotate(cover, "1", 1480, 2110, 24, "#777777")
    pages.append(cover)

    statement = PAGES / "page-02.jpg"
    new_page(statement)
    annotate(statement, "Portfolio Statement", 120, 150, 52)
    text = (
        "My practice investigates the relationship between expression and concealment. I work with painting, drawing, "
        "image research, and installation-oriented projects to examine how historical images, political figures, "
        "religious symbols, and ordinary spaces carry hidden structures of power. For FILE NOT FOUND, I am selecting "
        "works that treat images as unstable archives: sites where memory is preserved, distorted, protected, or made "
        "partly unreadable. The portfolio connects my research into self-censorship, traditional visual strategies, "
        "humour, and political afterlives to the proposed study at the China Modern Art Archive."
    )
    cap = PAGES / "tmp-statement.png"
    make_caption(cap, text, 1360, 38, "#222222")
    composite(statement, cap, 120, 300)
    annotate(statement, "2", 1480, 2110, 24, "#777777")
    pages.append(statement)

    pages.append(page_with_one_image(
        3,
        "Iconoclasm",
        ASSETS / "Iconoclasm（偶像破坏运动）/ALL.jpg",
        "Iconoclasm, painting / image research installation. The project redraws historical and political figures to weaken the authority of inherited images and to turn solemn iconography into a field of humour, distortion, and critical distance.",
        1360,
    ))
    pages.append(page_with_three_images(
        4,
        "Iconoclasm - Selected Details",
        [
            ASSETS / "Iconoclasm（偶像破坏运动）/画作/1. Emperor Leo III（皇帝利奥三世）- 1.jpg",
            ASSETS / "Iconoclasm（偶像破坏运动）/画作/5. Empress Irene（女皇伊琳娜）- 1.jpg",
            ASSETS / "Iconoclasm（偶像破坏运动）/画作/16. John of Damascus（大马士革的圣约翰）- 1.jpg",
        ],
        "These details show how authoritative portraits become unstable through colour, repetition, and altered surfaces.",
    ))
    pages.append(page_with_three_images(
        5,
        "Society Hidden",
        [
            ASSETS / "社会隐藏/Society Hidden - 1.jpg",
            ASSETS / "社会隐藏/Society Hidden - 2.jpg",
            ASSETS / "社会隐藏/Society Hidden - 3.jpg",
        ],
        "Society Hidden, painting series. Bodies and faces are blocked by architectural colour fields, turning concealment into a spatial and social condition rather than a simple absence.",
    ))
    pages.append(page_with_one_image(
        6,
        "Mausoleum",
        ASSETS / "陵2024/Mausoleum 2024.jpg",
        "Mausoleum, 2024, installation / image project. The work studies monumental memory and the ways historical sites organize authority, ritual, and the viewer's body.",
        1220,
    ))
    pages.append(page_with_three_images(
        7,
        "Mausoleum - Research Images",
        [
            ASSETS / "陵2024/Mausoleum of the First Qin Emperor.jpg",
            ASSETS / "陵2024/Qianling, the joint Mausoleum of Wu Zetian, the first female emperor of China, and her husband, Emperor Gaozong of the Tang Dynasty.jpg",
            ASSETS / "陵2024/Maoling，Mausoleum of the Han Dynasty Emperor Wu.jpg",
        ],
        "Research images from mausoleum sites connect landscape, imperial narrative, and the management of cultural memory.",
    ))
    pages.append(page_with_one_image(
        8,
        "How Big My Studio Is",
        ASSETS / "测量/How big my studio is.jpg",
        "How Big My Studio Is, tape, studio intervention, documentation, 2019. The project measures a small studio until the act of measurement consumes the working space, turning documentation into material residue.",
        1220,
    ))
    pages.append(page_with_three_images(
        9,
        "120 Days Quarantine",
        [
            ASSETS / "120/63.jpg",
            ASSETS / "120/77.jpg",
            ASSETS / "120/88.jpg",
        ],
        "120 Days Quarantine, digital paintings, 2020. Made during extended isolation, the series reconstructs the outside world through memory, phone images, city fragments, and restricted access to public life.",
    ))
    pages.append(page_with_one_image(
        10,
        "Different Yet Held",
        EOD / "assets/DifferentYetHeld-FanzhouLu.jpg",
        "Different Yet Held, 2026. A horizontal image developed from Society Hidden - 3 through crop and resampling.",
        1220,
    ))

    pdf = GOETHE / "portfolio-preview-goethe-file-not-found-en.pdf"
    run(["magick", *[str(p) for p in pages], str(pdf)])

    notes = GOETHE / "portfolio-image-selection-notes.md"
    notes.write_text(
        """# Portfolio Image Selection Notes

Internal image-selection notes for the current portfolio draft.

Selection logic:
- Lead with Iconoclasm because it directly addresses image politics, historical authority, humour, and religious-political iconography.
- Include Society Hidden because it visually connects to concealment, protected expression, and blocked visibility.
- Include Mausoleum because it ties cultural memory, historical sites, and archival imagination to Chinese contexts.
- Include How Big My Studio Is as a spatial/documentary work where measurement becomes material residue.
- Include 120 Days Quarantine as an image-based archive of restricted public life.
- Include Different Yet Held only if a compact horizontal adaptation is useful; otherwise keep it separate from other submissions.

Open issues before final upload:
- Confirm artwork years and dimensions in cm.
- Confirm whether to include all 10 pages or reduce to 8 pages.
- Confirm whether Goethe GAP accepts PDF portfolio and any file-size/page limit.
""",
        encoding="utf-8",
    )


def update_goethe_files() -> None:
    form = GOETHE / "goethe-gap-form-answers-en.md"
    existing = form.read_text(encoding="utf-8") if form.exists() else ""
    prefix = f"""# Applicant Details

- Name: Fanzhou Lu / 卢泛舟
- Email: {CONTACT['email']}
- Phone: {CONTACT['phone']}
- Address: {CONTACT['address']}
- Date of birth: {CONTACT['date_of_birth']}
- Nationality: {CONTACT['nationality']}
- Current city: {CONTACT['city']}

"""
    if "# Applicant Details" not in existing:
        form.write_text(prefix + existing, encoding="utf-8")
    else:
        form.write_text(existing, encoding="utf-8")

    cv_sections = [
        ("Contact", [
            f"{CONTACT['name']}",
            f"{CONTACT['email']} | {CONTACT['phone']}",
            f"{CONTACT['address']}",
            f"Nationality: {CONTACT['nationality']} | Current city: {CONTACT['city']} | Date of birth: {CONTACT['date_of_birth']}",
        ]),
        ("Profile", [
            "Chinese visual artist working across painting, drawing, image research, and installation-oriented projects. Lu's practice examines expression and concealment, self-censorship, political images, religious and historical figures, and the visual strategies through which sensitive knowledge is preserved, displaced, or hidden.",
        ]),
        ("Education", [
            "University of the Arts London, Camberwell College of Arts - Master of Fine Art (Painting), graduated Dec 2024.",
            "Jiangxi Science & Technology Normal University - Bachelor of Fine Art (Oil Painting), graduated Jul 2018.",
        ]),
        ("Selected Exhibitions / Residencies / Projects", [
            "LumiNoir Art, London, UK, Aug 2025.",
            "Mercurial, Saga, Japan, 2024.",
            "Postgraduate Painting Exhibition, University of the Arts London, London, UK, 2024.",
            "Where We're Calling From, Copeland Gallery, London, UK, 2024.",
            "ARTS ITOYA Artist Residency, Saga, Japan, 2024.",
            "COPE NYC Artist Residency, New York, USA, 2019.",
            "The 3rd Jiangxi Contemporary Art Exhibition and Landscape 2018 International Art Exchange Exhibition, Nanchang, China, 2017-2018, artist assistant / translator for Dirk Baumanns.",
            "The 4th Chinese Lacquer Painting Exhibition, Nanchang, China, 2016-2017, curatorial assistant.",
        ]),
        ("Research / Publication", [
            "Research interests: historical images and visual narrative; image reproduction in contemporary art; art and urban culture; Byzantine art; indirect expression and concealment.",
            "Publication: 'An analysis of the essential common visual elements and the pathways presented in the system of vaporwave works and art movements,' Art Education Research, Issue 20, 2018.",
            "Research assistant: Practice and Research of Teaching Oil Painting on the Human Figure under the Teaching Format of 'Studio' System, Jiangxi Science & Technology Normal University, 2017-2018.",
        ]),
        ("Professional Experience", [
            "TWIY BY LARRY LTD., London / Shenzhen - Creative Project & Brand Development Specialist, Oct 2024-Aug 2025.",
            "AINSON SENSOR TECHNOLOGY CO., LTD., Shanghai - Marketing & Sourcing Coordinator, Oct 2021-Jun 2023.",
            "ST Media Culture & Communication Co., Ltd., Xi'an - Art & Portfolio Instructor, Aug 2020-Aug 2021.",
        ]),
        ("Language", [
            "Chinese: native. English: TOEFL 96 according to recent CV; older CV lists TOEFL 92. Use 96 unless the user prefers the older score.",
        ]),
    ]
    docx(GOETHE / "cv-draft-en.docx", "Fanzhou Lu - CV", cv_sections)

    conn = sqlite3.connect(DB, timeout=10)
    try:
        conn.execute(
            "update artist_profile set email=?, location=?, location_zh=?, location_en=?, website=?, updated_at=CURRENT_TIMESTAMP where id=1",
            (CONTACT["email"], CONTACT["city"], "深圳", "Shenzhen, China", ""),
        )
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    update_goethe_files()
    generate_portfolio()
