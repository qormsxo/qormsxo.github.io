/**
 * 공개 빌드 결과물(out/)에 전화번호가 포함되어 있지 않은지 검사한다. (npm run verify:public)
 *  - 전화번호는 하드코딩하지 않고 Notion 에서 읽는다.
 *  - 하이픈/공백/점/국제번호 표기 등 변형도 함께 검사한다.
 *  - 발견되면 exit 1 로 빌드를 실패시킨다. (CI 로그는 공개될 수 있으므로 전화번호 값은 출력하지 않는다)
 */
import { loadEnvConfig } from "@next/env";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fetchPrivateResume } from "../src/lib/notion/fetch-private";

loadEnvConfig(process.cwd());

const OUT_DIR = path.join(process.cwd(), "out");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** 전화번호의 다양한 표기 변형을 만든다. */
function phoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, "");
  const set = new Set<string>([phone.trim(), digits]);
  if (digits.length >= 9) {
    const head = digits.slice(0, digits.startsWith("02") ? 2 : 3);
    const rest = digits.slice(head.length);
    const tail = rest.slice(-4);
    const mid = rest.slice(0, -4);
    for (const sep of ["-", " ", ".", "/"]) set.add([head, mid, tail].join(sep));
    // 국제번호: 0 제거 후 +82
    const intl = `82${digits.replace(/^0/, "")}`;
    set.add(intl);
    set.add(`+${intl}`);
    const intlRest = digits.replace(/^0/, "");
    const iHead = intlRest.slice(0, intlRest.startsWith("2") ? 1 : 2);
    const iRest = intlRest.slice(iHead.length);
    for (const sep of ["-", " ", "."]) {
      set.add(`+82${sep}${iHead}${sep}${iRest.slice(0, -4)}${sep}${iRest.slice(-4)}`);
      set.add(`+82 ${iHead}${sep}${iRest.slice(0, -4)}${sep}${iRest.slice(-4)}`);
    }
  }
  return [...set].filter((v) => v.length >= 8);
}

async function main() {
  if (!existsSync(OUT_DIR)) {
    console.error("out/ 폴더가 없습니다. 먼저 `npm run build` 를 실행하세요.");
    process.exit(1);
  }

  const { profile } = await fetchPrivateResume();
  if (!profile.phone) {
    console.warn("Notion 에 전화번호가 없어 검사할 값이 없습니다. (skip)");
    return;
  }

  const variants = phoneVariants(profile.phone);
  const needles = variants.map((v) => Buffer.from(v, "utf8"));
  const files = walk(OUT_DIR);

  const hits: string[] = [];
  for (const file of files) {
    const buf = readFileSync(file);
    needles.forEach((needle, i) => {
      if (buf.includes(needle)) hits.push(`${path.relative(process.cwd(), file)} (표기 변형 #${i + 1})`);
    });
  }

  if (hits.length > 0) {
    console.error(`❌ 공개 빌드 결과물에서 전화번호가 발견되었습니다 (${hits.length}건):`);
    for (const h of hits) console.error(`  - ${h}`);
    process.exit(1);
  }
  console.log(`✅ 전화번호 검사 통과: out/ 내 ${files.length}개 파일, ${variants.length}가지 표기에서 발견되지 않음`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
