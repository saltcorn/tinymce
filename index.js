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
const { standardConfigFields, initTiny } = require("./common");
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
  run: (nm, v, attrs, cls) => {
    const rndcls = `tmce${Math.floor(Math.random() * 16777215).toString(16)}`;

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
          v || "",
          attrs?.include_drawio ? { div: ["drawio-diagram", "id"] } : undefined
        )
      ),
      script(
        domReady(`setTimeout(async ()=>{      
          ${initTiny(nm, rndcls, attrs)}
    },0)`)
      )
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
