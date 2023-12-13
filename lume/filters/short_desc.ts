import { chop } from "./utils.ts";

export const shortDesc = (
  pages: Lume.Data[],
  pageData: Lume.Data,
  defaultValue: string,
) => {
  const path = pageData.page?.src.path;
  if (!path) return defaultValue;

  const isPost = path.includes("/posts/");
  if (!isPost) return defaultValue;

  const post = pages.find((el) => el.url === pageData.url);
  if (!post) return defaultValue;
  const content = post.children?.toString()
    .replace(/(<([^>]+)>)/gi, "")
    .replace(/[\r\n]/gi, "");
  return chop(content || "");
};
