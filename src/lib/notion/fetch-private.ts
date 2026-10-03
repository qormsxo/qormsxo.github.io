import { loadResume, mapPrivateProfile } from "./load";
import type { PrivateProfile, ResumeData } from "./types";

/**
 * PDF / 빌드 검증 스크립트 전용. 전화번호를 포함한다.
 * ⚠ src/app, src/components 에서 import 금지 (공개 번들에 전화번호가 들어갈 수 있음).
 */
export function fetchPrivateResume(): Promise<ResumeData<PrivateProfile>> {
  return loadResume(mapPrivateProfile);
}
