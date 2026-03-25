import {
  VNODE_PATCH_TYPES,
  applyPatchesToDom,
  cloneVNodeTree,
  countVNodeNodes,
  diffVNodeTrees,
  domToVNodeTree,
  getVNodeMaxDepth,
  normalizeVNodeTree,
  renderVNodeTree,
  serializeVNodeTreeHTML,
  traverseVNodeBFS,
  traverseVNodeDFS
} from "../../../packages/team3-react/src/index.js";

const HISTORY_LIMIT = 10;
const FEED_LIMIT = 8;

const SAMPLE_HTML = `
  <section class="sample-scene" data-key="scene">
    <header class="sample-scene__top" data-key="top">
      <div>
        <p>Web Design Inspiration</p>
        <strong>team3-react style archive</strong>
      </div>
      <nav class="sample-scene__nav" data-key="nav">
        <a href="#" data-key="about">About</a>
        <a href="#" data-key="books">Books</a>
        <a href="#" data-key="labs">Labs</a>
        <a href="#" data-key="contact">Contact</a>
      </nav>
    </header>
    <div class="sample-scene__hero" data-key="hero">
      <div class="sample-scene__copy" data-key="copy">
        <span>Found 8532 site</span>
        <h3>Patch Archive / Virtual DOM Studio</h3>
        <p>Actual DOM과 Test DOM을 나란히 두고 Diff 결과만 commit 하는 실험실</p>
        <ul class="sample-scene__facts" data-key="facts">
          <li data-key="fact-a">HTML</li>
          <li data-key="fact-b">CSS</li>
          <li data-key="fact-c">Vanilla JS</li>
        </ul>
      </div>
      <figure class="sample-window" data-key="window">
        <div class="sample-window__chrome">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="sample-window__media">
          <div class="sample-window__grid"></div>
          <div class="sample-window__beam beam-a"></div>
          <div class="sample-window__beam beam-b"></div>
          <div class="sample-window__beam beam-c"></div>
        </div>
      </figure>
    </div>
    <div class="sample-scene__gallery" data-key="gallery">
      <article class="sample-card" data-key="card-1">
        <strong>Diff cases</strong>
        <p>CREATE, REMOVE, REPLACE, TEXT, ATTR</p>
      </article>
      <article class="sample-card" data-key="card-2">
        <strong>Browser API</strong>
        <p>Document, Window, MutationObserver</p>
      </article>
      <article class="sample-card" data-key="card-3">
        <strong>History</strong>
        <p>Undo / Redo with synchronized panes</p>
      </article>
    </div>
  </section>
`;

function parseMarkupToTree(markup) {
  const host = document.createElement("div");
  host.innerHTML = markup.trim();
  return normalizeVNodeTree(domToVNodeTree(host));
}

function formatAttributes(attrs = {}) {
  return Object.entries(attrs)
    .map(([name, value]) => {
      if (value === true) {
        return name;
      }

      return `${name}="${String(value)}"`;
    })
    .join(" ");
}

function prettyPrintNode(node, depth = 0) {
  const indent = "  ".repeat(depth);

  if (node.type === "text") {
    return `${indent}${node.text}`;
  }

  const attrString = formatAttributes(node.attrs);
  const openTag = attrString ? `<${node.tag} ${attrString}>` : `<${node.tag}>`;

  if (!node.children || !node.children.length) {
    return `${indent}${openTag}</${node.tag}>`;
  }

  if (node.children.length === 1 && node.children[0].type === "text") {
    return `${indent}${openTag}${node.children[0].text}</${node.tag}>`;
  }

  return [
    `${indent}${openTag}`,
    ...node.children.map((child) => prettyPrintNode(child, depth + 1)),
    `${indent}</${node.tag}>`
  ].join("\n");
}

function formatTreeMarkup(tree) {
  return (tree.children || []).map((child) => prettyPrintNode(child)).join("\n\n");
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function timestampLabel() {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

function describeMutationTarget(target) {
  if (!target) {
    return "unknown";
  }

  if (target.nodeType === Node.TEXT_NODE) {
    return "#text";
  }

  return target.tagName ? `<${target.tagName.toLowerCase()}>` : "node";
}

function summarizePatches(patches) {
  const summary = {
    create: 0,
    remove: 0,
    replace: 0,
    text: 0,
    attr: 0,
    reorder: 0
  };

  patches.forEach((patch) => {
    switch (patch.type) {
      case VNODE_PATCH_TYPES.CREATE:
        summary.create += 1;
        break;
      case VNODE_PATCH_TYPES.REMOVE:
        summary.remove += 1;
        break;
      case VNODE_PATCH_TYPES.REPLACE:
        summary.replace += 1;
        break;
      case VNODE_PATCH_TYPES.TEXT:
        summary.text += 1;
        break;
      case VNODE_PATCH_TYPES.ATTR_SET:
      case VNODE_PATCH_TYPES.ATTR_REMOVE:
        summary.attr += 1;
        break;
      case VNODE_PATCH_TYPES.REORDER_CHILDREN:
        summary.reorder += 1;
        break;
      default:
        break;
    }
  });

  return summary;
}

function createSnapshot(tree, note = "Initial snapshot", patches = []) {
  const clonedTree = cloneVNodeTree(tree);
  return {
    tree: clonedTree,
    html: formatTreeMarkup(clonedTree),
    note,
    patchSummary: summarizePatches(patches),
    patchCount: patches.length,
    recordedAt: timestampLabel()
  };
}

function snapshotStats(tree) {
  return {
    nodes: Math.max(0, countVNodeNodes(tree) - 1),
    depth: Math.max(0, getVNodeMaxDepth(tree)),
    dfs: traverseVNodeDFS(tree).slice(1, 7),
    bfs: traverseVNodeBFS(tree).slice(1, 7)
  };
}

function patchFeedMarkup(entries) {
  if (!entries.length) {
    return `<div class="lab-feed__empty">아직 Patch를 실행하지 않았습니다.</div>`;
  }

  return entries
    .map(
      (entry) => `
        <article class="lab-feed__item">
          <div class="lab-feed__row">
            <strong>${escapeHTML(entry.title)}</strong>
            <span>${escapeHTML(entry.recordedAt)}</span>
          </div>
          <p>${escapeHTML(entry.description)}</p>
        </article>
      `
    )
    .join("");
}

export function mountDemoTab(container) {
  container.innerHTML = `
    <section class="patch-lab">
      <section class="lab-overview">
        <article class="overview-card">
          <span>Load</span>
          <strong>실제 영역 DOM을 VDOM으로 변환</strong>
          <p>초기 샘플 HTML을 읽고 테스트 영역도 같은 트리로 재생성합니다.</p>
        </article>
        <article class="overview-card">
          <span>Edit</span>
          <strong>테스트 영역 HTML을 자유롭게 수정</strong>
          <p>textarea 편집 결과가 테스트 영역 후보 DOM에 즉시 반영됩니다.</p>
        </article>
        <article class="overview-card">
          <span>Patch</span>
          <strong>diff 결과만 실제 영역에 commit</strong>
          <p>변경된 부분만 실제 DOM에 적용하고 이력을 저장합니다.</p>
        </article>
        <article class="overview-card">
          <span>Trace</span>
          <strong>History / Observer / Traversal 확인</strong>
          <p>Undo/Redo와 MutationObserver 로그를 함께 봅니다.</p>
        </article>
      </section>

      <section class="patch-lab__grid">
        <article class="lab-card lab-card--editor">
          <div class="lab-card__head">
            <div>
              <p class="eyebrow">Test Area</p>
              <h3 class="card-title">샘플 HTML 코드 편집기</h3>
            </div>
            <div class="button-row">
              <button id="patchRun" class="solid-button" type="button">Patch</button>
              <button id="historyBack" class="ghost-button" type="button">뒤로가기</button>
              <button id="historyForward" class="ghost-button" type="button">앞으로가기</button>
            </div>
          </div>
          <textarea id="markupEditor" class="markup-editor" spellcheck="false"></textarea>
          <div class="lab-inline-note">
            textarea를 수정하면 테스트 영역 미리보기가 즉시 갱신됩니다. Patch를 눌러야 실제 영역에만 변경분이 commit 됩니다.
          </div>
        </article>

        <article class="lab-card lab-card--workspace">
          <div class="lab-card__head">
            <div>
              <p class="eyebrow">Workspace</p>
              <h3 class="card-title">실제 영역 / 테스트 영역 결과 비교</h3>
            </div>
            <span class="runtime-badge">Actual vs Test</span>
          </div>
          <div class="dom-stage-grid">
            <section class="dom-pane">
              <div class="dom-pane__head">
                <span class="dom-pane__label">실제 영역</span>
                <span class="dom-pane__meta">Patch가 반영되는 대상 DOM</span>
              </div>
              <div id="actualRoot" class="dom-stage lab-dom"></div>
            </section>
            <section class="dom-pane">
              <div class="dom-pane__head">
                <span class="dom-pane__label">테스트 영역</span>
                <span class="dom-pane__meta">현재 편집 중인 후보 DOM</span>
              </div>
              <div id="testRoot" class="dom-stage lab-dom lab-dom--test"></div>
            </section>
          </div>
        </article>

        <article class="lab-card">
          <div class="lab-card__head">
            <div>
              <p class="eyebrow">Patch Feed</p>
              <h3 class="card-title">최소 변경 결과</h3>
            </div>
            <span id="patchCount" class="runtime-badge">0 patches</span>
          </div>
          <div id="patchSummary" class="case-grid"></div>
          <div id="patchDetails" class="lab-feed"></div>
        </article>

        <article class="lab-card">
          <div class="lab-card__head">
            <div>
              <p class="eyebrow">State History</p>
              <h3 class="card-title">Undo / Redo 스냅샷</h3>
            </div>
            <span id="historyBadge" class="runtime-badge">step 1 / 1</span>
          </div>
          <div id="historyRail" class="history-rail"></div>
        </article>

        <article class="lab-card">
          <div class="lab-card__head">
            <div>
              <p class="eyebrow">Virtual DOM</p>
              <h3 class="card-title">트리 통계와 순회</h3>
            </div>
            <span id="treeMetrics" class="runtime-badge">0 nodes</span>
          </div>
          <div class="metrics-grid metrics-grid--lab">
            <div class="metric-box"><span>Nodes</span><strong id="metricNodes">0</strong></div>
            <div class="metric-box"><span>Depth</span><strong id="metricDepth">0</strong></div>
            <div class="metric-box"><span>History</span><strong id="metricHistory">1</strong></div>
          </div>
          <div class="traversal-grid">
            <div class="traversal-card">
              <strong>DFS</strong>
              <div id="dfsList" class="path-list"></div>
            </div>
            <div class="traversal-card">
              <strong>BFS</strong>
              <div id="bfsList" class="path-list"></div>
            </div>
          </div>
        </article>

        <article class="lab-card">
          <div class="lab-card__head">
            <div>
              <p class="eyebrow">Browser API</p>
              <h3 class="card-title">실제 DOM 변화 감지</h3>
            </div>
            <span id="observerBadge" class="runtime-badge">0 mutations</span>
          </div>
          <div id="observerFeed" class="lab-feed"></div>
        </article>
      </section>
    </section>
  `;

  const ui = {
    actualRoot: container.querySelector("#actualRoot"),
    testRoot: container.querySelector("#testRoot"),
    editor: container.querySelector("#markupEditor"),
    patchRun: container.querySelector("#patchRun"),
    historyBack: container.querySelector("#historyBack"),
    historyForward: container.querySelector("#historyForward"),
    patchCount: container.querySelector("#patchCount"),
    patchSummary: container.querySelector("#patchSummary"),
    patchDetails: container.querySelector("#patchDetails"),
    historyRail: container.querySelector("#historyRail"),
    historyBadge: container.querySelector("#historyBadge"),
    treeMetrics: container.querySelector("#treeMetrics"),
    metricNodes: container.querySelector("#metricNodes"),
    metricDepth: container.querySelector("#metricDepth"),
    metricHistory: container.querySelector("#metricHistory"),
    dfsList: container.querySelector("#dfsList"),
    bfsList: container.querySelector("#bfsList"),
    observerBadge: container.querySelector("#observerBadge"),
    observerFeed: container.querySelector("#observerFeed")
  };

  const state = {
    actualTree: null,
    draftTree: null,
    history: [],
    historyIndex: 0,
    observerFeed: [],
    observerCount: 0
  };

  function rebuildDraftFromEditor() {
    const nextTree = parseMarkupToTree(ui.editor.value);
    state.draftTree = cloneVNodeTree(nextTree);
    renderVNodeTree(ui.testRoot, state.draftTree);
    renderTreeStats();
  }

  function renderPatchPanels(patches = [], description = "초기 상태입니다.") {
    const summary = summarizePatches(patches);
    const summaryCards = [
      ["CREATE", summary.create],
      ["REMOVE", summary.remove],
      ["REPLACE", summary.replace],
      ["TEXT", summary.text],
      ["ATTR", summary.attr],
      ["REORDER", summary.reorder]
    ];

    ui.patchCount.textContent = `${patches.length} patches`;
    ui.patchSummary.innerHTML = summaryCards
      .map(
        ([label, value]) => `
          <div class="case-card">
            <span>${label}</span>
            <strong>${value}</strong>
          </div>
        `
      )
      .join("");

    const feedItems = patches.length
      ? patches.map((patch) => ({
          title: `${patch.type} · ${patch.path}`,
          recordedAt: timestampLabel(),
          description:
            patch.type === VNODE_PATCH_TYPES.TEXT
              ? `${patch.oldText || ""} -> ${patch.newText || ""}`
              : patch.type === VNODE_PATCH_TYPES.ATTR_SET
                ? `${patch.name} = ${patch.value}`
                : patch.type === VNODE_PATCH_TYPES.ATTR_REMOVE
                  ? `${patch.name} removed`
                  : description
        }))
      : [{ title: "No changes", recordedAt: timestampLabel(), description }];

    ui.patchDetails.innerHTML = patchFeedMarkup(feedItems.slice(0, FEED_LIMIT));
  }

  function renderTreeStats() {
    const stats = snapshotStats(state.draftTree || state.actualTree);
    ui.treeMetrics.textContent = `${stats.nodes} nodes / depth ${stats.depth}`;
    ui.metricNodes.textContent = String(stats.nodes);
    ui.metricDepth.textContent = String(stats.depth);
    ui.metricHistory.textContent = String(state.history.length);
    ui.dfsList.innerHTML = stats.dfs
      .map((entry) => `<div class="path-item"><code>${escapeHTML(entry.path)}</code><span>${escapeHTML(entry.label)}</span></div>`)
      .join("");
    ui.bfsList.innerHTML = stats.bfs
      .map((entry) => `<div class="path-item"><code>${escapeHTML(entry.path)}</code><span>${escapeHTML(entry.label)}</span></div>`)
      .join("");
  }

  function renderHistory() {
    ui.historyBadge.textContent = `step ${state.historyIndex + 1} / ${state.history.length}`;
    ui.historyRail.innerHTML = state.history
      .map(
        (snapshot, index) => `
          <button class="history-step ${index === state.historyIndex ? "is-active" : ""}" type="button" data-history-index="${index}">
            <strong>${index + 1}</strong>
            <span>${escapeHTML(snapshot.note)}</span>
            <small>${escapeHTML(snapshot.recordedAt)}</small>
          </button>
        `
      )
      .join("");

    Array.from(ui.historyRail.querySelectorAll("[data-history-index]")).forEach((button) => {
      button.addEventListener("click", () => restoreSnapshot(Number(button.dataset.historyIndex)));
    });

    ui.historyBack.disabled = state.historyIndex === 0;
    ui.historyForward.disabled = state.historyIndex === state.history.length - 1;
  }

  function renderObserverFeed() {
    ui.observerBadge.textContent = `${state.observerCount} mutations`;
    ui.observerFeed.innerHTML = patchFeedMarkup(
      state.observerFeed.length
        ? state.observerFeed
        : [{ title: "Observer idle", recordedAt: timestampLabel(), description: "실제 영역 변경을 기다리는 중입니다." }]
    );
  }

  function syncEditorToDraft() {
    ui.editor.value = formatTreeMarkup(state.draftTree);
  }

  function restoreSnapshot(index) {
    const snapshot = state.history[index];
    if (!snapshot) {
      return;
    }

    state.historyIndex = index;
    state.actualTree = cloneVNodeTree(snapshot.tree);
    state.draftTree = cloneVNodeTree(snapshot.tree);
    observer.disconnect();
    renderVNodeTree(ui.actualRoot, state.actualTree);
    renderVNodeTree(ui.testRoot, state.draftTree);
    observer.observe(ui.actualRoot, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    });
    syncEditorToDraft();
    renderPatchPanels([], snapshot.note);
    renderHistory();
    renderTreeStats();
  }

  function pushHistory(snapshot) {
    state.history = state.history.slice(0, state.historyIndex + 1).concat(snapshot);
    if (state.history.length > HISTORY_LIMIT) {
      state.history = state.history.slice(state.history.length - HISTORY_LIMIT);
    }
    state.historyIndex = state.history.length - 1;
  }

  const observer = new MutationObserver((records) => {
    state.observerCount += records.length;
    state.observerFeed = records
      .slice(0, FEED_LIMIT)
      .map((record) => ({
        title: `${record.type} · ${describeMutationTarget(record.target)}`,
        recordedAt: timestampLabel(),
        description:
          record.type === "attributes"
            ? `${record.attributeName || "attr"} changed`
            : record.type === "characterData"
              ? "text node updated"
              : `${record.addedNodes.length} added / ${record.removedNodes.length} removed`
      }))
      .concat(state.observerFeed)
      .slice(0, FEED_LIMIT);
    renderObserverFeed();
  });

  ui.actualRoot.innerHTML = SAMPLE_HTML.trim();
  state.actualTree = normalizeVNodeTree(domToVNodeTree(ui.actualRoot));
  state.draftTree = cloneVNodeTree(state.actualTree);
  renderVNodeTree(ui.testRoot, state.draftTree);
  syncEditorToDraft();

  const initialSnapshot = createSnapshot(state.actualTree, "Initial snapshot");
  state.history = [initialSnapshot];
  state.historyIndex = 0;
  observer.observe(ui.actualRoot, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true
  });

  renderPatchPanels([], "초기 상태입니다.");
  renderHistory();
  renderTreeStats();
  renderObserverFeed();

  ui.editor.addEventListener("input", () => {
    rebuildDraftFromEditor();
  });

  ui.patchRun.addEventListener("click", () => {
    const previousTree = cloneVNodeTree(state.actualTree);
    const nextTree = normalizeVNodeTree(domToVNodeTree(ui.testRoot));
    const patches = diffVNodeTrees(previousTree, nextTree);

    if (!patches.length) {
      renderPatchPanels([], "Diff 결과 변경점이 없습니다.");
      return;
    }

    applyPatchesToDom(ui.actualRoot, patches, nextTree);
    state.actualTree = cloneVNodeTree(nextTree);
    state.draftTree = cloneVNodeTree(nextTree);
    syncEditorToDraft();
    const snapshot = createSnapshot(nextTree, `Patched ${patches.length} changes`, patches);
    pushHistory(snapshot);
    renderHistory();
    renderTreeStats();
    renderPatchPanels(patches, "실제 영역에는 diff 결과만 반영되었습니다.");
  });

  ui.historyBack.addEventListener("click", () => {
    restoreSnapshot(state.historyIndex - 1);
  });

  ui.historyForward.addEventListener("click", () => {
    restoreSnapshot(state.historyIndex + 1);
  });

  return () => {
    observer.disconnect();
    container.innerHTML = "";
  };
}
