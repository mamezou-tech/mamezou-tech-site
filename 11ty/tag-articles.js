const tagList = require("./tag-list");
const {getPosts} = require("./utils");

module.exports = (collection) => {
  const tagArticles = {};
  const tags = tagList(collection);
  tags.forEach(tag => {
    tagArticles[tag] = {
      tag,
      articles: []
    };
  });
  // assign
  getPosts(collection).forEach(article => {
    tags.filter(tag => (article.data.tags || []).includes(tag)).forEach(tag => {
      tagArticles[tag].articles.push(article);
    })
  });
  // pagination
  const chunkSize = 10;
  return Object.keys(tagArticles).reduce((state, tag) => {
    const articles = tagArticles[tag].articles.sort((a, b) => b.date - a.date);
    for (let i = 0; i < articles.length; i += chunkSize) {
      const chunk = articles.slice(i, i + chunkSize);
      state.push({
        ...tagArticles[tag], pageIndex: i / chunkSize, articles: chunk,
      })
    }
    return state;
  }, []);
};