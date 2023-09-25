import { Page } from 'lume/core/filesystem.ts';

const data = {
  category: 'ロボット - ロボットビジョン',
  url: (page: Page) => `/robotics/vision/${page.src.slug}/`
};

export default data;