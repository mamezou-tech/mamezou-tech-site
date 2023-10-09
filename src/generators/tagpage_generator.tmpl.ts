import { Search } from 'lume/plugins/search.ts';
import { PaginateOptions, Paginator } from 'lume/plugins/paginate.ts';
import { articlesByTag } from './articles_by_tag.ts';

export const layout = 'article-list.njk';

export default function* ({ search, paginate }: { search: Search; paginate: Paginator }) {
  const tagArticles = articlesByTag(search);
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
      page.title = `“${tag}”タグの記事`;
      yield page;
    }
  }
}
