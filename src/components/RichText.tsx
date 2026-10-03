import { Fragment } from "react";
import { toBlocks } from "@/lib/notion/rich-text";
import type { RichText as RichTextValue, RichTextSpan } from "@/lib/notion/types";

function Span({ span }: { span: RichTextSpan }) {
  let node: React.ReactNode = span.text;
  if (span.code) node = <code>{node}</code>;
  if (span.bold) node = <strong className="font-semibold">{node}</strong>;
  if (span.italic) node = <em>{node}</em>;
  if (span.strikethrough) node = <s>{node}</s>;
  if (span.underline) node = <u>{node}</u>;
  if (span.href) {
    node = (
      <a href={span.href} target="_blank" rel="noopener noreferrer">
        {node}
      </a>
    );
  }
  return <>{node}</>;
}

function Spans({ spans }: { spans: RichTextSpan[] }) {
  return (
    <>
      {spans.map((s, i) => (
        <Fragment key={i}>
          <Span span={s} />
        </Fragment>
      ))}
    </>
  );
}

/** Notion rich text 를 문단/글머리 목록으로 렌더링한다 (줄바꿈, 굵게 등 서식 유지). */
export function RichText({ value, className = "" }: { value: RichTextValue; className?: string }) {
  const blocks = toBlocks(value);
  if (blocks.length === 0) return null;
  return (
    <div className={`rt ${className}`}>
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p key={i} className={b.gap ? "rt-gap" : undefined}>
            <Spans spans={b.spans} />
          </p>
        ) : (
          <ul key={i} className={b.gap ? "rt-gap" : undefined}>
            {b.items.map((item, j) => (
              <li key={j}>
                <Spans spans={item} />
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
