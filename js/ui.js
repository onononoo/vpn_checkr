// small helpers for filling in the page

// state is "checking", "info" (grey), "good" (green) or "bad" (red)
export function render(id, state, status, lines = [], ip = "") {
  const box = document.getElementById(id);
  box.className = "box " + state;
  box.querySelector(".status").textContent = status;
  box.querySelector(".details").textContent = lines.filter(Boolean).join("\n");
  const ipEl = box.querySelector(".ip");
  if (ipEl) ipEl.textContent = ip;
}

// "203.0.113.7 (some isp, AS64500)"
export function describe(r) {
  const network = [r.isp, r.asn].filter(Boolean).join(", ");
  return network ? r.ip + " (" + network + ")" : r.ip;
}

// copies text and briefly shows ✓ or ✗ on the button
export async function copyFrom(button, text) {
  if (!button.dataset.label) button.dataset.label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "✓";
  } catch {
    button.textContent = "✗";
  }
  setTimeout(() => (button.textContent = button.dataset.label), 1500);
}
