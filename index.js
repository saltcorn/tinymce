const {
  input,
  div,
  text,
  script,
  domReady,
  textarea,
  style,
} = require("@saltcorn/markup/tags");
const File = require("@saltcorn/data/models/file");
const User = require("@saltcorn/data/models/user");
const {
  standardConfigFields,
  initTiny,
  encodeAmpersands,
} = require("./common");
const { features } = require("@saltcorn/data/db/state");

const headers = [
  {
    script: `/plugins/public/tinymce${
      features?.version_plugin_serve_path
        ? "@" + require("./package.json").version
        : ""
    }/tinymce.min.js`,
  },
  {
    script: `/plugins/public/tinymce${
      features?.version_plugin_serve_path
        ? "@" + require("./package.json").version
        : ""
    }/drawio_plugin.js`,
  },
  {
    script: `/plugins/public/tinymce${
      features?.version_plugin_serve_path
        ? "@" + require("./package.json").version
        : ""
    }/tasklist_plugin.js`,
  },

  {
    script: `/plugins/public/tinymce${
      features?.version_plugin_serve_path
        ? "@" + require("./package.json").version
        : ""
    }/jsondiffpatch.umd.min.js`,
  },
  {
    script: `/plugins/public/tinymce${
      features?.version_plugin_serve_path
        ? "@" + require("./package.json").version
        : ""
    }/himalaya.js`,
  },
  {
    script: `/plugins/public/tinymce${
      features?.version_plugin_serve_path
        ? "@" + require("./package.json").version
        : ""
    }/html_merge_helper.js`,
  },
  {
    css: `/plugins/public/tinymce${
      features?.version_plugin_serve_path
        ? "@" + require("./package.json").version
        : ""
    }/tiny_styles.css`,
  },
];

const TinyMCE = {
  type: "HTML",
  isEdit: true,
  blockDisplay: true,
  handlesTextStyle: true,
  configFields: standardConfigFields,
  run: (nm, v, attrs, cls, required, header) => {
    const rndcls = `tmce${Math.floor(Math.random() * 16777215).toString(16)}`;
    const tasklistWhites = attrs?.include_tasklist
      ? { ul: ["class"], li: ["class"] }
      : {};
    const tags = Object.keys(require("xss").getDefaultWhiteList());
    for (const tag of tags) {
      const old = tasklistWhites[tag] || [];
      tasklistWhites[tag] = ["id", ...old];
    }
    return div(
      {
        class: [cls],
      },
      textarea(
        {
          name: text(nm),
          id: `input${text(nm)}_${rndcls}`,
          rows: 10,
          class: rndcls,
          "data-postprocess": "$e.text()",
        },
        text(
          attrs?.include_drawio && attrs.diagram_format === "svg"
            ? encodeAmpersands(v)
            : v || "",
          attrs?.include_drawio
            ? { div: ["drawio-diagram", "id"], ...tasklistWhites }
            : tasklistWhites,
        ),
      ),
      script(
        domReady(`setTimeout(async ()=>{      
          ${initTiny(nm, rndcls, attrs, header?.in_auto_save)}
    },0)`),
      ),
    );
  },
};

const dependencies = ["@saltcorn/html"];

module.exports = {
  sc_plugin_api_version: 1,
  fieldviews: { TinyMCE, ClickToTinyMCE: require("./click-to-edit") },
  plugin_name: "tinymce",
  headers,
  dependencies,
};
