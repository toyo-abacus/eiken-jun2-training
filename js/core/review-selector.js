/* Shared selector for questions that still need review. */
(function (root) {
  "use strict";
  function isObject(value) { return !!value && typeof value === "object" && !Array.isArray(value); }
  function count(value) { return Number.isFinite(value) && value >= 0 ? value : 0; }
  function isReviewTarget(stat) {
    return isObject(stat) && count(stat.wrongCount) > 0 && count(stat.currentStreak) < 2;
  }
  function matches(question, filter) {
    var settings = filter || {};
    return (!settings.gradeId || question.grade === settings.gradeId) &&
      (!settings.skill || question.skill === settings.skill) &&
      (!settings.part || question.part === settings.part);
  }
  function select(questionStats, questions, filter) {
    var stats = isObject(questionStats) ? questionStats : {};
    var available = Array.isArray(questions) ? questions : [];
    var ids = [], availableIds = {}, staleIds = [];
    available.forEach(function (question) { if (question && typeof question.id === "string") availableIds[question.id] = question; });
    Object.keys(stats).forEach(function (id) {
      if (!isReviewTarget(stats[id])) return;
      var question = availableIds[id];
      if (!question) { staleIds.push(id); return; }
      if (matches(question, filter)) ids.push(id);
    });
    return { questionIds: ids, count: ids.length, staleIds: staleIds };
  }
  var api = { isReviewTarget: isReviewTarget, select: select };
  root.EikenReviewSelector = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}(typeof window !== "undefined" ? window : globalThis));
