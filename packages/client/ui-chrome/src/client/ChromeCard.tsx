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
import css from './ChromeCard.module.css'

/** Props the renderer binds for the Chrome card. */
export type ChromeCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<'settings.chrome'>
  & InjectFace<ChromeCardFace>

/** Download endpoint served by the tool-chrome host plugin. */
const EXTENSION_DOWNLOAD_URL = '/api/chrome/extension.zip'

/** Bridge status endpoint served by the tool-chrome host plugin. */
const STATUS_URL = '/api/chrome/status'

/** How often the card re-checks the bridge status. */
const STATUS_POLL_MS = 3000

/** Bridge status payload the host status route returns. */
interface BridgeStatusPayload {
  state: 'ready' | 'waiting-for-extension' | 'offline' | 'unconfigured'
  url: string
  connector: { connected?: boolean; label?: string } | null
  error: string | null
}

/** Poll the host status endpoint until the component unmounts. */
function useBridgeStatus(): { status: BridgeStatusPayload | null; unknown: boolean } {
  const [status, setStatus] = useState<BridgeStatusPayload | null>(null)
  const [unknown, setUnknown] = useState(false)
  useEffect(() => {
    let alive = true
    const poll = async (): Promise<void> => {
      try {
        const response = await fetch(STATUS_URL, { cache: 'no-store' })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = (await response.json()) as BridgeStatusPayload
        if (alive) {
          setStatus(data)
          setUnknown(false)
        }
      } catch {
        if (alive) setUnknown(true)
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

  // The status dot: green when the extension is connected, amber while
  // waiting for it, red when the local bridge is down, gray while checking.
  const view = status === null
    ? unknown
      ? { dot: css.dotChecking, text: t('statusUnknown'), hint: t('statusUnknownHint') }
      : { dot: css.dotChecking, text: t('statusChecking') }
    : status.state === 'ready'
      ? { dot: css.dotReady, text: t('statusConnected'), hint: t('statusConnectedHint') }
      : status.state === 'waiting-for-extension'
        ? { dot: css.dotWaiting, text: t('statusWaiting'), hint: t('statusWaitingHint') }
        : status.state === 'offline'
          ? { dot: css.dotOffline, text: t('statusOffline'), hint: t('statusOfflineHint') }
          : { dot: css.dotOffline, text: t('statusNotConfigured') }

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
