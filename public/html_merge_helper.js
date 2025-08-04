(() => {
  const { parse, stringify } = window.himalaya;
  const jsondiffpatch = window.jsondiffpatch;

  const isModify = (delta, key) => {
    const insertEl = delta[key];
    const deleteEl = delta[`_${key}`];
    return !!insertEl && !!deleteEl;
  };

  const diffpatch = jsondiffpatch.create({
    objectHash: function (obj) {
      return JSON.stringify(obj);
    },
    arrays: {
      detectMove: false,
      includeValueOnMove: false,
    },
  });

  const sortedInsertKeys = (diff) =>
    Object.keys(diff)
      .map((key) => parseInt(key, 10))
      .filter((key) => !Number.isNaN(key))
      .sort((a, b) => a - b);

  const sortedDeleteKeys = (diff) =>
    Object.keys(diff)
      .filter((key) => key !== "_t" && key.startsWith("_"))
      .map((key) => parseInt(key.substring(1), 10))
      .filter((key) => !isNaN(key))
      .sort((a, b) => a - b);

  const notModifiesUntil = (delta, keys, index) => {
    let count = 0;
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key >= index) break;
      if (!isModify(delta, key)) count++;
    }
    return count;
  };

  const deltaMerger = (unsDelta, incDelta) => {
    const merged = {
      _t: "a",
    };
    const unsInsKeys = sortedInsertKeys(unsDelta);
    let unsInsIndex = 0;
    const incInsKeys = sortedInsertKeys(incDelta);
    let incInsIndex = 0;

    const incDelKeys = sortedDeleteKeys(incDelta);
    let incDelIndex = 0;
    const unsDelKeys = sortedDeleteKeys(unsDelta);
    let unsDelIndex = 0;

    let unsInsKey;
    let incInsKey;
    let incDelKey;
    let unsDelKey;
    let conflictOffset = 0;
    let index = 0;
    do {
      if (index++ > 100000) throw new Error("Unable to merge");
      unsInsKey =
        unsInsIndex < unsInsKeys.length ? unsInsKeys[unsInsIndex] : Infinity;
      incInsKey =
        incInsIndex < incInsKeys.length ? incInsKeys[incInsIndex] : Infinity;
      unsDelKey =
        unsDelIndex < unsDelKeys.length ? unsDelKeys[unsDelIndex] : Infinity;
      incDelKey =
        incDelIndex < incDelKeys.length ? incDelKeys[incDelIndex] : Infinity;

      // incoming delete
      if (incDelKey < unsDelKey && incDelKey <= incInsKey) {
        const insertsBefore = notModifiesUntil(incDelta, incInsKeys, incDelKey);
        const newKey = `_${incDelKey - insertsBefore}`;
        if (merged[newKey]) throw new Error("Delete conflict");

        merged[newKey] = incDelta[`_${incDelKey}`];
        incDelIndex++;
      }
      // unsafed delete
      else if (unsDelKey < incDelKey && unsDelKey <= unsInsKey) {
        const insertsBefore = notModifiesUntil(unsDelta, unsInsKeys, unsDelKey);
        const newKey = `_${unsDelKey - insertsBefore}`;
        if (merged[newKey]) throw new Error("Delete conflict");

        merged[newKey] = unsDelta[`_${unsDelKey}`];
        unsDelIndex++;
      }

      let newIncInsKey = Infinity;
      if (incInsKey < Infinity) {
        const insertsBefore = notModifiesUntil(
          unsDelta,
          unsInsKeys,
          incInsKey + unsInsIndex
        );
        const deletesBefore = notModifiesUntil(
          unsDelta,
          unsDelKeys,
          incInsKey + unsInsIndex - incInsIndex
        );
        newIncInsKey =
          incInsKey + insertsBefore - deletesBefore + conflictOffset;
      }

      let newUnsInsKey = Infinity;
      if (unsInsKey < Infinity) {
        const insertsBefore = notModifiesUntil(
          incDelta,
          incInsKeys,
          unsInsKey + incInsIndex
        );
        const deletesBefore = notModifiesUntil(
          incDelta,
          incDelKeys,
          unsInsKey + incInsIndex - unsInsIndex
        );
        newUnsInsKey =
          unsInsKey + insertsBefore - deletesBefore - conflictOffset;
      }

      // conflict handling
      if (newIncInsKey !== Infinity && newUnsInsKey === newIncInsKey) {
        const incEl = incDelta[incInsKey];
        const unsEl = unsDelta[unsInsKey];
        const incIsModify = isModify(incDelta, incInsKey);
        const unsIsModify = isModify(unsDelta, unsInsKey);
        if (incIsModify && unsIsModify) throw new Error("Modify conflict");
        // put the insert before the modify
        else if (!incIsModify && unsIsModify) {
          merged[newIncInsKey] = incEl;
          merged[newUnsInsKey + 1] = unsEl;
        } else if (incIsModify && !unsIsModify) {
          merged[newIncInsKey + 1] = unsEl;
          merged[newUnsInsKey] = incEl;
        } else {
          // two inserts, take incoming first
          merged[newIncInsKey] = incEl;
          merged[newUnsInsKey + 1] = unsEl;
        }
        incInsIndex++;
        unsInsIndex++;
        conflictOffset++;
      }
      // incoming insert
      else if (newIncInsKey < newUnsInsKey) {
        if (merged[newIncInsKey]) throw new Error("Insert conflict");
        merged[newIncInsKey] = incDelta[incInsKey];
        incInsIndex++;
      }
      // unsafed insert
      else if (newUnsInsKey < newIncInsKey) {
        if (merged[newUnsInsKey]) throw new Error("Insert conflict");
        merged[newUnsInsKey] = unsDelta[unsInsKey];
        unsInsIndex++;
      }
    } while (
      unsInsKey < Infinity ||
      incInsKey < Infinity ||
      incDelKey < Infinity ||
      unsDelKey < Infinity
    );
    return merged;
  };

  const mergeVersions = (originalHtml, unsafedHtml, incomingHtml) => {
    const original = parse(originalHtml);
    const unsaved = parse(unsafedHtml);
    const incoming = parse(incomingHtml);
    const ouDelta = diffpatch.diff(original, unsaved);
    const oiDelta = diffpatch.diff(original, incoming);
    if (!ouDelta && !oiDelta) return originalHtml;
    if (!ouDelta) return incomingHtml;
    if (!oiDelta) return unsafedHtml;
    const mergedDelta = deltaMerger(ouDelta, oiDelta);
    const merged = diffpatch.patch(original, mergedDelta);
    return stringify(merged);
  };

  window.mergeVersions = mergeVersions;
})();
