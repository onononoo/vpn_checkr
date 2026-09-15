# <img src="dumbass.webp" alt="" height="32"> vpn_checkr

a simple website that checks if you have a vpn turned on, using your ip address.

## how it works

when the page opens, your browser asks [ipquery.io](https://ipquery.io/) what ip address you are connecting from. that address is checked against known vpn providers, proxies, tor exit nodes and datacenters, with [ipinfo.app's blackbox](https://blackbox.ipinfo.app/) as a second check.

- **green box**: a vpn was detected, and your ip address is shown
- **red box**: no vpn was detected, and your ip address is shown

vpns almost always run on datacenter servers, so a datacenter ip counts as a vpn. no detection is perfect: small or private vpns can slip through, and some work or school networks can look like a vpn.

the page shows your ip address and network provider, but not your location. ip location databases are often wrong about vpn servers, sometimes by thousands of miles, so showing a location would be misleading.

if ipquery.io is unavailable, the page gets your ip from [ipify](https://www.ipify.org/) and relies on the second check.

## running it

it is a single `index.html` file with no build step, no dependencies and no api keys. open it in a browser, or host it anywhere that serves static files (github pages works).

## support

this project is open source, so please donate to support me and my projects! btc: `bc1qs4z04ltddh6vaqd4stu3p4vekv253ht4cwqma4` :)

my other projects: https://github.com/onononoo/
