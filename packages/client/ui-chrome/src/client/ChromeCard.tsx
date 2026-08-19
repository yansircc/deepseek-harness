/**
 * The Chrome control card: shows setup status, an install guide when not
 * configured, and the port / credential settings form.
 */

import { useState } from 'react'
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

/**
 * Render the Chrome control card.
 * @param props - locale copy, the card snapshot, and its actions.
 * @returns the card, or nothing when the namespace is unavailable.
 */
export function ChromeCard(props: ChromeCardProps) {
  const { t } = props
  const state = props.useChromeCard(snapshot => snapshot)
  const [open, setOpen] = useState(false)
  if (!state.available) return null

  const disabled = !state.writable || state.saving

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
              <p className={state.port.text === '' ? css.statusNotConfigured : css.statusReady}>
                {state.port.text === '' ? t('statusNotConfigured') : t('statusReady')}
              </p>
            </section>

            <section className={css.section}>
              <h4 className={css.sectionTitle}>{t('guideTitle')}</h4>
              <p className={css.guideLine}>{t('guideLine1')}</p>
              <p className={css.guideLine}>{t('guideLine2')}</p>
              <p className={css.guideLine}>{t('guideLine3')}</p>
            </section>

            <section className={css.section}>
              <h4 className={css.sectionTitle}>{t('installTitle')}</h4>
              <ol className={css.steps}>
                <li>{t('installStep1')}</li>
                <li>{t('installStep2')}</li>
                <li>{t('installStep3')}</li>
              </ol>
            </section>

            <section className={css.section}>
              <h4 className={css.sectionTitle}>{t('settingsTitle')}</h4>
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
              <Field
                id="chrome-credential"
                label={t('credentialLabel')}
                hint={t('credentialHint')}
                text={state.ownerCredentialRef.text}
                overridden={state.ownerCredentialRef.overridden}
                invalid={state.ownerCredentialRef.invalid}
                disabled={disabled}
                onEdit={(text) => { props.edit('ownerCredentialRef', text) }}
                onReset={() => { props.resetField('ownerCredentialRef') }}
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
