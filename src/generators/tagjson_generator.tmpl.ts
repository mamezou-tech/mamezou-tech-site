import { Search } from 'lume/plugins/search.ts';
import { articlesByTag } from './articles_by_tag.ts';

export default function* ({ search }: { search: Search }) {
  const tagArticles = articlesByTag(search);
  for (const [tag, articles] of Object.entries(tagArticles)) {
    const rows = articles.articles.map(page => ({ title: page.data.title, url: page.data.url }));
    yield {
      url: `/tags/${tag}.json`,
      content: JSON.stringify({ articles: rows }),
      exclude: true
    };
  }
}
