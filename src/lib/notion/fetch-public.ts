import { loadResume, mapPublicProfile } from "./load";
import type { PublicProfile, ResumeData } from "./types";

let cache: Promise<ResumeData<PublicProfile>> | undefined;

/**
 * 공개 사이트 전용 fetch.
 * mapPublicProfile 은 "전화번호" 속성을 읽지 않으므로, 전화번호는 페이지 컴포넌트로
 * 넘어가지 않고 공개 빌드 결과물에도 포함되지 않는다.
 */
export function fetchPublicResume(): Promise<ResumeData<PublicProfile>> {
  cache ??= loadResume(mapPublicProfile);
  return cache;
}
