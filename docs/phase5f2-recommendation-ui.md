# Phase 5F-2: 今日のおすすめ表示

共通Practice試験版で級・技能・Partを選んだ後に、「⭐ 今日のおすすめ」カードを表示する。`EikenRecommendationSelector.selectRecommendedPractice`だけを使い、review/weaknessの条件はUIへ複製しない。

- `review`: 間違えた問題の既存選択処理を改めて実行して、問題数選択へ進む。
- `weakness`: 弱点練習の既存選択処理を改めて実行して、問題数選択へ進む。
- `normal`: 既存の通常練習を選択状態にして、問題数選択へ進む。

おすすめ表示後に別タブなどで学習記録が変わっても、開始時には保存済みIDを使わず、既存の各モードselectorを再実行する。session modeは従来の`practice`、`review`、`weakness`だけであり、`recommended`は保存しない。

推薦モジュールまたは記録読込に失敗した場合、カードは通常練習の案内へ安全に戻る。既存3モードのボタンと操作は停止しない。
