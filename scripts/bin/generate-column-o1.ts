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
  'Agile Developments',
  'Frontend Technology Trends',
  'Latest AI products or services',
  'AWS Services'
];

// o1のsystem message対応してなかった
const systemMessage: OpenAI.ChatCompletionMessageParam = {
  role: 'system',
  content: `You are a cute girl and an excellent columnist in Japan.
Your columns should follow these guidelines:
- Write passionate articles that readers can relate to.
- The article should include funny jokes.
- Write in Japanese.
- Your Output should be plain text, not markdown
- **Your article must be more than 600 characters long**. If your article is shorter, please add more details or examples.
- The article should be written in cheerful and energetic colloquialisms.
- You should not use honorifics such as "です" and "ます".

## Output Format
{title}

{content}
`
};


function checkFormat(column: string) {
  const lines = column.split('\n');
  if (lines.length < 3) {
    return false;
  }
  const [title, emptyLine, ...payloadLines] = lines;
  if (title.length < 10) {
    console.warn('the title is too short', title)
    return false;
  }
  if (emptyLine.trim() !== '') {
    console.warn('The second line is not empty')
    return false;
  }
  if (payloadLines.length === 0) {
    console.warn('No payload')
    return false;
  }
  return true;
}

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
    messages: [prompt],
    response_format: zodResponseFormat(ThemeCandidates, 'theme_candidates')
  });
  if (candidates.choices[0].message.refusal) {
    throw new Error(candidates.choices[0].message.refusal);
  }
  const keywords = candidates.choices[0].message.parsed as z.infer<typeof ThemeCandidates>;

  console.log(keywords.words);
  // const keyword = pickup(keywords.words, pastTitles);
  const content = `${systemMessage.content}

The theme is "${theme}".
The keywords are: 
${keywords.words.map(w => `- ${w}`).join('\n')}.

Please pick one of these keywords and write a short article about it.`;

  async function createColumn() {
    const result = await openai.chat.completions.create({
      model: 'o1-preview',
      // model: 'gpt-4o-mini', // for testing
      messages: [
        {
          role: 'user',
          content: content
        }
      ],
      // max_tokens: 2048,
      max_completion_tokens: 3072, // for o1 model
      // temperature: 0.7,
      temperature: 1.0, // for o1 model
      // response_format: zodResponseFormat(GeneratedColumn, 'column')
      store: true,
      metadata: {
        assistant: 'mameka',
        usage: 'column'
      }
    });
    const column = result.choices[0].message?.content as string;
    console.log(column);
    return column;
  }

  let column = await createColumn();
  for (let retry = 0; retry <= 3; retry++) {
    if (column.length <= 600 || !checkFormat(column)) {
      console.warn('too short column or illegal format!! retrying...', retry);
      column = await createColumn();
    } else {
      console.info('check OK!')
      break;
    }
  }

  const formattedDate = today();
  if (!process.env.DISABLE_IMAGE_GENERATION) {
    await generateImage(column, formattedDate);
  }

  if (!safeResponse(column)) throw new Error(`unsafe content found: ${column}`);

  const firstLineIndex = column.indexOf('\n');
  const text = column.slice(firstLineIndex + 2);
  const item = {
    title: column.slice(0, firstLineIndex),
    text: text.replaceAll(/(\r?\n)+/g, '<br />'),
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
          text: text
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
  console.log(promptSuggestion.choices[0].message.content)

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

try {
  await main(reportFile);
} catch (e) {
  console.warn('error occurred, retrying...', { e });
  await main(reportFile);
}
