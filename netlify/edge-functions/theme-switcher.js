export default async (request, context) => {
  try {
    const url = new URL(request.url);
    if (!url.pathname.endsWith("/")) {
      return; // css, font, etc...
    }
    const theme = url.searchParams.get("theme");
    if (!theme) {
      return context.next();
    }
    context.log("change theme", request.url, theme)
    const expires = new Date();
    expires.setTime(expires.getTime() + 5 * 24 * 3600 * 1000);
    context.cookies.set({
      name: "theme",
      path: "/",
      value: theme,
      expires,
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
