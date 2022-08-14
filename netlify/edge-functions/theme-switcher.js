import includesNonPageAssets from "./includes-non-page-assets.js";

export default async (request, context) => {
  try {
    const url = new URL(request.url);
    if (includesNonPageAssets(url.pathname)) {
      return; // css, font, etc...
    }
    const theme = url.searchParams.get("theme");
    if (!theme) {
      return context.next();
    }
    context.log("change theme", request.url, theme)
    const expires = new Date();
    expires.setTime(expires.getTime() + 365 * 24 * 3600 * 1000); // 1 year
    context.cookies.set({
      name: "theme",
      path: "/",
      value: theme,
      expires,
      secure: true,
      httpOnly: true,
      sameSite: "Lax",
    });
    return new Response(null, {
      status: 302,
      headers: {
        location: url.pathname,
      },
    });
  } catch (e) {
    context.log(e);
    return context.next(e);
  }
};
