import { ask } from '../util/chat-gpt.js';
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { WebClient } from '@slack/web-api';
import OpenAI from 'openai';

type Gpt = {
  columns: {
    title: string,
    text: string,
    created: string,
  }[]
};

async function main(path: string) {
  console.log('talk to AI Chat...');
  const json: Gpt = JSON.parse(fs.readFileSync(path).toString());
  const pastTitles = json.columns.map(column => column.title);

  const prompt: OpenAI.ChatCompletionMessageParam = {
    content: `Output funny jargon used by IT developers in programming.
JSON format:
\`\`\`
{
  words: [<array of word>]
}
\`\`\`

Please follow the restrictions below.
- No need to reply message
- Only known jargon to be output
- Do not include obscene or vulgar words
- Speak in English

Do not output the following words.
${pastTitles.map(title => `- ${title}`).join('\n')}
`,
    role: 'user'
  };
  const keywordsResponse = await ask({
    messages: [prompt],
    maxTokens: 1024,
    temperature: 0.7,
    responseFormat: 'json_object'
  });
  const keywords: { words: string[] } = JSON.parse(keywordsResponse.choices[0].message?.content ?? {});

  console.log(keywords.words);
  const keyword = pickup(keywords.words, pastTitles);
  const result = await ask({
    messages: [prompt, {
      role: 'assistant',
      content: keywordsResponse.choices[0].message?.content
    }, {
      role: 'user',
      content: `You are to act as a columnist for a beautiful Japanese girl.
We will give you one slang word commonly used in the IT industry and you should output a short article about it.
You need to write passionate articles that readers can relate to. However, the article should include funny jokes.
Please do not output "yes" or "I understand", only the article.
Articles should be written in Japanese with cheerful and energetic colloquialisms and should not use honorifics such as "です" and "ます".
Your name is "豆香" (pronounced "まめか").
My first word is "${keyword}".
`
    }],
    maxTokens: 2048,
    temperature: 0.7
  });
  const column = result.choices[0].message?.content?.trim() || '';
  if (!column) throw new Error('no content');
  if (!safeResponse(column) || !safeResponse(column)) throw new Error(`un-safe content found: ${column}`);

  const item = {
    title: keyword,
    text: column.replaceAll(/(\r?\n)+/g, '<br />'),
    created: new Date().toISOString()
  };
  json.columns.unshift(item);
  json.columns = json.columns.slice(0, 40);
  fs.writeFileSync(path, JSON.stringify(json, null, 2));

  const token = process.env.SLACK_BOT_TOKEN;
  const web = new WebClient(token);

  const today = new Date();
  const channel = process.env.SLACK_CHANNEL_ID || 'D041BPULN4S';
  await web.chat.postMessage({
    channel,
    mrkdwn: true,
    text: '今日の豆香の豆知識コラム(予告)',
    unfurl_media: false,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}の豆香の豆知識コラム(by GPT-4 Turbo)`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: item.title
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: column
        }
      }
    ]
  });
}

function pickup(arr: string[], excludes: string[]): string {
  const i = Math.floor(Math.random() * arr.length);
  const target = arr[i];
  if (excludes.includes(target)) return pickup(arr, excludes);
  return target;
}

function safeResponse(inputString: string) {
  const patterns = [
    /<script[^>]*>/i,
    /<\/script>/i,
    /<[^>]+on\w+=/i,
    /javascript\s*:/i
  ];

  for (const pattern of patterns) {
    if (pattern.test(inputString)) {
      return false;
    }
  }
  return true;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const reportDir = `${__dirname}/../../src/_data`;
const reportFile = `${reportDir}/gpt.json`;

await main(reportFile);