import { parseSharedResult } from "../domain/sharing";
import { createSignal, onCleanup } from "solid-js";
export type View =
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
  const sync = () => setRoute(parseRoute(location.hash, location.search));
  window.addEventListener("popstate", sync);
  window.addEventListener("hashchange", sync);
  onCleanup(() => {
    window.removeEventListener("popstate", sync);
    window.removeEventListener("hashchange", sync);
  });
  const navigate = (view: View, question = 1, replace = false) => {
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
    setRoute({ view, question });
  };
  return { route, navigate };
}
