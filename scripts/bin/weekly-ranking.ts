import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { DateTime, Settings } from "luxon";
import * as fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { WebClient } from "@slack/web-api";

Settings.defaultZone = "Asia/Tokyo";

const propertyId = process.env.GA_PROPERTY_ID || "";
const analyticsDataClient = new BetaAnalyticsDataClient();

const now = DateTime.now();
const oneWeekAgo = now.minus({weeks: 1});

type Rank = {
  title: string,
  path: string,
  url: string,
  pv: number,
}

async function runReport(reportFile: string) {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: oneWeekAgo.toISODate(),
        endDate: now.toISODate(),
      },
    ],
    dimensions: [
      {
        name: "pageTitle",
      },
      {
        name: "fullPageUrl",
      },
    ],
    metrics: [
      {
        name: "eventCount",
      },
    ],
    dimensionFilter: {
      andGroup: {
        // for now, not working...
        // notExpression: {
        //   filter: {
        //     fieldName: "fullPageUrl",
        //     stringFilter: {
        //       value: "developer.mamezou-tech.com/",
        //     },
        //   },
        // },
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
    limit: 1000,
  });

  const articles: Rank[] = response.rows!
    .slice()
    .sort((a, b) => +b.metricValues![0].value! - +a.metricValues![0].value!)
    .filter((row) => row.dimensionValues![1].value !== "developer.mamezou-tech.com/") // exclude top page
    .slice(0, 10)
    .map((row) => {
      const [title, url] = row.dimensionValues!.map((v) => v.value);
      const pv = +(row.metricValues![0].value || 0);
      return {
        title: title!.replace(" | 豆蔵デベロッパーサイト", "").replace(' | Mamezou Developer Portal', ''),
        path: url!.replace("developer.mamezou-tech.com", ""),
        url: url || '',
        pv,
      };
    });

  fs.writeFileSync(reportFile, JSON.stringify({ranking: articles.map(a => ({title: a.title, url: a.path}))}, null, 2));

  await notifyToSlack(articles);
}

async function notifyToSlack(ranks: Rank[]) {
  const token = process.env.SLACK_BOT_TOKEN;
  const web = new WebClient(token);
  const channel = process.env.SLACK_CHANNEL_ID || 'D041BPULN4S';
  await web.chat.postMessage({
    channel,
    mrkdwn: true,
    text: `先週(${oneWeekAgo.toISODate()} ~ ${now.minus({days: 1}).toISODate()})のランキング(PVベース)が確定しました:beers:`,
    unfurl_media: false,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `先週(${oneWeekAgo.toISODate()} ~ ${now.minus({days: 1}).toISODate()})のランキング(PVベース)が確定しました:beers:`,
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ranks.map((a, i) => `${i + 1}. <https://${a.url}|${a.title}> : ${a.pv}`).join("\n"),
        }
      },
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "PRがマージされたら今週のランキングとしてサイトに掲載されます:clap:\n執筆者の皆様ありがとうございました:mameka_sd_smile:",
        }
      },
    ]
  });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const reportDir = `${__dirname}/../../src/_data`;
const reportFile = `${reportDir}/pv.json`;

await runReport(reportFile);

console.log("DONE!!")