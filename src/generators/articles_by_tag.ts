import { Search } from 'lume/plugins/search.ts';
import { validTags } from '../../lume/filters/valid-tags.ts';
import { getPostArticles } from '../../lume/filters/utils.ts';
import { Page } from 'lume/core/filesystem.ts';

export type TagArticles = {
  tag: string;
  articles: Page[]
}

export function articlesByTag(search: Search): { [tag: string]: TagArticles } {
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