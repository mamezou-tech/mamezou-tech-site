import { articleDate } from "../../lume/filters/article_date.ts";

interface Props extends Lume.Data {
  // from _data/pv.json
  pv: {
    ranking: {
      title: string;
      url: string;
    }[];
  };
}

export default ({ search, pv }: Props) => (
  <fieldset className="page-ranking">
    <legend>豆蔵デベロッパーサイト - 先週のアクセスランキング</legend>
    <ol>
      {pv.ranking.map((article) => {
        const published = articleDate(search.pages(), article.url);
        return (
          <li key={article.url}>
            <a href={article.url}>
              {article.title}
              {published && `(${published})`}
            </a>
          </li>
        );
      })}
    </ol>
  </fieldset>
);
