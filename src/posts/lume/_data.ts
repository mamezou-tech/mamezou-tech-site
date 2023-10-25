import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ['lume', 'SSG', 'Deno'],
  category: 'Lume入門',
  url: (page: Page) => `/lume/${page.src.slug}/`
};

export default data;
