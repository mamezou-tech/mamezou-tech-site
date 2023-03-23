import { CreateChatCompletionResponse } from 'openai/api.js';
import { AxiosError } from 'axios';
import openai from './openai-config.js';

type Request = {
  userId?: string
  message: Message | Message[]
}

export type Message = {
  content: string;
  role: 'system' | 'user' | 'assistant';
}

export async function ask(request: Request): Promise<CreateChatCompletionResponse> {
  function isAxiosError(e: any): e is AxiosError {
    return ('isAxiosError' in e);
  }

  try {
    const resp = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      // max_tokens: 4097,
      user: request.userId,
      messages: Array.isArray(request.message) ? request.message : [request.message]
    });
    console.log(`課金トークン消費量: ${JSON.stringify(resp.data.usage)}`);
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