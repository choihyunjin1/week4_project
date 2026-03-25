(function attachVDOMEngine(global) {
  const NODE_TYPE = {
    ELEMENT: 1,
    TEXT: 3,
    COMMENT: 8
  };

  const PATCH_TYPES = {
    CREATE: "CREATE",
    REMOVE: "REMOVE",
    REPLACE: "REPLACE",
    TEXT: "TEXT",
    ATTR_SET: "ATTR_SET",
    ATTR_REMOVE: "ATTR_REMOVE",
    REORDER_CHILDREN: "REORDER_CHILDREN"
  };

  function cloneVNode(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function buildKey(attrs, fallbackKey) {
    if (!attrs) {
      return fallbackKey;
    }

    return attrs["data-key"] || attrs.key || attrs.id || fallbackKey;
  }

  function createRootContainer() {
    return {
      type: "element",
      tag: "div",
      attrs: { "data-virtual-root": "true" },
      children: [],
      text: "",
      key: "__root__",
      path: "0",
      depth: 0
    };
  }

  function createTextVNode(text) {
    return {
      type: "text",
      tag: null,
      attrs: {},
      children: [],
      text: text == null ? "" : String(text),
      key: null,
      path: "",
      depth: 0
    };
  }

  function createElementVNode(tag, attrs = {}, children = []) {
    return {
      type: "element",
      tag: String(tag).toLowerCase(),
      attrs: { ...attrs },
      children: children.map((child) => (typeof child === "string" ? createTextVNode(child) : child)),
      text: "",
      key: buildKey(attrs, `${String(tag).toLowerCase()}-pending`),
      path: "",
      depth: 0
    };
  }

  function serializeHTML(node) {
    return node ? node.innerHTML.trim() : "";
  }

  function safelyParseHTML(html) {
    const template = document.createElement("template");

    try {
      template.innerHTML = html && html.trim() ? html.trim() : "";
    } catch (error) {
      return {
        fragment: template.content,
        error
      };
    }

    return {
      fragment: template.content,
      error: null
    };
  }

  function renderHTMLIntoTarget(target, html) {
    const { fragment, error } = safelyParseHTML(html);
    target.innerHTML = "";

    if (fragment.childNodes.length) {
      target.appendChild(fragment.cloneNode(true));
    }

    return error;
  }

  function isComparableDomNode(node) {
    if (!node) {
      return false;
    }

    if (node.nodeType === NODE_TYPE.COMMENT) {
      return false;
    }

    if (node.nodeType === NODE_TYPE.TEXT) {
      return Boolean((node.textContent || "").trim());
    }

    return node.nodeType === NODE_TYPE.ELEMENT;
  }

  function getComparableChildNodes(node) {
    return Array.from(node.childNodes || []).filter((child) => isComparableDomNode(child));
  }

  function pathToSegments(path) {
    return String(path)
      .split("-")
      .slice(1)
      .map((segment) => Number(segment))
      .filter((segment) => Number.isInteger(segment));
  }

  function getPathDepth(path) {
    return String(path).split("-").length;
  }

  function countNodes(vNode) {
    if (!vNode) {
      return 0;
    }

    return 1 + (vNode.children || []).reduce((total, child) => total + countNodes(child), 0);
  }

  function calculateMaxDepth(vNode) {
    if (!vNode) {
      return 0;
    }

    if (!vNode.children || vNode.children.length === 0) {
      return vNode.depth || 0;
    }

    return Math.max(...vNode.children.map((child) => calculateMaxDepth(child)));
  }

  function getNodeDescriptor(vNode) {
    if (!vNode) {
      return "null";
    }

    if (vNode.type === "text") {
      const text = String(vNode.text || "").replace(/\s+/g, " ").trim();
      return `#text("${text}")`;
    }

    return `<${vNode.tag}>`;
  }

  function getReadableNodeSummary(vNode) {
    if (!vNode) {
      return "empty";
    }

    if (vNode.type === "text") {
      const text = String(vNode.text || "").replace(/\s+/g, " ").trim();
      return `text:${text || "(blank)"}`;
    }

    const attrCount = Object.keys(vNode.attrs || {}).length;
    return `${vNode.tag} | attrs:${attrCount} | children:${(vNode.children || []).length}`;
  }

  function domNodeToVNode(node, path, depth) {
    if (!node) {
      return null;
    }

    if (node.nodeType === NODE_TYPE.COMMENT) {
      return null;
    }

    if (node.nodeType === NODE_TYPE.TEXT) {
      const rawText = node.textContent || "";
      if (!rawText.trim()) {
        return null;
      }

      return {
        type: "text",
        tag: null,
        attrs: {},
        children: [],
        text: rawText,
        key: null,
        path,
        depth
      };
    }

    if (node.nodeType !== NODE_TYPE.ELEMENT) {
      return null;
    }

    const attrs = {};
    Array.from(node.attributes || []).forEach((attribute) => {
      attrs[attribute.name] = attribute.value === "" ? true : attribute.value;
    });

    const children = [];
    let childIndex = 0;

    Array.from(node.childNodes || []).forEach((child) => {
      const childVNode = domNodeToVNode(child, `${path}-${childIndex}`, depth + 1);
      if (childVNode) {
        children.push(childVNode);
        childIndex += 1;
      }
    });

    return {
      type: "element",
      tag: node.tagName.toLowerCase(),
      attrs,
      children,
      text: "",
      key: buildKey(attrs, `${node.tagName.toLowerCase()}-${path}`),
      path,
      depth
    };
  }

  function domToVNode(container) {
    const root = createRootContainer();
    let childIndex = 0;

    Array.from(container.childNodes || []).forEach((child) => {
      const childVNode = domNodeToVNode(child, `0-${childIndex}`, 1);
      if (childVNode) {
        root.children.push(childVNode);
        childIndex += 1;
      }
    });

    return root;
  }

  function sourceToVNode(source, options = {}) {
    const container = document.createElement("div");
    const { fragment } = safelyParseHTML(source || "");
    const ignoreTags = options.ignoreTags || ["script"];

    container.appendChild(fragment.cloneNode(true));
    if (ignoreTags.length) {
      container.querySelectorAll(ignoreTags.join(",")).forEach((node) => node.remove());
    }

    return domToVNode(container);
  }

  function normalizeVNodePaths(vNode, path = "0", depth = 0) {
    if (!vNode) {
      return null;
    }

    vNode.path = path;
    vNode.depth = depth;
    if (vNode.type === "element") {
      vNode.key = buildKey(vNode.attrs, `${vNode.tag}-${path}`);
    }

    (vNode.children || []).forEach((child, index) => {
      normalizeVNodePaths(child, `${path}-${index}`, depth + 1);
    });

    return vNode;
  }

  function createDOMFromVNode(vNode) {
    if (!vNode) {
      return document.createTextNode("");
    }

    if (vNode.type === "text") {
      return document.createTextNode(vNode.text || "");
    }

    const element = document.createElement(vNode.tag);
    const attrs = vNode.attrs || {};

    Object.entries(attrs).forEach(([name, value]) => {
      if (value === true) {
        element.setAttribute(name, "");
      } else if (value !== false && value != null) {
        element.setAttribute(name, String(value));
      }
    });

    (vNode.children || []).forEach((child) => {
      element.appendChild(createDOMFromVNode(child));
    });

    return element;
  }

  function renderVNodeToRoot(root, vNode) {
    root.innerHTML = "";
    (vNode.children || []).forEach((child) => {
      root.appendChild(createDOMFromVNode(child));
    });
  }

  function findVNodeByPath(vNode, path) {
    if (!vNode) {
      return null;
    }

    if (vNode.path === path) {
      return vNode;
    }

    for (const child of vNode.children || []) {
      const found = findVNodeByPath(child, path);
      if (found) {
        return found;
      }
    }

    return null;
  }

  function traverseDFS(root) {
    const order = [];

    function visit(node) {
      if (!node) {
        return;
      }

      order.push({
        path: node.path,
        label: getNodeDescriptor(node),
        depth: node.depth
      });

      (node.children || []).forEach((child) => visit(child));
    }

    visit(root);
    return order;
  }

  function traverseBFS(root) {
    if (!root) {
      return [];
    }

    const order = [];
    const queue = [root];

    while (queue.length) {
      const current = queue.shift();
      order.push({
        path: current.path,
        label: getNodeDescriptor(current),
        depth: current.depth
      });

      (current.children || []).forEach((child) => queue.push(child));
    }

    return order;
  }

  function diffAttrs(oldAttrs = {}, newAttrs = {}, path, patches) {
    Object.keys(newAttrs).forEach((name) => {
      if (oldAttrs[name] !== newAttrs[name]) {
        patches.push({
          type: PATCH_TYPES.ATTR_SET,
          path,
          name,
          value: newAttrs[name]
        });
      }
    });

    Object.keys(oldAttrs).forEach((name) => {
      if (!(name in newAttrs)) {
        patches.push({
          type: PATCH_TYPES.ATTR_REMOVE,
          path,
          name
        });
      }
    });
  }

  function createChildKeyMap(children) {
    const map = new Map();

    children.forEach((child, index) => {
      const key = child.key || `__index_${index}`;
      map.set(key, index);
    });

    return map;
  }

  function diffChildren(oldChildren, newChildren, parentPath, patches) {
    const oldKeyMap = createChildKeyMap(oldChildren);
    const newKeyMap = createChildKeyMap(newChildren);
    const order = [];

    newChildren.forEach((newChild, index) => {
      const lookupKey = newChild.key || `__index_${index}`;
      order.push(lookupKey);

      if (!oldKeyMap.has(lookupKey)) {
        patches.push({
          type: PATCH_TYPES.CREATE,
          path: `${parentPath}-${index}`,
          parentPath,
          index,
          node: newChild
        });
        return;
      }

      const oldIndex = oldKeyMap.get(lookupKey);
      diff(oldChildren[oldIndex], newChild, `${parentPath}-${index}`, patches);
    });

    oldChildren.forEach((oldChild, index) => {
      const lookupKey = oldChild.key || `__index_${index}`;
      if (!newKeyMap.has(lookupKey)) {
        patches.push({
          type: PATCH_TYPES.REMOVE,
          path: oldChild.path || `${parentPath}-${index}`,
          parentPath,
          index,
          node: oldChild
        });
      }
    });

    const oldOrder = oldChildren.map((child, index) => child.key || `__index_${index}`);
    if (oldOrder.length === order.length && oldOrder.join("|") !== order.join("|")) {
      patches.push({
        type: PATCH_TYPES.REORDER_CHILDREN,
        path: parentPath,
        parentPath,
        order
      });
    }
  }

  function diff(oldNode, newNode, path = "0", patches = []) {
    if (!oldNode && newNode) {
      patches.push({
        type: PATCH_TYPES.CREATE,
        path,
        parentPath: path.split("-").slice(0, -1).join("-") || "0",
        index: Number(path.split("-").pop() || 0),
        node: newNode
      });
      return patches;
    }

    if (oldNode && !newNode) {
      patches.push({
        type: PATCH_TYPES.REMOVE,
        path,
        parentPath: path.split("-").slice(0, -1).join("-") || "0",
        index: Number(path.split("-").pop() || 0),
        node: oldNode
      });
      return patches;
    }

    if (!oldNode || !newNode) {
      return patches;
    }

    if (oldNode.type !== newNode.type || oldNode.tag !== newNode.tag) {
      patches.push({
        type: PATCH_TYPES.REPLACE,
        path,
        oldNode,
        newNode
      });
      return patches;
    }

    if (oldNode.type === "text" && newNode.type === "text") {
      if (oldNode.text !== newNode.text) {
        patches.push({
          type: PATCH_TYPES.TEXT,
          path,
          oldText: oldNode.text,
          newText: newNode.text
        });
      }
      return patches;
    }

    diffAttrs(oldNode.attrs, newNode.attrs, path, patches);
    diffChildren(oldNode.children || [], newNode.children || [], path, patches);
    return patches;
  }

  function getDomNodeByPath(root, path) {
    if (path === "0") {
      return root;
    }

    let current = root;
    const segments = pathToSegments(path);

    for (const segment of segments) {
      const comparableChildren = getComparableChildNodes(current);
      if (!current || !comparableChildren[segment]) {
        return null;
      }

      current = comparableChildren[segment];
    }

    return current;
  }

  function getDomKey(node, index) {
    if (!node || node.nodeType !== NODE_TYPE.ELEMENT) {
      return `__index_${index}`;
    }

    return node.getAttribute("data-key") || node.id || `${node.tagName.toLowerCase()}-${index}`;
  }

  function applyCreatePatch(root, patch) {
    const parent = getDomNodeByPath(root, patch.parentPath);
    if (!parent) {
      return;
    }

    const referenceNode = getComparableChildNodes(parent)[patch.index] || null;
    parent.insertBefore(createDOMFromVNode(patch.node), referenceNode);
  }

  function applyRemovePatch(root, patch) {
    const target = getDomNodeByPath(root, patch.path);
    if (target && target.parentNode) {
      target.parentNode.removeChild(target);
    }
  }

  function applyReplacePatch(root, patch) {
    const target = getDomNodeByPath(root, patch.path);
    if (target && target.parentNode) {
      target.parentNode.replaceChild(createDOMFromVNode(patch.newNode), target);
    }
  }

  function applyTextPatch(root, patch) {
    const target = getDomNodeByPath(root, patch.path);
    if (target) {
      target.textContent = patch.newText;
    }
  }

  function applyAttrSetPatch(root, patch) {
    const target = getDomNodeByPath(root, patch.path);
    if (!target || target.nodeType !== NODE_TYPE.ELEMENT) {
      return;
    }

    if (patch.value === true) {
      target.setAttribute(patch.name, "");
      return;
    }

    target.setAttribute(patch.name, String(patch.value));
  }

  function applyAttrRemovePatch(root, patch) {
    const target = getDomNodeByPath(root, patch.path);
    if (target && target.nodeType === NODE_TYPE.ELEMENT) {
      target.removeAttribute(patch.name);
    }
  }

  function applyReorderPatch(root, patch, newVNodeRoot) {
    const parent = getDomNodeByPath(root, patch.path);
    const parentVNode = findVNodeByPath(newVNodeRoot, patch.path);

    if (!parent || !parentVNode) {
      return;
    }

    const existingChildren = getComparableChildNodes(parent);
    const existingByKey = new Map();

    existingChildren.forEach((child, index) => {
      existingByKey.set(getDomKey(child, index), child);
    });

    const fragment = document.createDocumentFragment();
    (parentVNode.children || []).forEach((childVNode, index) => {
      const lookupKey = childVNode.key || `__index_${index}`;
      const existingNode = existingByKey.get(lookupKey);
      fragment.appendChild(existingNode || createDOMFromVNode(childVNode));
    });

    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }

    parent.appendChild(fragment);
  }

  function applyPatches(root, patches, newVNodeRoot) {
    const removePatches = patches
      .filter((patch) => patch.type === PATCH_TYPES.REMOVE)
      .sort((a, b) => getPathDepth(b.path) - getPathDepth(a.path));
    const createPatches = patches
      .filter((patch) => patch.type === PATCH_TYPES.CREATE)
      .sort((a, b) => getPathDepth(a.path) - getPathDepth(b.path));
    const updatePatches = patches.filter(
      (patch) => ![PATCH_TYPES.CREATE, PATCH_TYPES.REMOVE, PATCH_TYPES.REORDER_CHILDREN].includes(patch.type)
    );
    const reorderPatches = patches.filter((patch) => patch.type === PATCH_TYPES.REORDER_CHILDREN);

    removePatches.forEach((patch) => applyRemovePatch(root, patch));

    updatePatches.forEach((patch) => {
      switch (patch.type) {
        case PATCH_TYPES.REPLACE:
          applyReplacePatch(root, patch);
          break;
        case PATCH_TYPES.TEXT:
          applyTextPatch(root, patch);
          break;
        case PATCH_TYPES.ATTR_SET:
          applyAttrSetPatch(root, patch);
          break;
        case PATCH_TYPES.ATTR_REMOVE:
          applyAttrRemovePatch(root, patch);
          break;
        default:
          break;
      }
    });

    createPatches.forEach((patch) => applyCreatePatch(root, patch));
    reorderPatches.forEach((patch) => applyReorderPatch(root, patch, newVNodeRoot));
  }

  function serializeVNodeChildrenToHTML(vNode) {
    const wrapper = document.createElement("div");
    (vNode.children || []).forEach((child) => wrapper.appendChild(createDOMFromVNode(child)));
    return wrapper.innerHTML;
  }

  function describePatch(patch) {
    switch (patch.type) {
      case PATCH_TYPES.CREATE:
        return `새 노드 ${getNodeDescriptor(patch.node)} 생성`;
      case PATCH_TYPES.REMOVE:
        return `기존 노드 ${getNodeDescriptor(patch.node)} 제거`;
      case PATCH_TYPES.REPLACE:
        return `${getNodeDescriptor(patch.oldNode)} -> ${getNodeDescriptor(patch.newNode)} 교체`;
      case PATCH_TYPES.TEXT: {
        const oldText = String(patch.oldText || "").replace(/\s+/g, " ").trim();
        const newText = String(patch.newText || "").replace(/\s+/g, " ").trim();
        return `"${oldText}" -> "${newText}"`;
      }
      case PATCH_TYPES.ATTR_SET:
        return `속성 ${patch.name} = "${String(patch.value)}" 설정`;
      case PATCH_TYPES.ATTR_REMOVE:
        return `속성 ${patch.name} 제거`;
      case PATCH_TYPES.REORDER_CHILDREN:
        return `형제 노드 순서 변경: [${patch.order.join(", ")}]`;
      default:
        return "변경 내용 없음";
    }
  }

  function diffRoot(oldRoot, newRoot) {
    return diff(oldRoot, newRoot, "0", []);
  }

  function patchRoot(container, oldRoot, newRoot, patches = diffRoot(oldRoot, newRoot)) {
    applyPatches(container, patches, newRoot);
    return patches;
  }

  const engine = {
    NODE_TYPE,
    PATCH_TYPES,
    cloneVNode,
    buildKey,
    createRootContainer,
    createRootVNode: createRootContainer,
    createElementVNode,
    createTextVNode,
    serializeHTML,
    safelyParseHTML,
    renderHTMLIntoTarget,
    countNodes,
    calculateMaxDepth,
    getNodeDescriptor,
    getReadableNodeSummary,
    domNodeToVNode,
    domToVNode,
    sourceToVNode,
    normalizeVNodePaths,
    createDOMFromVNode,
    renderVNodeToRoot,
    renderRootVNode: renderVNodeToRoot,
    findVNodeByPath,
    traverseDFS,
    traverseBFS,
    diff,
    diffChildren,
    diffRoot,
    applyPatches,
    patchRoot,
    serializeVNodeChildrenToHTML,
    describePatch
  };

  global.VDOMEngine = engine;
})(window);
