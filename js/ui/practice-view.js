/* Shared Practice UI. The development entry below is the only caller that permits disabled content. */
(function (root) {
  "use strict";
  var state = { session: null, request: null, progress: null, progressWarning: "" };
  var launcher = { gradeId: null, development: false, data: null, skill: null, route: null, questionLimit: null };
  function element(id) { return document.getElementById(id); }
  function setText(id, value) { var target = element(id); if (target) target.textContent = value; }
  function skillLabel(skill) {
    var labels = { reading: "リーディング", listening: "リスニング", writing: "ライティング", speaking: "スピーキング", vocabulary: "語彙・熟語" };
    return labels[skill] || skill;
  }
  function reset() {
    element("sharedPracticeOptions").innerHTML = "";
    element("sharedPracticeFeedback").className = "ex";
    element("sharedPracticeNext").style.display = "none";
    element("sharedPracticeResult").style.display = "none";
    setText("sharedPracticeStorageWarning", "");
  }
  function setProgressWarning(value) {
    state.progressWarning = value || "";
    setText("sharedPracticeStorageWarning", state.progressWarning);
  }
  function noteStorageResult(result) {
    if (!result || result.saved === true) return;
    setProgressWarning("学習記録を保存できませんでした。練習はそのまま続けられます。");
  }
  function beginProgress(result) {
    state.progress = null;
    if (!root.EikenProgressStore || !result || !result.session) return;
    try {
      var store = root.EikenProgressStore.createProgressStore();
      var session = result.session;
      var started = store.startSession({
        gradeId: result.gradeId, skill: result.skill, part: result.part, mode: "practice",
        questionCount: session.getState().total, questionIds: session.getQuestionIds()
      });
      if (!started.ok) { noteStorageResult(started); return; }
      state.progress = { store: store, sessionId: started.value.sessionId, gradeId: result.gradeId, skill: result.skill, part: result.part, questionIds: session.getQuestionIds(), wrongQuestionIds: [], completed: false };
      noteStorageResult(started);
    } catch (error) { setProgressWarning("学習記録を保存できませんでした。練習はそのまま続けられます。"); }
  }
  function recordProgressAnswer(question, isCorrect) {
    if (!state.progress) return;
    try {
      var saved = state.progress.store.recordAnswer({ questionId: question.id, gradeId: state.progress.gradeId, skill: state.progress.skill, part: state.progress.part, isCorrect: isCorrect });
      if (!isCorrect && state.progress.wrongQuestionIds.indexOf(question.id) === -1) state.progress.wrongQuestionIds.push(question.id);
      noteStorageResult(saved);
    } catch (error) { setProgressWarning("学習記録を保存できませんでした。練習はそのまま続けられます。"); }
  }
  function completeProgressSession() {
    if (!state.progress || state.progress.completed) return;
    state.progress.completed = true;
    try {
      var progress = state.session.getState();
      var saved = state.progress.store.completeSession({
        sessionId: state.progress.sessionId, questionCount: progress.total, correctCount: progress.score,
        questionIds: state.progress.questionIds, wrongQuestionIds: state.progress.wrongQuestionIds
      });
      noteStorageResult(saved);
    } catch (error) { setProgressWarning("学習記録を保存できませんでした。練習はそのまま続けられます。"); }
  }
  function showError(result) {
    setText("sharedPracticeTitle", "問題を読み込めませんでした");
    setText("sharedPracticeQuestion", "通信状態または開発用データの設定を確認してください。");
    setText("sharedPracticeDebug", "開発情報: " + (result.code || "unknown-error"));
    element("sharedPracticeFeedback").className = "ex show";
    element("sharedPracticeFeedback").textContent = "既存の5級リーディング練習はそのまま使えます。";
  }
  function clearLauncherOptions() {
    element("sharedLauncherSkills").innerHTML = "";
    element("sharedLauncherParts").innerHTML = "";
    element("sharedLauncherCounts").innerHTML = "";
    element("sharedLauncherStart").disabled = true;
  }
  function launcherButton(text, active, onClick) {
    var button = document.createElement("button");
    button.className = "option";
    button.type = "button";
    button.textContent = text;
    if (active) button.style.background = "#315a9b";
    button.addEventListener("click", onClick);
    return button;
  }
  function renderLauncher() {
    var routes = launcher.data.routes;
    var skills = routes.map(function (route) { return route.skill; }).filter(function (skill, index, list) { return list.indexOf(skill) === index; });
    setText("sharedLauncherTitle", (launcher.data.grade.label || launcher.gradeId.toUpperCase()) + "：練習内容を選ぶ");
    var skillContainer = element("sharedLauncherSkills");
    skillContainer.innerHTML = "";
    skills.forEach(function (skill) {
      skillContainer.appendChild(launcherButton(skillLabel(skill), launcher.skill === skill, function () {
        launcher.skill = skill; launcher.route = null; launcher.questionLimit = null; renderLauncher();
      }));
    });
    var partContainer = element("sharedLauncherParts");
    partContainer.innerHTML = "";
    var countContainer = element("sharedLauncherCounts");
    countContainer.innerHTML = "";
    var start = element("sharedLauncherStart");
    start.disabled = true;
    if (!launcher.skill) { setText("sharedLauncherMessage", "まず技能を選んでください。"); return; }
    var parts = routes.filter(function (route) { return route.skill === launcher.skill; });
    parts.forEach(function (route) {
      var label = route.displayName + (route.description ? "：" + route.description : "") + "（" + route.questionCount + "問）";
      partContainer.appendChild(launcherButton(label, launcher.route && launcher.route.part === route.part, function () {
        launcher.route = route; launcher.questionLimit = null; renderLauncher();
      }));
    });
    if (!launcher.route) { setText("sharedLauncherMessage", "次にPartを選んでください。"); return; }
    root.EikenPracticeEngine.getQuestionLimitOptions(launcher.route.questionCount).forEach(function (option) {
      countContainer.appendChild(launcherButton(option.label, launcher.questionLimit === option.value, function () {
        launcher.questionLimit = option.value; renderLauncher();
      }));
    });
    if (!launcher.questionLimit) { setText("sharedLauncherMessage", "問題数を選んでください。"); return; }
    setText("sharedLauncherMessage", skillLabel(launcher.route.skill) + "・" + launcher.route.displayName + "を" + launcher.questionLimit + "問練習します。学習記録はこの端末に保存されます。");
    start.disabled = false;
  }
  function showLauncherError(result) {
    clearLauncherOptions();
    setText("sharedLauncherTitle", "練習内容を読み込めませんでした");
    setText("sharedLauncherMessage", "通信状態または開発用データの設定を確認してください。（開発情報: " + (result.code || "unknown-error") + "）");
  }
  async function openLauncher(request, development) {
    launcher = { gradeId: request.gradeId, development: development === true, data: null, skill: null, route: null, questionLimit: null };
    root.openSec("sharedPracticeLauncher");
    clearLauncherOptions();
    setText("sharedLauncherTitle", "練習内容を読み込み中…");
    setText("sharedLauncherMessage", "利用可能な技能・Partを確認しています。");
    var result = await root.EikenPracticeEngine.discoverPracticeRoutes(request.gradeId, { allowDisabled: launcher.development });
    if (!result.ok) return showLauncherError(result);
    launcher.data = result;
    renderLauncher();
  }
  function render() {
    var item = state.session.getCurrent(), progress = state.session.getState();
    if (!item) return showResult();
    reset();
    if (state.progressWarning) setText("sharedPracticeStorageWarning", state.progressWarning);
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
    recordProgressAnswer(item.question, result.correct);
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
    completeProgressSession();
    var progress = state.session.getState(), percent = progress.total ? Math.round(progress.score / progress.total * 100) : 0;
    element("sharedPracticeOptions").innerHTML = "";
    setText("sharedPracticeQuestion", "終了しました。おつかれさまでした！");
    element("sharedPracticeFeedback").className = "ex";
    element("sharedPracticeNext").style.display = "none";
    setText("sharedPracticeFinal", progress.score + " / " + progress.total + " 問正解（" + percent + "%）");
    if (state.progressWarning) setText("sharedPracticeStorageWarning", state.progressWarning);
    element("sharedPracticeResult").style.display = "block";
  }
  function next() { if (!state.session) return; var result = state.session.next(); if (result.ok) { if (result.complete) showResult(); else render(); } }
  async function start(request, development, questionLimit) {
    state.session = null; state.request = request; state.progress = null; state.progressWarning = ""; reset();
    root.openSec("sharedPractice");
    setText("sharedPracticeTitle", "共通エンジン試験版を読み込み中…"); setText("sharedPracticeCount", ""); setText("sharedPracticeScore", ""); setText("sharedPracticeQuestion", "問題データを読み込んでいます。"); setText("sharedPracticeDebug", "");
    var result = await root.EikenPracticeEngine.loadSession(request, { allowDisabled: development === true, questionLimit: questionLimit });
    if (!result.ok) return showError(result);
    state.session = result.session; beginProgress(result); render();
  }
  root.startSharedPractice = start;
  root.startSharedPracticeG5ReadingP1 = function () { return start({ gradeId: "G5", skill: "reading", part: "P1" }, true); };
  root.startSharedPracticeLauncherG5 = function () { return openLauncher({ gradeId: "G5" }, true); };
  root.startSharedPracticeFromLauncher = function () {
    if (!launcher.route || !launcher.questionLimit) return;
    return start({ gradeId: launcher.gradeId, skill: launcher.route.skill, part: launcher.route.part }, launcher.development, launcher.questionLimit);
  };
  root.backToSharedPracticeLauncher = function () {
    if (!launcher.data) return root.openSec("g5menu");
    root.openSec("sharedPracticeLauncher");
    renderLauncher();
  };
  root.nextSharedPractice = next;
}(window));
