const emojiRegex = require("emoji-regex");
const slugify = require("slugify");
module.exports = (str) => {
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