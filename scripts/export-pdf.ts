/**
 * 로컬 전용 PDF 생성: npm run export:pdf
 *  - 공개 사이트와 같은 fetch 레이어(src/lib/notion/load.ts)를 재사용하되, 전화번호를 포함하는 private 경로를 쓴다.
 *  - A4 컴팩트 레이아웃 HTML 을 문자열로 조립 → resume.html 저장 → Puppeteer 로 resume.pdf 저장.
 *  - 프로필 사진(assets/profile.jpg)은 base64 로 HTML 에 내장한다. (없으면 사진 없이 생성)
 */
import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { fetchPrivateResume } from "../src/lib/notion/fetch-private";
import { plainText, toBlocks } from "../src/lib/notion/rich-text";
import type { PrivateProfile, ProjectItem, ResumeData, RichText, RichTextSpan } from "../src/lib/notion/types";

loadEnvConfig(process.cwd());

const ROOT = process.cwd();
const PHOTO_PATH = path.join(ROOT, "assets", "profile.jpg");
const HTML_PATH = path.join(ROOT, "resume.html");
const PDF_PATH = path.join(ROOT, "resume.pdf");

// ---------- HTML 헬퍼 ----------
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function spanHtml(s: RichTextSpan): string {
  let h = esc(s.text);
  if (s.code) h = `<code>${h}</code>`;
  if (s.bold) h = `<strong>${h}</strong>`;
  if (s.italic) h = `<em>${h}</em>`;
  if (s.strikethrough) h = `<s>${h}</s>`;
  if (s.underline) h = `<u>${h}</u>`;
  if (s.href) h = `<a href="${esc(s.href)}">${h}</a>`;
  return h;
}
const spansHtml = (spans: RichTextSpan[]) => spans.map(spanHtml).join("");

/** 줄바꿈/굵게 등 서식을 유지한 문단/글머리 HTML */
function rt(value: RichText | undefined, cls = ""): string {
  if (!value) return "";
  const blocks = toBlocks(value);
  if (blocks.length === 0) return "";
  const inner = blocks
    .map((b) =>
      b.type === "p"
        ? `<p${b.gap ? ' class="gap"' : ""}>${spansHtml(b.spans)}</p>`
        : `<ul${b.gap ? ' class="gap"' : ""}>${b.items.map((i) => `<li>${spansHtml(i)}</li>`).join("")}</ul>`,
    )
    .join("");
  return `<div class="rt ${cls}">${inner}</div>`;
}

const chips = (items: string[]) =>
  items.length ? `<ul class="chips">${items.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : "";

const displayUrl = (u: string) => u.replace(/^https?:\/\//, "").replace(/\/$/, "");

function section(title: string, body: string): string {
  return body.trim() ? `<section><h2>${esc(title)}</h2>${body}</section>` : "";
}

function projectHtml(p: ProjectItem): string {
  const links = p.links.map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`).join(" · ");
  return `<article class="card avoid">
    <div class="row"><h3>${esc(p.title)}</h3>${p.period ? `<span class="muted">${esc(plainText(p.period))}</span>` : ""}</div>
    ${p.remark ? rt(p.remark, "accent small") : ""}
    ${rt(p.description)}${rt(p.details)}
    ${chips(p.skills)}
    ${links ? `<div class="links">${links}</div>` : ""}
  </article>`;
}

// ---------- 본문 조립 ----------
function header(profile: PrivateProfile, photoDataUri: string | undefined): string {
  const contacts: string[] = [];
  if (profile.email) contacts.push(`<span><b>Email</b> <a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></span>`);
  if (profile.phone) contacts.push(`<span><b>Phone</b> ${esc(profile.phone)}</span>`);
  if (profile.url) contacts.push(`<span><b>GitHub</b> <a href="${esc(profile.url)}">${esc(displayUrl(profile.url))}</a></span>`);
  const web = plainText(profile.website);
  if (web) {
    const href = profile.website?.find((s) => s.href)?.href ?? web;
    contacts.push(`<span><b>Blog</b> <a href="${esc(href)}">${esc(displayUrl(web))}</a></span>`);
  }
  return `<header>
    ${photoDataUri ? `<img class="photo" src="${photoDataUri}" alt="">` : ""}
    <div class="head-text">
      <h1>${esc(profile.name)}</h1>
      ${profile.position ? rt(profile.position, "position") : ""}
      <div class="contacts">${contacts.join("")}</div>
    </div>
  </header>
  ${profile.intro ? `<div class="intro">${rt(profile.intro)}</div>` : ""}`;
}

function body(r: ResumeData<PrivateProfile>): string {
  const t = r.sectionTitles;
  const parts: string[] = [];

  parts.push(
    section(
      t.skills,
      r.skillGroups
        .map(
          (g) =>
            `<div class="skill-group avoid">${g.label ? `<div class="label">${esc(g.label)}</div>` : ""}${chips(g.skills)}</div>`,
        )
        .join(""),
    ),
  );

  parts.push(
    section(
      t.core,
      r.core
        .map((c) => `<article class="card avoid"><h3>${esc(c.title)}</h3>${rt(c.details)}</article>`)
        .join(""),
    ),
  );

  parts.push(
    section(
      t.career,
      r.careers
        .map(
          (c) => `<article class="card">
          <div class="row"><h3>${esc(c.company)}</h3>${c.period ? `<span class="muted">${esc(plainText(c.period))}</span>` : ""}</div>
          ${c.position ? rt(c.position, "accent small") : ""}
          ${c.projects ? `<h4>주요 프로젝트 연혁</h4>${rt(c.projects, "compact")}` : ""}
          ${c.achievements ? `<h4>핵심 성과 및 역량</h4>${rt(c.achievements, "compact")}` : ""}
        </article>`,
        )
        .join(""),
    ),
  );

  parts.push(section(t.portfolio, r.portfolio.map(projectHtml).join("")));

  parts.push(
    section(
      t.problems,
      r.problems
        .map(
          (p) => `<article class="card case avoid">
          <h3>${esc(p.title)}</h3>
          ${p.problem ? `<h4>문제</h4>${rt(p.problem, "prose")}` : ""}
          ${p.solution ? `<h4>해결 및 성과</h4>${rt(p.solution, "prose")}` : ""}
        </article>`,
        )
        .join(""),
    ),
  );

  parts.push(section(t.awards, r.awards.map(projectHtml).join("")));

  parts.push(
    section(
      t.education,
      r.education
        .map(
          (e) => `<div class="simple avoid"><div class="row"><b>${esc(e.school)}</b>${e.period ? `<span class="muted">${esc(plainText(e.period))}</span>` : ""}</div>${e.degree ? rt(e.degree, "small") : ""}</div>`,
        )
        .join(""),
    ),
  );

  parts.push(
    section(
      t.certificates,
      r.certificates
        .map(
          (c) => `<div class="simple avoid"><div class="row"><b>${esc(c.name)}</b>${c.date ? `<span class="muted">${esc(plainText(c.date))}</span>` : ""}</div>${c.issuer ? rt(c.issuer, "small") : ""}</div>`,
        )
        .join(""),
    ),
  );

  parts.push(
    section(
      t.military,
      r.military
        .map(
          (m) => `<div class="simple avoid"><div class="row"><b>${esc(m.title)}</b>${m.period ? `<span class="muted">${esc(plainText(m.period))}</span>` : ""}</div></div>`,
        )
        .join(""),
    ),
  );

  return parts.join("");
}

const CSS = `
@page { size: A4; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  margin: 0; color: #1e293b; background: #fff;
  font-family: "Pretendard Variable", Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif;
  font-size: 9pt; line-height: 1.5; word-break: keep-all; overflow-wrap: anywhere;
}
@media screen { body { max-width: 210mm; margin: 0 auto; padding: 12mm; box-shadow: 0 0 0 1px #e2e8f0; } }
a { color: #4338ca; text-decoration: none; }
h1 { margin: 0; font-size: 22pt; line-height: 1.2; letter-spacing: -0.02em; }
h2 { margin: 0 0 2.5mm; padding-left: 2.5mm; border-left: 1.2mm solid #4338ca; font-size: 11pt; line-height: 1.2; break-after: avoid; }
h3 { margin: 0; font-size: 9.8pt; line-height: 1.35; }
h4 { margin: 2mm 0 0.8mm; font-size: 7.5pt; color: #64748b; letter-spacing: 0.04em; break-after: avoid; }
header { display: flex; gap: 6mm; align-items: center; padding-bottom: 4mm; }
.photo { width: 28mm; height: 36mm; object-fit: cover; border-radius: 2mm; flex: none; }
.head-text { flex: 1; min-width: 0; }
.position { color: #4338ca; font-size: 11pt; font-weight: 600; margin-top: 1mm; }
.contacts { display: flex; flex-wrap: wrap; gap: 1mm 5mm; margin-top: 2.5mm; font-size: 8.5pt; }
.contacts b { color: #64748b; font-weight: 600; margin-right: 1mm; }
.intro { margin-bottom: 5mm; padding: 3mm 4mm; background: #f8fafc; border-radius: 2mm; font-size: 9pt; line-height: 1.65; }
.cols { column-count: 2; column-gap: 8mm; }
section { margin: 0 0 5mm; }
.avoid { break-inside: avoid; page-break-inside: avoid; }
.card { margin-bottom: 3mm; padding-bottom: 3mm; border-bottom: 0.3mm solid #e2e8f0; }
.card:last-child { border-bottom: 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 3mm; }
.muted { color: #64748b; font-size: 8pt; white-space: nowrap; }
.accent { color: #4338ca; } .small { font-size: 8.5pt; }
.rt > * + * { margin-top: 1mm; } .rt > .gap { margin-top: 2.5mm; }
.rt p, .rt ul { margin: 0; } .rt ul { list-style: none; padding: 0; }
.rt li { position: relative; padding-left: 3mm; break-inside: avoid; }
.rt li + li { margin-top: 0.8mm; }
.rt li::before { content: ""; position: absolute; left: 0.6mm; top: 0.62em; width: 1mm; height: 1mm; border-radius: 50%; background: #4338ca; opacity: .75; }
.rt code { background: #f1f5f9; padding: 0 1mm; border-radius: 1mm; font-size: .92em; }
.rt.prose > p + p { margin-top: 1.6mm; }
.rt.compact li { font-size: 8.6pt; line-height: 1.45; }
.case .rt { margin-top: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 1mm; list-style: none; margin: 1.5mm 0 0; padding: 0; }
.chips li { background: #eef2ff; color: #4338ca; border-radius: 1mm; padding: 0.6mm 1.8mm; font-size: 7.5pt; font-weight: 600; line-height: 1.3; }
.skill-group { margin-bottom: 1.5mm; } .skill-group .label { font-size: 8pt; color: #64748b; font-weight: 600; margin-top: 1mm; }
.skill-group .chips { margin-top: 0; }
.links { margin-top: 1.5mm; font-size: 8pt; }
.simple { margin-bottom: 2mm; }
`;

function buildHtml(r: ResumeData<PrivateProfile>, photoDataUri: string | undefined): string {
  const title = plainText(r.profile.position) ? `${r.profile.name} | ${plainText(r.profile.position)}` : r.profile.name;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>${CSS}</style>
</head>
<body>
${header(r.profile, photoDataUri)}
<main class="cols">${body(r)}</main>
</body>
</html>`;
}

async function main() {
  console.log("Notion 데이터 가져오는 중...");
  const resume = await fetchPrivateResume();

  let photoDataUri: string | undefined;
  if (existsSync(PHOTO_PATH)) {
    photoDataUri = `data:image/jpeg;base64,${readFileSync(PHOTO_PATH).toString("base64")}`;
  } else {
    console.warn("⚠ assets/profile.jpg 가 없어 사진 없이 생성합니다.");
  }

  const html = buildHtml(resume, photoDataUri);
  writeFileSync(HTML_PATH, html, "utf8");
  console.log(`저장: ${path.relative(ROOT, HTML_PATH)}`);

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // 웹폰트(Pretendard) 로드 완료까지 대기 후 PDF 출력
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.pdf({
      path: PDF_PATH,
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });
  } finally {
    await browser.close();
  }
  console.log(`저장: ${path.relative(ROOT, PDF_PATH)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
