> Master CSS용 네이티브 HTML·CSS 인터페이스 컴포넌트입니다. 각 계약에는 클래스와 적용 위치, 스타일시트가 표현하는 상태, 공개 사용자 지정 속성, 최소한의 올바른 마크업이 담겨 있습니다. 블록과 페이지는 마크업을 복사해 사용합니다.

Master UI 마크업 작성 규칙

- 컴포넌트는 네이티브 요소에 클래스를 붙여 사용합니다. 예로는 `<button class="btn btn-primary">`, `<dialog class="dialog">`, `<input type="checkbox" role="switch" class="switch">`가 있습니다. 계약에 명시된 요소를 사용하세요.
- 변형 클래스와 기본 클래스는 같은 요소에 함께 지정합니다. `btn-sm`을 단독으로 쓰지 말고 `btn btn-sm`으로 작성하세요. 하위 요소용 클래스는 루트 안에 둡니다. `dialog-title`은 `dialog` 안에 배치하세요.
- 상태는 계약에 명시된 네이티브 속성이나 ARIA 속성으로 표시합니다. 예로는 `disabled`, `aria-pressed="true"`, `aria-selected="true"`, `open`이 있습니다. 상태용 클래스를 추가하거나 계약에 없는 클래스를 쓰지 마세요. `btn-secondary`와 `btn-outline`은 계약에 없습니다.
- 레이아웃은 마크업에 Master CSS 유틸리티를 붙여 구성합니다. 예로는 `flex gap-md p-lg`가 있습니다. 컴포넌트의 표면, 윤곽선, 그림자에 직접 CSS를 작성하지 마세요. 테마 토큰이나 공개 사용자 지정 속성을 설정하세요.
- 오버레이에는 브라우저 기본 기능을 사용합니다. `<dialog>`는 `command="show-modal"` 및 `commandfor`와, `popover` 속성은 `popovertarget`과 함께 사용하세요. 위치를 지정하거나 포커스를 가두는 스크립트를 추가하지 마세요.
- 계약에 `"script": "required"`가 지정된 패턴에는 `@master/ui/behaviors`에서 제공하는 참조 스크립트가 필요합니다.
- React, Svelte, Vue에서도 각 프레임워크의 구문으로 같은 마크업을 작성합니다. `<Button variant="primary">`처럼 클래스에 새 이름을 붙이기 위한 래퍼는 만들지 마세요. 상태를 관리하는 패턴에만 전용 컴포넌트가 있습니다. 다음 컴포넌트는 `npx master-ui add <name>`으로 프로젝트에 복사할 수 있습니다. 해당 목록은 {frameworkComponents}입니다.
- `npx master-ui check`를 실행해 계약에 어긋나는 마크업을 찾으세요.
- 모양을 바꿀 때는 원하는 효과를 내는 첫 번째 방법을 선택하세요. 요소에 적용하는 유틸리티, 테마 토큰, 공개 사용자 지정 속성, 테마 파일 순으로 고려하고, 그래도 필요한 경우에만 `npx master-ui own <name>`으로 컴포넌트 소스를 직접 관리하세요. 자세한 내용은 커스터마이징 가이드를 참고하세요.

라이브러리와 재사용할 수 있는 코드 예제에는 MIT 라이선스가 적용됩니다. [라이선스]({origin}/license.txt)

데이터를 직접 읽으려면 [전체 계약]({origin}/contracts.json), [계약 스키마]({origin}/contract.schema.json), [테마 토큰]({origin}/theme.json), [레지스트리]({origin}/r/registry.json), [일반 CSS 버전의 라이브러리]({origin}/standalone.css)를 사용하세요.
