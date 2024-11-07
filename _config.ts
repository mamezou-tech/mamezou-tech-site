import lume from "lume/mod.ts";
import jsx from "lume/plugins/jsx.ts";
import mdx from "lume/plugins/mdx.ts";
import postcss from "lume/plugins/postcss.ts";
import tailwindcss from "lume/plugins/tailwindcss.ts";
import prism from "lume/plugins/prism.ts";
import sitemap from "lume/plugins/sitemap.ts";
import esbuild from "lume/plugins/esbuild.ts";
import nunjucks from "lume/plugins/nunjucks.ts";
import { DateTime } from "luxon";
import { githubName } from "./lume/filters/github_name.ts";
import { readingTime } from "./lume/filters/reading_time.ts";
import { excerpt } from "./lume/filters/excerpt.ts";
import { pageTags } from "./lume/filters/page_tags.ts";
import { articleDate } from "./lume/filters/article_date.ts";
import { validTags } from "./lume/filters/valid_tags.ts";
import { shortDesc } from "./lume/filters/short_desc.ts";
import anchor from "npm:markdown-it-anchor@^8.6.5";
import footNote from "npm:markdown-it-footnote@^3.0.3";
import container from "npm:markdown-it-container@^3.0.0";
import katex from "npm:@traptitech/markdown-it-katex@^3.5.0";
import containerOptions from "./lume/markdown-it/container_options.ts";
import { filterByPost, generalTags, getPostArticles } from './lume/filters/utils.ts';
import Search from "lume/core/searcher.ts";
import externalLinkPlugin from "./lume/markdown-it/external_link_plugin.ts";
import imageSwipePlugin from "./lume/markdown-it/image_swipe_plugin.ts";
import codeClipboard, {
  markdownItCopyButton,
} from "./lume/plugins/code-clipboard/mod.ts";
import "./prism-deps.ts";
import { head } from "./lume/filters/head.ts";
import { makeAuthorArticles } from "./src/generators/articles_by_author.ts";
import { makeScopeUpdate } from "./lume/scope_updates.ts";
import meta from "./src/_data/meta.ts";
import { Options as MarkdownOptions } from "lume/plugins/markdown.ts";
import tailwindOptions from "./tailwind.config.js";
import cssnano from "npm:cssnano@6.0.2";
import markdownItCodeBlock from "./lume/markdown-it/code_block_plugin.ts";
import nesting from "npm:postcss-nesting";

const markdown: Partial<MarkdownOptions> = {
  options: {
    breaks: true,
  },
  plugins: [
    [anchor, {
      permalink: anchor.permalink.linkAfterHeader({
        class: "tdbc-anchor",
        style: "aria-label",
        assistiveText: (title: string) => `link to '${title}'`,
        visuallyHiddenClass: "visually-hidden",
        symbol: "#",
        wrapper: ["<div class='section-header'>", "</div>"],
      }),
      level: [1, 2, 3],
      slugify: (s: string) =>
        s
          .trim()
          .toLowerCase()
          .replace(/[\s+~/]/g, "-")
          .replace(/[().`,%·'"!?¿:@*]/g, ""),
    }],
    footNote,
    [container, "flash", containerOptions],
    [katex, { throwOnError: false, errorColor: "#cc0000", strict: false }],
    externalLinkPlugin,
    imageSwipePlugin,
    markdownItCopyButton,
    markdownItCodeBlock, // must place after copyButton plugin
  ],
};

const site = lume({
  src: "./src",
  dest: "./public",
  server: {
    open: false,
  },
  location: new URL(meta.url),
}, { markdown });

site.use(nunjucks());
site.use(jsx());
site.use(mdx());
site.use(tailwindcss({
  options: tailwindOptions,
}));
site.use(postcss({
  plugins: [cssnano(), nesting()],
}));
site.use(prism());
site.use(sitemap({
  query: "exclude!=true",
}));
site.use(codeClipboard());
site.use(esbuild({
  extensions: [".js", ".ts", ".client.tsx"],
  options: {
    sourcemap: true,
    keepNames: true,
    minify: true,
    tsconfigRaw: {
      compilerOptions: {
        jsx: "react-jsx",
        jsxImportSource: "npm:preact",
      },
    },
  },
}));

site.copy("fonts");
site.copy("img");
site.copy("IndexNowKey.txt", "62f91e28a3954a4fbc90fd3c76a307e0.txt")

site.helper("year", () => `${new Date().getFullYear()}`, { type: "tag" });
site.helper("currentDate", () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}, { type: "tag" });
site.helper("shortDesc", shortDesc, { type: "tag" });

site.filter(
  "htmlDateString",
  (dateObj: any) =>
    dateObj
      ? DateTime.fromJSDate(dateObj, { zone: "Asia/Tokyo" }).toFormat(
        "yyyy-LL-dd",
      )
      : "",
);

site.filter("readingTime", readingTime);
site.filter("head", head);
site.filter("readableDate", (dateObj: any) => {
  if (!dateObj) return "";
  const options = { zone: "Asia/Tokyo" };
  if (typeof dateObj === "string") {
    return DateTime.fromISO(dateObj, options).toFormat("yyyy-LL-dd");
  }
  return DateTime.fromJSDate(dateObj, options).toFormat("yyyy-LL-dd");
});
site.filter("excerpt", excerpt);
site.filter("pageTags", pageTags);
site.filter(
  "pageByPath",
  (pages: Lume.Data[], path: string) => {
    const index = path.lastIndexOf(".");
    let normalized = path;
    if (index !== -1) {
      normalized = path.substring(0, index);
    }
    return pages.find((data: Lume.Data) => {
      return normalized === `./src${data.page.src.path}`;
    });
  },
);
site.filter(
  "tagUrl",
  (hrefs: string[], tag: string) =>
    hrefs.filter((href) => href.includes(`tags/${tag}`)),
);
site.filter(
  "limit",
  (array: unknown[], limit: number) => array.slice(0, limit),
);
site.filter(
  "selectAuthor",
  (hrefs: string[], author: string) =>
    hrefs.filter((href) => href.includes(author)),
);
site.filter("articleDate", articleDate);

function findEventTag(rawTags: string[] | string, target: RegExp) {
  const tags = typeof rawTags === "string" ? [rawTags] : rawTags;
  return tags.find((tag) => tag.match(target));
}

const eventTagFilter = (prefix: string) => (rawTags: string[] | string) => {
  if (!rawTags?.length) return;
  const eventTag = findEventTag(rawTags, new RegExp(`^${prefix}.*`));
  if (eventTag) {
    const result = eventTag.match(new RegExp(`${prefix}(?<year>\\d{4})`));
    return result?.groups ? result.groups.year : undefined;
  }
};
site.filter("adventCalendarTag", eventTagFilter("advent"));
site.filter("summerRelayTag", eventTagFilter("summer"));
site.filter(
  "eventType",
  (tags: string[] | string): "spring" | "summer" | "advent" | undefined => {
    const tag = findEventTag(tags, /^(advent|summer|新人向け).*/);
    if (!tag) return;
    else if (tag.startsWith("advent")) return "advent";
    else if (tag.startsWith("summer")) return "summer";
    else if (tag.startsWith("新人向け")) return "spring";
  },
);
site.filter("validTags", validTags);
site.filter("githubName", githubName);

site.filter(
  "currentMonthPosts",
  (pages: Lume.Data[]) =>
    filterByPost(pages).filter((post) => {
      const now = DateTime.now();
      const date = DateTime.fromJSDate(post.date);
      return date.month === now.month && date.year === now.year;
    }),
);

site.filter("posts", (search: Search) => getPostArticles(search));
site.filter("newestDate", (pages: Lume.Data[]) => {
  const [first] = pages.slice().sort((a, b) =>
    (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)
  );
  return first.date;
});

site.filter("isoDateTime", (d: Date | string) => {
  if (d instanceof Date) {
    return DateTime.fromJSDate(d).toISO();
  } else {
    return DateTime.fromISO(d).toISO();
  }
});
site.filter("isoDate", (d: Date | string) => {
  if (d instanceof Date) {
    return DateTime.fromJSDate(d).toISODate();
  } else {
    return DateTime.fromISO(d).toISODate();
  }
});
site.filter(
  "absoluteUrl",
  (s: string, base: string) => new URL(s, base).toString(),
);

site.filter("percentEncode", (s: string) => encodeURIComponent(s));

site.filter("rssUrl", (html: string, base: string) => {
  if (!html) return "";
  return html.replaceAll(
    /\s(href|src)="([^"]+)"/g,
    (_: string, attr: string, value: string) =>
      ` ${attr}="${new URL(value, base).href}"`,
  );
});

site.helper(
  "mermaidTag",
  () =>
    `<script type="module">
const initializeMermaid = async () => {
  const mermaid = (await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")).default;
  mermaid.initialize({startOnLoad:true})
  mermaid.registerIconPacks([ 
    { name: 'logos', loader: () => fetch('https://unpkg.com/@iconify-json/logos@1.2.0/icons.json').then((res) => res.json())},
    { name: 'mdi', loader: () => fetch('https://unpkg.com/@iconify-json/mdi@1.2.0/icons.json').then((res) => res.json())}
  ])
};
const tag = window.document.querySelector('pre.mermaid');
if (tag) initializeMermaid()
</script>`,
  { type: "tag" },
);

// fast update for markdown
if (!Deno.env.has("MZ_DEBUG")) {
  site.scopedUpdates(...makeScopeUpdate("src"));
}

site.preprocess([".md"], (pages) => {
  const search = new Search({ pages, files: [], sourceData: new Map() });
  const articles = getPostArticles(search);
  const translated = search.pages("translate=true");
  for (const article of articles) {
    const found = translated.find((en) =>
      en.page.src.path === `/en${article.page.src.path}`
    );
    if (found) {
      article.en = found.url;
      found.ja = article.url;
      found.page.data.content = `:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](${article.url}).
:::
` + found.page.data.content
    }
  }
});

site.process([".md"], (pages) => {
  if (!Deno.env.has("MZ_DEBUG")) return;
  const search = new Search({ pages, files: [], sourceData: new Map() });
  const articles = getPostArticles(search)
  const jsonArray = articles.map(data => (JSON.stringify({
    title: data.title,
    url: data.url,
    tags: data.tags.filter(tag => !generalTags.includes(tag))
  })));
  const encoder = new TextEncoder();
  void Deno.writeFile("articles.jsonl", new Uint8Array(encoder.encode(jsonArray.join('\n'))));

  const summary = Object.values(makeAuthorArticles(search)).map((v) => {
    const result = v.articles.reduce((acc, cur) => {
      if (!cur.date) return acc;
      const ym = cur.date.getFullYear() + "-" +
        (cur.date.getMonth() + 1);
      const found = acc.findIndex((a) => a.ym === ym);
      if (found >= 0) {
        acc[found].count++;
      } else {
        acc.push({ ym, count: 1 });
      }
      return acc;
    }, [] as { ym: string; count: number }[]);
    // console.log(v.name, result);
    return { name: v.name, result };
  });
  const start = DateTime.fromISO("2022-01-01");
  const end = DateTime.now().startOf("month");
  const input = summary.map((s) => {
    let current = start;
    const numbers: number[] = [];
    while (!current.equals(end)) {
      const found = s.result.find((r) =>
        r.ym === `${current.year}-${current.month}`
      );
      if (found) {
        numbers.push(found.count);
      } else {
        numbers.push(0);
      }
      current = current.plus({ months: 1 });
    }
    return `${s.name}\t${numbers.join("\t")}`;
  }).join("\n");
  Deno.writeFile("author.tsv", new Uint8Array(encoder.encode(input))).then(() =>
    console.log("DONE")
  );
});

site.addEventListener("beforeUpdate", (event) => {
  if (!Deno.env.has("MZ_DEBUG")) return;
  console.log("New changes detected");
  console.log(event.files); // The files that have changed
});

site.addEventListener("afterUpdate", (event) => {
  if (!Deno.env.has("MZ_DEBUG")) return;
  console.log("Site updated");
  // console.log(event.files); // The files that have changed
  console.log(event.pages.map((p) => p.data.url)); // The pages that have been rebuilt
  console.log(event.staticFiles.map((f) => f.outputPath)); // The static files that have been copied again
});

export default site;
