import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { DateTime, Settings } from "luxon";
import { dirname, fromFileUrl, join } from "@std/path";
import { WebClient } from "@slack/web-api";
import { writeFile } from "@opensrc/jsonfile";

Settings.defaultZone = "Asia/Tokyo";

const propertyId = Deno.env.get("GA_PROPERTY_ID") || "";
// 認証エラー回避のため、コンストラクタは元のまま（デフォルト）にします
const analyticsDataClient = new BetaAnalyticsDataClient();

const now = DateTime.now();
// 「今日」のデータは集計が不安定なため、昨日までを対象にします
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
        endDate: yesterday.toISODate(), // 昨日に変更
      },
    ],
    dimensions: [
      { name: "pageTitle" },
      { name: "pagePath" }, // fullPageUrl から pagePath に変更（軽量化）
    ],
    metrics: [
      { name: "eventCount" },
    ],
    // API 側でソートを完結させる
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
    limit: 100, // 取得件数を絞って高速化
  });

  const articles: Rank[] = response.rows!
    .map((row) => {
      const [title, path] = row.dimensionValues!.map((v) => v.value);
      const pv = +(row.metricValues![0].value || 0);
      
      return {
        title: title!
          .replace(" | 豆蔵デベロッパーサイト", "")
          .replace(" | Mamezou Developer Portal", ""),
        path: path!, 
        // Slack通知やリンク生成のためにドメインを付与
        url: `developer.mamezou-tech.com${path}`,
        pv,
      };
    })
    // トップページなどの除外は JavaScript 側で高速に処理
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
          text: ranks.map((a, i) =>
            `${i + 1}. <https://${a.url}|${a.title}> : ${a.pv}`
          ).join("\n"),
        },
      },
    ],
  });
}

// 実行とエラーハンドリング
try {
  const __dirname = dirname(fromFileUrl(import.meta.url));
  const reportDir = join(__dirname, "../../src/_data");
  const reportFile = join(reportDir, "pv.json");

  console.log("Generating weekly ranking report...");
  await runReport(reportFile);
  console.log("DONE!!");
} catch (e) {
  console.error("FAILED!!", e);
  Deno.exit(1);
}