import contributorsJson from "../../src/_data/contributors.json" assert {
  type: "json",
};
import { Page } from "lume/core/filesystem.ts";
// TODO: ログはイベントフックへ
function log(authorArticles: { [name: string]: Omit<Author, "pageIndex"> }) {
  Object.values(authorArticles).forEach((v) => {
    const result = v.articles.reduce((acc, cur) => {
      if (!cur.data.date) return acc;
      const ym = cur.data.date.getFullYear() + "-" +
        (cur.data.date.getMonth() + 1);
      const found = acc.findIndex((a) => a.ym === ym);
      if (found >= 0) {
        acc[found].count++;
      } else {
        acc.push({ ym, count: 1 });
      }
      return acc;
    }, [] as { ym: string; count: number }[]);
    console.log(v.name, result);
  });
}

export type Author = {
  github: string;
  name: string;
  pageIndex: number;
  articles: Page[];
};

export const githubName = (authorName: string): string => {
  const contributor = contributorsJson.contributors.find((contributor) =>
    contributor.name === authorName
  );
  return contributor ? contributor.github : "";
};
