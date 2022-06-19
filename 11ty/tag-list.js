module.exports = (collection) => {
  let tagSet = new Set();
  collection.getAll().forEach(item => {
    if ('tags' in item.data) {
      let tags = item.data.tags;

      tags = tags.filter(item => {
        switch (item) {
          case 'all':
          case 'nav':
          case 'pages':
          case 'no-page':
          case 'posts':
            return false;
        }

        return true;
      });

      for (const tag of tags) {
        tagSet.add(tag);
      }
    }
  });
  return [...tagSet].sort();
};