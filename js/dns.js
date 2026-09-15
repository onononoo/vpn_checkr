// dns leak test using bash.ws.
// the browser looks up a few made up names under bash.ws, and bash.ws records which
// dns servers came asking. if those servers are not on your vpn's network, dns is leaking.

import { getJson, getText } from "./lookup.js";

export async function dnsLeakTest() {
  const id = (await getText("https://bash.ws/id")).trim();
  if (!/^[a-z0-9]+$/i.test(id)) throw new Error("unexpected test id");

  // these requests fail on purpose, only the dns lookup matters
  await Promise.allSettled(
    Array.from({ length: 10 }, (_, i) =>
      fetch("https://" + (i + 1) + "." + id + ".bash.ws", {
        mode: "no-cors",
        cache: "no-store",
        signal: AbortSignal.timeout(3000)
      })
    )
  );

  const rows = await getJson("https://bash.ws/dnsleak/test/" + id + "?json");
  const conclusion = rows.find(r => r.type === "conclusion");
  return {
    servers: rows.filter(r => r.type === "dns"),
    leaking: !(conclusion && /not leaking/i.test(conclusion.ip))
  };
}
