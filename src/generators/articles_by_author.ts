import contributorsJson from '../_data/contributors.json' assert { type: 'json' };
import { Page } from 'lume/core/filesystem.ts';
import { Search } from 'lume/plugins/search.ts';
import { filterByPost } from '../../lume/filters/utils.ts';

export type Author = {
  github: string;
  name: string;
  articles: Page[];
};

export function makeAuthorArticles(search: Search): { [name: string]: Author } {
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
