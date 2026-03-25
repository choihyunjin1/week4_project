# team3-react 사용 설명서 / 명세서

## 1. 개요

`team3-react`는 Vanilla JavaScript로 구현한 `pre-Fiber React 스타일`의 Virtual DOM 라이브러리입니다.

이 라이브러리는 크게 두 가지 역할을 수행합니다.

1. React 스타일 렌더러
   - `createElement`, `Component`, `render`
2. VDOM 검증 엔진
   - `domToVNodeTree`, `diffVNodeTrees`, `applyPatchesToDom`

즉, 일반적인 UI 렌더링과 실제 DOM 비교/검증 도구를 함께 제공합니다.

구현 파일:
- [packages/team3-react/src/index.js](/Users/choeyeongbin/week4_project/packages/team3-react/src/index.js)

현재 버전:
- `0.1.0`

## 2. 지원 범위

### 렌더러 기능

- `createElement(type, props, ...children)`
- `render(element, container)`
- `Component` 기반 class component
- `setState(partialState)`
- `forceUpdate()`
- `Fragment`
- DOM 이벤트 props (`onClick`, `onInput` 등)
- `style` object 반영
- `className` 반영
- key 기반 자식 reconciliation
- mount / update / unmount lifecycle 일부 지원

### VDOM 유틸 기능

- 실제 DOM -> Virtual DOM 변환
- Virtual DOM 정규화
- Virtual DOM -> 실제 DOM 노드 생성
- Virtual DOM 렌더링
- Virtual DOM HTML 직렬화
- 노드 수 / 최대 깊이 계산
- DFS / BFS 순회
- 두 VDOM 간 diff 계산
- patch를 실제 DOM에 적용
- VDOM deep clone

## 3. 공개 API 명세

### 3.1 `createElement(type, config, ...children)`

React의 `createElement`와 유사한 함수입니다.

입력:
- `type`: 문자열 태그명 또는 컴포넌트 함수/클래스
- `config`: props 객체
- `children`: 자식 노드

출력:
- element object

예시:

```js
import { createElement } from "./packages/team3-react/src/index.js";

const node = createElement(
  "button",
  { className: "primary", onClick: () => console.log("click") },
  "Like"
);
```

특징:
- `key`는 별도 필드로 분리 저장
- `null`, `undefined`, `false`, `true` children은 제거
- 문자열/숫자는 text element로 변환

### 3.2 `Component`

class component의 베이스 클래스입니다.

지원 멤버:
- `this.props`
- `this.state`
- `setState(partialState)`
- `forceUpdate()`

지원 lifecycle:
- `componentDidMount`
- `componentDidUpdate`
- `componentWillUnmount`
- `shouldComponentUpdate`

예시:

```js
import { Component, createElement } from "./packages/team3-react/src/index.js";

class Counter extends Component {
  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  render() {
    return createElement(
      "button",
      {
        onClick: () => this.setState({ count: this.state.count + 1 })
      },
      `count: ${this.state.count}`
    );
  }
}
```

### 3.3 `render(element, container)`

element를 실제 DOM container에 렌더링합니다.

입력:
- `element`: `createElement()` 결과
- `container`: 실제 DOM container

동작:
- 기존 root instance 조회
- `reconcile()` 수행
- DOM 생성/수정/삭제 반영
- root instance를 `WeakMap`에 저장

예시:

```js
import { render, createElement } from "./packages/team3-react/src/index.js";

const app = createElement("div", null, "hello team3-react");
render(app, document.getElementById("app"));
```

### 3.4 `Fragment`

자식들을 그룹화할 때 사용하는 심볼입니다.

### 3.5 `VNODE_PATCH_TYPES`

지원 patch 타입 상수입니다.

- `CREATE`
- `REMOVE`
- `REPLACE`
- `TEXT`
- `ATTR_SET`
- `ATTR_REMOVE`
- `REORDER_CHILDREN`

## 4. VDOM 유틸 API 명세

### 4.1 `domToVNodeTree(container)`

실제 DOM subtree를 Virtual DOM 트리로 변환합니다.

특징:
- comment node 무시
- 공백-only text node 무시
- 각 노드에 `path`, `depth`, `key` 부여

반환 shape:

```js
{
  type: "root" | "element" | "text",
  tag: "div" | null,
  attrs: {},
  children: [],
  text: "",
  key: "some-key",
  path: "0-1-2",
  depth: 2
}
```

### 4.2 `normalizeVNodeTree(vNode, path = "0", depth = 0)`

VDOM 트리의 `path`, `depth`, `key`를 재계산합니다.

용도:
- editor 수정 후 새 트리 정리
- patch 적용 전 비교 기준 정리

### 4.3 `createDomNodeFromVNodeTree(vNode)`

VDOM 노드 1개를 실제 DOM Node로 변환합니다.

### 4.4 `renderVNodeTree(container, vNode)`

VDOM 트리를 실제 DOM container에 렌더링합니다.

동작:
- `container.innerHTML = ""`
- 자식들을 순회하며 DOM node 생성

### 4.5 `serializeVNodeTreeHTML(vNode)`

VDOM 트리를 HTML 문자열로 직렬화합니다.

### 4.6 `countVNodeNodes(vNode)`

VDOM 전체 노드 수를 반환합니다.

### 4.7 `getVNodeMaxDepth(vNode)`

VDOM 트리 최대 깊이를 반환합니다.

### 4.8 `traverseVNodeDFS(root)`, `traverseVNodeBFS(root)`

트리 순회 결과를 배열로 반환합니다.

반환 예:

```js
[
  { path: "0-0", label: "<section>", depth: 1 },
  { path: "0-0-0", label: "<article>", depth: 2 }
]
```

### 4.9 `diffVNodeTrees(oldNode, newNode, path = "0", patches = [])`

두 VDOM 트리를 비교해 patch 배열을 반환합니다.

비교 규칙:
1. old 없음 / new 있음 -> `CREATE`
2. old 있음 / new 없음 -> `REMOVE`
3. `type` 또는 `tag` 다름 -> `REPLACE`
4. text 값 다름 -> `TEXT`
5. attrs 차이 -> `ATTR_SET`, `ATTR_REMOVE`
6. children 순서 차이 -> `REORDER_CHILDREN`

### 4.10 `applyPatchesToDom(root, patches, nextTree)`

patch 목록을 실제 DOM에 적용합니다.

현재 적용 순서:
1. `REMOVE`
2. `REORDER_CHILDREN`
3. `CREATE`
4. 나머지 update (`REPLACE`, `TEXT`, `ATTR_SET`, `ATTR_REMOVE`)

주의:
- reorder가 발생한 subtree 내부의 중복 patch는 필터링됩니다.
- reorder는 안정성을 위해 해당 subtree를 재구성하는 방향으로 처리합니다.

### 4.11 `cloneVNodeTree(vNode)`

VDOM deep clone 함수입니다.

## 5. patch object 명세

### `CREATE`

```js
{
  type: "CREATE",
  path: "0-1",
  parentPath: "0",
  index: 1,
  node: newVNode
}
```

### `REMOVE`

```js
{
  type: "REMOVE",
  path: "0-1",
  parentPath: "0",
  index: 1,
  node: oldVNode
}
```

### `REPLACE`

```js
{
  type: "REPLACE",
  path: "0-1",
  oldNode,
  newNode
}
```

### `TEXT`

```js
{
  type: "TEXT",
  path: "0-1-0",
  oldText: "before",
  newText: "after"
}
```

### `ATTR_SET`

```js
{
  type: "ATTR_SET",
  path: "0-1",
  name: "class",
  value: "active"
}
```

### `ATTR_REMOVE`

```js
{
  type: "ATTR_REMOVE",
  path: "0-1",
  name: "disabled"
}
```

### `REORDER_CHILDREN`

```js
{
  type: "REORDER_CHILDREN",
  path: "0-1",
  parentPath: "0-1",
  order: ["comment-2", "comment-1", "comment-3"]
}
```

## 6. 사용 예시

### 6.1 React 스타일 렌더링

```js
import { createElement, Component, render } from "./packages/team3-react/src/index.js";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { message: "Hello" };
  }

  render() {
    return createElement(
      "section",
      { className: "app-shell" },
      createElement("h1", null, this.state.message),
      createElement(
        "button",
        {
          onClick: () => this.setState({ message: "Updated" })
        },
        "change"
      )
    );
  }
}

render(createElement(App), document.getElementById("app"));
```

### 6.2 DOM -> VDOM -> diff -> patch

```js
import {
  domToVNodeTree,
  normalizeVNodeTree,
  diffVNodeTrees,
  applyPatchesToDom
} from "./packages/team3-react/src/index.js";

const actualRoot = document.getElementById("actual");
const testRoot = document.getElementById("test");

const oldTree = normalizeVNodeTree(domToVNodeTree(actualRoot));
const newTree = normalizeVNodeTree(domToVNodeTree(testRoot));
const patches = diffVNodeTrees(oldTree, newTree);

applyPatchesToDom(actualRoot, patches, newTree);
```

## 7. 내부 동작 요약

### 렌더러 경로

1. `createElement()`로 element object 생성
2. `render()` 호출
3. 기존 root instance와 새 element를 `reconcile()`
4. 같은 type이면 재사용, 다르면 교체
5. class component면 `render()` 재호출
6. DOM props와 children 반영

### 검증 엔진 경로

1. 실제 DOM을 `domToVNodeTree()`로 읽음
2. `normalizeVNodeTree()`로 경로 정리
3. `diffVNodeTrees()`로 patch 계산
4. `applyPatchesToDom()`으로 실제 DOM 반영

## 8. key 기반 비교 규칙

형제 노드 비교 시 우선순위:

1. `data-key`
2. `key`
3. `id`
4. fallback index 기반 key

장점:
- reorder 감지 가능
- 동일 노드 추적 가능
- diff 정확도 향상

현재 제약:
- reorder commit은 subtree 재구성 방식이라, DOM node 이동 최적화는 추가 여지가 있습니다.

## 9. 브라우저 API 의존성

이 라이브러리는 브라우저 DOM API를 직접 사용합니다.

주요 API:
- `document.createElement`
- `document.createTextNode`
- `appendChild`
- `insertBefore`
- `replaceChild`
- `removeChild`
- `replaceChildren`
- `setAttribute`
- `removeAttribute`
- `addEventListener`
- `removeEventListener`

즉 이 라이브러리는 JS 위에서 동작하지만, 최종 렌더링은 브라우저의 DOM 엔진을 사용합니다.

## 10. 한계 / 비목표

현재 구현에 포함되지 않는 항목:

- Fiber scheduler
- concurrent rendering
- hooks
- context
- suspense
- hydration / SSR
- synthetic event system

따라서 이 라이브러리는 `React 전체 구현`이 아니라, `pre-Fiber React 핵심 아이디어와 Virtual DOM diff/patch 구조를 구현한 교육·검증용 라이브러리`로 보는 것이 정확합니다.

## 11. 권장 설명 문구

발표나 포트폴리오에서는 아래처럼 설명하는 것을 권장합니다.

> team3-react는 Vanilla JavaScript로 구현한 pre-Fiber React 스타일 Virtual DOM 라이브러리입니다.  
> 실제 DOM을 Virtual DOM으로 변환하고, 두 트리를 비교해 최소 patch를 계산한 뒤, 변경된 부분만 실제 DOM에 반영합니다.  
> 또한 Demo Lab과 Benchmark를 통해 diff, patch, history, 시각화, 성능 비교까지 검증할 수 있습니다.
