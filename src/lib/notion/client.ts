import { Client } from "@notionhq/client";

let client: Client | undefined;

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`환경변수 ${name} 이(가) 설정되지 않았습니다. (.env.local 또는 GitHub Secrets)`);
  }
  return v;
}

/** env 는 호출 시점에 읽는다. (스크립트에서 loadEnvConfig 이후에 호출되도록) */
export function getNotion(): Client {
  client ??= new Client({ auth: requireEnv("NOTION_TOKEN") });
  return client;
}
