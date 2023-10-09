import * as UglifyJS from "npm:uglify-js@3.17.4";
import MarkdownIt from "markdown-it";
import * as Token from "markdown-it/lib/token";
import * as Renderer from "markdown-it/lib/renderer";
import { RenderRule } from "markdown-it/lib/renderer";
import Site from "lume/core/site.ts";

const defaultPluginOptions = {
  clipboardJSVersion: "2.0.11",
  buttonClass: "code-copy",
  successMessage: "Copied!",
  failureMessage: "Failed...",
};

type PluginOptions = typeof defaultPluginOptions;

const defaultRendererOptions = {
  iconifyUrl: "https://api.iconify.design/mdi/content-copy.svg",
  iconStyle: "width: 16px; height: 16px;",
  iconClass: "",
  iconTag: "span",
  buttonClass: "code-copy",
  buttonStyle:
    "position: absolute; top: 7.5px; right: 6px; padding-top: 3px; cursor: pointer; outline: none; opacity: 0.8;",
  additionalButtonClass: "",
  title: "Copy",
};

type RendererOptions = typeof defaultRendererOptions;

function renderCode(origRule: RenderRule, rendererOptions: RendererOptions) {
  return (
    tokens: Token[],
    idx: number,
    options: MarkdownIt.Options,
    env: any,
    self: Renderer,
  ) => {
    const origRendered = origRule(tokens, idx, options, env, self);
    if (tokens[idx].tag !== "code") {
      return origRendered;
    }
    if (!tokens[idx].info || tokens[idx].info === "mermaid") {
      return origRendered;
    }
    if (tokens[idx].content.length === 0) {
      return origRendered;
    }
    return `
<div style="position: relative">
  ${origRendered.replace(/<code/, `<code id="code-${idx}"`)}
  <button class="${rendererOptions.buttonClass} ${rendererOptions.additionalButtonClass}"
    data-clipboard-target="#code-${idx}"
    style="${rendererOptions.buttonStyle}" title="${rendererOptions.title}">
    <${rendererOptions.iconTag} style="display:inline-block;background:url(${rendererOptions.iconifyUrl}) no-repeat center center / contain;${rendererOptions.iconStyle}" class="${rendererOptions.iconClass}"></${rendererOptions.iconTag}>
  </button>
</div>
`;
  };
}

async function initClipboardJS(options: PluginOptions) {
  const __dirname = new URL(".", import.meta.url).pathname;
  const decoder = new TextDecoder("utf-8");
  const originSource = await Deno.readFile(`${__dirname}/init-clipboard.js`);
  const script = decoder.decode(originSource).replace(
    "new ClipboardJS('')",
    `new ClipboardJS('.${options.buttonClass}')`,
  )
    .replace("Copied!", options.successMessage)
    .replace("Failed...", options.failureMessage);
  const minified = UglifyJS.minify(script);
  if (minified.error) {
    throw minified.error;
  }
  return `<script>${minified.code}</script>
<script async src="https://cdn.jsdelivr.net/npm/clipboard@${options.clipboardJSVersion}/dist/clipboard.min.js"></script>`;
}

export default function (
  userPluginOptions?: Partial<PluginOptions>,
) {
  const pluginFallbackOptions = {
    ...defaultPluginOptions,
    ...userPluginOptions,
  };
  return async (site: Site) => {
    const tag = await initClipboardJS(pluginFallbackOptions);
    site.helper(
      "initClipboardJS",
      () => tag,
      // { type: 'tag', async: true }
      { type: "tag", async: false }, // not working for async true
    );
  };
}

export function markdownItCopyButton(
  md: MarkdownIt,
  rendererOptions: MarkdownIt.Options,
) {
  const rendererFallbackOptions = {
    ...defaultRendererOptions,
    ...rendererOptions,
  };
  md.renderer.rules.fence = renderCode(
    md.renderer.rules.fence,
    rendererFallbackOptions,
  );
}
