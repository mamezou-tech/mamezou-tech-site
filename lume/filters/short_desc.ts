import { chop } from "./utils.ts";

function isPage(target: Lume.Data | Lume.Page): target is Lume.Page {
  return "src" in target;
}
export const shortDesc = (
  pages: Lume.Data[],
  pageData: Lume.Data | Lume.Page,
  defaultValue: string,
) => {
  const [path, url] = isPage(pageData)
    ? [pageData.src.path, pageData.data.url]
    : [pageData.page.src.path, pageData.url];
  if (!path) {
    return defaultValue;
  }

  const isPost = path.includes("/posts/");
  if (!isPost) {
    return defaultValue;
  }

  const post = pages.find((el) => el.url === url);
  if (!post) {
    return defaultValue;
  }
  const content = post.children?.toString()
    .replace(/(<([^>]+)>)/gi, "")
    .replace(/[\r\n]/gi, "") ?? "";
  if (path.includes("/en/posts")) {
    return chop(
      content.replace(
        /^.*To reach a broader audience, this article has been translated from Japanese\.You can find the original version here\./,
        "",
      ),
      400,
      true,
    );
  } else if (path.includes("/zh-CN/posts")) {
    return chop(
      content.replace(
        /^.*为了覆盖更广泛的受众，这篇文章已从日语翻译而来。您可以在这里找到原始版本。/,
        "",
      ),
      400,
      true,
    );
  } else {
    return chop(content, 250, false);
  }
};
