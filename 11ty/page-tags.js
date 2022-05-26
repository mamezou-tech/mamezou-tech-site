module.exports = (tags) => {
  const generalTags = ['all', 'nav', 'post'];

  return tags
    .toString()
    .split(',')
    .filter((tag) => {
      return !generalTags.includes(tag);
    });
};