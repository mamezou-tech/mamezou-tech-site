import openai from './openai-config.js';
import * as fs from 'fs';
import { CreateChatCompletionResponse } from 'openai/api.js';
import { fileURLToPath } from 'url';
import * as path from 'path';
import prompt from './prompt.js';
import { AxiosError } from 'axios';

const [fileName] = process.argv.slice(2);
if (!fileName) throw new Error('fileName must be specified');
const content = fs.readFileSync(resolveTarget(fileName));

const resp = await ask({
  prompt: prompt.review,
  content: `\`${content.toString('utf-8')}\`{language="markdown"}`
});

console.log(`課金トークン消費量: ${JSON.stringify(resp.usage)}`);
const [choice] = resp.choices;
console.log('*'.repeat(30));
console.log(choice.message?.content);
console.log('*'.repeat(30));
if (choice.finish_reason !== 'stop') {
  console.log(`最後まで回答できませんでした: ${choice.finish_reason}`);
}

async function ask({ prompt, content }: { prompt: string, content: string }): Promise<CreateChatCompletionResponse> {
  function isAxiosError(e: any): e is AxiosError {
    return ('isAxiosError' in e);
  }

  try {
    const resp = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      // max_tokens: 4097,
      messages: [{
        role: 'system',
        content: `${prompt}\n\n${content.slice(0, 1000)}`
      }]
    });
    return resp.data;
  } catch (e) {
    if (isAxiosError(e)) {
      if (e.response) {
        console.log(e.response.data);
        throw new Error('Server Error');
      } else {
        console.log(e.message);
        throw new Error('Client Error');
      }
    }
    throw e;
  }
}

function resolveTarget(target: string): string {
  if (fs.existsSync(target)) return target;

  const current = path.dirname(fileURLToPath(import.meta.url));
  let normalized = path.resolve(current, '..', target);
  if (fs.existsSync(normalized)) return normalized;

  throw new Error(`${target} not found... `);
}

