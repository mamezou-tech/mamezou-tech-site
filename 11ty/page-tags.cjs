const { generalTags } = require("./utils.cjs");
module.exports = (tags) => {
  return (tags || "")
    .toString()
    .split(",")
    .filter((tag) => !generalTags.includes(tag));
};
