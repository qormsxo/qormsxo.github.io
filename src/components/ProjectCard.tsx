import type { ProjectItem } from "@/lib/notion/types";
import { RichText } from "./RichText";
import { Card, Chips } from "./ui";

export function ProjectCard({ item }: { item: ProjectItem }) {
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-bold leading-snug text-ink sm:text-xl">{item.title}</h3>
        {item.period && <RichText value={item.period} className="text-sm text-muted" />}
      </div>
      {item.remark && (
        <RichText value={item.remark} className="mt-1 text-sm font-medium text-accent" />
      )}
      {item.description && <RichText value={item.description} className="mt-3 text-[15px] text-slate-800" />}
      {item.details && <RichText value={item.details} className="mt-3 text-[15px] text-slate-800" />}
      {item.skills.length > 0 && (
        <div className="mt-4">
          <Chips items={item.skills} />
        </div>
      )}
      {item.links.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {item.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
