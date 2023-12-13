import { DateTime } from "luxon";
export const articleDate = (posts: Lume.Data[], url: string) => {
  const post = posts.find((post) =>
    post.url && post.url.toLowerCase() === url.toLowerCase()
  );
  if (!post) {
    return "";
  }
  return DateTime.fromJSDate(post.date).toISODate();
};
