import Search from "lume/core/searcher.ts";
import { validTags } from "../../lume/filters/valid_tags.ts";
import { getPostArticles } from "../../lume/filters/utils.ts";

export type TagArticles = {
  tag: string;
  articles: Lume.Data[];
};

export function articlesByTag(search: Search): { [tag: string]: TagArticles } {
  const tagArticles: { [tag: string]: TagArticles } = {};
  const tags = validTags(search.values("tags") as string[]);
  new Set(tags).forEach((tag) => {
    tagArticles[tag] = {
      tag,
      articles: [],
    };
  });
  // assign
  getPostArticles(search).forEach((article) => {
    const target = (article.tags || []).map((t) => t.toLowerCase());
    tags.filter((tag) => target.includes(tag.toLowerCase())).forEach((tag) => {
      tagArticles[tag].articles.push(article);
    });
  });
  return tagArticles;
}
