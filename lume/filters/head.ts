export const head = (array: unknown[], n: number) => {
  if (!array) {
    return [];
  }
  if (n < 0) {
    return array.slice(n);
  }
  return array.slice(0, n);
};
