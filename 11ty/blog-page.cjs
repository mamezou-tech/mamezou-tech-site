module.exports = (fileSlug) => {
  if (/^\d{4}_.*$/.test(fileSlug)) {
    return fileSlug.substring(5);
  }
  return fileSlug;
};