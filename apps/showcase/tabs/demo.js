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
    <article class="post-card" data-key="post-card">
      <header class="post-card__header" data-key="post-header">
        <div class="post-author">
          <div class="post-author__avatar">T3</div>
          <div class="post-author__meta">
            <strong>week4.team3</strong>
            <span>Seoul · just now</span>
          </div>
        </div>
        <button class="post-follow" type="button" data-follow-button="true" data-following="false">팔로우</button>
      </header>

      <div class="post-media" data-key="post-media">
        <div class="post-media__frame">
          <div class="post-media__sun"></div>
          <div class="post-media__shape shape-a"></div>
          <div class="post-media__shape shape-b"></div>
          <div class="post-media__shape shape-c"></div>
          <div class="post-media__caption">team3-react / visual patch feed</div>
        </div>
      </div>

      <div class="post-actions" data-key="post-actions">
        <div class="counter-chip" data-counter-widget="post-like">
          <button class="counter-chip__button" type="button" data-counter-button="true">좋아요</button>
          <strong class="counter-chip__value" data-counter-value="true">128</strong>
        </div>
        <div class="counter-chip counter-chip--ghost">
          <span class="counter-chip__label">댓글</span>
          <strong class="counter-chip__value" data-comment-count="true">3</strong>
        </div>
      </div>

      <div class="post-caption" data-key="post-caption">
        <strong>week4.team3</strong>
        <p>오늘 작업한 화면을 포스트형 UI로 다시 다듬고, 실제 영역과 테스트 영역 모두에서 인터랙션이 보이도록 정리했다.</p>
      </div>

      <section class="post-comments" data-key="post-comments">
        <article class="comment-card" data-key="comment-2">
          <div class="comment-card__body">
            <strong>@teammate</strong>
            <p data-comment-text="true">테스트 영역에서 누른 값이 편집기에도 같이 반영되는 점이 좋네요.</p>
            <input class="comment-editor__input" type="text" value="테스트 영역에서 누른 값이 편집기에도 같이 반영되는 점이 좋네요." data-edit-input="comment-2" />
          </div>
          <div class="comment-card__actions">
            <div class="counter-chip counter-chip--inline" data-counter-widget="comment-like-2">
              <button class="counter-chip__button" type="button" data-counter-button="true">좋아요</button>
              <strong class="counter-chip__value" data-counter-value="true">9</strong>
            </div>
            <button class="comment-edit-button" type="button" data-edit-button="comment-2">수정</button>
          </div>
        </article>

        <article class="comment-card" data-key="comment-1">
          <div class="comment-card__body">
            <strong>@binny</strong>
            <p data-comment-text="true">레이아웃이 훨씬 또렷해졌어요.</p>
            <input class="comment-editor__input" type="text" value="레이아웃이 훨씬 또렷해졌어요." data-edit-input="comment-1" />
          </div>
          <div class="comment-card__actions">
            <div class="counter-chip counter-chip--inline" data-counter-widget="comment-like-1">
              <button class="counter-chip__button" type="button" data-counter-button="true">좋아요</button>
              <strong class="counter-chip__value" data-counter-value="true">4</strong>
            </div>
            <button class="comment-edit-button" type="button" data-edit-button="comment-1">수정</button>
          </div>
        </article>

        <article class="comment-card" data-key="comment-3">
          <div class="comment-card__body">
            <strong>@observer</strong>
            <p data-comment-text="true">Patch 전후 차이를 시각적으로 확인하기 쉬워졌습니다.</p>
            <input class="comment-editor__input" type="text" value="Patch 전후 차이를 시각적으로 확인하기 쉬워졌습니다." data-edit-input="comment-3" />
          </div>
          <div class="comment-card__actions">
            <div class="counter-chip counter-chip--inline" data-counter-widget="comment-like-3">
              <button class="counter-chip__button" type="button" data-counter-button="true">좋아요</button>
              <strong class="counter-chip__value" data-counter-value="true">2</strong>
            </div>
            <button class="comment-edit-button" type="button" data-edit-button="comment-3">수정</button>
          </div>
        </article>
      </section>

      <div class="comment-composer" data-key="comment-composer">
        <input class="comment-composer__input" type="text" value="" placeholder="댓글을 입력하세요" data-add-comment-input="true" />
        <button class="comment-composer__button" type="button" data-add-comment-button="true">댓글 추가</button>
      </div>
    </article>
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

function findVNode(node, predicate) {
  if (!node) {
    return null;
  }

  if (predicate(node)) {
    return node;
  }

  for (const child of node.children || []) {
    const found = findVNode(child, predicate);
    if (found) {
      return found;
    }
  }

  return null;
}

function readVNodeText(node) {
  if (!node) {
    return "";
  }

  if (node.type === "text") {
    return node.text || "";
  }

  return (node.children || [])
    .filter((child) => child.type === "text")
    .map((child) => child.text || "")
    .join("");
}

function writeVNodeText(node, value) {
  if (!node) {
    return;
  }

  const nextValue = String(value);
  const textChild = (node.children || []).find((child) => child.type === "text");
  if (textChild) {
    textChild.text = nextValue;
    return;
  }

  node.children = [
    {
      type: "text",
      tag: null,
      attrs: {},
      children: [],
      text: nextValue,
      key: null,
      path: "",
      depth: 0
    },
    ...(node.children || [])
  ];
}

function createTextVNode(text) {
  return {
    type: "text",
    tag: null,
    attrs: {},
    children: [],
    text: String(text),
    key: null,
    path: "",
    depth: 0
  };
}

function createElementVNode(tag, attrs = {}, children = []) {
  return {
    type: "element",
    tag,
    attrs,
    children,
    text: "",
    key: attrs["data-key"] || attrs.key || null,
    path: "",
    depth: 0
  };
}

function createCommentVNode(commentKey, author, text, likes = 0) {
  return createElementVNode("article", { class: "comment-card", "data-key": commentKey }, [
    createElementVNode("div", { class: "comment-card__body" }, [
      createElementVNode("strong", {}, [createTextVNode(author)]),
      createElementVNode("p", { "data-comment-text": true }, [createTextVNode(text)]),
      createElementVNode(
        "input",
        { class: "comment-editor__input", type: "text", value: text, "data-edit-input": commentKey },
        []
      )
    ]),
    createElementVNode("div", { class: "comment-card__actions" }, [
      createElementVNode(
        "div",
        { class: "counter-chip counter-chip--inline", "data-counter-widget": `comment-like-${commentKey.replace("comment-", "")}` },
        [
          createElementVNode("button", { class: "counter-chip__button", type: "button", "data-counter-button": true }, [
            createTextVNode("좋아요")
          ]),
          createElementVNode("strong", { class: "counter-chip__value", "data-counter-value": true }, [
            createTextVNode(likes)
          ])
        ]
      ),
      createElementVNode("button", { class: "comment-edit-button", type: "button", "data-edit-button": commentKey }, [
        createTextVNode("수정")
      ])
    ])
  ]);
}

function getCommentLikeCountFromVNode(commentNode) {
  const counterNode = findVNode(
    commentNode,
    (node) => node.attrs && Object.prototype.hasOwnProperty.call(node.attrs, "data-counter-value")
  );
  return Number(readVNodeText(counterNode) || 0);
}

function updateCommentCount(nextTree) {
  const commentsNode = findVNode(
    nextTree,
    (node) => node.attrs && node.attrs["data-key"] === "post-comments"
  );
  const commentCountNode = findVNode(
    nextTree,
    (node) => node.attrs && Object.prototype.hasOwnProperty.call(node.attrs, "data-comment-count")
  );

  if (commentsNode && commentCountNode) {
    writeVNodeText(commentCountNode, commentsNode.children.length);
  }
}

function getNextCommentKey(commentsNode) {
  const ids = (commentsNode.children || [])
    .map((child) => Number(String(child.attrs?.["data-key"] || "").replace("comment-", "")))
    .filter((value) => Number.isFinite(value));

  return `comment-${(ids.length ? Math.max(...ids) : 0) + 1}`;
}

function getInteractionAction(root, event) {
  const counterTrigger = event.target.closest("[data-counter-button]");
  if (counterTrigger && root.contains(counterTrigger)) {
    const widget = counterTrigger.closest("[data-counter-widget]");
    return widget ? { type: "increment-counter", widgetId: widget.getAttribute("data-counter-widget") } : null;
  }

  const followButton = event.target.closest("[data-follow-button]");
  if (followButton && root.contains(followButton)) {
    return { type: "toggle-follow" };
  }

  const addCommentButton = event.target.closest("[data-add-comment-button]");
  if (addCommentButton && root.contains(addCommentButton)) {
    const input = root.querySelector("[data-add-comment-input]");
    const text = input ? input.value.trim() : "";
    return text ? { type: "add-comment", text } : null;
  }

  const editButton = event.target.closest("[data-edit-button]");
  if (editButton && root.contains(editButton)) {
    const commentKey = editButton.getAttribute("data-edit-button");
    const input = root.querySelector(`[data-edit-input="${commentKey}"]`);
    const text = input ? input.value.trim() : "";
    return commentKey && text ? { type: "edit-comment", commentKey, text } : null;
  }

  return null;
}

function buildInteractiveNextTree(sourceTree, action) {
  if (!action) {
    return cloneVNodeTree(sourceTree);
  }

  const nextTree = cloneVNodeTree(sourceTree);
  const commentsNode = findVNode(
    nextTree,
    (node) => node.attrs && node.attrs["data-key"] === "post-comments"
  );
  const composerInputNode = findVNode(
    nextTree,
    (node) => node.attrs && Object.prototype.hasOwnProperty.call(node.attrs, "data-add-comment-input")
  );

  switch (action.type) {
    case "increment-counter": {
      const widgetNode = findVNode(
        nextTree,
        (node) => node.attrs && node.attrs["data-counter-widget"] === action.widgetId
      );
      const counterNode = findVNode(
        widgetNode,
        (node) => node.attrs && Object.prototype.hasOwnProperty.call(node.attrs, "data-counter-value")
      );
      if (counterNode) {
        const nextValue = Number(readVNodeText(counterNode) || 0) + 1;
        writeVNodeText(counterNode, nextValue);
      }

      if (commentsNode && action.widgetId.startsWith("comment-like-")) {
        commentsNode.children = [...(commentsNode.children || [])].sort((left, right) => {
          const diff = getCommentLikeCountFromVNode(right) - getCommentLikeCountFromVNode(left);
          if (diff !== 0) {
            return diff;
          }

          return (left.attrs?.["data-key"] || "").localeCompare(right.attrs?.["data-key"] || "");
        });
      }
      break;
    }
    case "toggle-follow": {
      const followNode = findVNode(
        nextTree,
        (node) => node.attrs && Object.prototype.hasOwnProperty.call(node.attrs, "data-follow-button")
      );
      if (followNode) {
        const isFollowing = String(followNode.attrs["data-following"]) === "true";
        followNode.attrs["data-following"] = isFollowing ? "false" : "true";
        writeVNodeText(followNode, isFollowing ? "팔로우" : "팔로잉");
      }
      break;
    }
    case "add-comment": {
      if (commentsNode) {
        const nextCommentKey = getNextCommentKey(commentsNode);
        commentsNode.children = commentsNode.children.concat(
          createCommentVNode(nextCommentKey, "@week4.team3", action.text, 0)
        );
      }
      if (composerInputNode) {
        composerInputNode.attrs.value = "";
      }
      break;
    }
    case "edit-comment": {
      const commentNode = findVNode(
        nextTree,
        (node) => node.attrs && node.attrs["data-key"] === action.commentKey
      );
      if (commentNode) {
        const textNode = findVNode(
          commentNode,
          (node) => node.attrs && Object.prototype.hasOwnProperty.call(node.attrs, "data-comment-text")
        );
        const inputNode = findVNode(
          commentNode,
          (node) => node.attrs && node.attrs["data-edit-input"] === action.commentKey
        );
        if (textNode) {
          writeVNodeText(textNode, action.text);
        }
        if (inputNode) {
          inputNode.attrs.value = action.text;
        }
      }
      break;
    }
    default:
      break;
  }

  updateCommentCount(nextTree);
  return normalizeVNodeTree(nextTree);
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
          <div class="editor-patch-panel">
            <div class="lab-card__head lab-card__head--compact">
              <div>
                <p class="eyebrow">Patch Feed</p>
                <h3 class="card-title">최소 변경 결과</h3>
              </div>
              <span id="patchCount" class="runtime-badge">0 patches</span>
            </div>
            <div id="patchSummary" class="case-grid"></div>
            <div id="patchDetails" class="lab-feed"></div>
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

  const handleActualInteraction = (event) => {
    const action = getInteractionAction(ui.actualRoot, event);
    if (!action) {
      return;
    }

    const nextTree = buildInteractiveNextTree(state.actualTree, action);
    const patches = diffVNodeTrees(state.actualTree, nextTree);
    applyPatchesToDom(ui.actualRoot, patches, nextTree);
    state.actualTree = cloneVNodeTree(nextTree);
  };

  const handleTestInteraction = (event) => {
    const action = getInteractionAction(ui.testRoot, event);
    if (!action) {
      return;
    }

    const nextTree = buildInteractiveNextTree(state.draftTree, action);
    const patches = diffVNodeTrees(state.draftTree, nextTree);
    applyPatchesToDom(ui.testRoot, patches, nextTree);
    state.draftTree = cloneVNodeTree(nextTree);
    syncEditorToDraft();
    renderTreeStats();
  };

  ui.actualRoot.addEventListener("click", handleActualInteraction);
  ui.testRoot.addEventListener("click", handleTestInteraction);

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
    ui.actualRoot.removeEventListener("click", handleActualInteraction);
    ui.testRoot.removeEventListener("click", handleTestInteraction);
    observer.disconnect();
    container.innerHTML = "";
  };
}
