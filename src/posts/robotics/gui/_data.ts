import { Page } from 'lume/core/filesystem.ts';

const data = {
  category: 'ロボット - GUI',
  url: (page: Page) => `/robotics/gui/${page.src.slug}/`
};

export default data;