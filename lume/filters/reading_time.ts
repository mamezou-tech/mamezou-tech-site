export const readingTime = (postOrContent: string | { content: string }) => {
  const htmlContent = typeof postOrContent === "string"
    ? postOrContent
    : postOrContent.content;

  if (!htmlContent) {
    return "0 min";
  }

  const normalized = htmlContent
    .replace(/(<([^>]+)>)/gi, "");
  return `${(Math.ceil(normalized.length / 1000))} min`;
};
