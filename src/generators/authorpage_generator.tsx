import { PaginateOptions } from "lume/plugins/paginate.ts";
import { makeAuthorArticles } from "./articles_by_author.ts";
import { encodeUrl } from "encodeurl";
import { PageData } from "lume/core.ts";

export const layout = "layouts/page.njk";

export default function* ({ comp, search, paginate }: PageData) {
  const authorArticles = makeAuthorArticles(search);
  for (const author of Object.keys(authorArticles)) {
    const options: PaginateOptions = {
      url: (n: number) =>
        `/authors/${author}/${n > 1 ? `${n.toString()}/` : ""}`,
      size: 10,
    };
    const result = paginate(authorArticles[author].articles, options);
    const hrefs = result.map((r) => encodeUrl(r.url)); // 11ty compatibility
    const contributor = authorArticles[author];
    for (const page of result) {
      yield {
        url: page.url,
        title: `${author} の記事`,
        content: (
          <>
            {contributor?.github && (
              <a href={`https://github.com/${contributor.github}`}>
                <img
                  width="60"
                  height="60"
                  style={{ marginLeft: "0.2rem" }}
                  alt={contributor.name}
                  src={`https://github.com/${contributor.github}.png?size=40`}
                />
              </a>
            )}
            <comp.Pagination pages={result} hrefs={hrefs} current={page.url} />
            <comp.PostList postsList={page.results} />
            <comp.Pagination pages={result} hrefs={hrefs} current={page.url} />
          </>
        ),
      };
    }
  }
}
