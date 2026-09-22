/* Shared in-memory practice engine. It intentionally has no storage or UI dependencies. */
(function (root) {
  "use strict";
  function shuffle(items) {
    var result = items.slice();
    for (var i = result.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temporary = result[i]; result[i] = result[j]; result[j] = temporary;
    }
    return result;
  }
  function getQuestionLimitOptions(total) {
    var standardCounts = [5, 10, 15, 20, 25, 30];
    var options = standardCounts.filter(function (count) { return count < total; }).map(function (count) {
      return { type: "count", value: count, label: count + "問" };
    });
    options.push({ type: "all", value: total, label: "全" + total + "問" });
    return options;
  }
  function validQuestionLimit(limit, total) {
    return limit === undefined || limit === null || limit === "all" || (Number.isInteger(limit) && limit > 0 && limit <= total);
  }
  function createSession(request, questions, options) {
    var settings = options || {};
    var limit = settings.questionLimit;
    var selectedQuestions = shuffle(questions);
    if (Number.isInteger(limit) && limit > 0 && limit < selectedQuestions.length) selectedQuestions = selectedQuestions.slice(0, limit);
    var items = selectedQuestions.map(function (question) {
      return { question: question, displayChoices: shuffle(question.choices || []), answered: false };
    });
    var state = { request: request, items: items, index: 0, score: 0, complete: false };
    function current() { return state.complete ? null : state.items[state.index] || null; }
    return {
      request: request,
      getCurrent: current,
      getState: function () { return { index: state.index, total: state.items.length, score: state.score, complete: state.complete }; },
      answer: function (choiceId) {
        var item = current();
        if (!item) return { ok: false, code: "session-complete" };
        if (item.answered) return { ok: false, code: "already-answered" };
        if (!item.displayChoices.some(function (choice) { return choice.id === choiceId; })) return { ok: false, code: "invalid-choice" };
        item.answered = true;
        var correct = choiceId === item.question.correctChoiceId;
        if (correct) state.score += 1;
        return { ok: true, correct: correct, selectedChoiceId: choiceId, correctChoiceId: item.question.correctChoiceId, question: item.question };
      },
      next: function () {
        var item = current();
        if (!item) return { ok: false, code: "session-complete" };
        if (!item.answered) return { ok: false, code: "answer-required" };
        if (state.index >= state.items.length - 1) { state.complete = true; return { ok: true, complete: true }; }
        state.index += 1; return { ok: true, complete: false };
      }
    };
  }
  async function loadSession(request, options) {
    if (!root.EikenDataLoader) return { ok: false, code: "loader-unavailable", message: "Data loader is unavailable." };
    var result = await root.EikenDataLoader.loadQuestions(request, options);
    if (!result.ok) return result;
    var settings = options || {};
    if (!validQuestionLimit(settings.questionLimit, result.questions.length)) return { ok: false, code: "invalid-question-limit", message: "Requested question count is not available.", details: { questionLimit: settings.questionLimit, available: result.questions.length } };
    return { ok: true, grade: result.grade, gradeId: result.gradeId, skill: result.skill, part: result.part, session: createSession(request, result.questions, settings) };
  }
  async function discoverPracticeRoutes(gradeId, options) {
    if (!root.EikenDataLoader) return { ok: false, code: "loader-unavailable", message: "Data loader is unavailable." };
    var settings = options || {};
    var gradeResult = await root.EikenDataLoader.loadGrade(gradeId, settings);
    if (!gradeResult.ok) return gradeResult;
    var routes = Array.isArray(gradeResult.manifest.contentRoutes) ? gradeResult.manifest.contentRoutes.filter(function (route) { return route.practiceAvailable === true; }) : [];
    var available = [], unavailable = [];
    for (var i = 0; i < routes.length; i += 1) {
      var route = routes[i];
      var loaded = await root.EikenDataLoader.loadQuestions({ gradeId: gradeId, skill: route.skill, part: route.part }, settings);
      if (loaded.ok) available.push({ skill: route.skill, part: route.part, displayName: route.displayName || route.part, description: route.description || "", questionCount: loaded.questions.length });
      else unavailable.push({ skill: route.skill, part: route.part, code: loaded.code });
    }
    if (!available.length) return { ok: false, code: "practice-routes-unavailable", message: "No practice routes can be loaded.", details: { unavailable: unavailable } };
    return { ok: true, grade: gradeResult.grade, manifest: gradeResult.manifest, routes: available, unavailable: unavailable };
  }
  root.EikenPracticeEngine = { shuffle: shuffle, getQuestionLimitOptions: getQuestionLimitOptions, validQuestionLimit: validQuestionLimit, createSession: createSession, loadSession: loadSession, discoverPracticeRoutes: discoverPracticeRoutes };
  if (typeof module !== "undefined" && module.exports) module.exports = root.EikenPracticeEngine;
}(typeof window !== "undefined" ? window : globalThis));
