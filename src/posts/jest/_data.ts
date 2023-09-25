import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ['テスト', 'jest'],
  category: 'テスト - Jest再入門',
  url: (page: Page) => `/testing/jest/${page.src.slug}/`
};

export default data;