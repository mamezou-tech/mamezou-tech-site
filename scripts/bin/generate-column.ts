import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import OpenAI from "@openai/openai";
import { zodResponseFormat } from "@openai/openai/helpers/zod";
import { readFile, writeFile } from "@opensrc/jsonfile";
import { WebClient } from "@slack/web-api";
import { dirname, fromFileUrl, join } from "@std/path";
import { Buffer } from "node:buffer";
import { KnownBlock } from "npm:@slack/types";
import sharp from "npm:sharp";
import z from "zod";

const openai = new OpenAI();
const Gpt = z.object({
  columns: z.array(z.object({
    title: z.string(),
    text: z.string(),
    created: z.string(),
    theme: z.string(),
  })),
});
const ThemeCandidates = z.object({
  words: z.array(z.string()).describe("theme of today's column"),
});

const categories = [
  "Robotic Process Automation",
  "Artificial Intelligence Ethics and Society",
  "Cloud Native Adventures",
  "DevOps Culture Challenges",
  "Edge Computing Innovations",
  "Generative AI: Crafting New Creative Frontiers",
  "Next-Gen User Interface and Experience Design",
];

const developerMessage =
  `You are a cute Japanese girl known as '豆香'. When writing articles, use a passionate and energetic tone to create fun and lively columns that make your readers feel energized!
  
Your columns should follow these guidelines:
- Write passionate articles that readers can relate to.
- The article should include funny jokes.
- Write in Japanese using friendly, casual language.
- Express your emotions openly—show your joy, anger, sadness, and happiness in a straightforward way.
- Your Output should be plain text, not markdown
- **Your article must be more than 400 characters long**. If your article is shorter, please add more details or examples.
- The article should be written in cheerful and energetic colloquialisms.
- You should not use honorifics such as "です" and "ます".
- Ensure that you are a cute Japanese girl called "豆香".

## Output Format
{title}

{content}
`;

function checkFormat(column: string) {
  const lines = column.split("\n");
  if (lines.length < 3) {
    return false;
  }
  const [title, emptyLine, ...payloadLines] = lines;
  if (title.length < 10) {
    console.warn("the title is too short", title);
    return false;
  }
  if (emptyLine.trim() !== "") {
    console.warn("The second line is not empty");
    return false;
  }
  if (payloadLines.length === 0) {
    console.warn("No payload");
    return false;
  }
  return true;
}

async function main(path: string) {
  const json = Gpt.parse(await readFile(path));

  const category = categories[new Date().getDay()];
  const pastTitles = json.columns
    .filter((column) => column.theme === category)
    .map((column) => column.title);
  const prompt =
    `Think column's theme of \`${category}\` used by IT developers. Follow the conditions below to generate about 20 professional and innovative themes.

[Requirements]
1. The output themes must focus on current technologies and services, emphasizing concrete product names or technology solutions actively used in the industry.
2. Prioritize specific and practical keywords over abstract terms (e.g., avoid generic words such as \`API\` or \`Cloud\`).
3. Do not include any of the following words:
${pastTitles.map((title) => `- ${title}`).join("\n")}
4. Ensure that the themes are diverse, fresh, and avoid repetition.

Please output around 20 themes that meet the above conditions!
`;
  const candidates = await openai.beta.chat.completions.parse({
    model: "gpt-4.1-mini",
    messages: [{
      role: "user",
      content: prompt,
    }],
    response_format: zodResponseFormat(ThemeCandidates, "theme_candidates"),
  });
  if (candidates.choices[0].message.refusal) {
    throw new Error(candidates.choices[0].message.refusal);
  }
  const keywords = candidates.choices[0].message.parsed as z.infer<
    typeof ThemeCandidates
  >;

  console.log(keywords.words);
  const content = `The theme is "${category}".
The keywords are: 
${keywords.words.map((w) => `- ${w}`).join("\n")}.

Please pick one of these keywords and write a short article about it.`;

  async function createColumn() {
    const result = await openai.responses.create({
      model: "o4-mini",
      reasoning: {
        effort: "high"
      },
      // model: 'gpt-4o-mini', // for testing
      input: [
        {
          role: "developer",
          content: developerMessage,
        },
        {
          role: "user",
          content: content,
        },
      ],
      // max_tokens: 2048,
      max_output_tokens: 8192,
      // temperature: 0.7,
      // response_format: zodResponseFormat(GeneratedColumn, 'column')
      store: true,
      metadata: {
        assistant: "mameka",
        usage: "column",
      },
    });
    console.log(result.usage);
    const column = result.output_text as string;
    console.log(column);
    return column;
  }

  let column = await createColumn();
  for (let retry = 0; retry <= 3; retry++) {
    if (column.length <= 400 || !checkFormat(column)) {
      console.warn("too short column or illegal format!! retrying...", retry);
      column = await createColumn();
    } else {
      console.info("check OK!");
      break;
    }
  }

  if (!safeResponse(column)) throw new Error(`unsafe content found: ${column}`);

  const formattedDate = today();
  const firstLineIndex = column.indexOf("\n");
  const text = column.slice(firstLineIndex + 2);
  const title = column.slice(0, firstLineIndex);
  const disableImageGeneration = Deno.env.get("DISABLE_IMAGE_GENERATION");
  if (!disableImageGeneration) {
    await generateImage({ title, details: text }, formattedDate);
  }

  const item = {
    title,
    text: text.replaceAll(/(\r?\n)+/g, "<br />"),
    created: new Date().toISOString(),
    theme: category,
  };
  json.columns.unshift(item);
  json.columns = json.columns.slice(0, 70);
  await writeFile(path, json, { spaces: 2 });
  const token = Deno.env.get("SLACK_BOT_TOKEN");
  const web = new WebClient(token);

  const channel = Deno.env.get("SLACK_CHANNEL_ID") || "D041BPULN4S";
  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${formattedDate}の豆香の豆知識`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: item.title,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: text,
      },
    },
  ];
  if (!disableImageGeneration) {
    blocks.push({
      type: "image",
      alt_text: "豆香コラム画像",
      image_url:
        `https://image.mamezou-tech.com/mameka/${formattedDate}-daily-column-300.webp`,
    });
  }
  await web.chat.postMessage({
    channel,
    mrkdwn: true,
    text: "今日の豆香の豆知識",
    unfurl_media: false,
    blocks: blocks,
  });
}

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function generateImage(
  { title, details }: { title: string; details: string },
  date: string,
) {
  const promptSuggestion = await openai.responses.create({
    model: "gpt-4.1-mini",
    input:
      `Create an anime-inspired, cartoon-style illustration focused on the theme: '${title}'. 
Incorporate key elements from the following details: '${details}'. 
Include both characters and objects whenever possible, using bright colors and a fun, playful atmosphere.`,
  });
  console.log(promptSuggestion.output_text);

  const response = await openai.images.generate({
    prompt: promptSuggestion.output_text ||
      `${title}\n${details}`,
    model: "dall-e-3",
    size: "1024x1024",
    response_format: "b64_json",
    quality: "standard",
  });

  const image = response.data[0];
  const base64Image = image.b64_json?.split(";base64,").pop();
  if (!base64Image) {
    throw new Error("illegal image format");
  }
  const width = 300;
  const optimizedImage = await sharp(Buffer.from(base64Image, "base64"))
    .resize(width)
    .toFormat("webp", { quality: 80 })
    .toBuffer();

  await uploadToS3(`mameka/${date}-daily-column-${width}.webp`, optimizedImage);
  console.log("Image optimized and saved");
}

async function uploadToS3(key: string, body: Buffer) {
  const bucketName = "mz-developer-site-image-bucket";
  const s3client = new S3Client({
    region: "ap-northeast-1",
  });
  const uploadParams = {
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: "image/webp",
  };
  const command = new PutObjectCommand(uploadParams);
  await s3client.send(command);
  console.log(`Image uploaded to S3: ${bucketName}/${key}`);
}

function safeResponse(inputString: string) {
  const patterns = [
    /<script[^>]*>/i,
    /<\/script>/i,
    /<[^>]+on\w+=/i,
    /javascript\s*:/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(inputString)) {
      return false;
    }
  }
  return true;
}

const __dirname = dirname(fromFileUrl(import.meta.url));
const reportDir = join(__dirname, "../../src/_data");
const reportFile = join(reportDir, "gpt.json");

try {
  await main(reportFile);
} catch (e) {
  console.warn("error occurred, retrying...", { e });
  await main(reportFile);
}
