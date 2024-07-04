const { standardConfigFields } = require("./common");
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
          class: ["form-control", cls],
          style: "display: none",
          name: text_attr(nm),
          "data-fieldname": text_attr(field.name),
          placeholder: attrs.placeholder,
          spellcheck: attrs.spellcheck === false ? "false" : undefined,

          id: `input${text_attr(nm)}`,
          rows: attrs.rows || 5,
        },
        s
      ),
      div(s),
      button(
        {
          type: "button",
          onclick: `click_to_tinymce_${rndcls}()`,
          class: "btn btn-primary btn-sm",
        },
        "Edit"
      ),
      script(`async function click_to_tinymce_${rndcls}(btn_e) {
        $("div#${rndcls} div").hide();
        $("div#${rndcls} textarea").show();
        $("div#${rndcls} button").text("Done");
        $("div#${rndcls} button").attr("onclick", "click_to_tinymce_done_${rndcls}()");

        }
        function click_to_tinymce_done_${rndcls}() {
        $("div#${rndcls} div").show(); // TODO set contents
        $("div#${rndcls} textarea").hide();
        $("div#${rndcls} button").text("Edit");
        $("div#${rndcls} button").attr("onclick", "click_to_tinymce_${rndcls}()");

        }`)
    );
  },
};

module.exports = clickToEdit;
