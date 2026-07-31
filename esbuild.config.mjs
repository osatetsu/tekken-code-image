import * as esbuild from "esbuild";
import { copyFileSync, readFileSync } from "fs";

const production = process.argv.includes("--production");

const svgLoader = {
  name: "svg-loader",
  setup(build) {
    build.onLoad({ filter: /\.svg$/ }, async (args) => {
      const text = readFileSync(args.path, "utf8");
      return {
        contents: text,
        loader: "text",
      };
    });
  },
};

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "main.js",
  format: "cjs",
  target: "es2020",
  sourcemap: production ? false : "inline",
  minify: production,
  loader: {
    ".svg": "text",
  },
  plugins: [svgLoader],
  external: ["obsidian"],
  platform: "node",
  logLevel: "info",
});

if (production) {
  await ctx.rebuild();
  await ctx.dispose();
  copyFileSync("src/svg/shapes.svg", "shapes.svg");
} else {
  await ctx.watch();
}
