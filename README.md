# <img src="dumbass.webp" alt="" height="32"> vpn_checkr

a simple website that checks if you have a vpn turned on, and if it leaks your real ip address.

## what it checks

**1. your connection.** your ip address comes from [ipify](https://www.ipify.org/) and is checked against known vpn providers, proxies, tor exit nodes and datacenters with [ipquery.io](https://ipquery.io/), with [ipinfo.app's blackbox](https://blackbox.ipinfo.app/) as a second check. vpns almost always run on datacenter servers, so a datacenter ip counts as a vpn.

**2. leak tests.** a vpn can be on and still give away your real address:

- **webrtc**: browsers can find your public address through a stun server for video calls. if that request skips the vpn, it shows your real ip. the page compares what webrtc sees with the address above.
- **dns**: the browser looks up a few made up names under [bash.ws](https://bash.ws/dnsleak), which records which dns servers asked. if they are not on your vpn's network, dns is leaking.
- **ipv6**: some vpns only cover ipv4. the page looks up your ipv6 address separately and checks whether it also belongs to a vpn.

green means everything is fine, red means something is wrong, and grey means there was nothing to test (for example, leak tests when no vpn is on).

the page shows your ip address and network provider, but not your location. ip location databases are often wrong about vpn servers, sometimes by thousands of miles, so showing a location would be misleading.

no detection is perfect: small or private vpns can slip through, and some work or school networks can look like a vpn.

## files

- `index.html`: the page
- `style.css`: the look
- `js/main.js`: runs the checks and fills in the boxes
- `js/lookup.js`: ip address and vpn lookups
- `js/webrtc.js`: webrtc leak test
- `js/dns.js`: dns leak test
- `manifest.json`: lets the site be installed as an app
- `vercel.json`: security headers when hosted on vercel

## running it

no build step, no dependencies and no api keys. the scripts are javascript modules, which browsers will not load from a file opened straight off your computer, so serve the folder instead:

```bash
npx serve .
```

or host it anywhere that serves static files, like vercel or github pages.

## support

this project is open source, so please donate to support me and my projects! btc: `bc1qs4z04ltddh6vaqd4stu3p4vekv253ht4cwqma4` :)

my other projects: https://github.com/onononoo/
