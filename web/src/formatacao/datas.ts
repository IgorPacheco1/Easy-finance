/**
 * Datas como a API usa: texto "AAAA-MM-DD", sem hora e sem fuso. Na tela, elas são formatadas
 * para o padrão brasileiro só na hora de mostrar.
 *
 * "Hoje" é calculado pelo relógio do celular, no fuso de quem usa. Não use
 * `new Date().toISOString()`: ele usa UTC, e às 22h no Brasil já seria o dia seguinte.
 */

function doisDigitos(numero: number): string {
  return String(numero).padStart(2, '0')
}

/** Data local do aparelho no formato da API. */
export function paraTextoDaApi(data: Date): string {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`
}

export function hoje(agora: Date = new Date()): string {
  return paraTextoDaApi(agora)
}

export function ontem(agora: Date = new Date()): string {
  return paraTextoDaApi(
    new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1),
  )
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate()
}

/**
 * Soma anos como o Java (LocalDate.plusYears), que é o que a API usa:
 * 29/02/2028 menos 1 ano vira 28/02/2027, e não 01/03/2027.
 */
export function somarAnos(data: string, anos: number): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  const novoAno = ano + anos
  const novoDia = Math.min(dia, diasNoMes(novoAno, mes))
  return `${novoAno}-${doisDigitos(mes)}-${doisDigitos(novoDia)}`
}

/** "2026-11-04" vira "04/11/2026". */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

/**
 * Transforma "2026-11-04" numa data local (meia-noite no fuso do aparelho).
 * Não use `new Date('2026-11-04')`: ele lê o texto como UTC, e no Brasil vira o dia 3 às 21h.
 */
export function dataLocal(data: string): Date {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

const formatoDiaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })

/**
 * Título de um dia na lista: "Hoje, 04/11", "Ontem, 03/11" ou "Segunda, 02/11". Dias de outro
 * ano levam o ano junto ("Quinta, 25/12/2025"), porque a busca (#94) mostra lançamentos de
 * qualquer época, e "25/12" sozinho não diria de qual ano é.
 */
export function formatarDiaDaLista(
  data: string,
  agora: Date = new Date(),
): string {
  const [ano, mes, dia] = data.split('-')
  const curta =
    Number(ano) === agora.getFullYear()
      ? `${dia}/${mes}`
      : `${dia}/${mes}/${ano}`
  if (data === hoje(agora)) {
    return `Hoje, ${curta}`
  }
  if (data === ontem(agora)) {
    return `Ontem, ${curta}`
  }
  // "segunda-feira" vira "Segunda".
  const diaDaSemana = formatoDiaDaSemana.format(dataLocal(data)).split('-')[0]
  return `${diaDaSemana.charAt(0).toUpperCase()}${diaDaSemana.slice(1)}, ${curta}`
}

/* ------------------------------------------------------------------ meses */

/** Mês no formato "AAAA-MM" (o mesmo usado no endereço da tela: /mes?m=2026-11). */
export type Mes = string

const FORMATO_DO_MES = /^\d{4}-(0[1-9]|1[0-2])$/

export function mesValido(texto: string | null): texto is Mes {
  return texto !== null && FORMATO_DO_MES.test(texto)
}

export function mesAtual(agora: Date = new Date()): Mes {
  return hoje(agora).slice(0, 7)
}

/** Mês anterior (-1) ou seguinte (+1), atravessando a virada do ano. */
export function mesVizinho(mes: Mes, deslocamento: number): Mes {
  const [ano, numero] = mes.split('-').map(Number)
  const data = new Date(ano, numero - 1 + deslocamento, 1)
  return paraTextoDaApi(data).slice(0, 7)
}

/** Primeiro e último dia do mês, para os parâmetros `de` e `ate` da API. */
export function periodoDoMes(mes: Mes): { de: string; ate: string } {
  const [ano, numero] = mes.split('-').map(Number)
  return {
    de: `${mes}-01`,
    ate: `${mes}-${doisDigitos(diasNoMes(ano, numero))}`,
  }
}

const formatoDoMes = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
})

/** "2026-11" vira "Novembro de 2026". */
export function formatarMes(mes: Mes): string {
  const texto = formatoDoMes.format(dataLocal(`${mes}-01`))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
