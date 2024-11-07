---
title: Introduction to Lume (Part 2) - Using JSX and MDX as Template Engines
author: noboru-kudo
date: 2023-10-13T00:00:00.000Z
prevPage: ./src/en/posts/lume/lume-intro.md
nextPage: ./src/en/posts/lume/lume-search.md
image: true
translate: true

---




[Last time](/lume/lume-intro/), we looked at the basic usage of Lume.

Here, as template languages, we used built-in Markdown and Mozilla's Nunjucks.
However, unlike Markdown, Nunjucks is not very widespread (though it's not a big deal) and has a learning cost.
Recently, with the spread of the React ecosystem, JSX has been widely used. Additionally, many people might want to use [MDX](https://mdxjs.com/), which extends Markdown to allow JSX.

Lume supports multiple template engines, including JSX/MDX via plugins. These plugins are managed by Lume itself (they might become built-in plugins in the future).
This time, we will rewrite the blog site from the previous session using JSX/MDX.

:::info
On 2023-12-08, Lume was majorly updated to v2. Accordingly, this article has been updated to work with v2.

- [Lume Blog - Lume 2 is finally here!!](https://lume.land/blog/posts/lume-2/)
:::

## Enabling the JSX Plugin

Set up the following plugin:

- [Lume Plugins - JSX](https://lume.land/plugins/jsx/)

As with other plugins, introducing the JSX plugin is simple. Add the following to `_config.ts` (only the changes are shown).

```typescript
import jsx from "lume/plugins/jsx.ts";

const site = lume();
site.use(jsx());
```

Next, add React to the TypeScript `compilerOptions` in `deno.json`.

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "npm:react",
    "types": [
      "lume/types.ts",
      "https://unpkg.com/@types/react@18.2.37/index.d.ts"
    ]
  }
  // (omitted)
}
```

## Rewriting Layout Files with JSX

Convert the layout file of the blog page, which was previously using Nunjucks, to JSX (TSX).
Place the following JSX as `blog.tsx`.

```tsx
interface BlogPageData extends Lume.Data {
  title: string
}
export default (
  { title, children }: BlogPageData
) => (
  <html lang="ja">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <link rel="stylesheet" href="/css/style.css" />
    <link href="https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism.min.css" rel="stylesheet" />
  </head>
  <body>
  <header>
    <h1>Sample Blog Site</h1>
  </header>

  <main>
    <article>
      <h2>{title}</h2>
      {children}
    </article>
  </main>

  <footer>
    <p>&copy; 2023 Mamezou Blog</p>
  </footer>
  </body>
  </html>
)
```

It receives the front matter information (`title`) and content (`children`) of the Markdown as props.
While the content was received as the `content` variable in Nunjucks, it is received as the `children` variable in JSX.

Of course, Lume is a static site generator and does not involve client-side JavaScript execution.
Even if you write reactive code such as `useState` or event handlers, it will not work here. You need to consider it as a server component.

To use this in a Markdown file (blog page), change the extension to specify JSX (TSX) in the `layout` variable of the front matter.

```markdown
---
title: Running a Blog Site with Lume
url: /blogs/lume/
# Changed from blog.njk
layout: layouts/blog.tsx
---
```

That's all. No need for any JSX conversion processing.
Running the server (`deno task serve`) will yield the same result as before.

This time we used JSX as the layout file, but it can also be used for UI components and pages themselves.

## Enabling the MDX Plugin

Next, let's try MDX. [MDX](https://mdxjs.com/) is an extension that allows using JSX in Markdown.
Just like JSX, add it to `_config.ts`.

```typescript
import jsx from "lume/plugins/jsx.ts";
import mdx from "lume/plugins/mdx.ts";

const site = lume();

site.use(jsx()); // Required for using MDX
site.use(mdx()); // MDX plugin
```

In addition to the JSX plugin it depends on, add the MDX plugin.

## Creating a Page with MDX

Here, we will create a component with JSX and use it from an MDX page.
Create a `_components` directory and place the following Card component (Card.tsx) there.

```tsx
const styles = {
  card: {
    border: '1px solid #ddd',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px'
  },
  title: {
    fontSize: '1em',
    marginBottom: '10px'
  },
  description: {
    marginBottom: '10px'
  }
};
interface CardPageData extends Lume.Data {
  title: string;
  content: string;
}
export default ({ title, children }: CardPageData) => {
  return (
    <div style={styles.card}>
      {title && <div style={styles.title}>{title}</div>}
      {children}
    </div>
  );
};
```

This is a UI component that renders as a card component (Card).

The `_components` directory placed here is special to Lume. Components placed here can be used globally from anywhere.

:::info
Not limited to JSX, components written in other template languages can also be placed in this directory to be used globally.
Details of Lume's component functionality are explained in Part 4 of this series.

- [Introduction to Lume (Part 4) - Reusing Page Components as Components](/lume/lume-components/)
:::

Now, let's use this UI component in MDX.
Place the following MDX in the project root (index.mdx).

```markdown
---
title: Using JSX/MDX with Lume
url: /blogs/lume-mdx/
layout: layouts/blog.tsx
---

Lume supports many template engines, including JSX/MDX.

JSX/MDX is provided as an official plugin and can be easily introduced.

<comp.Card title="What is MDX?">
  MDX is an extension of Markdown that allows using JSX.

  For more details, refer to the official documentation below.
  - [Markdown for the component era](https://mdxjs.com/)
</comp.Card>
```

In the Markdown, `<comp.Card ...>...</comp.Card>` is the JSX component we created earlier.
The prefix `comp` is the object that stores global components.
Global components can be used without import[^1].

[^1]: If components are placed outside `_components`, they can be used by writing import statements in the Markdown.

Here, the content passed as children is written inside the tags, rendering the Card component.
This kind of description should be familiar to those who have experience using React.

Executing this results in the following page.

![MDX](https://i.gyazo.com/b81c32da0da2c6aa396156e75508d573.png)

Finally, the changes in this article are summarized below.
```markdown
.
├── _components
│   └── Card.tsx <- Globally available Card component
├── _includes
│   └── layouts
│       ├── blog.njk <- Nunjucks template created last time
│       └── blog.tsx <- Newly created JSX template (same content as Nunjucks version)
├── css
│   └── style.scss
├── _config.ts <- JSX/MDX plugin introduction
├── deno.json
├── deno.lock
├── index.md <- Changed template to JSX
└── index.mdx <- MDX using Card component
```

## Summary

This time, we used JSX/MDX as template languages in Lume.
Not limited to JSX/MDX, Lume provides support for many template languages as plugins.

- [Lume Plugins - Template Engine](https://lume.land/plugins/?status=all&template_engine=on)

Of course, if it's not available here, you can create your own. It might be interesting to try, though it's not for beginners.

- [Lume Doc - Loaders and engines](https://lume.land/docs/core/loaders/)

Also, although not touched upon here, it is possible to execute multiple template engines in a single file.
For instance, like Eleventy, you can execute both Nunjucks and a Markdown parser on Markdown.

- [Lume Doc - Multiple template engines](https://lume.land/docs/core/multiple-template-engines/)

Next time, we will look into Lume's page management (Search plugin).

