/* Read-only learning-record screen for the shared Practice pilot. */
(function (root) {
  "use strict";
  function element(id) { return document.getElementById(id); }
  function setText(id, value) { var target = element(id); if (target) target.textContent = value; }
  function clear() {
    setText("sharedProgressMessage", "");
    element("sharedProgressSummary").innerHTML = "";
    element("sharedProgressRecent").innerHTML = "";
  }
  function line(label, value) {
    var item = document.createElement("div"), key = document.createElement("span"), number = document.createElement("b");
    key.textContent = label; number.textContent = value; item.appendChild(key); item.appendChild(number); return item;
  }
  function card(title, rows) {
    var box = document.createElement("div"), heading = document.createElement("h3"), grid = document.createElement("div");
    box.className = "summary-card"; heading.textContent = title; grid.className = "summary-grid";
    rows.forEach(function (row) { grid.appendChild(line(row[0], row[1])); });
    box.appendChild(heading); box.appendChild(grid); return box;
  }
  function formatDate(value) {
    var date = new Date(value);
    return Number.isNaN(date.getTime()) ? "日時不明" : date.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  async function loadLabels(snapshot) {
    var fallback = root.EikenProgressSummary.createLabelResolver(null, {});
    if (!root.EikenDataLoader) return fallback;
    var catalogResult = await root.EikenDataLoader.loadCatalog();
    if (!catalogResult.ok) return fallback;
    var ids = {};
    (snapshot.sessions || []).forEach(function (session) { if (session && session.gradeId) ids[String(session.gradeId).toLowerCase()] = true; });
    Object.keys(snapshot.questionStats || {}).forEach(function (id) { var stat = snapshot.questionStats[id]; if (stat && stat.gradeId) ids[String(stat.gradeId).toLowerCase()] = true; });
    var manifests = {};
    await Promise.all(Object.keys(ids).map(async function (gradeId) {
      var grade = root.EikenDataLoader.getGrade(catalogResult.value, gradeId);
      if (!grade || !grade.manifest) return;
      var result = await root.EikenDataLoader.fetchJson(grade.manifest);
      if (result.ok) manifests[gradeId] = result.value;
    }));
    return root.EikenProgressSummary.createLabelResolver(catalogResult.value, manifests);
  }
  function showEmpty() {
    setText("sharedProgressMessage", "まだ学習記録がありません。問題を練習すると、ここに記録されます。");
  }
  function renderRecent(sessions, labels) {
    var container = element("sharedProgressRecent");
    if (!sessions.length) return;
    var heading = document.createElement("h3"); heading.textContent = "最近の学習"; container.appendChild(heading);
    sessions.forEach(function (session) {
      var item = document.createElement("div"), date = document.createElement("b"), details = document.createElement("div"), result = document.createElement("div");
      item.className = "recent-session";
      date.textContent = formatDate(session.completedAt);
      details.textContent = labels.grade(session.gradeId) + "・" + labels.skill(session.skill) + "・" + labels.part(session.gradeId, session.skill, session.part) + (session.mode === "review" ? "・復習" : "");
      result.textContent = session.questionCount + "問中" + session.correctCount + "問正解　" + session.accuracy + "%";
      item.appendChild(date); item.appendChild(details); item.appendChild(result); container.appendChild(item);
    });
  }
  async function open() {
    root.openSec("sharedProgress"); clear(); setText("sharedProgressTitle", "学習記録を読み込み中…");
    if (!root.EikenProgressStore || !root.EikenProgressSummary) { setText("sharedProgressTitle", "学習記録を読み込めませんでした"); setText("sharedProgressMessage", "学習記録の表示機能を準備できませんでした。練習内容はそのまま利用できます。"); return; }
    var store = root.EikenProgressStore.createProgressStore();
    var loaded = store.load();
    if (!loaded.ok) { setText("sharedProgressTitle", "学習記録を読み込めませんでした"); setText("sharedProgressMessage", "この端末の学習記録を安全に読み込めませんでした。練習内容はそのまま利用できます。"); return; }
    var snapshot = store.getSnapshot(), summary = root.EikenProgressSummary.summarize(snapshot);
    setText("sharedProgressTitle", "学習記録");
    if (!summary.hasRecords) return showEmpty();
    var labels = await loadLabels(snapshot), container = element("sharedProgressSummary");
    if (summary.today.sessionCount) {
      container.appendChild(card("今日の学習", [["練習", summary.today.sessionCount + "回"], ["解いた問題", summary.today.questionCount + "問"], ["正解", summary.today.correctCount + "問"], ["不正解", summary.today.wrongCount + "問"], ["正答率", summary.today.accuracy + "%"]]));
    } else setText("sharedProgressMessage", "今日はまだ学習記録がありません。");
    if (summary.total.questionCount) container.appendChild(card("これまでの記録", [["累計回答", summary.total.attempts + "問"], ["累計正解", summary.total.correctCount + "問"], ["累計不正解", summary.total.wrongCount + "問"], ["累計正答率", summary.total.accuracy + "%"], ["練習した問題", summary.total.questionCount + "種類"]]));
    renderRecent(summary.recentSessions, labels);
  }
  root.openSharedProgress = open;
}(window));
