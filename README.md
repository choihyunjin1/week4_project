# Week4 Team3 Project

Vanilla JavaScript로 `pre-Fiber React` 스타일의 Virtual DOM 라이브러리를 구현하고, 이를 검증하는 웹 페이지를 함께 만든 프로젝트입니다.

이 프로젝트의 목표는 단순한 이론 정리가 아니라, 아래 흐름이 실제로 동작하는 라이브러리와 데모를 직접 구현하는 것입니다.

1. 실제 DOM을 읽어 Virtual DOM 트리로 변환한다.
2. 이전 Virtual DOM과 새로운 Virtual DOM을 비교한다.
3. 변경된 부분만 Diff 알고리즘으로 찾아 Patch를 만든다.
4. Patch만 실제 DOM에 반영해 최소 변경 렌더링을 수행한다.

## 프로젝트 구성

- `packages/team3-react/src/index.js`
  - Demo Lab과 Benchmark가 공통으로 사용하는 라이브러리 엔진입니다.
  - `createElement`, `Component`, `render`, `domToVNodeTree`, `diffVNodeTrees`, `applyPatchesToDom` 등을 제공합니다.
- `core/vdom.js`
  - 브라우저 콘솔/시연 중심의 VDOM 엔진 스크립트입니다.
  - 실제 DOM -> VDOM 변환, Patch 타입, 직관적인 트리 계산 흐름을 확인할 수 있습니다.
- `demo-lab/`
  - 실제 영역 / 테스트 영역 / Patch / Undo / Redo / VDOM 트리 시각화가 있는 검증용 페이지입니다.
- `benchmark/`
  - 같은 공용 엔진을 기준으로 VDOM 방식과 직접 DOM 조작 방식을 비교하는 성능 실험 페이지입니다.

## 우리가 구현한 라이브러리 핵심 개념

### 1. Virtual DOM (VDOM)

Virtual DOM은 실제 DOM을 메모리 위의 트리 구조로 표현한 객체입니다.

이 프로젝트의 VDOM 노드는 아래와 같은 정보를 가집니다.

- `type`
  - `element`, `text`
- `tag`
  - 예: `div`, `article`, `button`
- `attrs`
  - 속성 정보
- `children`
  - 자식 노드 배열
- `text`
  - 텍스트 노드 값
- `key`
  - 형제 노드 비교를 위한 식별자
- `path`, `depth`
  - 트리 시각화와 patch 대상 추적용 메타데이터

즉 브라우저가 직접 다루는 실제 DOM을 바로 수정하지 않고, 먼저 비교 가능한 트리 구조를 만든 뒤 이를 기준으로 변경을 계산합니다.

### 2. Real DOM (RDOM)

RDOM은 브라우저가 실제로 화면에 렌더링하는 DOM입니다.

실제 DOM은 직접 수정할 수 있지만, 변경이 많아질수록 브라우저는 Reflow / Repaint 비용을 치르게 됩니다.  
그래서 이 프로젝트에서는 다음과 같은 전략을 사용합니다.

1. 현재 실제 DOM을 읽어 VDOM으로 변환
2. 새 상태도 VDOM으로 생성
3. 두 VDOM을 비교해 변경점만 계산
4. 마지막에 필요한 Patch만 실제 DOM에 적용

즉, 실제 DOM은 최종 반영 대상이고, 핵심 비교 작업은 Virtual DOM에서 수행합니다.

## Diff 알고리즘

이 프로젝트의 Diff 알고리즘은 두 VDOM 트리를 비교해 최소 변경 목록을 찾는 역할을 합니다.

### Patch 타입

현재 구현된 핵심 Patch 타입은 다음과 같습니다.

- `CREATE`
  - 새 노드가 생긴 경우
- `REMOVE`
  - 기존 노드가 삭제된 경우
- `REPLACE`
  - 태그나 노드 타입이 바뀐 경우
- `TEXT`
  - 텍스트 노드 값만 바뀐 경우
- `ATTR_SET`
  - 속성이 추가되거나 변경된 경우
- `ATTR_REMOVE`
  - 속성이 제거된 경우
- `REORDER_CHILDREN`
  - 같은 부모 아래 자식 순서가 변경된 경우

### 최소 변경을 찾는 방식

Diff는 아래 순서로 동작합니다.

1. 노드가 없으면 생성 또는 삭제로 판단
2. 노드 타입이나 태그가 다르면 교체로 판단
3. 텍스트 노드면 문자열만 비교
4. 같은 엘리먼트면 속성을 비교
5. 자식 배열을 비교해서 추가/삭제/재배치 여부를 계산

이렇게 해서 전체 트리를 다시 그리지 않고, 실제로 달라진 부분만 Patch로 분리합니다.

## key를 사용하는 이유

형제 노드 목록을 비교할 때 `key`가 없으면 순서가 바뀐 경우에도 브라우저 입장에서는 다른 노드처럼 보일 수 있습니다.  
그러면 원래 있던 노드를 재사용하지 못하고 불필요한 삭제/생성이 늘어납니다.

이 프로젝트는 `data-key`, `key`, `id` 등을 기준으로 비교 키를 생성하고, 이를 바탕으로 다음을 수행합니다.

- 같은 노드인지 식별
- 리스트 순서 변경 추적
- `REORDER_CHILDREN` Patch 생성
- 재정렬 상황에서 기존 노드 재사용 또는 안정적인 subtree 재구성

즉 `key`는 단순한 부가 정보가 아니라, 리스트 diff 정확도와 실제 DOM 변경량을 줄이는 핵심 장치입니다.

## Demo Lab에서 검증하는 내용

Demo Lab은 과제 요구사항을 직접 검증하는 화면입니다.

- 실제 영역과 테스트 영역이 따로 존재
- 페이지 로드 시 실제 영역의 샘플 HTML을 VDOM으로 변환
- 변환된 VDOM으로 테스트 영역을 렌더링
- 사용자가 테스트 영역 HTML을 수정
- `Patch` 버튼을 누르면 Diff 결과만 실제 영역에 반영
- 변경된 VDOM은 history에 저장
- `뒤로가기`, `앞으로가기`로 특정 상태 복원
- VDOM 트리 구조를 시각화
- Patch 후 변경된 노드를 색으로 하이라이트

즉 Demo Lab은 "이론 설명"이 아니라, VDOM 변환 -> Diff -> Patch -> History가 실제로 맞게 동작하는지 확인하는 테스트 페이지입니다.

## Benchmark에서 검증하는 내용

Benchmark는 공용 라이브러리를 사용한 VDOM 렌더링과 직접 DOM 조작 방식을 비교하는 화면입니다.

여기서 확인하는 포인트는 다음과 같습니다.

- 같은 데이터 구조를 기준으로 두 방식이 어떻게 렌더링되는지
- 변경량이 적을 때 VDOM의 장점이 어떻게 드러나는지
- 노드 수가 많아질 때 직접 DOM walk와 어떤 차이가 나는지
- `diff + patch` 전략이 실제 DOM 변경량을 줄이는지

즉 Benchmark는 "빠르다"를 말로 설명하는 것이 아니라, 공통 엔진 기준에서 어떤 상황에서 VDOM 방식이 유리한지 확인하는 실험 도구입니다.

## 발표용 핵심 메시지

이 프로젝트는 React 전체를 복제한 것이 아니라, `Fiber 도입 이전 React의 핵심 아이디어`를 Vanilla JS로 구현한 프로젝트입니다.

핵심 메시지는 아래 세 가지입니다.

1. 실제 DOM을 바로 계속 건드리는 대신, Virtual DOM에서 먼저 비교한다.
2. Diff 알고리즘으로 바뀐 부분만 찾는다.
3. Patch만 실제 DOM에 반영해서 최소 변경 렌더링을 수행한다.

즉 우리가 구현한 라이브러리는 `VDOM 생성`, `RDOM 변환`, `Diff`, `Patch`, `key 기반 자식 재정렬`, `History`, `시각화`, `성능 비교`까지 연결된 구조입니다.

## 실행 페이지

- Demo Lab: `demo-lab/index.html`
- Benchmark: `benchmark/index.html`
- Dashboard: `index.html`

로컬 서버를 실행한 뒤 브라우저에서 열어 바로 확인할 수 있습니다.
