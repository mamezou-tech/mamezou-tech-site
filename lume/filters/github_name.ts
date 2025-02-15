import contributorsJson from "../../src/_data/contributors.json" with {
  type: "json",
};
export const githubName = (authorName: string): string | "NA" | undefined => {
  const contributor = contributorsJson.contributors.find((contributor) =>
    contributor.name === authorName
  );
  if (!contributor) return undefined;
  return contributor.github ? contributor.github : "NA";
};
