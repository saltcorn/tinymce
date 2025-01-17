# tinymce plugin for Saltcorn

Caveats:

- When diagrams.net is enabled with the svg format, Diagrams cannot be escaped for Cross Site Scripting (XSS) payloads. In this case, show diagrams with unsafeNotEscaped HTML fieldview. You should not allow untrusted users to run the editor.
