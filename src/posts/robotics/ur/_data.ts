import { Page } from 'lume/core/filesystem.ts';

const data = {
  category: 'ロボット - UR',
  url: (page: Page) => `/robotics/ur/${page.src.slug}/`
};

export default data;