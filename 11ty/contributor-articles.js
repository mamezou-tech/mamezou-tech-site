const contributors = require("../src/_data/contributors");
const {getPosts} = require("./utils")

function log(authorArticles) {
  Object.values(authorArticles).forEach(v => {
    const result = v.articles.reduce((acc, cur) => {
      const ym = cur.date.getFullYear() + "-" + (cur.date.getMonth() + 1)
      const found = acc.findIndex(a => a.ym === ym);
      if (found >= 0) {
        acc[found].count++;
      } else {
        acc.push({ym, count: 1});
      }
      return acc;
    }, []);
    console.log(v.name, result);
  });
}

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
  // log(authorArticles);
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