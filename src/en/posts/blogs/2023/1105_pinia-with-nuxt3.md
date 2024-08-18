---
title: Sharing State in Nuxt Applications with Pinia
author: noboru-kudo
date: 2023-11-05T00:00:00.000Z
tags:
  - pinia
  - nuxt
  - vue
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2023/11/05/pinia-with-nuxt3/).
:::



While it may not apply to all applications, larger-scale applications often require a centralized store that can be accessed from anywhere. This time, using Nuxt, I would like to briefly introduce how to use [Pinia](https://pinia.vuejs.org/), the recommended state management library for Vue.

## Why Pinia?

When it comes to state management libraries for [Vue](https://vuejs.org/), it used to be [Vuex](https://vuex.vuejs.org/) for a long time, but that's no longer the case. The top of the official Vuex documentation states the following:

> Pinia is now the new default
> The official state management library for Vue has changed to Pinia. Pinia has almost the exact same or enhanced API as Vuex 5, described in Vuex 5 RFC. You could simply consider Pinia as Vuex 5 with a different name. Pinia also works with Vue 2.x as well.

As you can see, Pinia is now recommended in Vue. Pinia is positioned as synonymous with Vuex v5. On the other hand, if you read the [Pinia documentation](https://pinia.vuejs.org/introduction.html#Comparison-with-Vuex), it says the following:

> Pinia started out as an exploration of what the next iteration of Vuex could look like, incorporating many ideas from core team discussions for Vuex 5. Eventually, we realized that Pinia already implements most of what we wanted in Vuex 5, and decided to make it the new recommendation instead.

In other words, Pinia was initially created to explore the specifications of Vuex v5, but it turned out that everything was already implemented in Pinia, so it was recommended instead.

## Setting Up Pinia

Nuxt provides a Nuxt module for Pinia.

- [Pinia Doc - Nuxt.js](https://pinia.vuejs.org/ssr/nuxt.html)

First, install Pinia and the Nuxt module @pinia/nuxt.

```shell
npm install pinia @pinia/nuxt
```

Then, set up the Nuxt module in `nuxt.config.ts`.

```typescript
export default defineNuxtConfig({
  devtools: {
    enabled: true
  },
  modules: [
    '@pinia/nuxt' // Setting up the Nuxt module
  ],
})
```

With this, you can use Pinia without any setup code.

## Creating a Pinia Store

Pinia is similar to Vuex but much simpler. The biggest difference is that Vuex's Mutation is gone, allowing you to directly change the state. The actual usage from a component will be described later, but you no longer need to distinguish between dispatching Actions or committing Mutations as before.

There are two types of stores in Pinia.

- [Option Stores](https://pinia.vuejs.org/core-concepts/#Option-Stores)
- [Setup Stores](https://pinia.vuejs.org/core-concepts/#Setup-Stores)

As many might guess from the names, both have a similar relationship to Vue's Option API and Composition API (setup). Option Stores are objects with state/getters/actions fields.

| Option Stores (Pinia) | Description                          | Similar Option API (Vue) |
|-----------------------|--------------------------------------|--------------------------|
| state                 | State centrally managed in the store | data                     |
| getters               | Methods that return processed state (cached) | computed                 |
| actions               | Methods that execute side-effects like data updates (can be async) | methods                  |

For those experienced with Option API, no explanation is needed.

On the other hand, Setup Stores are not objects but functions. The fields of the Option Store are replaced as follows:

| Option Stores | Corresponding Setup Stores Function |
|---------------|-------------------------------------|
| state         | ref()                               |
| getters       | computed()                          |
| actions       | Regular functions                   |

Define the store using these within the function and provide it to Pinia as the return value to offer the same functionality as Option Stores. Thus, Setup Stores are similar to writing with the setup method or script setup in the Composition API.

As for which style to use, personally, I think it's best to match the writing style of Vue components (Option API/Composition API). However, if you are transitioning from the traditional Vuex, adopting Option Stores, which have a similar writing style, might make the transition smoother[^1].

[^1]: The [Pinia documentation](https://pinia.vuejs.org/core-concepts/#What-syntax-should-I-pick-) recommends Option Stores if you're unsure.

Here, we'll implement the store for a blog article list as an example in both styles.

### Option Stores

```typescript
export const useArticlesStore = defineStore('articles', {
  state: () => ({
    articles: [] as Article[],
    username: ''
  }),
  getters: {
    authorNames: (state) => {
      return state.articles.map(article => article.author.name);
    },
    // Getter with arguments (returns a function, not cached as is)
    contentLength: (state) => {
      return (id: number) => state.articles.find(article => article.id === id)?.content.length ?? 0;
    }
  },
  actions: {
    async load() {
      this.articles = await $fetch('/api/articles');
    },
    async save(article: Omit<Article, 'id'>) {
      await $fetch('/api/articles', { method: 'post', body: article });
      await this.load();
    },
    async update(article: Article) {
      await $fetch('/api/articles', { method: 'put', body: article });
      await this.load();
    }
  }
});
```

It is similar to the existing Vuex, but as mentioned earlier, Pinia has no Mutations. Also, access to State and Actions can use `this` like Vue's Option API. There is no need for commit or dispatch as in the Vuex era. It has become very simple and intuitive.

:::column:Namespace in Pinia
Pinia does not have the term Namespace, but a similar concept is the store identifier (id). This corresponds to the first argument of defineStore used in the store definition (in this example, `articles`). This identifier is mandatory. In essence, Pinia has built-in Namespace.

Unlike Vuex's tree-like module structure, Pinia manages this identifier in a flat structure. This might be a confusing part when migrating from Vuex. Reading the official documentation beforehand will make the migration smoother.

- [Pinia Doc - Migrating from Vuex ≤4](https://pinia.vuejs.org/cookbook/migration-vuex.html)
:::

### Setup Stores
```typescript
export const useArticlesStore = defineStore('articles', () => {
  // State
  const articles = ref<Article[]>([]);
  const username = ref('')
  
  // Getters
  const authorNames = computed(() => {
    const names = articles.value.map(article => article.author.name);
    return Array.from(new Set(names));
  });
  // Getter with arguments (note that it's not cached)
  const contentLength = computed(() =>
    (id: number) => articles.value.find(article => article.id === id)?.content.length ?? 0);

  // Actions
  async function load() {
    articles.value = await $fetch('/api/articles');
  }

  async function save(article: Omit<Article, 'id'>) {
    await $fetch('/api/articles', { method: 'post', body: article });
    await load();
  }

  async function update(article: Article) {
    await $fetch('/api/articles', { method: 'put', body: article });
    await load();
  }

  return { articles, username, fetch, authorNames, contentLength, load, save, update };
});
```

The Setup Stores style is quite different from the traditional Vuex style, but for those familiar with the Composition API, this might actually be easier to implement. As mentioned earlier, it changes from an object to a function style, with each field of the Option Store replaced by ref() / computed() / function.

## Using Pinia Store from a Component

Next, let's use this store from a component. Here, we'll assume the Vue component is written using the Composition API.

First, use the store from the component.

```typescript
const store = useArticlesStore();
```

In Pinia, it is common to name the function `use<Name>Store` as when using Composable.

To get the state from Pinia, you can directly access it from the store.

```typescript
// state
console.log(store.articles[0]);
console.log(store.username);
// getters
console.log(store.authorNames);
console.log(store.contentLength(1))
```

For updates, you can directly change the state without using Mutation as in Vuex.

```typescript
store.articles[0].title = 'Getting start with Pinia';
```

Note that Pinia stores are wrapped with Vue's reactive function (like props). Therefore, if you destructure it, you need to use the [storeToRefs function](https://pinia.vuejs.org/api/modules/pinia.html#storeToRefs) to make it reactive to store changes.

```typescript
// NG: Not reactive
const { username } = store;
// OK
const { username } = storeToRefs(store);
```

The $patch method is also provided for updating multiple states at once.

```typescript
// Bulk update
// Object style
store.$patch({
  articles: store.articles.splice(0, 1),
  username: 'Mamezou Taro'
});
// Callback function style
store.$patch((state) => {
  state.articles.push({
    ...state.articles[0],
    id: state.articles[0].id + 1
  })
  state.username = 'Mamezou Hanako'
});
```

For simple cases, use the object style, and for complex cases, use the callback function style. Refer to the official documentation for details on the $patch method.

- [Pinia Doc - Mutating the state](https://pinia.vuejs.org/core-concepts/state.html#Mutating-the-state)

Executing Actions defined in the store is also the same as calling regular methods. There is no need for mapActions or dispatch methods as in Vuex.

```typescript
const article = {...}
await store.load();
await store.save(article);
await store.update(article);
```

It has become much simpler compared to the days of using plain Vuex.

## Conclusion

We introduced some basic features of state management using Pinia, which has become the de facto standard for Vue. I think you could feel that Pinia is much easier to use compared to Vuex.

That said, you can achieve similar things using Nuxt3's useState. For simple applications, this might be sufficient in many cases.

- [Nuxt Doc - State Management](https://nuxt.com/docs/getting-started/state-management)

However, the barrier to introducing Pinia feels very low. It is important to determine the right use case and actively use Pinia where it has advantages.
