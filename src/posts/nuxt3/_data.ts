import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ["nuxt", "vue"],
  category: 'Nuxt3入門',
  url: (page: Page) => `/nuxt/${page.src.slug}/`
};

export default data;