/* Shared progress storage. Not connected to the current Practice UI in Phase 5A. */
(function (root) {
  "use strict";
  var KEY = "eikenTrainingProgress";
  var VERSION = 2;
  var SCHEMA_VERSION = 2;
  var MAX_SESSIONS = 200;
  var MAX_SESSION_QUESTION_IDS = 100;
  var fallbackCounter = 0;

  function isObject(value) { return !!value && typeof value === "object" && !Array.isArray(value); }
  function nonNegativeInteger(value, fallback) {
    return Number.isFinite(value) && Math.floor(value) === value && value >= 0 ? value : fallback;
  }
  function validIso(value) { return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : null; }
  function nowIso(value) { return validIso(value) || new Date().toISOString(); }
  function stringOrNull(value) { return typeof value === "string" && value ? value : null; }
  function emptyData() { return { version: VERSION, schemaVersion: SCHEMA_VERSION, questionStats: {}, sessions: [], questions: {} }; }
  function copyData(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return emptyData(); } }

  function normalizeQuestionStat(value, metadata) {
    var source = isObject(value) ? value : {};
    var correct = nonNegativeInteger(source.correctCount, 0);
    var wrong = nonNegativeInteger(source.wrongCount, 0);
    var current = nonNegativeInteger(source.currentStreak, 0);
    var best = Math.max(nonNegativeInteger(source.bestStreak, current), current);
    return {
      gradeId: stringOrNull(metadata && metadata.gradeId) || stringOrNull(source.gradeId),
      skill: stringOrNull(metadata && metadata.skill) || stringOrNull(source.skill),
      part: stringOrNull(metadata && metadata.part) || stringOrNull(source.part),
      attempts: correct + wrong,
      correctCount: correct,
      wrongCount: wrong,
      currentStreak: current,
      bestStreak: best,
      lastAttemptAt: validIso(source.lastAttemptAt),
      lastCorrectAt: validIso(source.lastCorrectAt),
      lastWrongAt: validIso(source.lastWrongAt)
    };
  }
  function legacyQuestionValue(stat) {
    return {
      attempts: stat.attempts,
      correctCount: stat.correctCount,
      wrongCount: stat.wrongCount,
      currentStreak: stat.currentStreak,
      lastAttemptAt: stat.lastAttemptAt,
      lastCorrectAt: stat.lastCorrectAt,
      lastWrongAt: stat.lastWrongAt
    };
  }
  function normalizeIds(value) {
    if (!Array.isArray(value)) return [];
    var unique = {};
    return value.filter(function (id) {
      if (typeof id !== "string" || !id || unique[id]) return false;
      unique[id] = true;
      return true;
    }).slice(0, MAX_SESSION_QUESTION_IDS);
  }
  function normalizeSession(value) {
    if (!isObject(value) || !stringOrNull(value.sessionId)) return null;
    var count = nonNegativeInteger(value.questionCount, 0);
    var correct = Math.min(nonNegativeInteger(value.correctCount, 0), count);
    var wrong = Math.min(nonNegativeInteger(value.wrongCount, count - correct), count - correct);
    if (correct + wrong !== count) wrong = Math.max(0, count - correct);
    var completed = validIso(value.completedAt);
    return {
      sessionId: value.sessionId,
      startedAt: validIso(value.startedAt) || completed || new Date(0).toISOString(),
      completedAt: completed,
      gradeId: stringOrNull(value.gradeId),
      skill: stringOrNull(value.skill),
      part: stringOrNull(value.part),
      mode: stringOrNull(value.mode) || "practice",
      questionCount: count,
      correctCount: correct,
      wrongCount: wrong,
      accuracy: count ? Math.round(correct / count * 100) : 0,
      status: completed ? "completed" : "in-progress",
      questionIds: normalizeIds(value.questionIds),
      wrongQuestionIds: normalizeIds(value.wrongQuestionIds)
    };
  }
  function trimSessions(sessions) {
    return sessions.slice().sort(function (a, b) {
      return String(b.completedAt || b.startedAt).localeCompare(String(a.completedAt || a.startedAt));
    }).slice(0, MAX_SESSIONS);
  }
  function normalizeData(raw) {
    if (!isObject(raw)) return { ok: false, code: "invalid-root", warning: "学習記録の形式を確認できません。" };
    if (raw.version !== VERSION) return { ok: false, code: raw.version > VERSION ? "future-version" : "unsupported-version", warning: "この端末の学習記録は現在の形式と互換性がありません。" };
    if (raw.schemaVersion !== undefined && raw.schemaVersion > SCHEMA_VERSION) return { ok: false, code: "future-schema-version", warning: "新しい形式の学習記録が見つかりました。保存は行いません。" };
    if (raw.questions !== undefined && !isObject(raw.questions)) return { ok: false, code: "invalid-legacy-questions", warning: "既存の学習記録を安全に読み込めません。保存は行いません。" };
    if (raw.questionStats !== undefined && !isObject(raw.questionStats)) return { ok: false, code: "invalid-question-stats", warning: "学習記録を安全に読み込めません。保存は行いません。" };
    if (raw.sessions !== undefined && !Array.isArray(raw.sessions)) return { ok: false, code: "invalid-sessions", warning: "学習履歴を安全に読み込めません。保存は行いません。" };
    var data = emptyData();
    data.questions = raw.questions || {};
    Object.keys(raw.questionStats || {}).forEach(function (id) { data.questionStats[id] = normalizeQuestionStat(raw.questionStats[id]); });
    Object.keys(data.questions).forEach(function (id) {
      if (!data.questionStats[id]) data.questionStats[id] = normalizeQuestionStat(data.questions[id]);
      data.questions[id] = legacyQuestionValue(data.questionStats[id]);
    });
    data.sessions = trimSessions((raw.sessions || []).map(normalizeSession).filter(Boolean));
    return { ok: true, data: data, migrated: raw.schemaVersion !== SCHEMA_VERSION || raw.questionStats === undefined || raw.sessions === undefined };
  }
  function getStorage(provided) {
    try { return provided || root.localStorage || null; } catch (error) { return null; }
  }
  function generateSessionId(existing) {
    var candidate;
    do {
      try { candidate = root.crypto && typeof root.crypto.randomUUID === "function" ? root.crypto.randomUUID() : null; } catch (error) { candidate = null; }
      if (!candidate) { fallbackCounter += 1; candidate = "session-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10) + "-" + fallbackCounter; }
    } while (existing[candidate]);
    return candidate;
  }
  function createProgressStore(options) {
    var settings = options || {};
    var storage = getStorage(settings.storage);
    var state = { loaded: false, writable: true, data: null, warning: "", code: "" };
    function status() { return { writable: state.writable, warning: state.warning, code: state.code }; }
    function load() {
      if (state.loaded) return { ok: true, data: state.data, status: status() };
      state.loaded = true;
      if (!storage || typeof storage.getItem !== "function") {
        state.data = emptyData(); state.writable = false; state.code = "storage-unavailable"; state.warning = "この端末では学習記録を保存できません。";
        return { ok: false, data: state.data, status: status() };
      }
      var raw;
      try { raw = storage.getItem(KEY); }
      catch (error) { state.data = emptyData(); state.writable = false; state.code = "storage-read-failed"; state.warning = "学習記録を読み込めません。今回の記録は保存されません。"; return { ok: false, data: state.data, status: status() }; }
      if (raw === null || raw === "") { state.data = emptyData(); return { ok: true, data: state.data, status: status() }; }
      var parsed;
      try { parsed = JSON.parse(raw); }
      catch (error) { state.data = emptyData(); state.writable = false; state.code = "invalid-json"; state.warning = "学習記録が壊れているため、今回の記録は保存されません。"; return { ok: false, data: state.data, status: status() }; }
      var normalized = normalizeData(parsed);
      if (!normalized.ok) { state.data = emptyData(); state.writable = false; state.code = normalized.code; state.warning = normalized.warning; return { ok: false, data: state.data, status: status() }; }
      state.data = normalized.data;
      return { ok: true, data: state.data, migrated: normalized.migrated, status: status() };
    }
    function save() {
      load();
      if (!state.writable || !storage || typeof storage.setItem !== "function") return { saved: false, warning: state.warning || "この端末では学習記録を保存できません。", code: state.code || "storage-unavailable" };
      var serialized;
      try { serialized = JSON.stringify(state.data); }
      catch (error) { state.writable = false; state.code = "serialize-failed"; state.warning = "学習記録を保存できません。問題演習は続けられます。"; return { saved: false, warning: state.warning, code: state.code }; }
      try { storage.setItem(KEY, serialized); return { saved: true, warning: "", code: "" }; }
      catch (error) {
        state.writable = false;
        state.code = error && (error.name === "QuotaExceededError" || error.code === 22 || error.code === 1014) ? "quota-exceeded" : "storage-write-failed";
        state.warning = "学習記録を保存できません。問題演習は続けられます。";
        return { saved: false, warning: state.warning, code: state.code };
      }
    }
    function operation(result) { var saved = save(); return { ok: true, saved: saved.saved, warning: saved.warning, code: saved.code, data: state.data, value: result }; }
    function recordAnswer(input) {
      load(); input = input || {};
      if (!stringOrNull(input.questionId) || !stringOrNull(input.gradeId) || !stringOrNull(input.skill) || !stringOrNull(input.part) || typeof input.isCorrect !== "boolean") return { ok: false, saved: false, code: "invalid-answer", warning: "回答記録の情報が不足しています。" };
      var answeredAt = nowIso(input.answeredAt);
      var stat = normalizeQuestionStat(state.data.questionStats[input.questionId] || state.data.questions[input.questionId], input);
      stat.gradeId = input.gradeId; stat.skill = input.skill; stat.part = input.part;
      if (input.isCorrect) { stat.correctCount += 1; stat.currentStreak += 1; stat.bestStreak = Math.max(stat.bestStreak, stat.currentStreak); stat.lastCorrectAt = answeredAt; }
      else { stat.wrongCount += 1; stat.currentStreak = 0; stat.lastWrongAt = answeredAt; }
      stat.attempts = stat.correctCount + stat.wrongCount; stat.lastAttemptAt = answeredAt;
      state.data.questionStats[input.questionId] = stat;
      state.data.questions[input.questionId] = legacyQuestionValue(stat);
      return operation(stat);
    }
    function validateSessionInput(input) {
      return input && stringOrNull(input.gradeId) && stringOrNull(input.skill) && stringOrNull(input.part) && nonNegativeInteger(input.questionCount, -1) >= 0;
    }
    function startSession(input) {
      load(); input = input || {};
      if (!validateSessionInput(input)) return { ok: false, saved: false, code: "invalid-session", warning: "学習セッションの情報が不足しています。" };
      var existing = {}; state.data.sessions.forEach(function (session) { existing[session.sessionId] = true; });
      var session = {
        sessionId: stringOrNull(input.sessionId) && !existing[input.sessionId] ? input.sessionId : generateSessionId(existing),
        startedAt: nowIso(input.startedAt), completedAt: null,
        gradeId: input.gradeId, skill: input.skill, part: input.part, mode: stringOrNull(input.mode) || "practice",
        questionCount: input.questionCount, correctCount: 0, wrongCount: 0, accuracy: 0, status: "in-progress",
        questionIds: normalizeIds(input.questionIds), wrongQuestionIds: []
      };
      state.data.sessions = trimSessions([session].concat(state.data.sessions));
      return operation(session);
    }
    function completeSession(input) {
      load(); input = input || {};
      var session = state.data.sessions.find(function (item) { return item.sessionId === input.sessionId; });
      if (!session) return { ok: false, saved: false, code: "session-not-found", warning: "完了する学習セッションが見つかりません。" };
      var count = input.questionCount === undefined ? session.questionCount : nonNegativeInteger(input.questionCount, -1);
      var correct = nonNegativeInteger(input.correctCount, -1);
      if (count < 0 || correct < 0 || correct > count) return { ok: false, saved: false, code: "invalid-session-result", warning: "学習結果の値が正しくありません。" };
      session.questionCount = count; session.correctCount = correct; session.wrongCount = count - correct; session.accuracy = count ? Math.round(correct / count * 100) : 0;
      session.completedAt = nowIso(input.completedAt); session.status = "completed";
      if (input.questionIds !== undefined) session.questionIds = normalizeIds(input.questionIds);
      if (input.wrongQuestionIds !== undefined) session.wrongQuestionIds = normalizeIds(input.wrongQuestionIds);
      state.data.sessions = trimSessions(state.data.sessions);
      return operation(session);
    }
    function recordSession(input) {
      input = input || {};
      var started = startSession(input);
      if (!started.ok) return started;
      return completeSession({ sessionId: started.value.sessionId, questionCount: input.questionCount, correctCount: input.correctCount, completedAt: input.completedAt, questionIds: input.questionIds, wrongQuestionIds: input.wrongQuestionIds });
    }
    return { key: KEY, version: VERSION, schemaVersion: SCHEMA_VERSION, maxSessions: MAX_SESSIONS, load: load, save: save, getSnapshot: function () { load(); return copyData(state.data); }, getStatus: status, recordAnswer: recordAnswer, startSession: startSession, completeSession: completeSession, recordSession: recordSession };
  }
  var api = { KEY: KEY, VERSION: VERSION, SCHEMA_VERSION: SCHEMA_VERSION, MAX_SESSIONS: MAX_SESSIONS, createProgressStore: createProgressStore, normalizeData: normalizeData };
  root.EikenProgressStore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
}(typeof window !== "undefined" ? window : globalThis));
