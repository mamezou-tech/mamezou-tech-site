import { config } from '../config.js';
import { ask } from '../util/chat-gpt.js';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import inquirer from 'inquirer';
import { CreateChatCompletionResponse } from 'openai/api.js';
import { ChatCompletionRequestMessage } from 'openai';

const systemMessage: ChatCompletionRequestMessage = {
  role: 'system',
  content: 'あなたは優秀な文章ライターでエンジニアでもあります'
};

async function getPrompt() {
  const ans = await inquirer.prompt([{
    type: 'input',
    name: 'theme',
    message: 'テーマを入力してください'
  }]);
  return config.generateArticle.prompt.replace('$keyword', ans.theme);
}

async function makeDraft(prompt: string, outputPath: string) {
  const userId = uuidv4();
  const messages: ChatCompletionRequestMessage[] = [systemMessage, {
    role: 'user',
    content: prompt
  }];
  const response = await ask({
    messages,
    userId,
    maxTokens: config.generateArticle.maxTokens,
  });
  writeResponse(response, outputPath, 0);
  return { userId, messages, response };
}

async function conversation(userId: string, prompt: ChatCompletionRequestMessage[], outputPath: string, count = 1) {
  const ans = await inquirer.prompt([{
    type: 'input',
    name: 'ask',
    message: '改善内容を会話形式で入力してください(qで終了)',
    async validate(input: any): Promise<boolean | string> {
      if (!input) return '入力してください';
      return true;
    }
  }]);
  if (ans.ask === 'q') {
    process.exit(0);
    return;
  }
  const newMessages: ChatCompletionRequestMessage[] = [...prompt, { content: ans.ask, role: 'user' }];
  const resp = await ask({
    messages: newMessages,
    userId
  });
  writeResponse(resp, outputPath, count);
  await conversation(userId, newMessages.concat(resp.choices[0].message!), outputPath, count + 1);
}

function writeResponse(resp: CreateChatCompletionResponse, outputPath: string, count: number) {
  function makePath() {
    if (count > 0) {
      const arr = outputPath.split('.');
      return `${arr.slice(0, arr.length - 1).join('.')}-${count}.${arr.slice(-1)}`;
    }
    return outputPath;
  }

  const [choice] = resp.choices;
  const content = choice.message?.content;
  if (!content) {
    console.log('ChatGPT cannot generate response...');
    process.exit(1);
  }

  const newPath = makePath();
  fs.writeFileSync(newPath, content);
  console.log('*'.repeat(30));
  console.log(content);
  console.log('*'.repeat(30));
  console.log(`>> ${newPath}に出力しました`);
  return content;
}

const [output] = process.argv.slice(2);
if (!output) throw Error('Keyword or Output not specified!!');

const prompt = await getPrompt();
const { userId, messages, response } = await makeDraft(prompt, output);
await conversation(userId, messages.concat(response.choices[0]!.message!), output);
console.log(`DONE: Output -> ${output}`);