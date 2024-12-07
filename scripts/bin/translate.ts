import { ask } from '../util/chat.js';
import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { retrieveTarget } from './retrieve-translate-target.js';
import OpenAI from 'openai';

const English = {
  language: 'English',
  dir: 'en'
};
// not yet impl
const Chinese = {
  language: 'Chinese',
  dir: 'zh-CN'
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

const baseDir = path.dirname(process.cwd());

function separateMd(result: string) {
  const frontMatterEnd = result.indexOf('---', 2);

  if (frontMatterEnd === -1) {
    throw new Error('Front matter not found in the file:' + result.slice(0, 300));
  }
  const frontMatter = result.slice(0, frontMatterEnd);
  console.info(frontMatter);
  const payload = result.slice(frontMatterEnd + 4);
  return { frontMatter, payload };
}

function updateMd(translated: string, originalFrontMatter: string) {
  const { frontMatter: translatedFrontMatter, payload } = separateMd(translated);
  const frontMatterYaml: any = yaml.load(originalFrontMatter);
  frontMatterYaml.translate = true;
  console.log(translatedFrontMatter)
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

async function chat(text: string, option: { language: string; dir: string }) {
  const replies = [];
  const request = {
    messages: [{
      role: 'user',
      content: makeMessage(text, option.language)
    }],
    // temperature: 0,
    // maxTokens: 8192 * 2,
    model: 'o1-preview-2024-09-12'
  } satisfies Parameters<typeof ask>[number];

  const response = await ask(request);
  console.log('finish_reason', response.choices[0].finish_reason, response.usage);
  replies.push(response.choices[0].message.content);
  if (response.choices[0].finish_reason === 'length') {
    async function retry(prevMessage: OpenAI.ChatCompletionMessageParam, times = 0) {
      console.info('retrying...', times);
      const retryResp = await ask({
        ...request,
        messages: [
          ...(request.messages),
          prevMessage,
          // {
          //   role: 'user',
          //   content: 'continue'
          // }
        ]
      });
      replies.push(retryResp.choices[0].message.content);
      if (retryResp.choices[0].finish_reason === 'length') {
        return await retry(retryResp.choices[0].message, times + 1);
      }
      return
    }
    await retry(response.choices[0].message, 1)
  }
  return replies.join();
}

async function translate({ filePath, originalLink }: { filePath: string, originalLink: string },
                         option: { language: string, dir: string }) {
  console.info('processing...', filePath, originalLink);
  const text = (await fsPromises.readFile(filePath)).toString('utf-8');
  const { frontMatter: originalFrontMatter } = separateMd(text);
  const result = await chat(text, option);
  if (!result) throw new Error('no response');
  const match = filePath.match(/.*\/src\/(?<dir>.*)/);
  if (!match?.groups?.dir) throw new Error('no dir for ' + filePath);

  const updatedMd = updateMd(result, originalFrontMatter);
  const newFilePath = `${baseDir}/src/${option.dir}/${match.groups.dir}`;
  await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
  await fsPromises.writeFile(newFilePath, updatedMd);
}

const [lang, filePath, originalUrlPath] = process.argv.slice(2);
const targetLang = English;
if (!filePath || !originalUrlPath) {
  const targets = await retrieveTarget();
  const failed = [];
  const succeeded = [];
  for (const target of targets) {
    try {
      if (fs.existsSync(`${baseDir}/src/${targetLang.dir}${target.path}`)) {
        console.info(`${target.path} has already translated(skip)`);
        continue;
      }
      await translate({
        filePath: `${baseDir}/src${target.path}`,
        originalLink: target.link
      }, targetLang);
      succeeded.push(target);
    } catch (e) {
      console.error('failed...', target, { e });
      failed.push({ ...target, message: (e as Error).message });
    }
  }
  await fsPromises.writeFile('translated.json', JSON.stringify({ succeeded, failed }, null, 2));
} else {
  await translate({
    filePath,
    originalLink: originalUrlPath
  }, targetLang);
}
console.info('DONE!');
