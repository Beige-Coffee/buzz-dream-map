// Buzz supplies React through ctx.react. JSX compiles to React.createElement, so
// every module imports this live binding, set once in apply().
export let React = null;

export function bindReact(react) {
  React = react;
}

// Inject a stylesheet once per plugin activation; returns its cleanup.
export function useStylesheet(id, css) {
  const existing = document.getElementById(id);
  if (existing) return () => {};
  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.append(style);
  return () => style.remove();
}

// "https://relay.example:viewerhex" -> { communityOrigin, viewer }
export function splitScope(scope) {
  const at = scope.lastIndexOf(":");
  return { communityOrigin: scope.slice(0, at), viewer: scope.slice(at + 1) };
}

export function relativeTime(seconds) {
  const diff = Math.max(0, Date.now() / 1000 - seconds);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
