import { useCallback, useEffect, useState } from 'react'
import { buscarResumo } from '../api/resumo.ts'
import { hoje, type Mes } from '../formatacao/datas.ts'
import { periodosDaComparacao, textoDaComparacao } from './comparacao.ts'

type Resposta = { chave: string; texto: string | null }

/**
 * Busca o resumo dos dois períodos (o do mês e o do mês anterior, ver comparacao.ts) e monta a
 * frase do insight (#188). Usa a API de resumo que já existe, com `de` e `ate`; não precisou de
 * endpoint novo.
 *
 * Se algo falhar, o insight só não aparece: ele é um extra, e o saldo e o resumo já mostram os
 * próprios erros. A "chave" (mês + tentativa) funciona como nos outros hooks do mês.
 */
export function useComparacao(mes: Mes) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const chave = `${mes}#${tentativa}`

  useEffect(() => {
    const periodos = periodosDaComparacao(mes, hoje())
    if (!periodos) return
    let ativo = true
    Promise.all([buscarResumo(periodos.atual), buscarResumo(periodos.anterior)])
      .then(([atual, anterior]) => {
        if (ativo) {
          setResposta({
            chave,
            texto: textoDaComparacao(atual, anterior, periodos),
          })
        }
      })
      .catch(() => {
        if (ativo) setResposta({ chave, texto: null })
      })
    return () => {
      ativo = false
    }
  }, [mes, chave])

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), [])
  const texto = resposta?.chave === chave ? resposta.texto : null

  return { texto, tentarDeNovo }
}
