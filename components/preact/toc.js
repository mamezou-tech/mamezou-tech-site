import { html } from "htm/preact";
import render from "preact-render-to-string";
import { hydrate as preactHydrate } from "preact";
import { useEffect, useState } from "preact/hooks";

function slugify(target) {
  return target
    .trim()
    .toLowerCase()
    .replace(/[\s+~\/]/g, "-")
    .replace(/[().`,%·'"!?¿:@*]/g, "");
}

function Toc() {
  const [data, setData] = useState([]);
  useEffect(() => {
    const tags = document.querySelectorAll("h1,h2");
    const newData = [...tags].slice(1)
      .map(t => ({
        tag: t.tagName,
        text: t.textContent,
        anchor: "#" + t.id || slugify(t.textContent)
      }))
      .reduce((acc, cur) => {
        const last = acc.slice(-1)[0];
        if (!last || last.tag === cur.tag) {
          acc.push(cur);
        } else {
          last.children = last.children || [];
          last.children.push(cur);
        }
        return acc;
      }, []);
    setData(newData);

    document.addEventListener("scroll", (event) => {
      const toc = document.querySelector(".post__toc_preact");
      if (!toc) return;
      const top = 370 - window.scrollY;
      toc.style.top = top < 0 ? 0 : `${top}px`;
    });
  }, []);
  if (!data.length) return;

  const makeList = (nodes) => {
    if (!nodes) return "";
    return html`<ul>
      ${nodes.map((node) => {
      if ("children" in node) {
        return makeList(node.children);
      } else {
        return html`
          <li><a href="${node.anchor}">${node.text}</a></li>`;
      }
    })}
    </ul>`;
  };
  return html`
    <div className="post__toc_preact">
      <p className="toc-container-header">Contents</p>
      ${makeList(data)}
    </div>`;
}

export function toHtml() {
  return render(html`
    <${Toc} />`);
}

export function renderToc(el) {
  return preactHydrate(html`
    <${Toc} />`, el);
}
