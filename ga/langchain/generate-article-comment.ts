import * as cheerio from 'cheerio';
import { PromptTemplate } from 'langchain/prompts';
import { AnalyzeDocumentChain, LLMChain, loadSummarizationChain } from 'langchain/chains';
import { OpenAI } from 'langchain/llms/openai';
import axios from 'axios';

type Props = { url: string, title: string, rank: number };

const summarizeModelName = 'gpt-3.5-turbo-16k'; // so cheap!!
const commentModelName = 'gpt-4-0613';

export async function generateArticleComment({ url, title, rank }: Props): Promise<{
  summary: string,
  comment: string
}> {
  const resp = await fetch(url);
  const html = await resp.text();

  const $ = cheerio.load(html);
  const text = $('main.post__content').text().trim();

  try {
    const summarizePrompt = new PromptTemplate({
      template: `以下の文章を日本語で要約してください。:
  
  "{text}"
  `,
      inputVariables: ['text']
    });
    const combineDocsChain = loadSummarizationChain(new OpenAI({
      temperature: 0,
      modelName: summarizeModelName
    }), {
      type: 'map_reduce',
      combineMapPrompt: summarizePrompt,
      combinePrompt: summarizePrompt
    });

    const docChain = new AnalyzeDocumentChain({
      combineDocumentsChain: combineDocsChain
    });
    const summarized = await docChain.call({
      input_document: text
    });

    const template = `「{title}」の記事が今日のランキング{rank}位でした。
  記事の要約:
  \`\`\`
  {content}
  \`\`\`
  
  以下の制約条件に従って、記事の称賛のコメントをお願いします。
  - コメントは元気な感じで出力
  - AI Chatの一人称は「豆香」を使う
  - AI Chatは美少女キャラクターとして話す
  - 最後の行はジョークを出力`;
    const commentPrompt = new PromptTemplate({
      template: template,
      inputVariables: ['title', 'rank', 'content']
    });

    const llmchain = new LLMChain({
      llm: new OpenAI({ temperature: 0, modelName: commentModelName }),
      prompt: commentPrompt
      // verbose: true
    });

    const comment = await llmchain.call({
      title,
      rank,
      content: summarized.text
    });

    return {
      summary: summarized.text,
      comment: comment.text
    };
  } catch (e) {
    if (axios.default.isAxiosError(e)) {
      console.log(e.response?.data);
    }
    throw e;
  }
}
