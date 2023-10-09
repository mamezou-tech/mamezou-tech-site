import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ["社内プロジェクト", "sss"],
  category: '社内プロジェクト - Sales Support System',
  url: (page: Page) => `/in-house-project/sss/${page.src.slug}/`
};

export default data;