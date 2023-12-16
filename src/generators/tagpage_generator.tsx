import { PaginateOptions } from "lume/plugins/paginate.ts";
import { articlesByTag } from "./articles_by_tag.ts";
import { encodeUrl } from "encodeurl";
export const layout = "layouts/page.njk";

export default function* ({ search, paginate, comp }: PageData) {
  const tagArticles = articlesByTag(search);
  for (const tag of Object.keys(tagArticles)) {
    const options: PaginateOptions = {
      url: (n: number) => `/tags/${tag}/${n > 1 ? `${n.toString()}/` : ""}`,
      size: 10,
    };
    const result = paginate(tagArticles[tag].articles, options);
    const hrefs = result.map((r) => encodeUrl(r.url)); // 11ty compatibility
    for (const page of result) {
      yield {
        url: page.url,
        title: `“${tag}”タグの記事`,
        content: (
          <>
            <comp.Pagination
              pages={result}
              hrefs={hrefs}
              current={encodeUrl(page.url)}
            />
            <comp.PostList postsList={page.results} />
            <comp.Pagination
              pages={result}
              hrefs={hrefs}
              current={encodeUrl(page.url)}
            />
          </>
        ),
      };
    }
  }
}
