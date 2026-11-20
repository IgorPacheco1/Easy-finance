import { CalendarDays, PenLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatarData } from '../formatacao/datas.ts'
import { EscolhaDeData } from './EscolhaDeData.tsx'
import styles from './Lancamento.module.css'
import { TAMANHO_MAXIMO_DA_DESCRICAO } from './validacao.ts'

type Props = {
  data: string
  hoje: string
  ontem: string
  aoMudarData: (data: string) => void
  descricao: string
  aoMudarDescricao: (descricao: string) => void
  erros: { data?: string; descricao?: string }
}

/**
 * Data e descrição como dois chips (#187). Os dois são opcionais (a data já começa em Hoje),
 * então ficam fechados e a tela mostra só o que é obrigatório: valor e categoria. Um toque abre.
 * Com erro, o campo abre sozinho, para a pessoa ver a mensagem.
 */
export function DetalhesDoLancamento({
  data,
  hoje,
  ontem,
  aoMudarData,
  descricao,
  aoMudarDescricao,
  erros,
}: Props) {
  const [dataAberta, setDataAberta] = useState(false)
  const [descricaoAberta, setDescricaoAberta] = useState(false)
  const campoDescricao = useRef<HTMLInputElement>(null)

  // Abriu a descrição com um toque: o foco vai para o campo, e o teclado do celular já sobe.
  useEffect(() => {
    if (descricaoAberta) campoDescricao.current?.focus()
  }, [descricaoAberta])

  const textoDaData =
    data === hoje ? 'Hoje' : data === ontem ? 'Ontem' : formatarData(data)
  const textoDaDescricao = descricao.trim()
  const mostrarData = dataAberta || Boolean(erros.data)
  const mostrarDescricao = descricaoAberta || Boolean(erros.descricao)

  return (
    <div className={styles.grupo}>
      <div className={styles.chips}>
        <button
          type="button"
          className={styles.chipDeDetalhe}
          aria-label={`Data: ${textoDaData}`}
          aria-expanded={mostrarData}
          onClick={() => setDataAberta(!dataAberta)}
        >
          <CalendarDays size={16} aria-hidden="true" />
          {textoDaData}
        </button>
        <button
          type="button"
          className={styles.chipDeDetalhe}
          aria-label={
            textoDaDescricao ? `Descrição: ${textoDaDescricao}` : 'Descrição'
          }
          aria-expanded={mostrarDescricao}
          onClick={() => setDescricaoAberta(!descricaoAberta)}
        >
          <PenLine size={16} aria-hidden="true" />
          <span className={styles.textoDoChip}>
            {textoDaDescricao || 'Descrição'}
          </span>
        </button>
      </div>

      {mostrarData && (
        <EscolhaDeData
          data={data}
          hoje={hoje}
          ontem={ontem}
          aoMudar={aoMudarData}
          erro={erros.data}
        />
      )}

      {mostrarDescricao && (
        <div className={styles.grupo}>
          <label htmlFor="descricao" className={styles.rotulo}>
            Descrição (opcional)
          </label>
          <input
            id="descricao"
            ref={campoDescricao}
            className={styles.campo}
            placeholder="Ex.: feira do sábado"
            maxLength={TAMANHO_MAXIMO_DA_DESCRICAO}
            value={descricao}
            onChange={(evento) => aoMudarDescricao(evento.target.value)}
            aria-invalid={erros.descricao ? true : undefined}
            aria-describedby={erros.descricao ? 'erro-descricao' : undefined}
          />
          {erros.descricao && (
            <p id="erro-descricao" className={styles.erroDoCampo}>
              {erros.descricao}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
