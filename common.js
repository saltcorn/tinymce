const File = require("@saltcorn/data/models/file");
const User = require("@saltcorn/data/models/user");

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

module.exports = { standardConfigFields };
