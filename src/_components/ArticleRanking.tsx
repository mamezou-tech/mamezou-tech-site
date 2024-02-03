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
  <fieldset className="border m-2 border-stone-200 rounded-xl p-2 hidden md:block max-w-full md:max-w-80ch page-ranking">
    <legend>豆蔵デベロッパーサイト - 先週のアクセスランキング</legend>
    <ol className="m-0 pl-6">
      {pv.ranking.map((article) => {
        const published = articleDate(search.pages(), article.url);
        return (
          <li className="text-base" key={article.url}>
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
