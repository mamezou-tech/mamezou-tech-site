import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { DateTime, Settings } from 'luxon';
import { WebClient } from '@slack/web-api';
import {
  makeGoogleSearchClicksRequest,
  makePopularPosts,
  makePvRequest,
  makeUserCountRequest
} from './ga-requests.js';
import * as protos from '@google-analytics/data/build/protos/protos.js';
import { generateArticleComment } from './langchain/generate-article-comment.js';
import { summarizeRanking } from './langchain/summarize-ranking.js';

Settings.defaultZone = 'Asia/Tokyo';

const analyticsDataClient = new BetaAnalyticsDataClient();

const now = DateTime.now();
const yesterday = now.minus({ days: 1 });
const twoDaysAgo = yesterday.minus({ days: 1 });
const oneWeekAgo = yesterday.minus({ weeks: 1 });

async function count(makeRequest: (from: DateTime, to: DateTime) => protos.google.analytics.data.v1beta.IRunReportRequest) {
  const [response1] = await analyticsDataClient.runReport(
    makeRequest(yesterday, yesterday));
  const [response2] = await analyticsDataClient.runReport(
    makeRequest(twoDaysAgo, twoDaysAgo));
  const [response3] = await analyticsDataClient.runReport(
    makeRequest(oneWeekAgo, oneWeekAgo));


  const yesterdayValue = +(response1.rows![0]?.metricValues![0]?.value || 0);
  const twoDaysAgoValue = +(response2.rows![0]?.metricValues![0]?.value || 0);
  const oneWeekAgoValue = +(response3.rows![0]?.metricValues![0]?.value || 0);
  return {
    yesterday: yesterdayValue,
    twoDaysAgo: twoDaysAgoValue,
    oneWeekAgo: oneWeekAgoValue,
    dayDiff: yesterdayValue - twoDaysAgoValue,
    weekDiff: yesterdayValue - oneWeekAgoValue
  };
}

async function countPv() {
  return count(makePvRequest);
}

async function countUser() {
  return count(makeUserCountRequest);
}

async function countGoogleSearchClick() {
  return count(makeGoogleSearchClicksRequest);
}

type Rank = { title: string, url: string, user: number };

function generateRanking(response: protos.google.analytics.data.v1beta.IRunReportResponse, limit = 20): Rank[] {
  return response.rows!
    .sort((a, b) => +b.metricValues![0].value! - +a.metricValues![0].value!)
    .slice(0, limit)
    .map(r => {
      const [title, url] = r.dimensionValues!.map(v => v.value);
      return {
        title: title!.replace(' | 豆蔵デベロッパーサイト', ''), url: url || '', user: +(r.metricValues![0].value!)
      };
    });
}

async function runReport() {
  const pv = await countPv();
  const user = await countUser();
  // const googleSearchClick = await countGoogleSearchClick();
  const [latestResult] = await analyticsDataClient.runReport(makePopularPosts(yesterday, yesterday));
  const [preResult] = await analyticsDataClient.runReport(makePopularPosts(twoDaysAgo, twoDaysAgo));
  const latestRanking = generateRanking(latestResult, 100)
  const latestTop20Ranking = latestRanking.slice(0, 20);
  const preTop20Ranking = generateRanking(preResult, 20);

  const summaryMessage = await summarizeRanking(latestTop20Ranking, preTop20Ranking);
  const pickupArticle = getRandomTitle(latestRanking);
  const pickUpMessage = await generateArticleComment(pickupArticle);

  const token = process.env.SLACK_BOT_TOKEN;
  const web = new WebClient(token);
  const channel = process.env.SLACK_CHANNEL_ID || 'D041BPULN4S';

  await web.chat.postMessage({
    channel,
    mrkdwn: true,
    text: '昨日のデベロッパーサイトアクセス情報',
    unfurl_media: false,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${yesterday.toISODate()}(${yesterday.weekdayShort})のデベロッパーサイトアクセス速報 :mz-tech:`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:chart_with_upwards_trend:*ページビュー: ${pv.yesterday}*\n- 前日比: ${diffToString(pv.dayDiff)}\n- 前週比: ${diffToString(pv.weekDiff)}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:man-woman-girl-boy:*ユーザー数: ${user.yesterday}*\n- 前日比: ${diffToString(user.dayDiff)}\n- 前週比: ${diffToString(user.weekDiff)}`
        }
      },
      // {
      //   type: "section",
      //   text: {
      //     type: "mrkdwn",
      //     text: `:eyeglasses:*Google検索クリック数: ${googleSearchClick.yesterday}*\n- 前日比: ${diffToString(googleSearchClick.dayDiff)}\n- 前週比: ${diffToString(googleSearchClick.weekDiff)}`
      //   }
      // },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: ':trophy:*ユーザー数TOP20* :bigboss:\n' + latestTop20Ranking.map(makeEntry).join('\n')
        }
      }
    ]
  });
  await web.chat.postMessage({
    channel,
    mrkdwn: true,
    text: '今日の豆香コメント',
    unfurl_media: false,
    blocks: [
      ...(makeBlocks('', summaryMessage)),
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:white_check_mark: 今日のピックアップ記事: ${pickupArticle.rank}位 <${pickupArticle.url}|${pickupArticle.title}>`
        }
      },
      ...(makeBlocks(':memo: 要約:', pickUpMessage.summary)),
      ...(makeBlocks(':mameka_sd_smile: コメント:', pickUpMessage.comment))
    ]
  });
}

function diffToString(diff: number) {
  if (diff === 0) {
    return `${diff} :arrow_right:`;
  } else if (diff > 0) {
    return `+${diff} :arrow_upper_right:`;
  } else {
    return `${diff} :arrow_lower_right:`;
  }
}

function makeEntry(article: Rank, index: number) {
  let prize;
  switch (index + 1) {
    case 1:
      prize = ':first_place_medal:';
      break;
    case 2:
      prize = ':second_place_medal:';
      break;
    case 3:
      prize = ':third_place_medal:';
      break;
    default:
      prize = '';
      break;
  }
  return `${index + 1}. <https://${article.url}|${article.title}> : ${article.user}${prize}`;
}

function getRandomTitle(articles: Rank[]): { title: string, rank: number, url: string } {
  const i = Math.floor(Math.random() * articles.length);
  return {
    title: articles[i].title,
    rank: i + 1,
    url: `https://${articles[i].url}`
  };
}

function makeBlocks(prefix: string, content: string) {
  function splitChunks(str: string): string[] {
    const size = 3000;
    const numChunks = Math.ceil(str.length / size);
    const chunks = new Array(numChunks);
    for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
      chunks[i] = str.substring(o, o + size);
    }
    return chunks;
  }

  const chunks = splitChunks(`${prefix} ${content}`);
  console.log(`chunkSize for ${prefix}`, chunks.length)
  return chunks.map((chunk, i) => ({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: chunk
    }
  }));
}

await runReport();

console.log('DONE!!');