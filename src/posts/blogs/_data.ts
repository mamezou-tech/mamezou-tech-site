import { Page } from 'lume/core/filesystem.ts';
import { DateTime } from 'luxon';

const dropPrefix = (fileSlug: string) =>
  /^\d{4}_.*$/.test(fileSlug) ? fileSlug.substring(5) : fileSlug;

const data = {
  pageNavigationTag: 'posts',
  tags: ['posts'],
  category: 'ブログ',
  url: (page: Page) => {
    const dt = DateTime.fromJSDate(page.data.date);
    const fileName = dropPrefix(page.src.slug);
    return `/blogs/${dt.toFormat('yyyy/LL/dd')}/${fileName}/`;
  }
};

export default data;
