import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ['学び'],
  category: '学び',
  url: (page: Page) => `/learning/${page.src.slug}/`
};

export default data;