// ============================================================
// DEMONSTRATIVO DO ALUGUEL — v1.224
// (o nome antigo trazia a palavra "mensalidade"; o Rodrigo a trocou
//  na v1.477 — o cliente dele não usa esse termo, usa aluguel. A
//  palavra fica aqui, no comentário, só para explicar a troca.)
//
// A folha que explica o boleto para o inquilino. Não é cobrança: o
// pagamento continua sendo pelo boleto do Asaas, criado à mão. Este
// documento existe porque o boleto chega com um número só, e a pergunta
// "por que veio esse valor?" não tinha resposta em lugar nenhum.
//
// Lê o que a v1.222 passou a gravar (competencia_itens) — cada linha com
// nome e observação. Sem consulta nova, sem tabela nova, sem SQL.
//
// O PDF quem faz é o navegador, no "Imprimir → Salvar como PDF". Uma
// biblioteca de PDF aqui seria 300 KB no navegador de todo mundo para
// refazer o que o Chrome já faz melhor, e mais uma dependência para
// manter viva.
// ============================================================

const ID = new URLSearchParams(location.search).get('id');
let parcela = null;
let itens = [];
let contrato = null;
let itensContrato = {};   // v1.446 — contrato_item_id → {inicio_competencia, parcelas}

/**
 * De onde saem os dados da imobiliária no rodapé.
 *
 * A linha da empresa no banco manda; as constantes do config.js são o
 * padrão de quem ainda não preencheu. É o que faz a segunda imobiliária
 * ter o próprio rodapé sem ninguém editar arquivo — e o que evita que a
 * Moralí fique sem contato enquanto essas colunas não existem.
 *
 * O CNPJ NÃO ENTRA no demonstrativo (decisão de 09/08/2026): não faz
 * falta para o inquilino entender o boleto, e o CRM vai ser vendido para
 * outras imobiliárias — documento é lugar de dizer o necessário, não
 * tudo que se sabe.
 */
function dadosDaEmpresa() {
  const e = (typeof PERM !== 'undefined' && PERM.empresa) ? PERM.empresa : {};
  const p = (typeof EMPRESA_CONTATO !== 'undefined') ? EMPRESA_CONTATO : {};
  // o telefone vem do banco em dígitos puros (o salvarEmpresa grava com
  // soDigitos); quem escreve "(17) 99680-8900" é o formatos.js
  const tel = e.telefone || p.telefone || '';
  return {
    nome: e.nome_fantasia || EMPRESA.nome,
    razao: e.razao_social || EMPRESA.razaoSocial,
    telefone: (tel && typeof mascaraTelefone === 'function') ? mascaraTelefone(tel) : tel,
    // v1.225: a coluna chama email_contato, não email. Na v1.224 eu li
    // `e.email` — que não existe — e o cadastro do banco nunca seria
    // usado: cairia sempre no config.js, em silêncio.
    email: e.email_contato || p.email || '',
    cidade: e.cidade || p.cidade || '',
    creci: e.creci || ''
  };
}

async function carregarDemonstrativo() {
  const alvo = document.getElementById('conteudo');
  if (!ID) { alvo.innerHTML = aviso('Parcela não informada.'); return; }

  const [cp, ci] = await Promise.all([
    sb.from('competencias_painel').select('*').eq('id', ID).maybeSingle(),
    /* v1.256 — SÓ O LADO DO INQUILINO. A v1.231 pôs os descontos do
     * repasse na MESMA tabela (lado = 'proprietario') e esta consulta
     * ficou trazendo os dois: quem tinha desconto de manutenção no mês
     * via a linha do conserto no demonstrativo do INQUILINO, e a soma
     * não fechava com o valor_total — a diferença virava a linha
     * "Outros valores desta parcela", com sinal trocado. Com a v1.256
     * a linha do proprietário passa a existir todo mês em quem usa o
     * repasse recorrente, então isto deixaria de ser exceção. */
    sb.from('competencia_itens').select('*')
      .eq('competencia_id', ID).eq('lado', 'inquilino')
      .order('avulso').order('criado_em')
  ]);
  if (cp.error || !cp.data) {
    alvo.innerHTML = aviso('Não foi possível abrir esta parcela.'
      + (cp.error ? ' (' + cp.error.message + ')' : ''));
    return;
  }
  parcela = cp.data;
  itens = ci.data || [];

  // o aluguel cheio do contrato — é ele que permite dizer "proporcional"
  if (parcela.contrato_id) {
    const { data } = await sb.from('contratos')
      .select('codigo,valor_aluguel,dia_vencimento')
      .eq('id', parcela.contrato_id).maybeSingle();
    contrato = data || null;
    // v1.446 — os itens do contrato para numerar os seguros ("11/12")
    const { data: cits } = await sb.from('contrato_itens')
      .select('id,inicio_competencia,parcelas,ciclo_meses,primeira_paga_fora')
      .eq('contrato_id', parcela.contrato_id);
    (cits || []).forEach(c => { itensContrato[c.id] = c; });
  }
  const v = document.getElementById('dm-voltar');
  if (v) v.href = 'competencia.html?id=' + encodeURIComponent(ID);
  document.title = 'Demonstrativo ' + (parcela.mes_ref || '') + ' — CRM Moralí';

  /* v1.476 — O CARIMBO VEM DE `competencias`, NÃO DO PAINEL.
   *
   * A conferência do sql-05 respondeu "não" na linha 9: o
   * `competencias_painel` lista as colunas uma a uma e não herdou o
   * `demonstrativo_enviado_em` que o ALTER criou. A view `competencias`
   * herdou (o gatilho de DDL de 15/08 a regenera sozinha).
   *
   * Então busco só esse campo lá, em vez de reescrever o painel — que
   * é uma view grande, que eu não conheço inteira, e cuja recriação a
   * partir de uma cópia velha é exatamente o defeito silencioso que já
   * mordeu este CRM duas vezes. Uma consulta de um campo é mais barata
   * que esse risco.
   */
  const { data: carimbo } = await sb.from('competencias')
    .select('demonstrativo_enviado_em').eq('id', ID).maybeSingle();
  if (carimbo) parcela.demonstrativo_enviado_em = carimbo.demonstrativo_enviado_em;

  dmBotaoEnviar();          // v1.476 — só de dentro do CRM
  desenhar();
}

function aviso(msg) {
  return `<div class="cartao"><div class="corpo">${htm(msg)}</div></div>`;
}

/**
 * A EXPLICAÇÃO DO ALUGUEL PROPORCIONAL.
 *
 * "Por que o primeiro aluguel veio R$ 82,00?" é a pergunta número um de
 * todo contrato novo. Os dias saem da própria conta do banco
 * (aluguel ÷ 30 × dias), e só aparecem quando fecham exato — chutar um
 * número de dias num documento que vai para o inquilino é pior que
 * não dizer nada.
 */
function explicacaoDoAluguel() {
  const cheio = contrato ? Number(contrato.valor_aluguel) || 0 : 0;
  const val = Number(parcela.valor_aluguel) || 0;
  if (!cheio || Math.abs(val - cheio) < 0.005) return '';
  const quando = parcela.primeiro_mes ? 'Primeiro mês' :
                 (parcela.ultimo_mes ? 'Último mês' : 'Mês proporcional');
  const dias = Math.round(val * 30 / cheio);
  // v1.474 — o 1º mês é gerado com a diária ARREDONDADA
  // (round(aluguel/30, 2) × dias); conferir com cheio/30 exato dava
  // centavos de diferença e escondia o número. Aceita as duas convenções.
  const r2 = x => Math.round(x * 100) / 100;
  const fecha = dias > 0 && dias <= 31 &&
    (Math.abs(r2(cheio / 30) * dias - val) < 0.02 || Math.abs(r2(cheio * dias / 30) - val) < 0.02);
  return `${quando} · ${fecha ? `${dias} dia${dias > 1 ? 's' : ''} proporciona${dias > 1 ? 'is' : 'l'}` : 'valor proporcional'}`
       + ` · aluguel integral ${moeda(cheio)}`;
}

/** v1.446 — " 11/12" ao lado do nome do seguro na folha do inquilino.
 *  Mesma conta da ficha: mês de início do item + total de parcelas. */

function parcelaSeguroDem(it) {
  const nome = it.nome || '';
  if (!it.contrato_item_id || !/seguro|fian|inc[eê]nd/i.test(nome)) return '';
  const src = itensContrato[it.contrato_item_id];
  if (!src || !src.inicio_competencia) return '';
  const tot = Number(src.parcelas) || (/fian/i.test(nome) ? 12 : /inc[eê]nd/i.test(nome) ? 6 : 0);
  if (!tot) return '';
  const mesISO = d => String(d || '').slice(0, 7);
  const ini = mesISO(src.inicio_competencia), cur = mesISO(parcela.competencia);
  if (!ini || !cur) return '';
  const [ay, am] = ini.split('-').map(Number);
  const [by, bm] = cur.split('-').map(Number);
  const r = numeroDaParcelaDoSeguro((by - ay) * 12 + (bm - am),
              tot, src.ciclo_meses, src.primeira_paga_fora);
  return r ? ` ${r.n}/${r.tot}` : '';
}

function desenhar() {
  const p = parcela;
  const em = dadosDaEmpresa();
  const n = x => Number(x) || 0;

  // As linhas na ordem em que o inquilino lê: o aluguel, os itens do
  // mês, e por último o que só existe quando algo saiu do previsto.
  const linhas = [];
  linhas.push({ nome: 'Aluguel', obs: explicacaoDoAluguel(), valor: n(p.valor_aluguel) });
  itens.forEach(it => linhas.push({ nome: it.nome + parcelaSeguroDem(it), obs: it.observacao || '', valor: n(it.valor) }));
  if (n(p.valor_encargos)) linhas.push({ nome: 'Encargos', obs: '', valor: n(p.valor_encargos) });
  if (n(p.outros_creditos)) linhas.push({ nome: 'Outros', obs: '', valor: n(p.outros_creditos) });
  if (n(p.multa)) linhas.push({ nome: 'Multa por atraso', obs: '', valor: n(p.multa) });
  if (n(p.juros)) linhas.push({ nome: 'Juros de mora', obs: '', valor: n(p.juros) });

  /* O DOCUMENTO NÃO PODE MENTIR.
   *
   * O total impresso é o valor_total da parcela — é ele que vira boleto.
   * Se a soma das linhas não fechar com ele (uma coluna nova no banco,
   * um acerto feito por fora), em vez de imprimir um total que não bate
   * com as linhas, a diferença aparece como linha. Documento que não
   * fecha na frente do inquilino é pior que documento sem detalhe. */
  const soma = linhas.reduce((a, l) => a + l.valor, 0);
  const total = n(p.valor_total);
  if (Math.abs(soma - total) >= 0.01)
    linhas.push({ nome: 'Outros valores desta parcela', obs: '', valor: total - soma });

  const endereco = [p.imovel_endereco, p.imovel_bairro].filter(Boolean).join(' · ');
  const parcelaTxt = p.parcela
    ? `parcela ${p.parcela}${p.parcelas_total ? ' de ' + p.parcelas_total : ''}` : '';

  document.getElementById('conteudo').innerHTML = `
  <div class="dm-folha">
    <div class="dm-topo" style="background:#fff;border-bottom:2px solid #023047;text-align:center;padding:22px 16px 16px;display:block">
      <img src="img/logo-morali.png" alt="${htm(em.nome)}" style="height:42px;width:auto;margin:0 auto 8px;display:block">
      <div style="color:#41616E;font-size:12.5px;font-weight:500;font-family:inherit">Aluguel descomplicado para você</div>
      <div style="color:#6b7c84;font-size:12px;margin-top:4px">Demonstrativo do aluguel · ${htm(mesPorExtenso(p.competencia) || p.mes_ref || '')}</div>
    </div>

    <div class="dm-dados">
      <div><div class="dm-r">Inquilino</div>
        <div class="dm-v">${htm(p.inquilino_nome || '—')}</div></div>
      <div><div class="dm-r">Vencimento</div>
        <div class="dm-v"><b>${htm(dataBr(p.vencimento))}</b></div></div>
      <div><div class="dm-r">Imóvel</div>
        <div class="dm-v">${htm(endereco || '—')}</div></div>
      <div><div class="dm-r">Contrato</div>
        <div class="dm-v">${htm(p.contrato_codigo || '—')}${parcelaTxt ? ' · ' + htm(parcelaTxt) : ''}</div></div>
    </div>

    <h2>O que está sendo cobrado</h2>
    <table class="dm-linhas">
      <tr><th>Descrição</th><th class="dm-n">Valor</th></tr>
      ${linhas.map(l => `<tr${l.valor < 0 ? ' class="dm-abate"' : ''}>
        <td>${htm(l.nome)}${l.obs ? `<span class="dm-obs">${htm(l.obs)}</span>` : ''}</td>
        <td class="dm-n">${l.valor < 0 ? '− ' + moeda(Math.abs(l.valor)) : moeda(l.valor)}</td>
      </tr>`).join('')}
    </table>

    <div class="dm-total">
      <div class="dm-r">Total a pagar
        <small>Vencimento em ${htm(dataBr(p.vencimento))}</small></div>
      <div class="dm-v">${moeda(total)}</div>
    </div>

    <div class="dm-aviso">
      Este demonstrativo explica a composição do aluguel do mês.
      <b>O pagamento é feito pelo boleto enviado separadamente</b> — este documento
      não é cobrança e não tem código de barras. Depois do vencimento incidem a multa
      e os juros previstos em contrato. Dúvida em alguma linha? Fale com a gente antes
      de pagar.
    </div>

    <div class="dm-pe">
      <div><b>${htm(em.razao)}</b>${
        em.creci ? ' · CRECI ' + htm(em.creci) : ''}${
        em.email ? '<br>' + htm(em.email) : ''}${
        em.telefone ? ' · ' + htm(em.telefone) : ''}${
        em.cidade ? '<br>' + htm(em.cidade) : ''}</div>
      <div class="dm-dir">Documento gerado em ${htm(dataBr(hojeLocalISO()))}<br>
        ${htm(p.contrato_codigo || '')}${p.codigo ? ' · ' + htm(p.codigo) : ''}</div>
    </div>
  </div>`;
}

/** 'AAAA-MM-01' → 'Julho / 2026' */
function mesPorExtenso(iso) {
  const m = String(iso || '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(m)) return '';
  const N = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
             'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const [a, me] = m.split('-').map(Number);
  return (N[me - 1] || '') + ' / ' + a;
}

/** hoje em ISO, na hora LOCAL — new Date().toISOString() volta em UTC e
 *  vira o dia seguinte depois das 21h aqui (lição da v1.115). */
function hojeLocalISO() {
  const d = new Date(); const z = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/* ============================================================
 * v1.476 — MANDAR PARA O INQUILINO
 *
 * O botão entra na barra por JS, não no HTML: assim a folha pública
 * (aluguel.html), que carrega este mesmo arquivo, não herda um
 * botão que só faz sentido de dentro do CRM.
 *
 * O envio é DIRETO pela Evolution — a mesma decisão do recibo do
 * proprietário na v1.473. O link que vai na mensagem é o
 * `aluguel.html?t=<token>`, que a RPC monta: o token é do
 * INQUILINO, diferente do recibo_token, que abre o documento do
 * proprietário com a taxa de administração dentro.
 * ============================================================ */
function dmBotaoEnviar() {
  const barra = document.getElementById('dm-barra');
  if (!barra || document.getElementById('dm-btn-zap')) return;
  const b = document.createElement('button');
  b.className = 'btn';
  b.id = 'dm-btn-zap';
  b.setAttribute('data-perm', 'competencias:editar');
  const jaFoi = parcela && parcela.demonstrativo_enviado_em;
  b.innerHTML = icone('enviar', 15) + ' '
    + (jaFoi ? 'Reenviar pelo WhatsApp' : 'Enviar pelo WhatsApp');
  if (!parcela || !parcela.inquilino_telefone) {
    b.disabled = true;
    b.title = 'O inquilino está sem telefone no cadastro';
  } else {
    b.onclick = dmEnviarWhats;
  }
  barra.appendChild(b);
}

async function dmEnviarWhats() {
  const b = document.getElementById('dm-btn-zap');
  b.disabled = true;
  const antes = b.innerHTML;
  b.innerHTML = 'Enviando…';
  try {
    const { data, error } = await sb.rpc('demonstrativo_enviar', { p_competencia: ID });
    if (error) throw new Error(error.message);

    // o cutucão COM mira: é uma mensagem só, sai sem esperar a pausa
    if (!(data && data.ajustada)) {
      try { await sb.rpc('mensagem_disparar_agora', { p_id: data.id }); } catch (e) { /* o cron cobre */ }
    }
    parcela.demonstrativo_enviado_em = data && data.enviar_em;
    b.innerHTML = icone('checkCirculo', 15) + (data && data.ajustada
      ? ' na fila — sai ' + dataHoraBr(data.enviar_em)
      : ' enviado');
    // adiado NÃO é erro: o aviso vai no próprio botão, não em vermelho
  } catch (e) {
    b.innerHTML = antes;
    b.disabled = false;
    alerta(e.message || 'Não foi possível enviar o demonstrativo.');
  }
}

exigirLogin().then(s => { if (s) carregarDemonstrativo(); });
