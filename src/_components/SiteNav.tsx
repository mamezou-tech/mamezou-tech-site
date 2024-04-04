interface Props extends Lume.Data {
  meta: Record<string, any>;
}
export default ({ search, meta }: Props) => (
  <nav aria-labelledby="tdbc-siteid" className="tdbc-sitenav">
    <section className="top-nav">
      <div>
        <a id="tdbc-siteid" className="text-mz" href="/">
          <img alt="logo" src="/img/logo/mz-tech-logo-icon.png" />
          &nbsp;|&nbsp;{meta.siteName}
        </a>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div id="search" style={{ marginRight: "1rem" }} />
        <div>
          <input id="menu-toggle" type="checkbox" />
          <label className="menu-button-container" htmlFor="menu-toggle">
            <div className="menu-button"></div>
          </label>
          <ul className="menu">
            {search.pages("pages exclude!=true translate!=true").map((page) => (
              <li key={page?.url}>
                <a
                  href={page?.url}
                >
                  {page?.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  </nav>
);
