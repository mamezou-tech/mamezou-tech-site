import { config } from '../config.js';
import { ask } from '../util/chat-gpt.js';
import { ArticleAttributes, parseArticle } from '../util/parse-article.js';
import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from 'openai';
import { FrontMatterResult } from 'front-matter';

async function lint(content: FrontMatterResult<ArticleAttributes>) {
  const rows = content.body.split(/\r?\n/).filter(r => !!r);
  const chunkSize = config.lintArticle.chunkSize;
  const page = Math.trunc(rows.length / chunkSize);
  if (rows.length > chunkSize) {
    console.log(`量が多いので${chunkSize}行単位に分割してチェックします... / 全${page}ページ`);
  }
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize).join('\n');
    console.log(`${'*'.repeat(10)} 対象行: ${i + 1} ~ ${i + chunkSize} ${'*'.repeat(10)}`);
    const resp = await request(chunk, config.lintArticle.maxTokens);
    console.log(resp.choices[0].message?.content);
  }
  console.log('DONE!!');
}

async function request(content: string, maxTokens: number): Promise<CreateChatCompletionResponse> {
  const systemMessage: ChatCompletionRequestMessage = {
    content: '日本語を話すレビューアーとして会話してください',
    role: 'system'
  };
  const userMessage: ChatCompletionRequestMessage = {
    content: `${config.lintArticle.prompt}
    
${content}
`,
    role: 'user'
  };

  return await ask({
    temperature: config.lintArticle.temperature,
    maxTokens: maxTokens,
    messages: [systemMessage, userMessage]
  });
}

const [fileName] = process.argv.slice(2);
if (!fileName) throw new Error('fileName must be specified');
await lint(parseArticle(fileName));
