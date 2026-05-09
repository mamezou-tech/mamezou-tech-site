import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { DateTime, Settings } from "luxon";
import { dirname, fromFileUrl, join } from "@std/path";
import { WebClient } from "@slack/web-api";
import { writeFile } from "@opensrc/jsonfile";

Settings.defaultZone = "Asia/Tokyo";

const propertyId = Deno.env.get("GA_PROPERTY_ID") || "";
const analyticsDataClient = new BetaAnalyticsDataClient({
  transport: 'rest',
});

const now = DateTime.now();
const yesterday = now.minus({ days: 1 });
const oneWeekAgo = now.minus({ weeks: 1 });
const siteHost = "developer.mamezou-tech.com";

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
      {
        name: "pageTitle",
      },
      {
        name: "pagePath",
      },
    ],
    metrics: [
      {
        name: "screenPageViews",
      },
    ],
    orderBys: [
      {
        metric: { metricName: "screenPageViews" },
        desc: true,
      },
    ],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "hostName",
              stringFilter: { value: siteHost },
            },
          },
          {
            notExpression: {
              filter: {
                fieldName: "pagePath",
                stringFilter: {
                  matchType: "EXACT",
                  value: "/",
                },
              },
            },
          },
        ],
      },
    },
    limit: 10,
  }, {
    timeout: 60000,
    retry: {
      retryCodes: [4, 14], // 4: DEADLINE_EXCEEDED, 14: UNAVAILABLE をリトライ対象にする
      backoffSettings: {
        initialRetryDelayMillis: 1000,
        retryDelayMultiplier: 2,
        maxRetryDelayMillis: 10000,
        initialRpcTimeoutMillis: 60000,
        rpcTimeoutMultiplier: 1.5,
        maxRpcTimeoutMillis: 120000,
        totalTimeoutMillis: 300000,
      },
    },
  });

  const rows = response.rows ?? [];
  const articles: Rank[] = rows
    .map((row) => {
      const [title, path] = row.dimensionValues!.map((v) => v.value);
      const pv = +(row.metricValues![0].value || 0);
      return {
        title: title!.replace(" | 豆蔵デベロッパーサイト", "").replace(
          " | Mamezou Developer Portal",
          "",
        ),
        path: path || "",
        url: `https://${siteHost}${path || ""}`,
        pv,
      };
    });

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
    text: `先週(${oneWeekAgo.toISODate()} ~ ${
      now.minus({ days: 1 }).toISODate()
    })のランキング(PVベース)が確定しました:beers:`,
    unfurl_media: false,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `先週(${oneWeekAgo.toISODate()} ~ ${
            now.minus({ days: 1 }).toISODate()
          })のランキング(PVベース)が確定しました:beers:`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ranks.map((a, i) =>
            `${i + 1}. <${a.url}|${a.title}> : ${a.pv}`
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
