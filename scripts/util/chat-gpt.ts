import openai from './openai-client.js';
import OpenAI from 'openai';

type Request = {
  userId?: string;
  messages: OpenAI.ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: OpenAI.ChatCompletionCreateParams.ResponseFormat['type']
}

export async function ask(request: Request): Promise<OpenAI.ChatCompletion> {
  try {
    console.time('Chat API');
    if (process.env.DEBUG) console.log('sending...', request.messages);
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      user: request.userId,
      messages: request.messages,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.7,
      response_format: {
        type: request.responseFormat ?? 'text'
      }
    });
    if (process.env.DEBUG) console.log('result', resp);
    console.timeEnd('Chat API');
    console.log(`課金トークン消費量: ${JSON.stringify(resp.usage)}`);
    return resp;
  } catch (e) {
    if (e instanceof OpenAI.APIError) {
      console.log(e.code, e.type, e.message);
    }
    throw e;
  }
}