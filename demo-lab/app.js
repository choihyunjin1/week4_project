import { mountDemoTab } from "../apps/showcase/tabs/demo.js";

const root = document.getElementById("demo-root");

function waitForFonts(timeoutMs = 800) {
  if (!document.fonts?.ready) {
    return Promise.resolve();
  }

  return Promise.race([
    document.fonts.ready.catch(() => undefined),
    new Promise((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    })
  ]);
}

async function bootDemoLab() {
  mountDemoTab(root);

  try {
    await waitForFonts();
  } catch (error) {
    console.warn("Demo Lab font readiness check failed:", error);
  }

  requestAnimationFrame(() => {
    document.body.classList.add("demo-lab-ready");

    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "demo-lab-ready" }, window.location.origin);
    }
  });
}

bootDemoLab();
