import { generalTags } from "./utils.ts";

export const validTags = (tags: string[]) => {
  const filtered = tags.filter((item) =>
    !generalTags.find((tag) => item === tag)
  );
  return filtered.slice().sort();
};
