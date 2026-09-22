"use strict";
const assert = require("assert");
require("../js/core/review-selector.js");
require("../js/core/weakness-selector.js");
const recommendation = require("../js/core/recommendation-selector.js");

const questions = [
  {id:"G5-R-P1-0001",grade:"g5",skill:"reading",part:"P1"}, {id:"G5-R-P1-0002",grade:"g5",skill:"reading",part:"P1"},
  {id:"G5-R-P1-0003",grade:"g5",skill:"reading",part:"P1"}, {id:"G5-R-P2-0001",grade:"g5",skill:"reading",part:"P2"},
  {id:"G4-L-P1-0001",grade:"g4",skill:"listening",part:"P1"}
];
const filter = {gradeId:"g5",skill:"reading",part:"P1"};
function stat(overrides) { return Object.assign({gradeId:"g5",skill:"reading",part:"P1",attempts:3,correctCount:1,wrongCount:2,currentStreak:0,lastAttemptAt:"2026-09-22T04:00:00.000Z",lastWrongAt:"2026-09-22T04:00:00.000Z",lastCorrectAt:"2026-09-22T03:00:00.000Z"}, overrides || {}); }
function select(stats, selectedFilter) { return recommendation.selectRecommendedPractice(stats, questions, selectedFilter || filter); }

let value = select({"G5-R-P1-0001":stat(), "G5-R-P1-0002":stat({currentStreak:1}), "G5-R-P1-0003":stat({currentStreak:1})});
assert.deepEqual(value, {mode:"review",targetCount:3,reason:"wrong_answers",questionIds:["G5-R-P1-0001","G5-R-P1-0002","G5-R-P1-0003"]}); // 1
value = select({"G5-R-P1-0001":stat({currentStreak:2}), "G5-R-P1-0002":stat({currentStreak:3})});
assert.equal(value.mode,"weakness"); assert.equal(value.targetCount,1); assert.equal(value.reason,"weak_questions"); // 2
assert.equal(select({}).mode,"normal"); // 3
value = select({"G5-R-P1-0001":stat()}); assert.equal(value.mode,"review"); assert.equal(value.targetCount,1); // 4
value = select({"G5-R-P1-0001":stat({attempts:1,correctCount:0,wrongCount:1,currentStreak:0})}); assert.equal(value.mode,"review"); assert.equal(value.targetCount,1); // 5
value = select({"G5-R-P1-0001":stat({attempts:4,correctCount:2,wrongCount:2,currentStreak:2})}); assert.equal(value.mode,"weakness"); // 6
value = select({"G5-R-P1-0001":stat({attempts:5,correctCount:3,wrongCount:2,currentStreak:3})}); assert.equal(value.mode,"normal"); // 7
value = select({"OLD-ID":stat(), "G5-R-P1-0001":stat({attempts:3,correctCount:2,wrongCount:1,currentStreak:2})}); assert.equal(value.mode,"normal"); assert.equal(value.targetCount,0); // 8
value = select({"G5-R-P2-0001":stat({part:"P2"}), "G4-L-P1-0001":stat({gradeId:"g4",skill:"listening"})}); assert.equal(value.mode,"normal"); // 9
assert.equal(recommendation.selectRecommendedPractice(null, questions, filter).mode,"normal"); // 10
assert.doesNotThrow(() => recommendation.selectRecommendedPractice({"bad":{attempts:"x"}}, questions, filter)); // 11
const source = {"G5-R-P1-0001":stat()}; const before = JSON.stringify(source); select(source); assert.equal(JSON.stringify(source),before); // 12
console.log("PASS: recommendation-selector tests completed");
