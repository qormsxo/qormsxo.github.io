import type { RichText, RichTextSpan } from "./types";

/**
 * rich text → 렌더링용 블록 구조. (웹 React 와 PDF HTML 문자열이 공유)
 * 텍스트 내용은 바꾸지 않는다. 구조만 나눈다:
 *  - "\n" 마다 새 줄 → 문단(p)
 *  - 줄이 "•" 로 시작하면 글머리 항목(ul > li). 마커는 CSS 글머리로 대체하고 나머지 문자는 그대로 둔다.
 *  - 빈 줄은 다음 블록 앞의 간격(gap)으로만 반영한다.
 *  - 줄 앞뒤 공백(Notion 에 들어 있는 들여쓰기)은 표시하지 않는다. 서식(bold 등)은 span 단위로 유지.
 */
export type RichBlock =
  | { type: "p"; spans: RichTextSpan[]; gap: boolean }
  | { type: "ul"; items: RichTextSpan[][]; gap: boolean };

const BULLET = /^•\s*/;

function splitLines(spans: RichText): RichTextSpan[][] {
  const lines: RichTextSpan[][] = [[]];
  for (const span of spans) {
    const parts = span.text.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part !== "") lines[lines.length - 1].push({ ...span, text: part });
    });
  }
  return lines;
}

function trimLine(line: RichTextSpan[]): RichTextSpan[] {
  const out = line.map((s) => ({ ...s }));
  while (out.length > 0 && out[0].text.trim() === "") out.shift();
  while (out.length > 0 && out[out.length - 1].text.trim() === "") out.pop();
  if (out.length > 0) {
    out[0].text = out[0].text.trimStart();
    out[out.length - 1].text = out[out.length - 1].text.trimEnd();
  }
  return out;
}

export function toBlocks(rt: RichText): RichBlock[] {
  const blocks: RichBlock[] = [];
  let gap = false;
  for (const raw of splitLines(rt)) {
    const line = trimLine(raw);
    if (line.length === 0) {
      gap = true;
      continue;
    }
    const isBullet = BULLET.test(line[0].text);
    if (isBullet) {
      line[0].text = line[0].text.replace(BULLET, "");
      if (line[0].text === "") line.shift();
      const last = blocks[blocks.length - 1];
      if (last?.type === "ul" && !gap) last.items.push(line);
      else blocks.push({ type: "ul", items: [line], gap });
    } else {
      blocks.push({ type: "p", spans: line, gap });
    }
    gap = false;
  }
  return blocks;
}

/** 한 줄짜리 값(기간, 직책 등)용 plain text. */
export function plainText(rt: RichText | undefined): string {
  return rt ? rt.map((s) => s.text).join("").trim() : "";
}
