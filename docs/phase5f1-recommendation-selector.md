# Phase 5F-1: 共通おすすめ判定

## 目的

`js/core/recommendation-selector.js`は、保存済み`questionStats`と現在利用可能な問題データを読み取り、次に優先する練習モードを返す純粋な共通ロジックである。localStorage、sessions、questionStatsは変更しない。

## 判定優先順位

1. `EikenReviewSelector.select(...)`が現在利用可能な復習対象を1問以上返す場合は`review`
2. 復習対象がなく、`EikenWeaknessSelector.selectWeakQuestions(...)`が現在利用可能な弱点対象を1問以上返す場合は`weakness`
3. 両方なければ`normal`

復習と弱点が同じ固定問題IDを含む場合も、復習を優先する。review/weaknessの判定条件はこのモジュールに複製せず、既存selectorだけを利用する。

## API

`selectRecommendedPractice(questionStats, availableQuestions, { gradeId, skill, part })`

返却値は`mode`（`review` / `weakness` / `normal`）、`targetCount`、`reason`、対象がある場合の固定`questionIds`を持つ。対象数は、指定された級・技能・Partに一致し、かつ現在の問題データに存在するIDだけで算出する。

壊れた・空のデータ、またはselectorの利用不能時は例外を出さず`normal`を返す。

## 将来の拡張

今日の学習回数、正答率、技能の偏り、最近練習していない技能などを、既存の優先順位の後段ルールとして追加できる。Phase 5F-1はUI・launcher・Practice・保存処理へ接続しない。
