import { Page } from 'lume/core/filesystem.ts';

const data = {
    tags: 'pages',
    layout: 'layouts/page.njk',
    url: (page: Page) => `/${page.src.slug}/`
};

export default data;