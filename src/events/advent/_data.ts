import { Page } from 'lume/core/filesystem.ts';

const data = {
    layout: 'event.njk',
    category: 'event',
    url: (page: Page) => `/events/advent-calendar/${page.src.slug}/`
};

export default data;