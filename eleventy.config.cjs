const { DateTime } = require('luxon');
const socialImages = require('@11tyrocks/eleventy-plugin-social-images');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const pluginRss = require('@11ty/eleventy-plugin-rss');
const { EleventyEdgePlugin } = require('@11ty/eleventy');
const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const markdownItFootNote = require('markdown-it-footnote');
const markdownItContainer = require('markdown-it-container');
const packageVersion = require('./package.json').version;
const codeClipboard = require('eleventy-plugin-code-clipboard');
const pluginMermaid = require('@kevingimbel/eleventy-plugin-mermaid');
const { getPosts } = require('./11ty/utils.ts');
const markdownItKatex = require('@traptitech/markdown-it-katex');
const containerOptions = require('./11ty/markdown-it/container-options.js');

module.exports = function(eleventyConfig) {
  eleventyConfig.addPlugin(EleventyEdgePlugin);
  eleventyConfig.addPlugin(socialImages);
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(codeClipboard, {
    buttonClass: 'tdbc-copy-button'
  });
  eleventyConfig.addPlugin(pluginMermaid, {
    mermaid_js_src: 'https://unpkg.com/mermaid@9.3.0/dist/mermaid.min.js'
  });

  eleventyConfig.addWatchTarget('./src/sass/');
  eleventyConfig.addWatchTarget('./11ty/');

  eleventyConfig.addPassthroughCopy('./src/css');
  eleventyConfig.addPassthroughCopy('./src/fonts');
  eleventyConfig.addPassthroughCopy('./src/img');
  eleventyConfig.addPassthroughCopy('./src/previews');
  eleventyConfig.addPassthroughCopy({ './node_modules/photoswipe/dist': 'photoswipe' });

  eleventyConfig.addShortcode('year', () => `${new Date().getFullYear()}`);
  eleventyConfig.addShortcode('packageVersion', () => `v${packageVersion}`);
  eleventyConfig.addShortcode('shortDesc', require('./11ty/short-desc.ts'));

  eleventyConfig.addFilter('slug', require('./11ty/slug.cjs'));
  eleventyConfig.addFilter('head', require('./11ty/head.cjs'));
  eleventyConfig.addFilter('htmlDateString',
    (dateObj) => dateObj ? DateTime.fromJSDate(dateObj, { zone: 'Asia/Tokyo' }).toFormat('yyyy-LL-dd') : '');

  eleventyConfig.addFilter('readingTime', require('./11ty/reading-time.cjs'));
  eleventyConfig.addFilter('readableDate', (dateObj) => {
    if (!dateObj) return '';
    const options = { zone: 'Asia/Tokyo' };
    if (typeof dateObj === 'string') {
      return DateTime.fromISO(dateObj, options).toFormat('yyyy-LL-dd');
    }
    return DateTime.fromJSDate(dateObj, options).toFormat('yyyy-LL-dd');
  });
  eleventyConfig.addFilter('excerpt', require('./11ty/excerpt.ts'));
  eleventyConfig.addFilter('pageTags', require('./11ty/page-tags.cjs'));
  eleventyConfig.addFilter('blogPage', require('./11ty/blog-page.cjs'));
  eleventyConfig.addFilter('inputPath', (pages, path) => pages.find((page) => page.inputPath === path));
  eleventyConfig.addFilter('byTag',
    (tagArticles, tag) => tagArticles.filter(tagArticle => tagArticle.tag === tag));
  eleventyConfig.addFilter('tagUrl', (hrefs, tag) => hrefs.filter(href => href.includes(`tags/${tag}`)));
  eleventyConfig.addFilter('limit', (array, limit) => array.slice(0, limit));
  eleventyConfig.addFilter('byAuthor',
    (contributorArticles, author) => contributorArticles.filter(contributor => contributor.name === author));
  eleventyConfig.addFilter('selectAuthor', (hrefs, author) => hrefs.filter(href => href.includes(author)));
  eleventyConfig.addFilter('getDate', require('./11ty/get-date.ts'));

  const eventTagFilter = (tagPrefix) => (rawTags) => {
    if (!rawTags) return;
    const tags = typeof rawTags === 'string' ? [rawTags] : rawTags;
    const eventTag = tags.find(tag => tag.startsWith(tagPrefix));
    if (eventTag) {
      const result = eventTag.match(new RegExp(`${tagPrefix}(?<year>\\d{4})`));
      return result ? result.groups.year : undefined;
    }
  };
  eleventyConfig.addFilter('adventCalendarTag', eventTagFilter('advent'));
  eleventyConfig.addFilter('summerRelayTag', eventTagFilter('summer'));

  eleventyConfig.addCollection('currentMonthPosts', (collection) => getPosts(collection).filter(post => post.date.getMonth() === new Date().getMonth() && post.date.getFullYear() === new Date().getFullYear()));
  eleventyConfig.addCollection('articles', getPosts);
  eleventyConfig.addCollection('tagList', require('./11ty/tag-list.cjs'));
  eleventyConfig.addCollection('contributorArticles', require('./11ty/contributor-articles.ts'));
  eleventyConfig.addCollection('tagArticles', require('./11ty/tag-articles.cjs'));

  // for IsLand Architecture for preact
  eleventyConfig.addWatchTarget('./components/preact');
  eleventyConfig.addPassthroughCopy({
    './node_modules/@11ty/is-land/is-land.js': 'vendor/is-land.js',
    './node_modules/@11ty/is-land/is-land-autoinit.js': 'vendor/is-land-autoinit.js',
    './node_modules/preact/dist/preact.mjs': 'vendor/preact.mjs'
  });
  eleventyConfig.addFilter('preact', async (filename, args) => {
    try {
      const { toHtml } = await import(filename);
      if (typeof toHtml === 'function') {
        return toHtml(args); // server rendered html
      }
      console.log(`[Warning] toHtml function not found. Is this a valid Component? ${filename}`);
      return '';
    } catch (e) {
      console.log(e);
      throw e;
    }
  });

  /* Markdown Overrides */
  const markdownLibrary = markdownIt({
    html: true,
    breaks: true
  }).use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.linkAfterHeader({
      class: 'tdbc-anchor',
      style: 'aria-label',
      assistiveText: title => `link to '${title}'`,
      visuallyHiddenClass: 'visually-hidden',
      symbol: '#',
      wrapper: ['<div class=\'section-header\'>', '</div>']
    }),
    level: [1, 2, 3],
    slugify: (s) =>
      s
        .trim()
        .toLowerCase()
        .replace(/[\s+~\/]/g, '-')
        .replace(/[().`,%·'"!?¿:@*]/g, '')
  }).use(markdownItFootNote)
    .use(codeClipboard.markdownItCopyButton, {
      buttonClass: 'tdbc-copy-button'
    })
    .use(markdownItContainer, 'flash', containerOptions)
    .use(markdownItKatex, { 'throwOnError': false, 'errorColor': ' #cc0000' })
    .use(require('./11ty/markdown-it/image-swipe-plugin.cjs'))
    .use(require('./11ty/markdown-it/external-link-plugin.cjs'));

  eleventyConfig.setLibrary('md', markdownLibrary);

  return {
    dir: {
      input: 'src',
      output: 'public'
    }
  };
};