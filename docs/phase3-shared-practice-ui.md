# Phase 3: 共通Practice UIの試験接続

共通loaderで取得したG5 Reading P1を、`practice-engine.js` と `practice-view.js` で表示・採点する開発用画面を追加した。セッションはメモリだけを使用し、localStorage、間違い問題、既存進捗には書き込まない。

開発入口だけが `allowDisabled: true` を明示する。catalogのG5は引き続きdisabledであり、通常のloader呼出しは拒否される。既存の「第1部を練習（新データ・試験導入）」は変更せず、直接読込のまま残す。
