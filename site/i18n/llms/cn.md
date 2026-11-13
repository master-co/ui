> 基于 Master CSS 的原生 HTML 与 CSS 界面组件。每个组件都有一份契约，列出类名及其适用位置、样式表呈现的状态、公开的自定义属性，以及最精简的可用标记。区块和页面均提供可复制的标记。

编写 Master UI 标记时，请遵循以下规则。

- 给契约指定的原生元素添加组件类。例如 `<button class="btn btn-primary">`、`<dialog class="dialog">` 和 `<input type="checkbox" role="switch" class="switch">`。
- 将修饰类与基础类写在同一个元素上，使用 `btn btn-sm`，不要单独写 `btn-sm`。部件应放在组件根元素内部，例如将 `dialog-title` 放在 `dialog` 内。
- 用契约列出的原生属性或 ARIA 属性标记状态，例如 `disabled`、`aria-pressed="true"`、`aria-selected="true"` 和 `open`。不要为状态新增类，也不要使用契约未列出的类，例如 `btn-secondary` 或 `btn-outline`。
- 在标记中用 Master CSS 工具类安排布局，例如 `flex gap-md p-lg`。不要为组件的表面、边缘或阴影另写 CSS，应设置主题令牌或公开的自定义属性。
- 浮层使用浏览器原生能力。使用带 `command="show-modal"` 和 `commandfor` 的 `<dialog>`，或将 `popover` 与 `popovertarget` 配合使用。不要添加定位脚本，也不要添加将焦点限制在浮层内的脚本。
- 契约中标有 `"script": "required"` 的交互需要引入 `@master/ui/behaviors` 中相应的参考脚本。
- 在 React、Svelte 或 Vue 中，用框架自己的语法编写相同的标记。不要为了重命名类而封装组件，例如 `<Button variant="primary">`。需要管理状态的交互才提供框架组件，可用 `npx master-ui add <name>` 将源码复制到项目中。可用组件包括 {frameworkComponents}。
- 运行 `npx master-ui check`，检查标记是否符合契约。
- 调整外观时，从作用范围最小且能达到目的的方式开始。依次考虑在元素上使用工具类、调整主题令牌、设置公开的自定义属性、引入主题文件。只有前述方式都无法达到目的时，才用 `npx master-ui own <name>` 接管组件源码。详见自定义指南。

组件库和可复用的代码示例采用 MIT 许可证。参阅[许可说明]({origin}/license.txt)。

[全部契约]({origin}/contracts.json)、[契约 Schema]({origin}/contract.schema.json)、[主题令牌]({origin}/theme.json)、[注册表]({origin}/r/registry.json)、[纯 CSS 版组件库]({origin}/standalone.css)。
