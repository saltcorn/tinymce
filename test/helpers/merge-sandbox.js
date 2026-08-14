// Loads the browser-only merge helper (public/html_merge_helper.js) plus its
// UMD dependencies (himalaya, jsondiffpatch) into a vm context that mimics
// the browser globals it expects (window.himalaya, window.jsondiffpatch),
// exactly like the plugin's <script> tags do at runtime (see index.js
// `headers`). This lets us exercise window.mergeVersions from Node without
// a browser or bundler.

const vm = require("vm");
const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

const makeMergeSandbox = () => {
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.console = console;
  vm.createContext(sandbox);

  for (const file of [
    "himalaya.js",
    "jsondiffpatch.umd.min.js",
    "html_merge_helper.js",
  ]) {
    const src = fs.readFileSync(path.join(PUBLIC_DIR, file), "utf8");
    vm.runInContext(src, sandbox, { filename: file });
  }
  return sandbox;
};

module.exports = { makeMergeSandbox };
