/**
 * The Chrome control card: shows setup status, a direct extension download
 * link with install steps, and an advanced port setting. The connection
 * secret is generated automatically — nothing for the user to configure.
 */

import { useEffect, useState } from 'react'
import clsx from 'clsx'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChromeCardFace } from './chrome-card-controller.ts'
import {
  applyStatusPollFailure,
  applyStatusPollSuccess,
  chromeIdentityLines,
  classifyChromeStatus,
  needsReloadGuidance,
  offlineStatusHint,
  type ChromeStatusKind,
  type ChromeStatusPayload,
} from './chrome-status-view.ts'
import css from './ChromeCard.module.css'

/** Props the renderer binds for the Chrome card. */
export type ChromeCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<'settings.chrome'>
  & InjectFace<ChromeCardFace>

/** Download endpoint served by the chrome-local-web adapter. */
const EXTENSION_DOWNLOAD_URL = '/api/chrome/extension.zip'

/** Bridge status endpoint served by the chrome-local-web adapter. */
const STATUS_URL = '/api/chrome/status'

/** How often the card re-checks the bridge status. */
const STATUS_POLL_MS = 3000

function assertNever(value: never): never {
  throw new Error(`unexpected Chrome status kind: ${String(value)}`)
}

/** Poll the host status endpoint until the component unmounts. */
function useBridgeStatus(): { status: ChromeStatusPayload | null; unknown: boolean } {
  const [status, setStatus] = useState<ChromeStatusPayload | null>(null)
  const [unknown, setUnknown] = useState(false)
  useEffect(() => {
    let alive = true
    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(STATUS_URL, { cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = (await response.json()) as ChromeStatusPayload
        if (alive) {
          const next = applyStatusPollSuccess(data)
          setStatus(next.status)
          setUnknown(next.unknown)
        }
      } catch {
        if (alive) {
          const next = applyStatusPollFailure()
          setStatus(next.status)
          setUnknown(next.unknown)
        }
      }
    }
    void poll()
    const timer = setInterval(() => { void poll() }, STATUS_POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])
  return { status, unknown }
}

/** Map a status kind onto the status-row copy and dot class. */
function statusRow(
  kind: ChromeStatusKind,
  t: ChromeCardProps['t'],
  error: string | null,
): { dot: string | undefined; text: string; hint?: string } {
  switch (kind) {
    case 'checking':
      return { dot: css.dotChecking, text: t('statusChecking') }
    case 'unknown':
      return { dot: css.dotChecking, text: t('statusUnknown'), hint: t('statusUnknownHint') }
    case 'connected':
      return { dot: css.dotReady, text: t('statusConnected'), hint: t('statusConnectedHint') }
    case 'waiting':
      return { dot: css.dotWaiting, text: t('statusWaiting'), hint: t('statusWaitingHint') }
    case 'stale':
      return { dot: css.dotWaiting, text: t('statusStale'), hint: t('statusStaleHint') }
    case 'mismatch':
      return { dot: css.dotOffline, text: t('statusMismatch'), hint: t('statusMismatchHint') }
    case 'offline':
      return {
        dot: css.dotOffline,
        text: t('statusOffline'),
        hint: offlineStatusHint(error, t('statusOfflineHint')),
      }
    case 'unconfigured':
      return { dot: css.dotOffline, text: t('statusNotConfigured') }
    default:
      return assertNever(kind)
  }
}

/**
 * Render the Chrome control card.
 * @param props - locale copy, the card snapshot, and its actions.
 * @returns the card, or nothing when the namespace is unavailable.
 */
export function ChromeCard(props: ChromeCardProps) {
  const { t } = props
  const state = props.useChromeCard(snapshot => snapshot)
  const [open, setOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const { status, unknown } = useBridgeStatus()
  if (!state.available) return null

  const disabled = !state.writable || state.saving
  const kind = classifyChromeStatus(status, unknown)
  const view = statusRow(kind, t, status?.error ?? null)
  const { expected, live } = chromeIdentityLines(status)
  const showReload = needsReloadGuidance(kind)

  return (
    <li className={clsx(css.card, open && css.cardOpen)}>
      <button
        type="button"
        className={css.header}
        aria-expanded={open}
        aria-label={`${t(open ? 'collapse' : 'expand')}: ${t('title')}`}
        onClick={() => { setOpen(!open) }}
      >
        <span className={css.headText}>
          <span className={css.name}>{t('title')}</span>
          <span className={css.description}>{t('description')}</span>
        </span>
        <IconChevronDownOutline14 className={clsx(css.chevron, open && css.chevronOpen)} />
      </button>
      {open
        ? (
          <div className={css.body}>
            {!state.writable ? <p className={css.readOnly} role="status">{t('readOnly')}</p> : null}

            <section className={css.section}>
              <h4 className={css.sectionTitle}>{t('statusTitle')}</h4>
              <div className={css.statusRow}>
                <span className={clsx(css.statusDot, view.dot)} aria-hidden="true" />
                <div className={css.statusTexts}>
                  <span className={css.statusText}>{view.text}</span>
                  {view.hint ? <span className={css.statusHint}>{view.hint}</span> : null}
                </div>
              </div>
              {expected
                ? (
                  <div className={css.identityBlock}>
                    <span className={css.identityTitle}>{t('expectedTitle')}</span>
                    <span className={css.identityLine}>{t('expectedId', { id: expected.extensionId })}</span>
                    <span className={css.identityLine}>{t('expectedVersion', { version: expected.displayVersion })}</span>
                    <span className={css.identityLine}>
                      {t('expectedFingerprint', { prefix: expected.fingerprintPrefix })}
                    </span>
                  </div>
                )
                : null}
              {live
                ? (
                  <div className={css.identityBlock}>
                    <span className={css.identityTitle}>{t('liveTitle')}</span>
                    {live.label
                      ? <span className={css.identityLine}>{t('liveLabel', { label: live.label })}</span>
                      : null}
                    <span className={css.identityLine}>{t('liveId', { id: live.extensionId })}</span>
                    <span className={css.identityLine}>{t('liveVersion', { version: live.displayVersion })}</span>
                    <span className={css.identityLine}>
                      {t('liveFingerprint', { prefix: live.fingerprintPrefix })}
                    </span>
                  </div>
                )
                : null}
              {showReload
                ? <p className={css.reloadGuidance} role="note">{t('reloadGuidance')}</p>
                : null}
            </section>

            <section className={css.section}>
              <h4 className={css.sectionTitle}>{t('guideTitle')}</h4>
              <p className={css.guideLine}>{t('guideLine1')}</p>
              <p className={css.guideLine}>{t('guideLine2')}</p>
              <p className={css.guideLine}>{t('guideLine3')}</p>
            </section>

            <section className={css.section}>
              <h4 className={css.sectionTitle}>{t('installTitle')}</h4>
              <a
                className={css.download}
                href={EXTENSION_DOWNLOAD_URL}
                download="chrome-extension.zip"
              >
                {t('downloadButton')}
              </a>
              <p className={css.hint}>{t('downloadHint')}</p>
              <ol className={css.steps}>
                <li>{t('installStep1')}</li>
                <li>{t('installStep2')}</li>
                <li>{t('installStep3')}</li>
              </ol>
              <a
                className={css.openExtensions}
                href="chrome://extensions"
                target="_blank"
                rel="noreferrer"
              >
                {t('openExtensions')}
              </a>
              <p className={css.hint}>{t('openExtensionsHint')}</p>
            </section>

            <section className={css.section}>
              <h4 className={css.sectionTitle}>{t('credentialAuto')}</h4>
            </section>

            <section className={css.section}>
              <button
                type="button"
                className={css.advancedToggle}
                aria-expanded={advancedOpen}
                onClick={() => { setAdvancedOpen(!advancedOpen) }}
              >
                <span>{t('settingsTitle')}</span>
                <IconChevronDownOutline14 className={clsx(css.chevron, advancedOpen && css.chevronOpen)} />
              </button>
              {advancedOpen
                ? (
                  <div className={css.advancedBody}>
                    <Field
                      id="chrome-port"
                      label={t('portLabel')}
                      hint={t('portHint')}
                      text={state.port.text}
                      overridden={state.port.overridden}
                      invalid={state.port.invalid}
                      disabled={disabled}
                      onEdit={(text) => { props.edit('port', text) }}
                      onReset={() => { props.resetField('port') }}
                    />
                    {state.failed ? <p className={css.failed} role="status">{t('saveFailed')}</p> : null}
                    <div className={css.footer}>
                      <button
                        type="button"
                        className={css.discard}
                        disabled={!state.dirty || state.saving}
                        onClick={props.discard}
                      >
                        {t('discard')}
                      </button>
                      <button
                        type="button"
                        className={css.save}
                        disabled={!state.dirty || state.invalid || state.saving}
                        onClick={props.save}
                      >
                        {t(state.saving ? 'saving' : 'save')}
                      </button>
                    </div>
                  </div>
                )
                : null}
            </section>
          </div>
        )
        : null}
    </li>
  )
}

/** One labelled field with reset. */
function Field(props: {
  id: string
  label: string
  hint: string
  text: string
  overridden: boolean
  invalid: boolean
  disabled: boolean
  onEdit: (text: string) => void
  onReset: () => void
}) {
  return (
    <div className={css.field}>
      <div className={css.fieldHead}>
        <label className={css.label} htmlFor={props.id}>{props.label}</label>
        <div className={css.badges}>
          {props.overridden ? <span className={css.badge}>overridden</span> : null}
          {props.overridden
            ? (
              <button type="button" className={css.reset} disabled={props.disabled} onClick={props.onReset}>
                reset
              </button>
            )
            : null}
        </div>
      </div>
      <input
        id={props.id}
        className={clsx(css.input, props.invalid && css.inputInvalid)}
        type="text"
        value={props.text}
        disabled={props.disabled}
        onChange={(event) => { props.onEdit(event.target.value) }}
      />
      <span className={css.hint}>{props.invalid ? 'invalid' : props.hint}</span>
    </div>
  )
}
