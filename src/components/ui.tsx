import type { ReactNode } from "react";
import type { RichText as RichTextValue } from "@/lib/notion/types";
import { RichText } from "./RichText";

export function Section({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="mb-4 flex items-center gap-3 text-lg font-bold tracking-tight text-ink">
        <span className="h-5 w-1 rounded-full bg-accent" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

/** 행 목록을 하나의 카드에 담는다 (교육/자격증/병역사항 등 짧은 항목용). */
export function ListCard({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {children}
    </div>
  );
}

export function ListRow({ title, sub, meta }: { title: string; sub?: RichTextValue; meta?: RichTextValue }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6 sm:px-6">
      <div className="min-w-0">
        <div className="font-semibold text-ink">{title}</div>
        {sub && <RichText value={sub} className="text-sm text-slate-700" />}
      </div>
      {meta && <RichText value={meta} className="shrink-0 text-sm text-muted" />}
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-md bg-accent-soft px-2.5 py-1 text-[13px] font-medium leading-none text-accent">{children}</li>
  );
}

export function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <Chip key={s}>{s}</Chip>
      ))}
    </ul>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{children}</h4>;
}
