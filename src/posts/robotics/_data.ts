import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ["ロボット"],
  category: 'ロボット',
  url: (page: Page) => `/robotics/${page.src.slug}/`
};

export default data;