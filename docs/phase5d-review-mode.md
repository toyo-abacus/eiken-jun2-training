# Phase 5D: 間違えた問題の共通復習

`js/core/review-selector.js` は、`questionStats`と現在利用できる問題データを照合して、全級・全技能で復習すべき固定問題IDを返す。

## ルール

- `wrongCount > 0` かつ `currentStreak < 2` を復習対象とする。
- `currentStreak`は各問題の不正解で0へ戻り、以後の正解で増える。したがって、最後の不正解後に2回連続正解すると対象外になる。
- 通常練習と復習の区別は判定に使用しない。同じ固定IDに対するすべての回答で判定する。
- questionStatsに残るが、現行の問題データに存在しないIDは安全に無視する。古い記録を削除しない。

復習sessionは既存`eikenTrainingProgress`へ`mode: "review"`として保存する。新しい保存キーやschema変更はない。Phase 5Cの最近の学習画面では「・復習」を付けて表示する。
