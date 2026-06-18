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
