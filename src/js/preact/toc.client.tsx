import { render as preactRender } from "npm:preact@^10.11.0";
import { useEffect, useState } from "npm:preact@^10.11.0/hooks";
import { useHeadsObserver } from "./hooks.ts";

function slugify(target: string) {
  return target
    .trim()
    .toLowerCase()
    .replace(/[\s+~\/]/g, "-")
    .replace(/[().`,%·'"!?¿:@*]/g, "");
}

type Node = {
  tag: string;
  text: string;
  anchor: string;
  children?: Node[];
};

function Toc() {
  const [data, setData] = useState<Node[]>([]);
  const { activeId } = useHeadsObserver();

  useEffect(() => {
    const tags = document.querySelectorAll("h1,h2");
    const newData = Array.from(tags).slice(1)
      .map((t) => ({
        tag: t.tagName,
        text: t.textContent,
        anchor: "#" + t.id || slugify(t.textContent ?? ""),
      } as Node))
      .reduce((acc, cur) => {
        const last = acc.slice(-1)[0];
        if (!last || last.tag === cur.tag) {
          acc.push(cur);
        } else {
          last.children = last.children || [];
          last.children.push(cur);
        }
        return acc;
      }, [] as Node[]);
    setData(newData);

    document.addEventListener("scroll", (event) => {
      const toc: HTMLDivElement | null = document.querySelector(
        ".post__toc_preact",
      );
      if (!toc) return;
      const top = 300 - window.scrollY;
      toc.style.top = top < 0 ? "0" : `${top}px`;
    });
  }, []);
  const sendGa = (ev: React.MouseEvent<HTMLAnchorElement>, name: string) =>
    "gtag" in window && typeof window.gtag === "function" &&
    window.gtag("event", name, { type: "toc" });
  if (!data.length) return;

  const makeList = (nodes: Node[]) => {
    if (!nodes) return <></>;
    return (
      <ul>
        {nodes.map((node) => {
          if ("children" in node) {
            return (
              <li>
                <a
                  href={node.anchor}
                  className={slugify(activeId) === slugify(node.text)
                    ? "toc-current-header"
                    : ""}
                >
                  {node.text}
                </a>
                {makeList(node.children ?? [])}
              </li>
            );
          } else {
            return (
              <li>
                <a
                  href={node.anchor}
                  className={slugify(activeId) === slugify(node.text)
                    ? "toc-current-header"
                    : ""}
                >
                  {node.text}
                </a>
              </li>
            );
          }
        })}
      </ul>
    );
  };
  return (
    <div className="post__toc_preact">
      <p className="toc-container-header">Contents</p>
      {makeList(data)}
      <div>
        <a
          href="https://mamezou.connpass.com/"
          onClick={(ev: MouseEvent) => sendGa(ev, "click_mameyose")}
          target="_blank"
          rel="noreferrer noopener"
        >
          <img
            alt="mameyose"
            height="60"
            width="198"
            src="/img/logo/logo-mameyose_banner60.png"
            style={{ backgroundColor: "#ffffff" }}
          />
        </a>
      </div>
      <div>
        <a
          href="https://wwwrecruit.mamezou.com/"
          onClick={(ev) => sendGa(ev, "click_recruit")}
          target="_blank"
          rel="noreferrer noopener"
        >
          <img
            alt="recruit"
            height="60"
            width="200"
            src="/img/logo/recruit.jpeg"
          />
        </a>
      </div>
    </div>
  );
}

export function render(el: HTMLElement) {
  return preactRender(<Toc />, el);
}
