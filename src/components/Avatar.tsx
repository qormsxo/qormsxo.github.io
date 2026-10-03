/** 아바타 배경색. Tailwind 색상 클래스 하나로 한 곳에서만 바꾼다. (예: "bg-slate-800", "bg-emerald-700") */
const AVATAR_BG = "bg-indigo-700";

/**
 * 표시 글자 규칙
 *  - 한글 등: 이름의 첫 글자 하나
 *  - 영문: 이니셜 두 글자 (두 단어 이상이면 첫 단어와 마지막 단어의 첫 글자, 한 단어면 앞 두 글자)
 */
export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return "";
  const chars = Array.from(trimmed); // 서로게이트 페어 안전
  if (/^[A-Za-z]/.test(chars[0])) {
    const words = trimmed.split(/\s+/).filter(Boolean);
    const letters =
      words.length >= 2
        ? `${Array.from(words[0])[0]}${Array.from(words[words.length - 1])[0]}`
        : chars.slice(0, 2).join("");
    return letters.toUpperCase();
  }
  return chars[0];
}

interface AvatarProps {
  /** Notion DB 의 이름 속성 값 */
  name: string;
  /** 지름(px). 기본 96 */
  size?: number;
  className?: string;
}

/** 이미지 파일/외부 서비스 없이 이름 이니셜로 그리는 원형 아바타 (공개 사이트 전용). */
export function Avatar({ name, size = 96, className = "" }: AvatarProps) {
  return (
    <div
      role="img"
      aria-label={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold leading-none text-white ${AVATAR_BG} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      <span aria-hidden>{getInitials(name)}</span>
    </div>
  );
}
