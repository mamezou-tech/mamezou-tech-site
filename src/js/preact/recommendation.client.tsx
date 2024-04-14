import { render as preactRender } from "npm:preact@^10.11.0";
import { useEffect, useState } from "npm:preact@^10.11.0/hooks";

const ignoreTag = /^\d{4}年$/;

type Article = {
  title: string;
  url: string;
};

function Recommendation({ tags }: { tags: string }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const targetTags = tags.split(",").filter((t) => !ignoreTag.test(t));
  const fetchArticles = (): void => {
    if (!targetTags.length || !targetTags[0]) return;
    const get = async () => {
      const promises = targetTags.map((tag) =>
        fetch(`/tags/${tag}.json`).then((res) => res.json())
      );
      const articles: Article[] = (await Promise.all(promises))
        .map((res) => res.articles)
        .flat()
        .filter((a) => a.url !== location.pathname);
      const uniqueArticles = articles.reduce((prev, cur) => {
        if (prev.find((a) => a.url === cur.url)) {
          return prev;
        }
        prev.push(cur);
        return prev;
      }, [] as Article[]);
      setArticles(uniqueArticles);
    };
    get();
  };
  const prevPage = () => setCurrentPage(currentPage - 1);
  const nextPage = () => setCurrentPage(currentPage + 1);
  const sendGa = (ev: React.MouseEvent<HTMLAnchorElement>) =>
    "gtag" in window && typeof window.gtag === "function" &&
    window.gtag("event", "click_recommend", {
      title: (ev.target as HTMLAnchorElement)?.text,
    });
  useEffect(fetchArticles, []);

  if (!articles.length) {
    return "";
  }
  return (
    <>
      <hr className="link-separator" />
      <p style={{ lineHeight: "30px" }}>
        この記事に関連するオススメ記事
        <img
          alt="recommend"
          style={{
            display: "inline",
            verticalAlign: "middle",
            marginLeft: "0.3rem",
          }}
          src="/img/icons/recommend-25.png"
          width="25"
          height="25"
        />
      </p>
      <ul
        style={{ animation: "fadeInAnimation 1s forwards" }}
        key={currentPage}
      >
        {articles.slice(currentPage * 10, currentPage * 10 + 10).map((
          article,
        ) => (
          <li key={article.url}>
            <a href={article.url} onClick={sendGa}>{article.title}</a>
          </li>
        ))}
      </ul>
      <nav className="post__pagination">
        {currentPage > 0 && (
          <button onClick={prevPage} style={{ marginRight: "8px" }}>
            <span>←</span>前へ
          </button>
        )}
        {(currentPage + 1) * 10 < articles.length
          ? (
            <button onClick={nextPage} style={{ marginRight: "8px" }}>
              次へ<span>→</span>
            </button>
          )
          : <span />}
      </nav>
    </>
  );
}

export function render({ tags }: { tags: string }, el: HTMLElement) {
  return preactRender(<Recommendation tags={tags} />, el);
}
