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
    const folderOpts = [...dirs.map((d) => d.path_to_serve), "Base64 encode"];
    //console.log({ dirs, folderOpts });
    return [
      {
        name: "toolbar",
        label: "Toolbar",
        required: true,
        type: "String",
        attributes: { options: ["Standard", "Reduced", "Document"] },
      },
      {
        name: "quickbar",
        label: "Quick Toolbar",
        type: "Bool",
      },
      {
        name: "statusbar",
        label: "Status bar",
        type: "Bool",
      },
      {
        name: "menubar",
        label: "Menu bar",
        type: "Bool",
      },
      /*{
        name: "height",
        label: "Height (em units)",
        type: "Integer",
        default: 10,
      },*/
      {
        name: "autogrow",
        label: "Auto-grow",
        type: "Bool",
      },
      {
        name: "minheight",
        label: "Min height (px)",
        type: "Integer",
      },
      {
        name: "maxheight",
        label: "Max height (px)",
        type: "Integer",
      },
      ...(dirs
        ? [
            {
              name: "folder",
              label: "Folder for uploaded media files",
              type: "String",
              attributes: {
                options: folderOpts,
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
        let tmceOnChange = ()=>{        
          $('textarea#input${text(nm)}').closest('form').trigger('change');
        }
       
      tinymce.init({
        selector: '.${rndcls}',
        promotion: false,
        plugins: ['link','lists',${attrs?.autogrow ? `'autoresize',` : ""}${
          attrs?.quickbar ? `'quickbars',` : ""
        }],
        statusbar: ${!!attrs?.statusbar},        
        menubar: ${!!attrs?.menubar},
        skin: "tinymce-5",
        toolbar: 'undo redo styles bold italic underline strikethrough link bullist numlist alignleft aligncenter alignright alignjustify outdent indent forecolor backcolor',
        ${attrs?.minheight ? `min_height: ${attrs.minheight},` : ""}
        ${attrs?.maxheight ? `max_height: ${attrs.maxheight},` : ""}
        setup: (editor) => {
          editor.on('change', $.debounce ? $.debounce(tmceOnChange, 500, null,true) : tmceOnChange);
        },
        ${
          typeof attrs?.folder === "string" && attrs.folder !== "Base64 encode"
            ? `images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
              const formData = new FormData();
              formData.append('file', blobInfo.blob(), blobInfo.filename());
              formData.append('folder', ${JSON.stringify(attrs.folder)});
              $.ajax("/files/upload", {
                type: "POST",
                headers: {
                  "CSRF-Token": _sc_globalCsrf,
                },
                data: formData,
                processData: false,
                contentType: false,
                success: function (res) {
                  resolve(res.success.url)
                },
                error: function (request) {
                  reject('Image upload failed: ' + request.responseText);                
                },
              });
        })`
            : ""
        }
      });
      $('#input${text(nm)}').on('set_form_field', (e)=>{
        tinymce.get("input${text(nm)}").setContent(e.target.value)
      })
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
