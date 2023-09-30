import lume, { PluginOptions } from 'lume/mod.ts';
import jsx_preact from 'lume/plugins/jsx_preact.ts';
import liquid from 'lume/plugins/liquid.ts';
import postcss from 'lume/plugins/postcss.ts';
import prism from 'lume/plugins/prism.ts';
import sass from 'lume/plugins/sass.ts';
import sitemap from 'lume/plugins/sitemap.ts';
import { DateTime } from 'luxon';
import { blogPage } from './11ty/blog-page.js';
import { Author, contributorArticles } from './11ty/contributor-articles.ts';
import { slug } from './11ty/slug.js';
import { head } from './11ty/head.js';
import { readingTime } from './11ty/reading-time.js';
import { excerpt } from './11ty/excerpt.ts';
import { pageTags } from './11ty/page-tags.js';
import { getDate } from './11ty/get-date.ts';
import { validTags } from './11ty/valid-tags.ts';
import { shortDesc } from './11ty/short-desc.ts';
import anchor from 'npm:markdown-it-anchor@^8.6.5';
import footNote from 'npm:markdown-it-footnote@^3.0.3';
import container from 'npm:markdown-it-container@^3.0.0';
import katex from 'npm:@traptitech/markdown-it-katex@^3.5.0';
import containerOptions from './11ty/markdown-it/container-options.ts';
import { filterByPost, getPostArticles } from './11ty/utils.ts';
import { Page } from 'lume/core/filesystem.ts';
import { Search } from 'lume/plugins/search.ts';
import mermaidPlugin from './11ty/markdown-it/mermaid-plugin.ts';
import externalLinkPlugin from './11ty/markdown-it/external-link-plugin.ts';
import './prism-deps.ts';

const markdown: Partial<PluginOptions['markdown']> = {
  options: {
    breaks: true
  },
  plugins: [
    [anchor,
      {
        permalink: anchor.permalink.linkAfterHeader({
          class: 'tdbc-anchor',
          style: 'aria-label',
          assistiveText: (title: string) => `link to '${title}'`,
          visuallyHiddenClass: 'visually-hidden',
          symbol: '#',
          wrapper: ['<div class=\'section-header\'>', '</div>']
        }),
        level: [1, 2, 3],
        slugify: (s: string) =>
          s
            .trim()
            .toLowerCase()
            .replace(/[\s+~\/]/g, '-')
            .replace(/[().`,%·'"!?¿:@*]/g, '')
      }],
    footNote,
    [container, 'flash', containerOptions],
    [katex, { 'throwOnError': false, 'errorColor': ' #cc0000' }],
    mermaidPlugin,
    externalLinkPlugin
  ]
};

const site = lume({
  src: './src',
  dest: './public',
  server: {
    open: false
  }
}, { markdown });

site.use(jsx_preact());
site.use(liquid());
site.use(postcss());
site.use(prism());
site.use(sass());
site.use(sitemap({
  query: 'exclude!=true'
}));

site.copy('fonts');
site.copy('img');
site.copy('previews');

site.helper('year', () => `${new Date().getFullYear()}`, { type: 'tag' });
site.helper('shortDesc', shortDesc, { type: 'tag' });

site.filter('slug', slug);
site.filter('head', head);
site.filter('htmlDateString',
  (dateObj: any) => dateObj ? DateTime.fromJSDate(dateObj, { zone: 'Asia/Tokyo' }).toFormat('yyyy-LL-dd') : '');

site.filter('readingTime', readingTime);
site.filter('readableDate', (dateObj: any) => {
  if (!dateObj) return '';
  const options = { zone: 'Asia/Tokyo' };
  if (typeof dateObj === 'string') {
    return DateTime.fromISO(dateObj, options).toFormat('yyyy-LL-dd');
  }
  return DateTime.fromJSDate(dateObj, options).toFormat('yyyy-LL-dd');
});
site.filter('excerpt', excerpt);
site.filter('pageTags', pageTags);
site.filter('blogPage', blogPage);
site.filter('inputPath', (pages: Page[], path: string) => pages.find((page: Page) => page.data.inputPath === path));
site.filter('tagUrl', (hrefs: string[], tag: string) => hrefs.filter(href => href.includes(`tags/${tag}`)));
site.filter('limit', (array: unknown[], limit: number) => array.slice(0, limit));
site.filter('byAuthor',
  (contributorArticles: Author[], author: string) => {
    return contributorArticles.filter(contributor => contributor.name === author);
  });
site.filter('selectAuthor', (hrefs: string[], author: string) => hrefs.filter(href => href.includes(author)));
site.filter('getDate', getDate);

const eventTagFilter = (tagPrefix: string) => (rawTags: string[]) => {
  if (!rawTags) return;
  const tags = typeof rawTags === 'string' ? [rawTags] : rawTags;
  const eventTag = tags.find(tag => tag.startsWith(tagPrefix));
  if (eventTag) {
    const result = eventTag.match(new RegExp(`${tagPrefix}(?<year>\\d{4})`));
    return result?.groups ? result.groups.year : undefined;
  }
};
site.filter('adventCalendarTag', eventTagFilter('advent'));
site.filter('summerRelayTag', eventTagFilter('summer'));
site.filter('validTags', validTags);
site.filter('contributorArticles', contributorArticles);

site.filter('currentMonthPosts', (pages: Page[]) => filterByPost(pages).filter((post) => {
  const now = DateTime.now();
  const date = DateTime.fromJSDate(post.data.date);
  return date.month === now.month && date.year === now.year;
}));

site.filter('posts', (search: Search) => getPostArticles(search));
site.filter('getNewestCollectionItemDate', (page: Page[]) => {
  const [first] = page.slice().sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0));
  return first.data.date;
});
site.filter('isoDate', (d: Date) => DateTime.fromJSDate(d).toISO());
site.filter('absoluteUrl', (s: string, base: string) => new URL(s, base).toString());

site.filter('replaceRssUrl', (html, base) => html.replaceAll(
  /\s(href|src)="([^"]+)"/g, (_: string, attr: string, value: string) => ` ${attr}="${new URL(value, base).href}"`));

site.helper('mermaidTag',
  () => `<script async src="https://unpkg.com/mermaid@9.3.0/dist/mermaid.min.js">document.addEventListener('DOMContentLoaded', mermaid.initialize({startOnLoad:true}));</script>`, { type: 'tag' });

export default site;
