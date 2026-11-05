import { useRegisterSW } from 'virtual:pwa-register/react'
import { Aviso } from '../componentes/Aviso.tsx'

/**
 * Registra o service worker e avisa quando existe uma versão nova do app (#31, ADR-0015).
 *
 * A versão nova fica esperando até a pessoa tocar em "Atualizar": aí o service worker novo
 * assume e a página recarrega. Sem o toque, ela entra na próxima vez que o app for aberto do
 * zero. No `npm run dev` não há service worker, então o aviso nunca aparece.
 */
export function AvisoDeAtualizacao() {
  const {
    needRefresh: [temVersaoNova],
    updateServiceWorker,
  } = useRegisterSW()

  if (!temVersaoNova) {
    return null
  }

  return (
    <Aviso
      mensagem="Nova versão do app disponível."
      acao={{
        rotulo: 'Atualizar',
        aoClicar: () => void updateServiceWorker(true),
      }}
      aoFechar={() => {}}
      duracao={null}
    />
  )
}
