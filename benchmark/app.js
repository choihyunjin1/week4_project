/*
  React-style Virtual DOM Engine Console
  Vanilla JavaScript implementation focused on explainability.
*/

/* -------------------------------------------------------------------------- */
/* 1. constants                                                                */
/* -------------------------------------------------------------------------- */

const VDOMEngine = window.VDOMEngine;
const { NODE_TYPE, PATCH_TYPES } = VDOMEngine;

const GRAPH_POINT_LIMIT = 60;
const BENCHMARK_FEED_LIMIT = 10;
const BENCHMARK_BURST_TICKS = 30;
const BENCHMARK_MAX_CONTINUOUS_MS = 4000;
const BENCHMARK_MIN_DELAY_MS = 34;
const BENCHMARK_TARGET_UTILIZATION = 0.55;
const BENCHMARK_UI_REFRESH_MS = 140;
const BENCHMARK_PHASES = ["warm-up", "pressure", "peak", "cooldown"];
const MODE_LABELS = {
  mixed: "Mixed",
  text: "Text churn",
  attr: "Attribute pulse",
  list: "List reorder"
};
const BENCHMARK_PRESETS = {
  balanced: {
    label: "균형",
    description: "기본 스트림",
    mode: "mixed",
    frequency: 8,
    itemCount: 96,
    mutationRatio: 0.08,
    reorderEvery: 3,
    layoutReadEvery: 8,
    rootLayoutReads: 0,
    imperativeScanPasses: 1,
    imperativeRequery: false
  },
  favorable: {
    label: "VDOM 유리 극대화",
    description: "큰 트리 + 희소 변경 + 반복 selector walk + 강한 layout read 압력",
    mode: "attr",
    frequency: 8,
    itemCount: 320,
    mutationRatio: 0.01,
    reorderEvery: 9999,
    layoutReadEvery: 1,
    rootLayoutReads: 6,
    imperativeScanPasses: 6,
    imperativeRequery: true
  },
  unfavorable: {
    label: "직접 DOM 유리 극대화",
    description: "중간 트리 + 전체 재정렬 + cached walk만 유지",
    mode: "list",
    frequency: 8,
    itemCount: 96,
    mutationRatio: 1,
    reorderEvery: 1,
    layoutReadEvery: 0,
    rootLayoutReads: 0,
    imperativeScanPasses: 1,
    imperativeRequery: false
  }
};

const SELECTORS = {
  vdomCurrentLatency: "#vdomCurrentLatency",
  redrawCurrentLatency: "#redrawCurrentLatency",
  latencyGapValue: "#latencyGapValue",
  benchmarkStatus: "#benchmarkStatus",
  benchmarkStartButton: "#benchmarkStartButton",
  benchmarkStopButton: "#benchmarkStopButton",
  benchmarkBurstButton: "#benchmarkBurstButton",
  benchmarkResetButton: "#benchmarkResetButton",
  presetBalancedButton: "#presetBalancedButton",
  presetFavorableButton: "#presetFavorableButton",
  presetUnfavorableButton: "#presetUnfavorableButton",
  presetLabelChip: "#presetLabelChip",
  loadWarningChip: "#loadWarningChip",
  loadReasonChip: "#loadReasonChip",
  mutationModeSelect: "#mutationModeSelect",
  frequencyRange: "#frequencyRange",
  frequencyValue: "#frequencyValue",
  itemCountRange: "#itemCountRange",
  itemCountValue: "#itemCountValue",
  mutationRatioRange: "#mutationRatioRange",
  mutationRatioValue: "#mutationRatioValue",
  tickCounter: "#tickCounter",
  streamHint: "#streamHint",
  benchmarkVdomRoot: "#benchmarkVdomRoot",
  benchmarkDirectRoot: "#benchmarkDirectRoot",
  vdomAvgLatency: "#vdomAvgLatency",
  vdomP95Latency: "#vdomP95Latency",
  vdomMutationTotal: "#vdomMutationTotal",
  redrawAvgLatency: "#redrawAvgLatency",
  redrawP95Latency: "#redrawP95Latency",
  redrawMutationTotal: "#redrawMutationTotal",
  graphCanvas: "#graphCanvas",
  graphScaleLabel: "#graphScaleLabel",
  patchAverageChip: "#patchAverageChip",
  performancePanel: "#performancePanel",
  benchmarkFeed: "#benchmarkFeed",
  realDomRoot: "#realDomRoot",
  testDomRoot: "#testDomRoot",
  sourceEditor: "#sourceEditor",
  patchButton: "#patchButton",
  backButton: "#backButton",
  forwardButton: "#forwardButton",
  resetButton: "#resetButton",
  syncSourceButton: "#syncSourceButton",
  currentStateLabel: "#currentStateLabel",
  currentStateDescription: "#currentStateDescription",
  editorMessage: "#editorMessage",
  patchSummary: "#patchSummary",
  historyMeta: "#historyMeta",
  diffLogPanel: "#diffLogPanel",
  historyPanel: "#historyPanel",
  treePanel: "#treePanel",
  treeMeta: "#treeMeta",
  depthMeta: "#depthMeta",
  dfsPanel: "#dfsPanel",
  bfsPanel: "#bfsPanel",
  explanationPanel: "#explanationPanel",
  treeNodeTemplate: "#treeNodeTemplate"
};

const MANUAL_SAMPLE_TEMPLATE = `
<div id="console-root" class="patch-sample" data-mode="stable">
  <section id="summary" class="sample-section" data-role="summary">
    <h1>Patch Lab Console</h1>
    <p>
      <strong>Virtual DOM</strong> patch 실험용 샘플입니다.
      <span class="sample-badge" data-key="phase">stable</span>
      상태를 텍스트, 속성, 자식 순서 관점에서 바꿔보세요.
    </p>
  </section>
  <section id="matrix" class="sample-section" data-role="matrix">
    <article class="sample-card" id="lane-a" data-key="lane-a">
      <h2>Lane A</h2>
      <p>text mutation candidate</p>
    </article>
    <article class="sample-card" id="lane-b" data-key="lane-b">
      <h2>Lane B</h2>
      <p>attribute mutation candidate</p>
    </article>
    <article class="sample-card" id="lane-c" data-key="lane-c">
      <h2>Lane C</h2>
      <p>reorder mutation candidate</p>
    </article>
  </section>
  <ul class="sample-list" data-list="alerts">
    <li data-key="cpu">CPU alert</li>
    <li data-key="memory">Memory alert</li>
    <li data-key="queue">Queue alert</li>
  </ul>
</div>
`.trim();

/* -------------------------------------------------------------------------- */
/* 2. state                                                                    */
/* -------------------------------------------------------------------------- */

const state = {
  ui: {
    listExpanded: false
  },
  manual: {
    realVNode: null,
    testVNode: null,
    patches: [],
    history: [],
    currentHistoryIndex: -1
  },
  benchmark: {
    running: false,
    timer: null,
    refreshTimer: null,
    tick: 0,
    config: {
      ...cloneValue(BENCHMARK_PRESETS.balanced),
      presetKey: "balanced"
    },
    model: null,
    vdomVNode: null,
    latestPatchCount: 0,
    latestNodeCount: 0,
    series: {
      vdom: [],
      redraw: [],
      patch: [],
      delta: []
    },
    feed: [],
    observers: {
      vdom: null,
      redraw: null
    },
    mutationTotals: {
      vdom: 0,
      redraw: 0
    },
    lastTickCost: 0,
    effectiveFrequency: 0,
    runStartedAt: 0,
    protectionState: "stable",
    burstRemaining: 0,
    lastStopReason: "manual"
  },
  graph: {
    frame: null,
    dirty: false
  }
};

window.toggleRuntimeList = function() {
  state.ui.listExpanded = !state.ui.listExpanded;
  
  const directWrappers = document.querySelectorAll("#benchmarkDirectRoot .runtime-list-wrapper");
  const directBtns = document.querySelectorAll("#benchmarkDirectRoot .runtime-list-toggle button");
  
  directWrappers.forEach(w => {
    w.className = `runtime-list-wrapper ${state.ui.listExpanded ? '' : 'is-collapsed'}`;
  });
  
  directBtns.forEach(b => {
    b.textContent = state.ui.listExpanded ? '접기 (가리기)' : '모든 노드 보기 (펼치기)';
  });

  if (!state.benchmark.running && state.benchmark.burstRemaining === 0) {
    if (state.benchmark.vdomVNode) {
      const nextVNode = renderBenchmarkVNode(state.benchmark.model);
      const patches = diff(state.benchmark.vdomVNode, nextVNode, "0", []);
      applyPatches(state.ui.benchmarkVdomRoot, patches, nextVNode);
      state.benchmark.vdomVNode = nextVNode;
    }
  }
};

/* -------------------------------------------------------------------------- */
/* 3. helper utils                                                             */
/* -------------------------------------------------------------------------- */

function getElements() {
  return Object.fromEntries(
    Object.entries(SELECTORS).map(([key, selector]) => [key, document.querySelector(selector)])
  );
}

function hasManualLabUi() {
  return Boolean(
    state.ui.realDomRoot &&
    state.ui.testDomRoot &&
    state.ui.sourceEditor &&
    state.ui.patchButton &&
    state.ui.historyPanel &&
    state.ui.treeNodeTemplate
  );
}

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeText(text) {
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
}

function formatMs(value) {
  return `${Number(value || 0).toFixed(2)}ms`;
}

function getMutationScopeText(itemCount, mutationRatio) {
  const changedCount = Math.max(1, Math.round(itemCount * mutationRatio));
  const percent = Math.round(mutationRatio * 100);
  return `${percent}% · 약 ${changedCount} nodes/tick`;
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, target) {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * target) - 1));
  return sorted[index];
}

function getPresetDefinition(presetKey) {
  return BENCHMARK_PRESETS[presetKey] || null;
}

function getCurrentPresetMeta() {
  const preset = getPresetDefinition(state.benchmark.config.presetKey);
  if (preset) {
    return preset;
  }
  return {
    label: "커스텀",
    description: "수동으로 조정된 스트림",
    mode: state.benchmark.config.mode
  };
}

function getLoadAdvisory(config = state.benchmark.config) {
  const readPressure = config.layoutReadEvery > 0 ? 8 / config.layoutReadEvery + config.rootLayoutReads * 1.2 : 0.3;
  const scanPressure = Math.max(1, config.imperativeScanPasses || 1) * (config.imperativeRequery ? 1.4 : 0.45);
  const loadScore = (config.frequency * config.itemCount / 32) * (1 + readPressure + scanPressure);

  if (loadScore >= 70) {
    return {
      label: "고부하 경고",
      reason: "스트림이 빠르고 layout read 압력이 높습니다",
      chipClass: "chip--rose"
    };
  }

  if (loadScore >= 25) {
    return {
      label: "부하 주의",
      reason: "브라우저 탭이 다소 무거워질 수 있습니다",
      chipClass: "chip--amber"
    };
  }

  return {
    label: "부하 안전",
    reason: "시연용 기본 부하 범위입니다",
    chipClass: "chip--green"
  };
}

function trimSeries(values, limit = GRAPH_POINT_LIMIT) {
  while (values.length > limit) {
    values.shift();
  }
}

function rotateArray(values, shift) {
  if (!values.length) {
    return [];
  }
  const normalized = ((shift % values.length) + values.length) % values.length;
  return values.slice(normalized).concat(values.slice(0, normalized));
}

function createRootContainer() {
  return VDOMEngine.createRootContainer();
}

function buildKey(attrs, fallbackKey) {
  return VDOMEngine.buildKey(attrs, fallbackKey);
}

function serializeHTML(node) {
  return VDOMEngine.serializeHTML(node);
}

function renderHTMLIntoTarget(target, html) {
  return VDOMEngine.renderHTMLIntoTarget(target, html);
}

function countNodes(vNode) {
  return VDOMEngine.countNodes(vNode);
}

function calculateMaxDepth(vNode) {
  return VDOMEngine.calculateMaxDepth(vNode);
}

function getNodeDescriptor(vNode) {
  return VDOMEngine.getNodeDescriptor(vNode);
}

function getReadableNodeSummary(vNode) {
  return VDOMEngine.getReadableNodeSummary(vNode);
}

function setManualStatus(label, description) {
  state.ui.currentStateLabel.textContent = label;
  state.ui.currentStateDescription.textContent = description;
}

/* -------------------------------------------------------------------------- */
/* 4. virtual dom utils                                                        */
/* -------------------------------------------------------------------------- */

function createElementVNode(tag, attrs = {}, children = []) {
  return VDOMEngine.createElementVNode(tag, attrs, children);
}

function createTextVNode(text) {
  return VDOMEngine.createTextVNode(text);
}

/*
  이 함수의 역할:
  실제 DOM 노드를 Virtual DOM 객체 트리로 변환한다.
  입력:
  DOM Node, 현재 path 문자열, depth 숫자
  출력:
  Virtual DOM 객체 또는 null
  왜 필요한지:
  브라우저가 관리하는 실제 DOM을 diff 가능한 메모리 상 객체 트리로 바꿔야 React-style 비교를 직접 구현할 수 있다.
*/
function domNodeToVNode(node, path, depth) {
  return VDOMEngine.domNodeToVNode(node, path, depth);
}

/*
  이 함수의 역할:
  DOM 컨테이너의 자식들을 읽어서 루트 래퍼 Virtual DOM으로 변환한다.
  입력:
  DOM Element 컨테이너
  출력:
  루트 Virtual DOM 객체
  왜 필요한지:
  비교 대상이 여러 루트 노드를 가질 수 있으므로 하나의 트리 루트로 감싸야 diff와 history를 단순하게 유지할 수 있다.
*/
function domToVNode(container) {
  return VDOMEngine.domToVNode(container);
}

function normalizeVNodePaths(vNode, path = "0", depth = 0) {
  return VDOMEngine.normalizeVNodePaths(vNode, path, depth);
}

/*
  이 함수의 역할:
  Virtual DOM 객체 하나를 실제 DOM 노드로 생성한다.
  입력:
  Virtual DOM 객체
  출력:
  DOM Node
  왜 필요한지:
  CREATE, REPLACE, REORDER 단계에서 메모리상의 Virtual DOM을 다시 실제 DOM 노드로 만들어야 patch를 적용할 수 있다.
*/
function createDOMFromVNode(vNode) {
  return VDOMEngine.createDOMFromVNode(vNode);
}

function renderVNodeToRoot(root, vNode) {
  return VDOMEngine.renderVNodeToRoot(root, vNode);
}

function findVNodeByPath(vNode, path) {
  return VDOMEngine.findVNodeByPath(vNode, path);
}

/* -------------------------------------------------------------------------- */
/* 5. traversal utils                                                          */
/* -------------------------------------------------------------------------- */

/*
  이 함수의 역할:
  Virtual DOM 트리를 깊이 우선 탐색으로 순회한다.
  입력:
  루트 Virtual DOM
  출력:
  방문 순서 배열
  왜 필요한지:
  Virtual DOM이 일반 트리라는 점과 depth 기반 방문 순서를 UI로 설명하기 위해 필요하다.
*/
function traverseDFS(root) {
  return VDOMEngine.traverseDFS(root);
}

/*
  이 함수의 역할:
  Virtual DOM 트리를 너비 우선 탐색으로 순회한다.
  입력:
  루트 Virtual DOM
  출력:
  방문 순서 배열
  왜 필요한지:
  레벨 순회를 통해 같은 depth에 있는 노드가 어떻게 배치되는지 보여주기 위해 필요하다.
*/
function traverseBFS(root) {
  return VDOMEngine.traverseBFS(root);
}

/* -------------------------------------------------------------------------- */
/* 6. diff engine                                                              */
/* -------------------------------------------------------------------------- */

/*
  이 함수의 역할:
  두 자식 배열을 비교해 생성, 삭제, 재정렬, 하위 diff를 계산한다.
  입력:
  이전 자식 배열, 새 자식 배열, 부모 path, patch 배열
  출력:
  patch 배열에 자식 관련 patch를 추가
  왜 필요한지:
  React-style reconciliation의 핵심은 형제 리스트 비교이므로 별도 단계로 분리해야 patch를 명확하게 설명할 수 있다.
*/
function diffChildren(oldChildren, newChildren, parentPath, patches) {
  return VDOMEngine.diffChildren(oldChildren, newChildren, parentPath, patches);
}

/*
  이 함수의 역할:
  이전 Virtual DOM과 새로운 Virtual DOM을 비교해 patch 목록을 만든다.
  입력:
  이전 Virtual DOM, 새 Virtual DOM, 현재 path, patch 배열
  출력:
  patch 배열
  왜 필요한지:
  실제 DOM에 들어가기 전에 메모리 상에서 변경점을 계산해야 최소 변경 방식이 가능하다.
*/
function diff(oldNode, newNode, path = "0", patches = []) {
  return VDOMEngine.diff(oldNode, newNode, path, patches);
}

/* -------------------------------------------------------------------------- */
/* 7. patch engine                                                             */
/* -------------------------------------------------------------------------- */

/*
  이 함수의 역할:
  patch 배열을 실제 DOM에 순서 있게 적용한다.
  입력:
  실제 DOM 루트, patch 배열, 새 Virtual DOM 루트
  출력:
  없음. 실제 DOM이 직접 갱신된다.
  왜 필요한지:
  diff 결과를 실제 화면 변화로 연결하는 단계이며, Virtual DOM의 핵심 가치는 바로 여기서 드러난다.
*/
function applyPatches(root, patches, newVNodeRoot) {
  VDOMEngine.applyPatches(root, patches, newVNodeRoot);

  if (state.benchmark.running || state.benchmark.burstRemaining > 0) {
    state.benchmark.mutationTotals.vdom += patches.length;
  }
}

/* -------------------------------------------------------------------------- */
/* 8. history manager                                                          */
/* -------------------------------------------------------------------------- */

function serializeVNodeChildrenToHTML(vNode) {
  return VDOMEngine.serializeVNodeChildrenToHTML(vNode);
}

function createHistorySnapshot(label, description, vNode, patches) {
  return {
    id: Date.now() + Math.random(),
    label,
    description,
    vNode: cloneValue(vNode),
    patches: cloneValue(patches),
    timestamp: new Date().toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  };
}

/*
  이 함수의 역할:
  현재 Virtual DOM 상태를 history 배열에 push하고 currentIndex를 갱신한다.
  입력:
  상태 라벨, 상태 설명, Virtual DOM, patch 배열
  출력:
  없음. history와 currentIndex가 갱신된다.
  왜 필요한지:
  patch 결과를 이전 상태와 비교하고 되돌리려면 시점별 스냅샷이 필요하다.
*/
function pushHistory(label, description, vNode, patches) {
  if (state.manual.currentHistoryIndex < state.manual.history.length - 1) {
    state.manual.history = state.manual.history.slice(0, state.manual.currentHistoryIndex + 1);
  }
  state.manual.history.push(createHistorySnapshot(label, description, vNode, patches));
  state.manual.currentHistoryIndex = state.manual.history.length - 1;
}

function restoreSnapshot(snapshot) {
  if (!snapshot) {
    return;
  }
  state.manual.realVNode = cloneValue(snapshot.vNode);
  state.manual.testVNode = cloneValue(snapshot.vNode);
  state.manual.patches = cloneValue(snapshot.patches || []);
  renderVNodeToRoot(state.ui.realDomRoot, state.manual.realVNode);
  renderVNodeToRoot(state.ui.testDomRoot, state.manual.testVNode);
  syncSourceEditorFromTest();
  setManualStatus(snapshot.label, snapshot.description);
  renderManualPanels();
}

/*
  이 함수의 역할:
  history 인덱스를 하나 뒤로 이동시키고 해당 상태를 복원한다.
  입력:
  없음
  출력:
  없음
  왜 필요한지:
  diff 이후 이전 Virtual DOM 상태로 안전하게 되돌리는 검증 흐름이 필요하다.
*/
function goBack() {
  if (state.manual.currentHistoryIndex <= 0) {
    return;
  }
  state.manual.currentHistoryIndex -= 1;
  restoreSnapshot(state.manual.history[state.manual.currentHistoryIndex]);
}

/*
  이 함수의 역할:
  history 인덱스를 하나 앞으로 이동시키고 해당 상태를 복원한다.
  입력:
  없음
  출력:
  없음
  왜 필요한지:
  undo 이후 다시 최신 상태로 이동하는 redo 흐름을 검증하기 위해 필요하다.
*/
function goForward() {
  if (state.manual.currentHistoryIndex >= state.manual.history.length - 1) {
    return;
  }
  state.manual.currentHistoryIndex += 1;
  restoreSnapshot(state.manual.history[state.manual.currentHistoryIndex]);
}

/* -------------------------------------------------------------------------- */
/* 9. benchmark model                                                          */
/* -------------------------------------------------------------------------- */

function createBenchmarkItem(index) {
  const basePrice = 119000 + (index % 7) * 9000;
  return {
    id: `node-${index + 1}`,
    name: `Node ${String(index + 1).padStart(3, "0")}`,
    lane: `lane-${(index % 4) + 1}`,
    basePrice,
    price: basePrice,
    message: `watch ${12 + (index % 5)}ms`,
    hot: index < 4,
    pressure: ["low", "mid", "high"][index % 3],
    stock: 120 - (index % 10) * 7
  };
}

function buildAlerts(model, mode) {
  const alerts = [
    { id: "queue", text: `queue depth ${model.queueDepth}` },
    { id: "mode", text: `${MODE_LABELS[mode]} stream active` }
  ];

  if (model.phase === "pressure" || model.phase === "peak") {
    alerts.push({ id: "pressure", text: `${model.phase} phase: patch pressure rising` });
  }

  if (model.tick % 5 === 0) {
    alerts.push({ id: "gc", text: `heap scan ${20 + (model.tick % 9)}ms window` });
  }

  return alerts;
}

function createBenchmarkModel(itemCount) {
  const model = {
    tick: 0,
    phase: BENCHMARK_PHASES[0],
    queueDepth: 42,
    throughput: state.benchmark.config.frequency,
    items: Array.from({ length: itemCount }, (_, index) => createBenchmarkItem(index)),
    alerts: [],
    summary: {
      patchHint: "idle",
      redrawHint: "idle"
    }
  };
  model.alerts = buildAlerts(model, state.benchmark.config.mode);
  return model;
}

function mutateItemText(item, tick, index) {
  const priceDelta = (((tick + index) % 5) - 2) * 1000;
  item.price = item.basePrice + priceDelta;
  item.message = `watch ${10 + ((tick * 3 + index) % 17)}ms`;
  item.stock = Math.max(4, item.stock - ((tick + index) % 3));
}

function mutateItemAttrs(item, tick, index) {
  item.hot = (tick + index) % 11 === 0 || (tick + index) % 17 === 0;
  item.pressure = ["low", "mid", "high", "burst"][(tick + index) % 4];
}

function mutateBenchmarkModel(previousModel, tick, mode) {
  const next = {
    ...previousModel,
    items: previousModel.items.map(item => ({ ...item })),
    summary: { ...previousModel.summary }
  };
  const length = next.items.length;
  const focusSize = Math.max(1, Math.min(length, Math.round(length * state.benchmark.config.mutationRatio)));
  const focusStart = (tick * 3) % Math.max(length, 1);
  const focusIndexes = new Set(
    Array.from({ length: focusSize }, (_, offset) => (focusStart + offset) % Math.max(length, 1))
  );

  next.tick = tick;
  next.phase = BENCHMARK_PHASES[Math.floor(tick / 3) % BENCHMARK_PHASES.length];
  next.queueDepth = 40 + ((tick * 17) % 320);
  next.throughput = state.benchmark.config.frequency;

  next.items.forEach((item, index) => {
    if ((mode === "text" || mode === "mixed") && focusIndexes.has(index)) {
      mutateItemText(item, tick, index);
    }
    if ((mode === "attr" || mode === "mixed") && focusIndexes.has(index)) {
      mutateItemAttrs(item, tick, index);
    }
  });

  if ((mode === "list" || mode === "mixed") && tick % state.benchmark.config.reorderEvery === 0) {
    const shift = tick % Math.max(1, Math.min(next.items.length, 6));
    next.items = rotateArray(next.items, shift);
  }

  next.alerts = buildAlerts(next, mode);
  next.summary.patchHint = next.phase === "peak" ? "many small patches" : "incremental update";
  next.summary.redrawHint = next.phase === "peak" ? "imperative walk under pressure" : "manual DOM walk";
  return next;
}

function applyImperativeBenchmarkUpdate(root, model) {
  const shell = root.querySelector(".runtime-shell");
  const cards = Array.from(root.querySelectorAll(".runtime-node"));
  const layoutReadEvery = state.benchmark.config.layoutReadEvery;
  const rootLayoutReads = state.benchmark.config.rootLayoutReads;
  const scanPasses = Math.max(1, state.benchmark.config.imperativeScanPasses || 1);
  const imperativeRequery = Boolean(state.benchmark.config.imperativeRequery);
  if (!shell || cards.length !== model.items.length) {
    root.innerHTML = renderBenchmarkHTML(model);
    return;
  }

  shell.dataset.phase = model.phase;
  shell.dataset.tick = String(model.tick);
  shell.querySelector(".runtime-shell__title").textContent = `${model.phase} stream`;
  shell.querySelector(".runtime-shell__header .runtime-badge").textContent = `tick ${model.tick}`;
  shell.querySelector(".runtime-dashboard__hero h3").textContent = model.summary.redrawHint;
  shell.querySelector(".runtime-dashboard__hero p").textContent = `queue depth ${model.queueDepth} / throughput ${model.throughput} tps`;

  const kpis = shell.querySelectorAll(".runtime-kpi strong");
  if (kpis[0]) {
    kpis[0].textContent = String(model.queueDepth);
  }
  if (kpis[1]) {
    kpis[1].textContent = String(model.items.length);
  }
  if (kpis[2]) {
    kpis[2].textContent = model.phase;
  }

  const alertsRoot = shell.querySelector(".runtime-alerts");
  alertsRoot.innerHTML = model.alerts
    .map((alert) => `<div class="runtime-alert" data-key="${escapeHTML(alert.id)}">${escapeHTML(alert.text)}</div>`)
    .join("");

  let mutations = 0;
  model.items.forEach((item, index) => {
    const card = cards[index];

    if (card.dataset.key !== String(item.id)) { card.dataset.key = item.id; mutations++; }
    const hotStr = item.hot ? "true" : "false";
    if (card.dataset.hot !== hotStr) { card.dataset.hot = hotStr; mutations++; }
    if (card.dataset.pressure !== item.pressure) { card.dataset.pressure = item.pressure; mutations++; }

    if (!card._ui) {
      card._ui = {
        title: card.querySelector(".runtime-node__title"),
        stats: card.querySelector(".runtime-node__stats")
      };
    }
    const ui = card._ui;

    const titleText = `${item.name} · ${item.lane}`;
    if (ui.title.textContent !== titleText) { ui.title.textContent = titleText; mutations++; }

    const statsText = `₩${item.price.toLocaleString("ko-KR")} · ${item.stock} left`;
    if (ui.stats.textContent !== statsText) { ui.stats.textContent = statsText; mutations++; }

    if (layoutReadEvery > 0 && index % layoutReadEvery === 0) {
      void card.offsetHeight;
    }
  });

  for (let pass = 1; pass < scanPasses; pass += 1) {
    const scanCards = imperativeRequery
      ? Array.from(root.querySelectorAll(".runtime-node"))
      : cards;

    scanCards.forEach((card, index) => {
      const titleNode = imperativeRequery
        ? card.querySelector(".runtime-node__title")
        : card._ui?.title;
      const statsNode = imperativeRequery
        ? card.querySelector(".runtime-node__stats")
        : card._ui?.stats;

      if (titleNode) {
        void titleNode.textContent;
      }
      if (statsNode) {
        void statsNode.textContent;
      }
      if (layoutReadEvery > 0 && index % layoutReadEvery === 0) {
        void card.offsetHeight;
      }
    });

    if (imperativeRequery) {
      root.querySelectorAll(".runtime-kpi strong").forEach((node) => {
        void node.textContent;
      });
    }
  }

  for (let index = 0; index < rootLayoutReads; index += 1) {
    void root.offsetHeight;
  }

  if (state.benchmark.running || state.benchmark.burstRemaining > 0) {
    state.benchmark.mutationTotals.redraw += mutations;
  }
}

function renderBenchmarkHTML(model) {
  const alertHTML = model.alerts
    .map((alert) => `<div class="runtime-alert" data-key="${escapeHTML(alert.id)}">${escapeHTML(alert.text)}</div>`)
    .join("");

  const listHTML = model.items
    .map(
      (item) => `
        <article class="runtime-node" data-key="${escapeHTML(item.id)}" data-hot="${item.hot ? "true" : "false"}" data-pressure="${escapeHTML(item.pressure)}">
          <strong class="runtime-node__title">${escapeHTML(item.name)} · ${escapeHTML(item.lane)}</strong>
          <span class="runtime-node__stats">₩${escapeHTML(item.price.toLocaleString("ko-KR"))} · ${escapeHTML(String(item.stock))} left</span>
        </article>
      `
    )
    .join("");

  return `
    <div class="runtime-shell" data-phase="${escapeHTML(model.phase)}" data-tick="${escapeHTML(String(model.tick))}">
      <div class="runtime-shell__header">
        <strong class="runtime-shell__title">${escapeHTML(model.phase)} stream</strong>
        <span class="runtime-badge">tick ${escapeHTML(String(model.tick))}</span>
      </div>
      <div class="runtime-dashboard">
        <div class="runtime-dashboard__hero">
          <h3>${escapeHTML(model.summary.patchHint)}</h3>
          <p>queue depth ${escapeHTML(String(model.queueDepth))} / throughput ${escapeHTML(String(model.throughput))} tps</p>
        </div>
        <div class="runtime-kpis">
          <div class="runtime-kpi"><span>queue</span><strong>${escapeHTML(String(model.queueDepth))}</strong></div>
          <div class="runtime-kpi"><span>nodes</span><strong>${escapeHTML(String(model.items.length))}</strong></div>
          <div class="runtime-kpi"><span>phase</span><strong>${escapeHTML(model.phase)}</strong></div>
        </div>
        <div class="runtime-alerts">${alertHTML}</div>
        <div class="runtime-list-wrapper ${state.ui.listExpanded ? '' : 'is-collapsed'}">
          <div class="runtime-list-container">
            <div class="runtime-list">${listHTML}</div>
            <div class="runtime-list-fade"></div>
          </div>
          <div class="runtime-list-toggle">
            <button class="button button--primary button--small" onclick="window.toggleRuntimeList()">
              ${state.ui.listExpanded ? '접기 (가리기)' : '모든 노드 보기 (펼치기)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderBenchmarkVNode(model) {
  const root = createRootContainer();
  const alertNodes = model.alerts.map((alert) =>
    createElementVNode("div", { class: "runtime-alert", "data-key": alert.id }, [alert.text])
  );

  const listNodes = model.items.map((item) =>
    createElementVNode("article", {
      class: "runtime-node",
      "data-key": item.id,
      "data-hot": item.hot ? "true" : "false",
      "data-pressure": item.pressure
    }, [
      createElementVNode("strong", { class: "runtime-node__title" }, [`${item.name} · ${item.lane}`]),
      createElementVNode("span", { class: "runtime-node__stats" }, [`₩${item.price.toLocaleString("ko-KR")} · ${item.stock} left`])
    ])
  );

  root.children.push(
    createElementVNode("div", {
      class: "runtime-shell",
      "data-phase": model.phase,
      "data-tick": String(model.tick)
    }, [
      createElementVNode("div", { class: "runtime-shell__header" }, [
        createElementVNode("strong", { class: "runtime-shell__title" }, [`${model.phase} stream`]),
        createElementVNode("span", { class: "runtime-badge" }, [`tick ${model.tick}`])
      ]),
      createElementVNode("div", { class: "runtime-dashboard" }, [
        createElementVNode("div", { class: "runtime-dashboard__hero" }, [
          createElementVNode("h3", {}, [model.summary.patchHint]),
          createElementVNode("p", {}, [`queue depth ${model.queueDepth} / throughput ${model.throughput} tps`])
        ]),
        createElementVNode("div", { class: "runtime-kpis" }, [
          createElementVNode("div", { class: "runtime-kpi" }, [
            createElementVNode("span", {}, ["queue"]),
            createElementVNode("strong", {}, [String(model.queueDepth)])
          ]),
          createElementVNode("div", { class: "runtime-kpi" }, [
            createElementVNode("span", {}, ["nodes"]),
            createElementVNode("strong", {}, [String(model.items.length)])
          ]),
          createElementVNode("div", { class: "runtime-kpi" }, [
            createElementVNode("span", {}, ["phase"]),
            createElementVNode("strong", {}, [model.phase])
          ])
        ]),
        createElementVNode("div", { class: "runtime-alerts" }, alertNodes),
        createElementVNode("div", { class: `runtime-list-wrapper ${state.ui.listExpanded ? "" : "is-collapsed"}` }, [
          createElementVNode("div", { class: "runtime-list-container" }, [
            createElementVNode("div", { class: "runtime-list" }, listNodes),
            createElementVNode("div", { class: "runtime-list-fade" }, [])
          ]),
          createElementVNode("div", { class: "runtime-list-toggle" }, [
            createElementVNode("button", {
              class: "button button--primary button--small",
              onclick: "window.toggleRuntimeList()"
            }, [state.ui.listExpanded ? "접기 (가리기)" : "모든 노드 보기 (펼치기)"])
          ])
        ])
      ])
    ])
  );

  return normalizeVNodePaths(root);
}

function syncBenchmarkControls() {
  state.ui.mutationModeSelect.value = state.benchmark.config.mode;
  state.ui.frequencyRange.value = String(state.benchmark.config.frequency);
  state.ui.frequencyValue.textContent = String(state.benchmark.config.frequency);
  state.ui.itemCountRange.value = String(state.benchmark.config.itemCount);
  state.ui.itemCountValue.textContent = `${state.benchmark.config.itemCount} nodes`;
  state.ui.mutationRatioRange.value = String(Math.round(state.benchmark.config.mutationRatio * 100));
  state.ui.mutationRatioValue.textContent = getMutationScopeText(
    state.benchmark.config.itemCount,
    state.benchmark.config.mutationRatio
  );
}

function renderBenchmarkPresetState() {
  const preset = getCurrentPresetMeta();
  const advisory = getLoadAdvisory();

  state.ui.presetLabelChip.textContent = preset.label;
  state.ui.loadReasonChip.textContent = preset.description || advisory.reason;
  state.ui.loadWarningChip.textContent = advisory.label;
  state.ui.loadWarningChip.className = `chip ${advisory.chipClass}`;
}

function applyBenchmarkPreset(presetKey) {
  const preset = getPresetDefinition(presetKey);
  if (!preset) {
    return;
  }

  Object.assign(state.benchmark.config, cloneValue(preset), { presetKey });
  syncBenchmarkControls();
  renderBenchmarkPresetState();
  resetBenchmark();
}

function markBenchmarkConfigCustom() {
  state.benchmark.config.presetKey = "custom";
  renderBenchmarkPresetState();
}

/* -------------------------------------------------------------------------- */
/* 10. benchmark engine                                                        */
/* -------------------------------------------------------------------------- */

function clearBenchmarkTimer() {
  if (state.benchmark.timer) {
    window.clearTimeout(state.benchmark.timer);
    state.benchmark.timer = null;
  }
}

function clearBenchmarkRefreshTimer() {
  if (state.benchmark.refreshTimer) {
    window.clearTimeout(state.benchmark.refreshTimer);
    state.benchmark.refreshTimer = null;
  }
}

function scheduleGraphDraw() {
  state.graph.dirty = true;
  if (state.graph.frame) {
    return;
  }

  state.graph.frame = window.requestAnimationFrame(() => {
    state.graph.frame = null;
    if (!state.graph.dirty) {
      return;
    }
    state.graph.dirty = false;
    drawGraph();
  });
}

function flushBenchmarkUi() {
  renderBenchmarkMetrics();
  renderBenchmarkFeed();
  renderPerformancePanel();
  scheduleGraphDraw();
}

function scheduleBenchmarkUiRefresh() {
  if (state.benchmark.refreshTimer) {
    return;
  }

  state.benchmark.refreshTimer = window.setTimeout(() => {
    state.benchmark.refreshTimer = null;
    flushBenchmarkUi();
  }, BENCHMARK_UI_REFRESH_MS);
}

function updateBenchmarkStatusText(reason = state.benchmark.lastStopReason || "streaming") {
  const requestedHz = state.benchmark.config.frequency;
  const effectiveHz = state.benchmark.effectiveFrequency || requestedHz;
  const advisory = getLoadAdvisory();

  if (reason === "timeout") {
    state.ui.benchmarkStatus.textContent = "cooldown";
    state.ui.streamHint.textContent = `브라우저 클릭 응답성을 지키기 위해 ${BENCHMARK_MAX_CONTINUOUS_MS / 1000}초 연속 실행 후 자동 중지했습니다.`;
    return;
  }

  if (reason === "hidden") {
    state.ui.benchmarkStatus.textContent = "paused";
    state.ui.streamHint.textContent = "숨겨진 탭에서 불필요한 부하를 막기 위해 스트림을 자동 중지했습니다.";
    return;
  }

  if (reason === "burst-done") {
    state.ui.benchmarkStatus.textContent = "burst done";
    state.ui.streamHint.textContent = `${BENCHMARK_BURST_TICKS}회의 버스트를 완료했습니다. 그래프와 평균값을 비교해보세요.`;
    return;
  }

  if (reason === "burst") {
    state.ui.benchmarkStatus.textContent = "bursting";
    state.ui.streamHint.textContent = `버스트를 분할 실행 중입니다. 현재 부하는 ${advisory.label} 단계입니다.`;
    return;
  }

  if (!state.benchmark.running) {
    state.ui.benchmarkStatus.textContent = "idle";
    state.ui.streamHint.textContent = "연속 시작을 누르면 같은 상태 변화가 두 런타임에 동시에 주입됩니다.";
    return;
  }

  if (state.benchmark.protectionState === "throttled" && effectiveHz < requestedHz) {
    state.ui.benchmarkStatus.textContent = "protected";
    state.ui.streamHint.textContent = `요청 ${requestedHz} ticks/sec, 현재는 UI 보호를 위해 약 ${effectiveHz.toFixed(1)} ticks/sec로 자동 감속 중입니다.`;
    return;
  }

  state.ui.benchmarkStatus.textContent = "streaming";
  state.ui.streamHint.textContent = `${requestedHz} ticks/sec로 ${MODE_LABELS[state.benchmark.config.mode]} mutation을 반복 주입 중입니다. 현재 부하는 ${advisory.label} 단계입니다.`;
}

function stopBenchmark(reason = "manual") {
  state.benchmark.running = false;
  state.benchmark.burstRemaining = 0;
  state.benchmark.lastStopReason = reason;
  clearBenchmarkTimer();
  clearBenchmarkRefreshTimer();
  updateBenchmarkStatusText(reason);
}

function setupBenchmarkObservers() {
  Object.values(state.benchmark.observers).forEach((observer) => observer && observer.disconnect());
  state.benchmark.observers = { vdom: null, redraw: null };
}

function recordBenchmarkEntry(entry) {
  state.benchmark.feed.unshift(entry);
  state.benchmark.feed = state.benchmark.feed.slice(0, BENCHMARK_FEED_LIMIT);
}

function runBenchmarkTick() {
  const nextTick = state.benchmark.tick + 1;
  const nextModel = mutateBenchmarkModel(state.benchmark.model, nextTick, state.benchmark.config.mode);
  const nextVNode = renderBenchmarkVNode(nextModel);

  const vdomStart = performance.now();
  const patches = diff(state.benchmark.vdomVNode, nextVNode, "0", []);
  applyPatches(state.ui.benchmarkVdomRoot, patches, nextVNode);
  const vdomDuration = performance.now() - vdomStart;

  const redrawStart = performance.now();
  applyImperativeBenchmarkUpdate(state.ui.benchmarkDirectRoot, nextModel);
  const redrawDuration = performance.now() - redrawStart;

  state.benchmark.tick = nextTick;
  state.benchmark.model = nextModel;
  state.benchmark.vdomVNode = nextVNode;
  state.benchmark.latestPatchCount = patches.length;
  state.benchmark.latestNodeCount = countNodes(nextVNode);

  state.benchmark.series.vdom.push(vdomDuration);
  state.benchmark.series.redraw.push(redrawDuration);
  state.benchmark.series.patch.push(patches.length);
  state.benchmark.series.delta.push(redrawDuration - vdomDuration);

  trimSeries(state.benchmark.series.vdom);
  trimSeries(state.benchmark.series.redraw);
  trimSeries(state.benchmark.series.patch);
  trimSeries(state.benchmark.series.delta);

  recordBenchmarkEntry({
    tick: nextTick,
    phase: nextModel.phase,
    mode: state.benchmark.config.mode,
    vdom: vdomDuration,
    redraw: redrawDuration,
    patchCount: patches.length,
    delta: redrawDuration - vdomDuration
  });

  scheduleBenchmarkUiRefresh();
}

function getBenchmarkScheduledDelay() {
  const baseDelay = 1000 / Math.max(1, state.benchmark.config.frequency);
  const guardedDelay = state.benchmark.lastTickCost > 0
    ? state.benchmark.lastTickCost / BENCHMARK_TARGET_UTILIZATION
    : 0;

  return Math.max(BENCHMARK_MIN_DELAY_MS, baseDelay, guardedDelay);
}

function scheduleNextBenchmarkTick() {
  if (!state.benchmark.running) {
    return;
  }

  const elapsed = performance.now() - state.benchmark.runStartedAt;
  if (elapsed >= BENCHMARK_MAX_CONTINUOUS_MS) {
    stopBenchmark("timeout");
    return;
  }

  const delay = getBenchmarkScheduledDelay();
  const requestedDelay = 1000 / Math.max(1, state.benchmark.config.frequency);
  state.benchmark.effectiveFrequency = 1000 / delay;
  state.benchmark.protectionState = delay > requestedDelay * 1.1 ? "throttled" : "stable";
  updateBenchmarkStatusText();

  state.benchmark.timer = window.setTimeout(() => {
    state.benchmark.timer = null;
    if (!state.benchmark.running) {
      return;
    }

    const tickStartedAt = performance.now();
    runBenchmarkTick();
    state.benchmark.lastTickCost = performance.now() - tickStartedAt;
    scheduleNextBenchmarkTick();
  }, delay);
}

function startBenchmark() {
  if (state.benchmark.running) {
    clearBenchmarkTimer();
  }

  state.benchmark.running = true;
  state.benchmark.runStartedAt = performance.now();
  state.benchmark.protectionState = "stable";
  state.benchmark.lastStopReason = "streaming";
  updateBenchmarkStatusText();
  scheduleNextBenchmarkTick();
}

function runBenchmarkBurst() {
  stopBenchmark();
  state.benchmark.burstRemaining = BENCHMARK_BURST_TICKS;
  updateBenchmarkStatusText("burst");

  function stepBurst() {
    if (state.benchmark.burstRemaining <= 0) {
      state.benchmark.burstRemaining = 0;
      state.benchmark.lastStopReason = "burst-done";
      state.ui.benchmarkStatus.textContent = "burst done";
      state.ui.streamHint.textContent = `${BENCHMARK_BURST_TICKS}회의 버스트를 완료했습니다. 그래프와 평균값을 비교해보세요.`;
      flushBenchmarkUi();
      return;
    }

    const chunkSize = Math.min(3, state.benchmark.burstRemaining);
    for (let index = 0; index < chunkSize; index += 1) {
      runBenchmarkTick();
    }
    state.benchmark.burstRemaining -= chunkSize;
    state.benchmark.timer = window.setTimeout(stepBurst, 0);
  }

  stepBurst();
}

function resetBenchmark() {
  stopBenchmark();
  syncBenchmarkControls();
  renderBenchmarkPresetState();

  state.benchmark.tick = 0;
  state.benchmark.series = { vdom: [], redraw: [], patch: [], delta: [] };
  state.benchmark.feed = [];
  state.benchmark.mutationTotals = { vdom: 0, redraw: 0 };
  state.benchmark.latestPatchCount = 0;
  state.benchmark.lastTickCost = 0;
  state.benchmark.effectiveFrequency = state.benchmark.config.frequency;
  state.benchmark.protectionState = "stable";
  state.benchmark.runStartedAt = 0;
  state.benchmark.burstRemaining = 0;
  state.benchmark.lastStopReason = "manual";

  state.benchmark.model = createBenchmarkModel(state.benchmark.config.itemCount);
  state.benchmark.vdomVNode = renderBenchmarkVNode(state.benchmark.model);
  state.benchmark.latestNodeCount = countNodes(state.benchmark.vdomVNode);

  renderVNodeToRoot(state.ui.benchmarkVdomRoot, state.benchmark.vdomVNode);
  state.ui.benchmarkDirectRoot.innerHTML = renderBenchmarkHTML(state.benchmark.model);

  setupBenchmarkObservers();
  flushBenchmarkUi();
}

/* -------------------------------------------------------------------------- */
/* 11. manual patch lab                                                        */
/* -------------------------------------------------------------------------- */

function syncSourceEditorFromTest() {
  state.ui.sourceEditor.value = serializeHTML(state.ui.testDomRoot);
}

function syncTestFromSourceEditor() {
  const rawHTML = state.ui.sourceEditor.value.trim();
  const error = renderHTMLIntoTarget(state.ui.testDomRoot, rawHTML);
  state.ui.editorMessage.textContent = error
    ? `HTML 파서 경고: ${error.message}`
    : "소스 에디터의 HTML을 테스트 영역에 반영했습니다.";
}

function formatPatchDetail(patch) {
  switch (patch.type) {
    case PATCH_TYPES.CREATE:
      return `새 노드 ${getNodeDescriptor(patch.node)} 생성`;
    case PATCH_TYPES.REMOVE:
      return `기존 노드 ${getNodeDescriptor(patch.node)} 제거`;
    case PATCH_TYPES.REPLACE:
      return `${getNodeDescriptor(patch.oldNode)} -> ${getNodeDescriptor(patch.newNode)} 교체`;
    case PATCH_TYPES.TEXT:
      return `"${sanitizeText(patch.oldText)}" -> "${sanitizeText(patch.newText)}"`;
    case PATCH_TYPES.ATTR_SET:
      return `속성 ${patch.name} = "${patch.value}" 설정`;
    case PATCH_TYPES.ATTR_REMOVE:
      return `속성 ${patch.name} 제거`;
    case PATCH_TYPES.REORDER_CHILDREN:
      return "형제 노드 순서 변경";
    default:
      return "변경 없음";
  }
}

function renderPatchLog() {
  const panel = state.ui.diffLogPanel;
  panel.innerHTML = "";

  if (!state.manual.patches.length) {
    panel.innerHTML = `
      <div class="log-item">
        <div class="log-item__head">
          <span class="patch-badge" data-type="TEXT">NO-OP</span>
          <strong>변경 없음</strong>
        </div>
        <p>이전 Virtual DOM과 테스트 영역 Virtual DOM이 동일합니다.</p>
      </div>
    `;
    return;
  }

  state.manual.patches.forEach((patch, index) => {
    const item = document.createElement("div");
    item.className = "log-item";
    item.innerHTML = `
      <div class="log-item__head">
        <span class="patch-badge" data-type="${patch.type}">${patch.type}</span>
        <strong>#${index + 1}</strong>
      </div>
      <p>${escapeHTML(formatPatchDetail(patch))}</p>
    `;
    panel.appendChild(item);
  });
}

function renderHistoryPanel() {
  const panel = state.ui.historyPanel;
  panel.innerHTML = "";

  state.manual.history.forEach((entry, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-card ${index === state.manual.currentHistoryIndex ? "is-active" : ""}`;
    button.dataset.historyIndex = String(index);
    button.innerHTML = `
      <div class="history-card__top">
        <span class="history-card__title">${escapeHTML(entry.label)}</span>
        <span class="chip chip--slate">${index}</span>
      </div>
      <div class="history-card__meta">${escapeHTML(entry.timestamp)}</div>
      <p>${escapeHTML(entry.description)}</p>
    `;
    panel.appendChild(button);
  });
}

function renderTreeNode(vNode) {
  const fragment = state.ui.treeNodeTemplate.content.cloneNode(true);
  const wrapper = fragment.querySelector(".tree-node");
  wrapper.style.marginLeft = `${vNode.depth * 14}px`;
  fragment.querySelector(".tree-node__tag").textContent = getNodeDescriptor(vNode);
  fragment.querySelector(".tree-node__path").textContent = vNode.path;
  fragment.querySelector(".tree-node__meta").textContent = getReadableNodeSummary(vNode);
  return fragment;
}

function renderTreePanel() {
  const panel = state.ui.treePanel;
  panel.innerHTML = "";
  const entries = traverseDFS(state.manual.realVNode);
  const MAX_VISIBLE = 20;

  entries.forEach((entry, index) => {
    if (index >= MAX_VISIBLE && !state.ui.treePanelExpanded) return;
    const node = findVNodeByPath(state.manual.realVNode, entry.path);
    if (node) {
      panel.appendChild(renderTreeNode(node));
    }
  });

  if (entries.length > MAX_VISIBLE) {
    const btn = document.createElement("button");
    btn.className = "button button--ghost";
    btn.style.width = "100%";
    btn.style.marginTop = "8px";
    if (state.ui.treePanelExpanded) {
      btn.textContent = "접기 (Show Less)";
      btn.onclick = () => {
        state.ui.treePanelExpanded = false;
        renderTreePanel();
      };
    } else {
      btn.textContent = `전체 보기 (${entries.length - MAX_VISIBLE}개 더보기)`;
      btn.onclick = () => {
        state.ui.treePanelExpanded = true;
        renderTreePanel();
      };
    }
    panel.appendChild(btn);
  }
}

function renderTraversal(panel, sequence) {
  panel.innerHTML = "";
  const list = document.createElement("ol");
  list.className = "sequence-list";
  sequence.forEach((entry, index) => {
    const item = document.createElement("li");
    item.textContent = `${index + 1}. ${entry.label} @ ${entry.path} (depth ${entry.depth})`;
    list.appendChild(item);
  });
  panel.appendChild(list);
}

function renderManualPanels() {
  renderPatchLog();
  renderHistoryPanel();
  renderTreePanel();
  renderTraversal(state.ui.dfsPanel, traverseDFS(state.manual.realVNode));
  renderTraversal(state.ui.bfsPanel, traverseBFS(state.manual.realVNode));

  state.ui.patchSummary.textContent = `${state.manual.patches.length} patches`;
  state.ui.historyMeta.textContent = `${state.manual.currentHistoryIndex + 1} / ${state.manual.history.length}`;
  state.ui.treeMeta.textContent = `nodes: ${countNodes(state.manual.realVNode)}`;
  state.ui.depthMeta.textContent = `depth: ${calculateMaxDepth(state.manual.realVNode)}`;

  state.ui.backButton.disabled = state.manual.currentHistoryIndex <= 0;
  state.ui.forwardButton.disabled = state.manual.currentHistoryIndex >= state.manual.history.length - 1;
}

function resetManualLab() {
  renderHTMLIntoTarget(state.ui.realDomRoot, MANUAL_SAMPLE_TEMPLATE);
  const initialVNode = normalizeVNodePaths(domToVNode(state.ui.realDomRoot));
  state.manual.realVNode = cloneValue(initialVNode);
  state.manual.testVNode = cloneValue(initialVNode);
  state.manual.patches = [];
  state.manual.history = [];
  state.manual.currentHistoryIndex = -1;

  renderVNodeToRoot(state.ui.testDomRoot, state.manual.testVNode);
  syncSourceEditorFromTest();

  pushHistory("초기 상태", "실제 DOM을 Virtual DOM으로 바꾸고 테스트 영역을 생성한 상태", state.manual.realVNode, []);
  setManualStatus("초기 상태", "테스트 영역을 수정한 뒤 Patch를 누르면 diff 결과가 실제 영역에만 최소 변경으로 반영됩니다.");
  state.ui.editorMessage.textContent = "테스트 영역이나 HTML 소스를 수정한 뒤 Patch를 실행하세요.";
  renderManualPanels();
}

function handlePatch() {
  const newVNode = normalizeVNodePaths(domToVNode(state.ui.testDomRoot));
  const patches = diff(state.manual.realVNode, newVNode, "0", []);
  state.manual.patches = patches;

  if (patches.length) {
    applyPatches(state.ui.realDomRoot, patches, newVNode);
    state.manual.realVNode = normalizeVNodePaths(domToVNode(state.ui.realDomRoot));
    state.manual.testVNode = cloneValue(newVNode);
    pushHistory(
      `Patch #${state.manual.history.length}`,
      `${patches.length}개 patch가 실제 영역에 반영된 상태`,
      state.manual.realVNode,
      patches
    );
    setManualStatus("Patch 적용 완료", `${patches.length}개의 patch가 실제 DOM에 반영되었습니다.`);
  } else {
    state.manual.realVNode = cloneValue(newVNode);
    state.manual.testVNode = cloneValue(newVNode);
    pushHistory(`Patch #${state.manual.history.length}`, "변경이 없어 no-op 상태를 저장한 기록", state.manual.realVNode, []);
    setManualStatus("No-op Patch", "이전 Virtual DOM과 동일하여 실제 DOM에 반영할 변경이 없었습니다.");
  }

  renderManualPanels();
}

/* -------------------------------------------------------------------------- */
/* 12. renderer                                                                */
/* -------------------------------------------------------------------------- */

function renderBenchmarkMetrics() {
  const vdomSeries = state.benchmark.series.vdom;
  const redrawSeries = state.benchmark.series.redraw;
  const patchSeries = state.benchmark.series.patch;
  const latestVDOM = vdomSeries[vdomSeries.length - 1] || 0;
  const latestRedraw = redrawSeries[redrawSeries.length - 1] || 0;
  const gap = latestRedraw - latestVDOM;
  const directWalkEstimate = state.benchmark.config.itemCount * Math.max(1, state.benchmark.config.imperativeScanPasses || 1);

  state.ui.vdomCurrentLatency.textContent = formatMs(latestVDOM);
  state.ui.redrawCurrentLatency.textContent = formatMs(latestRedraw);
  state.ui.latencyGapValue.textContent = formatMs(gap);
  state.ui.tickCounter.textContent = String(state.benchmark.tick);
  state.ui.vdomAvgLatency.textContent = formatMs(average(vdomSeries));
  state.ui.vdomP95Latency.textContent = formatMs(percentile(vdomSeries, 0.95));
  state.ui.redrawAvgLatency.textContent = formatMs(average(redrawSeries));
  state.ui.redrawP95Latency.textContent = formatMs(percentile(redrawSeries, 0.95));
  state.ui.vdomMutationTotal.textContent = String(state.benchmark.mutationTotals.vdom);
  state.ui.redrawMutationTotal.textContent = String(state.benchmark.mutationTotals.redraw);
  state.ui.patchAverageChip.textContent = `avg patches ${average(patchSeries).toFixed(1)} · direct walk ${directWalkEstimate.toLocaleString("ko-KR")}/tick`;
  updateBenchmarkStatusText();
  renderBenchmarkPresetState();
}

function renderBenchmarkFeed() {
  const panel = state.ui.benchmarkFeed;
  panel.innerHTML = "";

  if (!state.benchmark.feed.length) {
    panel.innerHTML = `
      <div class="feed-item">
        <strong class="feed-item__title">stream idle</strong>
        <p>연속 시작 또는 버스트 30회를 실행하면 tick 로그가 누적됩니다.</p>
      </div>
    `;
    return;
  }

  state.benchmark.feed.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "feed-item";
    item.innerHTML = `
      <div class="log-item__head">
        <strong class="feed-item__title">tick ${entry.tick} · ${escapeHTML(entry.phase)}</strong>
        <span class="chip chip--slate">${escapeHTML(MODE_LABELS[entry.mode])}</span>
      </div>
      <p>VDOM ${formatMs(entry.vdom)} / Imperative walk ${formatMs(entry.redraw)} / gap ${formatMs(entry.delta)} / patches ${entry.patchCount}</p>
    `;
    panel.appendChild(item);
  });
}

function renderPerformancePanel() {
  const panel = state.ui.performancePanel;
  if (!panel) {
    return;
  }

  const vdomAvg = average(state.benchmark.series.vdom);
  const redrawAvg = average(state.benchmark.series.redraw);
  const deltaAvg = average(state.benchmark.series.delta);
  const deltaP95 = percentile(state.benchmark.series.delta, 0.95);
  const patchAvg = average(state.benchmark.series.patch);
  const estimatedSavings = Math.max(state.benchmark.latestNodeCount - state.benchmark.latestPatchCount, 0);
  const fasterRuntime = deltaAvg >= 0 ? "VDOM" : "Imperative Walk";
  const preset = getCurrentPresetMeta();
  const advisory = getLoadAdvisory();
  const expectedChangedNodes = Math.max(
    1,
    Math.round(state.benchmark.config.itemCount * state.benchmark.config.mutationRatio)
  );
  const hasSamples = state.benchmark.series.vdom.length > 0 && state.benchmark.series.redraw.length > 0;
  const scanPasses = Math.max(1, state.benchmark.config.imperativeScanPasses || 1);
  const scanProfile = state.benchmark.config.imperativeRequery
    ? `반복 selector walk ${scanPasses}회`
    : `단일 cached walk ${scanPasses}회`;
  const speedRatioBase = deltaAvg >= 0
    ? redrawAvg / Math.max(vdomAvg, 0.05)
    : vdomAvg / Math.max(redrawAvg, 0.05);
  const speedRatio = Number.isFinite(speedRatioBase) ? speedRatioBase : 0;
  const speedMessage = deltaAvg >= 0
    ? `VDOM이 직접 DOM 대비 약 ${speedRatio.toFixed(1)}배 빠른 구간입니다.`
    : `직접 DOM이 VDOM 대비 약 ${speedRatio.toFixed(1)}배 빠른 구간입니다.`;
  const directWalkEstimate = state.benchmark.config.itemCount * scanPasses;
  const trendMessage = !hasSamples
    ? "아직 실행 데이터가 없습니다."
    : deltaAvg >= 0
    ? "현재 설정에서는 VDOM 쪽이 평균적으로 더 빠릅니다."
    : "현재 설정에서는 직접 DOM 조작 쪽이 평균적으로 더 빠릅니다.";
  const causeMessage = deltaAvg >= 0
    ? "큰 트리에서 일부만 바뀌고 직접 DOM 쪽에 반복 selector walk와 layout read가 섞이면 patch 방식의 이점이 커집니다."
    : "작은 트리에서 거의 전체가 매 tick 바뀌면 diff bookkeeping이 오히려 부담이 될 수 있습니다.";

  panel.innerHTML = `
    <div class="summary-block">
      <strong>현재 해석</strong>
      <p>${hasSamples ? `${trendMessage} 평균 gap은 ${formatMs(deltaAvg)}, p95 gap은 ${formatMs(deltaP95)}입니다. ${speedMessage}` : "버스트 30회 또는 연속 시작을 실행하면 평균 gap, p95, 속도 배수가 여기 표시됩니다."}</p>
    </div>
    <div class="summary-block">
      <strong>왜 이런 결과가 나왔나</strong>
      <p>${causeMessage} 현재 설정은 ${preset.label} 프리셋이며, ${preset.description} 조건입니다.</p>
    </div>
    <div class="summary-block">
      <strong>실험 조건</strong>
      <p>전체 노드 수 ${state.benchmark.config.itemCount}개, tick당 예상 변경 노드 ${expectedChangedNodes}개, 초당 요청 빈도 ${state.benchmark.config.frequency}회, 직접 DOM 기준선은 ${scanProfile}입니다. 즉 직접 DOM은 tick당 카드 ${directWalkEstimate.toLocaleString("ko-KR")}개를 훑고, VDOM은 주로 ${expectedChangedNodes}개 수준의 변경만 patch하려는 조건입니다.</p>
    </div>
    <div class="summary-block">
      <strong>관측 지표</strong>
      <p>VDOM 평균 ${formatMs(vdomAvg)}, 직접 DOM 평균 ${formatMs(redrawAvg)}, 평균 patch 수 ${patchAvg.toFixed(1)}개입니다.</p>
    </div>
    <div class="summary-block">
      <strong>브라우저 보호</strong>
      <p>현재 부하 상태는 ${advisory.label}입니다. 연속 실행은 자동 감속되고 ${BENCHMARK_MAX_CONTINUOUS_MS / 1000}초 뒤 중지되어 클릭 응답성을 지키도록 제한했습니다.</p>
    </div>
    <div class="summary-block">
      <strong>DOM 작업량</strong>
      <p>누적 mutation은 VDOM ${state.benchmark.mutationTotals.vdom}회, 직접 DOM ${state.benchmark.mutationTotals.redraw}회입니다. 최근 추정 절감 DOM touches는 약 ${estimatedSavings}개입니다.</p>
    </div>
  `;
}

function drawGraph() {
  const canvas = state.ui.graphCanvas;
  const context = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 960;
  const height = canvas.clientHeight || 320;

  if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#050816";
  context.fillRect(0, 0, width, height);

  const padding = 36;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const combined = [...state.benchmark.series.vdom, ...state.benchmark.series.redraw];
  const maxValue = Math.max(10, ...combined, 1);

  state.ui.graphScaleLabel.textContent = `max ${formatMs(maxValue)}`;

  context.strokeStyle = "rgba(148, 163, 184, 0.12)";
  for (let index = 0; index <= 4; index += 1) {
    const y = padding + (graphHeight / 4) * index;
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
  }

  function drawSeries(values, strokeStyle, fillStyle) {
    if (values.length < 2) {
      return;
    }
    context.beginPath();
    values.forEach((value, index) => {
      const x = padding + (graphWidth / Math.max(values.length - 1, 1)) * index;
      const y = padding + graphHeight - (value / maxValue) * graphHeight;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });
    context.strokeStyle = strokeStyle;
    context.lineWidth = 2;
    context.stroke();
    context.lineTo(padding + graphWidth, padding + graphHeight);
    context.lineTo(padding, padding + graphHeight);
    context.closePath();
    context.fillStyle = fillStyle;
    context.fill();
  }

  drawSeries(state.benchmark.series.vdom, "#60a5fa", "rgba(96, 165, 250, 0.08)");
  drawSeries(state.benchmark.series.redraw, "#f59e0b", "rgba(245, 158, 11, 0.08)");

  context.fillStyle = "#94a3b8";
  context.font = "12px IBM Plex Mono";
  context.fillText("VDOM", padding, 20);
  context.fillStyle = "#60a5fa";
  context.fillRect(padding + 44, 12, 18, 3);
  context.fillStyle = "#94a3b8";
  context.fillText("Imperative walk", padding + 80, 20);
  context.fillStyle = "#f59e0b";
  context.fillRect(padding + 208, 12, 18, 3);

}

/* -------------------------------------------------------------------------- */
/* 13. event bindings                                                          */
/* -------------------------------------------------------------------------- */

function handleHistoryClick(event) {
  const card = event.target.closest("[data-history-index]");
  if (!card) {
    return;
  }
  const index = Number(card.dataset.historyIndex);
  if (Number.isNaN(index)) {
    return;
  }
  state.manual.currentHistoryIndex = index;
  restoreSnapshot(state.manual.history[index]);
}

function bindEvents() {
  state.ui.benchmarkStartButton.addEventListener("click", startBenchmark);
  state.ui.benchmarkStopButton.addEventListener("click", stopBenchmark);
  state.ui.benchmarkBurstButton.addEventListener("click", runBenchmarkBurst);
  state.ui.benchmarkResetButton.addEventListener("click", resetBenchmark);
  state.ui.presetBalancedButton.addEventListener("click", () => applyBenchmarkPreset("balanced"));
  state.ui.presetFavorableButton.addEventListener("click", () => applyBenchmarkPreset("favorable"));
  state.ui.presetUnfavorableButton.addEventListener("click", () => applyBenchmarkPreset("unfavorable"));

  state.ui.mutationModeSelect.addEventListener("change", (event) => {
    markBenchmarkConfigCustom();
    state.benchmark.config.mode = event.target.value;
    resetBenchmark();
  });

  state.ui.frequencyRange.addEventListener("input", (event) => {
    markBenchmarkConfigCustom();
    state.benchmark.config.frequency = Number(event.target.value);
    state.ui.frequencyValue.textContent = String(state.benchmark.config.frequency);
    if (state.benchmark.running) {
      startBenchmark();
    } else {
      renderBenchmarkPresetState();
    }
  });

  state.ui.itemCountRange.addEventListener("input", (event) => {
    markBenchmarkConfigCustom();
    state.benchmark.config.itemCount = Number(event.target.value);
    state.ui.itemCountValue.textContent = `${state.benchmark.config.itemCount} nodes`;
    state.ui.mutationRatioValue.textContent = getMutationScopeText(
      state.benchmark.config.itemCount,
      state.benchmark.config.mutationRatio
    );
    renderBenchmarkPresetState();
  });

  state.ui.itemCountRange.addEventListener("change", resetBenchmark);

  state.ui.mutationRatioRange.addEventListener("input", (event) => {
    markBenchmarkConfigCustom();
    state.benchmark.config.mutationRatio = Number(event.target.value) / 100;
    state.ui.mutationRatioValue.textContent = getMutationScopeText(
      state.benchmark.config.itemCount,
      state.benchmark.config.mutationRatio
    );
    renderBenchmarkPresetState();
    renderPerformancePanel();
  });

  state.ui.mutationRatioRange.addEventListener("change", resetBenchmark);

  if (hasManualLabUi()) {
    state.ui.patchButton.addEventListener("click", handlePatch);
    state.ui.backButton.addEventListener("click", goBack);
    state.ui.forwardButton.addEventListener("click", goForward);
    state.ui.resetButton.addEventListener("click", resetManualLab);
    state.ui.syncSourceButton.addEventListener("click", syncTestFromSourceEditor);

    state.ui.testDomRoot.addEventListener("input", () => {
      syncSourceEditorFromTest();
      state.ui.editorMessage.textContent = "테스트 영역이 변경되었습니다. Patch를 눌러 diff 결과를 확인하세요.";
    });

    state.ui.sourceEditor.addEventListener("input", () => {
      state.ui.editorMessage.textContent = "소스 에디터가 변경되었습니다. 동기화 후 Patch를 실행하세요.";
    });

    state.ui.historyPanel.addEventListener("click", handleHistoryClick);
  }

  window.addEventListener("resize", scheduleGraphDraw);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.benchmark.running) {
      stopBenchmark("hidden");
    }
  });
}

/* -------------------------------------------------------------------------- */
/* 14. init                                                                    */
/* -------------------------------------------------------------------------- */

function init() {
  state.ui = getElements();
  bindEvents();
  resetBenchmark();
  if (hasManualLabUi()) {
    resetManualLab();
  }
  window.__VDOM_CONSOLE__ = state;
  scheduleGraphDraw();
}

window.addEventListener("DOMContentLoaded", init);
