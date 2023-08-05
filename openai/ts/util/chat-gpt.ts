import { CreateChatCompletionResponse } from 'openai/api.js';
import axios from 'axios';
import openai from './openai-client.js';
import { ChatCompletionRequestMessage } from 'openai';

type Request = {
  userId?: string;
  messages: ChatCompletionRequestMessage[];
  temperature?: number;
  maxTokens?: number;
}

export type ErrorDetail = {
  type: string;
  message: string;
  param: string;
  code: string;
}

export class OpenAIServerError extends Error {
  constructor(readonly detail: ErrorDetail) {
    super(detail.message);
  }
}

export async function ask(request: Request): Promise<CreateChatCompletionResponse> {
  try {
    console.time("Chat API")
    if (process.env.DEBUG) console.log('sending...', request.messages);
    const resp = await openai.createChatCompletion({
      model: 'gpt-4',
      user: request.userId,
      messages: request.messages,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.7
    });
    if (process.env.DEBUG) console.log('result', resp);
    console.timeEnd("Chat API")
    console.log(`課金トークン消費量: ${JSON.stringify(resp.data.usage)}`);
    return resp.data;
  } catch (e) {
    // if (process.env.DEBUG) console.log('error', e);
    if (axios.default.isAxiosError(e)) {
      if (e.response) {
        if (e.response.data.error) {
          throw new OpenAIServerError(e.response.data.error);
        } else {
          console.log(e.response.data);
          throw new Error('Unknown Error');
        }
      } else {
        console.log(e.message);
        throw new Error('Client Error');
      }
    }
    throw e;
  }
}