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

const { features, getState } = require("@saltcorn/data/db/state");
const public_user_role = features?.public_user_role || 10;

const encodeAmpersands = (str) => {
  if (!str) return "";
  return str
    .replace(/&quot;/g, "&amp;quot;")
    .replace(/&lt;/g, "&amp;lt;")
    .replace(/&gt;/g, "&amp;gt;");
};

const bsBgColor = () => {
  const state = getState();
  if (state.plugin_cfgs) {
    let anyBsThemeCfg = state.plugin_cfgs["any-bootstrap-theme"];
    if (!anyBsThemeCfg)
      anyBsThemeCfg = state.plugin_cfgs["@saltcorn/any-bootstrap-theme"];
    if (anyBsThemeCfg?.backgroundColorDark)
      return anyBsThemeCfg.backgroundColorDark;
  }
  return "";
};

const initTiny = (nm, rndcls, attrs) => `
      let initial = document.getElementById('input${text(nm)}_${rndcls}').value;
      let unsafed = null;

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
      ${
        attrs?.include_drawio
          ? `window.tinymce.PluginManager.add('drawio', getDrawioPlugin(${
              attrs?.min_role_read || public_user_role
            }, ${
              typeof attrs?.folder === "string" &&
              attrs.folder !== "Base64 encode" &&
              attrs.folder !== ""
            }, "${attrs.diagram_format || "png"}"  ));`
          : ""
      }
      ${
        attrs?.include_tasklist
          ? `window.tinymce.PluginManager.add('tasklist', getTasklistPlugin());`
          : ""
      }

      // try tabler, then bootstrap, then default
      const darkBg = window._sc_lightmode==="dark" ? 
        (getComputedStyle(document.body).getPropertyValue('--tblr-body-bg').trim() || 
         "${bsBgColor()}") : null; 

      const getDarkStyle = () => {
        return \`
          .tox .tox-toolbar,.tox .tox-toolbar__overflow,.tox .tox-toolbar__primary {
            background-image: none !important;
            background-color: \${darkBg} !important;
          }
        \`;
      };

      function injectStyle() {
        if (darkBg) {
          const style = document.createElement('style');
          style.textContent = getDarkStyle();
          document.head.appendChild(style);
        }
      }

      const ed = await tinymce.init({
        extended_valid_elements: 'div[*],img[*],svg[*]',
        valid_children: ['+div[svg],+div[img]'],
        selector: '.${rndcls}',
        promotion: false,
        plugins: [ ${
          attrs?.include_drawio ? `'drawio',` : ""
        } 'link', 'fullscreen', 'charmap', 'table', 'lists', 'searchreplace', ${
  attrs?.include_tasklist ? "'tasklist'," : ""
} ${attrs?.autogrow ? `'autoresize',` : ""}${
  attrs?.quickbar ? `'quickbars',` : ""
}],
        statusbar: ${!!attrs?.statusbar},        
        menubar: ${!!attrs?.menubar},
        ${
          attrs?.quickbar
            ? `quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote | forecolor backcolor',`
            : ""
        }
        skin: window._sc_lightmode==="dark" ? "tinymce-5-dark" : "tinymce-5",
        content_css: ['/plugins/public/tinymce@${
          require("./package.json").version
        }/tiny_styles.css', window._sc_lightmode==="dark" ? "dark" : "default"],
        content_style: darkBg ? \`
          body {
            background-color: \${darkBg} !important;
          }
          \` : "",
        toolbar: '${
          attrs?.toolbar === "Reduced"
            ? `undo redo | bold italic underline strikethrough | removeformat | link hr | bullist numlist ${
                attrs?.include_tasklist ? "tasklist" : ""
              } | outdent indent | blockquote `
            : attrs?.toolbar === "Full"
            ? `undo redo | bold italic underline strikethrough | forecolor backcolor | removeformat | link | cut copy paste pastetext | searchreplace | table hr charmap | ${
                attrs?.include_drawio ? "drawio | " : ""
              }bullist numlist ${
                attrs?.include_tasklist ? "tasklist" : ""
              } | alignnone alignleft aligncenter alignright alignjustify | outdent indent | blockquote | styles fontfamily fontsize fontsizeinput | fullscreen`
            : `undo redo | bold italic underline strikethrough | forecolor backcolor | removeformat | link  | searchreplace | table hr charmap | ${
                attrs?.include_drawio ? "drawio | " : ""
              }bullist numlist ${
                attrs?.include_tasklist ? "tasklist" : ""
              } | align | outdent indent | blockquote | fullscreen`
        }',
        ${attrs?.minheight ? `min_height: ${attrs.minheight},` : ""}
        ${attrs?.maxheight ? `max_height: ${attrs.maxheight},` : ""}
        setup: (editor) => {
          editor.on('Paste Change input Undo Redo', ()=>{
            tmceUpdateTextarea()
            changeDebounced()
            unsafed = document.getElementById('input${text(nm)}_${rndcls}').value;
          });

          editor.on('init', function () {
            if (window._sc_lightmode==="dark") injectStyle();

            const doc = editor.getDoc();

            const generateUniqueId = (tagName) =>
              'tinymce-' + tagName.toLowerCase() + '-' + Date.now() + '-' + Math.floor(Math.random() * 10000);

            const assignIdIfMissing = (node) => {
              if (node.nodeType === 1 && !node.id) {
                node.id = generateUniqueId(node.tagName);
              }
            };

            const observer = new MutationObserver((mutationsList) => {
              for (const mutation of mutationsList) {
                mutation.addedNodes.forEach((node) => {
                  if (node.nodeType === 1 && node.parentNode === doc.body)
                    assignIdIfMissing(node);
                  else if (node.nodeType === 3) {
                    const parent = node.parentElement;
                    if (parent?.nodeType === 1 && parent.parentNode === doc.body && !parent.id) {
                      assignIdIfMissing(parent);
                    }
                  }
                });
              }
            });

            observer.observe(doc.body, {
              childList: true,
              subtree: true
            });

          });
        },
        ${
          typeof attrs?.folder === "string" &&
          attrs.folder !== "Base64 encode" &&
          attrs.folder !== ""
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
        ${
          attrs?.merge_real_time_updates
            ? `
        if (unsafed !== null) {
          try {
            const incoming = e.target.value;
            const merged = mergeVersions(initial, unsafed, incoming);
            ed[0].setContent(merged);
            $('textarea#input${text(nm)}_${rndcls}').html(merged).trigger('change');
            unsafed = merged;
            initial = incoming;
            notifyAlert({
              type: "success",
              text: "Merged unsafed changes with a real-time update.",
            });
          }
          catch (err) {
            console.error('Error merging versions:', err);
            notifyAlert({ 
              type: "danger", 
              text: "Unable to merge a real-time update: " + err.message
            });
          }
        } else {
          initial = e.target.value;
          ed[0].setContent(e.target.value);
          $('textarea#input${text(nm)}_${rndcls}').html(e.target.value).trigger('change');
        }  `
            : `
        ed[0].setContent(e.target.value);
        $('textarea#input${text(nm)}_${rndcls}').html(e.target.value).trigger('change');`
        }
      })
        `;

const standardConfigFields = async (field, extra) => {
  const __ = extra?.__ || ((s) => s);

  const dirs = File.allDirectories ? await File.allDirectories() : null;
  const folderOpts = [...dirs.map((d) => d.path_to_serve), "Base64 encode"];
  //console.log({ dirs, folderOpts });
  const roles = await User.get_roles();

  return [
    {
      name: "toolbar",
      label: __("Toolbar"),
      required: true,
      type: "String",
      attributes: { options: ["Standard", "Reduced", "Full"] },
    },
    {
      name: "quickbar",
      label: __("Quick Toolbar"),
      type: "Bool",
    },
    {
      name: "statusbar",
      label: __("Status bar"),
      type: "Bool",
    },
    {
      name: "menubar",
      label: __("Menu bar"),
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
      label: __("Auto-grow"),
      type: "Bool",
    },
    {
      name: "include_drawio",
      // previously "drawio",
      label: __("Include diagrams.net"),
      type: "Bool",
      default: false,
    },
    {
      name: "include_tasklist",
      label: __("Include task list"),
      type: "Bool",
      default: false,
    },
    {
      name: "diagram_format",
      label: __("Diagram format"),
      type: "String",
      default: "png",
      showIf: { include_drawio: true },
      attributes: { options: ["png", "svg"] },
    },
    {
      name: "minheight",
      label: __("Min height (px)"),
      type: "Integer",
    },
    {
      name: "maxheight",
      label: __("Max height (px)"),
      type: "Integer",
    },
    ...(dirs
      ? [
          {
            name: "folder",
            label: __("Folder for uploaded media files"),
            type: "String",
            attributes: {
              options: folderOpts,
            },
          },
        ]
      : []),
    {
      name: "min_role_read",
      label: __("Min role read files"),
      input_type: "select",
      options: roles.map((r) => ({ value: r.id, label: r.role })),
    },
    {
      name: "merge_real_time_updates",
      label: __("Merge real-time updates"),
      sublabel: __("Try to merge real-time updates with unsafed changes"),
      type: "Bool",
      default: true,
    },
  ];
};

module.exports = { standardConfigFields, initTiny, encodeAmpersands };
