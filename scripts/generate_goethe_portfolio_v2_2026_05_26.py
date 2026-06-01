from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


ROOT = Path("/Users/chenyu/Desktop/艺术家")
GOETHE = ROOT / "generated/applications/2026-05-25/residency-goethe-file-not-found-cmaa"
OUT = GOETHE / "portfolio-v2-pages"
WORKS = ROOT / "artist-assets/inbox/works"
FONT = "/System/Library/Fonts/HelveticaNeue.ttc"
W, H = 1600, 1131


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


def canvas(path: Path, color: str = "white") -> None:
    run(["magick", "-size", f"{W}x{H}", f"xc:{color}", "-colorspace", "sRGB", "-type", "TrueColor", str(path)])


def fit_image(src: Path, out: Path, width: int, height: int, mode: str = "contain") -> None:
    if mode == "cover":
        resize = f"{width}x{height}^"
    else:
        resize = f"{width}x{height}>"
    args = [
        "magick",
        str(src),
        "-auto-orient",
        "-colorspace",
        "sRGB",
        "-resize",
        resize,
        "-background",
        "white",
        "-gravity",
        "center",
        "-extent",
        f"{width}x{height}",
        "-type",
        "TrueColor",
        str(out),
    ]
    run(args)


def overlay(base: Path, src: Path, x: int, y: int) -> None:
    tmp = base.with_suffix(".tmp.jpg")
    run(["magick", str(base), str(src), "-geometry", f"+{x}+{y}", "-composite", "-colorspace", "sRGB", "-type", "TrueColor", str(tmp)])
    tmp.replace(base)


def text_img(out: Path, text: str, width: int, size: int = 28, color: str = "#111111") -> None:
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


def annotate(base: Path, text: str, x: int, y: int, size: int = 28, color: str = "#111111") -> None:
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


def caption(page: Path, text: str, x: int, y: int, width: int, size: int = 24) -> None:
    img = OUT / f"tmp-caption-{page.stem}-{x}-{y}.png"
    text_img(img, text, width, size, "#222222")
    overlay(page, img, x, y)


def page_no(page: Path, no: int) -> None:
    annotate(page, str(no), W - 75, H - 52, 20, "#777777")


def image_page(no: int, title: str, src: Path, cap: str, mode: str = "contain") -> Path:
    p = OUT / f"page-{no:02d}.jpg"
    canvas(p)
    annotate(p, title, 70, 72, 36)
    box = OUT / f"tmp-{no:02d}.jpg"
    fit_image(src, box, 1460, 830, mode)
    overlay(p, box, 70, 135)
    caption(p, cap, 70, 995, 1260, 23)
    page_no(p, no)
    return p


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    pages: list[Path] = []

    cover = OUT / "page-01.jpg"
    fit_image(WORKS / "What are you looking for/未标题-2.jpg", cover, W, H, "cover")
    run(["magick", str(cover), "-fill", "#ffffffe6", "-draw", "rectangle 0,780 760,1131", "-colorspace", "sRGB", "-type", "TrueColor", str(cover.with_suffix(".tmp.jpg"))])
    cover.with_suffix(".tmp.jpg").replace(cover)
    annotate(cover, "Fanzhou Lu", 70, 875, 54)
    annotate(cover, "Selected Works", 70, 935, 34)
    annotate(cover, "2019-2024", 70, 985, 25, "#333333")
    annotate(cover, "bianzhengtongyi@outlook.com | Shenzhen, China", 70, 1042, 20, "#555555")
    page_no(cover, 1)
    pages.append(cover)

    p = OUT / "page-02.jpg"
    canvas(p)
    annotate(p, "Portfolio Statement", 70, 95, 42)
    statement = (
        "I make paintings, drawings, image research, and installations. "
        "I often work with historical images, blocked bodies, repeated figures, and fragments of public space. "
        "Across these projects, visibility is never neutral: an image can protect, expose, distort, or withhold what it carries."
    )
    caption(p, statement, 70, 190, 680, 31)
    img = OUT / "tmp-statement-hero.jpg"
    fit_image(WORKS / "What are you looking for/1.jpg", img, 690, 850, "cover")
    overlay(p, img, 840, 130)
    annotate(p, "2", W - 75, H - 52, 20, "#777777")
    pages.append(p)

    pages.append(image_page(
        3,
        "What are you looking for",
        WORKS / "What are you looking for/未标题-2.jpg",
        "What are you looking for, painting / installation documentation, 2024. A modular wall of altered historical and religious figures becomes a visible structure of looking, obstruction, and image authority.",
        "contain",
    ))

    p = OUT / "page-04.jpg"
    canvas(p)
    annotate(p, "Iconoclasm / Figure Details", 70, 72, 36)
    detail_paths = [
        WORKS / "Iconoclasm（偶像破坏运动）/画作/1. Emperor Leo III（皇帝利奥三世）- 1.jpg",
        WORKS / "Iconoclasm（偶像破坏运动）/画作/5. Empress Irene（女皇伊琳娜）- 1.jpg",
        WORKS / "Iconoclasm（偶像破坏运动）/画作/16. John of Damascus（大马士革的圣约翰）- 1.jpg",
        WORKS / "Iconoclasm（偶像破坏运动）/画作/28. Theodore the Studite（斯图狄乌斯隐修院的圣狄奥多尔）- 1.jpg",
    ]
    for i, src in enumerate(detail_paths):
        box = OUT / f"tmp-detail-{i}.jpg"
        fit_image(src, box, 345, 770, "cover")
        overlay(p, box, 70 + i * 370, 135)
    caption(p, "Selected details from Iconoclasm. The portraits are not used as illustrations of history but as damaged, theatrical surfaces: authority is repeated until it becomes unstable.", 70, 945, 1360, 24)
    page_no(p, 4)
    pages.append(p)

    pages.append(image_page(
        5,
        "Society Hidden",
        WORKS / "社会隐藏/微信图片_20240904153620.jpg",
        "Society Hidden, painting, 2024. Bodies are partially blocked by constructed colour fields, turning concealment into a spatial and social condition.",
        "cover",
    ))

    p = OUT / "page-06.jpg"
    canvas(p)
    annotate(p, "Society Hidden / Series", 70, 72, 36)
    for i, src in enumerate([
        WORKS / "社会隐藏/Society Hidden - 1.jpg",
        WORKS / "社会隐藏/Society Hidden - 2.jpg",
        WORKS / "社会隐藏/Society Hidden - 3.jpg",
    ]):
        box = OUT / f"tmp-society-{i}.jpg"
        fit_image(src, box, 455, 720, "contain")
        overlay(p, box, 70 + i * 492, 150)
    caption(p, "The series asks what remains visible, what is protected, and what a viewer must infer from partial evidence.", 70, 930, 1360, 24)
    page_no(p, 6)
    pages.append(p)

    pages.append(image_page(
        7,
        "Mausoleum",
        WORKS / "陵2024/Mausoleum 2024.jpg",
        "Mausoleum, 2024, installation / image project. The work links monumental landscape, imperial memory, and the staged afterlife of historical power.",
        "contain",
    ))

    p = OUT / "page-08.jpg"
    canvas(p)
    annotate(p, "Mausoleum / Research Images", 70, 72, 36)
    mausoleum = [
        WORKS / "陵2024/Mausoleum of the First Qin Emperor.jpg",
        WORKS / "陵2024/Qianling, the joint Mausoleum of Wu Zetian, the first female emperor of China, and her husband, Emperor Gaozong of the Tang Dynasty.jpg",
        WORKS / "陵2024/Maoling，Mausoleum of the Han Dynasty Emperor Wu.jpg",
        WORKS / "陵2024/Yangling Mausoleum of the Han Dynasty Emperor Jing.jpg",
    ]
    for i, src in enumerate(mausoleum):
        box = OUT / f"tmp-mausoleum-{i}.jpg"
        fit_image(src, box, 700, 365, "cover")
        overlay(p, box, 70 + (i % 2) * 760, 150 + (i // 2) * 410)
    caption(p, "Field images are treated as working archive material. They show how historical sites choreograph memory through scale, repetition, absence, and orientation.", 70, 1000, 1360, 24)
    page_no(p, 8)
    pages.append(p)

    p = OUT / "page-09.jpg"
    canvas(p)
    annotate(p, "How Big My Studio Is", 70, 72, 36)
    img1 = OUT / "tmp-studio-1.jpg"
    img2 = OUT / "tmp-studio-2.jpg"
    fit_image(WORKS / "测量/How big my studio is photo.jpg", img1, 900, 760, "cover")
    fit_image(WORKS / "测量/How big my studio is.jpg", img2, 440, 760, "contain")
    overlay(p, img1, 70, 150)
    overlay(p, img2, 1060, 150)
    caption(p, "How Big My Studio Is, tape, site-specific installation and sculpture, 2019. Measurement becomes documentation, and documentation becomes material residue: the work turns a small studio into an archive of touch, labour, and lost space.", 70, 945, 1360, 24)
    page_no(p, 9)
    pages.append(p)

    p = OUT / "page-10.jpg"
    canvas(p)
    annotate(p, "120 Days Quarantine", 70, 72, 36)
    quarantine = [
        WORKS / "120/63.jpg",
        WORKS / "120/77.jpg",
        WORKS / "120/88.jpg",
        WORKS / "120/89.jpg",
        WORKS / "120/17a.jpg",
        WORKS / "120/76.jpg",
    ]
    for i, src in enumerate(quarantine):
        box = OUT / f"tmp-quarantine-{i}.jpg"
        fit_image(src, box, 435, 310, "cover")
        overlay(p, box, 70 + (i % 3) * 485, 150 + (i // 3) * 350)
    caption(p, "120 Days Quarantine, digital painting series, 2020. The series records restricted public life through memory, phone images, city fragments, and daily image-making during isolation.", 70, 900, 1360, 24)
    page_no(p, 10)
    pages.append(p)

    pdf = GOETHE / "portfolio-preview-goethe-file-not-found-en-v2.pdf"
    run(["magick", *[str(p) for p in pages], str(pdf)])
    (GOETHE / "portfolio-v2-notes.md").write_text(
        """# Goethe Portfolio v2 Notes

Rebuilt after user feedback that v1 was weak.

Changes:
- Landscape A4 rhythm based on earlier portfolio references.
- Larger images, less empty page space.
- Stronger sequence: What are you looking for / Iconoclasm -> Society Hidden -> Mausoleum -> How Big My Studio Is -> 120 Days Quarantine.
- Removed generic single-image filler logic.
- Kept captions short and focused on the work itself.

Internal checks:
- Exact dimensions in cm can be added later after the artist confirms them; do not use placeholder dimensions in public-facing PDFs.
- Whether to keep 120 Days Quarantine or replace it with another recent project.
- Whether Goethe GAP has a PDF size/page limit.
""",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
