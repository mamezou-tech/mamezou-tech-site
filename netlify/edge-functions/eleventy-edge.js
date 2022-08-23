import { EleventyEdge } from "eleventy:edge";
import precompiledAppData from "./_generated/eleventy-edge-app-data.js";
import includesNonPageAssets from "./includes-non-page-assets.js";

export default async (request, context) => {
  try {
    const url = new URL(request.url);
    if (includesNonPageAssets(url.pathname)) {
      return; // css, font, etc...
    }
    context.log("apply 11ty edge", request.url)
    const edge = new EleventyEdge("edge", {
      request,
      context,
      precompiled: precompiledAppData,
      cookies: ["theme"],
    });

    edge.config((eleventyConfig) => {
      // Add some custom Edge-specific configuration
      // e.g. Fancier json output
      // eleventyConfig.addFilter("json", (obj) => JSON.stringify(obj, null, 2));
    });

    return await edge.handleResponse();
  } catch (e) {
    console.log("ERROR", { e });
    return context.next();
  }
};
