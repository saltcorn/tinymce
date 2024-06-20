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
const User = require("@saltcorn/data/models/user");

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
    const roles = await User.get_roles();

    return [
      {
        name: "toolbar",
        label: "Toolbar",
        required: true,
        type: "String",
        attributes: { options: ["Standard", "Reduced", "Full"] },
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
      {
        name: "min_role_read",
        label: "Min role read files",
        input_type: "select",
        options: roles.map((r) => ({ value: r.id, label: r.role })),
      },
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
          id: `input${text(nm)}_${rndcls}`,
          rows: 10,
          class: rndcls,
          "data-postprocess": "$e.text()",
        },
        text(v || "")
      ),
      script(
        domReady(`setTimeout(async ()=>{      
      let tmceUpdateTextarea = ()=>{        
        $('textarea#input${text(nm)}_${rndcls}').html(tinymce.get("input${text(
          nm
        )}_${rndcls}").getContent());
      } 
      let tmceOnChange = ()=>{        
        $('textarea#input${text(nm)}_${rndcls}').html(tinymce.get("input${text(
          nm
        )}_${rndcls}").getContent());
        $('textarea#input${text(nm)}_${rndcls}').trigger('change');
      } 
      let changeDebounced = $.debounce ? $.debounce(tmceOnChange, 500, null,true) : tmceOnChange;
      const ed = await tinymce.init({
        selector: '.${rndcls}',
        promotion: false,
        plugins: ['link', 'fullscreen', 'charmap', 'table', 'lists', 'searchreplace',${
          attrs?.autogrow ? `'autoresize',` : ""
        }${attrs?.quickbar ? `'quickbars',` : ""}],
        statusbar: ${!!attrs?.statusbar},        
        menubar: ${!!attrs?.menubar},
        ${
          attrs?.quickbar
            ? `quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote | forecolor backcolor',`
            : ""
        }
        skin: "tinymce-5",
        toolbar: '${
          attrs?.toolbar === "Reduced"
            ? "undo redo | bold italic underline strikethrough | removeformat | link hr | bullist numlist | outdent indent | blockquote "
            : attrs?.toolbar === "Full"
            ? "undo redo | bold italic underline strikethrough | forecolor backcolor | removeformat | link | cut copy paste pastetext | searchreplace | table hr charmap | bullist numlist | alignnone alignleft aligncenter alignright alignjustify | outdent indent | blockquote | styles fontfamily fontsize fontsizeinput | fullscreen"
            : "undo redo | bold italic underline strikethrough | forecolor backcolor | removeformat | link  | searchreplace | table hr charmap | bullist numlist | align | outdent indent | blockquote | fullscreen"
        }',
        ${attrs?.minheight ? `min_height: ${attrs.minheight},` : ""}
        ${attrs?.maxheight ? `max_height: ${attrs.maxheight},` : ""}
        setup: (editor) => {
          editor.on('Paste Change input Undo Redo', ()=>{
            tmceUpdateTextarea()
            changeDebounced()
          });
        },
        ${
          typeof attrs?.folder === "string" && attrs.folder !== "Base64 encode"
            ? `images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
              const formData = new FormData();
              formData.append('file', blobInfo.blob(), blobInfo.filename());
              formData.append('min_role_read', ${
                attrs?.min_role_read || public_user_role
              } );
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
    
      $('#input${text(nm)}_${rndcls}').on('set_form_field', (e)=>{
        ed[0].setContent(e.target.value)
      })
    },0)`)
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
