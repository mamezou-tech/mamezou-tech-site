import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ['iot'],
  category: 'IoT',
  url: (page: Page) => `/iot/${page.src.slug}/`
};

export default data;