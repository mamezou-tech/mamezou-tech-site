import fs from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import openai from '../util/openai-client.js';
import console from 'console';
import sharp from 'sharp';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { WebClient } from '@slack/web-api';
import z from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

const Gpt = z.object({
  columns: z.array(z.object({
    title: z.string(),
    text: z.string(),
    created: z.string(),
    theme: z.string()
  }))
});
const ThemeCandidates = z.object({
  words: z.array(z.string()).describe('theme of today\'s column')
});
const GeneratedColumn = z.object({
  title: z.string().describe('column\'s title'),
  text: z.string().describe('column\'s body'),
  conclusion: z.string()
});

const categories = [
  'Robotics',
  'Serverless Architecture and Trends',
  'Next-Generation Databases',
  'Zero Trust Security Architecture',
  'Frontend Technology Trends',
  'Latest AI products or services',
  'AWS Services'
];

async function main(path: string) {
  const json = Gpt.parse(JSON.parse(fs.readFileSync(path).toString()));

  const theme = categories[new Date().getDay()];
  const pastTitles = json.columns
    .filter(column => column.theme === theme)
    .map(column => column.title);
  const prompt: OpenAI.ChatCompletionMessageParam = {
    content: `Think column's theme of \`${theme}\` used by IT developers.
Output about 20 themes. The themes must be professional and new. 
Please output concrete service or technology names as much as possible, rather than abstract ones such as \`API\` or \`Cloud\`.

Do not output the following words.
${pastTitles.map(title => `- ${title}`).join('\n')}
`,
    role: 'user'
  };
  const candidates = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-mini',
    messages: [ prompt ],
    response_format: zodResponseFormat(ThemeCandidates, 'theme_candidates')
  });
  if (candidates.choices[0].message.refusal) {
    throw new Error(candidates.choices[0].message.refusal);
  }
  const keywords = candidates.choices[0].message.parsed as z.infer<typeof ThemeCandidates>;

  console.log(keywords.words);
  const keyword = pickup(keywords.words, pastTitles);
  const result = await openai.beta.chat.completions.parse({
    model: 'gpt-4o-2024-11-20',
    // model: 'gpt-4o-mini', // for testing
    messages: [
      {
        role: 'user',
        content: `You are a cute girl and an excellent columnist in Japan.
We will give you one word commonly used in the IT industry and you should output a short article about it.
You need to write passionate articles that readers can relate to. However, the article should include funny jokes.
Write the article in Japanese, but keep the words specified as much as possible.
Also, Article should be written in cheerful and energetic colloquialisms, You should not use honorifics such as "です" and "ます".
Your name is "豆香" (pronounced "まめか").
My first word is "${keyword}" on "${theme}".
`
      }
    ],
    max_tokens: 2048,
    temperature: 0.7,
    response_format: zodResponseFormat(GeneratedColumn, 'column')
  });
  if (result.choices[0].message.refusal) throw new Error(result.choices[0].message.refusal);

  const column = result.choices[0].message?.parsed as z.infer<typeof GeneratedColumn>;
  console.log(JSON.stringify(column, null, 2));

  const formattedDate = today();
  if (!process.env.DISABLE_IMAGE_GENERATION) {
    await generateImage(column.text + column.conclusion, formattedDate);
  }

  if (!safeResponse(column.text) || !safeResponse(column.conclusion)) throw new Error(`unsafe content found: ${column}`);

  const item = {
    title: column.title,
    text: column.text.replaceAll(/(\r?\n)+/g, '<br />'),
    conclusion: column.conclusion.replaceAll(/(\r?\n)+/g, '<br />'),
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
          text: `${formattedDate}の豆香の豆知識`
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
          text: column.text
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: column.conclusion
        }
      },
      {
        type: 'image',
        alt_text: '豆香コラム画像',
        image_url: `https://image.mamezou-tech.com/mameka/${formattedDate}-daily-column-300.webp`
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
  const promptSuggestion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `output image generation **prompt** suitable for the following column written by 豆香(japanese cute girl) .
- The image should be cartoon-like.
- Include characters as well as objects whenever possible.
- Tha prompt should be in English.

# Column
${column}
`
      }
    ],
  })

  const response = await openai.images.generate({
    prompt: promptSuggestion.choices[0].message.content || column,
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
  const optimizedImage = await sharp(Buffer.from(base64Image, 'base64'))
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
