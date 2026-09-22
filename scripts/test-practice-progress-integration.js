"use strict";
const assert = require("assert");
const progress = require("../js/core/progress-store.js");
const engine = require("../js/core/practice-engine.js");
class MemoryStorage { constructor(initial) { this.values = initial || {}; } getItem(key) { return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null; } setItem(key, value) { this.values[key] = value; } }
function questions() { return Array.from({length:5}, (_, index) => ({ id:"G5-R-P1-00" + (index + 1), grade:"g5", skill:"reading", part:"P1", prompt:"Q" + index, choices:[{id:"A",text:"A"},{id:"B",text:"B"}], correctChoiceId:"A" })); }
function runPractice(storage, correctPattern) {
  const store = progress.createProgressStore({storage}); const session = engine.createSession({gradeId:"G5",skill:"reading",part:"P1"}, questions(), {questionLimit:5});
  const ids = session.getQuestionIds(); const started = store.startSession({gradeId:"g5",skill:"reading",part:"P1",mode:"practice",questionCount:5,questionIds:ids}); assert.ok(started.ok);
  const wrong = [];
  while (!session.getState().complete) {
    const item = session.getCurrent(); const correct = correctPattern.shift(); const choiceId = correct ? item.question.correctChoiceId : "B";
    const result = session.answer(choiceId); assert.ok(result.ok); store.recordAnswer({questionId:item.question.id,gradeId:"g5",skill:"reading",part:"P1",isCorrect:result.correct}); if (!result.correct) wrong.push(item.question.id); session.next();
  }
  const done = store.completeSession({sessionId:started.value.sessionId,questionCount:5,correctCount:session.getState().score,questionIds:ids,wrongQuestionIds:wrong}); assert.ok(done.ok); return {store, done};
}
const storage = new MemoryStorage();
let allCorrect = runPractice(storage,[true,true,true,true,true]).done.value; assert.deepEqual([allCorrect.questionCount,allCorrect.correctCount,allCorrect.wrongCount,allCorrect.accuracy],[5,5,0,100]);
let mixed = runPractice(storage,[true,true,true,false,false]).done.value; assert.deepEqual([mixed.questionCount,mixed.correctCount,mixed.wrongCount,mixed.accuracy],[5,3,2,60]);
let snapshot = progress.createProgressStore({storage}).getSnapshot(); assert.equal(snapshot.sessions.length,2); assert.notEqual(snapshot.sessions[0].sessionId,snapshot.sessions[1].sessionId);
const sharedId = "G5-R-P1-0099"; const existing = new MemoryStorage({[progress.KEY]:JSON.stringify({version:2,questions:{[sharedId]:{attempts:3,correctCount:2,wrongCount:1,currentStreak:0,lastAttemptAt:"2026-09-20T00:00:00.000Z",lastCorrectAt:"2026-09-19T00:00:00.000Z",lastWrongAt:"2026-09-20T00:00:00.000Z"}}})});
let common = progress.createProgressStore({storage:existing}); common.recordAnswer({questionId:sharedId,gradeId:"g5",skill:"reading",part:"P1",isCorrect:true,answeredAt:"2026-09-21T00:00:00.000Z"}); let raw = JSON.parse(existing.getItem(progress.KEY)); assert.equal(raw.version,2); assert.ok(raw.questionStats[sharedId]); assert.ok(Array.isArray(raw.sessions));
raw.questions[sharedId].attempts += 1; raw.questions[sharedId].correctCount += 1; raw.questions[sharedId].currentStreak += 1; raw.questions[sharedId].lastAttemptAt="2026-09-22T00:00:00.000Z"; raw.questions[sharedId].lastCorrectAt="2026-09-22T00:00:00.000Z"; existing.setItem(progress.KEY,JSON.stringify(raw));
let afterLegacy = progress.createProgressStore({storage:existing}); let synced = afterLegacy.getSnapshot(); assert.equal(synced.questionStats[sharedId].attempts,5); assert.equal(synced.questionStats[sharedId].correctCount,4); afterLegacy.recordAnswer({questionId:sharedId,gradeId:"g5",skill:"reading",part:"P1",isCorrect:false,answeredAt:"2026-09-23T00:00:00.000Z"}); raw = JSON.parse(existing.getItem(progress.KEY)); assert.equal(raw.questions[sharedId].attempts,6); assert.equal(raw.questionStats[sharedId].wrongCount,2);
console.log("PASS: practice-progress integration tests completed");
