import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ["oss"],
  category: 'OSS',
  url: (page: Page) => `/oss-intro/${page.src.slug}/`
};

export default data;