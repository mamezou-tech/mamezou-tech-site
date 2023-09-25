import { Search } from 'lume/plugins/search.ts';
import { PaginateOptions, Paginator } from 'lume/plugins/paginate.ts';
import { getPostArticles } from '../../11ty/utils.ts';
import { Page } from 'lume/core/filesystem.ts';
import { validTags } from '../../11ty/valid-tags.ts';

export const layout = 'article-list.njk';

type TagArticles = {
    tag: string;
    articles: Page[]
}

function makeTagArticles(search: Search): { [tag: string]: TagArticles } {
    const tagArticles: { [tag: string]: TagArticles } = {};
    const tags = validTags(search.tags() as string[]);
    new Set(tags).forEach(tag => {
        tagArticles[tag] = {
            tag,
            articles: []
        };
    });
    // assign
    getPostArticles(search).forEach((article) => {
        const target = (article.data.tags || []).map(t => t.toLowerCase());
        tags.filter(tag => target.includes(tag.toLowerCase())).forEach(tag => {
            tagArticles[tag].articles.push(article);
        });
    });
    return tagArticles;
}

export default function* ({ search, paginate }: { search: Search; paginate: Paginator }) {
    const tagArticles = makeTagArticles(search);
    for (const tag of Object.keys(tagArticles)) {
        const options: PaginateOptions = {
            url: (n: number) => `/tags/${tag}/${n > 1 ? `${n.toString()}/` : ''}`,
            size: 10
        };
        const result = paginate(tagArticles[tag].articles, options);
        const hrefs = result.map(r => r.url); // 11ty compatibility
        for (const page of result) {
            page.hrefs = hrefs;
            page.pages = result;
            page.title = `“${tag}”タグの記事`
            yield page;
        }
    }
}
