/**
 * Fotos do site: o destaque da página inicial e a página Galeria, por edição.
 *
 * A foto da Galeria mora em um de dois lugares:
 * - `arquivo`: no próprio site, em /imgs/gallery/ (1ª e 2ª edição)
 * - `drive`: o id do arquivo numa pasta pública do Google Drive (3ª edição em diante).
 *   Assim a foto não pesa no repositório nem na hospedagem, e o Google entrega
 *   no tamanho pedido: pequena no carrossel e grande só quando alguém amplia.
 *   A pasta precisa estar como "qualquer pessoa com o link"; se o dono tirar o
 *   compartilhamento ou apagar a foto, ela some do site.
 */
import type { FotoEmDestaque } from '../types';

/**
 * Foto da página Galeria: tem `arquivo` ou `drive`, nunca os dois.
 * `evento` é o nome curto que aparece ao passar o mouse (Formatura, DevFest...);
 * `legenda` descreve a foto para o leitor de tela e aparece na foto ampliada.
 */
export type FotoDaGaleria = { evento: string; legenda: string } & (
  { arquivo: string; drive?: never } | { drive: string; arquivo?: never }
);

/** Largura pedida ao Drive (em px): a do carrossel (o dobro do cartão, para tela retina) e a da foto ampliada */
const LARGURA_NO_DRIVE = { miniatura: 400, ampliada: 1600 } as const;

/**
 * Endereço da foto no tamanho pedido. Do Drive vem em WebP (`-rw`) com a
 * largura certa; a do site é sempre o mesmo arquivo.
 */
export function enderecoDaFoto(foto: FotoDaGaleria, tamanho: keyof typeof LARGURA_NO_DRIVE): string {
  if (foto.drive !== undefined)
    return `https://lh3.googleusercontent.com/d/${foto.drive}=w${LARGURA_NO_DRIVE[tamanho]}-rw`;
  return `/imgs/gallery/${foto.arquivo}`;
}

/** Uma edição da Galeria, com as fotos dela */
export interface EdicaoDaGaleria {
  titulo: string;
  fotos: FotoDaGaleria[];
}

/** Fotos grandes da página inicial */
export const fotosEmDestaque: FotoEmDestaque[] = [
  {
    id: 1,
    titulo: 'Abertura do Projeto 2022',
    descricao:
      'Abertura do projeto com a professora Samara, Rafaela, Tatiana e Iracema, os parceiros da Mundiale, das Obras Pavonianas e alunos',
    categoria: 'Evento',
    imagem: '/imgs/gallery/AberturaDoProjeto2022.webp',
  },
  {
    id: 2,
    titulo: 'Formatura 2022',
    descricao: 'Formatura do projeto FavelaWare na Mundiale - 2022',
    categoria: 'Formatura',
    imagem: '/imgs/gallery/Formatura2022.webp',
  },
];

/**
 * Fotos da página Galeria, por edição, da mais recente para a mais antiga.
 */
export const edicoesDaGaleria: EdicaoDaGaleria[] = [
  {
    titulo: '3ª Edição',
    fotos: [
      {
        drive: '1EgUcGAK_gUzV7kpttRBXUxfoH3AY8K01',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1WUg3XenX5AzwR128I7SA7PFtYiSSU61R',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1d1WU-xT622U6S2jmfloRmFj_eupE3KfA',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1gnJGECnDtmW0lvnalWuv7WESks5-Rkbn',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '11lUZrh2z9XRkb5A5kEoShutW1mSZdiv1',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1h9BhPT7EDXpCqxlFnAk2_q02sW5jz3lE',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1nf088ABsJZ0WgnWHtmXg8uzwic-JGujn',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1W_CJ8OIo4s6dycmUXyBUiDVBJ4Tg1r4h',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1Ktj8EWhyaF-KflzN5h6k70-fiyPiVzKO',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1Xb5Px_50yEN98dpJebx3xhwPYkvkRPNL',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1ug9-CGaUgtuSkEVack8uizj7youM7l4L',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1bX-jaDg4MfnyLt3MedQpi9D1AUvCPYYT',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1LOCFZXSbzhTdnfqr8rY5VSre9gBO5l1I',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1ZVe0xC3R6DMUJr2HSzv5vhn7lcdjCVt5',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '10QcO3jEd_BCyZbRNiLZoyjuu96-nsCrU',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1L5Rh8JPc5Q2GHQC6qhK4DyUwqWFVIPkf',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1eJNm0oBw7vAhW_hRgpXzMTMVKatAqzuk',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1uraPhv6NKoAwU2Fs3HXUzOW5YQCf50RZ',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1VCirLZnEloFAJkUTVfPj9ghBcp9NxW5p',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1M_Kc6g3QHD7MGSqDLvgNrhz5EdWbUp-3',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1gZ1unH_wdresJrj8Z2Nf4utqvoW_W_hH',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1AEC_P5VtuIjJa_tLJL2yejSovtR7aGlE',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1TX3EebIVISY12PEW-NX7n9XUeE-BGzkQ',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1Qwvke0SaYErNKVfY4vTRD-2_ji6L5rHA',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1j8N2PvlmhZI0nyRBvWVbLP_DQv2kCO6A',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1Tu-TlFN7RUlCQ8W4pcLnaaXGZp71gS_2',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1Xu4WCQtmqcLamA0S2MVfcOhsCj4YTr4b',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1_rMvssU2JSnZ_lWidCMaIicekyEu8oiZ',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1TaJp42uswqyK_n_8Eskh_E8kxbKsXsF7',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '10aebFa47-zo_XDoxIO78LncVnLXoQ0GL',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1gMzPYZ00xtrscTgh4f9eeyeEZG5mgMkA',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1h_RNeHinbhmfwwJovzJXffgPgb0bzaiL',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1zlUrypWYQEDjZ5WGzP6LNCa_1tr2eYwP',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1BpaCbMlNo_IA-s1LsNwSJLkRSAN_y2ME',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      {
        drive: '1gaEvBkpBYeDGr40SqjrzDSMe__qAsLDc',
        evento: 'Formatura',
        legenda: 'Formatura da 3ª edição na Mundiale',
      },
      { drive: '1N1X3WAh9O5NfpGJlnJQUVK4GK5MfMjl-', evento: 'DevFest', legenda: 'DevFest Belo Horizonte' },
      { drive: '1VaKvsHw0cNEZITV40T1MlJyYEXWKTlQl', evento: 'DevFest', legenda: 'DevFest Belo Horizonte' },
      { drive: '12fjKdJ03fSjQxuqFAcVGK1FQdulz7O9E', evento: 'DevFest', legenda: 'DevFest Belo Horizonte' },
      { arquivo: 'devfest-01.webp', evento: 'DevFest', legenda: 'DevFest Belo Horizonte' },
      { arquivo: 'devfest-02.webp', evento: 'DevFest', legenda: 'Crachás do DevFest' },
      {
        drive: '1or2_Es3Z1E3wvQ4vh2UIGUEvPGfvZPD7',
        evento: 'GDG Meet',
        legenda: 'GDG Meet — Google Developer Group BH',
      },
      {
        drive: '1RC6WA71kw7OkrXE_IxY07TQln3lwSy1Q',
        evento: 'GDG Meet',
        legenda: 'GDG Meet — Google Developer Group BH',
      },
      {
        drive: '1NBdarSpnwTQKClAw9IjgsDmbInYKTiF6',
        evento: 'GDG Meet',
        legenda: 'GDG Meet — Google Developer Group BH',
      },
      {
        drive: '1dSVdzKJdJCTxm7AlmqcRSv6t6EyIHHI8',
        evento: 'GDG Meet',
        legenda: 'GDG Meet — Google Developer Group BH',
      },
      {
        drive: '1gr6VlyIobjBhQ4vXq27cYi34vcKTBg5m',
        evento: 'GDG Meet',
        legenda: 'GDG Meet — Google Developer Group BH',
      },
      {
        drive: '13S7yJx8TsmmEyr2QO6gQxcW0t5OBCNlT',
        evento: 'GDG Meet',
        legenda: 'GDG Meet — Google Developer Group BH',
      },
      {
        drive: '1vsarCYrKMWaV7NzNLAK8OPb9kp__7ANt',
        evento: 'GDG Meet',
        legenda: 'GDG Meet — Google Developer Group BH',
      },
      { arquivo: 'devfest-06.webp', evento: 'GDG Meet', legenda: 'Google Developer Group BH' },
      { arquivo: 'devfest-07.webp', evento: 'GDG Meet', legenda: 'Alunos no GDG Meet' },
      { arquivo: 'evento-01.jpg', evento: 'GDG Meet', legenda: 'Espaço do evento' },
      { arquivo: 'evento-02.webp', evento: 'GDG Meet', legenda: 'Decoração do evento' },
      { arquivo: 'evento-04.webp', evento: 'GDG Meet', legenda: 'Conversa no estande' },
      { arquivo: 'evento-05.webp', evento: 'GDG Meet', legenda: 'Atividade em grupo' },
      { drive: '1E90AYk0mzPbvMf7zs8Py0Z6LKWT_-4qH', evento: 'DevOpsDays', legenda: 'DevOpsDays BH' },
      { drive: '1tNfY4JXk_kS7f1CbDLLCoNjEjoz7I7ct', evento: 'DevOpsDays', legenda: 'DevOpsDays BH' },
      { drive: '1a8BNbbr190fSN3OQwGYXkeKDOopUGn6Q', evento: 'DevOpsDays', legenda: 'DevOpsDays BH' },
      { arquivo: 'devfest-03.webp', evento: 'DevOpsDays', legenda: 'Turma no DevOpsDays' },
      {
        drive: '166Q_O9IoMRtwNRHoAnU9A20gD0py83ZV',
        evento: 'Women Techmakers',
        legenda: 'Women Techmakers — Break the Pattern',
      },
      {
        drive: '1ltQERB2WTJ59nv-XhWU1FVH26Bq2q5xT',
        evento: 'Women Techmakers',
        legenda: 'Women Techmakers — Break the Pattern',
      },
      {
        arquivo: 'break-the-pattern-01.webp',
        evento: 'Women Techmakers',
        legenda: 'Women Techmakers — Break the Pattern',
      },
      { arquivo: 'break-the-pattern-02.webp', evento: 'Women Techmakers', legenda: 'Plateia do Break the Pattern' },
      { arquivo: 'break-the-pattern-03.webp', evento: 'Women Techmakers', legenda: 'Turma no Break the Pattern' },
      { arquivo: 'break-the-pattern-04.webp', evento: 'Women Techmakers', legenda: 'Alunas no evento' },
      { arquivo: 'break-the-pattern-05.webp', evento: 'Women Techmakers', legenda: 'Lembrança do evento' },
      { arquivo: 'palestra-03.webp', evento: 'Women Techmakers', legenda: 'Auditório durante a palestra' },
      { arquivo: 'turma-sala-01.webp', evento: 'Aulas', legenda: 'Primeiro dia de aula' },
    ],
  },
  {
    titulo: '2ª Edição',
    fotos: [
      { arquivo: 'premiacao-01.webp', evento: 'Prêmio Ser Humano', legenda: 'Prêmio Ser Humano' },
      { arquivo: 'premiacao-02.webp', evento: 'Prêmio Ser Humano', legenda: 'Entrega do troféu' },
      { arquivo: 'premiacao-03.webp', evento: 'Prêmio Ser Humano', legenda: 'Equipe premiada' },
      {
        arquivo: 'edicao-2-01.webp',
        evento: 'Entrega de certificados',
        legenda: 'Turma com os certificados na Mundiale',
      },
      {
        arquivo: 'edicao-2-02.webp',
        evento: 'Entrega de certificados',
        legenda: 'Turma com os certificados na Mundiale',
      },
      {
        arquivo: 'edicao-2-03.webp',
        evento: 'Entrega de certificados',
        legenda: 'Turma com os certificados na Mundiale',
      },
      {
        arquivo: 'edicao-2-04.webp',
        evento: 'Entrega de certificados',
        legenda: 'Turma com os certificados na Mundiale',
      },
      { arquivo: 'edicao-2-05.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-06.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-07.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-08.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-09.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-10.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-11.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-12.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-13.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-14.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-15.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-16.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-17.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-18.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-19.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-20.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-21.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-22.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-23.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-24.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
      { arquivo: 'edicao-2-25.webp', evento: 'Entrega de certificados', legenda: 'Entrega de certificados' },
    ],
  },
  {
    titulo: '1ª Edição',
    fotos: [
      { arquivo: 'Formatura2022.webp', evento: 'Encerramento e formatura', legenda: 'Formatura — 2022' },
      { arquivo: 'turma-1-2022-2.webp', evento: 'Encerramento e formatura', legenda: 'Turma 1 — 2022.2' },
      { arquivo: 'AberturaDoProjeto2022.webp', evento: 'Abertura do projeto', legenda: 'Abertura do projeto — 2022' },
      { arquivo: 'edicao-1-01.webp', evento: 'Abertura do projeto', legenda: 'Convite do evento de abertura' },
      { arquivo: 'edicao-1-03.webp', evento: 'Abertura do projeto', legenda: 'Turma reunida na abertura' },
      {
        arquivo: 'edicao-1-04.webp',
        evento: 'Abertura do projeto',
        legenda: 'Evento de abertura nas Obras Pavonianas',
      },
      {
        arquivo: 'edicao-1-05.webp',
        evento: 'Abertura do projeto',
        legenda: 'Evento de abertura nas Obras Pavonianas',
      },
      {
        arquivo: 'edicao-1-06.webp',
        evento: 'Abertura do projeto',
        legenda: 'Evento de abertura nas Obras Pavonianas',
      },
      {
        arquivo: 'edicao-1-07.webp',
        evento: 'Abertura do projeto',
        legenda: 'Evento de abertura nas Obras Pavonianas',
      },
      {
        arquivo: 'edicao-1-08.webp',
        evento: 'Abertura do projeto',
        legenda: 'Evento de abertura nas Obras Pavonianas',
      },
      {
        arquivo: 'edicao-1-09.webp',
        evento: 'Abertura do projeto',
        legenda: 'Evento de abertura nas Obras Pavonianas',
      },
    ],
  },
];
