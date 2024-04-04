import { DateTime } from 'luxon';

const dropPrefix = (fileSlug: string) =>
  /^\d{4}_.*$/.test(fileSlug) ? fileSlug.substring(5) : fileSlug;

const data = {
  pageNavigationTag: 'posts',
  tags: ['posts'],
  category: 'ブログ',
  url: (page: Lume.Page) => {
    const dt = DateTime.fromJSDate(page.data.date);
    const fileName = dropPrefix(page.data.basename);
    return `/en/blogs/${dt.toFormat('yyyy/LL/dd')}/${fileName}/`;
  }
};

export default data;
