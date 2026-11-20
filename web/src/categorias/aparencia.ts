import {
  Baby,
  BookOpen,
  Briefcase,
  Bus,
  Car,
  CircleEllipsis,
  CirclePlus,
  Coffee,
  Dumbbell,
  Fuel,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  type LucideIcon,
  Music,
  PawPrint,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Ticket,
  TrendingUp,
  Utensils,
  Wallet,
  Wrench,
  Zap,
} from 'lucide-react'

/**
 * Aparência das categorias (ADR-0031): a lista fechada de cores e de ícones que uma categoria
 * pode ter. O backend valida contra a mesma lista; aqui ela serve para desenhar.
 *
 * A categoria guarda o **nome** da cor e do ícone, nunca o código da cor: assim um tom pode ser
 * ajustado (por exemplo, para o contraste) sem mexer nos dados. Os tons ficam em
 * `estilos/tema.css`, como `--categoria-<cor>`, nos dois temas.
 */
export const CORES_DE_CATEGORIA = [
  'coral',
  'laranja',
  'amarelo',
  'verde',
  'menta',
  'turquesa',
  'ciano',
  'azul',
  'anil',
  'roxo',
  'rosa',
  'cinza',
] as const

export type CorDeCategoria = (typeof CORES_DE_CATEGORIA)[number]

/** Ícones do `lucide-react` (ADR-0012), pelo nome que fica guardado na categoria. */
export const ICONES_DE_CATEGORIA = {
  house: House,
  zap: Zap,
  'shopping-cart': ShoppingCart,
  utensils: Utensils,
  car: Car,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  shirt: Shirt,
  sparkles: Sparkles,
  ticket: Ticket,
  repeat: Repeat,
  landmark: Landmark,
  receipt: Receipt,
  'circle-ellipsis': CircleEllipsis,
  wallet: Wallet,
  briefcase: Briefcase,
  gift: Gift,
  'trending-up': TrendingUp,
  'circle-plus': CirclePlus,
  'paw-print': PawPrint,
  plane: Plane,
  dumbbell: Dumbbell,
  baby: Baby,
  'gamepad-2': Gamepad2,
  coffee: Coffee,
  fuel: Fuel,
  smartphone: Smartphone,
  music: Music,
  bus: Bus,
  wrench: Wrench,
  'piggy-bank': PiggyBank,
  'book-open': BookOpen,
} as const satisfies Record<string, LucideIcon>

export type IconeDeCategoria = keyof typeof ICONES_DE_CATEGORIA

/** Os nomes dos ícones, na ordem em que aparecem para escolher. */
export const NOMES_DOS_ICONES = Object.keys(
  ICONES_DE_CATEGORIA,
) as IconeDeCategoria[]

/**
 * Usada quando a categoria chega sem ícone ou cor válidos (dado antigo, ou a API mais nova que
 * o app): a tela continua de pé, com um ícone neutro.
 */
export const APARENCIA_PADRAO = {
  icone: 'circle-ellipsis',
  cor: 'cinza',
} as const satisfies {
  icone: IconeDeCategoria
  cor: CorDeCategoria
}

export function ehCorDeCategoria(valor: unknown): valor is CorDeCategoria {
  return (
    typeof valor === 'string' &&
    (CORES_DE_CATEGORIA as readonly string[]).includes(valor)
  )
}

export function ehIconeDeCategoria(valor: unknown): valor is IconeDeCategoria {
  return typeof valor === 'string' && Object.hasOwn(ICONES_DE_CATEGORIA, valor)
}
