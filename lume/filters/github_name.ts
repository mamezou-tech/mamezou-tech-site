import contributorsJson from "../../src/_data/contributors.json" assert {
  type: "json",
};
export const githubName = (authorName: string): string => {
  const contributor = contributorsJson.contributors.find((contributor) =>
    contributor.name === authorName
  );
  return contributor ? contributor.github : "";
};
