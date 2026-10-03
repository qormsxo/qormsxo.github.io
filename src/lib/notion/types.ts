/**
 * 타입은 scripts/inspect-notion.ts 조회 결과(실제 속성 이름/타입)를 기준으로 정의했다.
 *
 * DB (Notion 이름)  → 속성
 *  - 기본 정보   : 이름(title) 포지션(rich_text) 자기소개(rich_text) 이메일(email)
 *                  전화번호(phone_number) URL(url) website(rich_text)
 *  - 기술스택    : title(title) skills(multi_select) order(number)
 *  - 핵심역량    : title(title) details(rich_text)
 *  - 경력        : company(title) position period 주요 프로젝트 연혁 핵심 성과 및 역량 (rich_text)
 *  - Portfolio   : title(title) description details remark(rich_text)
 *                  website github(url) skills(multi_select)
 *  - Award       : Portfolio 와 동일 + period(rich_text) android ios post(url)
 *                  order(number) show(select: show|hide)
 *  - 문제 해결경험: title(title) 문제 해결 및 성과(rich_text) order(number)
 *  - 교육        : title(title) degree period(rich_text)
 *  - 자격증      : title(title) issuer date(rich_text)
 *  - 병역사항    : title(title) period(rich_text)
 */

/** Notion rich text 한 조각. 서식(annotations)과 링크를 유지한다. 텍스트에는 "\n" 이 그대로 들어 있을 수 있다. */
export interface RichTextSpan {
  text: string;
  href?: string;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  code?: boolean;
}
export type RichText = RichTextSpan[];

export interface Link {
  label: string;
  href: string;
}

/** 공개 사이트로 넘어가는 프로필. 전화번호 필드는 타입에도 존재하지 않는다. */
export interface PublicProfile {
  name: string;
  position?: RichText;
  intro?: RichText;
  email?: string;
  /** "URL" 속성 (url) */
  url?: string;
  /** "website" 속성 (rich_text) */
  website?: RichText;
}

/** PDF 전용 프로필. 전화번호 포함. 공개 페이지에서는 import 하지 않는다. */
export interface PrivateProfile extends PublicProfile {
  phone?: string;
}

export interface SkillGroup {
  /** 기술스택 DB 의 title. 비어 있으면 undefined (분류명 없이 칩만 표시) */
  label?: string;
  skills: string[];
}

export interface CoreCompetency {
  title: string;
  details?: RichText;
}

export interface Career {
  company: string;
  position?: RichText;
  period?: RichText;
  projects?: RichText; // "주요 프로젝트 연혁"
  achievements?: RichText; // "핵심 성과 및 역량"
}

/** Portfolio / Award 공통 */
export interface ProjectItem {
  title: string;
  period?: RichText;
  description?: RichText;
  details?: RichText;
  remark?: RichText;
  skills: string[];
  links: Link[];
}

export interface ProblemCase {
  title: string;
  problem?: RichText; // "문제"
  solution?: RichText; // "해결 및 성과"
}

export interface Education {
  school: string;
  degree?: RichText;
  period?: RichText;
}

export interface Certificate {
  name: string;
  issuer?: RichText;
  date?: RichText;
}

export interface Military {
  title: string;
  period?: RichText;
}

export type SectionKey =
  | "profile"
  | "skills"
  | "core"
  | "career"
  | "portfolio"
  | "problems"
  | "awards"
  | "education"
  | "certificates"
  | "military";

export interface ResumeData<P extends PublicProfile = PublicProfile> {
  profile: P;
  /** 섹션 제목 = Notion DB 이름 (trim) */
  sectionTitles: Record<SectionKey, string>;
  skillGroups: SkillGroup[];
  core: CoreCompetency[];
  careers: Career[];
  portfolio: ProjectItem[];
  problems: ProblemCase[];
  awards: ProjectItem[];
  education: Education[];
  certificates: Certificate[];
  military: Military[];
}
