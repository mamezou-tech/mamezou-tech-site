import OpenAI from 'openai';
import { ask } from '../util/chat-gpt.js';
import fs, { promises as fsPromises } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { retrieveTarget } from './retrieve-translate-target.js';

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
  return `Translate Japanese articles into ${language}.
The following should not be translated.

- Source code (but translate comments)
- Names of books included in the article
- \`tags\` in Front Matter section
- HTML tags (like video,script). These tags should output as is.

Also, do not output anything other than the translated text.

Header part (known as Front Matter) included in markdown should be output.
However, the title should be translated.

- \`豆蔵\` is translated to Mamezou.
- \`title\` in Front Matter section must not be included \`:\`
 
Articles to be translated are as follows.

${text}
`;
};

const makeNote = (path: string) => `
:::alert
This article has been automatically translated.
The original article is [here](${path}).
:::
`;

const baseDir = path.dirname(process.cwd());

function updateFrontMatter(text: string) {
  const frontMatter: any = yaml.load(text);
  frontMatter.translate = true;
  return yaml.dump(frontMatter);
}

function updateMd(result: string, originalUrlPath: string) {
  const frontMatterEnd = result.indexOf('---', 2);

  if (frontMatterEnd === -1) {
    throw new Error('Front matter not found in the file');
  }
  const frontMatterText = result.slice(0, frontMatterEnd);
  console.info(frontMatterText);
  const payload = result.slice(frontMatterEnd + 4);
  const updatedFrontMatter = updateFrontMatter(frontMatterText);

  return `---
${updatedFrontMatter}
---
${makeNote(originalUrlPath)}

${payload}
`;
}

async function translate({ filePath, originalLink }: { filePath: string, originalLink: string },
                         option: { language: string, dir: string }) {
  console.info('processing...', filePath, originalLink);
  const text = await fsPromises.readFile(filePath);
  const response = await ask({
    messages: [{
      role: 'user',
      content: makeMessage(text.toString('utf-8'), option.language)
    }],
    temperature: 0.4,
    maxTokens: 4096
  });
  const result = response.choices[0].message.content;
  if (!result) throw new Error('no response');
  const match = filePath.match(/.*\/src\/(?<dir>.*)/);
  if (!match?.groups?.dir) throw new Error('no dir for ' + filePath);

  const updatedMd = updateMd(result, originalLink);
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
  for (const target of targets.slice(3)) {
    try {
      if (fs.existsSync(`${baseDir}/src/${targetLang.dir}${target.path}`)) {
        console.info(`${target.path} has already translated(skip)`)
        continue;
      }
      await translate({
        filePath: `${baseDir}/src${target.path}`,
        originalLink: target.link
      }, targetLang);
      succeeded.push(target);
    } catch (e) {
      console.error('failed...', target, { e });
      failed.push(target);
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