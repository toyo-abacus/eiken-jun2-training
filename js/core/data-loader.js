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
  function normalizeGradeId(gradeId) {
    var value = String(gradeId || "").toLowerCase();
    var aliases = { g5: "g5", g4: "g4", g3: "g3", gp2: "p2", p2: "p2", gp2plus: "p2plus", p2plus: "p2plus", g2: "g2", gp1: "p1", p1: "p1", g1: "g1" };
    return aliases[value] || value;
  }
  async function loadCatalog(options) { var settings = options || {}; return fetchJson(settings.catalogPath || "data/catalog.json", settings.fetch); }
  async function loadGrade(gradeId, options) {
    var settings = options || {}, catalogResult = await loadCatalog(settings);
    if (!catalogResult.ok) return catalogResult;
    gradeId = normalizeGradeId(gradeId);
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
  async function loadQuestions(query, options) {
    var request = query || {}, settings = options || {};
    var gradeId = normalizeGradeId(request.gradeId || request.grade);
    if (!gradeId || !request.skill || !request.part) return failure("invalid-query", "gradeId, skill, and part are required.");
    if (["reading", "listening", "writing", "speaking", "vocabulary"].indexOf(request.skill) === -1) return failure("invalid-skill", "Requested skill is not supported.", { skill: request.skill });
    var gradeResult = await loadGrade(gradeId, settings);
    if (!gradeResult.ok) return gradeResult;
    var dataResult = await loadQuestionFiles(gradeResult.manifest, settings);
    if (!dataResult.ok) return dataResult;
    var questions = [];
    dataResult.value.forEach(function (file) {
      if (file && Array.isArray(file.questions)) questions = questions.concat(file.questions);
    });
    questions = questions.filter(function (question) { return question.grade === gradeId && question.skill === request.skill && question.part === request.part; });
    if (!questions.length) return failure("questions-not-found", "No matching questions are registered.", { gradeId: gradeId, skill: request.skill, part: request.part });
    return { ok: true, grade: gradeResult.grade, gradeId: gradeId, skill: request.skill, part: request.part, questions: questions };
  }
  var api = { fetchJson: fetchJson, loadCatalog: loadCatalog, loadGrade: loadGrade, loadQuestionFiles: loadQuestionFiles, loadQuestions: loadQuestions, getGrade: getGrade, normalizeGradeId: normalizeGradeId };
  root.EikenDataLoader = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}(typeof window !== "undefined" ? window : globalThis));
