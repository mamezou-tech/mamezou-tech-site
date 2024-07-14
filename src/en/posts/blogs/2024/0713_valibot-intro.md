---
title: 'Valibot: Ultra-Lightweight & Type-Safe Schema Validation Library'
author: noboru-kudo
date: 2024-07-13T00:00:00.000Z
tags:
  - valibot
  - typescript
  - zod
image: true
translate: true
---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/07/13/valibot-intro/).
:::

When performing data validation in JavaScript, especially in TypeScript projects, libraries like [Zod](https://zod.dev/) and [Yup](https://github.com/jquense/yup) are often used. This time, I will introduce a library called [Valibot](https://valibot.dev/), which has recently been gaining attention as an alternative to these.

## What is Valibot?

Valibot is a schema library for validating structured data.

The [official documentation](https://valibot.dev/guides/introduction/) describes its features as follows:

> - Fully type safe with static type inference
> - Small bundle size starting at less than 600 bytes
> - Validate everything from strings to complex objects
> - Open source and fully tested with 100 % coverage
> - Many transformation and validation actions included
> - Well structured source code without dependencies
> - Minimal, readable and well thought out API

At first glance, its functionality appears almost identical to the current de facto (in my opinion) library Zod, but Valibot focuses on modular design, achieving significant reductions in bundle size.

Looking at Valibot's source code, you will notice that each function is exported independently. This allows the bundler's tree shaking to work effectively. In simple cases, it can reduce the bundle size by more than 90% compared to Zod. This mechanism is explained in detail in the following blog:

- [This technique makes Valibot’s bundle size 10x smaller than Zod’s!](https://www.builder.io/blog/valibot-bundle-size)

Valibot is a very new library, having been released for about a year. At this point, it does not match major libraries like Zod and Yup in terms of popularity and ecosystem. However, lightweight libraries are becoming increasingly valuable not only in front-end environments like browsers but also in back-end environments due to the spread of edge/serverless environments. Given this background, Valibot is expected to catch up with these libraries soon.

From an ecosystem perspective, even at this stage, it supports a wide range of libraries, from form validation libraries for frameworks like React, Vue, and Svelte to back-end libraries like NestJS and DrizzleORM. This support is expected to increase further in the future.

- [Valibot Doc - Ecosystem](https://valibot.dev/guides/ecosystem/)

## Defining Basic Schemas

First, let's look at the basic schemas. In addition to primitive types and object/array types, TypeScript's type system supports Union and Intersect types.

Here are some frequently used examples:

```typescript
import * as v from 'valibot';

// Primitives
const StringSchema = v.string();
const StringSchemaWithMessage = v.string('It’s a string!');
const NumberSchema = v.number();
const UndefinedSchema = v.undefined();

// Object: {name: string, birthday: Date, score: number}
const ObjectSchema = v.object({
  name: v.string(),
  birthday: v.date(),
  score: v.number()
});
// Array: Array<number>
const ArraySchema = v.array(v.number());
// Record: Record<string, {title: string, content: string}>
const RecordSchema = v.record(
  v.string(),
  v.object({ title: v.string(), content: v.string() })
);
// string | null | undefined
const NullishSchema = v.nullish(v.string());
// string | undefined
const OptionalSchema = v.optional(v.string());
// { name: string } & { address: string }
const IntersectSchema = v.intersect([
  v.object({ name: v.string() }),
  v.object({ address: v.string() })
]);
// 'ready' | 'running' | 'complete'
const UnionSchema = v.union([
  v.literal('ready'),
  v.literal('running'),
  v.literal('complete')
]);
```

You can change the default message by specifying a validation error message as the first argument.

Like Zod, schemas can be used directly as types, so there is no need to define a separate type. To generate a type from a schema, use [InferOutput](https://valibot.dev/api/InferOutput/) [^1].

[^1]: InferOutput represents the type after transformation. Although it may not be used often, use [InferInput](https://valibot.dev/api/InferInput/) for the type before transformation. For details, refer to the [official documentation](https://valibot.dev/guides/infer-types/).

```typescript
const User = v.object({
  name: v.string(),
  birthday: v.date(),
  score: v.number()
});

// for zod
// type User = z.infer<typeof User>;
type User = v.InferOutput<typeof User>;

const user: User = {
  name: 'Mamezou Taro',
  birthday: new Date(2000, 0, 1),
  score: 10
};
```

## Building Pipelines

Next, add validation checks and data transformation processes to the previously defined schema. In Valibot, these checks and transformations are called Actions.

In Zod, this is achieved using method chaining, but in Valibot, you build a pipeline using [pipe](https://valibot.dev/api/pipe/) (up to 20 actions, including basic schemas).

- [Valibot Doc - Pipelines](https://valibot.dev/guides/pipelines/)

Here is an example from the official documentation:

```typescript
import * as v from 'valibot';

const EmailSchema = v.pipe(
  v.string(),
  v.trim(),
  v.email(),
  v.endsWith('@example.com')
);
```
The above defines the following constraints for email:
1. [string](https://valibot.dev/api/string/): String type (basic schema)
2. [trim](https://valibot.dev/api/trim/): Trim transformation
3. [email](https://valibot.dev/api/email/): Check for email format
4. [endsWith](https://valibot.dev/api/endsWith/): Check that the domain is `@example.com`

The first argument must be a basic schema (primitive, object, etc.). Specifying an action as the first argument will result in a type error.

There are many built-in actions [^2], but if these do not meet your needs, you can create custom actions using [check](https://valibot.dev/api/check/) or [transform](https://valibot.dev/api/transform/). Here is an example of their use.

[^2]: Refer to the [API reference](https://valibot.dev/api/) for built-in actions.

```typescript
function checkEmpNumber(value: string): boolean {
  console.log("Implementing custom check", value);
  return true;
}
function format(value: string): string {
  return 'mz-' + value;
}
const EmpNumber = v.pipe(
  v.string(), 
  v.check(checkEmpNumber), 
  v.transform(format)
);
```

A common use case for validation is checking the correlation between multiple fields. This can also be easily achieved using custom actions. Here is an example of correlation checks:

```typescript
const Item = v.pipe(
  // Schema: Basic schema
  v.object({
    kind: v.union([ v.literal('Gift'), v.literal('Meat'), v.literal('Fish') ]),
    price: v.optional(v.number())
  }),
  // Action: Correlation check
  v.check(item => {
    switch (item.kind) {
      case 'Meat':
        return (item.price ?? 0) > 1000;
      case 'Gift':
        return item.price === undefined || item.price === 0
      default:
        return true;
    }
  })
);
```

A custom check is added to the pipeline following the object-type schema.

:::column:Creating Asynchronous Actions
Custom actions often require asynchronous processing, such as accessing databases or external resources. In such cases, use the asynchronous versions of the API ([checkAsync](https://valibot.dev/api/checkAsync/)/[transformAsync](https://valibot.dev/api/transformAsync/)).

```typescript
async function checkEmpNumber(value: string): Promise<boolean> {
  console.log("Implementing custom check", value);
  return true;
}
async function format(value: string): Promise<string> {
  return 'mz-' + value;
}
const EmpNumber = v.pipeAsync(
  v.string(), 
  v.checkAsync(checkEmpNumber), 
  v.transformAsync(format)
);
```

Use the asynchronous version of [pipeAsync](https://valibot.dev/api/pipeAsync/) for the pipeline.
:::

## Parsing Data

Apply unknown data, such as user input, to the schema. Here, various validations and transformations defined in the schema are executed.

- [Valibot Doc - Parse data](https://valibot.dev/guides/parse-data/)

The basic API is [parse](https://valibot.dev/api/parse/) (use [parseAsync](https://valibot.dev/api/parseAsync/) for asynchronous schemas). If successful, it returns the transformed data; if it fails, it throws an exception (ValiError).

```typescript
const Email = v.pipe(
  v.string(),
  v.trim(),
  v.email(),
  v.endsWith('@example.com')
);

const User = v.object({
  name: v.string(),
  email: Email
});

try {
  const email = v.parse(User, { email: 'mame' });
} catch (e) {
  if (v.isValiError(e)) {
    console.log(e.issues);
  } else {
    throw e;
  }
}
```

The `issues` property of ValiError contains the error details. You can use this to display messages to the user or perform other processing.

Since the above example parses invalid data, an exception is thrown. The console output is as follows:

```
[
  {
    "kind": "schema",
    "type": "string",
    "expected": "string",
    "received": "undefined",
    "message": "Invalid type: Expected string but received undefined",
    "path": [
      {
        "type": "object",
        "origin": "value",
        "input": {
          "email": "mame"
        },
        "key": "name"
      }
    ]
  },
  {
    "kind": "validation",
    "type": "email",
    "input": "mame",
    "expected": null,
    "received": "\"mame\"",
    "message": "Invalid email: Received \"mame\"",
    "requirement": {},
    "path": [
      {
        "type": "object",
        "origin": "value",
        "input": {
          "email": "mame"
        },
        "key": "email",
        "value": "mame"
      }
    ]
  },
  {
    "kind": "validation",
    "type": "ends_with",
    "input": "mame",
    "expected": "\"@example.com\"",
    "received": "\"mame\"",
    "message": "Invalid end: Expected \"@example.com\" but received \"mame\"",
    "requirement": "@example.com",
    "path": [
      {
        "type": "object",
        "origin": "value",
        "input": {
          "email": "mame"
        },
        "key": "email",
        "value": "mame"
      }
    ]
  }
]
```
It shows that errors occurred in three checks: missing name (name:string), invalid format (email:email), and invalid domain (email:ends_with) (refer to the `path` property for the error location). For detailed specifications of validation errors, refer to the official documentation.

- [Valibot Doc - Issues](https://valibot.dev/guides/issues/)

By default, all checks are executed even if an error occurs midway, and all errors are accumulated. To stop validation on the first failure, specify the third argument (options) for parse.

```typescript
// Stop validation on failure -> only name:string error
const email = v.parse(User, { email: 'mame' }, { abortEarly: true });

// Stop only the pipeline on failure -> 2 errors: name:string + email
const email = v.parse(User, { email: 'mame' }, { abortPipeEarly: true });
```

So far, we have used parse to catch validation errors with a try-catch block, but there is also [safeParse](https://valibot.dev/api/safeParse/) (use [safeParseAsync](https://valibot.dev/api/safeParseAsync/) for the asynchronous version), which does not throw exceptions.

Using safeParse, the code looks like this:

```typescript
const result = v.safeParse(User, { email: 'mame' });
if (result.success) {
  console.log('success!', result.output) // InferOutput<typeof User> type
} else {
  console.log('error!', JSON.stringify(result.issues, null, 2));
}
```

With safeParse, the return value is an object representing the success or failure of the parse (`SafeParseResult`). Determine success or failure with the `success` property, and if successful, get the output result from the `output` property, similar to parse. On failure, the error details can be referenced from the `issues` property, similar to `ValiError`.

Which one to use is a matter of preference and can be decided for each project.

:::column:Using Type Guards (is) for Schema Conformance Checks
As a special use case for schemas, [is](https://valibot.dev/api/is/) is also available for type guards. Here is how to use it.

```typescript
// Type guard: true
const input = { name: 'Mamezou', email: 'mame@example.com' };
// Type guard: false
// const input = { email: 'mame' };
if (v.is(User, input)) {
  console.log('success!', input.name, input.email)
} else {
  console.log('no user!')
}
```

If the data conforms to the schema, you can retrieve information from the data according to the schema within the if statement. Note that the output type for parse/safeParse was `InferOutput<typeof User>`, but for type guards (is), it is `InferInput<typeof User>` because it is not a parse.

Also, the limitation of type guards (is) is that you cannot obtain the details of validation errors. It is limited to cases where you only need to execute some processing if the data conforms to the schema, but in such cases, using is makes the code more straightforward.
:::

## Summary

Using Valibot, you will notice that despite its small bundle size, it offers a wealth of features. Validation has numerous use cases, regardless of whether it is on the front-end or back-end. Valibot seems to be easily applicable anywhere, and I would like to make good use of it.
