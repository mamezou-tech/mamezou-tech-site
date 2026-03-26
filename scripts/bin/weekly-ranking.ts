import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { DateTime, Settings } from "luxon";
import { dirname, fromFileUrl, join } from "@std/path";
import { WebClient } from "@slack/web-api";
import { writeFile } from "@opensrc/jsonfile";

Settings.defaultZone = "Asia/Tokyo";

const propertyId = Deno.env.get("GA_PROPERTY_ID") || "";
const analyticsDataClient = new BetaAnalyticsDataClient();

const now = DateTime.now();
const yesterday = now.minus({ days: 1 }); // 今日ではなく昨日
const oneWeekAgo = yesterday.minus({ weeks: 1 }); // 昨日の1週間前

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
        endDate: yesterday.toISODate(), // 未確定データを含む「今日」を除外
      },
    ],
    dimensions: [
      {
        name: "pageTitle",
      },
      {
        name: "pagePath", // fullPageUrl から、軽量な pagePath に変更
      },
    ],
    metrics: [
      {
        name: "eventCount",
      },
    ],
    orderBys: [
      {
        metric: { name: "eventCount" },
        desc: true, // API側であらかじめPV順にソートさせる
      },
    ],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "eventName",
              stringFilter: {
                value: "page_view",
              },
            },
          },
        ],
      },
    },
    limit: 100, // 1000件から削減し、API側の負荷を減らす
  });

  const articles: Rank[] = response.rows!
    .map((row) => {
      const [title, path] = row.dimensionValues!.map((v) => v.value);
      const pv = +(row.metricValues![0].value || 0);
      return {
        title: title!
          .replace(" | 豆蔵デベロッパーサイト", "")
          .replace(" | Mamezou Developer Portal", ""),
        path: path!, // すでに "/entry/..." のようなパス形式
        url: `developer.mamezou-tech.com${path}`, // Slack通知などのためのURL結合
        pv,
      };
    })
    // トップページなどの除外は JavaScript 側で安全に処理
    .filter((a) => a.path !== "/" && a.path !== "/index.html")
    .slice(0, 10); // 上位10件を確定

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
    text: `先週(${oneWeekAgo.toISODate()} ~ ${yesterday.toISODate()})のランキング(PVベース)が確定しました:beers:`,
    unfurl_media: false,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `先週(${oneWeekAgo.toISODate()} ~ ${yesterday.toISODate()})のランキング(PVベース)が確定しました:beers:`,
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
      {
        type: "section",
        text: {
          type: "plain_text",
          text:
            "PRがマージされたら今週のランキングとしてサイトに掲載されます:clap:\n執筆者の皆様ありがとうございました:mameka_sd_smile:",
        },
      },
    ],
  });
}

const __dirname = dirname(fromFileUrl(import.meta.url));
const reportDir = join(__dirname, "../../src/_data");
const reportFile = join(reportDir, "pv.json");

await runReport(reportFile);

console.log("DONE!!");