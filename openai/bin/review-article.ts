import { config } from '../config.js';
import { ask, OpenAIServerError } from '../util/chat-gpt.js';
import { ArticleAttributes, parseArticle } from '../util/parse-article.js';
import { ChatCompletionRequestMessage, CreateChatCompletionResponse } from 'openai';
import { FrontMatterResult } from 'front-matter';

async function tryReview(content: FrontMatterResult<ArticleAttributes>) {
  try {
    const resp = await requestReview(content.attributes.title, content.body, config.reviewArticle.maxTokens);
    output(resp);
  } catch (e) {
    if (e instanceof OpenAIServerError) {
      switch (e.detail.code) {
        case 'context_length_exceeded': {
          const { maxTokens, limit } = config.reviewArticle.retry;
          console.log(`ChatGPTの最大長を超えました。前半${limit}行のみでレビュー依頼します。。。`);
          const excerpt = content.body.split(/\r?\n/).filter(r => !!r).slice(0, limit).join('\n');
          const resp = await requestReview(content.attributes.title, excerpt, maxTokens);
          output(resp);
          break;
        }
        default:
          throw e;
      }
    } else {
      throw e;
    }
  }
}

async function requestReview(title: string, content: string, maxTokens: number): Promise<CreateChatCompletionResponse> {
  const systemMessage: ChatCompletionRequestMessage = {
    content: 'あなたは優秀な文章ライターでエンジニアでもあります',
    role: 'system'
  };
  const userMessage: ChatCompletionRequestMessage = {
    content: `${config.reviewArticle.prompt}
# ${title}
    
${content}
`,
    role: 'user'
  };

  return await ask({
    temperature: 0.5,
    maxTokens: maxTokens,
    messages: [systemMessage, userMessage]
  });
}

function output(resp: CreateChatCompletionResponse): void {
  const [choice] = resp.choices;
  console.log('*'.repeat(30));
  console.log(choice.message?.content);
  console.log('*'.repeat(30));
  if (choice.finish_reason !== 'stop') {
    console.log(`最後まで回答できませんでした: ${choice.finish_reason}`);
  }
}

const [fileName] = process.argv.slice(2);
if (!fileName) throw new Error('fileName must be specified');
await tryReview(parseArticle(fileName));
