import contributorsJson from '../_data/contributors.json' assert { type: 'json' };
import { Search } from 'lume/plugins/search.ts';
import { PaginateOptions, Paginator } from 'lume/plugins/paginate.ts';
import { filterByPost } from '../../11ty/utils.ts';
import { Page } from 'lume/core/filesystem.ts';

export const layout = 'article-list.njk';

type Author = {
    github: string;
    name: string;
    articles: Page[];
};

function makeAuthorArticles(search: Search): { [name: string]: Author } {
    const authorArticles: { [name: string]: Author } = {};
    contributorsJson.contributors.forEach(contributor => {
        authorArticles[contributor.name] = {
            github: contributor.github, name: contributor.name, articles: []
        };
    });
    // assign
    const pages = search.pages('exclude!=true', 'date=desc');
    filterByPost(pages as Page[]).forEach((article: Page) => {
        const author = contributorsJson.contributors.find(contributor => contributor.name === article.data.author);
        if (author) {
            authorArticles[article.data.author]?.articles.push(article);
        }
    });
    return authorArticles;
}

export default function* ({ search, paginate }: { search: Search; paginate: Paginator }) {
    const authorArticles = makeAuthorArticles(search);
    for (const author of Object.keys(authorArticles)) {
        const options: PaginateOptions = {
            url: (n: number) => `/authors/${author}/${n > 1 ? `${n.toString()}/` : ''}`,
            size: 10
        };
        const result = paginate(authorArticles[author].articles, options);
        const hrefs = result.map(r => r.url); // 11ty compatibility
        for (const page of result) {
            page.hrefs = hrefs;
            page.pages = result;
            page.contributor = {
                ...authorArticles[author]
            };
            page.title = `${author} の記事`;
            yield page;
        }
    }
}
