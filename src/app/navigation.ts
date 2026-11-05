import { parseSharedResult } from "../domain/sharing";
import { createSignal, onCleanup } from "solid-js";
export type View =
  | "guestbook"
  | "guestbook-delete"
  | "shared"
  | "landing"
  | "questionnaire"
  | "evaluation"
  | "report"
  | "reveal"
  | "reflection";
export interface Route {
  view: View;
  question: number;
}
export function parseRoute(hash: string, search = ""): Route {
  if (hash.startsWith("#/guestbook/delete"))
    return { view: "guestbook-delete", question: 1 };
  if (hash === "#/guestbook") return { view: "guestbook", question: 1 };
  if (parseSharedResult(search)) return { view: "shared", question: 1 };
  const match = /^#\/questions\/(\d+)$/.exec(hash);
  if (match)
    return {
      view: "questionnaire",
      question: Math.max(1, Math.min(12, Number(match[1]))),
    };
  const view = hash.replace(/^#\//, "");
  return {
    view: ["evaluation", "report", "reveal", "reflection"].includes(view)
      ? (view as View)
      : "landing",
    question: 1,
  };
}
export function useNavigation() {
  const [route, setRoute] = createSignal(
    parseRoute(location.hash, location.search),
  );
  let currentUrl = location.href;
  const mayLeave = () =>
    window.dispatchEvent(
      new Event("nice-faith:before-navigate", { cancelable: true }),
    );
  const sync = () => {
    if (currentUrl !== location.href && !mayLeave()) {
      history.pushState(null, "", currentUrl);
      return;
    }
    currentUrl = location.href;
    setRoute(parseRoute(location.hash, location.search));
  };
  window.addEventListener("popstate", sync);
  window.addEventListener("hashchange", sync);
  onCleanup(() => {
    window.removeEventListener("popstate", sync);
    window.removeEventListener("hashchange", sync);
  });
  const navigate = (view: View, question = 1, replace = false) => {
    if (!mayLeave()) return;
    const hash =
      view === "landing"
        ? "#/"
        : view === "questionnaire"
          ? `#/questions/${question}`
          : `#/${view}`;
    // Starting or navigating our own flow removes any incoming shared result.
    history[replace ? "replaceState" : "pushState"](
      null,
      "",
      `${location.pathname}${hash}`,
    );
    currentUrl = location.href;
    setRoute({ view, question });
  };
  return { route, navigate };
}
