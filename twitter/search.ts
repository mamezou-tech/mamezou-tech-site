import { Client } from "twitter-api-sdk";
import { DateTime } from "luxon";
import { SectionBlock, WebClient } from "@slack/web-api";

const twitterClient = new Client(process.env.TWITTER_BEARER_TOKEN as string);
const slackToken = process.env.SLACK_BOT_TOKEN;
const slackClient = new WebClient(slackToken);
// const start = DateTime.now().minus({ day: 1 });
const start = DateTime.now().minus({ hour: 3 });
const end = DateTime.now().minus({ minute: 1 });
export type SearchResult = {
  id: string;
  text: string;
  url: string;
};
const keywords = ["developer.mamezou-tech.com", "豆蔵デベロッパー", "twitter.com/MamezouDev"];

async function search(
  query: string,
  retweet: boolean = false,
  max: number = 10
): Promise<SearchResult[]> {
  const result = await twitterClient.tweets.tweetsRecentSearch({
    query: `${query} ${retweet ? "is:quote" : "-is:retweet"} -from:MamezouDev`,
    start_time: start.toISO({ suppressMilliseconds: true }),
    end_time: end.toISO({ suppressMilliseconds: true }),
    sort_order: "recency",
    max_results: max,
  });
  if (process.env.DEBUG_ENABLED) {
    (result.data || []).forEach((a) => {
      console.log(a);
    });
  }
  return (result.data || [])
    .map(({ id, text }: { id: string; text: string }) => ({
      id,
      text,
      url: `https://twitter.com/MamezouDev/status/${id}`,
    }));
}

async function run() {
  const results = await Promise.all(
    keywords.map((k) => search(k, false, 10)).concat(keywords.map((k) => search(k, true, 10)))
  );
  const tweets = results.flat();
  const uniqueIds = Array.from(new Set(tweets.map((item) => item.id)));
  const uniqueTweets: SearchResult[] = uniqueIds.map((id) => tweets.find((t) => t.id === id)!);
  if (!uniqueTweets.length) {
    console.log("Sorry. Tweets not found!!");
    return;
  }
  const blocks: SectionBlock[][] = uniqueTweets.map((tweet) => [
    {
      type: "section",
      text: {
        type: "plain_text",
        text: tweet.text,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: tweet.url,
      },
    },
  ]);

  for (const block of blocks) {
    await slackClient.chat.postMessage({
      // channel: "C034MCKP4M6",
      channel: "C04F1QJDLJD", // ops channel
      mrkdwn: true,
      text: "Twitterで記事が引用されています",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Twitterで記事が引用されています :bird:`,
          },
        },
        ...block,
      ],
    });
  }
}

run()
  .then(() => console.log("DONE!!"))
  .catch(console.log);
