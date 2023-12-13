import { articlesByTag } from "./articles_by_tag.ts";
export default function* ({ search }: Lume.Data) {
  const tagArticles = articlesByTag(search);
  for (const [tag, articles] of Object.entries(tagArticles)) {
    const rows = articles.articles.map((page) => ({
      title: page.title,
      url: page.url,
    }));
    yield {
      url: `/tags/${tag}.json`,
      content: JSON.stringify({ articles: rows }),
      exclude: true,
    };
  }
}
