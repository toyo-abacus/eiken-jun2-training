/* Shared, read-only summaries for eikenTrainingProgress. */
(function (root) {
  "use strict";
  function isObject(value) { return !!value && typeof value === "object" && !Array.isArray(value); }
  function number(value) { return Number.isFinite(value) && value >= 0 ? value : 0; }
  function dateValue(value) { var date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; }
  function localDayKey(value) {
    var date = value instanceof Date ? value : dateValue(value);
    if (!date) return null;
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }
  function isCompletedSession(session) {
    return isObject(session) && session.status === "completed" && !!dateValue(session.completedAt);
  }
  function summarizeSessions(sessions) {
    return sessions.reduce(function (summary, session) {
      var total = number(session.questionCount);
      var correct = Math.min(number(session.correctCount), total);
      summary.sessionCount += 1;
      summary.questionCount += total;
      summary.correctCount += correct;
      summary.wrongCount += Math.min(number(session.wrongCount), total - correct);
      return summary;
    }, { sessionCount: 0, questionCount: 0, correctCount: 0, wrongCount: 0 });
  }
  function withAccuracy(summary) {
    summary.accuracy = summary.questionCount ? Math.round(summary.correctCount / summary.questionCount * 100) : null;
    return summary;
  }
  function summarizeQuestionStats(questionStats) {
    var entries = isObject(questionStats) ? Object.keys(questionStats).map(function (id) { return questionStats[id]; }).filter(isObject) : [];
    var total = entries.reduce(function (summary, stat) {
      var correct = number(stat.correctCount), wrong = number(stat.wrongCount);
      summary.questionCount += 1;
      summary.attempts += correct + wrong;
      summary.correctCount += correct;
      summary.wrongCount += wrong;
      return summary;
    }, { questionCount: 0, attempts: 0, correctCount: 0, wrongCount: 0 });
    total.accuracy = total.attempts ? Math.round(total.correctCount / total.attempts * 100) : null;
    return total;
  }
  function normalizeGradeId(value) {
    var id = String(value || "").toLowerCase();
    return ({ gp2: "p2", gp2plus: "p2plus", gp1: "p1" })[id] || id;
  }
  function createLabelResolver(catalog, manifests) {
    var grades = catalog && Array.isArray(catalog.grades) ? catalog.grades : [];
    var manifestMap = manifests || {};
    var skillNames = { reading: "リーディング", listening: "リスニング", writing: "ライティング", speaking: "スピーキング", vocabulary: "語彙・熟語" };
    function grade(gradeId) {
      var normalized = normalizeGradeId(gradeId);
      var item = grades.find(function (candidate) { return normalizeGradeId(candidate.gradeId || candidate.id) === normalized; });
      return item && (item.displayName || item.label) ? "英検" + (item.displayName || item.label) : String(gradeId || "英検");
    }
    function skill(skillId) { return skillNames[skillId] || String(skillId || "学習"); }
    function part(gradeId, skillId, partId) {
      var manifest = manifestMap[normalizeGradeId(gradeId)];
      var route = manifest && Array.isArray(manifest.contentRoutes) ? manifest.contentRoutes.find(function (candidate) { return candidate.skill === skillId && candidate.part === partId; }) : null;
      if (route && route.displayName) return route.displayName;
      return /^P\d+$/.test(String(partId || "")) ? "第" + String(partId).slice(1) + "部" : String(partId || "");
    }
    return { grade: grade, skill: skill, part: part };
  }
  function summarize(data, options) {
    var source = isObject(data) ? data : {};
    var now = options && options.now instanceof Date ? options.now : new Date();
    var completed = Array.isArray(source.sessions) ? source.sessions.filter(isCompletedSession).sort(function (a, b) { return dateValue(b.completedAt) - dateValue(a.completedAt); }) : [];
    var todayKey = localDayKey(now);
    var todaySessions = completed.filter(function (session) { return localDayKey(session.completedAt) === todayKey; });
    var stats = summarizeQuestionStats(source.questionStats);
    return {
      today: withAccuracy(summarizeSessions(todaySessions)),
      total: stats,
      recentSessions: completed.slice(0, 10),
      completedSessionCount: completed.length,
      hasRecords: stats.questionCount > 0 || completed.length > 0
    };
  }
  var api = { localDayKey: localDayKey, isCompletedSession: isCompletedSession, summarize: summarize, createLabelResolver: createLabelResolver };
  root.EikenProgressSummary = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}(typeof window !== "undefined" ? window : globalThis));
