# Phase 5C: 共通学習記録画面

`js/core/progress-summary.js` は、保存済みの `eikenTrainingProgress` を**変更せず**に集計する共通モジュールです。`questionStats` は全期間の累計、`sessions` は完了済みセッションの今日・最近の履歴に使用します。

- 今日の判定は、ISO 8601の `completedAt` を利用者端末のローカル日付へ変換して行う。
- `status: "completed"` かつ有効な `completedAt` を持つsessionだけを今日・最近の成績に含める。途中sessionは残すが集計しない。
- 累計はsessions上限（200件）の影響を受けないよう、固定ID別の `questionStats` の `attempts`、`correctCount`、`wrongCount` を集計する。
- 記録が空なら0/0やNaNを出さず、学習開始を案内する。
- 壊れたJSON、future schema、localStorage利用不可はprogress-storeの`load()`結果で検知し、読込エラー画面だけを表示する。練習画面は継続して利用できる。

表示名はcatalogの級名と、利用可能なgrade manifestの`contentRoutes.displayName`を使用する。manifestが未提供の場合も、共通の技能名と`P1 → 第1部`の安全な表示にフォールバックするため、G5専用分岐を持たない。
