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
  configFields: standardConfigFields,
  run: (nm, v, attrs, cls, required, field) => {
    const rndcls = `tmce${Math.floor(Math.random() * 16777215).toString(16)}`;

    const s = xss(v || "")
      .split("<blockquote>")
      .join('<blockquote class="blockquote">');
    console.log({ s, v });
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
      div({ class: "htmlvalue" }, s),
      button(
        {
          type: "button",
          onclick: `click_to_tinymce_${rndcls}()`,
          class: "btn btn-primary btn-sm",
        },
        "Edit"
      ),
      script(`
        let is_init_${rndcls} = false;
        async function click_to_tinymce_${rndcls}(btn_e) {
        $("div#${rndcls} div.htmlvalue").hide();
        $("div#${rndcls} textarea").show();
        $("div#${rndcls} button").text("Done");
        $("div#${rndcls} button").attr("onclick", "click_to_tinymce_done_${rndcls}()");
        if(is_init_${rndcls}) {
         tinymce.get("input${text(nm)}_${rndcls}").show();
        } else {

          is_init_${rndcls} = true;
          ${initTiny(nm, rndcls, attrs)}
        }
        }
        function click_to_tinymce_done_${rndcls}() {
        $("div#${rndcls} div.htmlvalue").show().html(tinymce.get("input${text(
        nm
      )}_${rndcls}").getContent());
        $("div#${rndcls} textarea").hide();
        $("div#${rndcls} button").text("Edit");
        $("div#${rndcls} button").attr("onclick", "click_to_tinymce_${rndcls}()");
        tinymce.get("input${text(nm)}_${rndcls}").hide();
        $("div#${rndcls} textarea").hide();

        }`)
    );
  },
};

module.exports = clickToEdit;
