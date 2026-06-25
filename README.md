# DevSec Tools

A client-side SPA for webapp developers to run basic security tests against their own local or staging applications.

> **Authorization notice:** Only test applications you own or have explicit written permission to test.

## v1.0 — XSS Scanner

### Features

- **XSS Scanner** — two test modes: **URL** (reflected XSS) auto-detects query parameters and generates payload-injected URLs; **Input** (stored XSS) generates payloads to paste into named form fields. In URL mode, pick from your locally installed browsers and open each test case with one click.
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

Because the tool is purely client-side, it cannot read HTTP responses from cross-origin targets. Instead, it constructs payload-injected URLs or generates copy-paste payloads, and you observe the results directly.

**URL mode (reflected XSS):** paste a URL, select which query parameters to test, pick a browser from your locally installed ones, and click open on each test case. The browser launches with the payload-injected URL already loaded — an alert box or console output confirms execution.

**Input mode (stored XSS):** name the form fields you want to test and generate a payload checklist. Copy each payload, paste it into the named field in your application, submit the form, and revisit the page where the data renders to check for execution.

## v2.0 — HTTP Parameter Pollution Scanner

### Features

- **HPP Scanner** — tests how your application handles duplicate query parameters across 6 pollution strategies. Set a recognisable inject value, select a local browser, generate test URLs, and open each with one click to mark whether the injected value was used by the application.

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

Set the inject value to a unique probe string (default: `HPP_INJECTED`). The scanner generates one test URL per parameter × strategy combination. Select a local browser, then open each test URL with one click — check whether the injected value appears in the response, logs, or application behaviour. If it does, that parameter is vulnerable to pollution for that strategy.

## v3.0 — SQL Injection Scanner

### Features

- **SQLi Scanner** — define the input fields you want to test (e.g. username, search box, comment), select payload categories, and get a copy-paste checklist of payloads to submit manually through your application's forms. Mark each result as Vulnerable / Not vulnerable / Error.

### Payload categories

| Category | What it tests |
|---|---|
| Error-Based | Trigger DB syntax/type errors that leak version, schema, or query structure |
| Boolean-Based | True/false conditions that change response content — confirms injection without errors |
| Time-Based Blind | `SLEEP` / `WAITFOR` / `pg_sleep` — infer injection by measuring response delay |
| UNION-Based | Column-count probing and data extraction via `UNION SELECT` |
| Comment Injection | `--`, `#`, `/*` — truncate queries; includes login bypass variants |
| Stacked Queries | Semicolon-separated statements — tests whether the driver allows multiple queries |

### How it works

SQL injection primarily occurs through form inputs, not URL parameters. The scanner generates a checklist of payload × field combinations. For each test case, copy the payload, paste it into the named field in your application, submit the form, and observe the response.

Each test case includes a **"what to observe"** note — a DB error message, a content difference between true/false conditions, or a measured time delay depending on the technique.

For time-based payloads: submit the payload, note the response time, and compare it against a baseline submission with a benign value.

## Stack

- React 18 + Vite 8 + TypeScript
- Tailwind CSS
- React Router v6

## Getting started

Local developement
```bash
npm install
npm run dev
```
Production build
```bash
npm run build   # production build → dist/
npm run preview # preview the production build locally
```
OR
```bash
npm run prod       # build + preview in one step
```

> **Browser detection** — the scanner detects your locally installed browsers and lets you open test URLs in a specific one. This feature is served by the Vite dev/preview server and works with both `npm run dev` and `npm run prod`.

