import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { DateTime, Settings } from 'luxon';
import { google } from '@google-analytics/data/build/protos/protos.js';
import { WebClient } from '@slack/web-api';

Settings.defaultZone = 'Asia/Tokyo';
const analyticsDataClient = new BetaAnalyticsDataClient();

const propertyId = process.env.GA_PROPERTY_ID || '';
const now = DateTime.now();
const yesterday = now.minus({ days: 1 });

async function runReport() {
  const req: google.analytics.data.v1beta.IRunReportRequest = {
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: yesterday.toISODate(),
        endDate: yesterday.toISODate()
      }
    ],
    dimensions: [
      {
        name: 'customUser:author'
      }
    ],
    metrics: [
      {
        name: 'activeUsers'
      }
    ],
    dimensionFilter: {
      notExpression: {
        filter: {
          fieldName: 'customUser:author',
          inListFilter: {
            values: ['', '(not set)']
          }
        }
      }
    }
  };
  const [response] = await analyticsDataClient.runReport(req);

  const token = process.env.SLACK_BOT_TOKEN;
  const web = new WebClient(token);
  // const channel = 'D041BPULN4S';
  const channel = 'C04F1QJDLJD';

  if (!response.rows) {
    console.log('no report');
    return;
  }
  const data = response.rows.map(row => {
    const author = row?.dimensionValues![0].value ?? '';
    const user = Number(row?.metricValues![0].value ?? '0');
    return { author, user };
  }).filter(d => d.user >= 10);

  await web.chat.postMessage({
    channel,
    mrkdwn: true,
    text: '昨日の執筆者別獲得ユーザー',
    unfurl_media: false,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `:trophy: 昨日10人以上のユーザーを獲得した執筆者(${yesterday.toFormat('yyyy-LL-dd')}) :trophy:`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${data.map((d, i) => `${i + 1}. <https://developer.mamezou-tech.com/authors/${d.author}/|${d.author}> : ${d.user}`).join('\n')}`
        }
      }
    ]
  });
}

await runReport();