import { ask } from '../util/chat-gpt.js';
import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import openai from '../util/openai-client.js';
import console from 'console';
import sharp from 'sharp';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { WebClient } from '@slack/web-api';

type Gpt = {
  columns: {
    title: string,
    text: string,
    created: string,
    theme: string
  }[]
};

const categories = [
  'Robotics',
  'EdTech Innovations',
  'AWS Services',
  'Tech Startups',
  'Edge Computing',
  'Biometric Security',
  'Latest AI products or services'
];

async function main(path: string) {
  const json: Gpt = JSON.parse(fs.readFileSync(path).toString());

  const theme = categories[new Date().getDay()];
  const pastTitles = json.columns
    .filter(column => column.theme === theme)
    .map(column => column.title);
  const prompt: OpenAI.ChatCompletionMessageParam = {
    content: `Output 20 \`${theme}\` used by IT developers in programming.
JSON format:
\`\`\`
{
  words: [<array of word>]
}
\`\`\`

Please follow the restrictions below.
- No need to reply message
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
  const keywords: { words: string[] } = JSON.parse(keywordsResponse.choices[0].message?.content ?? '{}');

  console.log(keywords.words);
  const keyword = pickup(keywords.words, pastTitles);
  const result = await ask({
    messages: [prompt, {
      role: 'assistant',
      content: keywordsResponse.choices[0].message?.content
    }, {
      role: 'user',
      content: `You are a cute girl and an excellent columnist in Japan.
We will give you one word commonly used in the IT industry and you should output a short article about it.
You need to write passionate articles that readers can relate to. However, the article should include funny jokes.
Please do not output "yes" or "I understand", only the article.
Articles should be written in Japanese with cheerful and energetic colloquialisms and should not use honorifics such as "です" and "ます".
Your name is "豆香" (pronounced "まめか").
My first word is "${keyword}" on "${theme}".
`
    }],
    maxTokens: 2048,
    temperature: 0.7
  });
  const column = result.choices[0].message?.content?.trim() || '';

  const formattedDate = today()
  await generateImage(column, formattedDate);

  if (!column) throw new Error('no content');
  if (!safeResponse(column) || !safeResponse(column)) throw new Error(`un-safe content found: ${column}`);

  const item = {
    title: keyword,
    text: column.replaceAll(/(\r?\n)+/g, '<br />'),
    created: new Date().toISOString(),
    theme
  };
  json.columns.unshift(item);
  json.columns = json.columns.slice(0, 70);
  fs.writeFileSync(path, JSON.stringify(json, null, 2));
  const token = process.env.SLACK_BOT_TOKEN;
  const web = new WebClient(token);

  const channel = process.env.SLACK_CHANNEL_ID || 'D041BPULN4S';
  await web.chat.postMessage({
    channel,
    mrkdwn: true,
    text: '今日の豆香の豆知識',
    unfurl_media: false,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${formattedDate}の豆香の豆知識(by GPT-4o)`
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
      },
      {
        type: 'image',
        alt_text: '豆香コラム画像',
        image_url: `https://image.mamezou-tech.com/mameka/${formattedDate}-daily-column-300.webp`,
      }
    ]
  });
}

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}
async function generateImage(column: string, date: string) {
  const response = await openai.images.generate({
    prompt: `generate images suitable for the following column written by 豆香(japanese cute girl) .
- The image should be cartoon-like.
- Include characters as well as objects whenever possible.

"${column}"`,
    model: 'dall-e-3',
    size: '1024x1024',
    response_format: 'b64_json',
    quality: 'standard'
  });

  const image = response.data[0];
  const base64Image = image.b64_json?.split(';base64,').pop();
  if (!base64Image) {
    throw new Error('illegal image format');
  }
  const width = 300;
  const optimizedImage = await sharp(Buffer.from(base64Image, 'base64') )
    .resize(width)
    .toFormat('webp', { quality: 80 })
    .toBuffer();

  await uploadToS3(`mameka/${date}-daily-column-${width}.webp`, optimizedImage);
  console.log('Image optimized and saved');
}

async function uploadToS3(key: string, body: Buffer) {
  const bucketName = 'mz-developer-site-image-bucket';
  const s3client = new S3Client({
    region: 'ap-northeast-1'
  });
  const uploadParams = {
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: 'image/webp'
  };
  const command = new PutObjectCommand(uploadParams);
  await s3client.send(command);
  console.log(`Image uploaded to S3: ${bucketName}/${key}`);
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