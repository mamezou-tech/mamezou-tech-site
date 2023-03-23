import promptMessage from './prompt-message.js';
import { ask, Message } from './chat-gpt.js';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import inquirer from 'inquirer';
import { CreateChatCompletionResponse } from 'openai/api.js';

const [output] = process.argv.slice(2);
if (!output) throw Error('Keyword or Output not specified!!');

async function getPrompt() {
  const ans = await inquirer.prompt([{
    type: 'input',
    name: 'theme',
    message: 'テーマを入力してください'
  }]);
  return promptMessage.generateArticle.replace('$keyword', ans.theme);
}

async function makeDraft(prompt: string) {
  const userId = uuidv4();
  const resp = await ask({
    message: {
      role: 'system',
      content: prompt
    },
    userId
  });
  writeResponse(resp);
  return userId;
}

async function loop(userId: string, prompt: Message[]) {
  const ans = await inquirer.prompt([{
    type: 'input',
    name: 'ask',
    message: '(qで終了)',
    async validate(input: any): Promise<boolean | string> {
      if (!input) return "ChatGPTに依頼してください";
      return true;
    }
  }]);
  if (ans.ask === 'q') {
    process.exit(0);
    return;
  }
  const newMessages: Message[] = [...prompt, { content: ans.ask, role: 'user' }];
  const resp = await ask({
    message: newMessages,
    userId
  });
  writeResponse(resp);
  await loop(userId, newMessages);
}

function writeResponse(resp: CreateChatCompletionResponse) {
  const [choice] = resp.choices;
  const content = choice.message?.content;
  if (!content) {
    console.log(`chatGPT cannot generate response...`);
    process.exit(1);
  }
  fs.writeFileSync(output, content);
  console.log('*'.repeat(30));
  console.log(content);
  console.log('*'.repeat(30));
  console.log(`${output}に出力しました`);
  return content;
}

let prompt = await getPrompt();
const userId = await makeDraft(prompt);
await loop(userId, [{ role: 'system', content: prompt }]);
console.log(`DONE: Output -> ${output}`);