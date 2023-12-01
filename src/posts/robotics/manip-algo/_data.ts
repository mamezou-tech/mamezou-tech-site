import { Page } from 'lume/core/filesystem.ts';

const data = {
  category: 'ロボット - ロボット工学',
  url: (page: Page) => `/robotics/manip-algo/${page.src.slug}/`
};

export default data;