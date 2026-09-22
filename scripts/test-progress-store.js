"use strict";
const assert = require("assert");
const progress = require("../js/core/progress-store.js");
class MemoryStorage {
  constructor(initial) { this.values = initial || {}; this.errorOnGet = null; this.errorOnSet = null; }
  getItem(key) { if (this.errorOnGet) throw this.errorOnGet; return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null; }
  setItem(key, value) { if (this.errorOnSet) throw this.errorOnSet; this.values[key] = value; }
}
function answer(store, isCorrect, questionId = "G5-R-P1-0001") { return store.recordAnswer({ questionId, gradeId: questionId.startsWith("G4") ? "g4" : "g5", skill: questionId.includes("-L-") ? "listening" : "reading", part: "P1", isCorrect, answeredAt: "2026-09-22T04:00:00.000Z" }); }
function test() {
  const storage = new MemoryStorage(); const store = progress.createProgressStore({ storage });
  assert.equal(store.load().ok, true); assert.deepEqual(store.getSnapshot().sessions, []);
  answer(store, true); let stat = store.getSnapshot().questionStats["G5-R-P1-0001"]; assert.deepEqual([stat.attempts, stat.correctCount, stat.wrongCount, stat.currentStreak, stat.bestStreak], [1,1,0,1,1]); assert.ok(stat.lastCorrectAt);
  answer(store, true); stat = store.getSnapshot().questionStats["G5-R-P1-0001"]; assert.deepEqual([stat.attempts, stat.currentStreak, stat.bestStreak], [2,2,2]);
  answer(store, false); stat = store.getSnapshot().questionStats["G5-R-P1-0001"]; assert.deepEqual([stat.attempts, stat.correctCount, stat.wrongCount, stat.currentStreak, stat.bestStreak], [3,2,1,0,2]); assert.ok(stat.lastWrongAt);
  answer(store, false, "G5-R-P1-0002"); answer(store, true, "G5-R-P1-0002"); const recovery = store.getSnapshot().questionStats["G5-R-P1-0002"]; assert.deepEqual([recovery.attempts, recovery.correctCount, recovery.wrongCount, recovery.currentStreak, recovery.bestStreak], [2,1,1,1,1]);
  answer(store, true, "G4-L-P1-0001"); assert.equal(store.getSnapshot().questionStats["G4-L-P1-0001"].skill, "listening");
  const started = store.startSession({ gradeId:"g5", skill:"reading", part:"P1", mode:"practice", questionCount:5, questionIds:["G5-R-P1-0001"] }); assert.ok(started.ok && started.value.sessionId);
  const completed = store.completeSession({ sessionId:started.value.sessionId, correctCount:4, wrongQuestionIds:["G5-R-P1-0002"] }); assert.equal(completed.value.accuracy,80); assert.equal(completed.value.wrongCount,1);
  const reloaded = progress.createProgressStore({storage}); assert.equal(reloaded.load().ok,true); assert.equal(reloaded.getSnapshot().questionStats["G5-R-P1-0001"].attempts,3);
  for (let i=0;i<205;i+=1) assert.ok(store.recordSession({ gradeId:"g5",skill:"reading",part:"P1",mode:"practice",questionCount:1,correctCount:1 }).ok);
  assert.equal(store.getSnapshot().sessions.length, progress.MAX_SESSIONS);
  const ids = new Set(store.getSnapshot().sessions.map((session) => session.sessionId)); assert.equal(ids.size, progress.MAX_SESSIONS);
  const legacy = new MemoryStorage({ [progress.KEY]: JSON.stringify({version:2,questions:{"G5-R-P1-0009":{attempts:2,correctCount:1,wrongCount:1,currentStreak:0,lastAttemptAt:"2026-09-20T00:00:00.000Z",lastCorrectAt:"2026-09-19T00:00:00.000Z",lastWrongAt:"2026-09-20T00:00:00.000Z"}}}) });
  const legacyStore = progress.createProgressStore({storage:legacy}); assert.ok(legacyStore.load().ok); assert.equal(legacyStore.getSnapshot().questionStats["G5-R-P1-0009"].attempts,2); assert.ok(answer(legacyStore,true,"G5-R-P1-0009").saved); assert.equal(JSON.parse(legacy.getItem(progress.KEY)).version,2);
  const olderSchema = new MemoryStorage({[progress.KEY]:JSON.stringify({version:2,schemaVersion:1,questions:{}})}); const olderStore = progress.createProgressStore({storage:olderSchema}); assert.equal(olderStore.load().ok,true);
  ["{bad", "", "null", "[]"].forEach((raw) => { const s = progress.createProgressStore({storage:new MemoryStorage({[progress.KEY]:raw})}); assert.doesNotThrow(() => s.load()); assert.equal(s.getStatus().writable, raw === "" ? true : false); });
  const futureStorage = new MemoryStorage({[progress.KEY]:JSON.stringify({version:2,schemaVersion:99,questions:{}})}); const future = progress.createProgressStore({storage:futureStorage}); assert.equal(future.load().ok,false); assert.equal(answer(future,true).saved,false); assert.equal(futureStorage.getItem(progress.KEY).includes("99"),true);
  const readError = new MemoryStorage(); readError.errorOnGet = Object.assign(new Error("blocked"),{name:"SecurityError"}); const blocked = progress.createProgressStore({storage:readError}); assert.equal(blocked.load().ok,false); assert.doesNotThrow(() => answer(blocked,true));
  const quota = new MemoryStorage(); quota.errorOnSet = Object.assign(new Error("full"),{name:"QuotaExceededError",code:22}); const quotaStore = progress.createProgressStore({storage:quota}); const quotaResult = answer(quotaStore,true); assert.equal(quotaResult.ok,true); assert.equal(quotaResult.saved,false); assert.equal(quotaResult.code,"quota-exceeded");
  const writeSecurity = new MemoryStorage(); writeSecurity.errorOnSet = Object.assign(new Error("blocked"),{name:"SecurityError"}); const securityStore = progress.createProgressStore({storage:writeSecurity}); const securityResult = answer(securityStore,true); assert.equal(securityResult.ok,true); assert.equal(securityResult.saved,false); assert.equal(securityResult.code,"storage-write-failed");
  const unavailable = progress.createProgressStore({storage:null}); assert.equal(unavailable.load().ok,false); assert.doesNotThrow(() => answer(unavailable,true));
  const stringifyStorage = new MemoryStorage(); const stringifyStore = progress.createProgressStore({storage:stringifyStorage}); const originalStringify = JSON.stringify; JSON.stringify = () => { throw new Error("stringify blocked"); }; const stringifyResult = answer(stringifyStore,true); JSON.stringify = originalStringify; assert.equal(stringifyResult.ok,true); assert.equal(stringifyResult.saved,false); assert.equal(stringifyResult.code,"serialize-failed");
  console.log("PASS: progress-store tests completed");
}
test();
