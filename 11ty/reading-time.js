module.exports = (postOrContent) => {
  const htmlContent =
    typeof postOrContent === 'string'
      ? postOrContent
      : postOrContent.templateContent;

  if (!htmlContent) {
    return "0 min";
  }

  const normalized = htmlContent
    .replace(/(<([^>]+)>)/gi, "");
  return `${(Math.ceil(normalized.length / 1000))} min`;
}