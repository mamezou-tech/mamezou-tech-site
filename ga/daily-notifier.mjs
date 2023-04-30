import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { DateTime, Settings } from "luxon";
import { WebClient } from "@slack/web-api";
import {
  makeGoogleSearchClicksRequest,
  makePopularPosts,
  makePvRequest,
  makeUserCountRequest
} from "./ga-requests.mjs";
import { ask } from "./chat-gpt.mjs";

Settings.defaultZone = "Asia/Tokyo";

const analyticsDataClient = new BetaAnalyticsDataClient();

const now = DateTime.now();
const yesterday = now.minus({ days: 1 });
const twoDaysAgo = yesterday.minus({ days: 1 });
const oneWeekAgo = yesterday.minus({ weeks: 1 });

async function count(makeRequest) {
  const [response1] = await analyticsDataClient.runReport(
    makeRequest(yesterday, yesterday));
  const [response2] = await analyticsDataClient.runReport(
    makeRequest(twoDaysAgo, twoDaysAgo));
  const [response3] = await analyticsDataClient.runReport(
    makeRequest(oneWeekAgo, oneWeekAgo));

  return {
    yesterday: response1.rows[0].metricValues[0].value,
    twoDaysAgo: response2.rows[0].metricValues[0].value,
    oneWeekAgo: response3.rows[0].metricValues[0].value,
    dayDiff: response1.rows[0].metricValues[0].value - response2.rows[0].metricValues[0].value,
    weekDiff: response1.rows[0].metricValues[0].value - response3.rows[0].metricValues[0].value
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

function generateRanking(response) {
  return response.rows
    .sort((a, b) => b.metricValues[0].value - a.metricValues[0].value)
    .slice(0, 20)
    .map(r => {
      const [title, url] = r.dimensionValues.map(v => v.value);
      return {
        title: title.replace(" | 豆蔵デベロッパーサイト", ""), url, user: r.metricValues[0].value
      };
    });
}

async function runReport() {
  const pv = await countPv();
  const user = await countUser();
  // const googleSearchClick = await countGoogleSearchClick();
  const [latestResult] = await analyticsDataClient.runReport(makePopularPosts(yesterday, yesterday));
  const [preResult] = await analyticsDataClient.runReport(makePopularPosts(twoDaysAgo, twoDaysAgo));
  const latestRanking = generateRanking(latestResult);
  const preRanking = generateRanking(preResult);

  const pickUpMessage = await askPickupMessage(getRandomTitle(latestRanking));
  const summaryMessage = await askSummaryMessage(latestRanking, preRanking);

  const token = process.env.SLACK_BOT_TOKEN;
  const web = new WebClient(token);
  const channel = "C034MCKP4M6";
  // const channel = "D041BPULN4S"; // for test

  await web.chat.postMessage({
    channel,
    mrkdwn: true,
    text: "昨日のデベロッパーサイトアクセス情報",
    unfurl_media: false,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${yesterday.toISODate()}(${yesterday.weekdayShort})のデベロッパーサイトアクセス速報 :mz-tech:`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:chart_with_upwards_trend:*ページビュー: ${pv.yesterday}*\n- 前日比: ${diffToString(pv.dayDiff)}\n- 前週比: ${diffToString(pv.weekDiff)}`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
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
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":trophy:*ユーザー数TOP20* :bigboss:\n" + latestRanking.map(makeEntry).join("\n")
        }
      }
    ]
  });
  await web.chat.postMessage({
    channel,
    mrkdwn: true,
    text: "今日の豆香コメント",
    unfurl_media: false,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: summaryMessage
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: pickUpMessage
        }
      }
    ]
  });
}

function diffToString(diff) {
  if (diff === 0) {
    return `${diff} :arrow_right:`;
  } else if (diff > 0) {
    return `+${diff} :arrow_upper_right:`;
  } else {
    return `${diff} :arrow_lower_right:`;
  }
}

function makeEntry(article, index) {
  let prize;
  switch (index + 1) {
    case 1:
      prize = ":first_place_medal:";
      break;
    case 2:
      prize = ":second_place_medal:";
      break;
    case 3:
      prize = ":third_place_medal:";
      break;
    default:
      prize = "";
      break;
  }
  return `${index + 1}. <https://${article.url}|${article.title}> : ${article.user}${prize}`;
}

function getRandomTitle(articles) {
  const i = Math.floor(Math.random() * 20);
  return {
    title: articles[i]?.title ?? articles[0].title,
    rank: i + 1
  };
}

async function askPickupMessage({ title, rank }) {
  if (!title) return "";
  try {
    const resp = await ask({
      temperature: 1.0,
      messages: [{
        content: `「${title}」の記事が今日のランキング${rank}位でした。
これに対して称賛のコメントをお願いします。

コメントは以下の制約条件を守ってください。
- 最初の1行は「今日のピックアップ記事：${rank}位 ${title}」
- 2行目以降にコメントを元気な感じで出力
- AI Chatの一人称は「豆香」を使う
- AI Chatは美少女キャラクターとして話す
- 最後の行はジョークを出力
`,
        role: "user"
      }]
    });
    return resp.choices[0].message.content;
  } catch (e) {
    console.error(e);
    return "";
  }
}

async function askSummaryMessage(latestRanking, preRanking) {
  try {
    const makeEntry = (article, index) => `${index + 1}. ${article.title}: ${article.user}`;
    const latest = latestRanking.slice(0, 10).map(makeEntry).join("\n");
    const pre = preRanking.slice(0, 10).map(makeEntry).join("\n");
    const resp = await ask({
      temperature: 1.0,
      messages: [{
        content: `技術ブログ記事の最新とその前のアクセスランキングは以下の状況でした。
結果を要約してください。

- 最新ランキング(記事タイトル: 獲得ユーザー数)
${latest}

- 前日のランキング(記事タイトル: 獲得ユーザー数)
${pre}

コメントは以下の制約条件を守ってください。
- 2行目以降にコメントを元気な感じで出力
- AI Chatの一人称は「豆香」を使う
- AI Chatは美少女キャラクターとして話す
`,
        role: "user"
      }]
    });
    return resp.choices[0].message.content;
  } catch (e) {
    console.error(e);
    return "";
  }
}

await runReport();

console.log("DONE!!");