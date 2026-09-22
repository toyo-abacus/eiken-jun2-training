"use strict";
const assert = require("assert");
const weakness = require("../js/core/weakness-selector.js");

function stat(overrides) {
  return Object.assign({gradeId:"g5",skill:"reading",part:"P1",attempts:2,correctCount:0,wrongCount:2,currentStreak:0,bestStreak:0,lastAttemptAt:"2026-09-22T04:00:00.000Z",lastWrongAt:"2026-09-22T04:00:00.000Z",lastCorrectAt:null}, overrides || {});
}
function selected(stats, filters) { return weakness.selectWeakQuestions(stats, filters).map((item) => item.questionId); }

assert.equal(weakness.isWeakQuestion(stat({attempts:1,correctCount:0,wrongCount:1})), false); // 1
assert.equal(weakness.isWeakQuestion(stat()), true); // 2
assert.equal(weakness.isWeakQuestion(stat({attempts:2,correctCount:1,wrongCount:1,currentStreak:1,lastCorrectAt:"2026-09-22T04:00:00.000Z"})), false); // 3
assert.equal(weakness.isWeakQuestion(stat({attempts:3,correctCount:1,wrongCount:2})), true); // 4 / 5
assert.equal(weakness.isWeakQuestion(stat({attempts:3,correctCount:2,wrongCount:1,currentStreak:1,lastCorrectAt:"2026-09-22T05:00:00.000Z"})), false); // 6
assert.equal(weakness.isWeakQuestion(stat({attempts:3,correctCount:2,wrongCount:1,currentStreak:0,lastWrongAt:"2026-09-22T05:00:00.000Z"})), true); // 7
assert.equal(weakness.isWeakQuestion(stat({attempts:6,correctCount:3,wrongCount:3,currentStreak:3,lastCorrectAt:"2026-09-22T06:00:00.000Z"})), false); // 8 / 9
assert.equal(weakness.isWeakQuestion(stat({attempts:7,correctCount:3,wrongCount:4,currentStreak:0,lastWrongAt:"2026-09-22T07:00:00.000Z"})), true); // 10

const mixed = {
  "G5-R-P1-0001": stat(),
  "G5-R-P2-0001": stat({part:"P2"}),
  "G4-L-P1-0001": stat({gradeId:"g4",skill:"listening"}),
  "G3-R-P1-0001": stat({gradeId:"g3",wrongCount:1,correctCount:2,attempts:3,currentStreak:1,lastCorrectAt:"2026-09-22T05:00:00.000Z"})
};
assert.deepEqual(selected(mixed, {gradeId:"g5"}), ["G5-R-P1-0001", "G5-R-P2-0001"]); // 11
assert.deepEqual(selected(mixed, {skill:"listening"}), ["G4-L-P1-0001"]); // 12 / 23
assert.deepEqual(selected(mixed, {part:"P2"}), ["G5-R-P2-0001"]); // 13
assert.deepEqual(selected(mixed, {gradeId:"g5",skill:"reading",part:"P1"}), ["G5-R-P1-0001"]); // 14

const scores = {
  "G5-R-P1-0002": stat({attempts:5,correctCount:1,wrongCount:4,currentStreak:0,lastWrongAt:"2026-09-22T06:00:00.000Z"}),
  "G5-R-P1-0003": stat({attempts:2,correctCount:0,wrongCount:2,currentStreak:0,lastWrongAt:"2026-09-22T05:00:00.000Z"}),
  "G5-R-P1-0001": stat({attempts:2,correctCount:0,wrongCount:2,currentStreak:0,lastWrongAt:"2026-09-22T05:00:00.000Z"})
};
const ranked = weakness.selectWeakQuestions(scores);
assert.equal(ranked[0].questionId, "G5-R-P1-0002"); // 15
assert.deepEqual(ranked.slice(1).map((item) => item.questionId), ["G5-R-P1-0001", "G5-R-P1-0003"]); // 16
assert.equal(ranked[0].weaknessScore, 30); // 3*4 + round(8) + 5 + 4 + 1

assert.equal(weakness.isWeakQuestion({}), false); // 17 / 18
assert.equal(weakness.isWeakQuestion(stat({lastWrongAt:"not-a-date",wrongCount:1,correctCount:2,attempts:3,currentStreak:0})), false); // 19
assert.deepEqual(weakness.selectWeakQuestions({}), []); // 20
assert.deepEqual(weakness.selectWeakQuestions(null), []); // 21
const original = JSON.stringify(mixed); weakness.selectWeakQuestions(mixed); assert.equal(JSON.stringify(mixed), original); // 24
assert.deepEqual(weakness.selectWeakQuestions(mixed), weakness.selectWeakQuestions(mixed)); // 25
console.log("PASS: weakness-selector tests completed");
