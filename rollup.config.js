import pkg from "./package.json";
import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import peerDepsExternal from "rollup-plugin-peer-deps-external";
import replace from "@rollup/plugin-replace";
import resolve from "@rollup/plugin-node-resolve";
import serve from "rollup-plugin-serve";
import commonjs from "@rollup/plugin-commonjs";

const dev = process.argv.indexOf("-w") > -1;

const globals = {
  react: "React",
  "react-dom": "ReactDOM",
};

const plugins = [resolve({ preferBuiltins: true }), commonjs(), typescript()];

if (!dev) {
  plugins.unshift(peerDepsExternal());
  plugins.push(terser());
} else {
  plugins.unshift(
    replace({
      "process.env.NODE_ENV": JSON.stringify(
        dev ? "development" : "production"
      ),
      preventAssignment: true,
    })
  );
  plugins.push(serve(["dist", "public"]));
}

const lib = {
  input: "src/index.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
      globals,
    },
    {
      file: pkg.module,
      format: "esm",
      globals,
    },
  ],
  external: ["react", "react-dom"],
  plugins,
};

const exampleClient = {
  input: "public/example.tsx",
  output: {
    file: "dist/example.js",
    format: "iife",
  },
  plugins,
  watch: {
    exclude: "node_modules/**",
  },
};

export default dev ? exampleClient : lib;
