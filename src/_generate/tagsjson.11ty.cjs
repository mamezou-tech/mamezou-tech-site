module.exports = {
  data: () => ({
    pagination: {
      data: "collections.tagList",
      size: 1,
      addAllPagesToCollections: true
    },
    permalink: (data) => `/tags/${data.pagination.items[0]}.json`,
    eleventyExcludeFromCollections: true,
  }),
  render(data) {
    const tag = data.pagination.items[0];
    return JSON.stringify({
      articles: data.collections[tag].map(page => ({title: page.data.title, url: page.url}))
    });
  }
}
