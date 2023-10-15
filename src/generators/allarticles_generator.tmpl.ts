import { Search } from 'lume/plugins/search.ts';
import { PaginateOptions, Paginator } from 'lume/plugins/paginate.ts';
import { getPostArticles } from '../../lume/filters/utils.ts';
import { encodeUrl } from 'encodeurl';

export const layout = 'layouts/article-list.njk';
export const title = '全ての記事';
export const showTags = true;
export default function* ({ search, paginate }: { search: Search; paginate: Paginator }) {
  const posts = getPostArticles(search);
  const options: PaginateOptions = {
    url: (n: number) => `/articles/${n > 1 ? `${n.toString()}/` : ''}`,
    size: 20
  };
  const result = paginate(posts, options);
  const hrefs = result.map(r => encodeUrl(r.url)); // 11ty compatibility
  for (const page of result) {
    page.hrefs = hrefs;
    page.pages = result;
    page.current = page.url
    yield page;
  }
}
