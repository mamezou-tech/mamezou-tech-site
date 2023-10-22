import { articlesByTag } from "./articles_by_tag.ts";
import { PageData } from "lume/core.ts";

export default function* ({ search }: PageData) {
  const tagArticles = articlesByTag(search);
  for (const [tag, articles] of Object.entries(tagArticles)) {
    const rows = articles.articles.map((page) => ({
      title: page.data.title,
      url: page.data.url,
    }));
    yield {
      url: `/tags/${tag}.json`,
      content: JSON.stringify({ articles: rows }),
      exclude: true,
    };
  }
}
