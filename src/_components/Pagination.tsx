import { PaginateResult } from "lume/plugins/paginate.ts";

interface Props extends Lume.Data {
  pages: PaginateResult<Lume.Page>[];
  hrefs: string[];
  current: string;
}

export default ({ pages, hrefs, current }: Props) => {
  if (!pages.length) return null;
  return (
    <nav className="tdbc-pagination" aria-labelledby="tdbc-pagination">
      {pages.map((page, index) => {
        if (current === hrefs[index]) {
          return <span key={index} className="current-page">{index + 1}</span>;
        } else {
          return <a key={index} href={hrefs[index]}>{index + 1}</a>;
        }
      })}
    </nav>
  );
};
