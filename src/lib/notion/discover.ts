import { collectPaginatedAPI, isFullPage, type PageObjectResponse } from "@notionhq/client";
import { getNotion, requireEnv } from "./client";

/**
 * NOTION_PAGE_ID 하위의 child_database 블록을 재귀 탐색해 { DB 이름(trim) → database_id } 를 만든다.
 * DB ID 를 env 로 따로 받지 않고, 페이지 하위 DB 를 이름으로 찾는다.
 */
async function findDatabases(blockId: string, found: Map<string, string>): Promise<void> {
  const notion = getNotion();
  const children = await collectPaginatedAPI(notion.blocks.children.list, { block_id: blockId });
  for (const block of children) {
    if (!("type" in block)) continue;
    if (block.type === "child_database") {
      found.set(block.child_database.title.trim(), block.id);
    } else if (block.type === "child_page" || block.has_children) {
      await findDatabases(block.id, found);
    }
  }
}

let databasesPromise: Promise<Map<string, string>> | undefined;

function getDatabases(): Promise<Map<string, string>> {
  databasesPromise ??= (async () => {
    const found = new Map<string, string>();
    await findDatabases(requireEnv("NOTION_PAGE_ID"), found);
    return found;
  })();
  return databasesPromise;
}

export interface DbRows {
  /** Notion 에 적힌 DB 이름 (trim) — 섹션 제목으로 사용 */
  title: string;
  rows: PageObjectResponse[];
}

/** DB 이름(trim 기준)으로 모든 행을 가져온다. DB 가 없으면 에러. */
export async function fetchRows(dbName: string): Promise<DbRows> {
  const notion = getNotion();
  const databases = await getDatabases();
  const databaseId = databases.get(dbName);
  if (!databaseId) {
    throw new Error(
      `페이지 하위에서 DB "${dbName}" 을(를) 찾지 못했습니다. 발견된 DB: ${[...databases.keys()].join(", ")}`,
    );
  }
  const database = await notion.databases.retrieve({ database_id: databaseId });
  const dataSources = "data_sources" in database ? database.data_sources : [];
  const rows: PageObjectResponse[] = [];
  for (const ds of dataSources) {
    const results = await collectPaginatedAPI(notion.dataSources.query, { data_source_id: ds.id });
    rows.push(...results.filter(isFullPage));
  }
  return { title: dbName, rows };
}
