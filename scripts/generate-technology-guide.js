#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const markdownPath = path.join(root, "docs", "PRINTCHAIN_TECHNOLOGY_GUIDE_HE.md");
const htmlPath = path.join(root, "docs", "PRINTCHAIN_TECHNOLOGY_GUIDE_HE.html");
const pdfPath = path.join(root, "docs", "PRINTCHAIN_TECHNOLOGY_GUIDE_HE.pdf");

if (!fs.existsSync(markdownPath)) {
  console.error(`Missing guide source: ${markdownPath}`);
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
      closeList();
      closeTable();
      body.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      body.push(escapeHtml(line));
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line.slice(1, -1).split("|").map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
      closeList();
      if (!inTable) {
        body.push("<table>");
        inTable = true;
        tableHeaderDone = false;
      }
      const tag = tableHeaderDone ? "td" : "th";
      body.push(`<tr>${cells.map((cell) => `<${tag}>${inline(cell)}</${tag}>`).join("")}</tr>`);
      tableHeaderDone = true;
      continue;
    }
    closeTable();

    if (!line.trim()) {
      closeList();
      body.push("");
      continue;
    }

    if (line.startsWith("# ")) {
      closeList();
      body.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      closeList();
      body.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      closeList();
      body.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("- ")) {
      if (!inList) {
        body.push("<ul>");
        inList = true;
      }
      body.push(`<li>${inline(line.slice(2))}</li>`);
    } else if (/^\d+\.\s/.test(line)) {
      closeList();
      body.push(`<p class="step">${inline(line)}</p>`);
    } else if (line.startsWith("> ")) {
      closeList();
      body.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    } else {
      closeList();
      body.push(`<p>${inline(line)}</p>`);
    }
  }

  closeList();
  closeTable();
  return body.join("\n");
}

const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>מדריך טכנולוגיות ומושגים בפרויקט PrintChain</title>
  <style>
    @page { size: A4; margin: 17mm 14mm; }
    body { direction: rtl; font-family: "DejaVu Sans", "Arial", sans-serif; line-height: 1.6; color: #1f2937; background: #fff; }
    h1, h2, h3 { color: #111827; page-break-after: avoid; }
    h1 { text-align: center; font-size: 27px; border-bottom: 3px solid #7c3aed; padding-bottom: 10px; }
    h2 { margin-top: 30px; font-size: 21px; border-bottom: 1px solid #d1d5db; padding-bottom: 5px; }
    h3 { font-size: 17px; margin-top: 20px; color: #374151; }
    p, li { font-size: 13.5px; }
    .step { margin: 4px 0; }
    code, pre { direction: ltr; unicode-bidi: embed; font-family: "DejaVu Sans Mono", monospace; background: #f3f4f6; border-radius: 4px; }
    code { padding: 1px 4px; }
    pre { padding: 10px; overflow-wrap: break-word; white-space: pre-wrap; border: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11.2px; page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    th, td { border: 1px solid #d1d5db; padding: 6px; vertical-align: top; }
    th { background: #ede9fe; color: #111827; }
    blockquote { border-right: 4px solid #7c3aed; margin: 12px 0; padding: 8px 14px; background: #f5f3ff; }
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
  console.warn("No local HTML-to-PDF engine found. Open docs/PRINTCHAIN_TECHNOLOGY_GUIDE_HE.html in Chrome and choose Print → Save as PDF, or install chromium/wkhtmltopdf and rerun npm run guide:technology.");
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
