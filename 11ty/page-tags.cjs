const { generalTags } = require("./utils.cjs");
module.exports = (tags) => {
  if (!tags) return [];
  return (tags)
    .toString()
    .split(",")
    .filter((tag) => !generalTags.includes(tag));
};
