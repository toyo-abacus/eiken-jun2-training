/* 既存セットを変えず、5級リーディング第1部だけを新データで試験導入する。 */
(function () {
  "use strict";
  var DATA_URL = "data/g5/reading.json";
  var PROGRESS_KEY = "eikenTrainingProgress";
  var state = { active: false, index: 0, score: 0, questions: [], progress: null, warning: "" };

  function shuffle(items) {
    var result = items.slice();
    for (var i = result.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = result[i]; result[i] = result[j]; result[j] = temp;
    }
    return result;
  }
  function emptyProgress() { return { version: 2, questions: {} }; }
  function getProgress() {
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return { data: emptyProgress(), writable: true, warning: "" };
      var data = JSON.parse(raw);
      if (!data || data.version !== 2 || !data.questions || Array.isArray(data.questions)) throw new Error("invalid");
      return { data: data, writable: true, warning: "" };
    } catch (error) {
      return { data: emptyProgress(), writable: false, warning: "学習記録を読み込めませんでした。今回の記録は保存されません。" };
    }
  }
  function saveProgress() {
    if (!state.progress.writable) return;
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.progress.data)); }
    catch (error) {
      state.progress.writable = false;
      state.warning = "この端末では学習記録を保存できません。問題演習は続けられます。";
    }
  }
  function record(questionId, correct) {
    var records = state.progress.data.questions;
    var item = records[questionId] || { attempts: 0, correctCount: 0, wrongCount: 0, currentStreak: 0, lastAttemptAt: null, lastCorrectAt: null, lastWrongAt: null };
    var now = new Date().toISOString();
    item.attempts += 1; item.lastAttemptAt = now;
    if (correct) { item.correctCount += 1; item.currentStreak += 1; item.lastCorrectAt = now; }
    else { item.wrongCount += 1; item.currentStreak = 0; item.lastWrongAt = now; }
    records[questionId] = item;
    saveProgress();
  }
  function text(id, value) { var el = document.getElementById(id); if (el) el.textContent = value; }
  function options() { var el = document.getElementById("g5rOptions"); if (el) el.innerHTML = ""; return el; }
  function feedback(value) { var el = document.getElementById("g5rEx"); if (el) { el.className = "ex show"; el.textContent = value; } }

  function render() {
    var question = state.questions[state.index];
    var next = document.getElementById("g5rNext");
    if (!question) {
      text("g5rTitle", "第1部（新データ）完了");
      text("g5rScore", "正解 " + state.score + " / " + state.questions.length);
      text("g5rQuestion", "おつかれさまでした！"); options(); feedback(state.warning || "第1部の既存問題を新しい固定IDで練習しました。");
      if (next) next.style.display = "none";
      return;
    }
    question.displayChoices = shuffle(question.choices);
    text("g5rTitle", "第1部（新データ） " + (state.index + 1) + " / " + state.questions.length);
    text("g5rScore", "正解 " + state.score);
    document.getElementById("g5rBar").style.width = (state.index / state.questions.length * 100) + "%";
    text("g5rQuestion", question.prompt); feedback(state.warning);
    if (next) { next.style.display = "none"; next.textContent = state.index === state.questions.length - 1 ? "結果を見る" : "次の問題"; }
    var container = options();
    question.displayChoices.forEach(function (choice) {
      var button = document.createElement("button");
      button.className = "option"; button.type = "button"; button.textContent = choice.text;
      button.addEventListener("click", function () { answer(question, choice.id); });
      container.appendChild(button);
    });
  }
  function answer(question, selectedId) {
    var correct = selectedId === question.correctChoiceId;
    document.querySelectorAll("#g5rOptions .option").forEach(function (button) {
      button.disabled = true;
      var choice = question.displayChoices.find(function (item) { return item.text === button.textContent; });
      if (choice && choice.id === question.correctChoiceId) button.classList.add("correct");
      if (choice && choice.id === selectedId && !correct) button.classList.add("wrong");
    });
    if (correct) state.score += 1;
    record(question.id, correct);
    if (!correct && typeof window.saveG5Wrong === "function") {
      try {
        window.saveG5Wrong({ id: question.id, part: "リーディング", type: "reading", question: question.prompt, options: question.choices.map(function (c) { return c.text; }), correctIndex: question.choices.findIndex(function (c) { return c.id === question.correctChoiceId; }), explanation: question.explanation || "" }, question.displayChoices.findIndex(function (c) { return c.id === selectedId; }));
      } catch (error) { state.warning = "間違い問題を保存できませんでした。問題演習は続けられます。"; }
    }
    var answer = question.choices.find(function (c) { return c.id === question.correctChoiceId; });
    feedback((correct ? "正解！" : "不正解。正解は「" + answer.text + "」です。") + (question.explanation ? " " + question.explanation : "") + (state.warning ? " " + state.warning : ""));
    text("g5rScore", "正解 " + state.score);
    document.getElementById("g5rNext").style.display = "block";
  }
  function next() { state.index += 1; render(); }
  window.g5P1PilotDeactivate = function () { state.active = false; };
  window.nextG5ReadingDispatcher = function () { if (state.active) next(); else if (window.nextG5Reading) window.nextG5Reading(); };
  window.startG5ReadingP1 = function () {
    state.active = false; text("g5rTitle", "第1部（新データ）を読み込み中…"); text("g5rQuestion", "問題データを読み込んでいます。"); options(); feedback("");
    window.openSec("g5reading");
    fetch(DATA_URL).then(function (response) { if (!response.ok) throw new Error("load failed"); return response.json(); }).then(function (payload) {
      var questions = Array.isArray(payload.questions) ? payload.questions.filter(function (q) { return q.grade === "g5" && q.skill === "reading" && q.part === "P1"; }) : [];
      if (!questions.length) throw new Error("no questions");
      state.questions = shuffle(questions); state.index = 0; state.score = 0; state.progress = getProgress(); state.warning = state.progress.warning; state.active = true; render();
    }).catch(function () {
      text("g5rTitle", "第1部（新データ）"); text("g5rQuestion", "問題データを読み込めませんでした。"); feedback("通信状態を確認して、もう一度お試しください。既存のリーディング練習は引き続き使えます。");
    });
  };
}());
