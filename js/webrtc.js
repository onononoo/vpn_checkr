// webrtc can find your public address through a stun server, outside of normal web requests.
// some vpns and browsers let that request skip the tunnel, which leaks your real ip.

const STUN = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }];

function isPublic(ip) {
  if (ip.includes(":")) {
    const v6 = ip.toLowerCase();
    return !(v6 === "::1" || v6.startsWith("fe80:") || v6.startsWith("fc") || v6.startsWith("fd"));
  }
  const [a, b] = ip.split(".").map(Number);
  return !(
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

// resolves to a list of public ips webrtc exposed, or null if webrtc is turned off
export function webrtcIps(timeout = 5000) {
  return new Promise(resolve => {
    let pc;
    try {
      pc = new RTCPeerConnection({ iceServers: STUN });
    } catch {
      resolve(null);
      return;
    }

    const ips = new Set();
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      pc.close();
      resolve([...ips]);
    };
    const timer = setTimeout(done, timeout);

    pc.onicecandidate = e => {
      if (!e.candidate || !e.candidate.candidate) return done();
      // "candidate:842163049 1 udp 1677729535 203.0.113.7 51234 typ srflx ..."
      const ip = e.candidate.candidate.split(" ")[4];
      // browsers hide local addresses behind random .local names
      if (ip && !ip.endsWith(".local") && isPublic(ip)) ips.add(ip);
    };

    pc.createDataChannel("");
    pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(done);
  });
}
