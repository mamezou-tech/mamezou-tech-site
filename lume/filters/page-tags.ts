import { generalTags } from "./utils.ts";
export const pageTags = (tags) => {
  if (!tags) return [];
  return tags
    .toString()
    .split(",")
    .filter((tag) => !generalTags.includes(tag));
};
