import { Data, Page } from "lume/core/filesystem.ts";
import { Search } from "lume/plugins/search.ts";

export function filterByPost<T extends Page | Data>(pages: T[]): T[] {
  return pages.filter((item) => {
    if (isPage(item)) {
      return item.data.layout?.startsWith("post");
    }
    return item.layout?.startsWith("post");
  });
}

export function getPostArticles(search: Search): Page[] {
  const pages = search.pages("exclude!=true", "date=desc");
  return filterByPost(pages as Page[]);
}

function isPage(target: Page | Data): target is Page {
  return target.data;
}

export function chop(content: string, count = 150) {
  const firstDotPos = content.lastIndexOf("。", count);
  if (firstDotPos !== -1) {
    return content.substring(0, firstDotPos) + "...";
  } else {
    return content.substring(0, content.lastIndexOf("、", count)) + "...";
  }
}

export const generalTags = ["all", "nav", "pages", "no-page", "posts"];
