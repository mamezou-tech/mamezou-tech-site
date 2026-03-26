import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { DateTime, Settings } from "luxon";
import { dirname, fromFileUrl, join } from "@std/path";
import { WebClient } from "@slack/web-api";
import { writeFile } from "@opensrc/jsonfile";

Settings.defaultZone = "Asia/Tokyo";

const propertyId = Deno.env.get("GA_PROPERTY_ID") || "";

// --- Workload Identity 認証情報の読み込み ---
const credentialsPath = Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS");
let credentials;

if (credentialsPath) {
  try {
    // auth アクションが生成した一時ファイルを読み込む
    const content = await Deno.readTextFile(credentialsPath);
    credentials = JSON.parse(content);
  } catch (e) {
    console.warn("認証ファイルの読み込みに失敗しました。デフォルト認証を試みます。", e);
  }
}

// gRPC エラー(14)回避のため transport: 'rest' を指定
// 権限エラー(403)回避のため credentials を明示的に渡す
const analyticsDataClient = new BetaAnalyticsDataClient({
  transport: 'rest',
  credentials,
});

const now = DateTime.now();
const yesterday = now.minus({ days: 1 });
const oneWeekAgo = yesterday.minus({ weeks: 1 });

type Rank = {
  title: string;
  path: string;
  url: string;
  pv: number;
};

async function runReport(reportFile: string) {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: oneWeekAgo.toISODate(),
        endDate: yesterday.toISODate(),
      },
    ],
    dimensions: [
      { name: "pageTitle" },
      { name: "pagePath" }, // pagePath に変更して軽量化
    ],
    metrics: [
      { name: "eventCount" },
    ],
    orderBys: [
      {
        metric: { name: "eventCount" },
        desc: true,
      },
    ],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { value: "page_view" },
      },
    },
    limit: 100,
  });

  const articles: Rank[] = (response.rows || [])
    .map((row) => {
      const [title, path] = (row.dimensionValues || []).map((v) => v.value);
      const pv = +(row.metricValues?.[0].value || 0);
      
      return {
        title: title!
          .replace(" | 豆蔵デベロッパーサイト", "")
          .replace(" | Mamezou Developer Portal", ""),
        path: path!, 
        url: `developer.mamezou-tech.com${path}`,
        pv,
      };
    })
    // pagePath にしたので、ドメイン置換ではなくパスの一致でフィルタ
    .filter((a) => a.path !== "/" && a.path !== "/index.html" && !a.path.endsWith("/"))
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
          text: `先週(${oneWeekAgo.toISODate()} ~ ${yesterday.toISODate()})のランキング(PVベース) :beers:`,
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