const {DateTime} = require("luxon");
const socialImages = require("@11tyrocks/eleventy-plugin-social-images");
const emojiRegex = require("emoji-regex");
const slugify = require("slugify");
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const pluginRss = require("@11ty/eleventy-plugin-rss");
const markdownIt = require("markdown-it");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItFootNote = require("markdown-it-footnote");
const markdownItTableOfContents = require("markdown-it-table-of-contents");
const markdownItContainer = require("markdown-it-container");
const packageVersion = require("./package.json").version;
const codeClipboard = require("eleventy-plugin-code-clipboard");
const pluginMermaid = require("@kevingimbel/eleventy-plugin-mermaid");

// for Node.js 14
String.prototype.replaceAll = function (from, to) {
  return this.replace(new RegExp(from, "g"), to);
};

const icons = {
  info: '<!-- <%= octicon "info" %> --><svg class="octicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A.75.75 0 017.25 7h1a.75.75 0 01.75.75v2.75h.25a.75.75 0 010 1.5h-2a.75.75 0 010-1.5h.25v-2h-.25a.75.75 0 01-.75-.75zM8 6a1 1 0 100-2 1 1 0 000 2z"></path></svg>',
  alert: '<!-- <%= octicon "alert" %> --><svg class="octicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M8.22 1.754a.25.25 0 00-.44 0L1.698 13.132a.25.25 0 00.22.368h12.164a.25.25 0 00.22-.368L8.22 1.754zm-1.763-.707c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0114.082 15H1.918a1.75 1.75 0 01-1.543-2.575L6.457 1.047zM9 11a1 1 0 11-2 0 1 1 0 012 0zm-.25-5.25a.75.75 0 00-1.5 0v2.5a.75.75 0 001.5 0v-2.5z"></path></svg>',
  stop: '<!-- <%= octicon "stop" %> --><svg class="octicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M4.47.22A.75.75 0 015 0h6a.75.75 0 01.53.22l4.25 4.25c.141.14.22.331.22.53v6a.75.75 0 01-.22.53l-4.25 4.25A.75.75 0 0111 16H5a.75.75 0 01-.53-.22L.22 11.53A.75.75 0 010 11V5a.75.75 0 01.22-.53L4.47.22zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5H5.31zM8 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 100-2 1 1 0 000 2z"></path></svg>',
  check: '<!-- <%= octicon "check" %> --><svg class="octicon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16"><path fill-rule="evenodd" d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"></path></svg>',
};

const containerOptions = {
  validate: (params) => (/^(info|alert|stop|check)\s*.*$/.test(params.trim())),
  render: (tokens, idx) => {
    const expression = tokens[idx].info.trim();
    if (tokens[idx].nesting === 1) {
      switch (expression) {
        case "info":
          return `<div class="flash"><span class="flash-title">${icons.info} Information</span>`;
        case "alert":
          return `<div class="flash flash-warn"><span class="flash-title">${icons.alert} Warning</span>`;
        case "stop":
          return `<div class="flash flash-error"><span class="flash-title">${icons.stop} Warning</span>`;
        case "check":
          return `<div class="flash flash-success"><span class="flash-title">${icons.check} Information</span>`;
        default:
          return '<div class="flash">'
      }
    } else {
      return '</div>\n';
    }
  }
};


module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(socialImages);
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(codeClipboard, {
    buttonClass: "tdbc-copy-button"
  });
  eleventyConfig.addPlugin(pluginMermaid);

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

  eleventyConfig.addFilter('readingTime', (postOrContent) => {
    const htmlContent =
      typeof postOrContent === 'string'
        ? postOrContent
        : postOrContent.templateContent;

    if (!htmlContent) {
      return "0 min";
    }

    const normalized = htmlContent
      .replace(/(<([^>]+)>)/gi, "");
    return `${(Math.ceil(normalized.length / 1000))} min`
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
  const markdownLibrary = markdownIt({
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
    })
    .use(codeClipboard.markdownItCopyButton, {
      buttonClass: "tdbc-copy-button"
    })
    .use(markdownItContainer, "flash", containerOptions);

  eleventyConfig.setLibrary("md", markdownLibrary);

  return {
    passthroughFileCopy: true,
    dir: {
      input: "src",
      output: "public",
    },
  };
};
