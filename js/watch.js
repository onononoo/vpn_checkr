// watch mode: checks the connection every so often and warns when the vpn drops or the ip changes.
// the history only lives in this tab, nothing is stored.

const INTERVAL = 30000;
const MAX_HISTORY = 20;

export function createWatch({ checkbox, list, quickCheck, fullCheck }) {
  let timer = null;
  let busy = false;
  let last = null; // { vpn, ip }, or { offline: true }

  function log(text) {
    const li = document.createElement("li");
    li.textContent = new Date().toLocaleTimeString() + " · " + text;
    list.prepend(li);
    while (list.children.length > MAX_HISTORY) list.lastElementChild.remove();
    list.hidden = false;
  }

  function notify(text) {
    try {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("vpn_checkr", { body: text, icon: "dumbass.webp" });
      }
    } catch {
      // some mobile browsers only allow notifications from a service worker
    }
  }

  function describeChange(prev, now) {
    if (now.offline) return prev.offline ? null : "could not reach the lookup services, you may be offline";
    if (prev.offline) return "back online, " + (now.vpn ? "vpn on (" : "no vpn (") + now.ip + ")";
    if (prev.vpn && !now.vpn) return "vpn dropped! your ip is now " + now.ip;
    if (!prev.vpn && now.vpn) return "vpn turned on, your ip is now " + now.ip;
    if (prev.ip !== now.ip) return "ip changed to " + now.ip;
    return null;
  }

  // called with every connection result, from the page or from the timer.
  // returns true when something changed while watching.
  function update(status) {
    const now = status ? { vpn: status.main.vpn, ip: status.main.ip } : { offline: true };
    const prev = last;
    last = now;
    if (!prev || !timer) return false;

    const change = describeChange(prev, now);
    if (!change) return false;
    log(change);
    notify(change);
    return true;
  }

  async function tick() {
    if (busy) return;
    busy = true;
    try {
      // a full check reruns the leak tests too, which is only worth it when something changed
      if (update(await quickCheck())) fullCheck();
    } finally {
      busy = false;
    }
  }

  function start() {
    if (timer) return;
    if ("Notification" in window && Notification.permission === "default") {
      Promise.resolve(Notification.requestPermission()).catch(() => {});
    }
    timer = setInterval(tick, INTERVAL);
    log("watching started");
  }

  function stop() {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    log("watching stopped");
  }

  // browsers can restore a ticked checkbox on reload without the timer running
  checkbox.checked = false;
  checkbox.addEventListener("change", () => (checkbox.checked ? start() : stop()));
  window.addEventListener("online", () => timer && tick());
  window.addEventListener("offline", () => timer && update(null));

  return { update };
}
