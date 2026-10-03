// Next 는 빌드 중 fetch 응답을 .next/cache/fetch-cache 에 저장하고 다음 빌드에서 재사용한다.
// Notion 을 수정한 뒤 로컬에서 재빌드할 때 옛 데이터가 나오지 않도록 빌드 전에 이 캐시만 지운다.
// (컴파일 캐시 .next/cache/turbopack 은 그대로 둔다. CI 는 캐시가 없어 영향 없음)
import { rmSync } from "node:fs";

rmSync(".next/cache/fetch-cache", { recursive: true, force: true });
