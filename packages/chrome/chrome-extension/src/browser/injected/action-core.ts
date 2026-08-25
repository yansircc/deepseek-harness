const capDshChromeRefs = (state: DshChromePageState): void => {
  while (state.refs.size > 2_048) {
    state.refs.delete(state.refs.keys().next().value!)
  }
}

export function pruneDshChromeElements(state: DshChromePageState): void {
  for (const [uid, ref] of state.refs) {
    if (ref.kind === 'element' && !ref.element.isConnected) state.refs.delete(uid)
    if (ref.kind === 'frontier' && ref.rootUid) {
      const root = state.refs.get(ref.rootUid)
      if (root?.kind !== 'element' || !root.element.isConnected) state.refs.delete(uid)
    }
  }
  capDshChromeRefs(state)
}

export function getDshChromeState(): DshChromePageState {
  const state: DshChromePageState = window.__DSH_CHROME_STATE__ || {
    nextElementUid: 1,
    nextFrontierUid: 1,
    refs: new Map(),
    console: [],
    network: [],
    nextRequestId: 1,
    instrumentationInstalled: false,
    lastSnapshotDigest: null,
  }
  window.__DSH_CHROME_STATE__ = state
  return state
}

export function rememberElement(element: Element): string {
  const state = getDshChromeState()
  if (!element.__dshChromeUid) element.__dshChromeUid = 'el-' + state.nextElementUid++
  const previous = state.refs.get(element.__dshChromeUid)
  state.refs.delete(element.__dshChromeUid)
  if (element.isConnected) {
    state.refs.set(element.__dshChromeUid, {
      kind: 'element',
      element,
      verbs: previous?.kind === 'element' ? previous.verbs : new Set(),
      context: previous?.kind === 'element' ? previous.context : false,
    })
  }
  capDshChromeRefs(state)
  return element.__dshChromeUid
}

export function lookupDshChromeElement(uid: string): Element | undefined {
  const state = getDshChromeState()
  const ref = state.refs.get(uid)
  if (ref?.kind !== 'element') return undefined
  if (!ref.element.isConnected) {
    state.refs.delete(uid)
    return undefined
  }
  state.refs.delete(uid)
  state.refs.set(uid, ref)
  return ref.element
}

export function grantActionVerbs(uid: string, verbs: ReadonlyArray<DshChromeActionVerb>): void {
  const state = getDshChromeState()
  const ref = state.refs.get(uid)
  if (ref?.kind !== 'element' || !ref.element.isConnected) return
  ref.verbs = new Set(verbs)
  state.refs.delete(uid)
  state.refs.set(uid, ref)
}

export function markContextRef(uid: string): void {
  const state = getDshChromeState()
  const ref = state.refs.get(uid)
  if (ref?.kind !== 'element' || !ref.element.isConnected) return
  ref.context = true
  state.refs.delete(uid)
  state.refs.set(uid, ref)
}

export function registerFrontier(frontier: Omit<DshChromeFrontierRef, 'kind'>): string {
  const state = getDshChromeState()
  const uid = `frontier-${state.nextFrontierUid++}`
  state.refs.set(uid, { kind: 'frontier', ...frontier })
  capDshChromeRefs(state)
  return uid
}

export function lookupFrontier(uid: string): DshChromeFrontierRef | undefined {
  const state = getDshChromeState()
  const ref = state.refs.get(uid)
  if (ref?.kind !== 'frontier') return undefined
  state.refs.delete(uid)
  state.refs.set(uid, ref)
  return ref
}

export function isElementVisible(element: Element | null | undefined): boolean {
  if (!element || !element.getBoundingClientRect) return false
  const style = getComputedStyle(element)
  if (style.visibility === 'hidden' || style.display === 'none') return false
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return false
  if (rect.bottom < 0 || rect.right < 0) return false
  if (rect.top > innerHeight || rect.left > innerWidth) return false
  return true
}

export function occluderAt(
  x: number,
  y: number,
  expected: Element,
): { tag: string; id?: string | undefined; className?: string | undefined } | null {
  const top = document.elementFromPoint(x, y)
  if (!top || top === expected) return null
  if (expected && expected.contains(top)) return null
  if (top.contains(expected)) return null
  return {
    tag: top.tagName.toLowerCase(),
    id: top.id || undefined,
    className: typeof top.className === 'string' ? top.className : undefined,
  }
}
