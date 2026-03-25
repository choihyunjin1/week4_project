const VDOMEngine = window.VDOMEngine;

const PATCH_CLASS_MAP = {
  CREATE: "insert",
  REMOVE: "remove",
  REPLACE: "replace",
  TEXT: "text",
  ATTR_SET: "props",
  ATTR_REMOVE: "props",
  REORDER_CHILDREN: "reorder"
};

const PATCH_SUMMARY_TYPES = [
  ["CREATE", "insert"],
  ["REMOVE", "remove"],
  ["REPLACE", "replace"],
  ["ATTR_SET", "props"],
  ["ATTR_REMOVE", "props"],
  ["TEXT", "text"],
  ["REORDER_CHILDREN", "reorder"]
];

const elements = {
  realRoot: document.getElementById("realRoot"),
  testRoot: document.getElementById("testRoot"),
  htmlEditor: document.getElementById("htmlEditor"),
  patchButton: document.getElementById("patchButton"),
  undoButton: document.getElementById("undoButton"),
  redoButton: document.getElementById("redoButton"),
  resetButton: document.getElementById("resetButton"),
  statusText: document.getElementById("statusText"),
  historyIndexView: document.getElementById("historyIndex"),
  patchCountView: document.getElementById("patchCount"),
  nodeCountView: document.getElementById("nodeCount"),
  publishTimeView: document.getElementById("publishTime"),
  patchLog: document.getElementById("patchLog"),
  patchSummary: document.getElementById("patchSummary"),
  historyRail: document.getElementById("historyRail"),
  currentVdomView: document.getElementById("currentVdomView"),
  nextVdomView: document.getElementById("nextVdomView"),
  currentVdomTree: document.getElementById("currentVdomTree"),
  nextVdomTree: document.getElementById("nextVdomTree"),
  publishedStamp: document.getElementById("publishedStamp")
};

const snippetLibrary = {
  story: `
        <article class="story-card">
          <strong>추가된 새 스토리 (New Story)</strong>
          <h3>이 카드도 알고리즘(Diff) 삽입 연산 테스트에 쓰입니다.</h3>
          <p>임의로 코드가 길어졌을 때 패치 발행 버튼을 누르면 이 구간이 CREATE 패치 케이스로 분류되어 실제 화면 지면에만 덧붙여집니다.</p>
        </article>`,
  note: `
        <section class="newsletter-section">
          <article class="insight-card">
            <strong>강조 안내문 (Highlight Note)</strong>
            <h3>테스트용 새 하이라이트 공지 섹션입니다.</h3>
            <p>편집본 에디터 문자열에 이 코드가 삽입되면 엔진은 전역을 스캔하다가 이 구간을 CREATE 패치 대상으로 분리해냅니다.</p>
          </article>
        </section>`,
  cta: `
        <section class="newsletter-section">
          <article class="sponsor-card">
            <strong>사용자 행동 유도 (CTA Banner)</strong>
            <h3>구독자들이 즉시 누르고 싶게 만드는 핵심 버튼(Call To Action) 영역입니다.</h3>
            <p>아래 버튼의 class나 href 링크 주소를 고의로 바꾸고 패치를 수행해 보세요. ATTR_SET / ATTR_REMOVE 케이스가 어떻게 일어나는지 바로 확인할 수 있습니다.</p>
            <div class="newsletter-actions">
              <a class="newsletter-button" href="#new-action-trigger">거대한 혜택 받으러 가기 (New Action)</a>
            </div>
          </article>
        </section>`,
  footer: `
            <a href="#team">팀 개발 스쿼드 소개 링크</a>`
};

const state = {
  currentTemplateId: "main",
  currentVdom: null,
  history: [],
  historyIndex: 0
};

function templateHTML(templateId = "main") {
  const id = templateId === "event" ? "eventTemplate" : "sampleTemplate";
  state.currentTemplateId = templateId === "event" ? "event" : "main";
  return document.getElementById(id).innerHTML.trim();
}

function cloneData(data) {
  return VDOMEngine.cloneVNode(data);
}

function nowLabel() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function setStatus(message) {
  elements.statusText.textContent = message;
}

function flashPublishedPane() {
  elements.realRoot.classList.remove("flash");
  void elements.realRoot.offsetWidth;
  elements.realRoot.classList.add("flash");
  window.setTimeout(() => elements.realRoot.classList.remove("flash"), 700);
}

function sourceToVdom(source) {
  return VDOMEngine.sourceToVNode(source, { ignoreTags: ["script"] });
}

function containerToVdom(container) {
  return VDOMEngine.domToVNode(container);
}

function renderRoot(container, rootVdom) {
  VDOMEngine.renderRootVNode(container, rootVdom);
}

function countDisplayNodes(vdom) {
  return Math.max(0, VDOMEngine.countNodes(vdom) - 1);
}

function formatPath(path) {
  if (!path || path === "0") {
    return "root";
  }

  const segments = String(path).split("-").slice(1);
  return segments.length ? segments.join(" > ") : "root";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function getTreeLabel(vnode) {
  return vnode.type === "text" ? "#text" : `<${vnode.tag}>`;
}

function getTreeProps(vnode) {
  return Object.entries(vnode.attrs || {}).map(([key, value]) => {
    if (value === true) {
      return key;
    }
    return `${key}="${value}"`;
  });
}

function renderVdomTreeNode(vnode) {
  const nodeEl = document.createElement("div");
  nodeEl.className = "tree-node";

  const branch = document.createElement("div");
  branch.className = "tree-branch";

  const label = document.createElement("span");
  label.className = "tree-label";
  label.textContent = getTreeLabel(vnode);
  branch.appendChild(label);

  if (vnode.type === "text") {
    const text = document.createElement("span");
    text.className = "tree-text";
    text.textContent = vnode.text;
    branch.appendChild(text);
  } else {
    const props = getTreeProps(vnode);
    if (props.length) {
      const propEl = document.createElement("span");
      propEl.className = "tree-props";
      propEl.textContent = props.join(" ");
      branch.appendChild(propEl);
    }
  }

  nodeEl.appendChild(branch);

  (vnode.children || []).forEach((child) => {
    const childrenEl = nodeEl.querySelector(".tree-children") || document.createElement("div");
    childrenEl.className = "tree-children";
    childrenEl.appendChild(renderVdomTreeNode(child));
    if (!childrenEl.parentNode) {
      nodeEl.appendChild(childrenEl);
    }
  });

  return nodeEl;
}

function renderVdomTree(container, rootVdom) {
  container.innerHTML = "";
  if (!rootVdom || !rootVdom.children || !rootVdom.children.length) {
    container.innerHTML = "<div class=\"tree-text\">빈 트리</div>";
    return;
  }

  rootVdom.children.forEach((child) => {
    container.appendChild(renderVdomTreeNode(child));
  });
}

function describePatchHtml(patch) {
  const className = PATCH_CLASS_MAP[patch.type] || "props";
  return `<span class="${className}">${patch.type}</span> path <code>${formatPath(patch.path)}</code> ${escapeHtml(VDOMEngine.describePatch(patch))}`;
}

function summarizePatches(patches) {
  const counts = Object.fromEntries(PATCH_SUMMARY_TYPES.map(([type]) => [type, 0]));
  patches.forEach((patch) => {
    counts[patch.type] = (counts[patch.type] || 0) + 1;
  });
  return counts;
}

function renderPatchSummary(patches) {
  const counts = summarizePatches(patches);
  elements.patchSummary.innerHTML = "";

  PATCH_SUMMARY_TYPES.forEach(([type, className]) => {
    const pill = document.createElement("span");
    pill.className = `patch-pill ${className}`;
    pill.textContent = `${type} ${counts[type] || 0}`;
    elements.patchSummary.appendChild(pill);
  });
}

function renderPatchLog(patches) {
  elements.patchLog.innerHTML = "";
  if (!patches.length) {
    elements.patchLog.innerHTML = "<li>변경점이 없습니다. 실제 발행본 DOM 패치도 발생하지 않았습니다.</li>";
    return;
  }

  patches.forEach((patch) => {
    const li = document.createElement("li");
    li.innerHTML = describePatchHtml(patch);
    elements.patchLog.appendChild(li);
  });
}

function renderHistoryRail() {
  elements.historyRail.innerHTML = "";
  state.history.forEach((entry, index) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-button${index === state.historyIndex ? " active" : ""}`;
    button.innerHTML = `
      <strong>Version ${index + 1} · ${entry.label}</strong>
      <span class="history-caption">${entry.timeLabel} · patches ${entry.patchCount} · nodes ${entry.nodeCount}</span>
    `;
    button.addEventListener("click", () => restoreFromHistory(index));
    li.appendChild(button);
    elements.historyRail.appendChild(li);
  });
}

function updateViews(nextVdom = state.currentVdom, patches = [], publishTime = null) {
  elements.currentVdomView.textContent = JSON.stringify(state.currentVdom, null, 2);
  elements.nextVdomView.textContent = JSON.stringify(nextVdom, null, 2);
  renderVdomTree(elements.currentVdomTree, state.currentVdom);
  renderVdomTree(elements.nextVdomTree, nextVdom);
  elements.patchCountView.textContent = String(patches.length);
  elements.nodeCountView.textContent = String(countDisplayNodes(state.currentVdom));
  elements.historyIndexView.textContent = `${state.historyIndex + 1} / ${state.history.length}`;
  elements.publishTimeView.textContent = publishTime || state.history[state.historyIndex]?.timeLabel || "--:--";
  elements.publishedStamp.textContent = `Version ${state.historyIndex + 1}`;
  elements.undoButton.disabled = state.historyIndex === 0;
  elements.redoButton.disabled = state.historyIndex >= state.history.length - 1;
  renderPatchSummary(patches);
  renderHistoryRail();
}

function syncTestFromEditor() {
  const nextVdom = sourceToVdom(elements.htmlEditor.value);
  renderRoot(elements.testRoot, nextVdom);
  elements.nextVdomView.textContent = JSON.stringify(nextVdom, null, 2);
  renderVdomTree(elements.nextVdomTree, nextVdom);
  return nextVdom;
}

function createHistoryEntry(vdom, label, patchCount) {
  return {
    vdom: cloneData(vdom),
    label,
    patchCount,
    nodeCount: countDisplayNodes(vdom),
    timeLabel: nowLabel()
  };
}

function pushHistory(vdom, label, patchCount) {
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(createHistoryEntry(vdom, label, patchCount));
  state.historyIndex = state.history.length - 1;
}

function restoreFromHistory(index) {
  state.historyIndex = index;
  state.currentVdom = cloneData(state.history[index].vdom);
  renderRoot(elements.realRoot, state.currentVdom);
  renderRoot(elements.testRoot, state.currentVdom);
  elements.htmlEditor.value = elements.testRoot.innerHTML.trim();
  renderPatchLog([]);
  updateViews(state.currentVdom, [], state.history[index].timeLabel);
  setStatus(`Version ${index + 1} 발행 상태를 복원했습니다.`);
  flashPublishedPane();
}

function loadTemplate(templateId) {
  elements.htmlEditor.value = templateHTML(templateId);
  elements.htmlEditor.dispatchEvent(new Event("input"));
  setStatus(`${templateId === "event" ? "이벤트" : "기본"} 템플릿을 편집본에 불러왔습니다.`);
}

function insertSnippet(type) {
  const snippet = snippetLibrary[type];
  if (!snippet) {
    return;
  }

  if (type === "footer") {
    const footerPattern = /(<div class="footer-links">)([\s\S]*?)(<\/div>\s*<\/footer>)/;
    if (footerPattern.test(elements.htmlEditor.value)) {
      elements.htmlEditor.value = elements.htmlEditor.value.replace(footerPattern, `$1$2${snippet}$3`);
    } else {
      elements.htmlEditor.value += `\n${snippet}`;
    }
  } else {
    const marker = "<footer class=\"newsletter-footer\">";
    if (elements.htmlEditor.value.includes(marker)) {
      elements.htmlEditor.value = elements.htmlEditor.value.replace(marker, `${snippet}\n\n          ${marker}`);
    } else {
      elements.htmlEditor.value += `\n${snippet}`;
    }
  }

  elements.htmlEditor.dispatchEvent(new Event("input"));
  setStatus(`${type} 스니펫을 편집본 HTML에 추가했습니다.`);
}

function initialize(templateId = "main") {
  const html = templateHTML(templateId);
  state.currentVdom = sourceToVdom(html);
  renderRoot(elements.realRoot, state.currentVdom);
  renderRoot(elements.testRoot, state.currentVdom);
  elements.htmlEditor.value = elements.testRoot.innerHTML.trim();
  state.history = [createHistoryEntry(state.currentVdom, "Initial publish", 0)];
  state.historyIndex = 0;
  renderPatchLog([]);
  updateViews(state.currentVdom, [], state.history[0].timeLabel);
}

elements.htmlEditor.addEventListener("input", () => {
  syncTestFromEditor();
  setStatus("편집본 HTML을 다시 읽어 새 Virtual DOM 후보를 준비했습니다.");
});

elements.patchButton.addEventListener("click", () => {
  const nextVdom = syncTestFromEditor();
  const patches = VDOMEngine.diffRoot(state.currentVdom, nextVdom);

  if (!patches.length) {
    renderPatchLog([]);
    updateViews(nextVdom, [], state.history[state.historyIndex]?.timeLabel || "--:--");
    setStatus("변경점이 없어 새 발행본을 만들지 않았습니다.");
    return;
  }

  VDOMEngine.patchRoot(elements.realRoot, state.currentVdom, nextVdom, patches);
  state.currentVdom = containerToVdom(elements.realRoot);
  pushHistory(state.currentVdom, "Patched publish", patches.length);
  renderPatchLog(patches);
  updateViews(nextVdom, patches, state.history[state.historyIndex].timeLabel);
  setStatus(`Patch 발행 완료: ${patches.length}개의 변경만 실제 발행본 DOM에 반영했습니다.`);
  flashPublishedPane();
});

elements.undoButton.addEventListener("click", () => {
  if (state.historyIndex > 0) {
    restoreFromHistory(state.historyIndex - 1);
  }
});

elements.redoButton.addEventListener("click", () => {
  if (state.historyIndex < state.history.length - 1) {
    restoreFromHistory(state.historyIndex + 1);
  }
});

elements.resetButton.addEventListener("click", () => {
  initialize(state.currentTemplateId);
  setStatus("현재 템플릿 기준으로 샘플 발행본과 편집본을 초기화했습니다.");
});

document.querySelectorAll("[data-template]").forEach((button) => {
  button.addEventListener("click", () => loadTemplate(button.dataset.template));
});

document.querySelectorAll("[data-snippet]").forEach((button) => {
  button.addEventListener("click", () => insertSnippet(button.dataset.snippet));
});

initialize();
window.__PATCHLETTER_STUDIO__ = { elements, state, VDOMEngine };
