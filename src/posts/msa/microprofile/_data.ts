import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ["mp", "java"],
  category: 'マイクロサービス - MicroProfile',
  url: (page: Page) => `/msa/mp/${page.src.slug}/`
};

export default data;