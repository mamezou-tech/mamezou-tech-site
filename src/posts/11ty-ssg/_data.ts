import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ['11ty', 'SSG'],
  category: 'Eleventy(11ty)入門',
  url: (page: Page) => `/11ty/${page.src.slug}/`
};

export default data;