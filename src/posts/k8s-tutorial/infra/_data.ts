import { Page } from 'lume/core/filesystem.ts';

const data = {
  url: (page: Page) => `/containers/k8s/tutorial/infra/${page.src.slug}/`
};

export default data;