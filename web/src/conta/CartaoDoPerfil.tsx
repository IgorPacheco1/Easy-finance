import { Pencil } from 'lucide-react'
import { useState } from 'react'
import type { Usuario } from '../api/tipos.ts'
import { formatarMes } from '../formatacao/datas.ts'
import { Avatar } from './Avatar.tsx'
import styles from './Conta.module.css'
import { FolhaDoPerfil } from './FolhaDoPerfil.tsx'

type Props = {
  usuario: Usuario
  /** Dia em que a conta foi criada, das estatísticas; enquanto não chega, a linha não aparece. */
  desde?: string
  /** Só com a sessão confirmada dá para editar (falar com o servidor). */
  podeEditar: boolean
  aoMudar: (usuario: Usuario) => void
}

/**
 * Cartão do perfil (#194), centralizado (#217): avatar com as iniciais, nome, e-mail e desde
 * quando a pessoa usa o app. Tocar no avatar (com o lápis no canto) troca a cor; "Editar perfil"
 * muda nome e cor.
 */
export function CartaoDoPerfil({ usuario, desde, podeEditar, aoMudar }: Props) {
  const [folha, setFolha] = useState<'perfil' | 'cor' | null>(null)
  const avatar = (
    <Avatar nome={usuario.nome} email={usuario.email} avatar={usuario.avatar} />
  )

  return (
    <section className={styles.perfil} aria-label="Seu perfil">
      {podeEditar ? (
        <button
          type="button"
          className={styles.botaoDoAvatar}
          aria-label="Trocar a cor do avatar"
          onClick={() => setFolha('cor')}
        >
          {avatar}
          <span className={styles.seloDoAvatar} aria-hidden="true">
            <Pencil size={14} />
          </span>
        </button>
      ) : (
        avatar
      )}
      <div className={styles.dadosDoPerfil}>
        <p className={styles.nomeDoPerfil}>{usuario.nome ?? 'Sem nome'}</p>
        <p className={styles.texto}>{usuario.email}</p>
      </div>
      {desde && (
        <p className={styles.pilulaDesde}>
          Usando desde {formatarMes(desde.slice(0, 7)).toLowerCase()}
        </p>
      )}
      {podeEditar && (
        <button
          type="button"
          className={styles.botaoDeTexto}
          onClick={() => setFolha('perfil')}
        >
          Editar perfil
        </button>
      )}

      {folha && (
        <FolhaDoPerfil
          usuario={usuario}
          modo={folha}
          aoSalvar={(atualizado) => {
            aoMudar(atualizado)
            setFolha(null)
          }}
          aoFechar={() => setFolha(null)}
        />
      )}
    </section>
  )
}
