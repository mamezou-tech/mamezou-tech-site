import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { DateTime, Settings } from 'luxon';
import { WebClient } from '@slack/web-api';
import { makeAuthorAccessRequest } from './ga-requests.js';
import { google } from '@google-analytics/data/build/protos/protos.js';
import fs from 'fs';

Settings.defaultZone = 'Asia/Tokyo';
const analyticsDataClient = new BetaAnalyticsDataClient();

const threshold = 100;
const now = DateTime.now();
const yesterday = now.minus({ days: 1 });

async function runReport(ym: string) {
  const target = DateTime.fromFormat(ym, 'yyyy-MM');
  const prev = target.minus({ months: 1 });
  const [currentResp] = await analyticsDataClient.runReport(makeAuthorAccessRequest(target.startOf('month'), target.endOf('month')));
  const [prevResp] = await analyticsDataClient.runReport(
    makeAuthorAccessRequest(prev.startOf('month'), prev.endOf('month')));

  const token = process.env.SLACK_BOT_TOKEN;
  const web = new WebClient(token);
  const channel = 'D041BPULN4S';
  // const channel = 'C04F1QJDLJD';

  if (!currentResp.rows?.length) {
    console.log('no report');
    return;
  }
  const collector = (row: google.analytics.data.v1beta.IRow) => {
    const author = row?.dimensionValues![0].value ?? '';
    const user = Number(row?.metricValues![0].value ?? '0');
    return { author, user };
  };
  const comparator = (a: { user: number }, b: { user: number }) => b.user - a.user;
  const curRanks = currentResp.rows.slice()
    .map(collector).filter(d => d.user >= threshold).sort(comparator);
  const prevRanks = (prevResp.rows ?? []).slice()
    .map(collector).filter(d => d.user >= threshold).sort(comparator);

  const result = curRanks.map((row, i) => {
    const preMetric = prevRanks.find(p => p.author === row.author);
    let prevRank = '-';
    let prevUser = '-';
    if (preMetric) {
      prevRank = (prevRanks.indexOf(preMetric) + 1).toString();
      const diff = row.user - preMetric.user;
      prevUser = diff > 0 ? '+' + diff : String(diff);
    }
    return {
      slack: `${i + 1}\t<https://developer.mamezou-tech.com/authors/${row.author}|${row.author}>\t${row.user}`,
      file: `${i + 1}\t${prevRank}\t${row.author}\t${row.user}\t${prevUser}`
    };
  });
  fs.writeFileSync(target.toISODate() + '-author.tsv', result.map(r => r.file).join('\n'), {
    encoding: 'utf-8',
    flag: 'w'
  });

  const post = {
    channel,
    mrkdwn: true,
    text: '月間優秀執筆者表彰',
    unfurl_media: false,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `:trophy: 先月の優秀執筆者表彰(${target.toFormat('yyyy-LL')}の獲得ユーザーベース) :trophy:`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: result.map(r => r.slack).join('\n')
        }
      },
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: 'ランクインおめでとうございます:clap:\nあなたの記事は多くのユーザーを獲得していますよ:mameka_sd_smile:'
        }
      }
    ]
  };
  // console.log(JSON.stringify(post, null, 2));
  await web.chat.postMessage(post);
}

const params = process.argv.slice(2);
if (!params.length) throw Error('yyyy-mm not found');
await runReport(params[0]);
