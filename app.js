const PRESETS = {
  base: `<section class="lab-screen" data-mode="preview">
  <header class="lab-screen__header">
    <div>
      <p class="kicker">Live Drop</p>
      <h3>AURA Runner 01</h3>
    </div>
    <span class="state-chip">PREVIEW</span>
  </header>

  <p class="lab-screen__body">
    멤버 전용 프리뷰가 열려 있습니다. 아직 실제 결제는 잠겨 있고,
    사용자는 재고 상태와 번들 구성만 확인할 수 있습니다.
  </p>

  <div class="feature-grid">
    <article class="section-card">
      <span>입장 상태</span>
      <h4>멤버 대기 중</h4>
      <p>일반 사용자에게는 아직 공개되지 않았습니다.</p>
    </article>
    <article class="section-card">
      <span>배송</span>
      <h4>당일 발송</h4>
      <p>오후 6시 이전 결제 건은 오늘 출고됩니다.</p>
    </article>
  </div>

  <ul class="kpi-list">
    <li data-key="stock">
      <span>재고 상태</span>
      <strong>82 pairs</strong>
    </li>
    <li data-key="queue">
      <span>대기열</span>
      <strong>Preview only</strong>
    </li>
    <li data-key="bundle">
      <span>추천 번들</span>
      <strong>Starter Pack</strong>
    </li>
  </ul>

  <div class="action-row">
    <button class="ghost-btn" type="button">알림 받기</button>
    <button class="solid-btn" type="button" disabled>멤버 입장</button>
  </div>
</section>`,
  textAttr: `<section class="lab-screen" data-mode="live">
  <header class="lab-screen__header">
    <div>
      <p class="kicker">Live Drop</p>
      <h3>AURA Runner 01</h3>
    </div>
    <span class="state-chip is-live">LIVE</span>
  </header>

  <p class="lab-screen__body">
    멤버 입장이 열렸습니다. 이제 실제 주문이 가능하며,
    우선 구매 대상은 멤버십 사용자입니다.
  </p>

  <div class="feature-grid">
    <article class="section-card">
      <span>입장 상태</span>
      <h4>입장 가능</h4>
      <p>멤버십 인증 후 바로 주문 단계로 이동할 수 있습니다.</p>
    </article>
    <article class="section-card">
      <span>배송</span>
      <h4>당일 발송</h4>
      <p>현재 결제량이 많아 일부 지역은 1일 지연될 수 있습니다.</p>
    </article>
  </div>

  <ul class="kpi-list">
    <li data-key="stock">
      <span>재고 상태</span>
      <strong>61 pairs</strong>
    </li>
    <li data-key="queue">
      <span>대기열</span>
      <strong>Members first</strong>
    </li>
    <li data-key="bundle">
      <span>추천 번들</span>
      <strong>Core Pair</strong>
    </li>
  </ul>

  <div class="action-row">
    <button class="ghost-btn" type="button">사이즈 가이드</button>
    <button class="solid-btn" type="button">지금 구매</button>
  </div>
</section>`,
  addNode: `<section class="lab-screen" data-mode="preview">
  <header class="lab-screen__header">
    <div>
      <p class="kicker">Live Drop</p>
      <h3>AURA Runner 01</h3>
    </div>
    <span class="state-chip">PREVIEW</span>
  </header>

  <p class="lab-screen__body">
    멤버 전용 프리뷰가 열려 있습니다. 아직 실제 결제는 잠겨 있고,
    사용자는 재고 상태와 번들 구성만 확인할 수 있습니다.
  </p>

  <div class="feature-grid">
    <article class="section-card">
      <span>입장 상태</span>
      <h4>멤버 대기 중</h4>
      <p>일반 사용자에게는 아직 공개되지 않았습니다.</p>
    </article>
    <article class="section-card">
      <span>배송</span>
      <h4>당일 발송</h4>
      <p>오후 6시 이전 결제 건은 오늘 출고됩니다.</p>
    </article>
  </div>

  <aside class="notice-card">
    <div>
      <strong>새 노드 추가</strong>
      <p>한정 수량 20족이 추가 공개되어 별도 공지 카드가 생겼습니다.</p>
    </div>
    <span class="state-chip is-live">NEW</span>
  </aside>

  <ul class="kpi-list">
    <li data-key="stock">
      <span>재고 상태</span>
      <strong>102 pairs</strong>
    </li>
    <li data-key="queue">
      <span>대기열</span>
      <strong>Preview only</strong>
    </li>
    <li data-key="bundle">
      <span>추천 번들</span>
      <strong>Starter Pack</strong>
    </li>
    <li data-key="gift">
      <span>추가 혜택</span>
      <strong>한정 양말 증정</strong>
    </li>
  </ul>

  <div class="action-row">
    <button class="ghost-btn" type="button">알림 받기</button>
    <button class="solid-btn" type="button" disabled>멤버 입장</button>
  </div>
</section>`,
  removeNode: `<section class="lab-screen" data-mode="preview">
  <header class="lab-screen__header">
    <div>
      <p class="kicker">Live Drop</p>
      <h3>AURA Runner 01</h3>
    </div>
    <span class="state-chip is-danger">SOLD OUT</span>
  </header>

  <p class="lab-screen__body">
    준비된 수량이 모두 소진되어 번들 정보와 입장 버튼이 제거되었습니다.
  </p>

  <div class="empty-state">
    현재 재고가 모두 소진되었습니다. 재입고 알림만 신청할 수 있습니다.
  </div>

  <div class="action-row">
    <button class="ghost-btn" type="button">재입고 알림 받기</button>
  </div>
</section>`,
  replaceTag: `<section class="lab-screen" data-mode="checkout">
  <header class="lab-screen__header">
    <div>
      <p class="kicker">Checkout</p>
      <h3>AURA Runner 01</h3>
    </div>
    <span class="state-chip is-live">ORDER</span>
  </header>

  <div class="lab-screen__body">
    주문 단계에서는 설명 문단 대신 요약 블록이 렌더링됩니다.
  </div>

  <div class="feature-grid">
    <article class="section-card">
      <span>결제 수단</span>
      <h4>카드 / 간편결제</h4>
      <p>즉시 결제 가능한 수단만 노출됩니다.</p>
    </article>
    <article class="section-card">
      <span>배송지</span>
      <h4>기본 주소지</h4>
      <p>최근 사용한 주소지가 자동으로 적용됩니다.</p>
    </article>
  </div>

  <ol class="kpi-list">
    <li>
      <span>상품 금액</span>
      <strong>189,000원</strong>
    </li>
    <li>
      <span>배송비</span>
      <strong>무료</strong>
    </li>
    <li>
      <span>총 결제 금액</span>
      <strong>189,000원</strong>
    </li>
  </ol>

  <div class="action-row">
    <button class="solid-btn" type="button">결제하기</button>
  </div>
</section>`,
  mixed: `<section class="lab-screen" data-mode="checkout">
  <header class="lab-screen__header">
    <div>
      <p class="kicker">Checkout</p>
      <h3>AURA Runner 01 Final Step</h3>
    </div>
    <span class="state-chip is-live">PAY NOW</span>
  </header>

  <div class="lab-screen__body">
    주문 단계에서는 설명 문단 대신 요약 블록이 렌더링됩니다.
  </div>

  <aside class="notice-card">
    <div>
      <strong>배송지 확인 필요</strong>
      <p>주문 완료 전 주소지와 사이즈를 마지막으로 점검하세요.</p>
    </div>
    <span class="state-chip">CHECK</span>
  </aside>

  <div class="feature-grid">
    <article class="section-card">
      <span>결제 수단</span>
      <h4>카드 / 간편결제</h4>
      <p>즉시 결제 가능한 수단만 노출됩니다.</p>
    </article>
    <article class="section-card">
      <span>배송지</span>
      <h4>기본 주소지</h4>
      <p>최근 사용한 주소지가 자동으로 적용됩니다.</p>
    </article>
  </div>

  <ol class="kpi-list">
    <li>
      <span>상품 금액</span>
      <strong>189,000원</strong>
    </li>
    <li>
      <span>쿠폰 할인</span>
      <strong>-10,000원</strong>
    </li>
    <li>
      <span>총 결제 금액</span>
      <strong>179,000원</strong>
    </li>
  </ol>

  <div class="action-row">
    <button class="ghost-btn" type="button">이전 단계</button>
    <button class="solid-btn" type="button">결제 완료</button>
  </div>
</section>`
};

const PATCH_TYPES = {
  CREATE: "CREATE",
  REMOVE: "REMOVE",
  REPLACE: "REPLACE",
  TEXT: "TEXT",
  PROPS: "PROPS"
};

const ROOT_TYPE = "ROOT";
const TEXT_TYPE = "TEXT";
const ELEMENT_TYPE = "ELEMENT";
const IGNORE_TAGS = new Set(["script"]);
const BOOLEAN_PROPS = new Set(["checked", "selected", "disabled"]);

const state = {
  realVNode: createRootVNode(),
  testVNode: createRootVNode(),
  history: [],
  historyIndex: -1,
  lastPatches: [],
  mutationCount: 0,
  mutationLog: [],
  observer: null
};

const elements = {
  patchButton: document.querySelector("#patchButton"),
  backButton: document.querySelector("#backButton"),
  forwardButton: document.querySelector("#forwardButton"),
  resetButton: document.querySelector("#resetButton"),
  sourceEditor: document.querySelector("#sourceEditor"),
  realDomRoot: document.querySelector("#realDomRoot"),
  testDomRoot: document.querySelector("#testDomRoot"),
  historyMeta: document.querySelector("#historyMeta"),
  patchMeta: document.querySelector("#patchMeta"),
  nodeMeta: document.querySelector("#nodeMeta"),
  observerMeta: document.querySelector("#observerMeta"),
  statusTitle: document.querySelector("#statusTitle"),
  statusMessage: document.querySelector("#statusMessage"),
  patchLog: document.querySelector("#patchLog"),
  historyPanel: document.querySelector("#historyPanel"),
  treePanel: document.querySelector("#treePanel"),
  observerLog: document.querySelector("#observerLog"),
  testMeta: document.querySelector("#testMeta"),
  presetButtons: Array.from(document.querySelectorAll("[data-preset]"))
};

initialize();

function initialize() {
  bindEvents();
  loadInitialState();
  state.observer = createObserver();
}

function bindEvents() {
  elements.patchButton.addEventListener("click", applyPatchFromEditor);
  elements.backButton.addEventListener("click", () => moveHistory(-1));
  elements.forwardButton.addEventListener("click", () => moveHistory(1));
  elements.resetButton.addEventListener("click", resetToInitialState);
  elements.sourceEditor.addEventListener("input", handleEditorInput);

  elements.presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const presetId = button.dataset.preset;
      if (!PRESETS[presetId]) {
        return;
      }

      elements.sourceEditor.value = PRESETS[presetId];
      syncTestArea();
      setStatus("테스트 HTML이 바뀌었습니다", "Patch를 누르면 현재 테스트 영역 기준으로 실제 DOM이 업데이트됩니다.");
    });
  });
}

function loadInitialState() {
  const source = PRESETS.base;
  state.history = [];
  state.historyIndex = -1;
  state.lastPatches = [];
  elements.sourceEditor.value = source;

  const initialVNode = sourceToVNode(source);
  renderRootVNode(elements.realDomRoot, initialVNode);
  state.realVNode = cloneVNode(initialVNode);

  syncTestArea();
  resetObserverData();
  pushHistory("초기 상태", source, initialVNode, []);
  renderAll();
  setStatus("초기 샘플 로드 완료", "실제 영역은 샘플 HTML을 Virtual DOM으로 변환한 뒤 렌더링되었고, 테스트 영역은 같은 Virtual DOM 기준으로 동기화되었습니다.");
}

function createObserver() {
  const observer = new MutationObserver((mutations) => {
    state.mutationCount += mutations.length;

    mutations.forEach((mutation) => {
      state.mutationLog.unshift(summarizeMutation(mutation));
    });

    state.mutationLog = state.mutationLog.slice(0, 8);
    renderObserverMeta();
    renderObserverLog();
  });

  observer.observe(elements.realDomRoot, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true
  });

  return observer;
}

function handleEditorInput() {
  syncTestArea();
  setStatus("테스트 영역 업데이트 중", "브라우저가 현재 HTML 문자열을 DOM으로 파싱했고, 그 결과를 Virtual DOM으로 다시 만들었습니다.");
}

function syncTestArea() {
  const source = elements.sourceEditor.value.trim();
  const nextVNode = sourceToVNode(source);

  renderRootVNode(elements.testDomRoot, nextVNode);
  state.testVNode = cloneVNode(nextVNode);
  renderTreePanel(nextVNode);
  renderTestMeta(nextVNode, source);
}

function applyPatchFromEditor() {
  syncTestArea();

  const oldVNode = cloneVNode(state.realVNode);
  const nextVNode = cloneVNode(state.testVNode);
  const patches = diffRoot(oldVNode, nextVNode);

  state.lastPatches = patches;

  if (patches.length === 0) {
    renderAll();
    setStatus("변경 사항 없음", "이전 Virtual DOM과 동일해서 실제 DOM에는 아무 patch도 적용되지 않았습니다.");
    return;
  }

  resetObserverData();
  patchRoot(elements.realDomRoot, oldVNode, nextVNode);
  state.realVNode = cloneVNode(nextVNode);
  pushHistory(`Patch ${state.history.length}`, elements.sourceEditor.value.trim(), nextVNode, patches);
  renderAll();
  setStatus("Patch 적용 완료", `${patches.length}개의 patch를 계산했고, 변경된 실제 DOM만 반영했습니다.`);
}

function moveHistory(step) {
  const nextIndex = state.historyIndex + step;

  if (nextIndex < 0 || nextIndex >= state.history.length) {
    return;
  }

  const target = state.history[nextIndex];
  const patches = diffRoot(state.realVNode, target.vnode);

  resetObserverData();
  patchRoot(elements.realDomRoot, state.realVNode, target.vnode);
  state.realVNode = cloneVNode(target.vnode);
  state.lastPatches = patches;
  state.historyIndex = nextIndex;
  elements.sourceEditor.value = target.source;
  syncTestArea();
  renderAll();
  setStatus("History 이동 완료", "선택한 Virtual DOM 스냅샷으로 실제 영역과 테스트 영역을 함께 되돌렸습니다.");
}

function resetToInitialState() {
  loadInitialState();
}

function pushHistory(label, source, vnode, patches) {
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push({
    label,
    source,
    vnode: cloneVNode(vnode),
    patchCount: patches.length
  });
  state.historyIndex = state.history.length - 1;
}

function renderAll() {
  renderHistory();
  renderPatchLog();
  renderObserverMeta();
  renderObserverLog();
  renderMeta();
}

function renderMeta() {
  const historyCurrent = state.historyIndex + 1;
  const historyTotal = state.history.length;

  elements.historyMeta.textContent = `${historyCurrent} / ${historyTotal}`;
  elements.patchMeta.textContent = String(state.lastPatches.length);
  elements.nodeMeta.textContent = String(countNodes(state.realVNode));

  elements.backButton.disabled = state.historyIndex <= 0;
  elements.forwardButton.disabled = state.historyIndex >= state.history.length - 1;
}

function renderObserverMeta() {
  elements.observerMeta.textContent = `${state.mutationCount} mutations`;
}

function renderTestMeta(vnode, source) {
  const summary = [];

  summary.push(`${countNodes(vnode)} nodes`);
  summary.push(`depth ${getMaxDepth(vnode)}`);

  if (!source) {
    summary.push("빈 HTML");
  }

  elements.testMeta.textContent = summary.join(" / ");
}

function renderPatchLog() {
  elements.patchLog.replaceChildren();

  if (state.lastPatches.length === 0) {
    elements.patchLog.appendChild(createEmptyItem("현재 patch log가 없습니다."));
    return;
  }

  state.lastPatches.forEach((patch) => {
    const item = document.createElement("li");
    item.className = "log-item";

    const type = document.createElement("span");
    type.className = "log-item__type";
    type.dataset.type = patch.type;
    type.textContent = patch.type;

    const message = document.createElement("span");
    message.textContent = patch.message;

    const path = document.createElement("span");
    path.className = "log-item__path";
    path.textContent = `path: ${patch.path}`;

    item.append(type, message, path);
    elements.patchLog.appendChild(item);
  });
}

function renderHistory() {
  elements.historyPanel.replaceChildren();

  state.history.forEach((entry, index) => {
    const button = document.createElement("button");
    button.className = "history-item";
    button.type = "button";

    if (index === state.historyIndex) {
      button.classList.add("is-active");
    }

    const title = document.createElement("strong");
    title.textContent = entry.label;

    const meta = document.createElement("span");
    meta.textContent = `${entry.patchCount} patch${entry.patchCount === 1 ? "" : "es"} stored`;

    button.append(title, meta);
    button.addEventListener("click", () => {
      const step = index - state.historyIndex;
      if (step !== 0) {
        moveHistory(step);
      }
    });

    elements.historyPanel.appendChild(button);
  });
}

function renderTreePanel(vnode) {
  elements.treePanel.textContent = JSON.stringify(vnode, null, 2);
}

function renderObserverLog() {
  elements.observerLog.replaceChildren();

  if (state.mutationLog.length === 0) {
    elements.observerLog.appendChild(createEmptyItem("MutationObserver 로그가 아직 없습니다."));
    return;
  }

  state.mutationLog.forEach((entry) => {
    const item = document.createElement("li");
    item.className = "observer-item";

    const text = document.createElement("span");
    text.textContent = entry.summary;

    const meta = document.createElement("span");
    meta.className = "observer-item__meta";
    meta.textContent = entry.detail;

    item.append(text, meta);
    elements.observerLog.appendChild(item);
  });
}

function setStatus(title, message) {
  elements.statusTitle.textContent = title;
  elements.statusMessage.textContent = message;
}

function createEmptyItem(text) {
  const item = document.createElement("li");
  item.className = "log-item";
  item.textContent = text;
  return item;
}

function resetObserverData() {
  state.mutationCount = 0;
  state.mutationLog = [];
}

function createRootVNode() {
  return {
    type: ROOT_TYPE,
    children: []
  };
}

function createTextVNode(text) {
  return {
    type: TEXT_TYPE,
    text
  };
}

function createElementVNode(tag, props, children) {
  return {
    type: ELEMENT_TYPE,
    tag,
    props,
    children
  };
}

function sourceToVNode(source) {
  const container = document.createElement("div");
  container.innerHTML = source;
  removeIgnoredNodes(container);
  return containerToVNode(container);
}

function removeIgnoredNodes(container) {
  container.querySelectorAll(Array.from(IGNORE_TAGS).join(",")).forEach((node) => {
    node.remove();
  });
}

function containerToVNode(container) {
  const root = createRootVNode();

  root.children = Array.from(container.childNodes)
    .map(domToVNode)
    .filter(Boolean);

  return root;
}

function domToVNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (!node.textContent || !node.textContent.trim()) {
      return null;
    }

    return createTextVNode(node.textContent);
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const props = {};

  Array.from(node.attributes).forEach((attribute) => {
    props[attribute.name] = attribute.value === "" ? true : attribute.value;
  });

  const children = Array.from(node.childNodes)
    .map(domToVNode)
    .filter(Boolean);

  return createElementVNode(node.tagName.toLowerCase(), props, children);
}

function renderRootVNode(container, vnode) {
  container.replaceChildren(...vnode.children.map(createDOMNode));
}

function createDOMNode(vnode) {
  if (vnode.type === TEXT_TYPE) {
    return document.createTextNode(vnode.text);
  }

  const element = document.createElement(vnode.tag);
  updateProps(element, {}, vnode.props);

  vnode.children.forEach((child) => {
    element.appendChild(createDOMNode(child));
  });

  return element;
}

function diffRoot(oldRoot, newRoot) {
  const patches = [];
  const maxLength = Math.max(oldRoot.children.length, newRoot.children.length);

  for (let index = 0; index < maxLength; index += 1) {
    diffNode(oldRoot.children[index], newRoot.children[index], `${index}`, patches);
  }

  return patches;
}

function diffNode(oldVNode, newVNode, path, patches) {
  if (!oldVNode && newVNode) {
    patches.push({
      type: PATCH_TYPES.CREATE,
      path,
      message: `${describeVNode(newVNode)} 노드를 생성합니다.`
    });
    return;
  }

  if (oldVNode && !newVNode) {
    patches.push({
      type: PATCH_TYPES.REMOVE,
      path,
      message: `${describeVNode(oldVNode)} 노드를 제거합니다.`
    });
    return;
  }

  if (!oldVNode || !newVNode) {
    return;
  }

  if (!isSameVNodeType(oldVNode, newVNode)) {
    patches.push({
      type: PATCH_TYPES.REPLACE,
      path,
      message: `${describeVNode(oldVNode)}를 ${describeVNode(newVNode)}로 교체합니다.`
    });
    return;
  }

  if (oldVNode.type === TEXT_TYPE && newVNode.type === TEXT_TYPE) {
    if (oldVNode.text !== newVNode.text) {
      patches.push({
        type: PATCH_TYPES.TEXT,
        path,
        message: `텍스트를 "${truncate(oldVNode.text)}"에서 "${truncate(newVNode.text)}"로 변경합니다.`
      });
    }
    return;
  }

  const propChanges = diffProps(oldVNode.props, newVNode.props);

  if (propChanges.length > 0) {
    patches.push({
      type: PATCH_TYPES.PROPS,
      path,
      message: `${describeVNode(newVNode)}의 속성 ${propChanges.join(", ")}를 업데이트합니다.`
    });
  }

  const maxLength = Math.max(oldVNode.children.length, newVNode.children.length);

  for (let index = 0; index < maxLength; index += 1) {
    diffNode(oldVNode.children[index], newVNode.children[index], `${path}.${index}`, patches);
  }
}

function patchRoot(container, oldRoot, newRoot) {
  const maxLength = Math.max(oldRoot.children.length, newRoot.children.length);

  for (let index = maxLength - 1; index >= 0; index -= 1) {
    patchNode(container, oldRoot.children[index], newRoot.children[index], index);
  }
}

function patchNode(parent, oldVNode, newVNode, index) {
  const currentNode = parent.childNodes[index];

  if (!oldVNode && newVNode) {
    const nextNode = createDOMNode(newVNode);
    const referenceNode = parent.childNodes[index] || null;
    parent.insertBefore(nextNode, referenceNode);
    return;
  }

  if (oldVNode && !newVNode) {
    if (currentNode) {
      parent.removeChild(currentNode);
    }
    return;
  }

  if (!currentNode || !oldVNode || !newVNode) {
    return;
  }

  if (!isSameVNodeType(oldVNode, newVNode)) {
    parent.replaceChild(createDOMNode(newVNode), currentNode);
    return;
  }

  if (oldVNode.type === TEXT_TYPE && newVNode.type === TEXT_TYPE) {
    if (oldVNode.text !== newVNode.text) {
      currentNode.textContent = newVNode.text;
    }
    return;
  }

  updateProps(currentNode, oldVNode.props, newVNode.props);

  const maxLength = Math.max(oldVNode.children.length, newVNode.children.length);

  for (let childIndex = maxLength - 1; childIndex >= 0; childIndex -= 1) {
    patchNode(currentNode, oldVNode.children[childIndex], newVNode.children[childIndex], childIndex);
  }
}

function diffProps(oldProps, newProps) {
  const changes = [];
  const keys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  keys.forEach((key) => {
    if (!(key in newProps)) {
      changes.push(`-${key}`);
      return;
    }

    if (!(key in oldProps) || oldProps[key] !== newProps[key]) {
      changes.push(`${key}=${String(newProps[key])}`);
    }
  });

  return changes;
}

function updateProps(element, oldProps, newProps) {
  const keys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  keys.forEach((key) => {
    const oldValue = oldProps[key];
    const newValue = newProps[key];

    if (!(key in newProps)) {
      removeProp(element, key, oldValue);
      return;
    }

    if (!(key in oldProps) || oldValue !== newValue) {
      setProp(element, key, newValue);
    }
  });
}

function setProp(element, key, value) {
  if (BOOLEAN_PROPS.has(key)) {
    element[key] = Boolean(value);

    if (value) {
      element.setAttribute(key, "");
    } else {
      element.removeAttribute(key);
    }
    return;
  }

  if (key === "value") {
    element.value = value;
  }

  element.setAttribute(key, String(value));
}

function removeProp(element, key) {
  if (BOOLEAN_PROPS.has(key)) {
    element[key] = false;
  }

  if (key === "value") {
    element.value = "";
  }

  element.removeAttribute(key);
}

function isSameVNodeType(first, second) {
  if (first.type !== second.type) {
    return false;
  }

  if (first.type === ELEMENT_TYPE) {
    return first.tag === second.tag;
  }

  return true;
}

function describeVNode(vnode) {
  if (!vnode) {
    return "empty";
  }

  if (vnode.type === TEXT_TYPE) {
    return "text";
  }

  return `<${vnode.tag}>`;
}

function countNodes(vnode) {
  if (!vnode) {
    return 0;
  }

  if (vnode.type === TEXT_TYPE) {
    return 1;
  }

  if (vnode.type === ROOT_TYPE) {
    return vnode.children.reduce((total, child) => total + countNodes(child), 0);
  }

  return 1 + vnode.children.reduce((total, child) => total + countNodes(child), 0);
}

function getMaxDepth(vnode, depth = 0) {
  if (!vnode) {
    return depth;
  }

  if (!vnode.children || vnode.children.length === 0) {
    return depth;
  }

  return Math.max(...vnode.children.map((child) => getMaxDepth(child, depth + 1)));
}

function summarizeMutation(mutation) {
  if (mutation.type === "childList") {
    return {
      summary: `childList @ ${describeTarget(mutation.target)}`,
      detail: `added ${mutation.addedNodes.length} / removed ${mutation.removedNodes.length}`
    };
  }

  if (mutation.type === "attributes") {
    return {
      summary: `attributes @ ${describeTarget(mutation.target)}`,
      detail: `${mutation.attributeName} changed`
    };
  }

  return {
    summary: `characterData @ ${describeTarget(mutation.target.parentNode)}`,
    detail: truncate(mutation.target.textContent || "")
  };
}

function describeTarget(node) {
  if (!node) {
    return "unknown";
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return "#text";
  }

  const id = node.id ? `#${node.id}` : "";
  const className = typeof node.className === "string" && node.className.trim()
    ? `.${node.className.trim().split(/\s+/).join(".")}`
    : "";

  return `${node.nodeName.toLowerCase()}${id}${className}`;
}

function truncate(text) {
  return text.length > 40 ? `${text.slice(0, 40)}...` : text;
}

function cloneVNode(vnode) {
  return JSON.parse(JSON.stringify(vnode));
}
