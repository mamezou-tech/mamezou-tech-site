import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { DateTime, Settings } from "luxon";
import * as fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

Settings.defaultZone = "Asia/Tokyo";

const propertyId = process.env.GA_PROPERTY_ID || "";
const analyticsDataClient = new BetaAnalyticsDataClient();

async function runReport(reportFile) {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: DateTime.now().minus({weeks: 1}).toISODate(),
        endDate: DateTime.now().toISODate(),
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

  const articles = response.rows
    .slice()
    .sort((a, b) => b.metricValues[0].value - a.metricValues[0].value)
    .filter((row) => row.dimensionValues[1].value !== "developer.mamezou-tech.com/") // exclude top page
    .slice(0, 10)
    .map((row) => {
      const [title, url] = row.dimensionValues.map((v) => v.value);
      return {
        title: title.replace(" | 豆蔵デベロッパーサイト", ""),
        url: url.replace("developer.mamezou-tech.com", ""),
      };
    });

  fs.writeFileSync(reportFile, JSON.stringify({ranking: articles.slice(0, 10)}, null, 2));
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const reportDir = `${__dirname}/../src/_data`;
const reportFile = `${reportDir}/pv.json`;
if (fs.existsSync(reportFile)) {
  const prevFile = `${reportDir}/pre-pv.json`;
  if (fs.existsSync(prevFile)) {
    fs.unlinkSync(prevFile);
  }
  fs.renameSync(reportFile, prevFile);
}

await runReport(reportFile);

console.log("DONE!!")