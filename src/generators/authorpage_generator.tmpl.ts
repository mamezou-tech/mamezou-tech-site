import { Search } from 'lume/plugins/search.ts';
import { PaginateOptions, Paginator } from 'lume/plugins/paginate.ts';
import { makeAuthorArticles } from './articles_by_author.ts';

export const layout = 'article-list.njk';

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
