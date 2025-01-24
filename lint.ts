import { createLinter, loadLinterFormatter } from "npm:textlint@13.3.3";
import { TextlintKernelDescriptor, TextlintResult } from "npm:@textlint/kernel@13.3.3";
import { moduleInterop } from "npm:@textlint/module-interop@13.3.3";
import * as jpPreset from "npm:textlint-rule-preset-ja-technical-writing@8.0.0";
import * as proofdict from "npm:@proofdict/textlint-rule-proofdict@^3.1.2";
import * as aws from "npm:textlint-rule-aws-spellcheck@^1.3.0";
import * as markdownProcessor from "npm:@textlint/textlint-plugin-markdown@13.3.3";
import * as allowlistFilter from "npm:textlint-filter-rule-allowlist";

const excludes = ["ja-no-weak-phrase"];
const filterRuleAllowExpressions = ["/:::/"]

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
  filterRules: [
    {
      ruleId: "filter-rule-allowlist",
      rule: moduleInterop(allowlistFilter.default),
      options: {
        allow: filterRuleAllowExpressions,
      },
    },
  ],
});

const linter = createLinter({
  descriptor: descriptor,
});
const results = await linter.lintFiles([...Deno.args]);

// resultsの中にある改行や連続空白を、半角スペースに置き換える
const resultsFormatted = results.map((result: TextlintResult) => {
  return {
    ...result,
    messages: result.messages.map((message) => ({
      ...message,
      message: message.message.replace(/[\n\t]/g, " ").replace(/\s+/g, " "),
    })),
  };
});

const formatter = await loadLinterFormatter({ formatterName: "stylish" });
const output = formatter.format(resultsFormatted);

console.log(output);
