import { createElement, render } from "../../../packages/cyb-react/src/index.js";

const h = createElement;
const HISTORY_LIMIT = 18;

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMs(value) {
  return `${value.toFixed(2)}ms`;
}

function createModel(itemCount) {
  return {
    tick: 0,
    phase: "warm-up",
    items: Array.from({ length: itemCount }, (_, index) => ({
      id: `node-${index + 1}`,
      name: `Node ${String(index + 1).padStart(3, "0")}`,
      status: ["idle", "ready", "burst"][index % 3],
      count: 120 - (index % 11) * 4,
      note: `watch ${10 + (index % 8)}ms`
    }))
  };
}

function rotate(values, shift) {
  if (!values.length) {
    return values;
  }

  const offset = ((shift % values.length) + values.length) % values.length;
  return values.slice(offset).concat(values.slice(0, offset));
}

function mutateModel(previousModel, tick, config) {
  const next = {
    tick,
    phase: ["warm-up", "pressure", "peak", "cooldown"][Math.floor(tick / 3) % 4],
    items: previousModel.items.map((item) => ({ ...item }))
  };

  const focusCount = Math.max(1, Math.round(next.items.length * config.mutationRatio));
  const focusStart = (tick * 2) % next.items.length;

  for (let index = 0; index < focusCount; index += 1) {
    const itemIndex = (focusStart + index) % next.items.length;
    const item = next.items[itemIndex];

    if (config.mode === "text" || config.mode === "mixed") {
      item.note = `watch ${10 + ((tick + index) % 16)}ms`;
      item.count = Math.max(8, item.count - ((tick + index) % 4));
    }

    if (config.mode === "attr" || config.mode === "mixed") {
      item.status = ["idle", "ready", "burst", "sync"][(tick + index) % 4];
    }
  }

  if ((config.mode === "list" || config.mode === "mixed") && tick % 3 === 0) {
    next.items = rotate(next.items, tick % Math.min(6, next.items.length));
  }

  return next;
}

function RuntimeTree({ model, tone }) {
  return h(
    "section",
    { className: "runtime-shell", "data-tone": tone, "data-phase": model.phase },
    h(
      "header",
      { className: "runtime-header" },
      h("strong", null, `${tone === "library" ? "cyb-react" : "Imperative DOM"} · ${model.phase}`),
      h("span", { className: "runtime-badge" }, `tick ${model.tick}`)
    ),
    h(
      "div",
      { className: "runtime-matrix" },
      ...model.items.map((item) =>
        h(
          "article",
          {
            className: "runtime-node",
            key: item.id,
            "data-status": item.status
          },
          h(
            "div",
            { className: "runtime-node__top" },
            h("strong", { className: "runtime-node__title" }, item.name),
            h("span", { className: "runtime-node__status" }, item.status)
          ),
          h(
            "div",
            { className: "runtime-node__meter" },
            h("span", { style: { width: `${Math.max(8, Math.min(100, Math.round((item.count / 120) * 100)))}%` } })
          ),
          h(
            "div",
            { className: "runtime-node__meta" },
            h("span", { className: "runtime-node__id" }, item.id),
            h("strong", { className: "runtime-node__count" }, String(item.count))
          ),
          h("p", { className: "runtime-node__note" }, item.note)
        )
      )
    )
  );
}

function imperativeHTML(model) {
  return `
    <section class="runtime-shell" data-tone="imperative" data-phase="${model.phase}">
      <header class="runtime-header">
        <strong>Imperative DOM · ${model.phase}</strong>
        <span class="runtime-badge">tick ${model.tick}</span>
      </header>
      <div class="runtime-matrix">
        ${model.items
          .map(
            (item) => `
              <article class="runtime-node" data-id="${item.id}" data-status="${item.status}">
                <div class="runtime-node__top">
                  <strong class="runtime-node__title">${item.name}</strong>
                  <span class="runtime-node__status">${item.status}</span>
                </div>
                <div class="runtime-node__meter">
                  <span style="width:${Math.max(8, Math.min(100, Math.round((item.count / 120) * 100)))}%"></span>
                </div>
                <div class="runtime-node__meta">
                  <span class="runtime-node__id">${item.id}</span>
                  <strong class="runtime-node__count">${item.count}</strong>
                </div>
                <p class="runtime-node__note">${item.note}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function updateImperativeRoot(root, model) {
  const shell = root.querySelector(".runtime-shell");
  const list = root.querySelector(".runtime-matrix");

  if (!shell || !list || list.children.length !== model.items.length) {
    root.innerHTML = imperativeHTML(model);
    return;
  }

  shell.dataset.phase = model.phase;
  shell.querySelector(".runtime-header strong").textContent = `Imperative DOM · ${model.phase}`;
  shell.querySelector(".runtime-badge").textContent = `tick ${model.tick}`;

  const existingById = new Map();
  Array.from(list.children).forEach((node) => {
    existingById.set(node.dataset.id, node);
  });

  model.items.forEach((item) => {
    const card = existingById.get(item.id);
    if (!card) {
      return;
    }

    card.dataset.status = item.status;
    card.querySelector(".runtime-node__title").textContent = item.name;
    card.querySelector(".runtime-node__status").textContent = item.status;
    card.querySelector(".runtime-node__id").textContent = item.id;
    card.querySelector(".runtime-node__count").textContent = String(item.count);
    card.querySelector(".runtime-node__note").textContent = item.note;
    card.querySelector(".runtime-node__meter > span").style.width =
      `${Math.max(8, Math.min(100, Math.round((item.count / 120) * 100)))}%`;
    list.appendChild(card);
  });
}

export function mountBenchmarkTab(container) {
  container.innerHTML = `
    <section class="tab-grid benchmark-grid">
      <article class="hero-panel hero-panel--wide">
        <p class="eyebrow">Benchmark</p>
        <h2 class="hero-title">공개 API만 사용해서 cyb-react와 수동 DOM 갱신을 비교합니다.</h2>
        <p class="hero-copy">동일한 모델 변화 스트림을 두 런타임에 주입합니다. 한쪽은 <code>render()</code> 기반 diff + commit, 다른 쪽은 동일 구조를 직접 DOM 조작으로 업데이트합니다.</p>
      </article>

      <article class="surface-card controls-card">
        <p class="eyebrow">Controls</p>
        <h3 class="card-title">Stream Config</h3>
        <div class="controls-grid">
          <label class="control-field">
            <span>Mode</span>
            <select id="benchMode">
              <option value="mixed">Mixed</option>
              <option value="text">Text</option>
              <option value="attr">Attribute</option>
              <option value="list">List reorder</option>
            </select>
          </label>
          <label class="control-field">
            <span>Nodes</span>
            <input id="benchNodes" type="range" min="24" max="140" step="4" value="64" />
            <strong id="benchNodesValue">64</strong>
          </label>
          <label class="control-field">
            <span>Mutation %</span>
            <input id="benchRatio" type="range" min="4" max="60" step="2" value="14" />
            <strong id="benchRatioValue">14%</strong>
          </label>
          <label class="control-field">
            <span>Ticks / sec</span>
            <input id="benchHz" type="range" min="1" max="20" step="1" value="6" />
            <strong id="benchHzValue">6</strong>
          </label>
        </div>
        <div class="button-row">
          <button id="benchStart" class="solid-button">Start stream</button>
          <button id="benchStop" class="ghost-button">Stop</button>
          <button id="benchBurst" class="ghost-button">Burst 20</button>
          <button id="benchReset" class="ghost-button">Reset</button>
        </div>
      </article>

      <article class="surface-card">
        <p class="eyebrow">cyb-react</p>
        <h3 class="card-title">Library Runtime</h3>
        <div id="libraryRoot" class="runtime-root"></div>
      </article>

      <article class="surface-card">
        <p class="eyebrow">Baseline</p>
        <h3 class="card-title">Imperative Runtime</h3>
        <div id="domRoot" class="runtime-root"></div>
      </article>

      <article class="surface-card metrics-card">
        <p class="eyebrow">Metrics</p>
        <h3 class="card-title">Current Snapshot</h3>
        <div class="metrics-grid">
          <div class="metric-box"><span>cyb-react avg</span><strong id="metricLibAvg">0.00ms</strong></div>
          <div class="metric-box"><span>DOM avg</span><strong id="metricDomAvg">0.00ms</strong></div>
          <div class="metric-box"><span>gap avg</span><strong id="metricGapAvg">0.00ms</strong></div>
          <div class="metric-box"><span>tick</span><strong id="metricTick">0</strong></div>
          <div class="metric-box"><span>library mutations</span><strong id="metricLibMutations">0</strong></div>
          <div class="metric-box"><span>DOM mutations</span><strong id="metricDomMutations">0</strong></div>
        </div>
      </article>

      <article class="surface-card log-card">
        <p class="eyebrow">Feed</p>
        <h3 class="card-title">Recent samples</h3>
        <div id="benchFeed" class="feed-list"></div>
      </article>
    </section>
  `;

  const ui = {
    mode: container.querySelector("#benchMode"),
    nodes: container.querySelector("#benchNodes"),
    nodesValue: container.querySelector("#benchNodesValue"),
    ratio: container.querySelector("#benchRatio"),
    ratioValue: container.querySelector("#benchRatioValue"),
    hz: container.querySelector("#benchHz"),
    hzValue: container.querySelector("#benchHzValue"),
    start: container.querySelector("#benchStart"),
    stop: container.querySelector("#benchStop"),
    burst: container.querySelector("#benchBurst"),
    reset: container.querySelector("#benchReset"),
    libraryRoot: container.querySelector("#libraryRoot"),
    domRoot: container.querySelector("#domRoot"),
    libAvg: container.querySelector("#metricLibAvg"),
    domAvg: container.querySelector("#metricDomAvg"),
    gapAvg: container.querySelector("#metricGapAvg"),
    tick: container.querySelector("#metricTick"),
    libMutations: container.querySelector("#metricLibMutations"),
    domMutations: container.querySelector("#metricDomMutations"),
    feed: container.querySelector("#benchFeed")
  };

  const state = {
    config: {
      mode: "mixed",
      itemCount: 64,
      mutationRatio: 0.14,
      frequency: 6
    },
    running: false,
    timer: null,
    model: createModel(64),
    metrics: {
      library: [],
      dom: [],
      delta: [],
      feed: []
    },
    mutationTotals: {
      library: 0,
      dom: 0
    }
  };

  const libraryObserver = new MutationObserver((records) => {
    state.mutationTotals.library += records.length;
    renderMetrics();
  });

  const domObserver = new MutationObserver((records) => {
    state.mutationTotals.dom += records.length;
    renderMetrics();
  });

  function renderMetrics() {
    ui.libAvg.textContent = formatMs(average(state.metrics.library));
    ui.domAvg.textContent = formatMs(average(state.metrics.dom));
    ui.gapAvg.textContent = formatMs(average(state.metrics.delta));
    ui.tick.textContent = String(state.model.tick);
    ui.libMutations.textContent = String(state.mutationTotals.library);
    ui.domMutations.textContent = String(state.mutationTotals.dom);

    ui.feed.innerHTML = "";
    if (!state.metrics.feed.length) {
      ui.feed.innerHTML = "<div class=\"feed-item\">No samples yet. Start the stream or run a burst.</div>";
      return;
    }

    state.metrics.feed.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "feed-item";
      row.innerHTML = `
        <strong>tick ${entry.tick} · ${entry.phase}</strong>
        <span>cyb-react ${formatMs(entry.library)} / DOM ${formatMs(entry.dom)} / gap ${formatMs(entry.delta)}</span>
      `;
      ui.feed.appendChild(row);
    });
  }

  function renderInitialSurfaces() {
    render(h(RuntimeTree, { model: state.model, tone: "library" }), ui.libraryRoot);
    ui.domRoot.innerHTML = imperativeHTML(state.model);
  }

  function recordSample(entry) {
    state.metrics.feed.unshift(entry);
    state.metrics.feed = state.metrics.feed.slice(0, HISTORY_LIMIT);
  }

  function trimSeries(series) {
    while (series.length > HISTORY_LIMIT) {
      series.shift();
    }
  }

  function runTick() {
    const nextModel = mutateModel(state.model, state.model.tick + 1, state.config);

    const libraryStart = performance.now();
    render(h(RuntimeTree, { model: nextModel, tone: "library" }), ui.libraryRoot);
    const libraryDuration = performance.now() - libraryStart;

    const domStart = performance.now();
    updateImperativeRoot(ui.domRoot, nextModel);
    const domDuration = performance.now() - domStart;

    state.model = nextModel;
    state.metrics.library.push(libraryDuration);
    state.metrics.dom.push(domDuration);
    state.metrics.delta.push(domDuration - libraryDuration);
    trimSeries(state.metrics.library);
    trimSeries(state.metrics.dom);
    trimSeries(state.metrics.delta);
    recordSample({
      tick: nextModel.tick,
      phase: nextModel.phase,
      library: libraryDuration,
      dom: domDuration,
      delta: domDuration - libraryDuration
    });

    renderMetrics();
  }

  function clearTimer() {
    if (state.timer) {
      window.clearTimeout(state.timer);
      state.timer = null;
    }
  }

  function scheduleNext() {
    if (!state.running) {
      return;
    }

    state.timer = window.setTimeout(() => {
      runTick();
      scheduleNext();
    }, 1000 / Math.max(1, state.config.frequency));
  }

  function start() {
    if (state.running) {
      clearTimer();
    }
    state.running = true;
    scheduleNext();
  }

  function stop() {
    state.running = false;
    clearTimer();
  }

  function reset() {
    stop();
    state.model = createModel(state.config.itemCount);
    state.metrics = {
      library: [],
      dom: [],
      delta: [],
      feed: []
    };
    state.mutationTotals = {
      library: 0,
      dom: 0
    };
    renderInitialSurfaces();
    renderMetrics();
  }

  function burst() {
    stop();
    for (let index = 0; index < 20; index += 1) {
      runTick();
    }
  }

  function syncLabels() {
    ui.nodesValue.textContent = String(state.config.itemCount);
    ui.ratioValue.textContent = `${Math.round(state.config.mutationRatio * 100)}%`;
    ui.hzValue.textContent = String(state.config.frequency);
  }

  ui.mode.addEventListener("change", (event) => {
    state.config.mode = event.target.value;
    reset();
  });

  ui.nodes.addEventListener("input", (event) => {
    state.config.itemCount = Number(event.target.value);
    syncLabels();
  });

  ui.nodes.addEventListener("change", reset);

  ui.ratio.addEventListener("input", (event) => {
    state.config.mutationRatio = Number(event.target.value) / 100;
    syncLabels();
  });

  ui.ratio.addEventListener("change", reset);

  ui.hz.addEventListener("input", (event) => {
    state.config.frequency = Number(event.target.value);
    syncLabels();
  });

  ui.start.addEventListener("click", start);
  ui.stop.addEventListener("click", stop);
  ui.burst.addEventListener("click", burst);
  ui.reset.addEventListener("click", reset);

  libraryObserver.observe(ui.libraryRoot, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });

  domObserver.observe(ui.domRoot, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });

  syncLabels();
  renderInitialSurfaces();
  renderMetrics();

  return () => {
    stop();
    libraryObserver.disconnect();
    domObserver.disconnect();
    render(null, ui.libraryRoot);
    container.innerHTML = "";
  };
}
