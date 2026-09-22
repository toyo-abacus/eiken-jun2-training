"use strict";
const assert = require("assert");
const summary = require("../js/core/progress-summary.js");
function iso(year, month, day, hour) { return new Date(year, month - 1, day, hour || 0, 0, 0).toISOString(); }
function completed(id, completedAt, correct, count, gradeId, skill, part) { return { sessionId:id, status:"completed", completedAt, questionCount:count, correctCount:correct, wrongCount:count-correct, accuracy:Math.round(correct/count*100), gradeId:gradeId || "g5", skill:skill || "reading", part:part || "P1" }; }
const now = new Date(2026, 8, 22, 12, 0, 0);
let result = summary.summarize({questionStats:{},sessions:[]},{now}); assert.equal(result.hasRecords,false); assert.equal(result.today.accuracy,null); assert.equal(result.total.accuracy,null);
const todayA = completed("today-a",iso(2026,9,22,9),3,5), todayB = completed("today-b",iso(2026,9,22,15),5,5), yesterday = completed("yesterday",iso(2026,9,21,15),4,5), unfinished = {sessionId:"unfinished",status:"in-progress",startedAt:iso(2026,9,22,10),questionCount:5,correctCount:5};
const stats = {"G5-R-P1-0001":{attempts:4,correctCount:3,wrongCount:1},"G4-L-P2-0001":{attempts:2,correctCount:1,wrongCount:1}};
result = summary.summarize({questionStats:stats,sessions:[yesterday,todayA,unfinished,todayB]},{now});
assert.deepEqual([result.today.sessionCount,result.today.questionCount,result.today.correctCount,result.today.wrongCount,result.today.accuracy],[2,10,8,2,80]);
assert.equal(result.recentSessions.length,3); assert.equal(result.recentSessions[0].sessionId,"today-b"); assert.deepEqual([result.total.questionCount,result.total.attempts,result.total.correctCount,result.total.wrongCount,result.total.accuracy],[2,6,4,2,67]);
assert.equal(summary.localDayKey(iso(2026,9,22,0)),summary.localDayKey(now)); assert.equal(summary.isCompletedSession(unfinished),false);
const many = Array.from({length:200},(_, i) => completed("s"+i,iso(2026,9,22,i%24),1,1)); assert.equal(summary.summarize({questionStats:stats,sessions:many},{now}).recentSessions.length,10);
const labels = summary.createLabelResolver({grades:[{gradeId:"g5",displayName:"5級"},{gradeId:"g4",displayName:"4級"}]},{g5:{contentRoutes:[{skill:"reading",part:"P1",displayName:"第1部"}]}});
assert.equal(labels.grade("g5"),"英検5級"); assert.equal(labels.grade("g4"),"英検4級"); assert.equal(labels.skill("listening"),"リスニング"); assert.equal(labels.part("g5","reading","P1"),"第1部"); assert.equal(labels.part("g4","listening","P2"),"第2部");
console.log("PASS: progress-summary tests completed");
