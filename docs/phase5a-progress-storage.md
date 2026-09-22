# Phase 5A: 共通学習記録の保存基盤

## 範囲

このPhaseは`js/core/progress-store.js`、schema、単体テストだけを追加する。`index.html`、Practice engine、Practice UIはこのモジュールを読み込まず、公開中の練習で新しい記録はまだ保存しない。

## 保存キーと互換性

キーは既存の`eikenTrainingProgress`を使用する。既存のG5 Reading P1試験導入は`{ version: 2, questions: { ... } }`を直接読書きするため、`version: 2`を変更しない。Phase 5Aは`schemaVersion: 2`、`questionStats`、`sessions`を追加し、既存の`questions`は互換用ミラーとして保持する。

既存version 2で`questions`が正しいオブジェクトなら、安全に`questionStats`へ読み替える。既存キーの内容は削除・置換・自動移行しない。壊れたJSON、型違い、未来versionは読み取り専用の空メモリ状態で扱い、既存値を上書きしない。

`eikenG5Wrong`、`eikenP2Wrong`、`eikenP2Records`は独立した旧キーのまま残す。IDと意味を安全に対応付けられないため、Phase 5Aではmigrationしない。

## schemaVersion 2

```json
{
  "version": 2,
  "schemaVersion": 2,
  "questionStats": {
    "G5-R-P1-0001": {
      "gradeId": "g5", "skill": "reading", "part": "P1",
      "attempts": 3, "correctCount": 2, "wrongCount": 1,
      "currentStreak": 1, "bestStreak": 2,
      "lastAttemptAt": "2026-09-22T04:00:00.000Z",
      "lastCorrectAt": "2026-09-22T04:00:00.000Z",
      "lastWrongAt": "2026-09-21T04:00:00.000Z"
    }
  },
  "sessions": [] ,
  "questions": {}
}
```

`attempts`は常に`correctCount + wrongCount`へ正規化する。不正解は`currentStreak`を0にし、正解は連続正解と`bestStreak`を更新する。日時はすべてISO 8601で保存する。

## sessions

sessionには`sessionId`、開始・終了日時、gradeId、skill、part、mode、問題数、正解・不正解数、正答率、questionIds、wrongQuestionIdsを保存する。全回答本文を保存しないため容量を抑えられる。最新200件に上限を設け、問題ID配列も100件までにする。questionStatsは固定IDごとの小さな集計であるため保持する。

session modeは`practice`、`wrong-only`、`weakness`、`official-style`、`mock-exam`を許可する。今回の基盤は`practice`だけで動作確認するが、wrong-onlyにはlastWrongAt/currentStreak、weaknessにはattempts/correctCount/wrongCount/currentStreak/bestStreakが揃っている。

## API

- `createProgressStore({ storage })`: テスト可能なstoreを作る。storage未指定時は安全にlocalStorageを取得する。
- `load()` / `getSnapshot()` / `getStatus()`
- `recordAnswer({ questionId, gradeId, skill, part, isCorrect, answeredAt })`
- `startSession({ gradeId, skill, part, mode, questionCount, questionIds })`
- `completeSession({ sessionId, correctCount, questionCount, wrongQuestionIds })`
- `recordSession(...)`: 開始・完了を一度で記録する。

session IDは`crypto.randomUUID()`を優先し、ない端末では時刻・乱数・連番のfallbackを使い、既存IDとの重複を避ける。

## エラー処理

localStorage取得不能、SecurityError、容量超過、setItem失敗、JSON.parse失敗、JSON.stringify失敗はすべて結果オブジェクトで返す。記録のメモリ更新後に保存失敗しても例外を投げず、将来Practice側は表示・採点・次問・結果を続行できる。壊れた既存データや未来schemaは絶対に自動上書きしない。

## 次Phaseでの接続

Practice UIが回答確定時に`recordAnswer`を呼び、開始時に`startSession`、結果確定時に`completeSession`を呼ぶ。各呼出しの`ok/saved/warning`をUIへ通知しても、保存失敗でセッションを中断しない。接続前に新旧G5 P1とのdual-write可否と、既存`questions`ミラーを使う期間を別途検証する。
