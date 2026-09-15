import { publicIps, checkIp } from "./lookup.js";
import { webrtcIps } from "./webrtc.js";
import { dnsLeakTest } from "./dns.js";

const BOXES = ["connection", "webrtc", "dns", "ipv6"];
const NO_VPN = "no vpn detected, so there is nothing to leak";

// state is "checking", "info" (grey), "good" (green) or "bad" (red)
function render(id, state, status, lines = [], ip = "") {
  const box = document.getElementById(id);
  box.className = "box " + state;
  box.querySelector(".status").textContent = status;
  box.querySelector(".details").textContent = lines.filter(Boolean).join("\n");
  const ipEl = box.querySelector(".ip");
  if (ipEl) ipEl.textContent = ip;
}

const describe = r => (r.isp ? r.ip + " (" + r.isp + ")" : r.ip);

// bumped on every check, so answers from an older check never overwrite a newer one
let run = 0;

async function check() {
  const token = ++run;
  const show = (...args) => token === run && render(...args);
  for (const id of BOXES) render(id, "checking", "checking...");

  // these do not need the ip, so start them straight away
  const rtcPromise = webrtcIps();
  const dnsPromise = dnsLeakTest().catch(() => null);

  const { v4, v6 } = await publicIps();
  if (!v4 && !v6) {
    show("connection", "bad", "could not reach the lookup services. check your connection or ad blocker.");
    for (const id of BOXES.slice(1)) show(id, "info", "skipped");
    return;
  }

  const [main, other] = await Promise.all([checkIp(v4 || v6), v4 && v6 ? checkIp(v6) : null]);
  const vpn = main.vpn;
  show(
    "connection",
    vpn ? "good" : "bad",
    vpn ? "vpn detected (" + main.reasons.join(", ") + ")" : "no vpn detected",
    [main.isp],
    main.ip
  );

  const known = new Set([v4, v6].filter(Boolean).map(ip => ip.toLowerCase()));

  const ipv6Test = async () => {
    if (!other) {
      show("ipv6", vpn ? "good" : "info", vpn ? "no leak: " + (v6 ? "you only have ipv6, and it was checked above" : "you have no ipv6 connection") : NO_VPN);
    } else if (!vpn) {
      show("ipv6", "info", NO_VPN, ["ipv6 address: " + describe(other)]);
    } else if (other.vpn) {
      show("ipv6", "good", "no leak: your ipv6 traffic goes through a vpn too", [describe(other)]);
    } else {
      show("ipv6", "bad", "ipv6 leak: your ipv6 traffic skips the vpn", [describe(other)]);
    }
  };

  const webrtcTest = async () => {
    const found = await rtcPromise;
    if (found === null) {
      show("webrtc", vpn ? "good" : "info", vpn ? "no leak: webrtc is turned off in this browser" : NO_VPN);
      return;
    }
    const extra = found.filter(ip => !known.has(ip.toLowerCase()));
    if (!extra.length) {
      const status = found.length ? "no leak: webrtc only shows the address above" : "no leak: webrtc did not show any address";
      show("webrtc", vpn ? "good" : "info", vpn ? status : NO_VPN, found.length ? ["webrtc shows: " + found.join(", ")] : []);
      return;
    }
    const checked = await Promise.all(extra.map(checkIp));
    const leaked = checked.filter(r => !r.vpn);
    if (!vpn) {
      show("webrtc", "info", NO_VPN, checked.map(r => "webrtc shows: " + describe(r)));
    } else if (!leaked.length) {
      show("webrtc", "good", "no leak: webrtc only shows vpn addresses", checked.map(describe));
    } else {
      show("webrtc", "bad", "webrtc leak: your real address is visible through webrtc", leaked.map(describe));
    }
  };

  const dnsTest = async () => {
    const result = await dnsPromise;
    if (!result || !result.servers.length) {
      show("dns", "info", "could not run the dns test right now");
      return;
    }
    const lines = result.servers.map(s => "dns server: " + s.ip + (s.org ? " (" + s.org + ")" : ""));
    if (!vpn) {
      show("dns", "info", NO_VPN, lines);
    } else if (!result.leaking) {
      show("dns", "good", "no leak: your dns requests go through the vpn", lines);
    } else {
      show("dns", "bad", "dns leak: your dns requests may skip the vpn", lines);
    }
  };

  await Promise.all([ipv6Test(), webrtcTest(), dnsTest()]);
}

document.getElementById("recheck").addEventListener("click", check);

document.getElementById("copy").addEventListener("click", async () => {
  const btn = document.getElementById("copy");
  try {
    await navigator.clipboard.writeText(document.getElementById("btc").textContent);
    btn.textContent = "✓";
  } catch {
    btn.textContent = "✗";
  }
  setTimeout(() => (btn.textContent = "⧉"), 1500);
});

check();
