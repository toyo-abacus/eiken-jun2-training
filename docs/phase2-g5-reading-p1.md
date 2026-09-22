# Phase 2: 5級 Reading P1の開発用データ経路

`data/catalog.json` のg5 → `data/g5/manifest.json` → `data/g5/reading.json` の経路を、共通loaderで開発・検証時だけ確認できるようにした。

catalogの `enabled` は変更していない。通常の `loadQuestions` は `disabled-grade` を返す。開発テストだけが `{ allowDisabled: true }` を明示して、`G5 / reading / P1` の16問を取得できる。

manifestの `dataFiles` は既存Reading JSONを明示し、`contentRoutes` はP1を16問、P2を9問の既存データとして記録する。P2を移動・公開・UI接続したものではない。

`index.html` と `js/g5-reading-p1.js` は未変更であり、既存P1画面は従来どおり直接 `reading.json` を読み込む。
