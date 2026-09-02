// ============================================================
// BASE — cliente Supabase, sessão, utilidades comuns
// (carregar DEPOIS de config.js e da biblioteca supabase-js)
// ============================================================

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// v1.372 — OS ÍCONES DA CASA, NUM LUGAR SÓ
//
// A varredura de 23/08/2026 achou 371 emojis no CRM. Emoji vem
// colorido, com desenho diferente em cada sistema e num tamanho que o
// CSS não controla — foi por isso que a lupa (v1.124) e a engrenagem
// deixaram de ser caractere. Este registro é a continuação daquilo:
// os mesmos traços, agora à mão de todas as telas.
//
// O DESENHO É SEMPRE O MESMO: caixa de 24x24, só contorno, espessura
// 1.6, pontas arredondadas, e a cor vem do `currentColor` — o ícone
// fica da cor do texto onde estiver, sem uma linha de CSS por ícone.
//
// width/height saem no próprio SVG de propósito (a lição da
// engrenagem gigante): se o CSS atrasar ou vier velho do cache, o
// desenho continua no tamanho certo em vez de esticar até o botão.
//
// Para acrescentar um ícone: uma linha aqui, e `icone('nome')` na tela.
// ============================================================
const ICO_TRACOS = {
  // --- objetos do menu e da busca ---
  casa:        '<path d="M3.5 10.8 12 3.5l8.5 7.3"/><path d="M5.8 9.6V20h12.4V9.6"/><path d="M10 20v-4.6h4V20"/>',
  // v1.414 — a Atendente IA (aba da Configuração)
  robo:        '<rect x="5" y="8.2" width="14" height="10" rx="2.4"/><path d="M12 8.2V5.6"/><circle cx="12" cy="4.2" r="1.2"/><circle cx="9.2" cy="12.6" r=".9" fill="currentColor" stroke="none"/><circle cx="14.8" cy="12.6" r=".9" fill="currentColor" stroke="none"/><path d="M9.4 15.4h5.2"/><path d="M2.8 11.6v3.2M21.2 11.6v3.2"/>',
  alvo:        '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/>',
  documento:   '<path d="M13.4 3.2H7.2A1.7 1.7 0 0 0 5.5 4.9v14.2a1.7 1.7 0 0 0 1.7 1.7h9.6a1.7 1.7 0 0 0 1.7-1.7V8z"/><path d="M13.4 3.2V8h5.1"/><path d="M8.6 13h6.8M8.6 16.4h4.6"/>',
  prancheta:   '<path d="M9.2 4.6H7.4A1.6 1.6 0 0 0 5.8 6.2v13.2a1.6 1.6 0 0 0 1.6 1.6h9.2a1.6 1.6 0 0 0 1.6-1.6V6.2a1.6 1.6 0 0 0-1.6-1.6h-1.8"/><rect x="9.2" y="2.9" width="5.6" height="3.4" rx="1.1"/><path d="m9.9 13.4 1.8 1.8 3.4-3.6"/>',
  chaveInglesa:'<path d="M15.4 3.6a5.1 5.1 0 0 0-5.7 6.7l-6 6a2.1 2.1 0 0 0 3 3l6-6a5.1 5.1 0 0 0 6.7-5.7l-3.1 3.1-2.9-2.9z"/>',
  calendario:  '<rect x="3.8" y="5.4" width="16.4" height="14.8" rx="1.9"/><path d="M3.8 10.1h16.4M8.4 3.2v4.3M15.6 3.2v4.3"/>',
  nota:        '<rect x="2.6" y="6.4" width="18.8" height="11.2" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.2 10.2v3.6M17.8 10.2v3.6"/>',
  pin:         '<path d="M9.4 3.2h5.2l-.8 5.3 3 2.6v1.7H7.2v-1.7l3-2.6z"/><path d="M12 12.8v8"/>',
  checkQuadrado:'<rect x="3.8" y="3.8" width="16.4" height="16.4" rx="2.6"/><path d="m8.2 12.2 2.7 2.7 4.9-5"/>',
  balao:       '<path d="M20.6 12.6c0 3.9-3.9 7.1-8.6 7.1-1.2 0-2.3-.2-3.4-.6L3.4 21l1.7-4a6.5 6.5 0 0 1-1.7-4.4c0-3.9 3.9-7.1 8.6-7.1s8.6 3.2 8.6 7.1z"/>',
  entrada:     '<path d="M3.4 13.4h4.4l1.4 2.6h5.6l1.4-2.6h4.4"/><path d="M6.4 4.6h11.2l3 8.8v4.2a2.2 2.2 0 0 1-2.2 2.2H5.6a2.2 2.2 0 0 1-2.2-2.2v-4.2z"/>',
  carteira:    '<path d="M3.6 8.2a2 2 0 0 1 2-2h10.8"/><rect x="3.6" y="7.4" width="16.8" height="12" rx="2.1"/><path d="M20.4 11.6h-3.7a1.9 1.9 0 0 0 0 3.8h3.7"/>',
  linha:       '<path d="M4.2 4v15.8H20"/><path d="m7.4 15.4 3.4-4.2 3 2.5 4.6-6"/>',
  barras:      '<path d="M4.2 20.2h15.6"/><path d="M7.6 20.2v-5.6M12 20.2V8.4M16.4 20.2v-8.2"/>',
  pessoa:      '<circle cx="12" cy="8.4" r="3.9"/><path d="M4.8 20.2c0-3.5 3.2-5.7 7.2-5.7s7.2 2.2 7.2 5.7"/>',
  pessoas:     '<circle cx="9.4" cy="8.6" r="3.4"/><path d="M3.4 19.8c0-3 2.7-5 6-5s6 2 6 5"/><path d="M15.8 5.7a3.4 3.4 0 0 1 0 6.2M17.4 14.9c2 .6 3.2 2.3 3.2 4.3"/>',
  calculadora: '<rect x="5.2" y="2.8" width="13.6" height="18.4" rx="2.1"/><rect x="8.2" y="6" width="7.6" height="3.2" rx=".9"/><path d="M8.8 13h.01M12 13h.01M15.2 13h.01M8.8 16.8h.01M12 16.8h.01M15.2 16.8h.01"/>',
  escudo:      '<path d="M12 3.2 5.2 5.9v5.7c0 4.3 2.9 7.5 6.8 9.2 3.9-1.7 6.8-4.9 6.8-9.2V5.9z"/>',
  lupa:        '<circle cx="10.8" cy="10.8" r="6.4"/><path d="m15.4 15.4 4.4 4.4"/>',
  gota:        '<path d="M12 3.4c3.3 3.7 5.6 6.5 5.6 9.3a5.6 5.6 0 1 1-11.2 0c0-2.8 2.3-5.6 5.6-9.3z"/>',
  pasta:       '<path d="M3.5 7a1.9 1.9 0 0 1 1.9-1.9h3.9l2.2 2.6h7a1.9 1.9 0 0 1 1.9 1.9v8.6a1.9 1.9 0 0 1-1.9 1.9H5.4a1.9 1.9 0 0 1-1.9-1.9z"/>',
  predio:      '<rect x="4.6" y="3.4" width="14.8" height="17.2" rx="1.7"/><path d="M8.4 7.6h2.2M13.4 7.6h2.2M8.4 11.6h2.2M13.4 11.6h2.2M9.9 20.6v-4.2h4.2v4.2"/>',
  envelope:    '<rect x="2.9" y="5.4" width="18.2" height="13.2" rx="2.1"/><path d="m3.8 6.8 8.2 6 8.2-6"/>',
  imagem:      '<rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.1"/><circle cx="8.9" cy="9.9" r="1.8"/><path d="m4.2 17.6 4.8-4.4 3.3 2.9 2.8-2.4 4.5 4.2"/>',
  // v1.454 — a figurinha do WhatsApp: a folha com o canto dobrado (é
  // como o próprio WhatsApp a desenha) e a carinha dentro
  figurinha:   '<path d="M20.4 13.1V6.4a2.2 2.2 0 0 0-2.2-2.2H5.8a2.2 2.2 0 0 0-2.2 2.2v11.2a2.2 2.2 0 0 0 2.2 2.2h6.7z"/><path d="M12.5 19.8v-4.5a2.2 2.2 0 0 1 2.2-2.2h5.7z"/><path d="M8.4 9.4h.01M13.2 9.4h.01"/><path d="M8.6 13.2a3.4 3.4 0 0 0 3.1 1.8"/>',
  cadeadoCheck:'<rect x="4.6" y="10.4" width="14.8" height="9.9" rx="2.1"/><path d="M8 10.4V7.8a4 4 0 0 1 8 0v2.6"/><path d="m9.9 15.4 1.6 1.6 3-3.1"/>',
  sair:        '<path d="M14.4 4.4H6.8A1.8 1.8 0 0 0 5 6.2v11.6a1.8 1.8 0 0 0 1.8 1.8h7.6"/><path d="M10.8 12h9.4M16.8 8.4 20.4 12l-3.6 3.6"/>',
  livro:       '<path d="M4.6 5.2a2.4 2.4 0 0 1 2.4-2.4h4.4v15.6H7a2.4 2.4 0 0 0-2.4 2.4z"/><path d="M19.4 5.2A2.4 2.4 0 0 0 17 2.8h-4.4v15.6H17a2.4 2.4 0 0 1 2.4 2.4z"/><path d="M4.6 5.2v15.6M19.4 5.2v15.6"/>',
  teclado:     '<rect x="2.4" y="6.2" width="19.2" height="11.6" rx="2.1"/><path d="M6.4 9.8h.01M9.6 9.8h.01M12.8 9.8h.01M16 9.8h.01M6.4 13h.01M17.6 13h.01M9.4 14.6h5.2"/>',
  aviso:       '<path d="M10.6 4.3 2.8 17.9a1.7 1.7 0 0 0 1.5 2.5h15.4a1.7 1.7 0 0 0 1.5-2.5L13.4 4.3a1.6 1.6 0 0 0-2.8 0z"/><path d="M12 9.6v4.2M12 17.2h.01"/>',
  // v1.397 — o "i" das dicas em balão. Fica junto do `aviso` de
  // propósito: são a mesma família, e a diferença é o tom — o aviso
  // interrompe, a informação só espera o mouse.
  informacao:  '<circle cx="12" cy="12" r="9"/><path d="M12 11.2v4.6"/><path d="M12 7.9v.3"/>',
  // --- ações (v1.373 — fase 2: os botões) ---
  mais:        '<path d="M12 5.4v13.2M5.4 12h13.2"/>',
  salvar:      '<path d="M5.6 4.4h10.1l3.9 3.9v10.1a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 18.4V6a1.6 1.6 0 0 1 1.6-1.6z"/><path d="M8 4.4v4.8h6.8V4.4M8 19.6v-5.5h8v5.5"/>',
  lixeira:     '<path d="M4.4 6.8h15.2M9.2 6.8V4.7a1.1 1.1 0 0 1 1.1-1.1h3.4a1.1 1.1 0 0 1 1.1 1.1v2.1"/><path d="M6.8 6.8 7.7 19.1a1.6 1.6 0 0 0 1.6 1.5h5.4a1.6 1.6 0 0 0 1.6-1.5l.9-12.3"/><path d="M10.3 10.6v6M13.7 10.6v6"/>',
  arquivar:    '<rect x="3.2" y="3.9" width="17.6" height="4.7" rx="1.4"/><path d="M5 8.6v10.1a1.9 1.9 0 0 0 1.9 1.9h10.2a1.9 1.9 0 0 0 1.9-1.9V8.6"/><path d="M10 12.6h4"/>',
  impressora:  '<path d="M7 8.4V3.8h10v4.6"/><path d="M7 16.2H4.9a1.8 1.8 0 0 1-1.8-1.8v-4.2a1.8 1.8 0 0 1 1.8-1.8h14.2a1.8 1.8 0 0 1 1.8 1.8v4.2a1.8 1.8 0 0 1-1.8 1.8H17"/><path d="M7 13.6h10v6.6H7z"/>',
  baixar:      '<path d="M12 3.8v11.4M7.8 11.1 12 15.3l4.2-4.2"/><path d="M4.6 19.8h14.8"/>',
  clipe:       '<path d="M19.6 11.3 12 18.9a4.5 4.5 0 0 1-6.4-6.4l7.6-7.6a3 3 0 0 1 4.3 4.3l-7.6 7.6a1.5 1.5 0 0 1-2.1-2.1l7-7"/>',
  elo:         '<path d="M9.9 13.9a3.9 3.9 0 0 0 5.7.4l2.5-2.5a3.9 3.9 0 0 0-5.5-5.5l-1.4 1.4"/><path d="M14.1 10.1a3.9 3.9 0 0 0-5.7-.4l-2.5 2.5a3.9 3.9 0 0 0 5.5 5.5l1.4-1.4"/>',
  olho:        '<path d="M2.8 12S6.6 5.9 12 5.9 21.2 12 21.2 12 17.4 18.1 12 18.1 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.9"/>',
  telefone:    '<path d="M8 4.3 5.4 5.5a1.9 1.9 0 0 0-1 2.3c1.4 4.6 5.2 8.4 9.8 9.8a1.9 1.9 0 0 0 2.3-1l1.2-2.6-3.9-2.2-1.8 1.8a12.3 12.3 0 0 1-3.8-3.8l1.8-1.8z"/>',
  enviar:      '<path d="M20.6 3.4 3.6 10.2l6.7 3 3 6.7z"/><path d="m20.6 3.4-10.3 9.8"/>',
  relogio:     '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.2 2"/>',
  cadeado:     '<rect x="4.8" y="10.4" width="14.4" height="9.9" rx="2.1"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
  cadeadoAberto:'<rect x="4.8" y="10.4" width="14.4" height="9.9" rx="2.1"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.4-.9"/>',
  raio:        '<path d="M13.2 2.6 5.4 13.5h5.7l-.9 8 7.9-11.1h-5.6z"/>',
  sino:        '<path d="M17.6 10.5a5.6 5.6 0 1 0-11.2 0c0 5-2.1 6.6-2.1 6.6h15.4s-2.1-1.6-2.1-6.6z"/><path d="M13.8 20.2a2.1 2.1 0 0 1-3.6 0"/>',
  // v1.440 — o CRM no celular: o aparelho (item "Meu CRM no celular")
  // e as três linhas do botão Menu da barra de baixo.
  celular:     '<rect x="6.4" y="2.8" width="11.2" height="18.4" rx="2.4"/><path d="M10.4 5.4h3.2M12 18.2h.01"/>',
  menuLinhas:  '<path d="M4.4 7h15.2M4.4 12h15.2M4.4 17h15.2"/>',
  sinoCortado: '<path d="M17.6 10.5a5.6 5.6 0 0 0-8-5.1M6.5 8.8a5.6 5.6 0 0 0-.1 1.7c0 5-2.1 6.6-2.1 6.6h13"/><path d="M13.8 20.2a2.1 2.1 0 0 1-3.6 0"/><path d="M3.6 3.6 20.4 20.4"/>',
  moeda:       '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2v9.6"/><path d="M14.4 9.6c-.5-.8-1.4-1.2-2.4-1.2-1.5 0-2.7.8-2.7 2s1.2 1.9 2.7 1.9 2.7.7 2.7 1.9-1.2 2-2.7 2c-1 0-1.9-.4-2.4-1.2"/>',
  voltar:      '<path d="M4.6 5.4v5.2h5.2"/><path d="M5.8 14.2a7.6 7.6 0 1 0 1.3-6.4"/>',
  check:       '<path d="m5.2 12.6 4.6 4.6L18.8 7.6"/>',
  // --- estados, anexos e tipos (v1.374 — fase 3) ---
  atencao:     '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.6v4.8M12 16.2h.01"/>',
  proibido:    '<circle cx="12" cy="12" r="8.4"/><path d="m6.1 6.1 11.8 11.8"/>',
  chama:       '<path d="M12 20.8c3.5 0 5.9-2.3 5.9-5.5 0-3.8-3.4-5.6-4.4-9.5-2 1.2-2.7 3.3-2.2 5.2-1-.8-1.5-2-1.5-3.3-2 1.9-3.7 4.4-3.7 7.6 0 3.2 2.4 5.5 5.9 5.5z"/>',
  checkCirculo:'<circle cx="12" cy="12" r="8.4"/><path d="m8.2 12.3 2.7 2.7 4.9-5.1"/>',
  xis:         '<path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6"/>',
  bandeira:    '<path d="M6 20.8V4.1"/><path d="M6 5.2h11.4l-2.2 3.6 2.2 3.6H6"/>',
  fantasma:    '<path d="M5.6 20.4V10.2a6.4 6.4 0 1 1 12.8 0v10.2l-2.1-1.8-2.2 1.8-2.1-1.8-2.2 1.8z"/><path d="M9.8 10.2h.01M14.2 10.2h.01"/>',
  estrela:     '<path d="m12 3.8 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  balanca:     '<path d="M12 4.4v15.4M7.6 19.8h8.8M12 7.2 5.4 8.6M12 7.2l6.6 1.4"/><path d="M5.4 8.6 3 14.2h4.8zM18.6 8.6 16.2 14.2H21z"/>',
  queda:       '<path d="M4.2 4v15.8H20"/><path d="m7.4 9.4 3.4 4.2 3-2.5 4.6 6"/>',
  recibo:      '<path d="M6.2 3.4h11.6v17.2l-1.9-1.4-1.9 1.4-1.9-1.4-1.9 1.4-1.9-1.4-2.1 1.4z"/><path d="M9.2 8.4h5.6M9.2 12.4h5.6"/>',
  sirene:      '<path d="M6.2 20.4v-6.6a5.8 5.8 0 1 1 11.6 0v6.6z"/><path d="M4.2 20.4h15.6M12 3.2V5M6.6 5.6 7.9 7M17.4 5.6 16.1 7"/>',
  correio:     '<rect x="2.6" y="5" width="14.8" height="11.2" rx="2"/><path d="m3.5 6.2 6.5 4.8 6.5-4.8"/><circle cx="18.4" cy="17.4" r="3.6"/><path d="M18.4 15.6v1.8M18.4 19.4h.01"/>',
  crachaId:    '<rect x="2.9" y="5.4" width="18.2" height="13.2" rx="2.1"/><circle cx="9" cy="10.6" r="2.2"/><path d="M14.2 9.8h4.2M14.2 13.4h3.2M5.5 16.2c.7-1.4 2-2.1 3.5-2.1s2.8.7 3.5 2.1"/>',
  papelCaneta: '<path d="M12.6 3.6H7.2A1.7 1.7 0 0 0 5.5 5.3v13.9a1.7 1.7 0 0 0 1.7 1.7h9.6a1.7 1.7 0 0 0 1.7-1.7v-5.6"/><path d="m15 4.2 3.5 3.5-5 5-3.8.8.8-3.8z"/>',
  malaTrabalho:'<rect x="3.2" y="7.2" width="17.6" height="12.4" rx="2.1"/><path d="M9 7.2V5.4a1.7 1.7 0 0 1 1.7-1.7h2.6A1.7 1.7 0 0 1 15 5.4v1.8"/><path d="M3.2 12.4h17.6"/>',
  chave:       '<circle cx="7.9" cy="16.1" r="3.7"/><path d="m10.6 13.4 8.2-8.2M14.6 9.4l2.3 2.3M16.8 7.2l2.3 2.3"/>',
  chuveiro:    '<path d="M12 2.8v3.8"/><path d="M6.4 11.8h11.2a5.6 5.6 0 0 0-11.2 0z"/><path d="M9 15.4h.01M12 17h.01M15 15.4h.01M10.4 19.8h.01M13.6 19.8h.01"/>',
  video:       '<rect x="2.9" y="5.6" width="12.8" height="12.8" rx="2.1"/><path d="m15.7 12 5.4-3.4v6.8z"/>',
  microfone:   '<rect x="9.2" y="2.8" width="5.6" height="10.6" rx="2.8"/><path d="M5.9 11.4a6.1 6.1 0 0 0 12.2 0M12 17.5v3.3"/>',
  ampulheta:   '<path d="M6.6 3.4h10.8M6.6 20.6h10.8M7.6 3.4v3.2c0 2.4 4.4 3.6 4.4 5.4s-4.4 3-4.4 5.4v3.2M16.4 3.4v3.2c0 2.4-4.4 3.6-4.4 5.4s4.4 3 4.4 5.4v3.2"/>',
  // a engrenagem é a RÉGUA desta família: nasceu na v1.124, no cabeçalho.
  // O desenho é o mesmo de lá — o ICONE_ENGRENAGEM agora vem daqui, para
  // não existirem dois traços diferentes da mesma peça.
  engrenagem:  '<circle cx="12" cy="12" r="3"/>'
    + '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06'
    + 'a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09'
    + 'A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83'
    + 'l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09'
    + 'A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83'
    + 'l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09'
    + 'a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83'
    + 'l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09'
    + 'a1.65 1.65 0 0 0-1.51 1z"/>'
};

/**
 * O SVG de um ícone do registro, pronto para entrar no innerHTML.
 * `px` só existe para os poucos lugares que fogem do 19 (o tamanho da
 * engrenagem, que é a régua do cabeçalho). Nome desconhecido devolve
 * vazio de propósito: um ícone faltando não pode derrubar a tela.
 */
function icone(nome, px) {
  const d = ICO_TRACOS[nome];
  if (!d) return '';
  const t = px || 19;
  return '<svg viewBox="0 0 24 24" width="' + t + '" height="' + t + '" fill="none"'
    + ' stroke="currentColor" stroke-width="1.6" stroke-linecap="round"'
    + ' stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
}

/**
 * v1.479 — A NUMERAÇÃO DA PARCELA DO SEGURO ("2/12").
 *
 * Mora aqui, e não no ficha.js nem no demonstrativo.js, porque os DOIS
 * a usam: a ficha da parcela e a folha que o inquilino lê. Se a conta
 * vivesse em dois arquivos, um dia os dois documentos diriam números
 * diferentes para a mesma cobrança — e o inquilino veria a diferença.
 *
 * `k` é quantos meses se passaram desde o início do item (0 no
 * primeiro). Devolve {n, tot}, ou null quando não há o que numerar.
 *
 * SEM CICLO (`ciclo_meses` nulo) é o comportamento de sempre: conta de
 * 1 até o total e TRAVA nele. Fica intocado de propósito — a regra
 * nova vale só para contrato novo, e é a ausência da coluna que separa
 * os dois mundos.
 *
 * COM CICLO a numeração GIRA: no 13º mês volta a 1. E
 * `primeiraPagaFora` desloca o começo em um — é a parcela que o
 * inquilino pagou direto à seguradora junto com o setup, e que por
 * isso nunca vira boleto da imobiliária. Com ela, o 1º ciclo tem 11
 * cobranças (2 a 12) e os seguintes têm 12.
 */
function numeroDaParcelaDoSeguro(k, tot, cicloMeses, primeiraPagaFora) {
  if (!tot || k < 0) return null;
  if (!cicloMeses) return { n: Math.max(1, Math.min(k + 1, tot)), tot };
  const desloc = primeiraPagaFora ? 1 : 0;
  return { n: ((k + desloc) % cicloMeses) + 1, tot: cicloMeses };
}

/** Exige login: se não houver sessão, manda para a tela de login. */
async function exigirLogin() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return null; }

  // v1.339 — A SEGUNDA ETAPA TAMBÉM É EXIGIDA AQUI.
  //
  // Sem isto, dois caminhos entrariam sem o código: quem volta do Google
  // (que aterrissa direto na Home, sem passar pela tela de login) e quem
  // digita o endereço de uma tela qualquer com uma sessão de primeiro
  // fator guardada no navegador.
  //
  // Isto é UX, não segurança — a trava de verdade é `mfa_ok()` dentro do
  // `posso()`, no banco (v1339-sql-3). Aqui a gente só evita que a pessoa
  // veja uma tela vazia sem entender por quê.
  const falta = await faltaSegundaEtapa();
  if (falta) {
    window.location.href = URL_RAIZ + 'login.html?motivo=' + falta;
    return null;
  }

  const el = document.getElementById('usuario-logado');
  if (el) el.textContent = session.user.email;
  return session;
}

// ------------------------------------------------------------
// VERIFICAÇÃO EM DUAS ETAPAS (v1.339)
//
// O miolo mora AQUI, e não num arquivo novo, por um motivo prático: um
// js novo teria de ser declarado nas 35 telas, cada uma com o seu `?v=`.
// O base.js já é carregado por todas — inclusive pelo login.html, que é
// quem mais usa isto.
//
// O que o Supabase faz sozinho: guarda o segredo, valida o código, e
// carimba o nível da sessão (aal1 = só senha; aal2 = senha + código).
// O que é nosso: decidir QUANDO cobrar, e conduzir a pessoa.
// ------------------------------------------------------------

/**
 * Diz o que está faltando para esta sessão estar completa. Devolve:
 *   'verificacao'   — a pessoa TEM aplicativo cadastrado e ainda não
 *                     digitou o código desta vez;
 *   'cadastrar-2fa' — a instalação exige duas etapas e ela ainda não
 *                     cadastrou nenhum aplicativo;
 *   null            — está tudo certo (ou não há sessão).
 *
 * Nunca devolve motivo por engano quando a rede falha: em caso de erro,
 * responde null. Barrar o acesso por causa de uma consulta que não
 * respondeu seria trocar um risco por um problema garantido — e a trava
 * do banco continua de pé de qualquer forma.
 */
async function faltaSegundaEtapa() {
  try {
    const { data, error } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) return null;
    if (data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') return 'verificacao';
    if (data.nextLevel !== 'aal2' && exige2FA()) return 'cadastrar-2fa';
    return null;
  } catch (e) { return null; }
}

/** A instalação exige duas etapas de todo mundo? (chave no config.js) */
function exige2FA() {
  return typeof EXIGIR_2FA !== 'undefined' && EXIGIR_2FA;
}

/** Os aplicativos JÁ CONFIRMADOS desta pessoa. */
async function fatoresConfirmados() {
  const { data, error } = await sb.auth.mfa.listFactors();
  if (error) throw error;
  return (data.totp || []).filter(f => f.status === 'verified');
}

/**
 * Começa o cadastro de um aplicativo e devolve { id, imagemQr, chave }.
 *
 * LIMPA OS INACABADOS ANTES — e isso não é zelo, é necessidade: cada vez
 * que alguém abre a tela e desiste fica um fator 'unverified' pendurado,
 * o Supabase tem teto de fatores por pessoa, e o segundo cadastro
 * começaria a falhar com uma mensagem que ninguém liga à causa.
 */
async function iniciarCadastro2FA() {
  const { data: lista } = await sb.auth.mfa.listFactors();
  for (const f of ((lista && lista.all) || [])) {
    if (f.status !== 'verified') { try { await sb.auth.mfa.unenroll({ factorId: f.id }); } catch (e) {} }
  }

  const { data, error } = await sb.auth.mfa.enroll({
    factorType: 'totp',
    // o nome que aparece no aplicativo da pessoa, ao lado do código
    friendlyName: 'CRM ' + new Date().toISOString().slice(0, 10)
  });
  if (error) throw error;

  // O Supabase manda o QR como SVG. Vira endereço de imagem em vez de
  // entrar no DOM como marcação: uma imagem não executa nada, e o
  // desenho é idêntico. Algumas versões já mandam com o "data:" na
  // frente — daí os dois caminhos.
  const svg = data.totp.qr_code || '';
  const imagemQr = svg.startsWith('data:')
    ? svg
    : 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

  return { id: data.id, imagemQr, chave: data.totp.secret || '' };
}

/** Confirma o cadastro com o código de 6 dígitos digitado pela pessoa. */
async function confirmarCadastro2FA(fatorId, codigo) {
  const { error } = await sb.auth.mfa.challengeAndVerify({
    factorId: fatorId, code: String(codigo || '').replace(/\D/g, '')
  });
  if (error) throw error;
}

/** Passo 2 do login: pede o desafio e valida o código do aplicativo. */
async function verificarSegundaEtapa(codigo) {
  const fatores = await fatoresConfirmados();
  if (!fatores.length) throw new Error('Nenhum aplicativo cadastrado nesta conta.');
  const { error } = await sb.auth.mfa.challengeAndVerify({
    factorId: fatores[0].id, code: String(codigo || '').replace(/\D/g, '')
  });
  if (error) throw error;
}

/**
 * Traduz o erro do Supabase para a linguagem de quem está na frente da
 * tela. "Invalid TOTP code entered" não diz a única coisa que a pessoa
 * precisa saber: que o código vira a cada 30 segundos e ela pode estar
 * digitando o que acabou de expirar.
 */
function erro2FAEmPortugues(e) {
  const m = String((e && e.message) || e || '');
  if (/invalid.*(totp|code)|code.*invalid/i.test(m))
    return 'Código incorreto. Ele muda a cada 30 segundos — espere aparecer o próximo e digite de novo.';
  if (/rate|too many|limit/i.test(m))
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  if (/expired|challenge/i.test(m))
    return 'A janela do código expirou. Digite o código que está aparecendo agora.';
  if (/factor.*exist|already/i.test(m))
    return 'Já existe um aplicativo cadastrado nesta conta.';
  return m || 'Não foi possível concluir a verificação.';
}

async function sair() {
  await sb.auth.signOut();
  window.location.href = 'login.html';
}

// ------------------------------------------------------------
// SESSÃO QUE MORRE NO MEIO DO USO (v1.101) — aba aberta por horas,
// computador que dormiu, renovação do token que falhou. Sem isto, a
// tela continua PARECENDO logada e cada gravação falha com
// "permission denied for table X" em inglês — porque as consultas
// passam a sair como visitante anônimo. Diagnóstico de 28/07, medido
// ao vivo: getSession() nulo numa tela desenhada como logada.
// A regra: sessão acabou → login imediatamente, com o motivo na URL.
// ------------------------------------------------------------
/**
 * v1.262 — O NOME DA TELA, venha o endereço como vier.
 *
 * A partir da regra do servidor que tira o ".html" do endereço,
 * `crm.morali.app/contratos` e `crm.morali.app/contratos.html` são a
 * MESMA tela. Só que cinco lugares do CRM identificavam a tela pelo
 * nome do arquivo e comparavam com 'contratos.html' escrito à mão:
 * a guarda de permissão da página, a estrela de favoritar, o favorito
 * da lista salva, o menu de ajuda e a lista de telas sem login.
 * Nenhum deles daria erro — todos simplesmente parariam de achar o que
 * procuravam, em silêncio. A guarda de permissão é a que dói: a tela
 * abriria para quem o papel não alcança (o banco continua recusando os
 * dados, mas a porta ficaria destrancada).
 *
 * Esta função é o único lugar que sabe disso. Devolve SEMPRE o nome do
 * arquivo — 'contratos.html' — tendo o endereço vindo com extensão ou
 * sem. Endereço de pasta (a raiz, /crm-beta/) é a home.
 *
 * É também a peça que faz o formato futuro (/contrato/CON-0050) custar
 * barato: quem quiser mudar o desenho do endereço mexe aqui, e não nos
 * cinco lugares outra vez.
 */
function nomeDaTela() {
  // v1.263 — a ficha diz quem ela é. No endereço bonito (/contato/CT-0054)
  // o último pedaço do caminho é o CÓDIGO, não o arquivo — deduzir daí
  // daria 'ct-0054.html' e a guarda de permissão não acharia nada. Toda
  // tela de ficha declara `const ALVO` antes dos scripts; é a fonte certa.
  if (typeof ALVO !== 'undefined' && ALVO) return ALVO + '.html';
  const arq = (location.pathname.split('/').pop() || '').toLowerCase();
  if (!arq) return 'index.html';
  return /\.[a-z0-9]+$/.test(arq) ? arq : arq + '.html';
}

/**
 * v1.263 — A RAIZ DO SISTEMA, calculada UMA vez, na carga.
 *
 * Todo link que o CRM monta a partir do endereço atual (o recibo, o
 * documento público, o portal do prestador) fazia a mesma conta na hora
 * do clique: cortar o que vem depois da última barra. Com o endereço
 * bonito na barra (/contato/CT-0054), essa conta passa a devolver
 * "/contato/" — e o link sai errado. Calculando na carga, antes de o
 * history.replaceState embelezar a barra, o valor é sempre a pasta onde
 * o sistema mora: "/" na produção, "/crm-beta/" no beta.
 *
 * O `if` do meio cobre o F5 num endereço bonito: o último pedaço é um
 * código (CT-0054) e a tela está um nível acima dele.
 */
const URL_RAIZ = (() => {
  const seg = location.pathname.split('/');
  const fim = seg.pop();                                  // '', 'contatos' ou 'CT-0054'
  if (/^[A-Za-z]{2,4}-[0-9]+$/.test(fim)) seg.pop();      // endereço bonito: sobe a tela também
  return location.origin + seg.join('/') + '/';
})();

const PAGINAS_SEM_LOGIN = ['login.html', 'cadastro.html', 'nova-senha.html'];
sb.auth.onAuthStateChange((evento) => {
  const pagina = nomeDaTela();
  if (evento === 'SIGNED_OUT' && !PAGINAS_SEM_LOGIN.includes(pagina)) {
    // v1.263 — pela raiz, não relativo: com o endereço bonito na barra
    // (/contato/CT-0054), 'login.html' relativo cairia em /contato/login.html.
    window.location.href = URL_RAIZ + 'login.html?motivo=sessao-expirada';
  }
});

/** Escapa texto para HTML (evita quebra de layout / injeção). */
function htm(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

/** Escapa texto para dentro de uma STRING JAVASCRIPT em atributo on*
 *  (v1.115). O htm() protege HTML, mas dentro de onclick="f('...')" o
 *  &#39; volta a ser aspa quando o navegador lê o atributo — foi por aí
 *  que um bairro digitado com aspas conseguia executar script no
 *  relatório agrupado. Aqui cada caractere perigoso vira \uXXXX, que é
 *  inerte no HTML e correto no JavaScript. Use SEMPRE que interpolar
 *  valor do banco em onclick/ondrop/onchange gerado por string. */
function jsq(v) {
  return String(v ?? '').replace(/[\\'"<>&\n\r\u2028\u2029]/g,
    c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

/** Devolve a URL só se for http(s); senão, null (v1.115).
 *  link_anuncio e anexos são texto livre no banco — sem este filtro,
 *  um "javascript:" gravado ali executaria ao clicar no link. */
function urlSegura(u) {
  return /^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : null;
}

// ------------------------------------------------------------
// COLETOR GLOBAL DE ERROS (v1.115) — a luz que faltava.
//
// O cadastro de imóvel que morria em silêncio (28/07) ensinou a regra:
// falha invisível é a pior categoria de defeito. Qualquer erro de
// script ou promessa rejeitada sem catch (inclusive o bootstrap
// exigirLogin().then(...) de toda tela) acende uma faixa vermelha no
// topo com a PRIMEIRA mensagem — as seguintes costumam ser
// consequência, então a faixa não é sobrescrita. O console continua
// com o erro completo para diagnóstico (F12).
// ------------------------------------------------------------
let __faixaErroLigada = false;
function mostrarFaixaErro(msg) {
  if (__faixaErroLigada) return;
  __faixaErroLigada = true;
  const el = document.createElement('div');
  el.className = 'faixa-erro-global';
  el.setAttribute('role', 'alert');
  el.innerHTML = icone('aviso', 13) + ' Algo falhou nesta tela e ela pode estar incompleta. ' +
    'Recarregue a página; se repetir, envie a primeira linha vermelha do console (F12). ' +
    `<span class="det">${htm(String(msg || '').slice(0, 160))}</span>`;
  const liga = () => document.body && document.body.prepend(el);
  if (document.body) liga(); else document.addEventListener('DOMContentLoaded', liga);
}
window.addEventListener('error', e => {
  // erro de carregamento de recurso (script/img 404) também conta
  const msg = e.message || (e.target && e.target.src ? 'não carregou: ' + e.target.src : 'erro');
  mostrarFaixaErro(msg);
}, true);
window.addEventListener('unhandledrejection', e => {
  const r = e.reason;
  mostrarFaixaErro((r && (r.message || r.toString())) || 'promessa rejeitada');
});

function moeda(v) {
  if (v === null || v === undefined || v === '') return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ============================================================
// v1.364 — TELEFONE JÁ CADASTRADO?
//
// Três telas avisavam duplicado de telefone, cada uma de um jeito e
// todas com furos: leads e contatos olhavam só as LINHAS CARREGADAS
// da lista (até 200, menos com filtro), nenhuma olhava a outra tabela,
// e a ficha não olhava nada. Aqui vira UMA pergunta ao BANCO, com a
// mesma régua do casamento das conversas (conversa_tel_igual): número
// igual, ou 11×10 dígitos com o mesmo DDD e o mesmo final — o nono
// dígito que o cadastro antigo não tem.
// ============================================================

/** normaliza como o banco (conversa_norm_tel): só dígitos, sem o DDI 55 */
function telNormalizado(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.slice(0, 2) === '55' && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return d;
}

/** a régua do conversa_tel_igual, em JavaScript */
function telefonesIguais(a, b) {
  const na = telNormalizado(a), nb = telNormalizado(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return ((na.length === 11 && nb.length === 10) || (na.length === 10 && nb.length === 11))
    && na.slice(0, 2) === nb.slice(0, 2) && na.slice(-8) === nb.slice(-8);
}

/**
 * Procura o telefone em CONTATOS e LEADS, no banco (a RLS já limita à
 * empresa). Devolve { tabela:'contato'|'lead', id, codigo, nome, status }
 * do primeiro dono — contato antes de lead, lead aberto antes de
 * encerrado (a mesma preferência do casamento das conversas) — ou null.
 * `ignorar` tira o próprio registro da busca: { contato: id } ou { lead: id }.
 * A comparação é aqui no navegador porque o banco guarda telefone dos
 * dois jeitos (com e sem pontuação) — e na escala da Moralí as duas
 * consultas inteiras são pequenas.
 */
async function telefoneEmUso(telefone, ignorar) {
  if (telNormalizado(telefone).length < 8) return null;
  ignorar = ignorar || {};
  const [rc, rl] = await Promise.all([
    sb.from('contatos').select('id,codigo,nome,telefone').not('telefone', 'is', null),
    sb.from('leads').select('id,codigo,nome,telefone,status').not('telefone', 'is', null)
  ]);
  const c = (rc.data || []).find(x =>
    x.id !== ignorar.contato && telefonesIguais(x.telefone, telefone));
  if (c) return { tabela: 'contato', ...c };
  const ls = (rl.data || []).filter(x =>
    x.id !== ignorar.lead && telefonesIguais(x.telefone, telefone));
  const l = ls.find(x => ['Convertido', 'Perdido'].indexOf(x.status) < 0) || ls[0];
  return l ? { tabela: 'lead', ...l } : null;
}

// ============================================================
// v1.379 — O TIMBRE DA IMOBILIÁRIA, NUM LUGAR SÓ.
//
// Estava dentro do parcelas.js, servindo o demonstrativo de comissões.
// A ficha em PDF virou o segundo freguês, e timbre montado em dois
// lugares diverge no dia em que um deles ganhar um campo.
//
// NADA AQUI É ESCRITO NO CÓDIGO: nome, razão social, CRECI, contato e
// cidade saem do CADASTRO da imobiliária (Administração → Empresas).
// É o que faz o mesmo documento sair com a marca certa quando o CRM
// atender outra imobiliária — e é por isso que os campos do config.js
// estão vazios de propósito desde a v1.275.
// ============================================================
function empresaDoTimbre() {
  const e = (typeof PERM !== 'undefined' && PERM.empresa) ? PERM.empresa : {};
  const tel = e.telefone || '';
  return {
    nome: e.nome_fantasia || EMPRESA.nome,
    razao: e.razao_social || EMPRESA.razaoSocial,
    telefone: (tel && typeof mascaraTelefone === 'function') ? mascaraTelefone(tel) : tel,
    email: e.email_contato || '',
    cidade: e.cidade || '',
    creci: e.creci || '',
    // a linha crua, para quem precisa do logotipo: logoEmpresa(e) devolve
    // a marca cadastrada (bucket `logos`) ou a sigla colorida — o mesmo
    // que o cabeçalho mostra, nunca a marca de outra imobiliária
    empresa: e
  };
}

// ============================================================
// v1.365 — A MÍDIA NA BOLHA DA CONVERSA (fase 2 do WhatsApp)
//
// Desde 23/08/2026 a Edge Function baixa áudio/foto/vídeo/documento na
// chegada e guarda no bucket privado `conversa-midia`; a mensagem traz
// `midia_caminho`. Estas duas funções moram AQUI porque o fio é
// desenhado em três lugares (tela Conversas, cartão da ficha e caixa
// fixa) — e mídia renderizada de três jeitos diferentes seria o
// "terceiro lugar que precisava saber disso" de novo.
//
// O desenho: a bolha nasce com o elemento certo (audio/img/video/a) e
// SEM o endereço — o bucket é trancado, o link é assinado e vale 1h.
// Depois de pintar o fio, assinarMidias() pede os links num lote só e
// preenche. Mídia de antes da fase 2 não tem arquivo: a bolha explica.
// ============================================================

/** o HTML da mídia de uma mensagem (m = linha de mensagens_conversa) */
function midiaBolhaHtml(m) {
  const c = m.midia_caminho;
  const legenda = m.texto
    ? `<div class="cv-midia-legenda">${htm(m.texto)}</div>` : '';

  if (!c) {
    // v1.454 — O BALDE "OUTRO" PAROU DE MENTIR. Toda mensagem que o CRM
    // não sabe ler (enquete, contato, localização) cai em `outro`, e a
    // frase antiga dizia que ela era antiga — sendo que a maioria tinha
    // acabado de chegar. Agora ela diz a verdade: o CRM não mostra ESTE
    // TIPO. (Figurinha e reação saíram do balde nesta mesma versão.)
    // as frases saem CONCATENADAS, não quebradas dentro do modelo: a
    // bolha é `white-space: pre-wrap`, e a quebra do código virava um
    // buraco de verdade no meio da frase, na tela
    if (m.tipo === 'outro')
      return '<span class="cv-midia-expirada">' + icone('balao', 13)
        + ' Este tipo de mensagem o CRM ainda não mostra — está no celular'
        + '</span>' + legenda;
    const nomes = { imagem: icone('imagem', 13) + ' Foto', audio: icone('microfone', 13) + ' Áudio',
                    video: icone('video', 13) + ' Vídeo', documento: icone('documento', 13) + ' Documento',
                    figurinha: icone('figurinha', 13) + ' Figurinha' };
    return '<span class="cv-midia-expirada">'
      + (nomes[m.tipo] || icone('balao', 13) + ' Mensagem')
      + ' (chegou antes de o CRM guardar mídia — está só no celular)</span>' + legenda;
  }
  // v1.454 — a figurinha é o desenho e mais nada: sem bolha (quem pinta
  // o fio troca a classe), sem convite de clique (ela pesa 30 a 100 KB,
  // desce junto) e sem legenda (o WhatsApp não deixa escrever uma).
  // Animada anima sozinha — é webp.
  if (m.tipo === 'figurinha')
    return `<img class="cv-figurinha-img" alt="figurinha" data-midia="${htm(c)}">`;
  if (m.tipo === 'audio')
    return `<span class="cv-midia-audio">${icone('microfone', 15)}
      <audio controls preload="none" data-midia="${htm(c)}"></audio></span>`;

  // v1.370 — foto e vídeo NÃO descem sozinhos (pedido do Rodrigo,
  // 23/08/2026): a bolha nasce com o convite e o peso, e o arquivo só é
  // baixado quando a pessoa clica (verMidiaDaBolha assina o link na
  // hora). O atributo é data-midia-espera DE PROPÓSITO: o assinarMidias
  // só encosta em [data-midia], então nada é assinado nem baixado antes.
  // Documento e áudio já eram sob demanda e ficam como estão.
  if (m.tipo === 'imagem' || m.tipo === 'video') {
    const rotulo = m.tipo === 'video' ? 'Ver o vídeo' : 'Ver a foto';
    // `desenho`, e não `icone`: o nome da função global não pode ser
    // sombreado aqui — o ramo do documento, logo abaixo, chama icone().
    const desenho = m.tipo === 'video' ? icone('video', 24) : icone('imagem', 24);
    const peso = pesoLegivel(m.midia_bytes);
    return `<button class="cv-midia-espera" data-midia-espera="${htm(c)}"
      data-tipo="${m.tipo}" onclick="verMidiaDaBolha(this)">
      <span class="cam">${desenho}</span>
      <span class="ver">${rotulo}</span>
      ${peso ? `<span class="peso">${htm(peso)}</span>` : ''}
    </button>${legenda}`;
  }

  // documento: o texto já é o nome do arquivo — vira o título do cartão
  const nome = m.texto || String(c).split('/').pop();
  return `<a class="cv-midia-doc" target="_blank" rel="noopener"
    title="Abrir o documento" data-midia="${htm(c)}">
    <span class="ico">${icone('documento', 18)}</span>
    <span><span class="nome">${htm(nome)}</span><br>
      <span class="peso">${htm(pesoLegivel(m.midia_bytes))}</span></span>
    <span class="baixar">${icone('baixar', 15)}</span></a>`;
}

// ============================================================
// v1.454 — A REAÇÃO (o 👍 grudado numa mensagem)
//
// Reação NÃO É BOLHA. No WhatsApp ela é uma marca na mensagem reagida,
// e é lá que o olho a procura. No banco cada reação é uma linha de
// `mensagens_conversa` com tipo 'reacao', o emoji em `texto` e o wa_id
// da mensagem reagida em `reage_a` (v1.454-sql).
//
// Tirar a reação: o WhatsApp manda a MESMA mensagem com o emoji vazio.
// Por isso vale a ÚLTIMA de cada lado — e uma última vazia apaga a
// pastilha. Nada é excluído; o fio guarda o que aconteceu.
//
// Estas duas funções moram aqui porque o fio é desenhado em três
// lugares (tela Conversas, cartão da ficha e caixa fixa) — a mesma
// razão do midiaBolhaHtml logo acima.
// ============================================================

/** as linhas de mensagens_conversa → { wa_id reagido: 'emojis' } */
function cvReacoesDoFio(linhas) {
  const ultima = {};                 // alvo → { nos|eles: {emoji, quando} }
  (linhas || []).forEach(m => {
    if (!m || m.tipo !== 'reacao' || !m.reage_a) return;
    const lado = m.de_mim ? 'nos' : 'eles';
    const alvo = (ultima[m.reage_a] = ultima[m.reage_a] || {});
    const quando = m.recebida_em || '';
    // a ordem da consulta varia (a caixa fixa lê de trás para a frente):
    // decidir pela data é o que não depende de quem chamou
    if (!alvo[lado] || quando >= alvo[lado].quando)
      alvo[lado] = { emoji: String(m.texto || '').trim(), quando };
  });
  const mapa = {};
  Object.keys(ultima).forEach(alvo => {
    const emojis = Object.keys(ultima[alvo])
      .map(lado => ultima[alvo][lado].emoji).filter(Boolean);
    if (emojis.length) mapa[alvo] = emojis.join(' ');
  });
  return mapa;
}

/** a pastilha da reação, para colar na bolha reagida ('' se não houver) */
function cvReacaoHtml(emojis) {
  return emojis ? `<span class="cv-reacao">${htm(emojis)}</span>` : '';
}

/**
 * v1.455 — A REAÇÃO SEM ONDE COLAR.
 *
 * Reagir vale para QUALQUER mensagem da conversa no WhatsApp, inclusive
 * as de antes de o CRM existir — e essas não têm bolha aqui. A v1.454
 * escondia a reação nesse caso (ela pulava toda reação com alvo, e a
 * pastilha nunca achava a bolha): sumia sem deixar rastro. Agora ela
 * vira esta linha do meio, discreta, dizendo o que aconteceu.
 */
function cvReacaoLinhaHtml(emoji, nosso) {
  return `<div class="cv-reacao-linha"><span><b>${htm(emoji)}</b> ${
    nosso ? 'você reagiu' : 'reagiu'} a uma mensagem que não está aqui</span></div>`;
}

/** bytes → "1,8 MB" / "230 KB" ('' quando o tamanho não veio) */
function pesoLegivel(bytes) {
  if (!bytes) return '';
  return bytes >= 1048576
    ? (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB'
    : Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

/** v1.370 — o clique no convite: assina o link e põe a mídia no lugar */
async function verMidiaDaBolha(botao) {
  const c = botao.getAttribute('data-midia-espera');
  if (!c || botao.classList.contains('baixando')) return;
  botao.classList.add('baixando');
  const ver = botao.querySelector('.ver');
  if (ver) ver.textContent = 'Baixando…';
  try {
    const { data, error } = await sb.storage.from('conversa-midia')
      .createSignedUrl(c, 3600);
    if (error || !data || !data.signedUrl) throw (error || new Error('sem link'));
    let el;
    if (botao.getAttribute('data-tipo') === 'video') {
      el = document.createElement('span');
      el.className = 'cv-midia-video';
      const v = document.createElement('video');
      v.controls = true; v.src = data.signedUrl;
      el.appendChild(v);
    } else {
      el = document.createElement('a');
      el.className = 'cv-midia-foto'; el.target = '_blank'; el.rel = 'noopener';
      el.title = 'Abrir a foto inteira'; el.href = data.signedUrl;
      const img = document.createElement('img');
      img.alt = 'foto recebida'; img.src = data.signedUrl;
      el.appendChild(img);
    }
    botao.replaceWith(el);
  } catch (e) {
    botao.classList.remove('baixando');
    if (ver) ver.textContent = 'Não deu — tentar de novo';
    console.warn('mídia:', (e && e.message) || e);
  }
}

/** assina os links de todas as mídias dentro de `raiz`, num lote só */
async function assinarMidias(raiz) {
  try {
    if (!raiz || typeof sb === 'undefined') return;
    const els = Array.prototype.slice.call(raiz.querySelectorAll('[data-midia]'));
    if (!els.length) return;
    const caminhos = [...new Set(els.map(e => e.getAttribute('data-midia')))];
    const { data, error } = await sb.storage.from('conversa-midia')
      .createSignedUrls(caminhos, 3600);
    if (error || !data) { console.warn('mídia:', error && error.message); return; }
    const mapa = {};
    data.forEach(d => { if (d.signedUrl) mapa[d.path] = d.signedUrl; });
    els.forEach(el => {
      const u = mapa[el.getAttribute('data-midia')];
      if (!u) return;
      if (el.tagName === 'A') el.href = u;
      else el.src = u;                       // audio, img e video
    });
  } catch (e) { console.warn('mídia:', e); }
}

/**
 * Texto brasileiro → número. Aceita tudo que uma pessoa escreve.
 *
 * O caso difícil é "1.800" sem vírgula: pode ser mil e oitocentos (o
 * jeito brasileiro) ou um vírgula oito (o jeito da máquina). Decide pelo
 * tamanho do último grupo — três dígitos depois do ponto é separador de
 * milhar, que é como o Brasil escreve. É a leitura certa aqui.
 */
function numeroBr(txt) {
  let s = String(txt == null ? '' : txt).trim().replace(/[^\d,.-]/g, '');
  if (!s) return null;
  const temVirgula = s.indexOf(',') > -1;
  const temPonto = s.indexOf('.') > -1;

  if (temVirgula && temPonto) s = s.replace(/\./g, '').replace(',', '.');  // 1.800,00
  else if (temVirgula) s = s.replace(',', '.');                            // 1800,00
  else if (temPonto) {
    const partes = s.split('.');
    const ultima = partes[partes.length - 1];
    if (partes.length > 2 || ultima.length === 3) s = partes.join('');      // 1.800 · 1.234.567
  }
  const n = Number(s);
  return isNaN(n) ? null : n;
}

/**
 * v1.207 — TEXTO SEM ACENTO E EM MINÚSCULAS.
 *
 * Base de toda busca do CRM. "São" e "sao" viram a mesma coisa; o
 * NFD separa a letra do acento e o intervalo \u0300-\u036f varre os
 * acentos combinantes que sobram.
 */
function semAcento(t) {
  return String(t == null ? '' : t)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * O TERMO DIGITADO VIRANDO UM PADRÃO QUE IGNORA ACENTO.
 *
 * O filtro roda no BANCO, então tirar o acento do que a pessoa digitou
 * não basta: "sao" continuaria não achando "São". A saída é o caminho
 * inverso — cada letra vira uma classe com todas as formas acentuadas
 * dela, e o operador `imatch` (regex, sem diferenciar maiúscula) faz o
 * resto. "sao paulo" vira "s[aáàâãä].p[aáàâãä]ul[oóòôõö]".
 *
 * Tudo que não é letra nem número vira PONTO (qualquer caractere): é o
 * que faz "con 0002" achar "CON-0002" e evita que vírgula ou parêntese
 * quebrem o `or=(...)` do PostgREST.
 *
 * Devolve '' quando não sobra nada — aí quem chama não filtra.
 */
const ACENTOS_DE = { a: 'aáàâãä', e: 'eéèêë', i: 'iíìîï',
                     o: 'oóòôõö', u: 'uúùûü', c: 'cç', n: 'nñ' };

function padraoBusca(t) {
  const base = semAcento(t).trim();
  if (!base) return '';
  return base.split('').map(ch =>
    ACENTOS_DE[ch] ? '[' + ACENTOS_DE[ch] + ']'
                   : (/[a-z0-9]/.test(ch) ? ch : '.')).join('');
}

/**
 * v1.305 — "171 dias" vira "5 meses e 21 dias".
 *
 * Pedido do Rodrigo em 18/08/2026, olhando "Próximo reajuste 05/02/2027
 * (171d)": ninguém lê 171 e enxerga fevereiro. Mês é a unidade em que se
 * pensa contrato, seguro e prazo de vistoria.
 *
 * SÓ PARA CONTAGEM LONGA. Abaixo de 60 dias devolve null, e quem chama
 * mantém o texto em dias — porque "0 meses e 3 dias" é pior que
 * "3 dias", e prazo curto é justamente onde o dia importa.
 *
 * O MÊS AQUI TEM 30 DIAS, e é de propósito: o que chega nesta função é
 * um NÚMERO de dias, não duas datas — o calendário já ficou para trás.
 * Com 30 a conta fecha na calculadora de quem confere (5 × 30 + 21 =
 * 171); com mês de calendário daria um resultado que ninguém reproduz.
 * Onde a precisão importa, o CRM mostra a data ao lado, não a diferença.
 *
 * @param curto  true = "5m 21d", para coluna estreita de lista
 */
function prazoEmMeses(dias, curto) {
  const n = Math.abs(Math.round(Number(dias)));
  if (!Number.isFinite(n) || n <= 60) return null;
  const m = Math.floor(n / 30);
  const d = n - m * 30;
  if (curto) return d ? `${m}m ${d}d` : `${m}m`;
  const txtM = m === 1 ? '1 mês' : `${m} meses`;
  return d ? `${txtM} e ${d} ${d === 1 ? 'dia' : 'dias'}` : txtM;
}

function dataBr(v) {
  if (!v) return '—';
  const [a, m, d] = String(v).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** v1.183 — o nome que o banco carimba em competencias.baixa_origem
 *  quando quem deu a baixa foi o webhook do Asaas, e não uma pessoa.
 *  Está aqui, e não solto no meio do código, porque a tela e o
 *  histórico precisam reconhecer exatamente a mesma palavra. */
const ASAAS_ORIGEM = 'Integração Asaas';

/** Data e hora de um timestamp do banco: "07/08/2026 às 03:20".
 *  Devolve '' no vazio — quem chama decide o que dizer no lugar. */
function dataHoraBr(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  return dataBr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${
    String(d.getDate()).padStart(2, '0')}`)
    + ` às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Gera o próximo código (CT-xxxx / IM-xxxx) chamando a função do banco. */
async function proximoCodigo(prefixo, tabela) {
  const { data, error } = await sb.rpc('proximo_codigo', { prefixo, tabela });
  if (error) throw error;
  return data;
}

/** Preenche o rodapé institucional em todas as páginas.
 *  Rodapé leva Razão Social e CNPJ — nada mais.
 *  O "Desde + ano" saiu em 26/07/2026 (o dado continua em empresas.desde
 *  e na tela de Administração).
 *  O NOME FANTASIA saiu em 28/07/2026: na própria casa ele repetia a
 *  marca que já aparece na assinatura logo abaixo. Quem identifica a
 *  empresa num rodapé é a razão social com o CNPJ. */
/*  v1.275 — E QUANDO NÃO HÁ EMPRESA NENHUMA PARA MOSTRAR.
 *  Este rodapé roda ANTES de existir empresa logada: nas telas de
 *  entrar, cadastrar e nova senha ele é o rodapé definitivo, e nas
 *  demais dura o instante até o identificar() reescrevê-lo com os dados
 *  reais. Como o config.js deixou de trazer razão social e CNPJ de
 *  fábrica (era o da Moralí aparecendo no login de quem comprasse o
 *  CRM), aqui a linha da empresa some quando não há o que dizer — em
 *  vez de imprimir " · CNPJ " sozinho. A assinatura e a versão ficam. */
document.addEventListener('DOMContentLoaded', () => {
  const f = document.querySelector('footer');
  if (f) {
    const partes = [];
    if (EMPRESA.razaoSocial) partes.push(EMPRESA.razaoSocial);
    if (EMPRESA.cnpj) partes.push('CNPJ ' + EMPRESA.cnpj);
    f.innerHTML =
      (partes.length ? `<div class="rodape-empresa">${htm(partes.join(' · '))}</div>` : '') +
      assinaturaHTML(null) + versaoHTML();
  }
  faixaBeta();
});

/** Barra de ações também no TOPO das janelas de edição (v1.101).
 *  Vale para toda tela que usa o modal padrão (.modal-fundo), sem tocar
 *  em nenhum HTML: quando o modal abre, a barra de baixo é espelhada
 *  logo abaixo do título. Os clones não têm id e apenas REPASSAM o
 *  clique para o botão original — se o original estiver desabilitado
 *  (salvando), o repasse é ignorado pelo navegador, então não existe
 *  clique duplo por cima de um salvamento em andamento. */
document.addEventListener('DOMContentLoaded', () => {
  function espelharAcoes(fundo) {
    const m = fundo.querySelector('.modal');
    if (!m || m.querySelector('.acoes-topo')) return;
    const rodape = m.querySelector('.acoes');
    if (!rodape) return;
    const topo = document.createElement('div');
    topo.className = 'acoes acoes-topo';
    rodape.querySelectorAll('button').forEach(orig => {
      const c = orig.cloneNode(true);
      c.removeAttribute('id');
      c.removeAttribute('onclick');
      c.addEventListener('click', () => orig.click());
      topo.appendChild(c);
    });
    const titulo = m.querySelector('h2');
    if (titulo) titulo.insertAdjacentElement('afterend', topo);
    else m.prepend(topo);
  }
  document.querySelectorAll('.modal-fundo').forEach(fundo => {
    new MutationObserver(() => {
      if (fundo.classList.contains('aberto')) espelharAcoes(fundo);
    }).observe(fundo, { attributes: true, attributeFilter: ['class'] });
    if (fundo.classList.contains('aberto')) espelharAcoes(fundo);
  });
});

/** "versão 1.0" no rodapé — o número vem do config.js e o robô de
 *  publicação acrescenta "-beta" no ambiente de teste. O typeof protege
 *  contra um config.js velho em cache, que ainda não tenha a constante. */
function versaoHTML() {
  if (typeof CRM_VERSAO === 'undefined') return '';
  return `<div class="rodape-versao">versão ${htm(CRM_VERSAO)}</div>`;
}

/** Faixa "AMBIENTE BETA" no topo. Liga sozinha quando a versão termina
 *  em -beta — ou seja, só nas cópias que o robô publicou em crm-beta/.
 *  O CRM-beta usa o MESMO banco da produção: a faixa existe para ninguém
 *  esquecer que o que se grava ali é dado de verdade. */
function faixaBeta() {
  if (typeof CRM_VERSAO === 'undefined' || !String(CRM_VERSAO).endsWith('-beta')) return;
  if (document.getElementById('faixa-beta')) return;
  const el = document.createElement('div');
  el.id = 'faixa-beta';
  el.className = 'faixa-beta';
  el.textContent = 'AMBIENTE BETA — os dados são os reais: o que você gravar aqui, gravou de verdade';
  document.body.prepend(el);
  document.title = '[BETA] ' + document.title;
}

/**
 * "Desenvolvido com ♥ pela Moralí" — a assinatura de quem fez o sistema.
 *
 * Fica em base.js e não em permissoes.js porque as duas escrevem o
 * rodapé: base.js antes do login (é o que a tela de login mostra) e
 * permissoes.js depois, com os dados do banco. Uma função só evita a
 * frase existir em duas versões que divergem.
 *
 * @param {object|null} empresa  empresa em foco, quando já conhecida
 */
function assinaturaHTML(empresa) {
  if (typeof ASSINATURA === 'undefined' || !ASSINATURA.mostrar) return '';

  // Só na própria casa: comparo por CNPJ, não por nome. Nome de fantasia
  // se repete e é editável na tela de Administração; CNPJ não.
  if (ASSINATURA.so_na_propria_casa) {
    const daEmpresa = String((empresa && empresa.cnpj) || '').replace(/\D/g, '');
    const daCasa    = String(ASSINATURA.cnpj_da_desenvolvedora || '').replace(/\D/g, '');
    // Antes do login não há empresa: nesse caso mostro, porque a tela de
    // login é a da própria plataforma.
    if (empresa && daEmpresa !== daCasa) return '';
  }

  // O logotipo antes vinha com 15px de altura e em cinza-claro: ficava
  // MAIOR que o texto e ao mesmo tempo apagado, então a linha lia como
  // "frase + figura" em vez de uma frase só. Agora o símbolo é pequeno, na
  // altura da letra, e o nome vem em texto navy.
  const modo = ASSINATURA.marca || 'ambos';
  const simbolo = (modo !== 'texto' && ASSINATURA.logo)
    ? `<img src="${htm(ASSINATURA.logo)}" alt="" class="rodape-marca" loading="lazy">` : '';
  const nome = (modo !== 'imagem')
    ? `<span class="rodape-nome">${htm(ASSINATURA.nome)}</span>` : '';
  const marca = `<span class="rodape-marca-caixa">${simbolo}${nome}</span>`;

  const dentro = `${htm(ASSINATURA.texto_antes)} ` +
    `<span class="rodape-coracao" aria-label="amor" role="img">♥</span> ` +
    `${htm(ASSINATURA.texto_depois)} ${marca}`;

  return `<div class="rodape-assinatura">` +
    (ASSINATURA.url
      ? `<a href="${htm(ASSINATURA.url)}" target="_blank" rel="noopener">${dentro}</a>`
      : dentro) +
    `</div>`;
}

// ============================================================
// HISTÓRICO DE ALTERAÇÕES (v1.126) — o que as duas telas dividem
//
// A ficha e a aba da Administração mostram a MESMA lista, com dados
// diferentes. Antes de escrever isto duas vezes, vale lembrar por que
// não: duas cópias da mesma lista viram duas listas diferentes no
// primeiro ajuste, e o segundo lugar é sempre o que alguém esquece.
//
// O formato guardado no banco tem DUAS gerações:
//   • até 30/07/2026 — a linha INTEIRA em `dados_antes`/`dados_depois`
//   • da v1.126 em diante — só os campos que mudaram
// A diferença é calculada aqui, na leitura, e as duas gerações saem
// iguais na tela. É por isso que as 476 linhas que já existiam
// aparecem com detalhe completo desde o primeiro dia.
// ============================================================
const HIST_TABELA = { leads: 'leads', contatos: 'contatos', imoveis: 'imoveis',
  contratos: 'contratos', sinistros: 'contrato_sinistros', casos: 'casos',
  // v1.182: a parcela de aluguel ganhou histórico (gatilho da migração)
  competencias: 'competencias',
  // v1.241: plano de ação e as ações 5W2H
  planos: 'planos_acao', acoes: 'plano_acoes',
  // v1.284: a ficha recebida — o histórico dela é a prova de quem
  // aprovou o quê, e é o que se leva para uma auditoria de LGPD
  fichas: 'fichas' };

const HIST_ONDE = {
  leads: ['Lead', 'lead.html'], contatos: ['Contato', 'contato.html'],
  imoveis: ['Imóvel', 'imovel.html'], contratos: ['Contrato', 'contrato.html'],
  contrato_sinistros: ['Sinistro', 'sinistro.html'], casos: ['Caso', 'caso.html'],
  competencias: ['Aluguel', 'competencia.html'],
  // v1.241 — o histórico central precisa saber para onde levar o clique
  planos_acao: ['Plano de ação', 'plano.html'], plano_acoes: ['Ação 5W2H', 'acao.html'],
  // v1.184 — o repasse não tem ficha própria (vive na janela de
  // Aluguéis), então entra sem link: o nome do registro já é o código.
  repasses: ['Repasse', ''],
  // v1.284 — a ficha pública tem tela própria
  fichas: ['Ficha recebida', 'ficha.html'],
  campos_personalizados: ['Campo personalizado', ''], layouts_ficha: ['Layout de ficha', ''],
  // v1.312 — a varredura de 19/08/2026 achou seis tabelas que já
  // gravavam histórico e apareciam na tela com o nome cru do banco
  // ("doc_clausulas", "plano_contas"). Rótulo é barato; nome de tabela
  // na cara do usuário não.
  // v1.402 — as tabelas novas passaram a gravar histórico (o gatilho
  // auditar_registro entrou nelas em 26/08). Vão SEM link, como o
  // repasse: Postagens abre em janela e a Conversa é um fio — nenhuma
  // das duas tem endereço por registro para onde levar o clique.
  postagens: ['Postagem', ''], postagem_regua: ['Régua de postagens', ''],
  conversas: ['Conversa de WhatsApp', ''],
  competencia_itens: ['Item da parcela', ''], contrato_itens: ['Item do contrato', ''],
  contas_bancarias: ['Conta bancária', ''], plano_contas: ['Plano de contas', ''],
  doc_modelos: ['Modelo de documento', ''], doc_clausulas: ['Cláusula de contrato', '']
};

/** v1.312 — o que foi feito, por extenso. A coluna `acao` guarda
 *  INSERT/UPDATE/DELETE desde a v1.126, e a tela nunca dizia: quem lia
 *  deduzia pelo corpo da linha ("Registro criado"). Agora é um selo, na
 *  mesma posição em toda linha. */
const HIST_ACAO = { INSERT: ['incluiu', 'incluiu'], UPDATE: ['alterou', 'alterou'],
                    DELETE: ['excluiu', 'excluiu'] };

/**
 * v1.312 — QUEM ESTAVA LOGADO, pelo id, quando o nome não foi gravado.
 *
 * O nome de quem alterou tem três caminhos, nesta ordem:
 *   1. `usuario_nome` na própria linha — o gatilho grava desde a v1.312
 *      (e o acerto `historico-5` preencheu as linhas antigas);
 *   2. este mapa, preenchido por quem já tem a lista de usuários
 *      carregada (a aba da Administração) — custo zero;
 *   3. o rótulo genérico, que só sobra se o perfil não existe mais.
 *
 * Nunca "Sistema": alteração com usuário logado não é do robô.
 */
const HIST_NOMES = {};

/** v1.184 — rótulos de tabelas que não têm entrada no CATALOGO das
 *  listas. Sem isto o histórico do repasse falaria em "whats por" e
 *  "asaas erro"; o resto continua saindo do catálogo, como sempre. */
const HIST_ROTULOS = {
  repasses: {
    status: 'Situação', forma: 'Forma de pagamento', referencia: 'Referência',
    valor_liquido: 'Valor líquido', observacao: 'Observação',
    criado_por_nome: 'Criado por', enviado_por: 'Enviado ao Asaas por',
    enviado_em: 'Enviado ao Asaas em', asaas_id: 'ID no Asaas',
    asaas_em: 'Asaas confirmou em', asaas_erro: 'Erro do Asaas',
    whats_por: 'WhatsApp disparado por', whats_em: 'WhatsApp disparado em',
    whats_erro: 'Erro do WhatsApp', recibo_enviado_em: 'Recibo enviado em',
    recibo_visto_em: 'Recibo aberto em', recibo_vistas: 'Vezes que o recibo foi aberto',
    cancelado_por: 'Desfeito por', cancelado_em: 'Desfeito em',
    juros_repassados: 'Repassou os juros'
  }
};

// O catálogo é indexado pelo nome do OBJETO, que nem sempre é o nome da
// tabela (sinistro mora em `contrato_sinistros`).
const HIST_CATALOGO = { contrato_sinistros: 'sinistros',
  // v1.241 — as duas tabelas do 5W2H também têm nome de tabela diferente
  // do nome do objeto; sem isto o histórico falaria em "o que" e "por que"
  planos_acao: 'planos', plano_acoes: 'acoes' };

const HIST_SELO = { bot: ['WhatsApp', 'bot'], sistema: ['régua do sistema', 'sis'],
                    banco: ['direto no banco', 'sis'] };

// Nas linhas antigas vem a tabela inteira, inclusive os carimbos
// técnicos. Filtrar aqui é o que impede "atualizado em" de aparecer
// como alteração em toda linha de 24 a 30 de julho.
const HIST_IGNORAR = ['id', 'empresa_id', 'atualizado_em', 'atualizado_por',
  'criado_em', 'criado_por', 'sincronizado_em', 'status_desde', 'etapa_anterior',
  'busca_em', 'busca_resultado', 'origem_planilha', 'origem_planilha_linha',
  'aviso_enviado_em', 'simulacao_enviada_em', 'conversa_id', 'resumo_agente'];

const HIST_SIGILOSO = ['cpf', 'cnpj', 'chave_pix', 'senha', 'token', 'documento'];

/** As linhas antigas guardam a tabela inteira — CPF e chave PIX
 *  inclusive. Mascarar na LEITURA garante que nenhuma tela mostre o
 *  documento, mesmo no que já está gravado. */
function histMascarar(campo, v) {
  const c = String(campo || '').toLowerCase();
  if (!HIST_SIGILOSO.some(s => c.indexOf(s) > -1)) return v;
  const s = String(v == null ? '' : v);
  if (!s) return s;
  return s.length <= 4 ? '••••' : '•••' + s.slice(-4);
}

/**
 * O nome do registro. As 476 linhas antigas não têm `registro_rotulo`
 * — a coluna nasceu agora —, mas guardam a LINHA INTEIRA no jsonb, e o
 * nome está lá dentro. Recuperar dali é melhor que exibir "(sem nome)"
 * em metade do histórico.
 */
function histRotuloRegistro(h) {
  if (h.registro_rotulo) return h.registro_rotulo;
  const d = h.dados_depois || h.dados_antes || {};
  return d.nome || d.endereco || d.imovel_endereco || d.titulo ||
         d.rotulo || d.codigo || '(sem nome)';
}

/** Os campos que realmente mudaram entre os dois retratos. */
function histDiferenca(antes, depois) {
  const a = antes || {}, d = depois || {};
  const chaves = Object.keys(a).concat(Object.keys(d))
    .filter((k, i, t) => t.indexOf(k) === i && HIST_IGNORAR.indexOf(k) < 0);
  return chaves
    .map(k => ({ campo: k, antes: a[k], depois: d[k] }))
    .filter(x => JSON.stringify(x.antes == null ? null : x.antes)
              !== JSON.stringify(x.depois == null ? null : x.depois));
}

/** O rótulo e o tipo do campo saem do CATÁLOGO — renomear um campo em
 *  Administração conserta o histórico junto, sem publicação. */
function histCampo(tabela, campo) {
  const proprio = (HIST_ROTULOS[tabela] || {})[campo];
  if (proprio) {
    // sem catálogo não há tipo declarado: o sufixo do campo é o que
    // sobra para uma data não sair como "2026-08-07T09:06:11.284Z"
    const c = String(campo || '');
    return { rotulo: proprio,
             tipo: /_em$/.test(c) ? 'datahora' : /^valor/.test(c) ? 'moeda' : undefined };
  }
  const obj = HIST_CATALOGO[tabela] || tabela;
  const cat = (typeof CATALOGO !== 'undefined') && CATALOGO[obj];
  const c = cat && (cat.campos || []).find(x => x.c === campo);
  return { rotulo: (c && c.r) || String(campo || '').replace(/_/g, ' '), tipo: c && c.t };
}

/** O banco guarda texto cru; quem sabe que aquilo é dinheiro é o catálogo. */
function histValor(v, tipo) {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v).slice(0, 80);
  const s = String(v);
  if (tipo === 'moeda' && typeof moeda === 'function' && !isNaN(Number(s))) return moeda(s);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return dataBr(s);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return dataBr(s.slice(0, 10));
  if (s === 'true') return 'Sim';
  if (s === 'false') return 'Não';
  return s;
}

/**
 * v1.312 — O DIA DE QUEM ESTÁ OLHANDO, NÃO O DE GREENWICH.
 *
 * `em` chega em UTC. Cortar os 10 primeiros caracteres da string dava
 * a data em UTC, enquanto a HORA ao lado saía do relógio local — então
 * toda alteração feita depois das 21h (00h em UTC) era agrupada no dia
 * seguinte, com a hora certa embaixo do cabeçalho errado. Passou três
 * semanas assim porque só aparece à noite.
 */
function diaLocalISO(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0');
}

function histDia(iso) {
  const hoje = diaLocalISO(new Date());
  const ontem = diaLocalISO(new Date(Date.now() - 864e5));
  const d = String(iso).slice(0, 10);
  if (d === hoje) return 'Hoje · ' + dataBr(d);
  if (d === ontem) return 'Ontem · ' + dataBr(d);
  return dataBr(d);
}

/**
 * A lista, para os dois lugares.
 * @param {Array}  linhas    o que veio da tabela `historico`
 * @param {boolean} comOnde  mostrar de que registro se trata (tela central)
 */
function histLista(linhas, comOnde) {
  if (!linhas || !linhas.length) {
    return `<p class="hist-vazio">Nada por aqui — ou o período é anterior ao
              início do histórico, em 24/07/2026.</p>`;
  }
  let dia = '';
  return linhas.map(h => {
    const quando = String(h.em || '');
    const dt = new Date(quando);
    // o dia do relógio de quem olha (ver diaLocalISO), não o de UTC
    const oDia = isNaN(dt.getTime()) ? quando.slice(0, 10) : diaLocalISO(dt);
    const cabeca = oDia !== dia ? (dia = oDia, `<div class="hist-dia">${htm(histDia(oDia))}</div>`) : '';
    const hora = String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
    // v1.183: a baixa automática assina com nome próprio e ganha selo
    // próprio. Sem isso ela vinha como "Sistema · direto no banco" —
    // indistinguível de uma alteração feita na mão dentro do banco.
    const selo = h.usuario_nome === ASAAS_ORIGEM
      ? ['baixa automática', 'integra'] : HIST_SELO[h.origem];
    const onde = HIST_ONDE[h.tabela] || [h.tabela, ''];
    const acao = HIST_ACAO[h.acao] || [String(h.acao || '').toLowerCase(), 'alterou'];

    // QUEM FEZ. Se há usuário logado na linha, aquilo NÃO é o sistema —
    // mesmo que o nome não tenha sido gravado (as linhas de aluguel,
    // itens e repasse nasceram sem nome até a v1.312). Chamar de
    // "Sistema" uma alteração que uma pessoa fez é a pior das saídas.
    const quem = h.usuario_nome || HIST_NOMES[h.usuario_id]
      // v1.468 — "Robô do WhatsApp" no lugar de "BotConversa". O DADO
      // não muda (origem='bot' nas 88 linhas antigas): muda o rótulo.
      // O nome do fornecedor cancelado não diz mais nada a ninguém, e
      // agora quem carimba 'bot' é o gatilho que cria lead da conversa.
      || (h.usuario_id ? 'Usuário removido'
                       : (h.origem === 'bot' ? 'Robô do WhatsApp' : 'Sistema'));

    // O EXCLUÍDO NÃO VIRA LINK: a ficha não existe mais. O nome fica, e
    // este é o único lugar do sistema onde ele sobrevive.
    const alvo = !comOnde ? '' : (h.acao === 'DELETE' || !onde[1]
      ? `<span class="hl-alvo">${htm(onde[0])} ${htm(histRotuloRegistro(h))}</span>`
      : `<span class="hl-alvo">${htm(onde[0])}
           <a href="${onde[1]}?id=${encodeURIComponent(h.registro_id)}">${htm(histRotuloRegistro(h))}</a></span>`);

    // O QUE MUDOU, EM UMA LINHA (v1.312).
    // Antes cada campo alterado virava uma linha própria, e um contrato
    // com quatro campos mexidos ocupava a tela inteira. Agora o
    // primeiro campo fica na linha e o resto abre no "+N" — nada se
    // perde, e o dia cabe numa olhada.
    const dif = h.acao === 'UPDATE' ? histDiferenca(h.dados_antes, h.dados_depois) : [];
    let resumo, detalhe = '';
    if (h.acao === 'INSERT') {
      resumo = 'Registro criado';
    } else if (h.acao === 'DELETE') {
      resumo = 'Registro excluído';
    } else if (!dif.length) {
      resumo = '<span class="hl-alvo">Alteração sem campo visível</span>';
    } else {
      resumo = histCampoEmLinha(h.tabela, dif[0]);
      if (dif.length > 1) {
        detalhe = `<div class="hl-det" style="display:none">${
          dif.slice(1).map(x => `<div class="l">${histCampoEmLinha(h.tabela, x)}</div>`).join('')}</div>`;
      }
    }

    // O RASTRO. Robô, pg_cron e SQL Editor não têm cabeçalho de
    // requisição: ali fica o traço, que é a resposta honesta — o selo
    // ao lado do nome já diz que não foi gente.
    const rastro = h.ip
      ? `<span class="hl-rastro" title="${htm(h.agente || '')}"><b>${htm(h.ip)}</b>${
          h.pais ? ' · ' + htm(h.pais) : ''}</span>`
      : '<span class="hl-rastro">—</span>';

    return cabeca + `
      <div class="hl">
        <span class="hl-h">${hora}</span>
        <span class="hl-acao ${acao[1]}">${htm(acao[0])}</span>
        <span class="hl-quem">${htm(quem)}</span>
        ${selo ? `<span class="hist-selo ${selo[1]}">${htm(selo[0])}</span>` : ''}
        ${alvo}
        <span class="hl-oque">${resumo}</span>
        ${dif.length > 1
          ? `<span class="hl-mais" onclick="histAbrirDetalhe(this)">+${dif.length - 1}</span>` : ''}
        ${rastro}
      </div>${detalhe}`;
  }).join('');
}

/** Um campo alterado, escrito na horizontal: RÓTULO antes → depois. */
function histCampoEmLinha(tabela, x) {
  const c = histCampo(tabela, x.campo);
  return `<span class="c">${htm(c.rotulo)}</span>`
       + `<span class="a">${htm(histValor(histMascarar(x.campo, x.antes), c.tipo))}</span>`
       + `<span class="s">→</span>`
       + `<span class="d">${htm(histValor(histMascarar(x.campo, x.depois), c.tipo))}</span>`;
}

/**
 * Abre e fecha o resto dos campos daquela alteração.
 *
 * Declarada como `function` e navegando pelo próprio elemento clicado:
 * a conferência estrutural cobra todo `getElementById('literal')` como
 * id existente em alguma tela, e aqui não há id nenhum para cobrar —
 * a lista é montada em memória, N linhas de uma vez.
 */
function histAbrirDetalhe(el) {
  const linha = el && el.closest ? el.closest('.hl') : null;
  const det = linha && linha.nextElementSibling;
  if (!det || !det.classList.contains('hl-det')) return;
  const abrindo = det.style.display === 'none';
  det.style.display = abrindo ? '' : 'none';
  el.textContent = abrindo ? '−' : '+' + det.children.length;
}

// ============================================================
// ATALHOS DE TECLADO (v1.132)
//
// Um registro central, e não um `keydown` solto em cada tela. Duas
// razões: a guarda contra disparar enquanto se digita precisa ser
// idêntica em todo lugar — errar isso uma vez faz a letra sumir do meio
// de uma observação —, e a janela "Atalhos de teclado" da ajuda precisa
// de alguém para perguntar quais atalhos existem NESTA tela.
// ============================================================
const ATALHOS = [];

/**
 * @param {string} tecla    a letra, em minúscula ('e')
 * @param {string} descricao  o que aparece na janela de ajuda
 * @param {function} acao
 * @param {function} [quando]  só vale se devolver true (ex.: o botão existe)
 */
function registrarAtalho(tecla, descricao, acao, quando) {
  ATALHOS.push({ tecla: String(tecla).toLowerCase(), descricao, acao, quando });
}

/**
 * O QUE IMPEDE O ATALHO DE ATRAPALHAR.
 *
 * Sem esta guarda, escrever "empresa" numa observação abriria a janela
 * de edição no primeiro "e" — e o atalho, que existe para poupar
 * cliques, viraria a coisa mais irritante do sistema.
 */
function digitandoAgora(alvo) {
  if (!alvo) return false;
  if (alvo.isContentEditable) return true;
  const tag = (alvo.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** Janela aberta manda: o atalho de fora não pode agir por cima dela. */
function temJanelaAberta() {
  return !!document.querySelector('.modal-fundo.aberto');
}

document.addEventListener('keydown', function (e) {
  // Cmd+E, Ctrl+E e Alt+E são do navegador ou do sistema. Roubar uma
  // combinação dessas é pior do que não ter atalho nenhum.
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (digitandoAgora(e.target) || temJanelaAberta()) return;

  const a = ATALHOS.find(x => x.tecla === String(e.key).toLowerCase());
  if (!a) return;
  if (typeof a.quando === 'function' && !a.quando()) return;
  e.preventDefault();
  try { a.acao(); } catch (err) { console.warn('[atalho] ' + a.tecla + ':', err); }
});

/** Os atalhos válidos AQUI, para a janela de ajuda. */
function atalhosDaTela() {
  return ATALHOS.filter(a => typeof a.quando !== 'function' || a.quando());
}

// ============================================================
// A GUARDA DA JANELA MEXIDA (v1.149)
//
// ESC e clique fora fechavam a janela de edição na hora, jogando fora o
// que a pessoa tinha acabado de digitar. São gestos ACIDENTAIS — a mão
// escapa no teclado, o clique erra a janela — e por isso merecem uma
// pergunta; o botão Cancelar não, porque ali a intenção é explícita.
//
// A guarda vive AQUI e não nas telas de propósito: sete telas tratam
// Escape por conta própria (casos, ficha, leads, admin, tarefas, lista,
// busca) e o clique fora fecha em mais quatro pontos. Repetir a mesma
// pergunta em onze lugares seria onze oportunidades de esquecer uma.
//
// Como ela sabe que houve mudança: escutando `input` e `change` dentro
// da janela. Preencher campo por código (el.value = x) NÃO dispara
// esses eventos — então abrir uma ficha e fechar sem tocar em nada
// continua saindo direto, sem incomodar.
//
// O truque do fim: quando a pessoa confirma que quer sair, a guarda
// apaga a marca e REEMITE o mesmo Escape. Assim quem fecha a janela
// continua sendo o código da tela, com a limpeza que cada uma faz —
// a guarda só decide SE o gesto passa, nunca o que ele faz.
// ============================================================

/** A janela de edição visível agora (a última aberta, se houver várias). */
function janelaAbertaAgora() {
  const abertas = [...document.querySelectorAll('.modal-fundo.aberto')];
  return abertas.length ? abertas[abertas.length - 1] : null;
}

/** Alguém digitou nesta janela desde que ela abriu? */
function janelaFoiMexida(j) {
  return !!(j && j.dataset && j.dataset.mexida === '1');
}

['input', 'change'].forEach(evento => {
  document.addEventListener(evento, e => {
    const alvo = e.target;
    if (!alvo || !alvo.closest) return;
    const j = alvo.closest('.modal-fundo');
    if (j) j.dataset.mexida = '1';
  }, true);
});

// Abrir zera a marca; fechar também. Sem isto, uma janela reaberta
// herdaria o "mexida" da vez anterior e perguntaria por nada.
new MutationObserver(mudancas => {
  mudancas.forEach(m => {
    const el = m.target;
    if (!el.classList || !el.classList.contains('modal-fundo')) return;
    delete el.dataset.mexida;
  });
}).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

const AVISO_SAIR = 'Você alterou dados nesta janela e ainda não salvou.\n\n'
  + 'Sair mesmo assim? O que foi digitado será perdido.\n\n'
  + 'Para guardar, cancele aqui e clique em Salvar.';

// ESC — em CAPTURA, para decidir antes dos tratadores das telas.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const j = janelaAbertaAgora();
  if (!janelaFoiMexida(j)) return;          // nada mexido: sai como sempre
  e.stopImmediatePropagation();
  e.preventDefault();
  if (!confirm(AVISO_SAIR)) return;         // fica na janela
  delete j.dataset.mexida;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}, true);

// Clique no FUNDO da janela (não dentro dela) — mesmo gesto acidental.
document.addEventListener('click', e => {
  const j = e.target;
  if (!j || !j.classList || !j.classList.contains('modal-fundo')) return;
  if (!janelaFoiMexida(j)) return;
  e.stopImmediatePropagation();
  e.preventDefault();
  if (!confirm(AVISO_SAIR)) return;
  delete j.dataset.mexida;
  j.classList.remove('aberto');
}, true);


// ============================================================
// v1.170 — CAMPO DE BUSCA DE REGISTRO (lookup, como no Salesforce)
//
// O select que listava a BASE INTEIRA de contatos/imóveis não
// escala: com mil registros vira uma rolagem cega. Aqui o campo é um
// texto com a lupa: digitou, filtrou, escolheu. O escolhido fica em
// input.dataset.valor (id — ou o nome, nos campos que gravam nome);
// texto digitado sem escolher NÃO vale — no blur, o campo volta ao
// que estava. Vazio limpa.
//
// Funções DECLARADAS (não const-arrow): a conferência estrutural
// rastreia atalhos de getElementById — aqui tudo é relativo ao input.
// ============================================================
function ligarLookup(input, fonte, opcoes) {
  if (!input || input.dataset.lookupLigado) return;
  input.dataset.lookupLigado = '1';
  const op = opcoes || {};
  const caixa = input.closest('.lookup');
  const lista = caixa ? caixa.querySelector('.lookup-lista') : null;
  if (!lista) return;
  if (op.valorInicial && op.valorInicial.id != null) {
    input.dataset.valor = op.valorInicial.id;
    input.dataset.rotulo = op.valorInicial.rotulo || '';
    input.value = input.dataset.rotulo;
  }

  function fechar() { lista.classList.remove('aberta'); }

  function escolher(item) {
    input.dataset.valor = item.id;
    input.dataset.rotulo = item.rotulo;
    input.value = item.rotulo;
    fechar();
    if (op.aoEscolher) op.aoEscolher(item);
  }

  function desenhar() {
    // v1.207 — o lookup filtra na memória, então aqui basta tirar o
    // acento dos DOIS lados; o padraoBusca só serve para o que vai ao banco
    const t = semAcento(input.value).trim();
    const todos = (typeof fonte === 'function' ? fonte() : fonte) || [];
    const achados = todos.filter(x =>
      !t || semAcento(x.rotulo).includes(t)
         || semAcento(x.apoio).includes(t)).slice(0, 8);
    lista.innerHTML = achados.length
      ? achados.map((x, i) => `<div class="lookup-item" data-i="${i}">
          ${htm(x.rotulo)}${x.apoio ? `<small>${htm(x.apoio)}</small>` : ''}</div>`).join('')
      : '<div class="lookup-vazio">Nada com esse nome.</div>';
    lista.querySelectorAll('.lookup-item').forEach(el => {
      // mousedown, não click: o blur do input dispara antes do click e
      // fecharia a lista com a escolha ainda no ar
      el.addEventListener('mousedown', ev => {
        ev.preventDefault();
        escolher(achados[Number(el.dataset.i)]);
      });
    });
    lista.classList.add('aberta');
  }

  input.addEventListener('focus', () => { if (!input.disabled) desenhar(); });
  input.addEventListener('input', () => { if (!input.disabled) desenhar(); });
  input.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
  input.addEventListener('blur', () => {
    setTimeout(() => {
      fechar();
      if (String(input.value || '').trim() === '') {
        delete input.dataset.valor; delete input.dataset.rotulo;
        input.value = '';
      } else {
        // digitado sem escolher não vale: volta ao que estava
        input.value = input.dataset.rotulo || '';
        if (!input.dataset.rotulo) delete input.dataset.valor;
      }
    }, 150);
  });
}

/** O valor escolhido num lookup (id ou nome), ou nulo. */
function valorDoLookup(input) {
  return (input && input.dataset.valor) ? input.dataset.valor : null;
}

/** Define (ou limpa, com id nulo) o valor de um lookup por fora. */
function definirLookup(input, id, rotulo) {
  if (!input) return;
  if (id === null || id === undefined || id === '') {
    delete input.dataset.valor; delete input.dataset.rotulo;
    input.value = '';
  } else {
    input.dataset.valor = id;
    input.dataset.rotulo = rotulo || String(id);
    input.value = input.dataset.rotulo;
  }
}

// ============================================================
/**
 * v1.228 — TODO CARTÃO DA FICHA RECOLHE.
 *
 * O recolher nasceu na v1.191 e só valeu para as seções do LAYOUT
 * (Detalhes) — que são as que o motor desenha. Os cartões escritos à
 * mão (Aluguéis, Itens da cobrança, Apólices, O mês, Sinistros,
 * Reajustes, Anexos…) ficaram de fora, e são justamente os que mais
 * crescem: a ficha do contrato passou a ter nove.
 *
 * Em vez de acrescentar o botão em cada um — e lembrar de acrescentar
 * no próximo — esta função varre a ficha DEPOIS de desenhada e põe o
 * recolher em todo `.cartao` que ainda não tem. Cartão novo ganha a
 * funcionalidade sem escrever uma linha, que é o que o Rodrigo pediu
 * em 10/08/2026: "todos os novos objetos criados de agora em diante".
 *
 * Mora no base.js, e não no ficha.js, porque cartão não é exclusividade
 * de ficha: Administração, Seguradoras e Relatórios também têm. Quem
 * quiser é uma linha — `ligarRecolherDosCartoes()` depois de desenhar.
 *
 * Três decisões:
 *
 * · O clique é NA SETA, não no título. Os cabeçalhos passaram a ter
 *   botões dentro ("+ Nova apólice", "+ Acrescentar item") — clicar em
 *   um deles recolheria o cartão junto.
 * · O estado fica no navegador (localStorage), por ficha e por título.
 *   Quem sempre fecha "Reajustes" abre a próxima ficha de contrato com
 *   ele fechado. É preferência de quem olha, não dado da empresa.
 * · Fechar esconde TUDO menos o título, via CSS. Nem todo cartão tem
 *   `.corpo` — o de Apólices põe as linhas direto dentro — e uma regra
 *   que dependesse disso deixaria justamente esse de fora.
 */
function ligarRecolherDosCartoes(dentroDe) {
  const alvo = dentroDe || document.getElementById('conteudo') || document.body;
  if (!alvo) return;
  alvo.querySelectorAll('.cartao').forEach(cartao => {
    const h2 = cartao.querySelector(':scope > h2');
    if (!h2) return;
    /* JÁ TEM DONO? SAI.
     *
     * Duas condições, e a segunda nasceu de um defeito: o cartão
     * "Histórico de alterações" recolhe desde a v1.182, mas com um
     * <span class="dir"> próprio — não com `.seta-card`. A varredura
     * não o reconheceu e pôs uma segunda seta ao lado da dele. O que
     * todo cabeçalho com dono tem em comum não é a classe do span: é o
     * `onclick` no próprio h2.
     *
     * v1.375 — terceiro dono que escapava: a HOME. A alça dela
     * (.hm-cab-toggle) leva o onclick num span DENTRO do h2, não no
     * h2 — e a varredura pendurava uma segunda seta com memória
     * própria (navegador) brigando com a do banco. Foi a seta em
     * duplicidade do print do Rodrigo (24/08/2026). */
    if (h2.querySelector('.seta-card, .hm-cab-toggle') || h2.getAttribute('onclick')) return;

    const titulo = tituloDoCartao(h2);
    if (!titulo) return;
    const chave = 'cartao:' + telaAtual() + ':' + titulo;

    /* v1.233 — BOTÃO DE VERDADE, não um span com role.
     *
     * O span com tabindex casava com `:focus-visible` no Chrome depois
     * de um clique de mouse, e o contorno azul ficava preso na seta até
     * alguém clicar em outro lugar. `<button>` não faz isso, e ainda
     * dispensa o role, o tabindex e o tratamento de Enter/Espaço. */
    const seta = document.createElement('button');
    seta.type = 'button';
    seta.className = 'seta-card';

    const pintar = fechado => {
      cartao.classList.toggle('fechado', fechado);
      /* v1.229 — só a seta, sem a palavra: o cabeçalho fica limpo e a
       * direção já diz tudo. O texto vai para o title e para o leitor
       * de tela, que perderiam a informação junto com a palavra.
       *
       * v1.234 — SEMPRE O MESMO CARACTERE, GIRADO.
       * Antes eram dois: ▾ para expandir e ▴ para recolher. Parecem um
       * o contrário do outro, mas a fonte desenha os dois em tamanhos
       * diferentes — a de cima saía visivelmente menor. Um glifo só,
       * girado por CSS, é idêntico nas duas posições por construção. */
      seta.textContent = '\u25BE';
      seta.style.display = 'inline-block';
      seta.style.transform = fechado ? '' : 'rotate(180deg)';
      seta.title = fechado ? 'Expandir' : 'Recolher';
      seta.setAttribute('aria-label', fechado ? 'Expandir' : 'Recolher');
      seta.setAttribute('aria-expanded', fechado ? 'false' : 'true');
    };
    /* v1.235 — QUEM MANDA NO ESTADO INICIAL.
     *
     * Primeiro a escolha de quem olha (guardada no navegador). Se ela
     * não existe, vale o que o layout disse — `data-nasce="fechado"`,
     * posto pelo ficha.js quando a Administração marcou "começa
     * recolhido". É a mesma regra das seções desde a v1.191: o layout
     * diz como o cartão NASCE, não como ele fica. */
    const guardado = lembrete(chave);
    pintar(guardado !== null ? guardado === 'fechado'
                             : cartao.dataset.nasce === 'fechado');

    const alternar = e => {
      e.stopPropagation();
      const fechado = !cartao.classList.contains('fechado');
      pintar(fechado);
      lembrete(chave, fechado ? 'fechado' : 'aberto');
    };
    seta.onclick = alternar;
    h2.appendChild(seta);
  });
}

/**
 * O nome do cartão, para servir de chave da preferência.
 *
 * `h2.textContent` puro não serve: ele traz o contador — "Itens da
 * cobrança (4)" — e o rótulo dos botões do cabeçalho. A chave
 * mudaria toda vez que entrasse um item, e a escolha de quem olha se
 * perderia sozinha. Fica só o nome.
 */
function tituloDoCartao(h2) {
  const copia = h2.cloneNode(true);
  copia.querySelectorAll('.cnt, .dir, .seta-card, button, a').forEach(x => x.remove());
  return (copia.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60);
}

/** lê/grava a preferência de quem está olhando. Navegador sem
 *  localStorage (aba anônima com cookies bloqueados) não pode derrubar
 *  a ficha — por isso o try. */
function lembrete(chave, valor) {
  try {
    if (valor === undefined) return localStorage.getItem(chave);
    localStorage.setItem(chave, valor);
  } catch (e) { /* sem memória: os cartões abrem todos, e tudo bem */ }
  return null;
}

/** o nome da tela, para separar as preferências. Nas fichas é o ALVO
 *  ('contrato', 'competencia'); nas outras, o arquivo. */
/**
 * v1.233 — E LIGA SOZINHO, EM QUALQUER TELA.
 *
 * A varredura nasceu chamada pelo `desenharFicha` — logo, só nas
 * fichas. A auditoria de 10/08/2026 mostrou dez telas com cartão e sem
 * recolher: Administração, Seguradoras, Relatórios, Painel, Home,
 * Metas, Análises, Aluguéis e as parcelas de comissão. Acrescentar a
 * chamada em cada uma seria dez edições — e a décima primeira tela
 * nasceria sem, como sempre acontece.
 *
 * Em vez disso: uma passada quando a página carrega e um observador
 * para o que aparecer depois. Isso cobre aba trocada, lista carregada
 * do banco e cartão criado por qualquer código futuro.
 *
 * O laço não existe porque a função é idempotente: a segunda passada
 * não acha cartão sem seta, não altera nada, e o observador não
 * dispara de novo. O adiamento de 60ms junta as mutações de um
 * redesenho inteiro numa chamada só.
 */

// ============================================================
// v1.235 — O OLHO DA SENHA
//
// Vale para TODO campo de senha do CRM, não só o do login: a mesma
// varredura pega a tela de entrar e a de criar senha nova, que tem
// dois. Campo de senha que aparecer amanhã ganha o olho sem ninguém
// lembrar de acrescentar.
//
// O botão é `type="button"` de propósito: dentro de um formulário, um
// <button> sem type é SUBMIT — clicar no olho tentaria entrar com a
// senha meio digitada.
//
// A senha volta a ficar escondida quando a pessoa sai do campo. É a
// diferença entre "conferir o que digitei" e "deixar a senha na tela
// enquanto atendo o telefone".
// ============================================================
const OLHO_ABERTO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
  + 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const OLHO_FECHADO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" '
  + 'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>'
  + '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>'
  + '<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function ligarOlhoDaSenha() {
  document.querySelectorAll('input[type="password"]').forEach(function (campo) {
    if (campo.dataset.olho) return;
    campo.dataset.olho = '1';

    const caixa = document.createElement('span');
    caixa.className = 'campo-senha';
    campo.parentNode.insertBefore(caixa, campo);
    caixa.appendChild(campo);

    const bt = document.createElement('button');
    bt.type = 'button';
    bt.className = 'olho-senha';
    const pintar = function () {
      const vendo = campo.type === 'text';
      bt.innerHTML = vendo ? OLHO_FECHADO : OLHO_ABERTO;
      bt.title = vendo ? 'Esconder a senha' : 'Mostrar a senha';
      bt.setAttribute('aria-label', bt.title);
      bt.setAttribute('aria-pressed', vendo ? 'true' : 'false');
    };
    pintar();
    bt.onclick = function () {
      campo.type = campo.type === 'password' ? 'text' : 'password';
      pintar();
      campo.focus();
    };
    campo.addEventListener('blur', function () {
      if (campo.type === 'text') { campo.type = 'password'; pintar(); }
    });
    caixa.appendChild(bt);
  });
}

function ligarRecolherAutomatico() {
  ligarRecolherDosCartoes(document.body);
  ligarOlhoDaSenha();
  if (typeof MutationObserver !== 'function') return;
  let pendente = false;
  new MutationObserver(() => {
    if (pendente) return;
    pendente = true;
    setTimeout(() => {
      pendente = false;
      ligarRecolherDosCartoes(document.body);
      ligarOlhoDaSenha();
    }, 60);
  }).observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', ligarRecolherAutomatico);
else ligarRecolherAutomatico();

/**
 * v1.404 — ARQUIVO SOLTO NA TELA É IGNORADO.
 *
 * O padrão do navegador para um arquivo largado em cima da página é
 * ABRIR o arquivo no lugar dela: a foto toma a tela e o CRM sai, com o
 * que estava sendo digitado junto. Ninguém faz isso de propósito — faz
 * errando a mira do compositor de postagem por dois dedos.
 *
 * Estes dois ouvintes ficam no `window`, o último da fila: quem QUER a
 * soltura (hoje só a faixa das lâminas, em postagens.js) trata o evento
 * antes e não é afetado. Aqui só se cancela o que ninguém quis.
 */
(function travarArquivoSolto() {
  const temArquivo = e => {
    const t = e.dataTransfer && e.dataTransfer.types;
    return !!t && [].slice.call(t).indexOf('Files') >= 0;
  };
  window.addEventListener('dragover', e => { if (temArquivo(e)) e.preventDefault(); });
  window.addEventListener('drop', e => { if (temArquivo(e)) e.preventDefault(); });
})();

function telaAtual() {
  if (typeof ALVO !== 'undefined' && ALVO) return ALVO;
  return nomeDaTela().replace('.html', '');
}
