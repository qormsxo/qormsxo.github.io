import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ProjectCard } from "@/components/ProjectCard";
import { RichText } from "@/components/RichText";
import { Card, Chips, FieldLabel, ListCard, ListRow, Section } from "@/components/ui";
import { fetchPublicResume } from "@/lib/notion/fetch-public";
import { plainText } from "@/lib/notion/rich-text";

export async function generateMetadata(): Promise<Metadata> {
  const { profile } = await fetchPublicResume();
  const position = plainText(profile.position);
  return {
    title: position ? `${profile.name} | ${position}` : profile.name,
    description: plainText(profile.intro) || undefined,
  };
}

export default async function Page() {
  // 빌드 시점에 서버에서만 Notion 을 호출한다. 전화번호는 이 데이터에 존재하지 않는다.
  const r = await fetchPublicResume();
  const t = r.sectionTitles;

  return (
    <>
      <Header profile={r.profile} />

      <main className="mx-auto max-w-4xl space-y-12 px-5 py-10 sm:px-8 sm:py-14">
        {r.skillGroups.length > 0 && (
          <Section title={t.skills}>
            <Card className="space-y-4">
              {r.skillGroups.map((g, i) => (
                <div key={i} className={g.label ? "sm:grid sm:grid-cols-[8rem_1fr] sm:items-start sm:gap-4" : ""}>
                  {g.label && <div className="mb-1.5 text-sm font-semibold text-muted sm:mb-0 sm:pt-1">{g.label}</div>}
                  <Chips items={g.skills} />
                </div>
              ))}
            </Card>
          </Section>
        )}

        {r.core.length > 0 && (
          <Section title={t.core}>
            <div className="grid gap-4 md:grid-cols-2">
              {r.core.map((c) => (
                <Card key={c.title}>
                  <h3 className="text-base font-bold leading-snug text-ink">{c.title}</h3>
                  {c.details && <RichText value={c.details} className="mt-3 text-[15px] text-slate-700" />}
                </Card>
              ))}
            </div>
          </Section>
        )}

        {r.careers.length > 0 && (
          <Section title={t.career}>
            <div className="space-y-4">
              {r.careers.map((c) => (
                <Card key={c.company}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="text-lg font-bold text-ink">{c.company}</h3>
                    {c.period && <RichText value={c.period} className="text-sm text-muted" />}
                  </div>
                  {c.position && <RichText value={c.position} className="mt-0.5 text-sm font-medium text-accent" />}
                  {(c.projects || c.achievements) && (
                    <div className="mt-5 grid gap-6 md:grid-cols-2">
                      {c.projects && (
                        <div>
                          <FieldLabel>주요 프로젝트 연혁</FieldLabel>
                          <RichText value={c.projects} className="text-[15px] text-slate-700" />
                        </div>
                      )}
                      {c.achievements && (
                        <div>
                          <FieldLabel>핵심 성과 및 역량</FieldLabel>
                          <RichText value={c.achievements} className="text-[15px] text-slate-700" />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </Section>
        )}

        {r.portfolio.length > 0 && (
          <Section title={t.portfolio}>
            <div className="space-y-4">
              {r.portfolio.map((p) => (
                <ProjectCard key={p.title} item={p} />
              ))}
            </div>
          </Section>
        )}

        {r.problems.length > 0 && (
          <Section title={t.problems}>
            <div className="space-y-4">
              {r.problems.map((p) => (
                <Card key={p.title}>
                  <h3 className="text-base font-bold leading-snug text-ink sm:text-lg">{p.title}</h3>
                  <div className="mt-4 space-y-5">
                    {p.problem && (
                      <div>
                        <FieldLabel>문제</FieldLabel>
                        <RichText value={p.problem} className="text-[15px] leading-8 text-slate-700" />
                      </div>
                    )}
                    {p.solution && (
                      <div className="border-l-2 border-accent/30 pl-4">
                        <FieldLabel>해결 및 성과</FieldLabel>
                        <RichText value={p.solution} className="text-[15px] leading-8 text-slate-700" />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </Section>
        )}

        {r.awards.length > 0 && (
          <Section title={t.awards}>
            <div className="space-y-4">
              {r.awards.map((a) => (
                <ProjectCard key={a.title} item={a} />
              ))}
            </div>
          </Section>
        )}

        {/* 교육 / 자격증 / 병역사항: 같은 폭으로 세로로 쌓아, 열 높이가 달라 삐져나와 보이는 일이 없게 한다. */}
        {r.education.length > 0 && (
          <Section title={t.education}>
            <ListCard>
              {r.education.map((e) => (
                <ListRow key={e.school} title={e.school} sub={e.degree} meta={e.period} />
              ))}
            </ListCard>
          </Section>
        )}

        {r.certificates.length > 0 && (
          <Section title={t.certificates}>
            <ListCard>
              {r.certificates.map((c) => (
                <ListRow key={c.name} title={c.name} sub={c.issuer} meta={c.date} />
              ))}
            </ListCard>
          </Section>
        )}

        {r.military.length > 0 && (
          <Section title={t.military}>
            <ListCard>
              {r.military.map((m) => (
                <ListRow key={m.title} title={m.title} meta={m.period} />
              ))}
            </ListCard>
          </Section>
        )}
      </main>
    </>
  );
}
