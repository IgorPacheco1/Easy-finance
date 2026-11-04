import { useState } from 'react'
import { somarAnos } from '../formatacao/datas.ts'
import styles from './Lancamento.module.css'

type Props = {
  data: string
  hoje: string
  ontem: string
  aoMudar: (data: string) => void
  erro?: string
}

/** Hoje e Ontem com um toque; "Outra data" abre o calendário do próprio celular. */
export function EscolhaDeData({ data, hoje, ontem, aoMudar, erro }: Props) {
  const [outraData, setOutraData] = useState(false)
  const escolha = outraData
    ? 'outra'
    : data === hoje
      ? 'hoje'
      : data === ontem
        ? 'ontem'
        : 'outra'

  return (
    <fieldset
      className={styles.grupo}
      aria-describedby={erro ? 'erro-data' : undefined}
    >
      <legend className={styles.rotulo}>Data</legend>
      <div className={styles.chips}>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={escolha === 'hoje'}
          onClick={() => {
            setOutraData(false)
            aoMudar(hoje)
          }}
        >
          Hoje
        </button>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={escolha === 'ontem'}
          onClick={() => {
            setOutraData(false)
            aoMudar(ontem)
          }}
        >
          Ontem
        </button>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={escolha === 'outra'}
          onClick={() => setOutraData(true)}
        >
          Outra data
        </button>
      </div>
      {escolha === 'outra' && (
        <>
          <label htmlFor="data" className={styles.rotulo}>
            Escolha a data
          </label>
          <input
            id="data"
            type="date"
            className={styles.campo}
            value={data}
            min={somarAnos(hoje, -1)}
            max={somarAnos(hoje, 1)}
            onChange={(evento) => aoMudar(evento.target.value)}
            aria-invalid={erro ? true : undefined}
          />
        </>
      )}
      {erro && (
        <p id="erro-data" className={styles.erroDoCampo}>
          {erro}
        </p>
      )}
    </fieldset>
  )
}
