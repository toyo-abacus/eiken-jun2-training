/* Phase 1 foundation. Deliberately not loaded by index.html. */
(function (root) {
  "use strict";
  function failure(code, message, details) { return { ok: false, code: code, message: message, details: details || null }; }
  async function fetchJson(path, fetchImpl) {
    var fetcher = fetchImpl || (typeof fetch === "function" ? fetch : null);
    if (!fetcher) return failure("fetch-unavailable", "This browser cannot load learning data.");
    try {
      var response = await fetcher(path);
      if (!response || !response.ok) return failure("fetch-failed", "Data file could not be loaded.", { path: path, status: response && response.status });
      try { return { ok: true, value: await response.json(), path: path }; }
      catch (error) { return failure("invalid-json", "Data file is not valid JSON.", { path: path, error: String(error) }); }
    } catch (error) { return failure("fetch-failed", "Data file could not be loaded.", { path: path, error: String(error) }); }
  }
  function getGrade(catalog, gradeId) { return catalog && Array.isArray(catalog.grades) ? catalog.grades.find(function (grade) { return grade.id === gradeId || grade.gradeId === gradeId; }) || null : null; }
  async function loadCatalog(options) { var settings = options || {}; return fetchJson(settings.catalogPath || "data/catalog.json", settings.fetch); }
  async function loadGrade(gradeId, options) {
    var settings = options || {}, catalogResult = await loadCatalog(settings);
    if (!catalogResult.ok) return catalogResult;
    var grade = getGrade(catalogResult.value, gradeId);
    if (!grade) return failure("unknown-grade", "Requested grade is not registered.", { gradeId: gradeId });
    if (grade.enabled !== true && settings.allowDisabled !== true) return failure("disabled-grade", "Requested grade is not enabled for the common engine.", { gradeId: gradeId, contentStatus: grade.contentStatus });
    if (!grade.manifest) return failure("manifest-missing", "Requested grade has no manifest yet.", { gradeId: gradeId });
    var manifestResult = await fetchJson(grade.manifest, settings.fetch);
    return manifestResult.ok ? { ok: true, catalog: catalogResult.value, grade: grade, manifest: manifestResult.value } : manifestResult;
  }
  async function loadQuestionFiles(manifest, options) {
    var settings = options || {};
    if (!manifest || !Array.isArray(manifest.dataFiles)) return failure("question-files-missing", "Manifest does not list question data files.");
    var values = [];
    for (var i = 0; i < manifest.dataFiles.length; i += 1) { var result = await fetchJson(manifest.dataFiles[i], settings.fetch); if (!result.ok) return result; values.push(result.value); }
    return { ok: true, value: values };
  }
  var api = { fetchJson: fetchJson, loadCatalog: loadCatalog, loadGrade: loadGrade, loadQuestionFiles: loadQuestionFiles, getGrade: getGrade };
  root.EikenDataLoader = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}(typeof window !== "undefined" ? window : globalThis));
