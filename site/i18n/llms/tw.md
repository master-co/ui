> Master UI 是搭配 Master CSS 使用的原生 HTML 與 CSS 介面元件庫。每個元件的契約都列出類別、套用位置、樣式表會呈現的狀態、公開自訂屬性，以及最精簡的正確標記。區塊和頁面也提供可直接複製的標記。

撰寫 Master UI 標記時，請遵循以下規則。

- 在原生元素上使用元件類別，例如 `<button class="btn btn-primary">`、`<dialog class="dialog">`、`<input type="checkbox" role="switch" class="switch">`。採用契約指定的元素。
- 將修飾類別和基礎類別加在同一個元素上，例如 `btn btn-sm`，不要單獨使用 `btn-sm`。將部件放在根元件內，例如把 `dialog-title` 放進 `dialog`。
- 使用契約列出的原生或 ARIA 屬性標示狀態，例如 `disabled`、`aria-pressed="true"`、`aria-selected="true"` 或 `open`。請勿新增狀態類別，也不要使用契約未列出的類別，例如 `btn-secondary` 或 `btn-outline`。
- 用標記中的 Master CSS utility（如 `flex gap-md p-lg`）排版。請勿另寫 CSS 調整元件的底色、邊框或陰影，應設定主題 token 或公開自訂屬性。
- 浮動介面使用平台功能。以 `command="show-modal"` 和 `commandfor` 開啟 `<dialog>`，或搭配使用 `popover` 屬性與 `popovertarget`。請勿另加定位或將焦點限制在浮動介面內的腳本。
- 如果契約標示 `"script": "required"`，請從 `@master/ui/behaviors` 接入對應的參考腳本。
- 在 React、Svelte 和 Vue 中，依框架語法撰寫相同的標記。不要為了替類別改名而寫一層包裝元件，例如 `<Button variant="primary">`。只有持有狀態的互動才提供框架元件。用 `npx master-ui add <name>` 將其原始碼複製到專案。可用元件包括 {frameworkComponents}。
- 執行 `npx master-ui check`，找出不符合契約的標記。
- 調整外觀時，依下列順序採用第一個能達成需求的做法。先考慮元素上的 utility，再依序考慮主題 token、公開自訂屬性、主題檔案，最後才用 `npx master-ui own <name>` 接手元件原始碼。詳見自訂指南。

元件庫與可重複使用的程式碼範例皆採用 MIT 授權。[授權條款]({origin}/license.txt)

[所有契約]({origin}/contracts.json)、[契約結構描述]({origin}/contract.schema.json)、[主題 token]({origin}/theme.json)、[登錄庫]({origin}/r/registry.json)、[純 CSS 版本]({origin}/standalone.css)
