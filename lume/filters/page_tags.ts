import { generalTags } from "./utils.ts";
export const pageTags = (tags?: string[]) => {
  if (!tags) return [];
  return tags.filter((tag) => !generalTags.includes(tag));
};
