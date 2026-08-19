/**
 * The zeroY sites card: lists configured WordPress sites, lets the user add
 * and remove them, and explains what zeroY does in plain language.
 */

import { useState } from 'react'
import clsx from 'clsx'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ZeroYCardFace } from './zeroy-card-controller.ts'
import css from './ZeroYCard.module.css'

/** Props the renderer binds for the zeroY card. */
export type ZeroYCardProps =
  PropsRuntime<'settings.plugin.item'>
  & PropsLocale<'settings.zeroy'>
  & InjectFace<ZeroYCardFace>

/**
 * Render the zeroY sites card.
 * @param props - locale copy, the card snapshot, and its actions.
 * @returns the card, or nothing when the namespace is unavailable.
 */
export function ZeroYCard(props: ZeroYCardProps) {
  const { t } = props
  const state = props.useZeroYCard(snapshot => snapshot)
  const actions = { editDraft: props.editDraft, beginBind: props.beginBind, removeSite: props.removeSite }
  const [open, setOpen] = useState(false)
  if (!state.available) return null

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
              <h4 className={css.sectionTitle}>{t('guideTitle')}</h4>
              <p className={css.guideLine}>{t('guideLine1')}</p>
              <p className={css.guideLine}>{t('guideLine2')}</p>
            </section>

            <section className={css.section}>
              <h4 className={css.sectionTitle}>{t('sitesTitle')}</h4>
              {state.sites.length === 0
                ? <p className={css.empty}>{t('noSites')}</p>
                : (
                  <ul className={css.siteList}>
                    {state.sites.map(site => (
                      <li key={site.siteId} className={css.siteRow}>
                        <span className={css.siteInfo}>
                          <span className={css.siteLabel}>{site.label}</span>
                          <span className={css.siteEndpoint}>{site.endpoint}</span>
                        </span>
                        <button
                          type="button"
                          className={css.remove}
                          disabled={!state.writable}
                          title={t('remove')}
                          aria-label={`${t('remove')}: ${site.label}`}
                          onClick={() => {
                            if (globalThis.confirm(t('removeConfirm'))) actions.removeSite(site.siteId)
                          }}
                        >
                          {t('remove')}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
            </section>

            <section className={css.section}>
              <h4 className={css.sectionTitle}>{t('addTitle')}</h4>
              <p className={css.guideLine}>{t('bindGuide')}</p>
              <div className={css.fields}>
                <Field
                  id="zeroy-site-label"
                  label={t('labelLabel')}
                  hint={t('labelHint')}
                  text={state.draft.label}
                  disabled={!state.writable || state.binding}
                  onEdit={(text) => { actions.editDraft('label', text) }}
                />
                <Field
                  id="zeroy-site-endpoint"
                  label={t('endpointLabel')}
                  hint={t('endpointHint')}
                  text={state.draft.endpoint}
                  disabled={!state.writable || state.binding}
                  onEdit={(text) => { actions.editDraft('endpoint', text) }}
                />
              </div>
              {state.binding
                ? <p className={css.bindingNote} role="status">{t('binding')}</p>
                : null}
              {state.bindFailed ? <p className={css.failed} role="status">{t('bindFailed')}</p> : null}
              <div className={css.footer}>
                <button
                  type="button"
                  className={css.add}
                  disabled={!state.writable || state.binding
                    || state.draft.label.trim() === ''
                    || state.draft.endpoint.trim() === ''}
                  onClick={actions.beginBind}
                >
                  {t('bind')}
                </button>
              </div>
            </section>
          </div>
        )
        : null}
    </li>
  )
}

/** One labelled text field. */
function Field(props: {
  id: string
  label: string
  hint: string
  text: string
  disabled: boolean
  onEdit: (text: string) => void
}) {
  return (
    <div className={css.field}>
      <label className={css.label} htmlFor={props.id}>{props.label}</label>
      <input
        id={props.id}
        className={css.input}
        type="text"
        value={props.text}
        disabled={props.disabled}
        onChange={(event) => { props.onEdit(event.target.value) }}
      />
      <span className={css.hint}>{props.hint}</span>
    </div>
  )
}
