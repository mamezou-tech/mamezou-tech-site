import { Page } from 'lume/core/filesystem.ts';

const data = {
  url: (page: Page) => `/containers/k8s/tutorial/ops/${page.src.slug}/`
};

export default data;