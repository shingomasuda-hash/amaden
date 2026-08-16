#!/usr/bin/env node
/*
 * ビルドスクリプト
 * src/app.html（React CDN版・可読ソース）から、CDNへの外部リクエストなしで
 * 単体で開ける index.html（React/ReactDOM/Babel埋め込み＋Tailwindを事前コンパイル）を生成します。
 *
 * 使い方: npm install && npm run build
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const srcPath = path.join(root, "src", "app.html");
const outPath = path.join(root, "index.html");
const cssPath = path.join(root, ".build-tailwind.css");

const pkgDir = (name) => path.dirname(require.resolve(`${name}/package.json`));
const react = fs.readFileSync(path.join(pkgDir("react"), "umd", "react.production.min.js"), "utf8");
const reactDom = fs.readFileSync(path.join(pkgDir("react-dom"), "umd", "react-dom.production.min.js"), "utf8");
const babel = fs.readFileSync(path.join(pkgDir("@babel/standalone"), "babel.min.js"), "utf8");

// 使用されているクラスだけを静的にコンパイル（ランタイムJITではなく事前ビルドのCSSを埋め込む）
execFileSync(
  path.join(root, "node_modules", ".bin", "tailwindcss"),
  ["-i", path.join(root, "scripts", "tailwind-input.css"), "-o", cssPath, "--minify", "--config", path.join(root, "scripts", "tailwind.config.js")],
  { stdio: "inherit" }
);
const tw = fs.readFileSync(cssPath, "utf8");
fs.unlinkSync(cssPath);

const src = fs.readFileSync(srcPath, "utf8");
let out = src;
out = out.split('<script src="https://cdn.tailwindcss.com"></script>\n').join("");
out = out
  .split('<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js" crossorigin></script>\n')
  .join("<script>" + react + "</script>\n");
out = out
  .split('<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js" crossorigin></script>\n')
  .join("<script>" + reactDom + "</script>\n");
out = out
  .split('<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js" crossorigin></script>\n')
  .join("<script>" + babel + "</script>\n");
out = out.split("<style>").join("<style>\n/* Tailwind (statically compiled) */\n" + tw + "\n");

fs.writeFileSync(outPath, out);
console.log(`Built ${outPath} (${Buffer.byteLength(out)} bytes)`);
