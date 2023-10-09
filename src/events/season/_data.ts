import { Page } from 'lume/core/filesystem.ts';

const data = {
    layout: 'season.njk',
    category: 'event',
    url: (page: Page) => `/events/season/${page.src.slug}/`
};

export default data;