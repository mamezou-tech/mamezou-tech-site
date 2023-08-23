import { parseArticle } from '../util/parse-article.js';
import openai from '../util/openai-client.js';

const [fileName] = process.argv.slice(2);
if (!fileName) throw new Error('fileName must be specified');
const article = parseArticle(fileName);

console.log(`generating image for ${article.attributes.title}`);

const resp = await openai.images.generate({
  size: '256x256',
  prompt: article.attributes.title,
  response_format: 'url',
  n: 3
});

console.log(resp.data);
