"use strict";
const assert = require("assert");
const progress = require("../js/core/progress-store.js");
const review = require("../js/core/review-selector.js");
const summary = require("../js/core/progress-summary.js");
const engine = require("../js/core/practice-engine.js");
class MemoryStorage { constructor(initial) { this.values = initial || {}; this.errorOnSet = null; } getItem(key) { return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null; } setItem(key, value) { if (this.errorOnSet) throw this.errorOnSet; this.values[key] = value; } }
const questions = [
  {id:"G5-R-P1-0001",grade:"g5",skill:"reading",part:"P1",choices:[{id:"A"},{id:"B"}],correctChoiceId:"A"},
  {id:"G5-R-P1-0002",grade:"g5",skill:"reading",part:"P1",choices:[{id:"A"},{id:"B"}],correctChoiceId:"A"},
  {id:"G5-R-P2-0001",grade:"g5",skill:"reading",part:"P2",choices:[{id:"A"},{id:"B"}],correctChoiceId:"A"},
  {id:"G4-L-P1-0001",grade:"g4",skill:"listening",part:"P1",choices:[{id:"A"},{id:"B"}],correctChoiceId:"A"}
];
function store(initial) { return progress.createProgressStore({storage:new MemoryStorage(initial)}); }
function answer(target, id, correct) { const question = questions.find((item) => item.id === id); return target.recordAnswer({questionId:id,gradeId:question.grade,skill:question.skill,part:question.part,isCorrect:correct,answeredAt:"2026-09-22T04:00:00.000Z"}); }
function ids(target, filter) { return review.select(target.getSnapshot().questionStats, questions, filter || {gradeId:"g5",skill:"reading",part:"P1"}).questionIds; }
let target = store();
assert.deepEqual(ids(target),[]); // A: unanswered
answer(target,"G5-R-P1-0001",true); assert.deepEqual(ids(target),[]); // B: correct only
answer(target,"G5-R-P1-0002",false); assert.deepEqual(ids(target),["G5-R-P1-0002"]); // C
answer(target,"G5-R-P1-0002",true); assert.deepEqual(ids(target),["G5-R-P1-0002"]); // D
answer(target,"G5-R-P1-0002",true); assert.deepEqual(ids(target),[]); // E
answer(target,"G5-R-P1-0002",false); assert.deepEqual(ids(target),["G5-R-P1-0002"]); // G
answer(target,"G5-R-P1-0002",true); answer(target,"G5-R-P1-0002",false); assert.deepEqual(ids(target),["G5-R-P1-0002"]); // F
answer(target,"G5-R-P1-0001",false); answer(target,"G5-R-P2-0001",false); answer(target,"G4-L-P1-0001",false);
assert.deepEqual(ids(target),["G5-R-P1-0001","G5-R-P1-0002"]); // H
assert.deepEqual(ids(target,{gradeId:"g5",skill:"reading",part:"P2"}),["G5-R-P2-0001"]); // I
assert.deepEqual(ids(target,{gradeId:"g4",skill:"listening",part:"P1"}),["G4-L-P1-0001"]);
const stale = review.select({"OLD-ID":{wrongCount:1,currentStreak:0}},questions,{gradeId:"g5",skill:"reading",part:"P1"}); assert.deepEqual(stale.questionIds,[]); assert.deepEqual(stale.staleIds,["OLD-ID"]); // J/K
const reviewFive = Array.from({length:5},(_, index) => ({id:"G5-R-P1-10"+index,grade:"g5",skill:"reading",part:"P1",choices:[{id:"A"},{id:"B"}],correctChoiceId:"A"}));
const session = engine.createSession({gradeId:"g5",skill:"reading",part:"P1"},reviewFive,{questionLimit:5}); const reviewStore = store(); const started = reviewStore.startSession({gradeId:"g5",skill:"reading",part:"P1",mode:"review",questionCount:5,questionIds:session.getQuestionIds()});
while (!session.getState().complete) { const current = session.getCurrent(); const response = session.answer("A"); assert.ok(response.ok); reviewStore.recordAnswer({questionId:current.question.id,gradeId:"g5",skill:"reading",part:"P1",isCorrect:response.correct}); session.next(); }
reviewStore.completeSession({sessionId:started.value.sessionId,questionCount:5,correctCount:5,questionIds:session.getQuestionIds(),wrongQuestionIds:[]});
assert.equal(reviewStore.getSnapshot().sessions[0].mode,"review"); assert.equal(summary.summarize(reviewStore.getSnapshot()).recentSessions[0].mode,"review"); // L/Q
const crossMode = store(); answer(crossMode,"G5-R-P1-0001",false); answer(crossMode,"G5-R-P1-0001",true); answer(crossMode,"G5-R-P1-0001",true); assert.deepEqual(ids(crossMode),[]); // M
const doubleSession = engine.createSession({gradeId:"g5",skill:"reading",part:"P1"},[questions[0]],{questionLimit:1}); const first = doubleSession.answer("A"), second = doubleSession.answer("A"); assert.ok(first.ok); assert.equal(second.ok,false); const doubleStore = store(); answer(doubleStore,"G5-R-P1-0001",first.correct); assert.equal(doubleStore.getSnapshot().questionStats["G5-R-P1-0001"].attempts,1); // N
const quotaStorage = new MemoryStorage(); quotaStorage.errorOnSet = Object.assign(new Error("full"),{name:"QuotaExceededError",code:22}); const quotaStore = progress.createProgressStore({storage:quotaStorage}); const failed = answer(quotaStore,"G5-R-P1-0001",false); assert.equal(failed.saved,false); assert.deepEqual(ids(quotaStore),["G5-R-P1-0001"]); // O
const legacy = store({[progress.KEY]:JSON.stringify({version:2,questions:{"G5-R-P1-0001":{attempts:1,correctCount:0,wrongCount:1,currentStreak:0,lastAttemptAt:"2026-09-22T04:00:00.000Z",lastWrongAt:"2026-09-22T04:00:00.000Z"}}})}); assert.deepEqual(ids(legacy),["G5-R-P1-0001"]); // P
console.log("PASS: review-selector tests completed");
