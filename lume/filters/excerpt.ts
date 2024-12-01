import { chop } from "./utils.ts";

function isReactComponent(target: any): target is React.ReactElement {
  return typeof target != "string" && "props" in target;
}

function normalizeContent(original: string) {
  const result = original.matchAll(/\[(?<title>[^\]]*)](?<url>\([^)]*\))/gm);
  let normalized = original;
  for (const m of result) {
    if (m.groups?.title) {
      normalized = normalized.replace(m[0], m.groups.title);
    }
  }
  return normalized.replace(/(<([^>]+)>)/gi, "");
}

export const excerpt = (content: string | React.ReactElement) => {
  if (!content) {
    console.log("Page contents not found!! something wrong...");
    return "";
  }
  const target = isReactComponent(content) ? content.props.children : content;
  return chop(normalizeContent(target), 250);
};
