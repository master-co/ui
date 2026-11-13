> Master CSS 向けのネイティブ HTML・CSS コンポーネントです。コンポーネントごとのコントラクトには、クラスとその適用先、スタイルシートが表示する状態、公開カスタムプロパティ、最小構成の正しいマークアップを記載しています。ブロックとページは、マークアップをコピーして使えます。

Master UI のマークアップを書くときのルール

- コントラクトに指定されたネイティブ要素にクラスを付けます。例は `<button class="btn btn-primary">`、`<dialog class="dialog">`、`<input type="checkbox" role="switch" class="switch">` です。
- 修飾クラスはベースクラスと同じ要素に指定します。`btn btn-sm` のように組み合わせ、`btn-sm` 単体では使いません。パーツはルートの内側に配置します。たとえば `dialog-title` は `dialog` の内側に置きます。
- 状態は、コントラクトに指定されたネイティブ属性または ARIA 属性で表します。例は `disabled`、`aria-pressed="true"`、`aria-selected="true"`、`open` です。状態を表すためにクラスを追加してはいけません。コントラクトにないクラスも使いません。たとえば `btn-secondary` や `btn-outline` は存在しません。
- レイアウトはマークアップ内で Master CSS のユーティリティを使って指定します。たとえば `flex gap-md p-lg` と記述します。コンポーネントの面、輪郭、影を変更する場合は、CSS で直接描画せず、テーマトークンまたは公開カスタムプロパティを設定します。
- オーバーレイにはブラウザー標準の機能を使います。`<dialog>` には `command="show-modal"` と `commandfor`、`popover` 属性には `popovertarget` を使います。位置の調整やフォーカスを閉じ込めるためのスクリプトは追加しません。
- コントラクトに `"script": "required"` とあるパターンには、`@master/ui/behaviors` のリファレンススクリプトが必要です。
- React、Svelte、Vue では、同じマークアップをそれぞれの構文で書きます。クラスに別名を付けるだけの `<Button variant="primary">` のようなラッパーは作りません。フレームワークコンポーネントが用意されているのは、状態を持つパターンだけです。`npx master-ui add <name>` でプロジェクトにコピーできるコンポーネントは、{frameworkComponents} です。
- `npx master-ui check` を実行すると、コントラクトに反するマークアップが報告されます。
- 見た目を変更する場合は、目的を満たす最も小さな変更から選びます。要素のユーティリティ、テーマトークン、公開カスタムプロパティ、テーマファイルの順に検討し、必要な場合に `npx master-ui own <name>` でソースをプロジェクトに取り込みます。詳細はカスタマイズガイドを参照してください。

ライブラリと再利用可能なコード例には、[MIT ライセンス]({origin}/license.txt)が適用されます。

データと配布ファイルの一覧には、[全コントラクト]({origin}/contracts.json)、[コントラクトのスキーマ]({origin}/contract.schema.json)、[テーマトークン]({origin}/theme.json)、[レジストリ]({origin}/r/registry.json)、[ライブラリのプレーン CSS]({origin}/standalone.css)があります。
