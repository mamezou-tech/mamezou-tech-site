import contributorsJson from '../../src/_data/contributors.json' assert { type: 'json' };
import { Page } from 'lume/core/filesystem.ts';
import { filterByPost } from './utils.ts';
// TODO: 廃止
function log(authorArticles: { [name: string]: Omit<Author, 'pageIndex'> }) {
  Object.values(authorArticles).forEach(v => {
    const result = v.articles.reduce((acc, cur) => {
      if (!cur.data.date) return acc;
      const ym = cur.data.date.getFullYear() + '-' + (cur.data.date.getMonth() + 1);
      const found = acc.findIndex(a => a.ym === ym);
      if (found >= 0) {
        acc[found].count++;
      } else {
        acc.push({ ym, count: 1 });
      }
      return acc;
    }, [] as { ym: string, count: number }[]);
    console.log(v.name, result);
  });
}

export type Author = {
  github: string;
  name: string;
  pageIndex: number;
  articles: Page[];
};

export const contributorArticles = (collection: Page[]): Author[] => {
  const authorArticles: { [name: string]: Omit<Author, 'pageIndex'> } = {};
  contributorsJson.contributors.forEach(contributor => {
    authorArticles[contributor.name] = {
      github: contributor.github, name: contributor.name, articles: []
    };
  });
  // assign
  filterByPost(collection).forEach((article: Page) => {
    const author = contributorsJson.contributors.find(contributor => contributor.name === article.data.author);
    if (author) {
      authorArticles[article.data.author]?.articles.push(article);
    }
  });
  // log(authorArticles);
  // pagination
  const chunkSize = 10;
  return Object.keys(authorArticles).reduce((state, name) => {
    const articles = authorArticles[name]?.articles.sort((a, b) => (b.data.date?.getTime() ?? 0) - (a.data.date?.getTime() ?? 0));
    if (!articles) return state;
    for (let i = 0; i < articles.length; i += chunkSize) {
      const chunk = articles.slice(i, i + chunkSize);
      state.push({
        ...authorArticles[name]!, pageIndex: i / chunkSize, articles: chunk
      });
    }
    return state;
  }, [] as Author[]);
};