import { mountDemoTab } from "./tabs/demo.js";
import { mountBenchmarkTab } from "./tabs/benchmark.js";

const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
const outlet = document.querySelector("#tabOutlet");
const tabSubtitle = document.querySelector("#tabSubtitle");

const tabs = {
  demo: {
    title: "Demo Lab",
    subtitle: "실제 영역과 테스트 영역에서 DOM -> VDOM -> Diff -> Patch -> History 흐름을 검증합니다.",
    mount: mountDemoTab
  },
  benchmark: {
    title: "Benchmark",
    subtitle: "team3-react의 sync reconciliation과 수동 DOM 갱신을 같은 시나리오로 비교합니다.",
    mount: mountBenchmarkTab
  }
};

let activeCleanup = () => {};

function switchTab(nextTab) {
  const tab = tabs[nextTab];
  if (!tab) {
    return;
  }

  activeCleanup();
  outlet.innerHTML = "";

  tabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === nextTab);
  });

  document.title = `${tab.title} | Week4 Team3 Project`;
  tabSubtitle.textContent = tab.subtitle;
  activeCleanup = tab.mount(outlet) || (() => {});
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});

switchTab("demo");
