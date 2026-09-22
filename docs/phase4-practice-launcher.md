# Phase 4: 共通Practice launcher

Phase 3の開発用Practice画面の前に、manifestを読み取る共通ランチャーを追加する。ランチャーは、manifestで`practiceAvailable: true`のcontent routeだけを表示し、実際にloaderで取得できた問題数から選択可能な出題数を生成する。

問題数候補は共通engineの`getQuestionLimitOptions(total)`が生成する。標準候補は5、10、15、20、25、30問で、プール数未満のものだけを表示し、最後に重複しない`全N問`を一つ追加する。抽出はFisher-Yatesでシャッフルしたプールの先頭N問を使用するため、同一セッション内での重複はない。

現在のG5ではP1だけが`practiceAvailable: true`で、P2はデータ経路が存在していてもランチャーには表示しない。catalogのG5は引き続きdisabledであり、開発用入口だけが`allowDisabled: true`を渡す。保存、既存の間違い問題、学習履歴は使用しない。
