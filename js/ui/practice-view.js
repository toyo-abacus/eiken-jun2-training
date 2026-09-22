/* Shared Practice UI. The development entry below is the only caller that permits disabled content. */
(function (root) {
  "use strict";
  var state = { session: null, request: null };
  function element(id) { return document.getElementById(id); }
  function setText(id, value) { var target = element(id); if (target) target.textContent = value; }
  function reset() {
    element("sharedPracticeOptions").innerHTML = "";
    element("sharedPracticeFeedback").className = "ex";
    element("sharedPracticeNext").style.display = "none";
    element("sharedPracticeResult").style.display = "none";
  }
  function showError(result) {
    setText("sharedPracticeTitle", "問題を読み込めませんでした");
    setText("sharedPracticeQuestion", "通信状態または開発用データの設定を確認してください。");
    setText("sharedPracticeDebug", "開発情報: " + (result.code || "unknown-error"));
    element("sharedPracticeFeedback").className = "ex show";
    element("sharedPracticeFeedback").textContent = "既存の5級リーディング練習はそのまま使えます。";
  }
  function render() {
    var item = state.session.getCurrent(), progress = state.session.getState();
    if (!item) return showResult();
    reset();
    setText("sharedPracticeTitle", state.request.gradeId.toUpperCase() + " / " + state.request.skill + " / " + state.request.part + "（試験版）");
    setText("sharedPracticeCount", (progress.index + 1) + " / " + progress.total);
    setText("sharedPracticeScore", "正解 " + progress.score);
    element("sharedPracticeBar").style.width = (progress.index / progress.total * 100) + "%";
    setText("sharedPracticeQuestion", item.question.prompt || "");
    setText("sharedPracticeDebug", "固定ID: " + item.question.id);
    var container = element("sharedPracticeOptions");
    item.displayChoices.forEach(function (choice, index) {
      var button = document.createElement("button");
      button.className = "option"; button.type = "button";
      button.textContent = String.fromCharCode(65 + index) + "　" + choice.text;
      button.addEventListener("click", function () { answer(choice.id); });
      container.appendChild(button);
    });
  }
  function answer(choiceId) {
    var result = state.session.answer(choiceId);
    if (!result.ok) return;
    var item = state.session.getCurrent(), correctText = "";
    document.querySelectorAll("#sharedPracticeOptions .option").forEach(function (button) { button.disabled = true; });
    item.displayChoices.forEach(function (choice, index) {
      var button = element("sharedPracticeOptions").children[index];
      if (choice.id === result.correctChoiceId) { button.classList.add("correct"); correctText = choice.text; }
      if (choice.id === result.selectedChoiceId && !result.correct) button.classList.add("wrong");
    });
    var message = result.correct ? "正解！" : "不正解。正解は「" + correctText + "」です。";
    if (result.question.explanation) message += " " + result.question.explanation;
    element("sharedPracticeFeedback").textContent = message;
    element("sharedPracticeFeedback").className = "ex show";
    setText("sharedPracticeScore", "正解 " + state.session.getState().score);
    var next = element("sharedPracticeNext"); next.textContent = state.session.getState().index === state.session.getState().total - 1 ? "結果を見る" : "次へ"; next.style.display = "block";
  }
  function showResult() {
    var progress = state.session.getState(), percent = progress.total ? Math.round(progress.score / progress.total * 100) : 0;
    element("sharedPracticeOptions").innerHTML = "";
    setText("sharedPracticeQuestion", "終了しました。おつかれさまでした！");
    element("sharedPracticeFeedback").className = "ex";
    element("sharedPracticeNext").style.display = "none";
    setText("sharedPracticeFinal", progress.score + " / " + progress.total + " 問正解（" + percent + "%）");
    element("sharedPracticeResult").style.display = "block";
  }
  function next() { if (!state.session) return; var result = state.session.next(); if (result.ok) { if (result.complete) showResult(); else render(); } }
  async function start(request, development) {
    state.session = null; state.request = request; reset();
    root.openSec("sharedPractice");
    setText("sharedPracticeTitle", "共通エンジン試験版を読み込み中…"); setText("sharedPracticeCount", ""); setText("sharedPracticeScore", ""); setText("sharedPracticeQuestion", "問題データを読み込んでいます。"); setText("sharedPracticeDebug", "");
    var result = await root.EikenPracticeEngine.loadSession(request, { allowDisabled: development === true });
    if (!result.ok) return showError(result);
    state.session = result.session; render();
  }
  root.startSharedPractice = start;
  root.startSharedPracticeG5ReadingP1 = function () { return start({ gradeId: "G5", skill: "reading", part: "P1" }, true); };
  root.nextSharedPractice = next;
}(window));
