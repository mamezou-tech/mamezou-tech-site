import { PaginateOptions } from "lume/plugins/paginate.ts";
import { getPostArticles } from "../../lume/filters/utils.ts";
import { encodeUrl } from "encodeurl";
import { PageData } from "lume/core.ts";

export const layout = "layouts/page.njk";
export const title = "全ての記事";
export default function* ({ search, paginate, comp }: PageData) {
  const posts = getPostArticles(search);
  const options: PaginateOptions = {
    url: (n: number) => `/articles/${n > 1 ? `${n.toString()}/` : ""}`,
    size: 20,
  };
  const result = paginate(posts, options);
  const hrefs = result.map((r) => encodeUrl(r.url)); // 11ty compatibility
  for (const page of result) {
    yield {
      url: page.url,
      content: (
        <>
          <div className="tags">
            <comp.TagsLink search={search} />
          </div>
          <comp.Pagination pages={result} hrefs={hrefs} current={page.url} />
          <comp.PostList postsList={page.results} />
          <comp.Pagination pages={result} hrefs={hrefs} current={page.url} />
        </>
      ),
    };
  }
}
