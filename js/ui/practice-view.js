/* Shared Practice UI. The development entry below is the only caller that permits disabled content. */
(function (root) {
  "use strict";
  var state = { session: null, request: null, progress: null, progressWarning: "", mode: "practice", masteredQuestionIds: [] };
  var launcher = { gradeId: null, development: false, data: null, skill: null, route: null, mode: null, questionLimit: null, reviewQuestionIds: null, reviewError: "", weaknessQuestions: null, weaknessError: "" };
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
    setText("sharedPracticeReviewResult", "");
  }
  function setProgressWarning(value) {
    state.progressWarning = value || "";
    setText("sharedPracticeStorageWarning", state.progressWarning);
  }
  function noteStorageResult(result) {
    if (!result || result.saved === true) return;
    setProgressWarning("学習記録を保存できませんでした。練習はそのまま続けられます。");
  }
  function beginProgress(result, mode) {
    state.progress = null;
    if (!root.EikenProgressStore || !result || !result.session) return;
    try {
      var store = root.EikenProgressStore.createProgressStore();
      var session = result.session;
      var started = store.startSession({
        gradeId: result.gradeId, skill: result.skill, part: result.part, mode: mode || "practice",
        questionCount: session.getState().total, questionIds: session.getQuestionIds()
      });
      if (!started.ok) { noteStorageResult(started); return; }
      state.progress = { store: store, sessionId: started.value.sessionId, gradeId: result.gradeId, skill: result.skill, part: result.part, questionIds: session.getQuestionIds(), wrongQuestionIds: [], completed: false, mode: mode || "practice" };
      noteStorageResult(started);
    } catch (error) { setProgressWarning("学習記録を保存できませんでした。練習はそのまま続けられます。"); }
  }
  function recordProgressAnswer(question, isCorrect) {
    if (!state.progress) return;
    try {
      var before = state.progress.store.getSnapshot().questionStats[question.id];
      var wasReviewTarget = root.EikenReviewSelector && root.EikenReviewSelector.isReviewTarget(before);
      var saved = state.progress.store.recordAnswer({ questionId: question.id, gradeId: state.progress.gradeId, skill: state.progress.skill, part: state.progress.part, isCorrect: isCorrect });
      if (!isCorrect && state.progress.wrongQuestionIds.indexOf(question.id) === -1) state.progress.wrongQuestionIds.push(question.id);
      var after = state.progress.store.getSnapshot().questionStats[question.id];
      if (isCorrect && wasReviewTarget && root.EikenReviewSelector && !root.EikenReviewSelector.isReviewTarget(after) && state.masteredQuestionIds.indexOf(question.id) === -1) state.masteredQuestionIds.push(question.id);
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
    element("sharedLauncherModes").innerHTML = "";
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
        launcher.skill = skill; launcher.route = null; launcher.mode = null; launcher.questionLimit = null; launcher.reviewQuestionIds = null; launcher.reviewError = ""; launcher.weaknessQuestions = null; launcher.weaknessError = ""; renderLauncher();
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
        launcher.route = route; launcher.mode = null; launcher.questionLimit = null; launcher.reviewQuestionIds = null; launcher.reviewError = ""; launcher.weaknessQuestions = null; launcher.weaknessError = ""; renderLauncher();
      }));
    });
    if (!launcher.route) { setText("sharedLauncherMessage", "次にPartを選んでください。"); return; }
    var modeContainer = element("sharedLauncherModes");
    modeContainer.innerHTML = "";
    modeContainer.appendChild(launcherButton("通常練習", launcher.mode === "practice", function () { launcher.mode = "practice"; launcher.questionLimit = null; renderLauncher(); }));
    modeContainer.appendChild(launcherButton("🔴 間違えた問題", launcher.mode === "review", function () { selectReviewMode(); }));
    modeContainer.appendChild(launcherButton("🟠 弱点練習", launcher.mode === "weakness", function () { selectWeaknessMode(); }));
    if (!launcher.mode) { setText("sharedLauncherMessage", "練習方法を選んでください。"); return; }
    if (launcher.mode === "review" && launcher.reviewQuestionIds === null) { setText("sharedLauncherMessage", "復習する問題を確認しています。"); return; }
    if (launcher.mode === "review" && launcher.reviewError) { setText("sharedLauncherMessage", launcher.reviewError); return; }
    if (launcher.mode === "weakness" && launcher.weaknessQuestions === null) { setText("sharedLauncherMessage", "弱点問題を確認しています。"); return; }
    if (launcher.mode === "weakness" && launcher.weaknessError) { setText("sharedLauncherMessage", launcher.weaknessError); return; }
    var availableCount = launcher.mode === "review" ? launcher.reviewQuestionIds.length : launcher.mode === "weakness" ? launcher.weaknessQuestions.length : launcher.route.questionCount;
    if (launcher.mode === "review" && availableCount === 0) { setText("sharedLauncherMessage", "現在、復習する問題はありません 🎉 通常練習を選べます。"); return; }
    if (launcher.mode === "weakness" && availableCount === 0) { setText("sharedLauncherMessage", "現在、弱点練習の対象はありません 🎉 通常練習を選べます。"); return; }
    root.EikenPracticeEngine.getQuestionLimitOptions(availableCount).forEach(function (option) {
      countContainer.appendChild(launcherButton(option.label, launcher.questionLimit === option.value, function () {
        launcher.questionLimit = option.value; renderLauncher();
      }));
    });
    if (!launcher.questionLimit) { setText("sharedLauncherMessage", "問題数を選んでください。"); return; }
    setText("sharedLauncherMessage", skillLabel(launcher.route.skill) + "・" + launcher.route.displayName + "を" + launcher.questionLimit + "問" + (launcher.mode === "review" ? "復習" : launcher.mode === "weakness" ? "弱点練習" : "練習") + "します。学習記録はこの端末に保存されます。");
    start.disabled = false;
  }
  async function selectReviewMode() {
    launcher.mode = "review"; launcher.questionLimit = null; launcher.reviewQuestionIds = null; launcher.reviewError = ""; renderLauncher();
    if (!root.EikenProgressStore || !root.EikenReviewSelector || !root.EikenDataLoader) { launcher.reviewQuestionIds = []; launcher.reviewError = "復習する問題を確認できませんでした。通常練習は利用できます。"; return renderLauncher(); }
    var store = root.EikenProgressStore.createProgressStore(), loaded = store.load();
    if (!loaded.ok) { launcher.reviewQuestionIds = []; launcher.reviewError = "学習記録を読み込めないため、復習する問題を確認できませんでした。"; return renderLauncher(); }
    var questions = await root.EikenDataLoader.loadQuestions({ gradeId: launcher.gradeId, skill: launcher.route.skill, part: launcher.route.part }, { allowDisabled: launcher.development });
    if (!questions.ok) { launcher.reviewQuestionIds = []; launcher.reviewError = "復習する問題を読み込めませんでした。通常練習は利用できます。"; return renderLauncher(); }
    launcher.reviewQuestionIds = root.EikenReviewSelector.select(store.getSnapshot().questionStats, questions.questions, { gradeId: questions.gradeId, skill: questions.skill, part: questions.part }).questionIds;
    renderLauncher();
  }
  async function selectWeaknessMode() {
    launcher.mode = "weakness"; launcher.questionLimit = null; launcher.weaknessQuestions = null; launcher.weaknessError = ""; renderLauncher();
    if (!root.EikenProgressStore || !root.EikenWeaknessSelector || !root.EikenDataLoader) { launcher.weaknessQuestions = []; launcher.weaknessError = "弱点問題を確認できませんでした。通常練習は利用できます。"; return renderLauncher(); }
    var store = root.EikenProgressStore.createProgressStore(), loaded = store.load();
    if (!loaded.ok) { launcher.weaknessQuestions = []; launcher.weaknessError = "学習記録を読み込めないため、弱点問題を確認できませんでした。"; return renderLauncher(); }
    var questions = await root.EikenDataLoader.loadQuestions({ gradeId: launcher.gradeId, skill: launcher.route.skill, part: launcher.route.part }, { allowDisabled: launcher.development });
    if (!questions.ok) { launcher.weaknessQuestions = []; launcher.weaknessError = "弱点問題を読み込めませんでした。通常練習は利用できます。"; return renderLauncher(); }
    var availableIds = {};
    questions.questions.forEach(function (question) { availableIds[question.id] = true; });
    launcher.weaknessQuestions = root.EikenWeaknessSelector.selectWeakQuestions(store.getSnapshot().questionStats, { gradeId: questions.gradeId, skill: questions.skill, part: questions.part }).filter(function (item) { return availableIds[item.questionId] === true; });
    renderLauncher();
  }
  function showLauncherError(result) {
    clearLauncherOptions();
    setText("sharedLauncherTitle", "練習内容を読み込めませんでした");
    setText("sharedLauncherMessage", "通信状態または開発用データの設定を確認してください。（開発情報: " + (result.code || "unknown-error") + "）");
  }
  async function openLauncher(request, development) {
    launcher = { gradeId: request.gradeId, development: development === true, data: null, skill: null, route: null, mode: null, questionLimit: null, reviewQuestionIds: null, reviewError: "", weaknessQuestions: null, weaknessError: "" };
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
    if (state.mode === "review" && state.masteredQuestionIds.length) setText("sharedPracticeReviewResult", "今回 " + state.masteredQuestionIds.length + "問を克服しました！");
    if (state.progressWarning) setText("sharedPracticeStorageWarning", state.progressWarning);
    setText("sharedPracticeResultStorageStatus", state.progress && state.progress.completed && !state.progressWarning ? "今回の学習記録をこの端末に保存しました。" : "");
    element("sharedPracticeResult").style.display = "block";
  }
  function next() { if (!state.session) return; var result = state.session.next(); if (result.ok) { if (result.complete) showResult(); else render(); } }
  async function start(request, development, questionLimit, mode, questionIds) {
    state.session = null; state.request = request; state.progress = null; state.progressWarning = ""; state.mode = mode || "practice"; state.masteredQuestionIds = []; reset();
    root.openSec("sharedPractice");
    setText("sharedPracticeTitle", "共通エンジン試験版を読み込み中…"); setText("sharedPracticeCount", ""); setText("sharedPracticeScore", ""); setText("sharedPracticeQuestion", "問題データを読み込んでいます。"); setText("sharedPracticeDebug", "");
    var result = await root.EikenPracticeEngine.loadSession(request, { allowDisabled: development === true, questionLimit: questionLimit, questionIds: questionIds });
    if (!result.ok) return showError(result);
    state.session = result.session; beginProgress(result, state.mode); render();
  }
  root.startSharedPractice = start;
  root.startSharedPracticeG5ReadingP1 = function () { return start({ gradeId: "G5", skill: "reading", part: "P1" }, true); };
  root.startSharedPracticeLauncherG5 = function () { return openLauncher({ gradeId: "G5" }, true); };
  root.startSharedPracticeFromLauncher = function () {
    if (!launcher.route || !launcher.questionLimit) return;
    var questionIds = launcher.mode === "review" ? launcher.reviewQuestionIds : launcher.mode === "weakness" ? root.EikenWeaknessSelector.weightedSample(launcher.weaknessQuestions, launcher.questionLimit) : null;
    return start({ gradeId: launcher.gradeId, skill: launcher.route.skill, part: launcher.route.part }, launcher.development, launcher.questionLimit, launcher.mode, questionIds);
  };
  root.backToSharedPracticeLauncher = function () {
    if (!launcher.data) return root.openSec("g5menu");
    root.openSec("sharedPracticeLauncher");
    renderLauncher();
  };
  root.nextSharedPractice = next;
}(window));
