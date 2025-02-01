import yaml from "js-yaml";
import { retrieveTarget } from "./retrieve-translate-target.ts";
import OpenAI from "@openai/openai";
import { dirname } from "@std/path";
import { existsSync } from "@std/fs";
import { writeFile } from "@opensrc/jsonfile";
import { APIError } from "@openai/openai";
import openai from "../util/openai-client.ts";

const English = {
  language: "English",
  dir: "en",
};
// not yet impl
const Chinese = {
  language: "Chinese",
  dir: "zh-CN",
};

const makeMessage = (text: string, language: string) => {
  return `Translate the following Japanese markdown article into ${language}.

Please follow these instructions:

- For the front matter (YAML between \`---\` and \`---\`):
  - Translate only the \`title\` field into English.
  - Wrap the translated title in double quotes \`"..."\` to prevent YAML syntax errors, especially if it contains special characters like \`:\`.
  - Leave all other fields in the front matter unchanged.
  - **Do not wrap the front matter in code blocks or add any additional formatting. Output it exactly as \`---\`, followed by the YAML content, and ending with \`---\`.**
- In the main body of the article:
  - Translate all Japanese text into English.
  - Do not translate source code (but do translate comments within the code).
  - Do not translate names of books mentioned in the article.
  - Do not translate HTML tags like \`<video>\` or \`<script>\`; output them as they are.
  - Do not translate image links or URLs.
- Do not output anything other than the translated text.

Here are specific translation rules:

- Translate \`豆蔵\` as \`Mamezou\`.

### Important Instructions:
- **Translate the entire article without summarizing or skipping any sections.** Do not output phrases like "The rest of the article continues" or "Summary of the remaining content."
- If the article is long, **continue outputting all content until the very end**. Do not truncate, skip, or summarize any part of the article.
- **Your response must be the full translated content as is**, including all text, code comments, and other elements present in the article.

Please translate the following article:

${text}
`;
};

const baseDir = dirname(Deno.cwd());

function separateMd(result: string) {
  const frontMatterEnd = result.indexOf("---", 2);

  if (frontMatterEnd === -1) {
    throw new Error(
      "Front matter not found in the file:" + result.slice(0, 300),
    );
  }
  const frontMatter = result.slice(0, frontMatterEnd);
  console.info(frontMatter);
  const payload = result.slice(frontMatterEnd + 4);
  return { frontMatter, payload };
}

function updateMd(translated: string, originalFrontMatter: string) {
  const { frontMatter: translatedFrontMatter, payload } = separateMd(
    translated,
  );
  const frontMatterYaml: any = yaml.load(originalFrontMatter);
  frontMatterYaml.translate = true;
  console.log(translatedFrontMatter);
  const translatedYaml = yaml.load(translatedFrontMatter) as any;
  console.log(translatedYaml);
  frontMatterYaml.title = translatedYaml.title;
  const finalFrontMatter = yaml.dump(frontMatterYaml);

  return `---
${finalFrontMatter}
---
${payload}
`;
}

type Request = {
  userId?: string;
  messages: OpenAI.ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "text" | "json_object";
  model?: string;
};
const debug = !!Deno.env.get("DEBUG");
export async function requestTranslate(
  request: Request,
): Promise<OpenAI.ChatCompletion> {
  try {
    console.time("Chat API");
    if (debug) console.log("sending...", request.messages);
    const resp = await openai.chat.completions.create({
      model: request.model ?? "gpt-4o-mini",
      user: request.userId,
      messages: request.messages,
      // max_tokens: request.maxTokens,
      // temperature: request.temperature ?? 0.7,
      response_format: {
        type: request.responseFormat ?? "text",
      },
    });
    if (debug) console.log("result", resp);
    console.timeEnd("Chat API");
    console.log(`課金トークン消費量: ${JSON.stringify(resp.usage)}`);
    return resp;
  } catch (e) {
    if (e instanceof APIError) {
      console.log(e.code, e.type, e.message);
    }
    throw e;
  }
}
async function chat(text: string, option: { language: string; dir: string }) {
  async function continueTranslation(
    prevMessage: OpenAI.ChatCompletionMessageParam,
    times = 0,
  ) {
    console.info("retrying...", times);
    const retryResp = await requestTranslate({
      ...request,
      messages: [
        ...(request.messages),
        prevMessage,
      ],
    });
    replies.push(retryResp.choices[0].message.content);
    if (retryResp.choices[0].finish_reason === "length") {
      return await continueTranslation(retryResp.choices[0].message, times + 1);
    }
    return;
  }
  const replies = [];
  const request = {
    messages: [{
      role: "user",
      content: makeMessage(text, option.language),
    }],
    // temperature: 0,
    // maxTokens: 8192 * 2,
    model: "o3-mini",
    // model: "gpt-4o-mini", // for testing
  } satisfies Parameters<typeof requestTranslate>[number];

  const response = await requestTranslate(request);
  console.log(
    "finish_reason",
    response.choices[0].finish_reason,
    response.usage,
  );
  replies.push(response.choices[0].message.content);
  if (response.choices[0].finish_reason === "length") {
    await continueTranslation(response.choices[0].message, 1);
  }
  return replies.join();
}

async function translate(
  { filePath, originalLink }: { filePath: string; originalLink: string },
  option: { language: string; dir: string },
) {
  console.info("processing...", filePath, originalLink);
  const text = await Deno.readTextFile(filePath);
  const { frontMatter: originalFrontMatter } = separateMd(text);
  const result = await chat(text, option);
  if (!result) throw new Error("no response");
  const match = filePath.match(/.*\/src\/(?<dir>.*)/);
  if (!match?.groups?.dir) throw new Error("no dir for " + filePath);

  const updatedMd = updateMd(result, originalFrontMatter);
  const newFilePath = `${baseDir}/src/${option.dir}/${match.groups.dir}`;
  await Deno.mkdir(dirname(newFilePath), { recursive: true });
  await Deno.writeTextFile(newFilePath, updatedMd);
}

const [lang, filePath, originalUrlPath] = process.argv.slice(2);
const targetLang = English;
if (!filePath || !originalUrlPath) {
  const targets = await retrieveTarget();
  const failed = [];
  const succeeded = [];
  for (const target of targets) {
    try {
      if (existsSync(`${baseDir}/src/${targetLang.dir}${target.path}`)) {
        console.info(`${target.path} has already translated(skip)`);
        continue;
      }
      await translate({
        filePath: `${baseDir}/src${target.path}`,
        originalLink: target.link,
      }, targetLang);
      succeeded.push(target);
    } catch (e) {
      console.error("failed...", target, { e });
      failed.push({ ...target, message: (e as Error).message });
    }
  }
  await writeFile(
    "translated.json",
    { succeeded, failed },
    { spaces: 2 },
  );
} else {
  await translate({
    filePath,
    originalLink: originalUrlPath,
  }, targetLang);
}
console.info("DONE!");
