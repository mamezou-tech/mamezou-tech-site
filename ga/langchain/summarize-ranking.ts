import { PromptTemplate } from 'langchain/prompts';
import { OpenAI } from 'langchain/llms/openai';
import { LLMChain } from 'langchain/chains';

const modelName = 'gpt-4-0613';

type Rank = {
  title: string,
  user: number,
}

export async function summarizeRanking(latestRanking: Rank[], preRanking: Rank[]) {
  try {
    const makeEntry = (rank: Rank, index: number) => `${index + 1}. ${rank.title}: ${rank.user}`;
    const latest = latestRanking.slice(0, 20).map(makeEntry).join('\n');
    const pre = preRanking.slice(0, 20).map(makeEntry).join('\n');

    const template = new PromptTemplate({
      template: `技術ブログ記事の最新とその前のアクセスランキングは以下の状況でした。
結果を要約してください。

- 最新ランキング(記事タイトル: 獲得ユーザー数)
{latest}

- 前日のランキング(記事タイトル: 獲得ユーザー数)
{pre}

コメントは以下の制約条件を守ってください。
- コメントを元気な感じで出力
- AI Chatの一人称は「豆香」を使う
- AI Chatは美少女キャラクターとして話す
- 上位だけでなく新着や下位の記事も取り上げる`,
      inputVariables: ['latest', 'pre']
    });
    const model = new OpenAI({ temperature: 1.0, modelName });
    const chain = new LLMChain({
      llm: model,
      prompt: template
    });
    const resp = await chain.call({
      latest, pre
    });

    return resp.text || '';
  } catch (e) {
    console.error(e);
    return '';
  }

}