// ============================================================
// TELA DE POSTAGENS (v1.399) — Instagram e Facebook
//
// O desenho aprovado em 25/08/2026: calendário do mês com as fotos
// (a moldura colorida é o estado), a coluna do dia, a fila de
// aprovação e a régua de conteúdo que abre os espaços vazios.
//
// Quem PUBLICA não é esta tela: é o relógio do banco chamando a
// Edge Function `postagens-publicar` a cada 5 minutos. Aqui só se
// planeja, aprova e acompanha. Por isso "aprovar" é simplesmente
// mudar o status para `agendada` — o resto acontece sozinho.
//
// As funções que MONTAM dados (grade do mês, números, legenda do
// imóvel) são puras de propósito: são elas que a bateria de testes
// roda no Node, sem navegador.
// ============================================================

let pgAno = 0, pgMes0 = 0;          // o mês aberto (mes0 = 0..11)
let pgPosts = [];                   // as postagens do quadro do mês
let pgFila = [];                    // tudo o que espera aprovação
let pgRegua = [];                   // os compromissos da régua
let pgImoveis = [];                 // a carteira Disponível, p/ o Montar
let pgImovelForaDaLista = null;     // v1.485 — o imóvel GRAVADO que já não está Disponível
let pgDiaSel = null;                // 'AAAA-MM-DD' escolhido
let pgEdit = null;                  // a postagem aberta na janela
let pgLaminas = [];                 // [{path} ou {file, url}] na ordem
let pgRecusas = [];                 // v1.404 — o que o último arrastar/colar não aceitou
let pgArrastaDe = -1;               // v1.404 — a lâmina que está sendo reordenada
let pgSobreConta = 0;               // v1.404 — o vai-e-vem do dragenter/dragleave
let pgSoltaLigada = false;          // v1.404 — os ouvintes só se ligam uma vez
// v1.594 — a fila de comentários
let pgComent = [];                  // as interações sem resposta (as 30 mais antigas)
let pgComentTotal = 0;              // quantas existem ao todo, sem resposta
let pgComentPostes = {};            // id da postagem -> {agendada_para, legenda, midias, tipo}
let pgComentFiltro = 'pendentes';   // pendentes | todos
let pgComentAberto = null;          // o id com a caixa de resposta aberta

const PG_TIPOS = { feed: 'Feed', story: 'Story', carrossel: 'Carrossel' };
const PG_TEMAS = { imovel: 'Imóvel da carteira', dica: 'Dica ou informação útil',
                   institucional: 'Institucional' };
const PG_DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const PG_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
                  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const PG_LEGENDA_MAX = 2200;
const PG_LAMINAS_MAX = 10;                // o carrossel do Instagram vai até 10
const PG_MIDIA_MAX = 8 * 1024 * 1024;     // acima disso a Meta recusa
/** v1.452 — quantas miniaturas cabem na célula do dia. Até 3 elas ficam
 *  com 46px; passando disso encolhem para 32px e cabem 5. */
const PG_MINIS_SEM_APERTO = 3;
const PG_MINIS_APERTADAS = 5;

/** v1.404 — o ícone da faixa de soltar. Contorno, nunca emoji (regra da
 *  varredura de 23/08). Escrito como texto porque ele NÃO passa pelo
 *  htm(): dentro do htm() um SVG vira texto na tela. */
const PG_ICONE_SOLTAR =
  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
  + ' stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
  + '<path d="M12 3v13"/><path d="m7 8 5-5 5 5"/></svg>';

/** v1.405 — o × do canto da lâmina, que passou a ser quem TIRA. */
const PG_ICONE_TIRAR =
  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
  + ' stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M6 6 18 18"/><path d="M18 6 6 18"/></svg>';

// ------------------------------------------------------------
// as funções puras (a bateria de testes roda estas)
// ------------------------------------------------------------

/** 'AAAA-MM-DD' no fuso local — a chave que liga postagem a célula. */
function pgChaveDia(v) {
  const d = v instanceof Date ? v : new Date(v);
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

function pgHoraDe(v) {
  const d = new Date(v);
  const p = n => String(n).padStart(2, '0');
  return p(d.getHours()) + ':' + p(d.getMinutes());
}

/**
 * v1.450 — "seg, 7/set", para a FILA DE APROVAÇÃO.
 *
 * A fila atravessa meses (hoje são 30 postagens, uma por dia, TODAS às
 * 18:00): a hora sozinha se repetia em todos os cartões e não dizia
 * qual era qual nem o que vinha primeiro. Na coluna do dia a data
 * continua de fora — lá o dia é o título do cartão, e repetir seria
 * ruído. Por isso quem manda é quem CHAMA, não o cartão.
 *
 * O ano só aparece quando for outro que não o corrente: a grade de
 * conteúdo vai até dezembro deste ano, e "seg, 7/set/2026" em toda
 * linha seria peso sem informação.
 *
 * As abreviações saem das constantes que já existem (PG_DIAS_SEMANA e
 * PG_MESES) — em português os três primeiros caracteres já servem
 * ("Segunda"→seg, "março"→mar, "setembro"→set), então não há lista
 * nova para manter em dia.
 */
function pgDiaCurtoDe(v) {
  const d = new Date(v);
  const semana = (PG_DIAS_SEMANA[d.getDay()] || '').slice(0, 3).toLowerCase();
  const mes = (PG_MESES[d.getMonth()] || '').slice(0, 3);
  const ano = d.getFullYear() !== new Date().getFullYear() ? '/' + d.getFullYear() : '';
  return semana + ', ' + d.getDate() + '/' + mes + ano;
}

/**
 * A grade do mês: SEMPRE 42 células (6 semanas), começando na
 * segunda — como o calendário de Aluguéis. Cada célula sabe o dia,
 * se pertence ao mês e as postagens dele em ordem de hora.
 */
function pgGradeDoMes(ano, mes0, posts) {
  const porDia = {};
  (posts || []).forEach(p => {
    const ch = pgChaveDia(p.agendada_para);
    (porDia[ch] = porDia[ch] || []).push(p);
  });
  Object.values(porDia).forEach(l =>
    l.sort((a, b) => a.agendada_para < b.agendada_para ? -1 : 1));

  const primeiro = new Date(ano, mes0, 1);
  // getDay(): 0=domingo. Semana começa na SEGUNDA: recua até ela.
  const recuo = (primeiro.getDay() + 6) % 7;
  const inicio = new Date(ano, mes0, 1 - recuo);

  const hoje = pgChaveDia(new Date());
  const celulas = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    const ch = pgChaveDia(d);
    celulas.push({
      chave: ch, dia: d.getDate(),
      doMes: d.getMonth() === mes0,
      hoje: ch === hoje,
      itens: porDia[ch] || []
    });
  }
  return celulas;
}

/**
 * v1.452 — AS POSTAGENS DO DIA, AGRUPADAS POR HORÁRIO.
 *
 * Duas postagens marcadas para a mesma hora (o feed institucional e o
 * da grade de dicas, ambos ao meio-dia) viravam duas linhas empilhadas,
 * como se uma viesse depois da outra. Agrupadas, elas ficam lado a lado
 * na mesma faixa — que é o que de fato acontece.
 *
 * Devolve uma lista de grupos, na ordem do relógio.
 */
function pgAgruparPorHora(itens) {
  const grupos = [];
  const indice = new Map();
  (itens || []).forEach(p => {
    const h = pgHoraDe(p.agendada_para);
    if (!indice.has(h)) { indice.set(h, grupos.length); grupos.push([]); }
    grupos[indice.get(h)].push(p);
  });
  return grupos;
}

/** Os números do painel: só o mês aberto conta. */
function pgNumeros(posts) {
  const n = { publicadas: 0, agendadas: 0, aprovar: 0, vazias: 0, planejadas: 0 };
  (posts || []).forEach(p => {
    n.planejadas++;
    if (p.status === 'publicada') n.publicadas++;
    else if (p.status === 'agendada' || p.status === 'publicando') n.agendadas++;
    else if (p.status === 'aprovar') n.aprovar++;
    else if (p.status === 'vazia') n.vazias++;
  });
  return n;
}

// ------------------------------------------------------------
// v1.594 — A FILA DE COMENTÁRIOS: as contas
//
// Puras de propósito — é o que a bateria roda no Node, e é onde mora
// toda decisão que dá para errar em silêncio.
// ------------------------------------------------------------

/** Um comentário está ESPERANDO quando ninguém respondeu e ninguém
 *  marcou como tratado.
 *
 *  As duas condições existem: responder pela rede (fora do CRM) e
 *  marcar tratado aqui são caminhos diferentes para o mesmo fim, e
 *  qualquer um dos dois tira a linha da fila. Reação nunca entra —
 *  não se responde a um "curtiu". */
function pgComentEspera(i) {
  if (!i || i.tipo === 'reacao') return false;
  return !i.tratado && !i.resposta_externo_id;
}

/** A fila, na ordem em que deve ser atendida: **o mais antigo primeiro**.
 *
 *  É o contrário do resto do CRM, onde o recente vem em cima — e é de
 *  propósito. Aqui a lista é de gente esperando; quem está há dois dias
 *  sem resposta não pode ir para o fim da página só porque alguém
 *  comentou agora. */
function pgComentFila(lista, filtro) {
  return (lista || [])
    .filter(i => i && i.tipo !== 'reacao')
    .filter(i => filtro === 'todos' ? true : pgComentEspera(i))
    .sort((a, b) => String(a.criado_em_rede || '').localeCompare(String(b.criado_em_rede || '')));
}

/** O resumo do 5º número da faixa de cima: quantos esperam e há quanto
 *  tempo o mais antigo espera. `dias` é o que decide o amarelo. */
function pgComentResumo(lista, agora) {
  const fila = pgComentFila(lista, 'pendentes');
  const base = agora ? new Date(agora) : new Date();
  let maisAntigo = null;
  for (const i of fila) {
    const d = new Date(i.criado_em_rede || 0);
    if (!isNaN(d) && (maisAntigo === null || d < maisAntigo)) maisAntigo = d;
  }
  const dias = maisAntigo ? Math.floor((base - maisAntigo) / 86400000) : 0;
  return { quantos: fila.length, maisAntigo, dias };
}

/** A frase de apoio do KPI. Sem fila, elogia em vez de mostrar zero
 *  seco; com fila, diz o que dói: há quanto tempo alguém espera. */
function pgComentFrase(resumo) {
  if (!resumo || !resumo.quantos) return 'ninguém esperando resposta';
  if (resumo.dias >= 1) {
    return 'o mais antigo espera há ' + resumo.dias + (resumo.dias === 1 ? ' dia' : ' dias');
  }
  return 'todos de hoje';
}

/** A legenda que o botão Montar escreve a partir da ficha do imóvel.
 *  Modelo simples de propósito: é ponto de partida, não texto final.
 *  v1.486 — SEM O ENDEREÇO (regra de 02/09: legenda nunca diz a rua;
 *  só tipo, bairro, valor e código). O texto completo é o da IA. */
function pgLegendaDoImovel(i) {
  if (!i) return '';
  const l = [];
  l.push((i.tipo || 'Imóvel') + ' para alugar'
    + (i.bairro ? ' no ' + i.bairro : '') + (i.cidade ? ', ' + i.cidade : '') + '.');
  if (i.valor_aluguel) l.push('Aluguel ' + moeda(i.valor_aluguel) + ' + encargos.');
  if (i.codigo) l.push('Código ' + i.codigo + '.');
  l.push('Agende sua visita: chame a Moralí no WhatsApp ou pelo link da bio.');
  const cidade = String(i.cidade || 'Catanduva').toLowerCase().replace(/\s+/g, '');
  l.push('#' + cidade + ' #aluguel #imoveis');
  return l.join(' ');
}

/**
 * v1.452 — OS BOTÕES DO RODAPÉ DO MODAL, por status.
 *
 * Eles eram fixos no HTML: os mesmos três para qualquer postagem. Numa
 * que esperava aprovação, o cartão do dia dizia "Aprovar" e o rodapé
 * dizia "Agendar" — duas palavras para a mesma ação, na mesma tela.
 * Agora sai daqui, com o vocabulário do pgAcoesDoStatus logo abaixo.
 *
 * Em `publicada` e `publicando` não sobra nenhum: a miniatura do
 * calendário abre QUALQUER status, e oferecer "Agendar" numa postagem
 * que já saiu convida a republicar — sairia um post novo no Instagram
 * e o ig_media_id seria sobrescrito.
 *
 * @returns {Array<[rotulo, statusPedido, classe]>} primário por último
 */
function pgBotoesDoRodape(status) {
  switch (status) {
    case 'aprovar':    return [['Salvar alterações', 'aprovar', 'btn-claro'],
                               ['Aprovar', 'agendada', 'btn']];
    case 'agendada':   return [['Desagendar', 'aprovar', 'btn-claro'],
                               ['Salvar alterações', 'agendada', 'btn']];
    case 'falhou':     return [['Salvar alterações', 'aprovar', 'btn-claro'],
                               ['Tentar de novo', 'agendada', 'btn']];
    case 'publicada':
    case 'publicando': return [];
    default:           return [['Salvar rascunho', 'rascunho', 'btn-claro'],
                               ['Enviar para aprovação', 'aprovar', 'btn-claro'],
                               ['Agendar', 'agendada', 'btn']];
  }
}

/** O que cada status permite fazer — a tabela que desenha os botões. */
function pgAcoesDoStatus(status) {
  switch (status) {
    case 'vazia':      return [['Preencher', 'pgEditar', 'btn']];
    case 'rascunho':   return [['Editar', 'pgEditar', 'btn'],
                               ['Para aprovar', 'pgMudar:aprovar', 'btn-claro']];
    case 'aprovar':    return [['Aprovar', 'pgMudar:agendada', 'btn'],
                               ['Editar', 'pgEditar', 'btn-claro']];
    case 'agendada':   return [['Editar', 'pgEditar', 'btn-claro'],
                               ['Desagendar', 'pgMudar:aprovar', 'btn-claro']];
    case 'publicando': return [];
    case 'publicada':  return [];
    case 'falhou':     return [['Tentar de novo', 'pgMudar:agendada', 'btn'],
                               ['Editar', 'pgEditar', 'btn-claro']];
  }
  return [];
}

/** As validações do salvar. Devolve a lista de problemas (vazia = ok). */
function pgValidar(post, laminas, statusPedido) {
  const erros = [];
  if (statusPedido !== 'rascunho' && !laminas.length)
    erros.push('A postagem está sem mídia — suba pelo menos uma foto.');
  if (post.tipo === 'carrossel' && statusPedido !== 'rascunho' && laminas.length < 2)
    erros.push('Carrossel precisa de pelo menos 2 fotos.');
  if (post.tipo === 'story' && laminas.length > 1)
    erros.push('Story é uma mídia só — deixe apenas a primeira.');
  if ((post.legenda || '').length > PG_LEGENDA_MAX)
    erros.push('A legenda passou de ' + PG_LEGENDA_MAX + ' caracteres.');
  if (!post.rede_instagram && !post.rede_facebook)
    erros.push('Escolha ao menos uma rede.');
  if (statusPedido === 'agendada' && new Date(post.agendada_para) <= new Date())
    erros.push('O horário já passou — escolha um no futuro.');
  return erros;
}

/**
 * v1.404 — A PENEIRA DOS ARQUIVOS QUE CHEGAM, venham de onde vierem:
 * do seletor de arquivos, arrastados do Finder ou colados com Ctrl+V.
 * Devolve { aceitos, recusas } sem tocar na tela — é ela que a bateria
 * roda no Node.
 *
 * As recusas voltam ESCRITAS, uma frase por arquivo, porque agora vão
 * para uma linha só embaixo da faixa. Antes cada arquivo torto abria um
 * alert(); soltando oito de uma vez isso viravam oito caixas para fechar.
 */
function pgPeneirarArquivos(arquivos, jaTem) {
  const aceitos = [], recusas = [];
  let n = jaTem || 0;
  [...(arquivos || [])].forEach(f => {
    const nome = f.name || 'imagem colada';
    if (!/^image\/(jpeg|png)$/.test(f.type || ''))
      { recusas.push(nome + ' — só JPG ou PNG'); return; }
    // v1.511 — os 8 MB são da Meta e valem para todo plano; o plano só
    // pode apertar. O texto da recusa diz de quem é o número.
    const tetoMB = typeof tetoArquivoMB === 'function' ? tetoArquivoMB(8) : 8;
    if (f.size > tetoMB * 1024 * 1024)
      { recusas.push(nome + ' — acima de ' + tetoMB + ' MB, '
        + (tetoMB < 8 ? 'o limite do seu plano' : 'a Meta recusa')); return; }
    if (n >= PG_LAMINAS_MAX)
      { recusas.push(nome + ' — o carrossel vai até ' + PG_LAMINAS_MAX + ' fotos'); return; }
    aceitos.push(f); n++;
  });
  return { aceitos, recusas };
}

/**
 * v1.404 — MOVER UMA LÂMINA DE LUGAR. A ordem não é enfeite: a 1ª é a
 * capa (e é ela que vira o story irmão) e as outras são a sequência do
 * carrossel. Por isso a conta mora aqui, pura e testável.
 *
 * `para` é o índice de destino LIDO NA LISTA ORIGINAL, e a lâmina entra
 * ANTES dele — que é o que a marca azul na beirada esquerda promete.
 * Soltar em cima de si mesma, ou logo antes da vizinha da direita, não
 * muda nada (a conta chega nisso sozinha, sem caso especial).
 */
function pgMoverLamina(lista, de, para) {
  const l = (lista || []).slice();
  if (de < 0 || de >= l.length || para < 0 || para > l.length) return l;
  const [item] = l.splice(de, 1);
  l.splice(de < para ? para - 1 : para, 0, item);
  return l;
}

// ------------------------------------------------------------
// carregar e desenhar
// ------------------------------------------------------------
function pgEmpresa() {
  const p = (typeof PERM !== 'undefined' && PERM.perfil) || {};
  return (p.superadmin && p.empresa_foco) || p.empresa_id || null;
}

function pgUrlMidia(caminho) {
  return sb.storage.from('postagens').getPublicUrl(caminho).data.publicUrl;
}

/** v1.403 — A URL DA MÍDIA ENTRA DENTRO DE UM url('…') DE CSS, e ali o
 *  htm() NÃO é escape: o navegador desfaz as entidades ANTES de o CSS
 *  ler o atributo, então um apóstrofo volta a ser apóstrofo e fecha o
 *  url() no meio. (É o mesmo motivo pelo qual onclick pede jsq() e não
 *  htm() — está escrito no comentário do próprio jsq, no base.js.)
 *
 *  O caminho da mídia vem da coluna `midias`, que é jsonb: texto que
 *  alguém com permissão de editar postagem consegue escrever. Então a
 *  URL passa por duas peneiras antes do htm(): perde o que fecharia o
 *  url('…') e só vale se for http(s) — ou blob:, que é a lâmina ainda
 *  não enviada, desenhada direto do arquivo escolhido. */
function pgUrlCss(u) {
  const limpa = String(u || '').replace(/['"()\\\s]/g, '');
  return /^(https?:|blob:)/i.test(limpa) ? limpa : '';
}

async function pgCarregar() {
  const grade = pgGradeDoMes(pgAno, pgMes0, []);
  const de  = grade[0].chave + 'T00:00:00';
  const ate = grade[41].chave + 'T23:59:59';
  // v1.591 — a fila pode estar filtrada por lote; e o total e os lotes
  // vêm em duas perguntas leves, porque a lista mostra só 30
  let fila = sb.from('postagens').select('*').eq('status', 'aprovar')
    .order('agendada_para').limit(30);
  if (pgFilaLote === 'avulsas') fila = fila.is('lote_id', null);
  else if (pgFilaLote) fila = fila.eq('lote_id', pgFilaLote);
  const [posts, filaR, regua, imv, conta, lotes] = await Promise.all([
    sb.from('postagens').select('*')
      .gte('agendada_para', de).lte('agendada_para', ate)
      .order('agendada_para'),
    fila,
    sb.from('postagem_regua').select('*').order('dia_semana').order('hora'),
    sb.from('imoveis').select('id,codigo,endereco,bairro,cidade,tipo,valor_aluguel')
      .eq('situacao', 'Disponível').order('endereco'),
    sb.from('postagens').select('id', { count: 'exact', head: true }).eq('status', 'aprovar'),
    sb.from('postagens').select('lote_id,criado_em').eq('status', 'aprovar').not('lote_id', 'is', null)
  ]);
  pgPosts = posts.data || [];
  pgFila = filaR.data || [];
  pgFilaTotal = conta.count || pgFila.length;
  pgLotes = {};
  // sem a coluna (o SQL da 1.591 ainda não rodou) a pergunta falha e a
  // fila segue sem lotes — nada quebra
  (lotes.data || []).forEach(x => {
    const l = pgLotes[x.lote_id] || (pgLotes[x.lote_id] = { n: 0, criado_em: x.criado_em });
    l.n++;
    if (x.criado_em < l.criado_em) l.criado_em = x.criado_em;
  });
  pgRegua = regua.data || [];
  pgImoveis = imv.data || [];
  pgDesenhar();
  // v1.594 — a fila de comentários vem DEPOIS de desenhar, não dentro
  // do Promise.all acima: ela é a única parte da tela que depende de
  // uma tabela que pode nem existir ainda (quem não rodou o sql-01 da
  // v1.573 não tem postagem_interacoes). Assim o calendário aparece na
  // hora de sempre, e um erro nela não leva a tela junto.
  pgCarregarComentarios();
}

/** As interações que esperam resposta, e os dados dos posts de onde
 *  vieram — o suficiente para a pessoa responder sem abrir a ficha. */
async function pgCarregarComentarios() {
  const { data, error, count } = await sb.from('postagem_interacoes')
    .select('*', { count: 'exact' })
    .neq('tipo', 'reacao')
    .eq('tratado', false)
    .is('resposta_externo_id', null)
    .order('criado_em_rede', { ascending: true })   // o mais antigo primeiro
    .limit(30);

  if (error) {
    // Tabela ausente (sql-01 não rodado) ou sem permissão: o cartão
    // some e o resto da tela segue inteiro. Some em vez de mostrar
    // erro porque, para quem ainda não instalou os comentários, um
    // cartão vermelho seria ruído sobre algo que ele nem contratou.
    pgComent = []; pgComentTotal = 0;
    const c = document.getElementById('pg-coment-cartao');
    if (c) c.style.display = 'none';
    return;
  }
  pgComent = data || [];
  pgComentTotal = count === null || count === undefined ? pgComent.length : count;

  // Os posts das interações. Podem estar fora do mês aberto, então não
  // dá para reaproveitar o pgPosts — mas quase sempre estão, e quem
  // está lá não é buscado de novo.
  pgComentPostes = {};
  const faltam = [];
  for (const i of pgComent) {
    if (!i.postagem_id) continue;
    const achado = pgPosts.find(p => p.id === i.postagem_id);
    if (achado) pgComentPostes[i.postagem_id] = achado;
    else if (!faltam.includes(i.postagem_id)) faltam.push(i.postagem_id);
  }
  if (faltam.length) {
    const { data: outros } = await sb.from('postagens')
      .select('id,agendada_para,legenda,midias,tipo').in('id', faltam);
    (outros || []).forEach(p => { pgComentPostes[p.id] = p; });
  }

  pgDesenharComentarios();
  pgDesenharNumeros();   // o 5º KPI só existe depois desta consulta
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

function pgDesenhar() {
  document.getElementById('pg-mes-nome').textContent =
    PG_MESES[pgMes0].charAt(0).toUpperCase() + PG_MESES[pgMes0].slice(1) + ' de ' + pgAno;
  pgDesenharNumeros();
  pgDesenharCalendario();
  pgDesenharDia();
  pgDesenharFila();
  pgDesenharRegua();
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

function pgDesenharNumeros() {
  const n = pgNumeros(pgPosts);
  document.getElementById('pg-kpis').innerHTML = `
    <div class="pg-kpi"><span class="r">Publicadas no mês</span>
      <span class="v">${n.publicadas}</span>
      <span class="s">de ${n.planejadas} planejadas</span></div>
    <div class="pg-kpi"><span class="r">Agendadas</span>
      <span class="v">${n.agendadas}</span>
      <span class="s">o relógio publica sozinho</span></div>
    <div class="pg-kpi${n.aprovar ? ' alerta' : ''}"><span class="r">Para aprovar</span>
      <span class="v">${n.aprovar}</span>
      <span class="s">um clique cada, na fila ao lado</span></div>
    <div class="pg-kpi"><span class="r">Espaços vazios</span>
      <span class="v">${n.vazias}</span>
      <span class="s">a régua cobra o que falta</span></div>
    ${pgKpiComentarios()}`;
}

/** v1.594 — o 5º número: comentários sem resposta.
 *
 *  Amarelo (`alerta`) só quando há gente esperando — a mesma regra do
 *  "Para aprovar". Zero não acende: fila vazia é a situação boa.
 *
 *  Sai da faixa inteiro quando a tabela não existe (sql-01 não rodado):
 *  a `pg-kpis` volta a ter 4 colunas pelo CSS, sem buraco. */
function pgKpiComentarios() {
  const cartao = document.getElementById('pg-coment-cartao');
  if (cartao && cartao.style.display === 'none') return '';
  const r = pgComentResumo(pgComent);
  // o total do banco manda: a lista traz no máximo 30
  const quantos = pgComentTotal || r.quantos;
  return `<div class="pg-kpi${quantos ? ' alerta' : ''}">
    <span class="r">Comentários sem resposta</span>
    <span class="v">${quantos}</span>
    <span class="s">${htm(pgComentFrase({ quantos, dias: r.dias }))}</span></div>`;
}

/** @param {boolean} [junta] true quando divide a faixa com outra do
 *  mesmo horário — aí a miniatura fica com meia largura (56px numa
 *  célula de 129) e "12:00 · feed" não cabe: mostra só a hora. */
function pgMiniHtml(p, junta) {
  const midias = Array.isArray(p.midias) ? p.midias : [];
  const rotulo = junta ? pgHoraDe(p.agendada_para)
    : pgHoraDe(p.agendada_para) + ' · ' + (PG_TIPOS[p.tipo] || p.tipo).toLowerCase();
  if (p.status === 'vazia')
    return `<div class="pg-vazio" onclick="pgEditar('${jsq(p.id)}');event.stopPropagation()">
      ${htm((PG_TIPOS[p.tipo] || '').toLowerCase())} · ${htm(pgHoraDe(p.agendada_para))} · vazio</div>`;
  const fundo = midias.length
    ? ` style="background-image:url('${htm(pgUrlCss(pgUrlMidia(midias[0])))}');background-size:cover;background-position:center"`
    : ' style="background:#5B6870"';
  return `<div class="pg-mini ${htm(p.status)}"${fundo}
    onclick="pgEditar('${jsq(p.id)}');event.stopPropagation()">
    <span class="rt">${htm(rotulo)}</span></div>`;
}

function pgDesenharCalendario() {
  const grade = pgGradeDoMes(pgAno, pgMes0, pgPosts);
  const cab = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
    .map(d => `<div class="pg-sem">${d}</div>`).join('');
  document.getElementById('pg-cal').innerHTML = cab + grade.map(c => {
    // v1.452 — DIA CHEIO MOSTRA 5, NÃO 3. Até 3 nada muda. De 4 em
    // diante a célula ganha `cheio`, a miniatura encolhe de 46 para
    // 32px e cabem 5 — e a linha do calendário fica com a mesma altura
    // de antes, porque o "+N" que sumia ocupava um bloco inteiro.
    // O que enche a célula é o número de FAIXAS (horários distintos),
    // não o de postagens: duas ao meio-dia dividem uma faixa só.
    const faixas = pgAgruparPorHora(c.itens);
    const cheio = faixas.length > PG_MINIS_SEM_APERTO;
    const limite = cheio ? PG_MINIS_APERTADAS : PG_MINIS_SEM_APERTO;
    const mostradas = faixas.slice(0, limite);
    const vistas = mostradas.map(g =>
      `<div class="pg-hora${g.length > 1 ? ' juntas' : ''}">${
        g.map(p => pgMiniHtml(p, g.length > 1)).join('')}</div>`
    ).join('');
    const sobra = c.itens.length - mostradas.reduce((n, g) => n + g.length, 0);
    const mais = sobra > 0
      ? `<div class="pg-vazio" style="border-style:solid">+ ${sobra}</div>` : '';
    return `<div class="pg-dia${c.doMes ? '' : ' fora'}${c.hoje ? ' hoje' : ''}${
        c.chave === pgDiaSel ? ' sel' : ''}${cheio ? ' cheio' : ''}"
        onclick="pgAbrirDia('${c.chave}')">
      <div class="n">${c.dia}</div>${vistas}${mais}</div>`;
  }).join('');
}

/** v1.450 — `comData` liga o "seg, 7/set ·" antes da hora. Quem pede é
 *  a fila de aprovação; a coluna do dia chama sem ele. */
function pgCartaoDoDia(p, comData) {
  const midias = Array.isArray(p.midias) ? p.midias : [];
  const thumb = midias.length
    ? `style="background-image:url('${htm(pgUrlCss(pgUrlMidia(midias[0])))}');background-size:cover;background-position:center"`
    : 'style="background:#E7EDF1"';
  const tags = {
    vazia: 'tag-cinza', rascunho: 'tag-cinza', aprovar: 'tag-amarela',
    agendada: 'tag-azul', publicando: 'tag-azul', publicada: 'tag-verde',
    falhou: 'tag-vermelha'
  };
  const rotulos = { vazia: 'vazio', rascunho: 'rascunho', aprovar: 'aprovar',
    agendada: 'agendada', publicando: 'publicando…', publicada: 'publicada',
    falhou: 'falhou' };
  const botoes = pgAcoesDoStatus(p.status).map(([rot, acao, classe]) => {
    const [fn, arg] = acao.split(':');
    const chamada = fn === 'pgMudar'
      ? `pgMudar('${jsq(p.id)}','${jsq(arg)}')` : `pgEditar('${jsq(p.id)}')`;
    return `<button class="btn ${classe}" data-perm="postagens:editar"
      onclick="${chamada}">${htm(rot)}</button>`;
  }).join('');
  // v1.573 — A PORTA PARA A FICHA DA POSTAGEM (comentários e números).
  //
  // Só na publicada: antes de sair não há o que comentar. E é aqui que
  // ela cabe — a pgAcoesDoStatus devolve [] para 'publicada', então
  // este é o único cartão do CRM que não tinha botão nenhum.
  //
  // NÃO entrou na pgAcoesDoStatus de propósito: aquela função é pura e
  // tem provas na bateria (o retorno vazio da publicada é uma delas,
  // desde a v1.452). Mudar a tabela para acrescentar um botão de VER
  // quebraria uma prova sobre botões de EDITAR — duas coisas diferentes
  // no mesmo lugar.
  const verComentarios = p.status === 'publicada'
    ? `<button class="btn btn-claro" data-perm="postagens:ver"
         onclick="pgAbrirFicha('${jsq(p.id)}')">Comentários</button>`
    : '';
  const redes = [p.rede_instagram ? 'IG' : '', p.rede_facebook ? 'FB' : '']
    .filter(Boolean).join(' + ');
  return `<div class="pg-lpost">
    <div class="thumb${p.tipo === 'story' ? ' story' : ''}" ${thumb}></div>
    <div>
      <div class="l1"><span class="hora">${comData
          ? `<span class="dia">${htm(pgDiaCurtoDe(p.agendada_para))}</span> · ` : ''
        }${htm(pgHoraDe(p.agendada_para))}</span>
        <span class="tag tag-cinza">${htm(PG_TIPOS[p.tipo] || p.tipo)}${
          p.tipo === 'carrossel' && midias.length ? ' · ' + midias.length : ''}</span>
        <span class="tag tag-cinza">${htm(redes)}</span>
        <span class="tag ${tags[p.status] || 'tag-cinza'}">${htm(rotulos[p.status] || p.status)}</span></div>
      <div class="leg">${htm(p.legenda || (p.status === 'vazia'
        ? 'Espaço da régua — ' + (PG_TEMAS[p.tema] || '').toLowerCase() : ''))}</div>
      ${p.lote_id && pgLotes[p.lote_id]
        ? `<div class="leg pg-lote">${htm(pgRotuloDoLote(pgLotes[p.lote_id]))}</div>` : ''}
    </div>
    ${(botoes || verComentarios) ? `<div class="acao">${botoes}${verComentarios}</div>` : ''}
    ${p.status === 'falhou' && p.erro ? `<div class="pg-erro">${htm(p.erro)}</div>` : ''}
  </div>`;
}

/** v1.573 — abre a ficha da postagem (a tela irmã, postagem.html). */
function pgAbrirFicha(id) {
  location.href = 'postagem.html?id=' + encodeURIComponent(id);
}

function pgAbrirDia(chave) { pgDiaSel = chave; pgDesenharCalendario(); pgDesenharDia(); }

function pgDesenharDia() {
  const t = document.getElementById('pg-dia-titulo');
  const c = document.getElementById('pg-dia-corpo');
  if (!pgDiaSel) return;
  const d = new Date(pgDiaSel + 'T12:00');
  const doDia = pgPosts.filter(p => pgChaveDia(p.agendada_para) === pgDiaSel);
  t.innerHTML = `${htm(PG_DIAS_SEMANA[d.getDay()])}, ${d.getDate()}
    <span class="cnt">${doDia.length ? doDia.length + ' postagem(ns)' : 'nada neste dia'}</span>
    <span class="dir"><button class="btn btn-claro" data-perm="postagens:criar"
      onclick="pgNova('${pgDiaSel}')">+ Neste dia</button></span>`;
  c.innerHTML = doDia.length ? doDia.map(x => pgCartaoDoDia(x)).join('')
    : '<div style="color:var(--texto-suave);font-size:12.5px">Nada agendado. O botão acima cria.</div>';
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

function pgDesenharFila() {
  // v1.591 — o número é o TOTAL (a lista mostra até 30), e a barra do
  // lote entra em cima: "Aprovar todas" e o filtro por lote
  const n = Math.max(pgFilaTotal, pgFila.length);
  document.getElementById('pg-fila-conta').innerHTML =
    n ? `<span class="pg-fila-n">${n}</span>` : '';
  document.getElementById('pg-fila').innerHTML = pgDesenharFilaBarra() + (pgFila.length
    ? pgFila.map(x => pgCartaoDoDia(x, true)).join('')
      + (n > pgFila.length ? `<div style="color:var(--texto-suave);font-size:12px;text-align:center;padding:4px">… e mais ${n - pgFila.length} — aprove estas para ver as próximas</div>` : '')
    : '<div style="color:var(--texto-suave);font-size:12.5px">Nada esperando aprovação.</div>');
}

// ============================================================
// v1.594 — A FILA DE COMENTÁRIOS: o desenho e as ações
//
// O nome de quem falou, o "há 2 horas" e as iniciais vêm do
// postagem.js (pfNomeDoAutor / pfQuando / pfIniciais), carregado antes
// deste arquivo: é o MESMO comentário nas duas telas, e tem de se
// chamar igual nos dois lugares.
// ============================================================

function pgDesenharComentarios() {
  const alvo = document.getElementById('pg-coment');
  if (!alvo) return;
  const conta = document.getElementById('pg-coment-conta');
  if (conta) conta.textContent = '(' + (pgComentTotal || 0) + ')';

  const fila = pgComentFila(pgComent, pgComentFiltro);
  const pend = pgComentFila(pgComent, 'pendentes').length;

  const pilula = (chave, rotulo, qtd) =>
    `<button class="${pgComentFiltro === chave ? 'on' : ''}"
       onclick="pgComentFiltrar('${chave}')">${htm(rotulo)} (${qtd})</button>`;

  alvo.innerHTML = `
    <div class="cq-filtros">
      ${pilula('pendentes', 'Sem resposta', pgComentTotal || pend)}
      ${pilula('todos', 'Todos', pgComent.length)}
    </div>
    ${fila.length ? fila.slice(0, 12).map(pgComentItem).join('')
      : `<div class="cq-vazio">${pgComent.length
          ? 'Nenhum comentário com esse filtro.'
          : 'Nenhum comentário esperando resposta.'}</div>`}
    ${pgComentRodape(fila.length)}`;
}

function pgComentRodape(mostrados) {
  const total = pgComentTotal || mostrados;
  const sobra = total - Math.min(mostrados, 12);
  return `<div class="cq-rodape">${
    sobra > 0 ? 'Mostrando ' + Math.min(mostrados, 12) + ' de ' + total + ' · ' : ''
  }Chega na hora em que a pessoa escreve.
    <b>O mais antigo fica em cima</b>: é quem espera há mais tempo.</div>`;
}

/** Um comentário na fila. A coluna tem 332px, então tudo é compacto —
 *  mas o post de origem NÃO sai: sem ele a pessoa não sabe a que
 *  pergunta está respondendo, e teria de abrir a ficha, que é
 *  justamente o que esta tela veio evitar. */
function pgComentItem(i) {
  const p = pgComentPostes[i.postagem_id];
  const midias = (p && p.midias) || [];
  const fundo = midias.length
    ? ` style="background-image:url('${htm(pgUrlCss(pgUrlMidia(midias[0])))}')"`
    : ' style="background:#5B6870"';
  const espera = pgComentEspera(i);

  return `
  <div class="cq-item${espera ? ' novo' : ''}">
    <div class="quem"><span class="ft">${htm(pfIniciais(pfNomeDoAutor(i)))}</span>
      ${htm(pfNomeDoAutor(i))}
      <span class="cm-rede ${i.rede === 'instagram' ? 'ig' : 'fb'}">${
        htm(i.rede === 'instagram' ? 'Instagram' : 'Facebook')}</span>
      <span class="qd">${htm(pfQuando(i.criado_em_rede))}</span></div>
    <div class="txt">${htm(i.texto || '')}</div>
    ${p ? `<div class="post" onclick="pgAbrirFicha('${jsq(i.postagem_id)}')"
        title="abrir a postagem">
      <span class="th"${fundo}></span>
      <span><b>${htm(pgDiaCurtoDe(p.agendada_para))} · ${htm(pgHoraDe(p.agendada_para))}</b>
        <span class="leg">${htm(p.legenda || 'sem legenda')}</span></span></div>` : ''}
    ${i.resposta_texto ? `<div class="cq-resp"><b>Respondido</b> · ${
      htm(pfQuando(i.respondido_em))}<br>${htm(i.resposta_texto)}</div>` : ''}
    <div class="ac">
      ${espera ? `<button data-perm="postagens:editar"
        onclick="pgComentResponder('${jsq(i.id)}')">${
        pgComentAberto === i.id ? 'Cancelar' : 'Responder'}</button>` : ''}
      ${!i.lead_id ? `<button data-perm="leads:criar"
        onclick="pgComentVirarLead('${jsq(i.id)}')">Virar lead</button>`
        : `<button onclick="location.href='lead.html?id=' + encodeURIComponent('${jsq(i.lead_id)}')">Abrir o lead</button>`}
      ${espera ? `<button class="apaga" data-perm="postagens:editar"
        onclick="pgComentTratar('${jsq(i.id)}')">Tratado</button>`
        : '<button class="apaga" disabled>Tratado ✓</button>'}
    </div>
    ${pgComentAberto === i.id ? pgComentCaixa(i) : ''}
  </div>`;
}

function pgComentCaixa(i) {
  const prontas = [
    ['Disponível', 'Oi! Esse ainda está disponível sim 😊 Chama no direct que a gente manda tudo.'],
    ['Agendar visita', 'Chama no direct que a gente agenda a visita 🔑'],
    ['Valor do condomínio', 'Te mandei os valores no direct!']
  ];
  return `<div class="cq-caixa">
    <textarea id="pg-coment-texto" maxlength="2200"
      placeholder="Escreva a resposta…"></textarea>
    <div class="cq-prontas">${prontas.map(([r, t]) =>
      `<button onclick="pgComentPronta('${jsq(t)}')">${htm(r)}</button>`).join('')}</div>
    <div class="pe">
      <button class="btn" onclick="pgComentEnviar('${jsq(i.id)}')">Responder no ${
        htm(i.rede === 'instagram' ? 'Instagram' : 'Facebook')}</button>
    </div>
  </div>`;
}

function pgComentFiltrar(qual) { pgComentFiltro = qual; pgDesenharComentarios(); }

function pgComentPronta(texto) {
  const t = document.getElementById('pg-coment-texto');
  if (t) { t.value = texto; t.focus(); }
}

function pgComentResponder(id) {
  pgComentAberto = pgComentAberto === id ? null : id;
  pgDesenharComentarios();
  const t = document.getElementById('pg-coment-texto');
  if (t) t.focus();
}

async function pgComentEnviar(id) {
  const caixa = document.getElementById('pg-coment-texto');
  const texto = caixa ? caixa.value.trim() : '';
  if (!texto) { await dialogoAvisar('Escreva a resposta antes de enviar.'); return; }

  const botao = event && event.target;
  if (botao) { botao.disabled = true; botao.textContent = 'Enviando…'; }

  // A resposta sai pela Edge: o token da Meta não pode existir no
  // navegador. Mesma função que a ficha da postagem usa.
  const { data, error } = await sb.functions.invoke('postagens-comentar', {
    body: { interacao_id: id, texto }
  });

  // O invoke esconde o corpo do 4xx/5xx (a lição da v1.498): a Edge
  // devolve 200 nos negativos de negócio, e aqui ainda se tenta ler o
  // contexto do erro antes de cair no genérico.
  let r = data;
  if (error) {
    r = null;
    try {
      if (error.context && typeof error.context.json === 'function') r = await error.context.json();
    } catch (_) { /* fica no genérico */ }
  }
  if (!r || !r.ok) {
    if (botao) { botao.disabled = false; botao.textContent = 'Responder'; }
    await dialogoAvisar('Não consegui responder: '
      + ((r && r.erro) || (error && error.message) || 'erro desconhecido'));
    return;
  }
  pgComentAberto = null;
  await pgCarregarComentarios();
}

async function pgComentTratar(id) {
  const { error } = await sb.from('postagem_interacoes')
    .update({ tratado: true }).eq('id', id);
  if (error) { await dialogoAvisar('Não consegui marcar: ' + error.message); return; }
  await pgCarregarComentarios();
}

/** Virar lead, da fila. Mesmo aviso da ficha: do Instagram não vem
 *  telefone, e quem clica precisa saber disso ANTES, não depois. */
async function pgComentVirarLead(id) {
  const i = pgComent.find(x => x.id === id);
  if (!i) return;
  const nome = pfNomeDoAutor(i);
  const ok = await dialogoPerguntar({
    texto: 'Criar um lead para ' + nome + '?'
      + (i.rede === 'instagram'
        ? '\n\nO Instagram não entrega telefone nem e-mail: o lead vai nascer só com o @, '
        + 'e alguém precisa puxar conversa no direct para conseguir o contato.' : ''),
    ok: 'Criar o lead'
  });
  if (!ok) return;

  const p = pgComentPostes[i.postagem_id];
  const { data, error } = await sb.from('leads').insert({
    empresa_id: pgEmpresa(),
    nome: nome,
    tipo_lead: 'Inquilino',
    origem: i.rede === 'instagram' ? 'Instagram' : 'Facebook',
    observacoes: 'Veio de um comentário na postagem "'
      + ((p && p.legenda) || 'sem legenda') + '":\n\n' + String(i.texto || '')
  }).select('id,codigo').maybeSingle();
  if (error) { await dialogoAvisar('Não consegui criar o lead: ' + error.message); return; }

  const { error: e2 } = await sb.from('postagem_interacoes')
    .update({ lead_id: data.id, tratado: true }).eq('id', id);
  if (e2) {
    await dialogoAvisar('O lead ' + (data.codigo || '') + ' foi criado, mas não consegui '
      + 'ligá-lo ao comentário: ' + e2.message);
  }
  await pgCarregarComentarios();
}

function pgDesenharRegua() {
  const linhas = pgRegua.map(r => `<tr>
    <td><b>${htm(PG_DIAS_SEMANA[r.dia_semana])}</b> · ${htm(String(r.hora).slice(0, 5))}</td>
    <td>${htm(PG_TIPOS[r.tipo] || r.tipo)}</td>
    <td class="tema">${htm(PG_TEMAS[r.tema] || r.tema)}</td>
    <td style="width:1%;white-space:nowrap">
      <button class="btn btn-claro" data-perm="postagens:editar" style="padding:4px 10px;font-size:12px"
        onclick="pgReguaLigar('${jsq(r.id)}', ${r.ativa ? 'false' : 'true'})">${r.ativa ? 'Pausar' : 'Reativar'}</button>
      <button class="btn btn-claro" data-perm="postagens:editar" style="padding:4px 10px;font-size:12px"
        onclick="pgReguaExcluir('${jsq(r.id)}')">Excluir</button></td>
  </tr>`).join('');
  document.getElementById('pg-regua').innerHTML = pgRegua.length
    ? `<table><thead><tr><th>Quando</th><th>Tipo</th><th>Tema</th><th></th></tr></thead>
       <tbody>${linhas}</tbody></table>
       <p style="font-size:12px;color:var(--texto-suave);margin:12px 2px 0;line-height:1.6">
         Os espaços abrem sozinhos de madrugada (28 dias à frente) — ou agora, pelo botão
         aí em cima. A régua nunca publica nada: ela só reserva o lugar.</p>`
    : `<p style="font-size:12.5px;color:var(--texto-suave);margin:8px 2px">Sem compromissos ainda.
       Crie o primeiro — por exemplo: terça 09:00, story, dica rápida.</p>`;
}

function pgMes(passo) {
  pgMes0 += passo;
  if (pgMes0 < 0) { pgMes0 = 11; pgAno--; }
  if (pgMes0 > 11) { pgMes0 = 0; pgAno++; }
  pgDiaSel = null;
  pgCarregar();
}

// ------------------------------------------------------------
// ações rápidas
// ------------------------------------------------------------
async function pgMudar(id, status) {
  const { error } = await sb.from('postagens')
    .update({ status, erro: null, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) { await dialogoAvisar('Não consegui: ' + error.message); return; }
  pgCarregar();
}

async function pgCriarEspacos() {
  const { data, error } = await sb.rpc('postagens_criar_espacos');
  if (error) { await dialogoAvisar('Não consegui: ' + error.message); return; }
  await dialogoAvisar(data ? data + ' espaço(s) criado(s).' : 'Nada novo — os espaços já estavam abertos.');
  pgCarregar();
}

// ------------------------------------------------------------
// a janela de postagem
// ------------------------------------------------------------
function pgNova(dia) {
  pgEdit = {
    id: null, tipo: 'feed', tema: 'dica', imovel_id: null,
    rede_instagram: true, rede_facebook: true, legenda: '', midias: [],
    status: 'rascunho',
    agendada_para: (dia || pgChaveDia(new Date())) + 'T18:30:00'
  };
  pgLaminas = [];
  pgAbrirJanela('Nova postagem');
}

function pgEditar(id) {
  const p = pgPosts.find(x => x.id === id) || pgFila.find(x => x.id === id);
  if (!p) return;
  pgEdit = { ...p };
  pgLaminas = (Array.isArray(p.midias) ? p.midias : []).map(c => ({ path: c }));
  pgAbrirJanela(p.status === 'vazia' ? 'Preencher o espaço' : 'Editar postagem');
}

function pgAbrirJanela(titulo) {
  pgRecusas = [];   // v1.404 — a linha vermelha é do arrastar da vez
  document.getElementById('pg-modal-titulo').textContent = titulo;
  const d = new Date(pgEdit.agendada_para);
  document.getElementById('pg-f-dia').value = pgChaveDia(d);
  document.getElementById('pg-f-hora').value = pgHoraDe(d);
  document.getElementById('pg-f-legenda').value = pgEdit.legenda || '';
  document.getElementById('pg-f-ig').checked = !!pgEdit.rede_instagram;
  document.getElementById('pg-f-fb').checked = !!pgEdit.rede_facebook;
  pgAjustarFacebook();   // v1.469 — Story trava o Facebook
  document.getElementById('pg-b-excluir').style.display = pgEdit.id ? '' : 'none';
  pgDesenharRodape();

  document.getElementById('pg-f-tema').innerHTML = Object.entries(PG_TEMAS).map(([v, r]) =>
    `<label class="${pgEdit.tema === v ? 'on' : ''}"><input type="radio" name="pg-tema" value="${v}"
      ${pgEdit.tema === v ? 'checked' : ''} onchange="pgTrocaTema(this.value)"> ${r}</label>`).join('');
  document.getElementById('pg-f-tipo').innerHTML = Object.entries(PG_TIPOS).map(([v, r]) =>
    `<label class="${pgEdit.tipo === v ? 'on' : ''}"><input type="radio" name="pg-tipo" value="${v}"
      ${pgEdit.tipo === v ? 'checked' : ''} onchange="pgTrocaTipo(this.value)"> ${r}</label>`).join('');
  pgDesenharSelectImovel();   // v1.485 — sem await: ele se completa sozinho

  pgTrocaTema(pgEdit.tema);
  pgMostrarTambem();
  pgDesenharLaminas();
  pgContar();
  const rodapeIA = document.getElementById('pg-ia-rodape');   // v1.486
  if (rodapeIA) rodapeIA.innerHTML = '';
  document.getElementById('pg-modal').classList.add('aberto');
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

/**
 * v1.485 — O SELECT "MONTAR A PARTIR DO IMÓVEL", QUANDO O IMÓVEL GRAVADO
 * JÁ NÃO ESTÁ NA LISTA.
 *
 * A lista só traz a carteira `Disponível` (pgCarregar), e é assim que
 * tem de ser: ninguém quer anunciar imóvel alugado. Só que a postagem
 * fica agendada dias à frente, e nesse meio-tempo o imóvel é alugado —
 * aí a opção dele SOME do select. Um `<select>` sem nenhuma opção
 * marcada não fica vazio: o navegador mostra a PRIMEIRA. A janela abria
 * dizendo IM-0007 numa postagem que era do IM-0020, e bastava clicar
 * "Montar" para a legenda e o imovel_id virarem do IM-0007 de verdade.
 *
 * Agora:
 *   1. a lista começa com um "— escolha o imóvel —" de valor vazio, que
 *      é o que aparece enquanto nada foi escolhido (postagem nova) e
 *      enquanto o banco não respondeu;
 *   2. se o imóvel gravado não está entre os Disponíveis, ele é buscado
 *      pelo id e entra como opção marcada, com a situação no rótulo
 *      ("· Alugada") — a postagem antiga continua legível e o Montar
 *      continua funcionando para ela;
 *   3. escolher no select passa a GRAVAR (pgEscolherImovel). Antes só o
 *      botão Montar gravava, então trocar o imóvel e salvar sem clicar
 *      Montar deixava a postagem no imóvel anterior.
 *
 * A busca é assíncrona e a janela pode ter sido fechada ou trocada
 * enquanto ela vinha — por isso o teste do `pgEdit` na volta.
 */
async function pgDesenharSelectImovel() {
  pgImovelForaDaLista = null;
  pgPintarSelectImovel();
  const id = pgEdit && pgEdit.imovel_id;
  if (!id || pgImoveis.some(i => i.id === id)) return;
  const { data } = await sb.from('imoveis')
    .select('id,codigo,endereco,bairro,cidade,tipo,valor_aluguel,situacao')
    .eq('id', id).maybeSingle();
  if (!pgEdit || pgEdit.imovel_id !== id) return;   // a janela mudou no meio do caminho
  pgImovelForaDaLista = data || { id, codigo: 'Imóvel', situacao: 'fora da carteira' };
  pgPintarSelectImovel();
}

/** v1.485 — o rótulo de uma linha do select. */
function pgRotuloImovel(i) {
  return [i.codigo, i.endereco, i.bairro].filter(Boolean).join(' · ');
}

/** v1.485 — pinta as opções com o que se sabe AGORA. */
function pgPintarSelectImovel() {
  const el = document.getElementById('pg-f-imovel');
  if (!el) return;
  const id = (pgEdit && pgEdit.imovel_id) || '';
  const linhas = ['<option value="">— escolha o imóvel —</option>'];
  if (pgImovelForaDaLista) {
    const i = pgImovelForaDaLista;
    linhas.push(`<option value="${htm(i.id)}">${htm(pgRotuloImovel(i))} · ${
      htm(i.situacao || 'fora da carteira')}</option>`);
  }
  pgImoveis.forEach(i =>
    linhas.push(`<option value="${htm(i.id)}">${htm(pgRotuloImovel(i))}</option>`));
  el.innerHTML = linhas.join('');
  // Sem opção correspondente, o navegador não deixa NENHUMA marcada
  // (selectedIndex -1, campo em branco) — é o que acontece no instante
  // entre abrir a janela e o banco responder. Volta para o placeholder:
  // melhor a janela não afirmar nada do que afirmar o imóvel errado.
  el.value = id;
  if (el.selectedIndex < 0) el.selectedIndex = 0;
  el.onchange = () => pgEscolherImovel(el.value);
}

/** v1.485 — escolher no select já grava; o Montar só escreve a legenda. */
function pgEscolherImovel(id) {
  if (pgEdit) pgEdit.imovel_id = id || null;
}

/** v1.485 — o imóvel de um id, esteja ele na carteira Disponível ou seja
 *  ele o gravado que saiu dela. */
function pgImovelPorId(id) {
  return pgImoveis.find(x => x.id === id)
    || (pgImovelForaDaLista && pgImovelForaDaLista.id === id ? pgImovelForaDaLista : null);
}

function pgFechar() {
  const m = document.getElementById('pg-modal');
  m.classList.remove('aberto');
  document.getElementById('pg-slides').classList.remove('sobre');
  pgSobreConta = 0; pgArrastaDe = -1; pgRecusas = [];
  pgImovelForaDaLista = null;
  pgEdit = null;
}

/** v1.452 — desenha o rodapé do modal a partir do status da postagem. */
function pgDesenharRodape() {
  const alvo = document.getElementById('pg-acoes');
  if (!alvo) return;
  const botoes = pgBotoesDoRodape(pgEdit.id ? pgEdit.status : 'rascunho');
  alvo.innerHTML = botoes.length
    ? botoes.map(([rot, st, cl]) =>
        `<button class="btn ${cl}" data-perm="postagens:editar"
          onclick="pgSalvar('${jsq(st)}')">${htm(rot)}</button>`).join('')
    : `<div class="pg-ja-saiu">Esta postagem já foi publicada. Dá para conferir o que saiu,
        mas não há o que salvar — republicar criaria um post novo no Instagram.</div>`;
}

function pgTrocaTema(v) {
  pgEdit.tema = v;
  document.getElementById('pg-origem').style.display = v === 'imovel' ? '' : 'none';
  pgLigarRadios();
}

function pgTrocaTipo(v) { pgEdit.tipo = v; pgLigarRadios(); pgDesenharLaminas(); pgMostrarTambem(); pgAjustarFacebook(); }

/** v1.469 — Story não vai para o Facebook: a Graph API não publica
 *  Story de Página (erro #3 "granular permission"). Ao escolher Story, o
 *  Facebook é desmarcado e travado; volta ao normal nos outros tipos. */
function pgAjustarFacebook() {
  const fb = document.getElementById('pg-f-fb');
  if (!fb) return;
  const soIG = pgEdit.tipo === 'story';
  if (soIG) fb.checked = false;
  fb.disabled = soIG;
  const lab = fb.closest('label');
  if (lab) {
    lab.style.opacity = soIG ? '.45' : '';
    lab.title = soIG ? 'Story só no Instagram — o Facebook não publica Story de Página pela API' : '';
  }
}

/** v1.400 — "Publicar também nos stories". Só em postagem NOVA de
 *  feed/carrossel: na edição, cada salvar criaria mais um story. */
function pgMostrarTambem() {
  const cx = document.getElementById('pg-cx-tambem');
  if (!cx) return;
  const cabe = !pgEdit.id && pgEdit.tipo !== 'story';
  cx.style.display = cabe ? '' : 'none';
  if (!cabe) { const c = document.getElementById('pg-f-tambem-story'); if (c) c.checked = false; }
}

/** repinta o `.on` dos grupos de rádio (o CSS da casa marca o escolhido) */
function pgLigarRadios() {
  document.querySelectorAll('#pg-modal .orc-radios label').forEach(l => {
    const i = l.querySelector('input');
    if (i) l.classList.toggle('on', i.checked);
  });
}

/** v1.404 — a faixa inteira virou o alvo de soltar, então ela desenha
 *  três coisas além das lâminas: o convite (quando está vazia), o "+"
 *  com o lembrete de que dá para arrastar e colar, e a linha vermelha
 *  do que foi recusado no último arrastar. */
function pgDesenharLaminas() {
  const alvo = document.getElementById('pg-slides');
  const abrir = "document.getElementById('pg-arquivos').click()";
  const capa = i => i === 0 && pgLaminas.length > 1 ? '<span class="capa">capa</span>' : '';
  let html = pgLaminas.map((l, i) => {
    const url = l.url || pgUrlMidia(l.path);
    // v1.405 — O GESTO TROCOU DE DONO. O clique na imagem AMPLIA; quem
    // tira é o × do canto. Antes o clique tirava: o gesto grande e fácil
    // fazia a coisa destrutiva, sem confirmação e sem desfazer. O × não
    // entra no htm(): ele é SVG, e htm() o transformaria em texto na tela.
    return `<div class="pg-slide" draggable="true" data-i="${i}"
      style="background-image:url('${htm(pgUrlCss(url))}');background-size:cover;
      background-position:center" title="clique para ampliar · arraste para mudar a ordem"
      onclick="pgAmpliar(${i})">${capa(i)}<span class="pg-tirar" title="tirar esta lâmina"
      onclick="event.stopPropagation();pgTirarLamina(${i})">${PG_ICONE_TIRAR}</span></div>`;
  }).join('');

  html += pgLaminas.length
    ? `<div class="pg-mais" onclick="${abrir}">+</div>
       <div class="pg-solta-dica mini" onclick="${abrir}">ou arraste mais para cá · Ctrl+V cola</div>`
    : `<div class="pg-solta-dica" onclick="${abrir}">${PG_ICONE_SOLTAR}
       <span><b>Arraste as fotos aqui</b> — ou clique para escolher</span></div>`;

  if (pgRecusas.length) html += `<div class="pg-recusa">${htm(pgRecusas.join(' · '))}</div>`;

  alvo.innerHTML = html;
  document.getElementById('pg-conta-laminas').textContent =
    pgLaminas.length ? '· ' + pgLaminas.length + (pgEdit.tipo === 'carrossel' ? ' de 10' : '') : '';
  pgPrevia();
}

/** o portão único: seletor de arquivos, arrastar do Finder e Ctrl+V
 *  chegam todos aqui, e a peneira é a mesma para os três. */
function pgArquivosEscolhidos(arquivos) {
  const { aceitos, recusas } = pgPeneirarArquivos(arquivos, pgLaminas.length);
  aceitos.forEach(f => pgLaminas.push({ file: f, url: URL.createObjectURL(f) }));
  pgRecusas = recusas;
  const inp = document.getElementById('pg-arquivos');
  if (inp) inp.value = '';
  pgDesenharLaminas();
}

function pgTirarLamina(i) { pgLaminas.splice(i, 1); pgDesenharLaminas(); }

// ============================================================
// O VISOR DA LÂMINA (v1.405)
//
// A lâmina no compositor tem 56 px: dá para reconhecer a arte, não para
// LER o que está escrito nela — e ler é exatamente o que se precisa
// fazer antes de aprovar uma postagem. O visor abre a lâmina em tamanho
// de leitura por cima do modal, anda pelo carrossel inteiro e fecha sem
// mexer em nada do que estava sendo editado.
//
// Ele não sabe de onde veio a imagem: `l.url` é a lâmina recém-escolhida
// (blob:, ainda não enviada) e `l.path` é a que já está no balde. As
// duas chegam aqui pelo mesmo caminho.
// ============================================================
let pgVisorEm = 0;

function pgVisorAberto() {
  const v = document.getElementById('pg-visor');
  return !!v && v.classList.contains('aberto');
}

function pgAmpliar(i) {
  if (!pgLaminas.length) return;
  pgVisorEm = i;
  document.getElementById('pg-visor').classList.add('aberto');
  pgVisorPintar();
}

function pgVisorPintar() {
  const l = pgLaminas[pgVisorEm];
  if (!l) { pgVisorFechar(); return; }
  // O src vai por PROPRIEDADE, não montando string de HTML: assim não
  // existe escape para errar, e a peneira do pgUrlCss não faz falta.
  document.getElementById('pg-visor-img').src = l.url || pgUrlMidia(l.path);
  document.getElementById('pg-visor-conta').textContent =
    (pgVisorEm + 1) + ' de ' + pgLaminas.length
    + (pgVisorEm === 0 && pgLaminas.length > 1 ? ' · capa' : '');
  // Uma lâmina só (feed, story) não tem por onde andar.
  const sozinha = pgLaminas.length < 2;
  document.querySelectorAll('#pg-visor .pg-visor-seta')
    .forEach(b => { b.style.display = sozinha ? 'none' : ''; });
  document.getElementById('pg-visor-dica').style.display = sozinha ? 'none' : '';
}

function pgVisorAndar(d) {
  if (pgLaminas.length < 2) return;
  pgVisorEm = (pgVisorEm + d + pgLaminas.length) % pgLaminas.length;
  pgVisorPintar();
}

function pgVisorFechar() {
  const v = document.getElementById('pg-visor');
  if (v) v.classList.remove('aberto');
}

// O TECLADO DO VISOR ENTRA POR `window` EM CAPTURA — não por `document`.
//
// O base.js já tem um Escape em captura no `document`: a guarda da
// janela mexida, que pergunta "você alterou dados e não salvou". A fase
// de captura desce window → document, então este tratador roda ANTES
// dela. Sem isso, apertar Esc para fechar o visor faria a pergunta da
// guarda e, respondendo sim, fecharia o compositor inteiro.
//
// A guarda do `typeof window` não é enfeite: este arquivo é carregado
// pela bateria no Node, onde `window` não existe. Sem ela o require
// estoura na primeira linha e NENHUMA prova do postagens.js roda —
// inclusive as que já existiam. (Faltou na v1.405; corrigido aqui.)
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => {
    if (!pgVisorAberto()) return;
    if (e.key === 'Escape') pgVisorFechar();
    else if (e.key === 'ArrowRight') pgVisorAndar(1);
    else if (e.key === 'ArrowLeft') pgVisorAndar(-1);
    else return;
    e.stopImmediatePropagation();
    e.preventDefault();
  }, true);
}

// ------------------------------------------------------------
// v1.404 — ARRASTAR E SOLTAR
//
// Três gestos entram pela mesma porta (pgArquivosEscolhidos):
//   1. arquivo vindo de FORA — a janela inteira aceita a soltura, e
//      quem acende é sempre a faixa das lâminas. O alvo grande é o
//      ponto: antes só existia um quadradinho de 56px para clicar.
//   2. Ctrl+V — foto copiada do Conversor de Imagens ou de um print
//      entra sem passar pelo Finder. Texto colado continua sendo texto.
//   3. arrastar uma LÂMINA para outro lugar — só reordena.
//
// O que separa o gesto 1 do gesto 3 é o dataTransfer: arquivo de fora
// traz o tipo 'Files', arrasto de dentro traz 'text/plain'. Sem essa
// peneira, arrastar uma lâmina acenderia a faixa como se fosse upload.
// ------------------------------------------------------------
function pgTemArquivo(e) {
  const t = e.dataTransfer && e.dataTransfer.types;
  return !!t && [].slice.call(t).indexOf('Files') >= 0;
}

function pgLigarSoltar() {
  if (pgSoltaLigada) return;
  const modal = document.getElementById('pg-modal');
  const faixa = document.getElementById('pg-slides');
  if (!modal || !faixa) return;
  pgSoltaLigada = true;

  // --- 1. o arquivo que vem de fora ---
  // dragenter/dragleave disparam de novo a cada filho por onde o
  // ponteiro passa; o contador é o que impede a faixa de piscar.
  modal.addEventListener('dragenter', e => {
    if (!pgTemArquivo(e)) return;
    e.preventDefault(); pgSobreConta++; faixa.classList.add('sobre');
  });
  modal.addEventListener('dragover', e => {
    if (!pgTemArquivo(e)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  });
  modal.addEventListener('dragleave', e => {
    if (!pgTemArquivo(e)) return;
    if (--pgSobreConta <= 0) { pgSobreConta = 0; faixa.classList.remove('sobre'); }
  });
  modal.addEventListener('drop', e => {
    if (!pgTemArquivo(e)) return;
    e.preventDefault(); pgSobreConta = 0; faixa.classList.remove('sobre');
    pgArquivosEscolhidos(e.dataTransfer.files);
  });

  // --- 2. reordenar as lâminas ---
  faixa.addEventListener('dragstart', e => {
    const s = e.target.closest && e.target.closest('.pg-slide');
    if (!s) return;
    pgArrastaDe = Number(s.dataset.i);
    s.classList.add('arrastando');
    e.dataTransfer.effectAllowed = 'move';
    // o Firefox só começa o arrasto se houver algum dado no pacote
    e.dataTransfer.setData('text/plain', String(pgArrastaDe));
  });
  faixa.addEventListener('dragover', e => {
    if (pgArrastaDe < 0) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    const s = e.target.closest && e.target.closest('.pg-slide');
    faixa.querySelectorAll('.pg-slide').forEach(x => x.classList.remove('marca'));
    if (s && Number(s.dataset.i) !== pgArrastaDe) s.classList.add('marca');
  });
  faixa.addEventListener('drop', e => {
    if (pgArrastaDe < 0) return;
    e.preventDefault(); e.stopPropagation();
    const s = e.target.closest && e.target.closest('.pg-slide');
    // soltar no vazio (no "+", na dica) é mandar para o fim da fila
    const para = s ? Number(s.dataset.i) : pgLaminas.length;
    pgLaminas = pgMoverLamina(pgLaminas, pgArrastaDe, para);
    pgArrastaDe = -1;
    pgDesenharLaminas();
  });
  faixa.addEventListener('dragend', () => {
    pgArrastaDe = -1;
    faixa.querySelectorAll('.pg-slide').forEach(x =>
      x.classList.remove('arrastando', 'marca'));
  });

  // --- 3. Ctrl+V ---
  document.addEventListener('paste', e => {
    if (!pgEdit || !modal.classList.contains('aberto')) return;
    const cd = e.clipboardData;
    if (!cd) return;
    let arquivos = [].slice.call(cd.files || []);
    if (!arquivos.length && cd.items)
      [].slice.call(cd.items).forEach(it => {
        if (it.kind !== 'file') return;
        const f = it.getAsFile();
        if (f) arquivos.push(f);
      });
    if (!arquivos.length) return;   // colar texto na legenda segue igual
    e.preventDefault();
    pgArquivosEscolhidos(arquivos);
  });
}

function pgContar() {
  const n = document.getElementById('pg-f-legenda').value.length;
  const el = document.getElementById('pg-f-conta');
  el.textContent = n + ' / ' + PG_LEGENDA_MAX;
  el.style.color = n > PG_LEGENDA_MAX ? 'var(--erro)' : '';
  pgPrevia();
}

/** a prévia no telefone: primeira lâmina + começo da legenda */
// ============================================================
// O CORTE DA ARTE NA MOLDURA DA REDE (v1.451)
//
// Feed e carrossel são 4:5. Story é 9:16. Uma arte 4:5 posta como story
// perde 30% da largura — 15% de cada lado — e é isso que come o
// logotipo à direita e o começo do texto à esquerda.
//
// A prévia agora mostra o corte acontecendo, porque a moldura tem a
// proporção certa e a imagem preenche. Estas funções só põem o NÚMERO
// em cima do que já se vê.
// ============================================================

/** A proporção (largura ÷ altura) da moldura de cada tipo. */
function pgProporcaoDo(tipo) { return tipo === 'story' ? 9 / 16 : 4 / 5; }

/**
 * Quanto da arte fica de fora ao preencher uma moldura de outra
 * proporção (o `cover` do CSS, que é como as duas redes exibem).
 *
 * Arte mais LARGA que a moldura perde nos lados; mais ALTA, perde em
 * cima e embaixo. Abaixo de 1% não vale aviso — é arredondamento de
 * pixel, não corte.
 *
 * @returns {{eixo:'largura'|'altura', fracao:number}|null}
 */
function pgCorteDaArte(largura, altura, proporcaoAlvo) {
  if (!largura || !altura || !proporcaoAlvo) return null;
  const arte = largura / altura;
  const perda = arte > proporcaoAlvo
    ? 1 - proporcaoAlvo / arte      // sobra largura: corta dos lados
    : 1 - arte / proporcaoAlvo;     // sobra altura: corta em cima e embaixo
  if (!(perda > 0.01)) return null;
  return { eixo: arte > proporcaoAlvo ? 'largura' : 'altura', fracao: perda };
}

/** "4:5", "9:16", "1:1" — a proporção em números redondos, para o aviso. */
function pgProporcaoEmTexto(largura, altura) {
  if (!largura || !altura) return '';
  const mdc = (a, b) => b ? mdc(b, a % b) : a;
  const d = mdc(largura, altura);
  let l = largura / d, a = altura / d;
  if (l > 40 || a > 40) {           // 1001x1250 não vira "1001:1250"
    const r = largura / altura;
    const perto = [[1, 1], [4, 5], [9, 16], [3, 4], [2, 3], [16, 9]]
      .sort((x, y) => Math.abs(x[0] / x[1] - r) - Math.abs(y[0] / y[1] - r))[0];
    [l, a] = perto;
  }
  return l + ':' + a;
}

/** O tamanho real do arquivo, medido uma vez por endereço. */
const pgTamanhoDaArte = new Map();
function pgMedirArte(url) {
  if (pgTamanhoDaArte.has(url)) return Promise.resolve(pgTamanhoDaArte.get(url));
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => {
      const t = { largura: img.naturalWidth, altura: img.naturalHeight };
      pgTamanhoDaArte.set(url, t);
      ok(t);
    };
    img.onerror = () => ok(null);
    img.src = url;
  });
}

// A prévia é redesenhada a cada tecla da legenda e a cada troca de
// tipo. A medida da arte volta depois, então ela carimba a vez em que
// foi pedida: se a prévia já foi redesenhada, o aviso é descartado em
// vez de pousar na tela errada.
let pgPreviaVez = 0;

function pgAvisarCorte(url, tipo, vez) {
  pgMedirArte(url).then(t => {
    if (!t || vez !== pgPreviaVez) return;
    const c = pgCorteDaArte(t.largura, t.altura, pgProporcaoDo(tipo));
    const moldura = document.querySelector('#pg-previa .midia');
    if (!c || !moldura) return;
    const lados = c.eixo === 'largura' ? 'de cada lado' : 'em cima e embaixo';
    moldura.insertAdjacentHTML('beforeend',
      `<div class="pg-corte">a arte é ${htm(pgProporcaoEmTexto(t.largura, t.altura))} · `
      + `este formato corta <b>${Math.round(c.fracao * 100)}% da ${c.eixo}</b>`
      + `<br>${Math.round(c.fracao * 50)}% ${lados}</div>`);
  });
}

function pgPrevia() {
  pgPreviaVez++;
  const alvo = document.getElementById('pg-previa');
  if (!pgLaminas.length) {
    alvo.innerHTML = '<div class="pg-previa-vazia">a prévia aparece quando a mídia subir</div>';
    return;
  }
  const url = pgLaminas[0].url || pgUrlMidia(pgLaminas[0].path);
  const leg = document.getElementById('pg-f-legenda').value.slice(0, 110);
  // v1.451 — a moldura ganha a proporção do tipo, e o `cover` passa a
  // mostrar o corte de verdade em vez de escondê-lo numa altura fixa.
  const midia = `<div class="midia${pgEdit.tipo === 'story' ? ' eh-story' : ''}"
    style="background-image:url('${htm(pgUrlCss(url))}');
    background-size:cover;background-position:center">${
    pgEdit.tipo === 'carrossel' ? '<span class="pg-carr-selo">1/' + pgLaminas.length + '</span>' : ''}</div>`;
  alvo.innerHTML = pgEdit.tipo === 'story'
    ? `<div class="pg-story-topo"><div class="barra"><i></i></div>
        <div class="quem"><span class="pg-avatar">M</span> morali.imoveis</div></div>${midia}`
    : `<div class="pg-feed-cab"><span class="pg-avatar">M</span><b>morali.imoveis</b></div>${midia}
       ${pgEdit.tipo === 'carrossel' ? '<div class="pg-bolinhas">'
          + pgLaminas.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('') + '</div>' : ''}
       <div class="pg-feed-pe"><div class="txt"><b>morali.imoveis</b> ${htm(leg)}${
         leg.length >= 110 ? '…' : ''}</div></div>`;

  // O aviso do corte vem depois, quando a medida do arquivo chegar.
  pgAvisarCorte(url, pgEdit.tipo, pgPreviaVez);
}

function pgMontarDoImovel() {
  const id = document.getElementById('pg-f-imovel').value;
  const i = pgImovelPorId(id);   // v1.485 — acha também o gravado que saiu da lista
  if (!i) { dialogoAvisar('Escolha o imóvel na lista.'); return; }
  pgEdit.imovel_id = id;
  document.getElementById('pg-f-legenda').value = pgLegendaDoImovel(i);
  pgContar();
}

// ------------------------------------------------------------
// salvar
// ------------------------------------------------------------
// ------------------------------------------------------------
// v1.486 — ESCREVER A LEGENDA COM IA
//
// O botão no rótulo da legenda manda as lâminas (reduzidas aqui, no
// navegador — nada sobe ao Storage) e o id do imóvel para a Edge
// Function `postagens-legenda`, que lê a ficha SEM o endereço e chama a
// IA no padrão da aba Configuração → Legendas com IA. O texto cai no
// campo; gravar continua sendo o botão de sempre. Se a janela trocar
// enquanto a IA pensa, a resposta é descartada (teste do `pgEdit`).
// ------------------------------------------------------------
const PG_IA_LADO = 1024;          // maior lado da lâmina que vai à IA
const PG_IA_MAX_IMAGENS = 10;

/** O que impede a IA de escrever, em uma frase — ou '' se pode. Pura. */
function pgIAProblema(edit, laminas) {
  if (!edit) return 'Abra uma postagem primeiro.';
  if (edit.tema === 'imovel' && !edit.imovel_id) {
    return 'Escolha o imóvel na lista "Montar a partir do imóvel" — é dele que a IA tira os dados.';
  }
  if (edit.tema !== 'imovel' && !(laminas || []).length) {
    return 'Solte pelo menos uma lâmina: nos temas Dica e Institucional a IA escreve lendo a arte.';
  }
  return '';
}

/** A frase do rodapé da legenda depois que a IA escreveu. Pura. */
function pgIAResumo(resp, tema) {
  const n = Number(resp && resp.imagens) || 0;
  const fotos = n ? n + (n === 1 ? ' lâmina' : ' lâminas') : 'nenhuma lâmina';
  const de = tema === 'imovel'
    ? fotos + ' e da ficha' + (resp && resp.codigo ? ' do ' + resp.codigo : ' do imóvel')
    : fotos;
  return 'Escrita pela IA a partir de ' + de + ' · você pode editar à vontade';
}

/** Reduz uma lâmina (File ou Blob) para JPEG de até PG_IA_LADO px, em data-url. */
function pgIAReduzir(blob) {
  return new Promise((ok, falhou) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); falhou(new Error('Não consegui ler uma das lâminas.')); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      const escala = Math.min(1, PG_IA_LADO / Math.max(img.width, img.height));
      const tela = document.createElement('canvas');
      tela.width = Math.max(1, Math.round(img.width * escala));
      tela.height = Math.max(1, Math.round(img.height * escala));
      tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height);
      ok(tela.toDataURL('image/jpeg', 0.82));
    };
    img.src = url;
  });
}

/** As lâminas em data-url: as novas vêm do arquivo, as gravadas do Storage. */
async function pgIALaminas(laminas) {
  const saida = [];
  for (const l of laminas.slice(0, PG_IA_MAX_IMAGENS)) {
    let blob = l.file;
    if (!blob && l.path) {
      const r = await fetch(pgUrlMidia(l.path));
      if (!r.ok) throw new Error('Não consegui baixar uma lâmina já gravada.');
      blob = await r.blob();
    }
    if (blob) saida.push(await pgIAReduzir(blob));
  }
  return saida;
}

async function pgLegendaIA(botao) {
  const problema = pgIAProblema(pgEdit, pgLaminas);
  if (problema) { await dialogoAvisar(problema); return; }
  const campo = document.getElementById('pg-f-legenda');
  if (campo.value.trim() && !(await dialogoPerguntar({ texto: 'Substituir a legenda atual pela escrita pela IA?', ok: 'Substituir' }))) return;

  const rodape = document.getElementById('pg-ia-rodape');
  const rotulo = botao.innerHTML;
  botao.disabled = true;
  botao.innerHTML = '<span class="gira"></span> Lendo as lâminas e a ficha…';
  if (rodape) rodape.innerHTML = '';
  const vez = pgEdit;   // a janela pode trocar enquanto a IA pensa

  try {
    const imagens = await pgIALaminas(pgLaminas);
    const { data: sessao } = await sb.auth.getSession();
    const r = await fetch(SUPABASE_URL + '/functions/v1/postagens-legenda', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + (sessao && sessao.session ? sessao.session.access_token : '')
      },
      body: JSON.stringify({
        empresa: pgEmpresa(), tema: vez.tema, tipo: vez.tipo,
        imovel_id: vez.tema === 'imovel' ? vez.imovel_id : null, imagens
      })
    });
    const resp = await r.json().catch(() => ({}));
    if (!r.ok || resp.erro) throw new Error(resp.erro || ('HTTP ' + r.status));
    if (pgEdit !== vez) return;   // fechou ou abriu outra no meio: descarta
    campo.value = resp.legenda || '';
    pgContar();
    if (rodape) {
      rodape.innerHTML = '<span class="pt"></span>' + htm(pgIAResumo(resp, vez.tema))
        + '<span class="vao"></span><a href="admin.html?aba=legendas">ajustar o padrão</a>';
    }
  } catch (e) {
    await dialogoAvisar('Não deu para escrever a legenda: ' + e.message);
  } finally {
    botao.disabled = false;
    botao.innerHTML = rotulo;
  }
}

// ------------------------------------------------------------
// salvar
// ------------------------------------------------------------
async function pgSalvar(statusPedido) {
  const dia = document.getElementById('pg-f-dia').value;
  const hora = document.getElementById('pg-f-hora').value || '18:30';
  const linha = {
    empresa_id: pgEmpresa(),
    agendada_para: new Date(dia + 'T' + hora).toISOString(),
    tipo: pgEdit.tipo, tema: pgEdit.tema,
    imovel_id: pgEdit.tema === 'imovel' ? (pgEdit.imovel_id || null) : null,
    rede_instagram: document.getElementById('pg-f-ig').checked,
    rede_facebook: pgEdit.tipo === 'story' ? false : document.getElementById('pg-f-fb').checked,
    legenda: document.getElementById('pg-f-legenda').value.trim(),
    status: statusPedido, erro: null,
    atualizado_em: new Date().toISOString()
  };
  if (!linha.empresa_id) { await dialogoAvisar('Sessão sem empresa — recarregue a página.'); return; }

  const problemas = pgValidar(linha, pgLaminas, statusPedido);
  if (problemas.length) { await dialogoAvisar(problemas.join('\n')); return; }

  // sobe só o que é arquivo novo; o que já era caminho fica como está
  const caminhos = [];
  for (const l of pgLaminas) {
    if (l.path) { caminhos.push(l.path); continue; }
    const nome = linha.empresa_id + '/' + Date.now() + '-'
      + Math.random().toString(36).slice(2, 8)
      + (l.file.type === 'image/png' ? '.png' : '.jpg');
    const { error } = await sb.storage.from('postagens')
      .upload(nome, l.file, { contentType: l.file.type });
    if (error) { await dialogoAvisar('A mídia não subiu: ' + error.message); return; }
    caminhos.push(nome);
  }
  linha.midias = caminhos;

  const q = pgEdit.id
    ? sb.from('postagens').update(linha).eq('id', pgEdit.id)
    : sb.from('postagens').insert(linha);
  const { error } = await q;
  if (error) { await dialogoAvisar('Não consegui salvar: ' + error.message); return; }

  // v1.400 — a IRMÃ DE STORY. Duas publicações separadas de propósito:
  // cada uma com seu estado, seu erro escrito e seu "Tentar de novo",
  // e o publicador continua sem saber que elas se conhecem. O story
  // leva só a capa (story é uma mídia) e dispensa a legenda, que o
  // Instagram ignora em stories.
  const tb = document.getElementById('pg-f-tambem-story');
  if (tb && tb.checked && !pgEdit.id && linha.tipo !== 'story') {
    const { error: e2 } = await sb.from('postagens').insert({
      ...linha, tipo: 'story', legenda: null, midias: [caminhos[0]]
    });
    if (e2) await dialogoAvisar('O feed foi salvo, mas o story irmão não: ' + e2.message);
  }
  pgFechar();
  pgCarregar();
}

async function pgExcluir() {
  if (!pgEdit || !pgEdit.id) return;
  if (!(await dialogoPerguntar({ texto: 'Excluir esta postagem? Se ela nasceu da régua, o espaço volta amanhã de madrugada.', ok: 'Excluir', perigo: true }))) return;
  const { error } = await sb.from('postagens').delete().eq('id', pgEdit.id);
  if (error) { await dialogoAvisar('Não consegui excluir: ' + error.message); return; }
  pgFechar();
  pgCarregar();
}

// ------------------------------------------------------------
// a régua
// ------------------------------------------------------------
function pgReguaNova() {
  document.getElementById('pg-g-dia').innerHTML = PG_DIAS_SEMANA.map((d, i) =>
    `<option value="${i}" ${i === 2 ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('pg-modal-regua').classList.add('aberto');
}
function pgReguaFechar() { document.getElementById('pg-modal-regua').classList.remove('aberto'); }

async function pgReguaSalvar() {
  const { error } = await sb.from('postagem_regua').insert({
    empresa_id: pgEmpresa(),
    dia_semana: Number(document.getElementById('pg-g-dia').value),
    hora: document.getElementById('pg-g-hora').value || '18:30',
    tipo: document.getElementById('pg-g-tipo').value,
    tema: document.getElementById('pg-g-tema').value
  });
  if (error) { await dialogoAvisar('Não consegui salvar: ' + error.message); return; }
  pgReguaFechar();
  pgCarregar();
}

async function pgReguaLigar(id, ativa) {
  const { error } = await sb.from('postagem_regua').update({ ativa }).eq('id', id);
  if (error) { await dialogoAvisar('Não consegui: ' + error.message); return; }
  pgCarregar();
}

async function pgReguaExcluir(id) {
  if (!(await dialogoPerguntar({ texto: 'Excluir este compromisso? Os espaços vazios que ele já criou continuam '
    + 'no calendário — apague-os lá se não quiser mais.', ok: 'Excluir', perigo: true }))) return;
  const { error } = await sb.from('postagem_regua').delete().eq('id', id);
  if (error) { await dialogoAvisar('Não consegui: ' + error.message); return; }
  pgCarregar();
}

// ============================================================
// v1.591 — SUBIR EM LOTE
//
// Até aqui, uma leva grande de postagens (26, 90, 79, 79…) só entrava
// no CRM por um script no Mac do administrador, com a chave de serviço
// do banco. Um usuário comum não faz isso. Agora a tela recebe a pasta
// inteira, agrupa as artes em postagens, distribui pelo calendário com
// a regra escolhida (a partir de quando, quais horários, quais dias) e
// sobe uma a uma pelo navegador, com o login da pessoa — o RLS e o
// bucket valem iguais à postagem avulsa.
//
// Três passos numa janela só: (1) arquivos, regra e como nascem;
// (2) a conferência, linha a linha, antes de gravar; (3) o envio, com
// retomada. As funções que DECIDEM (agrupar, distribuir, ler a
// planilha de legendas, ordenar) são puras: a bateria roda no Node.
//
// A retomada é pela MARCA, não pela janela de datas: cada postagem do
// lote grava `origem_arquivo` (a pasta ou o arquivo de onde veio) e
// `lote_id`. Soltar a mesma pasta de novo mostra "já está no
// calendário" para o que existe e cria só o que falta — a lição do
// script (a pergunta "há algo nesta janela?" travava a segunda
// tentativa para sempre).
// ============================================================
const LT_HORARIOS_PADRAO = ['12:00', '18:00', '20:00'];
const LT_HORIZONTE_DIAS = 400;     // até onde a distribuição procura vaga
const LT_TENTATIVAS = 3;           // por arquivo, antes de a linha virar falha
const LT_FITA_MAX = 11;            // miniaturas na fita do passo 1
const LT_TABELA_MAX = 400;         // linhas desenhadas na conferência

let ltItens = [];                  // o que foi lido: [{caminho, nome, tipo, tamanho, file}]
let ltPostagens = [];              // os grupos, uma postagem futura cada
let ltRecusas = [];                // o que não entrou, escrito
let ltLegendas = new Map();        // da planilha legendas.csv
let ltLegendasArq = '';            // o nome do csv lido
let ltRaiz = '';                   // a pasta solta, se houver
let ltHorarios = LT_HORARIOS_PADRAO.slice();
let ltDias = [1, 2, 3, 4, 5, 6];   // 0 = domingo
let ltPulados = [];                // os horários pulados na última distribuição
let ltSubindo = false, ltParar = false, ltSubiuAlgo = false;
let ltLoteId = null;
let ltSoltaLigada = false;
const ltMedidas = new Map();       // File → {largura, altura}
const ltUrls = new Map();          // File → blob: (miniaturas)

// ------------------------------------------------------------
// as funções puras
// ------------------------------------------------------------
function ltNomeBase(nome) { return String(nome || '').replace(/\.[^.]+$/, ''); }
function ltSemAcento(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

/** 'pasta/Post-001.JPG' → 'post-001': a chave que casa arte com legenda. */
function ltChaveLegenda(nome) {
  const so = String(nome || '').split('/').pop();
  return ltSemAcento(ltNomeBase(so)).trim().toLowerCase();
}

function ltComparaNatural(a, b) {
  return String(a).localeCompare(String(b), 'pt', { numeric: true, sensitivity: 'base' });
}

/** O tipo MIME, pela extensão quando o navegador não diz (arrasto de pasta). */
function ltTipoDoArquivo(nome, tipo) {
  if (/^image\/(jpeg|png)$/.test(tipo || '')) return tipo;
  if (/\.jpe?g$/i.test(nome || '')) return 'image/jpeg';
  if (/\.png$/i.test(nome || '')) return 'image/png';
  return tipo || '';
}

function ltEhOculto(caminho) {
  return String(caminho || '').split('/').some(p => p.charAt(0) === '.' || p === '__MACOSX');
}

/**
 * AGRUPAR OS ARQUIVOS EM POSTAGENS. Pura.
 *
 *   itens: [{caminho, nome, tipo, tamanho, file?}]  (caminho relativo, com '/')
 *   → { postagens, recusas, csv, raiz }
 *
 * As regras, na ordem:
 *   · pasta solta: se TODO caminho começa pela mesma pasta, ela é a raiz
 *     e sai do nome;
 *   · subpasta = carrossel (as fotos dela, na ordem do nome; a 1ª é a capa);
 *   · `01.jpg, 02.jpg…` soltos na pasta solta = a pasta solta é UM carrossel;
 *   · `nome-01.jpg, nome-02.jpg…` no mesmo nível = carrossel, MAS só se a
 *     família tem o 01 e é seguida (01, 02, 03…). `foto-10…foto-79` são
 *     79 banners, não um carrossel de 70 — foi a leva institucional;
 *   · arquivo sozinho = feed (a proporção 9:16 vira story depois, na
 *     medição — isso é assíncrono e fica fora daqui);
 *   · `.csv` é a planilha de legendas, não uma arte; `.DS_Store` e
 *     `__MACOSX` são ignorados;
 *   · a peneira é a MESMA do compositor (pgPeneirarArquivos): JPG/PNG,
 *     teto de MB, 10 lâminas. As recusas voltam escritas.
 */
function ltAgruparArquivos(itens) {
  const lista = (itens || []).filter(i => i && i.caminho && !ltEhOculto(i.caminho));
  let raiz = '';
  const primeiros = new Set(lista.map(i => i.caminho.split('/')[0]));
  if (primeiros.size === 1 && lista.every(i => i.caminho.indexOf('/') > 0)) raiz = [...primeiros][0];
  const csv = lista.find(i => /\.csv$/i.test(i.caminho)) || null;

  const grupos = new Map();
  const recusas = [];
  lista.forEach(i => {
    if (/\.csv$/i.test(i.caminho)) return;
    const rel = raiz ? i.caminho.slice(raiz.length + 1) : i.caminho;
    const partes = rel.split('/');
    const nome = partes[partes.length - 1];
    const tipo = ltTipoDoArquivo(nome, i.tipo);
    if (!/^image\/(jpeg|png)$/.test(tipo)) { recusas.push(rel + ' — só JPG ou PNG'); return; }
    let chave, ehPasta = false, numero = -1;
    if (partes.length > 1) { chave = partes.slice(0, -1).join('/'); ehPasta = true; }
    else {
      const m = nome.match(/^(.+?)[-_ ](\d{2})\.(jpe?g|png)$/i);
      // `01.jpg, 02.jpg…` soltos na raiz: a pasta solta ERA o carrossel
      // (é como as pastas de carrossel dele são por dentro)
      const m2 = !m && nome.match(/^(\d{2})\.(jpe?g|png)$/i);
      if (m) { chave = m[1]; numero = Number(m[2]); }
      else if (m2) { chave = raiz || 'carrossel'; numero = Number(m2[1]); }
      else chave = nome;
    }
    const g = grupos.get(chave) || { nome: chave, ehPasta, arquivos: [] };
    g.arquivos.push({ ...i, nome, tipo, rel, numero });
    grupos.set(chave, g);
  });

  // a família `-01, -02…` só é carrossel se tem o 01 e é seguida;
  // senão cada arquivo volta a ser um banner sozinho
  const finais = [];
  grupos.forEach(g => {
    if (g.ehPasta || g.arquivos.length < 2) { finais.push(g); return; }
    const ns = g.arquivos.map(a => a.numero).sort((a, b) => a - b);
    const seguida = ns[0] === 1 && ns.every((n, i) => n === i + 1);
    if (seguida && ns.length <= PG_LAMINAS_MAX) { finais.push(g); return; }
    g.arquivos.forEach(a => finais.push({ nome: a.nome, ehPasta: false, arquivos: [a] }));
  });

  const postagens = [];
  finais.sort((a, b) => ltComparaNatural(a.nome, b.nome)).forEach(g => {
    g.arquivos.sort((a, b) => ltComparaNatural(a.nome, b.nome));
    const { aceitos, recusas: r } = pgPeneirarArquivos(
      g.arquivos.map(a => ({ name: a.rel, type: a.tipo, size: a.tamanho, _item: a })), 0);
    r.forEach(x => recusas.push(x));
    if (!aceitos.length) return;
    const arquivos = aceitos.map(a => a._item);
    postagens.push({
      nome: g.nome, origem: (raiz && g.nome !== raiz ? raiz + '/' : '') + g.nome, arquivos,
      tipo: arquivos.length > 1 ? 'carrossel' : 'feed',
      legenda: '', quando: null, vazioId: null, pulados: [], jaExiste: null,
      estado: 'lida', erro: '', id: null
    });
  });
  return { postagens, recusas, csv, raiz };
}

/** Arte 9:16 é story; o resto é feed. Pura. */
function ltTipoPorProporcao(largura, altura) {
  if (!largura || !altura) return 'feed';
  return Math.abs(largura / altura - 9 / 16) < 0.03 ? 'story' : 'feed';
}

/**
 * A ORDEM DAS POSTAGENS. Pura.
 *   'nome'       → como veio (o agrupamento já ordena pelo nome);
 *   'alternar'   → o tipo em menor número (quase sempre o carrossel) é
 *                  espalhado por igual entre os outros — 6 carrosséis em
 *                  20 banners saem um a cada 4 ou 5, não os 6 primeiros;
 *   'embaralhar' → aleatório.
 */
function ltOrdenar(postagens, modo, sorteio) {
  const l = (postagens || []).slice();
  if (modo === 'embaralhar') {
    const rnd = sorteio || Math.random;
    for (let i = l.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [l[i], l[j]] = [l[j], l[i]];
    }
    return l;
  }
  if (modo === 'alternar') {
    const carr = l.filter(p => p.tipo === 'carrossel'), resto = l.filter(p => p.tipo !== 'carrossel');
    if (!carr.length || !resto.length) return l;
    const [menor, maior] = carr.length <= resto.length ? [carr, resto] : [resto, carr];
    const saida = maior.slice();
    const passo = (maior.length + 1) / (menor.length + 1);
    menor.forEach((p, i) =>
      saida.splice(Math.min(saida.length, Math.round(passo * (i + 1)) + i), 0, p));
    return saida;
  }
  return l;
}

/**
 * A DISTRIBUIÇÃO PELO CALENDÁRIO. Pura.
 *
 *   n     quantas vagas se quer
 *   regra { aPartirDe:'AAAA-MM-DD', horarios:['12:00',…], dias:[1,2,…] (0=dom),
 *           pularOcupados, usarVazios, ocupados:Set<chave>, vazios:Map<chave,id>,
 *           agora:Date }
 *   chave = 'AAAA-MM-DDTHH:MM', hora local — a mesma língua do calendário.
 *   → { vagas:[{quando, vazioId, pulados:[chave…]}], pulados:[chave…] }
 *
 * Anda dia a dia a partir da data, só nos dias marcados, horário a
 * horário. Horário que já passou nunca é vaga. Horário ocupado é pulado
 * (com "pular" ligado) e fica anotado na vaga seguinte — é o que a
 * conferência mostra em amarelo. Espaço vazio da régua é vaga quando
 * "encaixar" está ligado: a postagem entra NELE (update), e o espaço
 * deixa de ser vazio.
 */
function ltDistribuir(n, regra) {
  const vagas = [], pulados = [];
  regra = regra || {};
  const horarios = (regra.horarios || []).slice().sort();
  const dias = new Set(regra.dias || []);
  const agora = regra.agora || new Date();
  const ocupados = regra.ocupados || new Set();
  const vazios = regra.vazios || new Map();
  if (!n || !horarios.length || !dias.size || !regra.aPartirDe) return { vagas, pulados };
  const inicio = new Date(regra.aPartirDe + 'T00:00');
  if (isNaN(inicio)) return { vagas, pulados };
  let pend = [];
  for (let d = 0; d < LT_HORIZONTE_DIAS && vagas.length < n; d++) {
    const dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + d);
    if (!dias.has(dia.getDay())) continue;
    const ch = pgChaveDia(dia);
    for (const h of horarios) {
      if (vagas.length >= n) break;
      const chave = ch + 'T' + h;
      if (new Date(chave) <= agora) continue;
      if (vazios.has(chave) && regra.usarVazios) {
        vagas.push({ quando: chave, vazioId: vazios.get(chave), pulados: pend }); pend = [];
        continue;
      }
      if ((ocupados.has(chave) || vazios.has(chave)) && regra.pularOcupados) {
        pulados.push(chave); pend.push(chave);
        continue;
      }
      vagas.push({ quando: chave, vazioId: null, pulados: pend }); pend = [];
    }
  }
  return { vagas, pulados };
}

/**
 * A PLANILHA DE LEGENDAS. Pura.
 *   `arquivo;legenda` (ou vírgula, ou tab — decide pela 1ª linha), aspas
 *   com "" dentro, quebra de linha dentro das aspas, "\n" escrito vale
 *   quebra, cabeçalho "arquivo" pulado. → Map(chave → legenda)
 */
function ltLerLegendasCsv(texto) {
  const t = String(texto || '').replace(/^\uFEFF/, '');
  const primeira = t.split(/\r?\n/)[0] || '';
  const sep = primeira.indexOf(';') >= 0 ? ';' : primeira.indexOf('\t') >= 0 ? '\t' : ',';
  const linhas = [];
  let campo = '', linha = [], aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"') { if (t[i + 1] === '"') { campo += '"'; i++; } else aspas = false; }
      else campo += c;
    }
    else if (c === '"') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); linhas.push(linha); linha = []; campo = '';
    }
    else campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }

  const mapa = new Map();
  linhas.forEach((l, i) => {
    const nome = (l[0] || '').trim();
    if (!nome) return;
    if (i === 0 && /^(arquivo|nome|imagem|pasta|post|postagem)$/i.test(nome)) return;
    const leg = l.slice(1).join(sep).replace(/\\n/g, '\n').trim();
    mapa.set(ltChaveLegenda(nome), leg);
  });
  return mapa;
}

/** Põe em cada postagem a legenda da planilha (pela pasta OU pelo 1º arquivo). Pura. */
function ltCasarLegendas(postagens, mapa) {
  let n = 0;
  (postagens || []).forEach(p => {
    const chaves = [p.nome, p.arquivos && p.arquivos[0] && p.arquivos[0].nome]
      .filter(Boolean).map(ltChaveLegenda);
    const k = chaves.find(c => mapa && mapa.has(c));
    if (k !== undefined) { p.legenda = mapa.get(k); n++; }
  });
  return n;
}

/** O caminho da arte no bucket: pasta da empresa / lote / carimbo-nn-ii-slug. Pura. */
function ltCaminhoNoBucket(empresa, lote, quando, n, i, nomeArq) {
  const ext = /\.png$/i.test(nomeArq || '') ? 'png' : 'jpg';
  const slug = ltSemAcento(ltNomeBase(nomeArq)).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'arte';
  const carimbo = String(quando || '').slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const p2 = x => String(x).padStart(2, '0');
  return empresa + '/lote-' + String(lote || '').slice(0, 8) + '/'
    + carimbo + '-' + p2(n) + '-' + p2(i) + '-' + slug + '.' + ext;
}

/** "96 postagens cabem de seg 14/set a sáb 24/out". Pura. */
function ltResumoDistribuicao(postagens, pulados) {
  const com = (postagens || []).filter(p => p.quando);
  if (!com.length) return { de: '', ate: '', texto: 'Nenhuma postagem para distribuir.' };
  const de = com[0].quando, ate = com[com.length - 1].quando;
  let t = com.length + (com.length === 1 ? ' postagem cabe' : ' postagens cabem')
    + ' de ' + pgDiaCurtoDe(de) + ' a ' + pgDiaCurtoDe(ate) + '.';
  if (pulados && pulados.length) {
    t += ' ' + pulados.length + (pulados.length === 1 ? ' horário foi pulado' : ' horários foram pulados')
      + ' por já ter postagem.';
  }
  return { de, ate, texto: t };
}

/** Os números da leva, para a linha "128 arquivos lidos → 96 postagens". Pura. */
function ltContagem(postagens) {
  const n = { postagens: 0, feed: 0, carrossel: 0, story: 0, arquivos: 0, bytes: 0 };
  (postagens || []).forEach(p => {
    n.postagens++; n[p.tipo] = (n[p.tipo] || 0) + 1;
    (p.arquivos || []).forEach(a => { n.arquivos++; n.bytes += Number(a.tamanho) || 0; });
  });
  return n;
}

// ------------------------------------------------------------
// a janela — abrir, ler os arquivos, a regra
// ------------------------------------------------------------
function ltEl(n) { return document.getElementById('lt-' + n); }
/** a janela do lote (o id é pg-modal-lote, como as outras janelas da tela) */
function ltModal() { return document.getElementById('pg-modal-lote'); }

function ltAbrir() {
  if (ltSubindo) { ltModal().classList.add('aberto'); return; }
  ltItens = []; ltPostagens = []; ltRecusas = []; ltLegendas = new Map(); ltLegendasArq = '';
  ltRaiz = ''; ltPulados = []; ltLoteId = null; ltSubiuAlgo = false; ltParar = false;
  ltHorarios = LT_HORARIOS_PADRAO.slice(); ltDias = [1, 2, 3, 4, 5, 6];
  ltUrls.forEach(u => URL.revokeObjectURL(u)); ltUrls.clear();
  ltEl('de').value = pgChaveDia(new Date());
  ltEl('ordem').value = 'nome';
  ltEl('pular').checked = true; ltEl('vazios').checked = true;
  ltEl('ig').checked = true; ltEl('fb').checked = true; ltEl('tambem').checked = false;
  ltMarcarRadio('nascem', 'aprovar'); ltMarcarRadio('tema', 'dica'); ltMarcarRadio('legenda', 'csv');
  ltPintarHorarios(); ltPintarDias(); ltPintarLidos(); ltPintarLegendaObs();
  ltPasso(1);
  ltLigarSoltar();
  ltModal().classList.add('aberto');
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

function ltFechar() {
  const m = ltModal();
  if (!m || !m.classList.contains('aberto')) return;
  if (ltSubindo) { dialogoAvisar('Ainda estou subindo. Use "Parar aqui" para interromper — o que já subiu fica.'); return; }
  m.classList.remove('aberto');
  ltUrls.forEach(u => URL.revokeObjectURL(u)); ltUrls.clear();
  if (ltSubiuAlgo) pgCarregar();
}

/** troca a etapa visível e o trilho do topo */
function ltPasso(n) {
  [1, 2, 3].forEach(i => {
    const el = ltEl('passo-' + i);
    if (el) el.style.display = i === n ? '' : 'none';
    const t = ltEl('trilho-' + i);
    if (t) { t.classList.toggle('on', i === n); t.classList.toggle('ok', i < n); }
  });
  const rod = { 1: 'rodape-1', 2: 'rodape-2', 3: 'rodape-3' };
  Object.values(rod).forEach(id => { const el = ltEl(id); if (el) el.style.display = 'none'; });
  const r = ltEl(rod[n]); if (r) r.style.display = '';
}

function ltRadio(nome) {
  const el = document.querySelector('#pg-modal-lote input[name="lt-' + nome + '"]:checked');
  return el ? el.value : '';
}
function ltMarcarRadio(nome, valor) {
  document.querySelectorAll('#pg-modal-lote input[name="lt-' + nome + '"]').forEach(i => {
    i.checked = i.value === valor;
  });
  ltLigarRadios();
}
/** repinta o `.on` dos rádios e dos cartões "como nascem" */
function ltLigarRadios() {
  document.querySelectorAll('#pg-modal-lote .orc-radios label, #pg-modal-lote .lt-nascem label').forEach(l => {
    const i = l.querySelector('input');
    if (i) l.classList.toggle('on', i.checked);
  });
  ltPintarLegendaObs();
}

// --- os arquivos ---
function ltLigarSoltar() {
  if (ltSoltaLigada) return;
  const modal = ltModal(), faixa = ltEl('solta');
  if (!modal || !faixa) return;
  ltSoltaLigada = true;
  let conta = 0;
  modal.addEventListener('dragenter', e => {
    if (!pgTemArquivo(e)) return;
    e.preventDefault(); conta++; faixa.classList.add('sobre');
  });
  modal.addEventListener('dragover', e => {
    if (!pgTemArquivo(e)) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
  });
  modal.addEventListener('dragleave', e => {
    if (!pgTemArquivo(e)) return;
    if (--conta <= 0) { conta = 0; faixa.classList.remove('sobre'); }
  });
  modal.addEventListener('drop', e => {
    if (!pgTemArquivo(e)) return;
    e.preventDefault(); e.stopPropagation(); conta = 0; faixa.classList.remove('sobre');
    if (ltSubindo) return;
    ltLerSoltura(e.dataTransfer).then(ltReceber);
  });
}

/** Uma pasta solta vem como "entradas"; o navegador as lê em levas. */
function ltLerSoltura(dt) {
  const itens = [].slice.call((dt && dt.items) || []);
  const entradas = itens.map(i => i.webkitGetAsEntry && i.webkitGetAsEntry()).filter(Boolean);
  if (!entradas.length) {
    return Promise.resolve([].slice.call((dt && dt.files) || []).map(f =>
      ({ caminho: f.name, nome: f.name, tipo: f.type, tamanho: f.size, file: f })));
  }
  const saida = [];
  return entradas.reduce((p, e) => p.then(() => ltLerEntrada(e, '', saida)), Promise.resolve())
    .then(() => saida);
}

function ltLerEntrada(entrada, prefixo, saida) {
  if (entrada.isFile) {
    return new Promise(ok => entrada.file(f => {
      saida.push({ caminho: prefixo + f.name, nome: f.name, tipo: f.type, tamanho: f.size, file: f });
      ok();
    }, () => ok()));
  }
  if (!entrada.isDirectory) return Promise.resolve();
  const leitor = entrada.createReader();
  const pasta = prefixo + entrada.name + '/';
  const todas = [];
  // readEntries devolve em levas de ~100 e só termina quando vier vazia
  const lerMais = () => new Promise(ok => leitor.readEntries(lista => {
    if (!lista.length) { ok(); return; }
    lista.forEach(x => todas.push(x));
    lerMais().then(ok);
  }, () => ok()));
  return lerMais().then(() =>
    todas.reduce((p, e) => p.then(() => ltLerEntrada(e, pasta, saida)), Promise.resolve()));
}

/** o seletor de arquivos (avulsos) e o de pasta chegam aqui */
function ltEscolhidos(arquivos) {
  const itens = [].slice.call(arquivos || []).map(f =>
    ({ caminho: f.webkitRelativePath || f.name, nome: f.name, tipo: f.type, tamanho: f.size, file: f }));
  ['arquivos', 'pasta'].forEach(n => { const i = ltEl(n); if (i) i.value = ''; });
  ltReceber(itens);
}

async function ltReceber(itens) {
  if (!itens || !itens.length) return;
  ltItens = ltItens.concat(itens);
  const r = ltAgruparArquivos(ltItens);
  ltPostagens = r.postagens; ltRecusas = r.recusas; ltRaiz = r.raiz;
  if (r.csv && r.csv.file && r.csv.nome !== ltLegendasArq) {
    try {
      ltLegendas = ltLerLegendasCsv(await r.csv.file.text());
      ltLegendasArq = r.csv.nome;
    } catch (e) { ltRecusas.push(r.csv.nome + ' — não consegui ler a planilha'); }
  }
  await ltMedirTipos();
  ltCasarLegendas(ltPostagens, ltLegendas);
  ltPintarLidos();
  ltPintarLegendaObs();
  ltPintarPrevia();
}

/** arte sozinha em 9:16 vira story — medida uma vez por arquivo */
async function ltMedirTipos() {
  for (const p of ltPostagens) {
    if (p.arquivos.length !== 1) continue;
    const a = p.arquivos[0];
    if (!a.file) continue;
    let m = ltMedidas.get(a.file);
    if (!m) {
      m = await pgMedirArte(ltUrlDe(a.file));
      ltMedidas.set(a.file, m || { largura: 0, altura: 0 });
    }
    p.tipo = ltTipoPorProporcao(m && m.largura, m && m.altura);
  }
}

function ltUrlDe(file) {
  if (!ltUrls.has(file)) ltUrls.set(file, URL.createObjectURL(file));
  return ltUrls.get(file);
}

function ltPintarLidos() {
  const n = ltContagem(ltPostagens);
  const lidos = ltEl('lidos');
  if (!ltPostagens.length && !ltRecusas.length) {
    lidos.style.display = 'none'; ltEl('fita').innerHTML = ''; ltEl('recusa').innerHTML = '';
    return;
  }
  lidos.style.display = '';
  lidos.innerHTML = `<b>${ltItens.length} arquivo(s) lido(s) → ${n.postagens} postagem(ns)</b>
    ${n.feed ? `<span class="tag tag-cinza">${n.feed} feed</span>` : ''}
    ${n.carrossel ? `<span class="tag tag-cinza">${n.carrossel} carross${n.carrossel === 1 ? 'el' : 'éis'}</span>` : ''}
    ${n.story ? `<span class="tag tag-cinza">${n.story} stor${n.story === 1 ? 'y' : 'ies'}</span>` : ''}
    ${ltLegendasArq ? `<span class="tag tag-verde">legendas: ${htm(ltLegendasArq)}</span>` : ''}
    <span class="vao"></span>
    ${ltRecusas.length ? `<span style="color:var(--erro)">${ltRecusas.length} recusado(s)</span>` : ''}
    <button type="button" class="btn btn-claro" style="padding:4px 10px;font-size:12px"
      onclick="ltLimpar()">Limpar</button>`;
  const fita = ltPostagens.slice(0, LT_FITA_MAX).map((p, i) => {
    const a = p.arquivos[0];
    const url = a.file ? ltUrlDe(a.file) : '';
    return `<div class="pg-slide${p.tipo === 'carrossel' ? ' carr' : ''}" title="${htm(p.nome)}"
      style="background-image:url('${htm(pgUrlCss(url))}');background-size:cover;background-position:center"
      onclick="ltAmpliar(${i})">${p.tipo === 'carrossel'
        ? `<span class="capa">1/${p.arquivos.length}</span>` : ''}</div>`;
  }).join('');
  const sobra = ltPostagens.length - LT_FITA_MAX;
  ltEl('fita').innerHTML = fita + (sobra > 0 ? `<div class="mais">+${sobra}</div>` : '');
  ltEl('recusa').innerHTML = ltRecusas.length
    ? 'Não entraram: ' + htm(ltRecusas.slice(0, 8).join(' · '))
      + (ltRecusas.length > 8 ? ' · e mais ' + (ltRecusas.length - 8) : '')
    : '';
}

function ltLimpar() {
  ltItens = []; ltPostagens = []; ltRecusas = []; ltLegendas = new Map(); ltLegendasArq = ''; ltRaiz = '';
  ltUrls.forEach(u => URL.revokeObjectURL(u)); ltUrls.clear();
  ltPintarLidos(); ltPintarLegendaObs(); ltPintarPrevia();
}

/** o visor do compositor serve aqui também: ele lê pgLaminas */
function ltAmpliar(i) {
  const p = ltPostagens[i];
  if (!p) return;
  pgLaminas = p.arquivos.map(a => ({ file: a.file, url: ltUrlDe(a.file) }));
  pgAmpliar(0);
}

// --- a regra ---
function ltPintarHorarios() {
  ltEl('horarios').innerHTML = ltHorarios.slice().sort().map(h =>
    `<span class="lt-chip">${htm(h)} <small title="tirar" onclick="ltTirarHorario('${jsq(h)}')">×</small></span>`).join('')
    + `<span class="lt-chip add"><input type="time" id="lt-hora-nova" value="18:00">
       <button type="button" class="btn btn-claro" style="padding:3px 8px;font-size:12px"
         onclick="ltAddHorario()">+ horário</button></span>`;
}
function ltAddHorario() {
  const el = ltEl('hora-nova');
  const h = el && el.value;
  if (!h) return;
  if (ltHorarios.indexOf(h) < 0) ltHorarios.push(h);
  ltPintarHorarios(); ltPintarPrevia();
}
function ltTirarHorario(h) {
  ltHorarios = ltHorarios.filter(x => x !== h);
  ltPintarHorarios(); ltPintarPrevia();
}
function ltPintarDias() {
  ltEl('dias').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d =>
    `<span class="${ltDias.indexOf(d) >= 0 ? 'on' : ''}" onclick="ltToggleDia(${d})">${
      PG_DIAS_SEMANA[d].slice(0, 3).toLowerCase()}</span>`).join('');
}
function ltToggleDia(d) {
  ltDias = ltDias.indexOf(d) >= 0 ? ltDias.filter(x => x !== d) : ltDias.concat([d]);
  ltPintarDias(); ltPintarPrevia();
}

function ltRegra(ocupados, vazios) {
  return {
    aPartirDe: ltEl('de').value, horarios: ltHorarios, dias: ltDias,
    pularOcupados: ltEl('pular').checked, usarVazios: ltEl('vazios').checked,
    ocupados: ocupados || new Set(), vazios: vazios || new Map(), agora: new Date()
  };
}

/** a estimativa do passo 1 (sem olhar o banco): até quando a leva vai */
function ltPintarPrevia() {
  const el = ltEl('resultado');
  if (!ltPostagens.length) { el.style.display = 'none'; return; }
  el.style.display = '';
  const { vagas } = ltDistribuir(ltPostagens.length, ltRegra());
  if (!vagas.length) { el.innerHTML = 'Escolha pelo menos um horário e um dia da semana.'; return; }
  if (vagas.length < ltPostagens.length) {
    el.innerHTML = `Só cabem <b>${vagas.length}</b> das ${ltPostagens.length} em ${LT_HORIZONTE_DIAS} dias — acrescente horários ou dias.`;
    return;
  }
  el.innerHTML = `<b>${ltPostagens.length} postagens cabem de ${htm(pgDiaCurtoDe(vagas[0].quando))} a ${
    htm(pgDiaCurtoDe(vagas[vagas.length - 1].quando))}</b> — ${ltHorarios.length} por dia em ${
    ltDias.length} dia(s) por semana. A conferência do próximo passo desvia dos horários já ocupados.`;
}

function ltPintarLegendaObs() {
  const el = ltEl('legenda-obs');
  if (!el) return;
  const modo = ltRadio('legenda');
  const com = ltPostagens.filter(p => p.legenda).length;
  const sem = ltPostagens.filter(p => !p.legenda && p.tipo !== 'story').length;
  if (modo === 'csv') {
    el.textContent = ltLegendasArq
      ? `${com} de ${ltPostagens.length} encontradas em ${ltLegendasArq} pelo nome do arquivo ou da pasta.`
        + (sem ? ` As ${sem} sem legenda ficam vazias — a fila mostra "sem legenda".` : '')
      : 'Solte um legendas.csv junto com as artes: uma linha por arte, "arquivo;legenda" (o nome do arquivo ou da pasta, sem a extensão).';
  } else if (modo === 'ia') {
    el.textContent = 'Depois de subir, a IA escreve uma legenda por postagem lendo a arte, no padrão da Configuração → Legendas com IA. Cada uma é uma chamada; se uma falhar, a postagem fica sem legenda e o botão "Escrever com IA" continua lá.';
  } else {
    el.textContent = 'Todas nascem sem legenda. Dá para escrever uma a uma na fila, ou pelo "Escrever com IA" do compositor.';
  }
}

// ------------------------------------------------------------
// passo 2 — a conferência
// ------------------------------------------------------------
async function ltIrPasso2() {
  if (!ltPostagens.length) { await dialogoAvisar('Solte as artes primeiro.'); return; }
  if (!ltEl('de').value) { await dialogoAvisar('Diga a partir de que dia.'); return; }
  if (!ltHorarios.length || !ltDias.length) { await dialogoAvisar('Escolha pelo menos um horário e um dia da semana.'); return; }
  if (!ltEl('ig').checked && !ltEl('fb').checked) { await dialogoAvisar('Escolha ao menos uma rede.'); return; }

  const botao = ltEl('b-conferir');
  botao.disabled = true;
  try {
    ltPostagens = ltOrdenar(ltPostagens, ltEl('ordem').value);
    ltPostagens.forEach(p => { p.quando = null; p.vazioId = null; p.pulados = []; p.jaExiste = null; });

    // o que o calendário já tem, de hoje até o horizonte — e o que
    // desta MESMA pasta já subiu antes (a retomada)
    const de = ltEl('de').value + 'T00:00:00';
    const ateD = new Date(ltEl('de').value + 'T00:00');
    ateD.setDate(ateD.getDate() + LT_HORIZONTE_DIAS);
    const origens = ltPostagens.map(p => p.origem);
    const [existentes, mesmas] = await Promise.all([
      sb.from('postagens').select('id,agendada_para,status')
        .gte('agendada_para', de).lte('agendada_para', ateD.toISOString()),
      sb.from('postagens').select('id,agendada_para,status,origem_arquivo')
        .in('origem_arquivo', origens)
    ]);
    if (existentes.error) throw existentes.error;
    // sem a coluna (SQL ainda não rodou) a retomada não existe; o resto segue
    const jaSubidas = new Map();
    if (!mesmas.error) (mesmas.data || []).forEach(x => jaSubidas.set(x.origem_arquivo, x));

    const ocupados = new Set(), vazios = new Map();
    (existentes.data || []).forEach(x => {
      const chave = pgChaveDia(x.agendada_para) + 'T' + pgHoraDe(x.agendada_para);
      if (x.status === 'vazia') vazios.set(chave, x.id); else ocupados.add(chave);
    });

    const novas = ltPostagens.filter(p => {
      const j = jaSubidas.get(p.origem);
      if (j) { p.jaExiste = j; return false; }
      return true;
    });
    const { vagas, pulados } = ltDistribuir(novas.length, ltRegra(ocupados, vazios));
    ltPulados = pulados;
    if (vagas.length < novas.length) {
      await dialogoAvisar(`Só cabem ${vagas.length} das ${novas.length} postagens em ${LT_HORIZONTE_DIAS} dias com esta regra. Acrescente horários ou dias.`);
      return;
    }
    novas.forEach((p, i) => { p.quando = vagas[i].quando; p.vazioId = vagas[i].vazioId; p.pulados = vagas[i].pulados; });
    ltPintarTabela();
    ltPasso(2);
  } catch (e) {
    await dialogoAvisar('Não consegui ler o calendário: ' + (e.message || e));
  } finally {
    botao.disabled = false;
  }
}

function ltPintarTabela() {
  const n = ltContagem(ltPostagens);
  const novas = ltPostagens.filter(p => !p.jaExiste);
  const jaTem = ltPostagens.length - novas.length;
  const r = ltResumoDistribuicao(novas, ltPulados);
  const nascem = ltRadio('nascem');
  ltEl('resumo').innerHTML = `
    <span><b>${novas.length}</b> postagem(ns) a subir</span>
    <span><b>${n.feed}</b> feed · <b>${n.carrossel}</b> carrossel · <b>${n.story}</b> story</span>
    ${r.de ? `<span>de <b>${htm(pgDiaCurtoDe(r.de))}</b> a <b>${htm(pgDiaCurtoDe(r.ate))}</b></span>` : ''}
    <span>nascem <span class="tag ${nascem === 'agendada' ? 'tag-azul' : 'tag-amarela'}">${
      nascem === 'agendada' ? 'agendadas' : 'para aprovar'}</span></span>
    <span class="vao"></span>
    ${ltPulados.length ? `<span><b>${ltPulados.length}</b> horário(s) pulado(s)</span>` : ''}
    ${jaTem ? `<span><b>${jaTem}</b> já no calendário</span>` : ''}`;

  const legendaDe = p => {
    if (p.tipo === 'story') return '<span style="color:var(--texto-suave)">story não tem legenda</span>';
    if (p.legenda) return htm(p.legenda.slice(0, 70)) + (p.legenda.length > 70 ? '…' : '');
    if (ltRadio('legenda') === 'ia') return '<span style="color:var(--texto-suave)">a IA escreve depois de subir</span>';
    return '<span style="color:var(--alerta)">sem legenda — fica para a fila</span>';
  };
  const redes = p => [ltEl('ig').checked ? 'IG' : '', p.tipo !== 'story' && ltEl('fb').checked ? 'FB' : '']
    .filter(Boolean).join(' + ') || '—';

  const linhas = ltPostagens.slice(0, LT_TABELA_MAX).map((p, i) => {
    const a = p.arquivos[0];
    const url = a && a.file ? ltUrlDe(a.file) : '';
    const thumb = `<div class="th" style="background-image:url('${htm(pgUrlCss(url))}')">${
      p.arquivos.length > 1 ? `<span class="n">${p.arquivos.length}</span>` : ''}</div>`;
    let quando;
    if (p.jaExiste) {
      quando = `<b style="color:var(--verde-escuro)">já está no calendário</b> · ${
        htm(pgDiaCurtoDe(p.jaExiste.agendada_para))} ${htm(pgHoraDe(p.jaExiste.agendada_para))}`;
    } else {
      const [dia, hora] = String(p.quando).split('T');
      quando = (p.pulados.length
        ? `<b>${p.pulados.map(x => htm(x.slice(11))).join(', ')} já tem postagem</b> → ` : '')
        + (p.vazioId ? '<span class="tag tag-cinza" title="entra no espaço vazio que a régua abriu">espaço da régua</span> ' : '')
        + `<input type="date" value="${htm(dia)}" onchange="ltMudarQuando(${i}, this.value, 'dia')">
           <input type="time" class="h" value="${htm(hora)}" onchange="ltMudarQuando(${i}, this.value, 'hora')">`;
    }
    return `<tr class="${p.jaExiste ? 'existe' : p.pulados.length ? 'pulado' : ''}">
      <td>${i + 1}</td><td>${thumb}</td>
      <td class="arq" title="${htm(p.origem)}">${htm(p.nome)}${p.arquivos.length > 1
        ? ` <span style="color:var(--texto-suave)">(${p.arquivos.length} lâminas)</span>` : ''}</td>
      <td><span class="tag tag-cinza">${htm(PG_TIPOS[p.tipo] || p.tipo)}</span></td>
      <td class="quando">${quando}</td>
      <td class="leg">${legendaDe(p)}</td>
      <td>${htm(redes(p))}</td></tr>`;
  }).join('');
  const sobra = ltPostagens.length - LT_TABELA_MAX;
  ltEl('tabela').innerHTML = linhas + (sobra > 0
    ? `<tr class="mais"><td colspan="7">… e mais ${sobra} (a planilha traz todas)</td></tr>` : '');
  ltEl('b-subir').textContent = novas.length
    ? `Subir ${novas.length === 1 ? 'a postagem' : 'as ' + novas.length + ' postagens'}` : 'Nada a subir';
  ltEl('b-subir').disabled = !novas.length;
}

function ltMudarQuando(i, valor, parte) {
  const p = ltPostagens[i];
  if (!p || !p.quando || !valor) return;
  const [dia, hora] = p.quando.split('T');
  p.quando = parte === 'dia' ? valor + 'T' + hora : dia + 'T' + valor;
  p.vazioId = null;   // mudou de horário: não é mais o espaço da régua
  p.pulados = [];
}

/** a distribuição em planilha, para conferir fora da tela */
function ltBaixarPlanilha() {
  const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const linhas = [['n', 'arquivo', 'tipo', 'laminas', 'dia', 'hora', 'situacao', 'legenda'].join(';')];
  ltPostagens.forEach((p, i) => {
    const q = p.jaExiste ? pgChaveDia(p.jaExiste.agendada_para) + 'T' + pgHoraDe(p.jaExiste.agendada_para) : (p.quando || 'T');
    const [dia, hora] = q.split('T');
    linhas.push([i + 1, esc(p.origem), p.tipo, p.arquivos.length, dia, hora,
      p.jaExiste ? 'ja no calendario' : 'a subir', esc(p.legenda)].join(';'));
  });
  const blob = new Blob(['\uFEFF' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'distribuicao-postagens.csv';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ------------------------------------------------------------
// passo 3 — subir, com retomada
// ------------------------------------------------------------
async function ltSubir() {
  const novas = ltPostagens.filter(p => !p.jaExiste && p.estado !== 'ok');
  if (!novas.length) return;
  const nascem = ltRadio('nascem');
  const passado = novas.filter(p => new Date(p.quando) <= new Date());
  if (passado.length) {
    await dialogoAvisar(`${passado.length} postagem(ns) ficaram com horário que já passou (você mudou a data na linha?). Corrija antes de subir.`);
    return;
  }
  const texto = nascem === 'agendada'
    ? `Subir ${novas.length} postagem(ns) já AGENDADAS?\n\nO relógio publica cada uma sozinho, no dia e hora da tabela, sem passar por ninguém.`
    : `Subir ${novas.length} postagem(ns) para a fila de aprovação?\n\nNada sai antes de alguém aprovar.`;
  if (!(await dialogoPerguntar({ texto, ok: 'Subir' }))) return;

  ltLoteId = ltLoteId || (crypto.randomUUID ? crypto.randomUUID() : ltUuid());
  const modal = ltModal();
  if (modal && modal.dataset) delete modal.dataset.mexida;   // a guarda do base.js não tem o que perguntar aqui
  ltSubindo = true; ltParar = false;
  ltPasso(3);
  ltEl('pronto').style.display = 'none';
  ltEl('erros').innerHTML = '';
  const total = novas.length;
  let feitas = 0, falhas = 0, seguidas = 0;
  const inicio = Date.now();

  for (const p of novas) {
    if (ltParar) break;
    const i = ltPostagens.indexOf(p);
    ltPintarProgresso(feitas, total, inicio, `Subindo ${p.nome} (${p.arquivos.length} arquivo${p.arquivos.length > 1 ? 's' : ''})…`);
    const erro = await ltSubirLinha(p, i);
    if (erro) {
      falhas++; seguidas++;
      p.estado = 'falhou'; p.erro = erro;
      ltPintarErro(i);
      // três seguidas é permissão, limite do plano ou banco fora — não
      // adianta insistir nas outras 90
      if (seguidas >= 3) {
        await dialogoAvisar('Três falharam seguidas: ' + erro + '\n\nParei aqui. O que já subiu fica; corrija e clique em "Tentar de novo" ou volte com a mesma pasta depois.');
        break;
      }
    } else {
      feitas++; seguidas = 0; p.estado = 'ok'; ltSubiuAlgo = true;
    }
  }

  if (!ltParar && !falhas && ltRadio('legenda') === 'ia') await ltLegendasIA(novas, inicio);

  ltSubindo = false;
  ltPintarProgresso(feitas, total, inicio, '');
  ltPintarPronto(feitas, falhas, total, nascem);
  pgCarregar();
}

function ltUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 3 | 8)).toString(16);
  });
}

/** sobe as artes e grava a linha. Devolve '' ou o erro escrito. */
async function ltSubirLinha(p, i) {
  const empresa = pgEmpresa();
  if (!empresa) return 'Sessão sem empresa — recarregue a página.';
  const tipo = p.tipo;
  const linha = {
    empresa_id: empresa,
    agendada_para: new Date(p.quando).toISOString(),
    tipo, tema: ltRadio('tema') || 'dica', imovel_id: null,
    rede_instagram: ltEl('ig').checked,
    rede_facebook: tipo === 'story' ? false : ltEl('fb').checked,
    legenda: tipo === 'story' ? null : (p.legenda || '').trim() || null,
    status: ltRadio('nascem') === 'agendada' ? 'agendada' : 'aprovar',
    erro: null, lote_id: ltLoteId, origem_arquivo: p.origem,
    atualizado_em: new Date().toISOString()
  };
  if (!linha.rede_instagram && !linha.rede_facebook) return 'Story só vai para o Instagram — marque o Instagram.';

  // as artes: o que já subiu numa tentativa anterior desta mesma linha fica
  p.caminhos = p.caminhos || [];
  for (let k = p.caminhos.length; k < p.arquivos.length; k++) {
    const a = p.arquivos[k];
    const caminho = ltCaminhoNoBucket(empresa, ltLoteId, p.quando, i + 1, k + 1, a.nome);
    let erro = null;
    for (let t = 0; t < LT_TENTATIVAS; t++) {
      const r = await sb.storage.from('postagens').upload(caminho, a.file, { contentType: a.tipo, upsert: true });
      erro = r.error;
      if (!erro) break;
      if (/(policy|permission|42501|not allowed|mime|size|too large|Payload)/i.test(erro.message || '')) break;   // não é a rede
      await new Promise(ok => setTimeout(ok, 800 * (t + 1)));
    }
    if (erro) return 'a arte ' + a.nome + ' não subiu: ' + (erro.message || erro);
    p.caminhos.push(caminho);
  }
  linha.midias = p.caminhos;

  const q = p.vazioId
    ? sb.from('postagens').update(linha).eq('id', p.vazioId).eq('status', 'vazia').select('id')
    : sb.from('postagens').insert(linha).select('id');
  const { data, error } = await q;
  if (error) return error.message || String(error);
  if (p.vazioId && !(data && data.length)) {
    // o espaço vazio deixou de existir (alguém preencheu): cria solta
    const r2 = await sb.from('postagens').insert(linha).select('id');
    if (r2.error) return r2.error.message;
    p.id = r2.data && r2.data[0] && r2.data[0].id;
  } else {
    p.id = data && data[0] && data[0].id;
  }

  // v1.400 — a irmã de story, como no compositor: a capa, mesma hora, sem legenda
  if (ltEl('tambem').checked && tipo !== 'story') {
    const { error: e2 } = await sb.from('postagens').insert({
      ...linha, tipo: 'story', legenda: null, rede_facebook: false, midias: [p.caminhos[0]],
      origem_arquivo: p.origem + ' (story)'
    });
    if (e2) return 'a postagem subiu, mas o story irmão não: ' + e2.message;
  }
  return '';
}

async function ltTentarDeNovo(i) {
  const p = ltPostagens[i];
  if (!p || ltSubindo) return;
  ltSubindo = true;
  const erro = await ltSubirLinha(p, i);
  ltSubindo = false;
  if (erro) { p.erro = erro; ltPintarErro(i); return; }
  p.estado = 'ok'; p.erro = ''; ltSubiuAlgo = true;
  const el = ltEl('erro-' + i);
  if (el) el.remove();
  const feitas = ltPostagens.filter(x => x.estado === 'ok').length;
  const novas = ltPostagens.filter(x => !x.jaExiste).length;
  ltPintarPronto(feitas, novas - feitas, novas, ltRadio('nascem'));
  pgCarregar();
}

function ltPararAgora() { ltParar = true; }

/** fecha a janela e leva o olho até a fila, onde o lote acabou de cair */
function ltIrParaFila() {
  ltFechar();
  const fila = document.getElementById('pg-fila');
  if (fila && fila.scrollIntoView) fila.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function ltPintarProgresso(feitas, total, inicio, texto) {
  const pct = total ? Math.round(feitas / total * 100) : 0;
  ltEl('barra').style.width = pct + '%';
  const seg = feitas ? Math.round((Date.now() - inicio) / feitas * (total - feitas) / 1000) : 0;
  const resta = seg > 90 ? '≈ ' + Math.ceil(seg / 60) + ' min restantes' : seg ? '≈ ' + seg + ' s restantes' : '';
  ltEl('prog-n').textContent = feitas + ' de ' + total;
  ltEl('prog-resta').textContent = resta;
  ltEl('prog-txt').textContent = texto;
  ltEl('gira').style.display = texto ? '' : 'none';
  ltEl('b-parar').style.display = texto ? '' : 'none';
}

function ltPintarErro(i) {
  const p = ltPostagens[i];
  let el = ltEl('erro-' + i);
  if (!el) {
    el = document.createElement('div');
    el.className = 'pg-erro lt-erro';
    el.id = 'lt-erro-' + i;
    ltEl('erros').appendChild(el);
  }
  el.innerHTML = `<span style="flex:1"><b>${htm(p.nome)}</b> falhou: ${htm(p.erro)}</span>
    <button type="button" class="btn btn-claro" style="padding:5px 10px;font-size:12px"
      onclick="ltTentarDeNovo(${i})">Tentar de novo</button>`;
}

function ltPintarPronto(feitas, falhas, total, nascem) {
  const el = ltEl('pronto');
  el.style.display = '';
  const onde = nascem === 'agendada' ? 'agendadas — o relógio publica' : 'na fila de aprovação';
  const com = ltPostagens.filter(p => p.estado === 'ok' && p.legenda).length;
  const sem = ltPostagens.filter(p => p.estado === 'ok' && !p.legenda && p.tipo !== 'story').length;
  ltEl('pronto-txt').innerHTML = `<b>${feitas} postagem(ns) ${htm(onde)}</b>
    <div style="font-size:12px;color:var(--texto-suave);margin-top:2px">${
      com} com legenda · ${sem} sem${falhas ? ` · <span style="color:var(--erro)">${falhas} falharam</span>` : ''}${
      ltParar && feitas < total ? ' · parado por você' : ''}</div>`;
}

/** a IA escreve as legendas, uma por uma, depois que tudo subiu */
async function ltLegendasIA(lista, inicio) {
  const alvo = lista.filter(p => p.estado === 'ok' && p.id && p.tipo !== 'story' && !p.legenda);
  let n = 0;
  for (const p of alvo) {
    if (ltParar) break;
    n++;
    ltPintarProgresso(lista.length, lista.length, inicio, `Escrevendo a legenda ${n} de ${alvo.length} com a IA (${p.nome})…`);
    try {
      const imagens = await pgIALaminas(p.arquivos.map(a => ({ file: a.file })));
      const { data: sessao } = await sb.auth.getSession();
      const r = await fetch(SUPABASE_URL + '/functions/v1/postagens-legenda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + (sessao && sessao.session ? sessao.session.access_token : '')
        },
        body: JSON.stringify({ empresa: pgEmpresa(), tema: ltRadio('tema') || 'dica', tipo: p.tipo, imovel_id: null, imagens })
      });
      const resp = await r.json().catch(() => ({}));
      if (!r.ok || resp.erro || !resp.legenda) throw new Error(resp.erro || ('HTTP ' + r.status));
      const { error } = await sb.from('postagens').update({ legenda: resp.legenda }).eq('id', p.id);
      if (error) throw error;
      p.legenda = resp.legenda;
    } catch (e) {
      const el = document.createElement('div');
      el.className = 'pg-erro lt-erro';
      el.innerHTML = `<span><b>${htm(p.nome)}</b> subiu, mas a IA não escreveu a legenda: ${htm(e.message || e)}</span>`;
      ltEl('erros').appendChild(el);
    }
  }
}

// ------------------------------------------------------------
// a fila com lote: "Aprovar todas" e o filtro por lote
// ------------------------------------------------------------
let pgFilaLote = '';        // '' = todos os lotes; 'avulsas' = sem lote; ou o lote_id
let pgFilaTotal = 0;        // quantas esperam aprovação (a lista mostra 30)
let pgLotes = {};           // lote_id → { n, criado_em }

/** "lote de 12/set · 96 postagens" — a linha do cartão. Pura. */
function pgRotuloDoLote(lote) {
  if (!lote) return '';
  return 'lote de ' + pgDiaCurtoDe(lote.criado_em).replace(/^[a-zá]+, /, '')
    + ' · ' + lote.n + (lote.n === 1 ? ' postagem' : ' postagens');
}

function pgDesenharFilaBarra() {
  const lotes = Object.entries(pgLotes).sort((a, b) => a[1].criado_em < b[1].criado_em ? 1 : -1);
  if (pgFilaTotal < 2) return '';
  const avulsas = pgFilaTotal - lotes.reduce((s, [, l]) => s + l.n, 0);
  const opcoes = [`<option value="">Todas (${pgFilaTotal})</option>`]
    .concat(lotes.map(([id, l]) =>
      `<option value="${htm(id)}" ${pgFilaLote === id ? 'selected' : ''}>${htm(pgRotuloDoLote(l))}</option>`))
    .concat(lotes.length && avulsas > 0
      ? [`<option value="avulsas" ${pgFilaLote === 'avulsas' ? 'selected' : ''}>Sem lote (${avulsas})</option>`] : []);
  const n = pgFilaLote === 'avulsas' ? avulsas : pgFilaLote ? (pgLotes[pgFilaLote] || {}).n || 0 : pgFilaTotal;
  return `<div class="pg-fila-barra">
    <button class="btn" data-perm="postagens:editar" onclick="pgAprovarTodas()">Aprovar todas (${n})</button>
    ${lotes.length ? `<select onchange="pgFiltrarLote(this.value)">${opcoes.join('')}</select>` : ''}
  </div>`;
}

function pgFiltrarLote(v) { pgFilaLote = v || ''; pgCarregar(); }

/** aprova de uma vez o que espera — só o que ainda está no futuro */
async function pgAprovarTodas() {
  const agora = new Date().toISOString();
  let q = sb.from('postagens').select('id,agendada_para').eq('status', 'aprovar');
  if (pgFilaLote === 'avulsas') q = q.is('lote_id', null);
  else if (pgFilaLote) q = q.eq('lote_id', pgFilaLote);
  const { data, error } = await q;
  if (error) { await dialogoAvisar('Não consegui contar: ' + error.message); return; }
  const todas = data || [];
  const futuras = todas.filter(p => p.agendada_para > agora);
  const vencidas = todas.length - futuras.length;
  if (!futuras.length) {
    await dialogoAvisar(vencidas ? 'Todas as que esperam já passaram do horário — abra uma a uma e mude a data.' : 'Nada esperando aprovação.');
    return;
  }
  const texto = `Aprovar ${futuras.length} postagem(ns) de uma vez?\n\nElas ficam agendadas e o relógio publica cada uma no seu horário.`
    + (vencidas ? `\n\n${vencidas} com horário já passado ficam na fila: abra e mude a data, senão sairiam todas juntas agora.` : '');
  if (!(await dialogoPerguntar({ texto, ok: 'Aprovar todas' }))) return;
  let u = sb.from('postagens')
    .update({ status: 'agendada', erro: null, atualizado_em: new Date().toISOString() })
    .eq('status', 'aprovar').gt('agendada_para', agora);
  if (pgFilaLote === 'avulsas') u = u.is('lote_id', null);
  else if (pgFilaLote) u = u.eq('lote_id', pgFilaLote);
  const r = await u;
  if (r.error) { await dialogoAvisar('Não consegui aprovar: ' + r.error.message); return; }
  pgCarregar();
}

// ------------------------------------------------------------
// início
// ------------------------------------------------------------
if (typeof exigirLogin === 'function') {
  exigirLogin().then(s => {
    if (!s) return;
    const hoje = new Date();
    pgAno = hoje.getFullYear();
    pgMes0 = hoje.getMonth();
    pgDiaSel = pgChaveDia(hoje);
    pgLigarSoltar();   // v1.404 — arrastar, soltar e colar
    pgCarregar();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { pgFechar(); pgReguaFechar(); ltFechar(); }   // v1.591 — a janela do lote
  });
}

// para a bateria de testes rodar no Node, sem navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { pgChaveDia, pgHoraDe, pgGradeDoMes, pgNumeros,
    // v1.594 — a fila de comentários: quem espera, em que ordem, e o
    // que o 5º número da faixa diz.
    pgComentEspera, pgComentFila, pgComentResumo, pgComentFrase,
    pgLegendaDoImovel, pgAcoesDoStatus, pgValidar, pgIAProblema, pgIAResumo,
    // v1.403 — peneira de URL para dentro de url('…'): é regra de
    // segurança, e regra de segurança tem de ter teste rodando.
    pgUrlCss,
    // v1.404 — a peneira dos arquivos que chegam (seletor, arrastar e
    // Ctrl+V passam pela MESMA) e a conta da nova ordem das lâminas,
    // que é quem decide a capa e a sequência do carrossel.
    pgPeneirarArquivos, pgMoverLamina,
    // v1.451 — a conta do corte da arte na moldura da rede. É número, é
    // o que decide se o aviso vermelho aparece, e por isso tem prova.
    pgProporcaoDo, pgCorteDaArte, pgProporcaoEmTexto,
    // v1.452 — a tabela dos botões do rodapé. É ela que impede o modal
    // e o cartão do dia de falarem palavras diferentes.
    pgBotoesDoRodape,
    // v1.452 — o agrupamento por horário do calendário.
    pgAgruparPorHora,
    // v1.591 — o lote: agrupar a pasta, distribuir pelo calendário, ler a
    // planilha de legendas, ordenar, o caminho no bucket e os textos.
    ltAgruparArquivos, ltDistribuir, ltLerLegendasCsv, ltCasarLegendas, ltOrdenar,
    ltTipoPorProporcao, ltTipoDoArquivo, ltChaveLegenda, ltEhOculto, ltCaminhoNoBucket,
    ltResumoDistribuicao, ltContagem, pgRotuloDoLote };
}
