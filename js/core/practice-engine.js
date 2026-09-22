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
  function createSession(request, questions) {
    var items = shuffle(questions).map(function (question) {
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
    return { ok: true, grade: result.grade, gradeId: result.gradeId, skill: result.skill, part: result.part, session: createSession(request, result.questions) };
  }
  root.EikenPracticeEngine = { shuffle: shuffle, createSession: createSession, loadSession: loadSession };
  if (typeof module !== "undefined" && module.exports) module.exports = root.EikenPracticeEngine;
}(typeof window !== "undefined" ? window : globalThis));
