import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  input: './components/preact/index.mjs',
  plugins: [nodeResolve()],
  output: {
    file: "public/components/preact/bundle.mjs",
    format: "esm"
  }
}