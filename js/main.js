import { checkConnection, checkIp } from "./lookup.js";
import { webrtcIps } from "./webrtc.js";
import { dnsLeakTest } from "./dns.js";
import { render, describe, copyFrom } from "./ui.js";
import { createWatch } from "./watch.js";

const BOXES = ["connection", "webrtc", "dns", "ipv6"];
const NO_VPN = "no vpn detected, so there is nothing to leak :3";
const UNKNOWN = "could not tell if a vpn is on, so leaks cannot be judged :/";

const copyIpButton = document.getElementById("copy-ip");
const checkedEl = document.getElementById("checked");

const watch = createWatch({
  checkbox: document.getElementById("watch"),
  list: document.getElementById("history"),
  quickCheck: checkConnection,
  fullCheck: check
});

// bumped on every check, so answers from an older check never overwrite a newer one
let run = 0;

async function check() {
  const token = ++run;
  const current = () => token === run;
  const show = (...args) => current() && render(...args);

  for (const id of BOXES) render(id, "checking", "checking... :3");
  copyIpButton.hidden = true;
  checkedEl.textContent = "";
  document.title = "vpn_checkr :3";

  // these do not need the ip, so start them straight away
  const rtcPromise = webrtcIps();
  const dnsPromise = dnsLeakTest().catch(() => null);

  const status = await checkConnection();
  if (!current()) return;
  watch.update(status);
  checkedEl.textContent = "checked " + new Date().toLocaleTimeString() + " :3";

  if (!status) {
    show("connection", "bad", "could not reach the lookup services. check your connection or ad blocker :(");
    for (const id of BOXES.slice(1)) show(id, "info", "skipped :|");
    document.title = "offline :( · vpn_checkr :3";
    return;
  }

  const { v4, v6, main, other } = status;
  const vpn = main.vpn;
  // what the leak tests say when there is no vpn to test
  const skip = main.unknown ? UNKNOWN : NO_VPN;
  if (main.unknown) {
    show("connection", "info", "could not tell if this is a vpn, the lookup services did not answer :/", [], main.ip);
  } else {
    show(
      "connection",
      vpn ? "good" : "bad",
      vpn ? "vpn detected (" + main.reasons.join(", ") + ") :3" : "no vpn detected :<",
      [[main.isp, main.asn].filter(Boolean).join(" · ")],
      main.ip
    );
  }
  copyIpButton.hidden = false;
  document.title = (main.unknown ? "vpn unknown :/" : vpn ? "vpn on :3" : "no vpn :<") + " · vpn_checkr :3";

  const known = new Set([v4, v6].filter(Boolean).map(ip => ip.toLowerCase()));

  const ipv6Test = async () => {
    if (!other) {
      show("ipv6", vpn ? "good" : "info", vpn ? "no leak: " + (v6 ? "you only have ipv6, and it was checked above" : "you have no ipv6 connection") + " :3" : skip);
    } else if (!vpn) {
      show("ipv6", "info", skip, ["ipv6 address: " + describe(other)]);
    } else if (other.vpn) {
      show("ipv6", "good", "no leak: your ipv6 traffic goes through a vpn too :3", [describe(other)]);
    } else if (other.unknown) {
      show("ipv6", "info", "could not tell if your ipv6 traffic goes through the vpn :/", [describe(other)]);
    } else {
      show("ipv6", "bad", "ipv6 leak: your ipv6 traffic skips the vpn D:", [describe(other)]);
    }
  };

  const webrtcTest = async () => {
    const found = await rtcPromise;
    if (found === null) {
      show("webrtc", vpn ? "good" : "info", vpn ? "no leak: webrtc is turned off in this browser :3" : skip);
      return;
    }
    const extra = found.filter(ip => !known.has(ip.toLowerCase()));
    if (!extra.length) {
      const status = found.length ? "no leak: webrtc only shows the address above :3" : "no leak: webrtc did not show any address :3";
      show("webrtc", vpn ? "good" : "info", vpn ? status : skip, found.length ? ["webrtc shows: " + found.join(", ")] : []);
      return;
    }
    const checked = await Promise.all(extra.map(checkIp));
    const leaked = checked.filter(r => !r.vpn && !r.unknown);
    if (!vpn) {
      show("webrtc", "info", skip, checked.map(r => "webrtc shows: " + describe(r)));
    } else if (leaked.length) {
      show("webrtc", "bad", "webrtc leak: your real address is visible through webrtc D:", leaked.map(describe));
    } else if (checked.some(r => r.unknown)) {
      show("webrtc", "info", "could not tell if the addresses webrtc shows belong to the vpn :/", checked.map(describe));
    } else {
      show("webrtc", "good", "no leak: webrtc only shows vpn addresses :3", checked.map(describe));
    }
  };

  const dnsTest = async () => {
    const result = await dnsPromise;
    if (!result || !result.servers.length) {
      show("dns", "info", "could not run the dns test right now :(");
      return;
    }
    // big resolvers answer from many addresses, so group them by who runs them
    const byOrg = new Map();
    for (const s of result.servers) byOrg.set(s.org || "unknown", [...(byOrg.get(s.org || "unknown") || []), s.ip]);
    const lines = [...byOrg].map(([org, ips]) =>
      ips.length > 2 ? ips.length + " dns servers from " + org : "dns server: " + ips.join(", ") + " (" + org + ")"
    );
    if (!vpn) {
      show("dns", "info", skip, lines);
    } else if (!result.leaking) {
      show("dns", "good", "no leak: your dns requests go through the vpn :3", lines);
    } else {
      show("dns", "bad", "dns leak: your dns requests may skip the vpn D:", lines);
    }
  };

  await Promise.all([ipv6Test(), webrtcTest(), dnsTest()]);
}

// plain text version of every box, for pasting into a chat or a bug report
function resultsText() {
  const lines = ["vpn_checkr results :3 " + new Date().toLocaleString()];
  for (const id of BOXES) {
    const box = document.getElementById(id);
    const part = sel => (box.querySelector(sel) || {}).textContent || "";
    const text = [part(".status"), part(".ip"), part(".details").replace(/\n/g, ", ")].filter(Boolean).join(" · ");
    lines.push(id + ": " + text);
  }
  const history = [...document.querySelectorAll("#history li")].map(li => "  " + li.textContent);
  if (history.length) lines.push("watch history:", ...history);
  return lines.join("\n");
}

document.getElementById("recheck").addEventListener("click", check);

document.addEventListener("keydown", e => {
  if (e.key !== "r" || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.isContentEditable || e.target.matches("input, textarea, select")) return;
  check();
});

// results from before the network dropped are stale, so check again once it is back.
// watch mode already does this itself.
window.addEventListener("online", () => watch.watching() || check());

copyIpButton.addEventListener("click", () =>
  copyFrom(copyIpButton, document.querySelector("#connection .ip").textContent)
);

document.getElementById("copy-results").addEventListener("click", e => copyFrom(e.currentTarget, resultsText()));

document.getElementById("copy").addEventListener("click", e =>
  copyFrom(e.currentTarget, document.getElementById("btc").textContent)
);

check();
