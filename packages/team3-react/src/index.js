const TEXT_ELEMENT = "TEXT_ELEMENT";
const FRAGMENT = Symbol.for("team3-react.fragment");

const roots = new WeakMap();

function flattenChildren(items, target = []) {
  items.forEach((item) => {
    if (Array.isArray(item)) {
      flattenChildren(item, target);
      return;
    }

    if (item === null || item === undefined || item === false || item === true) {
      return;
    }

    target.push(item);
  });

  return target;
}

function createTextElement(value) {
  return {
    type: TEXT_ELEMENT,
    key: null,
    props: {
      nodeValue: String(value),
      children: []
    }
  };
}

export function createElement(type, config, ...children) {
  const props = {};
  let key = null;

  if (config) {
    Object.entries(config).forEach(([name, value]) => {
      if (name === "key") {
        key = value;
      } else {
        props[name] = value;
      }
    });
  }

  const normalizedChildren = flattenChildren(children).map((child) =>
    typeof child === "object" ? child : createTextElement(child)
  );

  props.children = normalizedChildren;

  return {
    type,
    key,
    props
  };
}

export class Component {
  constructor(props) {
    this.props = props || {};
    this.state = this.state || {};
    this.__internalInstance = null;
    this.__pendingStates = [];
    this.__forceUpdate = false;
  }

  setState(partialState) {
    this.__pendingStates.push(partialState);
    updateInstance(this.__internalInstance);
  }

  forceUpdate() {
    this.__forceUpdate = true;
    updateInstance(this.__internalInstance);
  }
}

export const Fragment = FRAGMENT;
export const version = "0.1.0";
export const VNODE_PATCH_TYPES = {
  CREATE: "CREATE",
  REMOVE: "REMOVE",
  REPLACE: "REPLACE",
  TEXT: "TEXT",
  ATTR_SET: "ATTR_SET",
  ATTR_REMOVE: "ATTR_REMOVE",
  REORDER_CHILDREN: "REORDER_CHILDREN"
};

function isEventProp(name) {
  return /^on[A-Z]/.test(name);
}

function isStyleProp(name) {
  return name === "style";
}

function isChildrenProp(name) {
  return name === "children";
}

function isClassComponent(type) {
  return typeof type === "function" && type.prototype instanceof Component;
}

function normalizeElement(element) {
  if (element === null || element === undefined || element === false || element === true) {
    return createTextElement("");
  }

  if (Array.isArray(element)) {
    return createElement(FRAGMENT, null, ...element);
  }

  if (typeof element === "object") {
    return element;
  }

  return createTextElement(element);
}

function createDom(element) {
  if (element.type === TEXT_ELEMENT) {
    return document.createTextNode(element.props.nodeValue);
  }

  if (element.type === FRAGMENT) {
    return document.createTextNode("");
  }

  const dom = document.createElement(element.type);
  updateDomProperties(dom, {}, element.props);
  return dom;
}

function setDomAttribute(dom, name, value) {
  if (name === "value" || name === "checked" || name === "selected" || name === "disabled") {
    dom[name] = value == null ? (name === "value" ? "" : false) : value;

    if (value === null || value === undefined || value === false) {
      dom.removeAttribute(name);
    } else if (value === true) {
      dom.setAttribute(name, "");
    } else {
      dom.setAttribute(name, value);
    }

    return;
  }

  if (name === "className") {
    if (value == null || value === false) {
      dom.removeAttribute("class");
    } else {
      dom.setAttribute("class", value);
    }
    return;
  }

  if (value === null || value === undefined || value === false) {
    dom.removeAttribute(name);
    return;
  }

  if (value === true) {
    dom.setAttribute(name, "");
    return;
  }

  dom.setAttribute(name, value);
}

function updateStyle(dom, prevStyle = {}, nextStyle = {}) {
  Object.keys(prevStyle).forEach((key) => {
    if (!(key in nextStyle)) {
      dom.style[key] = "";
    }
  });

  Object.entries(nextStyle).forEach(([key, value]) => {
    dom.style[key] = value;
  });
}

function updateDomProperties(dom, prevProps, nextProps) {
  Object.keys(prevProps)
    .filter((name) => isEventProp(name))
    .forEach((name) => {
      const eventType = name.slice(2).toLowerCase();
      dom.removeEventListener(eventType, prevProps[name]);
    });

  Object.keys(prevProps)
    .filter((name) => !isEventProp(name) && !isChildrenProp(name))
    .forEach((name) => {
      if (isStyleProp(name)) {
        updateStyle(dom, prevProps[name], {});
        return;
      }

      if (!(name in nextProps)) {
        setDomAttribute(dom, name, null);
      }
    });

  Object.entries(nextProps)
    .filter(([name]) => !isEventProp(name) && !isChildrenProp(name))
    .forEach(([name, value]) => {
      if (isStyleProp(name)) {
        updateStyle(dom, prevProps[name], value);
        return;
      }

      if (prevProps[name] !== value) {
        setDomAttribute(dom, name, value);
      }
    });

  Object.keys(nextProps)
    .filter((name) => isEventProp(name))
    .forEach((name) => {
      const eventType = name.slice(2).toLowerCase();
      if (prevProps[name] !== nextProps[name]) {
        dom.addEventListener(eventType, nextProps[name]);
      }
    });
}

function getChildren(element) {
  return (element.props && element.props.children) || [];
}

function createInstance(element, rootContainer) {
  const normalizedElement = normalizeElement(element);

  if (typeof normalizedElement.type === "function") {
    if (isClassComponent(normalizedElement.type)) {
      const publicInstance = new normalizedElement.type(normalizedElement.props);
      publicInstance.props = normalizedElement.props;
      publicInstance.state = publicInstance.state || {};
      const childElement = normalizeElement(publicInstance.render());
      const childInstance = createInstance(childElement, rootContainer);
      const instance = {
        element: normalizedElement,
        dom: childInstance.dom,
        childInstance,
        publicInstance,
        parentDom: null,
        parentInstance: null,
        rootContainer
      };
      publicInstance.__internalInstance = instance;
      return instance;
    }

    const childElement = normalizeElement(normalizedElement.type(normalizedElement.props));
    const childInstance = createInstance(childElement, rootContainer);
    return {
      element: normalizedElement,
      dom: childInstance.dom,
      childInstance,
      publicInstance: null,
      parentDom: null,
      parentInstance: null,
      rootContainer
    };
  }

  const dom = createDom(normalizedElement);
  const childElements = getChildren(normalizedElement);
  const childInstances = childElements.map((child) => createInstance(child, rootContainer));
  const instance = {
    element: normalizedElement,
    dom,
    childInstances,
    parentDom: null,
    parentInstance: null,
    rootContainer
  };

  childInstances.forEach((childInstance) => {
    linkInstance(childInstance, normalizedElement.type === FRAGMENT ? null : dom, rootContainer);
    if (normalizedElement.type !== FRAGMENT) {
      dom.appendChild(childInstance.dom);
    }
  });

  return instance;
}

function linkInstance(instance, parentDom, rootContainer, parentInstance = null) {
  if (!instance) {
    return null;
  }

  instance.parentDom = parentDom;
  instance.rootContainer = rootContainer;
  instance.parentInstance = parentInstance;

  if (instance.publicInstance) {
    instance.publicInstance.__internalInstance = instance;
  }

  if (instance.childInstances) {
    instance.childInstances.forEach((childInstance) => linkInstance(childInstance, instance.dom, rootContainer, instance));
  }

  if (instance.childInstance) {
    linkInstance(instance.childInstance, parentDom, rootContainer, instance);
  }

  return instance;
}

function commitMount(instance) {
  if (!instance) {
    return;
  }

  if (instance.childInstances) {
    instance.childInstances.forEach(commitMount);
  }

  if (instance.childInstance) {
    commitMount(instance.childInstance);
  }

  if (instance.publicInstance && !instance.publicInstance.__mounted) {
    instance.publicInstance.__mounted = true;
    if (typeof instance.publicInstance.componentDidMount === "function") {
      instance.publicInstance.componentDidMount();
    }
  }
}

function unmountInstance(instance) {
  if (!instance) {
    return;
  }

  if (instance.publicInstance && typeof instance.publicInstance.componentWillUnmount === "function") {
    instance.publicInstance.componentWillUnmount();
  }

  if (instance.childInstances) {
    instance.childInstances.forEach(unmountInstance);
  }

  if (instance.childInstance) {
    unmountInstance(instance.childInstance);
  }
}

function consumePendingState(publicInstance, nextProps) {
  if (!publicInstance || !publicInstance.__pendingStates.length) {
    return publicInstance ? publicInstance.state : {};
  }

  let nextState = publicInstance.state;

  publicInstance.__pendingStates.forEach((update) => {
    const partialState = typeof update === "function" ? update(nextState, nextProps) : update;
    nextState = Object.assign({}, nextState, partialState);
  });

  publicInstance.__pendingStates = [];
  return nextState;
}

function reconcileChildren(instance, element, rootContainer) {
  const dom = instance.dom;
  const prevChildInstances = instance.childInstances || [];
  const nextChildElements = getChildren(element).map(normalizeElement);

  const keyedPrev = new Map();
  prevChildInstances.forEach((childInstance, index) => {
    const key = childInstance.element.key != null ? childInstance.element.key : `__index_${index}`;
    keyedPrev.set(key, childInstance);
  });

  const nextChildInstances = [];
  nextChildElements.forEach((childElement, index) => {
    const key = childElement.key != null ? childElement.key : `__index_${index}`;
    const previousChild = keyedPrev.get(key) || null;
    const nextChildInstance = reconcile(dom, previousChild, childElement, rootContainer, instance);
    if (nextChildInstance) {
      nextChildInstances.push(nextChildInstance);
    }
    keyedPrev.delete(key);
  });

  keyedPrev.forEach((childInstance) => {
    reconcile(dom, childInstance, null, rootContainer, instance);
  });

  nextChildInstances.forEach((childInstance, index) => {
    const expectedNode = dom.childNodes[index] || null;
    if (childInstance.dom !== expectedNode) {
      dom.insertBefore(childInstance.dom, expectedNode);
    }
  });

  return nextChildInstances;
}

function reconcile(
  parentDom,
  instance,
  element,
  rootContainer = instance ? instance.rootContainer : parentDom,
  parentInstance = instance ? instance.parentInstance : null
) {
  const normalizedElement = element == null ? null : normalizeElement(element);

  if (instance == null && normalizedElement == null) {
    return null;
  }

  if (instance == null) {
    const newInstance = linkInstance(createInstance(normalizedElement, rootContainer), parentDom, rootContainer, parentInstance);
    if (parentDom && newInstance.element.type !== FRAGMENT) {
      parentDom.appendChild(newInstance.dom);
    }
    commitMount(newInstance);
    return newInstance;
  }

  if (normalizedElement == null) {
    unmountInstance(instance);
    if (parentDom && instance.element.type !== FRAGMENT) {
      parentDom.removeChild(instance.dom);
    }
    return null;
  }

  if (instance.element.type !== normalizedElement.type) {
    const replacement = linkInstance(createInstance(normalizedElement, rootContainer), parentDom, rootContainer, parentInstance);
    if (parentDom) {
      parentDom.replaceChild(replacement.dom, instance.dom);
    }
    unmountInstance(instance);
    commitMount(replacement);
    return replacement;
  }

  if (typeof normalizedElement.type === "function") {
    if (instance.publicInstance) {
      const publicInstance = instance.publicInstance;
      const prevProps = publicInstance.props;
      const prevState = publicInstance.state;
      const nextProps = normalizedElement.props;
      const nextState = consumePendingState(publicInstance, nextProps);
      const shouldUpdate = publicInstance.__forceUpdate ||
        typeof publicInstance.shouldComponentUpdate !== "function" ||
        publicInstance.shouldComponentUpdate(nextProps, nextState) !== false;

      publicInstance.__forceUpdate = false;
      publicInstance.props = nextProps;
      publicInstance.state = nextState;
      instance.element = normalizedElement;

      if (!shouldUpdate) {
        return instance;
      }

      const childElement = normalizeElement(publicInstance.render());
      const nextChildInstance = reconcile(parentDom, instance.childInstance, childElement, rootContainer, instance);
      instance.dom = nextChildInstance.dom;
      instance.childInstance = nextChildInstance;

      if (typeof publicInstance.componentDidUpdate === "function") {
        publicInstance.componentDidUpdate(prevProps, prevState);
      }

      return instance;
    }

    const childElement = normalizeElement(normalizedElement.type(normalizedElement.props));
    const nextChildInstance = reconcile(parentDom, instance.childInstance, childElement, rootContainer, instance);
    instance.element = normalizedElement;
    instance.dom = nextChildInstance.dom;
    instance.childInstance = nextChildInstance;
    return instance;
  }

  if (normalizedElement.type === TEXT_ELEMENT) {
    if (instance.element.props.nodeValue !== normalizedElement.props.nodeValue) {
      instance.dom.nodeValue = normalizedElement.props.nodeValue;
    }
    instance.element = normalizedElement;
    return instance;
  }

  updateDomProperties(instance.dom, instance.element.props, normalizedElement.props);
  instance.childInstances = reconcileChildren(instance, normalizedElement, rootContainer);
  instance.element = normalizedElement;
  return instance;
}

function updateInstance(internalInstance) {
  if (!internalInstance) {
    return;
  }

  const nextInstance = reconcile(
    internalInstance.parentDom,
    internalInstance,
    internalInstance.element,
    internalInstance.rootContainer
  );

  if (nextInstance && nextInstance.rootContainer) {
    let rootInstance = nextInstance;
    while (rootInstance.parentInstance) {
      rootInstance = rootInstance.parentInstance;
    }
    roots.set(nextInstance.rootContainer, rootInstance);
  }
}

export function render(element, container) {
  const previousInstance = roots.get(container) || null;
  const nextInstance = reconcile(container, previousInstance, element, container);

  if (nextInstance) {
    roots.set(container, nextInstance);
  } else {
    roots.delete(container);
  }

  return nextInstance && nextInstance.publicInstance ? nextInstance.publicInstance : nextInstance;
}

function cloneTree(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function buildVNodeKey(attrs, fallbackKey) {
  if (!attrs) {
    return fallbackKey;
  }

  return attrs["data-key"] || attrs.key || attrs.id || fallbackKey;
}

function createVNodeRoot() {
  return {
    type: "root",
    tag: null,
    attrs: {},
    children: [],
    text: "",
    key: "__root__",
    path: "0",
    depth: 0
  };
}

function getComparableChildNodes(node) {
  return Array.from(node.childNodes || []).filter((child) => {
    if (child.nodeType === Node.COMMENT_NODE) {
      return false;
    }

    if (child.nodeType === Node.TEXT_NODE) {
      return Boolean((child.textContent || "").trim());
    }

    return child.nodeType === Node.ELEMENT_NODE;
  });
}

function domNodeToVNodeTree(node, path, depth) {
  if (!node) {
    return null;
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    return null;
  }

  if (node.nodeType === Node.TEXT_NODE) {
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

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const attrs = {};
  Array.from(node.attributes || []).forEach((attribute) => {
    attrs[attribute.name] = attribute.value === "" ? true : attribute.value;
  });

  const children = [];
  let childIndex = 0;
  Array.from(node.childNodes || []).forEach((child) => {
    const childVNode = domNodeToVNodeTree(child, `${path}-${childIndex}`, depth + 1);
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
    key: buildVNodeKey(attrs, `${node.tagName.toLowerCase()}-${path}`),
    path,
    depth
  };
}

export function domToVNodeTree(container) {
  const root = createVNodeRoot();
  let childIndex = 0;

  Array.from(container.childNodes || []).forEach((child) => {
    const childVNode = domNodeToVNodeTree(child, `0-${childIndex}`, 1);
    if (childVNode) {
      root.children.push(childVNode);
      childIndex += 1;
    }
  });

  return root;
}

export function normalizeVNodeTree(vNode, path = "0", depth = 0) {
  if (!vNode) {
    return null;
  }

  vNode.path = path;
  vNode.depth = depth;

  if (vNode.type === "element") {
    vNode.key = buildVNodeKey(vNode.attrs, `${vNode.tag}-${path}`);
  }

  (vNode.children || []).forEach((child, index) => {
    normalizeVNodeTree(child, `${path}-${index}`, depth + 1);
  });

  return vNode;
}

export function createDomNodeFromVNodeTree(vNode) {
  if (!vNode) {
    return document.createTextNode("");
  }

  if (vNode.type === "text") {
    return document.createTextNode(vNode.text || "");
  }

  const element = document.createElement(vNode.tag);
  Object.entries(vNode.attrs || {}).forEach(([name, value]) => {
    if (value === true) {
      element.setAttribute(name, "");
    } else if (value !== false && value != null) {
      element.setAttribute(name, String(value));
    }
  });

  (vNode.children || []).forEach((child) => element.appendChild(createDomNodeFromVNodeTree(child)));
  return element;
}

export function renderVNodeTree(container, vNode) {
  container.innerHTML = "";
  (vNode.children || []).forEach((child) => container.appendChild(createDomNodeFromVNodeTree(child)));
}

export function serializeVNodeTreeHTML(vNode) {
  const wrapper = document.createElement("div");
  (vNode.children || []).forEach((child) => wrapper.appendChild(createDomNodeFromVNodeTree(child)));
  return wrapper.innerHTML;
}

export function countVNodeNodes(vNode) {
  if (!vNode) {
    return 0;
  }

  return 1 + (vNode.children || []).reduce((total, child) => total + countVNodeNodes(child), 0);
}

export function getVNodeMaxDepth(vNode) {
  if (!vNode) {
    return 0;
  }

  if (!vNode.children || !vNode.children.length) {
    return vNode.depth || 0;
  }

  return Math.max(...vNode.children.map((child) => getVNodeMaxDepth(child)));
}

function describeVNodeNode(vNode) {
  if (!vNode) {
    return "null";
  }

  if (vNode.type === "text") {
    return `#text("${(vNode.text || "").replace(/\s+/g, " ").trim()}")`;
  }

  return `<${vNode.tag}>`;
}

export function traverseVNodeDFS(root) {
  const order = [];

  function visit(node) {
    if (!node) {
      return;
    }

    order.push({ path: node.path, label: describeVNodeNode(node), depth: node.depth });
    (node.children || []).forEach(visit);
  }

  visit(root);
  return order;
}

export function traverseVNodeBFS(root) {
  if (!root) {
    return [];
  }

  const order = [];
  const queue = [root];

  while (queue.length) {
    const current = queue.shift();
    order.push({ path: current.path, label: describeVNodeNode(current), depth: current.depth });
    (current.children || []).forEach((child) => queue.push(child));
  }

  return order;
}

function diffVNodeAttrs(oldAttrs = {}, newAttrs = {}, path, patches) {
  Object.keys(newAttrs).forEach((name) => {
    if (oldAttrs[name] !== newAttrs[name]) {
      patches.push({ type: VNODE_PATCH_TYPES.ATTR_SET, path, name, value: newAttrs[name] });
    }
  });

  Object.keys(oldAttrs).forEach((name) => {
    if (!(name in newAttrs)) {
      patches.push({ type: VNODE_PATCH_TYPES.ATTR_REMOVE, path, name });
    }
  });
}

function createVNodeChildKeyMap(children) {
  const map = new Map();
  children.forEach((child, index) => {
    map.set(child.key || `__index_${index}`, index);
  });
  return map;
}

function diffVNodeChildren(oldChildren, newChildren, parentPath, patches) {
  const oldKeyMap = createVNodeChildKeyMap(oldChildren);
  const newKeyMap = createVNodeChildKeyMap(newChildren);
  const nextOrder = [];

  newChildren.forEach((newChild, index) => {
    const lookupKey = newChild.key || `__index_${index}`;
    nextOrder.push(lookupKey);

    if (!oldKeyMap.has(lookupKey)) {
      patches.push({
        type: VNODE_PATCH_TYPES.CREATE,
        path: `${parentPath}-${index}`,
        parentPath,
        index,
        node: newChild
      });
      return;
    }

    const oldIndex = oldKeyMap.get(lookupKey);
    diffVNodeTrees(oldChildren[oldIndex], newChild, `${parentPath}-${index}`, patches);
  });

  oldChildren.forEach((oldChild, index) => {
    const lookupKey = oldChild.key || `__index_${index}`;
    if (!newKeyMap.has(lookupKey)) {
      patches.push({
        type: VNODE_PATCH_TYPES.REMOVE,
        path: oldChild.path || `${parentPath}-${index}`,
        parentPath,
        index,
        node: oldChild
      });
    }
  });

  const previousOrder = oldChildren.map((child, index) => child.key || `__index_${index}`);
  if (previousOrder.length === nextOrder.length && previousOrder.join("|") !== nextOrder.join("|")) {
    patches.push({
      type: VNODE_PATCH_TYPES.REORDER_CHILDREN,
      path: parentPath,
      parentPath,
      order: nextOrder
    });
  }
}

export function diffVNodeTrees(oldNode, newNode, path = "0", patches = []) {
  if (!oldNode && newNode) {
    patches.push({
      type: VNODE_PATCH_TYPES.CREATE,
      path,
      parentPath: path.split("-").slice(0, -1).join("-") || "0",
      index: Number(path.split("-").pop() || 0),
      node: newNode
    });
    return patches;
  }

  if (oldNode && !newNode) {
    patches.push({
      type: VNODE_PATCH_TYPES.REMOVE,
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
    patches.push({ type: VNODE_PATCH_TYPES.REPLACE, path, oldNode, newNode });
    return patches;
  }

  if (oldNode.type === "text" && newNode.type === "text") {
    if (oldNode.text !== newNode.text) {
      patches.push({
        type: VNODE_PATCH_TYPES.TEXT,
        path,
        oldText: oldNode.text,
        newText: newNode.text
      });
    }
    return patches;
  }

  diffVNodeAttrs(oldNode.attrs, newNode.attrs, path, patches);
  diffVNodeChildren(oldNode.children || [], newNode.children || [], path, patches);
  return patches;
}

function getDomNodeByTreePath(root, path) {
  if (path === "0") {
    return root;
  }

  let current = root;
  const segments = String(path)
    .split("-")
    .slice(1)
    .map((segment) => Number(segment))
    .filter((segment) => Number.isInteger(segment));

  for (const segment of segments) {
    const comparableChildren = getComparableChildNodes(current);
    if (!comparableChildren[segment]) {
      return null;
    }
    current = comparableChildren[segment];
  }

  return current;
}

function findVNodeTreeByPath(vNode, path) {
  if (!vNode) {
    return null;
  }

  if (vNode.path === path) {
    return vNode;
  }

  for (const child of vNode.children || []) {
    const found = findVNodeTreeByPath(child, path);
    if (found) {
      return found;
    }
  }

  return null;
}

function getVNodeDomKey(node, index) {
  if (!node || node.nodeType !== Node.ELEMENT_NODE) {
    return `__index_${index}`;
  }

  return node.getAttribute("data-key") || node.getAttribute("key") || node.id || `__index_${index}`;
}

function applyVNodeCreatePatch(root, patch) {
  const parent = getDomNodeByTreePath(root, patch.parentPath);
  if (!parent) {
    return;
  }

  const comparableChildren = getComparableChildNodes(parent);
  const referenceNode = comparableChildren[patch.index] || null;
  parent.insertBefore(createDomNodeFromVNodeTree(patch.node), referenceNode);
}

function applyVNodeRemovePatch(root, patch) {
  const target = getDomNodeByTreePath(root, patch.path);
  if (target && target.parentNode) {
    target.parentNode.removeChild(target);
  }
}

function applyVNodeReplacePatch(root, patch) {
  const target = getDomNodeByTreePath(root, patch.path);
  if (target && target.parentNode) {
    target.parentNode.replaceChild(createDomNodeFromVNodeTree(patch.newNode), target);
  }
}

function applyVNodeTextPatch(root, patch) {
  const target = getDomNodeByTreePath(root, patch.path);
  if (target) {
    target.textContent = patch.newText;
  }
}

function applyVNodeAttrSetPatch(root, patch) {
  const target = getDomNodeByTreePath(root, patch.path);
  if (!target || target.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  if (patch.name === "value" || patch.name === "checked" || patch.name === "selected" || patch.name === "disabled") {
    target[patch.name] = patch.value == null ? (patch.name === "value" ? "" : false) : patch.value;
  }

  if (patch.value === true) {
    target.setAttribute(patch.name, "");
  } else {
    target.setAttribute(patch.name, String(patch.value));
  }
}

function applyVNodeAttrRemovePatch(root, patch) {
  const target = getDomNodeByTreePath(root, patch.path);
  if (target && target.nodeType === Node.ELEMENT_NODE) {
    if (patch.name === "value" || patch.name === "checked" || patch.name === "selected" || patch.name === "disabled") {
      target[patch.name] = patch.name === "value" ? "" : false;
    }
    target.removeAttribute(patch.name);
  }
}

function applyVNodeReorderPatch(root, patch, nextTree) {
  const parent = getDomNodeByTreePath(root, patch.path);
  const parentVNode = findVNodeTreeByPath(nextTree, patch.path);
  if (!parent || !parentVNode) {
    return;
  }

  const fragment = document.createDocumentFragment();
  (parentVNode.children || []).forEach((childVNode, index) => {
    fragment.appendChild(createDomNodeFromVNodeTree(childVNode));
  });

  parent.replaceChildren(fragment);
}

function isSameOrDescendantPath(path, ancestorPath) {
  return path === ancestorPath || path.startsWith(`${ancestorPath}-`);
}

function isPatchHandledByReorder(patch, reorderedPaths) {
  return reorderedPaths.some((reorderPath) => {
    if (patch.type === VNODE_PATCH_TYPES.REORDER_CHILDREN) {
      return false;
    }

    if (patch.type === VNODE_PATCH_TYPES.CREATE) {
      return isSameOrDescendantPath(patch.path, reorderPath) && patch.path !== reorderPath;
    }

    return isSameOrDescendantPath(patch.path, reorderPath) && patch.path !== reorderPath;
  });
}

export function applyPatchesToDom(root, patches, nextTree) {
  const reorderedPaths = patches
    .filter((patch) => patch.type === VNODE_PATCH_TYPES.REORDER_CHILDREN)
    .map((patch) => patch.path);
  const removePatches = patches
    .filter((patch) => patch.type === VNODE_PATCH_TYPES.REMOVE)
    .filter((patch) => !isPatchHandledByReorder(patch, reorderedPaths))
    .sort((a, b) => b.path.split("-").length - a.path.split("-").length);
  const createPatches = patches
    .filter((patch) => patch.type === VNODE_PATCH_TYPES.CREATE)
    .filter((patch) => !isPatchHandledByReorder(patch, reorderedPaths))
    .sort((a, b) => a.path.split("-").length - b.path.split("-").length);
  const updatePatches = patches.filter(
    (patch) =>
      ![
        VNODE_PATCH_TYPES.CREATE,
        VNODE_PATCH_TYPES.REMOVE,
        VNODE_PATCH_TYPES.REORDER_CHILDREN
      ].includes(patch.type)
  ).filter((patch) => !isPatchHandledByReorder(patch, reorderedPaths));
  const reorderPatches = patches
    .filter((patch) => patch.type === VNODE_PATCH_TYPES.REORDER_CHILDREN)
    .sort((a, b) => a.path.split("-").length - b.path.split("-").length);

  removePatches.forEach((patch) => applyVNodeRemovePatch(root, patch));
  reorderPatches.forEach((patch) => applyVNodeReorderPatch(root, patch, nextTree));
  createPatches.forEach((patch) => applyVNodeCreatePatch(root, patch));
  updatePatches.forEach((patch) => {
    switch (patch.type) {
      case VNODE_PATCH_TYPES.REPLACE:
        applyVNodeReplacePatch(root, patch);
        break;
      case VNODE_PATCH_TYPES.TEXT:
        applyVNodeTextPatch(root, patch);
        break;
      case VNODE_PATCH_TYPES.ATTR_SET:
        applyVNodeAttrSetPatch(root, patch);
        break;
      case VNODE_PATCH_TYPES.ATTR_REMOVE:
        applyVNodeAttrRemovePatch(root, patch);
        break;
      default:
        break;
    }
  });
}

export function cloneVNodeTree(vNode) {
  return cloneTree(vNode);
}
