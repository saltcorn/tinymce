const { standardConfigFields, initTiny } = require("./common");
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
  i,
} = require("@saltcorn/markup/tags");
const xss = require("xss");
xss.whiteList.kbd = [];
xss.whiteList.table = [
  "width",
  "border",
  "align",
  "valign",
  "class",
  "cellpadding",
  "cellspacing",
  "style",
];

xss.whiteList.span.push("style");
xss.whiteList.p.push("style");
xss.whiteList.td.push("style");
xss.whiteList.div.push("style");

const isdef = (x) => (typeof x === "undefined" || x === null ? false : true);

const clickToEdit = {
  type: "HTML",
  isEdit: true,
  blockDisplay: true,
  handlesTextStyle: true,
  configFields: async () => {
    const stdFields = await standardConfigFields();
    return [
      ...stdFields,
      {
        name: "max_init_height",
        label: "Max initial height (px)",
        type: "Integer",
      },
    ];
  },
  run: (nm, v, attrs, cls, required, field) => {
    const rndcls = `tmce${Math.floor(Math.random() * 16777215).toString(16)}`;

    const s = xss(v || "")
      .split("<blockquote>")
      .join('<blockquote class="blockquote">');
    return div(
      { id: rndcls },
      textarea(
        {
          name: text(nm),
          id: `input${text(nm)}_${rndcls}`,
          rows: 10,
          style: "display: none",
          class: rndcls,
          "data-postprocess": "$e.text()",
        },
        text(v || "")
      ),
      div(
        {
          class: "htmlvalue",
          onclick: attrs.max_init_height
            ? `toggle_expand_${rndcls}()`
            : undefined,
          style: attrs.max_init_height
            ? { maxHeight: `${attrs.max_init_height}px`, overflowY: "hidden" }
            : undefined,
        },
        s
      ),
      div(
        { class: "row" },
        div(
          { class: "col" },
          attrs.max_init_height &&
            div(
              { class: "moreindicator", onclick: `toggle_expand_${rndcls}()` },
              "More..."
            )
        ),
        div(
          { class: "col text-end" },
          button(
            {
              type: "button",
              onclick: `click_to_tinymce_${rndcls}()`,
              class: "btn btn-primary btn-sm clicktinybtn",
            },
            i({ class: "far fa-edit me-2" }),
            "Edit"
          )
        )
      ),

      script(`
        let is_init_${rndcls} = false;
        let expanded_${rndcls} = false;
        function toggle_expand_${rndcls}() {
          if(expanded_${rndcls}) {
           $("div#${rndcls} div.htmlvalue").css("max-height", "${
        attrs.max_init_height
      }px");
           $("div#${rndcls} div.moreindicator").show();
           expanded_${rndcls} = false;
          } else {
           $("div#${rndcls} div.htmlvalue").css("max-height", "");
           expanded_${rndcls} = true;
           $("div#${rndcls} div.moreindicator").hide();


          }
        }
        async function click_to_tinymce_${rndcls}() {
        $("div#${rndcls} div.htmlvalue").hide();
        $("div#${rndcls} textarea#input${text(nm)}_${rndcls}").show();
        $("div#${rndcls} button.clicktinybtn").text("Done");
        $("div#${rndcls} button.clicktinybtn").attr("onclick", "click_to_tinymce_done_${rndcls}()");
        if(is_init_${rndcls}) {
         tinymce.get("input${text(nm)}_${rndcls}").show();
           $("div#${rndcls} div.moreindicator").hide();
        } else {

          is_init_${rndcls} = true;
          ${initTiny(nm, rndcls, attrs)}
        }
        }
        function click_to_tinymce_done_${rndcls}() {
        $("div#${rndcls} div.htmlvalue").show().html(tinymce.get("input${text(
        nm
      )}_${rndcls}").getContent());
        $("div#${rndcls} button.clicktinybtn").text("Edit");
        $("div#${rndcls} button.clicktinybtn").attr("onclick", "click_to_tinymce_${rndcls}()");
        tinymce.get("input${text(nm)}_${rndcls}").hide();
        $("div#${rndcls} textarea#input${text(nm)}_${rndcls}").hide();
        if(!expanded_${rndcls}) 
           $("div#${rndcls} div.moreindicator").show();


        }`)
    );
  },
};

module.exports = clickToEdit;
