const {
  input,
  div,
  text,
  script,
  domReady,
  textarea,
  style,
} = require("@saltcorn/markup/tags");
const { features } = require("@saltcorn/data/db/state");
const File = require("@saltcorn/data/models/file");
const headers = [
  {
    script: `/plugins/public/tinymce${
      features?.version_plugin_serve_path
        ? "@" + require("./package.json").version
        : ""
    }/tinymce.min.js`,
  },
];

const public_user_role = features?.public_user_role || 10;

const TinyMCE = {
  type: "HTML",
  isEdit: true,
  blockDisplay: true,
  handlesTextStyle: true,
  configFields: async () => {
    const dirs = File.allDirectories ? await File.allDirectories() : null;
    return [
      {
        name: "toolbar",
        label: "Toolbar",
        required: true,
        type: "String",
        attributes: { options: ["Standard", "Reduced", "Document"] },
      },
      {
        name: "height",
        label: "Height (em units)",
        type: "Integer",
        default: 10,
      },
      {
        name: "autogrow",
        label: "Auto-grow",
        type: "Bool",
      },
      {
        name: "minheight",
        label: "Min height (px)",
        type: "Integer",
        showIf: { autogrow: true },
      },
      {
        name: "maxheight",
        label: "Max height (px)",
        type: "Integer",
        showIf: { autogrow: true },
      },
      ...(dirs
        ? [
            {
              name: "folder",
              label: "Folder for uploaded media files",
              type: "String",
              attributes: {
                options: [...dirs.map((d) => d.path_to_serve), "Base64 encode"],
              },
            },
          ]
        : []),
    ];
  },
  run: (nm, v, attrs, cls) => {
    const rndcls = `tmce${Math.floor(Math.random() * 16777215).toString(16)}`;

    return div(
      {
        class: [cls],
      },
      textarea(
        {
          name: text(nm),
          id: `input${text(nm)}`,
          rows: 10,
          class: rndcls,
        },
        text(v || "")
      ),
      script(
        domReady(`
      tinymce.init({
        selector: '.${rndcls}',
        promotion: false
      });
      `)
      )
    );
  },
};

const dependencies = ["@saltcorn/html"];

module.exports = {
  sc_plugin_api_version: 1,
  fieldviews: { TinyMCE },
  plugin_name: "tinymce",
  headers,
  dependencies,
};
