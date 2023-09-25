import { Search } from 'lume/plugins/search.ts';
import { PaginateOptions, Paginator } from 'lume/plugins/paginate.ts';
import { filterByPost } from '../../11ty/utils.ts';
import { Page } from 'lume/core/filesystem.ts';

export const layout = 'article-list.njk';
export const title = 'ブログ';
export const description = '豆蔵メンバーの技術ブログ';
export const icon = 'https://api.iconify.design/material-symbols/article-outline.svg?color=%23730099&height=28';
export const titleImage = '/img/logo/mame-kun3_50.png';
export const hideCategory = true;

export default function* ({ search, paginate }: { search: Search; paginate: Paginator }) {
  const pages = search.pages('posts exclude!=true', 'date=desc');
  const posts = filterByPost(pages as Page[]);
  const options: PaginateOptions = {
    url: (n: number) => `/blogs/${n > 1 ? `${n.toString()}/` : ''}`,
    size: 20
  };
  const result = paginate(posts, options);
  const hrefs = result.map(r => r.url); // 11ty compatibility
  for (let i = 0; i < result.length; i++) {
    const page = result[i];
    page.hrefs = hrefs;
    page.pages = result;
    if (i === 0) {
      page.tags = ['pages'];
    }
    yield page;
  }
}
