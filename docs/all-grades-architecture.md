# 全級対応アーキテクチャ設計

## 目的と範囲

この設計は、5級から1級までを**同じ学習エンジン**で扱い、級を追加するたびに画面や保存処理を複製しないためのものです。今回の文書は移行の契約であり、既存の `index.html`、音声、問題、画面、ブラウザ保存を変更しません。

英検の公式仕様は改定され得るため、各級を実装・公開する直前に公式資料で確認し、確認日と根拠を級別manifestへ記録します。資料未提供の級を「本番形式対応済み」とは表示しません。

## 現在の構造と全級化の障害

| 現状 | 全級化での問題 | 段階的な扱い |
| --- | --- | --- |
| `index.html` に画面、CSS、既存問題、音声処理、保存処理が集中 | 級・技能ごとに分岐が増え、1か所の変更で別級を壊しやすい | 既存画面は維持し、新エンジンを外部JSとしてPart単位で接続する |
| 問題は主にインライン配列 | 固定ID、出所、素材、Part仕様の検証が難しい | JSONへ並行移行し、旧配列は移行完了まで削除しない |
| 既存音声は `audio/5Q-part*.mp3` と `audio/P2Q-part*.mp3` | 問題単位の音声と再生規則を管理できない | 新規素材から `audioRef` で管理し、既存パスは互換資産として残す |
| 保存キーは級別・用途別に混在 | 成績や弱点を全級で集計できず、例外で画面が止まる可能性がある | `eikenTrainingProgress` を正規の共通記録にし、旧キーは削除しない |
| 5級だけ `catalog.json`、`manifest.json`、Reading P1 JSONの試験導入済み | パス・schema・実行経路がまだ全級共通ではない | 既存5級をパイロットとして共通契約を確定する |

## 最終構成

### A. 共通エンジン

将来追加する `js/core/` は次を一度だけ実装します。

- catalog読込、級・技能・Part・問題数のメニュー生成
- 重複なしのFisher-Yates抽出、選択肢シャッフル、`correctChoiceId` による採点
- セッション進行、結果、解説、エラー表示
- 安全なlocalStorage読書き、弱点抽出、学習履歴集計
- HTML Audioを使う再生、失敗時の再試行・スキップ・次問への復帰
- 画像参照、未制作素材の非表示または準備中表示

技能固有の表示は `js/skills/reading.js`、`listening.js`、`writing.js`、`speaking.js`、`vocabulary.js` に分けます。共通エンジンは「問題を表示し、回答を受け取り、結果を記録する」責務だけを持ちます。

### B. 級別設定

各級の差はmanifestで表します。コードに「5級なら」「準2級なら」を増やさず、次を設定として読みます。

```json
{
  "gradeId": "g5",
  "idPrefix": "G5",
  "displayName": "5級",
  "availability": { "officialSpec": "confirmed", "questionData": "in-progress" },
  "skills": ["reading", "listening", "speaking"],
  "modes": ["practice", "official-style", "mock"],
  "parts": [{
    "skill": "listening",
    "id": "P1",
    "questionType": "response-choice",
    "official": { "questionCount": 10, "playbackCount": 2, "choicePresentation": "spoken" },
    "practice": { "allowedCounts": [5, 10, "all"], "allowReplay": true }
  }]
}
```

`official` は公式形式の制約、`practice` は学習時の再生・問題数・解説の許可を表します。Writing/Speakingのように正誤採点を前提にしない技能は、採点方式・下書き・録音・自己チェックをその技能の設定として持ちます。

既存との互換性のため、内部gradeIdは当面 `g5`、`g4`、`g3`、`p2`、`p2plus`、`g2`、`p1`、`g1` を維持します。固定IDの接頭辞は `G5`、`G4`、`G3`、`P2`、`P2P`、`G2`、`P1`、`G1` とし、出題順を含めません。`GP2`のような表示用別名はcatalogで管理し、既存IDを後から改名しません。

### C. 問題データ

問題は「共通項目 + 技能別payload」です。共通項目は、すべての教材で検索・保存・検証に使用します。

```json
{
  "schemaVersion": "1.0",
  "id": "G5-L-P1-0001",
  "grade": "g5",
  "skill": "listening",
  "part": "P1",
  "questionType": "response-choice",
  "modeEligibility": ["practice", "official-style"],
  "sourceType": "original",
  "sourceReference": "g5-listening-spec.md",
  "reviewStatus": "content-reviewed",
  "difficulty": 1,
  "tags": ["school", "response"],
  "prompt": "...",
  "choices": [{ "id": "A", "text": "..." }],
  "correctChoiceId": "A",
  "explanation": "...",
  "media": { "assetType": "shared-scene", "imageRef": "scene-school-classroom-01", "audioRef": "audio/g5/listening/p1/G5-L-P1-0001.mp3" },
  "payload": {}
}
```

`payload` は技能別です。Listeningはscript、translation、再生単位、回答前非表示の情報、Readingは空所・語句カード、Writingは設問・文字数・自己チェック、Speakingは準備時間・録音可否・質問列、Vocabularyは語義・例文を持ちます。選択肢の正解は常に位置でなくchoice IDで判定します。

`sourceType` は `original`、`official-reference-analysis`、`legacy`、`unknown` を区別します。公式過去問そのものを、権利確認なしに公開問題データへ登録する用途には使いません。

### D. 共通教材資産

問題のmediaは次の種類を明示します。

- `shared-scene`: 答えを示さない再利用可能な場面画像
- `question-specific`: 図表・絵選択など、その問題に固有で不可欠な画像
- `none`: 画像を使わない

Scene Libraryは画像ファイルとは別にcatalogを持ちます。

```json
{
  "sceneId": "scene-school-classroom-01",
  "category": "school",
  "location": "classroom",
  "characters": ["student", "friend"],
  "objects": ["desk", "notebook"],
  "allowedUses": ["listening-P1-context", "reading-context"],
  "forbiddenUses": ["count-answer", "color-answer", "identity-answer"],
  "answerLeakNotes": "人物の名前、数、色、時計、答えとなる動作を含めない。",
  "file": "assets/images/scenes/scene-school-classroom-01.webp",
  "status": "reviewed"
}
```

共通sceneを、数・色・人物特定・位置・絵選択の答えになる問題へ無理に使いません。その場合は `question-specific` を使い、回答前に見せてよい情報を問題仕様に記録します。

### E. 音声Library

音声は問題データに埋め込まず、静的パスで参照します。新規音声の標準パスは `assets/audio/{gradeId}/{skill}/{part}/{questionId}.mp3` とします。manifestには形式別の再生規則、問題には実在する `audioRef` のみを登録します。

再生エンジンはHTML Audioを第一選択とし、SpeechSynthesisは明示的な代替練習機能に限定します。`error`、タイムアウト相当、`ended`未発火に備え、再試行・音声をスキップして回答・次問へ進む導線を必ず出します。GitHub Pagesでは大文字小文字を区別するため、validatorが実在パスと完全一致を確認します。

### F. 学習記録と弱点判定

`eikenTrainingProgress` は全級共通の唯一の新規保存先とします。既存の `eikenG5Wrong`、`eikenP2Wrong`、`eikenP2Records` は削除・上書きしません。

```json
{
  "version": 2,
  "questions": {
    "G5-L-P1-0001": {
      "grade": "g5", "skill": "listening", "part": "P1",
      "attempts": 3, "correctCount": 2, "wrongCount": 1,
      "currentStreak": 1,
      "lastAttemptAt": "ISO-8601", "lastCorrectAt": "ISO-8601", "lastWrongAt": "ISO-8601"
    }
  }
}
```

`grade/skill/part` はIDから再計算もできますが、集計・データ診断用に保存します。旧設計の `streak` を見つけた場合は、将来の安全な移行処理で `currentStreak` に読み替えます。JSON parse/stringify、容量超過、private browsingでの保存失敗はすべて捕捉し、学習は継続します。

弱点抽出は全級共通で、最近の誤答、`wrongCount >= 2`、回答2回以上で正答率60%未満、`currentStreak < 2` を優先します。結果はgrade、skill、partでフィルタできるようにします。

## 推奨ディレクトリ構造

```text
data/
  catalog.json
  schemas/
    question.schema.json
    grade-manifest.schema.json
    scene.schema.json
  grades/
    g5/ manifest.json questions/reading/p1.json questions/listening/p1.json
    g4/ manifest.json
    g3/ manifest.json
    p2/ manifest.json
    p2plus/ manifest.json
    g2/ manifest.json
    p1/ manifest.json
    g1/ manifest.json
assets/
  audio/{grade}/{skill}/{part}/
  images/scenes/
  images/questions/{grade}/{skill}/{part}/
  scenes.json
js/
  core/ catalog.js session.js storage.js shuffle.js audio.js validator-messages.js
  skills/ reading.js listening.js writing.js speaking.js vocabulary.js
  ui/ grade-menu.js practice.js results.js review.js
scripts/
  validate-content.mjs
docs/
```

これは最終配置です。現行の `data/g5/`、`audio/`、`js/g5-reading-p1.js` は今回移動しません。移行対象を一つずつ新構造へ複製・検証し、安定後にのみ参照先を切り替えます。

## Catalog / manifest

`data/catalog.json` は級一覧、表示順、manifestパス、対応状態だけを持ちます。級選択画面はcatalogを読んで生成し、`questionDataStatus` が `awaiting-materials` の級は「資料待ち」と表示します。

各grade manifestは技能、Part、問題数、選択肢形式、制限時間、公式再生回数、対応mode、データファイル一覧を持ちます。アプリはcatalogからmanifestをたどるため、新しい級の追加でHTMLのメニューや問題パスをハードコードしません。

## 共通Validator

`scripts/validate-content.mjs` はcatalogから全manifestとデータを読み、共通規則とmanifestの級別規則を別々に検査します。

**共通検査**: JSON構文、固定IDの重複・書式、grade/skill/part整合、必須項目、選択肢ID重複、correctChoiceId存在、source metadata、reviewStatus、相対パスの大文字小文字、audio/image実在。

**manifest規則**: 各Partの選択肢数、許可questionType、公式問題数、official-styleの再生回数・制限時間、画像必須Part、Writing/Speaking固有必須項目。

素材未制作のdraftは `reviewStatus: pending` と `audioStatus/imageStatus: pending` を明記し、正式公開manifestには登録しません。

## 新しい級を追加する標準手順

1. 公式仕様を確認し、確認日・URLまたは資料識別子を記録する。
2. `data/grades/{gradeId}/manifest.json` を作成し、未提供の技能は資料待ちにする。
3. オリジナル作問基準と必要素材の仕様を作成する。
4. 固定ID付き問題データをPartごとに追加する。
5. Scene Libraryまたは問題専用画像を追加し、答え漏れレビューを行う。
6. 実音声を追加し、audioRefと再生規則を設定する。
7. 共通validatorを実行し、問題数・パス・公式設定を検査する。
8. catalogにmanifestを登録する。
9. 共通UIで級・技能・Part・問題数が自動表示されることを確認する。
10. PC、iPhone Safari、Androidで音声・保存・復習・本番形式を確認する。

## 既存5級の安全な移行

1. **Phase 1:** catalog、manifest、schema、validatorの契約を確定する（現状は着手済み）。
2. **Phase 2:** 既存5級Reading P1を新データへ並行接続し、固定ID・保存を検証する。
3. **Phase 3:** オリジナル5級Listening P1を、画像・実音声・人間レビュー完了後に並行接続する。
4. **Phase 4:** 5級Reading P2/P3、Listening P2/P3を内容監査後に一Partずつ移行する。
5. **Phase 5:** 共通の進捗、間違い、弱点、結果UIを新旧併存で導入する。
6. **Phase 6:** 5級の学習モードが安定してから、同じ契約で4級を追加する。

既存インライン問題、既存localStorage、既存音声は各Phaseの動作確認が済むまで削除しません。

## 4級追加時に必要な作業

4級は「問題をコピーして級名だけ変える」のではなく、公式仕様確認、4級manifest、Part別オリジナル問題・音声・画像、素材レビュー、validator、catalog登録、端末テストの順で追加します。共通エンジン変更が必要になるのは、既存のquestionTypeで表せない新しい回答操作や公式進行だけです。その場合も級専用分岐ではなく、新しいquestionType handlerとmanifest設定として追加します。

## 実装開始前に決めること

- 各級の公式仕様の確認日・根拠と、教材として公開できる素材の権利範囲
- `official-style` を何回分のオリジナル模試として提供するか
- 本番形式でのタイマー、再生回数、途中再開の扱い
- Writing/Speakingの保存期間、録音データを端末内に残すか、外部送信しないか
- Scene Libraryの画像形式（推奨WebP）と制作・人間レビューの責任者
- 新旧の保存データをどこまで移行するか。ID対応できない旧記録は保持のみとする
