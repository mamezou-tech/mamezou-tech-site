import { DateTime } from "luxon";
import { Page } from "lume/core/filesystem.ts";

export const getDate = (posts: Page[], url: string) => {
  const post = posts.find((post) =>
    post.data.url && post.data.url.toLowerCase() === url.toLowerCase()
  );
  if (!post) {
    return "";
  }
  return DateTime.fromJSDate(post.data.date).toISODate();
};
