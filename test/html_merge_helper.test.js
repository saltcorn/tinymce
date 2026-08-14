const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { makeMergeSandbox } = require("./helpers/merge-sandbox");

// window.mergeVersions(original, unsafed, incoming) does a three-way merge of
// HTML strings: it diffs original->unsafed and original->incoming (himalaya
// parse trees, jsondiffpatch deltas) and combines the two deltas. Every test
// gets a fresh sandbox since the helper installs global state (window.mergeVersions).
const mergeVersions = (original, unsafed, incoming) =>
  makeMergeSandbox().mergeVersions(original, unsafed, incoming);

describe("mergeVersions - no-op cases", () => {
  test("returns original when neither side changed anything", () => {
    const html = "<p>Alpha</p><p>Beta</p>";
    assert.equal(mergeVersions(html, html, html), html);
  });

  test("returns incoming when only incoming changed", () => {
    const original = "<p>Alpha</p><p>Beta</p>";
    const incoming = "<p>Alpha CHANGED</p><p>Beta</p>";
    assert.equal(mergeVersions(original, original, incoming), incoming);
  });

  test("returns unsafed when only unsafed changed", () => {
    const original = "<p>Alpha</p><p>Beta</p>";
    const unsafed = "<p>Alpha CHANGED</p><p>Beta</p>";
    assert.equal(mergeVersions(original, unsafed, original), unsafed);
  });
});

describe("mergeVersions - non-conflicting merges", () => {
  test("merges edits to two different paragraphs", () => {
    const original = "<p>Alpha</p><p>Beta</p><p>Gamma</p>";
    const unsafed = "<p>Alpha CHANGED</p><p>Beta</p><p>Gamma</p>";
    const incoming = "<p>Alpha</p><p>Beta</p><p>Gamma CHANGED</p>";
    assert.equal(
      mergeVersions(original, unsafed, incoming),
      "<p>Alpha CHANGED</p><p>Beta</p><p>Gamma CHANGED</p>"
    );
  });

  test("merges an unsafed insert with an incoming edit further down", () => {
    const original = "<p>One</p><p>Two</p><p>Three</p>";
    const unsafed = "<p>One</p><p>Inserted</p><p>Two</p><p>Three</p>";
    const incoming = "<p>One</p><p>Two</p><p>Three CHANGED</p>";
    assert.equal(
      mergeVersions(original, unsafed, incoming),
      "<p>One</p><p>Inserted</p><p>Two</p><p>Three CHANGED</p>"
    );
  });

  test("merges deletes of two different paragraphs", () => {
    const original = "<p>One</p><p>Two</p><p>Three</p>";
    const unsafed = "<p>Two</p><p>Three</p>"; // deleted One
    const incoming = "<p>One</p><p>Two</p>"; // deleted Three
    assert.equal(mergeVersions(original, unsafed, incoming), "<p>Two</p>");
  });

  test("keeps both paragraphs appended by each side, incoming first", () => {
    const original = "<p>Alpha</p><p>Beta</p>";
    const unsafed = "<p>Alpha</p><p>Beta</p><p>Local addition</p>";
    const incoming = "<p>Alpha</p><p>Beta</p><p>Remote addition</p>";
    assert.equal(
      mergeVersions(original, unsafed, incoming),
      "<p>Alpha</p><p>Beta</p><p>Remote addition</p><p>Local addition</p>"
    );
  });
});

describe("mergeVersions - genuine conflicts are rejected", () => {
  test("throws when both sides edit the same paragraph differently", () => {
    const original = "<p>One</p><p>Two</p><p>Three</p>";
    const unsafed = "<p>One</p><p>Two LOCAL</p><p>Three</p>";
    const incoming = "<p>One</p><p>Two REMOTE</p><p>Three</p>";
    assert.throws(() => mergeVersions(original, unsafed, incoming));
  });

  test("throws a clear Delete conflict when one side edits and the other deletes the same paragraph", () => {
    const original = "<p>One</p><p>Two</p><p>Three</p>";
    const unsafed = "<p>One</p><p>Two CHANGED</p><p>Three</p>";
    const incoming = "<p>One</p><p>Three</p>";
    assert.throws(
      () => mergeVersions(original, unsafed, incoming),
      /Delete conflict/
    );
  });
});

// --- Concurrent identical edits merge cleanly --------------------------
//
// deltaMerger's delete-processing branches used to only advance when one
// delete key was strictly less than the other, so equal delete keys (both
// sides deleting the same original position) never advanced either
// pointer, spinning the do/while loop until the `index++ > 100000` guard
// threw a generic "Unable to merge". Fixed by explicitly handling the
// incDelKey === unsDelKey case: identical plain deletes on both sides now
// collapse into a single merged delete; a delete colliding with an edit
// on the same paragraph now fails fast with "Delete conflict" instead of
// stalling. Concurrent identical inserts at the same position used to be
// duplicated instead of deduplicated; fixed via a content-equality check
// in the insert-conflict branch.
describe("mergeVersions - concurrent identical edits", () => {
  test("merges cleanly when both sides delete the same paragraph", () => {
    const original = "<p>One</p><p>Two</p><p>Three</p>";
    const unsafed = "<p>One</p><p>Three</p>"; // deleted Two
    const incoming = "<p>One</p><p>Three</p>"; // also deleted Two
    assert.equal(
      mergeVersions(original, unsafed, incoming),
      "<p>One</p><p>Three</p>"
    );
  });

  test("merges overlapping multi-paragraph deletes", () => {
    const original = "<p>One</p><p>Two</p><p>Three</p><p>Four</p>";
    const unsafed = "<p>One</p><p>Three</p><p>Four</p>"; // deleted Two
    const incoming = "<p>One</p><p>Four</p>"; // deleted Two and Three
    assert.equal(
      mergeVersions(original, unsafed, incoming),
      "<p>One</p><p>Four</p>"
    );
  });

  test("dedupes identical concurrent inserts at the same position", () => {
    const original = "<p>One</p><p>Two</p>";
    const unsafed = "<p>One</p><p>Same insert</p><p>Two</p>";
    const incoming = "<p>One</p><p>Same insert</p><p>Two</p>";
    assert.equal(
      mergeVersions(original, unsafed, incoming),
      "<p>One</p><p>Same insert</p><p>Two</p>"
    );
  });

  test("still keeps both when concurrent inserts at the same position differ", () => {
    const original = "<p>One</p><p>Two</p>";
    const unsafed = "<p>One</p><p>Local insert</p><p>Two</p>";
    const incoming = "<p>One</p><p>Remote insert</p><p>Two</p>";
    assert.equal(
      mergeVersions(original, unsafed, incoming),
      "<p>One</p><p>Remote insert</p><p>Local insert</p><p>Two</p>"
    );
  });
});
