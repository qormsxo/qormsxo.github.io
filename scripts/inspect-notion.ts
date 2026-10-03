/**
 * Notion 페이지(NOTION_PAGE_ID) 하위의 모든 DB를 찾아 속성(이름/타입)을 출력한다.
 * 실행: npm run inspect:notion
 *
 * 속성 이름을 추측하지 않기 위한 조회 전용 스크립트이며, 데이터 본문은 출력하지 않는다
 * (행 개수와 select 옵션 이름만 출력).
 */
import { loadEnvConfig } from "@next/env";
import { Client } from "@notionhq/client";

loadEnvConfig(process.cwd());

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`환경변수 ${name} 이(가) 비어 있습니다. .env.local 을 확인하세요.`);
    process.exit(1);
  }
  return v;
}

const notion = new Client({ auth: requireEnv("NOTION_TOKEN") });
const rootPageId = requireEnv("NOTION_PAGE_ID");

type FoundDb = { id: string; title: string; path: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBlock = any;

async function listChildren(blockId: string): Promise<AnyBlock[]> {
  const out: AnyBlock[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    out.push(...res.results);
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return out;
}

/** 페이지 하위를 재귀 탐색하며 child_database 블록을 수집한다. */
async function findDatabases(blockId: string, path: string, found: FoundDb[]) {
  const children = await listChildren(blockId);
  for (const block of children) {
    if (block.type === "child_database") {
      found.push({ id: block.id, title: block.child_database.title, path });
    } else if (block.type === "child_page") {
      await findDatabases(block.id, `${path}/${block.child_page.title}`, found);
    } else if (block.has_children) {
      // column_list, column, toggle, callout 등 컨테이너 블록
      await findDatabases(block.id, path, found);
    }
  }
}

function describeProperty(prop: AnyBlock): string {
  const parts = [`${prop.type}`];
  if (prop.type === "select" || prop.type === "multi_select" || prop.type === "status") {
    const opts: string[] = (prop[prop.type]?.options ?? []).map((o: AnyBlock) => o.name);
    parts.push(`options=[${opts.join(", ")}]`);
  }
  if (prop.type === "relation") {
    parts.push(`→ ${prop.relation?.data_source_id ?? prop.relation?.database_id ?? "?"}`);
  }
  if (prop.type === "formula") parts.push(`expr=${prop.formula?.expression ?? ""}`);
  return parts.join("  ");
}

async function main() {
  const dbs: FoundDb[] = [];
  const root = await notion.pages.retrieve({ page_id: rootPageId }).catch((e) => {
    console.error("루트 페이지 조회 실패. 페이지 ID 와, integration 에 페이지가 공유(Connections)되어 있는지 확인하세요.");
    console.error(e.message);
    process.exit(1);
  });
  console.log(`루트 페이지: ${(root as AnyBlock).url}\n`);

  await findDatabases(rootPageId, "(root)", dbs);

  if (dbs.length === 0) {
    console.log("child_database 블록을 찾지 못했습니다. (linked database 는 API 로 조회되지 않습니다)");
    return;
  }
  console.log(`발견한 DB: ${dbs.length}개\n${"=".repeat(70)}`);

  for (const db of dbs) {
    console.log(`\n■ DB "${db.title}"`);
    console.log(`  위치      : ${db.path}`);
    console.log(`  database_id: ${db.id}`);

    const database = (await notion.databases.retrieve({ database_id: db.id })) as AnyBlock;
    const sources: AnyBlock[] = database.data_sources ?? [];
    if (sources.length === 0) console.log("  (data source 없음)");

    for (const src of sources) {
      const ds = (await notion.dataSources.retrieve({ data_source_id: src.id })) as AnyBlock;
      const rows = await notion.dataSources.query({ data_source_id: src.id, page_size: 100 });
      console.log(`  data_source_id: ${src.id}  (name: ${src.name ?? "-"})`);
      console.log(`  행 개수   : ${rows.results.length}${rows.has_more ? "+" : ""}`);
      console.log("  속성:");
      const props = Object.values(ds.properties) as AnyBlock[];
      const width = Math.max(...props.map((p) => p.name.length));
      for (const p of props) {
        console.log(`    - ${p.name.padEnd(width)}  ${describeProperty(p)}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
