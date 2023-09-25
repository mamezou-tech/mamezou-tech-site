import lume, { PluginOptions } from 'lume/mod.ts';
import jsx_preact from 'lume/plugins/jsx_preact.ts';
import katex from 'lume/plugins/katex.ts';
import liquid from 'lume/plugins/liquid.ts';
import postcss from 'lume/plugins/postcss.ts';
import prism from 'lume/plugins/prism.ts';
import sass from 'lume/plugins/sass.ts';
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
import container from 'npm:markdown-it-container@^3.0.0'
import containerOptions from './11ty/markdown-it/container-options.js'

const markdown: Partial<PluginOptions['markdown']> = {
    options: {
        breaks: true
    },
    plugins: [[anchor, {
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
    }], [footNote], [container, 'flash', containerOptions]]
};

const site = lume({
    src: './src',
    dest: './public',
    server: {
        open: false
    }
}, { markdown });

site.use(jsx_preact());
site.use(katex());
site.use(liquid());
site.use(postcss());
site.use(prism());
site.use(sass());

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
site.filter('inputPath', (pages: any[], path: any) => pages.find((page: any) => page.inputPath === path));
site.filter('byTag',
    (tagArticles: any[], tag: any) => tagArticles.filter((tagArticle: any) => tagArticle.tag === tag));
site.filter('tagUrl', (hrefs: any[], tag: string) => hrefs.filter(href => href.includes(`tags/${tag}`)));
site.filter('limit', (array: any[], limit: number) => array.slice(0, limit));
site.filter('byAuthor',
    (contributorArticles: Author[], author: string) => {
        return contributorArticles.filter(contributor => contributor.name === author);
    });
site.filter('selectAuthor', (hrefs: any[], author: string) => hrefs.filter(href => href.includes(author)));
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

site.helper('currentMonthPosts', (collection: any) => getPosts(collection).filter((post: any) => post.date.getMonth() === new Date().getMonth() && post.date.getFullYear() === new Date().getFullYear()), { type: 'tag' });

export default site;
