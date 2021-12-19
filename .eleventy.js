const {DateTime} = require("luxon");
const socialImages = require("@11tyrocks/eleventy-plugin-social-images");
const emojiRegex = require("emoji-regex");
const slugify = require("slugify");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItFootNote = require("markdown-it-footnote");
const markdownItTableOfContents = require("markdown-it-table-of-contents")
const packageVersion = require("./package.json").version;
const readingTime = require("eleventy-plugin-reading-time");

// for Node.js 14
String.prototype.replaceAll = (from, to) => {
  return from.replace(new RegExp(from, "g"), to)
};

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(socialImages);
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(readingTime);

  eleventyConfig.addWatchTarget("./src/sass/");

  eleventyConfig.addPassthroughCopy("./src/css");
  eleventyConfig.addPassthroughCopy("./src/fonts");
  eleventyConfig.addPassthroughCopy("./src/img");
  eleventyConfig.addPassthroughCopy("./src/previews");

  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);
  eleventyConfig.addShortcode("packageVersion", () => `v${packageVersion}`);

  eleventyConfig.addFilter("slug", (str) => {
    if (!str) {
      return;
    }

    const regex = emojiRegex();
    // Remove Emoji first
    let string = str.replace(regex, "");

    return slugify(string, {
      lower: true,
      replacement: "-",
      remove: /[*+~·,()'"`´%!?¿:@\/]/g,
    });
  });

  eleventyConfig.addFilter('head', (array, n) => {
    if (!array) {
      return [];
    }
    if (n < 0) {
      return array.slice(n);
    }

    return array.slice(0, n);
  });

  eleventyConfig.addFilter('htmlDateString', (dateObj) => {
    return dateObj ? DateTime.fromJSDate(dateObj, {zone: 'Asia/Tokyo'}).toFormat('yyyy-LL-dd') : "";
  });

  eleventyConfig.addFilter('readableDate', (dateObj) => {
    return DateTime.fromJSDate(dateObj, {zone: 'Asia/Tokyo'}).toFormat(
      'yyyy-LL-dd'
    );
  });

  eleventyConfig.addFilter('excerpt', (post) => {
    const content = post.replace(/(<([^>]+)>)/gi, '');
    return content.substr(0, content.lastIndexOf('。', 200)) + '...';
  });

  eleventyConfig.addFilter('pageTags', (tags) => {
    const generalTags = ['all', 'nav', 'post'];

    return tags
      .toString()
      .split(',')
      .filter((tag) => {
        return !generalTags.includes(tag);
      });
  });

  eleventyConfig.addFilter('blogPage', (fileSlug) => {
    console.log(fileSlug)
    if (/^[0-9]{4}_.*$/.test(fileSlug)) {
      return fileSlug.substring(5);
    }
    return fileSlug;
  });

  eleventyConfig.addShortcode('shortDesc', function (collections, page, defaultValue) {
    if (!page.inputPath) return defaultValue;
    const { inputPath } = page;
    if (!inputPath) return defaultValue;

    const isPost = inputPath.includes('/posts/')
    if (!isPost) return defaultValue;

    const post = collections.find(el => el.url === page.url)
    if (!post) return defaultValue;
    const content = post.templateContent.toString()
      .replace(/(<([^>]+)>)/gi, "")
      .replace(/[\r\n]/gi, "");
    return content.substr(0, content.lastIndexOf("。", 200)) + "...";
  });

  eleventyConfig.addFilter('inputPath', (pages, path) => {
    return pages.find((page) => page.inputPath === path);
  });

  eleventyConfig.addCollection('articles', (collection) => {
    return collection.getAll().filter(item => {
      if ('layout' in item.data) {
        return item.data.layout === 'post';
      }
      return false;
    }).sort((a, b) => a.date - b.date);
  });

  eleventyConfig.addCollection('tagList', (collection) => {
    let tagSet = new Set();
    collection.getAll().forEach(item => {
      if ('tags' in item.data) {
        let tags = item.data.tags;

        tags = tags.filter(item => {
          switch (item) {
            case 'all':
            case 'nav':
            case 'pages':
            case 'no-page':
              return false;
          }

          return true;
        });

        for (const tag of tags) {
          tagSet.add(tag);
        }
      }
    });

    return [...tagSet];
  });

  /* Markdown Overrides */
  let markdownLibrary = markdownIt({
    html: true,
    breaks: true,
  }).use(markdownItAnchor, {
    permalink: true,
    permalinkClass: "tdbc-anchor",
    permalinkSymbol: "#",
    permalinkSpace: false,
    level: [1, 2, 3],
    slugify: (s) =>
      s
        .trim()
        .toLowerCase()
        .replace(/[\s+~\/]/g, "-")
        .replace(/[().`,%·'"!?¿:@*]/g, ""),
  }).use(markdownItFootNote)
    .use(markdownItTableOfContents, {
      containerClass: "post__toc",
      containerHeaderHtml: '<div class="toc-container-header"><p>Contents</p></div>'
    });

  eleventyConfig.setLibrary("md", markdownLibrary);

  return {
    passthroughFileCopy: true,
    dir: {
      input: "src",
      output: "public",
    },
  };
};
