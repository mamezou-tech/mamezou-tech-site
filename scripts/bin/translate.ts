import OpenAI from 'openai';
import { ask } from '../util/chat-gpt.js';
import { promises as fsPromises } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const openai = new OpenAI();

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
The following are not subject to translation.

- Source code (but translate comments)
- Names of books included in the article
- Author name(in front matter section)

Also, do not output anything other than the translated text.

Header part (known as Front Matter) included in markdown should be output as is.
However, the title should be translated.
 
Articles to be translated are as follows.

${text}
  `;
};

const makeNote = (path: string) => `
:::alert
This article has been automatically translated.
The original article is [here](${path}).
:::
`

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
  const payload = result.slice(frontMatterEnd);
  const updatedFrontMatter = updateFrontMatter(frontMatterText);

  return updatedFrontMatter + makeNote(originalUrlPath) + payload;
}

async function translate({ filePath, originalUrlPath }: { filePath: string, originalUrlPath: string },
                         option: { language: string, dir: string }) {
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

  const updatedMd = updateMd(result, originalUrlPath);
  const newFilePath = `${baseDir}/src/${option.dir}/${match.groups.dir}`;
  await fsPromises.mkdir(path.dirname(newFilePath), { recursive: true });
  await fsPromises.writeFile(newFilePath, updatedMd);
}

await translate({
  filePath: `${baseDir}/src/posts/nuxt3/nuxt3-rendering-mode.md`,
  originalUrlPath: '/nuxt/nuxt3-rendering-mode/'
}, English);

console.info('DONE!');