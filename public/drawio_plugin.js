/*
 * This file is based on code originally authored by [Dan Brown and the BookStack Project contributors],
 * licensed under the MIT License. Original source: [https://github.com/BookStackApp/BookStack]
 *
 * MIT License
 *
 * Copyright (c) [2025] [Christian Hugo]
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

let iframe = null;
let pageEditor = null;
let currentNode = null;

const diagramsUrl =
  "https://embed.diagrams.net/?embed=1&proto=json&spin=1&configure=1";
const approvedOrigin = new URL(diagramsUrl).origin;

let _uploadDrawings = null;
let _minRoleRead = null;

function isDrawing(node) {
  return node.hasAttribute("drawio-diagram");
}

function load(drawingId) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: encodeURI(drawingId),
      type: "GET",
      xhrFields: {
        responseType: "blob",
      },
      headers: {
        "CSRF-Token": _sc_globalCsrf,
      },
      success: (data) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          return resolve(reader.result);
        };
        reader.onerror = (error) => {
          return reject(error);
        };
        reader.readAsDataURL(data);
      },
      error: (request) => {
        reject("Image load failed: " + request.responseText);
      },
    });
  });
}

function base64PngToBlob(base64) {
  const mimeString = "image/png";
  const byteString = atob(base64.split(",")[1]);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  return new Blob([byteArray], { type: mimeString });
}

function upload(data, name) {
  const formData = new FormData();
  formData.append("file", base64PngToBlob(data), name + ".png");
  formData.append("min_role_read", _minRoleRead);
  return new Promise((resolve, reject) => {
    $.ajax("/files/upload", {
      type: "POST",
      headers: {
        "CSRF-Token": _sc_globalCsrf,
      },
      data: formData,
      processData: false,
      contentType: false,
      success: function (res) {
        resolve(res.success.url);
      },
      error: function (request) {
        reject("Image upload failed: " + request.responseText);
      },
    });
  });
}

async function drawEventInit() {
  let xml = "";
  if (currentNode) {
    if (_uploadDrawings)
      xml = await load(currentNode.getAttribute("drawio-diagram"));
    else {
      const imgElem = currentNode.querySelector("img");
      xml = imgElem.getAttribute("src");
    }
  }
  drawPostMessage({ action: "load", autosave: 1, xml });
}

function drawEventClose() {
  window.removeEventListener("message", drawReceive);
  if (iframe) document.body.removeChild(iframe);
}

function drawEventSave(message) {
  drawPostMessage({
    action: "export",
    format: "xmlpng",
    xml: message.xml,
    spin: "Updating drawing",
  });
}
async function drawEventExport(message) {
  if (currentNode) {
    const imgElem = currentNode.querySelector("img");
    const id = imgElem.getAttribute("id");
    const url = _uploadDrawings ? await upload(message.data, id) : message.data;
    pageEditor.dom.setAttrib(imgElem, "src", url);
    if (_uploadDrawings)
      pageEditor.dom.setAttrib(currentNode, "drawio-diagram", url);
    drawEventClose();
  } else {
    const imgId = `drawing-${Math.random().toString(16).slice(2)}`;
    const wrapId = `drawing-wrap-${Math.random().toString(16).slice(2)}`;
    pageEditor.insertContent(
      `<div drawio-diagram contenteditable="false" id="${wrapId}"><img src="${message.data}" id="${imgId}"></div>`
    );
    if (_uploadDrawings) {
      // wait 10 times 500 ms for the image to be uploaded and updated by tinymce
      let tries = 10;
      const interval = setInterval(() => {
        const img = pageEditor.dom.get(imgId);
        const src = img?.getAttribute("src");
        if (src?.startsWith("/files/serve")) {
          clearInterval(interval);
          pageEditor.dom.setAttrib(wrapId, "drawio-diagram", src);
          drawEventClose();
        }
        if (--tries === 0) {
          clearInterval(interval);
          drawEventClose();
        }
      }, 500);
    } else drawEventClose();
  }
}

function drawEventConfigure() {
  const config = {};
  if (iframe) {
    drawPostMessage({ action: "configure", config });
  }
}

function drawPostMessage(data) {
  iframe?.contentWindow?.postMessage(JSON.stringify(data), approvedOrigin);
}

async function drawReceive(event) {
  if (!event.data || event.data.length < 1) return;
  if (event.origin !== approvedOrigin) return;

  const message = JSON.parse(event.data);
  switch (message.event) {
    case "init":
      await drawEventInit();
      break;
    case "exit":
      drawEventClose();
      break;
    case "save":
      drawEventSave(message);
      break;
    case "export":
      await drawEventExport(message);
      break;
    case "configure":
      drawEventConfigure();
      break;
  }
}

function showDrawingEditor(editor, selectedNode = null) {
  pageEditor = editor;
  currentNode = selectedNode;
  iframe = document.createElement("iframe");
  iframe.setAttribute("class", "fullscreen");
  iframe.setAttribute("src", diagramsUrl);
  iframe.style.backgroundColor = "#FFFFFF";
  window.addEventListener("message", drawReceive);
  document.body.appendChild(iframe);
}

function getDrawioPlugin(uploadDrawings, minRoleRead) {
  _uploadDrawings = uploadDrawings;
  _minRoleRead = minRoleRead;
  return (editor) => {
    editor.ui.registry.addIcon(
      "diagram",
      `<svg width="24" height="24" fill="#000000" xmlns="http://www.w3.org/2000/svg"><path d="M20.716 7.639V2.845h-4.794v1.598h-7.99V2.845H3.138v4.794h1.598v7.99H3.138v4.794h4.794v-1.598h7.99v1.598h4.794v-4.794h-1.598v-7.99zM4.736 4.443h1.598V6.04H4.736zm1.598 14.382H4.736v-1.598h1.598zm9.588-1.598h-7.99v-1.598H6.334v-7.99h1.598V6.04h7.99v1.598h1.598v7.99h-1.598zm3.196 1.598H17.52v-1.598h1.598zM17.52 6.04V4.443h1.598V6.04zm-4.21 7.19h-2.79l-.582 1.599H8.643l2.717-7.191h1.119l2.724 7.19h-1.302zm-2.43-1.006h2.086l-1.039-3.06z"/></svg>`
    );

    editor.ui.registry.addButton("drawio", {
      tooltip: "Insert/edit drawing",
      icon: "diagram",
      onAction() {
        showDrawingEditor(editor);
        // Hack to de-focus the tinymce editor toolbar
        window.document.body.dispatchEvent(
          new Event("mousedown", { bubbles: true })
        );
      },
    });

    editor.on("dblclick", () => {
      const selectedNode = editor.selection.getNode();
      if (!isDrawing(selectedNode)) return;
      showDrawingEditor(editor, selectedNode);
    });

    editor.on("SetContent", () => {
      const drawings = editor.dom.select("body > div[drawio-diagram]");
      if (!drawings.length) return;

      editor.undoManager.transact(() => {
        for (const drawing of drawings) {
          drawing.setAttribute("contenteditable", "false");
        }
      });
    });
  };
}
