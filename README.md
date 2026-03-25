# Week4 Team3 Project

Vanilla JavaScript로 `team3-react` Virtual DOM 라이브러리를 구현하고, 그 라이브러리가 실제로 어떻게 동작하는지 검증하는 `Demo Lab`과 `Benchmark`를 만든 프로젝트입니다.

이 저장소는 개념 요약보다 `우리가 실제로 만든 것`에 초점을 둡니다.

- 공용 라이브러리: `packages/team3-react/src/index.js`
- 검증 페이지: `demo-lab/`
- 성능 비교 페이지: `benchmark/`
- 대시보드 진입점: `index.html`
- 상세 사용 문서: [TEAM3_REACT_MANUAL.md](/Users/choeyeongbin/week4_project/TEAM3_REACT_MANUAL.md)

## 우리가 실제로 구현한 결과물

### 1. `team3-react` 라이브러리

공용 엔진은 [packages/team3-react/src/index.js](/Users/choeyeongbin/week4_project/packages/team3-react/src/index.js) 에 있습니다.

현재 구현 범위:

- `createElement(type, props, ...children)`
- `Component`
- `setState(partialState)`
- `forceUpdate()`
- `render(element, container)`
- `Fragment`
- DOM event props 반영
- `style`, `className`, `value`, `checked`, `selected`, `disabled` 처리
- key 기반 자식 비교
- class component lifecycle 일부 지원

렌더링 외에도 아래 VDOM 유틸을 제공합니다.

- `domToVNodeTree()`
- `normalizeVNodeTree()`
- `renderVNodeTree()`
- `serializeVNodeTreeHTML()`
- `diffVNodeTrees()`
- `applyPatchesToDom()`
- `countVNodeNodes()`
- `getVNodeMaxDepth()`
- `traverseVNodeDFS()`
- `traverseVNodeBFS()`
- `cloneVNodeTree()`

즉 단순한 UI 시연 코드가 아니라, 실제 렌더러와 VDOM 검증 유틸을 함께 가진 라이브러리 구조입니다.

### 2. Demo Lab

Demo Lab은 [apps/showcase/tabs/demo.js](/Users/choeyeongbin/week4_project/apps/showcase/tabs/demo.js) 와 [demo-lab/index.html](/Users/choeyeongbin/week4_project/demo-lab/index.html) 에 구현되어 있습니다.

이 페이지에서 실제로 검증하는 기능:

- `실제 영역`과 `테스트 영역`을 분리
- 페이지 로드 시 실제 DOM을 VDOM으로 변환
- 변환된 VDOM으로 테스트 영역 렌더링
- HTML 코드 편집기로 테스트 영역 구조 수정
- `Patch` 버튼 클릭 시 diff 계산
- patch 결과만 실제 영역에 반영
- 상태 history 저장
- `뒤로가기 / 앞으로가기`로 snapshot 복원
- 상세 트리 구조 하이라이트
- `Old VDOM / New VDOM` 비교 뷰
- 변경 노드, 경로 subtree, focus node 강조
- `MutationObserver`로 실제 DOM 변화 로그 수집

즉 Demo Lab은 “이론 설명 페이지”가 아니라, `VDOM 생성 -> Diff -> Patch -> History -> 실제 DOM 반영`을 눈으로 확인하는 검증 도구입니다.

### 3. Benchmark

Benchmark는 [benchmark/index.html](/Users/choeyeongbin/week4_project/benchmark/index.html) 와 [benchmark/app.js](/Users/choeyeongbin/week4_project/benchmark/app.js) 에 구현되어 있습니다.

여기서는:

- 공용 VDOM 엔진 기반 렌더링
- 직접 DOM 조작 baseline
- 노드 수 / 변경량 / reorder 상황
- 실제 DOM 갱신 비용 차이

를 비교합니다.

즉 Benchmark는 “Virtual DOM이 왜 필요한가”를 말이 아니라 실험으로 보여주는 페이지입니다.

## 현재 구조

![핵심 구조](/Users/choeyeongbin/week4_project/assets/readme/core-structure.png)

현재 코드 기준 핵심 흐름은 아래와 같습니다.

1. 입력 HTML 또는 실제 DOM을 읽는다.
2. VDOM 생성 계층에서 객체 트리를 만든다.
3. 정규화 계층에서 `path`, `depth`, `key`를 정리한다.
4. 비교 계층에서 diff를 계산한다.
5. 적용 계층에서 patch를 실제 DOM에 반영한다.
6. Demo Lab과 Benchmark에서 그 결과를 시각화한다.

## 함수 그룹 지도

![함수 그룹 지도](/Users/choeyeongbin/week4_project/assets/readme/function-map.png)

실제 구현을 함수 그룹으로 나누면 다음과 같습니다.

### VDOM 생성

- `createRootContainer`
- `createTextVNode`
- `createElementVNode`
- `domNodeToVNode`
- `domToVNode`
- `sourceToVNode`

### 정규화

- `normalizeVNodePath`

### 렌더 / 탐색

- `createDOMFromVNode`
- `renderVNodeToRoot`
- `findVNodeByPath`
- `traverseDFS`
- `traverseBFS`

### 비교

- `diffAttrs`
- `createChildKeyMap`
- `diffChildren`
- `diff`
- `diffRoot`

### 적용

- `getDomNodeByPath`
- `applyCreate`
- `applyRemove`
- `applyReplace`
- `applyText`
- `applyAttrSet`
- `applyAttrRemove`
- `applyReorderPatch`
- `applyPatches`
- `patchRoot`

## Patch 타입

현재 라이브러리가 지원하는 patch 타입:

- `CREATE`
- `REMOVE`
- `REPLACE`
- `TEXT`
- `ATTR_SET`
- `ATTR_REMOVE`
- `REORDER_CHILDREN`

이 patch 타입은 [packages/team3-react/src/index.js](/Users/choeyeongbin/week4_project/packages/team3-react/src/index.js) 의 `VNODE_PATCH_TYPES`에 정의되어 있고, Demo Lab의 patch feed에서도 그대로 사용합니다.

## key 기반 비교 방식

우리 구현은 형제 노드를 비교할 때 `key`를 사용합니다.

우선순위:

1. `data-key`
2. `key`
3. `id`
4. fallback index 기반 key

이 방식으로:

- 같은 노드를 안정적으로 추적하고
- reorder를 감지하고
- `REORDER_CHILDREN` patch를 생성합니다.

현재 commit 단계는 안정성을 우선해서 reorder subtree를 재구성하는 방향으로 처리합니다.  
즉 diff는 key 기반 최소 변경 탐지를 하고, 실제 DOM 적용은 충돌 없이 재현 가능한 쪽으로 맞췄습니다.

## Demo Lab에서 눈으로 확인할 수 있는 것

현재 `DEVELOPE` 브랜치 기준 Demo Lab에서 바로 시연 가능한 포인트는 아래와 같습니다.

- HTML 편집기 수정 시 `draftTree` 갱신
- 테스트 영역 인터랙션 시 `draftTree` 실시간 갱신
- `actualTree`와 `draftTree` diff 계산
- 변경된 노드 path 추적
- 상세 트리에서 변경 노드 하이라이트
- `Old VDOM / New VDOM`에서 변경 branch만 강조
- 가장 위에 있는 변경 노드로 자동 스크롤
- Patch 후 실제 영역 DOM 반영
- Undo / Redo snapshot 복원

즉 “우리 라이브러리가 실제로 어떤 상태를 가지고 있고, 어떻게 반영되는지”를 시각적으로 설명할 수 있는 상태입니다.

## 주요 파일

- 공용 라이브러리: [packages/team3-react/src/index.js](/Users/choeyeongbin/week4_project/packages/team3-react/src/index.js)
- Demo Lab 로직: [apps/showcase/tabs/demo.js](/Users/choeyeongbin/week4_project/apps/showcase/tabs/demo.js)
- Demo Lab 스타일: [apps/showcase/styles.css](/Users/choeyeongbin/week4_project/apps/showcase/styles.css)
- Demo Lab 엔트리: [demo-lab/index.html](/Users/choeyeongbin/week4_project/demo-lab/index.html)
- Benchmark: [benchmark/index.html](/Users/choeyeongbin/week4_project/benchmark/index.html)
- Benchmark 로직: [benchmark/app.js](/Users/choeyeongbin/week4_project/benchmark/app.js)
- 대시보드: [index.html](/Users/choeyeongbin/week4_project/index.html)
- 라이브러리 설명서: [TEAM3_REACT_MANUAL.md](/Users/choeyeongbin/week4_project/TEAM3_REACT_MANUAL.md)

## 한 줄 설명

`team3-react`는 Vanilla JavaScript로 만든 pre-Fiber React 스타일 Virtual DOM 라이브러리이며, 이 저장소는 그 라이브러리의 렌더링, diff, patch, history, 시각화, 성능 비교까지 실제로 검증하는 프로젝트입니다.
