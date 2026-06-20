#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const markdownPath = path.join(root, "docs", "PRINTCHAIN_REQUIREMENTS_REPORT_HE.md");
const htmlPath = path.join(root, "docs", "PRINTCHAIN_REQUIREMENTS_REPORT_HE.html");
const pdfPath = path.join(root, "docs", "PRINTCHAIN_REQUIREMENTS_REPORT_HE.pdf");

if (!fs.existsSync(markdownPath)) {
  console.error(`Missing report source: ${markdownPath}`);
  process.exit(1);
}

const escapeHtml = (value) => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const body = [];
  let inList = false;
  let inCode = false;
  let inTable = false;
  let tableHeaderDone = false;

  const closeList = () => { if (inList) { body.push("</ul>"); inList = false; } };
  const closeTable = () => { if (inTable) { body.push("</table>"); inTable = false; tableHeaderDone = false; } };

  for (const line of lines) {
    if (line.startsWith("```")) {
      closeList(); closeTable();
      body.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }
    if (inCode) { body.push(escapeHtml(line)); continue; }

    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      closeList();
      if (!inTable) { body.push("<table>"); inTable = true; tableHeaderDone = false; }
      const tag = tableHeaderDone ? "td" : "th";
      body.push(`<tr>${cells.map((cell) => `<${tag}>${inline(cell)}</${tag}>`).join("")}</tr>`);
      tableHeaderDone = true;
      continue;
    }
    closeTable();

    if (!line.trim()) { closeList(); body.push(""); continue; }
    if (line.startsWith("# ")) { closeList(); body.push(`<h1>${inline(line.slice(2))}</h1>`); }
    else if (line.startsWith("## ")) { closeList(); body.push(`<h2>${inline(line.slice(3))}</h2>`); }
    else if (line.startsWith("### ")) { closeList(); body.push(`<h3>${inline(line.slice(4))}</h3>`); }
    else if (line.startsWith("- ")) {
      if (!inList) { body.push("<ul>"); inList = true; }
      body.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (line.startsWith("> ")) {
      closeList(); body.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    } else {
      closeList(); body.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList(); closeTable();
  return body.join("\n");
}

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>דוח התאמת פרויקט PrintChain לדרישות קורס DApp</title>
  <style>
    @page { size: A4; margin: 18mm 14mm; }
    body { direction: rtl; font-family: "DejaVu Sans", "Arial", sans-serif; line-height: 1.55; color: #1f2937; background: #fff; }
    h1, h2, h3 { color: #111827; page-break-after: avoid; }
    h1 { text-align: center; font-size: 26px; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { margin-top: 28px; font-size: 21px; border-bottom: 1px solid #d1d5db; padding-bottom: 4px; }
    h3 { font-size: 17px; margin-top: 20px; }
    p, li { font-size: 13.5px; }
    code, pre { direction: ltr; unicode-bidi: embed; font-family: "DejaVu Sans Mono", monospace; background: #f3f4f6; border-radius: 4px; }
    code { padding: 1px 4px; }
    pre { padding: 10px; overflow-wrap: break-word; white-space: pre-wrap; border: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11px; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td { border: 1px solid #d1d5db; padding: 6px; vertical-align: top; }
    th { background: #e0ecff; color: #111827; }
    blockquote { border-right: 4px solid #2563eb; margin: 12px 0; padding: 8px 14px; background: #eff6ff; }
  </style>
</head>
<body>
${markdownToHtml(fs.readFileSync(markdownPath, "utf8"))}
</body>
</html>
`;
fs.writeFileSync(htmlPath, html);
console.log(`Wrote ${path.relative(root, htmlPath)}`);

const candidates = ["chromium", "google-chrome", "chrome", "wkhtmltopdf"];
const available = candidates.find((cmd) => spawnSync("sh", ["-lc", `command -v ${cmd}`], { encoding: "utf8" }).status === 0);
if (!available) {
  console.warn("No local HTML-to-PDF engine found. Open the HTML report in a browser and choose Print → Save as PDF.");
  process.exit(0);
}

let result;
if (available === "wkhtmltopdf") {
  result = spawnSync(available, [htmlPath, pdfPath], { stdio: "inherit" });
} else {
  result = spawnSync(available, ["--headless", "--disable-gpu", `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`], { stdio: "inherit" });
}
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Wrote ${path.relative(root, pdfPath)}`);
