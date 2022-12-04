import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { DateTime, Settings } from "luxon";
import { WebClient } from "@slack/web-api";
import {
  makeGoogleSearchClicksRequest,
  makePopularPosts,
  makePvRequest,
  makeUserCountRequest
} from "./ga-requests.mjs";

Settings.defaultZone = "Asia/Tokyo";

const analyticsDataClient = new BetaAnalyticsDataClient();

const now = DateTime.now();
const yesterday = now.minus({days: 1});
const twoDaysAgo = yesterday.minus({days: 1});
const oneWeekAgo = yesterday.minus({weeks: 1});

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
  }
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

async function runReport() {
  const pv = await countPv();
  const user = await countUser();
  // const googleSearchClick = await countGoogleSearchClick();
  const [response] = await analyticsDataClient.runReport(makePopularPosts(yesterday, yesterday));
  const articles = response.rows
    .sort((a, b) => b.metricValues[0].value - a.metricValues[0].value)
    .slice(0, 20)
    .map(r => {
      const [title, url] = r.dimensionValues.map(v => v.value)
      return {
        title: title.replace(" | 豆蔵デベロッパーサイト", ""), url, user: r.metricValues[0].value
      }
    })

  const token = process.env.SLACK_BOT_TOKEN;
  const web = new WebClient(token);

  await web.chat.postMessage({
    channel: "C034MCKP4M6",
    // channel: "D041BPULN4S", // for test
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
          text: ":trophy:*ユーザー数TOP20* :bigboss:\n" + articles.map(makeEntry).join("\n"),
        }
      },
    ]
  })
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
      prize = ":first_place_medal:"
      break;
    case 2:
      prize = ":second_place_medal:"
      break;
    case 3:
      prize = ":third_place_medal:"
      break;
    default:
      prize = "";
      break;
  }
  return `${index + 1}. <https://${article.url}|${article.title}> : ${article.user}${prize}`
}

await runReport();

console.log("DONE!!")