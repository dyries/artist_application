from __future__ import annotations

import html
import os
import sqlite3
import textwrap
import zipfile
from datetime import datetime
from pathlib import Path


ROOT = Path("/Users/chenyu/Desktop/艺术家")
RUN_DATE = "2026-05-25"
REPORT_DIR = ROOT / "generated" / "reports"
APP_DIR = ROOT / "generated" / "applications" / RUN_DATE
DB = ROOT / "data" / "artist.sqlite"


def para_xml(text: str, style: str | None = None) -> str:
    text = text or ""
    ppr = ""
    if style:
        ppr = f'<w:pPr><w:pStyle w:val="{style}"/></w:pPr>'
    runs = []
    for part in text.split("\n"):
        if runs:
            runs.append("<w:br/>")
        runs.append(f"<w:t>{html.escape(part)}</w:t>")
    return f"<w:p>{ppr}<w:r>{''.join(runs)}</w:r></w:p>"


def make_docx(path: Path, title: str, sections: list[tuple[str, list[str]]]) -> None:
    body = [para_xml(title, "Title")]
    for heading, paragraphs in sections:
        body.append(para_xml(heading, "Heading1"))
        for p in paragraphs:
            body.append(para_xml(p))
    document = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {''.join(body)}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>'''
    styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/></w:rPr><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:pPr><w:spacing w:after="260"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr></w:style>
</w:styles>'''
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>'''
    rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''
    doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/_rels/document.xml.rels", doc_rels)
        z.writestr("word/document.xml", document)
        z.writestr("word/styles.xml", styles)


residencies = [
    {
        "title": "Headlands Center for the Arts Artist in Residence 2027",
        "org": "Headlands Center for the Arts",
        "url": "https://www.headlands.org/program/air/",
        "location": "Sausalito, California, USA",
        "deadline": "2026-06-01",
        "score": 93,
        "fee": "申请费需在 SlideRoom 最终确认；第三方列表显示约 $45。无驻留费。",
        "funding": "官方称 fully sponsored：studio、chef-prepared meals、housing、travel and living expenses。",
        "eligibility": "本地、美国国内与国际艺术家；多媒介，包括绘画、雕塑、摄影、影像、新媒体、装置、跨学科、社会实践等。",
        "materials": "SlideRoom 表格；需确认最终字段，通常含 CV、作品样本、陈述/计划。",
        "submission": "网站表格：Headlands SlideRoom；需账户与可能付款。",
        "language": "英文。",
        "fit": "资金覆盖强，媒介开放，适合图像、装置、历史/记忆与跨学科实践。",
        "risk": "截止非常近；申请费与具体字段需进 SlideRoom 复核；竞争极高。",
    },
    {
        "title": "Headlands Chamberlain Award",
        "org": "Headlands Center for the Arts",
        "url": "https://www.headlands.org/program/chamberlain-award/",
        "location": "Sausalito, California, USA",
        "deadline": "2026-06-01",
        "score": 90,
        "fee": "申请费需在 SlideRoom 确认；第三方列表显示约 $25。无驻留费。",
        "funding": "全额资助驻留 + $10,000 prize，官方定位为支持 social practice。",
        "eligibility": "面向使用非传统媒介、回应社会议题的艺术家。",
        "materials": "SlideRoom 表格；需社会实践方向 proposal、CV、作品样本。",
        "submission": "网站表格：Headlands SlideRoom；需账户与可能付款。",
        "language": "英文。",
        "fit": "若把“档案、纪念性、宗教/图像政治、社群记忆”转成社会实践项目，匹配度高。",
        "risk": "必须强化社会实践，不宜只提交纯作品集；截止非常近。",
    },
    {
        "title": "Ras Al Khaimah Artist Residency Grants 2026",
        "org": "Ras Al Khaimah Art / Al Qasimi Foundation",
        "url": "https://www.rakart.ae/artist-residency-grants",
        "location": "Ras Al Khaimah, UAE",
        "deadline": "2026-06-01",
        "score": 88,
        "fee": "无申请费/无项目费。",
        "funding": "最高 61,000 AED，覆盖 airfare、住宿、生活津贴、签证费、材料、设备、专业服务、翻译等。",
        "eligibility": "国际艺术家；需作品集或艺术学历；近三年展览经历；英文能力；21岁以上；个人申请。",
        "materials": "在线表格、cover letter <=2页、CV<=2页、bio/photo/statement<=2页、近五年作品集PDF<=15图/低清、statement of intent、预算、两封推荐信。",
        "submission": "网站表格：Al Qasimi Fluxx 门户；需账户；可能需推荐信上传。",
        "language": "英文或阿拉伯文；建议英文正式材料，另备中文审核版。",
        "fit": "资金结构最符合偏好；可围绕海湾文化、图像记忆、公共工作坊和展览提出项目。",
        "risk": "仅 1 个名额；要求每月工作坊、播客、博客、捐赠一件驻留作品；推荐信时间紧。",
    },
    {
        "title": "Goethe-Institut File Not Found Artistic Research Residencies",
        "org": "Goethe-Institut / BLMK Cottbus",
        "url": "https://www.goethe.de/resources/files/pdf359/file-not-found-open-call-guidelines-v2.pdf",
        "location": "Germany / host archive, on-site",
        "deadline": "2026-06-07 12:00 GMT+1",
        "score": 87,
        "fee": "无申请费；无驻留费。",
        "funding": "€2,000 artist fee + €2,000 production budget；travel & accommodation covered up to €2,000。",
        "eligibility": "全球艺术家；视觉艺术、装置、影像、艺术研究、遗产研究等；需能与档案机构协作。",
        "materials": "需按指南进一步确认表单字段；核心为研究问题、项目描述、档案选择动机、作品/报告计划、作品样本。",
        "submission": "未知/混合：已核验 guidelines PDF；需确认官网最终入口。",
        "language": "Working language English；正式材料英文，中文单独审核。",
        "fit": "与用户关于隐秘表达、历史图像、档案、记忆和制度性叙事的实践高度贴合。",
        "risk": "交通住宿上限可能不足以覆盖全部国际行程；申请入口仍需复核。",
    },
    {
        "title": "Light Work Artist-in-Residence Program 2027",
        "org": "Light Work",
        "url": "https://www.lightwork.org/air/",
        "location": "Syracuse, New York, USA",
        "deadline": "2026-07-01",
        "score": 84,
        "fee": "未见官方申请费说明；需在 SlideRoom 入口确认。",
        "funding": "$7,500 stipend、furnished artist apartment、24-hour facilities、staff support、Contact Sheet publication。",
        "eligibility": "国际；面向 photography or image-based media。",
        "materials": "SlideRoom；摄影/图像媒介作品集、CV、artist statement 等需入口确认。",
        "submission": "网站表格：Light Work SlideRoom。",
        "language": "英文。",
        "fit": "若以图像研究、档案图像、摄影/数字图像装置切入，适配度较好。",
        "risk": "必须明确 image-based media；如果作品以绘画/装置为主，需要把文档摄影和图像研究转为主线。",
    },
]

exhibitions = [
    {
        "title": "Embracing Our Differences 2027 Call for Artists",
        "org": "Embracing Our Differences",
        "url": "https://www.embracingourdifferences.org/clientuploads/docs/2026/2027_call_for_art.pdf",
        "location": "Sarasota & St. Petersburg, Florida, USA",
        "deadline": "2026-07-01",
        "score": 88,
        "fee": "无 submission fee；无展位/参展费。",
        "funding": "$6,000 total awards；主办方制作户外 billboard 展示。",
        "eligibility": "国际；艺术家、摄影师、专业/业余/学生均可。",
        "materials": "横向原创图像，高分辨率不低于 300dpi；200词以内 artist statement；在线提交。",
        "submission": "网站表格：EmbracingOurDifferences.org。",
        "language": "英文官网/英文材料；建议正式英文，中文审核版分开。",
        "fit": "可从差异、共存、记忆与图像政治切入；无需实体运输，费用风险低。",
        "risk": "需要专门选择或改作横向图像；主题更偏公共教育，需避免过于晦涩。",
    },
    {
        "title": "Beyond Creation: Humanity, Nature and Spirituality",
        "org": "Embassy of Italy in Ghana and Togo",
        "url": "https://ambaccra.esteri.it/en/news/dall_ambasciata/2026/03/open-call-announcement-for-an-art-exhibition/",
        "location": "Accra, Ghana",
        "deadline": "2026-05-31",
        "score": 84,
        "fee": "官方页面未显示申请费；附件需复核运输/制作责任。",
        "funding": "官方页面未列奖金；需核验 guidelines 附件。",
        "eligibility": "国际展览；具体资格见附件。",
        "materials": "需按附件 guidelines 准备；上次已做初稿，可继续完善。",
        "submission": "未知/混合：需从附件确认邮件或表格。",
        "language": "英文页面；正式英文，中文审核版分开。",
        "fit": "人、自然、精神性主题与现有宗教图像/历史记忆方向有连接。",
        "risk": "截止近；非洲实体展可能有运输/保险/安装责任，需附件确认后再投。",
    },
    {
        "title": "Chianciano Biennale 2026",
        "org": "Biennale Chianciano",
        "url": "https://biennalechianciano.org/en/submit/",
        "location": "Chianciano Terme, Italy",
        "deadline": "2026-05-31 / mid-June selection",
        "score": 80,
        "fee": "€40 per artwork submission；官方称入选后 no participation fees。",
        "funding": "Prizes: €2,500 best work; €1,000 category awards; London Art Biennale selection opportunities。",
        "eligibility": "任何国家、任何职业阶段；绘画、摄影、数字、视频、雕塑、装置、纤维等。",
        "materials": "在线提交；艺术品图像与信息；费用支付；后续邮件发送图像/细节。",
        "submission": "网站表格 + 付款 + 后续邮件说明。",
        "language": "英文/意大利语；建议英文正式材料。",
        "fit": "国际曝光度尚可，媒介开放；适合提交已完成强图像作品。",
        "risk": "有申请费；入选后仍需承担运输、装裱/本地制作等实际成本；不作为首选免费机会。",
    },
    {
        "title": "NO DEAD ARTISTS International Juried Exhibition",
        "org": "Ferrara Showman Gallery",
        "url": "https://www.theartlist.com/index.php/ferrara-showman-gallery-30th-annual-no-dead-artists-international-juried-exhibition-of-contemporary-art",
        "location": "New Orleans, Louisiana, USA",
        "deadline": "2026-06-15",
        "score": 76,
        "fee": "TheArtList 显示有 submission fees；EntryThingy 外部列表显示 Free Entry，费用信息冲突，需 ArtCall 官方入口确认。",
        "funding": "Grand prize: solo exhibition at Ferrara Showman Gallery next year。",
        "eligibility": "International；多媒介。",
        "materials": "ArtCall/外部表格；作品图、简历、声明等需入口确认。",
        "submission": "网站表格：ArtCall/EntryThingy 外部跳转；可能需账户。",
        "language": "英文。",
        "fit": "适合国际当代艺术图像/装置作品；获奖价值较高。",
        "risk": "费用信息冲突；实体运输到 New Orleans 成本需确认。",
    },
    {
        "title": "CICA Museum: Message International Exhibition",
        "org": "CICA Museum",
        "url": "https://www.artconnect.com/opportunity/xQg7qGktbLDdB4a1nYcON",
        "location": "Gimpo, South Korea",
        "deadline": "2026-06-18/19",
        "score": 74,
        "fee": "ArtConnect 标注 Fees: Yes；额外打印/设备/运输费可能适用。",
        "funding": "未见奖金或艺术家费。",
        "eligibility": "Worldwide；摄影、数字、视频、互动、绘画、雕塑、装置等。",
        "materials": "官网邮件/表格；作品类别、图像、说明；实体作品需艺术家承担往返运输。",
        "submission": "网站/邮件：需从 CICA 官方页面确认最终格式。",
        "language": "英文。",
        "fit": "“Message”可接入语言、符号、记忆、媒介与社会沟通主题。",
        "risk": "有费用且无艺术家费；实体作品运输自付，建议只考虑数字/可打印作品。",
    },
]

packages = [
    ("residency-headlands-air-2027", residencies[0]),
    ("residency-headlands-chamberlain-2026", residencies[1]),
    ("residency-rak-artist-residency-grants-2026", residencies[2]),
    ("exhibition-embracing-our-differences-2027", exhibitions[0]),
    ("exhibition-chianciano-biennale-2026", exhibitions[2]),
]


def opp_block(o: dict) -> str:
    return f"""### {o['title']} — {o['score']}/100
- 原始 URL：{o['url']}
- 机构：{o['org']}
- 地点：{o['location']}
- 截止日期：{o['deadline']}
- 费用结构：报名/申请费：{o['fee']}；展位/参展/项目费：未见强制高额费用（风险见下）；住宿/工作室/制作/津贴：{o['funding']}；交通：按资助条款或需自付。
- 资格限制：{o['eligibility']}
- 材料要求：{o['materials']}
- Submission method：{o['submission']}
- 语言要求：{o['language']}
- 适合点：{o['fit']}
- 风险与物流难点：{o['risk']}
- 建议优先级：{"高" if o['score'] >= 84 else "中高"}
"""


def package_sections(o: dict, kind: str) -> tuple[list[tuple[str, list[str]]], list[tuple[str, list[str]]]]:
    zh = [
        ("机会核验", [
            f"原始 URL：{o['url']}",
            f"机构/地点：{o['org']} / {o['location']}",
            f"截止日期：{o['deadline']}",
            f"费用与资助：{o['fee']}；{o['funding']}",
            f"Submission method：{o['submission']}",
            f"语言判断：{o['language']}",
        ]),
        ("中文审核版申请方向", [
            "建议把卢泛舟的实践表述为对图像、历史叙事、宗教/政治符号、被遮蔽记忆和观看机制的持续研究。材料应避免泛泛的“跨文化交流”，而是围绕该机会的具体语境建立项目问题。",
            f"针对本机会的核心适配点：{o['fit']}",
            f"主要风险：{o['risk']}",
        ]),
        ("待用户确认", [
            "确认邮箱、电话、地址、网站/Instagram 等个人信息。",
            "确认近期可用作品及实体作品是否仍在手中；涉及运输或实体展时必须先确认。",
            "如需推荐信或付款，请用户明确同意后再继续。",
        ]),
    ]
    en = [
        ("Draft Direction", [
            "Fanzhou Lu's practice can be framed as an inquiry into images as unstable archives: how historical, religious, and political signs are preserved, damaged, repeated, or made invisible through systems of display and interpretation.",
            "The proposed application should connect existing bodies of work on iconoclasm, hidden expressions, memory, and mediated visibility to the specific institutional context of this opportunity.",
        ]),
        ("Opportunity-Specific Notes", [
            f"Deadline: {o['deadline']}",
            f"Submission method: {o['submission']}",
            f"Language: {o['language']}",
            f"Required materials to prepare: {o['materials']}",
            f"Cost/funding notes: {o['fee']} {o['funding']}",
        ]),
        ("Checklist Before Submission", [
            "Confirm personal contact details and website links.",
            "Select works and images specifically for this call; do not reuse a generic portfolio without adjustment.",
            "Check account, payment, captcha, and legal declaration requirements. No final submission should be made without explicit approval.",
        ]),
    ]
    return zh, en


def main() -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    APP_DIR.mkdir(parents=True, exist_ok=True)
    md = [
        f"# 每周艺术家申请机会报告 — {RUN_DATE}",
        "",
        "本次搜索覆盖：英文/中文关键词、机构官网、Open Call 平台、On the Move、ArtConnect、TheArtList、EntryThingy、CuratorSpace、官方 PDF 和既有数据库机会。已淘汰或降级原因包括：截止已过、限当地居民/香港身份证/Greater Boston/West Africa/Baltic 等地域资格、驻留费或项目费过高、pay-to-show 虚拟展、实体作品必须当地送取、费用结构不清。",
        "",
        "## 驻留推荐 Top 5",
        "",
        *[opp_block(o) for o in residencies],
        "## 展览 / Open Call 推荐 Top 5",
        "",
        *[opp_block(o) for o in exhibitions],
        "## 候补与淘汰摘要",
        "",
        "- Loghaven：资源强，但官方明确 international artists not eligible，且需具备在美国工作并接收收入的资格，因此不推荐给中国/中国为基地艺术家优先申请。",
        "- Chapel Arts Studios：申请费合理，但实体作品必须指定日期送取，且无 artist payment；国际物流不现实，降级。",
        "- DRIFT / BAU Gallery：要求作品由艺术家或代理本地送取，不接受 shipping；国际申请物流风险高，降级。",
        "- GalleryOne962：虚拟展需 €60/€80，接近 pay-to-show，不列为优先。",
        "- Plexus Projects / CRETA Rome / Arteles：驻留费或住宿/生活支持不符合偏好，淘汰或降级。",
        "- Pao Arts Center / vA! Hong Kong：地域身份或驻地限制，不适合当前资料库里的中国/中国为基地身份。",
        "",
        "## 已生成申请包草稿",
        "",
    ]
    for slug, o in packages:
        p = APP_DIR / slug
        p.mkdir(parents=True, exist_ok=True)
        zh_sections, en_sections = package_sections(o, "residency" if slug.startswith("residency") else "exhibition")
        make_docx(p / "review-zh.docx", f"{o['title']} — 中文审核版", zh_sections)
        make_docx(p / "submission-en.docx", f"{o['title']} — English Draft Notes", en_sections)
        checklist = "\n".join([
            f"# {o['title']} Checklist",
            f"- URL: {o['url']}",
            f"- Deadline: {o['deadline']}",
            f"- Submission method: {o['submission']}",
            "- Status: draft only; not submitted.",
            "- Needs user review and explicit approval before any external action.",
        ])
        (p / "checklist.md").write_text(checklist, encoding="utf-8")
        md.append(f"- {slug}: review-zh.docx / submission-en.docx / checklist.md")
    report_md = REPORT_DIR / f"weekly-opportunities-{RUN_DATE}.md"
    report_md.write_text("\n".join(md), encoding="utf-8")
    make_docx(
        REPORT_DIR / f"weekly-opportunities-{RUN_DATE}-review-zh.docx",
        f"每周艺术家申请机会报告 — {RUN_DATE}",
        [
            ("驻留推荐 Top 5", [f"{o['score']}/100 | {o['title']} | 截止 {o['deadline']} | {o['fee']} | {o['funding']} | {o['risk']}" for o in residencies]),
            ("展览 / Open Call 推荐 Top 5", [f"{o['score']}/100 | {o['title']} | 截止 {o['deadline']} | {o['fee']} | {o['funding']} | {o['risk']}" for o in exhibitions]),
            ("下一步", ["请优先审核 Headlands AIR/Chamberlain 与 RAK，因为截止均为 2026-06-01。所有文件均为草稿，未投递、未付款、未创建外部账户。"]),
        ],
    )

    conn = sqlite3.connect(DB, timeout=10)
    try:
        for o in residencies + exhibitions:
            raw = "\n".join(f"{k}: {v}" for k, v in o.items())
            conn.execute(
                """
                insert into opportunities(title, organization, url, location, deadline, fee, funding, eligibility, materials, submission_method, summary, score, risks, status, source, raw_content, updated_at)
                values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, ?, CURRENT_TIMESTAMP)
                on conflict(url) do update set
                  title=excluded.title, organization=excluded.organization, location=excluded.location, deadline=excluded.deadline,
                  fee=excluded.fee, funding=excluded.funding, eligibility=excluded.eligibility, materials=excluded.materials,
                  submission_method=excluded.submission_method, summary=excluded.summary, score=excluded.score, risks=excluded.risks,
                  source=excluded.source, raw_content=excluded.raw_content, updated_at=CURRENT_TIMESTAMP
                """,
                (o["title"], o["org"], o["url"], o["location"], o["deadline"], o["fee"], o["funding"], o["eligibility"], o["materials"], o["submission"], o["fit"], o["score"], o["risk"], "new", "Codex weekly web verification 2026-05-25", raw),
            )
        for slug, o in packages:
            opp_id = conn.execute("select id from opportunities where url=?", (o["url"],)).fetchone()[0]
            conn.execute(
                "insert into applications(opportunity_id, draft_zh, draft_en, checklist, selected_works, package_path, submission_log, updated_at) values(?,?,?,?,?,?,?,CURRENT_TIMESTAMP)",
                (opp_id, "中文审核版见 review-zh.docx。", "English draft notes in submission-en.docx.", "checklist.md generated; user approval required.", "Works to be selected after user confirms availability and fit.", str(APP_DIR / slug), "Not submitted."),
            )
            conn.execute("update opportunities set status='quality_blocked', updated_at=CURRENT_TIMESTAMP where id=?", (opp_id,))
        conn.commit()
    finally:
        conn.close()


if __name__ == "__main__":
    main()
