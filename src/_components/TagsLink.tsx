import { Helper } from "lume/core/renderer.ts";
import { Search } from "lume/plugins/search.ts";

export default (
  { search }: { search: Search },
  filters: Record<string, Helper>,
) => {
  const validTags: string[] = filters.validTags(search.tags());
  const makeHeadTagLinks = () => {
    const links = validTags
      .slice(0, 50)
      .map((tag) => (
        <span key={tag}>
          <a href={filters.url(`/tags/${tag}/`)} className="post-tag">#{tag}</a>
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
    return validTags
      .map((tag) => (
        <span key={tag}>
          <a href={filters.url(`/tags/${tag}/`)} className="post-tag">#{tag}</a>
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
