# DevSec Tools

A client-side SPA for webapp developers to run basic security tests against their own local or staging applications.

> **Authorization notice:** Only test applications you own or have explicit written permission to test.

## v1.0 — XSS Scanner

### Features

- **XSS Scanner** — paste a target URL, auto-detect query parameters, select payload categories, and generate ready-to-test URLs. Each test case can be opened in a new tab and marked as Fired / Not Fired / Error.
- **Payload Library** — 29 XSS payloads across 6 categories, searchable and filterable, each with an inline description of injection context and how the vector works.

### Payload categories

| Category | Description |
|---|---|
| Basic Script Tags | Classic `<script>` and `<img onerror>` vectors |
| Attribute Injection | Break out of HTML attribute values |
| Event Handlers | `onfocus`, `onload`, `ontoggle`, and other no-click triggers |
| JavaScript Context | Escape string literals inside `<script>` blocks |
| Filter Bypass | Case mixing, double-encoding, nested tags, null bytes |
| DOM-Based | Hash, `innerHTML`, `eval()`, and `postMessage` sinks |

### How it works

Because the tool is purely client-side, it cannot read HTTP responses from cross-origin targets. Instead, it constructs payload-injected URLs that you open in your browser and observe directly — an alert box (or console output) confirms the payload executed.

For reflected XSS: test URLs inject a payload into one query parameter at a time while keeping the rest unchanged.

For stored XSS: copy individual payloads from the library and submit them through the application's forms or APIs manually, then revisit the page where the data is rendered.

## v2.0 — HTTP Parameter Pollution Scanner

### Features

- **HPP Scanner** — tests how your application handles duplicate query parameters across 6 pollution strategies. Set a recognisable inject value, generate test URLs, open each in a browser, and mark whether the injected value was used by the application.

### Pollution strategies

| Strategy | What it tests |
|---|---|
| Append duplicate | `?p=original&p=INJECT` — does the backend use the last value? |
| Prepend duplicate | `?p=INJECT&p=original` — does the backend use the first value? |
| Array bracket notation | `?p[]=original&p[]=INJECT` — PHP/Rails array parsing |
| Comma-separated values | `?p=original,INJECT` — frameworks that split on comma |
| Semicolon-separated values | `?p=original;INJECT` — legacy Java/JSP delimiter handling |
| Encoded ampersand injection | `?p=original%26p=INJECT` — double-decode bypass via reverse proxies or WAFs |

### How it works

Set the inject value to a unique probe string (default: `HPP_INJECTED`). The scanner generates one test URL per parameter × strategy combination. Open each URL in your app and check whether the injected value appears in the response, logs, or application behaviour — if it does, that parameter is vulnerable to pollution for that strategy.

## Stack

- React 18 + Vite 8 + TypeScript
- Tailwind CSS
- React Router v6

## Getting started

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

```bash
npm run build   # production build → dist/
npm run preview # preview the production build locally
```
