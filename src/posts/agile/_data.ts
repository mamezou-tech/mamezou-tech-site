import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ['アジャイル開発'],
  category: 'アジャイル開発',
  url: (page: Page) => `/agile/${page.src.slug}/`
};

export default data;
