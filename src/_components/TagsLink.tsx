export default (
  { search }: Lume.Data,
  { validTags, url }: Lume.Helpers,
) => {
  const tags: string[] = validTags!(search.values("tags"));
  const makeHeadTagLinks = () => {
    const links = tags
      .slice(0, 50)
      .map((t) => (
        <span key={t}>
          <a href={url(`/tags/${t.toLowerCase()}/`)} className="post-tag">
            #{t}
          </a>
          {"\n"}
        </span>
      ));
    links.push(
      <a key="all-tags-link" id="show-all-tags" href="#">
        ...(全てのタグを表示)
      </a>,
    );
    return links;
  };

  const makeAllTagLinks = () => {
    return tags
      .map((tag) => (
        <span key={tag}>
          <a href={url(`/tags/${tag}/`)} className="post-tag">#{tag}</a>
          {"\n"}
        </span>
      ));
  };
  return (
    <>
      <span id="head-tags">
        {makeHeadTagLinks()}
      </span>
      <span id="all-tags" style={{ display: "none" }}>
        {makeAllTagLinks()}
      </span>
    </>
  );
};
