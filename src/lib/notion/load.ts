import type { PageObjectResponse } from "@notionhq/client";
import { fetchRows } from "./discover";
import {
  emailValue,
  multiSelectValues,
  numberValue,
  phoneValue,
  requiredTitle,
  richText,
  selectValue,
  urlValue,
} from "./props";
import type {
  Career,
  Certificate,
  CoreCompetency,
  Education,
  Link,
  Military,
  ProblemCase,
  ProjectItem,
  PrivateProfile,
  PublicProfile,
  ResumeData,
  SectionKey,
  SkillGroup,
} from "./types";

/** Notion DB 이름 (trim 기준). inspect-notion 결과와 동일해야 한다. */
const DB = {
  profile: "기본 정보",
  skills: "기술스택",
  core: "핵심역량",
  career: "경력",
  portfolio: "Portfolio",
  awards: "Award",
  problems: "문제 해결경험",
  education: "교육",
  certificates: "자격증",
  military: "병역사항",
} as const satisfies Record<string, string>;

/** 공개/비공개 공용 프로필 매핑. 전화번호는 여기서 읽지 않는다. */
export function mapPublicProfile(page: PageObjectResponse): PublicProfile {
  return {
    name: requiredTitle(page, "이름", DB.profile),
    position: richText(page, "포지션"),
    intro: richText(page, "자기소개"),
    email: emailValue(page, "이메일"),
    url: urlValue(page, "URL"),
    website: richText(page, "website"),
  };
}

/** PDF 전용: 공개 프로필 + 전화번호. */
export function mapPrivateProfile(page: PageObjectResponse): PrivateProfile {
  return { ...mapPublicProfile(page), phone: phoneValue(page, "전화번호") };
}

function projectLinks(page: PageObjectResponse, defs: Array<[prop: string, label: string]>): Link[] {
  const links: Link[] = [];
  for (const [prop, label] of defs) {
    const href = urlValue(page, prop);
    if (href) links.push({ label, href });
  }
  return links;
}

function mapProject(page: PageObjectResponse, dbLabel: string, withAwardFields: boolean): ProjectItem {
  return {
    title: requiredTitle(page, "title", dbLabel),
    period: withAwardFields ? richText(page, "period") : undefined,
    description: richText(page, "description"),
    details: richText(page, "details"),
    remark: richText(page, "remark"),
    skills: multiSelectValues(page, "skills"),
    links: projectLinks(
      page,
      withAwardFields
        ? [
            ["website", "Website"],
            ["github", "GitHub"],
            ["post", "Post"],
            ["android", "Android"],
            ["ios", "iOS"],
          ]
        : [
            ["website", "Website"],
            ["github", "GitHub"],
          ],
    ),
  };
}

/** "order" 숫자 속성 기준 오름차순(작은 값이 먼저). 값이 없는 행은 뒤로, 같은 값은 Notion 원래 순서 유지. */
function sortByOrder(rows: PageObjectResponse[]): PageObjectResponse[] {
  return rows
    .map((p, index) => ({ p, index, order: numberValue(p, "order") }))
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.index - b.index)
    .map(({ p }) => p);
}

/** Award: show=hide 인 행은 제외하고 order 오름차순으로 정렬한다. */
function mapAwards(rows: PageObjectResponse[]): ProjectItem[] {
  return sortByOrder(rows.filter((p) => selectValue(p, "show") !== "hide")).map((p) =>
    mapProject(p, DB.awards, true),
  );
}

function mapSkillGroups(rows: PageObjectResponse[]): SkillGroup[] {
  return sortByOrder(rows)
    .map((p): SkillGroup => {
      const label = (p.properties["title"]?.type === "title" ? p.properties["title"].title : [])
        .map((t) => t.plain_text)
        .join("");
      return {
        label: label.trim() === "" ? undefined : label,
        skills: multiSelectValues(p, "skills"),
      };
    })
    .filter((g) => g.skills.length > 0);
}

/**
 * 공개/PDF 공용 로더. 프로필 매핑 함수만 주입받아 전화번호 포함 여부가 갈린다.
 * 공개 경로(fetch-public.ts)는 mapPublicProfile 만 넘기므로 전화번호는 읽히지도 않는다.
 */
export async function loadResume<P extends PublicProfile>(
  mapProfile: (page: PageObjectResponse) => P,
): Promise<ResumeData<P>> {
  const [profile, skills, core, career, portfolio, awards, problems, education, certificates, military] =
    await Promise.all([
      fetchRows(DB.profile),
      fetchRows(DB.skills),
      fetchRows(DB.core),
      fetchRows(DB.career),
      fetchRows(DB.portfolio),
      fetchRows(DB.awards),
      fetchRows(DB.problems),
      fetchRows(DB.education),
      fetchRows(DB.certificates),
      fetchRows(DB.military),
    ]);

  const profileRow = profile.rows[0];
  if (!profileRow) throw new Error(`"${DB.profile}" DB 에 행이 없습니다.`);

  const sectionTitles: Record<SectionKey, string> = {
    profile: profile.title,
    skills: skills.title,
    core: core.title,
    career: career.title,
    portfolio: portfolio.title,
    problems: problems.title,
    awards: awards.title,
    education: education.title,
    certificates: certificates.title,
    military: military.title,
  };

  return {
    profile: mapProfile(profileRow),
    sectionTitles,
    skillGroups: mapSkillGroups(skills.rows),
    core: core.rows.map(
      (p): CoreCompetency => ({
        title: requiredTitle(p, "title", DB.core),
        details: richText(p, "details"),
      }),
    ),
    careers: career.rows.map(
      (p): Career => ({
        company: requiredTitle(p, "company", DB.career),
        position: richText(p, "position"),
        period: richText(p, "period"),
        projects: richText(p, "주요 프로젝트 연혁"),
        achievements: richText(p, "핵심 성과 및 역량"),
      }),
    ),
    portfolio: portfolio.rows.map((p) => mapProject(p, DB.portfolio, false)),
    problems: sortByOrder(problems.rows).map(
      (p): ProblemCase => ({
        title: requiredTitle(p, "title", DB.problems),
        problem: richText(p, "문제"),
        solution: richText(p, "해결 및 성과"),
      }),
    ),
    awards: mapAwards(awards.rows),
    education: education.rows.map(
      (p): Education => ({
        school: requiredTitle(p, "title", DB.education),
        degree: richText(p, "degree"),
        period: richText(p, "period"),
      }),
    ),
    certificates: certificates.rows.map(
      (p): Certificate => ({
        name: requiredTitle(p, "title", DB.certificates),
        issuer: richText(p, "issuer"),
        date: richText(p, "date"),
      }),
    ),
    military: military.rows.map(
      (p): Military => ({
        title: requiredTitle(p, "title", DB.military),
        period: richText(p, "period"),
      }),
    ),
  };
}
