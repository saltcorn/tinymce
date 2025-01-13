const File = require("@saltcorn/data/models/file");
const User = require("@saltcorn/data/models/user");
const {
  input,
  div,
  text,
  script,
  domReady,
  textarea,
  style,
  text_attr,
  button,
} = require("@saltcorn/markup/tags");

const { features } = require("@saltcorn/data/db/state");
const public_user_role = features?.public_user_role || 10;

const initTiny = (nm, rndcls, attrs) => `
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
      window.tinymce.PluginManager.add('drawio', getDrawioPlugin(${
        typeof attrs?.folder === "string" &&
        attrs.folder !== "Base64 encode" &&
        attrs.folder !== ""
      }, ${attrs?.min_role_read || public_user_role}));
      const ed = await tinymce.init({
        extended_valid_elements: 'div[*]',
        valid_children: ['+div[pre|img]'],
        selector: '.${rndcls}',
        promotion: false,
        plugins: [ 'drawio', 'link', 'fullscreen', 'charmap', 'table', 'lists', 'searchreplace',${
          attrs?.autogrow ? `'autoresize',` : ""
        }${attrs?.quickbar ? `'quickbars',` : ""}],
        statusbar: ${!!attrs?.statusbar},        
        menubar: ${!!attrs?.menubar},
        ${
          attrs?.quickbar
            ? `quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote | forecolor backcolor',`
            : ""
        }
        skin: window._sc_lightmode==="dark" ? "tinymce-5-dark" : "tinymce-5",
        content_css: window._sc_lightmode==="dark" ? "dark" : "default",
        toolbar: '${
          attrs?.toolbar === "Reduced"
            ? "undo redo | bold italic underline strikethrough | removeformat | link hr | bullist numlist | outdent indent | blockquote "
            : attrs?.toolbar === "Full"
            ? "undo redo | bold italic underline strikethrough | forecolor backcolor | removeformat | link | cut copy paste pastetext | searchreplace | table hr charmap | bullist numlist | alignnone alignleft aligncenter alignright alignjustify | outdent indent | blockquote | styles fontfamily fontsize fontsizeinput | fullscreen | drawio"
            : "undo redo | bold italic underline strikethrough | forecolor backcolor | removeformat | link  | searchreplace | table hr charmap | bullist numlist | align | outdent indent | blockquote | fullscreen | drawio"
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
          typeof attrs?.folder === "string" &&
          attrs.folder !== "Base64 encode" &&
          attrs.folder !== ""
            ? `images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
              console.log(progress)
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
            : `images_upload_handler: (blobInfo, progress) => new Promise((resolve, reject) => {
              // as base64
              const reader = new FileReader();
              reader.onload = (e) => {
                resolve(e.target.result);
              };
              reader.readAsDataURL(blobInfo.blob());
            })`
        }
      }); 
    
      $('#input${text(nm)}_${rndcls}').on('set_form_field', (e)=>{
        ed[0].setContent(e.target.value)
      })
        `;

const standardConfigFields = async () => {
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
};

module.exports = { standardConfigFields, initTiny };
