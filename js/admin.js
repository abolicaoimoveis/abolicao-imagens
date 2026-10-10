// ============================================================
// ADMINISTRAÇÃO — empresas, papéis e permissões, usuários e convites
//
// Regra que atravessa a tela toda: permissão é definida no PAPEL,
// não no usuário. A empresa mexe em 4 ou 5 papéis em vez de dezenas
// de pessoas.
// ============================================================

// ESTA LISTA É A TELA DE PAPÉIS. Objeto que não está aqui NÃO APARECE na
// matriz — e ninguém consegue ajustar a permissão dele por tela nenhuma.
//
// 29/07/2026: contratos, comissões e sinistros existiam no menu, no banco
// e nas políticas de segurança, e não estavam aqui. Eu mesmo disse ao
// Rodrigo "ajuste na tela de Papéis" para um objeto que a tela não
// mostrava. A bateria agora barra a publicação se o menu tiver objeto que
// esta lista não tem.
const OBJETOS = [
  ['leads', 'Leads'], ['contatos', 'Contatos'], ['imoveis', 'Imóveis'],
  ['contratos', 'Contratos'], ['competencias', 'Aluguéis'],
  ['casos', 'Casos'], ['sinistros', 'Sinistros'],
  ['comissoes', 'Comissões'], ['tarefas', 'Tarefas'], ['financeiro', 'Financeiro'],
  // v1.241: os dois objetos do 5W2H. São duas linhas porque são dois
  // objetos de verdade — quem pode ver o plano pode não poder mexer nas
  // ações dos outros.
  ['planos', 'Planos de ação'], ['acoes', 'Ações — 5W2H'],
  // v1.600: o andar de cima. Sobem TRANCADOS (regra de 30/08): é aqui
  // que se libera. `indicadores` já entra na matriz porque a trava do
  // banco foi aberta junto — a tela dele chega na v1.601.
  ['objetivos', 'Objetivos'], ['resultados', 'Resultados-chave'],
  ['indicadores', 'Indicadores'],
  // v1.284: as fichas públicas. Nasce só para Administrador e Gestor
  // (sql-01) — ficha traz CPF, RG e renda de quem ainda não é cliente.
  ['fichas', 'Fichas'],
  // v1.141: o Painel só LÊ — mas entra na matriz porque menu sem linha
  // na matriz é permissão que ninguém consegue dar (lição do topo).
  ['painel', 'Metas'],   // v1.521 — a tela Painel virou "Metas"; a permissão continua 'painel' e cobre Metas, Definir metas e Análises
  ['relatorios', 'Relatórios'],
  // v1.519: os Painéis (dashboards). Entra na matriz pela lição do topo —
  // menu sem linha aqui é permissão que ninguém consegue dar. Nasce
  // trancado para todos os papéis (regra de 30/08).
  // v1.625 — devolvida: a v1.521 reescreveu este arquivo sobre uma cópia
  // anterior à v1.519 e apagou esta linha junto com o item do menu.
  ['paineis', 'Painéis'],
  ['administracao', 'Administração'],
  // v1.349: as conversas de WhatsApp. Entra na matriz pela lição do
  // topo — menu sem linha aqui é permissão que ninguém consegue dar.
  // O banco precisa da trava aberta antes de marcar (conversas-sql-4).
  ['conversas', 'Conversas'],
  // v1.399: as postagens de Instagram/Facebook. Entra na matriz pela
  // lição do topo — menu sem linha aqui é permissão que ninguém
  // consegue dar. O banco precisa da trava aberta antes de marcar
  // (03-abrir-a-trava-de-postagens.sql).
  ['postagens', 'Postagens'],
  // v1.126: governa a TELA CENTRAL de histórico (tudo de todo mundo).
  // O cartão na ficha NÃO depende dela — quem enxerga o registro
  // enxerga o histórico dele, que é o mesmo dado que já estava à vista.
  ['historico', 'Histórico de alterações']
];
// v1.779 — AS LINHAS SÓ DE CAMPOS (mockup Outros/Mockup-Papeis-Campos).
// A parcela e o ciclo não têm permissão própria de ver/criar/editar/excluir
// — seguem Comissões e Planos de ação (o posso() deles é o do objeto de
// cima) —, mas têm campos que se escondem. A linha aparece logo abaixo da
// que ela segue, só com o botão Campos. [objeto, rótulo, segue]
const OBJETOS_SO_CAMPOS = [
  // v1.780 — a apólice segue Contratos (criar e editar pedem editar contratos)
  ['contrato_seguros', 'Apólices', 'contratos'],
  ['comissao_parcelas', 'Parcelas de comissão', 'comissoes'],
  ['ciclos', 'Ciclos PDCA', 'planos']
];
// v1.779 — de onde vêm os campos de cada linha no botão Campos:
//   pers    → o objeto em que os campos da imobiliária estão gravados
//             (o Financeiro grava os dele como 'lancamentos');
//   soPers  → só os campos da imobiliária: os do sistema destes não têm
//             catálogo aqui, e esconder um deles (o valor, a data) quebraria
//             a tela, que decide coisas com eles.
// O nome da MÁSCARA vem de mascaraDoObjeto() (permissoes.js).
const CAMPOS_DA_LINHA = {
  financeiro: { pers: 'lancamentos', soPers: true },
  comissoes: { soPers: true }, comissao_parcelas: { soPers: true }, ciclos: { soPers: true },
  contrato_seguros: { soPers: true }   // v1.780
};
function persDaLinha(o) { return (CAMPOS_DA_LINHA[o] || {}).pers || o; }
function mascaraDaLinha(o) { return (typeof mascaraDoObjeto === 'function') ? mascaraDoObjeto(o) : o; }

const ACOES = [
  ['ver', 'Ver'], ['criar', 'Criar'], ['editar', 'Editar'],
  ['excluir', 'Excluir'], ['aprovar', 'Aprovar']
];

// ONDE "APROVAR" QUER DIZER ALGUMA COISA.
// Aprovar é a chave de dinheiro: existe só onde alguém confirma um valor
// que sai ou entra. Nos outros objetos a caixinha fica desligada, para a
// matriz não sugerir um controle que o sistema não usa.
//   casos      → autorizar o gasto do orçamento de manutenção
//   comissoes  → liberar o pagamento ao parceiro
//   financeiro → repasse ao proprietário
//   sinistros  → confirmar que a indenização caiu na conta
const APROVAR_VALE_EM = ['casos', 'comissoes', 'financeiro', 'sinistros'];
// v1.540 — A OPÇÃO "SÓ OS VINCULADOS A MIM" VOLTOU (06/09/2026).
//
// A v1.539 tirou ela da tela com base num diagnóstico MEU e ERRADO.
// Eu li as políticas de `tarefas` e `leads`, vi que ambas só testam
// `meu_escopo(objeto) <> 'meus'` — e concluí que 'vinculados' não
// fazia nada em lugar nenhum. Generalizei a partir de dois objetos.
//
// O que ele faz de verdade, lido no banco:
//
//   casos      caso_pagamento_no_escopo(prestador):
//              se o escopo é 'vinculados', exige prestador = meu_contato()
//   comissoes  comissao_no_escopo(parceiro):
//              'vinculados' e 'meus' exigem parceiro = meu_contato()
//
// E o papel **Parceiro** NASCE com 'vinculados' em casos e financeiro
// (ver criar_papeis_padrao no banco): "Ve somente os casos em que e o
// prestador". Tirar a opção da tela quebrava a configuração de fábrica
// de um papel inteiro.
//
// O sql-01 da v1.539 (que trocava 'vinculados' por 'empresa') NÃO PODE
// SER RODADO: ele abriria os casos e o financeiro da imobiliária para
// o prestador.
//
// Onde 'vinculados' ainda NÃO faz efeito: leads e tarefas. Isso fica
// para uma versão seguinte — ou se implementa lá, ou a tela passa a
// oferecer a opção só nos objetos em que ela vale (como o `aprovar`
// já faz com APROVAR_VALE_EM). O que não dá é tirar de todos.
const ESCOPOS = [
  ['empresa', 'Todos da empresa'],
  ['meus', 'Só os meus'],
  ['vinculados', 'Só os vinculados a mim']
];

let empresas = [], empresaAtual = null;
let papeis = [], papelAberto = null, permissoesDoPapel = [];
let usuarios = [], convites = [], contatos = [];

// ------------------------------------------------------------
// CARGA
// ------------------------------------------------------------
async function iniciar() {
  // v1.406 — O TRILHO PRIMEIRO, ANTES DE QUALQUER COISA.
  // Daqui para baixo há código que procura a linha de uma seção para
  // esconder ou acender ("quem não é superadmin começa em Papéis", o
  // abrirAbaDaUrl()). Se o trilho ainda não existisse, todos eles
  // encontrariam nada e falhariam em silêncio.
  desenharTrilhoConfig();

  // v1.502 — o seletor de empresa SAIU desta tela: trocar de imobiliária
  // é pela Plataforma (o "Abrir o CRM de…" do topo ou o "Entrar no CRM"
  // da lista), e a faixa do administrador é o caminho de volta. A tela
  // trabalha sempre na empresa EM FOCO, que é a que o banco responde.
  if (PERM.superadmin) {
    const { data } = await sb.from('empresas').select('*').order('razao_social');
    empresas = data || [];
  } else {
    empresas = PERM.empresa ? [PERM.empresa] : [];
    // quem não é superadmin começa em Papéis (v1.500: a linha
    // "Empresas" não existe mais no trilho — mora na Plataforma)
    // v1.684 — só se Papéis está no plano; senão fica em Usuários
    if (document.querySelector('#cfg-trilho .cfg-linha[data-chave="papeis"]')) verAba('papeis');
  }
  empresaAtual = (PERM.superadmin && PERM.perfil.empresa_foco) || PERM.perfil.empresa_id;
  // ORDEM IMPORTA: a lista de usuarios e a de convites montam seletores
  // com os PAPEIS e as FICHAS DE CONTATO. Carregando tudo em paralelo,
  // quem terminasse primeiro desenhava a tela com o seletor vazio.
  // v1.765 — os objetos personalizados entram ANTES dos papéis: a matriz
  // de Papéis e o Gerenciador desenham uma linha/aba para cada um.
  await Promise.all([carregarPapeis(), carregarContatos(), carregarObjetosPers()]);
  await Promise.all([carregarEmpresas(), carregarUsuarios(), carregarConvites(),
                     carregarObjetos(), carregarLayouts(), carregarFunil(),
                     carregarLiberacoes2FA()]);
  abrirAbaDaUrl();
}

// ============================================================
// FUNIL E RÉGUAS (v1.118)
//
// Até a 1.117 as etapas do lead estavam escritas em cinco arquivos e a
// régua de follow-up era um [1,3,7,10,15] fixo dentro do ficha.js, só
// para Proprietário. Mudar um prazo pedia publicação; acrescentar uma
// etapa, cinco edições sincronizadas. Aqui isso vira cadastro: um funil
// por tipo de lead, com nome, prazo de retorno, dica e etapa final.
//
// Salvar reescreve o funil INTEIRO daquele tipo (apaga o que saiu,
// insere o que entrou, atualiza o resto) — assim a ordem na tela é a
// ordem no banco, sem campo de ordem para a pessoa administrar.
// ============================================================
let funilEtapas = { 'Inquilino': [], 'Proprietário': [] };

// ------------------------------------------------------------
// v1.301 — O MODO DA RÉGUA
//
// A régua nasceu decidindo: concluía um follow-up, a próxima tarefa
// aparecia. Em 18/08/2026 isso tinha virado 45 tarefas abertas que
// ninguém pediu. O modo passou a ser cadastro, como as etapas:
//
//   sozinha   → o de sempre (a tarefa nasce)
//   sugere    → a régua propõe, e a tarefa só nasce com um ✓ na tela
//               de Leads (tabela lead_followup_sugerido)
//   desligada → não faz nada
//
// Mora aqui, e não em Configurações gerais, porque é da mesma família
// dos prazos de retorno que estão logo abaixo: quem vem mexer na régua
// vem a esta aba. O seletor é o MESMO componente que escolhe o funil na
// tela de Leads (.sel-funil) — inventar um parecido seria pagar duas
// vezes pelo mesmo desenho.
//
// A trava de verdade é o CHECK em empresas.regua_modo; esta lista é
// conforto, e a ordem dos três é do mais automático ao menos.
// ------------------------------------------------------------
let reguaModo = 'sozinha';

const REGUA_MODOS = [
  { chave: 'sozinha',   rotulo: 'Cria as tarefas sozinha',
    dica: 'Como sempre foi: ao concluir um follow-up, o próximo já nasce na lista de tarefas de quem cuida do lead.' },
  { chave: 'sugere',    rotulo: 'Sugere, e eu autorizo',
    dica: 'A régua continua contando os dias e propondo a data, mas a tarefa só nasce quando alguém aprova no cartão "Follow-ups sugeridos", na tela de Leads. Nada entra na lista de tarefas sem passar por lá.' },
  { chave: 'desligada', rotulo: 'Desligada',
    dica: 'Nenhuma sugestão e nenhuma tarefa. O funil continua igual; o acompanhamento passa a ser todo na mão — e a coluna "Próximo contato" só terá data onde houver tarefa criada por você.' }
];

/**
 * v1.496 — A RÉGUA VIRA UMA FAIXA DE LARGURA INTEIRA.
 *
 * Ela era o PRIMEIRO item de uma grade de duas colunas (a `.funil-cfg`,
 * onde entravam os dois funis). Como é larga, tomava a coluna da
 * esquerda inteira, empurrava o funil de Proprietário para a linha de
 * baixo e deixava metade da tela vazia. Agora sai da grade — que
 * também deixou de existir, porque os dois funis viraram abas.
 *
 * Os três modos passam a ser cartões com o rótulo e a explicação
 * juntos. Antes a explicação do modo escolhido era um `<span>` na
 * MESMA linha das pílulas: sobrava-lhe uma tira estreita e o rótulo
 * quebrava no meio ("Sugere, e / eu / autorizo:").
 */
function seletorDeModo() {
  return `
    <div class="regua-faixa">
      <h3>${icone('relogio', 15)} Régua de follow-up</h3>
      <div class="sub">Vale para os dois funis desta imobiliária. Para calar a régua de
        <b>uma etapa só</b>, deixe os “dias de retorno” dela em branco, na lista abaixo.</div>
      <div class="modos">
        ${REGUA_MODOS.map(m => `
          <button type="button" class="modo ${m.chave === reguaModo ? 'on' : ''}"
            aria-pressed="${m.chave === reguaModo}" onclick="trocarModoRegua('${jsq(m.chave)}')">
            <span class="rot"><span class="bolha"></span>${htm(m.rotulo)}</span>
            <span class="exp">${htm(m.dica)}</span>
          </button>`).join('')}
      </div>
    </div>`;
}

async function trocarModoRegua(modo) {
  if (modo === reguaModo) return;
  const erro = document.getElementById('funil-erro');
  if (erro) erro.style.display = 'none';

  const { error } = await sb.from('empresas')
    .update({ regua_modo: modo }).eq('id', empresaAtual);
  if (error) {
    if (erro) { erro.textContent = 'Não consegui trocar o modo: ' + error.message;
                erro.style.display = ''; }
    return;
  }

  reguaModo = modo;
  // os dois lugares que guardam a empresa em memória, como o salvarPadroes faz
  const emp = (empresas || []).find(e => e.id === empresaAtual);
  if (emp) emp.regua_modo = modo;
  if (PERM.empresa && PERM.empresa.id === empresaAtual) PERM.empresa.regua_modo = modo;
  pintarFunil();
}


async function carregarFunil() {
  const { data, error } = await sb.from('funil_etapas')
    .select('*').eq('empresa_id', empresaAtual)
    .order('tipo_lead').order('ordem');
  if (error) {
    document.getElementById('funil-cfg').innerHTML =
      `<div class="vazio-min">Não consegui ler o funil: ${htm(error.message)}</div>`;
    return;
  }
  funilEtapas = { 'Inquilino': [], 'Proprietário': [] };
  (data || []).forEach(e => {
    if (funilEtapas[e.tipo_lead]) funilEtapas[e.tipo_lead].push(e);
  });
  // v1.301 — o modo da régua vem da empresa em foco, que já foi lida com select('*')
  const empFoco = (empresas || []).find(e => e.id === empresaAtual);
  reguaModo = (empFoco && empFoco.regua_modo) || 'sozinha';
  funilMudou = false;      // acabou de vir do banco: não há nada por salvar
  pintarFunil();
}

// ------------------------------------------------------------
// v1.496 — AS DUAS COISAS QUE A TELA GUARDA ALÉM DAS ETAPAS
//
// `funilAba` existe porque os dois funis deixaram de ser duas colunas
// lado a lado e viraram abas: um de cada vez, com a largura toda. Em
// duas colunas cada etapa cabia em 92px, e nome, dica, dias, cor e
// "final" iam empilhados ali dentro.
//
// `funilMudou` acende o aviso do rodapé. Esta tela guarda tudo em
// memória e só grava no "Salvar o funil" — sem o aviso, sair da aba
// com meia dúzia de prazos digitados perde tudo em silêncio.
// ------------------------------------------------------------
let funilAba = 'Inquilino';
let funilMudou = false;

const FUNIL_TIPOS = [['Inquilino', 'chave'], ['Proprietário', 'casa']];

const FUNIL_CORES = [
  ['tag-azul', 'azul', '#E7F0F6'], ['tag-verde', 'verde', '#EBF6E4'],
  ['tag-amarela', 'amarela', '#fdf3e0'], ['tag-vermelha', 'vermelha', '#fdeaea'],
  ['tag-cinza', 'cinza', '#edf0f4']
];

/**
 * O que os dias digitados QUEREM DIZER, em português.
 *
 * "1, 3, 7" é a sintaxe da régua, não uma frase — e o significado dela
 * (insistência crescente dentro da mesma etapa) estava só no bloco
 * amarelo do topo, que se lê uma vez e nunca mais. Aqui a leitura fica
 * embaixo do campo, mudando enquanto se digita.
 */
function lerDias(dias) {
  const n = (dias || []).filter(v => Number.isFinite(v));
  if (!n.length) return { txt: 'esta etapa não cobra retorno', mudo: true };
  if (n.length === 1) return { txt: 'volta a cada ' + n[0] + (n[0] === 1 ? ' dia' : ' dias'), mudo: false };
  return { txt: 'volta em ' + n[0] + (n[0] === 1 ? ' dia' : ' dias') +
                ', depois ' + n.slice(1).join(', '), mudo: false };
}

function pintarFunil() {
  const caixa = document.getElementById('funil-cfg');
  if (!caixa) return;
  const lista = funilEtapas[funilAba] || [];
  caixa.innerHTML = seletorDeModo() + `
    <div class="funil-abas">
      <div class="sel-funil">
        ${FUNIL_TIPOS.map(([tipo, ic]) => `<button class="${tipo === funilAba ? 'on' : ''}"
          onclick="trocarAbaFunil('${jsq(tipo)}')">${icone(ic, 14)} Funil de ${htm(tipo)}</button>`).join('')}
      </div>
      <span class="conta">${lista.length} ${lista.length === 1 ? 'etapa' : 'etapas'} neste funil</span>
    </div>
    <div class="et-linha et-cab">
      <div style="text-align:center">#</div>
      <div>Etapa e dica</div>
      <div style="text-align:center">Dias de retorno</div>
      <div>Cor</div>
      <div>Encerra o funil</div>
      <div></div>
    </div>
    <div class="etapas">
      ${lista.map((e, i) => linhaFunil(funilAba, e, i)).join('')}
    </div>
    <button class="btn btn-claro" style="margin-top:12px"
      onclick="acrescentarEtapa('${jsq(funilAba)}')">${icone('mais', 15)} Acrescentar etapa no fim</button>`;
  pintarAvisoFunil();
}

/**
 * Os elementos desenhados pelo `pintarFunil`, procurados a partir do
 * container que existe no admin.html. Sem `#id` inventado no meio do
 * caminho: a conferência estrutural cobra que todo id procurado por um
 * js exista em alguma tela, e este nasceria só dentro do innerHTML.
 */
function dentroDoFunil(seletor) {
  const caixa = document.getElementById('funil-cfg');
  return caixa ? caixa.querySelectorAll(seletor) : [];
}

function trocarAbaFunil(tipo) {
  if (!funilEtapas[tipo] || tipo === funilAba) return;
  funilAba = tipo;
  pintarFunil();
}

/**
 * Uma etapa, com a largura da tela.
 *
 * A dica desceu para a linha inteira embaixo do nome (era uma caixinha
 * de duas linhas que cortava a frase no meio), o "final" virou
 * interruptor e, quando ligado, o campo de dias dá lugar a um texto —
 * antes ficava ali um campo cinza vazio, que parece defeito.
 */
function linhaFunil(tipo, e, i) {
  const dias = (e.dias_retorno || []).join(', ');
  const leitura = lerDias(e.dias_retorno);
  const cor = FUNIL_CORES.find(c => c[0] === (e.cor || 'tag-azul')) || FUNIL_CORES[0];
  return `
  <div class="et-linha ${e.encerra ? 'final' : ''}" data-tipo="${htm(tipo)}" data-i="${i}"
    ondragover="arrastarSobre(event,${i})" ondrop="arrastarSoltar(event,${i})"
    ondragleave="this.classList.remove('alvo-acima','alvo-abaixo')"
    ondragstart="arrastarComecar(event,${i})" ondragend="arrastarFim(event)">
    <span class="et-arrastar" role="button" tabindex="0" aria-label="Mudar a ordem desta etapa"
      title="Arraste para mudar a ordem (ou use as setas ↑ ↓)"
      onmousedown="this.closest('.et-linha').draggable = true"
      onkeydown="moverEtapaPelaTecla(event,${i})">⠿</span>
    <div class="et-num"><b>${i + 1}</b></div>
    <div>
      <div class="et-nome">
        <input value="${htm(e.nome || '')}" placeholder="Nome da etapa"
          oninput="mudarEtapa('${jsq(tipo)}',${i},'nome',this.value)">
      </div>
      <div class="et-dica">
        <span class="rot">Dica para quem trabalha o lead nesta etapa</span>
        <textarea placeholder="ex.: responda no mesmo dia e pergunte a região"
          oninput="mudarEtapa('${jsq(tipo)}',${i},'ajuda',this.value)">${htm(e.ajuda || '')}</textarea>
      </div>
    </div>
    ${e.encerra
      ? `<div class="et-encerra">${icone('check', 14)}<span>não cobra retorno</span></div>`
      : `<div class="et-dias">
          <input value="${htm(dias)}" placeholder="ex.: 1, 3, 7"
            title="Dias para retornar o contato. Vários números = insistência crescente."
            oninput="mudarDias('${jsq(tipo)}',${i},this)">
          <span class="leitura${leitura.mudo ? ' mudo' : ''}">${htm(leitura.txt)}</span>
        </div>`}
    <div class="et-cor">
      <span class="amostra" style="background:${cor[2]}"></span>
      <select onchange="mudarEtapa('${jsq(tipo)}',${i},'cor',this.value)"
        aria-label="Cor da etiqueta desta etapa">
        ${FUNIL_CORES.map(c =>
          `<option value="${c[0]}"${cor[0] === c[0] ? ' selected' : ''}>${c[1]}</option>`).join('')}
      </select>
    </div>
    <label class="et-final ${e.encerra ? 'on' : ''}">
      <input type="checkbox" ${e.encerra ? 'checked' : ''}
        onchange="mudarEtapa('${jsq(tipo)}',${i},'encerra',this.checked)">
      <span class="chave"></span><span>etapa final</span>
    </label>
    <button class="et-tirar" title="Tirar esta etapa"
      onclick="tirarEtapa('${jsq(tipo)}',${i})">${icone('xis', 16)}</button>
  </div>`;
}

/**
 * Os dias, digitados. NÃO repinta a tela — repintar a cada tecla
 * tiraria o cursor de dentro do campo. Só troca o texto da leitura,
 * que é o único pedaço que depende do que se digitou.
 */
function mudarDias(tipo, i, campo) {
  const e = funilEtapas[tipo] && funilEtapas[tipo][i];
  if (!e) return;
  e.dias_retorno = String(campo.value).split(',').map(v => parseInt(v.trim(), 10))
    .filter(n => Number.isFinite(n) && n >= 0);
  const leitura = lerDias(e.dias_retorno);
  const alvo = campo.parentNode.querySelector('.leitura');
  if (alvo) { alvo.textContent = leitura.txt; alvo.className = 'leitura' + (leitura.mudo ? ' mudo' : ''); }
  marcarFunilMudou();
}

function mudarEtapa(tipo, i, campo, valor) {
  const e = funilEtapas[tipo] && funilEtapas[tipo][i];
  if (!e) return;
  marcarFunilMudou();
  if (campo === 'encerra') {
    e.encerra = valor;
    if (valor) e.dias_retorno = null;   // etapa final não cobra retorno
    pintarFunil();                      // repinta: o campo de dias some/volta
  } else {
    e[campo] = valor;
    if (campo === 'cor') pintarFunil(); // a bolinha ao lado do seletor troca de cor
  }
}

function acrescentarEtapa(tipo) {
  funilEtapas[tipo].push({
    id: null, tipo_lead: tipo, nome: '', ordem: funilEtapas[tipo].length + 1,
    dias_retorno: [3], ajuda: '', cor: 'tag-azul', encerra: false, ativo: true
  });
  funilAba = tipo;
  marcarFunilMudou();
  pintarFunil();
  // o campo de nome da etapa nova já nasce com o cursor dentro
  const campos = dentroDoFunil('.et-nome input');
  if (campos.length) campos[campos.length - 1].focus();
}

function tirarEtapa(tipo, i) {
  funilEtapas[tipo].splice(i, 1);
  marcarFunilMudou();
  pintarFunil();
}

// ============================================================
// v1.496 — REORDENAR ARRASTANDO
//
// A ordem no banco é a posição na tela (o salvarFunil grava `ordem =
// i + 1`), e até aqui não havia como mudar essa posição: para pôr
// "Visita" antes de "Análise" era preciso apagar as duas e recriá-las
// na ordem certa — perdendo a dica escrita e, pior, esbarrando na
// trava que recusa tirar etapa que algum lead está usando.
//
// O arrasto é o do próprio navegador (draggable + dragstart/drop).
// A linha só fica arrastável quando o mouse desce no puxador ⠿ — sem
// isso, selecionar texto dentro do campo de nome viraria um arrasto.
// Quem prefere teclado tem ↑ e ↓ com o puxador em foco.
// ============================================================
let funilArrastando = null;

function arrastarComecar(ev, i) {
  funilArrastando = i;
  ev.currentTarget.classList.add('arrastando');
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move';
    // o Firefox só começa o arrasto se alguma coisa for escrita aqui
    ev.dataTransfer.setData('text/plain', String(i));
  }
}

function arrastarFim(ev) {
  funilArrastando = null;
  ev.currentTarget.draggable = false;
  ev.currentTarget.classList.remove('arrastando');
  dentroDoFunil('.et-linha')
    .forEach(l => l.classList.remove('alvo-acima', 'alvo-abaixo'));
}

function arrastarSobre(ev, i) {
  if (funilArrastando === null || funilArrastando === i) return;
  ev.preventDefault();                       // sem isto o navegador não deixa soltar
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
  const linha = ev.currentTarget;
  const meio = linha.getBoundingClientRect().top + linha.offsetHeight / 2;
  linha.classList.toggle('alvo-acima', ev.clientY < meio);
  linha.classList.toggle('alvo-abaixo', ev.clientY >= meio);
}

function arrastarSoltar(ev, i) {
  ev.preventDefault();
  const de = funilArrastando;
  if (de === null || de === i) return;
  const linha = ev.currentTarget;
  const meio = linha.getBoundingClientRect().top + linha.offsetHeight / 2;
  let para = ev.clientY < meio ? i : i + 1;
  if (de < para) para--;                     // tirar a linha de cima encurta a lista
  moverEtapa(funilAba, de, para);
}

/** Tira a etapa de um lugar e a põe em outro. Um só caminho para o
 *  arrasto e para as setas do teclado. */
function moverEtapa(tipo, de, para) {
  const lista = funilEtapas[tipo];
  // as DUAS pontas conferidas: um arrasto que começa numa aba e termina
  // com a outra à vista mandaria um índice que não existe nesta lista, e
  // o splice de origem devolveria `undefined` para dentro do funil.
  if (!lista || de === para) return;
  if (de < 0 || de >= lista.length || para < 0 || para >= lista.length) return;
  lista.splice(para, 0, lista.splice(de, 1)[0]);
  marcarFunilMudou();
  pintarFunil();
  // devolve o foco ao puxador da linha que se mexeu, para dar duas
  // setas seguidas sem voltar ao mouse
  const puxadores = dentroDoFunil('.et-arrastar');
  if (puxadores[para]) puxadores[para].focus();
}

function moverEtapaPelaTecla(ev, i) {
  if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
  ev.preventDefault();
  moverEtapa(funilAba, i, i + (ev.key === 'ArrowUp' ? -1 : 1));
}

// ------------------------------------------------------------
// v1.496 — O AVISO DE MUDANÇA NÃO SALVA
//
// A lista é longa: o "Salvar o funil" do cabeçalho sai da tela antes
// da terceira etapa. Além do botão gêmeo no rodapé, esta linha diz que
// há coisa por gravar — o estado que a tela inteira escondia.
// ------------------------------------------------------------
function marcarFunilMudou() { funilMudou = true; pintarAvisoFunil(); }

function pintarAvisoFunil() {
  const aviso = document.getElementById('funil-mudou');
  if (aviso) aviso.style.display = funilMudou ? '' : 'none';
  const descartar = document.getElementById('funil-descartar');
  if (descartar) descartar.disabled = !funilMudou;
}

/** Joga fora o que não foi salvo e relê o funil do banco de dados. */
async function descartarFunil() {
  if (!funilMudou) return;
  if (!(await dialogoPerguntar({ texto: 'Descartar as mudanças que ainda não foram salvas?', ok: 'Descartar', perigo: true }))) return;
  const erro = document.getElementById('funil-erro');
  if (erro) erro.style.display = 'none';
  await carregarFunil();
}

/**
 * Grava os dois funis. Antes de tocar no banco, confere o que dói
 * depois: etapa sem nome, nome repetido, e — o mais importante — etapa
 * que ALGUM LEAD está usando e que você está tirando. Sem essa última
 * checagem, o lead ficaria numa etapa que não existe mais, e a trava do
 * banco recusaria a próxima gravação dele com um erro difícil de ligar
 * à causa.
 */
async function salvarFunil() {
  const erro = document.getElementById('funil-erro');
  erro.style.display = 'none';

  // v1.496 — com os funis em abas, a reprovação pode ser da aba que não
  // está à vista. Abrir a aba do funil culpado antes de reclamar, senão
  // a mensagem manda consertar uma etapa que a tela não está mostrando.
  const reclamar = (tipo, msg) => {
    if (funilAba !== tipo) { funilAba = tipo; pintarFunil(); }
    return mostrarErro(erro, msg);
  };

  for (const tipo of ['Inquilino', 'Proprietário']) {
    const nomes = funilEtapas[tipo].map(e => (e.nome || '').trim());
    if (nomes.some(n => !n)) {
      return reclamar(tipo, `No funil de ${tipo} há etapa sem nome.`);
    }
    if (new Set(nomes).size !== nomes.length) {
      return reclamar(tipo, `No funil de ${tipo} há nome de etapa repetido.`);
    }
    if (!funilEtapas[tipo].length) {
      return reclamar(tipo, `O funil de ${tipo} não pode ficar sem nenhuma etapa.`);
    }
  }

  // etapas em uso que sairiam do funil
  const { data: usados } = await sb.from('leads')
    .select('tipo_lead,status').eq('empresa_id', empresaAtual);
  const emUso = {};
  (usados || []).forEach(l => {
    if (l.status) emUso[l.tipo_lead + '|' + l.status] = (emUso[l.tipo_lead + '|' + l.status] || 0) + 1;
  });
  const orfaos = [];
  Object.keys(emUso).forEach(k => {
    const [tipo, etapa] = k.split('|');
    if (funilEtapas[tipo] && !funilEtapas[tipo].some(e => (e.nome || '').trim() === etapa)) {
      orfaos.push(`${emUso[k]} lead(s) de ${tipo} em "${etapa}"`);
    }
  });
  if (orfaos.length) {
    return mostrarErro(erro, 'Não salvei: ' + orfaos.join('; ') +
      '. Mova esses leads antes de tirar a etapa, ou mantenha o nome dela.');
  }

  try {
    for (const tipo of ['Inquilino', 'Proprietário']) {
      const lista = funilEtapas[tipo];
      const idsQueFicam = lista.filter(e => e.id).map(e => e.id);

      // apaga as que saíram (nenhum lead as usa — já conferimos)
      let del = sb.from('funil_etapas').delete()
        .eq('empresa_id', empresaAtual).eq('tipo_lead', tipo);
      if (idsQueFicam.length) del = del.not('id', 'in', `(${idsQueFicam.join(',')})`);
      const { error: eDel } = await del;
      if (eDel) throw eDel;

      // ordem = posição na tela. Em duas passadas para não bater na
      // unique (empresa, tipo, ordem) enquanto as posições trocam:
      // primeiro joga todas para uma faixa alta, depois para a final.
      for (let i = 0; i < lista.length; i++) {
        const e = lista[i];
        const linha = {
          empresa_id: empresaAtual, tipo_lead: tipo, nome: (e.nome || '').trim(),
          ajuda: (e.ajuda || '').trim() || null, cor: e.cor || 'tag-azul',
          encerra: !!e.encerra, ativo: true,
          dias_retorno: e.encerra ? null
            : ((e.dias_retorno && e.dias_retorno.length) ? e.dias_retorno : null),
          atualizado_em: new Date().toISOString()
        };
        if (e.id) {
          const { error } = await sb.from('funil_etapas')
            .update({ ...linha, ordem: 1000 + i }).eq('id', e.id);
          if (error) throw error;
        } else {
          const { data, error } = await sb.from('funil_etapas')
            .insert({ ...linha, ordem: 1000 + i }).select('id').single();
          if (error) throw error;
          e.id = data.id;
        }
      }
      for (let i = 0; i < lista.length; i++) {
        const { error } = await sb.from('funil_etapas')
          .update({ ordem: i + 1 }).eq('id', lista[i].id);
        if (error) throw error;
      }
    }
    mostrarErro(erro, 'Funil salvo. As telas de Leads já usam as etapas novas.', true);
    await carregarFunil();
    if (typeof carregarEtapasDoFunil === 'function') await carregarEtapasDoFunil();
  } catch (e) {
    mostrarErro(erro, 'Não foi possível salvar: ' + (e.message || e));
  }
}

// ============================================================
// PLANOS DA FIANÇA E TABELA DO INCÊNDIO — MUDARAM DE TELA (v1.219)
//
// Os dois cadastros saíram daqui e viraram cartões dentro de cada
// seguradora, em ⚙ → Seguradoras (js/seguradoras.js), junto dos prazos,
// do dia de corte e da regra de parcelamento. Era o mesmo assunto —
// "o que esta seguradora cobra e como" — respondido em duas telas.
//
// O código foi embora inteiro, e não comentado: a conferência
// estrutural cobra que todo id procurado por um js exista em alguma
// tela, e função órfã apontando para elemento que não existe mais é
// exatamente o que ela pega.
// ============================================================

// ============================================================
// ITENS PADRÃO DA COBRANÇA (v1.169) — os modelos que a janela
// "Acrescentar item" do contrato oferece. Mesmo desenho dos planos
// de fiança, no mesmo painel.
// ============================================================
let itensPadraoAdm = [];

async function carregarItensPadrao() {
  const { data, error } = await sb.from('contrato_itens_padrao')
    .select('*').eq('empresa_id', empresaAtual).order('nome');
  const corpo = document.getElementById('linhas-itenspadrao');
  if (error) {
    corpo.innerHTML = `<tr><td colspan="5">Não consegui ler os itens: ${htm(error.message)}.
      Se falar em "does not exist", falta rodar o
      <code>migracao-v1169-itens-do-contrato.sql</code>.</td></tr>`;
    itensPadraoAdm = [];
    return;
  }
  itensPadraoAdm = data || [];
  pintarItensPadrao();
}

function pintarItensPadrao() {
  const corpo = document.getElementById('linhas-itenspadrao');
  if (!corpo) return;
  if (!itensPadraoAdm.length) {
    corpo.innerHTML = '<tr><td colspan="5" class="vazio-min">Nenhum modelo ainda — acrescente o primeiro.</td></tr>';
    return;
  }
  const num = v => (v === null || v === undefined || v === '') ? '' : String(v).replace('.', ',');
  corpo.innerHTML = itensPadraoAdm.map((m, i) => `
    <tr style="${m.ativo === false ? 'opacity:.55' : ''}">
      <td><input value="${htm(m.nome || '')}" placeholder="Boleto"
        oninput="mudarItemPadrao(${i},'nome',this.value)"></td>
      <td><input style="text-align:right" value="${num(m.valor)}" placeholder="em branco = digita na hora"
        oninput="mudarItemPadrao(${i},'valor',this.value)"></td>
      <td><input style="text-align:right" value="${m.parcelas || ''}" placeholder="em branco = todo mês"
        oninput="mudarItemPadrao(${i},'parcelas',this.value)"></td>
      <td style="text-align:center"><input type="checkbox" style="width:auto"
        ${m.ativo !== false ? 'checked' : ''}
        onchange="mudarItemPadrao(${i},'ativo',this.checked)"></td>
      <td><button class="del" title="Tirar este modelo"
        onclick="tirarItemPadrao(${i})">✕</button></td>
    </tr>`).join('');
}

function mudarItemPadrao(i, campo, valor) {
  const m = itensPadraoAdm[i];
  if (!m) return;
  m[campo] = valor;
  if (campo === 'ativo') pintarItensPadrao();
}

function acrescentarItemPadrao() {
  itensPadraoAdm.push({ id: null, nome: '', valor: '', parcelas: '', ativo: true });
  pintarItensPadrao();
}

function tirarItemPadrao(i) {
  itensPadraoAdm.splice(i, 1);
  pintarItensPadrao();
}

async function salvarItensPadrao() {
  const erro = document.getElementById('itenspadrao-erro');
  erro.style.display = 'none';
  const n = v => (v === null || v === undefined || String(v).trim() === '') ? null
    : ((typeof numeroBr === 'function')
        ? numeroBr(String(v)) : Number(String(v).replace(/\./g, '').replace(',', '.')));
  const vistos = new Set();
  for (const m of itensPadraoAdm) {
    m.nome = (m.nome || '').trim();
    if (!m.nome) return mostrarErro(erro, 'Há modelo sem nome.');
    const valor = n(m.valor);
    if (valor !== null && (!Number.isFinite(valor) || valor < 0))
      return mostrarErro(erro, `Valor inválido no modelo ${m.nome}.`);
    const par = m.parcelas === '' || m.parcelas === null ? null : parseInt(m.parcelas, 10);
    if (par !== null && (!Number.isFinite(par) || par < 1))
      return mostrarErro(erro, `Parcelas inválidas no modelo ${m.nome}.`);
    if (vistos.has(m.nome.toLowerCase()))
      return mostrarErro(erro, `Modelo repetido: ${m.nome}.`);
    vistos.add(m.nome.toLowerCase());
    m._valor = valor; m._par = par;
  }
  try {
    const idsQueFicam = itensPadraoAdm.filter(m => m.id).map(m => m.id);
    let del = sb.from('contrato_itens_padrao').delete().eq('empresa_id', empresaAtual);
    if (idsQueFicam.length) del = del.not('id', 'in', `(${idsQueFicam.join(',')})`);
    const { error: eDel } = await del;
    if (eDel) throw eDel;
    for (const m of itensPadraoAdm) {
      const linha = {
        empresa_id: empresaAtual, nome: m.nome, valor: m._valor,
        parcelas: m._par, ativo: m.ativo !== false,
        atualizado_em: new Date().toISOString()
      };
      if (m.id) {
        const { error } = await sb.from('contrato_itens_padrao').update(linha).eq('id', m.id);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from('contrato_itens_padrao')
          .insert(linha).select('id').single();
        if (error) throw error;
        m.id = data.id;
      }
    }
    mostrarErro(erro, 'Itens salvos. A janela do contrato já oferece os modelos novos.', true);
    await carregarItensPadrao();
  } catch (e) {
    mostrarErro(erro, 'Não foi possível salvar: ' + (e.message || e));
  }
}

/**
 * O menu da engrenagem aponta para admin.html?aba=usuarios. Sem isto,
 * escolher "Usuários" no menu abriria a tela em "Empresas" e a pessoa
 * teria de clicar de novo — o menu prometeria uma coisa e entregaria outra.
 *
 * v1.406 — o `?aba=` é O MESMO de sempre; só quem responde mudou (o
 * trilho, no lugar da fileira de abas). Link antigo, favorito salvo e
 * e-mail já enviado continuam caindo no lugar certo.
 */
function abrirAbaDaUrl() {
  const alvo = new URLSearchParams(location.search).get('aba');
  if (!alvo) return;
  const painel = document.getElementById('p-' + alvo);
  if (!painel) return;
  const item = document.querySelector('#cfg-trilho .cfg-linha[data-chave="' + alvo + '"]');
  if (item) verAba(alvo);
}

// ============================================================
// v1.406 — O TRILHO DA CONFIGURAÇÃO
//
// A lista de seções NÃO mora aqui: mora no CONFIG_GRUPOS do
// cabecalho.js, que também alimenta o menu da engrenagem. Duas listas
// para a mesma coisa viram duas listas diferentes no primeiro ajuste.
//
// Cada linha carrega o `data-obj` que a aba tinha, então o
// `aplicarPermissoes()` continua escondendo o que o papel não alcança —
// sem uma linha de código nova para isso.
// ============================================================
let ABA_CONFIG = 'usuarios';   // v1.500 — Empresas foi para a Plataforma

function pintarCaminhoConfig(id) {
  const el = document.getElementById('cfg-caminho');
  if (!el) return;
  const item = (typeof CONFIG_DESTINOS !== 'undefined')
    ? CONFIG_DESTINOS.find(i => i.chave === id) : null;
  el.textContent = item ? ('Configuração · ' + item.grupo) : 'Configuração';
}

function desenharTrilhoConfig() {
  const el = document.getElementById('cfg-trilho');
  if (!el || typeof CONFIG_GRUPOS === 'undefined') return;

  // Os atalhos de hoje, para a estrela nascer certa. Vem do perfil, e
  // não do menu já desenhado: o menu pode ainda não ter sido pintado.
  const meus = new Set((typeof PERM !== 'undefined' && PERM.perfil
    && PERM.perfil.menu_config) || (typeof CONFIG_PADRAO !== 'undefined' ? CONFIG_PADRAO : []));

  // v1.436 — a seta de recolher (mockup aprovado 30/08): mora no topo
  // do trilho e gira ao recolher; recolhido = só os ícones (54px).
  // É um <button> solto num <div> próprio — nunca dentro de outra
  // linha (a lição do botão dentro de botão).
  const seta = `
    <div class="cfg-recolher">
      <button type="button" title="Recolher ou abrir o menu"
              aria-label="Recolher ou abrir o menu" onclick="alternarTrilhoConfig()">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m14 6-6 6 6 6"/></svg>
      </button>
    </div>`;

  el.innerHTML = seta + CONFIG_GRUPOS.map(g => {
    // v1.684 — o trilho só esconde pelo papel (data-obj); o plano não
    // era conferido aqui, só na engrenagem. Item fora do plano nem nasce,
    // e grupo que fica vazio some com o título. Sem a linha, o
    // abrirAbaDaUrl() também não abre o ?aba= de um módulo não contratado.
    const itens = typeof configNoPlano === 'function' ? g.itens.filter(configNoPlano) : g.itens;
    if (!itens.length) return '';
    const linhas = itens.map(i => {
      const marcada = meus.has(i.chave);

      // A LINHA É UM <div> COM DOIS FILHOS, e não um botão com uma
      // estrela dentro: botão dentro de botão (ou dentro de link) é
      // HTML inválido — o navegador FECHA o de fora ao encontrar o de
      // dentro, e a estrela deixa de pertencer à linha. Foi assim no
      // ensaio: a estrela de "Papéis e permissões" virou irmã, não
      // filha, e o clique nela não achava mais a linha.
      //
      // O destino é um <a> de verdade em todos os casos. De brinde,
      // abrir em outra aba com o botão do meio passa a funcionar.
      const abrir = i.tela
        ? ''   // tela própria: deixa o link fazer o trabalho dele
        : ` onclick="verAba('${jsq(i.chave)}');return false"`;

      return `
    <div class="cfg-linha${i.chave === ABA_CONFIG && !i.tela ? ' on' : ''}"
         data-chave="${htm(i.chave)}" data-obj="${htm(i.obj || 'administracao')}">
      <a class="cfg-item" href="${htm(configHref(i))}"${abrir}
         title="${htm(i.rotulo)}"
         >${icone(i.icone, 17)}<span>${htm(i.rotulo)}</span></a>
      <button type="button" class="estrela-atalho${marcada ? ' marcada' : ''}"
              title="${marcada ? 'Tirar da engrenagem' : 'Pôr na engrenagem'}"
              aria-label="${marcada ? 'Tirar' : 'Pôr'} ${htm(i.rotulo)} na engrenagem"
              onclick="alternarAtalhoConfig('${jsq(i.chave)}')"
              >${icone('estrela', 15)}</button>
    </div>`;
    }).join('');
    return `<div class="cfg-grupo">${htm(g.grupo)}</div>${linhas}`;
  }).join('');

  // As linhas nascem depois do aplicarPermissoes() da carga da tela, e
  // ele varre o documento uma vez só. Sem repassar aqui, uma seção que
  // o papel não alcança apareceria no trilho.
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
  pintarCaminhoConfig(ABA_CONFIG);

  // v1.436 — quem recolheu ontem encontra recolhido hoje (por pessoa,
  // no navegador; login novo NÃO mexe — diferente das faixas)
  const cfg = document.querySelector('.cfg');
  if (cfg) cfg.classList.toggle('recolhida', trilhoConfigRecolhido());
}

/** v1.436 — o estado lembrado da seta do trilho */
function trilhoConfigRecolhido() {
  try { return localStorage.getItem('crm_cfg_trilho') === 'recolhido'; }
  catch (e) { return false; }
}

function alternarTrilhoConfig() {
  const cfg = document.querySelector('.cfg');
  if (!cfg) return;
  const rec = cfg.classList.toggle('recolhida');
  try { localStorage.setItem('crm_cfg_trilho', rec ? 'recolhido' : 'aberto'); }
  catch (e) { /* navegador sem armazenamento: a seta segue funcionando na sessão */ }
}

/**
 * A estrela do trilho: põe e tira da engrenagem sem abrir painel.
 *
 * Grava na hora, pela MESMA RPC do painel de escolha. No teto, avisa em
 * vez de gravar 9 e deixar o banco cortar em silêncio — cortar por
 * dentro faria sumir um atalho que a pessoa não escolheu perder.
 */
async function alternarAtalhoConfig(chave) {
  if (!PERM || !PERM.perfil) return;
  const atuais = (PERM.perfil.menu_config && PERM.perfil.menu_config.length)
    ? PERM.perfil.menu_config.slice() : CONFIG_PADRAO.slice();

  let novos;
  if (atuais.indexOf(chave) > -1) {
    novos = atuais.filter(c => c !== chave);
    if (!novos.length) { await dialogoAvisar('Deixe pelo menos um atalho na engrenagem.'); return; }
  } else {
    if (atuais.length >= CONFIG_TETO) {
      await dialogoAvisar('A engrenagem mostra no máximo ' + CONFIG_TETO + ' atalhos.\n'
          + 'Tire um antes de pôr este.');
      return;
    }
    novos = atuais.concat([chave]);
  }

  const { error } = await sb.rpc('salvar_meu_config', { p_itens: novos });
  if (error) { await dialogoAvisar('Não consegui salvar: ' + error.message); return; }

  PERM.perfil.menu_config = novos;
  desenharTrilhoConfig();
  if (typeof desenharMenuConfig === 'function') desenharMenuConfig();
}

// v1.502 — trocarEmpresa() saiu junto com o seletor: entrar em outra
// imobiliária recarrega a tela inteira (entrarNaEmpresa → reload), e a
// Configuração nasce já na empresa em foco.

async function carregarContatos() {
  const { data } = await sb.from('contatos').select('id,codigo,nome')
    .eq('empresa_id', empresaAtual).order('nome');
  contatos = data || [];
}

// ------------------------------------------------------------
// EMPRESAS
// ------------------------------------------------------------
async function carregarEmpresas() {
  if (!PERM.superadmin) return;
  const { data } = await sb.from('empresas').select('*').order('razao_social');
  empresas = data || [];
  // v1.499 — os planos vêm junto: a lista e a ficha da imobiliária
  // precisam deles (módulos do plano, botão do logotipo)
  if (!(planosParaEditar || []).length) {
    const rp = await sb.from('planos').select('*').order('ordem');
    planosParaEditar = rp.data || [];
  }
  // v1.500 — a LISTA de imobiliárias (com Entrar, Editar, Logotipo)
  // saiu desta tela e mora na Plataforma (plataforma.html). Aqui só
  // ficam os dados: o aviso do convite e a matriz de Papéis os usam.
}

// v1.500 — abrirEmpresa()/salvarEmpresa() (a janela da empresa) saíram
// daqui: criar, editar, plano e módulos de uma imobiliária moram na
// Plataforma (plataforma_imobiliaria_criar / _salvar / _plano).

// ------------------------------------------------------------
// PAPÉIS E PERMISSÕES
// ------------------------------------------------------------
async function carregarPapeis() {
  const { data } = await sb.from('papeis').select('*').eq('empresa_id', empresaAtual).order('nome');
  papeis = data || [];
  document.getElementById('lista-papeis').innerHTML = papeis.length
    ? papeis.map(p => `
      <div class="item-papel ${papelAberto === p.id ? 'on' : ''}" onclick="abrirPapel('${p.id}')">
        <div>
          <div class="nome">${htm(p.nome)}${p.sistema ? ' <span class="tag tag-cinza">padrão</span>' : ''}</div>
          <div class="desc">${htm(p.descricao || '')}</div>
        </div>
        ${p.sistema ? '' : `<button class="del-papel" title="Excluir papel"
           onclick="event.stopPropagation();excluirPapel('${p.id}')">✕</button>`}
      </div>`).join('')
    : '<div class="vazio-min">Nenhum papel nesta empresa.</div>';
  if (papelAberto && papeis.some(p => p.id === papelAberto)) abrirPapel(papelAberto);
  else document.getElementById('matriz').innerHTML =
    '<div class="vazio-min">Escolha um papel à esquerda para ver e ajustar as permissões.</div>';
}

async function abrirPapel(id) {
  papelAberto = id;
  document.querySelectorAll('.item-papel').forEach(e => e.classList.remove('on'));
  const p = papeis.find(x => x.id === id);
  const { data } = await sb.from('papel_permissoes').select('*').eq('papel_id', id);
  permissoesDoPapel = data || [];
  const por = {};
  permissoesDoPapel.forEach(r => { por[r.objeto] = r; });

  document.getElementById('titulo-permissoes').innerHTML =
    `Permissões de <b style="color:var(--azul)">${htm(p ? p.nome : '')}</b>`;

  // v1.278 — quantos campos estão escondidos deste papel, por objeto.
  // Uma consulta só, aqui, em vez de uma por linha da matriz.
  await carregarOcultosDoPapel(id);

  document.getElementById('matriz').innerHTML = `
    <table class="matriz">
      <thead><tr><th>Objeto</th>${ACOES.map(([, r]) => `<th>${r}</th>`).join('')}<th>Escopo</th><th>Campos</th></tr></thead>
      <tbody>${objetosDaMatriz().map(([o, rot, pers]) => {
        const r = por[o] || {};
        // v1.765 — objeto personalizado: o nome é da imobiliária (escapado)
        // e o escopo só tem "todos" ou "só os meus" ("vinculados" não se
        // aplica — o banco o trata como "só os meus", o mais fechado)
        const escopos = pers ? ESCOPOS.filter(([v]) => v !== 'vinculados') : ESCOPOS;
        return `<tr${pers ? ' class="linha-pers"' : ''}>
          <td class="obj">${pers ? htm(rot) + ' <span class="tag tag-azul">personalizado</span>' : rot}</td>
          ${ACOES.map(([a]) => `<td><input type="checkbox" id="m-${o}-${a}" ${r[a] ? 'checked' : ''}
             ${a === 'aprovar' && !APROVAR_VALE_EM.includes(o)
                ? 'disabled title="Aprovar só vale onde há dinheiro a confirmar"' : ''}></td>`).join('')}
          <td><select id="m-${o}-escopo">${escopos.map(([v, rt]) =>
            `<option value="${v}" ${(r.escopo || 'empresa') === v ? 'selected' : ''}>${rt}</option>`).join('')}</select></td>
          <td>${chipDeCampos(o)}</td>
        </tr>` + OBJETOS_SO_CAMPOS.filter(([, , segue]) => segue === o).map(([so, srot]) => `
        <tr class="so-campos">
          <td class="obj">${srot}</td>
          <td colspan="${ACOES.length + 1}" class="segue">ver, criar, editar e excluir seguem ${rot} — aqui só os campos</td>
          <td>${chipDeCampos(so)}</td>
        </tr>`).join('');
      }).join('')}</tbody>
    </table>
    <div class="nota-matriz" data-dobra="O que é Aprovar"><b>Aprovar</b> é separado de <b>Editar</b> de propósito: é a chave do dinheiro.
      Quem registra o caso não necessariamente pode autorizar o gasto — nem quem acompanha o
      sinistro é quem confere o extrato. Só fica ligável em Casos, Comissões, Financeiro e
      Sinistros; nos demais objetos o sistema não usa essa chave.</div>
    <p class="msg-erro" id="erro-matriz"></p>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">
      <button class="btn" id="btn-matriz" onclick="salvarMatriz()">Salvar permissões</button>
    </div>`;
  if (typeof dobrarExplicacoes === 'function') dobrarExplicacoes(document.getElementById('matriz'));   // v1.781
  const el = [...document.querySelectorAll('.item-papel')].find(e =>
    e.getAttribute('onclick').includes(id));
  if (el) el.classList.add('on');
}

// ============================================================
// PERMISSÃO POR CAMPO (v1.278) — a tela
//
// A trava de verdade está no banco: `contatos` é uma view que devolve
// nulo no campo que o papel não alcança, e a tabela mora num schema que
// a API não expõe. Esta tela só é o lugar onde se diz QUAL campo.
//
// O cadastro guarda a EXCEÇÃO, nunca a permissão: campo sem linha em
// `campos_ocultos` é campo visível. É o que faz campo novo nascer
// visível em vez de nascer escondido — e o que garante que ninguém
// perca acesso no dia em que isto entrar no ar.
// ============================================================

let CP = {
  papel: null,          // papel aberto
  objeto: null,         // objeto aberto no painel de campos (null = matriz)
  niveis: {},           // { contatos: { cpf_cnpj: 'oculto', valor: 'leitura' } }
  pers: {},             // { contatos: [ {chave, rotulo} ] } — campos personalizados
  filtro: ''
};

/** Os campos escondidos DESTE papel, uma consulta por papel aberto. */
async function carregarOcultosDoPapel(papelId) {
  CP.papel = papelId;
  CP.niveis = {};
  const { data } = await sb.from('campos_ocultos')
    .select('objeto,campo,nivel').eq('papel_id', papelId);
  (data || []).forEach(r => {
    if (!CP.niveis[r.objeto]) CP.niveis[r.objeto] = {};
    CP.niveis[r.objeto][r.campo] = r.nivel || 'oculto';
  });
}

/** O selo da coluna "Campos": cinza quando não há exceção, âmbar quando há. */
function chipDeCampos(objeto) {
  const m = CP.niveis[mascaraDaLinha(objeto)] || {};   // v1.779
  const oc = Object.values(m).filter(v => v === 'oculto').length;
  const le = Object.values(m).filter(v => v === 'leitura').length;
  const n = oc + le;
  // O selo diz as duas coisas, porque elas são diferentes: esconder é
  // uma decisão de privacidade, travar é de responsabilidade.
  const rot = n === 0 ? 'todos'
    : [oc ? oc + ' oculto' + (oc > 1 ? 's' : '') : null,
       le ? le + ' travado' + (le > 1 ? 's' : '') : null].filter(Boolean).join(' · ');
  return `<button class="btn-campos${n ? ' tem' : ''}" onclick="abrirCamposDoObjeto('${objeto}')"
            title="Escolher o que este papel enxerga em ${htm(objeto)}">${rot}</button>`;
}

/** Todos os campos do objeto — os do sistema e os personalizados.
 *
 *  Usa PERM.campos_originais quando existe: o catálogo em memória pode
 *  ter sido PODADO para o próprio administrador (v1.277), e quem
 *  configura precisa enxergar a lista inteira. */
function camposParaPermissao(objeto) {
  const cat = (typeof CATALOGO !== 'undefined' && !(CAMPOS_DA_LINHA[objeto] || {}).soPers) ? CATALOGO[objeto] : null;
  const base = (cat && PERM.campos_originais && PERM.campos_originais[objeto])
    || (cat ? cat.campos : []);

  const NUNCA = ['id', 'empresa_id', 'codigo', 'nome',
                 'criado_em', 'atualizado_em', 'atualizado_por', 'excluido_em'];

  const sistema = base
    .filter(f => !f.pers && !NUNCA.includes(f.c) && !String(f.c).startsWith('_'))
    .map(f => ({ campo: f.c, rotulo: f.r || f.c, sensivel: campoSensivel(f.c) }));

  const pers = (CP.pers[objeto] || [])
    .map(p => ({ campo: 'personalizados.' + p.chave, rotulo: p.rotulo, sensivel: false }));
  // v1.779 — linha que mostra só os campos da imobiliária
  if ((CAMPOS_DA_LINHA[objeto] || {}).soPers) return { sistema: [], pers, fixos: [] };

  return { sistema, pers, fixos: base.filter(f => NUNCA.includes(f.c)).map(f => f.r || f.c) };
}

/** A sugestão do sistema — só uma sugestão, e o rótulo na tela diz isso.
 *  Quem decide o que é sensível é a imobiliária, não o programa. */
function campoSensivel(coluna) {
  return ['cpf_cnpj', 'banco_pix', 'chave_pix', 'conta_bancaria',
          'renda', 'salario'].includes(coluna);
}

async function abrirCamposDoObjeto(objeto) {
  CP.objeto = objeto;
  CP.filtro = '';

  // os personalizados daquele objeto, uma vez por objeto aberto
  if (!CP.pers[objeto]) {
    const { data } = await sb.from('campos_personalizados')
      .select('chave,rotulo').eq('empresa_id', empresaAtual).eq('objeto', persDaLinha(objeto))   // v1.779
      .is('excluido_em', null).eq('ativo', true).order('ordem');
    CP.pers[objeto] = data || [];
  }
  pintarPainelDeCampos();
}

function pintarPainelDeCampos() {
  const objeto = CP.objeto;
  const oc = CP.niveis[mascaraDaLinha(objeto)] || {};   // v1.779
  const { sistema, pers } = camposParaPermissao(objeto);
  const filtro = semAcento(CP.filtro || '');
  const passa = f => !filtro || semAcento(f.rotulo).includes(filtro);

  /* v1.281 — ESTA LINHA TINHA FICADO PARA TRÁS.
   *
   * `CP.niveis[objeto]` já era um MAPA — { campo: 'oculto' | 'leitura' } —
   * em todo o resto do arquivo: chipDeCampos, previaDaFicha, marcarVe,
   * marcarEdita e salvarCamposDoObjeto leem assim. Só aqui ele continuava
   * sendo tratado como o SET de ocultos da versão anterior, e `oc.has`
   * derrubava a tela inteira ao abrir Campos ("oc.has is not a function").
   *
   * Não era só o `.has`: a função chamava `marcarCampo()`, que não existe
   * mais (virou marcarVe/marcarEdita), e desenhava DUAS células enquanto o
   * cabeçalho promete três — Campo · Vê · Edita.
   *
   * A caixinha de EDITA nasce travada quando o campo está oculto, pela
   * mesma razão que marcarVe() explica: campo que não se enxerga não se
   * edita, e oferecer a escolha ali seria mentir sobre o efeito. */
  const linha = f => {
    const nv = oc[f.campo];                    // undefined · 'oculto' · 'leitura'
    const oculto = nv === 'oculto';
    return `
    <tr class="${oculto ? 'oculto' : ''}" data-rotulo="${htm(semAcento(f.rotulo))}">
      <td class="campo">${htm(f.rotulo)}${f.sensivel ? ' <span class="tag-sens">sensível</span>' : ''}</td>
      <td><input type="checkbox" id="cp-ve-${jsq(f.campo)}" ${oculto ? '' : 'checked'}
           onchange="marcarVe('${jsq(f.campo)}', this.checked)"></td>
      <td><input type="checkbox" id="cp-ed-${jsq(f.campo)}" ${nv ? '' : 'checked'}
           ${oculto ? 'disabled title="Campo oculto não se edita"' : ''}
           onchange="marcarEdita('${jsq(f.campo)}', this.checked)"></td>
    </tr>`;
  };

  const rotObj = rotuloDaMatriz(objeto);
  const nSist = sistema.filter(passa).length, nPers = pers.filter(passa).length;

  document.getElementById('matriz').innerHTML = `
    <div class="pc">
      <div class="pc-topo">
        <b>${htm(rotObj)}</b>
        <span style="font-size:12px;color:var(--texto-suave)">
          ${sistema.length + pers.length} campos ·
          <b style="color:${Object.keys(oc).length ? '#8a5a00' : 'var(--texto-suave)'}"
             >${Object.keys(oc).length} com exceção</b></span>
        <div class="pc-busca">
          <input id="cp-filtro" placeholder="Filtrar campos…" oninput="filtrarCampos(this.value)">
        </div>
        <span class="voltar" onclick="abrirPapel('${CP.papel}')">← voltar para os objetos</span>
      </div>

      <div class="pc-atalhos">
        <button class="atalho sugerido" onclick="ocultarSensiveis()">${icone('cadeado', 13)} Ocultar os dados sensíveis</button>
        <button class="atalho" onclick="mostrarTodosOsCampos()">Mostrar todos</button>
        <button class="atalho" onclick="verPorCampo('${CP.objeto}')">${icone('olho', 13)} Ver por campo (todos os papéis)</button>
        <span class="atalho-nota">“Sensível” é sugestão do sistema. Você decide.</span>
      </div>

      <table class="campos">
        <thead><tr><th style="width:62%">Campo</th><th style="width:19%">Vê</th><th style="width:19%">Edita</th></tr></thead>
        <tbody>
          ${nSist ? `<tr class="grupo"><td colspan="3">Do sistema</td></tr>` : ''}
          ${sistema.filter(passa).map(linha).join('')}
          ${nPers ? `<tr class="grupo"><td colspan="3">Personalizados desta imobiliária</td></tr>` : ''}
          ${pers.filter(passa).map(linha).join('')}
          ${(!nSist && !nPers) ? `<tr><td colspan="3" class="vazio-min">Nenhum campo com esse texto.</td></tr>` : ''}
        </tbody>
      </table>

      <div class="pc-pe">
        <span>Sem marcação, o campo é visível — o cadastro guarda só a exceção.</span>
        <button class="btn" id="btn-campos" onclick="salvarCamposDoObjeto()">Salvar campos</button>
      </div>
    </div>

    ${previaDaFicha(objeto)}
    <p class="msg-erro" id="erro-campos"></p>

    <div class="nota-matriz" data-dobra="O que muda ao esconder um campo">
      Campo oculto some da ficha, da lista, da exportação e do construtor de
      relatórios — e o valor deixa de sair do banco de dados para quem tem este papel.
      Não é arrumação de tela: é a gaveta trancada.
    </div>`;
  if (typeof dobrarExplicacoes === 'function') dobrarExplicacoes(document.getElementById('matriz'));   // v1.781
}

/**
 * A PRÉVIA — a ficha como as duas pessoas vão vê-la.
 *
 * Configurar permissão no escuro é como se erra sem perceber: a pessoa
 * marca cinco caixinhas, salva, e só descobre o efeito quando alguém
 * reclama. Aqui o resultado aparece do lado, mudando a cada clique.
 *
 * Mostra rótulo e não valor de propósito: não há registro escolhido, e
 * inventar dado de exemplo faria a prévia mentir sobre o que existe.
 */
function previaDaFicha(objeto) {
  const mapa = CP.niveis[mascaraDaLinha(objeto)] || {};   // v1.779
  const { sistema, pers } = camposParaPermissao(objeto);
  const todos = sistema.concat(pers);

  const linhaCheia = f => `<div class="prev-l">${htm(f.rotulo)}</div>`;
  const linhaPapel = f => {
    const nv = mapa[f.campo];
    if (nv === 'oculto') return '';                       // nem aparece
    return `<div class="prev-l${nv === 'leitura' ? ' trava' : ''}">${htm(f.rotulo)}`
         + (nv === 'leitura' ? ' <span class="prev-cad">' + icone('cadeado', 10) + ' só leitura</span>' : '') + '</div>';
  };

  const escondidos = todos.filter(f => mapa[f.campo] === 'oculto').length;

  return `
    <div class="previa">
      <div class="previa-topo">${icone('olho', 13)} Prévia — a ficha muda junto com as caixinhas acima</div>
      <div class="previa-corpo">
        <div>
          <div class="quem">Quem vê tudo</div>
          ${todos.map(linhaCheia).join('')}
        </div>
        <div>
          <div class="quem">Com este papel</div>
          ${todos.map(linhaPapel).join('')}
          ${escondidos ? `<div class="prev-nota">${escondidos} campo(s) não aparecem —
            e o valor deles não chega no navegador desta pessoa.</div>` : ''}
        </div>
      </div>
    </div>`;
}

/** Marca em memória; só o botão Salvar grava.
 *
 *  As duas caixinhas contam uma história só, e por isso não são
 *  independentes: desmarcar "Vê" já implica não editar (não se altera o
 *  que não se enxerga), e por isso a caixinha de Edita fica travada.
 *  Marcar "Vê" de volta devolve o campo ao estado mais permissivo — se
 *  a intenção era travar, é um clique a mais, e é melhor errar para o
 *  lado de devolver acesso do que para o de tirar sem querer. */
function marcarVe(campo, visivel) {
  if (!CP.niveis[mascaraDaLinha(CP.objeto)]) CP.niveis[mascaraDaLinha(CP.objeto)] = {};
  if (visivel) delete CP.niveis[mascaraDaLinha(CP.objeto)][campo];
  else CP.niveis[mascaraDaLinha(CP.objeto)][campo] = 'oculto';
  pintarPainelDeCampos();
}

function marcarEdita(campo, pode) {
  if (!CP.niveis[mascaraDaLinha(CP.objeto)]) CP.niveis[mascaraDaLinha(CP.objeto)] = {};
  if (pode) delete CP.niveis[mascaraDaLinha(CP.objeto)][campo];
  else CP.niveis[mascaraDaLinha(CP.objeto)][campo] = 'leitura';
  pintarPainelDeCampos();
}

function ocultarSensiveis() {
  const { sistema, pers } = camposParaPermissao(CP.objeto);
  if (!CP.niveis[mascaraDaLinha(CP.objeto)]) CP.niveis[mascaraDaLinha(CP.objeto)] = {};
  sistema.concat(pers).forEach(f => { if (f.sensivel) CP.niveis[mascaraDaLinha(CP.objeto)][f.campo] = 'oculto'; });
  pintarPainelDeCampos();
}

function mostrarTodosOsCampos() {
  CP.niveis[mascaraDaLinha(CP.objeto)] = {};
  pintarPainelDeCampos();
}

async function salvarCamposDoObjeto() {
  const erro = document.getElementById('erro-campos');
  const botao = document.getElementById('btn-campos');
  if (erro) erro.style.display = 'none';
  botao.disabled = true;

  const objeto = mascaraDaLinha(CP.objeto);   // v1.779 — o nome que a máscara usa
  const mapa = CP.niveis[objeto] || {};
  const oc = Object.keys(mapa);

  try {
    // v1.282 — APAGAR E REGRAVAR NUMA TRANSAÇÃO SÓ.
    //
    // Isto aqui eram duas chamadas: um delete e um insert. Se o insert
    // falhasse (rede, sessão expirada), o delete já tinha valido e o
    // papel ficava SEM NENHUMA exceção — os campos sensíveis voltavam
    // a aparecer, calados, com a tela ainda mostrando as caixinhas
    // marcadas e um "não foi possível salvar". Falhar destravando dado
    // é o pior jeito de falhar.
    //
    // Agora quem faz os dois passos é o banco, por dentro de uma
    // função: ou os dois acontecem, ou nenhum.
    const { error: e1 } = await sb.rpc('salvar_campos_ocultos', {
      p_papel:   CP.papel,
      p_objeto:  objeto,
      p_empresa: empresaAtual,
      p_itens:   oc.map(c => ({ campo: c, nivel: mapa[c] }))
    });
    if (e1) throw e1;

    const nOc = oc.filter(c => mapa[c] === 'oculto').length;
    const nLe = oc.filter(c => mapa[c] === 'leitura').length;
    mostrarErro(erro, oc.length
      ? `Salvo · ${nOc} oculto(s) e ${nLe} somente leitura — quem já está logado só vê a mudança ao entrar de novo.`
      : 'Salvo. Nenhuma exceção neste objeto.', true);
  } catch (e) {
    mostrarErro(erro, 'Não foi possível salvar: ' + e.message);
  } finally { botao.disabled = false; }
}

/** Filtra escondendo linha, sem redesenhar a tabela — assim o cursor
 *  não pula para o começo a cada tecla digitada. */
function filtrarCampos(texto) {
  const t = semAcento(texto || '');
  document.querySelectorAll('table.campos tr[data-rotulo]').forEach(tr => {
    tr.style.display = (!t || tr.getAttribute('data-rotulo').includes(t)) ? '' : 'none';
  });
}

// ------------------------------------------------------------
// "POR CAMPO" — a mesma informação virada do avesso.
//
// A matriz responde "o que este papel enxerga". Esta responde "quem
// enxerga este campo", que é a pergunta de quem audita — e é ela que se
// leva para uma conversa de LGPD, em vez de abrir cinco papéis um a um.
// ------------------------------------------------------------
async function verPorCampo(objeto) {
  const { data: todos } = await sb.from('campos_ocultos')
    .select('papel_id,campo,nivel').eq('empresa_id', empresaAtual).eq('objeto', mascaraDaLinha(objeto));   // v1.779

  const porPapel = {};
  (todos || []).forEach(r => {
    if (!porPapel[r.papel_id]) porPapel[r.papel_id] = {};
    porPapel[r.papel_id][r.campo] = r.nivel || 'oculto';
  });

  const { sistema, pers } = camposParaPermissao(objeto);
  const lista = sistema.concat(pers);
  const rotObj = rotuloDaMatriz(objeto);

  document.getElementById('matriz').innerHTML = `
    <div class="pc">
      <div class="pc-topo">
        <b>${htm(rotObj)} · quem enxerga cada campo</b>
        <span class="voltar" style="margin-left:auto" onclick="abrirPapel('${CP.papel}')">
          ← voltar para os objetos</span>
      </div>
      <table class="campos">
        <thead><tr><th>Campo</th>${papeis.map(p => `<th>${htm(p.nome)}</th>`).join('')}</tr></thead>
        <tbody>${lista.map(f => `
          <tr class="${papeis.some(p => (porPapel[p.id] || {})[f.campo]) ? 'oculto' : ''}">
            <td class="campo">${htm(f.rotulo)}${f.sensivel ? ' <span class="tag-sens">sensível</span>' : ''}</td>
            ${papeis.map(p => {
              const nv = (porPapel[p.id] || {})[f.campo];
              if (nv === 'oculto')  return `<td style="color:var(--erro);font-weight:700">não vê</td>`;
              if (nv === 'leitura') return `<td style="color:var(--alerta);font-weight:700">só lê</td>`;
              return `<td style="color:var(--ok);font-weight:700">vê e edita</td>`;
            }).join('')}
          </tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="nota-matriz">Para mudar, volte aos objetos e entre pelo papel —
      a alteração é sempre de um papel por vez, para ninguém mexer em cinco sem perceber.</div>`;
}

async function salvarMatriz() {
  const erro = document.getElementById('erro-matriz');
  erro.style.display = 'none';
  const botao = document.getElementById('btn-matriz');
  botao.disabled = true;
  const linhas = [];
  // v1.765 — os objetos personalizados entram na mesma gravação. Este
  // salvar APAGA todas as linhas do papel e regrava as da tela: objeto que
  // não estivesse aqui perderia a permissão em silêncio.
  OBJETOS.concat(objetosPers.map(op => [op.chave, op.plural])).forEach(([o]) => {
    const marc = {};
    let algum = false;
    ACOES.forEach(([a]) => {
      const c = document.getElementById(`m-${o}-${a}`);
      marc[a] = !!(c && c.checked);
      if (marc[a]) algum = true;
    });
    if (algum) linhas.push({
      papel_id: papelAberto, objeto: o, ...marc,
      escopo: document.getElementById(`m-${o}-escopo`).value
    });
  });
  // v1.765 — linha de objeto personalizado que a tela NÃO desenhou (a
  // lista de objetos não carregou, ou o módulo saiu do plano) volta como
  // estava: o salvar não pode apagar o que não mostrou.
  permissoesDoPapel.forEach(r => {
    if (!/^p_/.test(r.objeto) || linhas.some(l => l.objeto === r.objeto)) return;
    if (document.getElementById(`m-${r.objeto}-ver`)) return;
    linhas.push({ papel_id: papelAberto, objeto: r.objeto, ver: r.ver, criar: r.criar, editar: r.editar,
                  excluir: r.excluir, aprovar: r.aprovar, escopo: r.escopo });
  });
  try {
    const { error: e1 } = await sb.from('papel_permissoes').delete().eq('papel_id', papelAberto);
    if (e1) throw e1;
    if (linhas.length) {
      const { error: e2 } = await sb.from('papel_permissoes').insert(linhas);
      if (e2) throw e2;
    }
    mostrarErro(erro, 'Permissões salvas. Quem já está logado só vê a mudança ao entrar de novo.', true);
  } catch (e) { mostrarErro(erro, 'Não foi possível salvar: ' + e.message); }
  finally { botao.disabled = false; }
}

function novoPapel() {
  document.getElementById('pp-origem').innerHTML =
    papeis.map(p => `<option value="${p.id}">${htm(p.nome)}</option>`).join('');
  document.getElementById('pp-nome').value = '';
  document.getElementById('erro-papel').style.display = 'none';
  abrir('modal-papel');
}

async function salvarPapel() {
  const erro = document.getElementById('erro-papel');
  erro.style.display = 'none';
  const nome = document.getElementById('pp-nome').value.trim();
  if (!nome) { mostrarErro(erro, 'Dê um nome ao papel.'); return; }
  const botao = document.getElementById('btn-papel');
  botao.disabled = true;
  try {
    const { error } = await sb.rpc('duplicar_papel', {
      p_papel_id: document.getElementById('pp-origem').value, p_nome: nome
    });
    if (error) throw error;
    fechar('modal-papel');
    await carregarPapeis();
  } catch (e) { mostrarErro(erro, 'Não foi possível salvar: ' + e.message); }
  finally { botao.disabled = false; }
}

async function excluirPapel(id) {
  const p = papeis.find(x => x.id === id);
  if (!(await dialogoPerguntar({ texto: `Excluir o papel "${p ? p.nome : ''}"?`, ok: 'Excluir', perigo: true }))) return;
  const { error } = await sb.from('papeis').delete().eq('id', id);
  if (error) { await dialogoAvisar('Não foi possível excluir: ' + error.message); return; }
  if (papelAberto === id) papelAberto = null;
  await carregarPapeis();
}

// ------------------------------------------------------------
// USUÁRIOS
// ------------------------------------------------------------
/**
 * v1.339 — QUEM JÁ CADASTROU O APLICATIVO.
 *
 * `auth.mfa_factors` é do schema do Auth: a tela não lê de lá nem
 * poderia. Quem responde é a RPC `mfa_status_da_empresa()`, que roda
 * como dona, confere `posso('administracao','ver')` e devolve só a
 * própria empresa — nome nenhum de outra imobiliária passa.
 *
 * Se a RPC ainda não existir (versão publicada antes do v1339-sql-2), o
 * mapa fica vazio e a coluna mostra um traço, em vez de a tela inteira
 * morrer com "function does not exist".
 */
async function carregarStatus2FA() {
  try {
    const { data, error } = await sb.rpc('mfa_status_da_empresa');
    if (error) return {};
    const mapa = {};
    (data || []).forEach(l => { mapa[l.usuario_id] = l; });
    return mapa;
  } catch (e) { return {}; }
}

function celula2FA(p, st) {
  if (!st) return '<span style="color:var(--texto-suave)">—</span>';
  if (!st.tem_fator) {
    return `<span class="selo-2f falta">○ Ainda não cadastrou</span>
            <div style="font-size:11.5px;color:var(--texto-suave);margin-top:3px">
              vai cadastrar no próximo acesso</div>`;
  }
  const desde = st.cadastrado_em
    ? new Date(st.cadastrado_em).toLocaleDateString('pt-BR') : '';
  return `<span class="selo-2f ativa">● Ativa</span>
          ${desde ? `<div style="font-size:11.5px;color:var(--texto-suave);margin-top:3px">desde ${htm(desde)}</div>` : ''}`;
}

async function carregarUsuarios() {
  const { data } = await sb.from('perfis').select('*').eq('empresa_id', empresaAtual).order('nome');
  usuarios = data || [];
  const status2f = await carregarStatus2FA();
  document.getElementById('cnt-usuarios').textContent = `(${usuarios.length})`;
  const opPapeis = p => papeis.map(x =>
    `<option value="${x.id}" ${p.papel_id === x.id ? 'selected' : ''}>${htm(x.nome)}</option>`).join('');

  document.getElementById('linhas-usuarios').innerHTML = usuarios.length ? usuarios.map(p => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:11px">
          ${avatarPessoa(p, { tamanho: 36 })}
          <div style="min-width:0">
            <div style="font-weight:600;color:var(--azul)">${htm(p.nome)}${p.superadmin ? ' <span class="tag tag-verde" title="Dono do CRM: administra todas as imobiliarias">' + icone('escudo', 11) + ' Administrador da plataforma</span>' : ''}</div>
            <div style="font-size:12px;color:var(--texto-suave)">${htm(p.email || '—')}</div>
          </div>
        </div>
      </td>
      <td><select id="u-papel-${p.usuario_id}" style="max-width:150px">${opPapeis(p)}</select></td>
      <td>${lookupHtml('u-contato-' + p.usuario_id, 'max-width:200px')}</td>
      <td><select id="u-ativo-${p.usuario_id}" style="max-width:110px">
        <option value="1" ${p.ativo ? 'selected' : ''}>Ativo</option>
        <option value="0" ${!p.ativo ? 'selected' : ''}>Inativo</option></select></td>
      <td>${celula2FA(p, status2f[p.usuario_id])}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-claro" style="padding:5px 12px;font-size:12px"
          onclick="abrirUsuario('${p.usuario_id}')">Editar</button>
        <button class="btn btn-claro" style="padding:5px 12px;font-size:12px"
          onclick="salvarUsuario('${p.usuario_id}')">Salvar</button>
        ${(status2f[p.usuario_id] && status2f[p.usuario_id].tem_fator)
          ? `<button class="btn btn-claro" style="padding:5px 12px;font-size:12px"
               onclick="liberarNovo2FA('${p.usuario_id}', '${jsq(p.nome || p.email || '')}')"
               title="Apaga o aplicativo autenticador cadastrado desta pessoa; ela cadastra outro no próximo acesso"
               >Trocar aplicativo autenticador…</button>` : ''}</td>
    </tr>`).join('') : '<tr><td colspan="8" class="vazio">Nenhum usuário nesta empresa.</td></tr>';
  // v1.785 — a ficha de contato da pessoa por busca de nome (lupa), não
  // mais o select com a base inteira de contatos em cada linha
  const fonte = () => contatos.map(c => ({ id: c.id, rotulo: c.nome, apoio: c.codigo }));
  usuarios.forEach(p => {
    const ct = p.contato_id ? contatos.find(c => c.id === p.contato_id) : null;
    ligarLookup(document.getElementById('u-contato-' + p.usuario_id), fonte,
      p.contato_id ? { valorInicial: { id: p.contato_id, rotulo: ct ? ct.nome : '(contato)' } } : {});
  });
}

/**
 * v1.339 — O REGISTRO DAS LIBERAÇÕES.
 *
 * Chave-mestra sem registro é problema: quem libera o 2FA de outra
 * pessoa a deixa, até o próximo acesso, protegida só pela senha. A
 * `mfa_eventos` guarda isso, e este cartão é onde se lê sem SQL.
 *
 * Só do que a política deixa ver — a tabela tem RLS por empresa. Numa
 * instalação com duas imobiliárias, cada administrador lê as suas.
 */
async function carregarLiberacoes2FA() {
  const cartao = document.getElementById('cartao-liberacoes');
  if (!cartao) return;

  // Filtra pela empresa em foco como o resto da tela faz. A RLS já
  // barraria o que é de outra imobiliária, mas o superadmin da
  // plataforma enxerga mais de uma — sem este `eq`, ao visitar a
  // imobiliária B ele leria as liberações das duas misturadas.
  const { data, error } = await sb.from('mfa_eventos')
    .select('*').eq('empresa_id', empresaAtual)
    .order('em', { ascending: false }).limit(50);

  // Sem a tabela (v1339-sql-2 ainda não rodado) ou sem permissão, o
  // cartão simplesmente não existe para essa pessoa. Nada de faixa
  // vermelha por uma peça que é opcional até alguém precisar dela.
  if (error || !data || !data.length) { cartao.style.display = 'none'; return; }

  cartao.style.display = '';
  document.getElementById('cnt-liberacoes').textContent = `(${data.length})`;
  document.getElementById('linhas-liberacoes').innerHTML = data.map(e => {
    const quando = e.em ? new Date(e.em).toLocaleString('pt-BR',
      { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    return `
      <tr>
        <td style="white-space:nowrap">${htm(quando)}</td>
        <td>${htm(e.usuario_nome || '—')}</td>
        <td>${htm(e.feito_por_nome || '—')}</td>
        <td>${e.fatores === 1 ? '1 aplicativo' : htm(String(e.fatores || 0)) + ' aplicativos'}</td>
      </tr>`;
  }).join('');
}

/**
 * v1.339 — TROCAR APLICATIVO AUTENTICADOR (o socorro de quem perdeu o celular).
 * Até a v1.514 o botão se chamava "Liberar novo cadastro…"; a v1.515 só
 * trocou o rótulo, porque ninguém entendia o que ele fazia.
 *
 * É uma chave-mestra: apaga o aplicativo cadastrado de outra pessoa. Por
 * isso pede o nome dela digitado — confirmação com "OK" a gente clica no
 * automático, digitar o nome exige olhar para quem se está destravando.
 *
 * A trava de verdade não está aqui: a RPC recusa quem não tem
 * `posso('administracao','editar')` e quem apontar para alguém de outra
 * imobiliária. Isto é só a porta.
 */
async function liberarNovo2FA(uid, nome) {
  const resposta = await dialogoPedir({ titulo: `Apagar o aplicativo autenticador de ${nome}?`,
    texto: 'No próximo acesso essa pessoa vai cadastrar outro aparelho — e, até lá, a conta fica protegida só pela senha.',
    rotulo: 'Para confirmar, digite o nome dela', ok: 'Apagar o autenticador', cancelar: 'Voltar', perigo: true });
  if (resposta === null) return;
  if (resposta.trim().toLowerCase() !== String(nome).trim().toLowerCase()) {
    await dialogoAvisar('O nome não confere. Nada foi alterado.');
    return;
  }

  const { error } = await sb.rpc('mfa_resetar', { p_usuario: uid });
  if (error) { await dialogoAvisar('Não foi possível liberar: ' + error.message); return; }
  await dialogoAvisar(`Pronto. ${nome} vai cadastrar um aplicativo novo no próximo acesso.`);
  await carregarUsuarios();
  await carregarLiberacoes2FA();   // a liberação que você acabou de fazer aparece na hora
}

async function salvarUsuario(uid) {
  const linha = {
    papel_id: document.getElementById(`u-papel-${uid}`).value || null,
    contato_id: valorDoLookup(document.getElementById(`u-contato-${uid}`)),
    ativo: document.getElementById(`u-ativo-${uid}`).value === '1'
  };
  const { error } = await sb.from('perfis').update(linha).eq('usuario_id', uid);
  if (error) { await dialogoAvisar('Não foi possível salvar: ' + error.message); await carregarUsuarios(); return; }
  await carregarUsuarios();
}

/**
 * Nome e e-mail de exibição da pessoa.
 *
 * Ficavam sem tela de edição: os campos que a lista mostrava eram só
 * papel, ficha e situação. Quem entrou sem convite (ou com convite sem
 * nome) ficou com o e-mail no lugar do nome, e não havia como corrigir.
 */
let usuarioEditando = null;

function abrirUsuario(uid) {
  usuarioEditando = usuarios.find(p => p.usuario_id === uid) || null;
  if (!usuarioEditando) return;
  document.getElementById('titulo-usuario').textContent = 'Editar ' + usuarioEditando.nome;
  document.getElementById('u-nome').value = usuarioEditando.nome || '';
  document.getElementById('u-email').value = usuarioEditando.email || '';
  document.getElementById('erro-usuario').style.display = 'none';
  abrir('modal-usuario');
}

async function salvarDadosUsuario() {
  const erro = document.getElementById('erro-usuario');
  erro.style.display = 'none';
  const nome = document.getElementById('u-nome').value.trim();
  if (!nome) { mostrarErro(erro, 'O nome é obrigatório.'); return; }

  const botao = document.getElementById('btn-usuario');
  botao.disabled = true;
  try {
    const { error } = await sb.from('perfis').update({
      nome: nome,
      email: document.getElementById('u-email').value.trim() || null
    }).eq('usuario_id', usuarioEditando.usuario_id);
    if (error) throw error;

    // se editei a MIM MESMO, o chip do cabeçalho muda na hora
    if (PERM.perfil && PERM.perfil.usuario_id === usuarioEditando.usuario_id) {
      PERM.perfil.nome = nome;
      if (typeof pintarCabecalho === 'function') pintarCabecalho();
    }
    fechar('modal-usuario');
    await carregarUsuarios();
  } catch (e) { mostrarErro(erro, 'Não foi possível salvar: ' + e.message); }
  finally { botao.disabled = false; }
}

// ------------------------------------------------------------
// CONVITES
// ------------------------------------------------------------
async function carregarConvites() {
  const { data } = await sb.from('convites').select('*')
    .eq('empresa_id', empresaAtual).order('criado_em', { ascending: false });
  convites = data || [];
  document.getElementById('cnt-convites').textContent = `(${convites.filter(c => !c.usado_em).length} em aberto)`;
  const nomePapel = id => { const p = papeis.find(x => x.id === id); return p ? p.nome : '—'; };
  const link = location.origin + '/cadastro.html';

  document.getElementById('linhas-convites').innerHTML = convites.length ? convites.map(c => {
    const expirou = !c.usado_em && new Date(c.expira_em) < new Date();
    const situacao = c.usado_em
      ? '<span class="tag tag-verde">Usado</span>'
      : (expirou ? '<span class="tag tag-cinza">Expirado</span>' : '<span class="tag tag-amarela">Aguardando</span>');
    return `<tr>
      <td><b>${htm(c.email)}</b></td>
      <td>${htm(c.nome || '—')}</td>
      <td>${htm(nomePapel(c.papel_id))}</td>
      <td>${situacao}</td>
      <td style="white-space:nowrap">${dataBr(String(c.expira_em).slice(0, 10))}</td>
      <td style="white-space:nowrap">${c.usado_em ? '' : `
        <button class="btn btn-claro" style="padding:4px 10px;font-size:12px"
          onclick="copiarLink('${jsq(c.email)}', '${jsq(c.id)}')">Copiar convite</button>
        <button class="btn btn-claro" style="padding:4px 10px;font-size:12px;color:var(--erro)"
          onclick="cancelarConvite('${c.id}')">Cancelar</button>`}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="vazio">Nenhum convite.</td></tr>';
  window.__linkCadastro = link;
  pintarLugaresDoPlano();   // v1.687
}

// ------------------------------------------------------------
// v1.687 — OS LUGARES DO PLANO NA ABA CONVITES
//
// Cada convite em aberto guarda um lugar: usuários ativos + convites em
// aberto contra o limite de usuários do plano. Cheio, o "+ Convidar
// pessoa" desliga. Quem conta é o banco (meu_limite, a mesma conta do
// gatilho trg_convite_respeita_usuarios, que recusa de verdade). Sem
// limite no plano, ou sem a RPC, a faixa não aparece e nada muda.
// ------------------------------------------------------------
let LUGARES_CHEIOS = false;

async function pintarLugaresDoPlano() {
  const caixa = document.getElementById('conv-lugares');
  const btn = document.getElementById('btn-convidar');
  if (!caixa) return;
  let l = null;
  try {
    const { data, error } = await sb.rpc('meu_limite', { p_chave: 'max_usuarios' });
    if (!error && data && data.teto !== null && data.teto !== undefined) l = data;
  } catch (e) { l = null; }
  if (!l) {
    caixa.hidden = true; LUGARES_CHEIOS = false;
    if (btn) { btn.disabled = false; btn.title = ''; }
    return;
  }
  const teto = Number(l.teto), usado = Number(l.usado) || 0;
  const usu = Number(l.usuarios) || 0, conv = Number(l.convites) || 0;
  LUGARES_CHEIOS = usado >= teto && l.modo !== 'avisa';
  const pct = teto > 0 ? Math.min(100, Math.round(100 * usado / teto)) : 100;
  const cheia = usado >= teto;
  caixa.hidden = false;
  caixa.className = 'conv-lugares' + (cheia ? ' cheio' : '');
  caixa.innerHTML =
    `<div class="t"><b>${usado} de ${teto}</b> ${teto === 1 ? 'lugar' : 'lugares'} do plano em uso · `
    + `${usu} ${usu === 1 ? 'usuário ativo' : 'usuários ativos'} e ${conv} ${conv === 1 ? 'convite em aberto' : 'convites em aberto'}</div>`
    + `<div class="barra"><i style="width:${pct}%"></i></div>`
    + (LUGARES_CHEIOS
      ? `<div class="motivo">O plano permite ${teto} ${teto === 1 ? 'usuário' : 'usuários'} e todos os lugares estão em uso. `
        + `Para convidar outra pessoa, desative um usuário em <b>Usuários</b>, cancele um convite em aberto ou fale com `
        + `${htm(typeof faleCom === 'function' ? faleCom() : 'o administrador do sistema')} para trocar de plano.</div>`
      : '');
  if (btn) {
    btn.disabled = LUGARES_CHEIOS;
    btn.title = LUGARES_CHEIOS ? 'O plano não tem mais lugar para usuários' : '';
  }
}

function copiarLink(email, conviteId) {
  // v1.683 — o link leva o código do convite: a tela de cadastro mostra a
  // imobiliária e já preenche o e-mail
  const link = window.__linkCadastro + (conviteId ? '?c=' + encodeURIComponent(conviteId) : '');
  const texto = `Você foi convidado para o CRM da ${htm((PERM.empresa && (PERM.empresa.nome_fantasia || PERM.empresa.razao_social)) || 'imobiliária')}.\n\n` +
    `Acesse ${link} e cadastre-se usando exatamente este e-mail: ${email}\n` +
    `Você mesmo define a sua senha — ninguém da imobiliária tem acesso a ela.`;
  navigator.clipboard.writeText(texto).then(
    () => dialogoAvisar('Texto do convite copiado. Cole no WhatsApp ou no e-mail da pessoa.'),
    () => dialogoPedir({ titulo: 'Copie o texto abaixo', valor: texto, multilinha: true, ok: 'Fechar', cancelar: null }));
}

function abrirConvite() {
  if (LUGARES_CHEIOS) return;   // v1.687 — o botão já está desligado; isto é para quem chamar por fora
  document.getElementById('c-email').value = '';
  document.getElementById('c-nome').value = '';
  document.getElementById('c-papel').innerHTML =
    papeis.map(p => `<option value="${p.id}">${htm(p.nome)}</option>`).join('');
  // v1.170 — lookup no lugar do select com todos os contatos
  ligarLookup(document.getElementById('c-contato'),
    () => contatos.map(c => ({ id: c.id, rotulo: c.nome, apoio: c.codigo })));
  // Dizer, em letras grandes, para QUAL imobiliaria a pessoa esta sendo
  // convidada. O seletor de empresa fica no alto da tela e e facil de
  // esquecer; o convite grava empresaAtual sem perguntar nada.
  const emp = empresas.find(e => e.id === empresaAtual);
  const aviso = document.getElementById('c-empresa-aviso');
  if (aviso) {
    const nome = emp ? (emp.nome_fantasia || emp.razao_social) : 'empresa nao identificada';
    aviso.innerHTML = `Esta pessoa vai entrar em <b>${htm(nome)}</b> e enxergar os dados dessa ` +
      `imobiliaria. Para convidar para outra, feche esta janela e troque a empresa no alto da tela.`;
  }
  document.getElementById('erro-convite').style.display = 'none';
  document.getElementById('c-papel').onchange = mostrarBlocoContato;
  mostrarBlocoContato();
  abrir('modal-convite');
}

/** O vínculo com a ficha de contato só aparece quando faz sentido. */
function mostrarBlocoContato() {
  const p = papeis.find(x => x.id === document.getElementById('c-papel').value);
  const ehParceiro = p && /parceiro|prestador/i.test(p.nome);
  document.getElementById('bloco-contato').style.display = ehParceiro ? '' : 'none';
}

async function salvarConvite() {
  const erro = document.getElementById('erro-convite');
  erro.style.display = 'none';
  const email = document.getElementById('c-email').value.trim().toLowerCase();
  if (!email || email.indexOf('@') < 0) { mostrarErro(erro, 'Informe um e-mail válido.'); return; }

  const papelId = document.getElementById('c-papel').value;
  const p = papeis.find(x => x.id === papelId);
  const ehParceiro = p && /parceiro|prestador/i.test(p.nome);
  const contatoId = valorDoLookup(document.getElementById('c-contato'));
  if (ehParceiro && !contatoId) {
    mostrarErro(erro, 'O papel Parceiro precisa de uma ficha de contato — é o vínculo que faz o ' +
      'prestador enxergar só os casos dele. Sem isso ele entra e não vê nada.');
    return;
  }

  const botao = document.getElementById('btn-convite');
  botao.disabled = true;
  try {
    // v1.764 — o id volta para o link levar o ?c= (como o "Copiar convite"
    // da lista já fazia desde a v1.683)
    const { data: novo, error } = await sb.from('convites').insert({
      empresa_id: empresaAtual, email, nome: document.getElementById('c-nome').value.trim() || null,
      papel_id: papelId, contato_id: contatoId
    }).select('id').maybeSingle();
    if (error) {
      if (/convites_email_aberto/.test(error.message))
        throw new Error('Já existe um convite em aberto para este e-mail. Cancele o anterior primeiro.');
      throw error;
    }
    fechar('modal-convite');
    await carregarConvites();
    copiarLink(email, novo && novo.id);
  } catch (e) { mostrarErro(erro, e.message); }
  finally { botao.disabled = false; }
}

async function cancelarConvite(id) {
  if (!(await dialogoPerguntar({ texto: 'Cancelar este convite?', ok: 'Cancelar o convite', cancelar: 'Voltar', perigo: true }))) return;
  const { error } = await sb.from('convites').delete().eq('id', id);
  if (error) { await dialogoAvisar('Não foi possível cancelar: ' + error.message); return; }
  await carregarConvites();
}

// ------------------------------------------------------------
// UTILIDADES DA TELA
// ------------------------------------------------------------
function verAba(id) {
  document.querySelectorAll('.painel-aba').forEach(p => p.classList.remove('on'));
  document.getElementById('p-' + id).classList.add('on');

  // v1.406 — quem acende agora é o TRILHO, e não a fileira de abas.
  // O segundo parâmetro (o botão clicado) saiu junto com a fileira.
  // NÃO dá para acender por `#abas button`: esse id agora é só do
  // cabeçalho, onde vive a barra de objetos de todas as telas — mexer
  // ali daqui apagaria o destaque da aba do menu principal.
  ABA_CONFIG = id;
  document.querySelectorAll('#cfg-trilho .cfg-linha').forEach(b =>
    b.classList.toggle('on', b.dataset.chave === id));
  pintarCaminhoConfig(id);
  // v1.126: o histórico só consulta quando alguém abre a aba. Carregar
  // junto com a tela custaria uma viagem ao banco em toda visita à
  // Administração, para uma aba que quase nunca é a que se procura.
  if (id === 'historico') carregarHistorico();
  if (id === 'regras') carregarRegras();
  if (id === 'seguro') { carregarItensPadrao(); }
  if (id === 'seguradoras' && typeof SG !== 'undefined') SG.abrir();   // v1.503 — era tela própria
  // v1.502 — Armazenamento e Limpeza de histórico saíram desta aba
  // (aba Dados da Plataforma); carregarLimites continua porque o teto
  // de campos rastreados do Gerenciador de objetos lê limitesDaEmpresa
  if (id === 'padroes') { carregarPadroes(); carregarLimites(); carregarMeuPlano(); }
  if (id === 'documentos') carregarModelosDoc();
  if (id === 'checklist') carregarChecklist();
  if (id === 'acessos') carregarAcessos(0);
  if (id === 'backup') backupCarregar();   // v1.378
  if (id === 'mensagens') { carregarMensagens(); carregarModelosMsg(); carregarConfigEnvio(); }
  if (id === 'integracoes') carregarIntegracoes();   // v1.497 — o WhatsApp veio para cá
  if (id === 'avisos') { carregarReguaGuardiao(); carregarDestinatariosGuardiao();
                         carregarEnviosGuardiao(); }
  if (id === 'atendente') iaAbrir();   // v1.414 — atendente-ia.js
  if (id === 'legendas') liaAbrir();   // v1.486 — legenda-ia.js
  if (id === 'validacao') rvAbrir();   // v1.733 — regras de validação
}

// ============================================================
// v1.237 — CONFIGURAÇÕES GERAIS
//
// Os padrões que preenchem o formulário de contrato novo. Ficam em
// `empresas.padroes` (jsonb), por imobiliária — a lista vai crescer a
// cada padrão que a gente descobrir escrito no código, e jsonb aceita
// chave nova sem migração.
//
// A ordem dos campos aqui é a mesma do HTML e a mesma do
// PADROES_FABRICA no campos.js. Os três precisam continuar batendo:
// quem grava é este arquivo, quem lê é o contratos.js, e quem diz o
// valor de fábrica é o campos.js.
// ============================================================
const PADROES_CAMPOS = ['prazo_meses', 'periodicidade_reajuste_meses', 'indice_reajuste',
  'dia_vencimento', 'multa_percentual', 'juros_mes_percentual', 'base_comissao',
  'primeiro_mes_cobranca', 'dias_minimos_primeira', 'taxa_contrato_percentual',
  'taxa_contrato_parcela',
  // v1.310 — a régua do cartão "Pede atenção" da ficha do contrato.
  // Entram aqui porque `empresas.padroes` é jsonb e aceita chave nova
  // sem migração; cada imobiliária escolhe a sua.
  'radar_dias_seguro', 'radar_dias_reajuste', 'radar_dias_fim_contrato',
  // v1.472 — o prazo do alerta de repasse (número, úteis/corridos, base)
  'repasse_dias', 'repasse_tipo', 'repasse_base',
  // v1.596 — a chave geral do "não gravar conversas de proprietários"
  'calar_proprietarios'];

/** v1.596 — as chaves que são LIGA/DESLIGA. Não são número nem texto:
 *  o carregar lê `.checked` e o salvar grava boolean. Sem esta lista,
 *  o salvarPadroes tentaria `Number('on')` e recusaria o formulário
 *  inteiro com "valor inválido". */
const PADROES_CHECK = ['calar_proprietarios'];
  // v1.502 — os limites que a imobiliária escolhia dentro do teto do
  // plano (max_relatorios, max_campos_total, max_campos_rastreados —
  // v1.313) SAÍRAM desta lista: quem grava teto próprio agora é a
  // Plataforma (aba Dados → Limites desta imobiliária), no MESMO
  // `empresas.padroes`, para qualquer uma das 19 chaves. Por isso o
  // salvarPadroes abaixo passou a PRESERVAR o que não é dele.

/** os textos, que não são números */
const PADROES_TEXTO = ['indice_reajuste', 'base_comissao', 'primeiro_mes_cobranca',
  'repasse_tipo', 'repasse_base'];   // v1.472 — as duas selects do repasse

/** v1.472 — injeta os 3 campos do "Repasse ao proprietário" no card do
 *  Radar (mesmo `empresas.padroes`, salvos pela mesma função). Fica no JS
 *  para não reescrever o admin.html; carregarPadroes/salvarPadroes já
 *  acham por id porque as chaves entraram em PADROES_CAMPOS. */
/** v1.596 — O INTERRUPTOR DAS CONVERSAS DE PROPRIETÁRIO.
 *
 *  Injetado por JS, como o bloco do Repasse (v1.472): não mexe no
 *  admin.html, e o carregarPadroes/salvarPadroes já acham pelo id
 *  porque a chave entrou em PADROES_CAMPOS.
 *
 *  O texto de apoio diz as DUAS coisas que a pessoa precisa saber
 *  antes de ligar — quem fica mudo e o que acontece com o passado —
 *  porque ligar sem saber isso é o tipo de coisa que só se descobre
 *  quando falta uma conversa. */
function injetarChaveProprietarios() {
  if (document.getElementById('pd-calar_proprietarios')) return;
  const ancora = document.getElementById('pd-repasse_base')
              || document.getElementById('pd-radar_dias_fim_contrato');
  const grade = ancora && ancora.closest('.grade-padroes');
  if (!grade) return;
  const bloco = document.createElement('div');
  bloco.innerHTML =
    '<div style="font-weight:700;color:var(--azul);font-size:13px;margin:16px 0 8px;'
    + 'border-top:1px dashed var(--borda);padding-top:14px">Conversas</div>'
    + '<label class="orc-check" style="display:flex;gap:9px;align-items:flex-start;'
    + 'font-size:13.5px;line-height:1.5;cursor:pointer">'
    + '<input type="checkbox" id="pd-calar_proprietarios" style="margin-top:3px">'
    + '<span><b>Não gravar as conversas de proprietários</b>'
    + '<div style="color:var(--texto-suave);font-size:12px;margin-top:3px">'
    + 'Vale para quem é <b>só</b> proprietário: quem também aluga com a imobiliária '
    + 'continua com a conversa gravada, porque ali se fala de boleto, vistoria e reparo.<br>'
    + 'O que já foi gravado <b>permanece</b> — a regra vale daqui para a frente. '
    + 'Enviar recibo, lembrete e aniversário continua normal; só a conversa fica muda.'
    + '</div></span></label>';
  grade.parentNode.insertBefore(bloco, grade.nextSibling);
}

function injetarCamposRepasse() {
  if (document.getElementById('pd-repasse_dias')) return;
  const ancora = document.getElementById('pd-radar_dias_fim_contrato');
  const grade = ancora && ancora.closest('.grade-padroes');
  if (!grade) return;
  const bloco = document.createElement('div');
  bloco.innerHTML =
    '<div style="font-weight:700;color:var(--azul);font-size:13px;margin:16px 0 8px;'
    + 'border-top:1px dashed var(--borda);padding-top:14px">Repasse ao proprietário</div>'
    + '<div class="grade-padroes">'
    + '<div class="campo"><label>Prazo (dias)</label>'
    + '<input id="pd-repasse_dias" type="number" min="0" step="1">'
    + '<div class="pd-ajuda">de fábrica: 3</div></div>'
    + '<div class="campo"><label>Contar em</label>'
    + '<select id="pd-repasse_tipo"><option value="uteis">Dias úteis</option>'
    + '<option value="corridos">Dias corridos</option></select>'
    + '<div class="pd-ajuda">de fábrica: dias úteis</div></div>'
    + '<div class="campo"><label>A partir de</label>'
    + '<select id="pd-repasse_base"><option value="vencimento">Do vencimento do boleto</option>'
    + '<option value="pagamento">Da confirmação do pagamento</option></select>'
    + '<div class="pd-ajuda">de fábrica: do vencimento</div></div>'
    + '</div>';
  grade.parentNode.insertBefore(bloco, grade.nextSibling);
}

function carregarPadroes() {
  injetarCamposRepasse();        // v1.472
  injetarChaveProprietarios();   // v1.596
  // v1.473 — "de fábrica" virou "do sistema" (mais claro) nas dicas,
  // sem reescrever o admin.html
  document.querySelectorAll('.pd-ajuda, .aviso-fin').forEach(function (el) {
    if (/de f[áa]brica/i.test(el.innerHTML))
      el.innerHTML = el.innerHTML.replace(/de f[áa]brica/gi, 'do sistema');
  });
  const emp = empresas.find(function (e) { return e.id === empresaAtual; })
           || (PERM.empresa || {});
  const p = emp.padroes || {};
  PADROES_CAMPOS.forEach(function (k) {
    const el = document.getElementById('pd-' + k);
    if (!el) return;
    // v1.764 — "Não descontar" é gravado como nulo de propósito (ver
    // salvarPadroes): nulo GRAVADO volta a mostrar "Não descontar", e não
    // o padrão do sistema — senão a tela desfazia a escolha ao recarregar.
    if (k === 'taxa_contrato_parcela' && p[k] === null
        && Object.prototype.hasOwnProperty.call(p, k)) { el.value = ''; return; }
    const v = (p[k] === undefined || p[k] === null) ? PADROES_FABRICA[k] : p[k];
    // v1.596 — liga/desliga é `.checked`, não `.value`
    if (PADROES_CHECK.indexOf(k) >= 0) { el.checked = (v === true || v === 'true'); return; }
    el.value = (v === null || v === undefined) ? '' : String(v);
  });
  // v1.310 — são dois cartões e dois avisos de erro; some com os dois
  ['padroes-erro', 'radar-erro'].forEach(function (id) {
    const e = document.getElementById(id);
    if (e) e.style.display = 'none';
  });
}

/**
 * v1.310 — `idErro` diz em QUAL cartão a mensagem aparece. Os dois
 * botões (Contrato novo e Radar) salvam o jsonb inteiro, como sempre
 * fizeram; o que muda é só onde o "Padrões salvos." é escrito, para
 * não responder a um clique com um aviso do outro lado da tela.
 */
async function salvarPadroes(idErro) {
  const erro = document.getElementById(idErro || 'padroes-erro');
  erro.style.display = 'none';
  const novo = {};

  for (const k of PADROES_CAMPOS) {
    const el = document.getElementById('pd-' + k);
    if (!el) continue;

    // v1.596 — o liga/desliga sai antes de tudo: `el.value` de um
    // checkbox é "on", e Number('on') é NaN — o formulário inteiro
    // seria recusado por "valor inválido".
    if (PADROES_CHECK.indexOf(k) >= 0) { novo[k] = !!el.checked; continue; }

    const bruto = String(el.value || '').trim();

    // "Não descontar" é a única escolha que grava VAZIO de propósito:
    // é o liga/desliga da taxa de contrato, e vazio quer dizer desligado
    if (k === 'taxa_contrato_parcela' && bruto === '') { novo[k] = null; continue; }
    // campo vazio volta ao de fábrica — não vira zero
    if (bruto === '') continue;

    if (PADROES_TEXTO.indexOf(k) >= 0) { novo[k] = bruto; continue; }

    const n = Number(bruto.replace(',', '.'));
    if (!Number.isFinite(n) || n < 0)
      return mostrarErro(erro, 'Valor inválido em "' + k.replace(/_/g, ' ') + '".');
    if (/percentual/.test(k) && n > 100)
      return mostrarErro(erro, 'Percentual vai de 0 a 100.');
    if (k === 'dia_vencimento' && (n < 1 || n > 28))
      return mostrarErro(erro, 'O dia de vencimento vai de 1 a 28 — 29, 30 e 31 não existem '
        + 'em todo mês, e o boleto viraria para o mês seguinte em fevereiro.');

    novo[k] = n;
  }

  // v1.502 — `empresas.padroes` não é só desta tela: a Plataforma grava
  // ali os tetos próprios da imobiliária (os 19 limites). Gravar o
  // jsonb inteiro apagaria isso em silêncio. Então: parte do que está
  // gravado, tira SÓ as chaves desta tela (campo vazio = volta ao
  // padrão do sistema) e põe as preenchidas por cima.
  const emp = empresas.find(function (e) { return e.id === empresaAtual; })
           || (PERM.empresa && PERM.empresa.id === empresaAtual ? PERM.empresa : null);
  const gravado = Object.assign({}, (emp && emp.padroes) || {});
  PADROES_CAMPOS.forEach(function (k) { delete gravado[k]; });
  const final = Object.assign(gravado, novo);

  const { error } = await sb.from('empresas').update({ padroes: final }).eq('id', empresaAtual);
  if (error) return mostrarErro(erro, error.message);

  // o que está na memória também, senão o próximo contrato desta sessão
  // ainda usaria o valor antigo
  if (emp) emp.padroes = final;
  if (PERM.empresa && PERM.empresa.id === empresaAtual) PERM.empresa.padroes = final;
  mostrarErro(erro, 'Padrões salvos.', true);
}
// v1.502 — o cartão ARMAZENAMENTO (v1.254: uso_de_armazenamento, os 20
// maiores anexos, exclusão) saiu desta tela: mora na aba Dados da
// Plataforma (plataforma.js, seção 6), por imobiliária ou todas.
function abrir(id) { document.getElementById(id).classList.add('aberto'); }
function fechar(id) { document.getElementById(id).classList.remove('aberto'); }
// ============================================================
// v1.313 — LIMITES: O TETO DO PLANO E A ESCOLHA DA IMOBILIÁRIA
//
// Dois níveis, e é assim que sustenta várias imobiliárias assinando:
//
//   planos.max_*        o teto do PRODUTO, igual para todas as
//                       imobiliárias daquele plano. Só superadmin edita.
//   empresas.padroes.*  o que AQUELA imobiliária escolheu usar dentro
//                       do teto. Vazio = não escolheu = vale o teto.
//
// Quem faz a conta é o banco (`limite_efetivo` = least(escolhido,
// teto)), e ela é a MESMA que as travas usam. Se a tela fizesse a sua
// própria conta, um dia as duas discordariam — e a que vale é sempre
// a do banco.
// ============================================================
let limitesDaEmpresa = [];   // uma linha por limite (limites_do_plano)
let planosParaEditar = [];   // só carregado para superadmin

/**
 * v1.501 — O CARTÃO "SEU PLANO": todos os limites do plano da empresa em
 * foco, com quanto já se usa. Quem conta é o banco (meus_limites →
 * limite_uso), a MESMA conta que os gatilhos de criação usam — a tela
 * nunca faz a sua própria. Sem a RPC (SQL da 1.501 não rodado), o
 * cartão fica escondido e nada muda.
 */
async function carregarMeuPlano() {
  const cartao = document.getElementById('cartao-meu-plano');
  if (!cartao) return;
  // v1.687 — o detalhe do plano é conversa da plataforma, não da
  // imobiliária: só o superadmin vê (pedido do Rodrigo, 23/09)
  if (!(typeof PERM !== 'undefined' && PERM.superadmin)) { cartao.style.display = 'none'; return; }
  let r;
  try { r = await sb.rpc('meus_limites'); } catch (e) { r = { error: e }; }
  if (r.error || !r.data || !Array.isArray(r.data.limites) || !r.data.limites.length) { cartao.style.display = 'none'; return; }
  const num = v => { const n = Number(v); return isNaN(n) ? '—' : String(Math.round(n * 100) / 100).replace('.', ','); };
  document.getElementById('mp-plano').textContent = r.data.plano || 'sem plano';
  document.getElementById('mp-limites').innerHTML = r.data.limites.map(function (l) {
    const semTeto = l.teto === null || l.teto === undefined;
    if (l.contavel === false) {
      return '<div><div class="k"><span>' + htm(l.nome) + '</span><b>' + (semTeto ? 'sem limite' : htm(num(l.teto) + (l.unidade ? ' ' + l.unidade : ''))) + '</b></div></div>';
    }
    const usado = Number(l.usado) || 0, teto = Number(l.teto);
    const pct = semTeto ? 0 : (teto > 0 ? Math.min(100, Math.round(100 * usado / teto)) : (usado > 0 ? 100 : 0));
    const estouro = !semTeto && usado > teto, alerta = !semTeto && !estouro && pct >= 80;
    return '<div><div class="k"><span>' + htm(l.nome) + '</span><b>' + (l.chave === 'ia_reais_mes' ? 'R$ ' : '')
      + htm(num(usado)) + (semTeto ? '' : ' de ' + htm(num(teto))) + (l.unidade && l.unidade !== 'R$' ? ' ' + htm(l.unidade) : '') + '</b></div>'
      + (semTeto ? '' : '<div class="uso" style="display:block"><div class="b' + (estouro ? ' estouro' : (alerta ? ' alerta' : '')) + '"><i style="width:' + pct + '%"></i></div></div>')
      + '</div>';
  }).join('');
  // v1.514 — o que a Moralí concedeu a mais (ou tirou) e até quando.
  // O cliente vê o quê e o prazo; não vê valor nem porquê.
  const exc = Array.isArray(r.data.excecoes) ? r.data.excecoes : [];
  let caixa = document.getElementById('mp-excecoes');
  if (!caixa) {
    caixa = document.createElement('div'); caixa.id = 'mp-excecoes';
    document.getElementById('mp-limites').insertAdjacentElement('afterend', caixa);
  }
  const dataBr = function (iso) { if (!iso) return ''; const p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
  caixa.innerHTML = exc.length
    ? '<div class="mp-exc-t">No seu plano, a mais</div>' + exc.map(function (x) {
        const vale = x.tipo === 'modulo'
          ? '<span class="tag ' + (x.ligado ? 'tag-verde' : 'tag-cinza') + '">' + (x.ligado ? 'liberado' : 'desligado') + '</span>'
          : '<b>' + htm(Number(x.valor).toLocaleString('pt-BR')) + '</b>';
        return '<div class="mp-exc"><span>' + htm(x.nome) + '</span>' + vale
          + (x.fim ? '<span class="mp-exc-ate">até ' + htm(dataBr(x.fim)) + '</span>' : '<span class="mp-exc-ate">sem prazo</span>') + '</div>';
      }).join('')
    : '';
  cartao.style.display = '';
}

async function carregarLimites() {
  const r = await sb.rpc('limites_do_plano', { p_empresa: empresaAtual });
  limitesDaEmpresa = r.data || [];

  limitesDaEmpresa.forEach(function (l) {
    const el = document.getElementById('lim-teto-' + l.chave);
    if (!el) return;
    el.textContent = 'plano ' + (l.plano || '—') + ': '
      + (l.teto === null ? 'sem limite' : 'até ' + l.teto)
      + ' · ' + l.usado + ' em uso';
  });
  // v1.502 — os campos `lim-teto-*` (cartão "Limites desta imobiliária")
  // não existem mais nesta tela; o laço acima não acha nada e segue. O
  // que esta função ainda sustenta é `limitesDaEmpresa`, que o
  // Gerenciador de objetos lê pelo tetoDoPlano('max_campos_rastreados').

  // v1.500 — o cartão "Planos e limites" saiu desta tela: mora na
  // Plataforma. Os planos ainda são carregados (carregarEmpresas) para
  // a matriz de Papéis saber o que o plano da empresa em foco liga.
}

/** O teto do plano para uma chave — usado na validação do salvar. */
function tetoDoPlano(chave) {
  const l = limitesDaEmpresa.find(function (x) { return x.chave === chave; });
  return l ? l.teto : null;
}

// v1.500 — carregarPlanos()/salvarPlanos() (a tabela de limites dos
// planos, v1.313) saíram daqui: moram na Plataforma
// (plataforma_planos_salvar).

// ============================================================
// v1.320 — CHECK-LIST: O CADASTRO DAS DUAS LISTAS
//
// A da locação e a do encerramento. Quem desenha o cartão na ficha do
// contrato é o ficha.js (v1.319); aqui só se escolhe o que entra, em
// que ordem, o que é obrigatório e o que o CRM confere sozinho.
//
// A ORDEM É POR SETAS, e não por arrastar: são 15 linhas de texto
// longo, e arrastar linha comprida em lista vertical erra mais do que
// acerta. Mesmo caminho da ordenação de seções do layout (v1.189).
//
// As chaves de "o CRM confere" são fechadas de propósito: cada uma tem
// uma regra escrita no ficha.js. Chave sem regra lá cairia como "a
// pessoa marca" — não quebra, mas engana. Por isso a lista é um
// seletor, e não texto livre.
// ============================================================
const CK_AUTOMATICOS = [
  ['',            'A pessoa marca'],
  ['cadastro',    'O CRM: o contrato existe'],
  ['garantia',    'O CRM: garantia ok (e apólice, se for fiança)'],
  ['incendio',    'O CRM: apólice de incêndio vigente'],
  ['financeiro',  'O CRM: parcelas geradas'],
  ['indice',      'O CRM: índice, multa e juros preenchidos'],
  ['anexos',      'O CRM: há arquivos no contrato'],
  ['anuncio',     'O CRM: imóvel saiu de Disponível'],
  ['sem_debito',  'O CRM: sem parcela vencida em aberto'],
  ['sem_repasse', 'O CRM: nada recebido esperando repasse'],
  ['encerrado',   'O CRM: contrato está Encerrado']
];

let checklistDaTela = [];

function listaChecklistEscolhida() {
  const el = document.getElementById('ck-lista');
  return (el && el.value) || 'locacao';
}

async function carregarChecklist() {
  const alvo = document.getElementById('linhas-checklist');
  if (!alvo) return;

  const r = await sb.from('checklist_itens').select('*')
    .eq('empresa_id', empresaAtual)
    .eq('lista', listaChecklistEscolhida())
    .order('ordem');
  if (r.error) {
    alvo.innerHTML = '<tr><td colspan="5" class="vazio">Não consegui ler: '
      + htm(r.error.message) + '</td></tr>';
    return;
  }
  checklistDaTela = r.data || [];

  // a data de corte mora na empresa, e é ela que faz o check-list
  // valer só para locação nova
  const emp = (empresas || []).find(function (e) { return e.id === empresaAtual; })
           || (PERM.empresa || {});
  const desde = document.getElementById('ck-desde');
  if (desde) desde.textContent = emp.checklist_a_partir_de
    ? dataBr(emp.checklist_a_partir_de) : '(nenhuma data definida — o cartão não aparece)';

  desenharChecklist();
}

function desenharChecklist() {
  const alvo = document.getElementById('linhas-checklist');
  if (!alvo) return;

  const conta = document.getElementById('ck-conta');
  if (conta) conta.textContent = '(' + checklistDaTela.length + ' itens · '
    + checklistDaTela.filter(function (i) { return i.obrigatorio; }).length + ' obrigatórios · '
    + checklistDaTela.filter(function (i) { return i.automatico; }).length + ' automáticos)';

  alvo.innerHTML = checklistDaTela.length
    ? checklistDaTela.map(function (i, n) {
        return '<tr' + (i.ativo ? '' : ' style="opacity:.45"') + '>'
          + '<td style="white-space:nowrap">'
          + '<button class="lay-seta" title="Subir"' + (n === 0 ? ' disabled' : '')
          + ' data-perm="administracao:editar" onclick="moverItemChecklist(' + n + ', -1)">▲</button>'
          + '<button class="lay-seta" title="Descer"'
          + (n === checklistDaTela.length - 1 ? ' disabled' : '')
          + ' data-perm="administracao:editar" onclick="moverItemChecklist(' + n + ', 1)">▼</button></td>'

          + '<td><input class="ck-texto" value="' + htm(i.texto) + '"'
          + ' data-perm="administracao:editar"'
          + ' onchange="salvarItemChecklist(\'' + i.id + '\', { texto: this.value })"></td>'

          + '<td><select data-perm="administracao:editar"'
          + ' onchange="salvarItemChecklist(\'' + i.id + '\', { obrigatorio: this.value === \'1\' })">'
          + '<option value="1"' + (i.obrigatorio ? ' selected' : '') + '>Obrigatório</option>'
          + '<option value="0"' + (i.obrigatorio ? '' : ' selected') + '>Opcional</option>'
          + '</select></td>'

          + '<td><select data-perm="administracao:editar"'
          + ' onchange="salvarItemChecklist(\'' + i.id + '\', { automatico: this.value || null })">'
          + CK_AUTOMATICOS.map(function (a) {
              return '<option value="' + a[0] + '"'
                + ((i.automatico || '') === a[0] ? ' selected' : '') + '>' + htm(a[1]) + '</option>';
            }).join('')
          + '</select></td>'

          + '<td style="white-space:nowrap">'
          + '<button class="btn btn-claro" style="padding:4px 10px;font-size:12px"'
          + ' data-perm="administracao:editar" onclick="salvarItemChecklist(\'' + i.id
          + '\', { ativo: ' + (i.ativo ? 'false' : 'true') + ' })">'
          + (i.ativo ? 'Desativar' : 'Reativar') + '</button> '
          + '<button class="btn btn-claro" style="padding:4px 10px;font-size:12px;color:var(--erro)"'
          + ' data-perm="administracao:editar" onclick="excluirItemChecklist(\'' + i.id + '\')">'
          + 'Excluir</button></td></tr>';
      }).join('')
    : '<tr><td colspan="5" class="vazio">Nenhum item nesta lista ainda.</td></tr>';

  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

async function salvarItemChecklist(id, mudanca) {
  const erro = document.getElementById('ck-erro');
  erro.style.display = 'none';
  const r = await sb.from('checklist_itens').update(mudanca).eq('id', id);
  if (r.error) return mostrarErro(erro, r.error.message);
  await carregarChecklist();
}

/**
 * Sobe e desce. Grava a ordem dos DOIS que trocaram de lugar, e não a
 * lista inteira: renumerar tudo a cada seta faria 15 gravações para
 * mover uma linha.
 */
async function moverItemChecklist(n, passo) {
  const a = checklistDaTela[n], b = checklistDaTela[n + passo];
  if (!a || !b) return;
  const erro = document.getElementById('ck-erro');
  erro.style.display = 'none';

  const r1 = await sb.from('checklist_itens').update({ ordem: b.ordem }).eq('id', a.id);
  const r2 = await sb.from('checklist_itens').update({ ordem: a.ordem }).eq('id', b.id);
  if (r1.error || r2.error)
    return mostrarErro(erro, (r1.error || r2.error).message);
  await carregarChecklist();
}

/** Item novo entra no fim da lista da vez, como "a pessoa marca". */
async function novoItemChecklist() {
  const texto = await dialogoPedir({ titulo: 'Novo item do checklist', rotulo: 'O que precisa ser conferido?', ok: 'Acrescentar', obrigatorio: true });
  if (!texto || !texto.trim()) return;
  const erro = document.getElementById('ck-erro');
  erro.style.display = 'none';

  const ultima = checklistDaTela.length
    ? Math.max.apply(null, checklistDaTela.map(function (i) { return i.ordem || 0; })) : 0;

  const r = await sb.from('checklist_itens').insert({
    empresa_id: empresaAtual, lista: listaChecklistEscolhida(),
    ordem: ultima + 1, texto: texto.trim(), obrigatorio: false, automatico: null, ativo: true });
  if (r.error) return mostrarErro(erro, r.error.message);
  await carregarChecklist();
}

/**
 * Excluir apaga junto o que já foi marcado nos contratos (a FK é
 * `on delete cascade`). Por isso o aviso conta quantas marcações vão
 * embora — em item já usado, DESATIVAR é o caminho: ele some das
 * locações novas e o histórico das antigas fica de pé.
 */
async function excluirItemChecklist(id) {
  const item = checklistDaTela.find(function (i) { return i.id === id; }) || {};
  const c = await sb.from('contrato_checklist')
    .select('id', { count: 'exact', head: true }).eq('item_id', id);
  const usos = c.count || 0;

  if (!(await dialogoPerguntar({ texto: 'Excluir "' + (item.texto || 'item') + '"?\n\n'
      + (usos ? 'Isto apaga também ' + usos + ' marcação(ões) já feitas em contratos. '
              + 'Se o item só não vale mais para locação nova, DESATIVE em vez de excluir.'
              : 'Ele ainda não foi marcado em nenhum contrato.'), ok: 'Excluir', perigo: true }))) return;

  const erro = document.getElementById('ck-erro');
  erro.style.display = 'none';
  const r = await sb.from('checklist_itens').delete().eq('id', id);
  if (r.error) return mostrarErro(erro, r.error.message);
  await carregarChecklist();
}

function mostrarErro(el, msg, ok) {
  el.textContent = ok ? msg : (typeof erroEmPortugues === 'function') ? erroEmPortugues(msg) : msg;   // v1.735
  el.style.color = ok ? 'var(--verde-escuro)' : 'var(--erro)';
  el.style.display = 'block';
}

// ============================================================
// v1.733 — REGRAS DE VALIDAÇÃO (Configuração › Regras de validação)
//
// Uma condição de erro por regra, escrita com a fórmula dos campos
// calculados (formula.js). O navegador manda a ÁRVORE, nunca SQL: o
// gatilho `regras_validacao_compilar` do banco traduz, confere cada
// coluna e prova o SQL numa linha vazia antes de aceitar. Quem barra é
// o gatilho `zz_regras_validacao` das tabelas-base; a ficha e a lista
// conferem antes só para marcar o campo (rv* do formula.js).
//
// Os objetos são os mesmos do Gerenciador (OBJETOS_PERS); os campos
// são os da DEF da ficha (por coluna) mais os personalizados do objeto.
// Campo CALCULADO (fórmula) e campo de objeto RELACIONADO ficam de fora:
// o banco não tem a coluna do primeiro nem a junção do segundo — a
// mesma fronteira da camada _fx.
// ============================================================
var rvObjeto = 'contatos';
var rvLista = [];            // as regras do objeto aberto
var rvBarradas = {};         // regra_id -> quantas vezes barrou (30 dias)
var rvCamposPers = [];       // os personalizados do objeto (para a fórmula e o "onde")
var rvEditando = null;       // a regra aberta na janela (null = nova)
var rvTeto = null;           // o teto do plano (null = sem limite)

async function rvAbrir() {
  const abas = document.getElementById('rv-abas');
  if (!abas) return;
  // v1.777 — objeto marcado `semRegras` (Financeiro) não tem a aba
  abas.innerHTML = OBJETOS_PERS.filter(function (o) { return !o.semRegras; }).map(function (o) {
    return '<button class="obj-aba' + (o.obj === rvObjeto ? ' on' : '') + '"' +
           ' onclick="rvVerObjeto(\'' + o.obj + '\')">' + o.icone + ' ' + o.rotulo + '</button>';
  }).join('') + rvObjetosPers().map(function (o) {
    // v1.768 — os objetos personalizados ativos, depois dos do sistema.
    // A chave só entra no onclick no formato p_… (é o banco que a criou);
    // o nome, digitado pela imobiliária, passa por htm()
    return '<button class="obj-aba' + (o.chave === rvObjeto ? ' on' : '') + '"' +
           ' onclick="rvVerObjeto(\'' + o.chave + '\')">' + icone(o.icone, 13) + ' ' + htm(o.plural) + '</button>';
  }).join('');
  await rvCarregar();
}

/** v1.768 — os objetos personalizados que aceitam regra: os ativos, com
 *  o módulo no plano. Quem confere de verdade é o banco (o objeto tem de
 *  existir nesta imobiliária). */
function rvObjetosPers() {
  if (!podeCriarObjeto()) return [];
  return (objetosPers || []).filter(function (o) { return o.ativo && /^p_[a-z][a-z0-9_]{1,30}$/.test(o.chave); });
}

function rvVerObjeto(obj) { rvObjeto = obj; rvAbrir(); }

async function rvCarregar() {
  const ha30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const r = await Promise.all([
    sb.from('regras_validacao').select('*')
      .eq('empresa_id', empresaAtual).eq('objeto', rvObjeto)
      .order('ordem').order('criado_em'),
    sb.from('regras_validacao_barradas').select('regra_id')
      .eq('empresa_id', empresaAtual).gte('em', ha30),
    sb.from('campos_personalizados').select('id,chave,rotulo,tipo,formula')
      .eq('empresa_id', empresaAtual).eq('objeto', rvObjeto)
      .is('excluido_em', null).eq('ativo', true).order('ordem'),
    sb.rpc('limites_do_plano', { p_empresa: empresaAtual })
  ]);
  if (r[0].error) {
    // o SQL da v1.733 ainda não rodou: diz isso em vez de uma tela vazia
    document.getElementById('rv-linhas').innerHTML =
      '<tr><td colspan="7" class="vazio">' + htm(r[0].error.message) +
      ' — rode o SQL da v1.733 no banco.</td></tr>';
    return;
  }
  rvLista = r[0].data || [];
  rvBarradas = {};
  (r[1].data || []).forEach(function (b) { rvBarradas[b.regra_id] = (rvBarradas[b.regra_id] || 0) + 1; });
  // personalizado com fórmula é calculado: não tem coluna no banco
  rvCamposPers = (r[2].data || []).filter(function (c) { return !(c.formula && String(c.formula).trim()); });
  const lim = (r[3].data || []).find(function (x) { return x.chave === 'regras_validacao'; });
  rvTeto = lim ? lim.teto : null;
  rvDesenhar();
}

function rvRotuloDoObjeto() {
  const o = OBJETOS_PERS.find(function (x) { return x.obj === rvObjeto; });
  if (o) return o.rotulo;
  const op = objetoPers(rvObjeto);           // v1.768
  return op ? op.plural : rvObjeto;
}

/** Os campos que uma regra pode citar: [{rotulo, tipo, coluna, pers}]. */
function rvCamposDoObjeto() {
  // v1.768 — objeto personalizado: os campos que todo registro tem
  // (código, título, proprietário) + os do Gerenciador
  const op = ehObjetoPers(rvObjeto) ? objetoPers(rvObjeto) : null;
  if (op) {
    const sist = camposDoSistemaPers(op).filter(function (c) { return !(c.titulo && op.titulo_modo === 'codigo'); })
      .map(function (c) { return { rotulo: c.r || 'Nome', tipo: c.t, coluna: c.c, pers: false }; });
    return sist.concat(rvCamposPers.map(function (c) {
      return { rotulo: c.rotulo, tipo: c.tipo, coluna: c.chave, pers: true };
    }));
  }
  // v1.776 — o resultado-chave não tem tela própria (a DEF dele aponta a
  // lista dos objetivos): sem tela, a ficha se acha pela tabela, como o
  // permissoes.js faz. Ciclo PDCA não tem ficha: só os personalizados.
  const alvo = fxObjetoDaFicha(rvObjeto) || ((typeof DEFS !== 'undefined' && typeof objetoDoCatalogoDaFicha === 'function')
    ? Object.keys(DEFS).find(function (k) { return DEFS[k].lista && objetoDoCatalogoDaFicha(k) === rvObjeto; }) : null);
  const def = (alvo && typeof DEFS !== 'undefined' && DEFS[alvo]) ? DEFS[alvo].campos : [];
  // campo de vínculo (t:'ref') entra: é coluna de verdade, e
  // ISBLANK({Proprietário}) é uma regra legítima
  const lista = def.filter(function (c) {
    return !c.c.startsWith('_') && !c.pers && !c.formula;
  }).map(function (c) { return { rotulo: c.r, tipo: c.t, coluna: c.c, pers: false }; });
  rvCamposPers.forEach(function (c) {
    lista.push({ rotulo: c.rotulo, tipo: c.tipo, coluna: c.chave, pers: true });
  });
  return lista;
}

/** Rótulo -> coluna, para a árvore que desce ao banco (como o
 *  rotuloParaColuna() dos campos de fórmula, mas do objeto desta aba). */
function rvRotuloParaColuna() {
  const mapa = Object.create(null);
  rvCamposDoObjeto().forEach(function (c) {
    mapa[String(c.rotulo).trim().toLowerCase()] = { coluna: c.coluna, pers: c.pers, tipo: c.tipo };
  });
  return function (rotulo) {
    const k = String(rotulo).trim().toLowerCase();
    return (k in mapa) ? mapa[k] : null;
  };
}

/** Coluna -> rótulo, para mostrar na lista "onde aparece". */
function rvRotuloDaColuna(campo) {
  if (!campo) return null;
  const k = String(campo);
  const pers = k.indexOf('pers:') === 0;
  const c = rvCamposDoObjeto().find(function (x) {
    return x.pers === pers && x.coluna === (pers ? k.slice(5) : k);
  });
  return c ? c.rotulo : k;
}

function rvDesenhar() {
  const n = rvLista.length, ativas = rvLista.filter(function (r) { return r.ativa; }).length;
  const cheio = rvTeto !== null && rvTeto !== undefined && ativas >= rvTeto;
  const barradas = Object.keys(rvBarradas).reduce(function (s, k) {
    return s + (rvLista.some(function (r) { return r.id === k; }) ? rvBarradas[k] : 0);
  }, 0);
  document.getElementById('rv-plano').innerHTML =
    '<span class="obj-contador' + (cheio ? ' cheio' : '') + '">' +
      (rvTeto == null ? n + ' regra(s) · plano sem limite'
                      : ativas + ' de ' + rvTeto + ' regras ativas do plano') + '</span>' +
    '<span class="obj-contador">' + ativas + ' ativa(s) · barraram ' + barradas +
      ' gravaç' + (barradas === 1 ? 'ão' : 'ões') + ' nos últimos 30 dias</span>' +
    '<button class="btn" style="padding:6px 14px;font-size:13px" data-perm="administracao:editar"' +
    ' onclick="rvNova()"' + (cheio ? ' disabled title="Limite do plano atingido — desative uma regra para liberar"' : '') + '>' +
    '+ Nova regra</button>';
  const cnt = document.getElementById('rv-cnt');
  if (cnt) cnt.textContent = '(' + n + ' em ' + rvRotuloDoObjeto() + ')';

  const QUANDO = { criar: 'só ao criar', editar: 'só ao editar' };
  document.getElementById('rv-linhas').innerHTML = rvLista.map(function (r) {
    const onde = r.campo
      ? 'No campo <span class="campo-alvo">' + htm(rvRotuloDaColuna(r.campo)) + '</span>'
      : 'Topo da ficha';
    const vezes = rvBarradas[r.id] || 0;
    return '<tr' + (r.ativa ? '' : ' class="rv-off"') + ' onclick="rvEditar(\'' + jsq(r.id) + '\')">' +
      '<td class="rastro rv-ativa" onclick="event.stopPropagation()">' +
        '<input type="checkbox" data-perm="administracao:editar"' + (r.ativa ? ' checked' : '') +
        ' onchange="rvAlternarAtiva(this, \'' + jsq(r.id) + '\')"></td>' +
      '<td><div class="rv-nome">' + htm(r.nome) + '</div>' +
        (r.descricao ? '<div class="rv-desc">' + htm(r.descricao) + '</div>' : '') +
        (QUANDO[r.quando] ? '<div class="rv-desc">' + QUANDO[r.quando] + '</div>' : '') + '</td>' +
      '<td><span class="rv-cond">' + htm(r.formula) + '</span></td>' +
      '<td>' + htm(r.mensagem) + '</td>' +
      '<td class="rv-onde">' + onde + '</td>' +
      '<td class="rv-conta">' + (vezes ? vezes + '× em 30 dias' : '—') + '</td>' +
      '<td style="white-space:nowrap" onclick="event.stopPropagation()">' +
        '<button class="btn btn-claro" style="padding:4px 10px;font-size:12px" data-perm="administracao:editar"' +
        ' onclick="rvEditar(\'' + jsq(r.id) + '\')">Editar</button> ' +
        '<button class="btn btn-claro" style="padding:4px 10px;font-size:12px;color:var(--erro)" data-perm="administracao:editar"' +
        ' onclick="rvExcluir(\'' + jsq(r.id) + '\')">Excluir</button></td></tr>';
  }).join('') || '<tr><td colspan="7" class="vazio">Nenhuma regra de validação em ' +
                 htm(rvRotuloDoObjeto()) + ' ainda.</td></tr>';
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

/** Liga/desliga direto na lista. Quem recusa (limite do plano, módulo)
 *  é o banco; a caixa volta ao lugar e diz por quê. */
async function rvAlternarAtiva(caixa, id) {
  const ligar = caixa.checked;
  caixa.disabled = true;
  const r = await sb.from('regras_validacao').update({ ativa: ligar }).eq('id', id);
  caixa.disabled = false;
  if (r.error) {
    caixa.checked = !ligar;
    await dialogoAvisar(r.error.message);
    return;
  }
  await rvCarregar();
}

function rvNova() { rvEditar(null); }

function rvEditar(id) {
  rvEditando = id ? rvLista.find(function (r) { return r.id === id; }) : null;
  const novo = !rvEditando;
  document.getElementById('rv-titulo').textContent =
    (novo ? 'Nova regra de validação' : 'Regra de validação') + ' — ' + rvRotuloDoObjeto();
  document.getElementById('btn-regra').textContent = novo ? 'Criar regra' : 'Salvar';
  document.getElementById('erro-regra').style.display = 'none';
  document.getElementById('rv-fx-resultado').innerHTML = '';

  document.getElementById('rv-nome').value = novo ? '' : rvEditando.nome;
  document.getElementById('rv-ativa').value = (novo || rvEditando.ativa) ? '1' : '0';
  document.getElementById('rv-quando').value = novo ? 'sempre' : (rvEditando.quando || 'sempre');
  document.getElementById('rv-descricao').value = novo ? '' : (rvEditando.descricao || '');
  document.getElementById('rv-formula').value = novo ? '' : rvEditando.formula;
  document.getElementById('rv-mensagem').value = novo ? '' : rvEditando.mensagem;

  // onde a mensagem aparece: o topo, ou um campo do objeto
  const campos = rvCamposDoObjeto();
  document.getElementById('rv-campo').innerHTML = '<option value="">Topo da ficha</option>' +
    campos.map(function (c) {
      const v = (c.pers ? 'pers:' : '') + c.coluna;
      return '<option value="' + htm(v) + '">No campo: ' + htm(c.rotulo) + '</option>';
    }).join('');
  document.getElementById('rv-campo').value = novo ? '' : (rvEditando.campo || '');

  // os botões das funções: as de regra em destaque
  const fns = ['IF', 'AND', 'OR', 'NOT', 'ISBLANK', 'ISNEW', 'ISCHANGED', 'PRIORVALUE',
               'ISPICKVAL', 'REGEX', 'CONTAINS', 'LEN', 'TODAY'];
  const DICA = { ISNEW: 'verdadeiro só na criação do registro',
                 ISCHANGED: 'o campo mudou nesta gravação',
                 PRIORVALUE: 'o valor de antes da gravação',
                 ISPICKVAL: 'compara um campo de lista com uma opção',
                 REGEX: 'o texto casa com a expressão regular' };
  document.getElementById('rv-fx-func').innerHTML = fns.map(function (f) {
    return '<button type="button"' + (DICA[f] ? ' class="novo" title="' + htm(DICA[f]) + '"' : '') +
           ' onclick="rvInserir(\'' + f + '()\', true)">' + f + '()</button>';
  }).join('');
  document.getElementById('rv-fx-campos').innerHTML =
    '<div class="fx-grupo">' + htm(rvRotuloDoObjeto()) + '</div>' +
    campos.map(function (c) {
      return '<div class="fx-item" onclick="rvInserir(' +
        JSON.stringify(c.rotulo).replace(/"/g, '&quot;') + ')">' +
        '<span>' + htm(c.rotulo) + '</span><span class="t">' + htm(c.tipo) + '</span></div>';
    }).join('') || '<div class="lay-vazio">nenhum campo neste objeto</div>';

  rvCarregarRegistrosDeTeste();
  abrir('modal-regra');
  document.getElementById('rv-nome').focus();
}

function rvInserir(texto, cru) {
  const el = document.getElementById('rv-formula');
  const trecho = cru ? texto : '{' + texto + '}';
  const ini = el.selectionStart == null ? el.value.length : el.selectionStart;
  const fim = el.selectionEnd == null ? el.value.length : el.selectionEnd;
  el.value = el.value.slice(0, ini) + trecho + el.value.slice(fim);
  el.focus();
  el.selectionStart = el.selectionEnd = ini + trecho.length;
}

/** Os registros para "Testar com": os 20 mais recentes do objeto, pelo
 *  código. Objeto sem coluna `codigo` fica só com a sintaxe. */
async function rvCarregarRegistrosDeTeste() {
  const sel = document.getElementById('rv-teste-registro');
  sel.innerHTML = '<option value="">— nenhum (só a sintaxe) —</option>';
  let q;
  if (ehObjetoPers(rvObjeto)) {
    // v1.768 — todos os objetos personalizados moram em registros_pers
    q = sb.from('registros_pers').select('id,codigo').eq('objeto', rvObjeto);
  } else {
    const tabela = (typeof HIST_TABELA !== 'undefined' && HIST_TABELA[rvObjeto]) || rvObjeto;
    q = sb.from(tabela).select('id,codigo');
  }
  const r = await q.order('codigo', { ascending: false }).limit(20);
  if (r.error || !r.data) return;
  sel.innerHTML += r.data.map(function (x) {
    return '<option value="' + htm(x.id) + '">' + htm(x.codigo || x.id) + '</option>';
  }).join('');
}

/** O botão Verificar: a sintaxe e, se um registro foi escolhido, a
 *  condição no banco contra ele (regra_validacao_testar). */
async function rvVerificar() {
  const alvo = document.getElementById('rv-fx-resultado');
  const txt = document.getElementById('rv-formula').value;
  const campos = rvCamposDoObjeto();
  // numa regra o exemplo tem "antes": o mesmo valor de agora
  const r = fxVerificar(txt, campos, { novo: false, antes: function () { return null; } });
  if (!r.ok) {
    alvo.innerHTML = '<div class="fx-erro"><span>✕</span><span>' + htm(r.erro) + '</span></div>';
    return false;
  }
  const arv = fxArvoreParaBanco(txt, rvRotuloParaColuna());
  if (!arv.ok) {
    alvo.innerHTML = '<div class="fx-erro"><span>✕</span><span>' + htm(arv.motivo) + '</span></div>';
    return false;
  }
  const reg = document.getElementById('rv-teste-registro');
  if (!reg.value) {
    alvo.innerHTML = '<div class="fx-ok"><span>✔</span><span>Sintaxe válida. Escolha um registro para ver se a regra barraria.</span></div>';
    return true;
  }
  const t = await sb.rpc('regra_validacao_testar',
    { p_objeto: rvObjeto, p_arvore: arv.arvore, p_registro: reg.value });
  const d = (t && !t.error && t.data) ? t.data : { ok: false, erro: (t && t.error) ? t.error.message : 'sem resposta' };
  const nome = reg.options[reg.selectedIndex].textContent;
  if (!d.ok) {
    alvo.innerHTML = '<div class="fx-erro"><span>✕</span><span>' + htm(d.erro || 'Não deu para testar.') + '</span></div>';
    return false;
  }
  alvo.innerHTML = d.verdadeiro
    ? '<div class="fx-erro"><span>⚠</span><span>Sintaxe válida — no <b>' + htm(nome) + '</b> a condição dá <b>verdadeiro</b>: esta regra barraria a gravação.</span></div>'
    : '<div class="fx-ok"><span>✔</span><span>Sintaxe válida — no <b>' + htm(nome) + '</b> a condição dá <b>falso</b>: a gravação passaria.</span></div>';
  return true;
}

async function rvSalvar() {
  const erro = document.getElementById('erro-regra');
  erro.style.display = 'none';
  const botao = document.getElementById('btn-regra');

  const nome = document.getElementById('rv-nome').value.trim();
  if (!nome) { mostrarErro(erro, 'A regra precisa de um nome.'); return; }
  const formula = document.getElementById('rv-formula').value.trim();
  if (!formula) { mostrarErro(erro, 'Escreva a condição de erro.'); return; }
  const mensagem = document.getElementById('rv-mensagem').value.trim();
  if (!mensagem) { mostrarErro(erro, 'Escreva a mensagem que a pessoa vai ler.'); return; }

  // a sintaxe e os campos — a mesma conferência do botão Verificar
  const r = fxVerificar(formula, rvCamposDoObjeto(), { novo: false, antes: function () { return null; } });
  if (!r.ok) { mostrarErro(erro, r.erro); return; }
  const arv = fxArvoreParaBanco(formula, rvRotuloParaColuna());
  if (!arv.ok) { mostrarErro(erro, arv.motivo); return; }

  const linha = {
    nome: nome,
    descricao: document.getElementById('rv-descricao').value.trim() || null,
    ativa: document.getElementById('rv-ativa').value === '1',
    quando: document.getElementById('rv-quando').value,
    formula: formula,
    arvore: arv.arvore,
    mensagem: mensagem,
    campo: document.getElementById('rv-campo').value || null
  };

  botao.disabled = true;
  try {
    let q;
    if (rvEditando) {
      q = await sb.from('regras_validacao').update(linha).eq('id', rvEditando.id);
    } else {
      linha.empresa_id = empresaAtual;
      linha.objeto = rvObjeto;
      linha.ordem = rvLista.length;
      q = await sb.from('regras_validacao').insert(linha);
    }
    if (q.error) {
      // o banco fala claro: coluna que não existe, condição que não dá
      // verdadeiro/falso, limite do plano, nome repetido
      const m = /regras_validacao_nome_unico/.test(q.error.message)
        ? 'Já existe uma regra com este nome em ' + rvRotuloDoObjeto() + '.'
        : q.error.message;
      mostrarErro(erro, m); return;
    }
    fechar('modal-regra');
    await rvCarregar();
  } catch (e) { mostrarErro(erro, e.message); }
  finally { botao.disabled = false; }
}

async function rvExcluir(id) {
  const r = rvLista.find(function (x) { return x.id === id; });
  if (!r) return;
  if (!(await dialogoPerguntar({ texto: 'Excluir a regra "' + r.nome + '"?\n\nA contagem de vezes que ela barrou vai junto.',
                                 ok: 'Excluir', perigo: true }))) return;
  const q = await sb.from('regras_validacao').delete().eq('id', id);
  if (q.error) { await dialogoAvisar(q.error.message); return; }
  await rvCarregar();
}

// ------------------------------------------------------------
// INICIALIZAÇÃO
// ------------------------------------------------------------
exigirLoginComPermissoes().then(s => {
  if (!s) return;
  if (!exigirPermissao('administracao')) return;
  iniciar();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-fundo').forEach(m => m.classList.remove('aberto'));
});


// ------------------------------------------------------------
// v1.500 — o LOGOTIPO DA EMPRESA saiu daqui: mora na Plataforma
// (botão Logotipo da lista de imobiliárias, só superadmin).
// ------------------------------------------------------------


// ============================================================
// GERENCIADOR DE OBJETOS — campos personalizados
//
// Equivalente ao Object Manager do Salesforce. Duas coisas que ele
// faz e eu copiei de propósito:
//
//   1. O NOME TÉCNICO é gerado do rótulo e nunca muda. Renomear
//      'Matrícula' para 'Nº da matrícula' não pode quebrar filtro
//      salvo, exportação nem integração.
//   2. O TIPO não muda depois de criado. Trocar 'data' por 'texto'
//      num campo com 4.000 registros preenchidos transformaria os
//      dados em lixo sem avisar ninguém.
// ============================================================

// TODA PARTE DO CRM QUE TEM ONDE GUARDAR CAMPO CRIADO — ou seja, cuja
// tabela tem a coluna `personalizados`. As quatro últimas entraram na
// v1.140, junto com a coluna. Se um objeto novo surgir, ele só entra
// aqui DEPOIS de ganhar a coluna e as views repassarem — senão o campo
// nasce no cadastro e não tem onde morar no registro.
//
// v1.776 — TODO OBJETO QUE GUARDA REGISTRO CADASTRADO PELA IMOBILIÁRIA
// entra aqui (pedido do Rodrigo, 05/10/2026; regra no CLAUDE.md). As
// abas saem agrupadas por área (`grupo`, na ordem de GRUPOS_OBJETOS):
// com mais de vinte numa fileira só, ninguém acharia. Ficam de fora só
// o que não é registro com campos — painéis, relatórios, conversas.
// Faltam (1.781): Propostas do lead e Orçamentos do caso.
//
// v1.777 — `aviso`: o que este objeto ainda NÃO tem no Gerenciador, dito
// em cima da lista de campos; `semRastro` tira a caixa Rastrear (a
// tabela não guarda histórico) e `semRegras` tira a aba das Regras de
// validação.
const GRUPOS_OBJETOS = [
  { g: 'pessoas', rotulo: 'Pessoas e atendimento' },
  { g: 'imoveis', rotulo: 'Imóveis e locação' },
  { g: 'dinheiro', rotulo: 'Dinheiro' },
  { g: 'propostas', rotulo: 'Propostas' },
  { g: 'gestao', rotulo: 'Gestão' }
];
const OBJETOS_PERS = [
  { obj: 'contatos',     rotulo: 'Contatos',     icone: icone('pessoa', 13), grupo: 'pessoas' },
  { obj: 'leads',        rotulo: 'Leads',        icone: icone('alvo', 13), grupo: 'pessoas' },
  { obj: 'tarefas',      rotulo: 'Tarefas',      icone: icone('prancheta', 13), grupo: 'pessoas' },
  { obj: 'casos',        rotulo: 'Casos',        icone: icone('chaveInglesa', 13), grupo: 'pessoas' },
  { obj: 'fichas',       rotulo: 'Fichas',         icone: icone('entrada', 13), grupo: 'pessoas' },
  { obj: 'imoveis',      rotulo: 'Imóveis',      icone: icone('casa', 13), grupo: 'imoveis' },
  { obj: 'contratos',    rotulo: 'Contratos',    icone: icone('documento', 13), grupo: 'imoveis' },
  { obj: 'competencias', rotulo: 'Aluguéis',     icone: icone('calendario', 13), grupo: 'imoveis' },
  { obj: 'sinistros',    rotulo: 'Sinistros',    icone: icone('aviso', 13), grupo: 'imoveis' },
  // v1.780 — a apólice (contrato_seguros). Os campos aparecem no fim das
  // janelas Cadastrar, Corrigir e Renovar apólice, na ficha do contrato.
  { obj: 'contrato_seguros', rotulo: 'Apólices', icone: icone('escudo', 13), grupo: 'imoveis',
    semRastro: true,
    aviso: 'Os campos que você criar aqui aparecem no fim das janelas Cadastrar, Corrigir e Renovar ' +
           'apólice, na ficha do contrato (a renovação leva os valores da apólice antiga). Regras de ' +
           'validação valem para cadastrar, corrigir e renovar — marcar a apólice como Cancelada no ' +
           'Encerrar contrato nunca é barrado. Quem vê e edita cada campo: Papéis › Apólices › ' +
           'Campos. Os campos do sistema das apólices ainda não se renomeiam por aqui, e o ' +
           'histórico de alterações não vale para elas.' },
  // v1.777 — o lançamento do Livro Caixa. Os campos aparecem na janela de
  // Entrada e Saída e na do registro; o que nasceu do contrato mostra só
  // para ler. Sem Regras de validação: a regra pegaria também o
  // lançamento que o contrato gera sozinho, e travaria o contrato.
  // v1.779 — as Regras passam a valer, só para o que a TELA grava direto
  // (o banco olha o endereço da chamada — regras_validacao_conferir)
  { obj: 'lancamentos',  rotulo: 'Financeiro',   icone: icone('carteira', 13), grupo: 'dinheiro',
    semRastro: true,
    aviso: 'Os campos que você criar aqui aparecem na janela de Entrada e Saída do Financeiro e na ' +
           'janela do lançamento (no que veio de contrato, só para ler). Regras de validação valem ' +
           'para o que se lança e edita na tela do Financeiro — não para o que o contrato, o Asaas ' +
           'ou o repasse geram sozinhos. Quem vê e edita cada campo: Papéis › Financeiro › Campos. ' +
           'Os campos do sistema do Financeiro ainda não se renomeiam por aqui, e o histórico de ' +
           'alterações não vale para lançamentos.' },
  // v1.778 — a comissão (os campos na janela dela e como colunas da lista)
  // e a parcela (como colunas da lista de Parcelas, editadas ali mesmo no
  // lápis: a parcela não tem janela de editar, e só se grava por função do
  // banco — comissao_parcela_gravar_campo). Sem Regras: a parcela nasce e
  // muda pelos gatilhos da comissão e do aluguel, e a regra travaria os dois.
  { obj: 'comissoes',    rotulo: 'Comissões',    icone: icone('moeda', 13), grupo: 'dinheiro',
    semRastro: true,
    aviso: 'Os campos que você criar aqui aparecem no fim da janela da comissão e como colunas ' +
           'da lista de Comissões. Regras de validação valem para o que se cria e edita na tela de ' +
           'Comissões — não para o que o contrato e os pagamentos mudam sozinhos. Quem vê e edita ' +
           'cada campo: Papéis › Comissões › Campos. Os campos do sistema das comissões ainda não ' +
           'se renomeiam por aqui, e o histórico de alterações não vale para comissões.' },
  { obj: 'comissao_parcelas', rotulo: 'Parcelas de comissão', icone: icone('recibo', 13), grupo: 'dinheiro',
    semRastro: true, semRegras: true,
    aviso: 'Os campos que você criar aqui aparecem como colunas da lista de Parcelas de comissão e ' +
           'se preenchem ali mesmo, no lápis da célula (a parcela não tem janela de editar). Quem ' +
           'edita é quem pode editar comissões; quem vê cada campo: Papéis › Parcelas de comissão › ' +
           'Campos. Os campos do sistema das parcelas ainda não se renomeiam por aqui, o histórico ' +
           'não vale para elas, e as Regras de validação não se aplicam (a parcela nasce e muda ' +
           'pelos gatilhos da comissão e do aluguel).' },
  { obj: 'planos',       rotulo: 'Planos de ação', icone: icone('pin', 13), grupo: 'gestao' },
  { obj: 'acoes',        rotulo: 'Ações — 5W2H',   icone: icone('checkQuadrado', 13), grupo: 'gestao' },
  { obj: 'objetivos',    rotulo: 'Objetivos',      icone: icone('bandeira', 13), grupo: 'gestao' },
  // v1.776 — o resultado-chave vive na janela da ficha do objetivo, e o
  // ciclo PDCA na ficha do plano: os campos aparecem no fim das duas janelas
  { obj: 'resultados',   rotulo: 'Resultados-chave', icone: icone('checkCirculo', 13), grupo: 'gestao' },
  { obj: 'indicadores',  rotulo: 'Indicadores',    icone: icone('linha', 13), grupo: 'gestao' },
  { obj: 'ciclos',       rotulo: 'Ciclos PDCA',    icone: icone('troca', 13), grupo: 'gestao' }
];

/**
 * v1.659 — AS LISTAS DO SISTEMA QUE A IMOBILIÁRIA PODE REESCREVER.
 *
 * Pedido do Rodrigo em 17/09/2026: "a alteração eu queria deixar caixa
 * alta pelo menos" — Rua, Avenida… viram RUA, AVENIDA, e entra LADEIRA.
 *
 * É uma lista FECHADA de propósito. Uma lista do sistema só entra aqui
 * quando nenhum valor dela é comparado por regra do programa (tela ou
 * banco), a coluna não tem CHECK e nada a monta na hora. Fora daqui:
 *   • `tag` (etapa, status, farol, alerta) — cor e regra por valor;
 *   • códigos (chave Pix do Asaas, base da comissão, 1º mês, unidade
 *     do indicador) — o programa lê o valor;
 *   • listas com CHECK no banco (estado civil, tipo e categoria do
 *     imóvel, tipo do imóvel do lead, origem, tipo e status da tarefa)
 *     — o banco recusaria o valor novo; e a RPC recusa antes;
 *   • garantia, índice de reajuste, tipo do lead, tipo/subtipo/quem
 *     paga/forma de pagamento do caso — regras de seguro, reajuste,
 *     funil e repasse comparam esses textos.
 * Liberar outra lista = uma linha aqui, depois de conferir os três
 * pontos. O banco confere o CHECK de novo, sempre.
 *
 * v1.775 — `tarefas.tipo` entrou, mas no modo que SÓ CRESCE
 * (LISTAS_SO_CRESCEM, permissoes.js): os 5 do sistema ficam, e a
 * imobiliária acrescenta os dela. O CHECK saiu no v1775-sql-1 e no lugar
 * ficou um gatilho que aceita os do sistema mais a lista da imobiliária.
 */
const LISTAS_LIVRES = {
  'contatos.tipo_logradouro': 1,
  'imoveis.tipo_logradouro': 1,
  'casos.solicitante_papel': 1,
  'casos.quem_abre': 1,
  'planos.area': 1,
  'tarefas.tipo': 1
};

/** A lista deste campo do sistema aceita lista própria da imobiliária? */
function opcoesDoSistemaEditaveis(f) {
  if (!f) return { lista: false, pode: false, motivo: null };
  if (f.t === 'tag') return { lista: true, pode: false,
    motivo: 'as opções desta lista movem regras do sistema (cores, etapas, alertas)' };
  if (f.t !== 'escolha' || !Array.isArray(f.opcoes)) return { lista: false, pode: false, motivo: null };
  if (!LISTAS_LIVRES[objetoAtual + '.' + f.c]) return { lista: true, pode: false,
    motivo: 'os valores desta lista são usados em regras do programa ou travados no banco' };
  return { lista: true, pode: true, motivo: null };
}

/** A lista própria da imobiliária (vazia = vale a do sistema). */
function listaPropria(f) {
  if (!Array.isArray(f.opSistema)) return [];
  // v1.775 — na lista que só cresce, a própria é o que vem depois das do sistema
  if (listaSoCresce(objetoAtual, f.c)) return semAsDoSistema(f.opcoes, f.opSistema);
  const sis = f.opSistema.join('\n'), atual = (f.opcoes || []).join('\n');
  return sis === atual ? [] : (f.opcoes || []).slice();
}

let objetoAtual = 'contatos';

// ============================================================
// v1.765 — OBJETOS PERSONALIZADOS (mockup aprovado em 04/10/2026,
// Outros/Mockup-Objetos-Personalizados)
//
// A imobiliária cria o próprio objeto ("Chaves"). A definição mora em
// `objetos_pers`; os campos, em `campos_personalizados` com objeto =
// 'p_<plural>'; os registros, em `registros_pers` (uma tabela só para
// todos, valores no jsonb `personalizados` — o modelo do Salesforce).
// Quem cria, edita e exclui é o banco (objeto_pers_criar/_salvar/_excluir);
// a tabela é só leitura pela API. A chave 'p_…' é o "objeto" do posso().
// ============================================================
let objetosPers = [];

/** Os objetos personalizados da imobiliária em foco. Sem o sql-1 da
 *  v1.765 rodado, a consulta falha e a tela segue como antes. */
async function carregarObjetosPers() {
  const { data, error } = await sb.from('objetos_pers').select('*')
    .eq('empresa_id', empresaAtual).order('plural');
  objetosPers = error ? [] : (data || []);
  // v1.767 — os objetos ativos viram abas do editor de Layout das fichas
  // (no fim da lista fixa, só na memória desta página)
  for (let i = OBJETOS_LAYOUT.length - 1; i >= 0; i--) if (OBJETOS_LAYOUT[i].pers) OBJETOS_LAYOUT.splice(i, 1);
  if (podeCriarObjeto()) objetosPers.filter(o => o.ativo).forEach(o => OBJETOS_LAYOUT.push(
    { alvo: o.chave, plural: o.chave, rotulo: o.singular, icone: icone(o.icone, 13), pers: true }));
}
function objetoPers(chave) { return objetosPers.find(o => o.chave === chave) || null; }
function ehObjetoPers(chave) { return /^p_/.test(String(chave || '')); }
/** O botão "+ Novo objeto" aparece quando o plano tem o módulo (o
 *  superadmin passa, como no banco). Quem recusa de verdade é o banco. */
function podeCriarObjeto() {
  return typeof moduloLigado === 'function' ? moduloLigado('objetos') : true;
}
/** O nome de qualquer objeto, do sistema ou personalizado. */
function rotuloDoObjeto(obj) {
  const s = OBJETOS_PERS.find(x => x.obj === obj);
  if (s) return s.rotulo;
  const op = objetoPers(obj);
  return op ? op.plural : obj;
}
/** As linhas da matriz de Papéis: as do sistema que o plano tem e, se o
 *  módulo estiver no plano, uma por objeto personalizado. */
function objetosDaMatriz() {
  const sistema = OBJETOS.filter(([o]) => objetoNoPlanoDaEmpresaEmFoco(o)).map(([o, r]) => [o, r, false]);
  if (!podeCriarObjeto()) return sistema;
  return sistema.concat(objetosPers.map(op => [op.chave, op.plural, true]));
}
function rotuloDaMatriz(objeto) {
  const s = OBJETOS.find(([o]) => o === objeto) || OBJETOS_SO_CAMPOS.find(([o]) => o === objeto);   // v1.779
  if (s) return s[1];
  const op = objetoPers(objeto);
  return op ? op.plural : objeto;
}
/** Os campos que todo objeto personalizado já tem (não se excluem). */
function camposDoSistemaPers(o) {
  return [
    { c: 'codigo', r: 'Código', t: 'auto', fixo: true },
    { c: 'nome', r: o.titulo_rotulo, t: o.titulo_modo === 'codigo' ? 'auto' : 'texto', titulo: true },
    { c: 'proprietario_id', r: 'Proprietário do registro', t: 'usuario' }
  ];
}

// O que o ícone do objeto pode ser: desenhos de contorno do próprio CRM
// (ICO_TRACOS, base.js). Sem cor, para a tela continuar igual às outras.
const ICONES_DE_OBJETO = ['chave', 'bandeira', 'predio', 'malaTrabalho', 'crachaId', 'papelCaneta',
  'carteira', 'relogio', 'estrela', 'chaveInglesa', 'pin', 'clipe', 'calendario', 'moeda', 'escudo',
  'checkQuadrado', 'entrada', 'linha', 'pasta', 'imagem'];

let objetoEditando = null;
let iconeDoObjeto = 'chave';

function abrirObjeto(id) {
  objetoEditando = id ? objetosPers.find(o => o.id === id) || null : null;
  const o = objetoEditando || {};
  const novo = !objetoEditando;
  const emp = empresas.find(e => e.id === empresaAtual);
  const nomeEmp = emp ? (emp.nome_fantasia || emp.razao_social) : 'esta imobiliária';
  document.getElementById('titulo-objeto').textContent = novo ? 'Novo objeto personalizado' : 'Editar objeto';
  document.getElementById('btn-objeto').textContent = novo ? 'Criar objeto' : 'Salvar';
  document.getElementById('ob-aviso').innerHTML = novo
    ? 'Este objeto vai existir só para <b>' + htm(nomeEmp) + '</b>. Ele nasce visível apenas para o papel '
      + '<b>Administrador</b>; os outros papéis passam a vê-lo quando você liberar em Papéis e permissões.'
    : 'O prefixo do código e "o título é" não mudam depois de criado.';
  document.getElementById('erro-objeto').style.display = 'none';
  document.getElementById('ob-singular').value = o.singular || '';
  document.getElementById('ob-plural').value = o.plural || '';
  document.getElementById('ob-prefixo').value = o.prefixo || '';
  document.getElementById('ob-prefixo').disabled = !novo;
  document.getElementById('ob-feminino').value = (novo || o.feminino) ? '1' : '0';
  document.getElementById('ob-titulo-rotulo').value = o.titulo_rotulo || '';
  document.getElementById('ob-titulo-modo').value = o.titulo_modo || 'digitado';
  document.getElementById('ob-titulo-modo').disabled = !novo;
  document.getElementById('ob-descricao').value = o.descricao || '';
  document.getElementById('ob-no-menu').checked = novo ? true : !!o.no_menu;
  document.getElementById('ob-tarefas').checked = novo ? true : !!o.com_tarefas;
  document.getElementById('ob-arquivos').checked = novo ? true : !!o.com_arquivos;
  document.getElementById('ob-kanban').checked = !!o.com_kanban;
  // o kanban precisa de um campo "Lista de opções" do próprio objeto: no
  // objeto que ainda vai nascer não há campo nenhum
  const listas = novo ? [] : camposDoObjeto.filter(c => c.tipo === 'escolha');
  document.getElementById('ob-kanban').disabled = !listas.length;
  document.getElementById('ob-kanban-nota').textContent = listas.length
    ? 'As colunas do kanban são as opções do campo escolhido abaixo.'
    : (novo ? 'Exige um campo do tipo Lista de opções. Dá para ligar depois de criar os campos.'
            : 'Crie antes um campo do tipo Lista de opções neste objeto.');
  document.getElementById('ob-kanban-campo').innerHTML = listas.map(c =>
    '<option value="' + htm(c.chave) + '"' + (c.chave === o.kanban_campo ? ' selected' : '') + '>'
    + htm(c.rotulo) + '</option>').join('');
  iconeDoObjeto = o.icone || 'chave';
  pintarIconesDoObjeto();
  pintarKanbanObjeto();
  previaCodigoObjeto();
  abrir('modal-objeto');
}

function pintarIconesDoObjeto() {
  document.getElementById('ob-icones').innerHTML = ICONES_DE_OBJETO.map(n =>
    '<button type="button" class="' + (n === iconeDoObjeto ? 'on' : '') + '" title="' + n + '"'
    + ' onclick="escolherIconeDoObjeto(\'' + n + '\')">' + icone(n, 18) + '</button>').join('');
}
function escolherIconeDoObjeto(n) { iconeDoObjeto = n; pintarIconesDoObjeto(); }
function pintarKanbanObjeto() {
  const liga = document.getElementById('ob-kanban').checked && !document.getElementById('ob-kanban').disabled;
  document.getElementById('ob-bloco-kanban').style.display = liga ? '' : 'none';
}
function previaCodigoObjeto() {
  const el = document.getElementById('ob-previa-cod');
  const p = String(document.getElementById('ob-prefixo').value || '').toUpperCase()
    .normalize('NFD').replace(/[^A-Z]/g, '').slice(0, 4);
  if (document.getElementById('ob-prefixo').value !== p) document.getElementById('ob-prefixo').value = p;
  el.innerHTML = p.length >= 2
    ? (objetoEditando ? 'Os registros são numerados ' : 'O primeiro registro será ') + '<b>' + htm(p) + '-0001</b>. Não muda depois.'
    : 'De 2 a 4 letras, sem acento.';
}

async function salvarObjeto() {
  const erro = document.getElementById('erro-objeto');
  erro.style.display = 'none';
  const singular = document.getElementById('ob-singular').value.trim();
  const plural = document.getElementById('ob-plural').value.trim();
  const prefixo = document.getElementById('ob-prefixo').value.trim();
  if (singular.length < 2 || plural.length < 2) { mostrarErro(erro, 'Dê o nome do objeto no singular e no plural.'); return; }
  if (!objetoEditando && !/^[A-Z]{2,4}$/.test(prefixo)) { mostrarErro(erro, 'O prefixo do código tem de 2 a 4 letras, sem acento.'); return; }
  const kanban = document.getElementById('ob-kanban').checked && !document.getElementById('ob-kanban').disabled;
  const dados = {
    singular: singular, plural: plural, prefixo: prefixo,
    feminino: document.getElementById('ob-feminino').value === '1',
    icone: iconeDoObjeto,
    titulo_rotulo: document.getElementById('ob-titulo-rotulo').value.trim() || 'Nome',
    titulo_modo: document.getElementById('ob-titulo-modo').value,
    descricao: document.getElementById('ob-descricao').value.trim(),
    no_menu: document.getElementById('ob-no-menu').checked,
    com_tarefas: document.getElementById('ob-tarefas').checked,
    com_arquivos: document.getElementById('ob-arquivos').checked,
    com_kanban: kanban,
    kanban_campo: kanban ? document.getElementById('ob-kanban-campo').value : null
  };
  const botao = document.getElementById('btn-objeto');
  botao.disabled = true;
  try {
    const r = objetoEditando
      ? await sb.rpc('objeto_pers_salvar', { p_id: objetoEditando.id, p: dados })
      : await sb.rpc('objeto_pers_criar', { p: dados });
    if (r.error) throw r.error;
    fechar('modal-objeto');
    await carregarObjetosPers();
    if (!objetoEditando && r.data && r.data.chave) objetoAtual = r.data.chave;
    await carregarObjetos();
  } catch (e) { mostrarErro(erro, e.message); }
  finally { botao.disabled = false; }
}

async function alternarObjetoAtivo(id) {
  const o = objetosPers.find(x => x.id === id);
  if (!o) return;
  if (o.ativo && !(await dialogoPerguntar({ texto: 'Desativar ' + o.plural + '?\n\n'
      + 'O objeto some do menu e não aceita registros novos nem alterações. Nada é apagado: '
      + 'os registros, os campos e as permissões continuam guardados, e dá para ativar de novo.',
      ok: 'Desativar' }))) return;
  const r = await sb.rpc('objeto_pers_salvar', { p_id: id, p: { ativo: !o.ativo } });
  if (r.error) { await dialogoAvisar(r.error.message); return; }
  await carregarObjetosPers();
  await carregarObjetos();
}

async function excluirObjeto(id) {
  const o = objetosPers.find(x => x.id === id);
  if (!o) return;
  if (!(await dialogoPerguntar({ texto: 'Excluir o objeto ' + o.plural + '?\n\n'
      + 'Só dá para excluir objeto sem nenhum registro. Saem junto os campos, as permissões dos papéis, '
      + 'o layout e as listas salvas dele. Não tem volta.', ok: 'Excluir', perigo: true }))) return;
  const r = await sb.rpc('objeto_pers_excluir', { p_id: id });
  if (r.error) { await dialogoAvisar(r.error.message); return; }
  objetoAtual = 'contatos';
  await carregarObjetosPers();
  await carregarObjetos();
}

/** A faixa do objeto personalizado aberto no Gerenciador. */
/**
 * v1.781 — O AVISO DO OBJETO DO SISTEMA (`aviso` no OBJETOS_PERS): a 1ª
 * frase em cinza, acima da tabela, e o resto num "mais" (dobraHtml, no
 * base.js). Antes era uma caixa amarela no meio da tabela de campos.
 */
function notaDoObjeto() {
  const o = OBJETOS_PERS.find(function (x) { return x.obj === objetoAtual; });
  if (!o || !o.aviso) return '';
  const i = o.aviso.indexOf('. ');
  const frase = i > 0 ? o.aviso.slice(0, i + 1) : o.aviso;
  const resto = i > 0 ? o.aviso.slice(i + 2) : '';
  return '<div class="nota-objeto">ⓘ ' + htm(frase)
    + (resto && typeof dobraHtml === 'function' ? ' ' + dobraHtml('mais', htm(resto)) : (resto ? ' ' + htm(resto) : ''))
    + '</div>';
}

function desenharFaixaObjeto(nRegistros) {
  const el = document.getElementById('obj-faixa');
  if (!el) return;
  const o = objetoPers(objetoAtual);
  if (!o) { el.innerHTML = notaDoObjeto(); return; }   // v1.781
  const b = 'class="btn btn-claro" style="padding:6px 12px;font-size:13px" data-perm="administracao:editar"';
  el.innerHTML =
    '<div class="op-faixa">' +
      '<div class="op-ico">' + icone(o.icone, 22) + '</div>' +
      '<div class="op-texto">' +
        '<div class="op-nome">' + htm(o.plural) + ' <span class="tag tag-azul">personalizado</span>' +
          (o.ativo ? '' : ' <span class="tag tag-cinza">desativado</span>') + '</div>' +
        '<div class="op-sub">' + htm(o.singular) + ' · código <b>' + htm(o.prefixo) + '-0001</b>' +
          (o.descricao ? ' · ' + htm(o.descricao) : '') + '</div>' +
      '</div>' +
      '<div class="op-kpis">' +
        '<div>Registros<b>' + (nRegistros == null ? '—' : nRegistros) + '</b></div>' +
        '<div>Campos<b>' + camposDoObjeto.length + '</b></div>' +
        '<div>No menu<b>' + (o.no_menu ? 'sim' : 'não') + '</b></div>' +
      '</div>' +
      '<div class="op-acoes">' +
        '<button ' + b + ' onclick="abrirObjeto(\'' + o.id + '\')">Editar objeto</button>' +
        '<button ' + b + ' onclick="alternarObjetoAtivo(\'' + o.id + '\')">' + (o.ativo ? 'Desativar' : 'Ativar') + '</button>' +
        '<button ' + b.replace('font-size:13px', 'font-size:13px;color:var(--erro)') +
          ' onclick="excluirObjeto(\'' + o.id + '\')">' + icone('lixeira', 13) + ' Excluir</button>' +
      '</div>' +
    '</div>' +
    '<div class="op-atalhos">' +
      // v1.767 — o layout da ficha deste objeto, no editor de sempre
      '<a href="#" onclick="verAba(\'layout\');verLayoutDe(\'' + o.chave + '\');return false">' +
        icone('prancheta', 13) + ' Layout da ficha</a>' +
      '<a href="#" onclick="verAba(\'papeis\');return false">' + icone('cadeado', 13) + ' Quem pode ver e editar</a>' +
    '</div>';
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

let camposDoObjeto = [];
let camposNaLixeira = [];
let limitesDoPlano = null;
/** v1.313 — os campos DESTE objeto que guardam histórico de alteração */
let rastreados = [];

async function carregarObjetos() {
  const abas = document.getElementById('obj-abas');
  if (!abas) return;
  // v1.765 — objeto personalizado que sumiu (excluído) devolve a Contatos
  if (ehObjetoPers(objetoAtual) && !objetoPers(objetoAtual)) objetoAtual = 'contatos';
  // v1.776 — no alto, o "Criar objeto novo" em destaque (mockup
  // Outros/Mockup-Todos-os-Objetos, opção A); depois uma fileira por área
  // e, por último, os objetos da imobiliária
  const criar = podeCriarObjeto();
  const aba = function (o) {
    return '<button class="obj-aba' + (o.obj === objetoAtual ? ' on' : '') + '"' +
           ' onclick="verObjeto(\'' + o.obj + '\')">' + o.icone + ' ' + o.rotulo + '</button>';
  };
  const linha = function (rotulo, botoes) {
    return '<div class="obj-grupo"><span class="obj-grupo-nome">' + rotulo + '</span>' +
           '<div class="obj-abas">' + botoes + '</div></div>';
  };
  let h = '<div class="obj-topo"><div><b>Objetos do CRM</b>' +
          '<span>Escolha um objeto para criar campos, renomear os do sistema e editar listas.</span></div>' +
          (criar ? '<button class="obj-criar" data-perm="administracao:editar" onclick="abrirObjeto(null)">' +
                   '＋ Criar objeto novo</button>' : '') + '</div>';
  h += GRUPOS_OBJETOS.map(function (g) {
    const dele = OBJETOS_PERS.filter(function (o) { return o.grupo === g.g; });
    return dele.length ? linha(htm(g.rotulo), dele.map(aba).join('')) : '';
  }).join('');
  // v1.765 — os objetos personalizados
  if (objetosPers.length) h += linha('Objetos da imobiliária', objetosPers.map(function (o) {
    return '<button class="obj-aba pers' + (o.chave === objetoAtual ? ' on' : '') + '"' +
           ' onclick="verObjeto(\'' + o.chave + '\')">' + icone(o.icone, 13) + ' ' + htm(o.plural) +
           (o.ativo ? '' : ' <span class="obj-inativo">desativado</span>') + '</button>';
  }).join(''));
  abas.classList.add('obj-agrupado');
  abas.innerHTML = h;
  await carregarCamposDoObjeto();
}

function verObjeto(obj) { objetoAtual = obj; carregarObjetos(); }

async function carregarCamposDoObjeto() {
  const r = await Promise.all([
    sb.from('campos_personalizados').select('*')
      .eq('empresa_id', empresaAtual).eq('objeto', objetoAtual)
      .is('excluido_em', null).order('ordem'),
    sb.from('campos_personalizados').select('*')
      .eq('empresa_id', empresaAtual).eq('objeto', objetoAtual)
      .not('excluido_em', 'is', null).order('excluido_em', { ascending: false }),
    sb.rpc('limites_de_campos', { p_empresa: empresaAtual, p_objeto: objetoAtual }),
    // v1.313 — quais campos deste objeto guardam histórico de alteração
    sb.from('historico_campos').select('id,campo')
      .eq('empresa_id', empresaAtual).eq('objeto', tabelaDoObjetoAtual()),
    sb.rpc('limites_do_plano', { p_empresa: empresaAtual }),
    // v1.765 — quantos registros tem o objeto personalizado aberto
    ehObjetoPers(objetoAtual)
      ? sb.from('registros_pers').select('id', { count: 'exact', head: true }).eq('objeto', objetoAtual)
      : Promise.resolve(null)
  ]);
  camposDoObjeto  = r[0].data || [];
  camposNaLixeira = r[1].data || [];
  limitesDoPlano  = (r[2].data && r[2].data[0]) || null;
  rastreados      = r[3].data || [];
  limitesDaEmpresa = r[4].data || limitesDaEmpresa;

  desenharFaixaObjeto(r[5] && !r[5].error ? r[5].count : null);
  desenharPlano();
  desenharCampos();
  desenharLixeira();
}

function desenharPlano() {
  const el = document.getElementById('obj-plano');
  if (!el) return;
  const n = camposDoObjeto.length;
  const lim = limitesDoPlano && limitesDoPlano.limite_objeto;
  const cheio = lim !== null && lim !== undefined && n >= lim;
  // v1.313 — o contador do rastreamento, ao lado do de campos
  const limR = tetoDoPlano('max_campos_rastreados');
  const nR = rastreados.length;
  const cheioR = limR !== null && limR !== undefined && nR >= limR;

  el.innerHTML =
    '<span class="obj-contador' + (cheio ? ' cheio' : '') + '">' +
      n + ' ' + (lim == null ? 'campo(s) personalizado(s) · plano sem limite'
                            : 'de ' + lim + ' campos do plano') + '</span>' +
    '<span class="obj-contador' + (cheioR ? ' cheio' : '') + '">' +
      (limR == null ? 'rastreando ' + nR + ' campo(s) · plano sem limite'
                    : 'rastreando ' + nR + ' de ' + limR + ' campos do plano') + '</span>' +
    '<button class="btn" style="padding:6px 14px;font-size:13px" data-perm="administracao:editar"' +
    ' onclick="abrirCampo()"' + (cheio ? ' disabled title="Limite do plano atingido"' : '') + '>' +
    '+ Novo campo</button>';
  const c = document.getElementById('cnt-objetos');
  if (c) c.textContent = '(' + ((limitesDoPlano && limitesDoPlano.usados_total) || 0) + ' campos no total)';
}

/**
 * v1.313 — A CAIXA DE RASTREAR, uma por campo.
 *
 * Vale para campo do sistema e para personalizado: quem decide o que
 * merece histórico é a operação, não a origem do campo. A caixa nasce
 * desligada em tudo (decisão do Rodrigo, 19/08/2026) — o histórico de
 * ALTERAÇÃO só grava o que estiver marcado aqui. Inclusão e exclusão
 * do registro continuam sempre gravadas, marcado ou não.
 *
 * A caixa que estouraria o limite vem desligada COM O MOTIVO no
 * passar do mouse, e não some: some parece defeito.
 */
/**
 * A TABELA, não o objeto.
 *
 * O gatilho do banco pergunta pelo nome da TABELA em que ele disparou
 * (`contrato_sinistros`, `planos_acao`, `plano_acoes`), e a tela de
 * objetos trabalha com o nome do OBJETO (`sinistros`, `planos`,
 * `acoes`). Gravar o nome errado não daria erro nenhum: a caixa
 * marcaria, o banco guardaria, e o histórico continuaria mudo naqueles
 * três. O mapa que traduz já existe desde a v1.126 e é o mesmo que o
 * cartão da ficha usa — `HIST_TABELA`, no base.js.
 */
function tabelaDoObjetoAtual() {
  return (typeof HIST_TABELA !== 'undefined' && HIST_TABELA[objetoAtual]) || objetoAtual;
}

function caixaDeRastrear(campo) {
  // v1.777 — objeto cuja tabela não guarda histórico: a caixa não promete
  const sem = OBJETOS_PERS.find(function (o) { return o.obj === objetoAtual && o.semRastro; });
  if (sem) return '<td class="rastro"><input type="checkbox" disabled title="Este objeto não guarda histórico de alterações"></td>';
  const ligado = rastreados.some(function (r) { return r.campo === campo; });
  const lim = tetoDoPlano('max_campos_rastreados');
  const cheio = !ligado && lim !== null && lim !== undefined && rastreados.length >= lim;
  return '<td class="rastro"><input type="checkbox" data-perm="administracao:editar"'
    + (ligado ? ' checked' : '') + (cheio ? ' disabled' : '')
    + (cheio ? ' title="Limite do plano atingido — desmarque um campo para liberar"' : '')
    + ' onchange="marcarRastreado(this, \'' + htm(campo) + '\')"></td>';
}

/** Liga e desliga o rastreamento de um campo. Quem recusa por limite é
 *  o banco (`rastreado_respeita_o_plano`); a tela devolve a caixa ao
 *  lugar e mostra o motivo. */
async function marcarRastreado(caixa, campo) {
  const ligar = caixa.checked;
  caixa.disabled = true;

  const tabela = tabelaDoObjetoAtual();
  const r = ligar
    ? await sb.from('historico_campos')
        .insert({ empresa_id: empresaAtual, objeto: tabela, campo: campo })
    : await sb.from('historico_campos').delete()
        .eq('empresa_id', empresaAtual).eq('objeto', tabela).eq('campo', campo);

  caixa.disabled = false;
  if (r.error) {
    caixa.checked = !ligar;               // a caixa não mente sobre o banco
    await dialogoAvisar(r.error.message);
    return;
  }
  await carregarCamposDoObjeto();          // redesenha o contador e as travas
}

function desenharCampos() {
  const cat = (typeof CATALOGO !== 'undefined' && CATALOGO[objetoAtual]) || null;
  // v1.658 — `persChave` é o personalizado com fórmula calculada no
  // banco (pers vazio de propósito, v1.197): ele já está na lista de
  // cima, vindo do banco, e aparecia de novo aqui como "do sistema".
  // v1.765 — objeto personalizado não tem catálogo: os campos dele que
  // são "do sistema" são os três que todo objeto personalizado tem
  const op = objetoPers(objetoAtual);
  const fabrica = op ? camposDoSistemaPers(op)
    : (cat ? cat.campos.filter(function (f) { return !f.pers && !f.persChave; }) : []);

  // v1.658 — CAMPO DO SISTEMA TAMBÉM SE EDITA: só o nome. O nome técnico
  // e o tipo são do programa, e excluir não existe. Quem foi renomeado
  // mostra embaixo o nome do sistema, para ninguém perder a referência.
  const linhasFabrica = fabrica.map(function (f) {
    const renomeado = Object.prototype.hasOwnProperty.call(f, 'rSistema') && f.rSistema !== f.r;
    // v1.765 — o código não muda, então não há o que rastrear nele; o
    // título de objeto personalizado se renomeia em "Editar objeto"
    const rastro = f.fixo ? '<td class="rastro"><input type="checkbox" disabled title="O código não muda"></td>'
                          : caixaDeRastrear(f.c);
    const editar = op
      ? (f.titulo ? '<button class="btn btn-claro" style="padding:4px 10px;font-size:12px" data-perm="administracao:editar"' +
                    ' onclick="abrirObjeto(\'' + op.id + '\')">Editar</button>' : '—')
      : '<button class="btn btn-claro" style="padding:4px 10px;font-size:12px" data-perm="administracao:editar"' +
        ' onclick="abrirCampoDoSistema(\'' + jsq(f.c) + '\')">Editar</button>';   // v1.773 — jsq no onclick
    return '<tr class="campo-fabrica">' + rastro + '<td>' + htm(f.r) +
           (renomeado ? '<div style="font-size:12px;color:var(--texto-suave)">nome do sistema: '
                        + htm(f.rSistema) + '</div>' : '') + '</td>' +
           '<td><code>' + htm(f.c) + '</code></td>' +
           '<td>' + htm(rotuloTipoCat(f.t)) + '</td>' +
           // v1.659 — a lista própria da imobiliária, quando há
           '<td><span class="tag tag-cinza">do sistema</span>' +
           (f.titulo ? ' <span class="tag tag-verde">título</span>' : '') +
           (listaPropria(f).length
             ? ' <span class="tag tag-azul">lista sua · ' + listaPropria(f).length + ' opç' +
               (listaPropria(f).length === 1 ? 'ão' : 'ões') + '</span>' : '') +
           '</td><td>—</td>' +
           '<td style="white-space:nowrap">' + editar + '</td></tr>';
  }).join('');

  const linhasPers = camposDoObjeto.map(function (c) {
    const regras = [];
    if (c.obrigatorio) regras.push('<span class="tag tag-amarela">obrigatório</span>');
    if (c.unico) regras.push('<span class="tag tag-azul">sem repetição</span>');
    if (c.opcoes && c.opcoes.length) regras.push('<span class="tag tag-cinza">' + c.opcoes.length + ' opções</span>');
    // v1.765 — a relação: o cartão do outro lado e o que acontece ao excluir
    if (c.tipo === 'relacao' && c.rel_cartao)
      regras.push('<span class="tag tag-azul">cartão em ' + htm(rotuloDoObjeto(c.rel_objeto)) + '</span>');
    if (c.tipo === 'relacao')
      regras.push('<span class="tag tag-cinza">' + (c.rel_ao_excluir === 'soltar' ? 'solta ao excluir' : 'impede excluir') + '</span>');
    return '<tr>' + caixaDeRastrear(c.chave)
      + '<td><b style="color:var(--azul)">' + htm(c.rotulo) + '</b>' +
      (c.ajuda ? '<div style="font-size:12px;color:var(--texto-suave)">' + htm(c.ajuda) + '</div>' : '') +
      '</td><td><code>' + htm(c.chave) + '</code></td>' +
      '<td>' + (c.tipo === 'relacao' ? 'Relação → ' + htm(rotuloDoObjeto(c.rel_objeto)) : htm(rotuloTipoPers(c.tipo))) + '</td>' +
      '<td>' + (regras.join(' ') || '—') + '</td>' +
      '<td>' + (c.na_lista ? 'sim' : 'não') + '</td>' +
      '<td style="white-space:nowrap">' +
      '<button class="btn btn-claro" style="padding:4px 10px;font-size:12px" data-perm="administracao:editar"' +
      ' onclick="abrirCampo(\'' + c.id + '\')">Editar</button> ' +
      '<button class="btn btn-claro" style="padding:4px 10px;font-size:12px;color:var(--erro)" data-perm="administracao:editar"' +
      ' onclick="excluirCampo(\'' + c.id + '\')">Excluir</button></td></tr>';
  }).join('');

  // v1.777 — sem campo do sistema no catálogo, a faixa deles não aparece.
  // v1.781 — o aviso do objeto saiu daqui: é uma frase acima da tabela
  // (notaDoObjeto, na faixa do objeto)
  document.getElementById('linhas-campos').innerHTML =
    (linhasPers || '<tr><td colspan="7" class="vazio">Nenhum campo personalizado neste objeto ainda.</td></tr>')
    + (linhasFabrica ? '<tr class="sep-fabrica"><td colspan="7">Campos do sistema — o nome que aparece nas telas pode ser trocado; '
    + 'o nome técnico e o tipo são do programa, e o campo não pode ser excluído</td></tr>'
    + linhasFabrica : '');

  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

function desenharLixeira() {
  const el = document.getElementById('obj-lixeira');
  if (!el) return;
  if (!camposNaLixeira.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<h3 style="font-size:14px;color:var(--texto-suave);margin-bottom:10px">' +
    'Lixeira — os dados continuam guardados até a data indicada</h3>' +
    camposNaLixeira.map(function (c) {
      return '<div class="obj-lixo"><span><b>' + htm(c.rotulo) + '</b> <code>' + htm(c.chave) + '</code>' +
        ' · some em ' + dataBr(String(c.expurgo_em).slice(0, 10)) + '</span>' +
        '<button class="btn btn-claro" style="padding:4px 10px;font-size:12px" data-perm="administracao:editar"' +
        ' onclick="restaurarCampo(\'' + c.id + '\')">Restaurar</button></div>';
    }).join('');
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

function rotuloTipoPers(t) {
  const lista = (typeof TIPOS_PERS_ROTULO !== 'undefined' ? TIPOS_PERS_ROTULO : []);
  const e = lista.find(function (x) { return x[0] === t; });
  return e ? e[1] : t;
}
/**
 * Os tipos do DEFS não são os mesmos do CATALOGO: lá é `escolha`, aqui
 * é `select`; lá `telefone`, aqui `tel`. Sem esta tradução o editor
 * mostraria "select" e "textarea" crus embaixo do nome do campo.
 */
function rotuloTipoFicha(t) {
  return ({ texto: 'Texto', textarea: 'Texto longo', numero: 'Número',
            moeda: 'Moeda', percentual: 'Percentual', data: 'Data',
            datahora: 'Data e hora', select: 'Lista de opções',
            check: 'Sim / Não', email: 'E-mail', tel: 'Telefone',
            doc: 'CPF / CNPJ', cep: 'CEP', uf: 'Estado (UF)',
            ref: 'Vínculo', refimovel: 'Vínculo com imóvel' })[t]
         || rotuloTipoCat(t);
}

function rotuloTipoCat(t) {
  return ({ texto: 'Texto', numero: 'Número', moeda: 'Moeda', data: 'Data', datahora: 'Data e hora',
            escolha: 'Lista de opções', tag: 'Lista de opções', telefone: 'Telefone', doc: 'CPF / CNPJ',
            email: 'E-mail', ref: 'Vínculo', dias: 'Dias', sim_nao: 'Sim / Não',
            // v1.765 — os do sistema dos objetos personalizados
            auto: 'Numeração automática', usuario: 'Usuário' })[t] || t;
}

let campoEditando = null;
/** v1.658 — o campo DO SISTEMA aberto na janela (só o nome se edita) */
let campoDoSistema = null;

function abrirCampo(id) {
  campoEditando = id ? camposDoObjeto.find(function (c) { return c.id === id; }) : null;
  campoDoSistema = null;
  modoCampoDoSistema(false);
  const novo = !campoEditando;

  // v1.194 — FÓRMULA É UM TIPO, como no Salesforce. No banco ela não é:
  // lá o `tipo` guarda o tipo do RESULTADO e o campo é calculado por ter
  // fórmula. A tela mostra o que a pessoa espera; a gravação traduz.
  const tipos = (typeof TIPOS_PERS_ROTULO !== 'undefined' ? TIPOS_PERS_ROTULO : []);
  // v1.765 — a Relação só existe nos objetos personalizados (o banco
  // recusa nos outros); e a Fórmula, por ora, só nos objetos do sistema
  const pers = ehObjetoPers(objetoAtual);
  document.getElementById('cp-tipo').innerHTML =
    tipos.filter(function (t) { return t[0] !== 'relacao' || pers || relacaoNoSistema(objetoAtual) || (campoEditando && campoEditando.tipo === 'relacao'); })
      .map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('')
    + '<option value="__formula">Fórmula (valor calculado)</option>';   // v1.771 — também nos personalizados
  // o resultado só oferece tipos que a fórmula sabe devolver
  document.getElementById('cp-fx-tipo').innerHTML = tipos
    .filter(function (t) {
      return ['texto', 'numero', 'moeda', 'percentual', 'data', 'datahora', 'sim_nao']
        .indexOf(t[0]) > -1;
    })
    .map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('');

  const emp = empresas.find(function (e) { return e.id === empresaAtual; });
  const nomeEmp = emp ? (emp.nome_fantasia || emp.razao_social) : 'esta imobiliária';
  document.getElementById('cp-aviso').innerHTML =
    'Este campo vai existir em <b>' + htm(rotuloDoObjeto(objetoAtual)) + '</b>, só para <b>' + htm(nomeEmp) + '</b>.';

  document.getElementById('titulo-campo').textContent = novo ? 'Novo campo personalizado' : 'Editar campo';
  document.getElementById('btn-campo').textContent = novo ? 'Criar campo' : 'Salvar';
  document.getElementById('erro-campo').style.display = 'none';

  const c = campoEditando || {};
  document.getElementById('cp-rotulo').value = c.rotulo || '';
  document.getElementById('cp-tipo').value = c.tipo || 'texto';
  document.getElementById('cp-tipo').disabled = !novo;
  document.getElementById('cp-casas').value = c.casas == null ? '' : c.casas;
  document.getElementById('cp-opcoes').value = (c.opcoes || []).join('\n');
  document.getElementById('cp-ajuda').value = c.ajuda || '';
  document.getElementById('cp-obrigatorio').value = c.obrigatorio ? '1' : '0';
  document.getElementById('cp-unico').value = c.unico ? '1' : '0';
  document.getElementById('cp-na-lista').value = c.na_lista ? '1' : '0';

  // v1.192/1.194 — fórmula
  const temFormula = !!(c.formula && String(c.formula).trim());
  document.getElementById('cp-formula').value = c.formula || '';
  document.getElementById('cp-fx-resultado').innerHTML = '';
  if (temFormula) {
    document.getElementById('cp-tipo').value = '__formula';
    document.getElementById('cp-fx-tipo').value = c.tipo || 'texto';
  }
  // o tipo é imutável depois de criado, e o do resultado faz parte dele
  document.getElementById('cp-fx-tipo').disabled = !novo;
  desenharCamposDaFormula();
  preencherRelacao(c, novo);

  previaChave();
  mostrarOpcoesCampo();
  abrir('modal-campo');
}

function previaChave() {
  const el = document.getElementById('cp-chave-previa');
  if (!el) return;
  if (campoDoSistema) { el.textContent = campoDoSistema.c; return; }
  if (campoEditando) { el.textContent = campoEditando.chave; return; }
  el.textContent = chaveDoRotulo(document.getElementById('cp-rotulo').value || '') || '—';
}

// ------------------------------------------------------------
// v1.658 — EDITAR UM CAMPO DO SISTEMA (só o nome)
//
// Pedido do Rodrigo em 17/09/2026: "todos os campos, mesmo sendo de
// sistema, poderiam ter a opção de editar; só não poderá excluir, e não
// pode trocar o nome do sistema — mas o nome do campo dá para alterar".
//
// A MESMA janela do campo personalizado, com o que não se aplica
// escondido: tipo (é do programa), opções, ajuda, regras, coluna da
// lista. Sobra o nome. O que a pessoa digita vai para
// `empresas.rotulos_campos` pela RPC `renomear_campo_do_sistema` — nome
// vazio (ou o botão "Voltar ao nome do sistema") apaga a entrada e o
// campo volta a se chamar como o programa chama.
//
// Fórmula cita campo pelo NOME (formula.js). Renomear "Valor do
// aluguel" quebraria toda fórmula que o cita, então o mesmo
// `renomearNasFormulas` do campo personalizado roda aqui também.
// ------------------------------------------------------------
function modoCampoDoSistema(ligado) {
  // o que só faz sentido para campo personalizado
  ['cp-tipo', 'cp-casas', 'cp-ajuda', 'cp-obrigatorio', 'cp-unico', 'cp-na-lista']
    .forEach(function (id) {
      const el = document.getElementById(id);
      const caixa = el && el.closest('.campo');
      if (caixa) caixa.style.display = ligado ? 'none' : '';
    });
  ['cp-bloco-fx-tipo', 'cp-bloco-formula', 'cp-bloco-opcoes', 'cp-bloco-rel'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el && ligado) el.style.display = 'none';
  });
  const bloco = document.getElementById('cp-bloco-sistema');
  if (bloco) bloco.style.display = ligado ? '' : 'none';
  // v1.659 — o bloco das opções do sistema: quem liga é abrirCampoDoSistema,
  // só quando o campo é lista; aqui ele só some ao sair do modo
  const blocoOp = document.getElementById('cp-bloco-op-sistema');
  if (blocoOp && !ligado) blocoOp.style.display = 'none';
  const nota = document.getElementById('cp-chave-nota');
  if (nota) nota.textContent = ligado
    ? '· é o nome que o programa usa; não muda.'
    : '· gerado a partir do rótulo e imutável depois.';
}

function abrirCampoDoSistema(campo) {
  const cat = (typeof CATALOGO !== 'undefined' && CATALOGO[objetoAtual]) || null;
  const f = cat && cat.campos.find(function (x) { return x.c === campo; });
  if (!f) return;
  campoEditando = null;
  campoDoSistema = f;
  const nomeSistema = Object.prototype.hasOwnProperty.call(f, 'rSistema') ? f.rSistema : f.r;

  const emp = empresas.find(function (e) { return e.id === empresaAtual; });
  const nomeEmp = emp ? (emp.nome_fantasia || emp.razao_social) : 'esta imobiliária';
  const o = OBJETOS_PERS.find(function (x) { return x.obj === objetoAtual; });
  document.getElementById('cp-aviso').innerHTML =
    'Campo do sistema em <b>' + htm(o ? o.rotulo : objetoAtual) + '</b>. O nome técnico e o tipo '
    + 'são do programa e o campo não pode ser excluído — o que muda é o nome que aparece '
    + 'nas telas, só para <b>' + htm(nomeEmp) + '</b>.';

  document.getElementById('titulo-campo').textContent = 'Editar campo do sistema';
  document.getElementById('btn-campo').textContent = 'Salvar';
  document.getElementById('erro-campo').style.display = 'none';

  document.getElementById('cp-rotulo').value = f.r || '';
  document.getElementById('cp-nome-sistema').textContent = nomeSistema;
  const restaurar = document.getElementById('cp-btn-restaurar');
  if (restaurar) restaurar.style.display = (f.r !== nomeSistema) ? '' : 'none';

  modoCampoDoSistema(true);

  // v1.659 — a LISTA DE OPÇÕES: a do sistema como referência, e a da
  // imobiliária para editar (quando a lista é livre)
  const ed = opcoesDoSistemaEditaveis(f);
  const blocoOp = document.getElementById('cp-bloco-op-sistema');
  if (blocoOp) blocoOp.style.display = ed.lista ? '' : 'none';
  if (ed.lista) {
    const sis = Array.isArray(f.opSistema) ? f.opSistema : (f.opcoes || []);
    const soCresce = ed.pode && listaSoCresce(objetoAtual, f.c);
    textosDaListaPropria(soCresce);
    document.getElementById('cp-op-sistema-lista').textContent = sis.filter(Boolean).join(' · ');
    document.getElementById('cp-op-mais').value =
      (soCresce ? listaPropria(f) : (f.opcoes || []).filter(Boolean)).join('\n');
    document.getElementById('cp-op-mais-caixa').style.display = ed.pode ? '' : 'none';
    document.getElementById('cp-btn-op-sistema').style.display = listaPropria(f).length ? '' : 'none';
    document.getElementById('cp-op-nota').textContent = soCresce
      ? 'Estes ficam sempre na lista: o sistema usa Ligação e Visita no último contato do lead, '
        + 'Visita no indicador de visitas da Gestão e Reunião no compromisso.'
      : ed.pode
      ? 'Edite a lista como quiser (uma opção por linha): é ela que aparece na lista, no filtro '
        + 'e na ficha, só para a sua imobiliária. Registro antigo com valor fora da lista nova '
        + 'continua mostrando o valor dele.'
      : 'Esta lista não aceita lista própria: ' + ed.motivo + '.';
  }
  campoDoSistemaOpAntes = document.getElementById('cp-op-mais').value;

  previaChave();
  abrir('modal-campo');
}
/** v1.659 — o texto das opções ao abrir, para só gravar se mudou */
let campoDoSistemaOpAntes = '';

/** v1.775 — a janela é uma só para as duas formas de lista própria: a que
 *  SUBSTITUI a do sistema (logradouro) e a que só ACRESCENTA (tipo da
 *  tarefa). Os rótulos trocam a cada abertura, nos dois sentidos. */
function textosDaListaPropria(soCresce) {
  const rotSis = document.querySelector('#cp-bloco-op-sistema > label');
  const rotMais = document.querySelector('#cp-op-mais-caixa > label');
  const caixa = document.getElementById('cp-op-mais');
  const tirar = document.getElementById('cp-btn-op-sistema');
  if (rotSis) rotSis.innerHTML = soCresce
    ? 'Tipos do sistema <span class="tag tag-cinza" style="margin-left:6px">do sistema</span>'
    : 'Opções do sistema';
  if (rotMais) rotMais.textContent = soCresce
    ? 'Tipos da sua imobiliária (um por linha) — entram depois dos do sistema'
    : 'Lista da sua imobiliária (uma opção por linha)';
  if (caixa) caixa.placeholder = soCresce ? 'Vistoria\nEntrega de chaves\nAssinatura de contrato' : 'RUA\nAVENIDA\nLADEIRA';
  if (tirar) tirar.textContent = soCresce ? 'Tirar os tipos da imobiliária' : 'Voltar à lista do sistema';
}

/** v1.659 — "Caixa alta": a lista inteira em maiúsculas (pedido do
 *  Rodrigo: RUA, AVENIDA…). Só mexe no texto; Salvar é que grava. */
function caixaAltaNaLista() {
  const el = document.getElementById('cp-op-mais');
  if (el) el.value = el.value.toLocaleUpperCase('pt-BR');
}

/** v1.659 — devolve a lista do sistema à caixa de texto. Salvar com a
 *  lista igual à do sistema apaga a lista própria. */
function voltarListaDoSistema() {
  const f = campoDoSistema;
  const el = document.getElementById('cp-op-mais');
  if (!f || !el) return;
  // v1.775 — na lista que só cresce, voltar ao sistema = caixa vazia
  if (listaSoCresce(objetoAtual, f.c)) { el.value = ''; return; }
  const sis = Array.isArray(f.opSistema) ? f.opSistema : (f.opcoes || []);
  el.value = sis.filter(Boolean).join('\n');
}

async function salvarCampoDoSistema(voltarAoSistema) {
  const f = campoDoSistema;
  if (!f) return;
  const erro = document.getElementById('erro-campo');
  erro.style.display = 'none';
  const botao = document.getElementById('btn-campo');
  const nomeSistema = Object.prototype.hasOwnProperty.call(f, 'rSistema') ? f.rSistema : f.r;

  let rotulo = voltarAoSistema ? '' : document.getElementById('cp-rotulo').value.trim();
  if (!voltarAoSistema && !rotulo) { mostrarErro(erro, 'O campo precisa de um nome.'); return; }
  if (rotulo.length > 60) { mostrarErro(erro, 'O nome pode ter até 60 caracteres.'); return; }
  // digitou o nome do sistema de volta = apagar o nome próprio
  if (rotulo.trim().toLowerCase() === String(nomeSistema).trim().toLowerCase()) rotulo = '';

  // dois campos com o mesmo nome no mesmo objeto: a fórmula, que cita
  // pelo nome, não saberia de qual se fala — e a lista também não
  if (rotulo) {
    const k = rotulo.toLowerCase();
    const cat = (typeof CATALOGO !== 'undefined' && CATALOGO[objetoAtual]) || null;
    const repete = (cat ? cat.campos : []).some(function (x) {
      return x !== f && String(x.r || '').trim().toLowerCase() === k;
    }) || camposDoObjeto.some(function (c) {
      return !c.excluido_em && String(c.rotulo || '').trim().toLowerCase() === k;
    });
    if (repete) { mostrarErro(erro, 'Já existe um campo com esse nome neste objeto.'); return; }
  }

  // v1.659 — a lista própria, só se o campo aceita e se mudou. Lista
  // igual à do sistema (mesma ordem, mesmo texto) = sem lista própria.
  const ed = opcoesDoSistemaEditaveis(f);
  const textoOp = (ed.pode && !voltarAoSistema) ? document.getElementById('cp-op-mais').value : campoDoSistemaOpAntes;
  let opcoesNovas = null;
  const soCresce = ed.pode && listaSoCresce(objetoAtual, f.c);
  if (ed.pode && textoOp !== campoDoSistemaOpAntes) {
    const vistos = {};
    opcoesNovas = textoOp.split('\n').map(function (s) { return s.trim(); }).filter(function (s) {
      const k = s.toLowerCase();
      if (!s || vistos[k]) return false;             // vazia ou repetida
      vistos[k] = 1;
      return true;
    });
    // v1.775 — na lista que só cresce, as do sistema já estão lá (quem
    // digitou "Visita" de novo não cria um segundo Visita), e a caixa
    // vazia é válida: quer dizer "só os do sistema"
    if (soCresce) opcoesNovas = semAsDoSistema(opcoesNovas, Array.isArray(f.opSistema) ? f.opSistema : f.opcoes);
    if (!opcoesNovas.length && !soCresce) { mostrarErro(erro, 'A lista precisa de pelo menos uma opção — ou use "Voltar à lista do sistema".'); return; }
    const longa = opcoesNovas.find(function (s) { return s.length > 60; });
    if (longa) { mostrarErro(erro, 'Cada opção pode ter até 60 caracteres: "' + longa.slice(0, 30) + '…".'); return; }
    if (opcoesNovas.length > 50) { mostrarErro(erro, 'No máximo 50 opções por lista.'); return; }
    const sis = (Array.isArray(f.opSistema) ? f.opSistema : f.opcoes).filter(Boolean);
    if (!soCresce && sis.join('\n') === opcoesNovas.join('\n')) opcoesNovas = [];   // igual à do sistema: apaga a própria
  }

  botao.disabled = true;
  try {
    // a memória desta sessão: a empresa (e daí o catálogo/ficha)
    const emp = empresas.find(function (e) { return e.id === empresaAtual; });
    const memoria = (PERM.empresa && PERM.empresa.id === empresaAtual) ? PERM.empresa : (emp || {});

    const r = await sb.rpc('renomear_campo_do_sistema', {
      p_empresa: empresaAtual, p_objeto: objetoAtual, p_campo: f.c, p_rotulo: rotulo || null
    });
    if (r.error) throw r.error;
    const novoMapa = (r.data && typeof r.data === 'object') ? r.data : {};
    if (emp) emp.rotulos_campos = novoMapa;
    memoria.rotulos_campos = novoMapa;

    if (opcoesNovas) {
      const cat = (typeof CATALOGO !== 'undefined' && CATALOGO[objetoAtual]) || {};
      const ro = await sb.rpc('definir_opcoes_do_campo', {
        p_empresa: empresaAtual, p_objeto: objetoAtual,
        p_tabela: cat.gravarEm || objetoAtual, p_campo: f.c, p_opcoes: opcoesNovas
      });
      if (ro.error) throw ro.error;
      const novoOp = (ro.data && typeof ro.data === 'object') ? ro.data : {};
      if (emp) emp.opcoes_campos = novoOp;
      memoria.opcoes_campos = novoOp;
    }

    const antigo = f.r;
    if (typeof aplicarRotulosDaEmpresa === 'function') aplicarRotulosDaEmpresa(memoria);

    // as fórmulas que citavam o nome antigo passam a citar o novo
    if (antigo !== f.r) await renomearNasFormulas({ rotulo: antigo, objeto: objetoAtual }, f.r);

    fechar('modal-campo');
    campoDoSistema = null;
    desenharCampos();
  } catch (e) {
    mostrarErro(erro, e.message || String(e));
  } finally {
    botao.disabled = false;
  }
}

/** Mesma regra da função do banco, para a prévia bater com o resultado. */
function chaveDoRotulo(r) {
  const semAcento = String(r).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return semAcento.replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function mostrarOpcoesCampo() {
  const t = document.getElementById('cp-tipo').value;
  // v1.194 — campo calculado não tem opções de digitação: quem preenche
  // é a conta. Obrigatório e único deixam de fazer sentido.
  const ehFx = t === '__formula';
  ['cp-bloco-formula', 'cp-bloco-fx-tipo'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.style.display = ehFx ? '' : 'none';
  });
  ['cp-obrigatorio', 'cp-unico'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el && el.closest('.campo')) el.closest('.campo').style.display = ehFx ? 'none' : '';
  });
  if (ehFx) {
    document.getElementById('cp-bloco-opcoes').style.display = 'none';
    document.getElementById('cp-bloco-rel').style.display = 'none';   // v1.765
    document.getElementById('cp-casas').closest('.campo').style.display = 'none';
    return;
  }
  document.getElementById('cp-bloco-opcoes').style.display =
    (t === 'escolha' || t === 'escolha_multipla') ? '' : 'none';
  document.getElementById('cp-casas').closest('.campo').style.display =
    (t === 'numero' || t === 'moeda' || t === 'percentual') ? '' : 'none';
  // v1.765 — a relação
  document.getElementById('cp-bloco-rel').style.display = (t === 'relacao') ? '' : 'none';
  // v1.770 — nos objetos do sistema a Relação não é obrigatória (o banco
  // recusa): a janela "+ Novo" deles não tem campo personalizado
  const semObrig = t === 'relacao' && !ehObjetoPers(objetoAtual);
  const ob = document.getElementById('cp-obrigatorio');
  if (semObrig) ob.value = '0';
  ob.closest('.campo').style.display = semObrig ? 'none' : '';
}

// ------------------------------------------------------------
// v1.765 — O CAMPO DE RELAÇÃO (só nos objetos personalizados)
//
// Liga cada registro a um Contato, Imóvel, Contrato, Lead, Caso ou a
// outro objeto personalizado. O destino não muda depois de criado (o
// banco barra); o que acontece ao excluir o ligado e o cartão do outro
// lado se ajustam a qualquer hora.
// ------------------------------------------------------------
const DESTINOS_DE_RELACAO = [['contatos', 'Contato'], ['imoveis', 'Imóvel'], ['contratos', 'Contrato'],
                             ['leads', 'Lead'], ['casos', 'Caso']];
/** v1.770 — os objetos do sistema que também têm campo de Relação (a
 *  mesma lista fechada do banco, campos_pers_conferir). */
function relacaoNoSistema(obj) { return DESTINOS_DE_RELACAO.some(function (d) { return d[0] === obj; }); }

function preencherRelacao(c, novo) {
  const sel = document.getElementById('cp-rel-objeto');
  const op = objetoPers(objetoAtual);
  sel.innerHTML = DESTINOS_DE_RELACAO.map(function (d) {
      return '<option value="' + d[0] + '">' + d[1] + '</option>'; }).join('')
    + objetosPers.map(function (o) {
      return '<option value="' + htm(o.chave) + '">' + htm(o.singular) + ' (personalizado)</option>'; }).join('');
  // v1.770 — num objeto do sistema o caso comum é apontar para um objeto
  // personalizado (o Imóvel → as Chaves): ele vem marcado
  sel.value = c.rel_objeto || (op ? 'imoveis'
    : (objetosPers.length ? objetosPers[0].chave : (objetoAtual === 'imoveis' ? 'contatos' : 'imoveis')));
  sel.disabled = !novo;
  // v1.770 — a origem pode ser um objeto do sistema (o nome dele, no singular)
  const sis = (!op && typeof objpOrigemSistema === 'function') ? objpOrigemSistema(objetoAtual) : null;
  document.getElementById('cp-rel-rot').textContent = 'Liga cada ' +
    (op ? op.singular.toLowerCase() : (sis ? sis.singular.toLowerCase() : 'registro')) + ' a um(a) *';
  document.getElementById('cp-rel-excluir').value = c.rel_ao_excluir || 'impedir';
  document.getElementById('cp-rel-cartao').checked = novo ? true : !!c.rel_cartao;
  document.getElementById('cp-rel-cartao-nome').value = c.rel_cartao_nome || (op ? op.plural : (sis ? sis.plural : ''));
  const marcadas = Array.isArray(c.rel_cartao_colunas) ? c.rel_cartao_colunas : ['nome'];
  const colunas = [{ chave: 'nome', rotulo: op ? op.titulo_rotulo : (sis ? sis.titulo_rotulo : 'Nome') }].concat(
    camposDoObjeto.filter(function (x) {
      return x.tipo !== 'texto_longo' && x.tipo !== 'escolha_multipla' && (!c.id || x.id !== c.id);
    }).map(function (x) { return { chave: x.chave, rotulo: x.rotulo }; }));
  document.getElementById('cp-rel-colunas').innerHTML = colunas.map(function (x) {
    return '<label><input type="checkbox" value="' + htm(x.chave) + '"' +
      (marcadas.indexOf(x.chave) > -1 ? ' checked' : '') + ' onchange="limitarColunasRelacao(this)"> ' +
      htm(x.rotulo) + '</label>';
  }).join('');
  pintarCartaoRelacao();
}

function pintarCartaoRelacao() {
  const destino = document.getElementById('cp-rel-objeto').value;
  const liga = document.getElementById('cp-rel-cartao').checked;
  // v1.770 — o botão de criar já ligado só existe quando a origem é um
  // objeto personalizado
  document.getElementById('cp-rel-cartao-txt').textContent =
    'Mostrar um cartão na ficha de cada ' + rotuloDeDestino(destino) +
    (ehObjetoPers(objetoAtual) ? ', com os registros ligados a ele e um botão para criar outro já ligado'
                               : ', com os registros ligados a ele');
  document.getElementById('cp-rel-bloco-nome').style.display = liga ? '' : 'none';
  document.getElementById('cp-rel-bloco-colunas').style.display = liga ? '' : 'none';
}
function rotuloDeDestino(destino) {
  const d = DESTINOS_DE_RELACAO.find(function (x) { return x[0] === destino; });
  if (d) return d[1];
  const o = objetoPers(destino);
  return o ? o.singular : destino;
}
/** O cartão mostra até 3 colunas: a quarta marcada desmarca a si mesma. */
function limitarColunasRelacao(caixa) {
  const marcadas = document.querySelectorAll('#cp-rel-colunas input:checked');
  if (marcadas.length > 3) caixa.checked = false;
}
function lerRelacao() {
  return {
    objeto: document.getElementById('cp-rel-objeto').value,
    ao_excluir: document.getElementById('cp-rel-excluir').value,
    cartao: document.getElementById('cp-rel-cartao').checked,
    cartao_nome: document.getElementById('cp-rel-cartao-nome').value.trim() || null,
    cartao_colunas: [].slice.call(document.querySelectorAll('#cp-rel-colunas input:checked'))
      .map(function (i) { return i.value; })
  };
}

// ------------------------------------------------------------
// v1.192 — O EDITOR DE FÓRMULA
//
// A fórmula fala pelos RÓTULOS dos campos, não pelas chaves do banco:
// é o que a pessoa vê na tela, e o que ela consegue conferir depois.
// Por isso a lista ao lado insere "{Valor do aluguel}" no cursor.
// ------------------------------------------------------------
function camposParaFormula() {
  return gruposParaFormula().reduce(function (todos, g) {
    return todos.concat(g.campos);
  }, []);
}

/** v1.195 — os campos separados por grupo: o próprio objeto primeiro,
 *  depois um grupo por relação. As relações saem do TIPO dos campos
 *  (fxRelacoes), então objeto novo aparece aqui sozinho. */
/** v1.771 — os campos que todo registro de objeto personalizado tem e que
 *  uma fórmula pode citar (colunas de registros_pers). O proprietário fica
 *  de fora: é um id, não serve para conta. */
function camposDoSistemaParaFormula(o) {
  return [{ c: 'codigo', r: 'Código', t: 'texto' }]
    .concat(o.titulo_modo === 'codigo' ? [] : [{ c: 'nome', r: o.titulo_rotulo || 'Nome', t: 'texto' }])
    .concat([{ c: 'criado_em', r: 'Criado em', t: 'datahora' }, { c: 'atualizado_em', r: 'Atualizado em', t: 'datahora' }]);
}

/** v1.772 — o que NÃO entra em fórmula a partir do registro ligado: a mesma
 *  lista do banco (formula_campo_sensivel). Quem barra de verdade é ele. */
function campoSensivelParaFormula(c) {
  const k = String(c || '').toLowerCase();
  return !k || /^(id|empresa_id|personalizados|cpf|cnpj|cpf_cnpj|rg|documento|banco_pix|chave_pix|tipo_chave_pix|pix|banco|agencia|conta_bancaria|dados_bancarios|asaas_cliente_id|senha|token)$/.test(k)
    || /^(cpf_|cnpj_|rg_|documento_|doc_|pix_|chave_pix_|banco_|agencia_|asaas_)/.test(k)
    || /(_id|_cpf|_cnpj|_pix|_rg)$/.test(k);
}

/** v1.772 — os campos do registro para onde uma Relação aponta, que a
 *  fórmula pode citar como {Relação.Campo}: [{c, r, t, pers}]. */
function camposDoLigadoParaFormula(relCp) {
  const dest = relCp.rel_objeto;
  const todos = (typeof objpTodosOsCampos === 'function') ? objpTodosOsCampos() : [];
  const persDoDestino = todos.filter(function (c) {
    // personalizado: nem CPF/CNPJ, nem Relação (é um id), nem fórmula de objeto
    // do sistema (essa é calculada na camada _fx, não fica guardada)
    return c.objeto === dest && !c.excluido_em && c.tipo !== 'cpf_cnpj' && c.tipo !== 'relacao'
      && (/^p_/.test(dest) || !(c.formula && String(c.formula).trim()));
  }).map(function (c) { return { c: c.chave, r: c.rotulo, t: c.tipo, pers: true }; });
  if (/^p_/.test(String(dest))) {
    const od = objetoPers(dest);
    return (od ? camposDoSistemaParaFormula(od).map(function (c) { return { c: c.c, r: c.r, t: c.t, pers: false }; }) : [])
      .concat(persDoDestino);
  }
  const alvo = fxObjetoDaFicha(dest);
  const def = (alvo && typeof DEFS !== 'undefined' && DEFS[alvo]) ? DEFS[alvo].campos : [];
  return def.filter(function (c) {
    return !c.c.startsWith('_') && !c.pers && !c.formula && !FX_TIPOS_REF[c.t] && c.t !== 'doc'
      && !campoSensivelParaFormula(c.c);
  }).map(function (c) { return { c: c.c, r: c.r, t: c.t, pers: false }; }).concat(persDoDestino);
}

/** v1.772 — as Relações deste objeto personalizado que a fórmula atravessa. */
function relacoesParaFormula() {
  return camposDoObjeto.filter(function (c) {
    return c.tipo === 'relacao' && !c.excluido_em && (!campoEditando || c.id !== campoEditando.id);
  });
}

function gruposParaFormula() {
  // v1.771 — objeto personalizado: os campos do próprio registro
  // v1.772 — e um grupo por Relação, com os campos do registro ligado
  const op = ehObjetoPers(objetoAtual) ? objetoPers(objetoAtual) : null;
  if (op) {
    const proprios = camposDoSistemaParaFormula(op).map(function (c) { return { rotulo: c.r, tipo: c.t }; });
    camposDoObjeto.filter(function (c) {
      return !c.excluido_em && (!campoEditando || c.id !== campoEditando.id);
    }).forEach(function (c) { proprios.push({ rotulo: c.rotulo, tipo: c.tipo }); });
    const grupos = [{ rotulo: op.plural, proprio: true, campos: proprios }];
    relacoesParaFormula().forEach(function (rel) {
      const campos = camposDoLigadoParaFormula(rel).map(function (c) {
        return { rotulo: rel.rotulo + '.' + c.r, tipo: c.t, curto: c.r };
      });
      if (campos.length) grupos.push({ rotulo: rel.rotulo, campos: campos });
    });
    return grupos;
  }
  const alvo = fxObjetoDaFicha(objetoAtual);
  const def = (alvo && typeof DEFS !== 'undefined' && DEFS[alvo]) ? DEFS[alvo].campos : [];

  const proprios = def.filter(function (c) { return !c.c.startsWith('_'); })
    .map(function (c) { return { rotulo: c.r, tipo: c.t }; });
  // os personalizados do objeto entram também — menos o que está sendo
  // editado agora, senão a fórmula poderia chamar a si mesma
  camposDoObjeto.filter(function (c) {
    return !c.excluido_em && (!campoEditando || c.id !== campoEditando.id);
  }).forEach(function (c) { proprios.push({ rotulo: c.rotulo, tipo: c.tipo }); });

  const grupos = [{ rotulo: (OBJETOS_PERS.find(function (x) { return x.obj === objetoAtual; }) || {}).rotulo
                            || objetoAtual, proprio: true, campos: proprios }];

  (typeof fxRelacoes === 'function' ? fxRelacoes(def) : []).forEach(function (rel) {
    const dd = (typeof DEFS !== 'undefined' && DEFS[rel.objeto]) ? DEFS[rel.objeto].campos : [];
    const campos = dd.filter(function (c) { return !c.c.startsWith('_') && !FX_TIPOS_REF[c.t]; })
      .map(function (c) { return { rotulo: rel.rotulo + '.' + c.r, tipo: c.t, curto: c.r }; });
    if (campos.length) grupos.push({ rotulo: rel.rotulo, campos: campos });
  });
  return grupos;
}

function desenharCamposDaFormula() {
  // os botões das funções: inserem o nome já com os parênteses
  const bf = document.getElementById('cp-fx-func');
  if (bf) {
    bf.innerHTML = ['IF', 'AND', 'OR', 'NOT', 'ISBLANK', 'CASE', 'ROUND',
      'TEXT', 'UPPER', 'CONTAINS', 'TODAY', 'YEAR']
      .map(function (f) {
        return '<button type="button" onclick="inserirNaFormula(\'' + f + '()\', true)">' +
               f + '()</button>';
      }).join('');
  }

  const alvo = document.getElementById('cp-fx-campos');
  if (!alvo) return;
  alvo.innerHTML = gruposParaFormula().map(function (g) {
    return '<div class="fx-grupo">' + htm(g.rotulo) + '</div>' +
      g.campos.map(function (c) {
        const nome = g.proprio ? htm(c.rotulo)
          : '<b>' + htm(g.rotulo) + '.</b>' + htm(c.curto);
        return '<div class="fx-item' + (g.proprio ? '' : ' rel') + '" onclick="inserirNaFormula(' +
          JSON.stringify(c.rotulo).replace(/"/g, '&quot;') + ')">' +
          '<span>' + nome + '</span><span class="t">' + htm(c.tipo) + '</span></div>';
      }).join('');
  }).join('') || '<div class="lay-vazio">nenhum campo neste objeto</div>';
}

function inserirNaFormula(texto, cru) {
  const el = document.getElementById('cp-formula');
  if (!el) return;
  const trecho = cru ? texto : '{' + texto + '}';
  const ini = el.selectionStart == null ? el.value.length : el.selectionStart;
  const fim = el.selectionEnd == null ? el.value.length : el.selectionEnd;
  el.value = el.value.slice(0, ini) + trecho + el.value.slice(fim);
  el.focus();
  el.selectionStart = el.selectionEnd = ini + trecho.length;
}

function verificarFormula() {
  const alvo = document.getElementById('cp-fx-resultado');
  const txt = document.getElementById('cp-formula').value;
  const r = fxVerificar(txt, camposParaFormula());
  if (!r.ok) {
    alvo.innerHTML = '<div class="fx-erro">\u2715 ' + htm(r.erro) + '</div>';
    return false;
  }
  alvo.innerHTML = '<div class="fx-ok">\u2714 Fórmula válida \u2014 resultado de exemplo: <b>' +
    htm(formatarValorSolto(r.valor, document.getElementById('cp-fx-tipo').value)) + '</b></div>';
  return true;
}

async function salvarCampo() {
  if (campoDoSistema) return salvarCampoDoSistema(false);   // v1.658
  const erro = document.getElementById('erro-campo');
  erro.style.display = 'none';
  const botao = document.getElementById('btn-campo');

  const rotulo = document.getElementById('cp-rotulo').value.trim();
  if (!rotulo) { mostrarErro(erro, 'O campo precisa de um nome.'); return; }

  // v1.194 — a tela diz "Fórmula"; o banco recebe o tipo do RESULTADO
  const tipoTela = document.getElementById('cp-tipo').value;
  const ehFormula = tipoTela === '__formula';
  const tipo = ehFormula ? document.getElementById('cp-fx-tipo').value : tipoTela;
  const opcoes = document.getElementById('cp-opcoes').value.split('\n')
    .map(function (s) { return s.trim(); }).filter(Boolean);
  if ((tipo === 'escolha' || tipo === 'escolha_multipla') && !opcoes.length) {
    mostrarErro(erro, 'Uma lista de opções precisa de pelo menos uma opção.'); return;
  }
  const casas = document.getElementById('cp-casas').value;
  // v1.765 — a relação vai junto, na mesma chamada
  const rel = (tipo === 'relacao') ? lerRelacao() : null;
  if (rel && rel.ao_excluir === 'soltar' && document.getElementById('cp-obrigatorio').value === '1') {
    mostrarErro(erro, 'Campo obrigatório não pode ficar vazio: escolha "Impedir" no que acontece quando o registro ligado é excluído.');
    return;
  }

  // v1.192 — fórmula quebrada não entra no banco: ela rodaria na tela
  // de todo mundo, e o erro apareceria para quem não escreveu
  const formula = document.getElementById('cp-formula').value.trim();
  if (ehFormula) {
    if (!formula) { mostrarErro(erro, 'Escreva a fórmula, ou escolha outro tipo.'); return; }
    if (!verificarFormula()) { mostrarErro(erro, 'A fórmula tem um problema — veja o aviso acima.'); return; }
    // v1.771 — no objeto personalizado quem calcula é o banco: a fórmula tem
    // de descer inteira, ANTES de o campo nascer (senão sobra um campo vazio)
    if (ehObjetoPers(objetoAtual) && typeof fxArvoreParaBanco === 'function') {
      const prova = fxArvoreParaBanco(formula, rotuloParaColuna());
      if (!prova.ok) {
        mostrarErro(erro, prova.motivo + ' Nos objetos personalizados a fórmula usa os campos do próprio registro e, pelas Relações dele, os do registro ligado (sem os dados sensíveis).');
        return;
      }
    }
  }

  botao.disabled = true;
  try {
    let r;
    if (campoEditando) {
      r = await sb.rpc('editar_campo_personalizado', {
        p_id: campoEditando.id, p_rotulo: rotulo,
        p_ajuda: document.getElementById('cp-ajuda').value.trim() || null,
        p_obrigatorio: document.getElementById('cp-obrigatorio').value === '1',
        p_unico: document.getElementById('cp-unico').value === '1',
        p_opcoes: opcoes.length ? opcoes : null,
        p_casas: casas === '' ? null : Number(casas),
        p_na_lista: document.getElementById('cp-na-lista').value === '1',
        p_rel: rel
      });
    } else {
      r = await sb.rpc('criar_campo_personalizado', {
        p_objeto: objetoAtual, p_rotulo: rotulo, p_tipo: tipo,
        p_ajuda: document.getElementById('cp-ajuda').value.trim() || null,
        p_obrigatorio: document.getElementById('cp-obrigatorio').value === '1',
        p_unico: document.getElementById('cp-unico').value === '1',
        p_opcoes: opcoes.length ? opcoes : null,
        p_casas: casas === '' ? null : Number(casas),
        p_na_lista: document.getElementById('cp-na-lista').value === '1',
        p_rel: rel
      });
    }
    if (r.error) throw r.error;

    // v1.765 — objeto personalizado sem fórmula: nada mais a fazer
    // v1.771 — com fórmula, segue: o banco guarda a fórmula e recalcula todos
    // os registros do objeto (salvar_formula_campo)
    if (ehObjetoPers(objetoAtual) && !ehFormula && !(campoEditando && campoEditando.formula)) {
      fechar('modal-campo');
      await carregarCamposDoObjeto();
      return;
    }

    // v1.202 — RENOMEOU: as fórmulas que citavam o nome antigo são
    // reescritas agora, com o nome novo.
    if (campoEditando && campoEditando.rotulo !== rotulo) {
      await renomearNasFormulas(campoEditando, rotulo);
    }

    // v1.192 — a fórmula vai numa chamada própria, depois de o campo
    // existir. Se o SQL da v1.192 não tiver rodado, o campo já está
    // salvo e o aviso fala só do que faltou.
    const chave = campoEditando ? campoEditando.chave
      : chaveDoRotulo(rotulo);
    // v1.196 — junto da fórmula vai a ÁRVORE, para o banco calcular e
    // a lista poder filtrar, ordenar e somar. Fórmula que cita objeto
    // relacionado não desce: continua calculada na tela, e o aviso
    // abaixo diz isso em vez de deixar a pessoa achando que desceu.
    let arvore = null, soNaTela = null;
    if (ehFormula && typeof fxArvoreParaBanco === 'function') {
      const r = fxArvoreParaBanco(formula, rotuloParaColuna());
      if (r.ok) arvore = r.arvore; else soNaTela = r.motivo;
    }
    const rf = await sb.rpc('salvar_formula_campo',
      { p_objeto: objetoAtual, p_chave: chave,
        p_formula: ehFormula ? formula : null, p_arvore: arvore });
    if (rf.error) {
      await carregarCamposDoObjeto();
      mostrarErro(erro, 'Campo salvo, mas a fórmula não: ' + rf.error.message +
        (ehObjetoPers(objetoAtual) ? '' : ' — rode a migração v1.192 no banco de dados e salve de novo.'));
      return;
    }

    fechar('modal-campo');
    await carregarCamposDoObjeto();
    if (soNaTela) {
      await dialogoAvisar('Campo salvo.\n\n' + soNaTela + '\n\nEle aparece na ficha e na lista '
        + 'normalmente, mas não dá para filtrar, ordenar nem somar por ele.');
    }
  } catch (e) { mostrarErro(erro, e.message); }
  finally { botao.disabled = false; }
}

/** v1.196 — de rótulo para coluna, que é o que o banco entende.
 *  Campo do objeto vira a coluna; personalizado vira a chave dentro do
 *  jsonb; relacionado devolve nulo (esse não desce para o banco). */
function rotuloParaColuna() {
  const alvo = fxObjetoDaFicha(objetoAtual);
  const def = (alvo && typeof DEFS !== 'undefined' && DEFS[alvo]) ? DEFS[alvo].campos : [];
  const mapa = Object.create(null);
  // v1.771 — objeto personalizado: as colunas de registros_pers
  const opF = ehObjetoPers(objetoAtual) ? objetoPers(objetoAtual) : null;
  if (opF) camposDoSistemaParaFormula(opF).forEach(function (c) {
    mapa[String(c.r).trim().toLowerCase()] = { coluna: c.c, pers: false, tipo: c.t };
  });
  // v1.772 — {Relação.Campo}: a coluna (ou a chave) no registro ligado e a
  // chave da Relação, que o banco usa para achar o registro
  if (opF) relacoesParaFormula().forEach(function (rel) {
    camposDoLigadoParaFormula(rel).forEach(function (c) {
      mapa[(String(rel.rotulo).trim() + '.' + String(c.r).trim()).toLowerCase()] =
        { coluna: c.c, pers: !!c.pers, tipo: c.t, rel: rel.chave };
    });
  });
  def.filter(function (c) { return !c.c.startsWith('_') && !c.pers; })
    .forEach(function (c) {
      mapa[String(c.r).trim().toLowerCase()] = { coluna: c.c, pers: false, tipo: c.t };
    });
  camposDoObjeto.filter(function (c) { return !c.excluido_em; }).forEach(function (c) {
    mapa[String(c.rotulo).trim().toLowerCase()] = { coluna: c.chave, pers: true, tipo: c.tipo };
  });
  return function (rotulo) {
    const k = String(rotulo).trim().toLowerCase();
    return (k in mapa) ? mapa[k] : null;
  };
}

// ------------------------------------------------------------
// v1.202 — CAMPO USADO POR FÓRMULA
//
// A fórmula chama o campo pelo RÓTULO ({Valor do condomínio}). Apagar
// ou renomear o campo quebrava toda fórmula que o citava — em silêncio,
// e só se descobriria depois, olhando um número errado numa ficha.
//
// Apagar passa a ser recusado, dizendo QUAIS fórmulas usam. Renomear
// segue permitido: as fórmulas são reescritas junto, porque impedir
// alguém de corrigir um nome seria pior que o problema.
// ------------------------------------------------------------

/** Quem usa este campo? Devolve [{objeto, rotulo, formula}].
 *  No mesmo objeto vale o nome puro ({Rótulo}); em outro objeto, só a
 *  forma com relação ({Proprietário.Rótulo}) — assim um campo "Nome" em
 *  Imóveis não trava por causa do "Nome" do Contato. */
async function formulasQueUsam(campo) {
  if (typeof fxCamposCitados !== 'function') return [];
  const r = await sb.from('campos_personalizados')
    .select('objeto, rotulo, formula')
    .eq('empresa_id', empresaAtual).is('excluido_em', null).eq('ativo', true)
    .not('formula', 'is', null);
  if (r.error) return [];
  const alvo = String(campo.rotulo).trim().toLowerCase();
  return (r.data || []).filter(function (f) {
    if (f.rotulo === campo.rotulo && f.objeto === campo.objeto) return false;  // ele mesmo
    return fxCamposCitados(f.formula).some(function (n) {
      const partes = String(n).split('.');
      const ultimo = partes[partes.length - 1].trim().toLowerCase();
      if (ultimo !== alvo) return false;
      return partes.length > 1 ? f.objeto !== campo.objeto : f.objeto === campo.objeto;
    });
  });
}

/** Troca o rótulo antigo pelo novo dentro das fórmulas que o citam, e
 *  regrava cada uma (texto e árvore). Silencioso de propósito: de quem
 *  renomeou, nada mudou — e é essa a promessa a cumprir. */
async function renomearNasFormulas(campoAntigo, rotuloNovo) {
  const usos = await formulasQueUsam(campoAntigo);
  if (!usos.length) return;
  const velho = String(campoAntigo.rotulo).trim().toLowerCase();

  for (const u of usos) {
    const nova = String(u.formula).replace(/\{([^}]*)\}/g, function (todo, dentro) {
      const partes = String(dentro).split('.');
      if (partes[partes.length - 1].trim().toLowerCase() !== velho) return todo;
      partes[partes.length - 1] = rotuloNovo;
      return '{' + partes.join('.') + '}';
    });
    if (nova === u.formula) continue;

    let arvoreU = null;
    if (typeof fxArvoreParaBanco === 'function' && u.objeto === objetoAtual) {
      const rr = fxArvoreParaBanco(nova, rotuloParaColuna());
      if (rr.ok) arvoreU = rr.arvore;
    }
    await sb.rpc('salvar_formula_campo',
      { p_objeto: u.objeto, p_chave: chaveDoRotulo(u.rotulo),
        p_formula: nova, p_arvore: arvoreU });
  }
}

async function excluirCampo(id) {
  const c = camposDoObjeto.find(function (x) { return x.id === id; });
  if (!c) return;

  const usos = await formulasQueUsam(c);
  if (usos.length) {
    await dialogoAvisar('Não dá para excluir "' + c.rotulo + '".\n\n' +
      'Ele é usado ' + (usos.length === 1 ? 'na fórmula do campo:' : 'nas fórmulas dos campos:') +
      '\n' + usos.map(function (u) { return '  \u00b7 ' + u.rotulo; }).join('\n') +
      '\n\nApague ou reescreva ' + (usos.length === 1 ? 'essa fórmula' : 'essas fórmulas') +
      ' antes — senão ' + (usos.length === 1 ? 'ela ficaria' : 'elas ficariam') +
      ' apontando para um campo que não existe mais.');
    return;
  }

  if (!(await dialogoPerguntar({ texto: 'Excluir o campo "' + c.rotulo + '"?\n\n' +
    'Ele some das telas agora, mas os dados ficam guardados por 30 dias — ' +
    'dá para restaurar nesse prazo. Depois disso, some de vez.', ok: 'Excluir', perigo: true }))) return;
  const r = await sb.rpc('excluir_campo_personalizado', { p_id: id });
  if (r.error) { await dialogoAvisar(r.error.message); return; }
  await carregarCamposDoObjeto();
}

async function restaurarCampo(id) {
  const r = await sb.rpc('restaurar_campo_personalizado', { p_id: id });
  if (r.error) { await dialogoAvisar(r.error.message); return; }
  await carregarCamposDoObjeto();
}


// ============================================================
// EDITOR DE LAYOUT DA FICHA — arrastando
//
// É o Page Layout do Salesforce na versão que cabe aqui: seções à
// esquerda, campos fora da ficha à direita, arrastar de um lado para o
// outro. Vale para campo de fábrica e personalizado igualmente — para o
// editor, campo é campo.
//
// O layout é guardado por IDENTIFICADOR de campo, não por posição. Se
// amanhã eu acrescentar um campo de fábrica novo, ele não embaralha o
// que a imobiliária montou.
// ============================================================

// QUEM PODE TER LAYOUT PRÓPRIO: TODA FICHA QUE EXISTE.
//
// São sete, e o critério agora é um só — a tela carrega o ficha.js.
// Foi verificado uma a uma no ar, não deduzido: contato, imovel, lead,
// contrato, competencia, sinistro e caso. As sete já carregavam o
// layout-ficha.js; faltava o editor oferecê-las.
//
// Orçamento, aprovação, simulação e tarefa têm definição no DEFS mas
// NÃO têm tela própria — aparecem dentro de outra ficha (orçamento
// dentro do caso, simulação dentro do lead) e tarefa.html devolve 404.
// Layout de tela que não existe não teria onde ser aplicado.
const OBJETOS_LAYOUT = [
  { alvo: 'contato',     plural: 'contatos',     rotulo: 'Contato',     icone: icone('pessoa', 13) },
  { alvo: 'imovel',      plural: 'imoveis',      rotulo: 'Imóvel',      icone: icone('casa', 13) },
  { alvo: 'lead',        plural: 'leads',        rotulo: 'Lead',        icone: icone('alvo', 13) },
  { alvo: 'contrato',    plural: 'contratos',    rotulo: 'Contrato',    icone: icone('documento', 13) },
  { alvo: 'competencia', plural: 'competencias', rotulo: 'Aluguel',     icone: icone('calendario', 13) },
  { alvo: 'sinistro',    plural: 'sinistros',    rotulo: 'Sinistro',    icone: icone('aviso', 13) },
  { alvo: 'caso',        plural: 'casos',        rotulo: 'Caso',        icone: icone('chaveInglesa', 13) },
  { alvo: 'plano',       plural: 'planos',       rotulo: 'Plano de ação', icone: icone('pin', 13) },
  { alvo: 'acao',        plural: 'acoes',        rotulo: 'Ação 5W2H',     icone: icone('checkQuadrado', 13) },
  { alvo: 'ficha',       plural: 'fichas',       rotulo: 'Ficha recebida', icone: icone('entrada', 13) },
  { alvo: 'objetivo',    plural: 'objetivos',    rotulo: 'Objetivo',       icone: icone('bandeira', 13) },
  { alvo: 'indicador',  plural: 'indicadores',  rotulo: 'Indicador',      icone: icone('linha', 13) }
];

let layAlvo = 'contato';
let layPapel = '';        // '' = layout padrão da imobiliária
let layExiste = false;    // já existe layout salvo para esta combinação?
let layTodos = [];        // v1.309 — todos os layouts DESTE objeto (são poucos:
                          // um por papel). Guardados para o "começar a partir
                          // de" e o "copiar para outro papel" — os dois
                          // precisam enxergar o layout dos OUTROS papéis.
let layoutSecoes = [];
let layBusca = '';        // v1.187: filtro da paleta de campos
let layPassos = [];       // v1.187: pilha do Desfazer (estados anteriores)
let layoutCampos = {};
let layArrastando = null;

async function carregarLayouts() {
  const cx = document.getElementById('lay-secoes');
  if (!cx) return;
  // v1.767 — objeto personalizado que saiu (excluído, desativado) volta ao Contato
  if (!OBJETOS_LAYOUT.some(function (x) { return x.alvo === layAlvo; })) layAlvo = 'contato';
  const o = OBJETOS_LAYOUT.find(function (x) { return x.alvo === layAlvo; });

  // v1.187 — trocou de objeto ou de papel: o Desfazer não pode voltar
  // para o layout de OUTRA ficha, e a busca da paleta começa limpa.
  layPassos = [];
  layBusca = '';

  const r = await Promise.all([
    sb.from('campos_personalizados').select('*')
      .eq('empresa_id', empresaAtual).eq('objeto', o.plural)
      .is('excluido_em', null).eq('ativo', true).order('ordem'),
    sb.from('layouts_ficha').select('*').eq('empresa_id', empresaAtual).eq('objeto', layAlvo),
    // v1.767 — os campos de Relação de objetos personalizados que apontam
    // para ESTA ficha com "mostrar um cartão": viram cartões posicionáveis
    sb.from('campos_personalizados').select('*').eq('empresa_id', empresaAtual)
      .eq('tipo', 'relacao').eq('rel_cartao', true).eq('rel_objeto', o.plural)
      .is('excluido_em', null).eq('ativo', true)
  ]);
  // v1.767 — objeto personalizado: a definição de ficha (campo título,
  // cartões, chips) sai da MESMA função que a ficha usa (objetos-pers.js)
  const opLay = objetoPers(layAlvo);
  if (opLay && typeof objpMontarDefs === 'function') objpMontarDefs(opLay, r[0].data || [], layAlvo);
  if (typeof objpRegistrarCartoesRel === 'function')
    objpRegistrarCartoesRel(layAlvo, o.plural, (r[2] && r[2].data) || [], objetosPers);

  // OS CAMPOS VÊM DO DEFS, QUE É QUEM DESENHA A FICHA.
  //
  // Até a v1.138 vinham do CATALOGO, que define as LISTAS. Parecidos,
  // não iguais: o CATALOGO traz colunas calculadas da view (alerta,
  // dias_para_fim, imovel_endereco) que a ficha não tem, e não traz
  // campos que só existem na ficha. No Contrato a diferença era de nove
  // campos — entre eles multa_percentual, juros_mes_percentual e as
  // três de taxa_adm, as regras de dinheiro das v1.134 e v1.135.
  //
  // Oferecer campo que a ficha não tem é pior que não oferecer: ele
  // ocupa lugar no layout e o campoDaFicha() devolve null na hora de
  // desenhar. O CATALOGO segue como reserva para o caso improvável de
  // o ficha-defs.js não ter carregado.
  layoutCampos = {};
  const def = (typeof DEFS !== 'undefined' && DEFS[o.alvo]) || null;
  if (def) {
    def.campos.filter(function (f) { return !f.c.startsWith('_') && !f.pers; })
      .forEach(function (f) {
        // v1.187 — `largo` é o campo que ocupa a linha inteira na ficha
        // (observações, multiescolha, sim/não…). O editor precisa saber
        // disso para desenhar a seção como ela realmente vai sair.
        layoutCampos[f.c] = { r: f.r, tipo: rotuloTipoFicha(f.t), pers: false, largo: !!f.largo,
                              // v1.707 — o asterisco e o aviso da seção
                              obrig: !!f.obrig };
      });
  } else {
    const cat = (typeof CATALOGO !== 'undefined' && CATALOGO[o.plural]) || null;
    if (cat) cat.campos.filter(function (f) { return !f.pers && f.t !== 'dias'; }).forEach(function (f) {
      layoutCampos[f.c] = { r: f.r, tipo: rotuloTipoCat(f.t), pers: false, largo: !!f.largo };
    });
  }
  (r[0].data || []).forEach(function (c) {
    // no personalizado quem manda é o tipo: a mesma conta do
    // campoPersDaFicha() no layout-ficha.js
    const tf = (typeof TIPO_PERS_FICHA !== 'undefined' && TIPO_PERS_FICHA[c.tipo]) || 'texto';
    layoutCampos['personalizados->>' + c.chave] = {
      r: c.rotulo, tipo: rotuloTipoPers(c.tipo), pers: true,
      largo: (tf === 'textarea' || tf === 'multi')
    };
  });

  const todos = r[1].data || [];
  layTodos = todos;                       // v1.309
  const desteAlvo = todos.find(function (x) {
    return layPapel ? x.papel_id === layPapel : !x.papel_id;
  });
  layExiste = !!desteAlvo;

  // Layout de papel que ainda não existe COMEÇA do padrão da imobiliária —
  // e não do zero. Quem vai montar a ficha do Corretor quase sempre quer
  // partir da ficha normal e tirar coisas, não montar tudo de novo.
  const base = (desteAlvo && desteAlvo.secoes)
    || (layPapel ? (todos.find(function (x) { return !x.papel_id; }) || {}).secoes : null);

  // v1.208 — sem layout salvo, o editor abre com os campos de FÁBRICA
  // posicionados e os personalizados na paleta, esperando você. Tem de
  // ser a mesma regra do secoesPadrao() do layout-ficha.js, senão o
  // editor mostra uma ficha diferente da que a pessoa vê.
  // v1.663 — e, para quem tem layout de fábrica por tipo (Contato,
  // Caso, Lead), o editor abre com ELE — as mesmas seções, tipos e
  // cartões que a ficha mostra sem nada salvo. `layoutDeFabrica()` vive
  // no ficha-defs.js justamente para os dois lerem a mesma fonte.
  const fabrica = (typeof layoutDeFabrica === 'function') ? layoutDeFabrica(layAlvo) : null;
  layoutSecoes = (base && base.length)
    ? JSON.parse(JSON.stringify(base))
        // v1.711 — cartão que deixou de existir (ex.: 'papeis' do aluguel)
        // não entra na tela; some do layout no próximo Salvar
        .filter(function (s) { return !s.cartao || (typeof cartoesDaFicha !== 'function')
          || cartoesDaFicha(layAlvo).some(function (c) { return c.id === s.cartao; }); })
    : (fabrica && fabrica.length)
      ? fabrica
      : [{ titulo: 'Detalhes', colunas: 2,
           campos: Object.keys(layoutCampos)
             // v1.767 — no objeto personalizado todo campo é personalizado:
             // entram todos, como na ficha (secoesPadrao, layout-ficha.js)
             .filter(function (k) { return !layoutCampos[k].pers || !!opLay; }) }]
        // v1.841 — E OS CARTÕES FIXOS TAMBÉM. A ficha sem layout salvo nasce com
        // "Detalhes" + todos os cartões (secoesPadrao → cartoesPadrao, v1.235), mas
        // o editor abria só com "Detalhes": numa imobiliária nova (Contrato, Imóvel…)
        // a ficha mostrava os cartões todos e o editor dizia que não havia nenhum —
        // e quem salvava assim mandava todos para "fora" sem querer.
        .concat((typeof cartoesDaFicha === 'function' ? cartoesDaFicha(layAlvo) : []).map(function (c) {
          return { cartao: c.id, titulo: c.nome, campos: [], colunas: 2, larguras: {},
                   lado: c.lado === 'direita' ? 'direita' : 'principal', recolhida: false,
                   quando: null, largura: null };
        }));

    // v1.189 — os indicadores do topo. Sem escolha salva, os de fábrica.
  layChips = (desteAlvo && Array.isArray(desteAlvo.chips) && desteAlvo.chips.length)
    ? desteAlvo.chips.filter(function (id) {
        return layCatalogoChips().some(function (c) { return c.id === id; });
      })
    : layChipsPadrao();

  // v1.317 — os campos que o celular mostra primeiro. Sem escolha
  // salva, a lista fica VAZIA de propósito: vazia, a ficha do celular
  // usa os primeiros campos da primeira seção, que é o comportamento
  // de hoje. Um padrão inventado aqui viraria escolha sem dono.
  layCelular = (desteAlvo && Array.isArray(desteAlvo.celular))
    ? desteAlvo.celular.filter(function (id) { return !!layoutCampos[id]; })
    : [];

  desenharLayout();
}

function verLayoutDe(alvo) { layAlvo = alvo; carregarLayouts(); }
function verLayoutDoPapel(id) { layPapel = id || ''; carregarLayouts(); }

// ============================================================
// v1.707 — O EDITOR EM TRÊS PAINÉIS (27/09/2026)
//
// O jeito do Lightning App Builder, aprovado em mockup
// (Outros/Mockup-Layout-Ficha-Editor): campos à ESQUERDA, a ficha
// inteira no MEIO — do jeito que ela vai ficar, com a faixa do topo e
// as duas colunas — e, à DIREITA, as opções do que está selecionado.
//
// Antes tudo ficava empilhado numa página só, e cada seção carregava
// na mesma linha os chips de tipo, quatro seletores e o ✕. O Rodrigo
// achou "complicado, misturado, muita informação espalhada". Agora o
// cabeçalho da seção só diz o que ela é; quem quer mudar clica nela e
// mexe no painel da direita.
//
// O que NÃO mudou: o modelo (layoutSecoes, layChips, layCelular,
// layoutCampos), o que se grava (layMontarSecoes/layGravar), o arrasto
// de campo (layPegar/laySolta) e o Desfazer. É outra tela em cima do
// mesmo motor.
// ============================================================
let laySel = null;          // { tipo: 'secao'|'cartao'|'campo'|'topo'|'celular', i, id }
let layVerComo = '';        // '' = a ficha inteira; um tipo = o que aquele tipo vê
let layDisp = 'desk';       // 'desk' | 'cel' — o botão Desktop / Celular
let layPaletaAba = 'campos';
let laySecArrastando = null;

// o desenho de contorno do monitor, só desta tela (o celular já existe
// no base.js: icone('celular'))
const LAY_ICO_MONITOR = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none"' +
  ' stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"' +
  ' aria-hidden="true"><rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M8 20.5h8M12 16.5v4"/></svg>';

function desenharLayout() {
  layConferirSelecao();
  desenharLayBarra();
  desenharLayPaleta();
  desenharLayTela();
  desenharLayProps();
}

/** a seleção sobrevive ao redesenho — mas não a um índice que sumiu */
function layConferirSelecao() {
  if (!laySel) return;
  const t = laySel.tipo;
  if (t === 'secao' || t === 'cartao' || t === 'campo') {
    const s = layoutSecoes[laySel.i];
    if (!s || (t === 'secao' && s.cartao) || (t === 'cartao' && !s.cartao) ||
        (t === 'campo' && (s.campos || []).indexOf(laySel.id) < 0)) laySel = null;
  }
  if (t === 'celular' && layDisp !== 'cel') laySel = null;
  if (t === 'topo' && (layDisp === 'cel' || !layCatalogoChips().length)) laySel = null;
}

function laySelecionar(tipo, i, id, el) {
  laySel = { tipo: tipo, i: (typeof i === 'number') ? i : null, id: id || null };
  // só a classe muda na tela — redesenhar aqui tiraria o foco do nome
  // da seção que a pessoa acabou de clicar
  document.querySelectorAll('#lay-secoes .sel').forEach(function (e) { e.classList.remove('sel'); });
  if (el) el.classList.add('sel');
  desenharLayProps();
}

/** clique no fundo da tela (fora de qualquer parte) = nada selecionado */
function layDesselecionar(ev) {
  const c = ev.target.classList;
  if (!(ev.target === ev.currentTarget || c.contains('lay3-dica') || c.contains('lay3-ficha') ||
        c.contains('lay3-col') || c.contains('rotcol') || c.contains('lay3-fone-wrap'))) return;
  laySel = null;
  document.querySelectorAll('#lay-secoes .sel').forEach(function (e) { e.classList.remove('sel'); });
  desenharLayProps();
}

function layVer(tipo) { layVerComo = tipo || ''; desenharLayout(); }
function layDispositivo(m) { layDisp = (m === 'cel') ? 'cel' : 'desk'; laySel = null; desenharLayout(); }
function layPaleta(aba) { layPaletaAba = (aba === 'cartoes') ? 'cartoes' : 'campos'; desenharLayPaleta(); }

function layEstadoTexto() {
  return (layExiste ? 'layout próprio salvo'
    : (layPapel ? 'sem layout próprio — o que aparece é uma cópia do padrão'
                : 'sem layout salvo — o que aparece é o do sistema'));
}

// ---------- a barra: objeto · vale para · ver como · desktop/celular · ações ----------
function desenharLayBarra() {
  const t = layTipoDoObjeto();
  document.getElementById('lay-barra').innerHTML =
    '<div class="obj-abas">' + OBJETOS_LAYOUT.map(function (o) {
      return '<button class="obj-aba' + (o.alvo === layAlvo ? ' on' : '') + '"' +
             ' onclick="verLayoutDe(\'' + o.alvo + '\')">' + o.icone + ' ' + htm(o.rotulo) + '</button>';
    }).join('') + '</div>' +
    '<span class="lay3-sep"></span>' +
    '<span class="lay3-vale"><label>vale para</label>' +
    '<select onchange="verLayoutDoPapel(this.value)">' +
    '<option value=""' + (layPapel ? '' : ' selected') + '>Todo mundo (padrão da imobiliária)</option>' +
    papeis.map(function (p) {
      return '<option value="' + p.id + '"' + (layPapel === p.id ? ' selected' : '') + '>' +
             'Somente o papel ' + htm(p.nome) + '</option>';
    }).join('') + '</select></span>' +
    (t ? '<span class="lay3-sep"></span><span class="lay3-vercomo"><span class="rot">ver como</span>' +
         '<span class="sel-funil-mini">' + [''].concat(t.opcoes).map(function (o) {
           return '<button type="button" class="' + (o === layVerComo ? 'on' : '') + '"' +
             ' onclick="layVer(\'' + jsq(o) + '\')">' + (o ? htm(o) : 'Todos') + '</button>';
         }).join('') + '</span></span>' : '') +
    '<span class="lay3-sep"></span>' +
    '<span class="lay3-disp">' +
    '<button type="button" class="' + (layDisp === 'desk' ? 'on' : '') + '"' +
    ' onclick="layDispositivo(\'desk\')">' + LAY_ICO_MONITOR + 'Desktop</button>' +
    '<button type="button" class="' + (layDisp === 'cel' ? 'on' : '') + '"' +
    ' onclick="layDispositivo(\'cel\')">' + icone('celular', 14) + 'Celular</button></span>' +
    '<div class="lay3-acoes">' +
    '<span class="lay-estado">' + htm(layEstadoTexto()) + '</span>' +
    (layPassos.length ? '<span class="lay3-naosalvo">alterações não salvas</span>' : '') +
    '<button class="btn btn-claro" onclick="layDesfazer()"' + (layPassos.length ? '' : ' disabled') + '>Desfazer</button>' +
    '<button class="btn" onclick="salvarLayout()">Salvar layout</button></div>';
}

// ---------- a paleta: campos (fora / na ficha) ou cartões ----------
function layNormaliza(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function layPilula(id, origem) {
  if (ehEspacoAdmin(id)) {
    const selE = laySel && laySel.tipo === 'campo' && laySel.i === origem && laySel.id === id;
    return '<div class="lay-campo espaco' + (selE ? ' sel' : '') + '" draggable="true" data-id="' + htm(id) + '"' +
           ' data-de="' + origem + '" ondragstart="layPegar(event)" ondragend="laySoltou()"' +
           (origem === 'fora' ? '' : ' onclick="event.stopPropagation(); laySelecionar(\'campo\', ' + origem + ', \'' + jsq(id) + '\', this)"') + '>' +
           '<span class="lay-nome">Espaço em branco</span>' +
           '<span class="lay-tipo">só empurra o próximo campo</span>' +
           (origem === 'fora' ? '' :
             '<button class="lay-larg lay-tira" onclick="event.stopPropagation(); layTirarCampo(' + origem + ', \'' + jsq(id) + '\')"' +
             ' title="Tirar da ficha" draggable="false">✕</button>') + '</div>';
  }
  const c = layoutCampos[id];
  if (!c) return '';
  const largo = layEhLargo(id, origem);
  const sel = laySel && laySel.tipo === 'campo' && laySel.i === origem && laySel.id === id;
  return '<div class="lay-campo' + (c.pers ? ' pers' : '') + (largo ? ' largo' : '') + (sel ? ' sel' : '') +
         '" draggable="true"' +
         ' data-id="' + htm(id) + '" data-de="' + origem + '"' +
         ' ondragstart="layPegar(event)" ondragend="laySoltou()"' +
         (origem === 'fora' ? '' : ' onclick="event.stopPropagation(); laySelecionar(\'campo\', ' + origem + ', \'' + jsq(id) + '\', this)"') + '>' +
         '<span class="lay-nome">' + htm(c.r) + (c.obrig ? '<b class="lay3-ob" title="obrigatório">*</b>' : '') + '</span>' +
         '<span class="lay-tipo">' + htm(c.tipo) +
         (largo ? ' <b class="lay-largo">linha inteira</b>' : '') + '</span>' +
         (origem === 'fora' ? '' :
           '<button class="lay-larg" onclick="event.stopPropagation(); layLargura(' + origem + ', \'' + jsq(id) + '\')"' +
           ' title="' + (largo ? 'Voltar para meia coluna' : 'Ocupar a linha inteira') + '"' +
           ' draggable="false">⇔</button>' +
           // v1.710 — o ✕ tira o campo da ficha sem precisar arrastá-lo
           // até a lista (pedido dele em 27/09)
           '<button class="lay-larg lay-tira" onclick="event.stopPropagation(); layTirarCampo(' + origem + ', \'' + jsq(id) + '\')"' +
           ' title="Tirar da ficha (volta para a lista)" draggable="false">✕</button>') +
         '</div>';
}

function desenharLayPaleta() {
  const el = document.getElementById('lay-paleta');
  if (!el) return;
  let html = '<div class="lay3-pal-abas">' +
    '<button type="button" class="' + (layPaletaAba === 'campos' ? 'on' : '') + '" onclick="layPaleta(\'campos\')">Campos</button>' +
    '<button type="button" class="' + (layPaletaAba === 'cartoes' ? 'on' : '') + '" onclick="layPaleta(\'cartoes\')">Cartões</button></div>';

  if (layPaletaAba === 'cartoes') {
    const fora = layCartoesFora();
    const dentro = layoutSecoes.filter(function (s) { return s.cartao; });
    html += '<div class="lay3-pal-grupo">Fora da ficha <span class="q">' + fora.length + ' · clique para trazer</span></div>' +
      '<div class="lay3-pal-lista">' + (fora.map(function (c) {
        return '<button type="button" class="lay3-pal-cartao" onclick="layTrazerCartao(\'' + jsq(c.id) + '\')">' +
          '<span class="n">+ ' + htm(c.nome) + '</span>' + (c.dica ? '<span class="d">' + htm(c.dica) + '</span>' : '') + '</button>';
      }).join('') || '<div class="lay-vazio">todos os cartões estão na ficha</div>') + '</div>' +
      '<div class="lay3-pal-grupo">Na ficha <span class="q">' + dentro.length + '</span></div>' +
      '<div class="lay3-pal-lista">' + dentro.map(function (s) {
        return '<div class="lay3-pal-cartao usado"><span class="n">' + htm(s.titulo || s.cartao) + '</span></div>';
      }).join('') + '</div>';
    el.innerHTML = html;
    return;
  }

  const usados = {};
  layoutSecoes.forEach(function (s) { (s.campos || []).forEach(function (k) { usados[k] = 1; }); });
  const alvoBusca = layNormaliza(layBusca.trim());
  const bate = function (id) {
    const c = layoutCampos[id];
    return !alvoBusca || layNormaliza((c && c.r) || '').indexOf(alvoBusca) > -1;
  };
  const ids = Object.keys(layoutCampos).filter(bate);
  html += '<div class="lay3-pal-busca"><input class="lay-busca" id="lay-busca" placeholder="Buscar campo…"' +
    ' value="' + htm(layBusca) + '" oninput="layBuscar(this.value)"></div>';

  if (layDisp === 'cel') {
    // no celular a pergunta é outra: o que ainda NÃO está na lista curta
    const noCel = {};
    (layCelular || []).forEach(function (k) { noCel[k] = 1; });
    const fora = ids.filter(function (k) { return !noCel[k]; });
    html += '<div class="lay3-pal-grupo">Fora do celular <span class="q">' + fora.length + ' · arraste para o telefone</span></div>' +
      '<div class="lay3-pal-lista">' + (fora.map(function (id) {
        const c = layoutCampos[id];
        return '<div class="lay-campo' + (c.pers ? ' pers' : '') + '" draggable="true" data-cel="' + htm(id) + '"' +
          ' data-dentro="0" ondragstart="layCelPegar(event)">' +
          '<span class="lay-nome">' + htm(c.r) + '</span><span class="lay-tipo">' + htm(c.tipo) + '</span></div>';
      }).join('') || '<div class="lay-vazio">' + (alvoBusca ? 'nenhum campo com esse nome' : 'todos os campos estão no celular') + '</div>') + '</div>';
    el.innerHTML = html;
    return;
  }

  const fora = ids.filter(function (k) { return !usados[k]; });
  const dentro = ids.filter(function (k) { return usados[k]; });
  html += '<div class="lay3-pal-grupo">Fora da ficha <span class="q">' + fora.length + ' · arraste para uma seção</span></div>' +
    // soltar aqui um campo da ficha = tirá-lo (o mesmo laySoltaFora de sempre)
    '<div class="lay3-pal-lista lay-alvo" id="lay-disponiveis" ondragover="laySobre(event)"' +
    ' ondragleave="laySai(event)" ondrop="laySoltaFora(event)">' +
    (fora.map(function (id) { return layPilula(id, 'fora'); }).join('') ||
     '<div class="lay-vazio">' + (alvoBusca ? 'nenhum campo com esse nome está fora da ficha'
                                            : 'todos os campos estão na ficha — solte aqui para tirar um') + '</div>') + '</div>' +
    '<div class="lay3-pal-grupo">Na ficha <span class="q">' + dentro.length + '</span></div>' +
    '<div class="lay3-pal-lista">' + dentro.map(function (id) {
      const c = layoutCampos[id];
      return '<div class="lay-campo usado' + (c.pers ? ' pers' : '') + '"><span class="lay-nome">' + htm(c.r) +
        (c.obrig ? '<b class="lay3-ob">*</b>' : '') + '</span><span class="lay-tipo">' + htm(c.tipo) + ' · já na ficha</span></div>';
    }).join('') + '</div>' +
    '<div class="lay3-pal-extras">' +
    '<button type="button" onclick="layNovaSecao()">+ Nova seção<small>nasce no fim da coluna principal</small></button>' +
    '<button type="button" onclick="layNovoEspaco()">+ Espaço em branco<small>uma célula vazia, na última seção</small></button></div>';
  el.innerHTML = html;
}

// ---------- a tela: a ficha como ela vai ficar ----------
function layResumoSecao(s) {
  const partes = [];
  if (!layQuandoLista(s.quando).length && layTipoDoObjeto()) partes.push('Todos');
  partes.push(s.colunas === 1 || s.lado === 'direita' ? '1 coluna' : '2 colunas');
  if (s.largura === 'metade') partes.push('meia linha');
  if (s.largura === 'quarto') partes.push('um quarto');
  return partes.join(' · ');
}

function layApagada(s) {
  const q = layQuandoLista(s.quando);
  return !!(layVerComo && q.length && q.indexOf(layVerComo) < 0);
}

function layDesenharSecao(i) {
  const s = layoutSecoes[i];
  if (s.cartao) return layLinhaDeCartao(s, i);
  const q = layQuandoLista(s.quando);
  const sel = laySel && laySel.tipo === 'secao' && laySel.i === i;
  const g = (s.colunas === 1 || s.lado === 'direita') ? 'g1' : 'g2';
  return '<div class="lay-secao lay3-sec' + (q.length ? ' so-tipo' : '') + (sel ? ' sel' : '') +
    (layApagada(s) ? ' apagada' : '') + '" data-i="' + i + '"' +
    ' onclick="laySelecionar(\'secao\', ' + i + ', null, this)"' + laySecArrasto(i) + '>' +
    '<div class="lay-secao-topo" onmousedown="laySecArmar(event)">' +
    '<span class="lay3-pux" tabindex="0" title="Arraste o cabeçalho para mudar de lugar (ou ↑ ↓ com este em foco)"' +
    ' onkeydown="laySecTecla(event, ' + i + ')" onclick="event.stopPropagation()">⠿</span>' +
    '<input class="lay-titulo" value="' + htm(s.titulo || '') + '" placeholder="Nome da seção"' +
    ' onchange="layTitulo(' + i + ', this.value)"' +
    ' onclick="event.stopPropagation(); laySelecionar(\'secao\', ' + i + ', null, this.parentNode.parentNode)">' +
    (q.length ? '<span class="lay3-quem">' + q.map(function (x) { return '<span>' + htm(x) + '</span>'; }).join('') + '</span>' : '') +
    '<span class="lay3-resumo">' + htm(layResumoSecao(s)) + '</span>' +
    (s.recolhida ? '<span class="lay3-rec" title="Começa recolhida">▸</span>' : '') +
    '</div>' +
    '<div class="lay-corpo ' + g + '">' +
    '<div class="lay-alvo ' + g + '" data-secao="' + i + '"' +
    ' ondragover="laySobre(event)" ondragleave="laySai(event)" ondrop="laySolta(event, ' + i + ')">' +
    ((s.campos || []).map(function (id) { return layPilula(id, i); }).join('')
      || '<div class="lay-vazio">arraste campos para cá</div>') +
    '</div></div></div>';
}

/** v1.235 — a linha de um cartão fixo, agora sem controle nenhum: o que
 *  ele tem para configurar aparece no painel da direita ao clicar */
function layLinhaDeCartao(s, i) {
  const def = (typeof cartoesDaFicha === 'function' ? cartoesDaFicha(layAlvo) : [])
    .find(function (c) { return c.id === s.cartao; }) || {};
  const nome = def.nome || s.titulo || s.cartao;
  const q = layQuandoLista(s.quando);
  const sel = laySel && laySel.tipo === 'cartao' && laySel.i === i;
  return '<div class="lay-secao lay3-sec lay-fixo' + (q.length ? ' so-tipo' : '') + (sel ? ' sel' : '') +
    (layApagada(s) ? ' apagada' : '') + '" data-i="' + i + '"' +
    ' onclick="laySelecionar(\'cartao\', ' + i + ', null, this)"' + laySecArrasto(i) + '>' +
    '<div class="lay-secao-topo" onmousedown="laySecArmar(event)">' +
    '<span class="lay3-pux" tabindex="0" title="Arraste o cabeçalho para mudar de lugar (ou ↑ ↓ com este em foco)"' +
    ' onkeydown="laySecTecla(event, ' + i + ')" onclick="event.stopPropagation()">⠿</span>' +
    '<div class="lay-fixo-nome">' + htm(nome) + ' <span class="lay-tag-fixo">cartão fixo</span></div>' +
    (q.length ? '<span class="lay3-quem">' + q.map(function (x) { return '<span>' + htm(x) + '</span>'; }).join('') + '</span>' : '') +
    (s.recolhida ? '<span class="lay3-rec" title="Começa recolhido">▸</span>' : '') +
    '</div></div>';
}

/** a faixa de indicadores, no lugar dela: no alto da ficha */
function layFaixaTopo() {
  const cat = layCatalogoChips();
  if (!cat.length) return '';
  const o = OBJETOS_LAYOUT.find(function (x) { return x.alvo === layAlvo; }) || {};
  const sel = laySel && laySel.tipo === 'topo';
  return '<div class="lay3-destaque' + (sel ? ' sel' : '') + '" onclick="laySelecionar(\'topo\', null, null, this)">' +
    '<div class="nome"><span class="t">' + htm(o.rotulo || '') + ' · o nome do registro</span>' +
    '<span class="c">os botões da ficha ficam aqui</span></div>' +
    '<div class="faixa" ondragover="laySobre(event)" ondragleave="laySai(event)" ondrop="layChipSolta(event)">' +
    (layChips || []).map(function (id) {
      const c = cat.find(function (x) { return x.id === id; });
      return c ? '<div class="chip" draggable="true" data-chip="' + htm(c.id) + '" data-dentro="1"' +
        ' ondragstart="layChipPegar(event)" title="' + htm(c.conta ? 'o CRM calcula' : 'campo do cadastro') + '">' +
        '<span class="r">' + htm(c.r) + '</span><span class="v">—</span>' +
        '<button type="button" class="x" title="Tirar da faixa"' +
        ' onclick="event.stopPropagation(); layChipTirar(\'' + jsq(c.id) + '\')">✕</button></div>' : '';
    }).join('') +
    '<span class="solte">' + ((layChips || []).length
      ? (layChips.length + ' de ' + LAY_MAX_CHIPS + ' · solte um indicador aqui')
      : 'sem indicador a faixa fica escondida · clique para escolher') + '</span>' +
    '</div></div>';
}

function desenharLayTela() {
  const cx = document.getElementById('lay-secoes');
  if (!cx) return;
  if (layDisp === 'cel') { cx.innerHTML = layTelaCelular(); return; }
  const principal = [], direita = [];
  layoutSecoes.forEach(function (s, i) { (s.lado === 'direita' ? direita : principal).push(i); });
  cx.innerHTML =
    '<div class="lay3-dica">É assim que a ficha vai ficar' +
    (layVerComo ? ' para o tipo <b>' + htm(layVerComo) + '</b> — o que está apagado não aparece para ele' : '') +
    '. Clique numa parte para ver as opções dela à direita.</div>' +
    layFaixaTopo() +
    '<div class="lay3-ficha">' +
    '<div class="lay3-col" ondragover="laySecSobre(event)" ondragleave="laySai(event)" ondrop="laySecSolta(event, \'principal\')">' +
    '<div class="rotcol">Coluna principal</div>' +
    principal.map(layDesenharSecao).join('') +
    '<div class="lay3-add" onclick="layNovaSecao()">+ Nova seção</div></div>' +
    '<div class="lay3-col" ondragover="laySecSobre(event)" ondragleave="laySai(event)" ondrop="laySecSolta(event, \'direita\')">' +
    '<div class="rotcol">Coluna da direita <span class="q">· 400px, sempre 1 coluna</span></div>' +
    direita.map(layDesenharSecao).join('') +
    '<div class="lay3-add q">solte aqui uma seção ou um cartão</div></div>' +
    '</div>';
}

/** o modo Celular: a moldura do telefone, com a faixa e o bloco
 *  "aparecem primeiro" (o Compact Layout, v1.317) */
function layTelaCelular() {
  const cat = layCatalogoChips();
  const o = OBJETOS_LAYOUT.find(function (x) { return x.alvo === layAlvo; }) || {};
  const sel = laySel && laySel.tipo === 'celular';
  layCelular = layCelular || [];
  const cartoes = layoutSecoes.filter(function (s) { return s.cartao; });
  return '<div class="lay3-dica">No celular a ficha mostra primeiro só o que você escolher (até ' + LAY_MAX_CEL +
    ' campos). O resto fica atrás de "Ver todos os campos". Clique no bloco para editar à direita.</div>' +
    '<div class="lay3-fone-wrap"><div class="lay3-fone">' +
    '<div class="cab">' + htm(o.rotulo || '') + ' · o nome do registro<span class="c">a faixa de indicadores vem logo abaixo</span></div>' +
    (cat.length && layChips && layChips.length ? '<div class="chips">' + layChips.map(function (id) {
      const c = cat.find(function (x) { return x.id === id; });
      return c ? '<div class="chip"><span class="r">' + htm(c.r) + '</span><span class="v">—</span></div>' : '';
    }).join('') + '</div>' : '') +
    '<div class="bloco' + (sel ? ' sel' : '') + '" onclick="laySelecionar(\'celular\', null, null, this)">' +
    '<div class="bt"><span>Aparecem primeiro</span><span>' + layCelular.length + ' de ' + LAY_MAX_CEL + '</span></div>' +
    '<div class="cel-previa" ondragover="laySobre(event)" ondragleave="laySai(event)" ondrop="layCelSolta(event)">' +
    layCelular.map(function (id) {
      const c = layoutCampos[id];
      return c ? '<div class="cel-linha" draggable="true" data-cel="' + htm(id) + '" data-dentro="1"' +
        ' ondragstart="layCelPegar(event)"><span class="r">' + htm(c.r) + '</span><span class="v">—</span></div>' : '';
    }).join('') +
    (layCelular.length ? '' : '<div class="cel-linha vazio">sem escolha, o celular mostra os primeiros campos da primeira seção</div>') +
    '<div class="cel-linha solte">solte um campo aqui</div></div>' +
    '<div class="mais">Ver todos os campos ›</div></div>' +
    (cartoes.length ? '<div class="cartoes">' + cartoes.map(function (s) {
      return '<span>' + htm(s.titulo || s.cartao) + '</span>';
    }).join('') + '</div>' : '') +
    '</div></div>';
}

// ---------- arrastar a seção pelo cabeçalho ----------
// O mesmo desenho do Funil (v1.496), que é o arrasto que funciona em
// produção: a seção só fica `draggable` quando o mouse desce no
// cabeçalho — fora do campo de nome, para selecionar texto não virar
// arrasto — e volta a não ser no dragend. Na primeira versão da 1.707
// só o ⠿ arrastava: pequeno e cinza, ninguém achava (27/09/2026).
function laySecArrasto(i) {
  return ' ondragstart="laySecPegar(event, ' + i + ')" ondragend="laySecSoltou(event)"' +
    ' ondragover="laySecSobreSec(event)" ondragleave="this.classList.remove(\'alvo-acima\', \'alvo-abaixo\')"';
}
function laySecArmar(ev) {
  const sec = ev.currentTarget.closest('.lay3-sec');
  if (!sec) return;
  const t = ev.target;
  sec.draggable = !(t.tagName === 'INPUT' || t.tagName === 'BUTTON' || t.tagName === 'SELECT');
}
function laySecPegar(ev, i) {
  // v1.710 — o dragstart de um CAMPO dentro da seção sobe até aqui. Sem
  // esta guarda a seção "roubava" o arrasto do campo (laySecArrastando
  // ficava setado e layArrastando ia a null), e o campo nunca mudava
  // de lugar — o defeito que o Rodrigo viu na 1.709 ("não consigo mover
  // o Número do imóvel"). Só vale quando é a própria seção arrastando.
  if (ev.target !== ev.currentTarget) return;
  laySecArrastando = i;
  layArrastando = null;
  if (ev.dataTransfer) {
    ev.dataTransfer.effectAllowed = 'move';
    try { ev.dataTransfer.setData('text/plain', 'secao:' + i); } catch (e) {}
  }
  ev.currentTarget.classList.add('arrastando');
}
function laySecSoltou(ev) {
  laySecArrastando = null;
  if (ev && ev.currentTarget) ev.currentTarget.draggable = false;
  document.querySelectorAll('.lay3-sec').forEach(function (e) {
    e.classList.remove('arrastando', 'alvo-acima', 'alvo-abaixo'); });
  document.querySelectorAll('.lay3-col.sobre').forEach(function (e) { e.classList.remove('sobre'); });
}
/** sobre OUTRA seção: a marca verde diz se cai antes ou depois dela */
function laySecSobreSec(ev) {
  if (laySecArrastando === null) return;
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
  const sec = ev.currentTarget;
  if (Number(sec.dataset.i) === laySecArrastando) return;
  const meio = sec.getBoundingClientRect().top + sec.offsetHeight / 2;
  sec.classList.toggle('alvo-acima', ev.clientY < meio);
  sec.classList.toggle('alvo-abaixo', ev.clientY >= meio);
}
function laySecSobre(ev) {
  if (laySecArrastando === null) return;      // campo arrastado não solta em coluna
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
  ev.currentTarget.classList.add('sobre');
}
function laySecSolta(ev, lado) {
  ev.currentTarget.classList.remove('sobre');
  if (laySecArrastando === null) return;
  ev.preventDefault();
  const de = laySecArrastando;
  laySecArrastando = null;
  const s = layoutSecoes[de];
  if (!s) return;
  // a posição é quantas seções DESTA coluna ficam acima do ponteiro
  const acima = [];
  [].slice.call(ev.currentTarget.querySelectorAll('.lay3-sec')).forEach(function (e) {
    const r = e.getBoundingClientRect();
    const k = Number(e.dataset.i);
    if (k !== de && ev.clientY > r.top + r.height / 2) acima.push(layoutSecoes[k]);
  });
  layGuardar();
  const selObj = (laySel && typeof laySel.i === 'number') ? layoutSecoes[laySel.i] : null;
  const resto = layoutSecoes.filter(function (x, k) { return k !== de; });
  s.lado = (lado === 'direita') ? 'direita' : 'principal';
  let pos;
  if (acima.length) pos = resto.indexOf(acima[acima.length - 1]) + 1;
  else {
    const primeira = resto.findIndex(function (x) { return (x.lado === 'direita' ? 'direita' : 'principal') === s.lado; });
    pos = primeira < 0 ? resto.length : primeira;
  }
  resto.splice(pos, 0, s);
  layoutSecoes = resto;
  if (selObj) laySel.i = layoutSecoes.indexOf(selObj);
  desenharLayout();
}
function laySecTecla(ev, i) {
  if (ev.key === 'ArrowUp') { ev.preventDefault(); layMoverSecao(i, -1); }
  if (ev.key === 'ArrowDown') { ev.preventDefault(); layMoverSecao(i, 1); }
}

// ---------- o painel da direita: as opções do que está selecionado ----------
function laySeg(opcoes, atual, chamada, travado) {
  return '<span class="lay3-seg' + (travado ? ' off' : '') + '">' + opcoes.map(function (o) {
    return '<button type="button" class="' + (String(o.v) === String(atual) ? 'on' : '') + '"' +
      (travado ? ' disabled' : ' onclick="' + chamada.replace('%v', jsq(o.v)) + '"') + '>' + htm(o.r) + '</button>';
  }).join('') + '</span>';
}

function layObrigatoriosDaSecao(s) {
  return (s.campos || []).map(function (id) { return layoutCampos[id]; })
    .filter(function (c) { return c && c.obrig; }).map(function (c) { return c.r; });
}

/** os dois seletores de clonar, agora no painel "Layout" */
function layClonar() {
  let html = '';
  const moldes = layMoldes();
  if (!layExiste && moldes.length) {
    html += '<div class="op"><label>Começar a partir de</label>' +
      '<select onchange="layComecarDe(this.value)"' +
      ' title="Traz as seções de outro layout para a tela. Nada é salvo até você clicar em Salvar.">' +
      '<option value="">escolha um layout…</option>' +
      moldes.map(function (m) {
        return '<option value="' + htm(m.papel_id || 'padrao') + '">' + htm(layNomeDoPapel(m.papel_id)) + '</option>';
      }).join('') + '</select></div>';
  }
  const destinos = (layPapel ? [{ id: '', nome: layNomeDoPapel(null) }] : [])
    .concat(papeis.filter(function (p) { return p.id !== layPapel; })
      .map(function (p) { return { id: p.id, nome: p.nome }; }));
  if (destinos.length && layoutSecoes.length) {
    html += '<div class="op"><label>Copiar este layout para</label>' +
      '<select onchange="layCopiarPara(this.value)" title="Salva o layout que está na tela também para outro papel">' +
      '<option value="">escolha o papel…</option>' +
      destinos.map(function (d) {
        return '<option value="' + htm(d.id || 'padrao') + '">' + htm(d.nome) + '</option>';
      }).join('') + '</select>' +
      '<span class="q">Vale o que você vê agora, tenha sido salvo ou não.</span></div>';
  }
  return html;
}

function desenharLayProps() {
  const el = document.getElementById('lay-props');
  if (!el) return;
  const t = layTipoDoObjeto();
  let cab, corpo = '';
  const s = laySel && typeof laySel.i === 'number' ? layoutSecoes[laySel.i] : null;

  if (!laySel) {
    const o = OBJETOS_LAYOUT.find(function (x) { return x.alvo === layAlvo; }) || {};
    const nSec = layoutSecoes.filter(function (x) { return !x.cartao; }).length;
    const nCart = layoutSecoes.length - nSec;
    const nCampos = layoutSecoes.reduce(function (n, x) {
      return n + (x.campos || []).filter(function (k) { return !ehEspacoAdmin(k); }).length; }, 0);
    cab = ['Layout', (o.rotulo || layAlvo) + ' · ' + layNomeDoPapel(layPapel || null)];
    corpo = '<div class="lay3-vazio">Clique numa <b>seção</b>, num <b>cartão</b>, num <b>campo</b>' +
      (layCatalogoChips().length ? ' ou na <b>faixa do topo</b>' : '') + ' para ver as opções aqui.</div>' +
      '<div class="op"><label>Este layout</label>' +
      '<div class="kv"><span class="k">Vale para</span><span>' + htm(layNomeDoPapel(layPapel || null)) + '</span></div>' +
      '<div class="kv"><span class="k">Estado</span><span>' + htm(layEstadoTexto()) + '</span></div>' +
      '<div class="kv"><span class="k">Seções</span><span>' + nSec + '</span></div>' +
      '<div class="kv"><span class="k">Campos na ficha</span><span>' + nCampos + ' de ' + Object.keys(layoutCampos).length + '</span></div>' +
      '<div class="kv"><span class="k">Cartões</span><span>' + nCart + '</span></div></div>' +
      layClonar() +
      '<div class="rod"><button type="button" class="perigo" onclick="restaurarLayout()">' +
      (layPapel ? 'Apagar o layout deste papel (volta ao padrão)' : 'Voltar ao layout do sistema') + '</button></div>';

  } else if (laySel.tipo === 'secao' && s) {
    const i = laySel.i;
    const obrig = layObrigatoriosDaSecao(s);
    const direita = s.lado === 'direita';
    cab = ['Seção', s.titulo || 'Sem nome'];
    corpo = '<div class="op"><label>Nome da seção</label><input type="text" value="' + htm(s.titulo || '') +
      '" placeholder="Nome da seção" onchange="layTitulo(' + i + ', this.value)"></div>' +
      (t ? '<div class="op"><label>Aparece para</label>' + laySeletorQuando(s, i) +
        (obrig.length ? '<div class="aviso">Esta seção tem campo obrigatório: <b>' + htm(obrig.join(', ')) +
          '</b>. Se ela deixar de aparecer para um tipo, ele deixa de ser cobrado nele.</div>'
          : '<span class="q">Nenhum marcado = aparece em todos os tipos.</span>') + '</div>' : '') +
      '<div class="op"><label>Quando abre a ficha</label>' +
      laySeg([{ v: '0', r: 'Começa aberta' }, { v: '1', r: 'Começa recolhida' }], s.recolhida ? '1' : '0', 'layRecolhida(' + i + ', \'%v\')') + '</div>' +
      '<div class="op"><label>Onde fica</label>' +
      laySeg([{ v: 'principal', r: 'Coluna principal' }, { v: 'direita', r: 'Coluna da direita' }], direita ? 'direita' : 'principal', 'layLado(' + i + ', \'%v\')') + '</div>' +
      '<div class="op"><label>Campos em</label>' +
      laySeg([{ v: '2', r: '2 colunas' }, { v: '1', r: '1 coluna' }], (s.colunas === 1 || direita) ? '1' : '2', 'layColunas(' + i + ', \'%v\')', direita) +
      (direita ? '<span class="q">Na coluna da direita o cartão é sempre de uma coluna.</span>' : '') + '</div>' +
      '<div class="op"><label>Largura da seção</label>' +
      laySeg([{ v: '', r: 'Linha inteira' }, { v: 'metade', r: 'Meia' }, { v: 'quarto', r: 'Um quarto' }],
        (s.largura === 'metade' || s.largura === 'quarto') ? s.largura : '', 'layLarguraSecao(' + i + ', \'%v\')', direita) +
      (direita ? '' : '<span class="q">Meia e um quarto servem para pôr seções lado a lado, como Vigência · Cobrança · Reajuste no contrato.</span>') + '</div>' +
      '<div class="rod"><button type="button" class="perigo" onclick="layRemoverSecao(' + i + ')">Remover a seção' +
      ((s.campos || []).length ? ' (os ' + (s.campos || []).length + ' campos voltam para a lista)' : '') + '</button></div>';

  } else if (laySel.tipo === 'cartao' && s) {
    const i = laySel.i;
    const def = (typeof cartoesDaFicha === 'function' ? cartoesDaFicha(layAlvo) : [])
      .find(function (c) { return c.id === s.cartao; }) || {};
    cab = ['Cartão fixo', def.nome || s.titulo || s.cartao];
    corpo = '<div class="q">' + (def.dica ? htm(def.dica) + '. ' : '') +
      'O conteúdo deste cartão é feito pelo sistema: aqui só se escolhe para quem aparece, onde e como nasce.</div>' +
      (t ? '<div class="op"><label>Aparece para</label>' + laySeletorQuando(s, i) + '</div>' : '') +
      '<div class="op"><label>Quando abre a ficha</label>' +
      laySeg([{ v: '0', r: 'Começa aberto' }, { v: '1', r: 'Começa recolhido' }], s.recolhida ? '1' : '0', 'layRecolhida(' + i + ', \'%v\')') + '</div>' +
      '<div class="op"><label>Onde fica</label>' +
      laySeg([{ v: 'principal', r: 'Coluna principal' }, { v: 'direita', r: 'Coluna da direita' }], s.lado === 'direita' ? 'direita' : 'principal', 'layLado(' + i + ', \'%v\')') + '</div>' +
      '<div class="rod"><button type="button" class="perigo" onclick="layTirarCartao(' + i + ')">Tirar da ficha (volta para a aba Cartões)</button></div>';

  } else if (laySel.tipo === 'campo' && s) {
    const i = laySel.i, id = laySel.id;
    const c = layoutCampos[id];
    if (ehEspacoAdmin(id)) {
      cab = ['Espaço em branco', s.titulo || ''];
      corpo = '<div class="q">Uma célula vazia: só empurra o próximo campo para a outra coluna.</div>' +
        '<div class="rod"><button type="button" class="perigo" onclick="layTirarCampo(' + i + ', \'' + jsq(id) + '\')">Tirar da ficha</button></div>';
    } else {
      const largo = layEhLargo(id, i);
      cab = ['Campo', (c && c.r) || id];
      corpo = '<div class="kv"><span class="k">Tipo</span><span>' + htm((c && c.tipo) || '') + '</span></div>' +
        '<div class="kv"><span class="k">Obrigatório</span><span>' + (c && c.obrig ? 'Sim (regra do sistema)' : 'Não') + '</span></div>' +
        '<div class="kv"><span class="k">Está em</span><span>' + htm(s.titulo || '') + '</span></div>' +
        (c && c.pers ? '<div class="kv"><span class="k">Origem</span><span>campo personalizado</span></div>' : '') +
        '<div class="op"><label>Largura</label>' +
        laySeg([{ v: '0', r: 'Meia coluna' }, { v: '1', r: 'Linha inteira' }], largo ? '1' : '0',
          'layLarguraDefinir(' + i + ', \'' + jsq(id) + '\', \'%v\')', s.colunas === 1 || s.lado === 'direita') +
        (s.colunas === 1 || s.lado === 'direita' ? '<span class="q">Numa seção de uma coluna todo campo ocupa a linha.</span>' : '') + '</div>' +
        '<div class="q">Para mudar o nome que aparece na tela, use o <b>Gerenciador de objetos</b> (Editar, no campo). ' +
        'Para esconder de um papel, <b>Papéis e permissões</b> — layout não é segurança.</div>' +
        '<div class="rod"><button type="button" class="perigo" onclick="layTirarCampo(' + i + ', \'' + jsq(id) + '\')">Tirar da ficha (volta para a lista)</button></div>';
    }

  } else if (laySel.tipo === 'topo') {
    const cat = layCatalogoChips();
    const usados = {};
    (layChips || []).forEach(function (id) { usados[id] = 1; });
    const fora = cat.filter(function (c) { return !usados[c.id]; });
    cab = ['Cartão do topo', 'a faixa de indicadores'];
    corpo = '<div class="q">Os indicadores da faixa logo abaixo do nome, em toda ficha. Até ' + LAY_MAX_CHIPS +
      ': acima disso a faixa quebra em duas linhas. Verde = o CRM calcula; azul = campo do cadastro.</div>' +
      '<div class="op"><label>Na faixa · ' + (layChips || []).length + ' de ' + LAY_MAX_CHIPS + '</label>' +
      '<div class="lay3-lista" ondragover="laySobre(event)" ondragleave="laySai(event)" ondrop="layChipSolta(event)">' +
      ((layChips || []).map(function (id) {
        const c = cat.find(function (x) { return x.id === id; });
        return c ? '<div class="item' + (c.conta ? ' conta' : '') + '" draggable="true" data-chip="' + htm(c.id) + '" data-dentro="1"' +
          ' ondragstart="layChipPegar(event)"><span class="pux">⠿</span><span class="n">' + htm(c.r) + '</span>' +
          '<button type="button" class="x" title="Tirar da faixa" onclick="layChipTirar(\'' + jsq(c.id) + '\')">✕</button></div>' : '';
      }).join('') || '<div class="lay-vazio">a faixa fica escondida sem indicador</div>') + '</div></div>' +
      '<div class="op"><label>Disponíveis · ' + fora.length + '</label><div class="lay3-lista">' +
      (fora.map(function (c) {
        return '<div class="item' + (c.conta ? ' conta' : '') + ' fora" draggable="true" data-chip="' + htm(c.id) + '" data-dentro="0"' +
          ' ondragstart="layChipPegar(event)"><span class="n">' + htm(c.r) +
          (c.d ? '<small>' + htm(c.d) + '</small>' : '') + '</span>' +
          '<button type="button" class="mais" title="Pôr na faixa" onclick="layChipPor(\'' + jsq(c.id) + '\')">+</button></div>';
      }).join('') || '<div class="lay-vazio">todos estão na faixa</div>') + '</div></div>' +
      '<div class="rod"><button type="button" onclick="layChipsFabrica()">Voltar aos indicadores de fábrica</button></div>';

  } else if (laySel.tipo === 'celular') {
    layCelular = layCelular || [];
    cab = ['No celular', 'aparecem primeiro'];
    corpo = '<div class="q">Arraste campos da lista à esquerda para o telefone, ou reordene aqui. Sem escolha, o celular mostra os primeiros campos da primeira seção.</div>' +
      '<div class="op"><label>Aparecem primeiro · ' + layCelular.length + ' de ' + LAY_MAX_CEL + '</label>' +
      '<div class="lay3-lista" ondragover="laySobre(event)" ondragleave="laySai(event)" ondrop="layCelSolta(event)">' +
      (layCelular.map(function (id) {
        const c = layoutCampos[id];
        return c ? '<div class="item" draggable="true" data-cel="' + htm(id) + '" data-dentro="1" ondragstart="layCelPegar(event)">' +
          '<span class="pux">⠿</span><span class="n">' + htm(c.r) + '</span>' +
          '<button type="button" class="x" title="Tirar do celular" onclick="layCelTirar(\'' + jsq(id) + '\')">✕</button></div>' : '';
      }).join('') || '<div class="lay-vazio">nenhum campo escolhido</div>') + '</div></div>' +
      '<div class="rod"><button type="button" onclick="layCelLimpar()"' + (layCelular.length ? '' : ' disabled') +
      '>Limpar a escolha (usar a primeira seção)</button></div>';
  } else {
    laySel = null; desenharLayProps(); return;
  }

  el.innerHTML = '<div class="lay3-props-cab">' +
    (laySel ? '<button type="button" class="volta" title="Ver o layout inteiro" onclick="laySel = null; desenharLayout()">‹</button>' : '') +
    '<span><span class="t">' + htm(cab[0]) + '</span><span class="n">' + htm(cab[1]) + '</span></span></div>' +
    '<div class="lay3-props-corpo">' + corpo + '</div>';
}

// ---------- as ações que o painel chama ----------
function layLarguraDefinir(secao, id, v) {
  if (layEhLargo(id, secao) === (v === '1')) return;
  layLargura(secao, id);
}
function layTirarCampo(secao, id) {
  const s = layoutSecoes[secao];
  if (!s) return;
  layGuardar();
  s.campos = (s.campos || []).filter(function (k) { return k !== id; });
  if (s.larguras) delete s.larguras[id];
  laySel = { tipo: 'secao', i: secao, id: null };
  desenharLayout();
}
function layChipTirar(id) {
  layGuardar();
  layChips = (layChips || []).filter(function (k) { return k !== id; });
  desenharLayout();
}
function layChipPor(id) {
  if ((layChips || []).indexOf(id) > -1) return;
  if ((layChips || []).length >= LAY_MAX_CHIPS) {
    dialogoAvisar('A faixa comporta ' + LAY_MAX_CHIPS + ' indicadores. Tire um antes de pôr outro.'); return; }
  layGuardar();
  layChips = (layChips || []).concat([id]);
  desenharLayout();
}
function layChipsFabrica() {
  layGuardar();
  layChips = layChipsPadrao();
  desenharLayout();
}
function layCelTirar(id) {
  layGuardar();
  layCelular = (layCelular || []).filter(function (k) { return k !== id; });
  desenharLayout();
}
function layCelLimpar() {
  layGuardar();
  layCelular = [];
  desenharLayout();
}

function layRecolhida(i, v) {
  layGuardar();
  layoutSecoes[i].recolhida = (v === '1' || v === 1 || v === true);
  desenharLayout();
}

function layLado(i, v) {
  layGuardar();
  layoutSecoes[i].lado = (v === 'direita') ? 'direita' : 'principal';
  desenharLayout();
}

// ------------------------------------------------------------
// v1.309 — CLONAR LAYOUT
//
// Metade disto já existia: escolher um papel sem layout próprio abre
// uma CÓPIA do padrão da imobiliária, e não uma tela em branco. O que
// faltava era partir de OUTRO PAPEL (o do Gestor quase igual ao do
// Corretor) e mandar o que está na tela para outro papel sem ter de
// remontar tudo lá.
//
// Os dois são SELETORES que agem no change, como todos os controles
// deste editor — nada de campo com id próprio para ler depois.
// ------------------------------------------------------------

/** o nome do papel (ou o rótulo do padrão) de um layout guardado */
function layNomeDoPapel(id) {
  if (!id) return 'todo mundo (padrão da imobiliária)';
  const p = papeis.find(function (x) { return x.id === id; });
  return p ? p.nome : 'papel removido';
}

/** os layouts DESTE objeto que servem de molde para a seleção atual */
function layMoldes() {
  return layTodos.filter(function (x) {
    return Array.isArray(x.secoes) && x.secoes.length
      && (x.papel_id || null) !== (layPapel || null);
  });
}

function layComecarDe(v) {
  if (!v) return;
  const molde = layTodos.find(function (x) {
    return v === 'padrao' ? !x.papel_id : x.papel_id === v;
  });
  if (!molde || !Array.isArray(molde.secoes) || !molde.secoes.length) {
    dialogoAvisar('Esse layout não tem seções salvas.'); desenharLayout(); return;
  }
  layGuardar();
  // cópia FUNDA: sem ela, mexer numa seção aqui mexeria no molde
  // guardado em memória, e o "Desfazer" voltaria para um objeto que já
  // tinha sido alterado.
  layoutSecoes = JSON.parse(JSON.stringify(molde.secoes));
  if (Array.isArray(molde.chips) && molde.chips.length) layChips = molde.chips.slice();
  if (Array.isArray(molde.celular)) layCelular = molde.celular.slice();
  desenharLayout();
}

async function layCopiarPara(v) {
  if (!v) return;
  const destino = (v === 'padrao') ? null : v;
  const nome = layNomeDoPapel(destino);
  const jaTem = layTodos.some(function (x) {
    return (x.papel_id || null) === destino && Array.isArray(x.secoes) && x.secoes.length;
  });
  // O QUE VAI É O QUE ESTÁ NA TELA, salvo ou não. É de propósito — é o
  // que permite montar uma vez e distribuir — mas precisa estar dito,
  // senão alguém copia uma edição pela metade sem perceber.
  if (!(await dialogoPerguntar({ texto: (jaTem
      ? 'O layout de ' + nome + ' JÁ EXISTE e será SUBSTITUÍDO'
      : 'Criar o layout de ' + nome) +
      ' com o que está nesta tela?\n\nVale o que você vê agora, tenha sido salvo ou não.' }))) {
    desenharLayout(); return;
  }
  if (await layGravar(destino)) {
    // NÃO recarrego a tela aqui de propósito: `carregarLayouts()` traz de
    // volta o layout SALVO do papel que está sendo editado, e quem copiou
    // uma edição ainda não salva perderia o trabalho no ato de distribuí-la.
    // Em vez disso, anoto a cópia na lista em memória — é dela que os dois
    // seletores se servem.
    const copia = { objeto: layAlvo, papel_id: destino,
                    secoes: JSON.parse(JSON.stringify(layoutSecoes)),
                    chips: (layChips || []).slice(),
                    celular: (layCelular || []).slice() };
    const i = layTodos.findIndex(function (x) { return (x.papel_id || null) === destino; });
    if (i >= 0) layTodos[i] = Object.assign({}, layTodos[i], copia); else layTodos.push(copia);
    await dialogoAvisar('Layout copiado para ' + nome + '.');
  }
  desenharLayout();
}

// ------------------------------------------------------------
// v1.309 — EM QUE TIPO DE REGISTRO A SEÇÃO APARECE
//
// O objeto declara qual campo dele é o "tipo" (DEFS.<alvo>.tipoRegistro,
// no ficha-defs.js) e as opções saem do próprio campo. Objeto que não
// declara nada não ganha o seletor — o editor fica exatamente como era.
//
// É por seção, e não por campo, de propósito: as seções já são
// naturalmente de um tipo ("Captação" é toda do Proprietário), e um
// layout só evita ter de posicionar cada campo novo duas vezes.
// ------------------------------------------------------------

/** { campo, rotulo, opcoes } do objeto em edição, ou null */
function layTipoDoObjeto() {
  const def = (typeof DEFS !== 'undefined') ? DEFS[layAlvo] : null;
  const tr = def && def.tipoRegistro;
  if (!tr || !tr.campo) return null;
  const campo = (def.campos || []).find(function (c) { return c.c === tr.campo; });
  const op = (campo && Array.isArray(campo.op))
    ? campo.op.filter(function (o) { return o; }) : [];
  return op.length ? { campo: tr.campo, rotulo: tr.rotulo || 'tipo', opcoes: op } : null;
}

/** v1.662 — o `quando` como LISTA, venha como vier: a string da v1.309
 *  ('Inquilino') vira ['Inquilino']; vazio/nulo vira []. */
function layQuandoLista(q) {
  if (!q) return [];
  return (Array.isArray(q) ? q : [q])
    .map(function (v) { return String(v || '').trim(); })
    .filter(function (v) { return v; });
}

/** os chips do cabeçalho da seção — em QUAIS tipos esta parte aparece.
 *  Nenhum marcado = em todos. Vazio quando o objeto não tem tipo.
 *
 *  v1.662 — era um seletor de um valor só ("Somente Inquilino"). Virou
 *  uma fileira de chips porque uma parte da ficha pode ser de VÁRIOS
 *  tipos: "Como recebe" é de quem recebe dinheiro (Proprietário,
 *  Indicador, Prestador e Fornecedor), e "Qualificação para o contrato"
 *  é de quem assina (Proprietário e Inquilino). */
function laySeletorQuando(s, i) {
  const t = layTipoDoObjeto();
  if (!t) return '';
  const atual = layQuandoLista(s.quando);
  const geral = !atual.length;
  return '<span class="lay-quando' + (geral ? ' geral' : '') + '"' +
    ' title="Em que ' + htm(t.rotulo) + ' esta parte da ficha aparece">' +
    '<button type="button" class="lay-chip' + (geral ? ' on' : '') + '"' +
    ' onclick="layQuando(' + i + ', \'\')" title="Aparece em todos os tipos">Todos</button>' +
    t.opcoes.map(function (o) {
      return '<button type="button" class="lay-chip' + (atual.indexOf(o) >= 0 ? ' on' : '') + '"' +
        ' onclick="layQuando(' + i + ', \'' + jsq(o) + '\')">' + htm(o) + '</button>';
    }).join('') + '</span>';
}

/** clique num chip: '' = volta a aparecer em todos; um tipo = liga ou
 *  desliga aquele tipo na lista. A lista é guardada na ordem das opções
 *  do campo, que é a ordem em que a ficha e o editor a leem. */
function layQuando(i, v) {
  const t = layTipoDoObjeto();
  layGuardar();
  const antes = layQuandoLista(layoutSecoes[i].quando);
  let lista;
  if (!v || !t || t.opcoes.indexOf(v) < 0) lista = [];
  else if (antes.indexOf(v) >= 0) lista = antes.filter(function (x) { return x !== v; });
  else lista = antes.concat([v]);
  if (t) lista = t.opcoes.filter(function (o) { return lista.indexOf(o) >= 0; });
  layoutSecoes[i].quando = lista.length ? lista : null;
  // o aviso do obrigatório vale na hora em que a seção DEIXA de ser de
  // todos — não a cada chip ligado depois
  if (lista.length && !antes.length) layAvisarObrigatorios(i);
  desenharLayout();
}

/** Aviso combinado em 19/08/2026: campo obrigatório dentro de uma seção
 *  que some deixa de ser cobrado naquele tipo. Quem escolhe precisa
 *  saber disso na hora, e não no primeiro salvar que não trava. */
function layAvisarObrigatorios(i) {
  const s = layoutSecoes[i];
  const def = (typeof DEFS !== 'undefined') ? DEFS[layAlvo] : null;
  if (!s || s.cartao || !def) return;
  const nomes = (s.campos || []).map(function (id) {
    return (def.campos || []).find(function (c) { return c.c === id; });
  }).filter(function (c) { return c && c.obrig; }).map(function (c) { return c.r; });
  if (!nomes.length) return;
  dialogoAvisar('Esta seção tem campo obrigatório: ' + nomes.join(', ') + '.\n\n' +
    'Nos tipos em que ela não aparecer, ele deixa de ser cobrado — senão salvar ' +
    'travaria pedindo algo que não está na tela.');
}

/** v1.270 — a largura da seção na coluna principal (linha inteira,
 *  metade ou um quarto). Quem desenha é a ficha (.c-metade/.c-quarto). */
function layLarguraSecao(i, v) {
  layGuardar();
  layoutSecoes[i].largura = (v === 'metade' || v === 'quarto') ? v : null;
  desenharLayout();
}


/** os cartões que existem para esta ficha e não estão na lista */
function layCartoesFora() {
  const naLista = {};
  layoutSecoes.forEach(function (s) { if (s.cartao) naLista[s.cartao] = 1; });
  return (typeof cartoesDaFicha === 'function' ? cartoesDaFicha(layAlvo) : [])
    .filter(function (c) { return !naLista[c.id]; });
}

function layTirarCartao(i) {
  layGuardar();
  layoutSecoes.splice(i, 1);
  laySel = null;
  desenharLayout();
}

function layTrazerCartao(id) {
  const def = (typeof cartoesDaFicha === 'function' ? cartoesDaFicha(layAlvo) : [])
    .find(function (c) { return c.id === id; });
  if (!def) return;
  layGuardar();
  layoutSecoes.push({ cartao: def.id, titulo: def.nome, campos: [],
                      lado: def.lado === 'direita' ? 'direita' : 'principal',
                      recolhida: false });
  laySel = { tipo: 'cartao', i: layoutSecoes.length - 1, id: null };
  desenharLayout();
}

function layMoverSecao(i, passo) {
  // v1.707 — sobe/desce DENTRO da mesma coluna: a seção troca de lugar
  // com a vizinha do mesmo lado, e não com a linha seguinte da lista
  // (que pode ser da outra coluna e não mudaria nada na tela)
  const s = layoutSecoes[i];
  if (!s) return;
  const lado = s.lado === 'direita' ? 'direita' : 'principal';
  let j = i + passo;
  while (j >= 0 && j < layoutSecoes.length &&
         (layoutSecoes[j].lado === 'direita' ? 'direita' : 'principal') !== lado) j += passo;
  if (j < 0 || j >= layoutSecoes.length) return;
  layGuardar();
  layoutSecoes[i] = layoutSecoes[j];
  layoutSecoes[j] = s;
  if (laySel && laySel.i === i) laySel.i = j;
  desenharLayout();
  const pux = document.querySelector('.lay3-sec[data-i="' + j + '"] .lay3-pux');
  if (pux) pux.focus();
}

// ------------------------------------------------------------
// v1.189 — CARTÃO DO TOPO
//
// A faixa de indicadores da ficha era fixa no código. O catálogo do
// que existe por objeto mora no ficha-defs.js (CHIPS_FICHA), porque
// tanto a ficha quanto esta tela precisam dele; aqui só se escolhe
// quais entram e em que ordem.
//
// Teto de 7: acima disso a faixa quebra em duas linhas no computador
// e vira rolagem no celular — e ela existe para ser lida de relance.
// ------------------------------------------------------------
const LAY_MAX_CHIPS = 7;
let layChips = null;        // ids escolhidos, na ordem
let layChipArrastando = null;

function layCatalogoChips() {
  return (typeof CHIPS_FICHA !== 'undefined' && CHIPS_FICHA[layAlvo]) || [];
}

function layChipsPadrao() {
  return layCatalogoChips().filter(function (c) { return c.padrao; })
    .map(function (c) { return c.id; });
}

// ------------------------------------------------------------
// v1.317 — NO CELULAR
//
// O equivalente ao Compact Layout do Salesforce: uma lista curta de
// CAMPOS (não de indicadores) que o celular mostra primeiro. O resto
// da ficha continua existindo, atrás de "Ver todos os campos".
//
// Teto de 10: num visor de 375px cada linha come uns 38px, e dez
// linhas mais o cabeçalho e a faixa de indicadores já ocupam a
// primeira tela inteira. Acima disso a pessoa rola para achar o cartão
// que ela abriu a ficha para ver. A mesma trava existe no banco
// (`salvar_celular_ficha`), porque limite que mora só no JavaScript é
// limite que a próxima tela esquece.
//
// Lista vazia não é defeito: é "não escolhi", e aí o celular mostra os
// primeiros campos da primeira seção — o comportamento de hoje.
// ------------------------------------------------------------
const LAY_MAX_CEL = 10;
let layCelular = null;      // ids de campo, na ordem
let layCelArrastando = null;

function layCelPegar(ev) {
  layCelArrastando = ev.currentTarget.dataset.cel;
  ev.dataTransfer.effectAllowed = 'move';
  try { ev.dataTransfer.setData('text/plain', layCelArrastando); } catch (e) {}
}

function layCelSolta(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('sobre');
  const id = layCelArrastando;
  layCelArrastando = null;
  if (!id) return;
  const jaEstava = layCelular.indexOf(id) > -1;
  if (!jaEstava && layCelular.length >= LAY_MAX_CEL) {
    dialogoAvisar('O celular mostra ' + LAY_MAX_CEL + ' campos. Tire um antes de pôr outro.');
    return;
  }
  layGuardar();
  layCelular = layCelular.filter(function (k) { return k !== id; });

  // mesma conta de posição da faixa de indicadores
  const pilulas = [].slice.call(ev.currentTarget.querySelectorAll('[data-cel]'));
  let pos = 0;
  for (let i = 0; i < pilulas.length; i++) {
    const r = pilulas[i].getBoundingClientRect();
    const mesmaLinha = ev.clientY >= r.top && ev.clientY <= r.bottom;
    const antes = mesmaLinha ? ev.clientX > r.left + r.width / 2 : ev.clientY > r.bottom;
    if (antes) pos = i + 1;
  }
  layCelular.splice(pos, 0, id);
  laySel = { tipo: 'celular', i: null, id: null };   // v1.707 — o painel mostra a lista
  desenharLayout();
}

function layCelFora(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('sobre');
  const id = layCelArrastando;
  layCelArrastando = null;
  if (!id || layCelular.indexOf(id) < 0) return;
  layGuardar();
  layCelular = layCelular.filter(function (k) { return k !== id; });
  desenharLayout();
}

function layChipPegar(ev) {
  layChipArrastando = ev.currentTarget.dataset.chip;
  ev.dataTransfer.effectAllowed = 'move';
  try { ev.dataTransfer.setData('text/plain', layChipArrastando); } catch (e) {}
}

function layChipSolta(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('sobre');
  const id = layChipArrastando;
  layChipArrastando = null;
  if (!id) return;
  const jaEstava = layChips.indexOf(id) > -1;
  if (!jaEstava && layChips.length >= LAY_MAX_CHIPS) {
    dialogoAvisar('A faixa comporta ' + LAY_MAX_CHIPS + ' indicadores. Tire um antes de pôr outro.');
    return;
  }
  layGuardar();
  layChips = layChips.filter(function (k) { return k !== id; });

  // mesma conta de posição da grade: quantas pílulas ficam antes do ponteiro
  const pilulas = [].slice.call(ev.currentTarget.querySelectorAll('[data-chip]'));
  let pos = 0;
  for (let i = 0; i < pilulas.length; i++) {
    const r = pilulas[i].getBoundingClientRect();
    const mesmaLinha = ev.clientY >= r.top && ev.clientY <= r.bottom;
    const antes = mesmaLinha ? ev.clientX > r.left + r.width / 2 : ev.clientY > r.bottom;
    if (antes) pos = i + 1;
  }
  layChips.splice(pos, 0, id);
  laySel = { tipo: 'topo', i: null, id: null };      // v1.707 — o painel mostra a faixa
  desenharLayout();
}

function layChipFora(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('sobre');
  const id = layChipArrastando;
  layChipArrastando = null;
  if (!id || layChips.indexOf(id) < 0) return;
  layGuardar();
  layChips = layChips.filter(function (k) { return k !== id; });
  desenharLayout();
}

/** v1.188 — a largura EFETIVA de um campo: o que o layout gravou;
 *  se o layout não disser nada, o padrão do tipo (que é como sempre
 *  foi). Campo na paleta não tem largura — ele não está em seção
 *  nenhuma. */
function layEhLargo(id, origem) {
  const c = layoutCampos[id];
  const padrao = !!(c && c.largo);
  if (origem === 'fora' || typeof origem !== 'number') return padrao;
  const larguras = layoutSecoes[origem] && layoutSecoes[origem].larguras;
  return (larguras && (id in larguras)) ? !!larguras[id] : padrao;
}

/** Alterna entre meia coluna e linha inteira. Grava sempre o valor
 *  explícito, inclusive quando ele coincide com o padrão do tipo: o
 *  que a pessoa escolheu na mão não pode mudar sozinho depois. */
function layLargura(secao, id) {
  layGuardar();
  const s = layoutSecoes[secao];
  if (!s) return;
  s.larguras = s.larguras || {};
  s.larguras[id] = !layEhLargo(id, secao);
  desenharLayout();
}

/** "Imóveis · todos os papéis · 4 seções, 23 campos" — o que a barra
 *  do topo mostra à direita, para não se perder ao rolar a tela. */
function layResumo() {
  const cat = (typeof CATALOGO !== 'undefined' && CATALOGO[layAlvo]) || null;
  const quantos = layoutSecoes.reduce(function (n, s) { return n + (s.campos || []).length; }, 0);
  return ((cat && cat.rotulo) || layAlvo) + ' · ' +
    (layPapel || 'todos os papéis') + ' · ' +
    layoutSecoes.length + (layoutSecoes.length === 1 ? ' seção' : ' seções') +
    ', ' + quantos + (quantos === 1 ? ' campo' : ' campos');
}

/** Guarda o estado ANTES de cada mexida. Arrastar campo errado numa
 *  ficha de 40 campos custava refazer tudo na mão. */
function layGuardar() {
  // v1.189: o passo guarda seções E indicadores do topo — o Desfazer
  // precisa devolver a tela inteira ao estado anterior
  layPassos.push(JSON.stringify({ secoes: layoutSecoes, chips: layChips,
                                 celular: layCelular }));
  if (layPassos.length > 30) layPassos.shift();
}

function layDesfazer() {
  if (!layPassos.length) return;
  const antes = JSON.parse(layPassos.pop());
  layoutSecoes = antes.secoes;
  layChips = antes.chips;
  layCelular = antes.celular || [];
  desenharLayout();
}

function layBuscar(v) {
  layBusca = v || '';
  desenharLayout();
  // desenharLayout refaz a caixa inteira: devolve o cursor para a busca
  const el = document.getElementById('lay-busca');
  if (el) { el.value = layBusca; el.focus(); }
}

function layPegar(ev) {
  layArrastando = { id: ev.currentTarget.dataset.id, de: ev.currentTarget.dataset.de };
  ev.currentTarget.classList.add('arrastando');
  ev.dataTransfer.effectAllowed = 'move';
  try { ev.dataTransfer.setData('text/plain', layArrastando.id); } catch (e) {}
}
function laySoltou() {
  document.querySelectorAll('.lay-campo.arrastando').forEach(function (e) { e.classList.remove('arrastando'); });
}
function laySobre(ev) { ev.preventDefault(); ev.currentTarget.classList.add('sobre'); }
function laySai(ev) { ev.currentTarget.classList.remove('sobre'); }

function laySolta(ev, destino) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('sobre');
  if (!layArrastando) return;
  const id = layArrastando.id;
  layArrastando = null;
  layGuardar();

  // v1.188 — a largura escolhida VIAJA com o campo. Sem isto, arrastar
  // um campo de uma seção para outra o devolvia à largura padrão do
  // tipo, e a escolha feita na mão se perdia calada.
  let larguraEscolhida;
  layoutSecoes.forEach(function (s) {
    if (s.larguras && (id in s.larguras)) {
      larguraEscolhida = !!s.larguras[id];
      delete s.larguras[id];
    }
    s.campos = (s.campos || []).filter(function (k) { return k !== id; });
  });

  // v1.187 — DUAS DIMENSÕES. Enquanto as pílulas eram uma fila, bastava
  // olhar a altura. Numa grade de duas colunas há duas pílulas na mesma
  // altura, e olhar só o Y jogava o campo sempre para a da esquerda.
  //
  // A conta é a ordem de leitura: a posição de soltura é o número de
  // pílulas que ficam ANTES do ponteiro — quem está em linha acima, ou
  // na mesma linha e à esquerda do ponteiro.
  const pilulas = [].slice.call(ev.currentTarget.querySelectorAll('.lay-campo'));
  let pos = 0;
  for (let i = 0; i < pilulas.length; i++) {
    const r = pilulas[i].getBoundingClientRect();
    const mesmaLinha = ev.clientY >= r.top && ev.clientY <= r.bottom;
    const antes = mesmaLinha
      ? ev.clientX > r.left + r.width / 2   // mesma linha: decide pelo lado
      : ev.clientY > r.bottom;              // linha de cima: já passou
    if (antes) pos = i + 1;
  }
  layoutSecoes[destino].campos.splice(pos, 0, id);
  if (larguraEscolhida !== undefined) {
    layoutSecoes[destino].larguras = layoutSecoes[destino].larguras || {};
    layoutSecoes[destino].larguras[id] = larguraEscolhida;
  }
  desenharLayout();
}

/** Soltar na coluna da direita = tirar o campo da ficha. */
function laySoltaFora(ev) {
  ev.preventDefault();
  ev.currentTarget.classList.remove('sobre');
  if (!layArrastando) return;
  const id = layArrastando.id;
  layArrastando = null;
  layGuardar();
  layoutSecoes.forEach(function (s) {
    s.campos = (s.campos || []).filter(function (k) { return k !== id; });
  });
  desenharLayout();
}

/** Identificadores do espaço: __espaco_1, __espaco_2... */
function ehEspacoAdmin(id) { return typeof id === 'string' && id.indexOf('__espaco') === 0; }

function layNovoEspaco() {
  layGuardar();
  let n = 1;
  const usados = {};
  layoutSecoes.forEach(function (s) { (s.campos || []).forEach(function (k) { usados[k] = 1; }); });
  while (usados['__espaco_' + n]) n++;
  const ultima = layoutSecoes[layoutSecoes.length - 1];
  ultima.campos = (ultima.campos || []).concat(['__espaco_' + n]);
  desenharLayout();
}

function layTitulo(i, v) {
  layGuardar();
  layoutSecoes[i].titulo = v;
  // v1.707 — o nome se edita em dois lugares (na seção e no painel):
  // um espelha o outro sem redesenhar a tela, para não perder o foco
  const naTela = document.querySelector('.lay3-sec[data-i="' + i + '"] .lay-titulo');
  if (naTela && naTela.value !== v) naTela.value = v;
  desenharLayProps();
  desenharLayBarra();
}
function layColunas(i, v) {
  layGuardar();
  layoutSecoes[i].colunas = Number(v);
  desenharLayout();
}
function layNovaSecao() {
  layGuardar();
  layoutSecoes.push({ titulo: 'Nova seção', colunas: 2, campos: [], lado: 'principal' });
  // v1.707 — nasce selecionada, com o nome pronto para ser trocado
  laySel = { tipo: 'secao', i: layoutSecoes.length - 1, id: null };
  desenharLayout();
  const inp = document.querySelector('#lay-props input[type=text]');
  if (inp) { inp.focus(); inp.select(); }
}
function layRemoverSecao(i) {
  // v1.235: só as seções DE CAMPO contam para o mínimo — uma ficha com
  // dez cartões e nenhuma seção de campo ainda precisa de uma
  if (layoutSecoes.filter(function (s) { return !s.cartao; }).length === 1) {
    dialogoAvisar('A ficha precisa de pelo menos uma seção de campos.'); return; }
  layGuardar();
  layoutSecoes.splice(i, 1);
  laySel = null;
  desenharLayout();
}

/** v1.309 — a lista de seções pronta para o banco. Saiu de dentro do
 *  salvarLayout() para o "copiar para outro papel" mandar exatamente a
 *  MESMA coisa: dois caminhos montando o jsonb cada um do seu jeito é
 *  como se descobre, meses depois, que um deles esqueceu um campo.
 *  Devolve null (já avisando na tela) quando o layout não fecha. */
function layMontarSecoes() {
  const limpo = layoutSecoes.map(function (s) {
      // v1.188: as larguras escolhidas vão junto — só as dos campos que
      // continuam na seção, para o registro não acumular lixo de campo
      // que já foi arrastado para outro lugar
      const larguras = {};
      (s.campos || []).forEach(function (k) {
        if (s.larguras && (k in s.larguras)) larguras[k] = !!s.larguras[k];
      });
      return { titulo: String(s.titulo || '').trim(), colunas: s.colunas === 1 ? 1 : 2,
               campos: (s.campos || []).slice(), larguras: larguras,
               // v1.235 — o que identifica um cartão fixo
               cartao: s.cartao || undefined,
               // v1.191 — em que coluna vive e se nasce recolhida
               lado: s.lado === 'direita' ? 'direita' : 'principal',
               recolhida: !!s.recolhida,
               // v1.309 — em que tipo de registro esta parte aparece.
               // null = em todos, que é como toda seção salva antes
               // desta versão continua se comportando.
               // v1.662 — sempre LISTA (ou null); a string antiga é
               // convertida ao salvar.
               quando: layQuandoLista(s.quando).length ? layQuandoLista(s.quando) : null,
               // v1.270 — linha inteira (null), metade ou um quarto
               largura: (s.largura === 'metade' || s.largura === 'quarto') ? s.largura : null };
    }).filter(function (s) { return s.cartao || s.campos.length; });
  // v1.235 — o filtro acima descartava TODA seção sem campo, e o cartão
  // fixo não tem nenhum: ele sumiria no caminho para o banco. E o
  // `titulo`/`campos` vão gravados mesmo assim porque a função
  // salvar_layout_ficha exige os dois em cada item da lista.
  if (!limpo.filter(function (s) { return !s.cartao; }).length) {
    dialogoAvisar('Coloque pelo menos um campo em uma seção.'); return null; }
  if (limpo.some(function (s) { return !s.titulo; })) {
    dialogoAvisar('Toda seção precisa de um nome.'); return null; }
  return limpo;
}

/** v1.309 — grava o que está na tela para UM papel (null = o padrão da
 *  imobiliária). É o mesmo caminho do botão Salvar e do "copiar para". */
async function layGravar(papel) {
  const limpo = layMontarSecoes();
  if (!limpo) return false;

  // v1.189: a escolha do cartão do topo vai no mesmo registro
  const chips = (layChips || []).slice(0, LAY_MAX_CHIPS);

  // O QUE FICOU FORA VAI JUNTO.
  // É a coluna da direita da tela. Sem gravá-la, o aplicador não teria
  // como distinguir "tirei este campo" de "este campo é novo" — e
  // devolveria à ficha o que alguém tirou de propósito.
  //
  // O banco ACUMULA esta lista com a que já estava lá. É de propósito:
  // o editor só conhece os campos do CATALOGO, e há campo que existe na
  // ficha e não no catálogo (proprietario_id e inquilino_id, no Imóvel).
  // Se o `fora` fosse substituído por este, o Proprietário voltaria à
  // ficha do Corretor no primeiro save.
  const dentro = {};
  limpo.forEach(function (s) { s.campos.forEach(function (k) { dentro[k] = 1; }); });
  const fora = Object.keys(layoutCampos).filter(function (k) { return !dentro[k]; })
    // v1.235 — e os cartões que saíram da ficha, na mesma lista. O
    // aplicador separa um do outro pelo registro de cartões.
    .concat(layCartoesFora().map(function (c) { return c.id; }));

  const r = await sb.rpc('salvar_layout_ficha',
    { p_objeto: layAlvo, p_secoes: limpo, p_papel: papel || null, p_fora: fora });
  if (r.error) { await dialogoAvisar(r.error.message); return false; }

  // v1.189 — os indicadores vão numa chamada própria, DEPOIS: a de cima
  // é quem cria a linha do layout. Se o SQL da v1.189 ainda não tiver
  // rodado, o layout já está salvo e o aviso fala só do que faltou.
  const rc = await sb.rpc('salvar_chips_ficha',
    { p_objeto: layAlvo, p_papel: papel || null, p_chips: chips });
  if (rc.error) {
    await carregarLayouts();
    await dialogoAvisar('Layout salvo, mas o cartão do topo não: ' + rc.error.message +
          '\n\nRode a migração v1.189 no banco de dados e salve de novo.');
    return false;
  }

  // v1.317 — e os campos do celular, na terceira chamada. Mesmo motivo
  // dos indicadores: quem cria a linha do layout é a primeira.
  const rcel = await sb.rpc('salvar_celular_ficha',
    { p_objeto: layAlvo, p_papel: papel || null,
      p_celular: (layCelular || []).slice(0, LAY_MAX_CEL) });
  if (rcel.error) {
    await carregarLayouts();
    await dialogoAvisar('Layout salvo, mas os campos do celular não: ' + rcel.error.message +
          '\n\nRode o v1317-sql-1 no banco de dados e salve de novo.');
    return false;
  }
  return true;
}

async function salvarLayout() {
  if (!await layGravar(layPapel || null)) return;
  await carregarLayouts();
  await dialogoAvisar('Layout salvo. Abra uma ficha para ver.');
}

async function restaurarLayout() {
  if (!(await dialogoPerguntar({ texto: layPapel
    ? 'Apagar o layout deste papel? Ele volta a usar o layout padrão da imobiliária.'
    : 'Voltar ao layout do sistema? O que você montou aqui será apagado.' }))) return;
  const r = await sb.rpc('apagar_layout_ficha', { p_objeto: layAlvo, p_papel: layPapel || null });
  if (r.error) { await dialogoAvisar(r.error.message); return; }
  await carregarLayouts();
}

// ============================================================
// HISTÓRICO DE ALTERAÇÕES (v1.126) — a tela central
//
// A diferença para o cartão da ficha: aqui é TUDO, de todo mundo, e é
// por isso que esta aba tem permissão própria. O dado é o mesmo; o que
// muda é a junção — ver de uma vez o que cada pessoa fez no dia é
// outra coisa, e nem toda função precisa disso.
//
// Quem desenha a lista é o `histLista()`, no base.js, o mesmo da ficha.
// ============================================================
async function carregarHistorico() {
  const alvo = document.getElementById('hist-lista');
  if (!alvo) return;
  alvo.innerHTML = '<p class="hist-vazio">Carregando…</p>';

  // O seletor de pessoas nasce dos usuários já carregados: nenhuma
  // consulta a mais só para preencher um filtro.
  const selU = document.getElementById('hf-usuario');
  if (selU && !selU.dataset.pronto) {
    selU.dataset.pronto = '1';
    selU.innerHTML = '<option value="">Todos os usuários</option>' +
      (usuarios || []).map(u => `<option value="${htm(u.usuario_id || '')}">${htm(u.nome || u.email)}</option>`).join('') +
      '<option value="_sem">— sem usuário (bot e sistema)</option>';
  }

  // v1.312 — a lista de usuários já está aqui: aproveitá-la para dar
  // nome às linhas antigas que guardaram só o id sai de graça.
  (usuarios || []).forEach(function (u) {
    if (u.usuario_id) HIST_NOMES[u.usuario_id] = u.nome || u.email;
  });

  await histObjetosPers();

  const uid = selU ? selU.value : '';
  const tab = (document.getElementById('hf-objeto') || {}).value || '';
  const dias = parseInt((document.getElementById('hf-dias') || {}).value || '30', 10);
  const busca = ((document.getElementById('hf-busca') || {}).value || '').trim();

  // TODOS OS FILTROS ANTES de ordenar e limitar.
  // No supabase-js o `.limit()` devolve um construtor "de transformação",
  // que só continua aceitando `.eq()` por acidente de herança. Filtrar
  // depois de limitar funciona hoje e é o tipo de coisa que para de
  // funcionar numa atualização da biblioteca, em silêncio.
  let q = sb.from('historico')
    // v1.312 — o rastro (IP, navegador e país) entra na leitura
    .select('id,tabela,registro_id,registro_rotulo,acao,dados_antes,dados_depois,'
          + 'usuario_nome,usuario_id,origem,em,ip,agente,pais')
    .eq('empresa_id', empresaAtual);

  if (tab) q = q.eq('tabela', tab);
  if (uid === '_sem') q = q.is('usuario_id', null);
  else if (uid) q = q.eq('usuario_id', uid);
  if (dias > 0) q = q.gte('em', new Date(Date.now() - dias * 864e5).toISOString());
  if (busca) q = q.ilike('registro_rotulo', '%' + busca + '%');

  const { data, error } = await q.order('em', { ascending: false }).limit(300);
  if (error) {
    alvo.innerHTML = `<p class="hist-vazio">Não consegui ler o histórico: ${htm(error.message)}</p>`;
    return;
  }
  alvo.innerHTML = histLista(data, true) + ((data && data.length === 300)
    ? '<p class="hist-vazio">Mostrando as 300 mais recentes. Estreite o período ou o objeto para ver o resto.</p>'
    : '');
}

/**
 * v1.768 — os objetos personalizados no Histórico. O histórico grava a
 * chave do objeto como "tabela" (p_chaves): ela vira opção do filtro
 * (num grupo próprio, uma vez só) e os mapas do base.js aprendem o nome
 * do objeto, o link para a ficha e o rótulo de cada campo. Os nomes são
 * da imobiliária: entram por textContent, nunca por innerHTML.
 */
let HIST_PERS_CAMPOS = null;   // os rótulos dos campos, uma leitura por visita à aba
async function histObjetosPers() {
  const lista = (objetosPers || []).filter(function (o) { return /^p_[a-z][a-z0-9_]{1,30}$/.test(o.chave); });
  if (!lista.length) return;
  if (!HIST_PERS_CAMPOS) {
    // o histórico grava cada campo pela chave (situacao, imovel…): o nome
    // que a imobiliária deu vem de campos_personalizados (RLS por empresa)
    const r = await sb.from('campos_personalizados').select('objeto,chave,rotulo')
      .eq('empresa_id', empresaAtual).in('objeto', lista.map(function (o) { return o.chave; }));
    HIST_PERS_CAMPOS = r.error ? [] : (r.data || []);
  }
  lista.forEach(function (o) {
    if (typeof HIST_ONDE !== 'undefined') HIST_ONDE[o.chave] = [o.singular, 'registro.html'];
    if (typeof HIST_ROTULOS !== 'undefined') {
      const r = { nome: o.titulo_rotulo || 'Nome', proprietario_id: 'Proprietário do registro' };
      HIST_PERS_CAMPOS.filter(function (c) { return c.objeto === o.chave; })
        .forEach(function (c) { r[c.chave] = c.rotulo; });
      HIST_ROTULOS[o.chave] = r;
    }
  });
  const sel = document.getElementById('hf-objeto');
  if (!sel || sel.dataset.pers || !lista.length) return;
  sel.dataset.pers = '1';
  const g = document.createElement('optgroup');
  g.label = 'Objetos personalizados';
  lista.forEach(function (o) {
    const op = document.createElement('option');
    op.value = o.chave;
    op.textContent = o.plural + (o.ativo ? '' : ' (desativado)');
    g.appendChild(op);
  });
  sel.appendChild(g);
}

// ============================================================
// REGRAS (v1.131) — as automações que o usuário cria
//
// Três perguntas de listas fechadas, e não uma tela em branco. O Flow
// Builder do Salesforce existe porque eles atendem de padaria a banco e
// não podem adivinhar; a Moralí é uma operação só. Com lista fechada eu
// garanto que cada gatilho FUNCIONA — com tela em branco, monta-se um
// fluxo que roda pela metade e ninguém percebe.
//
// Quem executa é o banco (`executar_regras`), não esta tela: a regra
// precisa valer de madrugada, com o CRM fechado.
// ============================================================
const RG_GATILHOS = [
  { g: 'lead_parado_na_etapa',     obj: 'leads',      dias: true,
    txt: 'um lead fica N dias na mesma etapa' },
  { g: 'lead_sem_contato',         obj: 'leads',      dias: true,
    txt: 'um lead fica N dias sem contato' },
  { g: 'imovel_disponivel',        obj: 'imoveis',    dias: true,
    txt: 'um imóvel completa N dias disponível' },
  { g: 'contrato_perto_do_fim',    obj: 'contratos',  dias: true,
    txt: 'um contrato chega a N dias do fim' },
  // v1.252 — o reajuste avisa. Foi o furo achado em 11/08/2026: 15
  // contratos sem data de reajuste e nenhum gatilho olhando para ela.
  { g: 'contrato_perto_do_reajuste', obj: 'contratos', dias: true,
    txt: 'um contrato chega a N dias do próximo reajuste' },
  { g: 'caso_concluido_sem_pagar', obj: 'casos',      dias: true,
    txt: 'um caso concluído passa N dias sem pagamento' },
  { g: 'sinistro_perto_do_prazo',  obj: 'sinistros',  dias: true,
    txt: 'um sinistro chega a N dias do prazo' },
  // v1.215 — os seguros avisam. Os dois devolvem o CONTRATO como
  // registro (é a coluna que a tarefa sabe preencher), e o rótulo do
  // disparo é que diz de qual apólice ou item se trata.
  { g: 'seguro_perto_do_vencimento', obj: 'contratos', dias: true,
    txt: 'uma apólice de seguro chega a N dias do vencimento' },
  { g: 'seguro_ultima_parcela',      obj: 'contratos', dias: true,
    txt: 'a última parcela de um seguro chega a N dias (o aluguel cai depois dela)' }
];
const RG_OPS = [['igual', 'é'], ['diferente', 'não é'], ['contem', 'contém'],
  ['maior', 'maior que'], ['menor', 'menor que'],
  ['preenchido', 'está preenchido'], ['vazio', 'está vazio']];
const RG_REPETICAO = [
  ['uma_vez', 'disparar uma vez por registro'],
  ['a_cada_30', 'repetir a cada 30 dias enquanto continuar valendo'],
  ['sempre', 'repetir toda vez que a condição valer']];

let REGRAS = [], RG_EDIT = null;

function rgGatilho(g) { return RG_GATILHOS.find(x => x.g === g) || RG_GATILHOS[0]; }

/** Os campos de condição saem do CATÁLOGO — então campo personalizado
 *  criado em "Gerenciador de objetos" já serve de filtro, sem eu mexer. */
function rgCampos(objeto) {
  const cat = (typeof CATALOGO !== 'undefined') && CATALOGO[objeto];
  return cat ? (cat.campos || []).filter(c => c.c && c.r) : [];
}

async function carregarRegras() {
  const el = document.getElementById('rg-lista');
  if (!el) return;
  el.innerHTML = '<p class="rg-vazio">Carregando…</p>';
  const { data, error } = await sb.from('regras').select('*')
    .eq('empresa_id', empresaAtual).order('criado_em');
  if (error) { el.innerHTML = `<p class="rg-vazio">Não consegui ler as regras: ${htm(error.message)}</p>`; return; }
  REGRAS = data || [];

  // quantos disparos nos últimos 30 dias, por regra — a pergunta que vem
  // logo depois de "está ligada?" é "está fazendo alguma coisa?"
  const desde = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data: d } = await sb.from('regra_disparos').select('regra_id')
    .eq('empresa_id', empresaAtual).gte('quando', desde).limit(2000);
  const cont = {}; (d || []).forEach(x => { cont[x.regra_id] = (cont[x.regra_id] || 0) + 1; });

  if (!REGRAS.length) {
    el.innerHTML = `<div class="rg-zero">
      <b>Nenhuma regra ainda.</b>
      <span>Comece pelo que você já faz de cabeça e às vezes esquece — um proprietário
        parado na mesma etapa, um imóvel encalhando, um contrato chegando ao fim.</span></div>`;
    return;
  }
  el.innerHTML = `<div class="rg-cx">${REGRAS.map(r => {
    const g = rgGatilho(r.gatilho);
    const n = cont[r.id] || 0;
    return `<div class="rg-l ${r.ativa ? '' : 'off'}">
      <button class="rg-sw ${r.ativa ? 'on' : ''}" title="${r.ativa ? 'Desligar' : 'Ligar'}"
              onclick="alternarRegra('${jsq(r.id)}')"></button>
      <div class="rg-c" onclick="abrirRegra('${jsq(r.id)}')">
        <div class="rg-n">${htm(r.nome)}</div>
        <div class="rg-d">Quando ${htm(g.txt.replace('N', r.dias))} →
          ${htm(rgDescricaoAcao(r))}</div>
      </div>
      <div class="rg-cnt">${r.ativa
        ? `<b>${n}</b>disparo${n === 1 ? '' : 's'} em 30 dias`
        : 'desligada'}</div>
      <button class="rg-x" title="Excluir" onclick="excluirRegra('${jsq(r.id)}')">✕</button>
    </div>`;
  }).join('')}</div>`;
}

function rgDescricaoAcao(r) {
  const p = r.acao_param || {};
  if (r.acao === 'mudar_etapa') return 'mover o lead para “' + (p.etapa || '?') + '”';
  return `criar tarefa ${p.tipo || 'Ligação'} “${p.assunto || r.nome}”`;
}

async function alternarRegra(id) {
  const r = REGRAS.find(x => x.id === id); if (!r) return;
  const { error } = await sb.from('regras').update({ ativa: !r.ativa }).eq('id', id);
  if (error) { mostrarErro(document.getElementById('rg-erro'), error.message); return; }
  carregarRegras();
}

async function excluirRegra(id) {
  const r = REGRAS.find(x => x.id === id); if (!r) return;
  if (!(await dialogoPerguntar({ texto: `Excluir a regra “${r.nome}”?\n\nO registro dos disparos que ela já fez também sai.`, ok: 'Excluir', perigo: true }))) return;
  const { error } = await sb.from('regras').delete().eq('id', id);
  if (error) { mostrarErro(document.getElementById('rg-erro'), error.message); return; }
  document.getElementById('rg-editor').innerHTML = '';
  carregarRegras();
}

// ------------------------------------------------------------
// O EDITOR
// ------------------------------------------------------------
function abrirRegra(id) {
  RG_EDIT = id ? Object.assign({}, REGRAS.find(x => x.id === id)) : {
    nome: '', ativa: true, gatilho: 'imovel_disponivel', dias: 45,
    condicoes: [], acao: 'criar_tarefa', repeticao: 'uma_vez',
    acao_param: { tipo: 'Ligação', assunto: '', dias_prazo: 2, responsavel: 'registro' }
  };
  RG_EDIT.condicoes = RG_EDIT.condicoes || [];
  RG_EDIT.acao_param = RG_EDIT.acao_param || {};
  desenharEditorRegra();
  document.getElementById('rg-editor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function rgLer() {
  const v = i => (document.getElementById(i) || {}).value;
  RG_EDIT.nome = v('rg-nome') || '';
  RG_EDIT.gatilho = v('rg-gatilho');
  RG_EDIT.dias = parseInt(v('rg-dias') || '0', 10) || 0;
  RG_EDIT.acao = v('rg-acao');
  RG_EDIT.repeticao = v('rg-rep');
  RG_EDIT.acao_param = RG_EDIT.acao === 'mudar_etapa'
    ? { etapa: v('rg-etapa') }
    : { tipo: v('rg-tipo'), assunto: v('rg-assunto'),
        dias_prazo: parseInt(v('rg-prazo') || '2', 10) || 2, responsavel: v('rg-resp') };
  RG_EDIT.condicoes = Array.from(document.querySelectorAll('#rg-cond .rg-cond')).map(l => ({
    campo: l.querySelector('.c').value,
    op: l.querySelector('.o').value,
    valor: (l.querySelector('.v') || {}).value || ''
  })).filter(c => c.campo);
}

function rgTrocouGatilho() { rgLer(); RG_EDIT.condicoes = []; desenharEditorRegra(); }
function rgTrocouAcao() { rgLer(); desenharEditorRegra(); }
function rgMaisCondicao() { rgLer(); RG_EDIT.condicoes.push({ campo: '', op: 'igual', valor: '' }); desenharEditorRegra(); }
function rgTiraCondicao(i) { rgLer(); RG_EDIT.condicoes.splice(i, 1); desenharEditorRegra(); }

/**
 * v1.775 — OS TIPOS QUE A RÉGUA PODE CRIAR são os tipos de tarefa da
 * imobiliária: os do sistema e os que ela acrescentou na Configuração
 * (o catálogo já vem com os dois, ver LISTAS_SO_CRESCEM). Antes eram
 * Ligação, Visita, E-mail e Outro escritos aqui — e o banco recusava
 * E-mail e Outro. Observação fica de fora (é anotação, não tarefa a
 * fazer). Ligação na frente: é o padrão de régua nova. A régua que já
 * grava um tipo que saiu da lista continua mostrando o tipo dela.
 */
function rgTiposDeTarefa(atual) {
  const cat = (typeof CATALOGO !== 'undefined' && CATALOGO.tarefas) || null;
  const campo = cat ? (cat.campos || []).find(function (f) { return f.c === 'tipo'; }) : null;
  const todos = (campo && Array.isArray(campo.opcoes)) ? campo.opcoes : ['Tarefa', 'Ligação', 'Visita', 'Reunião'];
  const lista = ['Ligação'].concat(todos.filter(function (t) {
    return t && t !== 'Ligação' && t !== 'Observação';
  }));
  if (atual && lista.indexOf(atual) < 0) lista.push(atual);
  return lista;
}

function desenharEditorRegra() {
  const r = RG_EDIT, g = rgGatilho(r.gatilho);
  const campos = rgCampos(g.obj);
  const etapas = [...new Set((typeof etapasDoFunil === 'function')
    ? etapasDoFunil('Inquilino').concat(etapasDoFunil('Proprietário')) : [])];

  // A prévia lê de RG_EDIT, e o seletor de etapa só existe depois deste
  // desenho — sem este padrão, a frase dizia "mover o lead para “?”" até
  // alguém encostar no campo. Prévia que mostra interrogação parece
  // defeito, e é justamente a parte da tela que precisa inspirar confiança.
  if (r.acao === 'mudar_etapa' && !(r.acao_param || {}).etapa && etapas.length) {
    r.acao_param = Object.assign({}, r.acao_param, { etapa: etapas[0] });
  }

  const cond = (c, i) => {
    const cat = campos.find(x => x.c === c.campo);
    const semValor = ['preenchido', 'vazio'].includes(c.op);
    const valor = (cat && cat.opcoes)
      ? `<select class="v">${cat.opcoes.map(o => `<option ${o === c.valor ? 'selected' : ''}>${htm(o)}</option>`).join('')}</select>`
      : `<input class="v" value="${htm(c.valor || '')}">`;
    return `<div class="rg-cond">
      <select class="c" onchange="rgLer();desenharEditorRegra()">
        <option value="">— escolha o campo —</option>
        ${campos.map(x => `<option value="${htm(x.c)}" ${x.c === c.campo ? 'selected' : ''}>${htm(x.r)}</option>`).join('')}</select>
      <select class="o" onchange="rgLer();desenharEditorRegra()">
        ${RG_OPS.map(o => `<option value="${o[0]}" ${o[0] === c.op ? 'selected' : ''}>${o[1]}</option>`).join('')}</select>
      ${semValor ? '' : valor}
      <button class="rg-cond-x" onclick="rgTiraCondicao(${i})" title="Tirar">✕</button>
    </div>`;
  };

  document.getElementById('rg-editor').innerHTML = `
  <div class="rg-cx rg-ed">
    <div class="rg-ed-cab">
      <input id="rg-nome" class="rg-nome-in" placeholder="Nome da regra (ex.: Imóvel encalhando)"
             value="${htm(r.nome || '')}">
    </div>

    <div class="rg-ed-b">
      <span class="rg-r">Quando</span>
      <div class="rg-lin">
        <select id="rg-gatilho" onchange="rgTrocouGatilho()">
          ${RG_GATILHOS.map(x => `<option value="${x.g}" ${x.g === r.gatilho ? 'selected' : ''}>${htm(x.txt)}</option>`).join('')}
        </select>
        <input id="rg-dias" class="num" value="${r.dias}"> dias
      </div>
      <p class="rg-ajuda">Uma lista fechada de situações, e não uma tela em branco — cada uma o
        banco de dados sabe responder com precisão. Se faltar alguma que a sua rotina pede,
        fale com o suporte do sistema.</p>
    </div>

    <div class="rg-ed-b">
      <span class="rg-r se">Se</span>
      <div id="rg-cond">${r.condicoes.map(cond).join('')}</div>
      <a href="#" class="rg-mais" onclick="rgMaisCondicao();return false">+ condição</a>
      <p class="rg-ajuda">Opcional. Sem condição, a regra vale para todos os
        ${htm((CATALOGO[g.obj] || {}).rotulo || g.obj).toLowerCase()}.
        Os campos vêm do catálogo — inclusive os que você criou em Gerenciador de objetos.</p>
    </div>

    <div class="rg-ed-b">
      <span class="rg-r entao">Então</span>
      <div class="rg-lin">
        <select id="rg-acao" onchange="rgTrocouAcao()">
          <option value="criar_tarefa" ${r.acao === 'criar_tarefa' ? 'selected' : ''}>criar uma tarefa</option>
          <option value="mudar_etapa" ${r.acao === 'mudar_etapa' ? 'selected' : ''}
            ${g.obj !== 'leads' ? 'disabled' : ''}>mudar a etapa do lead</option>
        </select>
      </div>
      ${r.acao === 'mudar_etapa' ? `
        <div class="rg-lin">para <select id="rg-etapa">
          ${etapas.map(e => `<option ${e === (r.acao_param || {}).etapa ? 'selected' : ''}>${htm(e)}</option>`).join('')}
        </select></div>`
      : `
        <div class="rg-lin">
          <select id="rg-tipo">${rgTiposDeTarefa((r.acao_param || {}).tipo).map(t =>
            `<option ${t === (r.acao_param || {}).tipo ? 'selected' : ''}>${htm(t)}</option>`).join('')}</select>
          <input id="rg-assunto" style="flex:1;min-width:200px" placeholder="Assunto da tarefa"
                 value="${htm((r.acao_param || {}).assunto || '')}">
        </div>
        <div class="rg-lin">para
          <select id="rg-resp">
            <option value="registro" ${(r.acao_param || {}).responsavel === 'registro' ? 'selected' : ''}>o responsável pelo registro</option>
            ${(usuarios || []).map(u => `<option value="${htm(u.email)}" ${(r.acao_param || {}).responsavel === u.email ? 'selected' : ''}>${htm(u.nome || u.email)}</option>`).join('')}
          </select>
          vencendo em <input id="rg-prazo" class="num" value="${(r.acao_param || {}).dias_prazo || 2}"> dias
        </div>`}
    </div>

    <div class="rg-ed-b">
      <span class="rg-r rep">Quantas vezes</span>
      <div class="rg-lin">
        <select id="rg-rep">${RG_REPETICAO.map(x =>
          `<option value="${x[0]}" ${x[0] === r.repeticao ? 'selected' : ''}>${x[1]}</option>`).join('')}</select>
      </div>
      <p class="rg-ajuda"><b>“45 dias disponível” continua verdadeiro no dia 46 e no 120.</b>
        Sem esta trava, a mesma regra criaria uma tarefa por dia para o mesmo imóvel. O padrão
        é o mais conservador de propósito — repetir exige alguém escolher repetir.</p>
    </div>

    <div class="rg-previa" id="rg-previa">
      <span class="rot">O que esta regra vai fazer</span>
      <span id="rg-previa-txt">${htm(rgPrevia())}</span>
      <button class="btn btn-claro rg-simular" onclick="simularRegra()">Quantos alcança hoje?</button>
    </div>

    <p class="msg-erro" id="rg-ed-erro"></p>
    <div class="rg-ed-acoes">
      <button class="btn btn-claro" onclick="document.getElementById('rg-editor').innerHTML=''">Cancelar</button>
      <button class="btn" id="rg-salvar" onclick="salvarRegra()">Salvar</button>
    </div>
  </div>`;
}

/** A prévia traduz os seletores de volta para português. */
function rgPrevia() {
  const r = RG_EDIT, g = rgGatilho(r.gatilho);
  const p = r.acao_param || {};
  const alvo = ((CATALOGO[g.obj] || {}).rotulo || g.obj).toLowerCase();
  const cond = (r.condicoes || []).filter(c => c.campo).length;
  const acao = r.acao === 'mudar_etapa'
    ? `mover o lead para “${p.etapa || '?'}”`
    : `criar uma tarefa de ${p.tipo || 'Ligação'} — “${p.assunto || r.nome || 'sem assunto'}” — ` +
      `para ${p.responsavel === 'registro' || !p.responsavel ? 'o responsável pelo registro' : p.responsavel}, ` +
      `vencendo em ${p.dias_prazo || 2} dias`;
  return `Todo dia, às 6h, procurar ${alvo} em que ${g.txt.replace('N', r.dias)}` +
    (cond ? `, com ${cond} ${cond === 1 ? 'condição' : 'condições'}` : '') +
    `. Para cada um, ${acao}.`;
}

/** O número que decide se a regra é segura: quantos ela pega HOJE. */
async function simularRegra() {
  rgLer();
  const el = document.getElementById('rg-previa-txt');
  const erro = document.getElementById('rg-ed-erro');
  erro.style.display = 'none';
  if (!RG_EDIT.id) {
    mostrarErro(erro, 'Salve a regra primeiro — a simulação roda no banco de dados, sobre a regra gravada.');
    return;
  }
  const { data, error } = await sb.rpc('executar_regras', { p_regra_id: RG_EDIT.id, p_simular: true });
  if (error) { mostrarErro(erro, error.message); return; }
  const n = (data && data[0]) ? data[0].alcancados : 0;
  el.textContent = rgPrevia() + ` Hoje isso alcançaria ${n} ${n === 1 ? 'registro' : 'registros'}.`;
}

async function salvarRegra() {
  rgLer();
  const erro = document.getElementById('rg-ed-erro');
  erro.style.display = 'none';
  if (!RG_EDIT.nome || RG_EDIT.nome.trim().length < 2) {
    mostrarErro(erro, 'Dê um nome à regra — é por ele que você vai reconhecê-la na lista.'); return;
  }
  if (RG_EDIT.acao === 'criar_tarefa' && !(RG_EDIT.acao_param.assunto || '').trim()) {
    RG_EDIT.acao_param.assunto = RG_EDIT.nome;
  }
  const linha = {
    empresa_id: empresaAtual, nome: RG_EDIT.nome.trim(), ativa: RG_EDIT.ativa !== false,
    gatilho: RG_EDIT.gatilho, dias: RG_EDIT.dias, condicoes: RG_EDIT.condicoes,
    acao: RG_EDIT.acao, acao_param: RG_EDIT.acao_param, repeticao: RG_EDIT.repeticao
  };
  const bt = document.getElementById('rg-salvar');
  bt.disabled = true; bt.textContent = 'Salvando…';
  const { data, error } = RG_EDIT.id
    ? await sb.from('regras').update(linha).eq('id', RG_EDIT.id).select().maybeSingle()
    : await sb.from('regras').insert(linha).select().maybeSingle();
  bt.disabled = false; bt.textContent = 'Salvar';
  if (error) { mostrarErro(erro, error.message); return; }
  RG_EDIT = Object.assign(RG_EDIT, data || {});
  await carregarRegras();
  mostrarErro(erro, 'Salva. Use “Quantos alcança hoje?” antes de deixar ligada.', true);
}

/**
 * "Verificar agora" existe para você não precisar esperar até as 6h para
 * saber se a regra funciona — e para o primeiro dia, em que tudo o que
 * se arrasta há meses vira tarefa de uma vez.
 */
async function rodarRegrasAgora() {
  const erro = document.getElementById('rg-erro');
  erro.style.display = 'none';
  if (!(await dialogoPerguntar({ texto: 'Rodar todas as regras ligadas agora?\n\n' +
      'As tarefas que elas criarem aparecem de verdade — e no primeiro uso podem ser várias, ' +
      'porque tudo que se arrasta há meses entra de uma vez.', ok: 'Rodar agora' }))) return;
  const { data, error } = await sb.rpc('executar_regras', { p_regra_id: null, p_simular: false });
  if (error) { mostrarErro(erro, error.message); return; }
  const total = (data || []).reduce((a, x) => a + (x.disparados || 0), 0);
  mostrarErro(erro, total
    ? `${total} ${total === 1 ? 'disparo' : 'disparos'}: ` +
      (data || []).filter(x => x.disparados).map(x => `${x.regra} (${x.disparados})`).join(', ')
    : 'Nenhuma regra tinha o que fazer agora.', true);
  carregarRegras();
}

// ============================================================
// v1.340 — ACESSOS
//
// Quem entrou, quando, de onde e com quantas etapas. A tabela `acessos`
// é alimentada por três gatilhos em `auth.sessions` (entrada, subida
// para 2 etapas e encerramento), criados pelo
// historico-acessos-sql-3-criar.sql.
//
// POR QUE NÃO TEM RPC: diferente do 2FA — onde o dado mora em
// `auth.mfa_factors`, fora do alcance do REST — aqui a tabela é de
// `public`. Quem filtra por imobiliária é a política de RLS
// (`empresa_visivel` + `posso('administracao','ver')`), então a tela lê
// direto e há uma função a menos para manter.
//
// PAGINAÇÃO DE VERDADE, e não `limit(300)` como no Histórico: uma
// entrada por login cresce sozinho e não tem teto natural. Com 10
// pessoas entrando duas vezes por dia são 600 linhas por mês.
// ============================================================
const AC_POR_PAGINA = 50;
let acPaginaAtual = 0;

/** Resume o texto do navegador: "Mozilla/5.0 (Macintosh; Intel Mac OS X
 *  10_15_7) AppleWebKit/537.36 … Chrome/151.0.0.0 Safari/537.36" vira
 *  "Chrome 151 · Mac". O texto inteiro fica no `title` da célula — o
 *  resumo é para ler, o original é para conferir.
 *
 *  Função DECLARADA de propósito: as conferências do repositório
 *  rastreiam atalhos `const x = ...` e cobram os argumentos como ids de
 *  tela. Aqui não há id nenhum, mas a regra da casa é essa. */
function acAparelho(ua) {
  if (!ua) return '—';
  let navegador = '';
  // A ORDEM É O TRUQUE: o Edge e o Opera se anunciam como Chrome, e o
  // Chrome se anuncia como Safari. Quem casa primeiro ganha, então os
  // disfarçados vêm antes de quem eles imitam. E o Safari tem de sair
  // do `Version/`, não do `Safari/`, que é o número do WebKit (604) e
  // não a versão do navegador (18).
  const marcas = [[/Edg\/(\d+)/, 'Edge'], [/OPR\/(\d+)/, 'Opera'],
                  [/Chrome\/(\d+)/, 'Chrome'], [/Firefox\/(\d+)/, 'Firefox'],
                  [/Version\/(\d+)[\d.]*\s+(?:Mobile\/\S+\s+)?Safari/, 'Safari']];
  for (let i = 0; i < marcas.length; i++) {
    const m = ua.match(marcas[i][0]);
    if (m) { navegador = marcas[i][1] + ' ' + m[1]; break; }
  }
  let sistema = '';
  if (/iPhone|iPad/.test(ua)) sistema = 'iPhone';
  else if (/Android/.test(ua)) sistema = 'Android';
  else if (/Macintosh/.test(ua)) sistema = 'Mac';
  else if (/Windows/.test(ua)) sistema = 'Windows';
  else if (/Linux/.test(ua)) sistema = 'Linux';
  return [navegador, sistema].filter(Boolean).join(' · ') || '—';
}

/** O inet do Postgres volta com a máscara ("179.101.173.115/32"), que
 *  não interessa a ninguém na tela. */
function acIp(v) {
  return String(v || '—').replace(/\/(32|128)$/, '');
}

/** Só a hora, para a coluna Situação: "Encerrada às 19:22". */
function acHora(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function acessosPagina(passo) {
  carregarAcessos(Math.max(0, acPaginaAtual + passo));
}

async function carregarAcessos(pagina) {
  const corpo = document.getElementById('ac-linhas');
  if (!corpo) return;
  acPaginaAtual = Math.max(0, pagina || 0);
  corpo.innerHTML = '<tr><td colspan="7" style="color:#6a7480">Carregando…</td></tr>';

  // O seletor de pessoas nasce dos usuários já carregados — nenhuma
  // consulta a mais só para preencher um filtro. Mesmo padrão do
  // Histórico de alterações.
  const selP = document.getElementById('ac-pessoa');
  if (selP && !selP.dataset.pronto) {
    selP.dataset.pronto = '1';
    selP.innerHTML = '<option value="">Todas as pessoas</option>' +
      (usuarios || []).map(u =>
        `<option value="${htm(u.usuario_id || '')}">${htm(u.nome || u.email)}</option>`).join('');
  }

  const uid   = selP ? selP.value : '';
  const dias  = parseInt((document.getElementById('ac-dias')  || {}).value || '30', 10);
  const nivel = (document.getElementById('ac-nivel') || {}).value || '';
  const ip    = ((document.getElementById('ac-ip')   || {}).value || '').trim();

  // TODOS os filtros antes de ordenar e paginar — mesma cautela do
  // Histórico: no supabase-js, filtrar depois de `.range()` funciona
  // por herança e é o tipo de coisa que quebra em silêncio numa
  // atualização da biblioteca.
  let q = sb.from('acessos')
    .select('id,usuario_id,usuario_nome,email,entrou_em,encerrada_em,nivel,entrou_por,ip,aparelho',
            { count: 'exact' })
    .eq('empresa_id', empresaAtual);

  if (uid)     q = q.eq('usuario_id', uid);
  if (nivel)   q = q.eq('nivel', nivel);
  if (dias > 0) q = q.gte('entrou_em', new Date(Date.now() - dias * 864e5).toISOString());
  // `ip` é inet no banco: o REST aceita igualdade, mas não `like` — por
  // isso o campo pede o endereço inteiro, e não um pedaço.
  if (ip)      q = q.eq('ip', ip);

  const de  = acPaginaAtual * AC_POR_PAGINA;
  const { data, error, count } = await q
    .order('entrou_em', { ascending: false })
    .range(de, de + AC_POR_PAGINA - 1);

  if (error) {
    corpo.innerHTML = `<tr><td colspan="7" style="color:var(--erro)">Não consegui ler os acessos: ${
      htm(error.message)}</td></tr>`;
    return;
  }

  const linhas = data || [];
  const total  = (count === null || count === undefined) ? linhas.length : count;

  document.getElementById('ac-conta').textContent =
    total ? `(${total} ${total === 1 ? 'entrada' : 'entradas'})` : '';

  if (!linhas.length) {
    corpo.innerHTML = '<tr><td colspan="7" style="color:#6a7480">'
      + 'Nenhuma entrada no período escolhido.</td></tr>';
  } else {
    corpo.innerHTML = linhas.map(a => {
      const quando = dataHoraBr(a.entrou_em) || '—';
      const por    = a.entrou_por === 'google' ? 'Google'
                   : a.entrou_por === 'email' || a.entrou_por === 'password' ? 'Senha'
                   : (a.entrou_por || '—');
      const duas   = a.nivel === 'aal2';
      const tagEt  = duas ? '<span class="tag tag-verde">2 etapas</span>'
                          : '<span class="tag tag-amarela">1 etapa</span>';
      const sit    = a.encerrada_em
        ? `<span class="tag tag-cinza">Encerrada às ${htm(acHora(a.encerrada_em))}</span>`
        : '<span class="tag tag-verde">Ativa agora</span>';
      return `
      <tr>
        <td style="white-space:nowrap">${htm(quando)}</td>
        <td><b>${htm(a.usuario_nome || a.email || '—')}</b></td>
        <td><span class="tag tag-cinza">${htm(por)}</span></td>
        <td>${tagEt}</td>
        <td style="font-variant-numeric:tabular-nums">${htm(acIp(a.ip))}</td>
        <td style="color:#6a7480" title="${htm(a.aparelho || '')}">${htm(acAparelho(a.aparelho))}</td>
        <td>${sit}</td>
      </tr>`;
    }).join('');
  }

  const ate = Math.min(de + linhas.length, total);
  document.getElementById('ac-faixa').textContent =
    total ? `Mostrando ${de + 1}–${ate} de ${total}` : '';
  const btnAnt = document.getElementById('ac-anterior');
  const btnPro = document.getElementById('ac-proxima');
  btnAnt.disabled = acPaginaAtual === 0;
  btnPro.disabled = ate >= total;
  btnAnt.style.opacity = btnAnt.disabled ? '.5' : '';
  btnPro.style.opacity = btnPro.disabled ? '.5' : '';

  // O AVISO DE REGISTRO PARADO.
  //
  // Os gatilhos moram no schema `auth`, que é do Supabase, não nosso. Se
  // uma atualização deles recriar a tabela `sessions`, os gatilhos somem
  // sem avisar — e a tela ficaria em silêncio, parecendo que ninguém
  // entrou. Sete dias sem registro nenhum, sem filtro estreitando a
  // busca, é o sintoma.
  const parado = document.getElementById('ac-parado');
  const semFiltro = !uid && !nivel && !ip && dias === 0;
  const maisNova = linhas.length ? new Date(linhas[0].entrou_em) : null;
  const diasSem = maisNova ? Math.floor((Date.now() - maisNova.getTime()) / 864e5) : null;
  if (semFiltro && diasSem !== null && diasSem >= 7) {
    document.getElementById('ac-parado-txt').innerHTML =
      `<b>Nenhuma entrada registrada há ${diasSem} dias.</b> O registro é feito por gatilhos no `
      + 'banco de dados, dentro do schema de autenticação do Supabase. Se eles tiverem sido removidos numa '
      + 'atualização, esta tela fica em silêncio parecendo que ninguém entrou — vale conferir.';
    parado.style.display = '';
  } else {
    parado.style.display = 'none';
  }
}

// v1.502 — a LIMPEZA DE HISTÓRICO (v1.341/1.342: limpeza_previa,
// limpeza_executar, o CSV antes do delete, as limpezas feitas) saiu
// desta tela: mora na aba Dados da Plataforma, uma imobiliária por vez,
// só para o administrador da plataforma (plataforma_limpeza_*).

// ============================================================
// v1.343 — MENSAGENS (a fila do WhatsApp agendado)
//
// A fila mora em `mensagens_agendadas` (só leitura por REST; quem
// escreve são as funções definer). Cancelar e tentar de novo são RPCs.
// Os modelos são `mensagem_modelos`, com escrita liberada pela política
// para quem tem administracao/editar — por isso aqui é REST direto.
// ============================================================
let msModeloAtual = null;   // id do modelo aberto na janela (null = novo)

function msTagSituacao(s) {
  return s === 'agendada' ? '<span class="tag tag-azul">Na fila</span>'
       : s === 'enviando' ? '<span class="tag tag-amarela">Enviando…</span>'
       : s === 'enviada'  ? '<span class="tag tag-verde">Enviada</span>'
       : s === 'falhou'   ? '<span class="tag tag-vermelha">Falhou</span>'
       :                    '<span class="tag tag-cinza">Cancelada</span>';
}

async function carregarMensagens() {
  const corpo = document.getElementById('ms-linhas');
  if (!corpo) return;
  corpo.innerHTML = '<tr><td colspan="5" style="color:#6a7480">Carregando…</td></tr>';

  const f = (document.getElementById('ms-filtro') || {}).value || '';
  // v1.782 — antes de ler, a conferência das que acabaram de sair (sem
  // esperar o robô de 5 minutos), e a lista é só a FILA DE VERDADE: o que
  // foi agendado para depois e a Transmissão (`programada`, no banco), mais
  // o que falhou (para "Tentar de novo"). O que sai na hora pela conversa
  // não é fila: fica só na conversa.
  try { await sb.rpc('mensagens_conferir', {}); } catch (e) { /* o robô cobre */ }
  let q = sb.from('mensagens_agendadas')
    .select('id,destinatario,telefone,texto,modelo_nome,enviar_em,enviada_em,situacao,erro,criada_por_nome')
    .eq('empresa_id', empresaAtual)
    .or('programada.eq.true,situacao.eq.falhou');
  if (f === 'fila') q = q.in('situacao', ['agendada', 'enviando']);
  else if (f)       q = q.eq('situacao', f);

  const { data, error } = await q.order('enviar_em', { ascending: false }).limit(200);
  if (error) {
    corpo.innerHTML = `<tr><td colspan="5" style="color:var(--erro)">Não consegui ler a fila: ${
      htm(error.message)}</td></tr>`;
    return;
  }
  const linhas = data || [];

  // o resumo em números — a leitura de relance que o mockup pedia
  const seteDias = Date.now() - 7 * 864e5;
  const nFila = linhas.filter(m => m.situacao === 'agendada' || m.situacao === 'enviando').length;
  const nErro = linhas.filter(m => m.situacao === 'falhou').length;
  const n7d   = linhas.filter(m => m.situacao === 'enviada'
                  && m.enviada_em && new Date(m.enviada_em) >= seteDias).length;
  const nTot  = linhas.filter(m => m.situacao === 'enviada').length;
  document.getElementById('ms-resumo').innerHTML = `
    <div class="ma-num"><b>${nFila}</b><span>Na fila</span></div>
    <div class="ma-num"><b>${n7d}</b><span>Enviadas em 7 dias</span></div>
    <div class="ma-num${nErro ? ' alerta' : ''}"><b>${nErro}</b><span>Falharam</span></div>
    <div class="ma-num"><b>${nTot}</b><span>Enviadas ao todo</span></div>`;
  document.getElementById('ms-conta').textContent =
    linhas.length ? `(${linhas.length})` : '';

  if (!linhas.length) {
    corpo.innerHTML = '<tr><td colspan="5" style="color:#6a7480">Nenhuma mensagem '
      + 'ainda. Agende pela ficha do lead ou do contato — botão do relógio ao lado do WhatsApp.</td></tr>';
    return;
  }

  // agrupada por dia, como o mockup: uma faixa cinza abre cada data
  let diaAberto = '';
  corpo.innerHTML = linhas.map(m => {
    const dia = dataBr(String(m.enviar_em).slice(0, 10));
    const faixa = dia !== diaAberto
      ? `<tr class="ma-dia"><td colspan="5">${htm(dia)}</td></tr>` : '';
    diaAberto = dia;
    const hora = new Date(m.enviar_em).toLocaleTimeString('pt-BR',
      { hour: '2-digit', minute: '2-digit' });
    const acao = m.situacao === 'agendada'
      ? `<button class="btn btn-claro" style="padding:4px 11px;font-size:12px"
           onclick="cancelarMensagem(${m.id})">Cancelar</button>`
      : m.situacao === 'falhou'
      ? `<button class="btn btn-claro" style="padding:4px 11px;font-size:12px"
           onclick="reagendarMensagem(${m.id})">Tentar de novo</button>` : '';
    return faixa + `
      <tr>
        <td class="ma-hora-col">${htm(hora)}</td>
        <td><b>${htm(m.destinatario || '—')}</b><br>
          <span style="color:#6a7480;font-size:12px">${htm(m.telefone || '')}</span></td>
        <td style="color:#4a5560;max-width:430px">${htm(m.texto || '')}
          ${m.modelo_nome ? `<span style="display:block;color:#8a939c;font-size:11.5px;margin-top:3px">modelo: ${htm(m.modelo_nome)}</span>` : ''}
          ${m.erro ? `<span class="ma-motivo">${htm(m.erro)}</span>` : ''}</td>
        <td>${msTagSituacao(m.situacao)}</td>
        <td style="text-align:right">${acao}</td>
      </tr>`;
  }).join('');
}

async function cancelarMensagem(id) {
  if (!(await dialogoPerguntar({ texto: 'Cancelar esta mensagem? Ela não será enviada.', ok: 'Cancelar a mensagem', cancelar: 'Voltar', perigo: true }))) return;
  const { error } = await sb.rpc('mensagem_cancelar', { p_id: id });
  if (error) { await dialogoAvisar('Não foi possível cancelar: ' + error.message); return; }
  await carregarMensagens();
}

async function reagendarMensagem(id) {
  const { error } = await sb.rpc('mensagem_reagendar', { p_id: id });
  if (error) { await dialogoAvisar('Não foi possível tentar de novo: ' + error.message); return; }
  await carregarMensagens();
}

// ---------------- os modelos ----------------
let msModelosLista = [];

// v1.380 — quantos modelos podem virar botão na faixa da tela Conversas.
// A trava que VALE é a do banco (gatilho em mensagem_modelos); este
// número existe para a tela avisar antes de o erro aparecer.
const MS_FAV_MAX = 5;

/** A estrela do icone(), cheia quando acesa. */
function msEstrela(acesa) {
  return icone('estrela', 17).replace('fill="none"', acesa ? 'fill="currentColor"' : 'fill="none"');
}

function msFavoritosAcesos() {
  return msModelosLista.filter(m => m.favorito).length;
}

async function carregarModelosMsg() {
  const corpo = document.getElementById('ms-modelos');
  if (!corpo) return;
  const { data, error } = await sb.from('mensagem_modelos')
    .select('id,nome,categoria,texto,usos,ultimo_uso_em,ativo,favorito,resultado_alvo,uso')
    .eq('empresa_id', empresaAtual).eq('ativo', true).order('nome');
  if (error) {
    corpo.innerHTML = `<tr><td colspan="5" style="color:var(--erro)">${htm(error.message)}</td></tr>`;
    return;
  }
  msModelosLista = data || [];
  document.getElementById('ms-modelos-conta').textContent =
    msModelosLista.length ? `(${msModelosLista.length})` : '';

  const acesos = msFavoritosAcesos();
  const conta = document.getElementById('ms-favoritos-conta');
  if (conta) conta.textContent = msModelosLista.length
    ? `${acesos} de ${MS_FAV_MAX} atalhos na conversa` : '';

  corpo.innerHTML = msModelosLista.map(m => `
    <tr>
      <td style="text-align:center"><button class="mm-estrela${m.favorito ? ' on' : ''}"
        title="${m.favorito ? 'É atalho na conversa — clique para tirar'
                            : 'Deixar como atalho na conversa'}"
        onclick="virarFavoritoModelo(${m.id})">${msEstrela(!!m.favorito)}</button></td>
      <td><b>${htm(m.nome)}</b>${m.categoria
        ? `<br><span class="tag tag-cinza" style="margin-top:4px;display:inline-block">${htm(m.categoria)}</span>` : ''}${
        // v1.463/467 — para que o modelo serve, quando não é avulso
        msRotuloUso(m)
        ? `<br><span class="tag tag-verde" style="margin-top:4px;display:inline-block">${
             htm(msRotuloUso(m))}</span>` : ''}${
        msPartes(m.texto) > 1
        ? `<br><span class="tag tag-cinza" style="margin-top:4px;display:inline-block">${
             msPartes(m.texto)} mensagens</span>` : ''}</td>
      <td style="color:#4a5560;max-width:480px">${htm(m.texto)}</td>
      <td style="color:#6a7480;font-size:12px;white-space:nowrap">${m.usos || 0} uso${(m.usos || 0) === 1 ? '' : 's'}${
        m.ultimo_uso_em ? '<br>último: ' + htm(dataBr(String(m.ultimo_uso_em).slice(0, 10))) : ''}</td>
      <td style="text-align:right"><button class="btn btn-claro"
        style="padding:4px 11px;font-size:12px" onclick="abrirModeloMsg(${m.id})">Editar</button></td>
    </tr>`).join('')
    || '<tr><td colspan="5" style="color:#6a7480">Nenhum modelo. Crie o primeiro.</td></tr>';
}

/** A estrela da linha — o caminho curto, sem abrir a janela. */
async function virarFavoritoModelo(id) {
  const m = msModelosLista.find(x => x.id === id);
  if (!m) return;
  if (!m.favorito && msFavoritosAcesos() >= MS_FAV_MAX) {
    await dialogoAvisar('Já são ' + MS_FAV_MAX + ' atalhos na conversa.\n\n'
        + 'Apague a estrela de um deles antes de acender este.');
    return;
  }
  const { error } = await sb.from('mensagem_modelos')
    .update({ favorito: !m.favorito }).eq('id', id);
  if (error) { await dialogoAvisar('Não foi possível mudar o atalho: ' + error.message); return; }
  await carregarModelosMsg();
}

/** O aviso do "cabem 5", escrito de novo a cada abertura da janela. */
function msPintarSobra() {
  const alvo = document.getElementById('mm-favorito-sobra');
  if (!alvo) return;
  const marcado = document.getElementById('mm-favorito').checked;
  // o próprio modelo aberto não pode se contar duas vezes
  const outros = msModelosLista.filter(m => m.favorito && m.id !== msModeloAtual).length;
  const usados = outros + (marcado ? 1 : 0);
  const sobra  = MS_FAV_MAX - usados;
  alvo.textContent =
      sobra > 0  ? `${usados} marcado${usados === 1 ? '' : 's'}, ${
                     sobra === 1 ? 'falta 1' : 'faltam ' + sobra}`
    : sobra === 0 ? 'os 5 já estão marcados'
    // marcou este com os 5 outros já acesos: o Salvar vai barrar, e é
    // melhor dizer isso agora do que depois de o botão ser clicado
    :               'os 5 já estão marcados em outros — apague a estrela de um deles';
  alvo.className = sobra > 0 ? '' : 'cheio';
}

/**
 * v1.463 — quantos pedaços o texto tem. A linha só com `---` é a
 * tesoura: cada pedaço vira uma mensagem separada no WhatsApp. A conta
 * é a MESMA do `amPartes` da ficha — se um dia mudar lá, muda aqui.
 */
function msPartes(texto) {
  return String(texto || '').split(/\n[ \t]*-{3,}[ \t]*(?=\n|$)/)
    .map(t => t.trim()).filter(Boolean).length;
}

/** v1.467 — o valor do seletor para um modelo que já existe */
function msValorUso(m) {
  if (m.uso === 'recibo_repasse') return 'recibo_repasse';
  if (m.resultado_alvo) return 'sim:' + m.resultado_alvo;
  return '';
}

/** v1.467 — a marca que a lista mostra ('' quando é mensagem avulsa) */
function msRotuloUso(m) {
  if (m.uso === 'recibo_repasse') return 'Recibo do repasse';
  if (m.resultado_alvo) return 'Simulação · ' + m.resultado_alvo;
  return '';
}

/* ============================================================
 * v1.621 — OS ATALHOS DO MODELO, EM UM LUGAR SÓ
 *
 * Até aqui a janela listava os atalhos numa FRASE DE AJUDA e a pessoa
 * digitava `{vencimento}` de cabeça. Errar uma letra — ou inventar um
 * `{cpf_do_proprietario}` — não dá erro aqui: dá uma mensagem que o
 * banco RECUSA enviar (a trava da `mensagem_agendar` procura
 * `\{[a-z_]+\}` sem valor), e isso só aparece na hora do envio, longe
 * de quem escreveu o modelo.
 *
 * Agora se escolhe: objeto, campo, Inserir. E esta tabela é a ÚNICA
 * fonte — a frase de ajuda passou a ser gerada a partir dela, em vez de
 * repetir os mesmos nomes à mão em outra string (a lição do "nada em
 * dobro": duas listas divergem em silêncio, e quem escreve o modelo
 * acredita na errada).
 *
 * O QUE PODE ENTRAR AQUI: só atalho que o motor de envio sabe
 * preencher. Quem preenche a mensagem avulsa é o `abrirAgendarMensagem`
 * (ficha.js), o da simulação é o `amAtalhosSimulacao`, e o do recibo é
 * o caminho do repasse. Acrescentar um campo nesta tabela SEM ensinar
 * o motor a buscá-lo é oferecer um atalho que trava o envio.
 * ============================================================ */
const MS_ATALHOS = {
  // uso '' = mensagem avulsa (a janela do 🕒 na ficha)
  '': [
    ['Contato', [
      ['nome', 'Primeiro nome de quem recebe', 'Ronaldo']]],
    ['Imóvel', [
      ['imovel', 'Endereço do imóvel do contrato ativo', 'RUA ARACAJU, 1716']]],
    ['Contrato', [
      ['valor', 'Aluguel do contrato ativo (o R$ vem junto)', 'R$ 1.200,00'],
      ['vencimento', 'Dia do vencimento', 'dia 5'],
      ['contrato', 'Código do contrato', 'CON-0076']]]
  ],
  // uso 'sim' = modelo de simulação (qualquer resultado)
  'sim': [
    ['Contato', [
      ['nome', 'Primeiro nome de quem recebe', 'Ronaldo']]],
    ['Imóvel', [
      ['imovel', 'Endereço do imóvel', 'RUA ARACAJU, 1716']]],
    ['Simulação', [
      ['resultado', 'Resultado da análise', 'Aprovado'],
      ['aluguel', 'Aluguel usado na simulação', 'R$ 1.200,00'],
      ['fianca', 'Mensalidade do seguro fiança', 'R$ 180,00'],
      ['soma_mensal', 'Aluguel + fiança', 'R$ 1.380,00'],
      ['incendio_parcela', 'Incêndio dividido em 6', 'R$ 23,50'],
      ['setup', 'Taxa de ativação', 'R$ 150,00'],
      ['entrada', 'Fiança + setup', 'R$ 330,00'],
      ['cpf', 'CPF analisado, já mascarado', '123.***.***-45'],
      ['seguradora', 'Nome da seguradora', 'Porto Seguro']]]
  ],
  // uso 'recibo_repasse' = o texto do botão Recibo no WhatsApp
  'recibo_repasse': [
    ['Contato', [
      ['nome', 'Primeiro nome do proprietário', 'Sônia']]],
    ['Imóvel', [
      ['imovel', 'Endereço do imóvel', 'RUA ARACAJU, 1716']]],
    ['Repasse', [
      ['mes', 'Mês do repasse', 'setembro/2026'],
      ['valor', 'Valor repassado (o R$ vem junto)', 'R$ 1.020,00'],
      ['link', 'Link do recibo', 'morali.app/recibo…']]]
  ]
};

/** a chave da tabela para o que está escolhido no "Onde este modelo é usado" */
function msUsoDoAtalho() {
  const v = (document.getElementById('mm-resultado') || {}).value || '';
  return v.startsWith('sim:') ? 'sim' : (MS_ATALHOS[v] ? v : '');
}

/** os grupos do uso atual */
function msGruposAtalho() { return MS_ATALHOS[msUsoDoAtalho()] || MS_ATALHOS['']; }

/** os campos de um objeto (por nome do grupo) */
function msCamposDoObjeto(nome) {
  const g = msGruposAtalho().find(x => x[0] === nome);
  return g ? g[1] : [];
}

/** as chaves que valem no uso atual — é com elas que o aviso compara */
function msChavesValidas() {
  const s = new Set();
  msGruposAtalho().forEach(([, itens]) => itens.forEach(i => s.add(i[0])));
  return s;
}

/** os atalhos já escritos no texto (só letras e _, como a trava do banco) */
function msAtalhosNoTexto() {
  const t = (document.getElementById('mm-texto') || {}).value || '';
  return new Set([...t.matchAll(/\{([a-z_]+)\}/g)].map(m => m[1]));
}

/** (re)desenha o seletor de objeto — chamado quando o uso muda */
function msPintarAtalhos() {
  const obj = document.getElementById('mm-at-obj');
  if (!obj) return;                      // janela antiga em cache: nada a fazer
  const antes = obj.value;
  obj.innerHTML = msGruposAtalho()
    .map(([nome]) => `<option>${htm(nome)}</option>`).join('');
  // mantém o objeto escolhido quando ele existe no uso novo
  if (antes && msCamposDoObjeto(antes).length) obj.value = antes;
  msTrocouObjeto();
}

/** o seletor de campo segue o objeto; o ✓ diz o que já está no texto */
function msTrocouObjeto() {
  const alvo = document.getElementById('mm-at-campo');
  if (!alvo) return;
  const usados = msAtalhosNoTexto();
  const obj = document.getElementById('mm-at-obj').value;
  // o ✓ é recalculado a cada tecla digitada no texto, e redesenhar o
  // select apagaria a escolha da pessoa no meio da frase: guarda e repõe
  const antes = alvo.value;
  alvo.innerHTML = msCamposDoObjeto(obj).map(([chave, texto]) =>
    `<option value="${htm(chave)}">${htm(texto)}${
      usados.has(chave) ? '  ✓ já está no texto' : ''}</option>`).join('');
  if (antes && msCamposDoObjeto(obj).some(i => i[0] === antes)) alvo.value = antes;
  msVerExemplo();
}

/** o exemplo do campo escolhido: o que ele vira na mensagem */
function msVerExemplo() {
  const alvo = document.getElementById('mm-at-exemplo');
  if (!alvo) return;
  const chave = document.getElementById('mm-at-campo').value;
  const item = msCamposDoObjeto(document.getElementById('mm-at-obj').value)
    .find(i => i[0] === chave);
  alvo.innerHTML = item
    ? `Entra como <b>{${htm(item[0])}}</b> e, na mensagem, vira <b>${htm(item[2])}</b>.`
    : '';
}

/**
 * Insere o atalho NO LUGAR DO CURSOR (e por cima do que estiver
 * selecionado), não no fim do texto: quem está escrevendo a frase
 * "o aluguel de ___ vence dia ___" espera o atalho onde está o cursor.
 */
function msInserirAtalho() {
  const t = document.getElementById('mm-texto');
  const sel = document.getElementById('mm-at-campo');
  if (!t || !sel || !sel.value) return;
  const texto = '{' + sel.value + '}';
  const a = t.selectionStart, b = t.selectionEnd;
  if (a === undefined || a === null) {           // navegador sem seleção: no fim
    t.value += texto;
  } else {
    t.value = t.value.slice(0, a) + texto + t.value.slice(b);
    const fim = a + texto.length;
    t.focus();
    try { t.setSelectionRange(fim, fim); } catch (e) { /* campo sem seleção */ }
  }
  msPintarSimulacao();                            // conta as partes e o aviso
  msTrocouObjeto();                               // o ✓ do campo recém-usado
}

/**
 * O aviso do atalho que não existe. O envio já é barrado pelo banco,
 * mas lá é tarde: a mensagem simplesmente não sai, e ninguém liga o
 * problema ao modelo escrito dias antes. Aqui o erro aparece enquanto a
 * pessoa ainda está com o texto na frente.
 */
function msConferirAtalhos() {
  const alvo = document.getElementById('mm-at-aviso');
  if (!alvo) return;
  const bons = msChavesValidas();
  // a busca aceita acento e maiúscula DE PROPÓSITO: {Imóvel} é
  // justamente o erro que a pessoa comete e que a trava do banco (só
  // [a-z_]) deixaria passar como texto literal na mensagem do cliente
  const escritos = [...new Set([...(document.getElementById('mm-texto').value || '')
    .matchAll(/\{([A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ_0-9]*)\}/g)].map(m => m[1]))];
  const ruins = escritos.filter(x => !bons.has(x));
  if (!ruins.length) { alvo.className = 'mm-at-aviso'; return; }
  alvo.className = 'mm-at-aviso mostrar';
  alvo.innerHTML = '<b>' + ruins.map(r => '{' + htm(r) + '}').join(' · ') + '</b> — '
    + (ruins.length === 1 ? 'este atalho não existe' : 'estes atalhos não existem')
    + ' aqui. Escolha um da lista: o envio de uma mensagem com atalho sem valor é '
    + 'recusado pelo banco, e você só descobriria na hora de enviar.';
}

/** v1.463 — as duas ajudas mudam conforme o modelo seja de simulação */
function msPintarSimulacao() {
  const escolha = document.getElementById('mm-resultado').value;
  const sim = escolha.startsWith('sim:');
  const rec = escolha === 'recibo_repasse';
  const n = msPartes(document.getElementById('mm-texto').value);

  document.getElementById('mm-resultado-ajuda').innerHTML =
      sim ? 'Este texto abre no botão <b>Enviar</b> da simulação com resultado <b>'
            + htm(escolha.slice(4)) + '</b>. Ele sai da lista da mensagem avulsa: fora '
            + 'da simulação os atalhos de dinheiro não teriam de onde sair.'
    : rec ? 'Este texto é o que sai no botão <b>Recibo no WhatsApp</b> do repasse ao '
            + 'proprietário. Um modelo por imobiliária.'
    :       'Fica na janela do 🕒 da ficha, para mandar quando você quiser.';

  // v1.621 — a lista de atalhos SAIU daqui: quem a mostra é o seletor
  // (objeto → campo → Inserir), alimentado pelo MS_ATALHOS. Repetir os
  // mesmos nomes numa frase de ajuda era a segunda cópia que um dia
  // divergiria da primeira. Fica o que o seletor não diz: a regra do R$
  // e a tesoura do `---`.
  document.getElementById('mm-atalhos-ajuda').innerHTML =
    '<b>O R$ já vem no atalho</b> — escreva <b>{valor}</b>, nunca <b>R$ {valor}</b>.'
    + '<br>Uma linha com <b>---</b> corta o texto: cada pedaço vira uma mensagem '
    + 'separada no WhatsApp'
    + (n > 1 ? ` — este texto vai sair em <b>${n} mensagens</b>.` : '.');

  // o seletor segue o uso: os campos da simulação não existem no modelo
  // avulso, e oferecê-los seria oferecer um envio que o banco recusa
  msPintarAtalhos();
  msConferirAtalhos();
}

function abrirModeloMsg(id) {
  msModeloAtual = id;
  const m = id ? msModelosLista.find(x => x.id === id) : null;
  document.getElementById('mm-titulo').textContent = m ? 'Editar modelo' : 'Novo modelo';
  document.getElementById('mm-nome').value      = m ? m.nome : '';
  document.getElementById('mm-categoria').value = m ? (m.categoria || '') : '';
  document.getElementById('mm-texto').value     = m ? m.texto : '';
  document.getElementById('mm-resultado').value  = m ? msValorUso(m) : '';
  document.getElementById('mm-texto').oninput = msPintarSimulacao;
  msPintarSimulacao();
  const fav = document.getElementById('mm-favorito');
  fav.checked  = m ? !!m.favorito : false;
  fav.onchange = msPintarSobra;
  msPintarSobra();
  document.getElementById('mm-excluir').style.display = m ? '' : 'none';
  document.getElementById('mm-erro').style.display = 'none';
  document.getElementById('modal-modelo-msg').classList.add('aberto');
}

async function salvarModeloMsg() {
  const erro = document.getElementById('mm-erro');
  erro.style.display = 'none';
  const nome  = document.getElementById('mm-nome').value.trim();
  const texto = document.getElementById('mm-texto').value.trim();
  if (!nome || !texto) {
    erro.textContent = 'Preencha o nome e o texto.';
    erro.style.display = 'block';
    return;
  }
  const favorito = document.getElementById('mm-favorito').checked;
  // avisa aqui, com o nome dos que já estão marcados — o gatilho do banco
  // barraria do mesmo jeito, mas com uma frase de banco de dados
  if (favorito) {
    const outros = msModelosLista.filter(m => m.favorito && m.id !== msModeloAtual);
    if (outros.length >= MS_FAV_MAX) {
      erro.textContent = `Já são ${MS_FAV_MAX} atalhos na conversa (${
        outros.map(m => m.nome).join(', ')}). Apague a estrela de um deles antes.`;
      erro.style.display = 'block';
      return;
    }
  }
  // v1.463 — o modelo de simulação escreve {fianca}, nunca R$ {fianca}:
  // o R$ já vem dentro do atalho e o cliente receberia "R$ R$ 137,50".
  // O banco não tem como saber isso; a tela avisa antes de salvar.
  // v1.467 — um seletor, duas colunas: `uso` diz PARA QUE serve e
  // `resultado_alvo` só faz sentido quando o uso é simulação. Antes o
  // resultado respondia as duas perguntas, e o recibo teria de fingir
  // um resultado de fiança para caber.
  const escolha = document.getElementById('mm-resultado').value;
  const resultado_alvo = escolha.startsWith('sim:') ? escolha.slice(4) : null;
  const uso = escolha.startsWith('sim:') ? 'simulacao' : (escolha || null);
  if ((resultado_alvo || uso) && /R\$\s*\{/.test(texto)) {
    erro.innerHTML = 'Tire o <b>R$</b> escrito antes do atalho: ele já vem dentro '
      + 'do valor, e a mensagem sairia com <b>R$ R$ 137,50</b>.';
    erro.style.display = 'block';
    return;
  }
  const linha = { nome, texto, favorito, resultado_alvo, uso,
    categoria: document.getElementById('mm-categoria').value.trim() || null };
  const q = msModeloAtual
    ? sb.from('mensagem_modelos').update(linha).eq('id', msModeloAtual)
    : sb.from('mensagem_modelos').insert({ ...linha, empresa_id: empresaAtual });
  const { error } = await q;
  if (error) { erro.textContent = error.message; erro.style.display = 'block'; return; }
  fechar('modal-modelo-msg');
  await carregarModelosMsg();
}

async function excluirModeloMsg() {
  if (!msModeloAtual) return;
  if (!(await dialogoPerguntar({ texto: 'Excluir este modelo? As mensagens já agendadas com ele não mudam.', ok: 'Excluir', perigo: true }))) return;
  // exclusão lógica: o contador de usos e o histórico do nome sobrevivem.
  // v1.380 — a estrela se apaga junto, senão o modelo excluído continuaria
  // ocupando uma das 5 vagas de atalho sem aparecer em lugar nenhum.
  const { error } = await sb.from('mensagem_modelos')
    .update({ ativo: false, favorito: false }).eq('id', msModeloAtual);
  if (error) { await dialogoAvisar('Não foi possível excluir: ' + error.message); return; }
  fechar('modal-modelo-msg');
  await carregarModelosMsg();
}


// ============================================================
// v1.344 — CONECTAR O WHATSAPP DE DENTRO DO CRM
//
// Tudo passa pela Edge Function `evolution-conectar` (três ações:
// estado | qr | desconectar). Ela confere a sessão, o
// posso('administracao','editar') e resolve a instância pelo PERFIL de
// quem chama — o navegador nunca vê a chave-mestra da Evolution nem
// escolhe instância. Erros voltam como { erro } com HTTP 200, para a
// tela mostrar sem estourar.
//
// O QR do WhatsApp EXPIRA em ~40 segundos: enquanto a janela está
// aberta, o código é renovado a cada 30s e o estado é conferido a cada
// 4s — quando vira 'open', a janela fecha sozinha e o cartão comemora.
// ============================================================
let waTimerEstado = null;
let waTimerQr = null;

async function waChamar(acao) {
  try {
    // v1.345 — a EMPRESA vai junto: o perfil do administrador da
    // plataforma não pertence a imobiliária nenhuma, então a função não
    // pode descobri-la sozinha. Quem valida é a RLS de `integracoes`.
    const { data, error } = await sb.functions.invoke('evolution-conectar',
      { body: { acao, empresa: empresaAtual } });
    if (error) return { erro: error.message || 'A função evolution-conectar não respondeu.' };
    return data || {};
  } catch (e) {
    return { erro: (e && e.message) || 'A função evolution-conectar não respondeu.' };
  }
}

async function carregarConexaoWhats() {
  const corpo = document.getElementById('wa-corpo');
  if (!corpo) return;
  const r = await waChamar('estado');

  const tag = document.getElementById('wa-estado');
  if (r.erro) {
    tag.textContent = '';
    // v1.584 — imobiliária sem integração: o cartão oferece criar. A Edge
    // (rev 8) cria a instância na Evolution e o banco guarda a chave dela;
    // aqui só se clica e, em seguida, se lê o QR.
    if (r.sem_integracao) {
      tag.innerHTML = '<span class="tag tag-amarela">Não ligado</span>';
      corpo.innerHTML = `
        <div class="aviso-fin"><b>Esta imobiliária ainda não tem WhatsApp ligado ao CRM.</b>
          Um clique cria a linha dela na central de mensagens; depois é só ler o QR com o celular
          que vai atender.</div>
        <button class="btn" style="margin-top:12px" onclick="criarConexaoWhats()">Criar a conexão do WhatsApp</button>`;
      return;
    }
    // sem Edge Function publicada: o cartão explica em vez de fingir que está tudo bem
    corpo.innerHTML = `<div class="aviso-fin">${htm(r.erro)}</div>`;
    return;
  }
  if (r.estado === 'open') {
    tag.innerHTML = '<span class="tag tag-verde">Conectado</span>';
    corpo.innerHTML = `
      <p style="margin:0 0 12px;color:#4a5560">O número da imobiliária está conectado e as
        mensagens agendadas saem por ele. Desconectar é só para trocar de aparelho ou de chip.</p>
      <button class="btn btn-claro" onclick="desconectarWhats()">Desconectar</button>`;
  } else {
    tag.innerHTML = r.estado === 'connecting'
      ? '<span class="tag tag-amarela">Aguardando o QR</span>'
      : '<span class="tag tag-vermelha">Desconectado</span>';
    corpo.innerHTML = `
      <div class="aviso-fin" style="background:#fdeaea;border-color:#f3c7c7">
        <b>O WhatsApp não está conectado.</b> Mensagem agendada não sai enquanto isso —
        ela espera na fila e é enviada quando a conexão voltar.</div>
      <button class="btn" style="margin-top:12px" onclick="abrirQrWhats()">Conectar WhatsApp</button>`;
  }
}

/** v1.584 — cria a instância desta imobiliária na Evolution (pela Edge,
 *  com a chave do manager que só ela tem) e já abre o QR. */
let waCriando = false;
async function criarConexaoWhats() {
  if (waCriando) return;          // v1.585 — clique duplo não cria duas vezes
  waCriando = true;
  try {
    const corpo = document.getElementById('wa-corpo');
    if (corpo) corpo.innerHTML = '<p style="margin:0;color:#4a5560">Criando a conexão… isso leva alguns segundos.</p>';
    const r = await waChamar('criar');
    if (r.erro) {
      await dialogoAvisar(r.erro);
      await carregarConexaoWhats();
      return;
    }
    if (r.aviso) await dialogoAvisar('Conexão criada.' + r.aviso);
    await carregarConexaoWhats();
    await abrirQrWhats();
  } finally {
    waCriando = false;
  }
}

async function abrirQrWhats() {
  document.getElementById('wa-erro').style.display = 'none';
  document.getElementById('wa-pareamento').textContent = '';
  document.getElementById('wa-qr').innerHTML = '<span style="color:#6a7480">Gerando o código…</span>';
  document.getElementById('modal-wa').classList.add('aberto');
  await waRenovarQr();
  // o QR expira em ~40s: renova a cada 30
  waTimerQr = setInterval(waRenovarQr, 30000);
  // e o estado é conferido a cada 4s até conectar
  waTimerEstado = setInterval(async () => {
    const r = await waChamar('estado');
    if (r.estado === 'open') {
      fecharQrWhats();
      await dialogoAvisar('WhatsApp conectado! As mensagens agendadas já saem por este número.');
      await carregarConexaoWhats();
    }
  }, 4000);
}

async function waRenovarQr() {
  const r = await waChamar('qr');
  const erro = document.getElementById('wa-erro');
  if (r.erro) {
    erro.textContent = r.erro;
    erro.style.display = 'block';
    return;
  }
  if (r.base64) {
    document.getElementById('wa-qr').innerHTML =
      `<img src="${htm(r.base64)}" alt="QR do WhatsApp" style="width:264px;height:264px">`;
  }
  document.getElementById('wa-pareamento').textContent = r.codigo
    ? `Sem câmera? No WhatsApp, escolha "Conectar com número de telefone" e digite: ${r.codigo}`
    : '';
}

function fecharQrWhats() {
  if (waTimerQr)     { clearInterval(waTimerQr);     waTimerQr = null; }
  if (waTimerEstado) { clearInterval(waTimerEstado); waTimerEstado = null; }
  fechar('modal-wa');
}

async function desconectarWhats() {
  if (!(await dialogoPerguntar({ texto: 'Desconectar o WhatsApp?\n\nAs mensagens agendadas param de sair até '
             + 'alguém conectar de novo pelo QR.', ok: 'Desconectar', perigo: true }))) return;
  const r = await waChamar('desconectar');
  if (r.erro) { await dialogoAvisar('Não foi possível desconectar: ' + r.erro); return; }
  await carregarConexaoWhats();
}


// ============================================================
// v1.347 — REGRAS DE ENVIO (pausa entre mensagens e teto diário)
//
// Ler é REST direto (a política de integracoes já limita a
// administracao/ver). Salvar é a RPC mensagens_config_salvar — a
// tabela não tem escrita por REST de propósito: abrir UPDATE deixaria
// trocar também o nome do `segredo`.
// ============================================================
async function carregarConfigEnvio() {
  const campo = document.getElementById('ms-cfg-min');
  if (!campo) return;
  const { data } = await sb.from('integracoes')
    .select('limite_dia,espaco_min_seg,espaco_max_seg')
    .eq('empresa_id', empresaAtual).eq('tipo', 'evolution').maybeSingle();
  if (!data) return;
  campo.value = data.espaco_min_seg;
  document.getElementById('ms-cfg-max').value    = data.espaco_max_seg;
  document.getElementById('ms-cfg-limite').value = data.limite_dia;
}

async function salvarConfigEnvio() {
  const erro = document.getElementById('ms-cfg-erro');
  erro.style.display = 'none';
  const min    = parseInt(document.getElementById('ms-cfg-min').value, 10);
  const max    = parseInt(document.getElementById('ms-cfg-max').value, 10);
  const limite = parseInt(document.getElementById('ms-cfg-limite').value, 10);
  const { error } = await sb.rpc('mensagens_config_salvar',
    { p_empresa: empresaAtual, p_limite: limite, p_min: min, p_max: max });
  if (error) {
    erro.textContent = error.message;
    erro.style.display = 'block';
    return;
  }
  await dialogoAvisar('Regras salvas. Valem já para o próximo envio.');
}


// ============================================================
// v1.407 — AVISOS AUTOMÁTICOS (a régua do Robô Guardião)
//
// O e-mail diário trazia contratos vencendo daqui a 40 e 60 dias. A
// janela existia — duas chaves da `robo_config` —, mas só o SQL Editor
// do Supabase a alcançava.
//
// E havia um problema maior por baixo: a `contratos_a_vencer()` devolve
// TRÊS famílias juntas (fim do contrato, reajuste, renovação de seguro)
// e todas saíam carimbadas como "Contrato", cortadas pela MESMA régua.
// Quem lia o e-mail via "Contrato · em 58 dias" sem saber que aquilo
// era um seguro a renovar. Agora cada assunto tem etiqueta e régua.
//
// A tela lê e grava a `guardiao_regua` por REST, direto: é tabela nova,
// com RLS, e não guarda segredo nenhum. A `robo_config` continua
// intocada pelo navegador — ela guarda a chave do Resend, e a leitura
// por REST foi revogada de propósito na auditoria de 14/08.
// ============================================================
//
// DOIS TIPOS DE ASSUNTO, e é a diferença que decide o controle da
// direita:
//   PRAZO    — tem data. A pergunta é "com quantos dias avisar?".
//   CADASTRO — não tem data; é coisa que falta preencher. A pergunta é
//              "de quanto em quanto tempo cobrar?". Se eu forçasse uma
//              data nesse tipo, ele apareceria vermelho todo dia.
const GD_ASSUNTOS = [
  { a: 'contrato_fim',      t: 'prazo', n: 'Fim de contrato',
    d: 'Contratos chegando ao fim da vigência — é o seu prazo de aviso prévio.' },
  { a: 'contrato_reajuste', t: 'prazo', n: 'Reajuste do aluguel',
    d: 'Aniversário do contrato, pelo índice combinado.' },
  { a: 'contrato_seguro',   t: 'prazo', n: 'Renovação de seguro',
    d: 'Apólices vigentes chegando ao fim da vigência.' },
  { a: 'sinistro',          t: 'prazo', n: 'Sinistro a cobrar',
    d: 'Prazos do sinistro: abrir, cumprir exigência, cobrar retorno, conferir a indenização.' },
  // v1.759 — o bloco existe no e-mail desde 01/10/2026, mas não tinha
  // linha aqui: ninguém conseguia desligar nem mudar os 7 dias. É o único
  // assunto que usa as DUAS colunas da régua — os dias dizem até onde
  // olhar à frente, a frequência diz quando mandar — por isso o tipo
  // 'ambos' mostra os dois controles. `padrao` é o que a linha mostra
  // enquanto não existe no banco (o mesmo da guardiao_semear_regua).
  { a: 'contas_a_pagar',    t: 'ambos', n: 'Contas a pagar',
    padrao: { dias: 7, frequencia: 'diaria' },
    d: 'Lançamentos do Livro Caixa com saída prevista e sem baixa: todos os vencidos e os que '
     + 'vencem nos próximos dias. A lista do e-mail mostra até 15; o resto está no Financeiro.' },
  // v1.797 — o bloco "Seguro fiança": aluguel atrasado que já pode (ou
  // vai poder nos próximos dias) virar sinistro, e fiança vencida sem
  // renovar. Os dias dizem até onde olhar à frente; a frequência, quando
  // mandar. Sem linha no banco vale o padrão (o robô também assume).
  { a: 'seguro_fianca',     t: 'ambos', n: 'Seguro fiança',
    padrao: { dias: 7, frequencia: 'diaria' },
    d: 'Aluguel atrasado de contrato com fiança que já pode virar sinistro (ou vai poder nos '
     + 'próximos dias), com o último dia para comunicar; e fiança vencida sem renovar, com as '
     + 'datas em que a seguradora suspende e cancela. Pelos prazos de cada seguradora.' },
  // v1.408 — o primeiro assunto de cadastro
  // v1.759 — os dois de água só aparecem com o Monitor de Água no plano
  // (`modulo`); o robô também só os manda nesse caso (guardiao_cadastro).
  { a: 'imovel_sem_uc',     t: 'cadastro', n: 'Imóvel sem UC de água', modulo: 'agua',
    d: 'Imóveis alugados ou em reforma sem a unidade consumidora cadastrada — sem ela o robô '
     + 'da SAEC não acompanha as faturas. Quem tem motivo preenchido na ficha ("água no '
     + 'condomínio", "compartilhada") não entra.' },
  // v1.412
  { a: 'agua_transferir',   t: 'cadastro', n: 'Conta de água a transferir', modulo: 'agua',
    d: 'Contas que você marcou no Monitor de Água para passar ao nome do inquilino e que a '
     + 'SAEC ainda devolve no nome antigo. Some sozinho quando a transferência acontecer.' },
  // v1.611 — a Gestão entra no e-mail diário. Os dois são de PRAZO: o
  // que já venceu entra sempre, e o número decide o quanto o robô avisa
  // ANTES. Quem não usa planos de ação é só desligar aqui.
  { a: 'gestao_acao',       t: 'prazo', n: 'Ação de plano vencendo',
    d: 'Ações do 5W2H com prazo chegando, e todas as que já venceram. Ação de plano é '
     + 'coisa do dia a dia: 3 dias de antecedência costuma bastar — avisar com 30 vira '
     + 'ruído. Ação sem dono aparece no e-mail como NINGUÉM, porque isso é o problema.' },
  { a: 'gestao_resultado',  t: 'prazo', n: 'Resultado-chave vencendo',
    d: 'Resultados-chave com prazo chegando que ainda não foram atingidos. O e-mail leva a '
     + 'frase que o próprio banco escreve ("72% do tempo gasto para 31% feito"), e não só '
     + '"atrasado". Resultado-chave não se vira em 3 dias: 15 é um começo razoável.' },
  // v1.612 — o ciclo PDCA é de CADASTRO, e não de prazo: ciclo aberto
  // não tem data de vencimento. A pergunta desta família é a certa para
  // ele — não "com quantos dias avisar antes", e sim de quanto em quanto
  // tempo cobrar.
  { a: 'gestao_ciclo',      t: 'cadastro', n: 'Ciclo PDCA sem fechar',
    d: 'Ciclos abertos há mais de 30 dias. Ciclo que não fecha não ensina nada: o '
     + 'aprendizado do PDCA mora no fechamento, quando alguém olha os números e escreve o '
     + 'que muda — e enquanto ele fica aberto, o ciclo seguinte não começa. O corte de 30 '
     + 'dias vem do banco e aparece escrito no próprio e-mail.' },
  // v1.721 — as metas da semana. É de CADASTRO porque a pergunta certa
  // é "de quanto em quanto tempo": toda segunda, a semana que passou
  // contra a meta do mês (Definir metas). Só entra no e-mail quando
  // alguma das três ficou abaixo — semana em dia não gera linha.
  { a: 'metas_semana',      t: 'cadastro', n: 'Metas: a semana que passou',
    d: 'Abordagens, captações e locações da semana contra a meta do mês, e o que falta '
     + 'até o fim do mês por dia útil. A meta vem de Metas → Definir metas; sem meta '
     + 'gravada o bloco não sai. Semana em dia não gera aviso.' }
];

const GD_FREQUENCIAS = [
  ['semanal', 'toda segunda-feira'],
  ['diaria',  'todo dia']
];

let GD_REGUA = [];

/** v1.759 — os assuntos que esta imobiliária tem no plano. A regra é a
 *  da Configuração (configNoPlano): vale também para o superadmin. A
 *  tela e o Salvar usam a MESMA lista — assunto escondido não é gravado,
 *  e a linha que já existe no banco fica como estava. */
function gdAssuntosDoPlano() {
  return GD_ASSUNTOS.filter(s => !s.modulo
    || typeof configNoPlano !== 'function' || configNoPlano({ modulo: s.modulo }));
}

async function carregarReguaGuardiao() {
  const el = document.getElementById('gd-regua');
  if (!el) return;
  el.innerHTML = '<p class="rg-vazio">Carregando…</p>';
  const { data, error } = await sb.from('guardiao_regua').select('*')
    .eq('empresa_id', empresaAtual);
  if (error) {
    el.innerHTML = `<p class="rg-vazio">Não consegui ler a régua: ${htm(error.message)}</p>`;
    return;
  }
  GD_REGUA = data || [];

  // Assunto que ainda não tem linha no banco aparece com o padrão de
  // fábrica, e não some da tela: uma régua invisível é uma régua que
  // ninguém sabe que está valendo.
  el.innerHTML = gdAssuntosDoPlano().map(s => {
    const r = GD_REGUA.find(x => x.assunto === s.a)
              || Object.assign({ dias: 30, ativo: true, frequencia: 'semanal', novo: true }, s.padrao);
    const trava = r.ativo ? '' : 'disabled';
    const estilo = 'padding:7px 8px;font-size:14px;border:1px solid var(--borda);'
                 + 'border-radius:8px;font-family:inherit';
    const seletor = `<select id="gd-freq-${s.a}" style="${estilo}" ${trava}>${
          GD_FREQUENCIAS.map(([v, rot]) =>
            `<option value="${v}"${(r.frequencia || 'semanal') === v ? ' selected' : ''}>${
              htm(rot)}</option>`).join('')}</select>`;
    const numero = `<input type="number" min="0" max="365" step="1" id="gd-dias-${s.a}"
                value="${Number(r.dias)}" style="width:68px;text-align:center;${estilo}" ${trava}>
         <span>dias antes</span>`;
    // o controle da direita muda com o tipo do assunto
    const controle = s.t === 'cadastro' ? seletor + ' <span>cobrar</span>'
                   : s.t === 'ambos'    ? numero + ' ' + seletor
                   : numero;

    return `<div class="rg-l ${r.ativo ? '' : 'off'}" id="gd-l-${s.a}">
      <button class="rg-sw ${r.ativo ? 'on' : ''}" title="${r.ativo ? 'Desligar' : 'Ligar'}"
              onclick="alternarAssuntoGuardiao('${jsq(s.a)}')"></button>
      <div class="rg-c">
        <div class="rg-n">${htm(s.n)}</div>
        <div class="rg-d">${htm(s.d)}</div>
      </div>
      <div class="rg-cnt" style="display:flex;align-items:center;gap:8px">${controle}</div>
    </div>`;
  }).join('');
}

/** O interruptor mexe só na tela; quem grava é o Salvar. Assim
 *  desligar sem querer se desfaz saindo da aba, como qualquer campo. */
function alternarAssuntoGuardiao(assunto) {
  const linha = document.getElementById('gd-l-' + assunto);
  const sw    = linha.querySelector('.rg-sw');
  const ligar = !sw.classList.contains('on');
  sw.classList.toggle('on', ligar);
  linha.classList.toggle('off', !ligar);
  sw.title = ligar ? 'Desligar' : 'Ligar';
  // v1.408 — o controle da direita é um número OU um seletor, conforme
  // o tipo do assunto. Procurar pelo id do número travava aqui quando a
  // linha era de cadastro (o elemento não existe).
  // v1.759 — e pode ser OS DOIS (Contas a pagar): trava todos.
  linha.querySelectorAll('.rg-cnt input, .rg-cnt select')
       .forEach(campo => { campo.disabled = !ligar; });
}

async function salvarReguaGuardiao(botao) {
  const erro = document.getElementById('gd-erro');
  erro.style.display = 'none';

  const linhas = gdAssuntosDoPlano().map(s => {
    const campoDias = document.getElementById('gd-dias-' + s.a);
    const campoFreq = document.getElementById('gd-freq-' + s.a);
    return {
      empresa_id: empresaAtual,
      assunto: s.a,
      // assunto de cadastro não tem prazo: grava 0 e manda a frequência
      dias: campoDias ? parseInt(campoDias.value, 10) : 0,
      frequencia: campoFreq ? campoFreq.value : 'semanal',
      ativo: document.getElementById('gd-l-' + s.a)
               .querySelector('.rg-sw').classList.contains('on')
    };
  });

  // O banco tem o mesmo limite (check de 0 a 365). A conferência aqui
  // existe para a pessoa ler um português em vez de um erro de coluna.
  const ruim = linhas.find(l => !Number.isFinite(l.dias) || l.dias < 0 || l.dias > 365);
  if (ruim) {
    const nome = GD_ASSUNTOS.find(s => s.a === ruim.assunto).n;
    return mostrarErro(erro, `“${nome}”: informe um número de dias entre 0 e 365.`);
  }

  if (botao) botao.disabled = true;
  const { error } = await sb.from('guardiao_regua')
    .upsert(linhas, { onConflict: 'empresa_id,assunto' });
  if (botao) botao.disabled = false;

  if (error) return mostrarErro(erro, 'Não foi possível salvar: ' + error.message);
  mostrarErro(erro, 'Régua salva. Vale já no e-mail de amanhã — ou clique em '
                  + '“Enviar um teste para mim agora” para ver na hora.', true);
  carregarReguaGuardiao();
}

// ------------------------------------------------------------
// QUEM RECEBE
// ------------------------------------------------------------
async function carregarDestinatariosGuardiao() {
  const el = document.getElementById('gd-destinatarios');
  if (!el) return;
  el.innerHTML = '<p class="rg-vazio">Carregando…</p>';
  const { data, error } = await sb.from('robo_destinatarios').select('*')
    .eq('empresa_id', empresaAtual).order('email');
  if (error) {
    el.innerHTML = `<p class="rg-vazio">Não consegui ler a lista: ${htm(error.message)}</p>`;
    return;
  }
  const lista = data || [];
  document.getElementById('gd-cnt-dest').textContent =
    `(${lista.filter(d => d.ativo).length} recebendo)`;

  // Lista vazia é um estado PERIGOSO, não neutro: o robô roda, não acha
  // ninguém para avisar e não reclama. Por isso o aviso em vermelho.
  el.innerHTML = lista.length ? lista.map(d => `
    <div class="rg-l ${d.ativo ? '' : 'off'}">
      <button class="rg-sw ${d.ativo ? 'on' : ''}" title="${d.ativo ? 'Parar de enviar' : 'Voltar a enviar'}"
              onclick="alternarDestinatarioGuardiao('${jsq(d.id)}', ${d.ativo ? 'false' : 'true'})"></button>
      <div class="rg-c">
        <div class="rg-n">${htm(d.email)}</div>
        <div class="rg-d">${htm(d.nome || 'sem nome')}${d.criado_em
          ? ' · desde ' + dataBr(String(d.criado_em).slice(0, 10)) : ''}</div>
      </div>
      <button class="rg-x" title="Excluir"
        onclick="excluirDestinatarioGuardiao('${jsq(d.id)}', '${jsq(d.email)}')">✕</button>
    </div>`).join('')
    : `<div class="rg-zero"><b>Ninguém recebe os avisos.</b>
       <span>Os robôs continuam rodando, mas o que eles acharem não chega a ninguém.
       Acrescente pelo menos um endereço.</span></div>`;
}

async function novoDestinatarioGuardiao() {
  const email = (await dialogoPedir({ titulo: 'Novo destinatário dos robôs', rotulo: 'E-mail que vai receber os avisos', tipo: 'email', ok: 'Próximo', obrigatorio: true }) || '').trim();
  if (!email) return;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    await dialogoAvisar('Esse e-mail não parece válido.');
    return;
  }
  const nome = (await dialogoPedir({ titulo: 'Novo destinatário dos robôs', texto: email, rotulo: 'Nome de quem recebe (opcional)', ok: 'Acrescentar' }) || '').trim() || null;
  const { error } = await sb.from('robo_destinatarios')
    .insert({ empresa_id: empresaAtual, email: email, nome: nome, ativo: true });
  if (error) { await dialogoAvisar('Não foi possível acrescentar: ' + error.message); return; }
  carregarDestinatariosGuardiao();
}

async function alternarDestinatarioGuardiao(id, ativo) {
  const { error } = await sb.from('robo_destinatarios').update({ ativo: ativo }).eq('id', id);
  if (error) { await dialogoAvisar('Não foi possível mudar: ' + error.message); return; }
  carregarDestinatariosGuardiao();
}

async function excluirDestinatarioGuardiao(id, email) {
  if (!(await dialogoPerguntar({ texto: `Tirar ${email} da lista?\n\n`
             + 'Se for coisa temporária, prefira desligar o interruptor — dá para religar '
             + 'depois sem redigitar o endereço.', ok: 'Tirar', perigo: true }))) return;
  const { error } = await sb.from('robo_destinatarios').delete().eq('id', id);
  if (error) { await dialogoAvisar('Não foi possível excluir: ' + error.message); return; }
  carregarDestinatariosGuardiao();
}

async function testarGuardiao(botao) {
  const erro = document.getElementById('gd-teste-erro');
  erro.style.display = 'none';
  if (botao) botao.disabled = true;
  // A função NÃO aceita destinatário: manda para o e-mail de quem
  // clicou, lido do token de sessão. Aceitar um endereço aqui seria
  // entregar um disparador de e-mail em nome do morali.app.
  const { data, error } = await sb.rpc('guardiao_testar_agora');
  if (botao) botao.disabled = false;
  if (error) return mostrarErro(erro, 'Não foi possível enviar: ' + error.message);
  mostrarErro(erro, data || 'Enviado.', true);
  carregarEnviosGuardiao();
}

// ------------------------------------------------------------
// ÚLTIMOS ENVIOS
// ------------------------------------------------------------
async function carregarEnviosGuardiao() {
  const el = document.getElementById('gd-envios');
  if (!el) return;
  const { data, error } = await sb.from('robo_execucoes').select('*')
    .eq('empresa_id', empresaAtual).order('quando', { ascending: false }).limit(15);
  if (error) {
    el.innerHTML = `<tr><td colspan="5" class="vazio">Não consegui ler o registro de envios: ${htm(error.message)}</td></tr>`;
    return;
  }
  const lista = data || [];
  el.innerHTML = lista.length ? lista.map(e => {
    const q = e.quando ? new Date(e.quando) : null;
    return `<tr>
      <td style="white-space:nowrap">${q ? htm(q.toLocaleString('pt-BR',
        { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) : '—'}</td>
      <td>${htm(e.assunto || '—')}</td>
      <td>${e.vencidos == null ? '—' : e.vencidos}</td>
      <td>${e.proximos == null ? '—' : e.proximos}</td>
      <td>${e.erro
        ? `<span class="tag tag-vermelha" title="${htm(e.erro)}">falhou</span>`
        : '<span class="tag tag-verde">enviado</span>'}</td>
    </tr>`;
  }).join('')
  : '<tr><td colspan="5" class="vazio">Nenhum envio registrado ainda.</td></tr>';
}

// ============================================================
// v1.497 — INTEGRAÇÕES: as contas externas da imobiliária
//
// Um cartão por conta (Asaas, WhatsApp, Meta) e um de consumo de IA,
// na aba Integrações do trilho. O WhatsApp veio de Mensagens: o código
// dele (carregarConexaoWhats, abrirQrWhats…) não mudou, só o lugar dos
// ids `wa-estado` / `wa-corpo` no admin.html.
//
// A REGRA QUE ATRAVESSA O CARTÃO INTEIRO: a tela NUNCA vê uma chave.
// Colar a chave chama `integracao_asaas_guardar_chave`, que grava no
// Vault e devolve o FINAL e a data. Testar chama a Edge `integracoes`,
// que lê a chave do Vault como serviço, bate no Asaas e devolve só a
// razão social. Gravação de qualquer coisa aqui é RPC — a tabela
// `integracoes_contas` não tem grant de escrita para ninguém.
//
// v1.498 — TRÊS CONSERTOS DO PRIMEIRO USO (03/09/2026):
//   1. o resultado de cada ação aparece NO CARTÃO (int-asaas-msg /
//      int-meta-msg), não no topo da aba — com o cartão da Meta na tela,
//      a mensagem lá em cima ficava fora da vista e parecia "não fez nada";
//   2. quando a Edge responde 4xx/5xx, o supabase-js esconde o corpo e
//      diz só "non-2xx status code"; `intChamarEdge` lê o corpo de volta,
//      e é lá que está a frase de verdade ("A Meta não deixou…");
//   3. botão "Remover" na chave do Asaas (RPC integracao_asaas_remover_chave).
// ============================================================
let intContas = { asaas: null, meta: null };

/** A mensagem de um cartão: 'asaas' ou 'meta'. */
function intMsg(cartao) { return document.getElementById('int-' + cartao + '-msg'); }
function intLimparMsg(cartao) { const m = intMsg(cartao); if (m) { m.textContent = ''; m.style.display = 'none'; } }

/**
 * Chama a Edge `integracoes` e devolve SEMPRE {data} ou {erro} com a
 * frase que a função escreveu. O supabase-js, num 4xx/5xx, entrega um
 * FunctionsHttpError cujo `context` é a Response — o corpo está lá.
 */
async function intChamarEdge(body) {
  // v1.657 — o embrulho virou chamarEdge() no base.js, para toda tela
  return chamarEdge('integracoes', body);
}

async function carregarIntegracoes() {
  intLimparMsg('asaas'); intLimparMsg('meta');
  const erro = intMsg('asaas');
  intContas = { asaas: null, meta: null };

  const [contas, parceiro, webhook, teto, consumo] = await Promise.all([
    sb.from('integracoes_contas').select('tipo,config,ativo').eq('empresa_id', empresaAtual),
    sb.rpc('integracao_meta_parceiro'),
    // quem só VÊ não tem o token: a RPC exige editar — tratado no pintar
    sb.rpc('integracao_asaas_webhook'),
    sb.rpc('ia_pode_gastar', { p_empresa: empresaAtual }),
    sb.from('ia_consumo_mes').select('uso,custo,tokens_entrada,tokens_saida,chamadas').eq('empresa_id', empresaAtual)
  ]);
  if (contas.error) {
    if (erro) mostrarErro(erro, 'Não consegui ler as integrações: ' + contas.error.message
      + (contas.error.code === 'PGRST205' ? ' — rode o v1497-sql-1.' : ''));
    return;
  }
  (contas.data || []).forEach(c => { intContas[c.tipo] = c; });

  // v1.684 — cartão de módulo fora do plano some (vale para o superadmin
  // também, como o trilho: configNoPlano). A Meta serve às Postagens e à
  // DM do Instagram, que chega em Conversas (módulo whatsapp).
  const noPlano = (...mods) => mods.some(m => configNoPlano({ modulo: m }));
  const mostrarCartao = (id, sim) => {
    const c = document.getElementById(id);
    if (c && c.closest('.cartao')) c.closest('.cartao').style.display = sim ? '' : 'none';
    return sim;
  };

  pintarIntAsaas(webhook.error ? null : webhook.data);
  if (mostrarCartao('int-meta-corpo', noPlano('postagens', 'whatsapp'))) pintarIntMeta(parceiro.data || '');
  // A IA gasta de verdade na Atendente, nas legendas das Postagens e no
  // Match que lê a conversa (WhatsApp); sem nenhum deles, o cartão sai.
  if (mostrarCartao('int-ia-corpo', noPlano('atendente', 'postagens', 'whatsapp')))
    pintarIntIa(teto.error ? null : teto.data, consumo.data || []);
  if (mostrarCartao('wa-corpo', noPlano('whatsapp'))) carregarConexaoWhats();
  if (mostrarCartao('cad-corpo', noPlano('fichas'))) cadCarregar();   // v1.666 — o cartão "Cadastro online"
}

// ------------------------------------------------------------
// CADASTRO ONLINE (v1.666, 21/09/2026)
//
// Os formulários públicos no domínio da própria imobiliária. Três
// estados: sem domínio → aguardando o DNS → no ar. Quem decide o estado
// é o último "Testar agora" (a Edge cadastro-dominio faz as 3
// checagens e grava pela cadastro_dominio_marcar). O destino do CNAME é
// um só para a plataforma.
// ------------------------------------------------------------
const CAD_DESTINO = 'formularios.morali.app';
let cadAtual = null;

async function cadCarregar() {
  const corpo = document.getElementById('cad-corpo');
  if (!corpo) return;
  const { data, error } = await sb.rpc('cadastro_dominio_ler');
  if (error) {
    corpo.innerHTML = '<div class="vazio-min">Não consegui ler o cadastro online: ' + htm(error.message)
      + (error.code === 'PGRST202' ? ' — rode o sql-01 de Cadastro-Online-Dominio.' : '') + '</div>';
    return;
  }
  cadAtual = data || null;
  cadPintar();
}

function cadEstadoDe(d) {
  if (!d || !d.dominio) return 'sem';
  return d.no_ar_desde ? 'ar' : 'dns';
}

function cadPintar() {
  const corpo = document.getElementById('cad-corpo');
  const estado = document.getElementById('cad-estado');
  if (!corpo) return;
  const d = cadAtual || {};
  const st = cadEstadoDe(d);
  const podeEditar = !!d.pode_editar;
  if (estado) estado.innerHTML =
    st === 'sem' ? '<span class="tag tag-cinza">Sem domínio</span>' :
    st === 'dns' ? '<span class="tag tag-amarela">Aguardando o DNS</span>' :
                   '<span class="tag tag-verde">No ar</span>';

  const t = d.teste || {};
  const check = (ok, titulo, sub) => `<li class="${ok ? 'ok' : 'pendente'}"><i></i><span><b>${htm(titulo)}</b>${sub ? '<br>' + htm(sub) : ''}</span></li>`;
  const testadoEm = d.testado_em ? new Date(d.testado_em) : null;
  const quando = testadoEm && !isNaN(testadoEm)
    ? 'Última conferência: ' + testadoEm.toLocaleDateString('pt-BR') + ' ' + testadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : 'Ainda não conferido';

  let esquerda = '';
  if (st === 'sem') {
    esquerda = `
      <div class="campo" style="max-width:420px">
        <label>Domínio do cadastro</label>
        <input class="busca" type="text" id="cad-dominio" placeholder="cadastro.suaimobiliaria.com.br" ${podeEditar ? '' : 'disabled'}>
        <span style="font-size:12px;color:var(--texto-suave)">Um subdomínio seu, de preferência <b>cadastro.</b> na frente do domínio do site da imobiliária. Só letras, números, pontos e hífens.</span>
      </div>
      ${podeEditar ? '<button class="btn" style="margin-top:6px" onclick="cadGuardar(this)">Salvar o domínio</button>'
                   : '<div style="font-size:12.5px;color:var(--texto-suave)">Quem pode <b>editar</b> a administração cadastra o domínio.</div>'}`;
  } else {
    const fixo = d.origem === 'fixo';
    esquerda = `
      <div class="int-guardada${st === 'ar' ? ' ativa' : ''}">
        <code>${htm(d.dominio)}</code>
        <span class="quando">${st === 'ar' ? 'no ar desde ' + intDataCurta(d.no_ar_desde) : 'cadastrado em ' + intDataCurta(d.criado_em)}${fixo ? ' · fixo' : ''}</span>
        ${podeEditar && !fixo ? '<span class="dir"><button class="btn btn-claro" onclick="cadRemover(this)">Remover</button></span>' : ''}
      </div>
      <ul class="cad-checks">
        ${check(t.dns,   'DNS apontando para ' + CAD_DESTINO, t.dns ? '' : (d.testado_em ? 'Ainda não. O CNAME pode levar até 1 hora para propagar.' : 'Clique em Testar agora depois de criar o CNAME.'))}
        ${check(t.https, 'Certificado HTTPS', t.https ? '' : (t.https_detalhe ? t.https_detalhe : 'Sai sozinho na primeira visita, depois que o DNS apontar.'))}
        ${check(t.marca, 'Página respondendo com a sua marca', t.marca ? (t.nome ? t.nome + ' — logotipo e rodapé vêm do cadastro da imobiliária' : '') : 'Aguardando os dois de cima.')}
      </ul>
      ${st === 'ar' ? `
      <div class="int-lado-titulo" style="margin-top:16px">Os seus links, para divulgar</div>
      <div class="int-copiar"><input readonly id="cad-link-prop" value="https://${htm(d.dominio)}/"><button class="btn btn-claro" onclick="intCopiar('cad-link-prop', this)">Copiar</button></div>
      <div style="font-size:12px;color:var(--texto-suave);margin:2px 0 8px">Cadastro do proprietário — quem tem imóvel para alugar.</div>
      <div class="int-copiar"><input readonly id="cad-link-loc" value="https://${htm(d.dominio)}/alugar"><button class="btn btn-claro" onclick="intCopiar('cad-link-loc', this)">Copiar</button></div>
      <div style="font-size:12px;color:var(--texto-suave);margin-top:2px">Ficha do locatário — quem quer alugar. Com <code>?parceiro=CT-0001</code> no fim, a ficha chega ligada ao captador.</div>` : ''}
      <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
        ${podeEditar || fixo ? `<button class="btn${st === 'ar' ? ' btn-claro' : ''}" onclick="cadTestar(this)">Testar agora</button>` : ''}
        <span style="font-size:12px;color:var(--texto-suave)">${htm(quando)}</span>
      </div>`;
  }

  corpo.innerHTML = `
    <div class="int-topo">
      <div class="int-marca cadastro">C</div>
      <div><div class="int-nome">Formulários de cadastro no seu domínio</div>
        <div class="int-sub">O cadastro do proprietário e a ficha do locatário abrem em um endereço da sua imobiliária, com o seu logotipo e o seu rodapé.</div></div>
    </div>
    <div class="int-grid">
      <div>${esquerda}</div>
      <div>
        <div class="int-lado-titulo">No painel do seu domínio (DNS)</div>
        <ol class="int-passos">
          <li><b class="n">1</b><span>Onde você administra o domínio do site (Registro.br, Hostinger, GoDaddy…), crie um registro <b>CNAME</b>.</span></li>
          <li><b class="n">2</b><span>Nome: o subdomínio (ex.: <b>cadastro</b>). Destino: o endereço abaixo.</span></li>
          <li><b class="n">3</b><span>Salve e volte aqui em <b>Testar agora</b>. O certificado HTTPS é emitido sozinho na primeira visita — nada para instalar.</span></li>
        </ol>
        <div class="int-copiar"><input readonly id="cad-destino" value="${htm(CAD_DESTINO)}"><button class="btn btn-claro" onclick="intCopiar('cad-destino', this)">Copiar</button></div>
        <div style="font-size:12px;color:var(--texto-suave);margin-top:8px">O servidor só responde para domínios cadastrados aqui. Sem o cadastro, o endereço apontado recebe "não encontrado" — e não a página de outra imobiliária.</div>
      </div>
    </div>`;
}

function cadMsg(texto) {
  const el = document.getElementById('cad-msg');
  if (!el) return;
  el.textContent = texto || '';
  el.style.display = texto ? 'block' : 'none';
}

async function cadGuardar(botao) {
  const campo = document.getElementById('cad-dominio');
  const dominio = campo ? campo.value.trim() : '';
  cadMsg('');
  if (!dominio) { cadMsg('Digite o domínio.'); return; }
  if (botao) botao.disabled = true;
  const { error } = await sb.rpc('cadastro_dominio_guardar', { p_dominio: dominio });
  if (botao) botao.disabled = false;
  if (error) { cadMsg('Não consegui salvar: ' + error.message); return; }
  await cadCarregar();
  // já confere na hora: se o DNS já aponta, poupa um clique
  cadTestar(null);
}

async function cadRemover(botao) {
  const ok = await dialogoPerguntar({
    titulo: 'Remover o domínio do cadastro?',
    texto: 'Os links no seu domínio param de funcionar. O DNS continua como está — você pode cadastrar de novo depois.',
    ok: 'Remover', cancelar: 'Voltar', perigo: true });
  if (!ok) return;
  if (botao) botao.disabled = true;
  const { error } = await sb.rpc('cadastro_dominio_remover');
  if (botao) botao.disabled = false;
  if (error) { cadMsg('Não consegui remover: ' + error.message); return; }
  await cadCarregar();
}

async function cadTestar(botao) {
  if (!cadAtual || !cadAtual.dominio) return;
  cadMsg('');
  const rotulo = botao ? botao.textContent : '';
  if (botao) { botao.disabled = true; botao.textContent = 'Conferindo…'; }
  const r = await chamarEdge('cadastro-dominio', { acao: 'testar', empresa: empresaAtual, dominio: cadAtual.dominio });
  if (botao) { botao.disabled = false; botao.textContent = rotulo; }
  if (r.erro) { cadMsg(r.erro); await cadCarregar(); return; }
  await cadCarregar();
  const d = r.data || {};
  if (!d.dns) cadMsg('O DNS ainda não aponta para ' + CAD_DESTINO + '. Se você acabou de criar o CNAME, aguarde alguns minutos e teste de novo.');
  else if (!d.https) cadMsg('O DNS aponta, mas a página ainda não respondeu com HTTPS' + (d.https_detalhe ? ' (' + d.https_detalhe + ')' : '') + '. Abra https://' + cadAtual.dominio + ' uma vez e teste de novo — o certificado sai na primeira visita.');
  else if (!d.marca) cadMsg('A página responde, mas o banco não reconheceu o domínio como seu. Me avise.');
}

// ------------------------------------------------------------
// ASAAS
// ------------------------------------------------------------
function intDataCurta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString('pt-BR');
}

function pintarIntAsaas(webhook) {
  const corpo = document.getElementById('int-asaas-corpo');
  const estado = document.getElementById('int-asaas-estado');
  if (!corpo) return;
  const cfg = (intContas.asaas && intContas.asaas.config) || {};
  const ativo = cfg.ambiente_ativo || 'producao';
  const temAtiva = !!cfg[ativo];
  const conta = temAtiva && cfg[ativo].conta;

  estado.innerHTML = temAtiva
    ? (conta ? '<span class="tag tag-verde">Conectado</span>' : '<span class="tag tag-amarela">Chave guardada, sem teste</span>')
    : '<span class="tag tag-cinza">Não configurado</span>';

  const chave = (amb, rotulo) => {
    const c = cfg[amb];
    const eAtiva = amb === ativo;
    return `
      <div class="campo" style="margin-top:12px">
        <label>Chave de <b style="color:var(--azul)">${rotulo}</b>
          ${eAtiva ? '<span class="tag tag-verde" style="margin-left:6px;padding:1px 8px;font-size:11px">ativa</span>'
                   : (c ? '<span class="tag tag-cinza" style="margin-left:6px;padding:1px 8px;font-size:11px">guardada</span>' : '')}</label>
        ${c ? `
        <div class="int-guardada ${eAtiva ? 'ativa' : ''}">
          ${icone('cadeado', 16)}
          <code>${amb === 'sandbox' ? '$aact_hmlg_' : '$aact_'}····························${htm(c.final || '')}</code>
          <span class="quando">guardada em ${intDataCurta(c.guardada_em)}</span>
          <span class="dir">
            <button class="btn btn-claro" onclick="intTestarAsaas('${amb}', this)">Testar</button>
            <button class="btn btn-claro" onclick="intAbrirChave('${amb}')">Trocar</button>
            <button class="btn btn-claro" title="Apaga esta chave do cofre" onclick="intRemoverChave('${amb}')">Remover</button>
          </span>
        </div>
        ${c.conta && c.conta.nome ? `<div class="int-conta"><b>Conta conferida:</b> ${htm(c.conta.nome)}
            ${c.conta.documento ? ' · ' + htm(typeof mascaraDoc === 'function' ? mascaraDoc(c.conta.documento) : c.conta.documento) : ''}
            <span style="color:var(--texto-suave)"> · em ${intDataCurta(c.conta.conferida_em)}</span><br>
            A chave abre a conta certa.${eAtiva ? ' Boletos novos saem por ela.' : ''}</div>` : ''}`
        : `<button class="btn btn-claro" style="align-self:flex-start" onclick="intAbrirChave('${amb}')">
             ${icone('mais', 14)} Colar a chave de ${rotulo}</button>`}
      </div>`;
  };

  corpo.innerHTML = `
    <div class="int-topo">
      <div class="int-marca asaas">A</div>
      <div><div class="int-nome">Asaas</div>
        <div class="int-sub">Emite os boletos do aluguel, dá baixa sozinho quando o inquilino paga e transfere o repasse ao proprietário.</div></div>
    </div>
    <div class="int-grid">
      <div>
        <div class="campo" style="max-width:320px">
          <label>Ambiente ativo</label>
          <div class="sel-funil" style="margin:0">
            <button class="${ativo === 'producao' ? 'on' : ''}" onclick="intAmbiente('producao')">Produção</button>
            <button class="${ativo === 'sandbox' ? 'on' : ''}" onclick="intAmbiente('sandbox')">Sandbox (testes)</button>
          </div>
          <span style="font-size:12px;color:var(--texto-suave)">As duas chaves ficam guardadas; o seletor diz por qual os boletos saem.</span>
        </div>
        ${chave('producao', 'Produção')}
        ${chave('sandbox', 'Sandbox')}
      </div>
      <div>
        <div class="int-lado-titulo">No painel do Asaas</div>
        <ol class="int-passos">
          <li><b class="n">1</b><span>Entre em <b>Integrações → Webhooks → Criar webhook</b>.</span></li>
          <li><b class="n">2</b><span>Cole a URL e o token abaixo. Eventos: <b>Cobrança recebida</b> e as <b>transferências</b> (concluída, falhou, cancelada). Versão 3.</span></li>
          <li><b class="n">3</b><span>Salve. O primeiro boleto pago aparece na parcela como baixa automática.</span></li>
        </ol>
        ${webhook ? `
        <div class="int-copiar"><input readonly id="int-wh-url" value="${htm(webhook.url)}"><button class="btn btn-claro" onclick="intCopiar('int-wh-url', this)">Copiar</button></div>
        <div class="int-copiar"><input readonly id="int-wh-token" value="${htm(webhook.token)}"><button class="btn btn-claro" onclick="intCopiar('int-wh-token', this)">Copiar</button></div>
        <div style="font-size:12px;color:var(--texto-suave);margin-top:8px">O token é desta imobiliária: é ele que diz ao CRM de quem é o boleto que chegou.</div>`
        : `<div style="font-size:12.5px;color:var(--texto-suave);margin-top:8px">A URL e o token do webhook aparecem para quem pode <b>editar</b> a administração.</div>`}
      </div>
    </div>`;
}

let intChaveAmbiente = 'producao';
function intAbrirChave(amb) {
  intChaveAmbiente = amb;
  document.getElementById('int-chave-titulo').textContent =
    'Chave da API do Asaas — ' + (amb === 'sandbox' ? 'Sandbox' : 'Produção');
  document.getElementById('int-chave-rotulo').textContent =
    amb === 'sandbox' ? 'Chave de Sandbox (começa com $aact_hmlg_)' : 'Chave de Produção (começa com $aact_)';
  const campo = document.getElementById('int-chave-valor');
  campo.value = '';
  document.getElementById('int-chave-erro').style.display = 'none';
  abrir('modal-int-chave');
  setTimeout(() => campo.focus(), 50);
}

async function intGuardarChave() {
  const erro = document.getElementById('int-chave-erro');
  const botao = document.getElementById('int-chave-salvar');
  const campo = document.getElementById('int-chave-valor');
  const valor = (campo.value || '').trim();
  erro.style.display = 'none';
  if (valor.length < 20) { mostrarErro(erro, 'Cole a chave inteira — essa está curta demais.'); return; }
  botao.disabled = true;
  try {
    const { data, error } = await sb.rpc('integracao_asaas_guardar_chave',
      { p_ambiente: intChaveAmbiente, p_valor: valor });
    if (error) throw new Error(error.message);
    campo.value = '';                 // a chave não fica na tela
    intContas.asaas = intContas.asaas || { tipo: 'asaas', ativo: true };
    intContas.asaas.config = data;
    fechar('modal-int-chave');
    pintarIntAsaas(await intWebhookAtual());
    await intTestarAsaas(intChaveAmbiente, null);
  } catch (e) {
    mostrarErro(erro, 'Não guardei: ' + e.message);
  } finally {
    botao.disabled = false;
  }
}

async function intWebhookAtual() {
  const { data, error } = await sb.rpc('integracao_asaas_webhook');
  return error ? null : data;
}

async function intAmbiente(amb) {
  intLimparMsg('asaas');
  const erro = intMsg('asaas');
  const { data, error } = await sb.rpc('integracao_asaas_ambiente', { p_ambiente: amb });
  if (error) { mostrarErro(erro, error.message); return; }
  intContas.asaas.config = data;
  pintarIntAsaas(await intWebhookAtual());
}

async function intTestarAsaas(amb, botao) {
  intLimparMsg('asaas');
  const erro = intMsg('asaas');
  const rotulo = botao ? botao.textContent : '';
  if (botao) { botao.disabled = true; botao.textContent = 'Testando…'; }
  try {
    const r = await intChamarEdge({ acao: 'asaas_testar', empresa: empresaAtual, ambiente: amb });
    if (r.erro) throw new Error(r.erro);
    const data = r.data;
    const { data: cfg, error: e2 } = await sb.rpc('integracao_asaas_conta_conferida',
      { p_ambiente: amb, p_nome: data.nome, p_documento: data.documento });
    if (e2) throw new Error(e2.message);
    intContas.asaas.config = cfg;
    pintarIntAsaas(await intWebhookAtual());
    mostrarErro(erro, 'A chave de ' + (amb === 'sandbox' ? 'Sandbox' : 'Produção') + ' abriu a conta '
      + (data.nome || '') + '.', true);
  } catch (e) {
    mostrarErro(erro, 'O teste do Asaas falhou: ' + e.message);
  } finally {
    if (botao) { botao.disabled = false; botao.textContent = rotulo; }
  }
}

/** v1.498 — apaga a chave de um ambiente do cofre (e a linha, se era a última). */
async function intRemoverChave(amb) {
  const rotulo = amb === 'sandbox' ? 'Sandbox' : 'Produção';
  if (!(await dialogoPerguntar({ texto: 'Remover a chave de ' + rotulo + ' do cofre? Boletos, baixas e repasses deste ambiente param até colar outra.', ok: 'Remover', perigo: true }))) return;
  intLimparMsg('asaas');
  const erro = intMsg('asaas');
  const { data, error } = await sb.rpc('integracao_asaas_remover_chave', { p_ambiente: amb });
  if (error) { mostrarErro(erro, 'Não removi: ' + error.message); return; }
  if (data && Object.keys(data).length) {
    intContas.asaas = intContas.asaas || { tipo: 'asaas', ativo: true };
    intContas.asaas.config = data;
  } else {
    intContas.asaas = null;
  }
  pintarIntAsaas(await intWebhookAtual());
  mostrarErro(erro, 'Chave de ' + rotulo + ' removida do cofre.', true);
}

function intCopiar(id, botao) {
  const el = document.getElementById(id);
  if (!el) return;
  const feito = () => { const t = botao.textContent; botao.textContent = 'Copiado'; setTimeout(() => { botao.textContent = t; }, 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(el.value).then(feito, () => { el.select(); document.execCommand('copy'); feito(); });
  } else { el.select(); document.execCommand('copy'); feito(); }
}

// ------------------------------------------------------------
// META — Página do Facebook + Instagram compartilhados com a Moralí
// ------------------------------------------------------------
function pintarIntMeta(parceiro) {
  const corpo = document.getElementById('int-meta-corpo');
  const estado = document.getElementById('int-meta-estado');
  if (!corpo) return;
  const cfg = (intContas.meta && intContas.meta.ativo && intContas.meta.config) || null;
  estado.innerHTML = cfg ? '<span class="tag tag-verde">Conectado</span>'
                         : '<span class="tag tag-cinza">Não configurado</span>';
  corpo.innerHTML = `
    <div class="int-topo">
      <div class="int-marca meta">M</div>
      <div><div class="int-nome">Meta (Página do Facebook + Instagram profissional)</div>
        <div class="int-sub">Para a tela Postagens publicar e agendar na <b>sua</b> conta. Enquanto não estiver configurado, a tela Postagens fica desligada para esta imobiliária.</div></div>
    </div>
    <div class="int-grid">
      <div>
        <div class="int-lado-titulo">Compartilhe a Página e o Instagram com ${htm(fornecedorDoSistema())}</div>
        <ol class="int-passos">
          <li><b class="n">1</b><span>Entre no <b>Meta Business Suite → Configurações → Parceiros</b>.</span></li>
          <li><b class="n">2</b><span><b>Adicionar parceiro</b> e informe o ID ${fornecedorDoSistema() === 'a Moralí' ? 'da Moralí' : 'do fornecedor do sistema'}${parceiro ? ' (abaixo, com o Copiar)' : ''}.</span></li>
          <li><b class="n">3</b><span>Marque a <b>Página</b> e a <b>conta do Instagram</b> da imobiliária, com a permissão <b>Criar conteúdo</b>.</span></li>
          <li><b class="n">4</b><span>Volte aqui, cole os dois IDs ao lado e clique em <b>Testar e guardar</b>.</span></li>
        </ol>
        ${parceiro ? `<div class="int-copiar" style="max-width:380px"><input readonly id="int-meta-parceiro" value="${htm(parceiro)}"><button class="btn btn-claro" onclick="intCopiar('int-meta-parceiro', this)">Copiar</button></div>
        <div style="font-size:12px;color:var(--texto-suave);margin-top:4px">ID ${fornecedorDoSistema() === 'a Moralí' ? 'da Moralí' : 'do fornecedor do sistema'} no Business Manager.</div>`
        : `<div style="font-size:12px;color:var(--alerta);margin-top:8px">O ID ${fornecedorDoSistema() === 'a Moralí' ? 'da Moralí' : 'do fornecedor do sistema'} no Business ainda não foi cadastrado (robo_config → meta_business_id).</div>`}
      </div>
      <div>
        ${cfg ? `
        <div class="int-conta"><b>Página:</b> ${htm(cfg.pagina_nome || cfg.pagina_id)} <span style="color:var(--texto-suave)">(${htm(cfg.pagina_id)})</span><br>
          <b>Instagram:</b> @${htm(cfg.ig_nome || cfg.instagram_id)} <span style="color:var(--texto-suave)">(${htm(cfg.instagram_id)})</span><br>
          <span style="color:var(--texto-suave)">conferido em ${intDataCurta(cfg.conferido_em)}</span></div>
        <div class="int-rodape">
          <button class="btn btn-claro" onclick="intTestarMeta(this, true)">Testar de novo</button>
          <button class="btn btn-claro" onclick="intRemoverMeta()">Desligar</button>
        </div>`
        : `
        <div class="campo"><label>ID da Página do Facebook</label><input class="busca" style="width:100%" id="int-meta-pagina" inputmode="numeric" placeholder="ex.: 104512345678901"></div>
        <div class="campo" style="margin-top:10px"><label>ID da conta do Instagram</label><input class="busca" style="width:100%" id="int-meta-ig" inputmode="numeric" placeholder="ex.: 17841400000000000"></div>
        <div style="font-size:12px;color:var(--texto-suave);margin-top:6px">Onde achar: Business Suite → Configurações → Contas → Páginas / Contas do Instagram — o ID aparece abaixo do nome.</div>
        <div class="int-rodape">
          <button class="btn" onclick="intTestarMeta(this, false)">Testar e guardar</button>
          <span class="exp">O teste lê o nome da Página e do Instagram e mostra aqui antes de guardar.</span>
        </div>`}
        <div class="int-embreve">
          <button class="btn" disabled>Conectar com o Facebook</button>
          <span class="exp"><b>Em breve.</b> Um clique, sem IDs nem compartilhamento — depende da aprovação do app ${fornecedorDoSistema() === 'a Moralí' ? 'da Moralí' : 'do sistema'} pela Meta.</span>
        </div>
      </div>
    </div>`;
}

async function intTestarMeta(botao, jaGuardada) {
  intLimparMsg('meta');
  const erro = intMsg('meta');
  const cfg = (intContas.meta && intContas.meta.config) || {};
  const pagina = jaGuardada ? String(cfg.pagina_id || '') : (document.getElementById('int-meta-pagina').value || '').trim();
  const ig = jaGuardada ? String(cfg.instagram_id || '') : (document.getElementById('int-meta-ig').value || '').trim();
  if (!/^\d{5,25}$/.test(pagina) || !/^\d{5,25}$/.test(ig)) {
    mostrarErro(erro, 'Os dois IDs têm de ser só números.'); return;
  }
  const rotulo = botao.textContent;
  botao.disabled = true; botao.textContent = 'Testando…';
  try {
    const r = await intChamarEdge({ acao: 'meta_testar', empresa: empresaAtual, pagina_id: pagina, instagram_id: ig });
    if (r.erro) throw new Error(r.erro);
    const data = r.data;
    const { data: novo, error: e2 } = await sb.rpc('integracao_meta_guardar',
      { p_pagina_id: pagina, p_instagram_id: ig, p_pagina_nome: data.pagina_nome, p_ig_nome: data.ig_nome });
    if (e2) throw new Error(e2.message);
    intContas.meta = { tipo: 'meta', ativo: true, config: novo };
    pintarIntMeta(document.getElementById('int-meta-parceiro') ? document.getElementById('int-meta-parceiro').value : '');
    mostrarErro(erro, 'Meta ligada: ' + data.pagina_nome + ' e @' + data.ig_nome + '. A tela Postagens já publica nesta conta.', true);
  } catch (e) {
    mostrarErro(erro, 'A Meta não confirmou: ' + e.message);
  } finally {
    botao.disabled = false; botao.textContent = rotulo;
  }
}

async function intRemoverMeta() {
  if (!(await dialogoPerguntar({ texto: 'Desligar a Meta desta imobiliária? A tela Postagens deixa de publicar até ligar de novo.', ok: 'Desligar', perigo: true }))) return;
  intLimparMsg('meta');
  const erro = intMsg('meta');
  const { error } = await sb.rpc('integracao_meta_remover');
  if (error) { mostrarErro(erro, error.message); return; }
  intContas.meta = null;
  await carregarIntegracoes();
}

// ------------------------------------------------------------
// IA — consumo do mês contra o teto do plano
// ------------------------------------------------------------
const INT_USOS = { atendente: 'Atendente IA (conversas)', legenda: 'Legendas das postagens', revisao: 'Revisar textos' };

function pintarIntIa(teto, linhas) {
  const corpo = document.getElementById('int-ia-corpo');
  const estado = document.getElementById('int-ia-estado');
  if (!corpo) return;
  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long' });
  estado.textContent = 'consumo de ' + mes;
  const gasto = teto ? Number(teto.gasto || 0) : linhas.reduce((t, l) => t + Number(l.custo || 0), 0);
  const limite = teto && teto.limite != null ? Number(teto.limite) : null;
  const pct = limite ? Math.min(100, Math.round(100 * gasto / limite)) : 0;
  const hoje = new Date(); const dias = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const projecao = hoje.getDate() > 0 ? gasto / hoje.getDate() * dias : gasto;
  const reais = v => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
  const total = linhas.reduce((t, l) => t + Number(l.custo || 0), 0) || 1;

  corpo.innerHTML = `
    <div class="int-topo">
      <div class="int-marca ia">IA</div>
      <div><div class="int-nome">Atendente, legendas e revisão de textos</div>
        <div class="int-sub">A conta é ${fornecedorDoSistema() === 'a Moralí' ? 'da Moralí' : 'do fornecedor do sistema'}; cada imobiliária tem um <b>limite mensal</b> que vem do plano. Ao chegar nele, a IA pausa e avisa — nada é cobrado a mais.</div></div>
    </div>
    <div class="int-grid">
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13.5px"><b>${reais(gasto)}</b>
          <span style="color:var(--texto-suave)">${limite != null ? 'de ' + reais(limite) + ' do plano' : 'sem limite no plano'}</span></div>
        <div class="int-barra ${pct >= 100 ? 'estourou' : (pct >= 80 ? 'alerta' : '')}"><i style="width:${pct}%"></i></div>
        <div style="font-size:12px;color:var(--texto-suave)">Faltam ${dias - hoje.getDate()} dias no mês · no ritmo de hoje termina em <b>${reais(projecao)}</b>.</div>
        ${linhas.length ? `<div class="int-usos">${linhas.map(l => `
          <span class="k">${htm(INT_USOS[l.uso] || l.uso)}</span><span class="v">${reais(l.custo)}</span><span class="p">${Math.round(100 * Number(l.custo || 0) / total)}%</span>`).join('')}</div>`
        : '<div style="font-size:12.5px;color:var(--texto-suave);margin-top:10px">Nenhum uso de IA neste mês ainda.</div>'}
      </div>
      <div>
        <div class="int-lado-titulo">Quando o limite chega</div>
        <ol class="int-passos">
          <li><b class="n">1</b><span>Aos <b>80%</b>, um aviso por e-mail para o e-mail de contato da imobiliária.</span></li>
          <li><b class="n">2</b><span>Em <b>100%</b>, a atendente fica em silêncio (a conversa segue para a equipe) e as legendas voltam a ser escritas à mão.</span></li>
          <li><b class="n">3</b><span>No dia 1º o contador zera. Para subir o limite, o administrador da plataforma ajusta o plano.</span></li>
        </ol>
      </div>
    </div>`;
}


// ============================================================
// v1.499 — MÓDULOS POR PLANO (a matriz, a ficha da imobiliária)
//
// O catálogo vem de PERM.catalogo_modulos (meus_modulos, permissoes.js).
// A matriz é módulos × planos, no cartão Planos e limites; a ficha da
// imobiliária tem o plano, o teto de IA e a exceção por módulo (ligado
// a mais / desligado aqui). Tudo grava por RPC (só superadmin).
// ============================================================
function catalogoModulos() {
  return (typeof PERM !== 'undefined' && PERM && Array.isArray(PERM.catalogo_modulos)) ? PERM.catalogo_modulos : [];
}

/** Os módulos de UMA empresa, pelo que a tela de Empresas já carregou
 *  (planos + modulos_mais/menos). Espelha modulos_da_empresa() do banco. */
function modulosDaEmpresa(e) {
  const cat = catalogoModulos();
  if (!e || !cat.length) return null;
  const plano = (planosParaEditar || []).find(p => String(p.id) === String(e.plano_id));
  const base = new Set((plano && plano.modulos) || []);
  (e.modulos_mais || []).forEach(m => base.add(m));
  (e.modulos_menos || []).forEach(m => base.delete(m));
  cat.filter(m => m.nucleo).forEach(m => base.add(m.chave));
  return base;
}
function empresaTemModulo(e, chave) {
  const s = modulosDaEmpresa(e);
  return s ? s.has(chave) : true;
}
/** Na matriz de Papéis: o objeto pertence a um módulo ligado para a empresa em foco?
 *  Para o superadmin visitando, olha o plano DAQUELA empresa (o dele passa em tudo). */
function objetoNoPlanoDaEmpresaEmFoco(objeto) {
  if (typeof moduloDoObjetoLigado !== 'function') return true;
  if (!PERM.superadmin) return moduloDoObjetoLigado(objeto);
  const modulo = PERM.modulo_de ? PERM.modulo_de[objeto] : null;
  if (!modulo) return true;
  const e = (empresas || []).find(x => x.id === empresaAtual) || PERM.empresa;
  return empresaTemModulo(e, modulo);
}

// v1.500 — a matriz módulos × planos e a ficha da imobiliária (plano,
// teto de IA, exceções) saíram daqui: moram na Plataforma.
