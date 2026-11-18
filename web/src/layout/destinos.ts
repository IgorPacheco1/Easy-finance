import {
  CalendarDays,
  CirclePlus,
  Tags,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

export type Destino = {
  para: string
  rotulo: string
  Icone: LucideIcon
}

/** Destinos da navegação principal, os mesmos no celular (barra inferior) e no computador (lateral). */
export const destinos: Destino[] = [
  { para: '/', rotulo: 'Lançar', Icone: CirclePlus },
  { para: '/mes', rotulo: 'Mês', Icone: CalendarDays },
  { para: '/categorias', rotulo: 'Categorias', Icone: Tags },
  { para: '/conta', rotulo: 'Conta', Icone: UserRound },
]
