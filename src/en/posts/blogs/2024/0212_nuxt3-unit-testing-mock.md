---
title: Nuxt3 - Unit Testing Part 2 - Using Utilities for Mocks and Stubs
author: noboru-kudo
date: 2024-02-12T00:00:00.000Z
tags: [nuxt, vue, テスト]
image: true
translate: true
---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/02/12/nuxt3-unit-testing-mock/).
:::



In the [previous article](/blogs/2024/02/07/nuxt3-unit-testing-mount/), we looked at the following content as a method of unit testing Nuxt3.

- Setting up Nuxt's test utilities (@nuxt/test-utils)
- Writing tests by mounting Nuxt components on a test Nuxt environment

In this second part, we would like to take a look at the functionality related to mocks and stubs provided by the test utilities.

:::info
We will not go into detail about Vitest's mock functionality itself here.
Although it's a bit old, the following article introduces an overview of Vitest:

- [Trying out Vitest, a fast testing framework based on Vite](/blogs/2022/12/28/vitest-intro/)

The above article does not touch much on mocks, but the basic usage is the same as Jest.
Jest's mocks are introduced in the following article:

- [Re-introduction to Jest - Function & Module Mock Edition](/testing/jest/jest-mock/)
:::

## Mocking Composables (mockNuxtImport)

- [Nuxt Doc - mockNuxtImport](https://nuxt.com/docs/getting-started/testing#mocknuxtimport)

This feature is probably the most frequently used.
One of the representative features of Nuxt3 is [auto-import](https://nuxt.com/docs/guide/concepts/auto-imports).
This allows you to use composables placed in the composables directory without importing them, in addition to Nuxt/Vue's core APIs.
This makes the product code concise, so I think many projects using Nuxt adopt it.
This is easily mocked with mockNuxtImport.

Here, we consider the case of mocking Nuxt's provided composable [useRoute](https://nuxt.com/docs/api/composables/use-route).
The product code to be tested is as follows:

```html
<script setup lang="ts">
const route = useRoute();
</script>

<template>
  <div v-if="route.params.id">{{ route.params.id }}</div>
</template>
```

This is a page that displays the path parameter (id) by accessing the Vue Router's Route.
Mocking useRoute with mockNuxtImport would look like this:

```typescript
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import testPage from '~/pages/route/[id].vue';

mockNuxtImport('useRoute', () => () => ({
  params: {
    id: '999'
  }
}));

test('using mockNuxtImport', async () => {
  const wrapper = await mountSuspended(testPage);
  expect(wrapper.get('div').text()).toBe('999');
});
```

You describe mockNuxtImport at the top level of the test file.
The first argument is the composable to be mocked for auto-import. If you use [vi.mock](https://vitest.dev/api/vi.html#vi-mock), you need to specify the path of the composable (in this example, `#app/composables/router`), but this conversion is done by mockNuxtImport.

The second argument is the mock's Factory function. Since the useRoute to be mocked is a function, the factory function described here also needs to return a function.

As described in the column, mockNuxtImport has no actual API and operates as a macro (Vite plugin), and the source code is rewritten to [vi.mock](https://vitest.dev/api/vi.html#vi-mock).
Therefore, like vi.mock, it is **hoisted (moved) to the top of the file**. Even if you place multiple mockNuxtImports for each test (test function), it will be overwritten by the last one.
Here is a quote from the [vi.mock documentation](https://vitest.dev/api/vi.html#vi-mock):

> vi.mock is hoisted (in other words, moved) to the top of the file. It means that whenever you write it (be it inside beforeEach or test), it will actually be called before that.

However, it is natural to want to change the behavior of the mock for each test.
Although it is mentioned in the test utility documentation, in such cases, you initialize the mock using [vi.hoisted](https://vitest.dev/api/vi.html#vi-hoisted-0-31-0).

Below is a sample that describes the behavior of the mock for each test using vi.hoisted:

```typescript
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import testPage from '~/pages/route/[id].vue';

// Hoisted (initialized) together with mockNuxtImport(vi.mock) (no initialization error occurs)
const { mockRoute } = vi.hoisted(() => ({
  mockRoute: vi.fn()
}));

// This will fail (not hoisted)
// -> ReferenceError: mockRoute is not defined
// const mockRoute = vi.fn();

// Converted to vi.mock so it is hoisted
mockNuxtImport('useRoute', () => mockRoute);

afterEach(() => {
  mockRoute.mockReset();
})

test('id=999', async () => {
  mockRoute.mockReturnValue({
    params: {
      id: '999'
    }
  })
  const wrapper = await mountSuspended(testPage);
  expect(wrapper.get('div').text()).toBe('999');
});

test('id=undefined', async () => {
  mockRoute.mockReturnValue({
    params: {
      id: undefined
    }
  })
  const wrapper = await mountSuspended(testPage);
  expect(wrapper.find('div').exists()).toBe(false);
});
```

vi.hoisted is hoisted together with vi.mock, so there is no reference error (simply declaring at the top level would not be hoisted and would result in a reference error).
Using this feature, you initialize the mock with vi.hoisted (vi.fn) and return it in the Factory function of vi.mock.
Then, you just describe the behavior of the mock according to each test (of course, you should clean up with afterEach, etc., as the mock is shared among tests).

For more details on Vitest's vi.mock/vi.hoisted hoisting, the following articles are very well organized.
If you want to know the internal mechanism, please read them (we also referred to them quite a bit in this article).

- [Zenn blog - About ESM mock hoisting problem and Vitest's vi.hoisted](https://zenn.dev/ptna/articles/617b0884f6af0e)
- [Zenn blog - Vitest's vi.mock is hoisted](https://zenn.dev/you_5805/articles/vitest-mock-hoisting)

:::column:Conversion content of mockNuxtImport macro
As mentioned earlier, mockNuxtImport is a macro and does not have an actual API.
When we looked into the actual behavior, the code was rewritten as follows:

```typescript
vi.hoisted(() => {
  if (!globalThis.__NUXT_VITEST_MOCKS) {
    vi.stubGlobal('__NUXT_VITEST_MOCKS', {});
  }
});
vi.mock('#app/composables/router', async (importOriginal) => {
  const mocks = globalThis.__NUXT_VITEST_MOCKS;
  if (!mocks['#app/composables/router']) {
    mocks['#app/composables/router'] = { ...await importOriginal('#app/composables/router') };
  }
  mocks['#app/composables/router']['useRoute'] = await (() => () => ({
    params: {
      id: '999'
    }
  }))();
  return mocks['#app/composables/router'];
});
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import testPage from '~/pages/route/[id].vue';
```

It is converted into quite a lot of code, but the important part is that it is converted to Vitest's [vi.mock](https://vitest.dev/api/vi.html#vi-mock).
To put it more simply, it might look something like this:

```typescript
vi.mock('#app/composables/router', async (importOriginal) => {
  return {
    ...await importOriginal<typeof import('#app/composables/router')>(),
    useRoute: () => ({
      params: {
        id: '999'
      }
    })
  };
});
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import testPage from '~/pages/route/[id].vue';
```
In other words, the mockNuxtImport macro is just obtaining the path of the composable being auto-imported and mocking the specified part with vi.mock's Factory function.
It's simple once you understand the principle.
:::

## Stubbing Subcomponents (mockComponent)

- [Nuxt Doc - mockComponent](https://nuxt.com/docs/getting-started/testing#mockcomponent)

This provides a stub for the component under test (though it's called mockComponent, the concept of a stub seems closer).
Let's say you have the following button component:

```html
<script setup lang="ts">
  const { data: foo } = await useFetch('/api/foo');
</script>

<template>
  <button v-if="foo">{{ foo.name }}</button>
</template>
```

This is a custom component that fetches the button name from an API and renders the button.

The page component that uses this might look like this:
```html
<script setup lang="ts">
  const counter = ref(0);
</script>

<template>
  <MyButton @click="counter++" />
  <div>{{ counter }}</div>
</template>
```

Let's write a unit test for this page as the test subject.
Here, you might want to stub the button component because it depends on the API with useFetch.

Using mockComponent provided by Nuxt's test utilities, it would look like this:

```typescript
import testPage from '~/pages/mocks/comp-mock.vue';
import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime';

mockComponent('MyButton',  {
  template: '<button>stub button</button>'
});

test('using mockComponent', async () => {
  const wrapper = await mountSuspended(testPage);

  await wrapper.get('button').trigger('click');
  expect(wrapper.get('div').text()).toBe('1');
});
```

You place mockComponent at the top level of the file. In the above, the first argument is the component name (relative path is also possible), and the second argument defines the stub component (external file import is also possible).
Like mockNuxtImport, mockComponent is also converted to vi.mock, so it is hoisted to the top of the file by Vitest. Therefore, placing one at the top level is the rule.

When you run the above test, the MyButton component is replaced with a stub, and no API call is made.


:::column:Using Vue Test Utils' Stub Functionality
Although we introduced the stub functionality of Nuxt's test utilities here, Vue Test Utils also has stub functionality.

- [Vue Test Utils Doc - Stubs and Shallow Mount](https://test-utils.vuejs.org/guide/advanced/stubs-shallow-mount.html)

In this case, the test code would look like this:

```typescript
import testPage from '~/pages/mocks/comp-mock.vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';

test('using VTU stub', async () => {
  const wrapper = await mountSuspended(testPage, {
    global: {
      stubs: {
        MyButton: defineComponent({
          template: '<button>stub button</button>'
        })
      }
    }
  });

  await wrapper.get('button').trigger('click');
  expect(wrapper.get('div').text()).toBe('1');
});
```

It's a bit odd to say this last, but this way, it's easy to change the behavior of the stub for each test.
Since it also provides a default stub implementation, at this point, it might be better to primarily use this.
:::

:::column:Conversion content of mockComponent macro
mockComponent is also a macro, and the source code is converted by the test utility.
Actually, it was rewritten as follows:

```typescript
import { vi } from 'vitest';
vi.mock('/path/to/components/MyButton.vue', async () => {
  const factory = ({
    template: '<button>mock button</button>'
  });
  the result is typeof factory === 'function' ? await factory() : await factory;
  return 'default' in result ? result : { default: result };
});
import testPage from '~/pages/mocks/comp-mock.vue';
import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime';
```

Again, like mockNuxtImport, it is converted to vi.mock.
If we replace the Factory function with something specific to this case, it might look like this:

```typescript
import { vi } from 'vitest';
vi.mock('/path/to/MyButton.vue', () => ({
  default: {
    template: '<button>mock button</button>'
  }
}));
import testPage from '~/pages/mocks/comp-mock.vue';
import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime';
```

This will also result in a successful test.
:::

## Stubbing/Mocking APIs (registerEndpoint)

- [Nuxt Doc - registerEndpoint](https://nuxt.com/docs/getting-started/testing#registerendpoint)

Previously, we stubbed the entire component, but it's often more realistic to mock just the API calls.
Nuxt's test utilities provide the [registerEndpoint](https://nuxt.com/docs/getting-started/testing#registerendpoint) API for stubbing APIs (this has an actual API, not a macro).

Using this, the test utility provides a stub API.
The test code would look like this:

```typescript
import testPage from '~/pages/mocks/comp-mock.vue';
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime';

registerEndpoint('/api/foo', () => ({
  name: 'stub button'
}))

test('using registerEndpoint', async () => {
  const wrapper = await mountSuspended(testPage);

  await wrapper.get('button').trigger('click');
  expect(wrapper.get('div').text()).toBe('1');
});
```

This allows you to perform unit tests using the actual component while stubbing only the API.

:::column:Mocking APIs with Mock Service Worker (MSW)
registerEndpoint only provides stub functionality for APIs and cannot be used for response switching or verification purposes within the test file.
Vitest recommends using [Mock Service Worker (MSW)](https://mswjs.io/) for mocking APIs.

- [Vitest Doc - Mocking - Requests](https://vitest.dev/guide/mocking.html#requests)

When using MSW, it can be rewritten as follows:

```typescript
import testPage from '~/pages/mocks/comp-mock.vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createFetch } from 'ofetch';

const server = setupServer();

afterAll(() => {
  server.close();
});

afterEach(() => {
  server.resetHandlers();
});

test('using Mock Service Worker', async () => {
  server.use(http.get('http://localhost:3000/api/foo', () => HttpResponse.json({
    name: 'stub button'
  })));
  server.listen({ onUnhandledRequest: 'error' });
  // [Important!!] Patch for mocking $fetch (after server.listen)
  globalThis.$fetch = createFetch({ fetch: globalThis.fetch, Headers: globalThis.Headers })

  const wrapper = await mountSuspended(testPage);

  await wrapper.get('button').trigger('click');
  expect(wrapper.get('div').text()).toBe('1');
});
```

This way, you can control the response to be an error for each test or verify requests in detail.

However, as you can see from the above source code, a workaround was necessary at this point when using MSW for mocking.
This is because useFetch was not mocked by simply using MSW ($fetch was the same).
Upon investigation, there was the following issue in ofetch, which Nuxt internally uses:

- [GitHub ofetch Issue - Usage with MSW / patched fetch](https://github.com/unjs/ofetch/issues/295)

It seems that MSW's mocking is not targeted unless you use createFetch.
If you don't want to change the product code, you can mock it by overwriting $fetch after server.listen as shown above.
:::

## Summary

In two parts, we introduced how to perform unit testing using Nuxt's test utilities.

Nuxt's test utilities provide emulation of the Nuxt environment and various macros/APIs for testing.
While it's easy to focus on the functional aspects, these testing features are also important for maintaining quality. It's something we definitely want to master.

- [Nuxt3 - Unit Testing Part 1 - Setup & Mounting Components](/blogs/2024/02/07/nuxt3-unit-testing-mount/)
