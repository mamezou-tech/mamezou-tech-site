import openai from "./openai-client.mjs";

export class OpenAIServerError extends Error {
  constructor(detail) {
    super(detail.message);
  }
}

export async function ask(request) {
  try {
    console.time("Chat API")
    if (process.env.DEBUG) console.log("sending...", request.messages);
    const resp = await openai.createChatCompletion({
      model: "gpt-4",
      messages: request.messages,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.7
    });
    if (process.env.DEBUG) console.log("result", resp);
    console.timeEnd("Chat API")
    console.log(`課金トークン消費量: ${JSON.stringify(resp.data.usage)}`);
    return resp.data;
  } catch (e) {
    // if (process.env.DEBUG) console.log('error', e);
    if (e.response) {
      if (e.response.data.error) {
        throw new OpenAIServerError(e.response.data.error);
      } else {
        console.log(e.response.data);
        throw new Error("Unknown Error");
      }
    }
    throw e;
  }
}