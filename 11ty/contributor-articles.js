const contributors = require("../src/_data/contributors");
const {getPosts} = require("./utils")
module.exports = (collection) => {
  const authorArticles = {};
  Object.keys(contributors).forEach(name => {
    authorArticles[name] = {
      github: contributors[name], name, articles: [],
    }
  })
  // assign
  getPosts(collection).forEach((article) => {
    const author = contributors[article.data.author];
    if (author) {
      authorArticles[article.data.author].articles.push(article);
    }
  });
  // pagination
  const chunkSize = 10;
  return Object.keys(authorArticles).reduce((state, name) => {
    const articles = authorArticles[name].articles.sort((a, b) => b.date - a.date);
    for (let i = 0; i < articles.length; i += chunkSize) {
      const chunk = articles.slice(i, i + chunkSize);
      state.push({
        ...authorArticles[name], pageIndex: i / chunkSize, articles: chunk,
      });
    }
    return state;
  }, []);
};