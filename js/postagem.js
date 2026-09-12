// ============================================================
// A FICHA DA POSTAGEM (v1.573) — comentários, números e o que veio
// das redes depois que o post saiu.
//
// Mockup aprovado em 09/09/2026 (Mockup-Comentarios-Redes/).
//
// POR QUE UMA TELA NOVA, E NÃO A FICHA DO MOTOR:
// Postagens nunca foi promovida a objeto do motor — decisão de 26/08,
// quando o pacote inteiro (Gerenciador, layout, campos personalizados)
// foi adiado por custar caro e valer pouco naquele momento. Isto aqui é
// a peça que faltava daquela conversa: uma ficha simples, escrita à
// mão, sem ficha.js, sem ficha-defs.js e sem as cinco travas de lista
// fechada. O calendário continua sendo a tela principal.
//
// O QUE A META ENTREGA, E É O QUE MANDA NESTE DESENHO:
//   · comentário — texto, autor e data, nas duas redes, e dá para
//     responder;
//   · quem REAGIU — só no Facebook. O Instagram entrega o NÚMERO de
//     curtidas e nunca a lista de quem curtiu. Não há endereço na API
//     que devolva isso, para ninguém;
//   · número — não chega sozinho (não existe aviso de curtida): quem
//     busca é a varredura diária das 06:00.
// A tela DIZ isso onde for relevante, em vez de deixar a pessoa achar
// que o CRM está escondendo alguma coisa.
// ============================================================

let pfId = null;            // a postagem aberta (?id=)
let pfPost = null;          // a linha de postagens
let pfImovel = null;        // o imóvel ligado, se houver
let pfIter = [];            // as interações (comentários, reações, menções)
let pfLeads = [];           // os leads que nasceram daqui
let pfAba = 'com';          // a aba visível
let pfFiltro = 'todos';     // todos | pendentes | instagram | facebook
let pfBusca = '';
let pfRespondendo = null;   // o id da interação com a caixa aberta

const PF_TIPOS = { feed: 'Feed', story: 'Story', carrossel: 'Carrossel' };
const PF_REDES = { instagram: 'Instagram', facebook: 'Facebook' };
const PF_REACOES = {
  like: '👍 curtiu', love: '❤️ amou', care: '🤗 cuidou', haha: '😄 riu',
  wow: '😮 uau', sad: '😢 triste', angry: '😠 raiva'
};

// ------------------------------------------------------------
// AS FUNÇÕES PURAS
//
// Ficam no topo, sem tocar em tela nem em banco, porque são estas que
// a bateria roda no Node. Toda decisão que dá para errar em silêncio
// mora aqui.
// ------------------------------------------------------------

/** A conta que aparece nas pílulas do filtro. Uma volta só na lista —
 *  quatro `filter` seguidos fariam quatro. */
function pfContagem(lista) {
  const c = { todos: 0, pendentes: 0, instagram: 0, facebook: 0, reacoes: 0 };
  for (const i of (lista || [])) {
    if (i.tipo === 'reacao') { c.reacoes++; continue; }
    c.todos++;
    if (!i.tratado && !i.resposta_externo_id) c.pendentes++;
    if (i.rede === 'instagram') c.instagram++;
    if (i.rede === 'facebook') c.facebook++;
  }
  return c;
}

/** O que a lista mostra, dado o filtro e a busca.
 *
 *  Reação NUNCA entra: ela não se responde e não vira lead, e no meio
 *  dos comentários só empurraria para baixo o que precisa de resposta.
 *  Quem mostra as reações é o cartão "Quem reagiu", à direita. */
function pfFiltrar(lista, filtro, busca) {
  const t = String(busca || '').trim().toLowerCase();
  return (lista || []).filter(i => {
    if (i.tipo === 'reacao') return false;
    if (filtro === 'pendentes' && (i.tratado || i.resposta_externo_id)) return false;
    if (filtro === 'instagram' && i.rede !== 'instagram') return false;
    if (filtro === 'facebook' && i.rede !== 'facebook') return false;
    if (!t) return true;
    return (String(i.texto || '') + ' ' + String(i.autor_nome || '')
      + ' ' + String(i.autor_usuario || '')).toLowerCase().includes(t);
  });
}

/** Como o autor se chama na tela.
 *
 *  No Instagram só existe o @usuario — e é por isso que o lead nasce
 *  sem telefone. No Facebook vem o nome. Sem nenhum dos dois (a Meta
 *  omite quem apagou a conta), "alguém" é melhor do que um espaço em
 *  branco que parece defeito da tela. */
function pfNomeDoAutor(i) {
  if (!i) return 'alguém';
  if (i.rede === 'instagram') {
    const u = String(i.autor_usuario || '').replace(/^@/, '');
    return u ? '@' + u : (i.autor_nome || 'alguém');
  }
  return i.autor_nome || (i.autor_usuario ? '@' + i.autor_usuario : 'alguém');
}

/** "há 2 horas", "ontem, 18:40", "05/09, 10:20".
 *
 *  Comentário é conversa: "há 2 horas" diz mais do que a data cheia. A
 *  data absoluta volta quando passa de uma semana, que é quando o
 *  relativo deixa de ajudar. */
function pfQuando(iso, agora) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const base = agora ? new Date(agora) : new Date();
  const min = Math.floor((base - d) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return 'há ' + min + (min === 1 ? ' minuto' : ' minutos');
  const h = Math.floor(min / 60);
  if (h < 24) return 'há ' + h + (h === 1 ? ' hora' : ' horas');
  const hm = String(d.getHours()).padStart(2, '0') + ':'
           + String(d.getMinutes()).padStart(2, '0');
  const dias = Math.floor(min / 1440);
  if (dias === 1) return 'ontem, ' + hm;
  if (dias < 7) return 'há ' + dias + ' dias';
  return String(d.getDate()).padStart(2, '0') + '/'
       + String(d.getMonth() + 1).padStart(2, '0') + ', ' + hm;
}

/** Pode responder este item?
 *
 *  Três negativas, e cada uma existe por um motivo:
 *   · reação não tem resposta (não é conversa);
 *   · já respondido publicaria uma SEGUNDA resposta no post — a Meta
 *     aceita, e ninguém desfaz pela tela;
 *   · postagem que ainda não saiu não tem onde receber resposta. */
function pfPodeResponder(i) {
  if (!i || i.tipo !== 'comentario') return false;
  if (i.resposta_externo_id) return false;
  return true;
}

/** O texto do balão que explica de onde vem cada número. A tela inteira
 *  usa esta função para não haver duas versões da mesma explicação. */
function pfExplicacao(chave) {
  const t = {
    curtidas: 'A Meta entrega o NÚMERO de curtidas, nunca a lista de quem curtiu — '
            + 'no Instagram esse endereço não existe para ninguém. Quem reagiu só '
            + 'aparece no Facebook.',
    metricas: 'Curtida não tem aviso: a varredura das 06:00 lê os números das '
            + 'postagens publicadas nos últimos 30 dias.',
    lead: 'O @ do Instagram não é telefone. O lead nasce pela metade e só fecha '
        + 'quando a pessoa responde no direct.'
  };
  return t[chave] || '';
}

// ------------------------------------------------------------
// ler o banco
// ------------------------------------------------------------
function pfEmpresa() {
  const p = (typeof PERM !== 'undefined' && PERM.perfil) || {};
  return (p.superadmin && p.empresa_foco) || p.empresa_id || null;
}

function pfUrlMidia(caminho) {
  return sb.storage.from('postagens').getPublicUrl(caminho).data.publicUrl;
}

/** A mesma peneira do postagens.js (v1.403): a URL entra dentro de um
 *  url('…') de CSS, e ali o htm() não é escape — o navegador desfaz as
 *  entidades antes de o CSS ler o atributo. */
function pfUrlCss(u) {
  const limpa = String(u || '').replace(/['"()\\\s]/g, '');
  return /^(https?:|blob:)/i.test(limpa) ? limpa : '';
}

async function pfCarregar() {
  if (!pfId) { pfDesenharVazio('Nenhuma postagem indicada.'); return; }

  const { data: post, error } = await sb.from('postagens')
    .select('*').eq('id', pfId).maybeSingle();
  if (error || !post) {
    pfDesenharVazio(error ? ('Não consegui abrir: ' + error.message)
                          : 'Não encontrei esta postagem.');
    return;
  }
  pfPost = post;

  // As duas leituras que sobram são independentes entre si — em série
  // seriam duas viagens de ~360 ms, uma atrás da outra. Os leads NÃO
  // entram aqui: só se sabe quais são depois de ler as interações.
  const [it, imv] = await Promise.all([
    sb.from('postagem_interacoes').select('*')
      .eq('postagem_id', pfId)
      .order('criado_em_rede', { ascending: false }),
    post.imovel_id
      ? sb.from('imoveis').select('id,codigo,endereco,bairro,cidade,valor_aluguel')
          .eq('id', post.imovel_id).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  pfIter = it.data || [];
  pfImovel = imv && imv.data ? imv.data : null;

  // Os leads que nasceram dos comentários desta postagem. A consulta só
  // acontece se houver algum — `in.()` com lista vazia é uma viagem
  // para receber nada.
  const ids = pfIter.map(i => i.lead_id).filter(Boolean);
  if (ids.length) {
    const { data } = await sb.from('leads')
      .select('id,codigo,nome,status,telefone').in('id', ids);
    pfLeads = data || [];
  } else {
    pfLeads = [];
  }

  pfDesenhar();
}

// ------------------------------------------------------------
// desenhar
// ------------------------------------------------------------
function pfElemento(n) { return document.getElementById('pf-' + n); }

function pfDesenharVazio(texto) {
  pfElemento('conteudo').innerHTML =
    `<div class="cartao"><div class="corpo">${htm(texto)}<br>
      <a href="postagens.html" style="color:var(--link)">Voltar para Postagens</a>
     </div></div>`;
}

function pfTituloDaPostagem(p, imovel) {
  if (imovel && (imovel.endereco || imovel.codigo)) {
    return imovel.endereco || imovel.codigo;
  }
  const l = String((p && p.legenda) || '').replace(/\s+/g, ' ').trim();
  if (l) return l.length > 70 ? l.slice(0, 70) + '…' : l;
  return 'Postagem sem legenda';
}

function pfDesenhar() {
  const p = pfPost;
  const c = pfContagem(pfIter);
  const capa = (p.midias && p.midias[0]) ? pfUrlMidia(p.midias[0]) : '';

  pfElemento('conteudo').innerHTML = `
    <div class="destaque">
      <div class="topo-ficha">
        <div class="avatar"${capa
          ? ` style="background-image:url('${htm(pfUrlCss(capa))}');background-size:cover;background-position:center"`
          : ''}>${capa ? '' : 'PG'}</div>
        <div style="min-width:0">
          <h1>${htm(pfTituloDaPostagem(p, pfImovel))}</h1>
          <div class="sub">${htm(PF_TIPOS[p.tipo] || p.tipo)} ·
            ${htm(pfStatusTexto(p))}</div>
        </div>
        <div class="acoes-ficha">
          ${pfBotoesDoPost(p)}
          <a class="btn btn-claro" href="postagens.html">Voltar</a>
        </div>
      </div>
      <div class="chips">
        <div class="chip"><span class="r">Redes</span><span class="v">${
          htm([p.rede_instagram ? 'Instagram' : '', p.rede_facebook ? 'Facebook' : '']
            .filter(Boolean).join(' · ') || '—')}</span></div>
        <div class="chip"><span class="r">Curtidas</span><span class="v">${
          pfNumero(p.curtidas)}</span></div>
        <div class="chip"><span class="r">Comentários</span><span class="v">${
          c.todos || pfNumero(p.comentarios_qtd)}</span></div>
        <div class="chip"><span class="r">Alcance</span><span class="v">${
          pfNumero(p.alcance)}</span></div>
        <div class="chip"><span class="r">Leads gerados</span><span class="v">${
          pfLeads.length}</span></div>
        ${pfImovel ? `<div class="chip"><span class="r">Imóvel</span><span class="v">
          <a class="reg" href="imovel.html?id=${encodeURIComponent(pfImovel.id)}">${
          htm(pfImovel.endereco || pfImovel.codigo || 'ver')}</a></span></div>` : ''}
      </div>
    </div>

    <div class="cartao">
      <div class="abas">
        <button class="${pfAba === 'det' ? 'on' : ''}" onclick="pfVerAba('det')">Detalhes</button>
        <button class="${pfAba === 'com' ? 'on' : ''}" onclick="pfVerAba('com')">Comentários
          <span style="font-weight:400;color:var(--texto-suave)">(${c.todos})</span></button>
        <button class="${pfAba === 'num' ? 'on' : ''}" onclick="pfVerAba('num')">Números</button>
      </div>
      <div id="pf-painel"></div>
    </div>`;

  pfDesenharPainel();
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

const pfNumero = v => (v === null || v === undefined) ? '—'
  : Number(v).toLocaleString('pt-BR');

function pfStatusTexto(p) {
  if (p.status === 'publicada') {
    return 'publicada em ' + pfDataHora(p.agendada_para);
  }
  if (p.status === 'falhou') return 'falhou · ' + (p.erro || 'sem motivo escrito');
  return String(p.status || '') + ' para ' + pfDataHora(p.agendada_para);
}

function pfDataHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return String(d.getDate()).padStart(2, '0') + '/'
       + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()
       + ' às ' + String(d.getHours()).padStart(2, '0') + ':'
       + String(d.getMinutes()).padStart(2, '0');
}

/** Os links para o post na rede.
 *
 *  O do Instagram depende do `permalink`, que só existe depois que a
 *  varredura das 06:00 passou (o `ig_media_id` sozinho NÃO monta
 *  endereço de navegador — o /p/<código> usa outro código, que a Meta
 *  entrega no campo permalink). Enquanto ele não chega, o botão não
 *  aparece: botão que leva a lugar nenhum é pior do que botão nenhum. */
function pfBotoesDoPost(p) {
  const b = [];
  const perm = pfUrlCss(p.permalink);
  if (perm) {
    b.push(`<a class="btn btn-claro" target="_blank" rel="noopener"
      href="${htm(perm)}">Ver no Instagram</a>`);
  }
  if (p.fb_post_id) {
    b.push(`<a class="btn btn-claro" target="_blank" rel="noopener"
      href="https://www.facebook.com/${encodeURIComponent(String(p.fb_post_id))}">Ver no Facebook</a>`);
  }
  return b.join('');
}

function pfVerAba(qual) {
  pfAba = qual;
  document.querySelectorAll('.abas button').forEach((b, i) => {
    b.classList.toggle('on', ['det', 'com', 'num'][i] === qual);
  });
  pfDesenharPainel();
}

function pfDesenharPainel() {
  const alvo = pfElemento('painel');
  if (!alvo) return;
  if (pfAba === 'det') alvo.innerHTML = pfPainelDetalhes();
  else if (pfAba === 'num') alvo.innerHTML = pfPainelNumeros();
  else alvo.innerHTML = pfPainelComentarios();
}

// ---------- aba Detalhes ----------
function pfPainelDetalhes() {
  const p = pfPost;
  return `<div class="corpo">
    <div class="campos-ficha">
      <div class="largo"><div class="r">Legenda</div>
        <div class="v" style="white-space:pre-wrap">${htm(p.legenda || '—')}</div></div>
      <div><div class="r">Tipo</div><div class="v">${htm(PF_TIPOS[p.tipo] || p.tipo)}</div></div>
      <div><div class="r">Publicada em</div><div class="v">${htm(pfDataHora(p.agendada_para))}</div></div>
      <div><div class="r">Lâminas</div><div class="v">${(p.midias || []).length}</div></div>
      <div><div class="r">Situação</div><div class="v">${htm(p.status || '—')}</div></div>
    </div>
  </div>`;
}

// ---------- aba Números ----------
function pfPainelNumeros() {
  const p = pfPost;
  const c = pfContagem(pfIter);
  const n = (r, v, d) => `<div><div class="v">${pfNumero(v)}</div>
    <div class="r">${htm(r)}</div><div class="d">${htm(d || '')}</div></div>`;
  return `
    <div class="cm-nums">
      ${n('Alcance', p.alcance, 'pessoas diferentes')}
      ${n('Impressões', p.impressoes, 'vezes que apareceu')}
      ${n('Curtidas', p.curtidas, c.reacoes ? c.reacoes + ' com nome no Facebook' : '')}
      ${n('Comentários', c.todos || p.comentarios_qtd,
          c.instagram + ' IG · ' + c.facebook + ' FB')}
      ${n('Salvamentos', p.salvamentos, 'só Instagram')}
      ${n('Compartilhamentos', p.compartilhamentos, 'só Facebook')}
    </div>
    <div class="cm-nota">
      ${htm(pfExplicacao('metricas'))}
      Última leitura: <b>${p.metricas_em ? htm(pfDataHora(p.metricas_em))
        : 'ainda não houve'}</b>.
    </div>`;
}

// ---------- aba Comentários ----------
function pfPainelComentarios() {
  const c = pfContagem(pfIter);
  const lista = pfFiltrar(pfIter, pfFiltro, pfBusca);
  const pilula = (chave, rotulo, qtd) =>
    `<button class="${pfFiltro === chave ? 'on' : ''}"
       onclick="pfFiltrarPor('${chave}')">${htm(rotulo)} (${qtd})</button>`;

  return `<div class="g70" style="gap:0">
    <div class="cm-lado">
      <div class="cm-filtros">
        ${pilula('todos', 'Todos', c.todos)}
        ${pilula('pendentes', 'Sem resposta', c.pendentes)}
        ${pilula('instagram', 'Instagram', c.instagram)}
        ${pilula('facebook', 'Facebook', c.facebook)}
        <span class="cm-busca"><input id="pf-busca" placeholder="Procurar no texto…"
          value="${htm(pfBusca)}" oninput="pfBuscar(this.value)"></span>
      </div>
      ${lista.length ? lista.map(pfComentario).join('')
        : `<div class="cm-vazio">${pfIter.length
            ? 'Nenhum comentário com esse filtro.'
            : 'Ainda não chegou comentário nesta postagem.'}</div>`}
    </div>
    <div>${pfCartaoReacoes()}${pfCartaoLeads()}</div>
  </div>`;
}

function pfFiltrarPor(qual) { pfFiltro = qual; pfDesenharPainel(); }

function pfBuscar(texto) {
  pfBusca = texto;
  pfDesenharPainel();
  // redesenhar o painel troca o input por outro igual: sem devolver o
  // cursor, a segunda letra digitada iria para lugar nenhum
  const b = pfElemento('busca');
  if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); }
}

function pfComentario(i) {
  const novo = !i.tratado && !i.resposta_externo_id;
  const iniciais = pfIniciais(pfNomeDoAutor(i));
  return `
  <div class="cm-com${novo ? ' novo' : ''}">
    <div class="ft">${htm(iniciais)}</div>
    <div class="mio">
      <div class="aut">${htm(pfNomeDoAutor(i))}
        <span class="cm-rede ${i.rede === 'instagram' ? 'ig' : 'fb'}">${
          htm(PF_REDES[i.rede] || i.rede)}</span>
        <span class="qd">${htm(pfQuando(i.criado_em_rede))}</span>
        ${i.lead_id ? `<span class="tag tag-verde">${htm(pfCodigoDoLead(i.lead_id))}</span>` : ''}
      </div>
      <div class="txt">${htm(i.texto || '')}</div>
      ${i.resposta_texto ? `<div class="cm-resp"><b>Moralí respondeu</b>
        <span class="qd">· ${htm(pfQuando(i.respondido_em))}</span><br>
        ${htm(i.resposta_texto)}</div>` : ''}
      <div class="ac">
        ${pfPodeResponder(i)
          ? `<button data-perm="postagens:editar"
               onclick="pfResponder('${jsq(i.id)}')">Responder</button>` : ''}
        ${!i.lead_id
          ? `<button data-perm="leads:criar"
               onclick="pfVirarLead('${jsq(i.id)}')">Virar lead</button>`
          : `<button onclick="pfAbrirLead('${jsq(i.lead_id)}')">Abrir o lead</button>`}
        ${i.tratado
          ? '<button class="apaga" disabled>Tratado ✓</button>'
          : `<button class="apaga" data-perm="postagens:editar"
               onclick="pfTratar('${jsq(i.id)}')">Marcar como tratado</button>`}
      </div>
      ${pfRespondendo === i.id ? pfCaixaDeResposta(i) : ''}
    </div>
  </div>`;
}

function pfIniciais(nome) {
  const limpo = String(nome || '').replace(/^@/, '').replace(/[._-]+/g, ' ').trim();
  if (!limpo) return '?';
  const p = limpo.split(/\s+/);
  return ((p[0][0] || '') + (p.length > 1 ? (p[p.length - 1][0] || '') : ''))
    .toUpperCase().slice(0, 2);
}

function pfCodigoDoLead(id) {
  const l = pfLeads.find(x => x.id === id);
  return l ? (l.codigo || 'Lead') : 'Lead';
}

function pfCaixaDeResposta(i) {
  return `<div class="cm-caixa">
    <textarea id="pf-resposta" placeholder="Escreva a resposta…"
      maxlength="2200"></textarea>
    <div class="pe">
      <button class="btn" onclick="pfEnviarResposta('${jsq(i.id)}')">Responder no ${
        htm(PF_REDES[i.rede] || i.rede)}</button>
      <button class="btn btn-claro" onclick="pfResponder(null)">Cancelar</button>
      <span class="obs">a resposta aparece no post e fica guardada aqui</span>
    </div>
  </div>`;
}

/** O cartão das reações. Existe SÓ porque o Facebook entrega o nome de
 *  quem reagiu — e a nota explica por que o Instagram não aparece aqui,
 *  que é a pergunta que a tela provoca. */
function pfCartaoReacoes() {
  const r = (pfIter || []).filter(i => i.tipo === 'reacao');
  return `<div class="cartao" style="border:0;border-radius:0;box-shadow:none;margin:0">
    <h2>Quem reagiu <span class="cnt">(${r.length})</span>
      <span class="dir"><span class="cm-rede fb">só Facebook</span></span></h2>
    ${r.length ? r.slice(0, 12).map(i => `
      <div class="cm-quem"><span class="ft">${htm(pfIniciais(pfNomeDoAutor(i)))}</span>
        <span>${htm(pfNomeDoAutor(i))}</span>
        <span style="margin-left:auto;color:var(--texto-suave);font-size:12px">${
          htm(PF_REACOES[i.reacao] || i.reacao || 'reagiu')}</span></div>`).join('')
      : '<div class="cm-vazio">Nenhuma reação do Facebook até agora.</div>'}
    ${r.length > 12 ? `<div class="cm-nota">e mais ${r.length - 12}.</div>` : ''}
    <div class="cm-nota">${htm(pfExplicacao('curtidas'))}</div>
  </div>`;
}

function pfCartaoLeads() {
  return `<div class="cartao"
      style="border:0;border-top:1px solid var(--borda);border-radius:0;box-shadow:none;margin:0">
    <h2>Leads deste post <span class="cnt">(${pfLeads.length})</span></h2>
    ${pfLeads.length ? `<table class="mini">${pfLeads.map(l => `
      <tr><td style="width:1%;white-space:nowrap">
        <a href="lead.html?id=${encodeURIComponent(l.id)}">${htm(l.codigo || 'ver')}</a></td>
        <td>${htm(l.nome || '')}<div style="color:var(--texto-suave);font-size:12px">${
          htm(l.telefone || 'sem telefone ainda')}</div></td>
        <td style="width:1%"><span class="tag tag-cinza">${htm(l.status || '')}</span></td>
      </tr>`).join('')}</table>`
      : '<div class="cm-vazio">Nenhum lead saiu desta postagem ainda.</div>'}
    <div class="cm-nota">${htm(pfExplicacao('lead'))}</div>
  </div>`;
}

// ------------------------------------------------------------
// as ações
// ------------------------------------------------------------
function pfResponder(id) {
  pfRespondendo = id || null;
  pfDesenharPainel();
  const t = pfElemento('resposta');
  if (t) t.focus();
}

async function pfEnviarResposta(id) {
  const caixa = pfElemento('resposta');
  const texto = caixa ? caixa.value.trim() : '';
  if (!texto) { await dialogoAvisar('Escreva a resposta antes de enviar.'); return; }

  const botao = event && event.target;
  if (botao) { botao.disabled = true; botao.textContent = 'Enviando…'; }

  // A resposta sai pela Edge, nunca daqui: o token da Meta não pode
  // existir no navegador.
  const { data, error } = await sb.functions.invoke('postagens-comentar', {
    body: { interacao_id: id, texto }
  });

  // O invoke esconde o corpo quando a Edge responde não-2xx — a lição
  // da v1.498. Por isso a Edge devolve 200 nos negativos de negócio, e
  // aqui ainda assim se tenta ler o contexto do erro.
  let resposta = data;
  if (error) {
    resposta = null;
    try {
      if (error.context && typeof error.context.json === 'function') {
        resposta = await error.context.json();
      }
    } catch (_) { /* fica no genérico */ }
  }

  if (!resposta || !resposta.ok) {
    if (botao) { botao.disabled = false; botao.textContent = 'Responder'; }
    await dialogoAvisar('Não consegui responder: '
      + ((resposta && resposta.erro) || (error && error.message) || 'erro desconhecido'));
    return;
  }

  pfRespondendo = null;
  await pfRecarregarInteracoes();
}

async function pfTratar(id) {
  const { error } = await sb.from('postagem_interacoes')
    .update({ tratado: true }).eq('id', id);
  if (error) { await dialogoAvisar('Não consegui marcar: ' + error.message); return; }
  await pfRecarregarInteracoes();
}

/** Vira lead. O que a Meta entrega decide o que o lead consegue ser:
 *  do Instagram vem o @, e nada mais — o lead nasce sem telefone e a
 *  tela diz isso em vez de fingir que está completo. */
async function pfVirarLead(id) {
  const i = pfIter.find(x => x.id === id);
  if (!i) return;

  const nome = pfNomeDoAutor(i);
  const ok = await dialogoPerguntar({
    texto: 'Criar um lead para ' + nome + '?'
      + (i.rede === 'instagram'
        ? '\n\nO Instagram não entrega telefone nem e-mail: o lead vai nascer só com o @, '
        + 'e alguém precisa puxar conversa no direct para conseguir o contato.'
        : ''),
    ok: 'Criar o lead'
  });
  if (!ok) return;

  const { data, error } = await sb.from('leads').insert({
    empresa_id: pfEmpresa(),
    nome: nome,
    tipo_lead: 'Inquilino',
    origem: i.rede === 'instagram' ? 'Instagram' : 'Facebook',
    observacoes: 'Veio de um comentário na postagem "'
      + pfTituloDaPostagem(pfPost, pfImovel) + '":\n\n' + String(i.texto || '')
      + (pfImovel ? '\n\nImóvel do anúncio: ' + (pfImovel.codigo || '')
          + ' — ' + (pfImovel.endereco || '') : '')
    // O IMÓVEL NÃO ENTRA COMO COLUNA, e é de propósito: o catálogo de
    // `leads` tem `imovel_endereco`, mas eu não consegui provar que
    // existe um `imovel_id` na tabela — e insert com coluna inexistente
    // falha na cara da pessoa, no meio do trabalho. Enquanto isso não
    // se confirma, o imóvel vai escrito na observação e a ligação de
    // verdade continua existindo pelo caminho comentário → postagem →
    // imóvel. Confirmado que a coluna existe, é uma linha aqui.
  }).select('id,codigo,nome,status,telefone').maybeSingle();

  if (error) { await dialogoAvisar('Não consegui criar o lead: ' + error.message); return; }

  const { error: e2 } = await sb.from('postagem_interacoes')
    .update({ lead_id: data.id, tratado: true }).eq('id', id);
  if (e2) {
    // O lead existe; só o vínculo falhou. Dizer isso é melhor do que
    // um erro genérico que faria a pessoa criar um segundo lead.
    await dialogoAvisar('O lead ' + (data.codigo || '') + ' foi criado, mas não consegui '
      + 'ligá-lo ao comentário: ' + e2.message);
  }
  await pfRecarregarInteracoes();
}

function pfAbrirLead(id) { location.href = 'lead.html?id=' + encodeURIComponent(id); }

/** Recarrega só o que muda depois de uma ação. Redesenhar a ficha
 *  inteira jogaria a pessoa de volta para o topo da lista. */
async function pfRecarregarInteracoes() {
  const { data } = await sb.from('postagem_interacoes').select('*')
    .eq('postagem_id', pfId).order('criado_em_rede', { ascending: false });
  pfIter = data || [];

  const ids = pfIter.map(i => i.lead_id).filter(Boolean);
  if (ids.length) {
    const { data: l } = await sb.from('leads')
      .select('id,codigo,nome,status,telefone').in('id', ids);
    pfLeads = l || [];
  }
  pfDesenharPainel();
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

// ------------------------------------------------------------
// início
// ------------------------------------------------------------
// v1.594 — ESTE ARQUIVO AGORA SERVE DUAS TELAS.
//
// A fila de comentários da tela Postagens usa as funções puras daqui
// (pfNomeDoAutor, pfQuando, pfIniciais) — é o mesmo comentário, com o
// mesmo nome e o mesmo "há 2 horas" nos dois lugares. Duplicá-las era o
// caminho fácil e o errado: no dia em que o Instagram mudar o formato
// do @, uma das cópias ficaria para trás.
//
// A guarda do #pf-conteudo é o que permite isso: carregado pela
// postagens.html, este arquivo entrega as funções e NÃO tenta desenhar
// ficha nenhuma (pfCarregar escreveria num elemento que não existe ali,
// e o erro derrubaria o resto do boot da tela).
if (typeof exigirLogin === 'function' && document.getElementById('pf-conteudo')) {
  exigirLogin().then(s => {
    if (!s) return;
    pfId = new URLSearchParams(location.search).get('id');
    pfCarregar();
  });
}

// para a bateria de testes rodar no Node, sem navegador
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    pfContagem, pfFiltrar, pfNomeDoAutor, pfQuando, pfPodeResponder,
    pfIniciais, pfTituloDaPostagem, pfExplicacao,
    // peneira de URL para dentro de url('…'): regra de segurança tem
    // de ter teste rodando (v1.403)
    pfUrlCss
  };
}
