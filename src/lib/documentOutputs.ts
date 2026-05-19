import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { resolvePythonPath } from "./runtime";

type DocumentInput = {
  title: string;
  subtitle: string;
  sections: { heading: string; body: string }[];
};

export function writeGeneratedDocuments(folder: string, input: DocumentInput) {
  const pythonPath = resolvePythonPath();
  if (!pythonPath) return;
  const payloadPath = path.join(folder, "document-payload.json");
  fs.writeFileSync(payloadPath, JSON.stringify(input, null, 2), "utf8");
  try {
    execFileSync(pythonPath, ["-c", documentWriterCode(), payloadPath, folder], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    });
  } catch {
    // Markdown files are still written by the caller; PDF/DOCX export is best-effort in the local app.
  }
}

function documentWriterCode() {
  return String.raw`
import json
import os
import sys
from docx import Document
from docx.shared import Pt, Inches
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from xml.sax.saxutils import escape

payload_path, out_dir = sys.argv[1], sys.argv[2]
with open(payload_path, "r", encoding="utf-8") as f:
    data = json.load(f)

doc = Document()
section = doc.sections[0]
section.top_margin = Inches(0.75)
section.bottom_margin = Inches(0.75)
section.left_margin = Inches(0.8)
section.right_margin = Inches(0.8)
styles = doc.styles
styles["Normal"].font.name = "Arial"
styles["Normal"].font.size = Pt(10.5)
doc.add_heading(data.get("title", "Application Package"), 0)
subtitle = data.get("subtitle", "")
if subtitle:
    doc.add_paragraph(subtitle)
for section_data in data.get("sections", []):
    doc.add_heading(section_data.get("heading", ""), level=1)
    for para in str(section_data.get("body", "")).split("\\n"):
        if para.strip():
            doc.add_paragraph(para.strip())
doc.save(os.path.join(out_dir, "application-package.docx"))

pdf_path = os.path.join(out_dir, "application-package.pdf")
pdf = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=0.8*inch, leftMargin=0.8*inch, topMargin=0.75*inch, bottomMargin=0.75*inch)
base = getSampleStyleSheet()
body = ParagraphStyle("Body", parent=base["BodyText"], fontName="Helvetica", fontSize=9.5, leading=13)
heading = ParagraphStyle("Heading", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, spaceBefore=10)
story = [Paragraph(escape(data.get("title", "Application Package")), base["Title"])]
if subtitle:
    story += [Paragraph(escape(subtitle), body), Spacer(1, 10)]
for section_data in data.get("sections", []):
    story.append(Paragraph(escape(section_data.get("heading", "")), heading))
    for para in str(section_data.get("body", "")).split("\\n"):
        if para.strip():
            story.append(Paragraph(escape(para.strip()), body))
            story.append(Spacer(1, 5))
pdf.build(story)
`;
}
