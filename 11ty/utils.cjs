function getPosts(collection) {
  return collection.getAll().filter(item => {
    if ('layout' in item.data) {
      return item.data.layout === 'post';
    }
    return false;
  }).sort((a, b) => a.date - b.date);
}

function chop(content, count = 150) {
  const firstDotPos = content.lastIndexOf('。', count);
  if (firstDotPos !== -1) {
    return content.substring(0, firstDotPos) + '...';
  } else {
    return content.substring(0, content.lastIndexOf('、', count)) + '...';
  }
}

const generalTags = ["all", "nav", "pages", "no-page", "posts"]

module.exports = {
  getPosts,
  chop,
  generalTags,
}