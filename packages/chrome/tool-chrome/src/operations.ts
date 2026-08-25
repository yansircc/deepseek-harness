/**
 * Operation contracts for the 27 atomic chrome_* tools plus the remaining
 * system operations, and the `operationResultProtocolContract` used by the
 * protocol fingerprint. Tool descriptors plus the tab-id coerce used at
 * project time.
 *
 * @module @deepseek-ai/dsh-tool-chrome/protocol/operations
 */

import type { ParameterPropertySpec, ParameterSchemaSpec } from '@deepseek-ai/dsh-tools'

// ---------------------------------------------------------------------------
// Parameter schema node (fingerprint projection walk)
// ---------------------------------------------------------------------------

/**
 * Loose structural node used when projecting tool parameters into the
 * fingerprint JSON Schema subset. Tool registration uses
 * {@link ParameterSchemaSpec}; this type only exists for the wire walker.
 */
export type JsonSchemaProperty = {
  type?: string
  required?: true
  description?: string
  enum?: readonly unknown[]
  items?: JsonSchemaProperty
  properties?: Record<string, JsonSchemaProperty>
  additionalProperties?: boolean
  oneOf?: readonly JsonSchemaProperty[]
}

// ---------------------------------------------------------------------------
// Tool descriptors
// ---------------------------------------------------------------------------

/** High-level input action verb mapped to one atomic tool name. */
export type ActionVerb = 'click' | 'fill' | 'press' | 'upload'

/** Registration record for one `chrome_*` tool: schema, prompt, and wire `op` projection. */
export type AtomicToolDescriptor = {
  readonly name: `chrome_${string}`
  readonly label: string
  readonly domain: 'tab' | 'page' | 'input' | 'system'
  readonly operation: string
  readonly description: string
  readonly promptSnippet: string
  readonly actionVerb?: ActionVerb
  readonly parameters: ParameterSchemaSpec
  readonly projectInput: (input: Record<string, unknown>) => Record<string, unknown> & { op: string }
}

const optionalString = (description: string): ParameterPropertySpec => ({
  type: 'string',
  description,
})
const optionalBool = (description: string): ParameterPropertySpec => ({
  type: 'boolean',
  description,
})
const optionalInt = (description: string): ParameterPropertySpec => ({
  type: 'integer',
  description,
})
const requiredString = (description: string): ParameterPropertySpec => ({
  type: 'string',
  required: true,
  description,
})

/** Target selector (id/url/title). */
const targetParam: ParameterPropertySpec = {
  type: 'object',
  additionalProperties: true,
  description: 'Exactly one Chrome tab selector.',
  properties: {
    by: { type: 'string', enum: ['id', 'url', 'title'] },
    value: {
      description: 'Tab id from chrome_tab_list (integer or digits), or a URL / title fragment.',
      oneOf: [{ type: 'integer' }, { type: 'string' }],
    },
  },
}

/** Element target (uid/selector). */
const elementParam: ParameterPropertySpec = {
  type: 'object',
  additionalProperties: true,
  description: 'A fresh Action Graph ref (uid) or CSS selector.',
  properties: {
    by: { type: 'string', enum: ['uid', 'selector'] },
    value: { type: 'string' },
  },
}

/** Pointer target (element or coordinate). */
const pointerParam: ParameterPropertySpec = {
  type: 'object',
  additionalProperties: true,
  description: 'An element (uid/selector) or viewport coordinate.',
  properties: {
    by: { type: 'string', enum: ['uid', 'selector', 'coordinate'] },
    value: { type: 'string' },
    x: { type: 'number' },
    y: { type: 'number' },
  },
}

const snapshotVerification: ParameterSchemaSpec = {
  includeSnapshot: optionalBool(
    'Include a fresh Action Graph snapshot after the operation completes.',
  ),
  maxElements: optionalInt('Cap the included snapshot element count (1-80).'),
}

// ---------------------------------------------------------------------------
// The 27 atomic tool descriptors
// ---------------------------------------------------------------------------

type ToolDef = {
  name: `chrome_${string}`
  operation: string
  description: string
  promptSnippet: string
  actionVerb?: ActionVerb
  parameters?: ParameterSchemaSpec
}

const TAB: ToolDef[] = [
  {
    name: 'chrome_tab_list',
    operation: 'list',
    description: 'List Chrome tabs visible to this DSH session.',
    promptSnippet: 'List Chrome tabs and their exact ids.',
    parameters: {},
  },
  {
    name: 'chrome_tab_new',
    operation: 'new',
    description: 'Create another session-owned Chrome tab.',
    promptSnippet: 'Create a session-owned Chrome tab.',
    parameters: {
      url: optionalString('Optional URL to open in the new tab.'),
      groupColor: {
        type: 'string',
        enum: ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'],
        description: 'Optional tab-group color.',
      },
    },
  },
  {
    name: 'chrome_tab_activate',
    operation: 'activate',
    description: 'Activate one exact Chrome tab.',
    promptSnippet: 'Activate an exact Chrome tab.',
    parameters: { target: targetParam },
  },
  {
    name: 'chrome_tab_close',
    operation: 'close',
    description: 'Close one exact Chrome tab.',
    promptSnippet: 'Close an exact Chrome tab.',
    parameters: { target: targetParam },
  },
  {
    name: 'chrome_tab_group',
    operation: 'group',
    description: 'Place one exact Chrome tab in the DSH session group.',
    promptSnippet: 'Group an exact Chrome tab under the DSH session.',
    parameters: {
      target: targetParam,
      groupColor: {
        type: 'string',
        enum: ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'],
        description: 'Optional tab-group color.',
      },
    },
  },
  {
    name: 'chrome_tab_ungroup',
    operation: 'ungroup',
    description: 'Remove one exact Chrome tab from its group.',
    promptSnippet: 'Ungroup an exact Chrome tab.',
    parameters: { target: targetParam },
  },
]

const PAGE: ToolDef[] = [
  {
    name: 'chrome_snapshot',
    operation: 'snapshot',
    description:
      'Observe the page and return a compact Action Graph. Use its refs for actions.',
    promptSnippet: 'Observe a page and obtain fresh action refs.',
    parameters: {
      ref: optionalString('A fresh context or frontier ref returned by page observation.'),
      mode: {
        type: 'string',
        enum: ['auto', 'interactive', 'forms', 'pageMap', 'text', 'changes', 'full'],
        description: 'Snapshot mode.',
      },
      query: optionalString('CSS query to scope the snapshot.'),
      maxElements: optionalInt('Cap element count (1-80).'),
      maxTextChars: optionalInt('Cap text characters (1-100000).'),
      containingText: optionalString('Only include elements containing this text.'),
      role: optionalString('Only include elements with this ARIA role.'),
      nearUid: optionalString('Only include elements near this element uid.'),
    },
  },
  {
    name: 'chrome_read',
    operation: 'read',
    description:
      'Read bounded rendered content from the current page without loading the Action Graph.',
    promptSnippet: 'Read current rendered page content or expand a content frontier.',
    parameters: {
      ref: optionalString('A fresh context or frontier ref returned by page observation.'),
      view: { type: 'string', enum: ['content', 'outline'], description: 'Read view.' },
      query: optionalString('CSS query to scope the read.'),
      maxChars: optionalInt('Cap characters (1-24000).'),
    },
  },
  {
    name: 'chrome_inspect',
    operation: 'inspect',
    description: 'Inspect one page element and its local context.',
    promptSnippet: 'Inspect one page element in detail.',
    parameters: {
      element: elementParam,
      scrollIntoView: optionalBool('Scroll the element into view first.'),
    },
  },
  {
    name: 'chrome_navigate',
    operation: 'navigate',
    description: 'Navigate the session-owned page or one explicitly selected tab.',
    promptSnippet: 'Navigate a Chrome page.',
    parameters: {
      url: requiredString('The URL to navigate to.'),
      waitUntilLoad: optionalBool('Wait for the load event before returning.'),
      timeoutMs: optionalInt('Navigation timeout (1-120000ms).'),
      initScript: optionalString('Optional script to run before navigation.'),
      snapshot: {
        type: 'object',
        additionalProperties: true,
        description: 'Optional snapshot options to run after navigation.',
        properties: {
          ref: optionalString('Snapshot ref.'),
          mode: optionalString('Snapshot mode.'),
          query: optionalString('Snapshot query.'),
          maxElements: optionalInt('Snapshot max elements.'),
          maxTextChars: optionalInt('Snapshot max text chars.'),
        },
      },
    },
  },
  {
    name: 'chrome_evaluate',
    operation: 'evaluate',
    description: 'Evaluate one JavaScript expression in the page and return bounded JSON.',
    promptSnippet: 'Evaluate a bounded page expression.',
    parameters: {
      expression: requiredString('The JavaScript expression to evaluate.'),
      awaitPromise: optionalBool('Await the promise result.'),
    },
  },
  {
    name: 'chrome_wait',
    operation: 'wait',
    description:
      'Wait for one typed page condition. After chrome_tab_new or chrome_navigate, prefer chrome_read; do not wait on a site-specific selector just to confirm the first paint.',
    promptSnippet: 'Wait for a page condition. Prefer chrome_read after opening a tab.',
    parameters: {
      condition: {
        type: 'object',
        additionalProperties: true,
        required: true,
        description: 'The condition to wait for.',
        properties: {
          by: {
            type: 'string',
            enum: ['selector', 'urlIncludes', 'textContains', 'expression'],
          },
          value: { type: 'string' },
        },
      },
      timeoutMs: optionalInt('Wait timeout (1-120000ms).'),
      intervalMs: optionalInt('Poll interval (1-10000ms).'),
    },
  },
  {
    name: 'chrome_console',
    operation: 'console',
    description: 'Read captured page console entries.',
    promptSnippet: 'Read or clear captured console entries.',
    parameters: { clear: optionalBool('Clear captured entries after reading.') },
  },
  {
    name: 'chrome_network_list',
    operation: 'network-list',
    description: 'List captured page network requests.',
    promptSnippet: 'List or clear captured network requests.',
    parameters: {
      includePreserved: optionalBool('Include preserved entries from earlier navigations.'),
      clear: optionalBool('Clear captured entries after listing.'),
    },
  },
  {
    name: 'chrome_network_get',
    operation: 'network-get',
    description: 'Read one captured network request and response body.',
    promptSnippet: 'Read one captured network record.',
    parameters: { requestId: requiredString('The captured request id.') },
  },
  {
    name: 'chrome_screenshot',
    operation: 'screenshot',
    description:
      'Capture the viewport or a bounded full-page tile set and return the bounded image transport payload.',
    promptSnippet: 'Capture a Chrome screenshot.',
    parameters: {
      capture: {
        type: 'object',
        additionalProperties: true,
        required: true,
        description: 'Capture mode: viewport or full-page-tiles.',
        properties: {
          kind: { type: 'string', enum: ['viewport', 'full-page-tiles'] },
        },
      },
      format: { type: 'string', enum: ['png', 'jpeg'], description: 'Output format.' },
      quality: optionalInt('JPEG quality (0-100).'),
    },
  },
]

const INPUT: ToolDef[] = [
  {
    name: 'chrome_click',
    operation: 'click',
    actionVerb: 'click',
    description:
      'Click a fresh Action Graph ref, selector, or viewport coordinate with real Chrome input.',
    promptSnippet: 'Click a fresh action ref with real Chrome input.',
    parameters: {
      at: pointerParam,
      ...snapshotVerification,
    },
  },
  {
    name: 'chrome_type',
    operation: 'type',
    description: 'Type text with real Chrome keyboard input, optionally into an element.',
    promptSnippet: 'Type text with real Chrome keyboard input.',
    parameters: {
      text: { type: 'string', required: true, description: 'Text to type (max 500 chars).' },
      into: elementParam,
      pressEnter: optionalBool('Press Enter after typing.'),
      ...snapshotVerification,
    },
  },
  {
    name: 'chrome_fill',
    operation: 'fill',
    actionVerb: 'fill',
    description:
      'Replace the value of a fresh Action Graph ref or selector with real Chrome input.',
    promptSnippet: 'Fill a fresh editable action ref.',
    parameters: {
      text: { type: 'string', required: true, description: 'Text to fill (max 500 chars).' },
      into: elementParam,
      submit: optionalBool('Submit the surrounding form after filling.'),
      ...snapshotVerification,
    },
  },
  {
    name: 'chrome_press',
    operation: 'key',
    actionVerb: 'press',
    description:
      'Press one key with real Chrome input, optionally after focusing a fresh Action Graph ref.',
    promptSnippet: 'Press a key, optionally on a fresh action ref.',
    parameters: {
      key: requiredString('The key to press (e.g. Enter, Escape, Tab).'),
      at: elementParam,
      modifiers: {
        type: 'object',
        additionalProperties: true,
        description: 'Modifier keys.',
        properties: {
          shift: { type: 'boolean' },
          control: { type: 'boolean' },
          alt: { type: 'boolean' },
          meta: { type: 'boolean' },
        },
      },
      ...snapshotVerification,
    },
  },
  {
    name: 'chrome_hover',
    operation: 'hover',
    description: 'Move the real Chrome pointer over an element or coordinate.',
    promptSnippet: 'Hover with the real Chrome pointer.',
    parameters: { at: pointerParam },
  },
  {
    name: 'chrome_drag',
    operation: 'drag',
    description: 'Drag between two elements or coordinates with real Chrome input.',
    promptSnippet: 'Drag with real Chrome pointer input.',
    parameters: {
      from: pointerParam,
      to: pointerParam,
      steps: optionalInt('Drag steps (3-40).'),
    },
  },
  {
    name: 'chrome_tap',
    operation: 'tap',
    description: 'Send a real Chrome touch tap to an element or coordinate.',
    promptSnippet: 'Tap with real Chrome touch input.',
    parameters: { at: pointerParam },
  },
  {
    name: 'chrome_scroll',
    operation: 'scroll',
    description: 'Scroll the page or one element with real Chrome wheel input.',
    promptSnippet: 'Scroll with real Chrome wheel input.',
    parameters: {
      within: elementParam,
      deltaY: { type: 'number', description: 'Vertical scroll delta.' },
      deltaX: { type: 'number', description: 'Horizontal scroll delta.' },
      steps: optionalInt('Scroll steps (3-40).'),
    },
  },
  {
    name: 'chrome_upload',
    operation: 'upload',
    actionVerb: 'upload',
    description:
      'Upload workspace files through a fresh file-input Action Graph ref or selector.',
    promptSnippet: 'Upload workspace files through a file input.',
    parameters: {
      into: elementParam,
      paths: {
        type: 'array',
        required: true,
        description: 'Workspace-relative file paths to upload (max 32).',
        items: { type: 'string' },
      },
    },
  },
]

const SYSTEM: ToolDef[] = [
  {
    name: 'chrome_automation_status',
    operation: 'automation-status',
    description:
      'Report this DSH session\'s Chrome automation ownership targets (owned, allocating, or stale).',
    promptSnippet: 'Inspect session automation ownership without changing it.',
    parameters: {},
  },
  {
    name: 'chrome_automation_clear_stale',
    operation: 'clear-stale',
    description:
      'Remove proved-stale Chrome automation ownership records for this DSH session without closing or adopting tabs.',
    promptSnippet:
      'Clear proved-stale automation ownership records only; never close or adopt tabs.',
    parameters: {},
  },
]

/** The 27 atomic tools in registration order: tab, page, input, system. */
const domainOf = (name: string): AtomicToolDescriptor['domain'] => {
  if (name.startsWith('chrome_tab')) return 'tab'
  if (name.startsWith('chrome_automation')) return 'system'
  if (INPUT.some(t => t.name === name)) return 'input'
  return 'page'
}

const labelOf = (name: string): string =>
  name
    .slice('chrome_'.length)
    .split('_')
    .map(part => (part[0] ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')

/**
 * Coerce a digit-string tab id so the wire Target `{ by: 'id', value: number }` is satisfied.
 * @param input - tool arguments that may include `target`.
 * @returns the same record, or a copy whose `target.value` is a safe integer.
 */
const coerceTabIdTarget = (input: Record<string, unknown>): Record<string, unknown> => {
  const target = input.target
  if (target === null || typeof target !== 'object' || Array.isArray(target)) return input
  const record = target as { by?: unknown; value?: unknown }
  if (record.by !== 'id' || typeof record.value !== 'string') return input
  if (!/^\d+$/.test(record.value)) return input
  const value = Number(record.value)
  if (!Number.isSafeInteger(value)) return input
  return { ...input, target: { ...record, value } }
}

/** The 27 atomic `chrome_*` tools in tab, page, input, then system registration order. */
export const ATOMIC_TOOL_DESCRIPTORS: ReadonlyArray<AtomicToolDescriptor> = [
  ...TAB,
  ...PAGE,
  ...INPUT,
  ...SYSTEM,
].map(({ parameters = {}, ...descriptor }) => ({
  ...descriptor,
  label: labelOf(descriptor.name),
  domain: domainOf(descriptor.name),
  parameters,
  projectInput: (input: Record<string, unknown>) => ({
    ...coerceTabIdTarget(input),
    op: descriptor.operation,
  }) as Record<string, unknown> & { op: string },
}))

/** Atomic tool name for each {@link ActionVerb}; used to route high-level input actions. */
export const ACTION_TOOL_NAME_BY_VERB: Readonly<Record<ActionVerb, string>> = Object.fromEntries(
  ATOMIC_TOOL_DESCRIPTORS.flatMap(({ actionVerb, name }) =>
    actionVerb === undefined ? [] : [[actionVerb, name]],
  ),
) as Readonly<Record<ActionVerb, string>>

/**
 * Look up one atomic tool by its `chrome_*` name.
 * @param name - registered tool name such as `chrome_click`.
 * @returns the descriptor, or `undefined` when `name` is not an atomic tool.
 */
export const atomicToolDescriptor = (name: string): AtomicToolDescriptor | undefined =>
  ATOMIC_TOOL_DESCRIPTORS.find(descriptor => descriptor.name === name)

// ---------------------------------------------------------------------------
// Operation contracts (for the fingerprint)
// ---------------------------------------------------------------------------

/** Deadline class that selects the command timeout for an operation. */
export type OperationDeadlineKind =
  | 'default'
  | 'navigate'
  | 'wait'
  | 'screenshot'
  | 'text-input'

/** How an operation result is described for the protocol fingerprint. */
export type OperationResultContract =
  | { mode: 'opaque' }
  | { mode: 'schema'; schema: unknown }
  | {
    mode: 'by-call-fields'
    selectors: readonly string[]
    variants: Readonly<Record<string, Readonly<Record<string, unknown>>>>
  }

/** Domain, deadline class, and result description for one named operation. */
export type OperationContract = {
  readonly operation: string
  readonly domain: 'tab' | 'page' | 'input' | 'system'
  readonly deadline: OperationDeadlineKind
  readonly result: OperationResultContract
}

const opaque = (): OperationResultContract => ({ mode: 'opaque' })
const schema = (value: unknown): OperationResultContract => ({ mode: 'schema', schema: value })

const screenshotVariants: OperationResultContract = {
  mode: 'by-call-fields',
  // Flat PageCall paths: wire uses `call.capture` / `call.format`, not nested `call.operation.*`.
  selectors: ['call.capture.kind', 'call.format'],
  variants: {
    viewport: {
      png: {
        type: 'object',
        properties: { kind: { const: 'image' }, format: { const: 'png' } },
      },
      jpeg: {
        type: 'object',
        properties: { kind: { const: 'image' }, format: { const: 'jpeg' } },
      },
    },
    'full-page-tiles': {
      png: {
        type: 'object',
        properties: { kind: { const: 'tile-set' }, format: { const: 'png' } },
      },
      jpeg: {
        type: 'object',
        properties: { kind: { const: 'tile-set' }, format: { const: 'jpeg' } },
      },
    },
  },
}

const formattedTabSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    windowId: { type: 'integer' },
    active: { type: 'boolean' },
    highlighted: { type: 'boolean' },
    title: { type: 'string' },
    url: { type: 'string' },
    groupId: { type: 'integer' },
    group: { type: ['object', 'null'] },
  },
}

const resultDocuments: Record<string, Record<string, OperationResultContract>> = {
  tab: {
    list: schema({ type: 'array', items: formattedTabSchema }),
    new: schema(formattedTabSchema),
    activate: schema(formattedTabSchema),
    close: schema({ type: 'object', properties: { closed: { type: 'integer' } } }),
    group: schema(formattedTabSchema),
    ungroup: schema(formattedTabSchema),
  },
  page: {
    snapshot: opaque(),
    read: opaque(),
    inspect: opaque(),
    navigate: schema({
      type: 'object',
      properties: { tab: formattedTabSchema, url: { type: 'string' } },
    }),
    evaluate: opaque(),
    wait: opaque(),
    console: opaque(),
    'network-list': opaque(),
    'network-get': opaque(),
    screenshot: screenshotVariants,
  },
  input: {
    click: opaque(),
    type: opaque(),
    fill: opaque(),
    key: opaque(),
    hover: opaque(),
    drag: opaque(),
    tap: opaque(),
    scroll: opaque(),
    upload: opaque(),
  },
  system: {
    version: schema({
      type: 'object',
      properties: {
        extensionId: { type: 'string' },
        extensionDisplayVersion: { type: 'string' },
        userAgent: { type: 'string' },
      },
    }),
    'automation-status': schema({ type: 'object', properties: { targets: { type: 'array' } } }),
    'clear-stale': schema({
      type: 'object',
      properties: { staleOwnershipsCleared: { type: 'integer' } },
    }),
    cleanup: schema({
      type: 'object',
      properties: { closedTabIds: { type: 'array' } },
    }),
    'cleanup-all': schema({
      type: 'object',
      properties: { closedTabIds: { type: 'array' } },
    }),
    probe: opaque(),
  },
}

const deadlines: Record<string, Record<string, OperationDeadlineKind>> = {
  tab: { list: 'default', new: 'default', activate: 'default', close: 'default', group: 'default', ungroup: 'default' },
  page: {
    snapshot: 'default', read: 'default', inspect: 'default', navigate: 'navigate',
    evaluate: 'default', wait: 'wait', console: 'default',
    'network-list': 'default', 'network-get': 'default', screenshot: 'screenshot',
  },
  input: {
    click: 'default', type: 'text-input', fill: 'text-input', key: 'default',
    hover: 'default', drag: 'default', tap: 'default', scroll: 'default', upload: 'default',
  },
  system: {
    version: 'default',
    'automation-status': 'default',
    'clear-stale': 'default',
    cleanup: 'default',
    'cleanup-all': 'default',
    probe: 'default',
  },
}

/** Per-domain map of operation name to {@link OperationContract}. */
export const OPERATION_CONTRACTS: Record<string, Record<string, OperationContract>> = Object.fromEntries(
  (['tab', 'page', 'input', 'system'] as const).map(domain => [
    domain,
    Object.fromEntries(
      Object.entries(resultDocuments[domain] ?? {}).map(([operation, result]) => [
        operation,
        {
          operation,
          domain,
          deadline: deadlines[domain]?.[operation] ?? 'default',
          result,
        },
      ]),
    ),
  ]),
)

/** Fingerprint projection: each operation's result contract plus its deadline class. */
export const operationResultProtocolContract = Object.fromEntries(
  Object.entries(OPERATION_CONTRACTS).map(([domain, contracts]) => [
    domain,
    Object.fromEntries(
      Object.entries(contracts).map(([operation, contract]) => [
        operation,
        { ...contract.result, deadline: contract.deadline },
      ]),
    ),
  ]),
)

// ---------------------------------------------------------------------------
// Wire call types
// ---------------------------------------------------------------------------

/** Tab-domain wire call: `op` plus operation-specific fields. */
export type TabCall = { op: string; [key: string]: unknown }
/** Page-domain wire call: `op` plus operation-specific fields. */
export type PageCall = { op: string; [key: string]: unknown }
/** Input-domain wire call: `op` plus operation-specific fields. */
export type InputCall = { op: string; [key: string]: unknown }
/** System-domain wire call: `op` plus operation-specific fields. */
export type SystemCall = { op: string; [key: string]: unknown }
