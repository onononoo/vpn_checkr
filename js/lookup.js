// talking to the ip lookup services

export async function getJson(url, timeout = 8000) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error("lookup failed (" + res.status + ")");
  return res.json();
}

export async function getText(url, timeout = 8000) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error("lookup failed (" + res.status + ")");
  return res.text();
}

async function ipFrom(url) {
  try {
    return (await getJson(url, 5000)).ip || null;
  } catch {
    return null;
  }
}

// api4 and api6 only answer over ipv4 and ipv6, so together they show both addresses.
// v6 is null when there is no working ipv6 connection.
export async function publicIps() {
  const [v4, v6] = await Promise.all([
    ipFrom("https://api4.ipify.org?format=json"),
    ipFrom("https://api6.ipify.org?format=json")
  ]);
  if (v4 || v6) return { v4, v6 };

  const ip = await ipFrom("https://api.ipquery.io/?format=json");
  return ip && ip.includes(":") ? { v4: null, v6: ip } : { v4: ip, v6: null };
}

// answers "Y" if the ip belongs to a known proxy, vpn or hosting network
async function blackbox(ip) {
  try {
    return (await getText("https://blackbox.ipinfo.app/lookup/" + ip)).trim() === "Y";
  } catch {
    return false;
  }
}

// returns { ip, isp, reasons, vpn } where reasons says why the ip looks like a vpn
export async function checkIp(ip) {
  if (!/^[0-9a-f:.]+$/i.test(ip)) throw new Error("not an ip address: " + ip);

  const [data, listed] = await Promise.all([
    getJson("https://api.ipquery.io/" + ip + "?format=json").catch(() => ({})),
    blackbox(ip)
  ]);

  const risk = data.risk || {};
  const reasons = [];
  if (risk.is_vpn) reasons.push("vpn");
  if (risk.is_proxy) reasons.push("proxy");
  if (risk.is_tor) reasons.push("tor");
  if (risk.is_datacenter) reasons.push("datacenter");
  if (!reasons.length && listed) reasons.push("known vpn/proxy network");

  return { ip, isp: data.isp && data.isp.org, reasons, vpn: reasons.length > 0 };
}
