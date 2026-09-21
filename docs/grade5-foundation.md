# 5級完成モデルの基盤設計

この文書と `data/` は既存の `index.html` を置き換えない。既存の問題、音声、画面、ブラウザ保存を維持したまま、次の移行で使うデータ契約を定義する。

## 公式Part構成

`data/g5/manifest.json` を唯一の構成定義とする。

| 技能 | Part | 形式 | 問数 | 本番音声 |
| --- | --- | --- | --- | --- |
| Reading | P1 | 短文の語句空所補充 | 15 | - |
| Reading | P2 | 会話文の文空所補充 | 5 | - |
| Reading | P3 | 日本文付き短文の語句整序 | 5 | - |
| Listening | P1 | 会話の応答文選択 | 10 | 2回 |
| Listening | P2 | 会話の内容一致選択 | 5 | 2回 |
| Listening | P3 | イラストの内容一致選択 | 10 | 2回 |

既存の5級問題はこの構成へ未移行であり、削除しない。移行時には問題を内容で分類し、確信できない問題は `legacy-unclassified` として保留する。

## 固定問題ID

問題IDは `GRADE-SKILL-PART-NUMBER` とする。番号は問題そのものの永続番号であり、出題順・選択肢順・セッション番号を含めない。

| 例 | 意味 |
| --- | --- |
| `G5-R-P1-0001` | 5級 Reading Part 1 の問題1 |
| `G5-L-P2-0003` | 5級 Listening Part 2 の問題3 |
| `P2-R-P4-0001` | 準2級 Reading Part 4 の問題1 |

学習モードの選択肢はシャッフルできるが、正解判定は選択肢位置ではなく `answer.correctChoiceId` で行う。語句整序はトークンIDの順序で判定する。

## 問題データ

共通の必須項目は `id`、`grade`、`skill`、`part`、`questionType`、`difficulty`、`tags`、`source`。選択式、語句整序、ライティング、スピーキングは必要な項目だけを追加する。

`source.type` は `original`、`official-reference`、`legacy` のいずれかとする。音声・画像は存在するファイルだけを `media` に登録する。未提供の素材をパスだけで仮登録しない。

## 保存データ v2

将来追加する安全な保存キーは `eikenTrainingProgress` とする。既存の `eikenG5Wrong`、`eikenP2Wrong`、`eikenP2Records` は自動削除しない。

```json
{
  "version": 2,
  "questions": {
    "G5-R-P1-0001": {
      "attempts": 3,
      "correctCount": 1,
      "wrongCount": 2,
      "streak": 0,
      "lastAnsweredAt": "2026-09-21T00:00:00.000Z",
      "lastCorrectAt": "2026-09-20T00:00:00.000Z",
      "lastWrongAt": "2026-09-21T00:00:00.000Z"
    }
  }
}
```

導入時は `JSON.parse`、`JSON.stringify`、`localStorage.getItem`、`setItem` をすべて `try/catch` で包む。失敗時は学習を継続し、保存できない旨を表示する。旧キーは読み取り専用の移行対象とし、IDを安全に対応付けられない既存記録は削除せず残す。

## 弱点判定の初期ルール

AI判定は使わず、次の優先順で問題を抽出する。

1. `lastWrongAt` が新しい問題
2. `wrongCount >= 2` の問題
3. `attempts >= 2` かつ正答率が60%未満の問題
4. `streak < 2` の問題

同率なら最後に回答した日時が古い問題を優先する。集計は固定ID、級、技能、Partで行う。

## 移行順序

1. 問題の分類表を作る（データを移動しない）。
2. 固定IDを採番し、検証する。
3. JSONデータを追加し、既存画面と並行して読み取りテストを行う。
4. 5級Reading Part 1から表示処理を切り替える。
5. Partごとに同じ手順を繰り返す。
6. 全5級機能が安定してから準2級へ展開する。
