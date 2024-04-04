import contributorsJson from "../_data/contributors.json" assert {
  type: "json",
};
import Search from "lume/core/searcher.ts";
import { filterByPost } from "../../lume/filters/utils.ts";

export type Author = {
  github: string;
  name: string;
  articles: Lume.Data[];
};

export function makeAuthorArticles(search: Search): { [name: string]: Author } {
  const authorArticles: { [name: string]: Author } = {};
  contributorsJson.contributors.forEach((contributor) => {
    authorArticles[contributor.name] = {
      github: contributor.github,
      name: contributor.name,
      articles: [],
    };
  });
  // assign
  const pages = search.pages<Lume.Data>("exclude!=true translate!=true", "date=desc");
  filterByPost(pages).forEach((article) => {
    const author = contributorsJson.contributors.find((contributor) =>
      contributor.name === article.author
    );
    if (author) {
      authorArticles[article.author]?.articles.push(article);
    }
  });
  return authorArticles;
}
