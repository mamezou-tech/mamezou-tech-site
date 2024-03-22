import { Page } from 'lume/core/filesystem.ts';

const data = {
  category: 'ロボット - Beanus',
  url: (page: Page) => `/robotics/beanus/${page.src.slug}/`
};

export default data;