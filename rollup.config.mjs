import { nodeResolve } from "@rollup/plugin-node-resolve";
import alias from '@rollup/plugin-alias';

export default {
  input: './components/preact/index.mjs',
  plugins: [nodeResolve(), alias({
    entries: [
      {find: 'react', replacement: 'preact/compat'},
      {find: 'react-dom/test-utils', replacement: 'preact/test-utils'},
      {find: 'react-dom', replacement: 'preact/compat'},
      {find: 'react/jsx-runtime', replacement: 'preact/jsx-runtime'},
    ]
  })
  ],
  output: {
    file: "public/components/preact/bundle.mjs",
    format: "esm"
  }
}