import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as path from 'path';
import promptMessage from './prompt-message.js';
import { ask } from './chat-gpt.js';

const [fileName] = process.argv.slice(2);
if (!fileName) throw new Error('fileName must be specified');
const content = fs.readFileSync(resolveTarget(fileName));

const resp = await ask({
  message: {
    content: `${promptMessage.review}\n\n\`${content.toString('utf-8').slice(0, 1000)}\`{language="markdown"}`,
    role: 'system'
  }
});

const [choice] = resp.choices;
console.log('*'.repeat(30));
console.log(choice.message?.content);
console.log('*'.repeat(30));
if (choice.finish_reason !== 'stop') {
  console.log(`最後まで回答できませんでした: ${choice.finish_reason}`);
}

function resolveTarget(target: string): string {
  if (fs.existsSync(target)) return target;

  const current = path.dirname(fileURLToPath(import.meta.url));
  let normalized = path.resolve(current, '..', target);
  if (fs.existsSync(normalized)) return normalized;

  throw new Error(`${target} not found... `);
}

