import { Search } from 'lume/plugins/search.ts';
import { articleDate } from '../../lume/filters/article_date.ts';
import { Page } from 'lume/core/filesystem.ts';

interface Article {
  title: string;
  url: string;
}

export default ({ search, pv }: { search: Search, pv: { ranking: Article[] } }) => (
  <fieldset className="page-ranking">
    <legend>豆蔵デベロッパーサイト - 先週のアクセスランキング</legend>
    <ol>
      {pv.ranking.map(article => {
        const published = articleDate(search.pages() as Page[], article.url);
        return (
          <li key={article.url}><a href={article.url}>{article.title}{published && `(${published})`}</a></li>
        );
      })}
    </ol>
  </fieldset>
)