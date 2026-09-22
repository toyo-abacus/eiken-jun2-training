"use strict";
const assert = require("assert");
const weakness = require("../js/core/weakness-selector.js");
const progress = require("../js/core/progress-store.js");
const summary = require("../js/core/progress-summary.js");

class MemoryStorage {
  constructor() { this.values = {}; }
  getItem(key) { return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null; }
  setItem(key, value) { this.values[key] = value; }
}
function stat(overrides) {
  return Object.assign({ gradeId:"g5", skill:"reading", part:"P1", attempts:2, correctCount:0, wrongCount:2, currentStreak:0, lastAttemptAt:"2026-09-22T00:00:00.000Z", lastWrongAt:"2026-09-22T00:00:00.000Z", lastCorrectAt:null }, overrides || {});
}

const targets = weakness.selectWeakQuestions({
  "G5-R-P1-0001": stat(),
  "G5-R-P1-0002": stat({ attempts:5, correctCount:1, wrongCount:4 }),
  "G5-R-P2-0001": stat({ part:"P2" })
}, { gradeId:"g5", skill:"reading", part:"P1" });
assert.deepEqual(targets.map((item) => item.questionId), ["G5-R-P1-0002", "G5-R-P1-0001"]); // 0/1/multiple targets and route filtering
assert.deepEqual(weakness.weightedSample([], 5), []); // no weakness target
assert.deepEqual(weakness.weightedSample(targets, 2, () => 0), ["G5-R-P1-0002", "G5-R-P1-0001"]); // no duplicate selection

let highFirst = 0;
for (let i = 0; i < 1000; i += 1) {
  if (weakness.weightedSample([{ questionId:"high", weaknessScore:20 }, { questionId:"low", weaknessScore:1 }], 1)[0] === "high") highFirst += 1;
}
assert.ok(highFirst > 800, "higher weakness score should be selected more often");

const storage = new MemoryStorage();
const store = progress.createProgressStore({ storage });
const started = store.startSession({ gradeId:"g5", skill:"reading", part:"P1", mode:"weakness", questionCount:1, questionIds:["G5-R-P1-0002"] });
assert.ok(started.ok);
assert.ok(store.recordAnswer({ questionId:"G5-R-P1-0002", gradeId:"g5", skill:"reading", part:"P1", isCorrect:false, answeredAt:"2026-09-22T01:00:00.000Z" }).ok);
assert.ok(store.completeSession({ sessionId:started.value.sessionId, questionCount:1, correctCount:0, questionIds:["G5-R-P1-0002"], wrongQuestionIds:["G5-R-P1-0002"] }).ok);
const snapshot = store.getSnapshot();
assert.equal(snapshot.sessions[0].mode, "weakness");
assert.deepEqual([snapshot.questionStats["G5-R-P1-0002"].attempts, snapshot.questionStats["G5-R-P1-0002"].wrongCount], [1, 1]);
assert.equal(summary.summarize(snapshot).recentSessions[0].mode, "weakness");
assert.equal(JSON.parse(storage.getItem(progress.KEY)).version, 2);
console.log("PASS: weakness-practice tests completed");
