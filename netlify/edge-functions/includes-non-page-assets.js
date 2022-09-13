export default (path) => {
  return path.startsWith("/img") ||
    path.startsWith("/admin") ||
    path.startsWith("/fonts") ||
    path.startsWith("/css") ||
    path.startsWith("/photoswipe") ||
    path.startsWith("/previews") ||
    path.startsWith("/feed") ||
    path.endsWith(".js") ||
    path === "/robots.txt" ||
    path === "/sitemap.xml"
}