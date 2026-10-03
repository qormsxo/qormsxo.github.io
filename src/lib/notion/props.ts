import type { PageObjectResponse } from "@notionhq/client";
import type { RichText, RichTextSpan } from "./types";

type Prop = PageObjectResponse["properties"][string];
type PropOf<T extends Prop["type"]> = Extract<Prop, { type: T }>;

/** 속성 이름과 타입을 inspect 결과와 대조한다. 어긋나면 조용히 숨기지 않고 빌드를 실패시킨다. */
function get<T extends Prop["type"]>(page: PageObjectResponse, name: string, type: T): PropOf<T> {
  const prop = page.properties[name];
  if (!prop) {
    throw new Error(`Notion 속성 "${name}" 을(를) 찾을 수 없습니다. (scripts/inspect-notion.ts 로 확인)`);
  }
  if (prop.type !== type) {
    throw new Error(`Notion 속성 "${name}" 의 타입이 ${type} 이(가) 아니라 ${prop.type} 입니다.`);
  }
  return prop as PropOf<T>;
}

type RawRichTextItem = PropOf<"rich_text">["rich_text"][number];

function toSpans(items: RawRichTextItem[]): RichText {
  return items.map((item): RichTextSpan => {
    const a = item.annotations;
    const span: RichTextSpan = { text: item.plain_text };
    if (item.href) span.href = item.href;
    if (a.bold) span.bold = true;
    if (a.italic) span.italic = true;
    if (a.strikethrough) span.strikethrough = true;
    if (a.underline) span.underline = true;
    if (a.code) span.code = true;
    return span;
  });
}

/** 공백뿐이면 "값 없음" 으로 본다 (표시 여부 판단용. 값 자체는 가공하지 않는다). */
function nonEmpty(rt: RichText): RichText | undefined {
  return rt.some((s) => s.text.trim() !== "") ? rt : undefined;
}

export function richText(page: PageObjectResponse, name: string): RichText | undefined {
  return nonEmpty(toSpans(get(page, name, "rich_text").rich_text));
}

/** title 속성의 plain text. 비어 있으면 undefined. */
export function titleText(page: PageObjectResponse, name: string): string | undefined {
  const text = get(page, name, "title").title.map((t) => t.plain_text).join("");
  return text.trim() === "" ? undefined : text;
}

export function requiredTitle(page: PageObjectResponse, name: string, dbLabel: string): string {
  const t = titleText(page, name);
  if (t === undefined) {
    throw new Error(`${dbLabel} DB 의 행 ${page.id} 에 ${name}(title) 값이 없습니다.`);
  }
  return t;
}

export function urlValue(page: PageObjectResponse, name: string): string | undefined {
  const v = get(page, name, "url").url;
  return v && v.trim() !== "" ? v : undefined;
}

export function emailValue(page: PageObjectResponse, name: string): string | undefined {
  const v = get(page, name, "email").email;
  return v && v.trim() !== "" ? v : undefined;
}

export function phoneValue(page: PageObjectResponse, name: string): string | undefined {
  const v = get(page, name, "phone_number").phone_number;
  return v && v.trim() !== "" ? v : undefined;
}

export function multiSelectValues(page: PageObjectResponse, name: string): string[] {
  return get(page, name, "multi_select").multi_select.map((o) => o.name);
}

export function selectValue(page: PageObjectResponse, name: string): string | undefined {
  return get(page, name, "select").select?.name;
}

export function numberValue(page: PageObjectResponse, name: string): number | undefined {
  return get(page, name, "number").number ?? undefined;
}
