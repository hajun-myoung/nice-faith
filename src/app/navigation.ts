import { createSignal, onCleanup } from 'solid-js';
export type View = 'landing' | 'questionnaire' | 'evaluation' | 'report' | 'reveal' | 'reflection';
export interface Route { view: View; question: number }
export function parseRoute(hash: string): Route {
  const match = /^#\/questions\/(\d+)$/.exec(hash);
  if (match) return { view: 'questionnaire', question: Math.max(1, Math.min(12, Number(match[1]))) };
  const view = hash.replace(/^#\//, '');
  return { view: ['evaluation', 'report', 'reveal', 'reflection'].includes(view) ? view as View : 'landing', question: 1 };
}
export function useNavigation() {
  const [route, setRoute] = createSignal(parseRoute(location.hash));
  const sync = () => setRoute(parseRoute(location.hash));
  window.addEventListener('popstate', sync);
  window.addEventListener('hashchange', sync);
  onCleanup(() => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); });
  const navigate = (view: View, question = 1, replace = false) => {
    const hash = view === 'landing' ? '#/' : view === 'questionnaire' ? `#/questions/${question}` : `#/${view}`;
    // Browser history stores route only, never responses or the report.
    history[replace ? 'replaceState' : 'pushState'](null, '', `${location.pathname}${location.search}${hash}`);
    setRoute({ view, question });
  };
  return { route, navigate };
}
