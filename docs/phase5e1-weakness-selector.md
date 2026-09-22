# Phase 5E-1: 共通弱点判定ロジック

## 目的と範囲

`js/core/weakness-selector.js`は、保存済みの`questionStats`を**読み取り専用**で分析し、理解がまだ安定していない固定問題IDを抽出する。UI、launcher、Practice engine、localStorageの保存形式には接続・変更しない。

「間違えた問題」（Phase 5D）は直近の誤答を2回連続正解で克服する復習対象である。一方、弱点は複数回の結果から判断する重点練習候補であり、1回だけの不正解は弱点と断定しない。

## 判定ルール

まず`attempts >= 2`が必要である。さらに次のいずれかを満たすと弱点候補になる。

- `wrongCount >= 2`
- `attempts >= 3`かつ`correctCount / attempts < 0.60`
- `attempts >= 3`かつ`currentStreak === 0`かつ有効な`lastWrongAt`がある

ただし`currentStreak >= 3`は、過去の誤答数にかかわらず現在の弱点対象から除外する。最近3回連続で正解できている問題を、過去の失敗だけで重点練習に残し続けないためである。次の不正解で`currentStreak`が0になれば、ほかの条件を満たす限り再び候補になる。

## weaknessScore

弱点候補だけに整数scoreを毎回計算する。保存はしない。

- `wrongCount * 3`
- `round((wrongCount / attempts) * 10)`（四捨五入した0〜10点）
- `currentStreak`が0 / 1 / 2なら、それぞれ+5 / +3 / +1
- 最後の回答が不正解（有効な`lastWrongAt`が`lastCorrectAt`より新しい、または`lastCorrectAt`がない）なら+4
- `attempts >= 5`なら+1

並び順はscore降順、`lastWrongAt`の新しい順、固定question ID昇順で決定的にする。

## 安全な入力の扱い

`attempts`、`correctCount`、`wrongCount`、`currentStreak`が非負整数で、`correctCount + wrongCount === attempts`となる記録だけを判定する。必要な集計値が欠ける・矛盾する・型が不正なら候補にしない。日付が不正な場合は日付依存の条件を満たさない。これは、復習漏れ防止を優先するPhase 5Dとは異なり、証拠不足の記録を弱点と断定しないためである。

## 全級・全技能での利用

`selectWeakQuestions(questionStats, { gradeId, skill, part })`は任意のfilterで絞り込める。G4やListeningのような将来データでも、同じ`questionStats`の固定ID・メタデータを渡すだけで利用できる。Writing/Speakingの主観評価は今回の対象外である。

## Phase 5E-2

共通Practice launcherは技能・Part選択後に「🟠 弱点練習」を表示する。`questionStats`を同じ級・技能・Partで抽出し、現在読み込める問題データに存在する固定IDだけを候補にする。対象0件では開始せず、通常練習へ戻れる案内を表示する。

問題数を選んで開始する時点で、`weightedSample`がscoreを重みとして**非復元抽出**する。高scoreほど選ばれやすいが常に先頭固定にはならず、同じ問題をセッション内に重複させない。scoreは表示も保存もしない。保存するsessionの`mode`だけを`"weakness"`とし、回答は既存の`questionStats`更新経路をそのまま使う。
