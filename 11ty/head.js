module.exports = (array, n) => {
  if (!array) {
    return [];
  }
  if (n < 0) {
    return array.slice(n);
  }
  return array.slice(0, n);
};