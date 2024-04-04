---
title: Introduction to Nuxt3 (Part 6) - Handling Errors in Applications
author: noboru-kudo
date: 2022-10-19T00:00:00.000Z
tags:
  - SSG
  - SSR
prevPage: ./src/posts/nuxt3/nuxt3-app-configuration.md
nextPage: ./src/posts/nuxt3/nuxt3-plugin-middleware.md
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](/nuxt/nuxt3-error-handling).
:::



In the [previous article](/nuxt/nuxt3-app-configuration/), we looked at managing configuration information in Nuxt3.

This time, the theme is error handling, which is essential for practical applications.
Nuxt is a hybrid framework that supports not only client-side but also server-side rendering.
Therefore, appropriate handling is required for errors that occur.

- [Nuxt3 Documentation - Error handling](https://nuxt.com/docs/getting-started/error-handling)

## Errors in Vue Components

There are many places where errors can occur in Vue components, such as during rendering, lifecycle methods, setup, etc.
While feature-specific error handling will involve try/catch or Promise, here we'll look at mechanisms provided by Vue/Nuxt as a framework.

### onErrorCaptured

Although not in Nuxt, Vue provides the [onErrorCaptured](https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured) event hook.
This is a hook called when an uncaught error occurs in a subcomponent[^1].

[^1]: It's important to note that onErrorCaptured targets nested subcomponents and is not called for errors occurring within the component itself.

For example, let's say an error occurs in the mounted of a subcomponent.
The page component's source code would look like this:

```html
<script setup lang="ts">
const message = ref('');

onErrorCaptured((err) => {
  console.log('onErrorCaptured', err);
  message.value = err.message;
})
</script>

<template>
  <div>
    <p>{{ message }}</p>
    <FlakyComponent />
  </div>
</template>
```

The error-prone subcomponent (FlakyComponent) is as follows:

```html
<script setup lang="ts">
onMounted(() => {
  throw createError('An error occurred in FlakyComponent!');
})
</script>
<template>
  <div>Subcomponent</div>
</template>
```

[createError](https://nuxt.com/docs/api/utils/create-error) used in the subcomponent is a utility provided by Nuxt3.

Executing this will cause an error in the mounted of the subcomponent.
This error is captured by the onErrorCaptured hook, and the error message is displayed.

![onErrorCaptured](https://i.gyazo.com/141a82bac19258a27ad72966106f24b7.png)

Note that the callback function specified in onErrorCaptured does not return anything, so if there are higher-level event hooks, they will also be executed.
Returning false from the callback function can stop this error handling propagation.

Here, the mounted that caused the error is a Vue lifecycle event that is executed only on the client side.
What happens if an error occurs in the setup that is also executed on the server side?

The subcomponent (FlakyComponent) would be as follows.
```html
<script setup lang="ts">
throw createError('An error occurred in FlakyComponent!');
</script>
<template>
  <div>Subcomponent</div>
</template>
```

Executing this will result in the following:

![ssr error](https://i.gyazo.com/3980e5ff713788b0c42be7462c1b882d.png)

Instead of displaying a fallback message, it transitions to an error page.
Here, the onErrorCaptured callback function is also executed on the server side. However, Nuxt considers it a critical error when an error occurs during server-side rendering and returns a dedicated error page (500 error)[^2].

[^2]: In the case of pre-rendering, an error occurs during the generate process, and no HTML page is generated.

Thus, when an uncaught error occurs during server-side execution, care must be taken as using onErrorCaptured may lead to unintended results[^3].

[^3]: Returning false as the return value of the onErrorCaptured callback function can prevent the error page display.

:::column:Catching Errors Globally
onErrorCaptured is called when an uncaught error occurs in a subcomponent.
Since it does not target errors in the component itself, it might be considered a challenging hook to use.

However, there are many cases where you want to detect uncaught errors globally, such as using an error report system.
In these cases, Vue's errorHandler is used.

Creating the following plugin in the `plugins` directory will execute the specified function when an uncaught error occurs.

```typescript
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (err, context) => {
    console.log("vue based error handler", err, context)
  }
})
```

However, the errors that can be caught here are only related to Vue, and not all errors can be detected.
For example, errors within the callback functions of setTimeout/setInterval are not detected.
To detect all errors, it is necessary to also use hooks for the Window [error](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event) event, etc.

For detecting critical errors that occur at the startup of a Nuxt application, use the `app:error` event hook. For more details, refer to Nuxt's [official documentation](https://nuxt.com/docs/getting-started/error-handling/#server-and-client-startup-errors-ssr--spa).
:::

### NuxtErrorBoundary Component

Although limited to the client side, [NuxtErrorBoundary](https://nuxt.com/docs/api/components/nuxt-error-boundary) can be used to easily localize the impact of errors when they occur.
As can be seen from the [source code](https://github.com/nuxt/framework/blob/main/packages/nuxt/src/app/components/nuxt-error-boundary.ts), NuxtErrorBoundary is a Nuxt utility component that uses the previously mentioned onErrorCaptured hook to monitor errors occurring in subcomponents.

```html
<script>
const log = (err) => console.log(err)
</script>

<template>
  <div>
    <NuxtErrorBoundary @error="log">
      <!-- default slot -->
      <FlakyComponent />
      <!-- fallback -->
      <template #error="{ error }">
        An error occurred.
        {{ error }}
      </template>
    </NuxtErrorBoundary>
  </div>
</template>
```

NuxtErrorBoundary specifies the target component in the default slot and the fallback content in the named slot (error) when an error occurs[^5].

[^5]: For slots, refer to Vue's [documentation](https://vuejs.org/guide/components/slots.html).

Note that during hydration, fallback execution is controlled to not occur. Therefore, it does not respond to errors that occur in the target component's mounted, etc.
Also, during fallback, propagation to higher-level error handlers does not occur, so it will not be detected by global error handlers.

### API Access Errors

In Nuxt3, [useFetch](https://nuxt.com/docs/api/composables/use-fetch)/[useAsyncData](https://nuxt.com/docs/api/composables/use-async-data) Composable is often used for API access.
Let's also look at error handling in this regard.

useFetch/useAsyncData itself does not throw exceptions, so even if you try to handle them with try-await/catch, the catch clause will not be executed.
They return an `error` as part of their return value, which needs to be received.

An example of error handling in the template is as follows:

```html
<script setup lang="ts">
const { data: articles, error } = await useFetch('/api/blogs');
// If using useAsyncData
// const { data: articles, error } = await useAsyncData(() => $fetch('/api/blogs'));
</script>
<template>
  <div>Subcomponent</div>
  <div v-if="articles">
    <p>Success</p>
    {{ articles }}
  </div>
  <div v-else-if="error">
    <p>An error occurred</p>
  </div>
</template>
```

Note that `error` contains error details on the server side, but after client-side hydration, it becomes a boolean type (true in case of error).
This is Nuxt's security consideration to not inadvertently expose error details to the client side.
If you want to retain error details (such as status codes) on the client side, you need to implement a separate state retention mechanism[^6].

[^6]: This issue is discussed [here](https://github.com/nuxt/framework/issues/2122) on GitHub, so those interested may refer to it.

## Creating a Custom Error Page

Nuxt displays a dedicated error page when an error occurs during server-side execution or when a critical error occurs on the client side.
Of course, this error page can be customized.

- [Nuxt3 Documentation - Rendering an Error Page](https://nuxt.com/docs/getting-started/error-handling/#rendering-an-error-page)

To create a custom error page, simply create an `error.vue` at the root of the project.
It would look something like this:

```html
<script setup lang="ts">
import { NuxtApp } from "#app";

const props = defineProps<{ error: NuxtApp["payload"]["error"] }>();
const handleError = () => clearError({redirect: '/'})
const isDev = process.dev;
</script>

<template>
  <p>An error occurred</p>
  <button @click="handleError">Return to the homepage</button>
  <div v-if="isDev">
    {{ error }}
  </div>
</template>
```

The error page is a regular Vue component.
It receives the `error` containing the error details as props. Here, the error details are displayed only in development mode (`npm run dev`).

In the example above, a "Return to the homepage" button is placed on the error page, and its event handler calls Nuxt's utility [clearError](https://nuxt.com/docs/api/utils/clear-error).
This function clears the error internally held by the Nuxt application (NuxtApp.payload.error).
Specifying the redirect destination (here, the homepage) as an argument allows for a return to the normal page after clearing.

:::column:Displaying the Error Page on the Client Side
Throwing an exception on the client side by default results in a non-critical error, and the error page is not displayed.
To explicitly display the error page, use the utility function [showError](https://nuxt.com/docs/api/utils/show-error).
Alternatively, specifying fatal as true in the arguments when throwing an exception using [createError](https://nuxt.com/docs/api/utils/create-error) will display the error page[^7].

```typescript
// Programmatically display the error page
const moveError = () => {
  showError('An error occurred in FlakyComponent!')
}
// Specify fatal:true when generating an error
onMounted(() => {
  throw createError({ message: 'An error occurred in FlakyComponent!', fatal: true });
})
```

[^7]: As of the current version (rc.11), it did not work in development mode (`npm run dev`). After building (`npm run build`), it transitioned to the error page.
:::

## Summary

Here, we looked at error handling provided by Nuxt3.
Not only Nuxt but also using what is provided by Vue, we aim to create robust and debuggable applications.

Next time, we plan to look at plugin/middleware development.
