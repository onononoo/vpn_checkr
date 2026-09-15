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

// answers "Y" if the ip belongs to a known proxy, vpn or hosting network.
// null when blackbox did not answer.
async function blackbox(ip) {
  try {
    return (await getText("https://blackbox.ipinfo.app/lookup/" + ip)).trim() === "Y";
  } catch {
    return null;
  }
}

// returns { ip, isp, asn, reasons, vpn, unknown } where reasons says why the ip looks like a vpn,
// and unknown means neither service answered, so "no vpn" cannot be trusted
export async function checkIp(ip) {
  if (!/^[0-9a-f:.]+$/i.test(ip)) throw new Error("not an ip address: " + ip);

  const url = "https://api.ipquery.io/" + ip + "?format=json";
  const [data, listed] = await Promise.all([
    // tried twice, since a missing answer here would otherwise look like "no vpn"
    getJson(url).catch(() => getJson(url)).catch(() => null),
    blackbox(ip)
  ]);

  const risk = (data && data.risk) || {};
  const reasons = [];
  if (risk.is_vpn) reasons.push("vpn");
  if (risk.is_proxy) reasons.push("proxy");
  if (risk.is_tor) reasons.push("tor");
  if (risk.is_datacenter) reasons.push("datacenter");
  if (!reasons.length && listed) reasons.push("known vpn/proxy network");

  const isp = (data && data.isp) || {};
  return { ip, isp: isp.org, asn: isp.asn, reasons, vpn: reasons.length > 0, unknown: !data && listed === null };
}

// the main check: both addresses, and whether they look like a vpn.
// resolves to null when no lookup service could be reached.
export async function checkConnection() {
  const { v4, v6 } = await publicIps();
  if (!v4 && !v6) return null;
  const [main, other] = await Promise.all([checkIp(v4 || v6), v4 && v6 ? checkIp(v6) : null]);
  return { v4, v6, main, other };
}
