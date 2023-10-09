import { chop } from "./utils.ts";
import { Page } from "lume/core/filesystem.ts";

export const shortDesc = (pages: Page[], page: Page, defaultValue: string) => {
  const { src: { path } } = page;
  if (!path) return defaultValue;

  const isPost = path.includes("/posts/");
  if (!isPost) return defaultValue;

  const post = pages.find((el) => el.data.url === page.data.url);
  if (!post) return defaultValue;
  const content = post.data.children?.toString()
    .replace(/(<([^>]+)>)/gi, "")
    .replace(/[\r\n]/gi, "");
  return chop(content || "");
};
