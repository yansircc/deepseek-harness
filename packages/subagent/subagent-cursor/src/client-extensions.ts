/**
 * Cursor-proprietary ACP client extensions. The Cursor `agent acp` child
 * sends these to the IDE; this backend is not that IDE, so it acknowledges
 * the `cursor/` prefix and drops the payload.
 *
 * @module @deepseek-ai/dsh-subagent-cursor/client-extensions
 */

import { RequestError } from '@agentclientprotocol/sdk'

/** Prefix Cursor uses for editor-only ACP client methods and notifications. */
const CURSOR_CLIENT_EXTENSION_PREFIX = 'cursor/'

/**
 * True when `method` is a Cursor editor extension (for example `cursor/update_todos`).
 * @param method - unmatched ACP method name from the child.
 * @returns whether the method uses the `cursor/` prefix.
 */
export function isCursorClientExtension(method: string): boolean {
  return method.startsWith(CURSOR_CLIENT_EXTENSION_PREFIX)
}

/**
 * Acknowledge a Cursor editor extension, or reject any other unmatched method.
 * The empty object is the ACP extension result; the payload is not copied into
 * the parent Session.
 * @param method - unmatched ACP method name from the child.
 * @returns an empty object for every `cursor/` method.
 */
export function acknowledgeCursorClientExtension(method: string): Record<string, unknown> {
  if (isCursorClientExtension(method)) return {}
  throw RequestError.methodNotFound(method)
}
