import { PaginateOptions } from "lume/plugins/paginate.ts";
import { filterByPost } from "../../lume/filters/utils.ts";
import { Page } from "lume/core/filesystem.ts";
import { encodeUrl } from "encodeurl";
import { PageData } from "lume/core.ts";

export const layout = "layouts/page.njk";
export const title = "ブログ";
export const description = "豆蔵エンジニアの技術ブログ";
export const icon =
  "https://api.iconify.design/material-symbols/article-outline.svg?color=%23730099&height=28";
export const titleImage = "/img/logo/mame-kun3_50.png";
export const hideCategory = true;

export default function* ({ search, paginate, comp }: PageData) {
  const pages = search.pages("posts exclude!=true", "date=desc");
  const posts = filterByPost(pages as Page[]);
  const options: PaginateOptions = {
    url: (n: number) => `/blogs/${n > 1 ? `${n.toString()}/` : ""}`,
    size: 20,
  };
  const result = paginate(posts, options);
  const hrefs = result.map((r) => encodeUrl(r.url)); // 11ty compatibility
  for (let i = 0; i < result.length; i++) {
    const page = result[i];
    yield {
      url: page.url,
      tags: i === 0 ? ["pages"] : undefined,
      content: (
        <>
          <comp.Pagination pages={result} hrefs={hrefs} current={page.url} />
          <comp.PostList postsList={page.results} />
          <comp.Pagination pages={result} hrefs={hrefs} current={page.url} />
        </>
      ),
    };
  }
}
