import { Search } from 'lume/plugins/search.ts';

export default ({ search, meta }: {
  search: Search,
  meta: Record<string, any>
}) => (
  <nav aria-labelledby="tdbc-siteid" className="tdbc-sitenav">
    <section className="top-nav">
      <div>
        <a id="tdbc-siteid" href="/">
          <img alt="logo" src="/img/logo/mz-tech-logo-icon.png" />
          &nbsp;|&nbsp;{meta.siteName}
        </a>
      </div>
      <input id="menu-toggle" type="checkbox" />
      <label className="menu-button-container" htmlFor="menu-toggle">
        <div className="menu-button"></div>
      </label>
      <ul className="menu">
        {search.pages('pages exclude!=true').map((page) => <li key={page?.data.url}><a
          href={page?.data.url}>{page?.data.title}</a></li>)}
      </ul>
    </section>
  </nav>
)
