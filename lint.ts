import { TextLintEngine } from "textlint";
import "npm:textlint-rule-preset-ja-technical-writing";
import "npm:@proofdict/textlint-rule-proofdict@^3.1.2";
import "npm:textlint-rule-aws-spellcheck@^1.3.0";
import "npm:textlint-rule-preset-ja-technical-writing@^7.0.0";

const engine = new TextLintEngine();
const results = await engine.executeOnFiles(Deno.args);
if (engine.isErrorResults(results)) console.log(engine.formatResults(results));