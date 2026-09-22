# Phase 1: 共通データ基盤

このPhaseでは既存サイトに新ファイルを接続しない。`index.html`、既存JavaScript、既存問題、音声、画像、localStorageは変更しない。

追加した基盤は、全級catalog、互換schema、空のScene/音声catalog、安全なloader、共通Validatorである。catalog内の全級は `enabled: false` であり、既存教材があることと新エンジンで公開可能であることを分ける。

Validatorは既存5級Reading JSONを互換対象として読込み、`reviewStatus` とmanifestの `dataFiles` がない旧形式には警告を出す。警告だけで既存データを削除・不正化しない。fixtureは検証用で公開データではない。
