import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { WebClient } from '@slack/web-api';
import { DateTime, Settings } from 'luxon';

Settings.defaultZone = 'Asia/Tokyo';

const analyticsDataClient = new BetaAnalyticsDataClient();

const propertyId = process.env.GA_PROPERTY_ID || '';

async function runReport() {
  const [response] = await analyticsDataClient.runRealtimeReport({
    property: `properties/${propertyId}`,
    metrics: [
      {
        name: 'activeUsers'
      },
      {
        name: 'screenPageViews'
      }
    ]
  });

  const token = process.env.SLACK_BOT_TOKEN;
  const web = new WebClient(token);
  const channel = 'C04F1QJDLJD';
  if (!response.rows) {
    console.log('no report');
    return;
  }
  const values = response.rows[0].metricValues!;
  const user = Number(values[0].value ?? '0');
  const pv = Number(values[1].value ?? '0');
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `GAリアルタイムレポート ${DateTime.now().toFormat('yyyy-LL-dd HH:mm')}\n*ページビュー: ${pv}*\n*ユニークユーザー: ${user}*`
      }
    }
  ];
  if (user > 200) {
    blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'すごいアクセス数です！！何かバズったかな？:mameka_sd_smile:'
        }
      }
    );
  }
  await web.chat.postMessage({
    channel,
    mrkdwn: true,
    text: 'GAリアルタイムレポート(直近30分)',
    unfurl_media: false,
    blocks
  });
}

await runReport();