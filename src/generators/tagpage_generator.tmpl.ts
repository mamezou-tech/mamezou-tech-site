import { Search } from 'lume/plugins/search.ts';
import { PaginateOptions, Paginator } from 'lume/plugins/paginate.ts';
import { articlesByTag } from './articles_by_tag.ts';
import { encodeUrl } from 'encodeurl';

export const layout = 'layouts/article-list.njk';

export default function* ({ search, paginate }: { search: Search; paginate: Paginator }) {
  const tagArticles = articlesByTag(search);
  for (const tag of Object.keys(tagArticles)) {
    const options: PaginateOptions = {
      url: (n: number) => `/tags/${tag}/${n > 1 ? `${n.toString()}/` : ''}`,
      size: 10
    };
    const result = paginate(tagArticles[tag].articles, options);
    const hrefs = result.map(r => encodeUrl(r.url)); // 11ty compatibility
    for (const page of result) {
      page.hrefs = hrefs;
      page.pages = result;
      page.title = `“${tag}”タグの記事`;
      page.current = page.url
      yield page;
    }
  }
}
