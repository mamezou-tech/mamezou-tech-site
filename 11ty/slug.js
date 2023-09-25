import emojiRegex from "npm:emoji-regex";
import slugify from "npm:slugify";
export const slug = (str) => {
  if (!str) {
    return;
  }

  const regex = emojiRegex();
  // Remove Emoji first
  let string = str.replace(regex, "");

  return slugify(string, {
    lower: true,
    replacement: "-",
    remove: /[*+~·,()'"`´%!?¿:@\/]/g,
  });
};