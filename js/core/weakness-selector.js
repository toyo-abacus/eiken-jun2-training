/* Shared, read-only selector for questions whose understanding is not yet stable. */
(function (root) {
  "use strict";
  function isObject(value) { return !!value && typeof value === "object" && !Array.isArray(value); }
  function isNonNegativeInteger(value) { return Number.isFinite(value) && Math.floor(value) === value && value >= 0; }
  function validDate(value) {
    if (typeof value !== "string" || !value) return null;
    var timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }
  function normalizedStat(stat) {
    if (!isObject(stat) || !isNonNegativeInteger(stat.attempts) || !isNonNegativeInteger(stat.correctCount) ||
      !isNonNegativeInteger(stat.wrongCount) || !isNonNegativeInteger(stat.currentStreak) ||
      stat.correctCount + stat.wrongCount !== stat.attempts) return null;
    return {
      gradeId: typeof stat.gradeId === "string" && stat.gradeId ? stat.gradeId : null,
      skill: typeof stat.skill === "string" && stat.skill ? stat.skill : null,
      part: typeof stat.part === "string" && stat.part ? stat.part : null,
      attempts: stat.attempts,
      correctCount: stat.correctCount,
      wrongCount: stat.wrongCount,
      currentStreak: stat.currentStreak,
      lastAttemptAt: validDate(stat.lastAttemptAt),
      lastWrongAt: validDate(stat.lastWrongAt),
      lastCorrectAt: validDate(stat.lastCorrectAt)
    };
  }
  function isWeakQuestion(stat) {
    var item = normalizedStat(stat);
    if (!item || item.attempts < 2 || item.currentStreak >= 3) return false;
    var lowAccuracy = item.attempts >= 3 && item.correctCount / item.attempts < 0.60;
    var recentMiss = item.attempts >= 3 && item.currentStreak === 0 && item.lastWrongAt !== null;
    return item.wrongCount >= 2 || lowAccuracy || recentMiss;
  }
  function calculateWeaknessScore(stat) {
    var item = normalizedStat(stat);
    if (!item || !isWeakQuestion(stat)) return null;
    var score = item.wrongCount * 3;
    score += Math.round(item.wrongCount / item.attempts * 10);
    if (item.currentStreak === 0) score += 5;
    else if (item.currentStreak === 1) score += 3;
    else if (item.currentStreak === 2) score += 1;
    if (item.lastWrongAt !== null && (item.lastCorrectAt === null || item.lastWrongAt > item.lastCorrectAt)) score += 4;
    if (item.attempts >= 5) score += 1;
    return score;
  }
  function matches(item, filters) {
    var filter = filters || {};
    return (!filter.gradeId || item.gradeId === filter.gradeId) &&
      (!filter.skill || item.skill === filter.skill) &&
      (!filter.part || item.part === filter.part);
  }
  function selectWeakQuestions(questionStats, filters) {
    var stats = isObject(questionStats) ? questionStats : {};
    return Object.keys(stats).map(function (questionId) {
      var item = normalizedStat(stats[questionId]);
      if (!item || !matches(item, filters) || !isWeakQuestion(stats[questionId])) return null;
      return {
        questionId: questionId,
        gradeId: item.gradeId,
        skill: item.skill,
        part: item.part,
        weaknessScore: calculateWeaknessScore(stats[questionId]),
        attempts: item.attempts,
        correctCount: item.correctCount,
        wrongCount: item.wrongCount,
        accuracy: Math.round(item.correctCount / item.attempts * 100),
        currentStreak: item.currentStreak,
        lastAttemptAt: item.lastAttemptAt === null ? null : new Date(item.lastAttemptAt).toISOString(),
        lastWrongAt: item.lastWrongAt === null ? null : new Date(item.lastWrongAt).toISOString()
      };
    }).filter(Boolean).sort(function (left, right) {
      if (right.weaknessScore !== left.weaknessScore) return right.weaknessScore - left.weaknessScore;
      var rightWrong = right.lastWrongAt ? Date.parse(right.lastWrongAt) : 0;
      var leftWrong = left.lastWrongAt ? Date.parse(left.lastWrongAt) : 0;
      if (rightWrong !== leftWrong) return rightWrong - leftWrong;
      return left.questionId.localeCompare(right.questionId);
    });
  }
  var api = { isWeakQuestion: isWeakQuestion, calculateWeaknessScore: calculateWeaknessScore, selectWeakQuestions: selectWeakQuestions };
  root.EikenWeaknessSelector = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}(typeof window !== "undefined" ? window : globalThis));
