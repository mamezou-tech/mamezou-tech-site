import { articleDate } from "../../lume/filters/article_date.ts";
import { Page } from "lume/core/filesystem.ts";
import { PageData } from "lume/core.ts";

interface Props extends PageData {
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
        const published = articleDate(search.pages() as Page[], article.url);
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
