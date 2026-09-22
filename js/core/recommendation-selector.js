/* Shared, read-only recommendation selector built from existing review and weakness selectors. */
(function (root) {
  "use strict";
  function isObject(value) { return !!value && typeof value === "object" && !Array.isArray(value); }
  function validIds(value) {
    var seen = {};
    return Array.isArray(value) ? value.filter(function (id) {
      if (typeof id !== "string" || !id || seen[id]) return false;
      seen[id] = true;
      return true;
    }) : [];
  }
  function selectRecommendedPractice(questionStats, availableQuestions, filters) {
    var stats = isObject(questionStats) ? questionStats : {};
    var questions = Array.isArray(availableQuestions) ? availableQuestions : [];
    var filter = isObject(filters) ? filters : {};
    if (!root.EikenReviewSelector || !root.EikenWeaknessSelector) return { mode: "normal", targetCount: 0, reason: "selectors_unavailable" };
    try {
      var review = root.EikenReviewSelector.select(stats, questions, filter);
      var reviewIds = validIds(review && review.questionIds);
      if (reviewIds.length) return { mode: "review", targetCount: reviewIds.length, reason: "wrong_answers", questionIds: reviewIds };
      var availableIds = {};
      questions.forEach(function (question) { if (question && typeof question.id === "string") availableIds[question.id] = true; });
      var weak = root.EikenWeaknessSelector.selectWeakQuestions(stats, filter);
      var weakIds = validIds((Array.isArray(weak) ? weak : []).map(function (item) { return item && availableIds[item.questionId] ? item.questionId : null; }));
      if (weakIds.length) return { mode: "weakness", targetCount: weakIds.length, reason: "weak_questions", questionIds: weakIds };
    } catch (error) {
      return { mode: "normal", targetCount: 0, reason: "recommendation_unavailable" };
    }
    return { mode: "normal", targetCount: 0, reason: "no_review_targets", questionIds: [] };
  }
  function getRecommendationPresentation(recommendation) {
    var value = isObject(recommendation) ? recommendation : {};
    if (value.mode === "review") return { mode: "review", title: "⭐ 今日のおすすめ", message: "🔴 間違えた問題が" + (Number.isInteger(value.targetCount) ? value.targetCount : 0) + "問あります。まずは復習してみよう！", buttonLabel: "おすすめ練習を始める" };
    if (value.mode === "weakness") return { mode: "weakness", title: "⭐ 今日のおすすめ", message: "🟠 苦手になっている問題が" + (Number.isInteger(value.targetCount) ? value.targetCount : 0) + "問あります。弱点をもう一度練習してみよう！", buttonLabel: "おすすめ練習を始める" };
    return { mode: "normal", title: "⭐ 今日のおすすめ", message: "🎉 今は復習する問題はありません。通常練習で新しい問題に挑戦しよう！", buttonLabel: "おすすめ練習を始める" };
  }
  var api = { selectRecommendedPractice: selectRecommendedPractice, getRecommendationPresentation: getRecommendationPresentation };
  root.EikenRecommendationSelector = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}(typeof window !== "undefined" ? window : globalThis));
