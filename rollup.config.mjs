import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import path from "path";
import url from "url";

const isWatching = !!process.env.ROLLUP_WATCH;
const sdPlugin = "com.simhub.buttonbox.sdPlugin";

export default {
  input: "src/plugin.ts",
  output: {
    file: `${sdPlugin}/bin/plugin.js`,
    sourcemap: isWatching ? "inline" : false,
    sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
      return url.pathToFileURL(
        path.resolve(path.dirname(sourcemapPath), relativeSourcePath)
      ).href;
    },
  },
  plugins: [
    {
      name: "watch-externals",
      buildStart() {
        if (isWatching) {
          this.addWatchFile(`${sdPlugin}/manifest.json`);
        }
      },
    },
    typescript({
      mapRoot: isWatching ? "./" : undefined,
    }),
    nodeResolve({
      exportConditions: ["node"],
      // Bundle all non-Node-built-in packages (ws, etc.)
      resolveOnly: [/^(?!node:).*/],
    }),
    commonjs(),
    {
      name: "emit-module-package-file",
      generateBundle() {
        this.emitFile({
          fileName: "package.json",
          source: `{ "type": "module" }`,
          type: "asset",
        });
      },
    },
  ],
};
