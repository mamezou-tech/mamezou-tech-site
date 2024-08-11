---
title: Defining AI Output Schemas Using OpenAI's Structured Outputs
author: noboru-kudo
date: 2024-08-10T00:00:00.000Z
tags:
  - OpenAI
  - GPT
  - typescript
  - zod
image: true
translate: true
---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/08/10/openai-structured-output-intro/).
:::

Recently, OpenAI released a feature called Structured Outputs.

- [OpenAI Blog - Introducing Structured Outputs in the API](https://openai.com/index/introducing-structured-outputs-in-the-api/)

Structured Outputs is a feature that enforces structured output, as its name suggests. Previously, there was a parameter to return responses from AI in JSON format (by specifying `json_object` in `response_format`). However, this required specifying a concrete JSON structure in the prompt, and the JSON response might not always be as expected, necessitating additional implementations like validation and retries. The newly released Structured Outputs enforce AI to generate responses according to a schema by specifying a [JSON schema](https://json-schema.org/) in a dedicated parameter instead of the prompt.

- [OpenAI Doc - Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs/introduction)

I tried out this feature and would like to introduce it briefly here. As a sample topic, I will create a simple quiz generation feature.

Structured Outputs can be used with both response formats and [Function calling](https://platform.openai.com/docs/guides/function-calling), but here I will use the response format. Function calling is discussed in a column, so please refer to that.

## Setup

Here, we will implement using Node.js and TypeScript. Create any directory and set up an NPM project.

```shell
npm init -f
npm install openai zod @inquirer/prompts typescript tsx
npx tsc --init
```

In addition to the OpenAI library, we install [Zod](https://zod.dev/) for schema generation and [@inquirer/prompts](https://www.npmjs.com/package/@inquirer/prompts) for quiz prompt input. We are using the latest `4.55.1` version of the [OpenAI Node library](https://github.com/openai/openai-node) at this time. Structured Outputs are available from `4.55.0` onwards.

Note that since it's not the main topic, the TypeScript-related setup methods are omitted[^1].

[^1]: I changed to ESM here because I wanted to use Top-level await (set `type` to `module` in package.json, `target` to `ESNext`, and `module` to `NodeNext` in tsconfig.json).

## Defining Structure with JSON Schema

This method is not recommended but is fundamental to understanding Structured Outputs.

The source code will look like this:

```typescript:jsonschema.ts
import OpenAI from 'openai';
import { input } from '@inquirer/prompts';

const client = new OpenAI();

// JSON Schema
const schema = {
  type: 'object',
  properties: {
    question: {
      type: 'string'
    },
    choices: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          num: {
            type: 'number',
            description: 'Sequential number starting from 1'
          },
          answer: {
            type: 'string'
          }
        },
        required: [
          'num',
          'answer'
        ],
        additionalProperties: false
      }
    },
    correct_num: {
      type: 'number'
    },
    score: {
      type: 'number',
      description: '1 to 10 based on difficulty'
    }
  },
  required: [
    'question',
    'choices',
    'correct_num',
    'score'
  ],
  additionalProperties: false
};
// Execute API with parse instead of create (beta)
const completion = await client.beta.chat.completions.parse({
  model: 'gpt-4o-2024-08-06', // Supports models like gpt-4o-mini, gpt-4o-2024-08-06 onwards
  messages: [
    { role: 'user', content: 'Give me a difficult question!' }
  ],
  response_format: {
    // Enable Structured Output
    type: 'json_schema',
    json_schema: {
      name: 'quiz',
      strict: true,
      schema,
    }
  }
});

// Retrieve parsed response according to JSON schema
const quiz = completion.choices[0].message.parsed as any;

// Start quiz
const message = `${quiz.question}
${quiz.choices.map((choice: any) => `${choice.num}:${choice.answer}`).join('\n')}
`;
const answer = await input({ message: message });
if (answer === quiz.correct_num.toString()) {
  console.log(`Correct!! You got ${quiz.score} points!!`);
} else {
  console.log(`Too bad!! The correct answer was ${quiz.correct_num}!!`);
}
```

In the above, the JSON structure for the response is first defined using a [JSON schema](https://json-schema.org/). Then, the OpenAI Chat Completion API is executed. The API used here is the newly introduced parse (still in beta) instead of the traditional create[^2].

[^2]: Structured Outputs can also be used with the traditional create, but you need to parse the response (content) string yourself.

At this time, set the `response_format` property of the parameter as follows:

- Specify `json_schema` (JSON schema) for `type`
- Specify `true` (follow the schema) for `strict`
- Specify the predefined JSON schema for `schema`

Using the new API parse, the AI response is obtained from parsed instead of the traditional content (no need for JSON.parse). This object adheres to the JSON schema, so no need for structure checks, etc.

Execute this script.

```shell
npx tsx jsonschema.ts
```

The quiz game will start as follows.

```
? You need to disarm a time bomb. Which of the following is the appropriate first step?
1: Cut the blue wire
2: Cut the red wire
3: Turn off the bomb's power supply
4: Advance the timer by 2 minutes
5: Press the button on the digital display
 3
Correct!! You got 8 points!!
```

:::column:Structured Outputs Schema is a Subset of JSON Schema
The schema that can be specified for Structured Outputs is a subset of JSON Schema, and not all specifications can be used. For example, there are restrictions like the following that you might mistakenly overlook:

- All fields are required (`required`)
- `additionalProperties` must be set to false
- Constraints like `minLength`, `maxLength`, etc., cannot be specified

If these constraints are violated, an error will occur when executing the API. Details are described in the official documentation below (there are workarounds for some).

- [OpenAI Doc - Structured Outputs - Supported schemas](https://platform.openai.com/docs/guides/structured-outputs/supported-schemas)
:::

:::column:Violation of OpenAI Policy
Although not verified, if a request violates OpenAI's policy, a response adhering to the schema will not be returned even with Structured Outputs. According to the official documentation, in this case, the `refusal` property of the response will be set.

- [OpenAI Doc - Structured Outputs - Refusals with Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs/refusals)

In the sample code in this article, this check is not performed, but in actual operation, it seems necessary to check `refusal` before using the response.

```typescript
if (completion.choices[0].message.refusal) {
  throw new Error(completion.choices[0].message.refusal); // Policy violation
}
const quiz = completion.choices[0].message.parsed as any;
```
:::

:::column:Using Structured Outputs with Function Calling
To use Structured Outputs with Function Calling, specify `strict: true` along with the schema of the function arguments.

```typescript
const completion = await client.beta.chat.completions.parse({
  model: 'gpt-4o-2024-08-06',
  messages: [
    { role: 'user', content: 'call sampleFunc！' }
  ],
  tools: [{
    type: 'function',
    function: {
      name: 'sampleFunc',
      strict: true, // Enforce argument generation according to schema
      parameters: schema
    }
  }]
});

// Returned in accordance with JSON schema
const args = completion.choices[0].message.tool_calls?.[0].function.parsed_arguments as any;
```
Of course, the schema specified here must also comply with the constraints of Structured Outputs, just like the response format (`response_format`).
:::

## Defining Structure with Zod Schema

For those familiar with TypeScript, many might be using schema libraries like [Zod](https://zod.dev/). From version `4.55.0` of the official OpenAI Node library, helpers for Zod schema have been provided.

- [GitHub - openai-node Structured Outputs Parsing Helpers](https://github.com/openai/openai-node/blob/master/helpers.md)

By using this, you can implement it simply and fully utilize TypeScript's type system.

Let's rewrite the previous code using the Zod schema.

```typescript
import OpenAI from 'openai';
import z from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { input } from '@inquirer/prompts';

const client = new OpenAI();

// Zod Schema
const schema = z.object({
  question: z.string(),
  choices: z.array(z.object({
    num: z.number().describe('Sequential number starting from 1'),
    answer: z.string()
  })),
  correct_num: z.number(),
  score: z.number().describe('1 to 10 based on difficulty')
});
const completion = await client.beta.chat.completions.parse({
  model: 'gpt-4o-2024-08-06',
  messages: [
    { role: 'user', content: 'Give me a difficult question!' }
  ],
  // Enable Structured Output
  response_format: zodResponseFormat(schema, 'quiz')
});

// Get the parsed response with Zod schema (can use z.infer<typeof schema>)
type Quiz = z.infer<typeof schema>;
const quiz = completion.choices[0].message.parsed as Quiz;

// Start quiz
const message = `${quiz.question}
${quiz.choices.map((choice: Quiz["choices"][number]) => `${choice.num}:${choice.answer}`).join('\n')}
`;
const answer = await input({ message });

if (answer === quiz.correct_num.toString()) {
  console.log(`Correct!! You got ${quiz.score} points!!`);
} else {
  console.log(`Too bad!! The correct answer was ${quiz.correct_num}!!`);
}
```

`zodResponseFormat` is the helper function. This function converts the Zod schema into the aforementioned JSON schema. The output of the AI will follow the Zod schema, allowing you to use casting with `z.infer<typeof schema>`. Subsequent property access is smooth with IDE's auto-completion. If you're using the Node library, you should definitely use this.

:::column:Using Zod Schema with Function Calling
For Function Calling, a `zodFunction` utility is also provided for Zod schema. The source code in this case will be as follows.

```typescript
const completion = await client.beta.chat.completions.parse({
  model: 'gpt-4o-2024-08-06',
  messages: [
    { role: 'user', content: 'Give me a difficult question!' }
  ],
  tools: [ zodFunction({ name: 'sampleFunc', parameters: schema }) ]
});

// Returned in accordance with JSON schema
const args = completion.choices[0].message.tool_calls[0].function.parsed_arguments as z.infer<typeof schema>;
```
:::

:::column:Using Pydantic to Create JSON Schema
When using Structured Outputs with Python, [Pydantic](https://docs.pydantic.dev/latest/) can be used to define schemas.

Below is the code of this sample rewritten in Python.

```python
import openai
from openai import OpenAI
from pydantic import BaseModel, Field
from typing import List

client = OpenAI()


class Choice(BaseModel):
    num: int = Field(description="Sequential number starting from 1")
    answer: str


class Quiz(BaseModel):
    question: str
    choices: List[Choice]
    correct_num: int
    score: int = Field(description="1 to 10 based on difficulty")


completion = client.beta.chat.completions.parse(
    model="gpt-4o-2024-08-06",
    messages=[{
        "role": "user",
        "content": "Give me a difficult question!"
    }],
    response_format=Quiz
    # For Function calling
    # tools=[openai.pydantic_function_tool(Quiz)]
)

response = completion.choices[0].message.parsed
# For Function Calling
# response = (completion.choices[0].message.tool_calls or [])[0].function.parsed_arguments
assert isinstance(response, Quiz)
print(response)
# question='Which of the following events occurred in BC?' choices=[Choice(num=1, answer='Burning of the Library of Alexandria'), Choice(num=2, answer='Issuance of the Code of Hammurabi'), Choice(num=3, answer='East-West division of the Roman Empire'), Choice(num=4, answer='Columbus discovers the New World')] correct_num=2 score=9
```

The basic flow is the same as when using Zod. The response output structure defined with Pydantic is specified in the API (parse).

The helpers for the Python library are summarized below.

- [GitHub - openai-python Structured Outputs Parsing Helpers](https://github.com/openai/openai-python/blob/main/helpers.md)
:::

## Summary

Structured Outputs seem to become the standard choice when integrating AI into applications. There are various uses, so I would like to use it effectively.
