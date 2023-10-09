import { createLinter, loadLinterFormatter } from "npm:textlint@13.3.3";
import { TextlintKernelDescriptor } from "npm:@textlint/kernel@13.3.3";
import { moduleInterop } from "npm:@textlint/module-interop@13.3.3";
import * as jpPreset from "npm:textlint-rule-preset-ja-technical-writing@8.0.0";
import * as proofdict from "npm:@proofdict/textlint-rule-proofdict@^3.1.2";
import * as aws from "npm:textlint-rule-aws-spellcheck@^1.3.0";
import * as markdownProcessor from "npm:@textlint/textlint-plugin-markdown@13.3.3";

const excludes = ["ja-no-weak-phrase"];
const presetRules = Object.entries(jpPreset.rules).map(([id, module]) => ({
  ruleId: id,
  rule: module as any,
  options: {
    ...jpPreset.rulesConfig[id],
  },
})).filter((rule) => !excludes.includes(rule.ruleId));

const descriptor: TextlintKernelDescriptor = new TextlintKernelDescriptor({
  rules: [
    {
      ruleId: "aws-spellcheck",
      rule: moduleInterop(aws.default),
    },
    {
      ruleId: "@proofdict/proofdict",
      rule: moduleInterop(proofdict.default),
      options: {
        dictURL: "https://azu.github.io/proof-dictionary/",
        denyTags: ["opinion"],
      },
    },
    ...presetRules,
  ],
  plugins: [{
    pluginId: "@textlint/markdown",
    plugin: moduleInterop(markdownProcessor.default) as any,
    options: {
      extensions: ".md",
    },
  }],
  filterRules: [],
});

const linter = createLinter({
  descriptor: descriptor,
});
const results = await linter.lintFiles([...Deno.args]);
const formatter = await loadLinterFormatter({ formatterName: "stylish" });
const output = formatter.format(results);

console.log(output);
