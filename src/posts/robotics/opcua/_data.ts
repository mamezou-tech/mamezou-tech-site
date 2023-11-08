import { Page } from 'lume/core/filesystem.ts';

const data = {
  category: 'ロボット - OPC-UA',
  url: (page: Page) => `/robotics/opcua/${page.src.slug}/`
};

export default data;