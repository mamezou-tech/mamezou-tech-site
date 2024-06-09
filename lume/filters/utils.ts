import Search from "lume/core/searcher.ts";

export function filterByPost(pages: Lume.Data[]): Lume.Data[] {
  return pages.filter((item) => {
    return item.layout?.startsWith("layouts/post");
  });
}

export function getPostArticles(search: Search): Lume.Data[] {
  const pages = search.pages("exclude!=true translate!=true", "date=desc");
  return filterByPost(pages as Lume.Data[]);
}

export function chop(content: string, count = 150, en = false) {
  const firstDotPos = content.lastIndexOf(en ? "." : "。", count);
  if (firstDotPos !== -1) {
    return content.substring(0, firstDotPos) + "...";
  } else {
    return content.substring(0, content.lastIndexOf(en ? "," : "、", count)) + "...";
  }
}

export const generalTags = ["all", "nav", "pages", "no-page", "posts"];
