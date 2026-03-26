// npm: プレフィックスを付けて直接参照します
import { GoogleAuth } from "npm:google-auth-library"; 
import { DateTime, Settings } from "luxon";
import { dirname, fromFileUrl, join } from "@std/path";
import { WebClient } from "@slack/web-api";
import { writeFile } from "@opensrc/jsonfile";

Settings.defaultZone = "Asia/Tokyo";

const propertyId = Deno.env.get("GA_PROPERTY_ID") || "";
const now = DateTime.now();
const yesterday = now.minus({ days: 1 });
const oneWeekAgo = yesterday.minus({ weeks: 1 });

type Rank = {
  title: string;
  path: string;
  url: string;
  pv: number;
};

// Workload Identity の設定ファイルからトークンを取得
async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: "https://www.googleapis.com/auth/analytics.readonly",
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  
  if (!token.token) {
    throw new Error("Workload Identity によるアクセストークンの取得に失敗しました。");
  }
  return token.token;
}

async function runReport(reportFile: string) {
  const accessToken = await getAccessToken();
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;

  // fetch (HTTP/1.1) を使用することで gRPC の Error 14 を完全に回避
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [{ startDate: oneWeekAgo.toISODate(), endDate: yesterday.toISODate() }],
      // pagePath に変更することで集計負荷を下げ、2300ページ超でも高速化
      dimensions: [{ name: "pageTitle" }, { name: "pagePath" }],
      metrics: [{ name: "eventCount" }],
      // API 側でソートを完結
      orderBys: [{ metric: { name: "eventCount" }, desc: true }],
      dimensionFilter: {
        filter: { fieldName: "eventName", stringFilter: { value: "page_view" } },
      },
      limit: 100,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GA API Error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const articles: Rank[] = (data.rows || [])
    .map((row: any) => {
      const [title, path] = row.dimensionValues.map((v: any) => v.value);
      const pv = +(row.metricValues[0].value || 0);
      return {
        title: title
          .replace(" | 豆蔵デベロッパーサイト", "")
          .replace(" | Mamezou Developer Portal", ""),
        path: path,
        url: `developer.mamezou-tech.com${path}`,
        pv,
      };
    })
    // 以前うまく動かなかった除外フィルタをここで確実に実行
    .filter((a: Rank) => a.path !== "/" && a.path !== "/index.html" && !a.path.endsWith("/"))
    .slice(0, 10);

  await writeFile(
    reportFile,
    { ranking: articles.map((a) => ({ title: a.title, url: a.path })) },
    { spaces: 2 },
  );

  await notifyToSlack(articles);
}

async function notifyToSlack(ranks: Rank[]) {
  const token = Deno.env.get("SLACK_BOT_TOKEN");
  if (!token) return;
  const web = new WebClient(token);
  const channel = Deno.env.get("SLACK_CHANNEL_ID") || "D041BPULN4S";
  
  await web.chat.postMessage({
    channel,
    mrkdwn: true,
    text: `先週のランキングが確定しました :beers:`,
    unfurl_media: false,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `先週(${oneWeekAgo.toISODate()} ~ ${yesterday.toISODate()})のランキング :beers:`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ranks.length > 0 
            ? ranks.map((a, i) => `${i + 1}. <https://${a.url}|${a.title}> : ${a.pv}`).join("\n")
            : "ランキング対象の記事が見つかりませんでした。",
        },
      },
    ],
  });
}

try {
  console.log("Generating weekly ranking report...");
  const __dirname = dirname(fromFileUrl(import.meta.url));
  const reportDir = join(__dirname, "../../src/_data");
  const reportFile = join(reportDir, "pv.json");
  await runReport(reportFile);
  console.log("DONE!!");
} catch (e) {
  console.error("FAILED!!", e);
  Deno.exit(1);
}
