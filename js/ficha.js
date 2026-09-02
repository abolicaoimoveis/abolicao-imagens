// ============================================================
// FICHA DO REGISTRO — motor compartilhado (Contato e Imóvel)
// Layout "Clássico 70/30": detalhes à esquerda, Atividade à direita.
//
// Como funciona: a página (contato.html / imovel.html) define
// a constante ALVO ('contato' ou 'imovel') ANTES de carregar este
// arquivo. Todo o resto — campos, modal de edição, faixa de
// tarefas — é montado por aqui a partir das definições abaixo.
// ============================================================

// v1.263 — `let`, não `const`: quando a ficha é aberta pelo CÓDIGO
// (/contato/CT-0054 ou ?codigo=CT-0054), o id é descoberto no banco no
// começo do carregarFicha e gravado aqui. Todo o resto do arquivo segue
// lendo ID como sempre leu.
let ID = new URLSearchParams(location.search).get('id');

// O código que veio no endereço, se veio. Duas formas: ?codigo=CT-0054
// (a que o servidor entenderia por query) e o endereço bonito, em que o
// código é o último pedaço do CAMINHO — nesse caso o navegador não
// enxerga query nenhuma: a tradução para contato.html acontece dentro
// do servidor e a barra continua mostrando /contato/CT-0054.
const CODIGO_URL = (() => {
  const q = new URLSearchParams(location.search).get('codigo');
  if (q) return q.toUpperCase();
  const seg = location.pathname.split('/').pop() || '';
  return /^[A-Za-z]{2,4}-[0-9]+$/.test(seg) ? seg.toUpperCase() : null;
})();

let registro = null;      // o contato ou imóvel aberto
let tarefasFicha = [];    // tarefas vinculadas a ele
let relacionados = [];    // imóveis do contato, ou pessoas do imóvel
let listaContatos = [];   // usada nos campos "Proprietário" / "Inquilino"
let sessaoEmail = '';
let calculados = {};      // (lead/caso) números da visão do painel — nunca digitados
let simulacoes = [];      // (lead) simulações de seguro
let planosIncendio = null; // (lead) tabela do seguro incêndio — null = ainda não buscada
let modalidadesFianca = null; // (lead) planos de fiança da seguradora — null = ainda não buscados
let listaImoveis = [];    // (lead/caso) imóveis da carteira
// v1.389 — os contratos, para o campo Contrato do caso. Mesma
// mecânica de listaImoveis: os usados na ficha entram sempre, e a
// lista inteira só quando uma janela de edição abre.
let listaContratos = [];  // (caso) contratos, para o lookup do campo Contrato
let orcamentos = [];      // (caso) orçamentos dos prestadores
let anexos = [];          // (caso) fotos, autorização, nota fiscal
let sinistrosFicha = [];  // (contrato) sinistros de seguro
let andamentosFicha = {}; // (contrato) andamentos por sinistro
let reajustesFicha = [];  // (contrato) histórico de reajustes
let seguradorasFicha = []; // (contrato) seguradoras cadastradas, para o seletor
let imoveisDisponiveis = []; // (lead) a carteira com situação Disponível, para o orçamento
let imovelDoContrato = null; // (contrato) o imóvel, para mostrar a taxa em vigor
let itensContrato = [];      // (contrato) itens da cobrança (v1.169)
let checklistItens = [];     // (contrato) o cadastro das listas (v1.319)
let checklistFeito = [];     // (contrato) o que foi marcado à mão
let itensPadrao = [];        // (contrato) modelos do cadastro da Administração
let planoReceitas = [];      // (contrato/competência) contas de receita do plano — v1.328
let mesesContrato = [];      // (contrato) competências (mês, etapa) p/ andamento dos itens
let pessoasContrato = [];    // v1.270 (contrato) inquilino e proprietário com telefone
let pessoasDoContrato = [];   // v1.470 (contrato) pessoas ligadas — contrato_pessoas
let contatosDasPessoas = {};  // v1.470 mapa contato_id -> {nome, telefone, codigo}
let conversasDoImovel = [];   // v1.471 conversas das pessoas ligadas ao contrato
let mensagensDoImovel = [];   // v1.471 mensagens recentes dessas conversas
let itensDaParcela = [];     // (competência) o extrato do mês — competencia_itens (v1.222)
let descontosParcela = [];   // (competência) o que sai do repasse — mesmo lugar, outro lado (v1.231)
let itensContratoMap = {};   // (competência) contrato_item_id → {inicio_competencia, parcelas} p/ numerar os seguros (v1.446)
let repassesDoContato = [];  // (contato) o que o proprietário recebeu, e o que vem (v1.257)
let repassesFuturos = 0;     // v1.475 — competências que ainda não chegaram
// v1.445 — os quatro cartões novos do contato
let contratosDoContato = []; // (contato) os contratos dele — puxam aluguéis e sinistros
let alugueisDoContato = [];  // (contato) os meses desses contratos
let alugueisFuturos = 0;     // v1.479 — e quantos ainda não chegaram
let sinistrosDoContato = []; // (contato) sinistros desses contratos
let comissoesDoContato = []; // (contato) parcelas de comissão de quem é parceiro
let taxaContratoParcela = null;   // (contrato) em que parcela a taxa começa (v1.229)
let taxaContratoRetencoes = [];   // (contrato) os meses em que ela já foi retida
let acoesDoPlano = [];            // (plano) as ações 5W2H, na ordem do plano (v1.241)
let planosParaEscolher = [];      // (ação) os planos da empresa, para o seletor (v1.241)

// A DEFINIÇÃO DOS CAMPOS saiu daqui na v1.139.
// Está em js/ficha-defs.js, carregado logo antes deste arquivo por toda
// tela de ficha. Saiu para a Administração poder lê-la sem carregar as
// três mil linhas de cá — o editor de layout precisa saber quais campos
// cada ficha tem, e antes ele lia o CATALOGO, que é outra coisa.



const DEF = DEFS[ALVO];
const ICONE = { 'Tarefa': icone('prancheta', 13), 'Ligação': icone('telefone', 13),
  'Visita': icone('calendario', 13), 'Observação': icone('papelCaneta', 13) };

function hojeISO() {
  const d = new Date(); const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
// iniciais() morava aqui. Foi para js/avatar.js, que é carregado antes
// desta tela e tem a versão que ignora "de/da/dos" ("Ana da Silva" → AS,
// não AD). Duas declarações do mesmo nome no mesmo escopo não dão erro:
// a última cala a primeira em silêncio — que é o pior tipo de conflito.
function nomePessoa(id) { const c = listaContatos.find(x => x.id === id); return c ? c.nome : null; }

// ------------------------------------------------------------
// 2) CARREGAR TUDO DO BANCO
// ------------------------------------------------------------
/* v1.239 — TUDO QUE JÁ DÁ PARA PERGUNTAR AGORA.
 *
 * Cada consulta desta lista precisa só de três coisas que a página tem
 * antes de falar com o servidor: qual é a ficha (ALVO), qual registro
 * (ID) e a definição dela (DEF). Nenhuma precisa do registro em si —
 * conferido uma a uma. Por isso todas podem sair no mesmo instante.
 *
 * Ficam de fora, e continuam mais abaixo, as duas que dependem de
 * outra consulta: o imóvel do contrato (o id vem dentro do contrato) e
 * o contrato da parcela. Os andamentos dependem dos sinistros, e por
 * isso saem grudados neles, e não no fim.
 *
 * Lista à parte de propósito: uma lista longa no meio do carregamento
 * esconderia a lógica de quem depende de quem, que é o que importa
 * aqui.
 */
function adiantarConsultas(jaVai) {
  const P = {};

  // `lerDe` permite a ficha ler de uma VIEW (que traz campos
  // calculados) e continuar gravando na tabela — é o caso do contrato,
  // cujos "dias que faltam" são contados pelo banco. Sem lerDe, lê da
  // própria tabela, como sempre.
  P.reg = jaVai(sb.from(DEF.lerDe || DEF.tabela).select('*').eq('id', ID).single());
  P.tar = jaVai(sb.from('tarefas').select('*').eq(DEF.fk, ID)
    .order('vencimento', { ascending: true, nullsFirst: false }));

  if (ALVO === 'caso') {
    P.calc = jaVai(sb.from('casos_painel').select('*').eq('id', ID).single());
    P.orc  = jaVai(sb.from('caso_orcamentos').select('*')
      .eq('caso_id', ID).order('enviado_em', { ascending: false }));
    P.anx  = jaVai(sb.from('anexos').select('*').eq('objeto', OBJETO_DO_ALVO())
      .eq('registro_id', ID).order('enviado_em'));

  } else if (ALVO === 'lead') {
    P.calc = jaVai(sb.from('leads_painel').select('*').eq('id', ID).single());
    P.li   = jaVai(sb.from('lead_imoveis').select('*').eq('lead_id', ID).order('criado_em'));
    P.sim  = jaVai(sb.from('simulacoes').select('*')
      .eq('lead_id', ID).order('criado_em', { ascending: false }));
    // v1.333 — as versões do orçamento e as seguradoras. O dia de
    // corte e a regra de parcelamento do incêndio vivem no cadastro
    // da seguradora; é ele que diz em que mês cada seguro começa.
    P.orcl = jaVai(sb.from('lead_orcamentos').select('*')
      .eq('lead_id', ID).order('versao', { ascending: false }));
    P.sgl  = jaVai(sb.from('seguradoras')
      .select('id,nome,dia_corte,incendio_forma,incendio_parcelas,incendio_meses_vigencia')
      .eq('ativa', true).order('nome'));
    // v1.398 — a carteira DISPONÍVEL, para escolher o imóvel do
    // orçamento. Vem filtrada do banco (10 de 78 hoje): trazer os 78
    // para descartar 68 no navegador é o erro que a v1.238 desfez.
    P.imd  = jaVai(sb.from('imoveis')
      .select('id,codigo,endereco,bairro,situacao,valor_aluguel')
      .eq('situacao', 'Disponível').order('endereco'));

  } else if (ALVO === 'contrato') {
    P.ap = jaVai(sb.from('contrato_seguros').select('*').eq('contrato_id', ID)
      .order('status').order('fim_vigencia', { ascending: false }));
    // v1.470 — pessoas ligadas a este contrato (titular + morador + quem fala…)
    P.pes = jaVai(sb.from('contrato_pessoas').select('*').eq('contrato_id', ID)
      .order('criado_em'));
    P.si = jaVai(sb.from('sinistros_painel').select('*').eq('contrato_id', ID)
      .order('criado_em', { ascending: false }));
    P.rj = jaVai(sb.from('contrato_reajustes').select('*').eq('contrato_id', ID)
      .order('aplicado_em', { ascending: false }));
    // v1.169 — itens da cobrança + modelos + meses (para o "2 de 6")
    P.its  = jaVai(sb.from('contrato_itens').select('*')
      .eq('contrato_id', ID).order('criado_em'));
    P.pads = jaVai(sb.from('contrato_itens_padrao').select('*').eq('ativo', true).order('nome'));
    // v1.328 — as contas de receita do plano, para o campo "Conta no
    // financeiro" do item. Perfil sem acesso recebe lista vazia e o
    // campo simplesmente não aparece — o banco herda a conta sozinho.
    P.plc = jaVai(sb.from('plano_contas').select('codigo,nome')
      .like('codigo', '3.%').order('codigo'));
    // v1.319 — o check-list: o cadastro dos itens e o que já foi
    // marcado à mão neste contrato. Item automático não vem daqui —
    // ele é calculado na hora de desenhar.
    P.ckI = jaVai(sb.from('checklist_itens').select('*').eq('ativo', true).order('ordem'));
    P.ckM = jaVai(sb.from('contrato_checklist').select('*').eq('contrato_id', ID));
    // v1.181 — a MESMA consulta serve o "N de M lançadas" (v1.169) e o
    // cartão Aluguéis do contrato: só cresceram as colunas e a ordem
    P.cps  = jaVai(sb.from('competencias')
      // v1.221 — valor_aluguel e valor_itens entram para a prévia de
      // gerar poder mostrar o total JÁ GRAVADO da parcela que existe
      // e dizer quais o botão ↻ mudaria
      // v1.256 — repassado_em entra porque a linha que volta ao
      // proprietário pode entrar em parcela JÁ RECEBIDA: a fronteira
      // dela é o repasse ter saído, não o inquilino ter pago
      // v1.270 — valor_repassado entra: o cartão Aluguéis agora mostra
      // as duas pontas (recebido do inquilino · repasse ao proprietário)
      .select('id,codigo,competencia,etapa,vencimento,valor_aluguel,valor_itens,'
            + 'valor_total,recebido_em,valor_recebido,repassado_em,valor_repassado')
      .eq('contrato_id', ID).order('competencia'));
    P.sg = jaVai(sb.from('seguradoras')
      .select('id,nome,dia_corte,incendio_forma,incendio_parcelas,incendio_meses_vigencia')
      .eq('ativa', true).order('nome'));
    /* v1.229 — DOIS DADOS QUE A VIEW NÃO ENTREGA.
     *
     * A ficha do contrato lê de `contratos_painel`, e a coluna
     * `taxa_contrato_parcela` nasceu depois da view — view criada com
     * `select ct.*` congela a lista de colunas no dia em que foi feita.
     * Em vez de recriar uma view que eu não escrevi, leio o campo da
     * tabela. E de quebra somo o que já foi retido, que é o que o
     * acompanhamento mostra. */
    P.tcp = jaVai(sb.from('contratos').select('taxa_contrato_parcela')
      .eq('id', ID).maybeSingle());
    P.ret = jaVai(sb.from('competencias').select('taxa_contrato_retida,competencia,etapa')
      .eq('contrato_id', ID).gt('taxa_contrato_retida', 0).order('competencia'));
    // v1.226 — os planos de fiança, para o seletor de Plano da apólice.
    // Já existia para a simulação do lead; aqui é o mesmo cadastro.
    P.fnc = carregarModalidadesFianca().catch(e => console.warn('planos de fiança:', e));
    /* Os andamentos são os ÚNICOS que dependem de outra consulta desta
     * lista: os ids saem dos sinistros. Então eles saem colados nos
     * sinistros, e não lá no fim da fila como antes. */
    P.and = P.si.then(r => { sinistrosFicha = r.data || []; return carregarAndamentos(); })
      .catch(e => console.warn('andamentos:', e));
    P.anexos = carregarAnexosDoRegistro().catch(e => console.warn('anexos:', e));   // M33
    // v1.243 — os documentos gerados deste contrato (cartão Documentos)
    P.docs = jaVai(sb.from('documentos')
      .select('id,titulo,versao,token,link_expira_em,criado_em')
      .eq('contrato_id', ID).order('criado_em', { ascending: false }));

  } else if (ALVO === 'sinistro') {
    P.an = jaVai(sb.from('sinistro_andamentos').select('*')
      .eq('sinistro_id', ID).order('criado_em', { ascending: false }));
    P.anexos = carregarAnexosDoRegistro().catch(e => console.warn('anexos:', e));   // M33

  } else if (ALVO === 'competencia') {
    // v1.222 — o extrato do mês. A tabela existe desde a v1.169 e
    // nenhuma tela lia: o "R$ 177,86 de itens" era um número sem
    // nenhuma linha por trás para quem quisesse explicar o boleto.
    P.ci = jaVai(sb.from('competencia_itens').select('*')
      .eq('competencia_id', ID).order('avulso').order('criado_em'));
    // v1.223 — os mesmos modelos que a janela do contrato oferece.
    // Nome digitado à mão vira "Agua", "Água" e "AGUA" em três meses,
    // e aí nenhum relatório por item fecha.
    P.pads = jaVai(sb.from('contrato_itens_padrao').select('*').eq('ativo', true).order('nome'));
    // v1.328 — as contas de receita do plano, para o campo "Conta no
    // financeiro" do item. Perfil sem acesso recebe lista vazia e o
    // campo simplesmente não aparece — o banco herda a conta sozinho.
    P.plc = jaVai(sb.from('plano_contas').select('codigo,nome')
      .like('codigo', '3.%').order('codigo'));

  } else if (ALVO === 'contato') {
    P.im = jaVai(sb.from('imoveis')
      .select('id,codigo,endereco,bairro,situacao,proprietario_id,inquilino_id')
      .or(`proprietario_id.eq.${ID},inquilino_id.eq.${ID}`).order('endereco'));
    /* v1.257 — o que este proprietário recebeu (e o que vai receber).
     * A visão já sabia quem é o proprietário desde a v1.179; o que
     * faltava era o token do documento, que a v1.257 acrescentou.
     * Quem não é proprietário volta lista vazia e o cartão some. */
    // v1.475 — O CORTE NO MÊS CORRENTE.
    //
    // Faltava aqui, e o cartão mentia: `order desc + limit 12` pega as
    // 12 competências MAIS RECENTES, e como o CRM gera as parcelas do
    // contrato inteiro adiantado, as mais recentes são as do FIM do
    // contrato. Num contrato novo (1 passada, 30 futuras) o
    // proprietário via mar/29, fev/29, jan/29 — todas "aguardando o
    // inquilino" — debaixo de um rótulo que diz "últimos 12 meses".
    P.rep = jaVai(sb.from('competencias_painel')
      .select('id,codigo,competencia,imovel_endereco,repasse_liquido,'
            + 'valor_repassado,repassado_em,recebido_em,etapa,recibo_token')
      .eq('proprietario_id', ID).neq('etapa', 'Cancelada')
      .lte('competencia', fimDoMesCorrente())
      .order('competencia', { ascending: false }).limit(12));
    // quantas ficaram para depois: a nota de rodapé diz, para ninguém
    // achar que o contrato acabou (era o que as 12 de 2029 "diziam")
    P.repFut = jaVai(sb.from('competencias_painel')
      .select('id', { count: 'exact', head: true })
      .eq('proprietario_id', ID).neq('etapa', 'Cancelada')
      .gt('competencia', fimDoMesCorrente()));
    /* v1.445 — os cartões novos do contato (pedido de 30/08).
     * Aluguéis e Sinistros dependem dos CONTRATOS dele, então saem
     * colados neles — o mesmo arranjo dos andamentos do contrato.
     * Consulta que falhar (papel sem alcance, rede) devolve vazio e o
     * cartão some, como o Repasses sempre fez. */
    P.cts = jaVai(sb.from('contratos')
      .select('id,codigo,status,inquilino_id,proprietario_id')
      .or(`inquilino_id.eq.${ID},proprietario_id.eq.${ID}`).order('codigo'));
    P.cps = P.cts.then(r => {
      contratosDoContato = r.data || [];
      const ids = contratosDoContato.map(c => c.id);
      if (!ids.length) return { data: [] };
      // v1.479 — O MESMO CORTE DO CARTÃO REPASSES.
      //
      // A varredura de 02/09 achou aqui a mordida que a v1.475
      // consertou lá: `order desc + limit 12` pede as 12 competências
      // mais recentes, e como o CRM gera o contrato inteiro de uma
      // vez, as mais recentes são as do FIM dele. Num contato de
      // teste as 12 linhas eram TODAS de 2028 — o cartão "Aluguéis"
      // não mostrava um único mês vivido.
      //
      // Dos 1.899 aluguéis do banco, 1.487 são futuros (78%). Sem o
      // corte, este cartão mostra futuro quase sempre.
      return sb.from('competencias')
        .select('id,codigo,competencia,etapa,vencimento,valor_total,'
              + 'recebido_em,valor_recebido,repassado_em,valor_repassado,contrato_id')
        .in('contrato_id', ids).neq('etapa', 'Cancelada')
        .lte('competencia', fimDoMesCorrente())
        .order('competencia', { ascending: false }).limit(12);
    }).catch(e => { console.warn('aluguéis do contato:', e); return { data: [] }; });
    // v1.479 — quantos aluguéis ainda não chegaram, para o rodapé
    P.cpsFut = P.cts.then(r => {
      const ids = (r.data || []).map(c => c.id);
      if (!ids.length) return { count: 0 };
      return sb.from('competencias').select('id', { count: 'exact', head: true })
        .in('contrato_id', ids).neq('etapa', 'Cancelada')
        .gt('competencia', fimDoMesCorrente());
    }).catch(() => ({ count: 0 }));
    P.sic = P.cts.then(r => {
      const ids = (r.data || []).map(c => c.id);
      if (!ids.length) return { data: [] };
      return sb.from('sinistros_painel').select('*').in('contrato_id', ids)
        .order('data_abertura', { ascending: false });
    }).catch(e => { console.warn('sinistros do contato:', e); return { data: [] }; });
    // as comissões não passam pelos contratos: a parcela conhece o
    // parceiro direto (parceiro_id), na mesma view da tela Comissões
    P.com = jaVai(sb.from('comissao_parcelas_painel')
      .select('id,comissao_codigo,numero,tipo,data_prevista,saldo,status,'
            + 'vencida,imovel_endereco')
      .eq('parceiro_id', ID)
      .order('data_prevista', { ascending: false }).limit(12));

  // v1.241 — as ações do plano vêm da VISÃO (é ela que sabe o atraso e
  // o farol). A ordem é a do plano: `ordem` primeiro, prazo como
  // desempate — assim uma ação sem ordem definida não vai para o fim.
  } else if (ALVO === 'plano') {
    P.acs = jaVai(sb.from('plano_acoes_painel').select('*')
      .eq('plano_id', ID).order('ordem').order('prazo'));

  } else if (ALVO === 'acao') {
    // só o que o seletor de plano precisa: três colunas, não a view
    P.pls = jaVai(sb.from('planos_acao').select('id,codigo,titulo,status')
      .order('codigo', { ascending: false }));
  }
  return P;
}

async function carregarFicha() {
  // v1.263 — aberto pelo código: uma ida ao banco descobre o id e o
  // resto da ficha nem fica sabendo. A consulta é na TABELA (não na
  // view) de propósito: é onde o RLS por empresa mora.
  if (!ID && CODIGO_URL) {
    const { data } = await sb.from(DEF.tabela)
      .select('id').eq('codigo', CODIGO_URL).maybeSingle();
    if (data) { ID = data.id; }
    else {
      document.getElementById('conteudo').innerHTML =
        `<div class="cartao"><div class="corpo">Não encontrei o registro
         <b>${htm(CODIGO_URL)}</b> — confira o código no endereço.</div></div>`;
      return;
    }
  }
  if (!ID) { document.getElementById('conteudo').innerHTML =
    '<div class="cartao"><div class="corpo">Registro não informado.</div></div>'; return; }

  /* ============================================================
   * v1.239 — ONDAS, NÃO FILA
   *
   * Medido na ficha do contrato: 11 idas ao servidor, cada uma
   * esperando a anterior terminar — 2,1 segundos de espera com a rede
   * parada quase o tempo todo. Só DUAS dessas consultas dependiam
   * mesmo de outra: o imóvel (o id vem do contrato) e os andamentos
   * (os ids vêm dos sinistros). As outras nove precisavam apenas do
   * ID, que está no endereço da página desde o primeiro instante —
   * estavam na fila por como o código foi escrito, não por
   * necessidade.
   *
   * Agora elas saem todas juntas, aqui em cima. O código abaixo
   * continua com a mesma cara: onde ele escrevia a consulta, agora
   * recolhe o que já voltou. A ordem em que as variáveis são
   * preenchidas não mudou, e por isso nenhuma tela precisou ser
   * mexida.
   *
   * `jaVai` existe porque a consulta do Supabase é PREGUIÇOSA:
   * guardar numa variável não dispara nada — quem dispara é o await.
   * O `.then` força a saída agora. O segundo argumento troca uma
   * queda de rede por `{ error }`, para que uma consulta ainda não
   * recolhida não vire erro solto no console; quem recolhe já trata
   * `error` ou usa `|| []`, como sempre tratou.
   * ============================================================ */
  const jaVai = q => q.then(r => r, e => ({ data: null, error: e }));
  const filtro = DEF.fk;

  // o layout e os campos personalizados entram ANTES de desenhar,
  // mas a busca deles não depende do registro: sai junto com ele
  const pLayout = (typeof carregarLayoutFicha === 'function')
    ? carregarLayoutFicha(ALVO) : Promise.resolve();
  const P = adiantarConsultas(jaVai);
  const pCasos = carregarCasosFicha().catch(e => console.warn('casos:', e));
  const pContratosIm = carregarContratosDoImovel().catch(e => console.warn('contratos do imóvel:', e));
  // o que só o registro destrava (hoje: o imóvel do contrato) fica aqui
  // e é esperado junto com o resto da segunda onda
  let pSegundaOnda = Promise.resolve();

  await pLayout;
  const [reg, tar] = await Promise.all([
    P.reg, P.tar
    /* v1.238 — a tabela de CONTATOS inteira saía daqui, em toda ficha.
     * Ela serve para dois usos muito diferentes: mostrar meia dúzia de
     * nomes na tela, e alimentar o seletor de Proprietário/Inquilino da
     * janela de edição. Trazer tudo atendia os dois, e custava a
     * carteira inteira em cada abertura — numa imobiliária com 5.000
     * contatos, isso é o que faz a ficha demorar. Agora os NOMES vêm por
     * id (carregarNomesUsados) e a lista completa só quando a janela de
     * edição abre (garantirListasCompletas). */
  ]);

  if (reg.error || !reg.data) {
    document.getElementById('conteudo').innerHTML =
      `<div class="cartao"><div class="corpo">Não foi possível abrir este registro.<br>
       <small>${htm(reg.error ? reg.error.message : 'não encontrado')}</small></div></div>`;
    return;
  }
  registro = reg.data;
  tarefasFicha = tar.data || [];

  // v1.263 — A BARRA GANHA O ENDEREÇO QUE SE LÊ.
  // Aberta por ?id=<uuid>, a ficha troca o endereço por
  // /contato/CT-0054 sem recarregar nada (replaceState não navega, só
  // reescreve a barra). O F5 nesse endereço volta para cá pelo
  // CODIGO_URL, e os links relativos da tela continuam funcionando
  // porque o servidor os traz de volta à raiz. Se houver outros
  // parâmetros na query, eles ficam.
  if (registro.codigo && history.replaceState) {
    const q = new URLSearchParams(location.search);
    q.delete('id'); q.delete('codigo');
    const resto = q.toString();
    history.replaceState(null, '', URL_RAIZ + ALVO + '/'
      + encodeURIComponent(registro.codigo) + (resto ? '?' + resto : ''));
  }

  // Os campos de endereço do contato só aparecem se as colunas já existirem
  // no banco (script sql/endereco-contato.sql). Assim o painel continua
  // funcionando mesmo se o SQL ainda não tiver sido rodado.
  if (DEF.campos.some(c => c.novo) && !('logradouro' in registro)) {
    DEF.campos = DEF.campos.filter(c => !c.novo);
  }

  if (ALVO === 'caso') {
    const [calc, orc, anx] = await Promise.all([P.calc, P.orc, P.anx]);
    calculados = calc.data || {};
    orcamentos = orc.data || [];
    anexos = anx.data || [];
    relacionados = orcamentos;
    await assinarAnexos();   // v1.105: link temporário para anexos de arquivo
  } else if (ALVO === 'lead') {
    // a ficha do lead traz 3 coisas próprias: os números calculados
    // (visão leads_painel), os imóveis de interesse e as simulações
    const [calc, li, sim, orcl, sgl, imd] =
      await Promise.all([P.calc, P.li, P.sim, P.orcl, P.sgl, P.imd]);
    calculados = calc.data || {};
    relacionados = li.data || [];
    simulacoes = sim.data || [];
    // v1.333 — o banco pode não ter a migração ainda: a ficha do lead
    // não pode cair por isso. Sem a tabela, o cartão nasce em branco.
    orcamentosLead = (orcl && orcl.data) || [];
    seguradorasFicha = (sgl && sgl.data) || [];
    imoveisDisponiveis = (imd && imd.data) || [];
    // v1.398 — os disponíveis também entram na `listaImoveis`, que é
    // de onde a tela tira endereço por id. Sem isto, escolher um
    // imóvel que não estava nos interesses do lead mostraria vazio.
    (imoveisDisponiveis || []).forEach(x => {
      if (!listaImoveis.some(y => y.id === x.id)) listaImoveis.push(x);
    });
    orcAtual = null;
    orcSemFianca = false;
  } else if (ALVO === 'contrato') {
    // apólices (relacionado principal) + sinistros + histórico de reajustes
    const [ap, si, rj, its, pads, cps, sg, ckI, ckM, plc] =
      await Promise.all([P.ap, P.si, P.rj, P.its, P.pads, P.cps, P.sg, P.ckI, P.ckM, P.plc]);
    planoReceitas = (plc && plc.data) || [];
    // o banco pode não ter a migração ainda: a ficha não pode cair por isso
    checklistItens = (ckI && ckI.data) || [];
    checklistFeito = (ckM && ckM.data) || [];
    relacionados = ap.data || [];
    sinistrosFicha = si.data || [];
    reajustesFicha = rj.data || [];
    itensContrato = its.data || [];
    itensPadrao = pads.data || [];
    mesesContrato = cps.data || [];
    seguradorasFicha = sg.data || [];
    // v1.470 — pessoas do contrato + os contatos delas (nome/telefone p/ o cartão)
    const _pes = await P.pes;
    pessoasDoContrato = (_pes && _pes.data) || [];
    if (pessoasDoContrato.length) {
      const _ids = [...new Set(pessoasDoContrato.map(x => x.contato_id).filter(Boolean))];
      const { data: _cts } = await sb.from('contatos').select('id,nome,telefone,codigo').in('id', _ids);
      contatosDasPessoas = {}; (_cts || []).forEach(c => { contatosDasPessoas[c.id] = c; });
    }
    // v1.471 — conversas do imóvel: o WhatsApp de TODAS as pessoas
    // ligadas (titular + vinculadas), num feed só. Cai fora sem permissão.
    conversasDoImovel = []; mensagensDoImovel = [];
    if (typeof pode !== 'function' || pode('conversas', 'ver')) {
      const _cids = [...new Set([registro.inquilino_id]
        .concat(pessoasDoContrato.map(x => x.contato_id)).filter(Boolean))];
      // muitas conversas casam só por TELEFONE (não têm contato_id):
      // reúno os telefones das pessoas (inquilino via pessoasContrato,
      // demais via contatosDasPessoas) e busco pelos dois caminhos
      const _tels = new Set();
      const _add = t => { const n = ppNormTel(t); if (n.length >= 10) _tels.add(n); };
      _add((pessoasContrato.find(x => x.id === registro.inquilino_id) || {}).telefone);
      Object.keys(contatosDasPessoas).forEach(k => _add(contatosDasPessoas[k].telefone));
      const _mapa = {};
      if (_cids.length) {
        const { data } = await sb.from('conversas').select('id,contato_id,nome,telefone').in('contato_id', _cids);
        (data || []).forEach(c => { _mapa[c.id] = c; });
      }
      if (_tels.size) {
        const { data } = await sb.from('conversas').select('id,contato_id,nome,telefone').in('telefone', [..._tels]);
        (data || []).forEach(c => { _mapa[c.id] = c; });
      }
      conversasDoImovel = Object.keys(_mapa).map(k => _mapa[k]);
      const _convIds = conversasDoImovel.map(c => c.id);
      if (_convIds.length) {
        const { data: _msgs } = await sb.from('mensagens_conversa')
          .select('conversa_id,tipo,texto,de_mim,recebida_em,autor_nome')
          .in('conversa_id', _convIds)
          .order('recebida_em', { ascending: false }).limit(25);
        mensagensDoImovel = _msgs || [];
      }
    }
    /* v1.238 — era a tabela de imóveis INTEIRA, e duas vezes na mesma
     * abertura (aqui e no ramo do lead), para achar UM imóvel.
     * v1.239 — é a única consulta da ficha do contrato que não pôde sair
     * na primeira onda: o id do imóvel está DENTRO do contrato. Por isso
     * ela não é esperada aqui — vai junto com a segunda onda, lá no fim,
     * e ninguém lê `imovelDoContrato` antes de desenhar. */
    // v1.270 — bairro e tipo entram para a faixa "quem é quem"; e os
    // telefones do inquilino e do proprietário vêm juntos (a faixa
    // mostra o WhatsApp dos dois sem clique nenhum).
    // v1.271 — o PROPRIETÁRIO vem do IMÓVEL: a contratos_painel não tem
    // proprietario_id (conferido por sonda REST — 42703), então os
    // contatos só podem ser buscados DEPOIS que o imóvel chegou.
    pSegundaOnda = (registro.imovel_id
      ? jaVai(sb.from('imoveis')
          .select('id,codigo,endereco,bairro,tipo,proprietario_id,'
                // v1.387 — `situacao` entrou aqui: o item automático do
                // anúncio a lia e ela nunca vinha, então ele respondia
                // "não consegui ler a situação do imóvel" para sempre.
                + 'taxa_adm_percentual,taxa_adm_minimo,taxa_adm_valor,situacao')
          .eq('id', registro.imovel_id).maybeSingle())
          .then(r => { imovelDoContrato = r.data || null; })
      : Promise.resolve()
    ).then(() => {
      const ids = [registro.inquilino_id,
        imovelDoContrato && imovelDoContrato.proprietario_id].filter(Boolean);
      return ids.length
        ? jaVai(sb.from('contatos').select('id,nome,telefone').in('id', ids))
            .then(r => { pessoasContrato = r.data || []; })
        : Promise.resolve();
    });
    /* v1.229 — DOIS DADOS QUE A VIEW NÃO ENTREGA.
     *
     * A ficha do contrato lê de `contratos_painel`, e a coluna
     * `taxa_contrato_parcela` nasceu depois da view — view criada com
     * `select ct.*` congela a lista de colunas no dia em que foi feita.
     * Em vez de recriar uma view que eu não escrevi, leio o campo da
     * tabela. E de quebra somo o que já foi retido, que é o que o
     * acompanhamento mostra. */
    const [tcp, ret] = await Promise.all([P.tcp, P.ret]);
    taxaContratoParcela = tcp.data ? tcp.data.taxa_contrato_parcela : null;
    taxaContratoRetencoes = ret.data || [];
    const docs = await P.docs;                      // v1.243
    documentosFicha = docs.data || [];
    await Promise.all([P.fnc, P.and, P.anexos]);
  } else if (ALVO === 'sinistro') {
    const an = await P.an;
    relacionados = an.data || [];
    andamentosFicha = { [ID]: relacionados };
    sinistrosFicha = [registro];      // as ações reaproveitam esta lista
    await P.anexos;   // M33
  } else if (ALVO === 'competencia') {
    // v1.206 — os dois objetos de onde esta parcela nasceu. Sem eles o
    // cartão "Relacionados" da parcela vinha vazio: o ALVO caía no ramo
    // do imóvel, que procura proprietario_id/inquilino_id — colunas que
    // a competencias_painel não tem. Quem abria um Aluguel via os nomes
    // do inquilino e do proprietário em texto e não tinha como chegar
    // no contrato nem no imóvel sem passar pela busca.
    relacionados = [];
    // v1.222 — o extrato do mês. A tabela existe desde a v1.169 e
    // nenhuma tela lia: o "R$ 177,86 de itens" era um número sem
    // nenhuma linha por trás para quem quisesse explicar o boleto.
    const [ci, pads, plc] = await Promise.all([P.ci, P.pads, P.plc]);
    planoReceitas = (plc && plc.data) || [];
    /* v1.231 — a mesma tabela guarda os dois lados. O que entra no
     * boleto do inquilino e o que sai do repasse do proprietário são
     * cartões diferentes na tela, mas uma linha só no banco. */
    itensDaParcela   = (ci.data || []).filter(x => x.lado !== 'proprietario');
    descontosParcela = (ci.data || []).filter(x => x.lado === 'proprietario');
    itensPadrao = pads.data || [];
    if (registro.contrato_id) {
      // v1.272 — inquilino_id entra: a faixa "quem é quem" e o botão de
      // cobrar precisam do contato (a competencias_painel não o traz)
      const { data: ct } = await sb.from('contratos')
        .select('id,codigo,status,data_inicio,data_fim_prevista,dia_vencimento,'
              + 'valor_aluguel,garantia_tipo,imovel_id,inquilino_id')
        .eq('id', registro.contrato_id).maybeSingle();
      if (ct) {
        relacionados.push({ papel: 'Contrato', ...ct });
        if (ct.imovel_id) {
          const { data: im } = await sb.from('imoveis')
            .select('id,codigo,endereco,bairro,cidade,tipo,situacao')
            .eq('id', ct.imovel_id).maybeSingle();
          if (im) relacionados.push({ papel: 'Imóvel', ...im });
        }
      }
      // v1.446 — os itens do contrato (início + total de parcelas) para
      // numerar os seguros no boleto ("Seguro fiança 11/12"). A linha do
      // boleto só guarda o contrato_item_id; a contagem mora no contrato.
      itensContratoMap = {};
      const { data: cits } = await sb.from('contrato_itens')
        .select('id,inicio_competencia,parcelas,ciclo_meses,primeira_paga_fora')
        .eq('contrato_id', registro.contrato_id);
      (cits || []).forEach(c => { itensContratoMap[c.id] = c; });
      // v1.272 — os telefones do inquilino e do proprietário, para o
      // WhatsApp da faixa e a cobrança do radar
      const idsPes = [ct && ct.inquilino_id, registro.proprietario_id].filter(Boolean);
      if (idsPes.length) {
        const { data: pes } = await sb.from('contatos')
          .select('id,nome,telefone').in('id', idsPes);
        pessoasContrato = pes || [];
      }
    }
  } else if (ALVO === 'contato') {
    const [im, rep, repFut, cps, cpsFut, sic, com] = await Promise.all(
      [P.im, P.rep, P.repFut, P.cps, P.cpsFut, P.sic, P.com]);
    relacionados = im.data || [];
    repassesDoContato = rep.data || [];
    repassesFuturos = (repFut && repFut.count) || 0;   // v1.475
    // v1.445 — os cartões novos (contratosDoContato já foi preenchido
    // dentro do P.cps, que depende dele)
    alugueisDoContato = (cps && cps.data) || [];
    alugueisFuturos = (cpsFut && cpsFut.count) || 0;   // v1.479
    sinistrosDoContato = (sic && sic.data) || [];
    comissoesDoContato = (com && com.data) || [];
  } else if (ALVO === 'plano') {
    const acs = await P.acs;
    acoesDoPlano = acs.data || [];
    relacionados = acoesDoPlano;   // o cartão "relacionados" do plano é a lista de ações
  } else if (ALVO === 'acao') {
    const pls = await P.pls;
    planosParaEscolher = pls.data || [];
    ajustarPlanosDaFicha();
    relacionados = [];
  } else {
    // ALVO 'imovel' segue no bloco abaixo; os casos relacionados dos dois
    // (contato e imóvel) são carregados depois, em carregarCasosFicha().
    const ids = [registro.proprietario_id, registro.inquilino_id].filter(Boolean);
    const pes2 = ids.length
      // v1.334 — telefone e e-mail entram: são eles que o cartão
      // Pessoas mostra agora, com o botão de copiar do lado
      ? await sb.from('contatos').select('id,codigo,nome,telefone,email').in('id', ids)
      : { data: [] };
    relacionados = [registro.proprietario_id, registro.inquilino_id]
      .map((pid, k) => {
        const c = (pes2.data || []).find(x => x.id === pid);
        return c ? { papel: k === 0 ? 'Proprietário' : 'Inquilino', ...c } : null;
      }).filter(Boolean);
  }
  // v1.239 — estes dois já saíram lá em cima, junto com o registro:
  // aqui é só a confirmação de que voltaram antes de desenhar
  await Promise.all([pCasos, pContratosIm]);   // v1.182
  /* A SEGUNDA E ÚLTIMA ONDA. Os três só podem perguntar depois que o
   * registro chegou — os nomes precisam saber quais ids a ficha cita, e
   * as fórmulas quais campos ela relaciona. Mas não dependem UM DO
   * OUTRO, então vão juntos. */
  await Promise.all([
    pSegundaOnda,
    carregarRelacionadosDaFormula(),  // v1.195
    carregarNomesUsados()             // v1.238
  ]);
  desenharFicha();
  // v1.284 — a conferência procura o contato candidato e se desenha
  // sozinha; sai calada nas fichas já decididas e nas outras fichas
  if (ALVO === 'ficha') carregarConferencia();
}

// ------------------------------------------------------------
// CONTRATOS DO IMÓVEL (v1.182, mockup aprovado em 06/08) — a mesma
// ideia do cartão de Aluguéis no contrato: o ativo em cima, os
// encerrados esmaecidos, clique abre o contrato.
// ------------------------------------------------------------
let contratosDoImovel = [];

async function carregarContratosDoImovel() {
  if (ALVO !== 'imovel') return;
  const { data } = await sb.from('contratos')
    .select('id,codigo,inquilino_id,data_inicio,data_fim_prevista,data_encerramento,status,valor_aluguel')
    .eq('imovel_id', ID).order('data_inicio', { ascending: false });
  contratosDoImovel = data || [];
  // o ativo sempre em cima, mesmo que um encerrado tenha começado depois
  contratosDoImovel.sort((a, b) =>
    (a.data_encerramento ? 1 : 0) - (b.data_encerramento ? 1 : 0)
    || String(b.data_inicio || '').localeCompare(String(a.data_inicio || '')));
}

function blocoContratosDoImovel() {
  if (ALVO !== 'imovel') return '';
  const cores = { 'Ativo': 'tag-verde', 'Aviso Prévio': 'tag-amarela',
    'Seguro Acionado': 'tag-vermelha', 'Encerrado': 'tag-cinza' };
  const nomeInq = id => {
    const c = (listaContatos || []).find(x => x.id === id);
    return c ? c.nome : '—';
  };
  const ativos = contratosDoImovel.filter(c => !c.data_encerramento).length;
  const encerrados = contratosDoImovel.length - ativos;
  const desde = contratosDoImovel.length
    ? contratosDoImovel.reduce((m, c) => (c.data_inicio && c.data_inicio < m) ? c.data_inicio : m,
        contratosDoImovel[0].data_inicio || '9999') : null;

  const corpo = !contratosDoImovel.length
    ? '<div class="corpo" style="color:#8a94a1">Nenhum contrato neste imóvel ainda.</div>'
    : `<div class="tabela-caixa"><table class="mini" style="font-size:13px">
      <tr><th>Contrato</th><th>Inquilino</th><th>Início</th><th>Fim</th>
        <th style="text-align:right">Aluguel</th><th>Situação</th></tr>
      ${contratosDoImovel.map(c => `
      <tr style="cursor:pointer${c.data_encerramento ? ';opacity:.65' : ''}"
        onclick="location.href='contrato.html?id=${c.id}'">
        <td style="white-space:nowrap;color:var(--texto-suave)">${htm(c.codigo || '')}</td>
        <td>${htm(nomeInq(c.inquilino_id))}</td>
        <td>${c.data_inicio ? dataBr(c.data_inicio) : '—'}</td>
        <td>${c.data_encerramento ? dataBr(c.data_encerramento)
              : (c.data_fim_prevista ? dataBr(c.data_fim_prevista) : '—')}</td>
        <td style="text-align:right;white-space:nowrap">${c.valor_aluguel != null ? moeda(c.valor_aluguel) : '—'}</td>
        <td><span class="tag ${cores[c.status] || 'tag-cinza'}">${htm(c.status || '—')}</span></td>
      </tr>`).join('')}
    </table></div>`;

  return `<div class="cartao" data-obj="contratos">
    <h2>Contratos deste imóvel <span class="cnt">(${contratosDoImovel.length})</span></h2>
    ${contratosDoImovel.length ? `<p style="font-size:12.5px;color:var(--texto-suave);margin:10px 14px 12px">
      ${ativos ? `<b style="color:#1c7c3d">${ativos} ativo${ativos > 1 ? 's' : ''}</b>` : 'nenhum ativo'}
      · ${encerrados} encerrado${encerrados === 1 ? '' : 's'}
      ${desde && desde !== '9999' ? ` · no imóvel desde <b>${dataBr(desde)}</b>` : ''}</p>` : ''}
    ${corpo}
  </div>`;
}

// ------------------------------------------------------------
// CASOS RELACIONADOS (v1.101) — a ficha do imóvel lista os casos do
// imóvel; a do contato, os casos em que a pessoa é prestador ou
// solicitante. Quem não pode ver Casos não vê o cartão (data-obj).
// ------------------------------------------------------------
let casosFicha = [];
// v1.390 — de onde cada caso veio, para a ficha do CONTATO poder dizer
// POR QUE aquele chamado está ali. Chave → rótulo legível.
let casosImoveis = {};    // imóveis em que este contato é dono ou inquilino
let casosContratos = {};  // contratos em que este contato é o inquilino

/**
 * v1.238 — SÓ OS NOMES QUE A TELA VAI MOSTRAR.
 *
 * A ficha precisa de nomes de pessoas e endereços de imóveis em meia
 * dúzia de lugares: os campos de referência, o inquilino de cada
 * contrato do imóvel, o prestador de cada orçamento, os imóveis de
 * interesse do lead. Antes isso era resolvido trazendo as duas tabelas
 * inteiras — o que funciona com 75 imóveis e não funciona com 2.000.
 *
 * Aqui a conta é outra: junta os ids que a tela realmente vai citar e
 * busca só eles, em duas consultas com `in`. Numa ficha comum são
 * dois ou três ids.
 *
 * As listas COMPLETAS continuam existindo — mas só quando a janela de
 * edição abre, em garantirListasCompletas().
 */
async function carregarNomesUsados() {
  const pessoas = new Set();
  const imoveis = new Set();
  const contratos = new Set();
  const põe = (jogo, v) => { if (v) jogo.add(v); };

  (DEF.campos || []).forEach(c => {
    const v = registro ? registro[c.c] : null;
    if (c.t === 'ref') põe(pessoas, v);
    if (c.t === 'refimovel') põe(imoveis, v);
    if (c.t === 'refcontrato') põe(contratos, v);
  });
  põe(pessoas, registro.proprietario_id);
  põe(pessoas, registro.inquilino_id);
  (contratosDoImovel || []).forEach(c => põe(pessoas, c.inquilino_id));
  (orcamentos || []).forEach(o => põe(pessoas, o.prestador_id));
  if (ALVO === 'lead') (relacionados || []).forEach(i => põe(imoveis, i.imovel_id));
  põe(imoveis, registro.imovel_id);
  põe(contratos, registro.contrato_id);

  const [pes, im, ctr] = await Promise.all([
    pessoas.size ? sb.from('contatos').select('id,codigo,nome').in('id', [...pessoas])
                 : Promise.resolve({ data: [] }),
    imoveis.size ? sb.from('imoveis')
                     .select('id,codigo,endereco,bairro,situacao')
                     .in('id', [...imoveis])
                 : Promise.resolve({ data: [] }),
    contratos.size ? sb.from('contratos')
                       .select('id,codigo,imovel_id,status,data_inicio,data_encerramento')
                       .in('id', [...contratos])
                   : Promise.resolve({ data: [] })
  ]);
  if (ctr.data) listaContratos = ctr.data;
  listaContatos = pes.data || [];
  // o do contrato já veio com as colunas de taxa, que estas não trazem
  const jaTem = listaImoveis.filter(x => (im.data || []).every(y => y.id !== x.id));
  listaImoveis = (im.data || []).concat(jaTem);
}

/**
 * As listas completas, para os seletores da janela de edição.
 *
 * Roda UMA vez por página e não é esperada: os seletores pedem a fonte
 * por função, na hora em que a pessoa clica no campo — e a essa altura
 * a lista já chegou. Segurar a janela fechada esperando duas consultas
 * seria trocar uma lentidão por outra, mais visível.
 */
let listasCompletas = false;
async function garantirListasCompletas() {
  if (listasCompletas) return;
  listasCompletas = true;
  try {
    const [pes, im, ctr] = await Promise.all([
      sb.from('contatos').select('id,codigo,nome').order('nome'),
      sb.from('imoveis').select('id,codigo,endereco,bairro,situacao').order('endereco'),
      sb.from('contratos')
        .select('id,codigo,imovel_id,status,data_inicio,data_encerramento')
        .order('codigo', { ascending: false })
    ]);
    if (pes.data) listaContatos = pes.data;
    if (im.data) {
      // preserva o imóvel do contrato, que tem as colunas de taxa
      const doContrato = imovelDoContrato
        ? [imovelDoContrato].filter(x => im.data.every(y => y.id !== x.id)) : [];
      listaImoveis = im.data.concat(doContrato);
    }
    if (ctr.data) listaContratos = ctr.data;
  } catch (e) {
    listasCompletas = false;   // deu errado: tenta de novo na próxima janela
    console.warn('listas completas:', e);
  }
}

async function carregarCasosFicha() {
  if (ALVO !== 'contato' && ALVO !== 'imovel' && ALVO !== 'contrato') return;
  const cols = 'id,codigo,tipo,titulo,status,status_pagamento,valor_aprovado,aberto_em,'
             + 'prestador_id,solicitante_id,imovel_id,contrato_id';
  const nova = () => sb.from('casos').select(cols)
    .order('aberto_em', { ascending: false }).limit(50);

  if (ALVO === 'imovel') {
    const { data } = await nova().eq('imovel_id', ID);   casosFicha = data || []; return;
  }
  if (ALVO === 'contrato') {
    const { data } = await nova().eq('contrato_id', ID); casosFicha = data || []; return;
  }

  // v1.390 — NO CONTATO, TUDO EM QUE A PESSOA ENTRA.
  //
  // Antes a busca era só `prestador_id` ou `solicitante_id`. Só que
  // "Quem abriu o caso" nunca foi preenchido — ZERO dos 41 casos tinham
  // solicitante_id em 24/08/2026 —, então na prática o cartão só tinha
  // conteúdo na ficha de PRESTADOR. Abrindo um inquilino ou um
  // proprietário, ele vinha vazio mesmo havendo chamados na casa dele.
  //
  // Agora entram também os casos DO IMÓVEL de que a pessoa é dona ou
  // inquilina, e os DO CONTRATO em que ela é a inquilina. Como o mesmo
  // caso pode chegar por mais de um caminho, cada linha diz por que
  // está ali (ver porqueOCasoAparece) — sem isso a lista não deixaria
  // claro o que é responsabilidade da pessoa e o que só acontece na
  // casa dela.
  const [im, ct] = await Promise.all([
    sb.from('imoveis').select('id,codigo,endereco')
      .or(`proprietario_id.eq.${ID},inquilino_id.eq.${ID}`),
    sb.from('contratos').select('id,codigo').eq('inquilino_id', ID)
  ]);
  casosImoveis = {};
  (im.data || []).forEach(i => { casosImoveis[i.id] = i.endereco || i.codigo || ''; });
  casosContratos = {};
  (ct.data || []).forEach(c => { casosContratos[c.id] = c.codigo || ''; });

  // lista vazia viraria `in.()`, que o PostgREST recusa — por isso cada
  // pedaço só entra quando tem o que procurar
  const ou = [`prestador_id.eq.${ID}`, `solicitante_id.eq.${ID}`];
  const idsIm = Object.keys(casosImoveis);
  const idsCt = Object.keys(casosContratos);
  if (idsIm.length) ou.push(`imovel_id.in.(${idsIm.join(',')})`);
  if (idsCt.length) ou.push(`contrato_id.in.(${idsCt.join(',')})`);
  const { data } = await nova().or(ou.join(','));
  casosFicha = data || [];
}

/**
 * v1.390 — por que este caso aparece na ficha DESTE contato.
 *
 * Só faz sentido no contato: no imóvel e no contrato a resposta é
 * sempre a mesma e dizê-la seria ruído.
 */
function porqueOCasoAparece(c) {
  if (ALVO !== 'contato') return '';
  const m = [];
  if (c.prestador_id === ID)   m.push('executou como prestador');
  if (c.solicitante_id === ID) m.push('abriu o chamado');
  if (casosImoveis[c.imovel_id])     m.push('no imóvel ' + casosImoveis[c.imovel_id]);
  if (casosContratos[c.contrato_id]) m.push('no contrato ' + casosContratos[c.contrato_id]);
  return m.join(' · ');
}

function blocoCasosFicha() {
  if (ALVO !== 'contato' && ALVO !== 'imovel' && ALVO !== 'contrato') return '';
  const cores = { 'Aberto': 'tag-azul', 'Orçamento': 'tag-amarela', 'Aprovado': 'tag-azul',
    'Em execução': 'tag-amarela', 'Concluído': 'tag-verde', 'Cancelado': 'tag-cinza' };
  const corpo = !casosFicha.length
    ? '<div class="corpo" style="color:#8a94a1">Nenhum caso ligado a este registro.</div>'
    : `<table class="mini">${casosFicha.map(c => `
      <tr>
        <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">
          <a href="caso.html?id=${c.id}">${htm(c.codigo || '')}</a></td>
        <td>${htm(c.tipo || '')}${c.titulo ? ' · ' + htm(c.titulo) : ''}
          <div style="color:var(--texto-suave);font-size:12px">aberto em ${dataBr(String(c.aberto_em || '').slice(0, 10))}${
            c.valor_aprovado ? ' · ' + moeda(c.valor_aprovado) : ''}</div>${
          porqueOCasoAparece(c)
            ? `<div style="color:var(--texto-suave);font-size:11.5px;font-style:italic">${
                htm(porqueOCasoAparece(c))}</div>` : ''}</td>
        <td style="width:1%;white-space:nowrap">
          <span class="tag ${cores[c.status] || 'tag-cinza'}">${htm(c.status || '')}</span>${
          c.status_pagamento === 'A pagar' ? ' <span class="tag tag-vermelha">A pagar</span>' : ''}</td>
      </tr>`).join('')}</table>`;
  return `<div class="cartao" data-obj="casos">
    <h2>Casos <span class="cnt">(${casosFicha.length})</span>
      <span class="dir"><a class="btn btn-claro" style="padding:5px 12px;font-size:12px"
        href="casos.html">Ver em Casos</a></span></h2>
    ${corpo}</div>`;
}

// ------------------------------------------------------------
// 3) DESENHAR — cabeçalho, chips, abas e faixa de Atividade
// ------------------------------------------------------------
// v1.195 — RELACIONADOS DA FÓRMULA.
// Uma consulta por relação CITADA, feita uma vez ao abrir a ficha.
// Relação que nenhuma fórmula usa não é buscada: quem não escreve
// fórmula não paga por isto.
let relacionadosFx = {};

async function carregarRelacionadosDaFormula() {
  relacionadosFx = {};
  const formulas = (DEF.campos || []).filter(c => c.formula).map(c => c.formula);
  if (!formulas.length || typeof fxRelacoes !== 'function') return;

  const citados = {};
  formulas.forEach(f => fxCamposCitados(f).forEach(n => {
    const p = String(n).indexOf('.');
    if (p > 0) citados[String(n).slice(0, p).trim().toLowerCase()] = 1;
  }));
  if (!Object.keys(citados).length) return;

  const relacoes = fxRelacoes(DEF.campos)
    .filter(r => citados[r.rotulo.trim().toLowerCase()]);
  await Promise.all(relacoes.map(async r => {
    const id = registro[r.campo];
    if (!id) { relacionadosFx[r.rotulo] = { rel: r, dados: null }; return; }
    const { data } = await sb.from(r.tabela).select('*').eq('id', id).maybeSingle();
    relacionadosFx[r.rotulo] = { rel: r, dados: data || null };
  }));
}

/** Os pares "Proprietário.Nome" -> valor, para o leitor da fórmula. */
function paresRelacionados() {
  const fora = [];
  Object.keys(relacionadosFx).forEach(k => {
    const item = relacionadosFx[k];
    const dd = (typeof DEFS !== 'undefined' && DEFS[item.rel.objeto])
      ? DEFS[item.rel.objeto].campos : [];
    fora.push.apply(fora, fxParesDaRelacao(item.rel, item.dados, dd));
  });
  return fora;
}

/** v1.192 — o valor SEM formato, do jeito que a fórmula precisa ler:
 *  número como número, data como texto ISO, personalizado de dentro do
 *  jsonb. Formatar antes faria "R$ 1.190,00" entrar numa soma. */
function valorCruDoCampo(c) {
  if (c.pers) {
    const p = registro.personalizados || {};
    return Object.prototype.hasOwnProperty.call(p, c.pers) ? p[c.pers] : null;
  }
  return registro[c.c];
}

// ============================================================
// v1.334 — O BOTÃO DE COPIAR (mockup aprovado em 21/08/2026)
//
// Ao lado de todo telefone, e-mail e CPF: um clique põe o valor na
// área de transferência. Substitui o selecionar-com-o-mouse, que num
// número mascarado quase sempre pega um parêntese a mais ou um dígito
// a menos.
//
// TRÊS DECISÕES:
//
// 1. COPIA SÓ OS NÚMEROS em telefone e CPF (escolha do Rodrigo). É o
//    formato que cola no WhatsApp e nos sites das seguradoras; a
//    máscara continua na tela, para quem lê. E-mail vai como está.
//
// 2. O VALOR VIAJA EM `data-copia`, não num onclick. Telefone e e-mail
//    são dado de gente: pôr isso dentro de um atributo de código é o
//    caminho curto para o XSS que o semgrep vigia. Quem ouve o clique
//    é UM ouvinte no documento, ligado uma vez só — não um por botão.
//
// 3. O ÍCONE É SVG DE CONTORNO, herdando `currentColor`: cinza parado,
//    azul no hover, verde ao copiar. Emoji não aceita cor nem estado, e
//    cada sistema desenha o seu.
// ============================================================
const ICONE_COPIA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"'
  + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<rect x="9" y="9" width="12" height="12" rx="2"/>'
  + '<path d="M5 15H4.5A2.5 2.5 0 0 1 2 12.5v-8A2.5 2.5 0 0 1 4.5 2h8A2.5 2.5 0 0 1 15 4.5V5"/></svg>';

/** O botão. Devolve '' para valor vazio — campo sem conteúdo não ganha
 *  ícone, senão a ficha vira um varal de botões que não copiam nada. */
function botaoCopiar(valor, oQue) {
  const v = String(valor === null || valor === undefined ? '' : valor).trim();
  if (!v) return '';
  return `<button type="button" class="btn-copia" data-copia="${htm(v)}"
    title="Copiar ${htm(oQue || '')}" aria-label="Copiar ${htm(oQue || v)}"
    >${ICONE_COPIA}<span class="copia-aviso">copiado</span></button>`;
}

/** Telefone e CPF copiam SÓ OS DÍGITOS; o resto, o valor inteiro. */
function botaoCopiarDigitos(valor, oQue) {
  const d = (typeof soDigitos === 'function')
    ? soDigitos(valor) : String(valor || '').replace(/\D/g, '');
  return botaoCopiar(d, oQue);
}

/**
 * UM ouvinte para a ficha inteira, ligado uma vez.
 *
 * O `stopPropagation` não é enfeite: o botão mora dentro de linhas que
 * abrem registro no clique e de cartões que recolhem — sem ele, copiar
 * o telefone do inquilino levaria a pessoa para outra tela.
 *
 * O `navigator.clipboard` só existe em página segura. Em https ele
 * sempre está lá; o plano B com `prompt` é para o caso de alguém abrir
 * o arquivo local, e é o mesmo do `copiar()` da v1.117.
 */
document.addEventListener('click', function (ev) {
  const b = ev.target && ev.target.closest && ev.target.closest('.btn-copia');
  if (!b) return;
  ev.preventDefault();
  ev.stopPropagation();
  const texto = b.dataset.copia || '';
  const feito = ok => {
    b.classList.add('copiou');
    const av = b.querySelector('.copia-aviso');
    if (av) av.textContent = ok ? 'copiado' : 'não deu';
    const svg = b.querySelector('svg');
    if (svg && ok) svg.innerHTML = '<polyline points="20,6 9,17 4,12"/>';
    setTimeout(() => {
      b.classList.remove('copiou');
      if (svg) svg.innerHTML = ICONE_COPIA.replace(/^<svg[^>]*>|<\/svg>$/g, '');
    }, 1300);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(() => feito(true), () => feito(false));
  } else {
    window.prompt('Copie o texto abaixo:', texto);
  }
});

function valorFormatado(campo) {
  // v1.192 — CAMPO CALCULADO. A fórmula é escrita com os RÓTULOS dos
  // campos ({Valor do aluguel}), que é como a pessoa os vê na tela.
  if (campo.formula) {
    if (typeof fxValor !== 'function') return '—';
    const pares = (DEF.campos || []).filter(x => !x.formula)
      .map(x => ({ rotulo: x.r, valor: valorCruDoCampo(x) }))
      // v1.195 — e os campos de quem este registro aponta:
      // {Proprietário.Chave PIX}. Vieram carregados antes do desenho.
      .concat(paresRelacionados());
    const r = fxValor(campo.formula, fxLeitor(pares));
    if (r.erro) return `<span class="fx-ruim" title="${htm(r.erro)}">\u26A0 fórmula</span>`;
    return htm(formatarValorSolto(r.v, campo.t));
  }

  const v = (typeof valorDoRegistro === 'function')
    ? valorDoRegistro(registro, campo) : registro[campo.c];
  if (Array.isArray(v)) return v.length ? htm(v.join(', ')) : '—';
  if (campo.t === 'check' && (v === null || v === undefined)) return '—';
  if (v === null || v === undefined || v === '') return '—';
  if (campo.rotulos && campo.rotulos[v] !== undefined) return htm(campo.rotulos[v]);
  switch (campo.t) {
    case 'moeda': return moeda(v);
    // O terceiro lugar que precisava saber disso. A janela de edição e a
    // lista já convertiam; a ficha em modo LEITURA caía no padrão e
    // mostrava "0.1" — sem risco de gravar errado, mas errado na tela.
    case 'percentual':
      return htm((Number(v) * 100).toLocaleString('pt-BR',
        { maximumFractionDigits: 2 }) + '%');
    case 'data': return dataBr(v);
    case 'datahora': {
      // no banco fica 2026-07-20T15:00:00+00:00; na tela, 20/07/2026 12:00
      const d = new Date(v);
      return isNaN(d) ? htm(String(v)) : htm(d.toLocaleString('pt-BR',
        { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
    }
    case 'check': return v ? 'Sim' : 'Não';
    // v1.334 — o botão de copiar entra AQUI, e por isso vale para
    // toda ficha de uma vez: contato, lead, ficha recebida, caso,
    // simulação, tarefa, ação e plano passam todos por este switch.
    case 'tel': return `<a href="tel:${htm(soDigitos(v))}">${htm(mascaraTelefone(v))}</a>`
      + botaoCopiarDigitos(v, 'o telefone');
    case 'doc': return htm(mascaraDoc(v)) + botaoCopiarDigitos(v, 'o CPF/CNPJ');
    case 'cep': return htm(mascaraCep(v));
    case 'uf': return htm(String(v).toUpperCase());
    case 'email': return `<a href="mailto:${htm(v)}">${htm(v)}</a>`
      + botaoCopiar(v, 'o e-mail');
    case 'ref': {
      const n = nomePessoa(v);
      return n ? `<a href="contato.html?id=${v}">${htm(n)}</a>` : '—';
    }
    case 'refimovel': {
      const i = listaImoveis.find(x => x.id === v);
      return i ? `<a href="imovel.html?id=${v}">${htm(i.endereco)}</a>` : '—';
    }
    // v1.389 — o contrato do caso. Código E endereço: o código sozinho
    // não diz nada a quem lê o caso, e o endereço sozinho seria ambíguo
    // num imóvel com dois contratos — que é o problema que fez este
    // campo existir.
    case 'refcontrato': {
      const c2 = listaContratos.find(x => x.id === v);
      return c2 ? `<a href="contrato.html?id=${v}">${htm(rotuloContrato(c2))}</a>` : '—';
    }
    default: return htm(String(v)).replace(/\n/g, '<br>');
  }
}

// ============================================================
// v1.357 — O LÁPIS DE CAMPO (edição campo a campo, estilo Salesforce)
//
// Passou o mouse no valor, o ✎ aparece; clicou, edita SÓ aquele campo,
// ali mesmo na linha. O truque que evita um segundo caminho de gravação:
// a JANELA DE SEMPRE abre invisível com um campo só, e o campo DELA é
// movido para dentro da linha. Máscaras, listas, lookups, conversões
// (percentual, moeda, fuso), travas por papel e todas as validações do
// salvarModal continuam valendo — inclusive o aviso que pede o segundo
// clique. Enter (Ctrl+Enter no texto longo) ou ✓ salva; Esc ou ✕
// cancela. Depois de salvar, a ficha repinta e o campo pisca verde.
// ============================================================
let lapisColuna = null;     // a coluna em edição (um lápis de cada vez)
let lapisHtmlAntes = '';    // a linha como era, para o cancelar devolver

/** a linha do valor na ficha (id nasce no template: vf-<coluna>) */
function lapisLinha(coluna) { return document.getElementById('vf-' + coluna); }

/** o campo ganha lápis? calculado, travado e "aviso" ficam de fora */
function lapisPodeEditar(c) {
  if (!c || c.formula || c.somenteLeitura || c.t === 'aviso') return false;
  if (c.c && c.c.startsWith('_')) return false;
  if (typeof leadTravado === 'function' && leadTravado()) return false;
  if (typeof campoSomenteLeitura === 'function' && typeof DEF !== 'undefined'
      && DEF && DEF.tabela && campoSomenteLeitura(DEF.tabela, c.c)) return false;
  return true;
}

/** o HTML do valor na ficha — com ou sem lápis */
function vFichaHtml(c) {
  const valor = valorFormatado(c);
  if (!lapisPodeEditar(c)) return `<div class="v">${valor}</div>`;
  return `<div class="v editavel" id="vf-${c.c}" onclick="lapisAbrir(event,'${c.c}')">`
    + `<span class="vtexto">${valor}</span>`
    + `<button type="button" class="lapis-campo" data-perm="${OBJETO_PERM()}:editar"
         title="Editar ${htm(c.r)}">✎</button></div>`;
}

function _lapisAbrir(ev, coluna) {
  if (ev) {
    // clique em link, no copiar ou noutro botão da linha não é "editar"
    const alvo = ev.target.closest('a,button');
    if (alvo && !alvo.classList.contains('lapis-campo')) return;
    if (ev.target.closest('a')) return;
  }
  if (typeof leadTravado === 'function' && leadTravado()) {
    alerta('Lead encerrado — use o Destravar para corrigir.'); return;
  }
  const c = DEF.campos.find(x => x.c === coluna);
  const v = lapisLinha(coluna);
  if (!c || !v || v.classList.contains('editando')) return;
  // o lápis espelha a permissão, como a tecla E espelha o botão Editar:
  // se o aplicarPermissoes o escondeu, o clique na linha não faz nada
  const lap = v.querySelector('.lapis-campo');
  if (!lap || lap.offsetParent === null) return;
  if (lapisColuna) lapisCancelar();          // um de cada vez

  // a janela de sempre monta o campo (valor atual, máscara, lista com o
  // valor fora dela, lookup, fuso) — e fica invisível
  ajustarEtapasDaFicha();
  ajustarSubtiposDaFicha();
  ajustarEtapasDoCaso();
  abrirModal(Object.assign({}, DEF, { campos: [c] }), 'Editar — ' + c.r, registro, {},
    async () => {
      const { data } = await sb.from(DEF.tabela).select('*').eq('id', ID).single();
      if (data) registro = data;
      desenharFicha();
      lapisPiscar(coluna);
    });
  document.getElementById('modal').classList.add('modal-invisivel');

  const campoJanela = document.querySelector('#modal-campos .campo');
  if (!campoJanela) { lapisCancelar(); return; }

  lapisColuna = coluna;
  lapisHtmlAntes = v.innerHTML;
  v.classList.add('editando');
  v.classList.remove('editavel');
  v.innerHTML = '';
  v.appendChild(campoJanela);               // o campo REAL da janela, na linha
  v.insertAdjacentHTML('beforeend',
    '<button type="button" class="ed-ok" title="Salvar (Enter)"'
    + ' onclick="event.stopPropagation();lapisSalvar()">✓</button>'
    + '<button type="button" class="ed-nao" title="Cancelar (Esc)"'
    + ' onclick="event.stopPropagation();lapisCancelar()">✕</button>'
    + '<small class="lapis-erro" style="display:none"></small>');

  const inp = v.querySelector('input,select,textarea');
  if (inp) {
    inp.focus();
    if (inp.select) { try { inp.select(); } catch (e) { /* select sem select() */ } }
    inp.addEventListener('keydown', e => {
      const ehArea = inp.tagName === 'TEXTAREA';
      if (e.key === 'Enter' && (!ehArea || e.ctrlKey || e.metaKey)) {
        e.preventDefault(); lapisSalvar();
      }
      if (e.key === 'Escape') { e.stopPropagation(); lapisCancelar(); }
    });
  }
}

async function _lapisSalvar() {
  if (!lapisColuna) return;
  const v = lapisLinha(lapisColuna);
  const err = v && v.querySelector('.lapis-erro');
  if (err) err.style.display = 'none';
  await salvarModal();
  const modal = document.getElementById('modal');
  if (modal.classList.contains('aberto')) {
    // barrado (obrigatório, trava de negócio, aviso de confirmação): a
    // mensagem da janela aparece na linha; ✓ de novo confirma o aviso,
    // como o segundo clique em Salvar faria
    const msg = document.getElementById('modal-erro').textContent;
    if (err) { err.textContent = msg; err.style.display = 'block'; }
  } else {
    // salvou: o `depois` já repintou a ficha inteira e piscou o campo
    modal.classList.remove('modal-invisivel');
    lapisColuna = null; lapisHtmlAntes = '';
  }
}

function lapisCancelar() {
  const v = lapisColuna ? lapisLinha(lapisColuna) : null;
  if (v) {
    v.innerHTML = lapisHtmlAntes;
    v.classList.remove('editando');
    v.classList.add('editavel');
  }
  lapisColuna = null; lapisHtmlAntes = '';
  const modal = document.getElementById('modal');
  if (modal) { modal.classList.remove('modal-invisivel'); fecharModal(); }
}

function lapisPiscar(coluna) {
  const v = lapisLinha(coluna);
  if (!v) return;
  v.classList.add('salvo');
  setTimeout(() => v.classList.remove('salvo'), 1300);
}

window.lapisAbrir = protegida(_lapisAbrir, 'Não foi possível abrir a edição do campo');
window.lapisSalvar = protegida(_lapisSalvar, 'Não foi possível salvar o campo');

function chipsDoRegistro() {
  const val = valoresDosChips();
  const cat = (typeof CHIPS_FICHA !== 'undefined' && CHIPS_FICHA[ALVO]) || [];
  // sem catálogo (arquivo antigo em cache) a faixa não pode sumir:
  // mostra o que houver, na ordem em que veio
  if (!cat.length) return Object.keys(val).map(k => [k, val[k]]);

  // v1.189 — a escolha do layout manda; quem nunca escolheu vê o de
  // fábrica. Ids desconhecidos são ignorados: se um indicador for
  // aposentado, o layout salvo não quebra a faixa inteira.
  const salvo = (typeof LAY !== 'undefined' && Array.isArray(LAY.chips) && LAY.chips.length)
    ? LAY.chips.filter(id => cat.some(c => c.id === id)) : null;
  const ids = salvo && salvo.length ? salvo : cat.filter(c => c.padrao).map(c => c.id);

  return ids.map(id => {
    const c = cat.find(x => x.id === id);
    const v = val[id];
    // v1.270 — o valor pode vir como objeto { v, d, cor }: é como os
    // indicadores da faixa "agora" do contrato trazem a linha de
    // detalhe e a cor de estado. String continua valendo como sempre.
    if (v && typeof v === 'object')
      return [c.r, v.v || '—', v.d || '', v.cor || ''];
    return [c.r, (v === null || v === undefined || v === '') ? '—' : String(v)];
  });
}

/** v1.270 — o HTML da faixa de chips, num lugar só: o desenho inicial e
 *  o redesenho do recarregarTarefas usavam dois templates gêmeos, e o
 *  chip com detalhe/cor só existiria num deles. */
function htmlDosChips() {
  return chipsDoRegistro().map(e => {
    const r = e[0], v = e[1], d = e[2], cor = e[3];
    return `<div class="chip${cor ? ' ' + cor : ''}"><span class="r">${htm(r)}</span><span class="v">${htm(v)}</span>${
      d ? `<span class="d">${htm(d)}</span>` : ''}</div>`;
  }).join('');
}

/** Os valores da faixa, por identificador. Antes isto e os rótulos
 *  eram a mesma lista; os rótulos foram para o CHIPS_FICHA, no
 *  ficha-defs.js, porque a Administração também precisa deles. */
function valoresDosChips() {
  const abertas = tarefasFicha.filter(t => t.status === 'Aberta').length;
  const ligacoes = tarefasFicha.filter(t => t.tipo === 'Ligação' && t.concluida_em)
    .map(t => t.concluida_em).sort();
  const ultima = ligacoes.length ? dataBr(ligacoes[ligacoes.length - 1].slice(0, 10)) : '—';
  const dias = v => (v === null || v === undefined) ? '—' : v + ' dias';
  // v1.305 — o quanto falta, na unidade em que se pensa contrato.
  // Curto continua em dias: "(12d)" é melhor que "0 meses e 12 dias".
  const emParenteses = v => v == null ? ''
    : ' (' + ((typeof prazoEmMeses === 'function' && prazoEmMeses(v)) || (v + 'd')) + ')';

  // v1.284 — a ficha recebida. Nenhum destes é digitado: vêm do
  // formulário ou do palpite calculado na fichas_painel.
  if (ALVO === 'ficha') return {
    tipo: registro.tipo || '—',
    whatsapp: registro.whatsapp || '—',
    email: registro.email || '—',
    vinculo: registro.vinculo || '—',
    dias_esperando: registro.dias_esperando == null ? '—' : dias(registro.dias_esperando),
    parceiro_nome: registro.parceiro_nome || '—',
    cpf_cnpj: registro.cpf_cnpj || '—',
    valor_aluguel: registro.valor_aluguel ? moeda(registro.valor_aluguel) : '—',
    renda: registro.renda ? moeda(registro.renda) : '—',
    aceite_lgpd_em: registro.aceite_lgpd_em ? dataHoraBr(registro.aceite_lgpd_em) : '—'
  };
  if (ALVO === 'caso') return {
    imovel: calculados.imovel_endereco || registro.imovel_texto || '—',
    prestador: calculados.prestador_nome || registro.prestador_texto || '—',
    valor_aprovado: registro.valor_aprovado ? moeda(registro.valor_aprovado) : '—',
    pagamento: registro.status_pagamento || '—',
    aberto_ha: dias(calculados.dias_aberto),
    atraso: calculados.dias_atraso ? calculados.dias_atraso + ' dias' : '—',
    tarefas_abertas: String(abertas),
    tipo: registro.tipo || '—',
    prioridade: registro.prioridade || '—',
    solicitante: nomePessoa(registro.solicitante_id) || '—'
  };
  // v1.241 — a faixa do plano é toda soma das ações; a da ação é toda
  // leitura do prazo. Nenhum destes números existe como campo digitável.
  if (ALVO === 'plano') return {
    andamento: (registro.percentual == null ? 0 : Math.round(registro.percentual)) + '%',
    acoes: (registro.acoes_feitas || 0) + ' de ' + (registro.qtd_acoes || 0) + ' feitas',
    atrasadas: String(registro.acoes_atrasadas || 0),
    prazo: registro.prazo
      ? dataBr(registro.prazo) + (registro.dias_para_prazo == null ? ''
          : (registro.dias_para_prazo < 0
              ? ' · venceu há ' + Math.abs(registro.dias_para_prazo) + 'd'
              : ' · faltam ' + registro.dias_para_prazo + 'd'))
      : '—',
    custo_previsto: moeda(registro.custo_previsto || 0),
    custo_realizado: moeda(registro.custo_realizado || 0),
    tarefas_abertas: String(abertas),
    area: registro.area || '—',
    dono: registro.responsavel_email || '—',
    prioridade: registro.prioridade || '—',
    proximo_prazo: registro.proximo_prazo ? dataBr(registro.proximo_prazo) : '—'
  };
  if (ALVO === 'acao') return {
    prazo: registro.prazo ? dataBr(registro.prazo) : '—',
    atraso: registro.dias_atraso ? registro.dias_atraso + ' dias' : '—',
    quem: registro.responsavel_email || '—',
    onde: registro.onde || '—',
    previsto: moeda(registro.custo_previsto || 0),
    gasto: moeda(registro.custo_realizado || 0),
    tarefas_abertas: String(abertas),
    plano: registro.plano_titulo || '—',
    prioridade: registro.prioridade || '—',
    inicio: registro.inicio ? dataBr(registro.inicio) : '—'
  };
  if (ALVO === 'lead') return {
    telefone: mascaraTelefone(registro.telefone) || '—',
    procura_ate: registro.aluguel_max ? moeda(registro.aluguel_max) : '—',
    temperatura: calculados.temperatura || '—',
    sem_contato_ha: dias(calculados.dias_sem_contato),
    ultimo_contato: calculados.ultimo_contato
      ? dataBr(String(calculados.ultimo_contato).slice(0, 10)) : ultima,
    tarefas_abertas: String(abertas),
    origem: registro.origem || '—',
    quartos_min: registro.quartos_min == null ? '—' : String(registro.quartos_min),
    bairros: registro.bairros_desejados || '—'
  };
  if (ALVO === 'sinistro') return {
    contrato: registro.contrato_codigo || '—',
    imovel: registro.imovel_endereco || '—',
    apolice: (registro.apolice_tipo || '—') +
      (registro.apolice_numero ? ' · ' + registro.apolice_numero : ''),
    proximo_prazo: registro.proximo_prazo
      ? dataBr(registro.proximo_prazo) + emParenteses(registro.dias_para_o_proximo_prazo) : '—',
    bola_com: registro.aguardando || '—',
    a_receber: registro.saldo_a_receber ? moeda(registro.saldo_a_receber) : '—',
    tarefas_abertas: String(abertas),
    protocolo: registro.protocolo || '—',
    data_fato: registro.data_fato ? dataBr(registro.data_fato) : '—'
  };
  if (ALVO === 'contrato') return {
    // v1.270 — os dois indicadores da faixa "agora". São contas sobre
    // mesesContrato, que a ficha do contrato já carrega antes de
    // desenhar — nenhuma consulta a mais.
    parcela_mes: (() => {
      const m7 = hojeISO().slice(0, 7);
      const p = (mesesContrato || []).find(x =>
        String(x.competencia || '').slice(0, 7) === m7 && x.etapa !== 'Cancelada');
      if (!p) return { v: '—', d: 'nenhuma parcela neste mês' };
      if (p.recebido_em) return {
        v: (p.etapa === 'Repassada' ? 'Repassada ✓' : 'Paga ✓'),
        d: moeda(p.valor_recebido != null ? p.valor_recebido : p.valor_total)
           + ' em ' + dataBr(p.recebido_em), cor: 'ok' };
      if (['Aberta', 'Cobrada'].includes(p.etapa) && p.vencimento && p.vencimento < hojeISO())
        return { v: 'Em atraso', cor: 'late',
          d: 'venceu ' + dataBr(p.vencimento) + ' · ' + moeda(p.valor_total) };
      return { v: (p.vencimento ? dataBr(p.vencimento) + ' · ' : '') + moeda(p.valor_total),
        d: p.etapa };
    })(),
    proximo_boleto: (() => {
      const hoje = hojeISO();
      const p = (mesesContrato || [])
        .filter(x => x.etapa !== 'Cancelada' && !x.recebido_em
          && x.vencimento && x.vencimento >= hoje)
        .sort((a, b) => String(a.vencimento).localeCompare(String(b.vencimento)))[0];
      return p
        ? { v: dataBr(p.vencimento) + ' · ' + moeda(p.valor_total),
            d: p.etapa === 'Prevista' ? 'previsão — abre sozinho na vez dele' : p.etapa }
        : { v: '—', d: 'nenhuma parcela à frente' };
    })(),
    inquilino: registro.inquilino_nome || '—',
    // a taxa que VALE: a do contrato quando preenchida; senão, a do imóvel
    taxa_adm: (() => {
      const pct = registro.taxa_adm_percentual, fixo = registro.taxa_adm_valor;
      if (pct != null) return (pct * 100).toLocaleString('pt-BR',
        { maximumFractionDigits: 2 }) + '% (deste contrato)';
      if (fixo != null) return moeda(fixo) + ' (deste contrato)';
      const i = imovelDoContrato;
      if (i && i.taxa_adm_percentual != null) return (i.taxa_adm_percentual * 100)
        .toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '% (do imóvel)';
      if (i && i.taxa_adm_valor != null) return moeda(i.taxa_adm_valor) + ' (do imóvel)';
      return '—';
    })(),
    aluguel: moeda(registro.valor_aluguel),
    vence_dia: registro.dia_vencimento ? String(registro.dia_vencimento) : '—',
    proximo_reajuste: registro.proximo_reajuste
      ? dataBr(registro.proximo_reajuste) + emParenteses(registro.dias_para_reajuste) : '—',
    renovar_seguro: registro.proxima_renovacao
      ? dataBr(registro.proxima_renovacao) + emParenteses(registro.dias_para_renovar_seguro) : '—',
    seguro_mes: registro.seguro_mensal ? moeda(registro.seguro_mensal) : '—',
    tarefas_abertas: String(abertas),
    proprietario: registro.proprietario_nome || nomePessoa(registro.proprietario_id) || '—',
    imovel: registro.imovel_endereco || '—',
    inicio: registro.data_inicio ? dataBr(registro.data_inicio) : '—',
    fim_previsto: registro.data_fim_prevista ? dataBr(registro.data_fim_prevista) : '—'
  };
  if (ALVO === 'contato') return {
    telefone: mascaraTelefone(registro.telefone) || '—',
    email: registro.email || '—',
    imoveis: String(relacionados.length),
    ultimo_contato: ultima,
    tarefas_abertas: String(abertas),
    tipo_principal: registro.tipo_principal || '—',
    cpf_cnpj: mascaraDoc(registro.cpf_cnpj) || '—',
    cidade: registro.cidade || '—',
    bairro: registro.bairro || '—',
    aniversario: registro.aniversario ? dataBr(registro.aniversario) : '—',
    banco_pix: registro.banco_pix || '—'
  };
  if (ALVO === 'competencia') return {
    // v1.272 — os quatro indicadores da faixa "agora" da parcela
    boleto_mes: (() => {
      const r = registro, n = v => Number(v) || 0;
      if (r.recebido_em) return { v: moeda(r.valor_recebido != null ? r.valor_recebido : r.valor_total) + ' ✓',
        cor: 'ok', d: 'recebido em ' + dataBr(r.recebido_em)
          + (r.vencimento ? ' · venceu ' + dataBr(r.vencimento) : '') };
      if (['Aberta', 'Cobrada'].includes(r.etapa) && r.vencimento && r.vencimento < hojeISO())
        return { v: moeda(r.valor_total) + ' em atraso', cor: 'late',
          d: 'venceu ' + dataBr(r.vencimento) + ((n(r.multa_hoje) || n(r.juros_hoje))
            ? ' · cobrando hoje ' + moeda(n(r.valor_total) + n(r.multa_hoje) + n(r.juros_hoje)) : '') };
      return { v: moeda(r.valor_total),
        d: (r.vencimento ? 'vence ' + dataBr(r.vencimento) + ' · ' : '') + (r.etapa || '') };
    })(),
    repasse_mes: (() => {
      const r = registro;
      if (r.repassado_em) return { v: moeda(r.valor_repassado != null ? r.valor_repassado : r.repasse_liquido) + ' ✓',
        cor: 'ok', d: 'feito em ' + dataBr(r.repassado_em) };
      if (r.recebido_em) return { v: moeda(r.repasse_liquido),
        d: 'pendente — o boleto já foi recebido' };
      return { v: moeda(r.repasse_liquido), d: 'sai depois do recebimento' };
    })(),
    morali_mes: {
      v: moeda(registro.taxa_adm),
      d: 'Taxa Mensal · congelada na geração'
        + (registro.primeiro_mes && !(Number(registro.repasse_bruto) || 0)
            ? ' · + o aluguel do 1º mês' : '') },
    juros_multa: (() => {
      const r = registro, n = v => Number(v) || 0;
      const pago = n(r.juros) + n(r.multa);
      if (pago) return { v: moeda(pago), d: 'entraram no boleto por atraso' };
      if (n(r.multa_hoje) || n(r.juros_hoje)) return {
        v: moeda(n(r.multa_hoje) + n(r.juros_hoje)), cor: 'late',
        d: 'entrariam se pagasse hoje' };
      return { v: moeda(0), d: r.recebido_em && r.vencimento && r.recebido_em > r.vencimento
        ? 'pago após o vencimento, sem cobrança' : 'sem atraso' };
    })(),
    vencimento: registro.vencimento ? dataBr(registro.vencimento) : '—',
    valor_total: registro.valor_total != null ? moeda(registro.valor_total) : '—',
    recebido_em: registro.recebido_em ? dataBr(registro.recebido_em) : '—',
    inquilino: registro.inquilino_nome || '—',
    imovel: registro.imovel_endereco || '—',
    proprietario: registro.proprietario_nome || '—',
    etapa: registro.etapa || '—',
    atraso: registro.dias_de_atraso ? registro.dias_de_atraso + ' dias' : '—',
    liquido: registro.repasse_liquido != null ? moeda(registro.repasse_liquido) : '—',
    tarefas_abertas: String(abertas)
  };
  return {
    situacao: registro.situacao || '—',
    aluguel: moeda(registro.valor_aluguel),
    proprietario: nomePessoa(registro.proprietario_id) || '—',
    inquilino: nomePessoa(registro.inquilino_id) || '—',
    tarefas_abertas: String(abertas),
    tipo: registro.tipo || '—',
    bairro: registro.bairro || '—',
    cidade: registro.cidade || '—',
    cep: mascaraCep(registro.cep) || '—',
    quartos: registro.num_quartos == null ? '—' : String(registro.num_quartos),
    categoria: registro.categoria || '—',
    disponivel_desde: registro.disponivel_desde ? dataBr(registro.disponivel_desde) : '—'
  };
}

const ETAPAS_CASO = ['Aberto', 'Orçamento', 'Aprovado', 'Em execução', 'Concluído'];

// M20 — A VISTORIA NÃO PASSA POR ORÇAMENTO.
// O preço é negociado antes, direto com o vistoriador. Deixar as etapas
// 'Orçamento' e 'Aprovado' no caminho faria toda vistoria ficar parada
// pedindo aprovação de um valor que já estava fechado — e o botão verde
// diria "marcar como orçamento" numa coisa que já foi feita.
// v1.155 — as paradas da vistoria depois do fluxo de agenda.
// 'Aberto' continua na frente porque as 14 vistorias importadas estão
// nele: tirar a primeira parada esconderia onde elas estão.
// 'Reagendar' e 'Recusada' NÃO entram — são desvios, não paradas, e
// quem cuida deles é o cartão de agenda logo abaixo da trilha.
const ETAPAS_VISTORIA = ['Aberto', 'A confirmar', 'Agendada', 'Em execução', 'Concluído'];
const DESVIOS_VISTORIA = { 'Reagendar': 'A confirmar', 'Recusada': 'A confirmar' };

// v1.154 — MAS NEM SEMPRE O PREÇO VEM ANTES.
// O Davi informa o valor da vistoria DEPOIS de fazer, pelo app, e o
// `prestador_enviar_proposta` põe o caso na etapa 'Orçamento' — que não
// existe no caminho curto. O resultado era a trilha inteira apagada e o
// botão verde dizendo "marcar como aberto", andando para trás.
//
// A regra passa a ser o próprio estado do caso: enquanto ele estiver
// numa das três paradas curtas, o caminho é curto; se entrou em
// 'Orçamento' ou 'Aprovado', é porque houve orçamento, e aí vale o
// caminho longo. Nada a configurar — a vistoria sem orçamento continua
// exatamente como era.
function etapasDoCaso() {
  if (!registro || registro.tipo !== 'Vistoria') return ETAPAS_CASO;
  const st = registro.status;
  return (ETAPAS_VISTORIA.indexOf(st) >= 0 || DESVIOS_VISTORIA[st])
    ? ETAPAS_VISTORIA : ETAPAS_CASO;
}

/**
 * (Caso, v1.155) Põe no select de etapa só as etapas daquele tipo.
 * Mesma regra do subtipo e do funil do lead: a etapa ATUAL entra mesmo
 * se não pertencer à lista, senão abrir a janela troca o valor sozinha.
 */
function ajustarEtapasDoCaso() {
  if (ALVO !== 'caso' || !registro) return;
  const c = ((DEFS.caso.campos) || []).find(x => x.c === 'status');
  if (!c) return;
  const base = registro.tipo === 'Vistoria'
    ? ETAPAS_VISTORIA.concat(['Reagendar', 'Recusada', 'Cancelado'])
    : ETAPAS_CASO.concat(['Cancelado']);
  c.op = base.indexOf(registro.status) >= 0 || !registro.status
    ? base : [registro.status].concat(base);
}

/** v1.183 — QUEM DEU A BAIXA.
 *  Uma parcela que vira "Recebida" tem sempre um responsável: ou a
 *  integração do Asaas, ou a pessoa que clicou. Até aqui os dois
 *  ficavam iguais na tela e, no histórico, os dois assinavam
 *  "Sistema". Quem carimba é o gatilho do banco (migração v1183) —
 *  a tela apenas lê, e por isso o carimbo não pode ser forjado daqui.
 *
 *  O comprovante é o link que o Asaas devolve no webhook: estava
 *  guardado desde a baixa automática e não aparecia em lugar nenhum. */
function faixaDaBaixa() {
  if (!registro || !registro.baixa_origem) return '';
  const doAsaas = registro.baixa_origem === ASAAS_ORIGEM;
  const quando = dataHoraBr(registro.baixa_em);
  const link = urlSegura(registro.asaas_comprovante);
  return `<div class="baixa-selo${doAsaas ? '' : ' manual'}">
    <span class="ic">${doAsaas ? icone('raio', 14) : icone('check', 14)}</span>
    <span>Baixa <b>${doAsaas
      ? 'automática pela integração do Asaas'
      : 'manual por ' + htm(registro.baixa_origem)}</b>${quando ? ' em ' + quando : ''}${
      doAsaas && link
        ? ` · <a href="${htm(link)}" target="_blank" rel="noopener">ver comprovante</a>` : ''}</span>
  </div>`;
}

function subtituloDoRegistro() {
  // v1.284 — a ficha recebida. O subtítulo responde as três perguntas
  // que se faz ao abrir: de que tipo é, quando chegou e quem indicou.
  // O vínculo com o CRM vem em seguida, porque é o que decide se a
  // pessoa aprova agora ou vai conferir antes.
  if (ALVO === 'ficha') {
    const cores = { 'Nova': 'tag-azul', 'Em análise': 'tag-amarela',
      'Aprovada': 'tag-verde', 'Recusada': 'tag-cinza', 'Perdido': 'tag-cinza' };
    const vinc = registro.contato_id
      ? ` · <a href="contato.html?id=${registro.contato_id}">${
          htm(registro.contato_codigo || '')} ${htm(registro.contato_nome || '')}</a>`
      : (registro.candidatos > 1
          ? ` · <b style="color:var(--erro)">${registro.candidatos} candidatos</b>`
          : (registro.candidato_codigo
              ? ` · provável ${htm(registro.candidato_codigo)} (${htm(registro.candidato_como || '')})`
              : ' · <b style="color:var(--alerta)">sem correspondência</b>'));
    return `${htm(registro.codigo || '')} · ${htm(registro.tipo || '')}
      ${registro.criado_em ? ' · recebida em ' + dataHoraBr(registro.criado_em) : ''}
      ${registro.parceiro_id
        ? ` · indicado por <a href="contato.html?id=${registro.parceiro_id}">${
            htm(registro.parceiro_codigo || '')}</a>` : ''}
      ${vinc}
      <span class="tag ${cores[registro.status] || 'tag-cinza'}">${htm(registro.status || '—')}</span>
      ${registro.dias_esperando > 2
        ? `<span class="tag tag-amarela">${registro.dias_esperando} dias esperando</span>` : ''}`;
  }
  // v1.241 — plano e ação
  if (ALVO === 'plano') {
    const cores = { 'Rascunho': 'tag-cinza', 'Em andamento': 'tag-azul',
      'Pausado': 'tag-amarela', 'Concluído': 'tag-verde', 'Cancelado': 'tag-cinza' };
    return `${htm(registro.codigo || '')}${registro.area ? ' · ' + htm(registro.area) : ''}
      ${registro.responsavel_email ? ' · dono ' + htm(registro.responsavel_email) : ''}
      ${registro.data_inicio ? ' · de ' + dataBr(registro.data_inicio) : ''}${
        registro.prazo ? ' a ' + dataBr(registro.prazo) : ''}
      <span class="tag ${cores[registro.status] || 'tag-cinza'}">${htm(registro.status || '—')}</span>
      ${registro.atencao ? `<span class="tag tag-vermelha">${htm(registro.atencao)}</span>` : ''}`;
  }
  if (ALVO === 'acao') {
    const cores = { 'A fazer': 'tag-cinza', 'Fazendo': 'tag-azul', 'Parada': 'tag-amarela',
      'Feita': 'tag-verde', 'Cancelada': 'tag-cinza' };
    const farol = { 'Atrasada': 'tag-vermelha', 'Vence hoje': 'tag-vermelha',
      'Vence em breve': 'tag-amarela', 'Em dia': 'tag-azul', 'Feita': 'tag-verde',
      'Cancelada': 'tag-cinza' };
    return `${htm(registro.codigo || '')}
      ${registro.plano_id
        ? ` · plano <a href="plano.html?id=${registro.plano_id}">${
            htm(registro.plano_codigo || '')} ${htm(registro.plano_titulo || '')}</a>`
        : ' · ação avulsa'}
      ${registro.responsavel_email ? ' · ' + htm(registro.responsavel_email) : ''}
      <span class="tag ${cores[registro.situacao] || 'tag-cinza'}">${htm(registro.situacao || '—')}</span>
      ${registro.farol && registro.farol !== registro.situacao
        ? `<span class="tag ${farol[registro.farol] || 'tag-cinza'}">${htm(registro.farol)}</span>` : ''}`;
  }
  if (ALVO === 'caso') {
    const cores = { 'Aberto': 'tag-azul', 'Orçamento': 'tag-amarela', 'Aprovado': 'tag-azul',
      'Em execução': 'tag-amarela', 'Concluído': 'tag-verde', 'Cancelado': 'tag-cinza' };
    const cp = { 'A pagar': 'tag-vermelha', 'Pago': 'tag-verde',
  // v1.151b — azul, não verde: o serviço foi pago, mas não por nós.
  'Pago por terceiro': 'tag-azul',
  // v1.151c — garantia/retrabalho: executado e sem conta.
  'Sem cobrança': 'tag-cinza', 'Cancelado': 'tag-cinza' };
    return `${htm(registro.tipo)}${registro.subtipo ? ' · ' + htm(registro.subtipo) : ''} ·
      ${htm(registro.codigo || '')} · aberto em ${dataBr(String(registro.aberto_em || '').slice(0, 10))}
      <span class="tag ${cores[registro.status] || 'tag-cinza'}">${htm(registro.status)}</span>
      <span class="tag ${cp[registro.status_pagamento] || 'tag-cinza'}">${htm(registro.status_pagamento)}</span>`;
  }
  if (ALVO === 'lead') {
    const cores = { 'Novo': 'tag-azul', 'Em atendimento': 'tag-azul', 'Visita agendada': 'tag-amarela',
      'Proposta': 'tag-amarela', 'Convertido': 'tag-verde', 'Perdido': 'tag-cinza' };
    return `${htm(registro.tipo_lead || 'Lead')} · ${htm(registro.codigo || '')} ·
      ${htm(registro.origem || '')}
      <span class="tag ${cores[registro.status] || 'tag-cinza'}">${htm(registro.status || '—')}</span>
      ${registro.motivo_perda ? `<span class="tag tag-cinza">${htm(registro.motivo_perda)}</span>` : ''}
      ${registro.contato_id
        ? `<a href="contato.html?id=${registro.contato_id}">ver contato</a>` : ''}`;
  }
  if (ALVO === 'sinistro') {
    const cores = { 'Aberto': 'tag-azul', 'Em análise': 'tag-azul', 'Exigência': 'tag-amarela',
      'Deferido': 'tag-verde', 'Pago': 'tag-verde', 'Indeferido': 'tag-vermelha',
      'Cancelado': 'tag-cinza' };
    return `${htm(registro.seguradora || 'seguradora não informada')}
      ${registro.protocolo ? ' · protocolo ' + htm(registro.protocolo) : ''}
      ${registro.data_fato ? ' · fato em ' + dataBr(registro.data_fato) : ''}
      <span class="tag ${cores[registro.status] || 'tag-cinza'}">${htm(registro.status)}</span>
      ${registro.alerta ? `<span class="tag tag-vermelha">${htm(registro.alerta)}</span>` : ''}
      ${registro.contrato_id ? `<a href="contrato.html?id=${registro.contrato_id}">ver contrato</a>` : ''}`;
  }
  if (ALVO === 'contrato') {
    const cores = { 'Ativo': 'tag-verde', 'Aviso Prévio': 'tag-amarela',
      'Seguro Acionado': 'tag-vermelha', 'Encerrado': 'tag-cinza' };
    // v1.448 — as datas SAÍRAM do subtítulo: início, mês N de M e fim
    // agora vivem em letra grande na linha da vida (faixaVidaContrato),
    // logo abaixo do quem-é-quem. Era a reclamação: "difícil achar
    // quando o contrato começou". Aqui fica só quem é e como está.
    return `${htm(registro.codigo || '')} · ${htm(registro.inquilino_nome || 'sem inquilino')}
      <span class="tag ${cores[registro.status] || 'tag-cinza'}">${htm(registro.status || '—')}</span>
      ${registro.alerta ? `<span class="tag tag-vermelha">${htm(registro.alerta)}</span>` : ''}
      ${registro.imovel_id ? `<a href="imovel.html?id=${registro.imovel_id}">ver imóvel</a>` : ''}`;
  }
  if (ALVO === 'contato') {
    const tagCor = registro.status === 'Ativo' ? 'tag-verde' : 'tag-cinza';
    return `${htm(registro.tipo_principal || 'Contato')} · ${htm(registro.codigo || '')}
      <span class="tag ${tagCor}">${htm(registro.status || '—')}</span>`;
  }
  // v1.182 — a parcela tem subtítulo próprio: "Aluguel · CMP-x" (antes
  // caía no padrão do imóvel e saía "Imóvel · CMP-x", que confundia)
  if (ALVO === 'competencia') {
    const cores = { 'Prevista': 'tag-cinza', 'Aberta': 'tag-azul', 'Cobrada': 'tag-azul',
      'Recebida': 'tag-verde', 'Liberada': 'tag-verde', 'Repassada': 'tag-verde',
      'Cancelada': 'tag-cinza' };
    // v1.272 — a parcela N de M, o primeiro mês e os dados do imóvel
    // (que antes só existiam no cartão "Imóvel") sobem para cá
    const im = relacionados.find(x => x.papel === 'Imóvel') || null;
    const doImovel = im ? [im.bairro, im.cidade, im.tipo, im.codigo]
      .filter(Boolean).map(htm).join(' · ') : '';
    return `<span class="tag ${cores[registro.etapa] || 'tag-cinza'}">${htm(registro.etapa || '—')}</span>
      Aluguel · ${htm(registro.codigo || '')}${
        registro.parcela ? ` · parcela <b>${htm(String(registro.parcela))} de ${
          htm(String(registro.parcelas_total || '?'))}</b>` : ''}${
        registro.primeiro_mes ? ' · primeiro mês do contrato' : ''}${
        doImovel ? ' · ' + doImovel : ''}${
        im ? ` · <a href="imovel.html?id=${im.id}">ver imóvel</a>` : ''}`;
  }
  const cores = { 'Disponível': 'tag-azul', 'Alugada': 'tag-verde', 'Em reforma': 'tag-amarela',
    'Vendida': 'tag-cinza', 'Perdida p/ concorrente': 'tag-vermelha', 'Encerrada': 'tag-cinza' };
  return `${htm(registro.bairro || 'Imóvel')} · ${htm(registro.codigo || '')}
    <span class="tag ${cores[registro.situacao] || 'tag-cinza'}">${htm(registro.situacao || '—')}</span>`;
}

// ============================================================
// FICHA DO CONTRATO (v1.107) — apólices, sinistros e reajustes
// ============================================================

async function carregarAndamentos() {
  andamentosFicha = {};
  if (!sinistrosFicha.length) return;
  const { data } = await sb.from('sinistro_andamentos').select('*')
    .in('sinistro_id', sinistrosFicha.map(s => s.id))
    .order('criado_em', { ascending: false });
  (data || []).forEach(a => {
    (andamentosFicha[a.sinistro_id] = andamentosFicha[a.sinistro_id] || []).push(a);
  });
}

const COR_APOLICE = { 'Vigente': 'tag-verde', 'A renovar': 'tag-amarela',
  'Renovada': 'tag-cinza', 'Cancelada': 'tag-cinza', 'Encerrada': 'tag-cinza' };
const COR_SINISTRO = { 'Aberto': 'tag-azul', 'Em análise': 'tag-azul',
  'Exigência': 'tag-amarela', 'Deferido': 'tag-verde', 'Pago': 'tag-verde',
  'Indeferido': 'tag-vermelha', 'Cancelado': 'tag-cinza' };

/** As apólices do contrato — o cartão "relacionados" da ficha. */
/**
 * O QUE ESTE CONTRATO DEIXA (v1.134).
 *
 * A planilha guarda a taxa numa aba e a comissão em outra, e ninguém
 * soma as duas para dizer quanto o contrato rende de fato. Este cartão
 * é essa soma — e ele existe porque registrar não é entender.
 *
 * A taxa efetiva vem PRONTA da view (`taxa_adm_efetiva`): a regra
 * "contrato, senão imóvel" mora no banco, numa função só. Refazer a
 * conta aqui seria a segunda resposta possível para a mesma pergunta.
 */
/**
 * OS DOIS LADOS DO MÊS, na mesma tela (v1.135).
 *
 * Na planilha isso são duas abas — Recebimentos e Repasse — com
 * numeração gêmea e colunas duplicadas. Aqui é um registro só, e a
 * conta fecha à vista: o que entra do inquilino, o que a Moralí retém,
 * o que sobra para o proprietário.
 */
// ============================================================
// v1.222 — ITENS DESTA PARCELA (mockup aprovado em 09/08/2026)
//
// Cada linha tem uma ORIGEM, e é isso que resolve a briga com o
// recálculo automático:
//
//  · "do contrato" — nasce de contrato_itens e se refaz sozinha
//    sempre que o contrato muda. É o que existia até aqui.
//  · "só neste mês" — digitada nesta parcela, não vem de lugar
//    nenhum e não toca nenhum outro mês.
//
// Mudar ou zerar uma linha do contrato SOLTA ela do contrato naquele
// mês (vira avulsa, guardando de qual item veio) — o ↺ devolve. Zerar
// grava R$ 0,00 em vez de sumir com a linha, de propósito: o extrato
// continua explicando o boleto para o inquilino.
//
// A trava não está aqui. `competencia_aceita_item()` no banco recusa
// escrita em parcela recebida ou repassada; a tela só não oferece o
// botão que o banco recusaria.
// ============================================================
function parcelaAceitaItem() {
  return ['Prevista', 'Aberta', 'Cobrada'].includes(registro.etapa)
      && !registro.recebido_em && !registro.repassado_em;
}

function blocoItensDaParcela() {
  const pode = parcelaAceitaItem();
  return `<div class="cartao">
    <h2>Itens desta parcela <span class="cnt">(${itensDaParcela.length})</span>
      <span class="dir" style="display:flex;gap:6px">
        <!-- v1.224: o demonstrativo é a versão imprimível DESTE cartão —
             por isso o botão mora aqui, e não na barra de etapas. Vale
             para qualquer parcela, inclusive as já repassadas: quem
             pergunta "por que veio esse valor?" pergunta depois. -->
        <a class="btn btn-claro" data-perm="competencias:ver"
           style="padding:5px 12px;font-size:12px"
           href="demonstrativo.html?id=${encodeURIComponent(ID)}"
           title="Folha com o timbre da Moralí para mandar ao inquilino"
           >${icone('documento', 13)} Demonstrativo</a>
        ${pode ? `<button class="btn btn-claro" data-perm="competencias:editar"
          style="padding:5px 12px;font-size:12px"
          onclick="acrescentarItemDaParcela()">+ Acrescentar só neste mês</button>` : ''}
      </span></h2>
    ${mioloItensDaParcela()}
  </div>`;
}

/** v1.446 — a parcela do seguro ao lado do nome no boleto ("11/12").
 *  Sai do contrato_itens de origem (mês de início + total de parcelas);
 *  só nos itens de seguro, que têm parcelas contadas (fiança 12, incêndio
 *  6). Aluguel e boleto são todo mês e ficam sem o marcador. */

function parcelaDoSeguro(it) {
  const nome = it.nome || '';
  if (!it.contrato_item_id || !/seguro|fian|inc[eê]nd/i.test(nome)) return '';
  const src = itensContratoMap[it.contrato_item_id];
  if (!src || !src.inicio_competencia) return '';
  // o total do incêndio vem salvo (6); o da fiança quase sempre vem vazio,
  // e aí vale a regra da casa: fiança 12, incêndio 6.
  const tot = Number(src.parcelas) || (/fian/i.test(nome) ? 12 : /inc[eê]nd/i.test(nome) ? 6 : 0);
  if (!tot) return '';
  const ini = mesISO(src.inicio_competencia), cur = mesISO(registro.competencia);
  if (!ini || !cur) return '';
  const [ay, am] = ini.split('-').map(Number);
  const [by, bm] = cur.split('-').map(Number);
  const r = numeroDaParcelaDoSeguro((by - ay) * 12 + (bm - am),
              tot, src.ciclo_meses, src.primeira_paga_fora);
  return r ? ` <span class="parc">${r.n}/${r.tot}</span>` : '';
}

/** v1.272 — o miolo do cartão de itens (tabela + soma + explicação),
 *  também usado pela janela "Itens do boleto" da parcela. */
function mioloItensDaParcela() {
  const pode = parcelaAceitaItem();
  const bt = (acao, rot, dica) => `<button class="btn btn-claro" data-perm="competencias:editar"
      style="padding:3px 9px;font-size:12px" title="${htm(dica)}"
      onclick="${acao}">${rot}</button>`;

  const linhas = itensDaParcela.map(it => {
    const soltaDoContrato = it.avulso && it.contrato_item_id;
    const origem = soltaDoContrato
      ? `<span class="ci-orig">do contrato</span>
         <span class="tag tag-amarela">alterado neste mês</span>`
      : (it.avulso ? '<span class="tag tag-azul">só neste mês</span>'
                   : '<span class="ci-orig">do contrato</span>');
    const v = Number(it.valor) || 0;
    const acoes = !pode ? '' : (
      it.avulso
        ? bt(`editarItemDaParcela('${jsq(it.id)}')`, '✎', 'Mudar o valor neste mês') +
          (soltaDoContrato
            ? bt(`religarItemDaParcela('${jsq(it.id)}')`, '↺', 'Voltar a seguir o contrato')
            : bt(`tirarItemDaParcela('${jsq(it.id)}')`, '✕', 'Tirar esta linha'))
        : bt(`editarItemDaParcela('${jsq(it.id)}')`, '✎', 'Mudar o valor só neste mês') +
          bt(`zerarItemDaParcela('${jsq(it.id)}')`, '✕', 'Não cobrar neste mês'));

    return `<tr>
      <td>${htm(it.nome)}${parcelaDoSeguro(it)}${v < 0 ? ' <span class="tag tag-verde">abate</span>' : ''}${
        it.observacao ? `<div class="ci-orig">${htm(it.observacao)}</div>` : ''}</td>
      <td>${origem}${it.veio_de_campo
        ? ' <span class="tag tag-amarela">veio do campo antigo</span>' : ''}</td>
      <td style="text-align:right;white-space:nowrap"${v === 0 ? ' class="ci-zero"' : ''}>${
        v < 0 ? '− ' + moeda(Math.abs(v)) : moeda(v)}</td>
      <td style="white-space:nowrap">${acoes}</td></tr>`;
  }).join('');

  const soma = itensDaParcela.reduce((a, it) => a + (Number(it.valor) || 0), 0);
  const aluguel = Number(registro.valor_aluguel) || 0;

  return `<div class="corpo" style="padding:0">
      <table class="mini">
        <tr><th>Item</th><th>De onde vem</th><th style="text-align:right">Valor</th><th></th></tr>
        <tr><td>Aluguel${registro.primeiro_mes
              ? ' <span class="ci-orig">· primeiro mês</span>' : ''}</td>
            <td><span class="ci-orig">do contrato</span></td>
            <td style="text-align:right"><b>${moeda(aluguel)}</b></td><td></td></tr>
        ${linhas || `<tr><td colspan="4" style="color:var(--texto-suave)">
           Nenhum item além do aluguel neste mês.</td></tr>`}
      </table>
      <div class="ci-soma">
        <span>Aluguel <b>${moeda(aluguel)}</b> + itens <b>${moeda(soma)}</b></span>
        <span>Boleto deste mês: <b style="font-size:16px">${moeda(aluguel + soma)}</b></span>
      </div>
    </div>
    <p style="font-size:12px;color:var(--texto-suave);margin:8px 14px 12px;line-height:1.6">
      Linha <b>do contrato</b> se refaz sozinha quando o contrato muda. Mudar ou tirar aqui
      <b>solta a linha do contrato só neste mês</b> — o ↺ devolve. Linha <b>só neste mês</b>
      é sua, não vem de lugar nenhum e não afeta os outros meses.${
      pode ? '' : ' <b>Esta parcela já foi recebida ou repassada e não aceita mudança.</b>'}</p>`;
}

/* v1.223 — OS LANÇAMENTOS QUE APARECEM SEMPRE.
 *
 * Campo livre parece liberdade e é o contrário: em três meses a mesma
 * água virou "Agua", "Água", "AGUA" e "água/esgoto", e aí nenhuma
 * pergunta do tipo "quanto cobrei de encargos este ano" tem resposta.
 * A lista junta os modelos cadastrados na Administração (os mesmos da
 * janela do contrato) com os avulsos que toda imobiliária lança. */
const AVULSOS_TIPICOS = [
  { nome: 'Água' },
  { nome: 'Energia' },
  { nome: 'IPTU' },
  { nome: 'Condomínio' },
  { nome: 'Conserto / manutenção' },
  { nome: 'Multa contratual' },
  { nome: 'Desconto acordado', credito: true },
  { nome: 'Devolução ao inquilino', credito: true }
];
const AVULSO_OUTRO = '✏️ Outro (digitar o nome)…';

async function _acrescentarItemDaParcela() {
  const modelos = itensPadrao.map(m => m.nome)
    .concat(AVULSOS_TIPICOS.map(m => m.nome))
    .concat([AVULSO_OUTRO]);
  abrirAcao(`Acrescentar item só em ${mesISO(registro.competencia).split('-').reverse().join('/')}`, [
    { n: 'modelo', r: 'Item', t: 'select', largo: true, op: modelos, v: modelos[0] },
    { n: 'nome', r: 'Nome do item', t: 'texto', largo: true, v: modelos[0] },
    { n: 'valor', r: 'Valor (R$)', t: 'moeda', v: '' },
    // v1.328 — em que conta do financeiro este item entra
    ...campoContaDoItem(null, modelos[0]),
    { n: 'sentido', r: 'Cobrar ou abater?', t: 'select',
      op: ['Cobrar do inquilino', 'Abater da cobrança'], v: 'Cobrar do inquilino' },
    { n: 'obs', r: 'Observação (opcional)', t: 'texto', largo: true, v: '',
      dica: 'qual conserto, de quando, combinado com quem' },
    { n: 'nota', t: 'aviso', r: 'Vale só nesta parcela. Para cobrar todo mês, ou por N meses, '
      + 'o lugar é "Itens da cobrança" na ficha do contrato.' }
  ], async () => {
    const nome = valorAcao('nome');
    erroSe(!nome, 'Dê um nome ao item.');
    // input type=number: o valor chega com PONTO decimal — Number() é a
    // leitura certa; numeroBr leria 58.82 como 5.882
    const valor = valorAcao('valor') === null ? null : Number(valorAcao('valor'));
    erroSe(!valor || !Number.isFinite(valor) || valor <= 0, 'Informe o valor do item.');
    // o mesmo nome duas vezes no mesmo mês quase sempre é engano —
    // mas às vezes são dois consertos mesmo, então pergunta, não barra
    const igual = itensDaParcela.find(x =>
      String(x.nome || '').trim().toLowerCase() === nome.trim().toLowerCase());
    erroSe(igual && !confirm(`Esta parcela já tem "${igual.nome}" de ${moeda(igual.valor)}.\n\n` +
      'Acrescentar assim mesmo?'), 'Nada foi acrescentado.');
    const sinal = valorAcao('sentido') === 'Abater da cobrança' ? -1 : 1;
    const { error } = await sb.from('competencia_itens').insert({
      empresa_id: registro.empresa_id, competencia_id: ID,
      contrato_item_id: null, nome, valor: sinal * valor, avulso: true,
      plano_conta: contaEscolhida(),   // v1.328 — null = o banco herda pelo mapa
      observacao: valorAcao('obs')
    });
    if (error) throw error;
  }, '+ Acrescentar');

  // o modelo escolhido preenche nome, valor e sentido
  const selMod = elementoAcao('modelo');
  if (selMod) selMod.onchange = () => {
    const v = selMod.value;
    const nomeEl = elementoAcao('nome');
    if (v === AVULSO_OUTRO) { nomeEl.value = ''; nomeEl.focus(); return; }
    nomeEl.value = v;
    const pad = itensPadrao.find(x => x.nome === v);
    if (pad && pad.valor != null) elementoAcao('valor').value = pad.valor;
    const tip = AVULSOS_TIPICOS.find(x => x.nome === v);
    elementoAcao('sentido').value = (tip && tip.credito)
      ? 'Abater da cobrança' : 'Cobrar do inquilino';
    apontarContaPeloNome(v);   // v1.328
  };
}

async function _editarItemDaParcela(id) {
  const it = itensDaParcela.find(x => x.id === id);
  if (!it) return;
  const v = Number(it.valor) || 0;
  abrirAcao(`Mudar "${it.nome}" só neste mês`, [
    { n: 'valor', r: 'Valor (R$)', t: 'moeda', v: Math.abs(v) },
    { n: 'sentido', r: 'Cobrar ou abater?', t: 'select',
      op: ['Cobrar do inquilino', 'Abater da cobrança'],
      v: v < 0 ? 'Abater da cobrança' : 'Cobrar do inquilino' },
    // v1.328 — a conta também se corrige por aqui
    ...campoContaDoItem(it.plano_conta, it.nome),
    { n: 'obs', r: 'Observação (opcional)', t: 'texto', largo: true,
      v: it.observacao || '', dica: 'qual conserto, de quando, combinado com quem' },
    { n: 'nota', t: 'aviso', r: it.contrato_item_id
      ? 'Isto solta a linha do contrato NESTE MÊS: ela para de acompanhar o contrato aqui, '
        + 'e os outros meses continuam como estão. O ↺ desfaz.'
      : 'Vale só nesta parcela.' }
  ], async () => {
    const novo = valorAcao('valor') === null ? null : Number(valorAcao('valor'));
    erroSe(novo === null || !Number.isFinite(novo) || novo < 0, 'Informe o valor.');
    const sinal = valorAcao('sentido') === 'Abater da cobrança' ? -1 : 1;
    const { error } = await sb.from('competencia_itens')
      .update({ valor: sinal * novo, avulso: true, observacao: valorAcao('obs'),
                plano_conta: contaEscolhida() || it.plano_conta })   // v1.328
      .eq('id', id);
    if (error) throw error;
  }, '✓ Salvar');
}

async function _zerarItemDaParcela(id) {
  const it = itensDaParcela.find(x => x.id === id);
  if (!it) return;
  if (!confirm(`Não cobrar "${it.nome}" neste mês?\n\n` +
      'A linha continua no extrato, valendo R$ 0,00 — assim dá para explicar o boleto ' +
      'depois. Os outros meses não mudam, e o ↺ desfaz.')) return;
  const { error } = await sb.from('competencia_itens')
    .update({ valor: 0, avulso: true }).eq('id', id);
  if (error) throw error;
  await carregarFicha();
}

async function _tirarItemDaParcela(id) {
  const it = itensDaParcela.find(x => x.id === id);
  if (!it) return;
  if (!confirm(`Tirar "${it.nome}" desta parcela?`)) return;
  const { error } = await sb.from('competencia_itens').delete().eq('id', id);
  if (error) throw error;
  await carregarFicha();
}

async function _religarItemDaParcela(id) {
  const it = itensDaParcela.find(x => x.id === id);
  if (!it) return;
  if (!confirm(`"${it.nome}" volta a seguir o contrato neste mês.\n\n` +
      'O valor passa a ser o do contrato de novo.')) return;
  const { error } = await sb.from('competencia_itens').delete().eq('id', id);
  if (error) throw error;
  // e o rebuild traz a linha do contrato de volta
  const { error: e2 } = await sb.rpc('atualizar_itens_da_competencia', { p_comp: ID });
  if (e2) throw e2;
  await carregarFicha();
}


/**
 * v1.231 — DESCONTOS DO REPASSE. Fase 3, mockup aprovado em 10/08/2026.
 *
 * Espelho do "Itens desta parcela", do outro lado da conta. Mesma
 * tabela, mesma janela, mesmas travas — com uma diferença que é de
 * fluxo, não de tela: aqui a fronteira é o REPASSE ter saído, não o
 * inquilino ter pago. O desconto do repasse entra justamente depois de
 * o inquilino pagar.
 *
 * O SINAL é o contrário do outro cartão, e por um motivo: `descontos`
 * SUBTRAI do repasse, enquanto `valor_itens` SOMA no boleto. Então aqui
 * positivo desconta e negativo acresce. Cada coluna mantém o
 * significado que sempre teve; quem traduz é a tela.
 */
function parcelaAceitaDesconto() {
  return registro.etapa !== 'Cancelada' && !registro.repassado_em;
}

function blocoDescontosDoRepasse() {
  const pode = parcelaAceitaDesconto();
  return `<div class="cartao">
    <h2>Descontos do repasse <span class="cnt">(${descontosParcela.length})</span>
      <span class="dir" style="display:flex;gap:6px">
        <!-- v1.257: o espelho do 📄 Demonstrativo do inquilino. Aparece
             em QUALQUER etapa — o papel é o mesmo, o que muda é o
             carimbo: prévia enquanto o repasse não sai, recibo depois. -->
        ${registro.recibo_token ? `<a class="btn btn-claro" data-perm="competencias:ver"
           style="padding:5px 12px;font-size:12px"
           href="recibo.html?p=${encodeURIComponent(registro.recibo_token)}&i=1"
           target="_blank" rel="noopener"
           title="Folha do proprietário — vale antes e depois do repasse"
           >${icone('documento', 13)} Recibo do proprietário</a>` : ''}
        ${pode ? `<button class="btn btn-claro" data-perm="competencias:editar"
          style="padding:5px 12px;font-size:12px"
          onclick="acrescentarDescontoDoRepasse()">+ Acrescentar só neste mês</button>` : ''}
      </span></h2>
    ${mioloDescontosDoRepasse()}
  </div>`;
}

/** v1.272 — o miolo do cartão de descontos (tabela + soma + explicação),
 *  também usado pela janela "Descontos do repasse" do cockpit. */
function mioloDescontosDoRepasse() {
  const pode = parcelaAceitaDesconto();
  const bt = (acao, rot, dica) => `<button class="btn btn-claro" data-perm="competencias:editar"
      style="padding:3px 9px;font-size:12px" title="${htm(dica)}"
      onclick="${acao}">${rot}</button>`;

  const linhas = descontosParcela.map(d => {
    const v = Number(d.valor) || 0;
    const doCaso = d.caso_id;
    /* v1.256 — agora existe uma terceira origem: item da cobrança
     * marcado para voltar ao proprietário. Ela se refaz sozinha todo
     * mês, como a do contrato no cartão do inquilino, e o ✎ solta a
     * linha só nesta parcela (guardando o contrato_item_id). */
    const doContrato = d.contrato_item_id;
    const solta = doContrato && d.avulso;
    const origem = doContrato
      ? (solta ? `<span class="ci-orig">do contrato</span>
                  <span class="tag tag-amarela">alterado neste mês</span>`
               : '<span class="tag tag-azul">do contrato</span>')
      : (doCaso ? `<span class="tag tag-azul">do caso</span>`
                : '<span class="tag tag-azul">só neste mês</span>');
    const acoes = !pode ? '' : (
      bt(`editarDescontoDoRepasse('${jsq(d.id)}')`, '✎', 'Mudar o valor neste mês') +
      (doContrato
        ? (solta
            ? bt(`religarDescontoDoRepasse('${jsq(d.id)}')`, '↺', 'Voltar a seguir o contrato')
            : '')
        : (doCaso
            ? bt(`religarDescontoDoRepasse('${jsq(d.id)}')`, '↺', 'Voltar a seguir o caso')
            // ✕ só em linha avulsa: a política de delete do banco exige
            // isso, e oferecer um botão que vai ser recusado é pior do
            // que não ter botão
            : (d.avulso
                ? bt(`tirarDescontoDoRepasse('${jsq(d.id)}')`, '✕', 'Tirar esta linha')
                : ''))));

    return `<tr>
      <td>${htm(d.nome)}${v < 0 ? ' <span class="tag tag-verde">acresce</span>' : ''}${
        d.observacao ? `<div class="ci-orig">${htm(d.observacao)}</div>` : ''}</td>
      <td>${origem}${d.veio_de_campo
        ? ' <span class="tag tag-amarela">veio do campo antigo</span>' : ''}</td>
      <td style="text-align:right;white-space:nowrap">${
        v < 0 ? '+ ' + moeda(Math.abs(v)) : moeda(v)}</td>
      <td style="white-space:nowrap">${acoes}</td></tr>`;
  }).join('');

  const soma = descontosParcela.reduce((a, d) => a + (Number(d.valor) || 0), 0);
  const bruto = Number(registro.repasse_bruto) || 0;

  return `<div class="corpo" style="padding:0">
      <table class="mini">
        <tr><th>Descrição</th><th>De onde vem</th>
            <th style="text-align:right">Valor</th><th></th></tr>
        ${linhas || `<tr><td colspan="4" style="color:var(--texto-suave)">
           Nenhum desconto neste mês — o proprietário recebe o repasse cheio.</td></tr>`}
      </table>
      <div class="ci-soma">
        <span>Repasse bruto <b>${moeda(bruto)}</b>
          ${soma ? (soma > 0 ? '− descontos <b>' + moeda(soma) + '</b>'
                             : '+ acréscimos <b>' + moeda(-soma) + '</b>') : ''}</span>
        <span>Líquido ao proprietário: <b style="font-size:16px">${moeda(bruto - soma)}</b></span>
      </div>
    </div>
    <p style="font-size:12px;color:var(--texto-suave);margin:8px 14px 12px;line-height:1.6">
      Linha <b>do contrato</b> nasce de um item da cobrança marcado para voltar ao
      proprietário e se refaz sozinha todo mês — o ✎ solta ela só nesta parcela (o mês em que
      a conta veio diferente; zero também vale) e o ↺ devolve o vínculo. Linha <b>do caso</b>
      nasce de um chamado de manutenção e acompanha o valor dele. Linha <b>só neste mês</b> é
      sua. Uma linha que <b>acresce</b> soma no repasse em vez de descontar.${pode ? '' :
      ' <b>Esta parcela já foi repassada e não aceita mudança.</b>'}</p>`;
}

const DESC_TIPICOS = ['Manutenção', 'Conta de água', 'Conta de energia', 'IPTU',
                      'Condomínio', 'Reembolso ao proprietário', 'Acerto de repasse'];

async function _acrescentarDescontoDoRepasse() {
  const modelos = DESC_TIPICOS.concat([AVULSO_OUTRO]);
  abrirAcao(`Desconto do repasse em ${mesISO(registro.competencia).split('-').reverse().join('/')}`, [
    { n: 'modelo', r: 'Descrição', t: 'select', largo: true, op: modelos, v: modelos[0] },
    { n: 'nome', r: 'Nome da linha', t: 'texto', largo: true, v: modelos[0] },
    { n: 'valor', r: 'Valor (R$)', t: 'moeda', v: '' },
    { n: 'sentido', r: 'Desconta ou acresce?', t: 'select',
      op: ['Descontar do repasse', 'Acrescentar ao repasse'], v: 'Descontar do repasse' },
    { n: 'obs', r: 'Observação (opcional)', t: 'texto', largo: true, v: '',
      dica: 'nota fiscal, a quem foi pago, quando' },
    { n: 'nota', t: 'aviso', r: 'Sai do repasse deste mês, só desta parcela. Não muda o '
      + 'boleto do inquilino. Comprovante não é obrigatório — mas escrever o número da '
      + 'nota na observação é o que responde a pergunta do proprietário seis meses depois.' }
  ], async () => {
    const nome = valorAcao('nome');
    erroSe(!nome, 'Dê um nome à linha.');
    const valor = valorAcao('valor') === null ? null : Number(valorAcao('valor'));
    erroSe(!valor || !Number.isFinite(valor) || valor <= 0, 'Informe o valor.');
    const igual = descontosParcela.find(x =>
      String(x.nome || '').trim().toLowerCase() === nome.trim().toLowerCase());
    erroSe(igual && !confirm(`Este mês já tem "${igual.nome}" de ${moeda(Math.abs(igual.valor))}.\n\n` +
      'Acrescentar assim mesmo?'), 'Nada foi acrescentado.');
    const sinal = valorAcao('sentido') === 'Acrescentar ao repasse' ? -1 : 1;
    const { error } = await sb.from('competencia_itens').insert({
      empresa_id: registro.empresa_id, competencia_id: ID, contrato_item_id: null,
      nome, valor: sinal * valor, avulso: true, lado: 'proprietario',
      observacao: valorAcao('obs')
    });
    if (error) throw error;
  }, '+ Acrescentar');

  const sel = elementoAcao('modelo');
  if (sel) sel.onchange = () => {
    const el = elementoAcao('nome');
    if (sel.value === AVULSO_OUTRO) { el.value = ''; el.focus(); return; }
    el.value = sel.value;
  };
}

async function _editarDescontoDoRepasse(id) {
  const d = descontosParcela.find(x => x.id === id);
  if (!d) return;
  const v = Number(d.valor) || 0;
  abrirAcao(`Mudar "${d.nome}" neste mês`, [
    { n: 'valor', r: 'Valor (R$)', t: 'moeda', v: Math.abs(v) },
    { n: 'sentido', r: 'Desconta ou acresce?', t: 'select',
      op: ['Descontar do repasse', 'Acrescentar ao repasse'],
      v: v < 0 ? 'Acrescentar ao repasse' : 'Descontar do repasse' },
    { n: 'obs', r: 'Observação (opcional)', t: 'texto', largo: true, v: d.observacao || '' },
    { n: 'nota', t: 'aviso', r: d.caso_id
      ? 'Isto solta a linha do caso: ela para de acompanhar o valor dele. O ↺ desfaz.'
      : 'Vale só nesta parcela.' }
  ], async () => {
    const novo = valorAcao('valor') === null ? null : Number(valorAcao('valor'));
    erroSe(novo === null || !Number.isFinite(novo) || novo < 0, 'Informe o valor.');
    const sinal = valorAcao('sentido') === 'Acrescentar ao repasse' ? -1 : 1;
    const { error } = await sb.from('competencia_itens')
      .update({ valor: sinal * novo, avulso: true, observacao: valorAcao('obs') })
      .eq('id', id);
    if (error) throw error;
  }, '✓ Salvar');
}

async function _tirarDescontoDoRepasse(id) {
  const d = descontosParcela.find(x => x.id === id);
  if (!d) return;
  if (!confirm(`Tirar "${d.nome}" do repasse deste mês?`)) return;
  const { error } = await sb.from('competencia_itens').delete().eq('id', id);
  if (error) throw error;
  await carregarFicha();
}

async function _religarDescontoDoRepasse(id) {
  const d = descontosParcela.find(x => x.id === id);
  if (!d) return;
  /* v1.256 — duas origens, dois caminhos. A linha do CASO só precisa
   * deixar de ser avulsa. A do CONTRATO some e nasce de novo pelo
   * rebuild, exatamente como o ↺ do cartão do inquilino faz — é o
   * rebuild que sabe o valor de hoje e a proporção do último mês. */
  if (d.contrato_item_id) {
    if (!confirm(`"${d.nome}" volta a seguir o contrato neste mês.\n\n` +
        'O valor passa a ser o do item da cobrança de novo.')) return;
    const { error } = await sb.from('competencia_itens').delete().eq('id', id);
    if (error) throw error;
    const { error: e2 } = await sb.rpc('atualizar_repasse_da_competencia', { p_comp: ID });
    if (e2) throw e2;
  } else {
    if (!confirm(`"${d.nome}" volta a seguir o caso de origem.`)) return;
    const { error } = await sb.from('competencia_itens')
      .update({ avulso: false }).eq('id', id);
    if (error) throw error;
  }
  await carregarFicha();
}

/**
 * v1.257 — REPASSES DO PROPRIETÁRIO, na ficha do contato.
 *
 * A pergunta que abriu isto foi "não estou achando esse recibo": até a
 * v1.256 o documento só era oferecido dentro da janela de repasse, e
 * fechada a janela não havia caminho nenhum de volta. Aqui ficam os 12
 * últimos meses, pagos ou não, cada um com o seu link.
 *
 * O cartão SOME em quem não é proprietário — a consulta volta vazia.
 */
function blocoRepassesDoProprietario() {
  // v1.475 — contrato novo pode não ter mês NENHUM para trás. O cartão
  // continua aparecendo, dizendo quantas vêm por aí: sumir seria voltar
  // ao "não estou achando esse recibo" que a v1.257 veio resolver.
  //
  // Quem o faz sumir é o cartão Financeiro, e só DEPOIS de ele existir
  // na tela (ver carregarFinanceiroFicha) — assim não há papel nem
  // instante em que os dois somem juntos e o recibo fique sem caminho.
  if (!repassesDoContato.length && !repassesFuturos) return '';

  const linhas = repassesDoContato.map(p => {
    const pago = !!p.repassado_em;
    const situacao = pago
      ? `<span class="tag tag-verde">pago em ${dataBr(p.repassado_em).slice(0, 5)}</span>`
      : (p.recebido_em
          ? '<span class="tag tag-amarela">a repassar</span>'
          : '<span class="tag tag-cinza">aguardando o inquilino</span>');
    const valor = pago && p.valor_repassado != null ? p.valor_repassado : p.repasse_liquido;
    const url = 'recibo.html?p=' + encodeURIComponent(p.recibo_token || '');
    return `<tr>
      <td style="white-space:nowrap">${htm(mesCurto(p.competencia))}
        <span class="ci-orig">${htm(p.codigo || '')}</span></td>
      <td>${situacao}</td>
      <td style="text-align:right;white-space:nowrap">${moeda(valor)}</td>
      <td style="white-space:nowrap">${p.recibo_token ? `
        <a class="btn btn-claro" style="padding:3px 9px;font-size:12px"
           href="${url}&i=1" target="_blank" rel="noopener"
           title="Abrir o documento deste mês">${icone('documento', 12)} abrir</a>
        <button class="btn btn-claro" style="padding:3px 9px;font-size:12px"
           onclick="copiarLinkDoRecibo('${jsq(p.recibo_token)}')"
           title="Copiar o link para mandar ao proprietário">${icone('elo', 13)}</button>` : '—'}</td>
    </tr>`;
  }).join('');

  return `<div class="cartao" id="rep-cartao">
    <h2>Repasses <span class="cnt">(${repassesDoContato.length})</span>
      <span class="dir" style="color:var(--texto-suave);font-size:12px;font-weight:400">
        últimos 12 meses</span></h2>
    <div class="corpo" style="padding:0">
      <table class="mini">
        <tr><th>Mês</th><th>Situação</th><th style="text-align:right">Líquido</th>
            <th>Recibo</th></tr>
        ${linhas || `<tr><td colspan="4" style="color:var(--texto-suave)">
          Nenhum mês fechado ainda — o contrato é novo.</td></tr>`}
      </table>
    </div>
    <p style="font-size:12px;color:var(--texto-suave);margin:8px 14px 12px;line-height:1.6">
      ${repassesFuturos ? `<b>${repassesFuturos}</b> ${repassesFuturos === 1
        ? 'competência ainda não chegou' : 'competências ainda não chegaram'} —
        aparecem aqui no mês delas.<br>` : ''}
      O link é o mesmo antes e depois do pagamento: enquanto o repasse não sai, o
      documento se apresenta como <b>prévia</b>; quando sai, vira <b>recibo</b> sozinho.
      Quem já recebeu o link vê a mudança sem precisar de outro.</p>
  </div>`;
}

function copiarLinkDoRecibo(token) {
  // v1.263 — URL_RAIZ, não a barra: com o endereço bonito (/contato/CT-0054)
  // a conta pela barra montaria /contato/recibo.html — link errado no WhatsApp.
  copiar(URL_RAIZ + 'recibo.html?p=' + encodeURIComponent(token),
         'Link copiado. É o mesmo antes e depois do repasse.');
}

/* ============================================================
 * v1.445 — OS CARTÕES NOVOS DO CONTATO (pedido de 30/08)
 *
 * Aluguéis, Sinistros e Comissões, na regra do Repasses: consulta
 * vazia = cartão some sozinho. Toda linha ABRE o registro (a regra de
 * 30/08 dos registros clicáveis); a parcela de comissão, que não tem
 * ficha própria, abre a tela Comissões.
 * ============================================================ */

/** (Contato) Os meses dos contratos dele — inquilino ou proprietário. */
function blocoAlugueisDoContato() {
  // v1.479 — contrato novo pode não ter mês nenhum para trás; o cartão
  // fica, dizendo quantos vêm. Igual ao Repasses (v1.475).
  if (!alugueisDoContato.length && !alugueisFuturos) return '';
  const hoje = hojeISO();
  const porContrato = {};
  contratosDoContato.forEach(c => { porContrato[c.id] = c; });
  const atrasada = p => ['Aberta', 'Cobrada'].includes(p.etapa)
    && p.vencimento && p.vencimento < hoje;
  const CORES = { 'Prevista': 'tag-cinza', 'Aberta': 'tag-azul', 'Cobrada': 'tag-azul',
    'Recebida': 'tag-verde', 'Liberada': 'tag-verde', 'Repassada': 'tag-verde' };

  const linhas = alugueisDoContato.map(p => {
    const ct = porContrato[p.contrato_id];
    const tarde = atrasada(p);
    return `<tr style="cursor:pointer${tarde ? ';background:#FDF3F2' : ''}"
      onclick="location.href='competencia.html?id=${p.id}'">
      <td style="white-space:nowrap">${htm(mesCurto(p.competencia))}
        <span class="ci-orig">${htm(p.codigo || '')}</span></td>
      <td style="white-space:nowrap">${htm((ct && ct.codigo) || '—')}
        <span class="ci-orig">${htm(ct
          ? (ct.inquilino_id === ID ? 'inquilino' : 'proprietário') : '')}</span></td>
      <td${tarde ? ' style="color:var(--erro);font-weight:700"' : ''}>${
        p.vencimento ? dataBr(p.vencimento) : '—'}</td>
      <td><span class="tag ${tarde ? 'tag-vermelha' : (CORES[p.etapa] || 'tag-cinza')}">${
        htm(tarde ? 'ATRASADA' : p.etapa)}</span></td>
      <td style="text-align:right;white-space:nowrap">${moeda(p.valor_total || 0)}</td>
    </tr>`;
  }).join('');

  const atrasadas = alugueisDoContato.filter(atrasada).length;
  return `<div class="cartao">
    <h2>Aluguéis <span class="cnt">(${alugueisDoContato.length})</span>
      ${atrasadas ? `<span class="cnt" style="color:var(--erro);font-weight:700">
        ${atrasadas} em atraso</span>` : ''}
      <span class="dir" style="color:var(--texto-suave);font-size:12px;font-weight:400">
        últimos 12 meses</span></h2>
    <div class="corpo" style="padding:0">
      <table class="mini">
        <tr><th>Mês</th><th>Contrato</th><th>Vencimento</th><th>Situação</th>
            <th style="text-align:right">Valor</th></tr>
        ${linhas || `<tr><td colspan="5" style="color:var(--texto-suave)">
          Nenhum mês vencido ainda — o contrato é novo.</td></tr>`}
      </table>
    </div>
    ${alugueisFuturos ? `<p style="font-size:12px;color:var(--texto-suave);margin:8px 14px 12px">
      <b>${alugueisFuturos}</b> ${alugueisFuturos === 1 ? 'mês ainda não chegou'
        : 'meses ainda não chegaram'} — aparecem aqui no mês deles.</p>` : ''}
  </div>`;
}

/** (Contato) Os sinistros dos contratos dele — um resumo por linha;
 *  o trabalho continua na ficha do sinistro, que a linha abre. */
function blocoSinistrosDoContato() {
  if (!sinistrosDoContato.length) return '';
  const porContrato = {};
  contratosDoContato.forEach(c => { porContrato[c.id] = c; });

  const linhas = sinistrosDoContato.map(s => {
    const ct = porContrato[s.contrato_id];
    return `<tr style="cursor:pointer"
      onclick="location.href='sinistro.html?id=${s.id}'">
      <td style="white-space:nowrap"><b>${htm(s.codigo || '')}</b>
        <span class="ci-orig">${htm(s.tipo || '')}</span></td>
      <td style="white-space:nowrap">${htm((ct && ct.codigo) || '—')}</td>
      <td><span class="tag ${COR_SINISTRO[s.status] || 'tag-cinza'}">${htm(s.status || '—')}</span>
        ${s.alerta ? `<span class="tag tag-vermelha">${htm(s.alerta)}</span>` : ''}</td>
      <td style="white-space:nowrap">${s.data_abertura ? dataBr(s.data_abertura) : '—'}</td>
      <td style="text-align:right;white-space:nowrap">${
        s.valor_recebido != null ? moeda(s.valor_recebido)
          : (s.valor_pleiteado != null ? moeda(s.valor_pleiteado) + ' <span class="ci-orig">pleiteado</span>' : '—')}</td>
    </tr>`;
  }).join('');

  return `<div class="cartao">
    <h2>Sinistros <span class="cnt">(${sinistrosDoContato.length})</span></h2>
    <div class="corpo" style="padding:0">
      <table class="mini">
        <tr><th>Sinistro</th><th>Contrato</th><th>Situação</th><th>Aberto em</th>
            <th style="text-align:right">Valor</th></tr>
        ${linhas}
      </table>
    </div>
  </div>`;
}

/** (Contato) As parcelas de comissão de quem é parceiro. A parcela não
 *  tem ficha própria — a linha (e o atalho do título) abrem a tela
 *  Comissões, onde mora a janela de pagamento. */
function blocoComissoesDoContato() {
  if (!comissoesDoContato.length) return '';
  const CORES = { 'Paga': 'tag-verde', 'Parcialmente paga': 'tag-amarela',
    'Liberada': 'tag-azul', 'Bloqueada': 'tag-cinza', 'Cancelada': 'tag-cinza' };
  const abertas = comissoesDoContato.filter(p => Number(p.saldo) > 0);
  const vencidas = abertas.filter(p => p.vencida).length;

  const linhas = comissoesDoContato.map(p => `<tr style="cursor:pointer${
      p.vencida && Number(p.saldo) > 0 ? ';background:#FDF3F2' : ''}"
    onclick="location.href='parcelas.html'">
    <td style="white-space:nowrap"><b>${htm(p.comissao_codigo || '')}</b>
      <span class="ci-orig">parcela ${htm(String(p.numero || ''))}${
        p.tipo ? ' · ' + htm(p.tipo) : ''}</span></td>
    <td>${htm(p.imovel_endereco || '—')}</td>
    <td style="white-space:nowrap">${p.data_prevista ? dataBr(p.data_prevista) : '—'}</td>
    <td><span class="tag ${p.vencida && Number(p.saldo) > 0
      ? 'tag-vermelha' : (CORES[p.status] || 'tag-cinza')}">${
      htm(p.vencida && Number(p.saldo) > 0 ? 'VENCIDA' : (p.status || '—'))}</span></td>
    <td style="text-align:right;white-space:nowrap">${moeda(p.saldo || 0)}</td>
  </tr>`).join('');

  return `<div class="cartao">
    <h2>Comissões <span class="cnt">(${comissoesDoContato.length})</span>
      ${vencidas ? `<span class="cnt" style="color:var(--erro);font-weight:700">
        ${vencidas} vencida${vencidas === 1 ? '' : 's'}</span>` : ''}
      <span class="dir"><a class="btn btn-claro" data-perm="comissoes:ver"
        style="padding:3px 10px;font-size:11.5px" href="parcelas.html">Ver em Comissões ›</a></span></h2>
    <div class="corpo" style="padding:0">
      <table class="mini">
        <tr><th>Comissão</th><th>Imóvel</th><th>Prevista</th><th>Situação</th>
            <th style="text-align:right">Saldo</th></tr>
        ${linhas}
      </table>
    </div>
  </div>`;
}

function blocoCompetencia() {
  const r = registro;
  return `<div class="cartao">
    <h2>O mês
      ${r.parcela ? `<span class="cnt">parcela ${r.parcela} de ${r.parcelas_total || '?'}</span>` : ''}
      ${r.etapa === 'Prevista' ? '<span class="tag tag-prev">previsão · recalcula sozinha</span>' : ''}
      ${r.primeiro_mes ? '<span class="tag tag-azul">primeiro mês do contrato</span>' : ''}</h2>
    <div class="corpo">
      ${ladoInquilinoMes()}
      ${ladoProprietarioMes()}
      ${notaRepasseZerado()}
      <div class="cp-fica">
        <span>Fica com a Moralí neste mês</span>
        <b>${moeda(r.taxa_adm)}${r.primeiro_mes && !(Number(r.repasse_bruto) || 0)
          ? ' + o aluguel do 1º mês' : ''}</b>
      </div>
    </div>
  </div>`;
}

/* v1.272 — as duas pontas do mês viraram funções: o cartão "O mês"
 * (empilhadas, como sempre) e o cartão novo "O dinheiro deste mês"
 * (lado a lado) desenham A MESMA conta — duas cópias divergiriam. */
function ladoInquilinoMes() {
  const r = registro;
  const n = v => Number(v) || 0;
  const l = (t, v, cls) => `<tr class="${cls || ''}"><td>${t}</td><td>${v}</td></tr>`;
  const recebeu = !!r.recebido_em;
  const diferenca = recebeu && r.valor_recebido !== null && r.valor_recebido !== undefined
    ? n(r.valor_recebido) - n(r.valor_total) : null;
  return `<div class="cp-lado">
        <div class="cp-tit">Entra do inquilino${r.inquilino_nome ? ' — ' + htm(r.inquilino_nome) : ''}</div>
        <table class="rg-conta">
          ${l('Aluguel' + (r.primeiro_mes ? ' <span class="cp-obs">(primeiro mês)</span>' : ''),
              moeda(r.valor_aluguel))}
          ${n(r.valor_itens) ? l('Itens da cobrança', moeda(r.valor_itens)) : ''}
          ${n(r.valor_encargos) ? l('Encargos', moeda(r.valor_encargos)) : ''}
          ${n(r.multa) ? l('Multa', moeda(r.multa)) : ''}
          ${n(r.juros) ? l('Juros de mora', moeda(r.juros)) : ''}
          ${n(r.outros_creditos) ? l('Outros créditos', moeda(r.outros_creditos)) : ''}
          ${l('<b>Total, vencendo em ' + dataBr(r.vencimento) + '</b>', moeda(r.valor_total), 'rg-tot')}
          ${recebeu ? l('Recebido em ' + dataBr(r.recebido_em),
              moeda(r.valor_recebido !== null && r.valor_recebido !== undefined
                    ? r.valor_recebido : r.valor_total), 'cp-ok') : ''}
        </table>
        ${(n(r.multa_hoje) || n(r.juros_hoje)) ? `
          <div class="cp-atraso">
            <b>Atrasada há ${r.dias_de_atraso} ${r.dias_de_atraso === 1 ? 'dia' : 'dias'}.</b>
            Cobrando hoje: ${moeda(n(r.valor_total) + n(r.multa_hoje) + n(r.juros_hoje))}
            <span>— aluguel ${moeda(r.valor_total)}
              ${n(r.multa_hoje) ? '+ multa ' + moeda(r.multa_hoje) : ''}
              ${n(r.juros_hoje) ? '+ juros ' + moeda(r.juros_hoje) : ''}</span>
          </div>` : ''}
        ${diferenca !== null && Math.abs(diferenca) >= 0.01
          ? `<p class="cp-dif">Recebeu ${diferenca > 0 ? moeda(diferenca) + ' a mais' :
               moeda(-diferenca) + ' a menos'} que o previsto.</p>` : ''}
      </div>`;
}

function ladoProprietarioMes() {
  const r = registro;
  const n = v => Number(v) || 0;
  const l = (t, v, cls) => `<tr class="${cls || ''}"><td>${t}</td><td>${v}</td></tr>`;
  const repassou = !!r.repassado_em;
  return `<div class="cp-lado">
        <div class="cp-tit">Sai ao proprietário${r.proprietario_nome ? ' — ' + htm(r.proprietario_nome) : ''}</div>
        <table class="rg-conta">
          ${l('Base do repasse', moeda(n(r.valor_aluguel)))}
          ${l('Taxa Mensal <span class="cp-obs">(congelada na geração)</span>',
              '− ' + moeda(r.taxa_adm), 'cp-neg')}
          ${(() => {
            // A COLUNA TEM QUE FECHAR NA TELA. No primeiro mês o repasse
            // vem reduzido pela regra do contrato, e sem esta linha a
            // conta fica "1.500 − 150 = 0,00" — aritmética que ninguém
            // aceita de um sistema de dinheiro.
            const esperado = n(r.valor_aluguel) - n(r.taxa_adm);
            const corte = esperado - n(r.repasse_bruto);
            return corte > 0.005
              ? l('Regra do 1º mês do contrato', '− ' + moeda(corte), 'cp-neg')
              : '';
          })()}
          ${l('<b>Repasse bruto</b>', moeda(r.repasse_bruto), 'rg-tot')}
          ${descontosParcela.map(d => {
            const v = Number(d.valor) || 0;
            return l(htm(d.nome) + (d.caso_id ? ' <span class="cp-obs">· do caso</span>' : ''),
                     (v < 0 ? '+ ' : '− ') + moeda(Math.abs(v)), v < 0 ? '' : 'cp-neg');
          }).join('')}
          ${l('<b>Líquido a repassar</b>', moeda(r.repasse_liquido), 'rg-tot')}
          ${repassou ? l('Repassado em ' + dataBr(r.repassado_em),
              moeda(r.valor_repassado !== null && r.valor_repassado !== undefined
                    ? r.valor_repassado : r.repasse_liquido), 'cp-ok') : ''}
        </table>
      </div>`;
}

function notaRepasseZerado() {
  const r = registro;
  return r.primeiro_mes && !(Number(r.repasse_bruto) || 0)
    ? `<p class="rg-primeiro"><b>Repasse zerado de propósito.</b> O contrato está configurado
         com “no 1º mês, repassar: não” — o primeiro aluguel fica com a imobiliária como taxa
         de contrato. Na planilha isso era um comentário escrito à mão.</p>` : '';
}

/**
 * O caminho da competência, com um botão só: o próximo passo.
 *
 * Sem escolher entre seis etapas num seletor — o fechamento do mês é
 * uma sequência, e oferecer todas as opções em toda hora é convidar
 * alguém a marcar "Repassada" antes de ter recebido.
 */
function caminhoCompetencia() {
  const ETAPAS = ['Prevista', 'Aberta', 'Cobrada', 'Recebida', 'Liberada', 'Repassada'];
  const r = registro;
  if (r.etapa === 'Cancelada') {
    return `<div class="path"><div class="et perdida">✕ Cancelada</div></div>`;
  }
  const i = ETAPAS.indexOf(r.etapa);
  const proxima = i >= 0 && i < ETAPAS.length - 1 ? ETAPAS[i + 1] : null;

  // v1.456 — os botões entram DENTRO do trilho (classe path-linha), à
  // direita, em vez de cair numa segunda linha solta. Mockup aprovado
  // em 31/08 (proposta B): as etapas continuam largas; o que muda é o
  // lugar da ação. No celular o CSS devolve a quebra de sempre.
  return `<div class="path path-linha">
      ${ETAPAS.map((e, k) => `<div class="et ${k < i ? 'feita' : (k === i ? 'atual' : '')}">${htm(e)}</div>`).join('')}
    ${proxima || podeRecalcular() ? `<div class="path-saida">
      ${proxima ? `<button class="btn" data-perm="competencias:editar"
              title="${r.etapa === 'Prevista'
                ? 'Congela o valor: a partir daí ele para de acompanhar reajuste e taxa'
                : 'Avança para a próxima etapa do mês'}"
              onclick="avancarCompetencia('${jsq(proxima)}')">${
                // ABRIR NÃO É "MARCAR ABERTA". Sair de Prevista CONGELA o
                // valor, e um botão que não diz isso faz alguém congelar
                // um mês futuro sem querer — justamente o que o desenho
                // das previstas existe para evitar.
                r.etapa === 'Prevista' ? icone('cadeado', 12) + ' Abrir agora (congela o valor)'
                                       : '✓ Marcar ' + htm(proxima)}</button>` : ''}
      ${podeRecalcular() ? `<button class="btn btn-claro" data-perm="competencias:editar"
              onclick="recalcularCompetencia()"
              title="Refaz a conta com as regras de hoje do contrato">↻ Recalcular</button>` : ''}
    </div>` : ''}
    </div>`;
}

/**
 * Avançar preenche a DATA junto, quando a etapa a exige. Marcar
 * "Recebida" sem dizer quando foi recebido deixaria o mês fechado com
 * um buraco que ninguém preenche depois.
 */
/**
 * RECALCULAR SÓ ENQUANTO NINGUÉM RECEBEU.
 *
 * O congelamento existe para o repasse pago não se reescrever sozinho —
 * mas uma competência recém-gerada com a taxa errada precisa de
 * conserto. A fronteira é o dinheiro ter entrado, e o banco repete a
 * mesma regra: validar só na tela é validar só para quem usa a tela.
 */
function podeRecalcular() {
  return ['Prevista', 'Aberta', 'Cobrada'].includes(registro.etapa) && !registro.recebido_em;
}

async function recalcularCompetencia() {
  if (!confirm('Refazer a conta com as regras de hoje do contrato?\n\n' +
      'Aluguel, taxa e repasse bruto são recalculados. O que você digitou ' +
      '(juros, descontos, observações) não muda.')) return;
  const { data, error } = await sb.rpc('recalcular_competencia', { p_id: ID });
  if (error) { alert('Não consegui recalcular: ' + error.message); return; }
  const { data: nova } = await sb.from('competencias_painel').select('*').eq('id', ID).maybeSingle();
  if (nova) registro = nova;
  desenharFicha();
  alert(data);
}

async function avancarCompetencia(nova) {
  if (registro.etapa === 'Prevista' &&
      !confirm('Abrir este aluguel agora?\n\n' +
        'O valor CONGELA: a partir daí ela para de acompanhar reajuste e mudança de taxa. ' +
        'Faz sentido quando o inquilino vai pagar adiantado; nos outros casos, ela abre ' +
        'sozinha quando o mês chegar.')) return;

  /* v1.273 — OS JUROS DO ATRASO SÃO DE QUEM?
   * Quando o inquilino pagou multa/juros (a baixa do Asaas agora os
   * grava separados) e o repasse vai sair, a decisão é do operador:
   * por padrão ficam com a Moralí (receita acessória); repassados,
   * saem LÍQUIDOS da Taxa Mensal congelada — o proprietário não
   * recebe juros inteiros. A linha nasce como acréscimo do repasse
   * (lado proprietário), então o líquido se refaz sozinho no banco. */
  const jm = (Number(registro.juros) || 0) + (Number(registro.multa) || 0);
  const jaDecidido = descontosParcela.some(d =>
    /multa do atraso|juros e multa do atraso/i.test(d.nome || ''));
  if (nova === 'Repassada' && !registro.repassado_em && jm > 0.004 && !jaDecidido) {
    /* v1.294 — A MULTA DO PROPRIETÁRIO SE CALCULA, NÃO SE RATEIA.
     *
     * Regra do Rodrigo (17/08/2026): a multa que vai ao proprietário é o
     * PERCENTUAL DE MULTA DO CONTRATO sobre o que sobra do aluguel para
     * ele — aluguel menos a Taxa Mensal —, e não uma fatia do que o
     * inquilino pagou.
     *
     *   aluguel 800,00 − taxa 64,00 = 736,00
     *   736,00 × 10% (multa do contrato) = 73,60
     *
     * A conta antiga partia do que foi cobrado (multa + juros = 90,46) e
     * descontava a taxa, chegando a 83,22. Os dois números discordam
     * porque a multa cobrada do inquilino incide sobre o boleto INTEIRO
     * (aluguel + itens), e o proprietário não é dono dos itens.
     *
     * E os JUROS DE MORA ficam sempre com a Moralí — decisão do mesmo
     * dia. Só a multa é repassável.
     */
    const multaPaga  = Number(registro.multa) || 0;
    const aluguel    = Number(registro.valor_aluguel) || 0;
    const taxa       = Number(registro.taxa_adm) || 0;
    const sobraDoAluguel = Math.max(0, aluguel - taxa);

    // O percentual mora no CONTRATO (`multa_percentual`, 0.1 = 10%) e não
    // é entregue pela view da competência: buscar aqui é a única forma.
    let pctMulta = null;
    if (registro.contrato_id) {
      const { data: ct } = await sb.from('contratos')
        .select('multa_percentual').eq('id', registro.contrato_id).maybeSingle();
      if (ct && ct.multa_percentual != null) pctMulta = Number(ct.multa_percentual);
    }

    // Sem percentual no contrato não dá para calcular a regra nova. Em vez
    // de inventar um número, o repasse cai no valor da multa efetivamente
    // paga, líquida da Taxa Mensal, e a janela diz que foi por isso.
    const semPercentual = !(pctMulta > 0);
    const pctTaxa  = aluguel > 0 ? taxa / aluguel : 0;
    const aRepassar = semPercentual
      ? Math.round(multaPaga * (1 - pctTaxa) * 100) / 100
      : Math.round(sobraDoAluguel * pctMulta * 100) / 100;

    const pc = n => (n * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    const FICA = 'Fica com a Moralí — receita acessória';
    const VAI  = 'Repassar a multa ao proprietário';
    const contaEscrita = semPercentual
      ? `o contrato não tem percentual de multa cadastrado, então vale a multa paga `
        + `(${moeda(multaPaga)}) menos a Taxa Mensal de ${pc(pctTaxa)}%`
      : `${moeda(aluguel)} de aluguel − ${moeda(taxa)} de Taxa Mensal = `
        + `${moeda(sobraDoAluguel)}, e ${pc(pctMulta)}% disso = ${moeda(aRepassar)}`;

    abrirAcao('Multa do atraso — de quem é?', [
      { n: 'destino', r: `O inquilino pagou ${moeda(multaPaga)} de multa`
          + ((Number(registro.juros) || 0) > 0.004
              ? ` e ${moeda(Number(registro.juros))} de juros de mora` : ''),
        t: 'select', largo: true, op: [FICA, VAI], v: FICA },
      { n: 'nota', t: 'aviso', r: 'Repassando, o proprietário recebe '
        + moeda(aRepassar) + ': ' + contaEscrita + '.'
        + ((Number(registro.juros) || 0) > 0.004
            ? ' Os juros de mora ficam com a Moralí — só a multa é repassada.' : '')
        + ' A escolha vale só para esta parcela e aparece na conta do repasse.' }
    ], async () => {
      if (valorAcao('destino') === VAI) {
        const { error } = await sb.from('competencia_itens').insert({
          empresa_id: registro.empresa_id, competencia_id: ID, contrato_item_id: null,
          nome: 'Multa do atraso — parte do proprietário',
          valor: -aRepassar, avulso: true, lado: 'proprietario',
          observacao: contaEscrita
        });
        if (error) throw error;
      }
      await efetivarAvancoCompetencia(nova);
    }, '✓ Continuar');
    return;
  }
  await efetivarAvancoCompetencia(nova);
}

async function efetivarAvancoCompetencia(nova) {
  const linha = { etapa: nova };
  if (nova === 'Aberta') linha.congelada_em = new Date().toISOString();
  const hoje = new Date();
  const iso = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0') +
              '-' + String(hoje.getDate()).padStart(2, '0');
  if (nova === 'Recebida' && !registro.recebido_em) {
    linha.recebido_em = iso;
    if (registro.valor_recebido === null || registro.valor_recebido === undefined) {
      linha.valor_recebido = registro.valor_total;
    }
  }
  if (nova === 'Repassada' && !registro.repassado_em) {
    linha.repassado_em = iso;
    if (registro.valor_repassado === null || registro.valor_repassado === undefined) {
      // v1.273 — relido do banco: se a janela acabou de lançar o
      // acréscimo dos juros, o repasse_liquido já cresceu no banco e o
      // valor da tela está velho
      const { data: fresco } = await sb.from('competencias_painel')
        .select('repasse_liquido').eq('id', ID).maybeSingle();
      linha.valor_repassado = fresco ? fresco.repasse_liquido : registro.repasse_liquido;
    }
  }
  const { error } = await sb.from('competencias').update(linha).eq('id', ID);
  if (error) { alert('Não consegui avançar: ' + error.message); return; }
  await carregarFicha();
}

/**
 * GERAR AS PARCELAS DO CONTRATO INTEIRO.
 *
 * Simula sempre antes: trinta linhas de dinheiro nascendo de uma vez é
 * o momento de conferir a regra, não depois. E o que nasce no passado
 * ou no mês corrente já nasce CONGELADO — gerar um contrato antigo não
 * reescreve o histórico dele.
 */
function abrirGerarParcelas() {
  let j = document.getElementById('janela-parcelas');
  if (!j) {
    j = document.createElement('div');
    j.id = 'janela-parcelas'; j.className = 'modal-fundo';
    j.onclick = e => { if (e.target === j) j.classList.remove('aberto'); };
    document.body.appendChild(j);
  }
  j.innerHTML = `
    <div class="modal" style="width:860px;max-width:calc(100vw - 32px)">
      <h2>Parcelas de ${htm(registro.codigo || 'contrato')}</h2>
      <p style="font-size:13px;color:var(--texto-suave);line-height:1.6">
        Um aluguel por mês de contrato. Os do mês corrente para trás nascem
        <b>abertos</b> (congelados); os futuros, <b>previstos</b> — e esses se recalculam
        sozinhos até chegar a vez deles.</p>
      <p style="font-size:13px;color:var(--texto-suave);line-height:1.6;
                background:#f4f7f9;padding:10px 12px;border-radius:8px">
        Não cobrar a 1ª parcela se ela tiver menos de
        <input id="par-dias" type="number" min="0" max="28" step="1" value="0"
               style="width:60px;padding:2px 6px" onchange="simularParcelas()"
               oninput="simularParcelas()">
        dia(s) — nesse caso os dias entram somados no primeiro boleto cheio.
        Deixe <b>0</b> para cobrar sempre; só a parcela de zero dia nunca nasce.
      </p>
      <div id="par-itens"></div>
      <div id="par-previa"></div>
      <p class="msg-erro" id="par-erro"></p>
      <div class="acoes">
        <button class="btn btn-claro" onclick="document.getElementById('janela-parcelas').classList.remove('aberto')">Fechar</button>
        <button class="btn" id="par-btn" onclick="gerarParcelas()" disabled>Gerar de verdade</button>
      </div>
    </div>`;
  j.classList.add('aberto');
  desenharQuandoItens();
  simularParcelas();
}

/**
 * v1.220 — os itens da cobrança DENTRO da janela de gerar.
 *
 * É aqui que a pessoa está decidindo como o contrato vai ser cobrado;
 * obrigá-la a fechar, abrir o ✎ de cada item e voltar era o caminho
 * mais curto para o que aconteceu no CON-0059 — fiança e boleto
 * inteiros dentro de uma parcela de três dias.
 */
function desenharQuandoItens() {
  const alvo = document.getElementById('par-itens');
  if (!alvo) return;
  const its = itensContrato.filter(i => i.ativo);
  if (!its.length) {
    alvo.innerHTML = `<p style="font-size:13px;color:var(--texto-suave);line-height:1.6">
      Este contrato não tem itens além do aluguel. Seguro, boleto e a taxa de contrato
      digital entram por <b>+ Acrescentar item</b>, no cartão “Itens da cobrança”.</p>`;
    return;
  }
  alvo.innerHTML = `
    <p style="font-size:13px;color:var(--texto-suave);line-height:1.6;margin:14px 0 6px">
      <b>Quando cada item entra na conta.</b> A 1ª parcela costuma ser só dos dias de
      aluguel — seguro, boleto e taxa de contrato normalmente começam no primeiro mês
      cheio. Mudar aqui já salva no contrato.</p>
    <table class="mini" style="border:1px solid var(--borda);border-radius:8px">
      <tr><th>Item</th><th style="text-align:right">Valor/mês</th>
          <th>Começa em</th><th>Como cobra</th></tr>
      ${its.map(it => `<tr>
        <td>${htm(it.nome)}${it.credito ? ' <span class="tag tag-verde">abate</span>' : ''}</td>
        <td style="text-align:right;white-space:nowrap">${it.credito ? '−' : ''}${moeda(it.valor)}</td>
        ${celulasQuandoItem('g', it)}
      </tr>`).join('')}
    </table>`;
}

/**
 * v1.214 — O CORTE DA PRIMEIRA PARCELA.
 *
 * Quantos dias valem um boleto é acordo com o inquilino, não regra do
 * sistema — por isso a escolha é aqui, na hora de gerar, e não uma
 * constante no banco. A simulação reroda a cada digitação, então a
 * pessoa vê o efeito antes de gravar qualquer coisa.
 *
 * Declarada como function de propósito: a conferência estrutural
 * rastreia atalhos `const x = id => getElementById(id)` e cobraria
 * 'par-dias' como id de tela.
 */
function diasMinimosParcela() {
  const el = document.getElementById('par-dias');
  const n = el ? parseInt(el.value, 10) : 0;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 28) : 0;
}

/**
 * v1.242 — A SIMULAÇÃO PARA DE ATROPELAR A SI MESMA.
 *
 * A janela re-simula a cada tecla do campo de dias e depois de cada
 * alteração de item (que ainda passa por um carregarFicha inteiro).
 * Com isso saíam várias chamadas ao mesmo tempo, e o navegador aborta a
 * que ficou para trás — abortada, ela chega ao JS como
 * "TypeError: Failed to fetch". Era a mensagem que aparecia com a
 * tabela já desenhada e os totais zerados: uma resposta velha caindo
 * por cima da boa.
 *
 * Dois remédios, os mesmos que a busca global já usa desde a v1.130:
 *   · ESPERAR a digitação parar (350 ms) em vez de chamar por tecla;
 *   · NUMERAR o pedido e descartar resposta que não seja a do último.
 *
 * E um terceiro, de bom senso: falha não apaga mais a prévia que estava
 * na tela. Continuar vendo os números velhos com um aviso é melhor que
 * ficar com a tela em branco sem saber o que havia ali.
 */
let simPedido = 0, simTimer = null;

function simularParcelas() {
  clearTimeout(simTimer);
  simTimer = setTimeout(simularParcelasAgora, 350);
}

async function simularParcelasAgora() {
  const alvo = document.getElementById('par-previa');
  if (!alvo) return;                       // janela fechou no meio do caminho
  const meu = ++simPedido;
  if (!alvo.innerHTML) alvo.innerHTML = '<p class="cp-vazio">Simulando…</p>';
  const { data, error } = await sb.rpc('gerar_competencias_do_contrato',
    { p_contrato_id: ID, p_simular: true, p_dias_minimos: diasMinimosParcela() });
  if (meu !== simPedido) return;           // chegou tarde: quem mandou depois manda
  if (!document.getElementById('par-previa')) return;
  if (error) {
    const e = document.getElementById('par-erro');
    if (e) {
      e.textContent = 'Não consegui simular: ' + error.message
        + ' — os números acima podem estar desatualizados. Mexa em qualquer campo para tentar de novo.';
      e.style.color = 'var(--erro)'; e.style.display = 'block';
    }
    return;
  }
  const e0 = document.getElementById('par-erro');
  if (e0) e0.style.display = 'none';
  const linhas = data || [];
  // `startsWith`, não igualdade: o banco marca a 1ª parcela e a fatia
  // final com um sufixo ("seria criada · 1º mês"). Comparando exato,
  // justo as duas proporcionais ficariam fora da contagem e dos totais.
  const novas = linhas.filter(x => String(x.situacao || '').startsWith('seria criada'));
  document.getElementById('par-btn').disabled = !novas.length;
  if (!linhas.length) { alvo.innerHTML = '<p class="cp-vazio">Nada a gerar.</p>'; return; }

  const soma = f => novas.reduce((a, x) => a + (Number(x[f]) || 0), 0);

  /* O AVISO DO RETROATIVO.
   *
   * Parcela de mês passado nasce Aberta e vencida — vai direto para o
   * painel "Precisa de você" cobrando multa e juros. Num contrato
   * lançado com a data de início errada isso são dezenas de cobranças
   * de aluguéis que já foram pagos, e quem gerou não tem como saber
   * antes de clicar. O número aparece ANTES do botão, não depois. */
  const atrasadas = novas.filter(x => x.etapa === 'Aberta'
                                   && new Date(x.vencimento + 'T12:00') < new Date());
  const aviso = atrasadas.length ? `
    <div class="cp-aviso">
      <b>${atrasadas.length} parcela(s) nascem já vencidas</b>, somando
      ${moeda(atrasadas.reduce((a, x) => a + (Number(x.aluguel) || 0), 0))} —
      a mais antiga vence em ${htm(dataBr(atrasadas[0].vencimento))}.
      Elas entram no painel de cobrança como atrasadas.
      Se esses aluguéis já foram pagos, confira a data de início do contrato
      antes de gerar.
    </div>` : '';

  /* v1.221 — O BOLETO DO INQUILINO ENTRA NA PRÉVIA.
   *
   * Até aqui a prévia só falava do proprietário: aluguel, taxa e
   * repasse. Quem gerava não via o número que o inquilino ia receber —
   * foi assim que o CON-0059 nasceu com R$ 189,40 numa parcela de três
   * dias e ninguém percebeu antes de gerar.
   *
   * Os itens de cada mês são calculados aqui, com `itemVigenteNoMes`,
   * que é a MESMA função do cartão "Itens da cobrança" — não uma
   * segunda regra escrita de novo. Na parcela do último mês, o item
   * marcado como proporcional acompanha o aluguel pela razão entre o
   * aluguel proporcional e o cheio: é assim que o banco corta os dois,
   * dias ÷ 30, sem eu ter que redescobrir a data de fim aqui. */
  const itensDoMes = (mes, razao) => itensContrato
    .filter(it => it.ativo && itemVigenteNoMes(it, mes))
    .reduce((a, it) => {
      const v = (it.ultimo_mes_proporcional && razao < 1)
        ? Math.round(Number(it.valor || 0) * razao * 100) / 100
        : Number(it.valor || 0);
      return a + (it.credito ? -v : v);
    }, 0);

  const cheio = Number(registro.valor_aluguel) || 0;
  const ultimoI = linhas.length - 1;
  const razaoDaLinha = (x, i) => (i === ultimoI && cheio > 0)
    ? Math.min(1, (Number(x.aluguel) || 0) / cheio) : 1;

  // a parcela que JÁ existe: o valor gravado é a verdade, não a conta
  // de agora. `gravada` também diz se a regra de hoje daria outra coisa
  // — é a lista do que o botão ↻ mudaria.
  const gravada = mes => (mesesContrato || []).find(p => mesISO(p.competencia) === mes) || null;

  const dados = linhas.map((x, i) => {
    const mes = mesISO(x.competencia);
    const nova = String(x.situacao || '').startsWith('seria criada');
    const itensCalc = itensDoMes(mes, razaoDaLinha(x, i));
    if (nova) return { x, nova, itens: itensCalc, boleto: (Number(x.aluguel) || 0) + itensCalc };
    const g = gravada(mes);
    if (!g) return { x, nova, itens: null, boleto: null };
    const difere = Number(g.valor_aluguel) !== Number(x.aluguel)
                || Math.abs(Number(g.valor_itens || 0) - itensCalc) >= 0.01;
    return { x, nova, itens: Number(g.valor_itens || 0),
             boleto: Number(g.valor_total), difere };
  });

  /* v1.229 — A COLUNA DA TAXA DE CONTRATO SÓ APARECE QUANDO EXISTE.
   *
   * Com ela seriam SEIS colunas de dinheiro na mesma linha (aluguel,
   * itens, boleto, taxa de contrato, taxa adm., repasse) e a tabela
   * deixaria de ser legível. Ela vale para uma ou duas parcelas, e só
   * em contrato que retém — então aparece nesses e some nos outros.
   * É a exceção que eu recusei para "Itens" na v1.221, e aqui ela se
   * justifica: lá a coluna valia para todo mês de todo contrato.
   *
   * E quando ela entra, "Itens" sai: seis colunas de dinheiro na mesma
   * linha cortam a data e quebram a situação — testei. Itens é o lado
   * do inquilino e já está somado em "Boleto"; a taxa de contrato é o
   * lado do proprietário e não está somada em lugar nenhum. Sem ela,
   * aluguel − taxa não fecharia com o repasse. */
  const temTC = linhas.some(x => (Number(x.taxa_contrato) || 0) > 0);
  const somaTC = dados.filter(d => d.nova)
    .reduce((a, d) => a + (Number(d.x.taxa_contrato) || 0), 0);

  const somaItens  = dados.filter(d => d.nova).reduce((a, d) => a + d.itens, 0);
  const somaBoleto = dados.filter(d => d.nova).reduce((a, d) => a + d.boleto, 0);
  const dinheiro = v => v === null ? '—' : moeda(v);

  alvo.innerHTML = aviso + avisoDosItens(linhas) + `
    <div class="cp-resumo">
      <span><b>${novas.length}</b> a criar</span>
      <span><b>${linhas.length - novas.length}</b> já existem</span>
      <span><b>${moeda(soma('aluguel'))}</b> de aluguel</span>
      <span><b>${moeda(somaItens)}</b> de itens</span>
      <span><b>${moeda(somaBoleto)}</b> nos boletos do inquilino</span>
      ${temTC ? `<span><b>${moeda(somaTC)}</b> de taxa de contrato</span>` : ''}
      <span><b>${moeda(soma('taxa'))}</b> de taxa mensal</span>
      <span><b>${moeda(soma('repasse'))}</b> a repassar</span>
    </div>
    <div class="cp-cab">
      <span class="cp-p">Nº</span>
      <span class="cp-im">Vence</span>
      <span class="cp-v">Aluguel</span>
      ${temTC ? '' : '<span class="cp-v cp-i">Itens</span>'}
      <span class="cp-v">Boleto</span>
      ${temTC ? '<span class="cp-v">Taxa contrato</span>' : ''}
      <span class="cp-v">Taxa mensal</span>
      <span class="cp-v">Repasse</span>
      <span class="cp-s"></span>
    </div>
    <div class="cp-previa">
      ${dados.map(d => `<div class="cp-linha ${d.nova ? '' : 'ja'}">
        <span class="cp-p">${d.x.parcela}</span>
        <span class="cp-im">${htm(dataBr(d.x.vencimento))}
          <span class="tag ${d.x.etapa === 'Prevista' ? 'tag-prev' : 'tag-azul'}">${htm(d.x.etapa)}</span></span>
        <span class="cp-v">${moeda(d.x.aluguel)}</span>
        ${temTC ? '' : `<span class="cp-v cp-i">${d.itens === null ? '—'
          : (d.itens ? (d.itens > 0 ? '+ ' : '− ') + moeda(Math.abs(d.itens)) : '—')}</span>`}
        <span class="cp-v cp-b">${dinheiro(d.boleto)}</span>
        ${temTC ? `<span class="cp-v cp-t">${(Number(d.x.taxa_contrato) || 0) > 0
          ? '− ' + moeda(d.x.taxa_contrato) : '—'}</span>` : ''}
        <span class="cp-v cp-t">− ${moeda(d.x.taxa)}</span>
        <span class="cp-v cp-r">${moeda(d.x.repasse)}</span>
        <span class="cp-s">${d.difere ? 'o ↻ mudaria'
          : htm(String(d.x.situacao || '').replace('seria criada', '').replace(/^ · /, ''))}</span>
      </div>`).join('')}
    </div>`;
}

/**
 * v1.221 — O AVISO DO ITEM NO MÊS ERRADO.
 *
 * As colunas da v1.220 deixam escolher o mês de cada item; faltava o
 * sistema dizer quando a escolha não faz sentido. Dois casos, os dois
 * vistos na prática:
 *
 *  · item inteiro caindo na 1ª parcela, que é proporcional aos dias —
 *    é literalmente o CON-0059 (fiança de R$ 102,50 dentro de um
 *    boleto de 3 dias de aluguel);
 *  · item que começa fora do período do contrato, ou cujas N parcelas
 *    terminam antes da 1ª competência. Esse nunca vira dinheiro, e
 *    hoje isso acontece em silêncio absoluto.
 */
function avisoDosItens(linhas) {
  if (!linhas.length || !itensContrato.length) return '';
  const meses = linhas.map(x => mesISO(x.competencia)).filter(Boolean);
  if (!meses.length) return '';
  const primeiro = meses[0];
  const ultimo = meses[meses.length - 1];
  const cheio = Number(registro.valor_aluguel) || 0;
  const proporcional = cheio > 0 && (Number(linhas[0].aluguel) || 0) < cheio - 0.005;

  const naPrimeira = [];
  const nunca = [];
  itensContrato.filter(it => it.ativo).forEach(it => {
    const ini = mesISO(it.inicio_competencia);
    if (!ini) return;
    if (proporcional && ini === primeiro) naPrimeira.push(it);
    else if (ini > ultimo || !meses.some(m => itemVigenteNoMes(it, m))) nunca.push(it);
  });
  if (!naPrimeira.length && !nunca.length) return '';

  const nomes = lista => lista.map(it => htm(it.nome)).join(', ');
  return `<div class="cp-aviso">
    ${naPrimeira.length ? `<b>${nomes(naPrimeira)}</b> ${naPrimeira.length > 1 ? 'entram' : 'entra'}
      inteiro${naPrimeira.length > 1 ? 's' : ''} na 1ª parcela, que é proporcional
      (${moeda(linhas[0].aluguel)} de aluguel). O normal é o item começar no primeiro
      boleto cheio — mude o mês na tabela acima se for o caso.` : ''}
    ${naPrimeira.length && nunca.length ? '<br><br>' : ''}
    ${nunca.length ? `<b>${nomes(nunca)}</b> ${nunca.length > 1 ? 'começam' : 'começa'}
      fora do período deste contrato e não ${nunca.length > 1 ? 'serão cobrados' : 'será cobrado'}
      em nenhuma parcela.` : ''}
  </div>`;
}

async function gerarParcelas() {
  if (!confirm('Gerar as parcelas deste contrato?\n\nElas passam a existir de verdade e ' +
      'entram na previsão de caixa.')) return;
  const bt = document.getElementById('par-btn');
  bt.disabled = true; bt.textContent = 'Gerando…';
  const { data, error } = await sb.rpc('gerar_competencias_do_contrato',
    { p_contrato_id: ID, p_simular: false, p_dias_minimos: diasMinimosParcela() });
  bt.disabled = false; bt.textContent = 'Gerar de verdade';
  const e = document.getElementById('par-erro');
  if (error) { e.textContent = 'Não consegui: ' + error.message;
               e.style.color = 'var(--erro)'; e.style.display = 'block'; return; }
  // v1.316 — DEU CERTO, A JANELA SAI DE CENA.
  //
  // Antes ela ficava aberta e a prévia se refazia sozinha, virando
  // "0 a criar · 30 já existem" — uma tela que parece travada, porque o
  // botão continua ali dizendo "Gerar de verdade" e não faz mais nada.
  // Pior: a ficha atrás continuava mostrando "Aluguéis deste contrato
  // (0)", e a única saída era recarregar na mão.
  //
  // Agora a janela fecha e a ficha se recarrega — que é o que a pessoa
  // faria a seguir, sem exceção.
  const quantas = (data || []).length;
  e.textContent = quantas + ' parcela(s) criada(s).';
  e.style.color = 'var(--verde-escuro)'; e.style.display = 'block';

  const janela = document.getElementById('janela-parcelas');
  if (janela) janela.classList.remove('aberto');
  await carregarFicha();
}

/* O REAJUSTE TEM UM DONO SÓ.
 *
 * Aqui existiu, por algumas horas, um segundo `abrirReajuste` — um modal
 * novo que chamava a função `aplicar_reajuste` do banco. Só que
 * `abrirReajuste` JÁ EXISTIA neste arquivo (ver `_abrirReajuste`), e a
 * linha `window.abrirReajuste = protegida(...)` roda no carregamento e
 * sobrescreve a declaração. O botão continuaria chamando o fluxo antigo
 * e o modal novo seria código morto — sem erro, sem aviso.
 *
 * O fluxo antigo ficou porque faz mais: grava data, percentual e
 * observação na tabela de reajustes, que é o que alimenta o cartão
 * "Reajustes" da ficha. O modal novo não gravava nada disso — se ele
 * tivesse vencido, o cartão pararia de crescer em silêncio.
 *
 * O que faltava nele — atualizar as competências previstas — foi para
 * dentro de `_abrirReajuste`. */



/**
 * v1.229 — A TAXA DE CONTRATO, COM SALDO.
 *
 * "O primeiro aluguel fica com a imobiliária" nunca foi um sim/não: é
 * um percentual de um aluguel cheio, e a 1ª parcela quase sempre é
 * proporcional e não cobre o combinado. O modelo velho zerava o repasse
 * do 1º mês e o que faltava SE PERDIA — no CON-0063 foram R$ 532 no
 * lugar de R$ 798, sem ninguém ver.
 *
 * Agora o que falta desce para o mês seguinte até quitar, e este bloco
 * é o extrato disso: quanto é, quanto já veio, quanto falta e quando.
 * Antes daqui existia uma frase de regra — "no 1º mês, não repassar" —
 * sem um número e sem dizer se já tinha sido cumprida.
 */
function blocoTaxaDeContrato() {
  const r = registro;
  const aluguel = Number(r.valor_aluguel) || 0;
  const pct = Number(r.taxa_contrato_percentual) || 0;
  const total = Math.round(aluguel * pct * 100) / 100;
  const bt = `<button class="btn btn-claro" data-perm="contratos:editar"
      style="padding:4px 10px;font-size:12px;margin-left:8px"
      onclick="abrirTaxaDeContrato()">✎ Taxa de contrato</button>`;

  if (!total || taxaContratoParcela === null || taxaContratoParcela === undefined)
    return `<div class="rg-primeiro">
      <b>Taxa de contrato:</b> ${total
        ? `${moeda(total)} — <b>não descontada pelo sistema</b>, acertada por fora.`
        : 'não cobrada neste contrato.'} ${bt}</div>`;

  const retido = taxaContratoRetencoes.reduce((a, x) => a + (Number(x.taxa_contrato_retida) || 0), 0);
  const falta = Math.round((total - retido) * 100) / 100;
  const pctBarra = total > 0 ? Math.min(100, Math.round(retido / total * 100)) : 0;
  const meses = taxaContratoRetencoes
    .map(x => mesCurto(x.competencia)).filter(Boolean).join(' · ');

  // qual parcela ainda vai completar o saldo — a primeira prevista/aberta
  // que ainda não recebeu retenção
  const proxima = falta > 0.004
    ? (mesesContrato || []).filter(m => ['Prevista', 'Aberta', 'Cobrada'].includes(m.etapa)
        && !taxaContratoRetencoes.some(x => x.competencia === m.competencia))
        .sort((x, y) => String(x.competencia).localeCompare(String(y.competencia)))[0]
    : null;

  return `<div class="rg-primeiro">
    <b>Taxa de contrato: ${moeda(total)}</b> —
    ${Math.round(pct * 100)}% de um aluguel, descontada dos repasses
    a partir da <b>${taxaContratoParcela}ª parcela</b>. ${bt}
    <div class="tx-barra"><i style="width:${pctBarra}%"></i></div>
    <div style="font-size:12.5px;line-height:1.6">
      ${retido > 0
        ? `${moeda(retido)} já retidos${meses ? ' em <b>' + htm(meses) + '</b>' : ''}`
        : 'Nada retido ainda'}
      ${falta > 0.004
        ? ` · faltam <b>${moeda(falta)}</b>${proxima
            ? `, previstos para <b>${htm(dataBr(proxima.vencimento))}</b>` : ''}`
        : ' · <b>quitada</b>'}
    </div>
  </div>`;
}

/**
 * As duas decisões juntas, porque só fazem sentido juntas: quanto a
 * imobiliária fica e a partir de quando ela começa a tirar.
 */
async function _abrirTaxaDeContrato() {
  const NAO = 'Não descontar — acertada por fora';
  const P1  = 'No 1º aluguel — o que faltar desce para o próximo';
  const P2  = 'No 2º aluguel — de uma vez só';
  const atual = taxaContratoParcela === 1 ? P1 : (taxaContratoParcela === 2 ? P2 : NAO);
  const pctAtual = registro.taxa_contrato_percentual != null
    ? parseFloat((Number(registro.taxa_contrato_percentual) * 100).toFixed(4)) : '';

  abrirAcao('Taxa de contrato', [
    { n: 'pct', r: 'Percentual de um aluguel (%)', t: 'numero', v: pctAtual,
      dica: 'digite 60 para 60%' },
    { n: 'quando', r: 'Começa a descontar', t: 'select', largo: true,
      op: [P1, P2, NAO], v: atual },
    { n: 'nota', t: 'aviso', r: 'O valor é sempre um percentual do aluguel CHEIO, mesmo '
      + 'quando a 1ª parcela é proporcional. O que não couber num mês desce para o '
      + 'seguinte, até quitar. Escolha "não descontar" quando a taxa foi combinada '
      + 'fora do sistema — é como os contratos antigos estão.' }
  ], async () => {
    const n = valorAcao('pct') === null ? null : Number(valorAcao('pct'));
    erroSe(n !== null && (!Number.isFinite(n) || n < 0 || n > 100),
      'O percentual vai de 0 a 100.');
    const quando = valorAcao('quando');
    const { error } = await sb.from('contratos').update({
      taxa_contrato_percentual: n === null ? null : n / 100,
      taxa_contrato_parcela: quando === P1 ? 1 : (quando === P2 ? 2 : null)
    }).eq('id', ID);
    if (error) throw error;
  }, '✓ Salvar');

  // o valor em reais aparece enquanto digita — é o número que importa
  const el = elementoAcao('pct');
  const nota = elementoAcao('nota');
  const mostrar = () => {
    const n = Number(el.value);
    const aluguel = Number(registro.valor_aluguel) || 0;
    if (nota) nota.textContent = (Number.isFinite(n) && n > 0 && aluguel)
      ? `= ${moeda(Math.round(aluguel * n) / 100)} — ${n}% de ${moeda(aluguel)}, `
        + 'descontados dos repasses até quitar.'
      : 'O valor é sempre um percentual do aluguel CHEIO, mesmo quando a 1ª parcela '
        + 'é proporcional. O que não couber num mês desce para o seguinte.';
  };
  if (el) { el.oninput = mostrar; mostrar(); }
}

function blocoRegrasDinheiro() {
  const r = registro;
  const aluguel = Number(r.valor_aluguel) || 0;
  if (!aluguel) return '';

  const taxaMes = (r.taxa_adm_efetiva !== null && r.taxa_adm_efetiva !== undefined)
    ? Number(r.taxa_adm_efetiva) : null;
  const pct = r.taxa_adm_efetiva_percentual;
  const contrato = Number(r.taxa_contrato_valor) ||
    (aluguel * (Number(r.taxa_contrato_percentual) || 0));

  const COB = { proporcional: 'proporcional aos dias', integral: 'integral', metade: 'metade' };
  const REP = { nao: 'não repassa', integral: 'repassa normalmente', metade: 'repassa metade' };

  const linha = (t, v, cor) =>
    `<tr><td>${t}</td><td class="${cor || ''}">${v}</td></tr>`;

  return `<div class="cartao">
    <h2>O que este contrato deixa
      ${r.taxa_adm_negociada
        ? '<span class="tag tag-azul">taxa negociada neste contrato</span>'
        : '<span class="cnt">taxa herdada do imóvel</span>'}</h2>
    <div class="corpo">
      <table class="rg-conta">
        ${linha('Aluguel', moeda(aluguel))}
        ${contrato ? linha('Taxa de contrato — uma vez, na assinatura', moeda(contrato)) : ''}
        ${taxaMes !== null
          ? linha('Taxa Mensal — por mês' +
              (pct ? ' (' + (Number(pct) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%)' : ''),
              moeda(taxaMes))
          : linha('Taxa Mensal', '<span class="rg-falta">não cadastrada</span>', 'falta')}
        <tr class="rg-tot"><td><b>Por mês, para a Moralí</b></td>
          <td>${taxaMes !== null ? moeda(taxaMes) : '—'}</td></tr>
      </table>

      <div class="rg-primeiro">
        <b>No primeiro mês:</b> cobrar
        <b>${htm(COB[r.primeiro_mes_cobranca] || r.primeiro_mes_cobranca || '—')}</b>
        do inquilino.
      </div>

      ${blocoTaxaDeContrato()}

      ${acoesParcelasContrato()}

      ${taxaMes === null ? `<p class="rg-aviso">Sem taxa de administração, o repasse deste
        contrato não tem como ser calculado. Preencha no imóvel (vale para todos os contratos
        dele) ou aqui (vale só para este).</p>` : ''}
    </div>
  </div>`;
}

/** v1.270 — os botões de parcelas, num lugar só: o cartão "O que este
 *  contrato deixa" e o cartão novo do dinheiro mostram os mesmos. */
function acoesParcelasContrato() {
  return `<div class="rg-acoes">
        <button class="btn" data-perm="competencias:criar"
                onclick="abrirGerarParcelas()">Gerar as parcelas do contrato</button>
        <button class="btn btn-claro" data-perm="contratos:ver"
                onclick="abrirMultaRescisoria()">Multa rescisória</button>
        ${recalculaveisDoContrato().length ? `
        <button class="btn btn-claro" data-perm="competencias:editar"
                onclick="recalcularParcelasEmAberto()"
                title="Refaz aluguel, taxa, repasse e itens das parcelas que ainda não foram recebidas"
                >↻ Recalcular ${recalculaveisDoContrato().length} parcela(s) em aberto</button>`
        /* v1.256 — contrato com tudo recebido e nada repassado não tinha
           botão nenhum, e é exatamente o contrato em que a devolução ao
           proprietário precisa entrar. Aí o mesmo botão troca de nome. */
        : (temRepasseRecorrente() && parcelasSemRepasse().length ? `
        <button class="btn btn-claro" data-perm="competencias:editar"
                onclick="recalcularParcelasEmAberto()"
                title="Refaz as linhas que voltam ao proprietário nas parcelas ainda não repassadas"
                >↻ Acertar o repasse de ${parcelasSemRepasse().length} parcela(s)</button>` : '')}
        ${temParcelasParaCancelar() ? `
        <button class="btn btn-claro" data-perm="competencias:editar"
                onclick="abrirCancelarAposFim()"
                title="Cancela os aluguéis que ficaram para depois do fim do contrato"
                >✕ Cancelar parcelas depois do encerramento</button>` : ''}
      </div>
      <p class="rg-nota-acoes">Gerar cria um aluguel por mês de contrato — é o que
        permite a previsão de caixa. Os meses futuros nascem como <b>previsão</b> e se
        recalculam sozinhos até chegar a vez deles.</p>`;
}

// ============================================================
// v1.270 — O COCKPIT DA FICHA DO CONTRATO (mockup aprovado 14/08/2026)
// Três peças novas: a faixa "quem é quem" no destaque, o cartão
// "O dinheiro deste contrato" (funde Taxas + O que este contrato
// deixa + Receitas + resumo dos itens) e o radar "Pede atenção".
// Os cartões antigos continuam existindo — quem quiser algum de
// volta, devolve pelo editor de layout.
// ============================================================

/** a faixa "quem é quem": imóvel, inquilino e proprietário, com link e
 *  WhatsApp. Vive dentro do destaque, acima dos indicadores. */
function faixaPartesContrato() {
  if (ALVO !== 'contrato') return '';
  // v1.353 — o 💬 abre a CAIXA FIXA (estilo Salesforce), não mais o
  // wa.me: a conversa acontece pelo número da imobiliária, registrada,
  // sem sair da ficha do contrato. Por isso recebe a PESSOA inteira.
  const zap = p => {
    const d = String((p && p.telefone) || '').replace(/\D/g, '');
    if (d.length < 10) return '';
    return `<button class="zap" title="Conversar aqui do lado, pelo WhatsApp da Moralí"
      onclick="abrirChatFixo('${registro.empresa_id}','${(p && p.id) || ''}','','${
      jsq((p && p.nome) || '')}','${d}')">${icone('balao', 14)}</button>`;
  };
  // v1.271 — o dono é o do IMÓVEL (a view do contrato não o entrega)
  const propId = registro.proprietario_id
    || (imovelDoContrato && imovelDoContrato.proprietario_id) || null;
  const pInq = pessoasContrato.find(c => c.id === registro.inquilino_id) || null;
  const pProp = propId ? (pessoasContrato.find(c => c.id === propId) || null) : null;
  const im = imovelDoContrato;
  const subImovel = [im && im.bairro, im && im.tipo, im && im.codigo]
    .filter(Boolean).map(htm).join(' · ');
  const parte = (icone, cor, rotulo, nomeHtml, sub, zapHtml) => `
    <div class="fcc-parte">
      <div class="ico ${cor}">${icone}</div>
      <div style="min-width:0">
        <span class="r">${rotulo}</span>
        <div class="v">${nomeHtml}</div>
        ${sub ? `<div class="sub2">${sub}</div>` : ''}
      </div>
      ${zapHtml || ''}
    </div>`;
  return `<div class="fcc-partes">
    ${parte(icone('casa', 16), 'obj-imoveis', 'Imóvel',
      registro.imovel_id
        ? `<a href="imovel.html?id=${registro.imovel_id}">${htm(registro.imovel_endereco || 'ver imóvel')}</a>`
        : htm(registro.imovel_endereco || '—'),
      subImovel)}
    ${parte(icone('chave', 16), 'obj-contatos', 'Inquilino',
      registro.inquilino_id
        ? `<a href="contato.html?id=${registro.inquilino_id}">${htm(registro.inquilino_nome || 'ver contato')}</a>`
        : htm(registro.inquilino_nome || '—'),
      pInq && pInq.telefone
        ? htm(mascaraTelefone(pInq.telefone)) + botaoCopiarDigitos(pInq.telefone, 'o telefone')
        : '',
      zap(pInq))}
    ${parte(icone('pessoa', 16), 'obj-contatos', 'Proprietário',
      propId
        ? `<a href="contato.html?id=${propId}">${
            htm((pProp && pProp.nome) || registro.proprietario_nome || 'ver contato')}</a>`
        : htm(registro.proprietario_nome || '—'),
      pProp && pProp.telefone
        ? htm(mascaraTelefone(pProp.telefone)) + botaoCopiarDigitos(pProp.telefone, 'o telefone')
        : '',
      zap(pProp))}
  </div>`;
}

/** v1.448 — A LINHA DA VIDA (mockup aprovado em 30/08/2026): início e
 *  fim em letra grande nas pontas, a bolinha marcando hoje (mês N de M)
 *  e o tracinho âmbar do próximo reajuste. As datas moravam miúdas no
 *  subtítulo — era a reclamação: "difícil achar quando o contrato
 *  começou". Vive no destaque, entre o quem-é-quem e as caixas do
 *  agora. Contrato encerrado mostra a barra cheia e a data real do fim;
 *  sem data de fim, ficam só as duas pontas. */
function faixaVidaContrato() {
  if (ALVO !== 'contrato') return '';
  const r = registro;
  if (!r.data_inicio) return '';
  const dia = s => new Date(String(s).slice(0, 10) + 'T12:00');
  const ini = dia(r.data_inicio);
  const hoje = dia(hojeISO());
  const encerrado = r.status === 'Encerrado';
  const fimISO = encerrado ? (r.data_encerramento || r.data_fim_prevista) : r.data_fim_prevista;
  const fim = fimISO ? dia(fimISO) : null;

  const mesesEntre = (a, b) => (b.getFullYear() - a.getFullYear()) * 12
    + (b.getMonth() - a.getMonth()) + (b.getDate() >= a.getDate() ? 0 : -1);
  const emMeses = m => m < 1 ? 'menos de 1 mês'
    : m < 12 ? `${m} ${m === 1 ? 'mês' : 'meses'}`
    : `${Math.floor(m / 12)} ${Math.floor(m / 12) === 1 ? 'ano' : 'anos'}`
      + (m % 12 ? ` e ${m % 12} ${m % 12 === 1 ? 'mês' : 'meses'}` : '');

  // mês N de M — a mesma conta que morava no subtítulo (v1.270)
  const n = mesesEntre(ini, hoje) + 1;
  const prazo = Number(r.prazo_meses) || 0;
  const rotuloHoje = encerrado ? ''
    : (n >= 1 && prazo && n <= prazo ? `hoje · mês ${n} de ${prazo}` : 'hoje');

  const pontaIni = `<div class="ponta"><span class="r">Início do contrato</span>
    <div class="v">${dataBr(r.data_inicio)}</div>
    <div class="d">${hoje >= ini ? 'há ' + emMeses(mesesEntre(ini, hoje)) : 'ainda não começou'}</div></div>`;

  if (!fim || fim <= ini) return `<div class="fcc-vida"><div class="fcc-vida-linha sem-barra">
    ${pontaIni}
    <div class="ponta fim"><span class="r">Fim previsto</span><div class="v">—</div>
      <div class="d">sem data de fim cadastrada</div></div>
  </div></div>`;

  const total = fim - ini;
  const pctDe = d => Math.max(2, Math.min(98, Math.round((d - ini) / total * 100)));
  const pctHoje = hoje <= ini ? 2 : (hoje >= fim ? 98 : pctDe(hoje));

  // o tracinho do reajuste — só quando cai dentro da vigência
  const reaj = (!encerrado && r.proximo_reajuste) ? dia(r.proximo_reajuste) : null;
  const marcoReajuste = (reaj && reaj > ini && reaj < fim) ? `
      <div class="marco" style="left:${pctDe(reaj)}%"></div>
      <span class="marco-rotulo" style="left:${pctDe(reaj)}%">reajuste${
        r.indice_reajuste ? ' ' + htm(r.indice_reajuste) : ''} · ${dataBr(r.proximo_reajuste)}</span>` : '';

  const pontaFim = encerrado
    ? `<div class="ponta fim"><span class="r">Encerrado em</span>
        <div class="v">${dataBr(fimISO)}</div>
        <div class="d">durou ${emMeses(mesesEntre(ini, fim))}</div></div>`
    : `<div class="ponta fim"><span class="r">Fim previsto</span>
        <div class="v">${dataBr(fimISO)}</div>
        <div class="d">${hoje < fim ? 'faltam ' + emMeses(mesesEntre(hoje, fim)) : 'prazo vencido'}${
          prazo ? ' · prazo ' + prazo + ' meses' : ''}</div></div>`;

  return `<div class="fcc-vida"><div class="fcc-vida-linha">
    ${pontaIni}
    <div class="fcc-vida-barra">
      ${rotuloHoje ? `<span class="hoje-rotulo" style="left:${pctHoje}%">${rotuloHoje}</span>` : ''}
      <div class="trilho"></div>
      <div class="cheio" style="width:${encerrado ? 100 : pctHoje}%"></div>
      ${encerrado ? '' : `<div class="hoje" style="left:${pctHoje}%"></div>`}
      ${marcoReajuste}
    </div>
    ${pontaFim}
  </div></div>`;
}

/** O DINHEIRO DESTE CONTRATO — as três respostas (inquilino paga ·
 *  Moralí fica · proprietário recebe), a sobra explicada, a taxa de
 *  contrato com a barra e as ações de parcelas. */
function cartaoDinheiroContrato() {
  if (ALVO !== 'contrato') return '';
  const r = registro;
  const aluguel = Number(r.valor_aluguel) || 0;
  if (!aluguel) return '';

  const taxaMes = (r.taxa_adm_efetiva !== null && r.taxa_adm_efetiva !== undefined)
    ? Number(r.taxa_adm_efetiva) : null;
  const pct = r.taxa_adm_efetiva_percentual;
  const mesAtual = hojeISO().slice(0, 7);
  const boletoMes = aluguel + somaItensNoMes(mesAtual);
  const boletoSeguinte = aluguel + somaItensNoMes(mesSeguinte(mesAtual));
  const repasse = taxaMes !== null ? Math.round((aluguel - taxaMes) * 100) / 100 : null;
  const itensDoMes = Math.round((boletoMes - aluguel) * 100) / 100;

  const COB = { proporcional: 'proporcional aos dias', integral: 'o mês inteiro',
    metade: 'metade do aluguel' };
  const rotTaxa = taxaMes === null ? 'não cadastrada'
    : (pct ? (Number(pct) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })
        + '% do aluguel' : 'valor fixo por mês');

  // as comissões numa linha só — v1.447: vêm da apólice VIGENTE, com o %
  // sobre o valor do seguro; editar é na própria apólice (✎ Corrigir)
  const _apsC = relacionados || [];
  const _vigC = re => _apsC.find(a => re.test(a.tipo || '') && a.status === 'Vigente')
    || _apsC.find(a => re.test(a.tipo || ''));
  const _apF = _vigC(/fian/i), _apI = _vigC(/inc[êe]nd/i);
  const _pctC = (c, b) => (c != null && Number(b) > 0)
    ? ` (${(c / b * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)` : '';
  // v1.448 — o rodapé virou 3 caixinhas lado a lado (era uma pilha de
  // 5 fileiras com muito vazio): Taxa de contrato · Comissões · 1º mês.
  const caixaComissoes = (typeof pode === 'function' && pode('comissoes', 'ver'))
    ? `<div class="fcc-din-box">
        <span class="r">Comissões da Moralí</span>
        <div class="v">${_apF && _apF.comissao != null
          ? moeda(_apF.comissao) + '<small>/mês</small>' : '—'}</div>
        <div class="d">fiança${_apF && _apF.comissao != null
            ? _pctC(_apF.comissao, _apF.valor_mensal) : ': —'}
          · incêndio: <b>${_apI && _apI.comissao != null
            ? moeda(_apI.comissao) + _pctC(_apI.comissao, _apI.valor_parcela) : '—'}</b>
          · setup: <b>${_apF && _apF.setup != null ? moeda(_apF.setup) : '—'}</b></div>
      </div>` : '';

  // a mesma conta do blocoTaxaDeContrato (que segue servindo o cartão
  // antigo "O que este contrato deixa"), vestida de caixinha
  const caixaTaxa = (() => {
    const pctTx = Number(r.taxa_contrato_percentual) || 0;
    const totalTx = Math.round(aluguel * pctTx * 100) / 100;
    const btTx = `<button class="lapis-caixa" data-perm="contratos:editar"
      title="Editar a taxa de contrato" onclick="abrirTaxaDeContrato()">✎</button>`;
    if (!totalTx || taxaContratoParcela === null || taxaContratoParcela === undefined)
      return `<div class="fcc-din-box destacada"><span class="r">Taxa de contrato ${btTx}</span>
        <div class="v">${totalTx ? moeda(totalTx) : 'não cobrada'}</div>
        <div class="d">${totalTx
          ? '<b>não descontada pelo sistema</b> — acertada por fora'
          : 'nenhuma taxa combinada neste contrato'}</div></div>`;
    const retido = taxaContratoRetencoes.reduce((a, x) => a + (Number(x.taxa_contrato_retida) || 0), 0);
    const falta = Math.round((totalTx - retido) * 100) / 100;
    const pctBarra = totalTx > 0 ? Math.min(100, Math.round(retido / totalTx * 100)) : 0;
    const meses = taxaContratoRetencoes
      .map(x => mesCurto(x.competencia)).filter(Boolean).join(' · ');
    const proxima = falta > 0.004
      ? (mesesContrato || []).filter(m => ['Prevista', 'Aberta', 'Cobrada'].includes(m.etapa)
          && !taxaContratoRetencoes.some(x => x.competencia === m.competencia))
          .sort((x, y) => String(x.competencia).localeCompare(String(y.competencia)))[0]
      : null;
    return `<div class="fcc-din-box destacada"><span class="r">Taxa de contrato ${btTx}</span>
      <div class="v">${moeda(totalTx)}</div>
      <div class="d">${Math.round(pctTx * 100)}% de um aluguel · desde a ${taxaContratoParcela}ª parcela</div>
      <div class="tx-barra"><i style="width:${pctBarra}%"></i></div>
      <div class="d">${retido > 0
          ? `${moeda(retido)} retidos${meses ? ' em <b>' + htm(meses) + '</b>' : ''}`
          : 'nada retido ainda'}${
        falta > 0.004
          ? ` · faltam <b>${moeda(falta)}</b>${proxima
              ? ', previstos p/ <b>' + htm(dataBr(proxima.vencimento)) + '</b>' : ''}`
          : ' · <b>quitada</b>'}</div></div>`;
  })();

  const caixaPrimeiroMes = `<div class="fcc-din-box">
    <span class="r">No primeiro mês</span>
    <div class="v">${htm(COB[r.primeiro_mes_cobranca] || r.primeiro_mes_cobranca || '—')}</div>
    <div class="d">como o inquilino é cobrado no mês de entrada</div>
  </div>`;

  return `<div class="cartao">
    <h2>O dinheiro deste contrato
      ${r.taxa_adm_negociada
        ? '<span class="tag tag-azul">taxa negociada neste contrato</span>'
        : '<span class="cnt">taxa herdada do imóvel</span>'}
      <span class="dir">
        <button class="btn btn-claro" data-perm="contratos:ver"
          style="padding:4px 10px;font-size:12px"
          onclick="event.stopPropagation();abrirItensDoBoleto()">✎ Itens do boleto</button>
        <button class="btn btn-claro" data-perm="contratos:editar"
          style="padding:4px 10px;font-size:12px"
          onclick="event.stopPropagation();abrirTaxasContrato()">✎ Taxas</button>
      </span></h2>
    <div class="corpo">
      <div class="fcc-fluxo">
        <div class="fcc-caixa">
          <span class="r">O inquilino paga</span>
          <div class="v">${moeda(boletoMes)}<small>/mês</small></div>
          <div class="d">aluguel ${moeda(aluguel)} + itens do boleto${
            Math.abs(boletoSeguinte - boletoMes) > 0.004
              ? ` · <b>mês que vem: ${moeda(boletoSeguinte)}</b>` : ''}</div>
        </div>
        <div class="fcc-seta">→</div>
        <div class="fcc-caixa meio">
          <span class="r">A Moralí fica com</span>
          <div class="v">${taxaMes !== null ? moeda(taxaMes) + '<small>/mês</small>'
            : '<span class="rg-falta">—</span>'}</div>
          <div class="d">Taxa Mensal · ${htm(rotTaxa)}</div>
        </div>
        <div class="fcc-seta">→</div>
        <div class="fcc-caixa">
          <span class="r">O proprietário recebe</span>
          <div class="v">${repasse !== null ? moeda(repasse) + '<small>/mês</small>' : '—'}</div>
          <div class="d">aluguel − Taxa Mensal</div>
        </div>
      </div>
      ${itensDoMes > 0.004 ? `<div class="fcc-resto">Os <b>${moeda(itensDoMes)}</b> de itens
        do boleto deste mês não são receita nem repasse: seguem para quem cobra
        (seguradoras, banco) — o detalhe está em <b>✎ Itens do boleto</b>.</div>` : ''}

      <div class="fcc-din-rodape">${caixaTaxa}${caixaComissoes}${caixaPrimeiroMes}</div>

      <div class="fcc-din-acoes">${acoesParcelasContrato()}</div>

      ${taxaMes === null ? `<p class="rg-aviso">Sem taxa de administração, o repasse deste
        contrato não tem como ser calculado. Preencha no imóvel (vale para todos os contratos
        dele) ou aqui, em ✎ Taxas (vale só para este).</p>` : ''}
    </div>
  </div>`;
}

/**
 * PEDE ATENÇÃO — os prazos do contrato com o botão da ação do lado.
 * Vermelho a 30 dias, amarelo a 90; some quando resolvido.
 *
 * v1.310 — A RÉGUA DE PRAZO.
 *
 * Até aqui o cartão listava TODO prazo futuro, por mais distante que
 * fosse, e só trocava a cor. O efeito era o oposto do que o nome
 * promete: um contrato saudável e recém-reajustado mostrava
 * "Pede atenção (2)" para sempre, porque seguro e reajuste sempre
 * existem em algum ponto do futuro — e cartão que vive aceso é cartão
 * que a pessoa aprende a ignorar. (Achado no CON-0044: dois itens a
 * 359 dias.)
 *
 * Agora cada tipo de prazo tem uma antecedência a partir da qual entra
 * na lista, cadastrada em Administração → Configurações gerais
 * (`empresas.padroes`, por imobiliária). O que está além NÃO some:
 * desce para a linha "Mais adiante", sem contador e sem botão.
 *
 * Duas regras que não são configuráveis de propósito:
 *   - ATRASO não tem régua. Parcela vencida aparece sempre — régua
 *     nisso seria um jeito de esconder inadimplência sem querer.
 *   - Prazo JÁ VENCIDO (apólice fora da validade, contrato passado do
 *     fim previsto) também entra sempre, seja qual for a régua.
 */
function cartaoRadarContrato() {
  if (ALVO !== 'contrato') return '';
  const hoje = hojeISO();
  const diasAte = d => Math.round(
    (new Date(String(d).slice(0, 10) + 'T12:00') - new Date(hoje + 'T12:00')) / 86400000);
  const tagDe = d => {
    if (d < 0) return `<span class="tag tag-vermelha">${Math.abs(d)}d atrás</span>`;
    if (d <= 30) return `<span class="tag tag-vermelha">${d} dias</span>`;
    if (d <= 90) return `<span class="tag tag-amarela">${d} dias</span>`;
    return `<span class="tag tag-cinza">${d} dias</span>`;
  };
  // a régua da casa; `padraoDaCasa` (campos.js) já cai no de fábrica
  // sozinho. O `typeof` é para o caso de o campos.js não ter carregado.
  const regua = chave => {
    const v = (typeof padraoDaCasa === 'function') ? padraoDaCasa(chave) : null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : { radar_dias_seguro: 90,
      radar_dias_reajuste: 90, radar_dias_fim_contrato: 30 }[chave];
  };
  const itens = [];

  (mesesContrato || [])
    .filter(p => ['Aberta', 'Cobrada'].includes(p.etapa) && p.vencimento && p.vencimento < hoje)
    .forEach(p => itens.push({
      d: diasAte(p.vencimento), icone: icone('relogio', 16), limite: null,
      t: 'Aluguel de ' + htm(String(p.competencia || '').slice(0, 7).split('-').reverse().join('/')) + ' em atraso',
      q: 'venceu ' + htm(dataBr(p.vencimento)) + ' · ' + moeda(p.valor_total || 0),
      curto: 'aluguel de ' + htm(String(p.competencia || '').slice(0, 7).split('-').reverse().join('/')),
      quando: p.vencimento,
      bt: `<a class="btn btn-claro" href="competencia.html?id=${p.id}">Ver parcela</a>`
    }));

  relacionados
    .filter(a => a.status === 'Vigente' && a.fim_vigencia)
    .forEach(a => itens.push({
      d: diasAte(a.fim_vigencia), icone: icone('escudo', 16), limite: regua('radar_dias_seguro'),
      t: 'Renovar seguro — ' + htm(a.tipo || 'apólice'),
      q: htm([a.seguradora, 'vence ' + dataBr(a.fim_vigencia)].filter(Boolean).join(' · ')),
      curto: 'seguro ' + htm(a.tipo || ''),
      quando: a.fim_vigencia,
      bt: `<button class="btn btn-claro" data-perm="contratos:editar"
             onclick="abrirRenovarApolice('${a.id}')">↻ Renovar</button>`
    }));

  // v1.319 — o check-list cutuca aqui, e SÓ com o que é obrigatório.
  // `d: 0` põe a linha no topo de propósito: pendência de locação não
  // tem prazo futuro, é coisa de agora — e é a única do radar que se
  // resolve na própria ficha, dois cartões abaixo.
  const ckPend = checklistPendentes();
  if (ckPend.length)
    itens.push({
      // v1.385 — SEM TAG DE PRAZO. O `d: 0` existe só para pôr a linha
      // no topo; a tag lia esse zero como "vence hoje" e pintava de
      // vermelho, o que num contrato cadastrado hoje parece atraso. O
      // título já diz quantos faltam. E `ir` leva ao cartão que resolve.
      d: 0, icone: icone('prancheta', 16), limite: null,
      semTag: true, ir: 'cartao-checklist',
      t: 'Check-list ' + (listaDoChecklist() === 'encerramento'
                          ? 'do encerramento' : 'da locação')
         + ' — falta' + (ckPend.length > 1 ? 'm ' : ' ') + ckPend.length,
      q: ckPend.slice(0, 3).map(function (x) { return htm(x.i.texto.toLowerCase()); }).join(' · ')
         + (ckPend.length > 3 ? ' · …' : ''),
      curto: 'check-list (' + ckPend.length + ')',
      quando: hojeISO()
    });

  if (registro.status !== 'Encerrado' && registro.proximo_reajuste)
    itens.push({
      d: diasAte(registro.proximo_reajuste), icone: '＄',
      limite: regua('radar_dias_reajuste'),
      t: 'Aplicar reajuste' + (registro.indice_reajuste ? ' ' + htm(registro.indice_reajuste) : ''),
      q: 'aniversário em ' + htm(dataBr(registro.proximo_reajuste)),
      curto: 'reajuste' + (registro.indice_reajuste ? ' ' + htm(registro.indice_reajuste) : ''),
      quando: registro.proximo_reajuste,
      bt: `<button class="btn btn-claro" data-perm="contratos:editar"
             onclick="abrirReajuste()">Aplicar…</button>`
    });

  if (registro.status !== 'Encerrado' && registro.data_fim_prevista)
    itens.push({
      d: diasAte(registro.data_fim_prevista), icone: icone('bandeira', 16),
      limite: regua('radar_dias_fim_contrato'),
      t: 'Fim do contrato',
      q: htm(dataBr(registro.data_fim_prevista)) + ' · renovar ou encerrar',
      curto: 'fim do contrato',
      quando: registro.data_fim_prevista,
      bt: ''
    });

  itens.sort((a, b) => a.d - b.d);

  // vencido entra sempre; o resto só dentro da antecedência da casa
  const pede  = itens.filter(i => i.d < 0 || i.limite === null || i.d <= i.limite);
  const longe = itens.filter(i => pede.indexOf(i) < 0);

  const linhaLonge = longe.length
    ? `<div class="fcc-radar-longe">Mais adiante: ${longe
        .map(i => `<b>${i.curto}</b> ${htm(dataBr(i.quando))}`).join(' · ')}</div>`
    : '';

  return `<div class="cartao">
    <h2>Pede atenção <span class="cnt">(${pede.length})</span></h2>
    ${pede.length ? `<ul class="fcc-radar">
      ${pede.map(i => `<li${i.ir ? ` class="fcc-ir" onclick="irParaCartaoDaFicha('${i.ir}')"` : ''}>
        <div class="ico">${i.icone}</div>
        <div style="min-width:0"><b>${i.t}</b><span class="q">${i.q}</span></div>
        <!-- 24/08/2026 — o "|| vazio" existe porque só tres itens do
             radar tem botao (reajuste, seguro, fim do contrato). Nos
             outros, i.bt e indefinido, e o modelo imprimia a palavra
             undefined na tela, embaixo da tag de prazo. Aparecia
             sempre que o check-list da locacao entrava no radar. -->
        <div class="lado">${i.semTag ? '' : tagDe(i.d)}${i.bt || ''}</div>
      </li>`).join('')}
    </ul>
    <p class="fcc-radar-nota">Vermelho a 30 dias, amarelo a 90 — e some quando resolvido.</p>`
    : '<div class="fcc-radar-vazio">Tudo em dia ✓ — nenhum prazo pedindo atenção.</div>'}
    ${linhaLonge}
  </div>`;
}

/** a janela "Itens do boleto": a mesma tabela do cartão de itens, na
 *  moldura de janela padrão. Fechar não pergunta nada — cada linha
 *  grava na hora, como no cartão. */
function _abrirItensDoBoleto() {
  acaoAtual = async () => {};
  document.getElementById('modal-titulo').textContent =
    'Itens do boleto — ' + (registro.codigo || '') +
    (registro.imovel_endereco ? ' · ' + registro.imovel_endereco : '');
  // v1.272 — a MESMA janela serve as duas fichas: no contrato mostra os
  // itens da cobrança; na parcela, os itens daquele mês.
  const daParcela = ALVO === 'competencia';
  document.getElementById('modal-campos').innerHTML =
    `<div class="campo largo" style="margin:0">
       <div style="margin-bottom:10px">${daParcela
         ? (parcelaAceitaItem() ? `<button class="btn btn-claro" data-perm="competencias:editar"
             style="padding:6px 13px;font-size:12.5px"
             onclick="acrescentarItemDaParcela()">+ Acrescentar só neste mês</button>` : '')
         : `<button class="btn btn-claro" data-perm="contratos:editar"
             style="padding:6px 13px;font-size:12.5px"
             onclick="abrirItemContrato()">+ Acrescentar item</button>`}</div>
       ${daParcela ? mioloItensDaParcela() : mioloItensContrato()}
     </div>`;
  document.getElementById('modal-erro').style.display = 'none';
  const b = document.getElementById('btn-salvar');
  b.textContent = 'Fechar';
  b.setAttribute('onclick', 'fecharModal()');
  b.disabled = false;
  document.getElementById('modal').classList.add('aberto');
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

/** a janela "Taxas" — as regras de dinheiro editáveis num lugar só */
function _abrirTaxasContrato() {
  const BASE_R = { aluguel: 'Só o aluguel', aluguel_encargos: 'Aluguel + encargos' };
  const i = imovelDoContrato;
  const doImovel = i && i.taxa_adm_percentual != null
    ? (i.taxa_adm_percentual * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%'
    : (i && i.taxa_adm_valor != null ? moeda(i.taxa_adm_valor) : 'nenhuma');
  abrirAcao('Taxas deste contrato', [
    { n: 'pct', r: 'Taxa Mensal deste contrato (%)', t: 'numero',
      v: registro.taxa_adm_percentual != null
        ? parseFloat((Number(registro.taxa_adm_percentual) * 100).toFixed(4)) : '',
      dica: 'vazio = usa a taxa do imóvel' },
    { n: 'minimo', r: 'Taxa Mensal mínima (R$)', t: 'moeda',
      v: registro.taxa_adm_minimo != null ? registro.taxa_adm_minimo : '' },
    { n: 'fixo', r: 'Taxa Mensal fixa (R$)', t: 'moeda',
      v: registro.taxa_adm_valor != null ? registro.taxa_adm_valor : '',
      dica: 'só quando não há percentual' },
    { n: 'base', r: 'A taxa incide sobre', t: 'select',
      op: [BASE_R.aluguel, BASE_R.aluguel_encargos],
      v: BASE_R[registro.base_comissao] || BASE_R.aluguel },
    { n: 'nota', t: 'aviso', r: 'Deixe o percentual VAZIO para herdar a taxa do imóvel '
      + `(hoje: ${doImovel}). O banco recusa percentual e valor fixo juntos, porque não `
      + 'saberia qual cobrar. A mudança vale para as parcelas previstas — as já abertas '
      + 'ficam como estão (use o ↻ Recalcular para refazê-las).' }
  ], async () => {
    const num = v => v === null ? null : Number(v);
    const p = num(valorAcao('pct'));
    erroSe(p !== null && (!Number.isFinite(p) || p < 0 || p > 100), 'O percentual vai de 0 a 100.');
    const { error } = await sb.from('contratos').update({
      taxa_adm_percentual: p === null ? null : p / 100,
      taxa_adm_minimo: num(valorAcao('minimo')),
      taxa_adm_valor: num(valorAcao('fixo')),
      base_comissao: valorAcao('base') === BASE_R.aluguel_encargos ? 'aluguel_encargos' : 'aluguel'
    }).eq('id', ID);
    if (error) throw error;
  }, '✓ Salvar');
}

// ============================================================
// v1.272 — O COCKPIT DA FICHA DO ALUGUEL (mockup aprovado 14/08/2026)
// Mesma receita do contrato: quem é quem no destaque, a faixa "agora",
// o dinheiro num cartão (com as duas pontas lado a lado), radar e
// papéis na direita. Os cartões antigos continuam no registro.
// ============================================================

/** a faixa "quem é quem" da parcela: contrato, inquilino, proprietário */
function faixaPartesParcela() {
  if (ALVO !== 'competencia') return '';
  const r = registro;
  const ct = relacionados.find(x => x.papel === 'Contrato') || null;
  // v1.353 — o 💬 abre a CAIXA FIXA (estilo Salesforce), não mais o
  // wa.me: a conversa acontece pelo número da imobiliária, registrada,
  // sem sair da ficha do contrato. Por isso recebe a PESSOA inteira.
  const zap = p => {
    const d = String((p && p.telefone) || '').replace(/\D/g, '');
    if (d.length < 10) return '';
    return `<button class="zap" title="Conversar aqui do lado, pelo WhatsApp da Moralí"
      onclick="abrirChatFixo('${registro.empresa_id}','${(p && p.id) || ''}','','${
      jsq((p && p.nome) || '')}','${d}')">${icone('balao', 14)}</button>`;
  };
  const inqId = r.inquilino_id || (ct && ct.inquilino_id) || null;
  const propId = r.proprietario_id || null;
  const pInq = inqId ? (pessoasContrato.find(c => c.id === inqId) || null) : null;
  const pProp = propId ? (pessoasContrato.find(c => c.id === propId) || null) : null;
  const CORES_CT = { 'Ativo': 'Ativo', 'Aviso Prévio': 'Aviso Prévio',
    'Seguro Acionado': 'Seguro Acionado', 'Encerrado': 'Encerrado' };
  const subCt = ct ? [
    CORES_CT[ct.status] || ct.status,
    (ct.data_inicio ? dataBr(ct.data_inicio) : '') +
      (ct.data_fim_prevista ? ' → ' + dataBr(ct.data_fim_prevista) : ''),
    ct.valor_aluguel != null ? moeda(ct.valor_aluguel) : '',
    ct.dia_vencimento ? 'dia ' + ct.dia_vencimento : '',
    ct.garantia_tipo || ''
  ].filter(Boolean).map(htm).join(' · ') : '';
  const parte = (icone, cor, rotulo, nomeHtml, sub, zapHtml) => `
    <div class="fcc-parte">
      <div class="ico ${cor}">${icone}</div>
      <div style="min-width:0">
        <span class="r">${rotulo}</span>
        <div class="v">${nomeHtml}</div>
        ${sub ? `<div class="sub2">${sub}</div>` : ''}
      </div>
      ${zapHtml || ''}
    </div>`;
  return `<div class="fcc-partes">
    ${parte(icone('documento', 16), 'obj-contratos', 'Contrato',
      ct ? `<a href="contrato.html?id=${ct.id}">${htm((ct.codigo || 'Contrato')
             + (r.imovel_endereco ? ' · ' + r.imovel_endereco : ''))}</a>`
         : htm(r.imovel_endereco || '—'),
      subCt)}
    ${parte(icone('chave', 16), 'obj-contatos', 'Inquilino',
      inqId
        ? `<a href="contato.html?id=${inqId}">${htm(r.inquilino_nome || (pInq && pInq.nome) || 'ver contato')}</a>`
        : htm(r.inquilino_nome || '—'),
      pInq && pInq.telefone
        ? htm(mascaraTelefone(pInq.telefone)) + botaoCopiarDigitos(pInq.telefone, 'o telefone')
        : '',
      zap(pInq))}
    ${parte(icone('pessoa', 16), 'obj-contatos', 'Proprietário',
      propId
        ? `<a href="contato.html?id=${propId}">${htm(r.proprietario_nome || (pProp && pProp.nome) || 'ver contato')}</a>`
        : htm(r.proprietario_nome || '—'),
      pProp && pProp.telefone
        ? htm(mascaraTelefone(pProp.telefone)) + botaoCopiarDigitos(pProp.telefone, 'o telefone')
        : '',
      zap(pProp))}
  </div>`;
}

/** O DINHEIRO DESTE MÊS — pagou → ficou → recebeu, com as duas pontas
 *  abertas lado a lado (a mesma conta do cartão "O mês"). */
function cartaoDinheiroParcela() {
  if (ALVO !== 'competencia') return '';
  const r = registro;
  const n = v => Number(v) || 0;
  const recebeu = !!r.recebido_em;
  const repassou = !!r.repassado_em;
  const atrasada = ['Aberta', 'Cobrada'].includes(r.etapa)
    && r.vencimento && r.vencimento < hojeISO();

  return `<div class="cartao">
    <h2>O dinheiro deste mês
      ${r.primeiro_mes ? '<span class="tag tag-azul">primeiro mês · proporcional</span>' : ''}
      ${r.etapa === 'Prevista' ? '<span class="tag tag-prev">previsão · recalcula sozinha</span>' : ''}
      <span class="dir">
        <button class="btn btn-claro" data-perm="competencias:ver"
          style="padding:4px 10px;font-size:12px"
          onclick="event.stopPropagation();abrirItensDoBoleto()">✎ Itens do boleto</button>
        <button class="btn btn-claro" data-perm="competencias:ver"
          style="padding:4px 10px;font-size:12px"
          onclick="event.stopPropagation();abrirDescontosDoRepasseJanela()">✎ Descontos do repasse</button>
      </span></h2>
    <div class="corpo">
      <div class="fcc-fluxo">
        <div class="fcc-caixa${recebeu ? '' : (atrasada ? '' : '')}">
          <span class="r">${recebeu ? 'O inquilino pagou' : 'O inquilino paga'}</span>
          <div class="v">${moeda(recebeu && r.valor_recebido != null ? r.valor_recebido : r.valor_total)}</div>
          <div class="d">aluguel ${moeda(r.valor_aluguel)}${n(r.valor_itens)
            ? ' + itens ' + moeda(r.valor_itens) : ''}${recebeu
            ? ' · em ' + htm(dataBr(r.recebido_em))
            : ' · vence ' + htm(dataBr(r.vencimento))}</div>
        </div>
        <div class="fcc-seta">→</div>
        <div class="fcc-caixa meio">
          <span class="r">A Moralí ${repassou ? 'ficou' : 'fica'} com</span>
          <div class="v">${moeda(r.taxa_adm)}</div>
          <div class="d">Taxa Mensal · congelada na geração${
            r.primeiro_mes && !n(r.repasse_bruto) ? ' · + o aluguel do 1º mês' : ''}</div>
        </div>
        <div class="fcc-seta">→</div>
        <div class="fcc-caixa">
          <span class="r">${repassou ? 'O proprietário recebeu' : 'O proprietário recebe'}</span>
          <div class="v">${moeda(repassou && r.valor_repassado != null ? r.valor_repassado : r.repasse_liquido)}</div>
          <div class="d">${descontosParcela.length
            ? descontosParcela.length + ' desconto(s) no repasse'
            : 'repasse cheio, sem descontos'}${repassou
            ? ' · em ' + htm(dataBr(r.repassado_em)) : ''}</div>
        </div>
      </div>
      ${n(r.valor_itens) ? `<div class="fcc-resto">Os <b>${moeda(r.valor_itens)}</b> de itens
        do boleto não são receita nem repasse — cobrem o custo de quem presta o serviço.
        O detalhe está em <b>✎ Itens do boleto</b>.</div>` : ''}

      <div class="fcc-lados">
        ${ladoInquilinoMes()}
        ${ladoProprietarioMes()}
      </div>
      ${notaRepasseZerado()}
    </div>
  </div>`;
}

/** PEDE ATENÇÃO da parcela: atraso do boleto e repasse pendente. */
/** v1.472 — soma N dias ÚTEIS a uma data ISO (pula sábado e domingo).
 *  Feriados não entram — é aproximação suficiente para o prazo de repasse. */
function maisDiasUteis(dataISO, n) {
  if (!dataISO) return dataISO;
  const d = new Date(String(dataISO).slice(0, 10) + 'T12:00:00');
  let add = 0;
  while (add < n) {
    d.setDate(d.getDate() + 1);
    const dia = d.getDay();
    if (dia !== 0 && dia !== 6) add++;
  }
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0');
}

/** v1.472 — soma N dias CORRIDOS a uma data ISO (para a opção
 *  "dias corridos" do prazo de repasse). */
function maisDiasCorridos(dataISO, n) {
  if (!dataISO) return dataISO;
  const d = new Date(String(dataISO).slice(0, 10) + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0');
}

function cartaoRadarParcela() {
  if (ALVO !== 'competencia') return '';
  const r = registro;
  const n = v => Number(v) || 0;
  const itens = [];
  const pInq = pessoasContrato.find(c => c.id === (r.inquilino_id
    || ((relacionados.find(x => x.papel === 'Contrato') || {}).inquilino_id))) || null;
  const dInq = pInq ? String(pInq.telefone || '').replace(/\D/g, '') : '';

  if (['Aberta', 'Cobrada'].includes(r.etapa) && r.vencimento && r.vencimento < hojeISO())
    itens.push({
      icone: icone('relogio', 16), t: 'Boleto em atraso',
      q: 'venceu ' + htm(dataBr(r.vencimento))
        + ((n(r.multa_hoje) || n(r.juros_hoje))
            ? ' · cobrando hoje ' + moeda(n(r.valor_total) + n(r.multa_hoje) + n(r.juros_hoje))
            : ' · ' + moeda(r.valor_total)),
      tag: `<span class="tag tag-vermelha">${r.dias_de_atraso || ''}d</span>`,
      bt: dInq.length >= 10 ? `<a class="btn btn-claro" target="_blank" rel="noopener"
            href="https://wa.me/55${dInq}">${icone('balao', 12)} Cobrar</a>` : ''
    });

  if (r.recebido_em && !r.repassado_em && r.etapa !== 'Cancelada') {
    // v1.472 — o prazo do repasse é CONFIGURÁVEL por imobiliária
    // (Administração → Configurações gerais): quantos dias, se conta em
    // dias úteis ou corridos, e a partir do vencimento do boleto ou da
    // confirmação do pagamento. Antes do prazo, "programado"; no prazo, "agora".
    const rp = k => (typeof padraoDaCasa === 'function') ? padraoDaCasa(k) : null;
    const nDias = Math.max(0, Number(rp('repasse_dias')) || 3);
    const corridos = rp('repasse_tipo') === 'corridos';
    const doPagamento = rp('repasse_base') === 'pagamento';
    const baseData = doPagamento ? r.recebido_em : r.vencimento;
    const prazoRepasse = baseData
      ? (corridos ? maisDiasCorridos(baseData, nDias) : maisDiasUteis(baseData, nDias))
      : null;
    const chegou = !prazoRepasse || hojeISO() >= prazoRepasse;
    const comoConta = nDias + ' dia' + (nDias === 1 ? '' : 's') + (corridos ? ' corridos' : ' úteis')
      + ' após ' + (doPagamento ? 'o pagamento' : 'o vencimento');
    itens.push({
      icone: '↦',
      t: 'Repasse ao proprietário' + (chegou ? ' pendente' : ' programado'),
      q: chegou
        ? 'líquido ' + moeda(r.repasse_liquido) + ' — pode repassar (' + comoConta + ')'
        : 'líquido ' + moeda(r.repasse_liquido) + ' — repassar a partir de ' + dataBr(prazoRepasse)
          + ' (' + comoConta + ')',
      tag: chegou ? '<span class="tag tag-amarela">agora</span>'
                  : '<span class="tag tag-cinza">' + dataBr(prazoRepasse) + '</span>',
      bt: ''
    });
  }

  return `<div class="cartao">
    <h2>Pede atenção <span class="cnt">(${itens.length})</span></h2>
    ${itens.length ? `<ul class="fcc-radar">
      ${itens.map(i => `<li>
        <div class="ico">${i.icone}</div>
        <div style="min-width:0"><b>${i.t}</b><span class="q">${i.q}</span></div>
        <div class="lado">${i.tag}${i.bt}</div>
      </li>`).join('')}
    </ul>`
    : `<div class="fcc-radar-vazio">${r.etapa === 'Prevista'
        ? 'Parcela prevista — abre sozinha na vez dela.'
        : (r.repassado_em ? 'Tudo certo ✓ — boleto recebido e repasse feito.'
                          : 'Nada pedindo atenção agora.')}</div>`}
    <p class="fcc-radar-nota">Boleto atrasado aparece aqui com o WhatsApp do inquilino;
      repasse pendente, com o aviso.</p>
  </div>`;
}

/** PAPÉIS DO MÊS — o demonstrativo do inquilino e o recibo do
 *  proprietário, que moravam escondidos nos títulos dos cartões. */
function cartaoPapeisDoMes() {
  if (ALVO !== 'competencia') return '';
  return `<div class="cartao">
    <h2>Papéis do mês</h2>
    <div class="corpo">
    <!-- v1.375 — o flex desce para um miolo: escrito na linha do
         .corpo, ele ganhava do display:none do .fechado e a seta de
         recolher não recolhia nada (a lição da v1.264, que tinha
         escapado aqui). -->
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <a class="btn btn-claro" data-perm="competencias:ver"
         style="padding:7px 12px;font-size:12.5px"
         href="demonstrativo.html?id=${encodeURIComponent(ID)}"
         title="Folha com o timbre da Moralí para mandar ao inquilino"
         >${icone('documento', 13)} Demonstrativo do inquilino</a>
      ${registro.recibo_token ? `<a class="btn btn-claro" data-perm="competencias:ver"
         style="padding:7px 12px;font-size:12.5px"
         href="recibo.html?p=${encodeURIComponent(registro.recibo_token)}&i=1"
         target="_blank" rel="noopener"
         title="Folha do proprietário — vale antes e depois do repasse"
         >${icone('documento', 13)} Recibo do proprietário</a>` : ''}
    </div>
    </div>
  </div>`;
}

/** a janela "Descontos do repasse" — o miolo do cartão, na moldura
 *  padrão. Cada linha grava na hora, como no cartão. */
function _abrirDescontosDoRepasseJanela() {
  acaoAtual = async () => {};
  document.getElementById('modal-titulo').textContent =
    'Descontos do repasse — ' + (registro.codigo || '') +
    (registro.imovel_endereco ? ' · ' + registro.imovel_endereco : '');
  document.getElementById('modal-campos').innerHTML =
    `<div class="campo largo" style="margin:0">
       <div style="margin-bottom:10px;display:flex;gap:8px;flex-wrap:wrap">
         ${parcelaAceitaDesconto() ? `<button class="btn btn-claro" data-perm="competencias:editar"
           style="padding:6px 13px;font-size:12.5px"
           onclick="acrescentarDescontoDoRepasse()">+ Acrescentar só neste mês</button>` : ''}
       </div>
       ${mioloDescontosDoRepasse()}
     </div>`;
  document.getElementById('modal-erro').style.display = 'none';
  const b = document.getElementById('btn-salvar');
  b.textContent = 'Fechar';
  b.setAttribute('onclick', 'fecharModal()');
  b.disabled = false;
  document.getElementById('modal').classList.add('aberto');
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
}

// ============================================================
// v1.169 — ITENS DA COBRANÇA (o "Itens da Oportunidade" da casa)
// Aluguel + fiança + incêndio (6x) + boleto + avulsos: o gerador soma
// os vigentes de cada mês; item com N parcelas PARA sozinho na última.
// ============================================================
function mesISO(d) { return String(d || '').slice(0, 7); }

/** em quantos meses NÃO-previstos o item já entrou (o "2 de 6") */
function parcelasLancadas(it) {
  const ini = mesISO(it.inicio_competencia);
  return mesesContrato.filter(m => {
    const mm = mesISO(m.competencia);
    if (m.etapa === 'Prevista' || m.etapa === 'Cancelada') return false;
    if (mm < ini) return false;
    if (it.parcelas) {
      const [a, me] = ini.split('-').map(Number);
      const fim = new Date(a, me - 1 + Number(it.parcelas), 1);
      const fimISO = fim.getFullYear() + '-' + String(fim.getMonth() + 1).padStart(2, '0');
      if (mm >= fimISO) return false;
    }
    return true;
  }).length;
}

/**
 * v1.220 — QUANDO CADA ITEM COMEÇA A SER COBRADO.
 *
 * A 1ª parcela de um contrato quase nunca é um mês inteiro: são os dias
 * entre a assinatura e o vencimento. Seguro fiança, incêndio, boleto e a
 * taxa de contrato digital, esses, entram inteiros — e por isso costumam
 * ficar para o primeiro boleto CHEIO. Até aqui isso só dava para dizer
 * abrindo item por item no ✎; o CON-0059 nasceu com R$ 189,40 na parcela
 * de 3 dias (82,00 de aluguel + fiança + boleto) porque ninguém viu.
 *
 * Agora o mês de início e o "todo mês / uma vez só / N parcelas" são
 * colunas da própria tabela de itens — e a mesma tabela aparece dentro
 * da janela "Gerar parcelas", que é a hora em que a pessoa está pensando
 * nisso. Mudar em qualquer uma das duas grava no contrato na hora.
 */
const QI_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                  'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const QI_MAX_PARCELAS = 36;

/** '2026-08-01' → 'ago/26' */
/** v1.475 — o ÚLTIMO dia do mês corrente, no fuso da casa.
 *
 *  É o corte que separa histórico de "parcela que o CRM já gerou mas
 *  ninguém viveu ainda". O mês corrente entra INTEIRO dos dois lados:
 *  no Repasses, porque a competência do mês é a que está em curso; no
 *  Financeiro, porque um boleto que vence dia 25 é "em aberto" de
 *  verdade, e não futuro distante. */
function fimDoMesCorrente() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return fim.getFullYear() + '-' + p(fim.getMonth() + 1) + '-' + p(fim.getDate());
}

function mesCurto(iso) {
  const m = mesISO(iso);
  if (!m) return '—';
  const [a, me] = m.split('-').map(Number);
  return (QI_MESES[me - 1] || '?') + '/' + String(a).slice(2);
}

/** o ÚLTIMO mês em que o item é cobrado (null = enquanto o contrato durar) */
function mesFinalItem(it) {
  const m = mesISO(it.inicio_competencia);
  if (!it.parcelas || !m) return null;
  const [a, me] = m.split('-').map(Number);
  const d = new Date(a, me - 1 + Number(it.parcelas) - 1, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
}

/** as opções do seletor "como cobra" — em branco = todo mês.
 *  v1.479: "c12" (ciclos de 12) é a fiança — cobra todo mês, e a
 *  numeração gira em vez de travar no 12/12. Vem antes das parcelas
 *  fixas porque é irmã do "Todo mês", não das que acabam. */
function opcoesFrequenciaItem(it) {
  const ciclo = it.ciclo_meses ? Number(it.ciclo_meses) : 0;
  const n = it.parcelas ? Number(it.parcelas) : 0;
  const atual = ciclo ? 'c' + ciclo : (n ? String(n) : '');
  let s = '';
  const op = (v, r) => { s += `<option value="${v}"${v === atual ? ' selected' : ''}>${r}</option>`; };
  op('', 'Todo mês');
  op('c12', 'Todo mês, em ciclos de 12');
  if (ciclo && ciclo !== 12) op('c' + ciclo, 'Todo mês, em ciclos de ' + ciclo);
  op('1', 'Uma vez só');
  for (let i = 2; i <= QI_MAX_PARCELAS; i++) op(String(i), i + ' parcelas');
  if (n > QI_MAX_PARCELAS) op(atual, n + ' parcelas');
  return s;
}

/** o mês em que a numeração de um item em ciclos recomeça no 1.
 *  Com a 1ª paga fora, o 1º ciclo tem uma cobrança a menos, e por isso
 *  a virada chega um mês antes. */
function mesRenovaItem(it) {
  const m = mesISO(it.inicio_competencia);
  if (!it.ciclo_meses || !m) return null;
  const [a, me] = m.split('-').map(Number);
  const d = new Date(a, me - 1 + Number(it.ciclo_meses) - (it.primeira_paga_fora ? 1 : 0), 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
}

/** O ELEMENTO de um campo "quando" — par do elementoAcao.
 *  Declarada como function de propósito: a conferência estrutural
 *  rastreia atalhos `const x = id => getElementById(id)` e cobraria o
 *  id do item como id de tela; ele nasce do template literal abaixo. */
function elementoQuandoItem(campo, pfx, id) {
  return document.getElementById(campo + pfx + '-' + id);
}

/** as duas colunas — mês de início e frequência — de um item.
 *  `pfx` separa as duas cópias da tabela ('f' na ficha, 'g' na janela
 *  de gerar), porque as duas podem estar na tela ao mesmo tempo. */
function celulasQuandoItem(pfx, it) {
  const fim = mesFinalItem(it);
  return `
    <td style="white-space:nowrap">
      <input type="month" id="qim-${pfx}-${it.id}" data-perm="contratos:editar"
             value="${htm(mesISO(it.inicio_competencia))}"
             style="padding:3px 6px;font-size:13px"
             onchange="salvarQuandoItem('${jsq(pfx)}','${jsq(it.id)}')">
    </td>
    <td style="white-space:nowrap">
      <select id="qif-${pfx}-${it.id}" data-perm="contratos:editar"
              style="padding:3px 6px;font-size:13px"
              onchange="salvarQuandoItem('${jsq(pfx)}','${jsq(it.id)}')">${opcoesFrequenciaItem(it)}</select>
      ${it.ciclo_meses ? `
      <label style="display:block;font-size:11px;margin-top:3px;cursor:pointer">
        <input type="checkbox" id="qic-${pfx}-${it.id}" data-perm="contratos:editar"
               ${it.primeira_paga_fora ? 'checked' : ''}
               onchange="salvarQuandoItem('${jsq(pfx)}','${jsq(it.id)}')">
        a 1ª foi paga fora</label>` : ''}
      <div style="font-size:11px;color:var(--texto-suave);margin-top:2px">
        ${it.ciclo_meses
          ? `a partir de ${htm(mesCurto(it.inicio_competencia))} · começa na ${
              it.primeira_paga_fora ? 2 : 1}/${Number(it.ciclo_meses)} · renova em ${
              htm(mesCurto(mesRenovaItem(it)))}`
          : it.parcelas
          ? `${htm(mesCurto(it.inicio_competencia))} → ${htm(mesCurto(fim))}`
          : `a partir de ${htm(mesCurto(it.inicio_competencia))}`}${
          it.ultimo_mes_proporcional ? ' · último mês proporcional' : ''}</div>
    </td>`;
}

/**
 * Grava as duas escolhas de uma vez. O gatilho `trg_contrato_item`
 * refaz as parcelas PREVISTAS sozinho; as já abertas ficam como estão —
 * é o que a nota do rodapé do cartão sempre disse.
 */
async function _salvarQuandoItem(pfx, id) {
  const it = itensContrato.find(x => x.id === id);
  if (!it) return;
  const elM = elementoQuandoItem('qim-', pfx, id);
  const elF = elementoQuandoItem('qif-', pfx, id);
  const mes = elM && elM.value ? elM.value + '-01' : null;
  erroSe(!mes, 'Informe o mês em que este item começa a ser cobrado.');
  // "c12" = todo mês em ciclos de 12. Ciclo e parcelas são excludentes:
  // um item em ciclo não acaba, então `parcelas` volta a ser nulo — se
  // os dois ficassem preenchidos, o rodapé prometeria um fim que a
  // cobrança nunca teria.
  const v = elF ? String(elF.value || '') : '';
  const ciclo = v.startsWith('c') ? parseInt(v.slice(1), 10) : null;
  const par = ciclo ? null : (v ? parseInt(v, 10) : null);
  const elC = elementoQuandoItem('qic-', pfx, id);
  const { error } = await sb.from('contrato_itens')
    .update({ inicio_competencia: mes, parcelas: par, ciclo_meses: ciclo,
              primeira_paga_fora: !!(ciclo && elC && elC.checked),
              atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await carregarFicha();
  const j = document.getElementById('janela-parcelas');
  if (j && j.classList.contains('aberto')) { desenharQuandoItens(); simularParcelas(); }
}

/**
 * v1.221 — RECALCULAR EM LOTE AS PARCELAS QUE AINDA DÃO.
 *
 * Mudar um item com doze parcelas já abertas eram doze cliques, um a
 * um, na ficha de cada parcela — e era por isso que todo acerto acabava
 * virando um arquivo de SQL. A trava não está aqui: quem decide se pode
 * é `recalcular_competencia` no banco, que recusa parcela recebida ou
 * repassada e devolve o motivo por escrito. A tela só não oferece o que
 * ela sabe que o banco vai recusar.
 */
function recalculaveisDoContrato() {
  return (mesesContrato || []).filter(p =>
    ['Prevista', 'Aberta', 'Cobrada'].includes(p.etapa) && !p.recebido_em);
}

/* ============================================================
 * v1.259 — AS PARCELAS QUE SOBRARAM DEPOIS DO FIM DO CONTRATO.
 *
 * Encerrar o contrato não mexia nos aluguéis já gerados: um contrato de
 * 24 meses encerrado no 12º deixava 12 meses de dinheiro que não vem
 * dentro da previsão de caixa. Limpar era entrar em cada parcela e
 * trocar a etapa na mão — e trabalho repetido é onde se pula uma linha
 * sem perceber (foi o que aconteceu em 13/08/2026: de quatro parcelas,
 * uma foi cancelada e três continuaram Prevista).
 *
 * QUEM DECIDE O QUE CAI É O BANCO, não esta tela.
 * `cancelar_parcelas_apos_encerramento` usa a mesma regra da geração —
 * o período que a parcela cobra (do vencimento anterior até o dela) —
 * e só derruba a parcela cujo período INTEIRO começa depois do
 * encerramento. A que ainda pega dias vividos fica de pé, para o ↻
 * transformar na fatia final. De propósito não repito essa conta aqui:
 * duas cópias da mesma regra é uma que envelhece sozinha.
 *
 * A tela só pergunta "há alguma parcela em aberto?" para saber se
 * mostra o botão; a lista de verdade vem da prévia (p_simular).
 * ============================================================ */
function temParcelasParaCancelar() {
  return !!registro.data_encerramento && (mesesContrato || []).some(p =>
    ['Prevista', 'Aberta', 'Cobrada'].includes(p.etapa)
    && !p.recebido_em && !p.repassado_em);
}

async function _abrirCancelarAposFim() {
  const fim = registro.data_encerramento;
  erroSe(!fim, 'Este contrato não tem "Encerrado em" preenchido. É essa data que diz '
    + 'quais parcelas sobram — preencha na ficha antes.');

  abrirAcao(`Cancelar parcelas depois do encerramento — ${registro.codigo || 'contrato'}`, [
    { n: 'aviso-cancelar', t: 'aviso',
      r: `O contrato foi encerrado em ${dataBr(fim)}. Abaixo, os aluguéis que ficaram `
       + 'para depois disso e ainda não foram recebidos nem repassados. Eles passam a '
       + 'Cancelada e somem da previsão de caixa; o mês que ainda cobra dias vividos '
       + 'NÃO entra na lista — para esse, use "↻ Recalcular parcelas em aberto", que o '
       + 'transforma na fatia final.' }
  ], async () => {
    const { data, error } = await sb.rpc('cancelar_parcelas_apos_encerramento',
      { p_contrato_id: ID, p_simular: false });
    if (error) throw error;
    const n = (data || []).length;
    erroSe(!n, 'Não havia nada para cancelar.');
  }, 'Cancelar as parcelas');

  const caixa = document.getElementById('modal-campos');
  caixa.insertAdjacentHTML('beforeend', `
    <div class="campo largo"><label>O que vai ser cancelado</label>
      <div id="ac-previa-cancelar" style="border:1px solid var(--borda);border-radius:8px;
        padding:12px 14px;font-size:13px;line-height:1.7;max-height:260px;overflow:auto"
        >Conferindo…</div></div>`);

  const alvo = elementoAcao('previa-cancelar');
  const botao = document.getElementById('btn-salvar');
  botao.disabled = true;

  const { data, error } = await sb.rpc('cancelar_parcelas_apos_encerramento',
    { p_contrato_id: ID, p_simular: true });
  if (!elementoAcao('previa-cancelar')) return;      // janela fechou no meio
  if (error) {
    alvo.innerHTML = `<span style="color:var(--erro)">Não consegui conferir: ${
      htm(error.message)}</span>`;
    return;
  }

  const linhas = data || [];
  if (!linhas.length) {
    alvo.innerHTML = 'Nenhuma parcela sobrando — as deste contrato já param no '
      + 'encerramento. Não há nada a fazer aqui.';
    return;
  }

  const total = linhas.reduce((s, x) => s + (Number(x.valor_total) || 0), 0);
  const comBoleto = linhas.filter(x => x.tem_boleto);
  const lancamentos = linhas.reduce((s, x) => s + (Number(x.lancamentos_crm) || 0), 0);

  alvo.innerHTML = `
    <table class="mini" style="font-size:13px">
      <tr><th>Mês</th><th>Vence</th><th>Etapa</th><th style="text-align:right">Total</th></tr>
      ${linhas.map(x => `<tr>
        <td>${htm(String(x.competencia || '').slice(0, 7).split('-').reverse().join('/'))}</td>
        <td>${x.vencimento ? dataBr(x.vencimento) : '—'}</td>
        <td><span class="tag tag-cinza">${htm(x.etapa)}</span>${
          x.tem_boleto ? ' <span class="tag tag-amarela">boleto no Asaas</span>' : ''}</td>
        <td style="text-align:right;white-space:nowrap">${moeda(x.valor_total || 0)}</td>
      </tr>`).join('')}
    </table>
    <p style="margin-top:10px"><b>${linhas.length} parcela(s)</b>, somando
      <b>${moeda(total)}</b>, saem da previsão.${lancamentos
        ? ` ${lancamentos} lançamento(s) do Livro Caixa gerados por elas também são apagados —`
          + ' o que foi digitado à mão fica.' : ''}</p>
    ${comBoleto.length ? `<p style="color:var(--alerta);margin-top:6px">${icone('aviso', 12)}
      ${comBoleto.length} dela(s) já tem boleto emitido no Asaas. Cancelar aqui NÃO cancela
      o boleto lá — o inquilino continua conseguindo pagar. Cancele no Asaas também.</p>` : ''}`;

  botao.textContent = `Cancelar ${linhas.length} parcela(s)`;
  botao.disabled = false;
}

async function _recalcularParcelasEmAberto() {
  const alvo = recalculaveisDoContrato();
  const nRep = temRepasseRecorrente() ? parcelasSemRepasse().length : 0;
  if (!alvo.length && !nRep) return;
  const pergunta = alvo.length
    ? `Refazer a conta de ${alvo.length} parcela(s) com as regras de hoje?\n\n` +
      'Aluguel, taxa, repasse e itens da cobrança são recalculados. Parcela ' +
      'recebida ou repassada não é tocada, e o que você digitou (juros, descontos, ' +
      'observações) não muda.' + (nRep ?
      '\n\nAs linhas que voltam ao proprietário são refeitas em TODAS as parcelas ' +
      'ainda não repassadas, inclusive nas já recebidas — é depois do pagamento que ' +
      'o repasse acontece.' : '')
    : `Refazer as linhas que voltam ao proprietário em ${nRep} parcela(s) ainda não ` +
      'repassada(s)?\n\nO boleto do inquilino não muda, e parcela já repassada não é tocada.';
  if (!confirm(pergunta)) return;
  let ok = 0;
  const recusadas = [];
  for (const p of alvo) {
    const { data, error } = await sb.rpc('recalcular_competencia', { p_id: p.id });
    if (error) { recusadas.push((p.codigo || '') + ': ' + error.message); continue; }
    if (String(data || '').startsWith('Recalculada')) ok++;
    else recusadas.push((p.codigo || '') + ': ' + data);
  }
  /* v1.256 — o lado do proprietário tem outra fronteira e por isso tem
   * chamada própria: `recalcular_competencia` recusa parcela recebida,
   * que é justamente onde a devolução ao proprietário precisa entrar. */
  let doRepasse = '';
  const { data: rep, error: erroRep } =
    await sb.rpc('contrato_repasse_sincronizar', { p_contrato: ID });
  if (erroRep) doRepasse = '\n\nRepasse: ' + erroRep.message;
  else if (rep) doRepasse = '\n\n' + rep;
  await carregarFicha();
  avisar('Recálculo em lote',
    `${ok} parcela(s) recalculada(s).` + doRepasse +
    (recusadas.length ? `\n\nNão deu em ${recusadas.length}:\n` + recusadas.join('\n') : ''));
}

function itemVigenteNoMes(it, mesIso) {
  const ini = mesISO(it.inicio_competencia);
  if (mesIso < ini) return false;
  if (!it.parcelas) return true;
  const [a, me] = ini.split('-').map(Number);
  const fim = new Date(a, me - 1 + Number(it.parcelas), 1);
  const fimISO = fim.getFullYear() + '-' + String(fim.getMonth() + 1).padStart(2, '0');
  return mesIso < fimISO;
}

/**
 * ALUGUÉIS DESTE CONTRATO (v1.181, mockup aprovado em 06/08/2026).
 *
 * O extrato do contrato sem sair da ficha: resumo (pagas · em atraso ·
 * abertas · previstas · recebido) e as parcelas ao redor de hoje —
 * as 3 últimas e as 3 próximas. Clicar na linha abre a parcela; o
 * link do rodapé abre a tela de Aluguéis já filtrada pelo contrato.
 * Lê o que a ficha JÁ carrega (mesesContrato, v1.169) — sem consulta nova.
 *
 * v1.258 — o respiro do texto solto. A linha de resumo e o link do
 * rodapé nasciam com margem lateral ZERO: encostavam no filete do
 * cartão e o link ainda ficava sentado na borda de baixo. Passam a usar
 * a margem que os outros textos soltos do cartão já usam (14px, o mesmo
 * recuo das colunas da tabela) — texto colado em linha parece rodapé de
 * tabela, não resumo.
 */
function blocoAlugueis() {
  const hoje = hojeISO();
  const parcelas = (mesesContrato || []).filter(p => p.etapa !== 'Cancelada');
  if (!parcelas.length) return `
    <div class="cartao"><h2>Aluguéis deste contrato <span class="cnt">(0)</span></h2>
      <div class="corpo" style="color:#8a94a1">Nenhuma parcela gerada ainda —
        use <b>Gerar as parcelas do contrato</b> aqui na ficha.</div></div>`;

  const atrasada = p => ['Aberta', 'Cobrada'].includes(p.etapa)
    && p.vencimento && p.vencimento < hoje;
  const pagas = parcelas.filter(p => p.recebido_em).length;
  const atrasadas = parcelas.filter(atrasada).length;
  const abertas = parcelas.filter(p =>
    ['Aberta', 'Cobrada'].includes(p.etapa) && !atrasada(p)).length;
  const previstas = parcelas.filter(p => p.etapa === 'Prevista').length;
  const recebido = parcelas.reduce((s, p) => s + (Number(p.valor_recebido) || 0), 0);
  // v1.270 — a outra ponta: o que já saiu para o proprietário
  const repassado = parcelas.reduce((s, p) => s + (Number(p.valor_repassado) || 0), 0);

  // a janela: as 3 últimas até hoje e as 3 próximas
  let corte = parcelas.findIndex(p => (p.vencimento || '9999') >= hoje);
  if (corte < 0) corte = parcelas.length;
  const janela = parcelas.slice(Math.max(0, corte - 3), corte + 3);

  const CORES = { 'Prevista': 'tag-cinza', 'Aberta': 'tag-azul', 'Cobrada': 'tag-azul',
    'Recebida': 'tag-verde', 'Liberada': 'tag-verde', 'Repassada': 'tag-verde' };
  /* v1.270 — pedido do Rodrigo (14/08): o repasse ao proprietário entra
   * no quadro. Valor e data viraram UMA célula por ponta (recebido ·
   * repasse) — quatro colunas separadas não cabiam na coluna principal. */
  const vd = (valor, data) => valor != null
    ? `<b>${moeda(valor)}</b><span style="color:var(--texto-suave)"> · ${
        data ? dataBr(data) : '—'}</span>`
    : '—';
  const linhas = janela.map(p => {
    const tarde = atrasada(p);
    return `<tr style="cursor:pointer${tarde ? ';background:#FDF3F2' : ''}${
        p.etapa === 'Prevista' ? ';opacity:.6' : ''}"
      onclick="location.href='competencia.html?id=${p.id}'">
      <td>${htm(String(p.competencia || '').slice(0, 7).split('-').reverse().join('/'))}</td>
      <td${tarde ? ' style="color:var(--erro);font-weight:700"' : ''}>${
        p.vencimento ? dataBr(p.vencimento) : '—'}</td>
      <td><span class="tag ${tarde ? 'tag-vermelha' : (CORES[p.etapa] || 'tag-cinza')}">${
        htm(tarde ? 'ATRASADA' : p.etapa)}</span></td>
      <td style="text-align:right;white-space:nowrap">${moeda(p.valor_total || 0)}</td>
      <td style="text-align:right;white-space:nowrap">${vd(p.valor_recebido, p.recebido_em)}</td>
      <td style="text-align:right;white-space:nowrap">${vd(p.valor_repassado, p.repassado_em)}</td>
    </tr>`;
  }).join('');

  return `
  <div class="cartao">
    <h2>Aluguéis deste contrato <span class="cnt">(${parcelas.length})</span></h2>
    <p style="font-size:12.5px;color:var(--texto-suave);margin:10px 14px 12px">
      <b style="color:#1c7c3d">${pagas} paga${pagas === 1 ? '' : 's'}</b>
      ${atrasadas ? ` · <b style="color:var(--erro)">${atrasadas} em atraso</b>` : ''}
      · <b>${abertas} aberta${abertas === 1 ? '' : 's'}</b>
      · ${previstas} prevista${previstas === 1 ? '' : 's'}
      · recebido até aqui <b>${moeda(recebido)}</b>${repassado
        ? ` · repassado ao proprietário <b>${moeda(repassado)}</b>` : ''}</p>
    <div class="tabela-caixa">
      <table style="font-size:13px">
        <thead><tr><th>Mês</th><th>Vence</th><th>Etapa</th>
          <th style="text-align:right">Total</th>
          <th style="text-align:right">Recebido do inquilino</th>
          <th style="text-align:right">Repasse ao proprietário</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>
    <p style="font-size:12px;margin:12px 14px 14px">
      <a href="competencias.html?contrato=${encodeURIComponent(registro.codigo || '')}">
        Ver as ${parcelas.length} parcelas na tela de Aluguéis →</a></p>
  </div>`;
}

/**
 * v1.256 — O ITEM QUE VOLTA (OU SAI) NO REPASSE DO PROPRIETÁRIO.
 *
 * Nasceu do CON-0024: taxa de água de R$ 55,00 no boleto do inquilino,
 * conta paga pelo proprietário. Todo mês a devolução era digitada à
 * mão na ficha de cada parcela — e o que se faz doze vezes por ano na
 * mão é o que um dia se esquece.
 *
 * O sinal é o da v1.231 e não se mexe nele: do lado do proprietário
 * valor POSITIVO desconta e NEGATIVO acresce. Quem traduz é a tela;
 * quem grava a linha é o rebuild no banco.
 *
 * A taxa de administração não muda de base: ela sempre saiu do
 * aluguel, antes de qualquer item entrar na conta.
 */
const REPASSE_ITEM = [
  { v: 'nao',      r: 'Não mexe no repasse' },
  { v: 'acresce',  r: 'Devolve ao proprietário todo mês (acresce)' },
  { v: 'desconta', r: 'Desconta do proprietário todo mês' }
];

function rotuloRepasseItem(v) {
  const o = REPASSE_ITEM.find(x => x.v === (v || 'nao'));
  return (o || REPASSE_ITEM[0]).r;
}

function valorRepasseItem(rotulo) {
  const o = REPASSE_ITEM.find(x => x.r === rotulo);
  return (o || REPASSE_ITEM[0]).v;
}

function tagRepasseItem(v) {
  if (v === 'acresce') return '<span class="tag tag-verde">devolve ao proprietário</span>';
  if (v === 'desconta') return '<span class="tag tag-amarela">desconta do proprietário</span>';
  return '<span style="color:var(--texto-suave)">—</span>';
}

/** As parcelas que ainda aceitam linha do proprietário: a fronteira
 *  deste lado é o REPASSE ter saído — recebida do inquilino ou não. */
function parcelasSemRepasse() {
  return (mesesContrato || []).filter(p => p.etapa !== 'Cancelada' && !p.repassado_em);
}

function temRepasseRecorrente() {
  return (itensContrato || []).some(i => i.ativo && (i.repasse || 'nao') !== 'nao');
}

/**
 * Depois de salvar o item, o gatilho do banco já refez as PREVISTAS.
 * As que já foram geradas — abertas, cobradas, até as recebidas — só
 * mudam se alguém mandar, e é isto que pergunta. Uma pergunta só, na
 * hora em que ele está pensando no assunto; quem disser "agora não"
 * ainda tem o botão ↻ da ficha.
 */
async function ofereceAplicarRepasse(agora, antes) {
  if (agora === antes) return;
  const n = parcelasSemRepasse().length;
  if (!n) return;
  const pergunta = agora === 'nao'
    ? `Tirar esta linha do repasse das ${n} parcela(s) ainda não repassada(s)?`
    : `Aplicar também nas ${n} parcela(s) já geradas e ainda não repassada(s)?`;
  if (!confirm(pergunta + '\n\nParcela já repassada não é tocada, e o boleto do ' +
      'inquilino não muda com isto.')) return;
  const { error } = await sb.rpc('contrato_repasse_sincronizar', { p_contrato: ID });
  if (error) throw error;
}

/** v1.270 — a soma dos itens vigentes num mês (aaaa-mm). Era uma conta
 *  inline do cartão de itens; virou função porque o cartão do dinheiro
 *  e a janela "Itens do boleto" fazem a mesma pergunta. */
function somaItensNoMes(mes7) {
  return itensContrato
    .filter(it => it.ativo && itemVigenteNoMes(it, mes7))
    .reduce((a, it) => a + (it.credito ? -1 : 1) * Number(it.valor || 0), 0);
}

/** o mês seguinte de um aaaa-mm */
function mesSeguinte(mes7) {
  const [a, m] = String(mes7).split('-').map(Number);
  const d = new Date(a, m, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

// ------------------------------------------------------------
// v1.328 — A CONTA DO PLANO NO ITEM DA COBRANÇA
//
// O item passa a DIZER em que conta do financeiro ele entra, em vez
// de o sistema adivinhar pelo nome. A sugestão continua vindo do nome
// (espelho de financeiro_conta_do_item no banco); a escolha gravada
// em plano_conta manda. A parcela herda do item ao ser gerada, e o
// gatilho do Livro Caixa lê da parcela.
// ------------------------------------------------------------
function contaSugeridaDoItem(nome) {
  const n = String(nome || '').toLowerCase();
  if (n.includes('fian'))    return '3.1.6';
  if (/inc.nd/.test(n))      return '3.1.7';
  if (n.includes('boleto'))  return '3.2.5';
  if (n.includes('assinat')) return '3.2.4';
  if (n.includes('contrat')) return '3.1.3';
  if (n.includes('condom'))  return '3.2.3';
  if (n.includes('encargo')) return '3.2.3';
  if (n.includes('gua'))     return '3.2.3';
  if (n.includes('iptu'))    return '3.2.3';
  if (n.includes('energia')) return '3.2.3';
  if (n.includes('multa'))   return '3.1.4';
  return '3.1.99';
}

/** só as contas-folha: lançar em conta que tem filhas o banco proíbe */
function contasDeReceitaFolha() {
  return planoReceitas.filter(c =>
    !planoReceitas.some(o => o.codigo !== c.codigo
      && o.codigo.indexOf(c.codigo + '.') === 0));
}

function rotuloDaConta(cod) {
  const c = planoReceitas.find(x => x.codigo === cod);
  return c ? c.codigo + ' — ' + c.nome : (cod || '');
}

/** os campos do abrirAcao para escolher a conta — vazio quando o
 *  perfil não enxerga o plano (o banco herda sozinho pelo mapa) */
function campoContaDoItem(atual, nome) {
  if (!planoReceitas.length) return [];
  const cod = atual || contaSugeridaDoItem(nome);
  return [
    { n: 'conta', r: 'Conta no financeiro (plano de contas)', t: 'select', largo: true,
      op: contasDeReceitaFolha().map(c => c.codigo + ' — ' + c.nome),
      v: rotuloDaConta(cod) },
    { n: 'contadica', t: 'aviso', r: 'Já veio escolhida pelo nome do item — é nela que '
      + 'ele entra no Livro Caixa e no Fluxo de Caixa. Mude só se o item for de outra natureza.' }
  ];
}

function contaEscolhida() {
  const v = valorAcao('conta');
  return v ? v.split(' — ')[0] : null;
}

/** quando o modelo troca, a sugestão da conta acompanha */
function apontarContaPeloNome(nome) {
  const el = elementoAcao('conta');
  if (el) el.value = rotuloDaConta(contaSugeridaDoItem(nome));
}

/** o chip discreto com a conta, embaixo do nome do item no cartão */
function chipDaConta(cod) {
  if (!cod) return '';
  return `<br><span style="font-size:11px;color:var(--texto-suave);background:#F3F6F8;
    border:1px solid var(--borda);border-radius:5px;padding:0 6px;display:inline-block;
    margin-top:2px;font-family:ui-monospace,Menlo,monospace">${htm(rotuloDaConta(cod))}</span>`;
}

function blocoItensContrato() {
  return `<div class="cartao"><h2>Itens da cobrança
    <span class="cnt">(${itensContrato.length})</span>
    <span class="dir"><button class="btn btn-claro" data-perm="contratos:editar"
      style="padding:5px 12px;font-size:12px" onclick="abrirItemContrato()">+ Acrescentar item</button></span></h2>
    ${mioloItensContrato()}
  </div>`;
}

/** a tabela de itens + total do mês + explicação — usada pelo cartão
 *  "Itens da cobrança" e pela janela "Itens do boleto" (v1.270) */
function mioloItensContrato() {
  const hojeMes = hojeISO().slice(0, 7);
  const linhas = itensContrato.map(it => {
    const lanc = parcelasLancadas(it);
    let andamento = '—';
    if (it.parcelas === 1)
      andamento = lanc >= 1 ? '<span class="tag tag-verde">lançada</span>'
                            : '<span class="tag tag-azul">a lançar</span>';
    else if (it.parcelas)
      andamento = lanc >= it.parcelas
        ? '<span class="tag tag-verde">encerrado</span>'
        : `<span class="tag tag-amarela">${lanc} de ${it.parcelas} lançadas</span>`;
    return `<tr${it.ativo ? '' : ' style="opacity:.55"'}>
      <td>${htm(it.nome)}${it.credito ? ' <span class="tag tag-verde">abate</span>' : ''}${
        chipDaConta(it.plano_conta || contaSugeridaDoItem(it.nome))}</td>
      <td style="text-align:right;white-space:nowrap">${it.credito ? '−' : ''}${moeda(it.valor)}</td>
      ${celulasQuandoItem('f', it)}
      <td>${tagRepasseItem(it.repasse)}</td>
      <td>${andamento}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-claro" data-perm="contratos:editar"
          style="padding:3px 9px;font-size:12px" onclick="abrirItemContrato('${it.id}')">✎</button>
        <button class="btn btn-claro" data-perm="contratos:editar"
          style="padding:3px 9px;font-size:12px" onclick="pedirTirarItem('${it.id}')">✕</button>
      </td></tr>`;
  }).join('');

  const mensal = Number(registro.valor_aluguel || 0) + somaItensNoMes(hojeMes);

  return `<div class="corpo" style="padding:0">
      <table class="mini">
        <tr><th>Item</th><th style="text-align:right">Valor/mês</th>
            <th>Começa em</th><th>Como cobra</th><th>No repasse</th>
            <th>Andamento</th><th></th></tr>
        <tr><td>Aluguel <span style="color:var(--texto-suave)">· do contrato</span>${
          chipDaConta('3.1.1')}</td>
            <td style="text-align:right"><b>${moeda(registro.valor_aluguel)}</b></td>
            <td style="white-space:nowrap">${htm(mesCurto(registro.data_inicio))}</td>
            <td>todo mês, enquanto o contrato durar</td><td>—</td><td>—</td><td></td></tr>
        ${linhas}
      </table>
      <div style="padding:10px 14px;background:#f4f7f9;display:flex;justify-content:space-between;font-size:14px">
        <span>Cobrança <b>deste mês</b> (aluguel + itens vigentes):</span>
        <b>${moeda(mensal)}</b>
      </div>
    </div>
    <p style="font-size:12px;color:var(--texto-suave);margin:8px 14px 12px;line-height:1.6">
      Cada "Aluguel do mês" soma o aluguel + os itens vigentes — item com parcelas
      <b>para sozinho na última</b>. <b>Começa em</b> e <b>Como cobra</b> se mudam aqui
      mesmo, e valem a partir das parcelas <b>previstas</b>; as já abertas ficam como
      estão. Item com <b>No repasse</b> preenchido nasce dos dois lados da parcela: cobra
      do inquilino no boleto e volta (ou sai) no repasse ao proprietário, pelo mesmo valor
      — a <b>taxa de administração continua saindo só do aluguel</b>.</p>`;
}

function _abrirItemContrato(id) {
  const it = id ? itensContrato.find(x => x.id === id) : null;
  // a apólice de INCÊNDIO deste contrato, se houver: dá valor e parcelas
  const apInc = relacionados.find(a => ehIncendio(a.tipo)
    && a.valor_parcela && a.parcelas);
  const modelos = itensPadrao.map(m => m.nome)
    .concat(apInc ? ['Seguro incêndio (da apólice)'] : [])
    .concat(['✏️ Outro (digitar o nome)…']);
  const mesAtual = hojeISO().slice(0, 7) + '-01';
  abrirAcao(it ? `Editar item: ${it.nome}` : 'Acrescentar item da cobrança', [
    ...(it ? [] : [{ n: 'modelo', r: 'Item', t: 'select', largo: true,
      op: modelos, v: modelos[0] }]),
    { n: 'nome', r: 'Nome do item', t: 'texto', largo: true, v: it ? it.nome : (itensPadrao[0] ? itensPadrao[0].nome : '') },
    { n: 'valor', r: 'Valor por mês (R$)', t: 'moeda',
      v: it ? it.valor : (itensPadrao[0] && itensPadrao[0].valor != null ? itensPadrao[0].valor : '') },
    // v1.328 — em que conta do financeiro este item entra
    ...campoContaDoItem(it ? it.plano_conta : null,
      it ? it.nome : (itensPadrao[0] ? itensPadrao[0].nome : '')),
    { n: 'sentido', r: 'Cobrar ou abater?', t: 'select',
      op: ['Cobrar do inquilino', 'Abater da cobrança'],
      v: it && it.credito ? 'Abater da cobrança' : 'Cobrar do inquilino' },
    // v1.256 — o mesmo item diz o que faz do outro lado da conta.
    // É o caso da taxa de água: cobrada do inquilino no boleto, mas
    // quem paga a conta é o proprietário, então volta no repasse.
    { n: 'repasse', r: 'E no repasse ao proprietário?', t: 'select', largo: true,
      op: REPASSE_ITEM.map(o => o.r),
      v: rotuloRepasseItem(it ? it.repasse : 'nao') },
    { n: 'parcelas', r: 'Nº de parcelas', t: 'numero',
      v: it ? (it.parcelas || '') : (itensPadrao[0] ? (itensPadrao[0].parcelas || '') : ''),
      dica: 'em branco = todo mês' },
    { n: 'inicio', r: 'Começa no mês de', t: 'data',
      v: it ? it.inicio_competencia : mesAtual,
      dica: 'qualquer dia do mês vale pelo mês inteiro' },
    // v1.221 — quando o contrato acaba no meio do mês, o aluguel já é
    // proporcional aos dias. O item raramente é: boleto, taxa e seguro
    // parcelado se cobram inteiros. Por isso o padrão é "mês inteiro" e
    // a exceção é escolha de quem cadastra, item a item.
    { n: 'ultimo', r: 'No último mês do contrato', t: 'select', largo: true,
      op: ['Cobra o mês inteiro', 'Cobra proporcional aos dias'],
      v: it && it.ultimo_mes_proporcional
        ? 'Cobra proporcional aos dias' : 'Cobra o mês inteiro' },
    { n: 'corte', t: 'aviso', r: '' }
  ], async () => {
    const nome = valorAcao('nome');
    erroSe(!nome, 'Dê um nome ao item.');
    // o campo é input type=number do abrirAcao: o valor chega com PONTO
    // decimal ("58.82") — Number() é a leitura certa; numeroBr leria
    // 58.82 como 5.882 (regra do milhar pt-BR)
    const valor = valorAcao('valor') === null ? null : Number(valorAcao('valor'));
    erroSe(!valor || !Number.isFinite(valor) || valor <= 0, 'Informe o valor do item.');
    const inicio = valorAcao('inicio');
    erroSe(!inicio, 'Informe em que mês o item começa.');
    const parcelas = valorAcao('parcelas') ? parseInt(valorAcao('parcelas'), 10) : null;
    const repasse = valorRepasseItem(valorAcao('repasse'));
    const linha = {
      contrato_id: ID, empresa_id: registro.empresa_id,
      nome, valor,
      credito: valorAcao('sentido') === 'Abater da cobrança',
      parcelas, inicio_competencia: inicio, ativo: true,
      ultimo_mes_proporcional: valorAcao('ultimo') === 'Cobra proporcional aos dias',
      repasse,
      // v1.328 — sem o campo na tela (perfil sem o plano), o banco herda
      plano_conta: contaEscolhida() || (it ? it.plano_conta : null)
        || contaSugeridaDoItem(nome),
      atualizado_em: new Date().toISOString()
    };
    const { error } = it
      ? await sb.from('contrato_itens').update(linha).eq('id', it.id)
      : await sb.from('contrato_itens').insert(linha);
    if (error) throw error;
    // o gatilho do banco já refez as PREVISTAS, dos dois lados. As que
    // já foram geradas ficam para o passo seguinte, com pergunta.
    await ofereceAplicarRepasse(repasse, it ? (it.repasse || 'nao') : 'nao');
  }, it ? '✓ Salvar item' : '+ Acrescentar');

  // o modelo escolhido pré-preenche nome/valor/parcelas
  const selMod = elementoAcao('modelo');
  if (selMod) selMod.onchange = () => {
    const v = selMod.value;
    const nomeEl = elementoAcao('nome');
    const valEl = elementoAcao('valor');
    const parEl = elementoAcao('parcelas');
    if (v === 'Seguro incêndio (da apólice)' && apInc) {
      nomeEl.value = 'Seguro incêndio';
      valEl.value = apInc.valor_parcela;   // input number: ponto decimal
      parEl.value = parcelasDoIncendio(apInc);
      aplicarCorteDaSeguradora(apInc);
      apontarContaPeloNome(nomeEl.value);   // v1.328
      return;
    }
    const m = itensPadrao.find(x => x.nome === v);
    if (m) {
      nomeEl.value = m.nome;
      valEl.value = m.valor != null ? m.valor : '';
      parEl.value = m.parcelas || '';
    } else { nomeEl.value = ''; nomeEl.focus(); }
    apontarContaPeloNome(nomeEl.value);     // v1.328
  };
}

/**
 * v1.205 — EXCLUIR O ITEM, ESCOLHENDO ATÉ ONDE VOLTA.
 *
 * Antes só saía das PREVISTAS, e quem descobria que um item nunca
 * deveria ter sido cobrado ficava sem saída pela tela.
 *
 * Quem faz o trabalho é a função contrato_item_excluir() no banco: numa
 * transação só ela apaga o item, refaz os meses do alcance escolhido e
 * — no alcance "todos" — deixa o valor recebido acompanhar SÓ onde ele
 * batia exatamente com o previsto e não veio do Asaas. Fazer isso da
 * tela seriam N chamadas soltas, e uma falha no meio deixaria metade
 * dos meses de um jeito e metade de outro.
 */
const _ESC_FUT = 'Só as parcelas futuras — as que ainda não abriram';
const _ESC_ATU = 'Também o mês atual';
const _ESC_TUD = 'Todos os meses — inclusive os já pagos';

/**
 * v1.216 — O MÊS DA 1ª PARCELA SAI DA DATA DE CORTE.
 *
 * A seguradora fecha a fatura num dia do mês. Contratou até esse dia, a
 * apólice entra na fatura daquele mês e a 1ª parcela pode ser cobrada
 * já no primeiro aluguel; contratou depois, ela só entra na fatura do
 * mês seguinte — e cobrar antes seria cobrar do inquilino um dinheiro
 * que a Moralí ainda não deve à seguradora.
 *
 * Isto SUGERE, não decide: o campo continua editável, e a faixa embaixo
 * dele diz de onde veio a sugestão. Seguradora sem dia de corte
 * cadastrado não sugere nada — some a faixa e fica como era antes.
 */
/**
 * v1.218 — QUANTAS PARCELAS O INCÊNDIO TEM.
 *
 * A apólice guarda o número, mas quem manda é a regra da seguradora: a
 * de hoje divide a anuidade em 6; a outra divide pelos meses do
 * contrato, e aí o número muda de contrato para contrato. Sem regra
 * cadastrada, vale o que está na apólice, como antes.
 */
/* v1.226 — O TIPO DA APÓLICE, LIDO COM TOLERÂNCIA.
 *
 * As 64 apólices importadas dizem "Fiança" e "Incêndio"; a partir da
 * migração da v1.226 elas passam a dizer "Seguro fiança" e "Seguro
 * incêndio", que é como o contrato já chamava em `garantia_tipo`.
 * Comparar por texto exato faria o modelo "Seguro incêndio (da
 * apólice)" sumir da janela de item no intervalo entre publicar e
 * rodar o SQL — e voltaria a quebrar no dia em que alguém escrever
 * "incendio" sem acento. */
function ehIncendio(t) { return /inc[êe]ndio/i.test(String(t || '')); }
function ehFianca(t)   { return /fian[çc]a/i.test(String(t || '')); }

/* A lista é a MESMA do gatilho `contrato_seguros_conferir()` no banco.
 * Ele recusa qualquer outro valor — e a lição de 09/08/2026 é que a
 * trava do tipo não estava num CHECK (onde eu procurei), e sim dentro
 * de uma função. Mudar aqui sem mudar lá dá erro na hora de salvar. */
const TIPOS_APOLICE = ['Fiança', 'Incêndio', 'Conteúdo',
                       'Responsabilidade civil', 'Outro'];

/** o mês em que a 1ª parcela do seguro entra, pelo dia de corte da
 *  seguradora. Mesma regra do aplicarCorteDaSeguradora, sem tocar na
 *  tela — aqui serve para JÁ CRIAR o item no mês certo. */
function mesDaPrimeiraParcela(ap) {
  const base = String(ap.inicio_vigencia || hojeISO()).slice(0, 10);
  const sg = (seguradorasFicha || []).find(x => x.id === ap.seguradora_id);
  const corte = sg && sg.dia_corte ? Number(sg.dia_corte) : null;
  const d = new Date(base + 'T12:00');
  if (corte && d.getDate() > corte) d.setMonth(d.getMonth() + 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
}

function parcelasDoIncendio(ap) {
  const sg = (seguradorasFicha || []).find(x => x.id === ap.seguradora_id);
  if (!sg || !sg.incendio_forma) return ap.parcelas;
  if (sg.incendio_forma === 'avista') return 1;
  if (sg.incendio_forma === 'contrato')
    return Number(registro && registro.prazo_meses) || ap.parcelas;
  return sg.incendio_parcelas || ap.parcelas;
}

function aplicarCorteDaSeguradora(ap) {
  const nota = elementoAcao('corte');
  const ini  = elementoAcao('inicio');
  if (!ap || !ini) return;

  const sg = (seguradorasFicha || []).find(x => x.id === ap.seguradora_id);
  const corte = sg && sg.dia_corte ? Number(sg.dia_corte) : null;
  const base = String(ap.inicio_vigencia || ap.primeira_parcela_em || hojeISO()).slice(0, 10);
  if (!corte || !base) {
    if (nota) nota.textContent = sg
      ? `${sg.nome} ainda não tem dia de corte cadastrado — escolha o mês na mão. `
        + 'Cadastre em Administração → Seguradoras e a conta passa a sair sozinha.'
      : '';
    return;
  }

  const d = new Date(base + 'T12:00');
  const diaContratacao = d.getDate();
  const passou = diaContratacao > corte;
  if (passou) d.setMonth(d.getMonth() + 1);
  ini.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';

  if (nota) nota.textContent = `${sg.nome} fecha a fatura no dia ${corte}. `
    + `A apólice começou em ${dataBr(base)}${passou
        ? ', depois do corte — então a 1ª parcela cai só na fatura do mês seguinte.'
        : ', antes do corte — então a 1ª parcela já entra na fatura deste mês.'}`;
}

function _pedirTirarItem(id) {
  const it = itensContrato.find(x => x.id === id);
  if (!it) return;
  const [ano, mes] = hojeISO().slice(0, 7).split('-');
  const atual = `${_ESC_ATU} (${mes}/${ano})`;
  abrirAcao(`Excluir o item: ${it.nome}`, [
    { n: 'escopo', r: 'De onde tirar este item?', t: 'select', largo: true,
      op: [_ESC_FUT, atual, _ESC_TUD], v: _ESC_FUT },
    { n: 'nota', t: 'aviso', r: 'Nos meses já pagos, o valor recebido acompanha o novo '
      + 'total apenas onde ele batia exatamente com o previsto. Baixa que veio do Asaas, '
      + 'ou digitada com valor diferente, fica como está — ali o número é dinheiro '
      + 'conferido, e a diferença tem de aparecer.' }
  ], async () => {
    const v = valorAcao('escopo');
    const escopo = v === _ESC_TUD ? 'tudo' : (v === atual ? 'atual' : 'futuras');
    const { error } = await sb.rpc('contrato_item_excluir',
      { p_item: id, p_escopo: escopo });
    if (error) throw error;
  }, 'Excluir');
}

// ============================================================
// v1.169 — RECEITAS DA MORALÍ NESTE CONTRATO (quem vê: comissões)
// ============================================================
// ============================================================
// v1.470 — PESSOAS DESTE CONTRATO (mockup aprovado 01/09/2026)
//
// O titular (o inquilino do contrato) nem sempre é quem MORA nem quem
// FALA — às vezes a mãe assina e faz a fiança, e o filho mora e conversa.
// `contrato_pessoas` liga vários contatos ao contrato, cada um com um
// papel e os selos "mora no imóvel" / "é quem fala". O nome leva à ficha
// do contato, onde fica a conversa dele.
// ============================================================
const PP_PAPEIS = ['Titular', 'Morador', 'Contato / Responsável', 'Fiador', 'Dependente', 'Outro'];

function ppNome(cid) {
  const c = contatosDasPessoas[cid] || (listaContatos || []).find(x => x.id === cid);
  return c ? c.nome : '(contato)';
}
function ppTelefone(cid) { const c = contatosDasPessoas[cid]; return c ? c.telefone : null; }
// v1.471 — telefone só dígitos, sem o 55 do país (as conversas guardam
// "17997716160"); serve para casar conversa por telefone quando ela não
// está ligada ao contato_id
function ppNormTel(t) { let d = String(t || '').replace(/\D/g, ''); if (d.length > 11 && d.slice(0, 2) === '55') d = d.slice(2); return d; }

function blocoPessoasDoContrato() {
  const podeEditar = typeof pode !== 'function' || pode('contratos', 'editar');

  // linha fixa do TITULAR (o inquilino do contrato), quando não foi
  // adicionado à mão na lista — assim o cartão mostra todo mundo junto
  const titId = registro.inquilino_id;
  const titCt = (pessoasContrato || []).find(x => x.id === titId) || {};
  const jaTitular = pessoasDoContrato.some(p => p.contato_id === titId);
  const linhaTitular = (titId && !jaTitular) ? `<tr>
      <td><a href="contato.html?id=${htm(titId)}"><b>${htm(titCt.nome || nomePessoa(titId) || '(titular)')}</b></a>
        <div style="margin-top:5px"><span class="tag tag-cinza">assina o contrato / seguro fiança</span></div></td>
      <td><span class="tag tag-cinza">Titular</span></td>
      <td style="white-space:nowrap">${titCt.telefone ? htm(titCt.telefone) : '—'}</td>
      <td></td></tr>` : '';

  const linhas = pessoasDoContrato.map(p => {
    const tel = ppTelefone(p.contato_id);
    const selos = [
      p.contato_principal ? '<span class="tag tag-verde">é quem fala</span>' : '',
      p.mora ? '<span class="tag tag-azul">mora no imóvel</span>'
             : '<span class="tag tag-amarela">não mora no imóvel</span>'
    ].filter(Boolean).join(' ');
    const acoes = !podeEditar ? '' :
      `<button class="btn btn-claro" style="padding:3px 9px;font-size:12px"
         title="Editar" onclick="abrirVincularPessoa('${jsq(p.id)}')">✎</button>
       <button class="btn btn-claro" style="padding:3px 9px;font-size:12px"
         title="Tirar do contrato" onclick="tirarVinculoPessoa('${jsq(p.id)}')">✕</button>`;
    return `<tr>
      <td><a href="contato.html?id=${htm(p.contato_id)}"><b>${htm(ppNome(p.contato_id))}</b></a>${
        p.observacao ? `<div class="ci-orig">${htm(p.observacao)}</div>` : ''}
        <div style="margin-top:5px;display:flex;gap:6px;flex-wrap:wrap">${selos}</div></td>
      <td><span class="tag tag-cinza">${htm(p.papel || 'Outro')}</span></td>
      <td style="white-space:nowrap">${tel ? htm(tel) : '—'}</td>
      <td style="white-space:nowrap;text-align:right">${acoes}</td></tr>`;
  }).join('');

  const total = pessoasDoContrato.length + (linhaTitular ? 1 : 0);
  const corpo = (linhaTitular || linhas)
    ? `<table class="mini"><tr><th>Pessoa</th><th>Papel</th><th>Telefone</th><th></th></tr>${linhaTitular}${linhas}</table>`
    : `<div style="padding:16px;color:var(--texto-suave)">Ninguém vinculado ainda.
       Use <b>+ Pessoa</b> para registrar quem mora e quem fala com vocês.</div>`;

  return `<div class="cartao"><h2>Pessoas deste contrato <span class="cnt">(${total})</span>
      ${podeEditar ? `<span class="dir"><button class="btn btn-claro" data-perm="contratos:editar"
        style="padding:5px 12px;font-size:12px" onclick="abrirVincularPessoa()">+ Pessoa</button></span>` : ''}</h2>
    <div class="corpo" style="padding:0">${corpo}</div>
    <p style="font-size:12px;color:var(--texto-suave);margin:0;padding:8px 14px 12px;line-height:1.6">
      O <b>titular</b> é o inquilino do contrato. Aqui você registra quem <b>mora</b> e quem <b>fala</b> —
      o nome leva à ficha do contato, onde fica a conversa dele.</p>
  </div>`;
}

async function _abrirVincularPessoa(id) {
  if (typeof garantirListasCompletas === 'function') await garantirListasCompletas();
  const p = id ? pessoasDoContrato.find(x => String(x.id) === String(id)) : null;
  const ops = (listaContatos || []).map(c => ({ id: c.id, r: c.nome + (c.codigo ? ' · ' + c.codigo : '') }));
  const rotuloDe = cid => { const o = ops.find(x => x.id === cid); return o ? o.r : ''; };
  abrirAcao(id ? 'Editar pessoa do contrato' : 'Vincular pessoa ao contrato', [
    { n: 'contato', r: 'Contato', t: 'select', largo: true,
      op: [''].concat(ops.map(o => o.r)), v: p ? rotuloDe(p.contato_id) : '' },
    { n: 'papel', r: 'Papel', t: 'select', op: PP_PAPEIS, v: p ? (p.papel || 'Morador') : 'Morador' },
    { n: 'obs', r: 'Parentesco / observação', t: 'texto', v: p ? p.observacao : '', dica: 'ex.: filho da titular' },
    { n: 'mora', r: 'Mora no imóvel?', t: 'select', op: ['Sim', 'Não'], v: p ? (p.mora ? 'Sim' : 'Não') : 'Sim' },
    { n: 'fala', r: 'É quem fala (contato principal)?', t: 'select', op: ['Sim', 'Não'], v: p ? (p.contato_principal ? 'Sim' : 'Não') : 'Não' }
  ], async () => {
    const alvo = ops.find(o => o.r === valorAcao('contato'));
    erroSe(!alvo, 'Escolha um contato para vincular.');
    erroSe(!p && pessoasDoContrato.some(x => x.contato_id === alvo.id),
      'Essa pessoa já está vinculada a este contrato.');
    const linha = {
      empresa_id: registro.empresa_id, contrato_id: ID, contato_id: alvo.id,
      papel: valorAcao('papel') || 'Outro',
      mora: valorAcao('mora') !== 'Não',
      contato_principal: valorAcao('fala') === 'Sim',
      observacao: valorAcao('obs'),
      atualizado_em: new Date().toISOString()
    };
    const { error } = p
      ? await sb.from('contrato_pessoas').update(linha).eq('id', p.id)
      : await sb.from('contrato_pessoas').insert(linha);
    if (error) throw error;
  }, id ? '✓ Salvar' : '✓ Vincular');
}

function _tirarVinculoPessoa(id) {
  const p = pessoasDoContrato.find(x => String(x.id) === String(id));
  if (!p) return;
  abrirAcao(`Tirar ${ppNome(p.contato_id)} deste contrato?`, [
    { n: 'aviso', t: 'aviso', r: 'A pessoa deixa de aparecer neste contrato. O contato dela NÃO é apagado.' }
  ], async () => {
    const { error } = await sb.from('contrato_pessoas').delete().eq('id', p.id);
    if (error) throw error;
  }, 'Tirar');
}

// ============================================================
// v1.471 — CONVERSAS DESTE IMÓVEL (entrega 2): junta o WhatsApp de todas
// as pessoas ligadas ao contrato (titular + vinculadas), com a etiqueta
// de quem falou. Só lê; para responder, abre-se a conversa do contato.
// ============================================================
function blocoConversasDoImovel() {
  if (typeof pode === 'function' && !pode('conversas', 'ver')) return '';
  // quem é cada pessoa, indexado por contato_id E por telefone (a
  // conversa às vezes tem só o telefone)
  const papelDe = {}, papelTel = {};
  const reg = (cid, tel, nome, papel) => {
    if (cid) papelDe[cid] = { nome, papel, cid };
    const n = ppNormTel(tel); if (n.length >= 10) papelTel[n] = { nome, papel, cid };
  };
  if (registro.inquilino_id)
    reg(registro.inquilino_id,
        (pessoasContrato.find(x => x.id === registro.inquilino_id) || {}).telefone,
        ppNome(registro.inquilino_id), 'titular');
  pessoasDoContrato.forEach(p =>
    reg(p.contato_id, ppTelefone(p.contato_id), ppNome(p.contato_id), (p.papel || '').toLowerCase()));
  const quemDe = conv => papelDe[conv.contato_id] || papelTel[ppNormTel(conv.telefone)]
    || { nome: conv.nome || '?', papel: '', cid: conv.contato_id };
  const convDe = {};
  conversasDoImovel.forEach(c => { convDe[c.id] = c; });

  const fmt = d => { try {
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; } };

  const linhas = mensagensDoImovel.map(m => {
    const conv = convDe[m.conversa_id] || {};
    const q = quemDe(conv);
    const txt = m.texto || (m.tipo && m.tipo !== 'texto' ? '[' + m.tipo + ']' : '');
    const et = `${htm(q.nome || '?')}${q.papel ? ' · ' + htm(q.papel) : ''}`;
    return `<div style="display:flex;gap:10px;align-items:flex-start;padding:11px 16px;border-bottom:1px solid #F0F0EF">
      <span class="tag tag-cinza" style="flex-shrink:0">${q.cid
        ? `<a href="contato.html?id=${htm(q.cid)}" style="color:inherit;text-decoration:none">${et}</a>` : et}</span>
      <span style="flex:1;min-width:0">${m.de_mim ? '<b style="color:var(--texto-suave)">Moralí:</b> ' : ''}${htm(String(txt).slice(0, 160))}</span>
      <span style="color:var(--texto-suave);font-size:12px;white-space:nowrap">${htm(fmt(m.recebida_em))}</span>
    </div>`;
  }).join('');

  const corpo = mensagensDoImovel.length ? linhas
    : `<div style="padding:16px;color:var(--texto-suave)">Nenhuma conversa de WhatsApp registrada com as pessoas deste contrato ainda.</div>`;

  return `<div class="cartao"><h2>Conversas deste imóvel
      <span class="cnt">(${mensagensDoImovel.length ? 'últimas ' + mensagensDoImovel.length : 0})</span></h2>
    <div class="corpo" style="padding:0">${corpo}</div>
    <p style="font-size:12px;color:var(--texto-suave);margin:0;padding:8px 14px 12px;line-height:1.6">
      Junta o WhatsApp de <b>todas</b> as pessoas ligadas ao contrato — não importa por qual delas veio a mensagem.
      Clique na etiqueta para abrir a conversa da pessoa.</p>
  </div>`;
}

function blocoReceitasMorali() {
  if (typeof pode === 'function' && !pode('comissoes', 'ver')) return '';
  const r = registro;
  const taxaPct = r.taxa_adm_percentual != null ? r.taxa_adm_percentual
    : (imovelDoContrato ? imovelDoContrato.taxa_adm_percentual : null);
  const taxaFixa = r.taxa_adm_valor != null ? r.taxa_adm_valor
    : (imovelDoContrato ? imovelDoContrato.taxa_adm_valor : null);
  const taxaMes = taxaPct != null
    ? Math.round(Number(r.valor_aluguel || 0) * Number(taxaPct) * 100) / 100
    : (taxaFixa != null ? Number(taxaFixa) : null);
  const itemInc = itensContrato.find(i => /inc[êe]ndio/i.test(i.nome) && i.parcelas);
  // v1.447 — comissão e setup vêm da apólice VIGENTE de cada tipo; o %
  // é sobre o valor do seguro (mensal na fiança, parcela no incêndio).
  const _aps = relacionados || [];
  const _vig = re => _aps.find(a => re.test(a.tipo || '') && a.status === 'Vigente')
    || _aps.find(a => re.test(a.tipo || ''));
  const apF = _vig(/fian/i), apI = _vig(/inc[êe]nd/i);
  const pct = (c, b) => (c != null && Number(b) > 0)
    ? ` · ${(c / b * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '';
  const comF = apF ? apF.comissao : null, comI = apI ? apI.comissao : null;
  const setup = apF ? apF.setup : null;
  const fonteF = apF ? `da apólice ${apF.seguradora || 'de fiança'} vigente` : 'sem apólice de fiança';
  const fonteI = apI ? `da apólice ${apI.seguradora || 'de incêndio'} vigente` : 'sem apólice de incêndio';
  const linhas = [
    ['Taxa Mensal' + (taxaPct != null
       ? ` · ${(taxaPct * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% do aluguel` : ''),
     taxaMes != null ? moeda(taxaMes) : '—', 'todo mês', ''],
    ['Comissão da fiança', comF != null ? moeda(comF) + pct(comF, apF && apF.valor_mensal) : '—',
     'todo mês, enquanto a fiança durar', fonteF],
    ['Comissão do seguro incêndio', comI != null ? moeda(comI) + pct(comI, apI && apI.valor_parcela) : '—',
     itemInc ? `${itemInc.parcelas} parcelas, junto com o incêndio` : 'por parcela do incêndio', fonteI],
    ['Taxa de setup', setup != null ? moeda(setup) : '—', 'uma vez, na ativação', apF ? fonteF : '']
  ];
  const recorrente = (taxaMes || 0) + Number(comF || 0);
  return `<div class="cartao"><h2>Receitas da Moralí neste contrato</h2>
    <div class="corpo" style="padding:0">
      <table class="mini">
        <tr><th>Origem</th><th style="text-align:right">Valor</th><th>Quando</th></tr>
        ${linhas.map(([n, v, q, fonte]) => `<tr><td>${n}</td>
          <td style="text-align:right">${v}</td>
          <td>${htm(q)}${fonte ? `<div class="ci-orig">${htm(fonte)}</div>` : ''}</td></tr>`).join('')}
      </table>
      <div style="padding:10px 14px;background:#f4f7f9;display:flex;justify-content:space-between;font-size:14px">
        <span>Receita recorrente/mês: <b>${moeda(recorrente)}</b></span>
        <span>${setup ? '+ ' + moeda(setup) + ' na ativação' : ''}</span>
      </div>
    </div>
    <p style="font-size:12px;color:var(--texto-suave);margin:0;padding:8px 14px 12px;line-height:1.6">
      A comissão e o setup vêm da <b>apólice vigente</b> — edite na apólice (botão ✎ Corrigir). A Taxa Mensal é do contrato.</p>
  </div>`;
}

function _abrirReceitasMorali() {
  abrirAcao('Receitas da Moralí neste contrato', [
    { n: 'fianca', r: 'Comissão da fiança (R$/mês)', t: 'moeda', v: registro.comissao_fianca },
    { n: 'incendio', r: 'Comissão do incêndio (R$/parcela)', t: 'moeda', v: registro.comissao_incendio },
    { n: 'setup', r: 'Taxa de setup — uma vez (R$)', t: 'moeda', v: registro.receita_setup }
  ], async () => {
    const n = v => v === null ? null : Number(v);
    const { error } = await sb.from('contratos').update({
      comissao_fianca: n(valorAcao('fianca')),
      comissao_incendio: n(valorAcao('incendio')),
      receita_setup: n(valorAcao('setup'))
    }).eq('id', ID);
    if (error) throw error;
  }, '✓ Salvar');
}

function blocoApolices() {
  if (!relacionados.length)
    return `<div class="corpo" style="color:#8a94a1">Nenhuma apólice registrada.
      ${registro.garantia_tipo === 'Seguro fiança'
        ? '<br><b>Atenção:</b> a garantia deste contrato é seguro fiança e não há apólice cadastrada'
          + ' — use <b>+ Nova apólice</b> aqui em cima.' : ''}</div>`;
  return relacionados.map(a => {
    const vigente = a.status === 'Vigente';
    const dias = a.fim_vigencia
      ? Math.round((new Date(a.fim_vigencia + 'T12:00:00') - new Date()) / 86400000) : null;
    const prazo = dias === null ? ''
      : (dias < 0 ? `<b style="color:var(--erro)">venceu há ${-dias} dias</b>`
                  : (dias <= 30 ? `<b style="color:var(--alerta)">vence em ${dias} dias</b>`
                                : `vence em ${dias} dias`));
    return `
    <div class="orc ${vigente ? 'aprovado' : 'fora'}">
      <div class="orc-val">${a.valor_mensal != null ? moeda(a.valor_mensal) : moeda(a.valor_parcela)}
        <small>${a.valor_mensal != null ? 'por mês' : (a.parcelas ? a.parcelas + 'x' : 'parcela')}</small></div>
      <div class="orc-txt">
        <!-- v1.226 — A SEGURADORA SAI DO MEIO DA FRASE.
             Antes era "tipo · seguradora · plano", tudo do mesmo tamanho,
             e como as 64 apólices importadas estavam SEM seguradora, o
             que aparecia era "Fiança · LOFT" — onde LOFT é o plano.
             Dava para ler a vida inteira achando que a seguradora estava
             preenchida. Agora ela tem lugar próprio, e a falta dela
             aparece como falta. -->
        <b>${htm(a.tipo)}</b> · ${a.seguradora
          ? '<b>' + htm(a.seguradora) + '</b>'
          : '<span style="color:var(--alerta);font-weight:600">' + icone('aviso', 11) + ' sem seguradora</span>'}
        <div class="orc-p">${a.plano ? 'Plano ' + htm(a.plano) + ' · ' : ''}${a.apolice ? 'Apólice ' + htm(a.apolice) + ' · ' : ''}
          ${a.inicio_vigencia ? dataBr(a.inicio_vigencia) : '—'} a ${a.fim_vigencia ? dataBr(a.fim_vigencia) : '—'}
          ${vigente && prazo ? ' · ' + prazo : ''}</div>
        ${/Importado da planilha/i.test(a.observacoes || '')
          ? `<div class="orc-p" style="font-size:12px;color:var(--alerta);font-weight:600">
               ${icone('aviso', 11)} Vigência ESTIMADA pelo aniversário do contrato, não lida da apólice.
               Confira com a seguradora e clique em Corrigir.</div>`
          : (a.observacoes ? `<div class="orc-p" style="font-size:12px">${htm(a.observacoes)}</div>` : '')}
      </div>
      <div class="orc-lado">
        <span class="tag ${COR_APOLICE[a.status] || 'tag-cinza'}">${htm(a.status)}</span>
        <!-- v1.267 — os três botões numa LINHA (o .orc-lado empilha em
             coluna; empilhados, esticavam o cartão inteiro na vertical).
             O miolo próprio é para não mexer no .orc-lado, que os
             orçamentos do caso também usam. -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn btn-claro" data-perm="contratos:editar"
          style="padding:5px 12px;font-size:12px" onclick="abrirEditarApolice('${a.id}')">✎ Corrigir</button>
        ${vigente ? `<button class="btn btn-claro" data-perm="contratos:editar"
          style="padding:5px 12px;font-size:12px" onclick="abrirRenovarApolice('${a.id}')">↻ Renovar</button>
          <button class="btn btn-claro" data-perm="contratos:editar"
          style="padding:5px 12px;font-size:12px" onclick="abrirNovoSinistro('${a.id}')">${icone('aviso', 12)} Acionar</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

/** Sinistros, com a linha do tempo de cada um. */
function blocoSinistros() {
  const corpo = !sinistrosFicha.length
    ? '<div class="corpo" style="color:#8a94a1">Nenhum sinistro registrado neste contrato.</div>'
    : sinistrosFicha.map(s => {
      const andam = andamentosFicha[s.id] || [];
      const abertas = andam.filter(a => a.tipo === 'Exigência' && !a.cumprido_em);
      const linha = andam.slice(0, 6).map(a => `
        <div class="and ${a.cumprido_em ? 'ok' : (a.prazo && a.prazo < hojeISO() ? 'atrasado' : '')}">
          <span class="and-tipo">${htm(a.tipo)}</span>
          <span class="and-txt">${htm(a.descricao)}</span>
          <span class="and-meta">${a.de_quem === 'Nós' ? icone('malaTrabalho', 12) + ' nós' : icone('predio', 12) + ' seguradora'}${
            a.prazo ? ' · prazo ' + dataBr(a.prazo) : ''}${
            a.cumprido_em ? ' · ✓ ' + dataBr(a.cumprido_em) : ''}</span>
          ${(!a.cumprido_em && a.tipo === 'Exigência')
            ? `<button class="btn btn-claro" data-perm="contratos:editar"
                 style="padding:3px 9px;font-size:11px"
                 onclick="cumprirExigencia('${a.id}')">✓ Cumpri</button>` : ''}
        </div>`).join('');
      return `
      <div class="sinistro ${s.alerta ? 'com-alerta' : ''}">
        <div class="sin-topo">
          <b>${htm(s.codigo || '')} · ${htm(s.tipo)}</b>
          <span class="tag ${COR_SINISTRO[s.status] || 'tag-cinza'}">${htm(s.status)}</span>
          ${s.alerta ? `<span class="tag tag-vermelha">${htm(s.alerta)}</span>` : ''}
          ${s.protocolo ? `<span class="sin-prot">protocolo ${htm(s.protocolo)}</span>` : ''}
          <span class="dir">
            ${s.em_andamento ? `
              <button class="btn btn-claro" data-perm="contratos:editar"
                style="padding:4px 10px;font-size:12px" onclick="abrirExigencia('${s.id}')">+ Exigência</button>
              ${s.status !== 'Deferido' ? `<button class="btn btn-claro" data-perm="contratos:editar"
                style="padding:4px 10px;font-size:12px" onclick="abrirDeferir('${s.id}')">✓ Deferido</button>`
              : `<button class="btn" data-perm="contratos:editar"
                style="padding:4px 10px;font-size:12px" onclick="abrirRecebimento('${s.id}')">${icone('moeda', 13)} Recebi</button>`}
            ` : ''}
          </span>
        </div>
        <div class="sin-nums">
          ${s.valor_pleiteado != null ? `<span><i>pleiteado</i> ${moeda(s.valor_pleiteado)}</span>` : ''}
          ${s.valor_deferido  != null ? `<span><i>deferido</i> ${moeda(s.valor_deferido)}</span>` : ''}
          ${s.valor_recebido  != null ? `<span><i>recebido</i> ${moeda(s.valor_recebido)}</span>` : ''}
          ${s.data_fato ? `<span><i>fato</i> ${dataBr(s.data_fato)}</span>` : ''}
          ${s.data_abertura ? `<span><i>aberto</i> ${dataBr(s.data_abertura)}</span>` : ''}
          ${s.previsao_pagamento && !s.data_recebimento
            ? `<span><i>pagamento previsto</i> ${dataBr(s.previsao_pagamento)}</span>` : ''}
          ${abertas.length ? `<span style="color:var(--alerta)"><i>exigências abertas</i> ${abertas.length}</span>` : ''}
        </div>
        ${linha ? `<div class="andamentos">${linha}</div>` : ''}
      </div>`;
    }).join('');
  return `<div class="cartao">
    <h2>Sinistros <span class="cnt">(${sinistrosFicha.length})</span>
      <span class="dir">${relacionados.some(a => a.status === 'Vigente')
        ? `<button class="btn btn-claro" data-perm="contratos:editar"
             style="padding:5px 12px;font-size:12px" onclick="abrirNovoSinistro()">+ Acionar seguro</button>`
        : '<span style="color:#8a94a1;font-size:12px">acione a partir de uma apólice vigente</span>'}</span></h2>
    ${corpo}</div>`;
}

/** v1.318 — o dia anterior a uma data ISO, em hora local. */
function diaAnterior(iso) {
  if (!iso) return '';
  const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return '';
  const dt = new Date(a, m - 1, d - 1);
  return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0')
    + '-' + String(dt.getDate()).padStart(2, '0');
}

/** Quantos dias faltam para uma data (negativo = já passou). */
function diasAteODia(iso) {
  if (!iso) return null;
  return Math.round((new Date(String(iso).slice(0, 10) + 'T12:00')
                   - new Date(hojeISO() + 'T12:00')) / 86400000);
}

// ============================================================
// v1.319 — CHECK-LIST DA LOCAÇÃO E DO ENCERRAMENTO
//
// O papel que ficava na gaveta, dentro da ficha. Três decisões que
// explicam o desenho:
//
// 1. NÃO SÃO TAREFAS. Quinze tarefas por locação afogariam a agenda —
//    foi o que a régua de follow-up fez em agosto (87 de 98 tarefas
//    eram dela). Check-list é lista de conferência, não fila.
//
// 2. O CRM MARCA SOZINHO O QUE ELE SABE. Sete itens da locação e três
//    do encerramento são conferidos aqui, ao desenhar — e não
//    gravados. Assim a resposta é sempre a de agora: cancelou a
//    apólice, o item volta a ficar aberto na hora.
//
// 3. SÓ O OBRIGATÓRIO CUTUCA. Se os quinze entrassem no "Pede
//    atenção", ele viraria ruído e ninguém olharia mais — o mesmo
//    erro que a régua cometeu.
// ============================================================

/** Qual lista este contrato mostra: a de entrada ou a de saída. */
function listaDoChecklist() {
  return ['Aviso Prévio', 'Encerrado'].indexOf(registro.status) > -1
    ? 'encerramento' : 'locacao';
}

/**
 * O check-list vale para locação NOVA.
 *
 * Sem esta data, os 60 contratos da carteira amanheceriam com umas
 * 900 pendências que ninguém pediu. Quem decide é
 * `empresas.checklist_a_partir_de`; contrato anterior a ela não
 * mostra o cartão.
 */
function checklistValeAqui() {
  if (!checklistItens.length) return false;
  const desde = PERM.empresa && PERM.empresa.checklist_a_partir_de;
  if (!desde) return false;
  const nasceu = String(registro.criado_em || '').slice(0, 10);
  return !!nasceu && nasceu >= String(desde).slice(0, 10);
}

/**
 * As conferências que o CRM faz sozinho.
 *
 * Devolve `{ feito, porque }`, ou null quando a chave não tem regra
 * escrita aqui — e aí o item cai para "a pessoa marca", que é o
 * comportamento seguro para uma chave cadastrada no banco antes de a
 * regra existir.
 */
function checklistAutomatico(chave) {
  const apolices = relacionados || [];
  const vigente = function (t) {
    return apolices.some(function (a) {
      return String(a.tipo || '').toLowerCase().indexOf(t) > -1 && a.status !== 'Cancelada';
    });
  };

  if (chave === 'cadastro')
    return { feito: true, porque: 'contrato criado em ' + dataBr(registro.criado_em) };

  if (chave === 'garantia') {
    // v1.387 — a coluna é `garantia_tipo`, não `garantia`. Lendo o nome
    // errado, `tem` dava sempre falso e o item respondia "o contrato
    // está sem garantia cadastrada" em QUALQUER contrato, mesmo com a
    // apólice de fiança vigente ao lado. O item nunca pôde ser marcado.
    const tem = !!registro.garantia_tipo;
    const fianca = /fian/i.test(String(registro.garantia_tipo || ''));
    const ok = tem && (!fianca || vigente('fian'));
    return { feito: ok, porque: !tem ? 'o contrato está sem garantia cadastrada'
      : (ok ? String(registro.garantia_tipo) + (fianca ? ' · apólice vigente' : '')
            : 'garantia é seguro fiança e não há apólice vigente') };
  }

  if (chave === 'incendio') {
    const ok = vigente('inc');
    return { feito: ok, porque: ok ? 'apólice de incêndio vigente'
                                   : 'não há apólice de incêndio neste contrato' };
  }

  if (chave === 'financeiro') {
    const n = (mesesContrato || []).length;
    return { feito: n > 0, porque: n ? n + ' parcela(s) geradas'
                                     : 'nenhuma parcela gerada ainda' };
  }

  if (chave === 'indice') {
    const ok = !!registro.indice_reajuste
      && registro.multa_percentual !== null && registro.multa_percentual !== undefined
      && registro.juros_mes_percentual !== null && registro.juros_mes_percentual !== undefined;
    return { feito: ok, porque: ok
      ? registro.indice_reajuste + ' · multa e juros preenchidos'
      : 'falta índice, multa ou juros no contrato' };
  }

  if (chave === 'anexos') {
    // 24/08/2026 — era `anexosFicha`, nome que nunca existiu neste
    // arquivo (sobra de renomeação). A lista se chama `anexos` e é
    // carregada pela carregarAnexosDoRegistro(), que serve a
    // qualquer objeto da ficha. Quebrava o desenho da ficha inteira
    // toda vez que o checklist da locação avaliava este item.
    const n = (anexos || []).length;
    return { feito: n > 0, porque: n ? n + ' arquivo(s) no contrato'
                                     : 'nenhum arquivo anexado' };
  }

  if (chave === 'anuncio') {
    const s = imovelDoContrato && imovelDoContrato.situacao;
    if (!s) return { feito: false, porque: 'não consegui ler a situação do imóvel' };
    return { feito: !/dispon/i.test(s), porque: 'imóvel está como "' + s + '"' };
  }

  // ---- encerramento ----
  if (chave === 'encerrado')
    return { feito: registro.status === 'Encerrado',
             porque: 'o contrato está como "' + (registro.status || '—') + '"' };

  if (chave === 'sem_debito') {
    const abertas = (mesesContrato || []).filter(function (c) {
      return c.etapa !== 'Cancelada' && !c.recebido_em
        && String(c.vencimento || '') <= hojeISO();
    });
    return { feito: abertas.length === 0,
             porque: abertas.length ? abertas.length + ' parcela(s) vencidas sem baixa'
                                    : 'nenhuma parcela vencida em aberto' };
  }

  if (chave === 'sem_repasse') {
    const pend = (mesesContrato || []).filter(function (c) {
      return c.etapa !== 'Cancelada' && c.recebido_em && !c.repassado_em;
    });
    return { feito: pend.length === 0,
             porque: pend.length ? pend.length + ' parcela(s) recebidas e não repassadas'
                                 : 'nada recebido esperando repasse' };
  }

  return null;
}

/** O estado de cada item da lista da vez — é daqui que saem o cartão E
 *  a linha do radar, para os dois nunca discordarem. */
function checklistDaFicha() {
  const lista = listaDoChecklist();
  return (checklistItens || [])
    .filter(function (i) { return i.lista === lista; })
    .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); })
    .map(function (i) {
      const auto = i.automatico ? checklistAutomatico(i.automatico) : null;
      const mao = (checklistFeito || []).find(function (m) { return m.item_id === i.id; });
      if (auto) return { i: i, automatico: true, feito: auto.feito, porque: auto.porque };
      return { i: i, automatico: false, feito: !!mao,
               porque: mao
                 ? (mao.feito_por_nome || 'alguém') + ' · ' + dataBr(mao.feito_em)
                   + (mao.observacao ? ' · "' + mao.observacao + '"' : '')
                 : 'ninguém marcou ainda' };
    });
}

/** O que falta e é obrigatório — o que o radar mostra. */
function checklistPendentes() {
  if (ALVO !== 'contrato' || !checklistValeAqui()) return [];
  return checklistDaFicha().filter(function (x) { return x.i.obrigatorio && !x.feito; });
}

/**
 * v1.385 — A LINHA DO "PEDE ATENÇÃO" LEVA AO CARTÃO QUE A RESOLVE.
 *
 * O comentário do radar já dizia que o check-list "se resolve na própria
 * ficha, dois cartões abaixo" — mas não havia como chegar lá: o aviso
 * apontava para um lugar que a pessoa tinha de achar sozinha.
 *
 * Se o cartão não estiver no layout, o clique não morre calado: o radar
 * aparece mesmo sem a seção posicionada, e é justamente aí que o aviso
 * não teria para onde levar. A mensagem diz onde resolver.
 *
 * Cartão recolhido abre — chegar num título fechado seria a mesma
 * frustração de não chegar.
 */
function irParaCartaoDaFicha(id) {
  const el = document.getElementById(id);
  if (!el) {
    // v1.386 — alert() do navegador, NÃO o alerta() da casa: aquele
    // escreve em #modal-erro, que é a linha de erro DENTRO da janela
    // modal. Sem janela aberta o texto cai num elemento invisível e o
    // clique parece não fazer nada — foi o que aconteceu na v1.385.
    alert('Este cartão não está no layout desta ficha.\n\n'
        + 'Ponha a seção em Administração \u2192 Layout, no objeto Contrato, '
        + 'para resolver por aqui.');
    return;
  }
  el.classList.remove('fechado');
  el.classList.remove('fcc-destacado');
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // sem forçar o recálculo, clicar duas vezes seguidas não pisca de novo
  void el.offsetWidth;
  el.classList.add('fcc-destacado');
  setTimeout(function () { el.classList.remove('fcc-destacado'); }, 1800);
}

function blocoChecklist() {
  if (ALVO !== 'contrato' || !checklistValeAqui()) return '';
  const linhas = checklistDaFicha();
  if (!linhas.length) return '';

  const feitos = linhas.filter(function (x) { return x.feito; }).length;
  const pct = Math.round((feitos / linhas.length) * 100);
  const titulo = listaDoChecklist() === 'encerramento'
    ? 'Check-list do encerramento' : 'Check-list da locação';

  const corpo = linhas.map(function (x) {
    return '<div class="ck-l' + (x.feito ? ' feito' : '')
      + (!x.feito && x.i.obrigatorio ? ' pendente-obrig' : '') + '">'
      + '<input type="checkbox"' + (x.feito ? ' checked' : '')
      + (x.automatico ? ' disabled' : '') + ' data-perm="contratos:editar"'
      + (x.automatico ? '' : ' onchange="marcarChecklist(this, \'' + htm(x.i.id) + '\')"')
      + '>'
      + '<span class="t">' + htm(x.i.texto)
      + '<span class="quem">' + (x.automatico ? 'o CRM conferiu · ' : '')
      + htm(x.porque) + '</span></span>'
      + (x.automatico ? '<span class="ck-selo auto">automático</span>' : '')
      + (x.i.obrigatorio && !x.feito ? '<span class="ck-selo obrig">obrigatório</span>' : '')
      + '</div>';
  }).join('');

  // v1.385 — o id existe para a linha do "Pede atenção" poder rolar
  // até aqui. Ver irParaCartaoDaFicha().
  return '<div class="cartao" id="cartao-checklist"><h2>' + htm(titulo)
    + ' <span class="cnt">' + feitos + ' de ' + linhas.length + '</span></h2>'
    + '<div class="ck-barra"><i style="width:' + pct + '%"></i></div>'
    + corpo + '</div>';
}

/** Marca e desmarca um item — só os manuais chegam aqui. */
async function marcarChecklist(caixa, itemId) {
  caixa.disabled = true;
  const r = caixa.checked
    ? await sb.from('contrato_checklist').insert({
        empresa_id: registro.empresa_id, contrato_id: ID, item_id: itemId,
        feito_por: (PERM.perfil && PERM.perfil.usuario_id) || null,
        feito_por_nome: (PERM.perfil && PERM.perfil.nome) || null })
    : await sb.from('contrato_checklist').delete()
        .eq('contrato_id', ID).eq('item_id', itemId);
  caixa.disabled = false;

  if (r.error) {                       // a caixa não mente sobre o banco
    caixa.checked = !caixa.checked;
    alert(r.error.message);
    return;
  }
  await carregarFicha();
}

/**
 * Histórico de reajustes — o que a planilha nunca guardou.
 *
 * v1.314 — O BOTÃO SÓ ABRE NO ANIVERSÁRIO.
 *
 * O "Aplicar reajuste" existia em dois lugares (a barra de ações e
 * aqui), sempre clicável, e aplicar duas vezes é um aluguel reajustado
 * em cima do reajustado — sem nada avisando, porque cada aplicação é
 * legítima sozinha. Agora existe num lugar só, o cartão, e fica
 * DESLIGADO enquanto o próximo reajuste não chega, com o motivo e a
 * data no passar do mouse.
 *
 * Contrato SEM data de próximo reajuste continua com o botão livre: o
 * CRM não sabe quando é, e travar por não saber seria pior.
 */
function blocoReajustes() {
  const dias = diasAteODia(registro.proximo_reajuste);
  const cedo = dias !== null && dias > 0;
  const dica = cedo
    ? `O próximo reajuste é em ${dataBr(registro.proximo_reajuste)} — faltam ${dias} dia(s). `
      + 'O botão abre no dia; se a data estiver errada, corrija no cartão Reajuste.'
    : 'Aplica o índice, sobe o aluguel e recalcula as parcelas previstas';

  const corpo = !reajustesFicha.length
    ? '<div class="corpo" style="color:#8a94a1">Nenhum reajuste aplicado pelo CRM ainda.</div>'
    : `<table class="mini">${reajustesFicha.map(r => `
      <tr>
        <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${dataBr(r.aplicado_em)}</td>
        <td>${moeda(r.valor_anterior)} → <b>${moeda(r.valor_novo)}</b>
          <div style="color:var(--texto-suave);font-size:12px">${htm(r.indice || 'sem índice')}${
            r.percentual != null ? ' · ' + (r.percentual * 100).toFixed(2).replace('.', ',') + '%' : ''}${
            r.observacao ? ' · ' + htm(r.observacao) : ''}</div></td>
      </tr>`).join('')}</table>`;
  return `<div class="cartao">
    <h2>Reajustes <span class="cnt">(${reajustesFicha.length})</span>
      <span class="dir"><button class="btn btn-claro" data-perm="contratos:editar"
        style="padding:5px 12px;font-size:12px" title="${htm(dica)}"
        ${cedo ? 'disabled' : ''} onclick="abrirReajuste()">＄ Aplicar reajuste</button>${
        cedo ? `<span class="rj-quando">próximo em ${htm(dataBr(registro.proximo_reajuste))}</span>` : ''
      }</span></h2>
    ${corpo}</div>`;
}

/** A linha do tempo do sinistro, na ficha própria: mais espaço, todos os
 *  andamentos (não só os 6 primeiros) e o botão de cumprir em cada
 *  exigência aberta. */
function blocoLinhaDoTempo() {
  if (!relacionados.length)
    return `<div class="corpo" style="color:#8a94a1">Nenhum andamento registrado.
      Use os botões acima para registrar exigência, deferimento ou recebimento.</div>`;
  return `<div class="andamentos" style="margin:0;padding:8px 16px 16px">` +
    relacionados.map(a => `
      <div class="and ${a.cumprido_em ? 'ok' : (a.prazo && a.prazo < hojeISO() ? 'atrasado' : '')}">
        <span class="and-tipo">${htm(a.tipo)}</span>
        <span class="and-txt">${htm(a.descricao)}</span>
        <span class="and-meta">${a.de_quem === 'Nós' ? icone('malaTrabalho', 12) + ' nós' : icone('predio', 12) + ' seguradora'}${
          a.prazo ? ' · prazo ' + dataBr(a.prazo) : ''}${
          a.cumprido_em ? ' · ✓ ' + dataBr(a.cumprido_em) : ''}${
          a.criado_em ? ' · registrado ' + dataBr(String(a.criado_em).slice(0,10)) : ''}</span>
        ${(!a.cumprido_em && a.tipo === 'Exigência')
          ? `<button class="btn btn-claro" data-perm="sinistros:editar"
               style="padding:3px 9px;font-size:11px"
               onclick="cumprirExigencia('${a.id}')">✓ Cumpri</button>` : ''}
      </div>`).join('') + `</div>`;
}

/**
 * v1.206 — DE ONDE ESTA PARCELA VEIO.
 *
 * O contrato e o imóvel como registros clicáveis, não como texto solto:
 * quem está conferindo um Aluguel quase sempre precisa abrir um dos
 * dois — ver a regra da taxa, o dia de vencimento, o endereço. Mesma
 * forma do cartão "Contratos deste imóvel" da v1.182.
 */
/* v1.234 — UM OBJETO, UM CARTÃO.
 *
 * O contrato e o imóvel dividiam um cartão chamado "Contrato e imóvel",
 * com uma coluna de rótulo dizendo qual linha era qual. Objeto diferente
 * em cartão diferente é o padrão do resto do CRM (e do Salesforce, que é
 * de onde o Rodrigo tirou a referência): cada um com seu título, sua
 * contagem e seu próprio recolher.
 *
 * As duas funções abaixo dividem o que era uma. O conteúdo de cada linha
 * é o mesmo — some só a coluna do rótulo, que existia justamente para
 * dizer o que agora está no título do cartão. */
const CORC_PARCELA = { 'Ativo': 'tag-verde', 'Aviso Prévio': 'tag-amarela',
                       'Seguro Acionado': 'tag-vermelha', 'Encerrado': 'tag-cinza' };
const CORI_PARCELA = { 'Alugada': 'tag-verde', 'Disponível': 'tag-azul',
                       'Em reforma': 'tag-amarela', 'Vendida': 'tag-cinza',
                       'Encerrada': 'tag-cinza', 'Perdida p/ concorrente': 'tag-vermelha' };

function cartaoDaParcela(titulo, dentro) {
  return `<div class="cartao"><h2>${htm(titulo)}</h2>
    <div class="corpo" style="padding:0">${dentro}</div></div>`;
}

function blocoContratoDaParcela() {
  const ct = relacionados.find(x => x.papel === 'Contrato');
  if (!ct) return cartaoDaParcela('Contrato',
    `<div class="corpo" style="color:#8a94a1">Não foi possível ler o contrato desta
     parcela — pode ser falta de permissão para ver contratos.</div>`);

  return cartaoDaParcela('Contrato', `<table class="mini"><tr>
    <td><a href="contrato.html?id=${htm(ct.id)}"><b>${htm(ct.codigo || 'Contrato')}</b></a>
      <div style="font-size:12px;color:var(--texto-suave)">
        ${ct.valor_aluguel != null ? 'Aluguel ' + moeda(ct.valor_aluguel) : ''}
        ${ct.dia_vencimento ? ' · vence todo dia ' + htm(String(ct.dia_vencimento)) : ''}
        ${ct.garantia_tipo ? ' · ' + htm(ct.garantia_tipo) : ''}
      </div></td>
    <td style="white-space:nowrap">${ct.data_inicio ? dataBr(ct.data_inicio) : ''}${
      ct.data_fim_prevista ? ' a ' + dataBr(ct.data_fim_prevista) : ''}</td>
    <td style="text-align:right"><span class="tag ${CORC_PARCELA[ct.status] || 'tag-cinza'}"
      >${htm(ct.status || '—')}</span></td></tr></table>`);
}

function blocoImovelDaParcela() {
  const im = relacionados.find(x => x.papel === 'Imóvel');
  if (!im) return '';

  return cartaoDaParcela('Imóvel', `<table class="mini"><tr>
    <td><a href="imovel.html?id=${htm(im.id)}"><b>${htm(im.endereco || im.codigo || 'Imóvel')}</b></a>
      <div style="font-size:12px;color:var(--texto-suave)">
        ${htm([im.bairro, im.cidade].filter(Boolean).join(' · '))}
        ${im.tipo ? ' · ' + htm(im.tipo) : ''}
        ${registro.proprietario_nome ? ' · ' + htm(registro.proprietario_nome) : ''}
      </div></td>
    <td style="white-space:nowrap;color:var(--texto-suave)">${htm(im.codigo || '')}</td>
    <td style="text-align:right"><span class="tag ${CORI_PARCELA[im.situacao] || 'tag-cinza'}"
      >${htm(im.situacao || '—')}</span></td></tr></table>`);
}

function blocoRelacionados() {
  if (ALVO === 'sinistro') return blocoLinhaDoTempo();
  if (ALVO === 'contrato') return blocoApolices();
  if (ALVO === 'plano') return blocoAcoesDoPlano();
  if (ALVO === 'caso') {
    if (!orcamentos.length)
      return '<div class="corpo" style="color:#8a94a1">Nenhum orçamento registrado.</div>';
    const cor = { 'Aprovado': 'tag-verde', 'Enviado': 'tag-amarela',
                  'Recusado': 'tag-cinza', 'Substituído': 'tag-cinza' };
    return orcamentos.map(o => {
      const nome = nomePessoa(o.prestador_id) || o.prestador_texto || '(prestador não informado)';
      const rastro = o.situacao === 'Aprovado'
        ? `<div class="rastro-ok">✓ <span><b>Aprovado em ${dataBr(String(o.aprovado_em || '').slice(0, 10))}</b>${
            o.aprovado_por_email ? ' por ' + htm(o.aprovado_por_email.split('@')[0]) : ''} ·
            ${htm(o.autorizacao_canal || '')}${
            o.autorizacao_observacao ? '<br>' + htm(o.autorizacao_observacao) : ''}</span></div>`
        : '';
      const acao = o.situacao === 'Enviado'
        ? `<button class="btn btn-claro" style="padding:5px 12px;font-size:12px"
             onclick="${registro.tipo === 'Vistoria'
               ? `pedirAprovacaoVistoria('${o.id}')` : `pedirAprovacao('${o.id}')`}"
             >✓ Aprovar</button>` : '';
      return `
      <div class="orc ${o.situacao === 'Aprovado' ? 'aprovado' : (o.situacao === 'Enviado' ? '' : 'fora')}">
        <div class="orc-val">${moeda(o.valor)}<small>${htm(o.situacao)}</small></div>
        <div class="orc-txt">
          <b>${htm(nome)}</b>${o.o_que_inclui ? ' · ' + htm(o.o_que_inclui) : ''}
          <div class="orc-p">${htm(o.proposta || 'Sem descrição da proposta.')}</div>
          <div class="orc-p">${o.prazo_inicio ? 'Início ' + dataBr(o.prazo_inicio) : ''}${
            o.prazo_fim ? ' · conclusão ' + dataBr(o.prazo_fim) : ''}</div>
          ${rastro}
        </div>
        <div class="orc-lado">
          <span class="tag ${cor[o.situacao] || 'tag-cinza'}">${htm(o.situacao)}</span>${acao}
        </div>
      </div>`;
    }).join('');
  }
  if (ALVO === 'lead') {
    if (!relacionados.length)
      return '<div class="corpo" style="color:#8a94a1">Nenhum imóvel ligado a este lead ainda.</div>';
    return `<table class="mini">${relacionados.map(i => {
      const daCarteira = listaImoveis.find(x => x.id === i.imovel_id);
      const alvo = daCarteira
        ? `<a href="imovel.html?id=${daCarteira.id}">${htm(daCarteira.endereco)}</a>`
        : htm(i.endereco_texto || i.referencia_externa || '(imóvel sem cadastro)');
      return `
      <tr>
        <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${htm(daCarteira ? daCarteira.codigo : (i.referencia_externa || ''))}</td>
        <td>${alvo}
          <div style="color:var(--texto-suave);font-size:12px">${htm(i.origem)}${
            i.valor_aluguel ? ' · ' + moeda(i.valor_aluguel) : ''}${
            urlSegura(i.link_anuncio) ? ` · <a href="${htm(urlSegura(i.link_anuncio))}" target="_blank" rel="noopener">anúncio</a>` : ''}</div></td>
        <td style="width:1%;white-space:nowrap">
          <span class="tag ${i.situacao === 'Descartou' ? 'tag-cinza' : (i.situacao === 'Gostou' ? 'tag-verde' : 'tag-azul')}">${htm(i.situacao)}</span></td>
      </tr>`;
    }).join('')}</table>`;
  }
  if (ALVO === 'contato') {
    if (!relacionados.length) return '<div class="corpo" style="color:#8a94a1">Nenhum imóvel vinculado.</div>';
    return `<table class="mini">${relacionados.map(i => `
      <tr>
        <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${htm(i.codigo || '')}</td>
        <td><a href="imovel.html?id=${i.id}">${htm(i.endereco)}</a>
            <div style="color:var(--texto-suave);font-size:12px">${htm(i.bairro || '')} ·
            ${i.proprietario_id === ID ? 'como proprietário' : 'como inquilino'}</div></td>
        <td style="width:1%;white-space:nowrap">${htm(i.situacao || '')}</td>
      </tr>`).join('')}</table>`;
  }
  if (!relacionados.length) return '<div class="corpo" style="color:#8a94a1">Nenhuma pessoa vinculada.</div>';
  /* v1.334 — o telefone e o e-mail do proprietário e do inquilino
   * aparecem AQUI. Antes a ficha do imóvel só dizia o nome, e ligar
   * para o dono custava abrir a ficha dele — dois cliques e uma volta.
   * É também o único lugar do imóvel onde esses dados existem: o
   * cadastro do imóvel não tem telefone nenhum. */
  return `<table class="mini">${relacionados.map(p => {
    const contato = [
      p.telefone ? `<a href="tel:${htm(soDigitos(p.telefone))}">${htm(mascaraTelefone(p.telefone))}</a>`
        + botaoCopiarDigitos(p.telefone, 'o telefone') : '',
      p.email ? `<a href="mailto:${htm(p.email)}">${htm(p.email)}</a>`
        + botaoCopiar(p.email, 'o e-mail') : ''
    ].filter(Boolean).join(' · ');
    return `
    <tr>
      <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${htm(p.papel)}</td>
      <td><a href="contato.html?id=${p.id}">${htm(p.nome)}</a>
        ${contato ? `<div class="mini-sub">${contato}</div>` : ''}</td>
      <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${htm(p.codigo || '')}</td>
    </tr>`;
  }).join('')}</table>`;
}

// ------------------------------------------------------------
// CASO — caminho de etapas, anexos, financeiro e aprovação
// ------------------------------------------------------------
function caminhoEtapas() {
  if (registro.status === 'Cancelado') {
    return `<div class="path"><div class="et atual" style="background:#6a7480">Cancelado${
      registro.motivo_cancelamento ? ' — ' + htm(registro.motivo_cancelamento) : ''}</div></div>`;
  }
  const ETAPAS = etapasDoCaso();
  // v1.155 — num desvio ('Reagendar', 'Recusada') o caso NÃO andou: a
  // trilha para na parada de origem e o botão verde some, porque quem
  // decide o próximo passo é o cartão de agenda, com contexto.
  const desvio = (registro.tipo === 'Vistoria') && DESVIOS_VISTORIA[registro.status];
  const i = ETAPAS.indexOf(desvio || registro.status);
  const proxima = desvio ? null : ETAPAS[i + 1];
  return `<div class="path">${ETAPAS.map((e, k) =>
    `<div class="et ${k < i ? 'feita' : (k === i ? 'atual' : '')}">${htm(e)}</div>`).join('')}
    ${proxima ? `<div class="path-acao"><button class="btn btn-verde"
       onclick="avancarEtapa('${proxima}')">✓ Marcar como ${htm(proxima.toLowerCase())}</button></div>` : ''}
  </div>`;
}

async function avancarEtapa(nova) {
  const linha = { status: nova };
  if (nova === 'Em execução' && !registro.iniciado_em) linha.iniciado_em = hojeISO();
  if (nova === 'Concluído' && !registro.concluido_em) linha.concluido_em = hojeISO();
  const { error } = await sb.from('casos').update(linha).eq('id', ID);
  if (error) { alerta('Não foi possível avançar: ' + error.message); return; }
  await carregarFicha();
}

/** Lançar orçamento pela equipe. Cada envio é uma linha nova — nunca sobrescreve. */
function novoOrcamento() {
  abrirModal(DEFS.orcamento, 'Lançar orçamento',
    { prestador_id: registro.prestador_id || '' },
    { caso_id: ID, situacao: 'Enviado', enviado_por: sessaoEmail },
    async () => {
      if (registro.status === 'Aberto') await sb.from('casos').update({ status: 'Orçamento' }).eq('id', ID);
      await carregarFicha();
    });
}

// ------------------------------------------------------------
// v1.155 — A AGENDA DA VISTORIA, DO LADO DA MORALÍ
//
// Aparece só em vistoria, e só enquanto a data não está fechada. É o
// espelho da tela do vistoriador: quem está com a bola, qual data está
// na mesa, e o que dá para fazer agora.
//
// A regra das DUAS RODADAS vale para os dois lados. Depois que ele
// sugere uma vez, você aceita a dele ou propõe uma — e a partir daí
// ele só aceita ou recusa. `agenda_rodada` conta as sugestões dele.
// ------------------------------------------------------------
const ETAPAS_AGENDA = ['A confirmar', 'Reagendar', 'Recusada'];

function blocoAgendaVistoria() {
  if (ALVO !== 'caso' || !registro || registro.tipo !== 'Vistoria') return '';
  if (ETAPAS_AGENDA.indexOf(registro.status) < 0) return '';

  const quando = registro.agendado_em
    ? dataBr(String(registro.agendado_em).slice(0, 10)) + ' às ' +
      String(new Date(registro.agendado_em).getHours()).padStart(2, '0') + ':' +
      String(new Date(registro.agendado_em).getMinutes()).padStart(2, '0')
    : 'sem data definida';
  const dele = registro.agenda_proposta_por === 'Vistoriador';

  if (registro.status === 'Recusada') {
    return `<div class="cartao"><h2>${icone('aviso', 15)} Vistoria recusada</h2><div class="corpo">
      <div class="ag-aviso ruim"><b>O vistoriador não pode fazer.</b>
        <div class="ag-motivo">${htm(registro.motivo_recusa || 'sem motivo registrado')}</div></div>
      <p class="ag-p">Recusar não cancela o serviço — a vistoria continua precisando
        acontecer. Troque o prestador na ficha e proponha uma data nova, ou cancele
        o caso se ela não for mais necessária.</p>
      <div class="acoes-linha">
        <button class="btn" data-perm="casos:editar"
          onclick="agendaNovaProposta()">Propor a outro prestador</button>
        <button class="btn btn-claro" data-perm="casos:editar"
          onclick="agendaCancelar()">Cancelar a vistoria</button>
      </div></div></div>`;
  }

  const espera = dele
    ? `<b>${htm(registro.prestador_nome || 'O vistoriador')} sugeriu esta data.</b>
       Aceite, ou proponha outra — depois da sua, ele só aceita ou recusa.`
    : `<b>Esperando a resposta do vistoriador.</b>
       Ele vê esta data no aplicativo e pode aceitar, sugerir outra ou recusar.`;

  return `<div class="cartao"><h2>${icone('calendario', 15)} Agenda da vistoria</h2><div class="corpo">
    <div class="ag-data">
      <span class="ag-r">${dele ? 'Proposta do vistoriador' : 'Sua proposta'}</span>
      <b>${htm(quando)}</b></div>
    <div class="ag-aviso ${dele ? 'bola' : ''}">${espera}</div>
    ${registro.agenda_rodada >= 1 && !dele
      ? '<p class="ag-p">Ele já usou a rodada dele. Esta é a decisão final: se recusar, o caso volta para você.</p>'
      : ''}
    <div class="acoes-linha">
      ${dele ? `<button class="btn btn-verde" data-perm="casos:editar"
          onclick="agendaAceitarDoVistoriador()">✓ Aceitar esta data</button>` : ''}
      <button class="btn ${dele ? 'btn-claro' : ''}" data-perm="casos:editar"
        onclick="agendaNovaProposta()">${dele ? 'Propor outra data' : 'Trocar a data'}</button>
    </div></div></div>`;
}

async function agendaAceitarDoVistoriador() {
  const { error } = await sb.from('casos').update({
    status: 'Agendada', agenda_confirmada_em: new Date().toISOString()
  }).eq('id', ID);
  if (error) { alerta('Não foi possível aceitar: ' + error.message); return; }
  await carregarFicha();
}

/** Propor (ou repropor) data. O fuso vai explícito, como no casos.js. */
function agendaNovaProposta() {
  abrirModal(DEFS.propor_agenda, 'Propor data e hora',
    { _quando: registro.agendado_em ? String(registro.agendado_em).slice(0, 16) : '' }, {}, null);
  document.getElementById('btn-salvar').setAttribute('onclick', 'confirmarNovaProposta()');
}

async function confirmarNovaProposta() {
  const v = document.getElementById('mf-_quando').value;
  if (!v) { alerta('Escolha o dia e a hora.'); return; }
  const linha = {
    agendado_em: v + ':00-03:00',
    agenda_proposta_por: 'Moralí',
    status: 'A confirmar',
    motivo_recusa: null
  };
  const { error } = await sb.from('casos').update(linha).eq('id', ID);
  if (error) { alerta('Não foi possível propor: ' + error.message); return; }
  document.getElementById('btn-salvar').setAttribute('onclick', 'salvarModal()');
  fecharModal();
  await carregarFicha();
}

async function agendaCancelar() {
  const motivo = prompt('Cancelar esta vistoria. Por quê?',
    registro.motivo_recusa || '');
  if (motivo === null) return;
  const { error } = await sb.from('casos').update({
    status: 'Cancelado',
    motivo_cancelamento: (motivo || '').trim() || 'Vistoria recusada pelo vistoriador'
  }).eq('id', ID);
  if (error) { alerta('Não foi possível cancelar: ' + error.message); return; }
  await carregarFicha();
}

/**
 * v1.155 — APROVAR O VALOR DA VISTORIA E JÁ DIZER QUANDO PAGA.
 *
 * A vistoria não passa pelo canal de autorização do proprietário: o
 * valor é do vistoriador e quem decide é a Moralí. O que ela precisa
 * informar é OUTRA coisa — a data do pagamento, que é o que aparece no
 * "quando cai" do app dele. Por isso uma janela própria, e a função do
 * banco recusa a aprovação sem data.
 */
function pedirAprovacaoVistoria(orcId) {
  abrirModal(DEFS.aprovacao_vistoria, 'Aprovar o valor e agendar o pagamento',
    { _orcamento: orcId, _previsto: '' }, {}, null);
  document.getElementById('btn-salvar').setAttribute('onclick',
    `confirmarAprovacaoVistoria('${orcId}')`);
}

async function confirmarAprovacaoVistoria(orcId) {
  const previsto = document.getElementById('mf-_previsto').value;
  if (!previsto) { alerta('Informe a data prevista do pagamento.'); return; }
  const { data, error } = await sb.rpc('vistoria_aprovar_valor', {
    p_orcamento: orcId, p_previsto: previsto, p_email: sessaoEmail
  });
  if (error)          { alerta('Não foi possível aprovar: ' + error.message); return; }
  if (data && !data.ok) { alerta(data.erro || 'Não foi possível aprovar.'); return; }
  document.getElementById('btn-salvar').setAttribute('onclick', 'salvarModal()');
  fecharModal();
  await carregarFicha();
}

/** Aprovar orçamento: pede o canal da autorização — sem isso não há rastro. */
function pedirAprovacao(orcId) {
  abrirModal(DEFS.aprovacao, 'Aprovar orçamento',
    { _orcamento: orcId, autorizacao_canal: 'WhatsApp do proprietário' }, {}, null);
  document.getElementById('btn-salvar').setAttribute('onclick', `confirmarAprovacao('${orcId}')`);
}

async function confirmarAprovacao(orcId) {
  const canal = document.getElementById('mf-autorizacao_canal').value;
  const obs = document.getElementById('mf-autorizacao_observacao').value.trim();
  const { error } = await sb.rpc('aprovar_orcamento', {
    p_orcamento_id: orcId, p_canal: canal, p_observacao: obs || null, p_email: sessaoEmail
  });
  if (error) { alerta('Não foi possível aprovar: ' + error.message); return; }
  document.getElementById('btn-salvar').setAttribute('onclick', 'salvarModal()');
  fecharModal();
  await carregarFicha();
}

// ------------------------------------------------------------
// ANEXOS DO CASO (v1.105) — agora com ARQUIVO de verdade, não só link.
// O arquivo vai para o depósito privado 'anexos' (sql/anexos-storage.sql),
// no caminho <empresa>/<caso>/<nome>; a tabela guarda o caminho e a tela
// gera um link assinado de 1 hora ao abrir. Os anexos antigos por URL
// (laudos do Devolus) continuam funcionando como sempre.
// ------------------------------------------------------------
const ICONE_ANEXO = { 'Nota fiscal': icone('recibo', 15), 'Autorização': icone('balao', 15),
  'Laudo': icone('documento', 15), 'Foto': icone('imagem', 15),
  'Contrato assinado': icone('documento', 15), 'Apólice': icone('escudo', 15),
  'Vistoria': icone('lupa', 15), 'Distrato': icone('documento', 15),
  'Boletim de ocorrência': icone('sirene', 15), 'Notificação': icone('correio', 15),
  'Documento': icone('documento', 15) };

// M33: o cartão de anexos deixou de ser exclusivo do Caso. O que muda de
// um objeto para outro é só a LISTA DE TIPOS oferecida — a mecânica de
// enviar, assinar o link e excluir é a mesma.
const TIPOS_ANEXO = {
  casos:     ['Foto', 'Nota fiscal', 'Autorização', 'Laudo', 'Outro'],
  contratos: ['Contrato assinado', 'Apólice', 'Vistoria', 'Documento', 'Distrato', 'Outro'],
  sinistros: ['Boletim de ocorrência', 'Laudo', 'Notificação', 'Documento', 'Foto', 'Outro'],
  imoveis:   ['Documento', 'Foto', 'Vistoria', 'Outro'],
  contatos:  ['Documento', 'Outro']
};

/** De qual objeto é a ficha aberta — no vocabulário das permissões. */
// ============================================================
// v1.241 — PLANO DE AÇÃO E AÇÕES 5W2H
//
// O plano não guarda progresso: ele PERGUNTA às ações. Por isso toda
// mudança feita aqui termina em carregarFicha(), que relê a view — é o
// banco que decide o percentual, não esta tela.
// ============================================================

/** As cores das duas listas fechadas, num lugar só. */
const COR_SITUACAO_ACAO = { 'A fazer': 'tag-cinza', 'Fazendo': 'tag-azul',
  'Parada': 'tag-amarela', 'Feita': 'tag-verde', 'Cancelada': 'tag-cinza' };
const COR_STATUS_PLANO = { 'Rascunho': 'tag-cinza', 'Em andamento': 'tag-azul',
  'Pausado': 'tag-amarela', 'Concluído': 'tag-verde', 'Cancelado': 'tag-cinza' };

/** A definição da ação SEM o seletor de plano — usada dentro da ficha
 *  do plano, onde a resposta já é conhecida e perguntar seria ruído. */
function defAcaoDoPlano() {
  return Object.assign({}, DEFS.acao,
    { campos: DEFS.acao.campos.filter(c => c.c !== 'plano_id') });
}

/**
 * Põe os planos da empresa no seletor da ficha da AÇÃO.
 * Mesmo arranjo do plano de fiança na simulação (v1.162): as opções são
 * os ids e os rótulos, o "PLA-0001 · título". O plano JÁ GRAVADO entra
 * mesmo que esteja concluído — sem isso, abrir e salvar a ação
 * arrancaria o vínculo em silêncio (a lição do 'Vistoria', v1.151d).
 */
function ajustarPlanosDaFicha() {
  const c = (DEFS.acao.campos || []).find(x => x.c === 'plano_id');
  if (!c) return;
  const rotulos = { '': '— sem plano (ação avulsa) —' };
  const ids = [''];
  (planosParaEscolher || []).forEach(p => {
    ids.push(p.id);
    rotulos[p.id] = (p.codigo ? p.codigo + ' · ' : '') + (p.titulo || '(sem título)');
  });
  if (registro && registro.plano_id && ids.indexOf(registro.plano_id) < 0) {
    ids.push(registro.plano_id);
    rotulos[registro.plano_id] = (registro.plano_codigo ? registro.plano_codigo + ' · ' : '')
      + (registro.plano_titulo || 'plano deste registro');
  }
  c.op = ids;
  c.rotulos = rotulos;
}

/**
 * O cartão com as ações 5W2H do plano.
 *
 * Mostra o essencial de cada linha — o quê, como, quem, quando, quanto e
 * a situação. O resto abre na janela. O círculo da esquerda conclui a
 * ação num clique: é a operação mais frequente e não deveria custar uma
 * janela.
 */
function blocoAcoesDoPlano() {
  if (!acoesDoPlano.length)
    return '<div class="corpo" style="color:#8a94a1">Nenhuma ação cadastrada ainda. '
         + 'Comece pelo que precisa ser feito primeiro.</div>';

  const linhas = acoesDoPlano.map(a => {
    const feita = a.situacao === 'Feita';
    const morta = feita || a.situacao === 'Cancelada';
    const quando = `${a.inicio ? dataBr(a.inicio) + ' → ' : ''}<b${
      a.atrasada ? ' style="color:var(--erro)"' : ''}>${a.prazo ? dataBr(a.prazo) : '—'}</b>`;
    const sob = a.atrasada
      ? `<div style="color:var(--erro);font-size:11.5px">atrasada há ${a.dias_atraso} dia(s)</div>`
      : (feita && a.concluida_em
          ? `<div style="color:var(--texto-suave);font-size:11.5px">feita em ${dataBr(a.concluida_em)}</div>`
          : '');
    return `<tr>
      <td style="width:1%">
        <button class="cb-acao${feita ? ' on' : ''}${a.atrasada ? ' late' : ''}"
          title="${feita ? 'Reabrir esta ação' : 'Marcar como feita'}"
          aria-label="${feita ? 'Reabrir esta ação' : 'Marcar como feita'}"
          onclick="alternarAcaoFeita('${jsq(a.id)}')">${feita ? '✓' : ''}</button></td>
      <td>
        <b style="color:var(--azul)${morta ? ';text-decoration:line-through' : ''}"
           ><a href="acao.html?id=${a.id}">${htm(a.o_que || '(sem título)')}</a></b>
        ${a.como ? `<div style="color:var(--texto-suave);font-size:11.5px">Como: ${htm(a.como)}</div>` : ''}
        ${a.resultado ? `<div style="color:var(--verde-escuro);font-size:11.5px">Resultado: ${htm(a.resultado)}</div>` : ''}
      </td>
      <td style="white-space:nowrap">${htm((a.responsavel_email || '—').split('@')[0])}</td>
      <td style="white-space:nowrap">${quando}${sob}</td>
      <td style="text-align:right;white-space:nowrap">${moeda(a.custo_previsto || 0)}${
        Number(a.custo_realizado) ? `<div style="color:var(--texto-suave);font-size:11.5px"
          >gasto: ${moeda(a.custo_realizado)}</div>` : ''}</td>
      <td style="white-space:nowrap"><span class="tag ${COR_SITUACAO_ACAO[a.situacao] || 'tag-cinza'}"
        >${htm(a.situacao || '')}</span></td>
      <td style="white-space:nowrap"><button class="btn btn-claro"
        style="padding:3px 9px;font-size:12px" title="Editar esta ação"
        onclick="editarAcaoDoPlano('${jsq(a.id)}')">✎</button></td>
    </tr>`;
  }).join('');

  return `<table class="mini">
    <tr><th style="width:26px"></th><th>O quê / Como</th><th>Quem</th><th>Quando</th>
        <th style="text-align:right">Quanto</th><th>Situação</th><th></th></tr>
    ${linhas}</table>`;
}

/** Nova ação já amarrada a este plano. */
function novaAcaoDoPlano() {
  const proxima = acoesDoPlano.reduce((m, a) => Math.max(m, Number(a.ordem) || 0), 0) + 1;
  abrirModal(defAcaoDoPlano(), 'Nova ação — 5W2H',
    { situacao: 'A fazer', prioridade: 'Normal', ordem: proxima,
      custo_previsto: 0, custo_realizado: 0,
      responsavel_email: registro.responsavel_email || sessaoEmail },
    { plano_id: ID },
    carregarFicha);
}

function editarAcaoDoPlano(id) {
  const a = acoesDoPlano.find(x => x.id === id);
  if (!a) return;
  abrirModal(defAcaoDoPlano(), `Editar ${a.codigo || 'ação'}`, a, { plano_id: ID }, carregarFicha);
}

/**
 * O clique no círculo. Concluir carimba a data no banco (gatilho), e
 * reabrir a apaga — por isso aqui só vai a situação.
 */
async function alternarAcaoFeita(id) {
  const a = acoesDoPlano.find(x => x.id === id);
  if (!a) return;
  const nova = a.situacao === 'Feita' ? 'Fazendo' : 'Feita';
  const { error } = await sb.from('plano_acoes').update({ situacao: nova }).eq('id', id);
  if (error) { alerta('Não consegui mudar a situação: ' + error.message); return; }
  await carregarFicha();
}

/**
 * O caminho da situação, clicável — a mesma peça do funil do caso.
 * 'Cancelado' e 'Parada' não entram na trilha: não são o passo seguinte
 * de ninguém, são saídas. Quem está numa delas vê a trilha parada e
 * escolhe pelo botão Editar.
 */
const TRILHA_PLANO = ['Rascunho', 'Em andamento', 'Concluído'];
const TRILHA_ACAO  = ['A fazer', 'Fazendo', 'Feita'];

function caminhoSituacao() {
  const ehPlano = ALVO === 'plano';
  const atual = ehPlano ? registro.status : registro.situacao;
  const trilha = ehPlano ? TRILHA_PLANO : TRILHA_ACAO;
  const fora = { 'Cancelado': 'Cancelado', 'Cancelada': 'Cancelada',
                 'Pausado': 'Pausado', 'Parada': 'Parada' }[atual];
  if (fora) {
    const cor = (fora === 'Pausado' || fora === 'Parada') ? '#b7791f' : '#6a7480';
    return `<div class="path"><div class="et atual" style="background:${cor}">${htm(fora)}</div>
      <div class="path-acao"><button class="btn btn-claro"
        onclick="avancarSituacao('${jsq(ehPlano ? 'Em andamento' : 'Fazendo')}')"
        >↺ Retomar</button></div></div>`;
  }
  const i = trilha.indexOf(atual);
  const proxima = trilha[i + 1];
  return `<div class="path">${trilha.map((e, k) =>
    `<div class="et ${k < i ? 'feita' : (k === i ? 'atual' : '')}">${htm(e)}</div>`).join('')}
    ${proxima ? `<div class="path-acao"><button class="btn btn-verde"
       onclick="avancarSituacao('${jsq(proxima)}')">✓ ${
       proxima === 'Concluído' || proxima === 'Feita'
         ? 'Concluir' : 'Marcar como ' + htm(proxima.toLowerCase())}</button></div>` : ''}
  </div>`;
}

async function avancarSituacao(nova) {
  const ehPlano = ALVO === 'plano';
  const linha = ehPlano ? { status: nova } : { situacao: nova };
  // o plano que começa a andar ganha a data de início que faltava; a
  // conclusão (dos dois) é carimbada pelo banco
  if (ehPlano && nova === 'Em andamento' && !registro.data_inicio) linha.data_inicio = hojeISO();
  const { error } = await sb.from(DEF.tabela).update(linha).eq('id', ID);
  if (error) { alerta('Não foi possível mudar a situação: ' + error.message); return; }
  await carregarFicha();
}

/** A faixa vermelha da ação atrasada — o mesmo desenho do aviso de perigo. */
function faixaAtrasoAcao() {
  if (ALVO !== 'acao' || !registro.atrasada) return '';
  return `<div class="aviso-perigo" style="margin-top:14px">${icone('aviso', 13)}
    <b>Ação atrasada há ${registro.dias_atraso} dia(s).</b>
    O prazo era ${dataBr(registro.prazo)} e a situação ainda é "${htm(registro.situacao)}".
    Mude o prazo ou conclua a ação — enquanto isso ela conta como atrasada no plano.</div>`;
}

function OBJETO_DO_ALVO() {
  return ({ caso: 'casos', contrato: 'contratos', sinistro: 'sinistros',
            imovel: 'imoveis', contato: 'contatos',
            plano: 'planos', acao: 'acoes',
            ficha: 'fichas' })[ALVO] || 'casos';
}

// ============================================================
// HISTÓRICO DE ALTERAÇÕES (v1.126)
//
// A lista é desenhada pelo `histLista()`, no base.js, que a aba da
// Administração também usa. Aqui só mora a consulta.
//
// O cartão nasce vazio e é preenchido DEPOIS que a ficha desenha, como
// a faixa de Atividade: são mais 200 ms de consulta que não podem
// atrasar a informação principal da tela.
// ============================================================
// v1.182 — o cartão nasce FECHADO, com a setinha; a consulta ao banco
// só acontece no primeiro clique (últimos 3 dias) e o "Ver mais" busca
// o resto. Fechado, a ficha nem toca a tabela historico — abre mais
// rápida (pedido do Rodrigo, mockup aprovado em 06/08).
let historicoAberto = false;

function blocoHistorico() {
  if (!HIST_TABELA[OBJETO_DO_ALVO_HIST()]) return '';
  return `<div class="cartao" id="cartao-historico">
    <h2 style="cursor:pointer;margin:0" onclick="alternarHistorico()">Histórico de alterações
      <span class="dir seta-card" id="hist-seta" title="Expandir"
        style="display:inline-block">▾</span></h2>
    <div id="hist-corpo" style="display:none"></div>
  </div>`;
}

function alternarHistorico() {
  const corpo = document.getElementById('hist-corpo');
  const seta = document.getElementById('hist-seta');
  if (!corpo) return;
  historicoAberto = !historicoAberto;
  corpo.style.display = historicoAberto ? '' : 'none';
  if (seta) {
    // v1.234 — mesmo glifo girado, como nos outros cartões
    seta.style.transform = historicoAberto ? 'rotate(180deg)' : '';
    seta.title = historicoAberto ? 'Recolher' : 'Expandir';
  }
  // a primeira abertura é quem consulta o banco
  if (historicoAberto && !corpo.dataset.carregado) carregarHistoricoDoRegistro(true);
}

/** v1.191 — abre e recolhe um cartão de seção. Estado só na tela: o
 *  layout diz como o cartão NASCE; o que a pessoa faz depois vale para
 *  a visita, e a próxima ficha volta ao que o layout mandou. */
function alternarCartao(i) {
  const cartao = document.getElementById('sec-' + i);
  const seta = document.getElementById('seta-sec-' + i);
  if (!cartao) return;
  const corpo = cartao.querySelector('.corpo');
  const fechando = !cartao.classList.contains('fechado');
  cartao.classList.toggle('fechado', fechando);
  if (corpo) corpo.style.display = fechando ? 'none' : '';
  if (seta) {
    seta.style.display = 'inline-block';
    seta.style.transform = fechando ? '' : 'rotate(180deg)';
    seta.title = fechando ? 'Expandir' : 'Recolher';
  }
}

/** @param {boolean} soRecentes  true = últimos 3 dias; false = tudo (até 100) */
async function carregarHistoricoDoRegistro(soRecentes) {
  const corpo = document.getElementById('hist-corpo');
  if (!corpo || !ID) return;
  corpo.dataset.carregado = '1';
  corpo.innerHTML = '<div class="vazio-min">Carregando…</div>';

  const tabela = HIST_TABELA[OBJETO_DO_ALVO_HIST()];
  let q = sb.from('historico')
    // v1.312 — `usuario_id` entra para a linha não chamar de "Sistema"
    // quem tem usuário mas não tem nome gravado; ip/agente/pais são o
    // rastro que passou a ser guardado na mesma versão.
    .select('id,tabela,registro_id,registro_rotulo,acao,dados_antes,dados_depois,'
          + 'usuario_id,usuario_nome,origem,em,ip,agente,pais')
    .eq('tabela', tabela).eq('registro_id', ID)
    .order('em', { ascending: false });
  if (soRecentes) {
    const corte = new Date(Date.now() - 3 * 864e5).toISOString();
    q = q.gte('em', corte).limit(50);
  } else {
    q = q.limit(100);
  }
  const { data, error } = await q;

  if (error) {
    // O histórico não é a informação principal da tela: se o banco
    // ainda não foi migrado, o cartão avisa em vez de manchar a ficha.
    corpo.innerHTML = '<div class="vazio-min">Histórico indisponível.</div>';
    return;
  }
  const linhas = data || [];
  corpo.innerHTML = `
    <div class="corpo" style="padding:0">${linhas.length
      ? histLista(linhas, false)
      : `<div class="vazio-min">Nada ${soRecentes ? 'nos últimos 3 dias' : 'registrado'}.</div>`}</div>
    ${soRecentes ? `<p style="font-size:12px;margin:8px 0 0;padding:0 14px 10px">
      <a href="#" onclick="event.preventDefault();carregarHistoricoDoRegistro(false)">
        Ver o histórico mais antigo…</a></p>` : ''}`;
}

/** O OBJETO_DO_ALVO() dos anexos não conhece lead (anexo de lead não
 *  existe); o histórico conhece todos os seis. */
/**
 * v1.241 — O OBJETO DE PERMISSÃO desta ficha.
 *
 * Os botões Editar e Excluir liam `DEF.tabela`, e tabela não é objeto:
 * no sinistro isso virava `contrato_sinistros:editar`, permissão que
 * não existe na matriz — o botão sumia para quem não é superadmin.
 * O mapa certo já existia (é o do histórico, indexado por objeto), e é
 * ele que responde aqui: um mapa só, como manda a casa.
 */
function OBJETO_PERM() { return OBJETO_DO_ALVO_HIST(); }

function OBJETO_DO_ALVO_HIST() {
  // v1.182: a parcela de aluguel entrou para o histórico (gatilho na
  // migração v1182) — era a única ficha principal sem o cartão
  return ({ lead: 'leads', contato: 'contatos', imovel: 'imoveis',
            contrato: 'contratos', sinistro: 'sinistros', caso: 'casos',
            competencia: 'competencias',
            // v1.241 — o plano e a ação entram no histórico junto. A
            // chave aqui é o OBJETO; quem sabe a tabela é o HIST_TABELA.
            plano: 'planos', acao: 'acoes',
            // v1.284 — o histórico da ficha não é detalhe: é a prova
            // de quem aprovou o quê, e de que campo entrou no cadastro
            ficha: 'fichas' })[ALVO] || ALVO;
}

async function assinarAnexos() {
  await Promise.all(anexos.filter(a => a.arquivo_path).map(async a => {
    const { data } = await sb.storage.from('anexos').createSignedUrl(a.arquivo_path, 3600);
    a._url = data && data.signedUrl;
  }));
}

function blocoAnexos() {
  const itens = anexos.length
    ? anexos.map(a => {
      // urlSegura (v1.115): anexo por link é texto livre no banco — sem o
      // filtro, um "javascript:" gravado ali executaria ao clicar.
      const href = urlSegura(a.url || a._url);
      return `
      <div class="anexo-caixa" id="ax-${a.id}">
        <a class="anexo" ${href ? `href="${htm(href)}" target="_blank" rel="noopener"` : ''}>
          <span class="ic">${ICONE_ANEXO[a.tipo] || icone('imagem', 15)}</span>
          <span>${htm(a.tipo || 'Arquivo')}</span>
          <small>${htm(a.nome_arquivo || a.descricao || '')}</small></a>
        <button class="anexo-del" data-perm="${OBJETO_DO_ALVO()}:editar" title="Excluir anexo"
          onclick="pedirExclusaoAnexo('${a.id}')">✕</button>
      </div>`;
    }).join('')
    : '<div class="vazio-min">Nenhum arquivo anexado.</div>';
  const obj = OBJETO_DO_ALVO();
  const tipos = TIPOS_ANEXO[obj] || TIPOS_ANEXO.casos;
  return `<div class="cartao"><h2>Arquivos <span class="cnt">(${anexos.length})</span>
    <span class="dir anexar-caso" data-perm="${obj}:editar">
      <select id="anexo-tipo">
        ${tipos.map(t => `<option>${htm(t)}</option>`).join('')}
      </select>
      <label class="btn btn-claro" style="padding:5px 12px;font-size:12px;cursor:pointer">${icone('clipe', 13)} Anexar…
        <input type="file" id="anexo-arquivo" accept="image/*,application/pdf"
          style="display:none" onchange="enviarAnexo(this)"></label>
    </span></h2>
    <p class="msg-erro" id="anexo-erro" style="margin:10px 14px 0"></p>
    <div class="anexos">${itens}</div></div>`;
}

/**
 * Carrega os anexos do registro aberto, seja ele caso, contrato ou
 * sinistro. Tolerante de propósito: se `anexos` ainda não existir no
 * banco (SQL do M33 não rodado), a ficha abre sem o cartão em vez de
 * quebrar inteira — o mesmo padrão das outras telas.
 */
async function carregarAnexosDoRegistro() {
  const { data, error } = await sb.from('anexos').select('*')
    .eq('objeto', OBJETO_DO_ALVO()).eq('registro_id', ID).order('enviado_em');
  anexos = error ? [] : (data || []);
  if (!error) await assinarAnexos();
}

async function recarregarAnexos() {
  const { data } = await sb.from('anexos').select('*')
    .eq('objeto', OBJETO_DO_ALVO()).eq('registro_id', ID).order('enviado_em');
  anexos = data || [];
  await assinarAnexos();
  desenharFicha();
}

async function enviarAnexo(input) {
  const arq = input.files && input.files[0];
  input.value = '';
  if (!arq) return;
  const erro = document.getElementById('anexo-erro');
  const falhar = m => { erro.textContent = m; erro.style.display = 'block'; };
  erro.style.display = 'none';

  const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
  if (arq.size > 10 * 1024 * 1024) return falhar('Arquivo acima de 10 MB. Diminua a foto ou divida o PDF.');
  if (!TIPOS_OK.includes(arq.type)) return falhar('Só imagens (JPG, PNG, WEBP, HEIC) ou PDF.');

  const tipo = document.getElementById('anexo-tipo').value;
  // nome sem acento/espaço: o Storage recusa caracteres fora do padrão
  const limpo = arq.name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  // <empresa>/<objeto>/<registro>/<arquivo> — a segunda pasta é o que
  // faz a política do depósito exigir a permissão do objeto certo (M33)
  const caminho = `${PERM.empresa.id}/${OBJETO_DO_ALVO()}/${ID}/${sufixoAleatorio()}-${limpo}`;

  const { error } = await sb.storage.from('anexos').upload(caminho, arq,
    { contentType: arq.type, upsert: false, cacheControl: '3600' });
  if (error) {
    return falhar(typeof traduzirErroStorage === 'function'
      ? traduzirErroStorage(error) : ('Não consegui enviar: ' + error.message));
  }
  const { error: e2 } = await sb.from('anexos').insert({
    objeto: OBJETO_DO_ALVO(), registro_id: ID,
    tipo, nome_arquivo: arq.name, arquivo_path: caminho });
  if (e2) {
    // não deixo arquivo órfão quando a segunda etapa falha (padrão do imagem.js)
    await sb.storage.from('anexos').remove([caminho]);
    return falhar('O arquivo subiu mas o registro falhou: ' + e2.message);
  }
  await recarregarAnexos();
}

function pedirExclusaoAnexo(id) {
  const el = document.getElementById('ax-' + id);
  if (!el) return;
  el.innerHTML = `<div class="anexo anexo-confirmar"><span>Excluir?</span>
    <span><button class="btn btn-perigo" style="padding:4px 10px;font-size:12px"
      onclick="excluirAnexo('${id}')">Sim</button>
    <button class="btn btn-claro" style="padding:4px 10px;font-size:12px"
      onclick="desenharFicha()">Não</button></span></div>`;
}

async function excluirAnexo(id) {
  const a = anexos.find(x => String(x.id) === String(id));
  const { error } = await sb.from('anexos').delete().eq('id', id);
  if (error) {
    const erro = document.getElementById('anexo-erro');
    erro.textContent = 'Não foi possível excluir: ' + error.message;
    erro.style.display = 'block';
    return;
  }
  // o arquivo sai DEPOIS do registro: pior caso é arquivo órfão no
  // depósito, nunca registro apontando para arquivo apagado
  if (a && a.arquivo_path) await sb.storage.from('anexos').remove([a.arquivo_path]);
  await recarregarAnexos();
}

function blocoFinanceiro() {
  const alerta_ = calculados.alerta_sem_nota
    ? `<div class="aviso-fin">${icone('aviso', 12)} Este caso vai ser descontado do repasse do proprietário e
        <b>ainda não tem nota anexada</b>. Anexe o comprovante antes de marcar como pago.</div>` : '';
  const linha = (r, v) => `<div><span class="r">${htm(r)}</span><div class="v">${v}</div></div>`;
  const cp = { 'A pagar': 'tag-vermelha', 'Pago': 'tag-verde',
  // v1.151b — azul, não verde: o serviço foi pago, mas não por nós.
  'Pago por terceiro': 'tag-azul',
  // v1.151c — garantia/retrabalho: executado e sem conta.
  'Sem cobrança': 'tag-cinza', 'Cancelado': 'tag-cinza' };
  return `<div class="cartao"><h2>Financeiro</h2><div class="corpo">${alerta_}
    <div class="campos-ficha">
      ${linha('Situação', `<span class="tag ${cp[registro.status_pagamento] || 'tag-cinza'}">${htm(registro.status_pagamento)}</span>`)}
      ${linha('Valor aprovado', registro.valor_aprovado ? '<b>' + moeda(registro.valor_aprovado) + '</b>' : '—')}
      ${linha('Forma de pagamento', htm(registro.forma_pagamento || '—'))}
      ${linha('Previsto para', registro.pagamento_previsto_em ? dataBr(registro.pagamento_previsto_em) : '—')}
      ${linha('Pago em', registro.pago_em ? dataBr(registro.pago_em) : '—')}
      ${linha('Descontado do repasse em', registro.descontado_repasse_em ? dataBr(registro.descontado_repasse_em) : '—')}
      ${registro.observacao_financeira
        ? `<div class="largo"><span class="r">Observação financeira</span><div class="v">${htm(registro.observacao_financeira)}</div></div>` : ''}
    </div></div></div>`;
}

function blocoGuardiao() {
  const avisos = [];
  if (calculados.dias_atraso > 0)
    avisos.push(`${icone('atencao', 13)} <span><b>${calculados.dias_atraso} dias de atraso</b> em relação ao prazo do orçamento aprovado.</span>`);
  if (calculados.alerta_sem_nota)
    avisos.push(icone('atencao', 13) + ' <span><b>Sem nota anexada</b> — o desconto no repasse do proprietário não deveria sair sem comprovante.</span>');
  if (calculados.tem_orcamento_pendente)
    avisos.push(icone('atencao', 13) + ' <span><b>Há orçamento aguardando decisão.</b> Enquanto ninguém aprova, o serviço não anda.</span>');
  if (registro.status !== 'Concluído' && registro.status !== 'Cancelado' && calculados.dias_aberto > 30)
    avisos.push(`${icone('atencao', 13)} <span><b>${calculados.dias_aberto} dias em aberto.</b></span>`);
  if (!avisos.length) return '';
  return `<div class="cartao guardiao"><h2 style="color:var(--alerta)">${icone('aviso', 15)} Guardião</h2>
    <div class="corpo">${avisos.map(a => `<div class="item">${a}</div>`).join('')}</div></div>`;
}

/**
 * (Lead) Histórico de simulações de seguro. É uma lista, não um campo:
 * o mesmo lead simula várias vezes — troca de imóvel, troca de plano —
 * e o que foi reprovado antes importa.
 */
// ------------------------------------------------------------
// PORTAL DO PRESTADOR
//
// O prestador não tem conta no sistema. Ele recebe um LINK por WhatsApp,
// abre no celular e vê só os chamados atribuídos a ele.
//
// Por que link e não login: o app antigo guardava usuário e senha na aba
// Contatos, em texto puro, e reenviava a senha a cada clique. Um link com
// token não tem senha para vazar, e revogar é um botão.
// ------------------------------------------------------------
let tokenPrestador = null;

/** O tipo no catálogo é "Prestador Serviço", não "Prestador". */
function ehPrestador()  { return temTipo('Prestador Serviço'); }
function ehIndicador()  { return temTipo('Indicador'); }

/**
 * O tipo pode estar no principal OU na lista de outros tipos.
 * O Davi é "Indicador" no principal e "Prestador Serviço" nos outros —
 * olhar só o principal deixaria metade da vida dele de fora.
 */
function temTipo(tipo) {
  if (!registro) return false;
  if (registro.tipo_principal === tipo) return true;
  return String(registro.outros_tipos || '')
    .split(',').map(t => t.trim()).indexOf(tipo) !== -1;
}

/**
 * QUEM VÊ O CARTÃO DO PORTAL.
 *
 * Era só "Prestador Serviço". Com o M19 o mesmo link passou a servir
 * também para o indicador ver as comissões dele — e o acesso sempre foi
 * por CONTATO (`prestador_acessos.contato_id`), não por papel. Então a
 * Tainara, que só indica, precisa do mesmo botão.
 *
 * Um link por pessoa: o Davi, que é os dois, continua com um só, e o
 * portal mostra as abas conforme o que ele tem.
 */
function usaPortal() { return ehPrestador() || ehIndicador(); }

function blocoPortalPrestador() {
  // O título diz o que a pessoa é. "Portal do prestador" na ficha da
  // Tainara, que só indica, faria ela e quem gera o link duvidarem se
  // é o botão certo.
  const titulo = (ehPrestador() && ehIndicador()) ? 'Portal do parceiro'
               : (ehIndicador() ? 'Portal do indicador' : 'Portal do prestador');
  return `<div class="cartao" id="cartao-portal">
    <h2>${titulo}</h2>
    <div class="corpo" id="portal-corpo">
      <div style="color:#8a94a1;font-size:13px">Verificando…</div>
    </div>
  </div>`;
}

/** Lê o estado do link. Chamado depois de a ficha desenhar. */
async function carregarPortalPrestador() {
  const alvo = document.getElementById('portal-corpo');
  if (!alvo || !registro) return;

  const { data, error } = await sb.from('prestador_acessos')
    .select('token, ativo, usos, ultimo_uso')
    .eq('contato_id', registro.id).maybeSingle();

  if (error) { alvo.innerHTML = `<p class="msg-erro" style="display:block">${htm(error.message)}</p>`; return; }

  if (!data || !data.ativo) {
    tokenPrestador = null;
    alvo.innerHTML = `
      <p style="font-size:13px;color:var(--texto-suave);line-height:1.6;margin-bottom:10px">
        ${data ? 'O link desta pessoa está <b>desativado</b>. Gere de novo para reativar.'
               : 'Ainda não tem acesso ao portal. O link é pessoal e no celular ela vê ' +
                 oQueVePeloPortal() + '.'}
      </p>
      <button class="btn" data-perm="contatos:editar" onclick="gerarLinkPrestador()">
        ${data ? 'Reativar link' : 'Gerar link de acesso'}</button>`;
    return;
  }

  tokenPrestador = data.token;
  const url = enderecoPortal(data.token);
  const uso = data.ultimo_uso
    ? `Abriu ${data.usos} vez${data.usos === 1 ? '' : 'es'}, a última em ${dataBr(String(data.ultimo_uso).slice(0,10))}.`
    : 'Ainda não abriu o link.';

  alvo.innerHTML = `
    <div style="font-size:12px;color:var(--texto-suave);margin-bottom:8px">${htm(uso)}</div>
    <input readonly value="${htm(url)}" onclick="this.select()"
           style="width:100%;font-size:12px;padding:8px;border:1px solid var(--borda);
                  border-radius:6px;background:var(--fundo);color:var(--texto-suave);
                  margin-bottom:10px">
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" onclick="copiarConvitePrestador()">Copiar mensagem para WhatsApp</button>
      <button class="btn btn-claro" onclick="copiarSoOLink()">Copiar só o link</button>
      <button class="btn btn-claro" data-perm="contatos:excluir"
              onclick="revogarLinkPrestador()">Revogar</button>
    </div>
    <p style="font-size:11px;color:var(--texto-suave);line-height:1.6;margin-top:10px">
      Quem tiver este link vê ${oQueVePeloPortal()}. Se a pessoa trocar de celular
      não há problema — o link continua o mesmo. Se ela sair da sua lista, use Revogar.
    </p>`;
}

/**
 * O QUE A PESSOA VÊ, na ordem em que ela pensa.
 *
 * Uma frase só, usada em três lugares do cartão. Antes o texto falava
 * só de chamados — e para a Tainara, que só indica, isso descrevia um
 * portal que ela nunca veria.
 */
function oQueVePeloPortal() {
  const p = ehPrestador(), i = ehIndicador();
  if (p && i) return 'os chamados atribuídos a ela e as comissões que tem a receber';
  if (i)      return 'as comissões que tem a receber, e pode indicar imóveis';
  return 'os chamados atribuídos a ela, envia orçamento e avisa quando concluir';
}

/** O portal mora no mesmo site, ao lado das outras telas.
 *  v1.263 — URL_RAIZ, não a barra (o endereço bonito entortaria a conta). */
function enderecoPortal(token) {
  return URL_RAIZ + 'prestador.html?t=' + encodeURIComponent(token);
}

async function gerarLinkPrestador() {
  const { data, error } = await sb.rpc('prestador_gerar_link', { p_contato: registro.id });
  if (error) return alert(error.message);
  tokenPrestador = data;
  await carregarPortalPrestador();
}

async function revogarLinkPrestador() {
  if (!confirm('Revogar o acesso deste prestador?\n\n' +
      'O link para de funcionar imediatamente. Os chamados e orçamentos dele ' +
      'continuam guardados. Dá para gerar de novo depois.')) return;
  const { error } = await sb.rpc('prestador_revogar_link', { p_contato: registro.id });
  if (error) return alert(error.message);
  await carregarPortalPrestador();
}

/**
 * A mensagem pronta. O texto muda conforme o que a pessoa é — mandar
 * "acesso aos chamados de manutenção" para quem só indica imóvel faria
 * ela achar que o link veio errado e não abrir.
 */
function copiarConvitePrestador() {
  const emp = (PERM.empresa && (PERM.empresa.nome_fantasia || PERM.empresa.razao_social)) || '';
  const p = ehPrestador(), i = ehIndicador();

  const assunto = (p && i) ? 'aos seus chamados e às suas comissões'
                : (i ? 'às suas comissões' : 'aos chamados de manutenção');
  const comoUsar = (p && i)
    ? 'Por ele você vê os serviços, envia orçamento, avisa quando começar e terminar, ' +
      'e acompanha o que tem a receber de comissão.'
    : (i
      ? 'Por ele você vê quanto tem a receber, o que já foi pago, e pode indicar ' +
        'imóveis novos direto pelo celular.'
      : 'Por ele você vê os serviços, envia o orçamento e avisa quando começar e ' +
        'quando terminar.');

  const texto =
    `Olá${registro.nome ? ', ' + primeiroENome(registro.nome) : ''}! Aqui é da ${emp}.\n\n` +
    `Este é o seu link de acesso ${assunto}:\n` +
    `${enderecoPortal(tokenPrestador)}\n\n` +
    `Guarde no celular. ${comoUsar} Não precisa de senha.`;
  copiar(texto, 'Mensagem copiada. Cole no WhatsApp.');
}

function copiarSoOLink() {
  copiar(enderecoPortal(tokenPrestador), 'Link copiado.');
}

function copiar(texto, aviso) {
  navigator.clipboard.writeText(texto).then(
    () => alert(aviso),
    () => prompt('Copie o texto abaixo:', texto));
}

// ------------------------------------------------------------
// SIMULAÇÕES DE SEGURO (reescrito na v1.117) — o fluxo que morava
// na planilha: registrar a tentativa (CPF → seguradora), enviar o
// resultado por WhatsApp (botão 📲, no lugar do checkbox da coluna
// AA) e, aprovada a fiança, agendar a visita.
//
// Os três números exibidos são OS MESMOS da mensagem do WhatsApp:
// mensal = aluguel + fiança · incêndio = valor cheio ÷ 6 ·
// entrada = fiança + setup. O bloco antigo somava aluguel + fiança
// + incêndio cheio num "total/mês" que não batia com o que o lead
// recebia — número que a pessoa não reconhece é número errado.
// ------------------------------------------------------------
// v1.463 — o envio deixou de ser uma tarja e virou a janela de mensagem
// do CRM (ver "ENVIAR A SIMULAÇÃO", mais abaixo). `simEnviando` morreu
// junto com a tarja: quem confirma agora é a própria janela, mostrando
// o texto inteiro antes de ele sair.

function blocoSimulacoes() {
  const corpo = !simulacoes.length
    ? '<div class="corpo" style="color:#8a94a1">Nenhuma simulação ainda. ' +
      'Registre a 1ª tentativa quando o lead mandar o CPF.</div>'
    : `<table class="mini">${simulacoes.map(s => {
        const cor = s.status_fianca === 'Aprovado' ? 'tag-verde'
                  : (s.status_fianca === 'Reprovado' ? 'tag-vermelha' : 'tag-cinza');
        const mensal = Number(s.valor_aluguel || 0) + Number(s.vr_fianca || 0);
        const podeEnviar = registro.telefone && s.status_fianca;
        return `
        <tr class="${s.status_fianca === 'Aprovado' ? 'sim-aprovada' : ''}">
          <td style="width:1%;white-space:nowrap;color:var(--texto-suave)">${htm(dataBr(String(s.criado_em || '').slice(0, 10)))}</td>
          <td>${htm(s.modalidade || s.seguradora || 'Simulação')}${
              s.cpf_analisado ? ` · <span style="color:var(--texto-suave)">CPF ${
                typeof mascaraDoc === 'function' ? htm(mascaraDoc(String(s.cpf_analisado))) : htm(s.cpf_analisado)}</span>` : ''}
            <div style="color:var(--texto-suave);font-size:12px">
              Aluguel ${moeda(s.valor_aluguel)} + Fiança ${moeda(s.vr_fianca)}
              = <b>${mensal ? moeda(mensal) + '/mês' : '—'}</b> ·
              Incêndio 6× ${moeda(Number(s.vr_incendio || 0) / 6)} ·
              Entrada ${moeda(Number(s.vr_fianca || 0) + Number(s.vr_setup || 0))}</div>
            ${s.enviada_em ? `<div class="sim-enviada">${icone('enviar', 12)} Enviada por WhatsApp em ${
              htm(dataBr(String(s.enviada_em).slice(0, 10)))}</div>` : ''}
          </td>
          <td style="width:1%;white-space:nowrap"><span class="tag ${cor}">${htm(s.status_fianca || '—')}</span></td>
          <td style="width:1%;white-space:nowrap">
            <button class="btn btn-claro sim-btn" data-perm="leads:editar"
               ${podeEnviar ? '' : 'disabled title="Precisa de telefone no lead e resultado na simulação"'}
               onclick="pedirEnvioSimulacao('${s.id}')">${icone('enviar', 13)} ${s.enviada_em ? 'Reenviar' : 'Enviar'}</button>
          </td>
        </tr>`;
      }).join('')}</table>`;

  const temAprovada = simulacoes.some(s => s.status_fianca === 'Aprovado');
  return `<div class="cartao"><h2>Simulações de seguro fiança
    <span class="cnt">(${simulacoes.length})</span>
    <span class="dir">
      ${temAprovada && registro.status !== 'Convertido' && registro.status !== 'Perdido'
        ? '<span class="tag tag-verde">' + icone('checkCirculo', 12) + ' fiança aprovada — pode agendar a visita</span>' : ''}
      <button class="btn btn-claro" data-perm="leads:editar"
        onclick="novaSimulacao()">+ Nova simulação</button>
    </span></h2>${corpo}</div>`;
}

/** (Lead) Nova tentativa de fiança. O aluguel vem pré-preenchido do
 *  que o lead procura — digitar de novo é convite ao erro. */
async function novaSimulacao() {
  await Promise.all([carregarPlanosIncendio(), carregarModalidadesFianca()]);
  // as opções dos seletores são escritas ANTES de a janela abrir,
  // como ajustarEtapasDaFicha() faz com o funil (v1.118)
  const fPlano = DEFS.simulacao.campos.find(c => c.c === '_plano');
  if (fPlano) fPlano.op = planosIncendio.length
    ? [PLANO_ESCOLHER].concat(planosIncendio.map(rotuloDoPlano)).concat([PLANO_MANUAL])
    : [PLANO_MANUAL];
  const fFianca = DEFS.simulacao.campos.find(c => c.c === '_fianca');
  if (fFianca) fFianca.op = modalidadesFianca.length
    ? [FIANCA_ESCOLHER].concat(modalidadesFianca.map(rotuloDaModalidade)).concat([FIANCA_MANUAL])
    : [FIANCA_MANUAL];
  const base = {
    status_fianca: 'Pendente',
    valor_aluguel: registro.aluguel_max ?? '',
    cpf_analisado: simulacoes.length ? '' : (registro.cpf_cnpj || ''),
    // R$ 150 é o setup de praxe (04/08/2026) — pré-preenchido para não
    // digitar toda vez, editável porque praxe não é lei. Se o plano
    // escolhido tiver setup próprio no cadastro, ele sobrescreve.
    vr_setup: 150,
    // com um único plano no cadastro (hoje: só a LOFT), ele já vem
    // escolhido — clicar em "escolher" para a única opção é burocracia
    _fianca: modalidadesFianca.length === 1
      ? rotuloDaModalidade(modalidadesFianca[0]) : undefined
  };
  abrirModal(DEFS.simulacao, `Nova simulação (${simulacoes.length + 1}ª tentativa)`,
    base, vinculo(), recarregarSimulacoes);
  const sel = document.getElementById('mf-_plano');
  if (sel) {
    // sem valor no `base`, o abrirModal deixa o select SEM seleção
    // (selectedIndex -1, aparência de campo vazio) — cai na primeira opção
    if (!sel.value) sel.selectedIndex = 0;
    sel.onchange = () => aplicarPlanoIncendio(sel.value);
  }
  const selF = document.getElementById('mf-_fianca');
  if (selF) {
    if (!selF.value) selF.selectedIndex = 0;
    selF.onchange = () => aplicarModalidadeFianca(selF.value);
    // aplica o plano que já veio escolhido (caso do cadastro com um só)
    aplicarModalidadeFianca(selF.value);
  }
}

// --- (lead) tabela do seguro incêndio (v1.161) ---------------
const PLANO_ESCOLHER = '— escolher da tabela —';
const PLANO_MANUAL = '✏️ Digitar outro valor…';

/** O texto que aparece no seletor. Também é a chave para reencontrar a
 *  linha ao escolher — por isso inclui tudo o que desempata. */
function rotuloDoPlano(p) {
  return `${p.seguradora} · ${p.tipo_imovel}` +
    ` · Imóvel ${moeda(p.valor_imovel).replace(',00', '')}` +
    ` · Seguro ${moeda(p.premio_cheio)}`;
}

/**
 * Busca a tabela uma vez por ficha. Falha em silêncio de propósito,
 * como carregarTiposDeSinistro(): sem a tabela (SQL da 1.161 ainda não
 * rodado, rede caindo), o seletor oferece só "Digitar outro valor" e a
 * janela continua funcionando como sempre funcionou.
 */
async function carregarPlanosIncendio() {
  if (planosIncendio !== null) return;
  try {
    const { data, error } = await sb.from('seguro_incendio_planos')
      .select('seguradora,tipo_imovel,valor_imovel,premio_cheio')
      .eq('ativo', true)
      .order('seguradora').order('tipo_imovel').order('valor_imovel');
    planosIncendio = (error || !data) ? [] : data;
  } catch (e) {
    console.warn('[seguro incêndio] sem tabela, seguindo manual:', e.message || e);
    planosIncendio = [];
  }
}

/**
 * Escolheu um plano → incêndio e valor do imóvel se preenchem e ficam
 * travados (fundo verde), para o número da seguradora não ser corrigido
 * à mão sem querer. "Digitar outro valor" (ou voltar para "escolher")
 * destrava os dois SEM apagar o que estiver digitado — apagar trabalho
 * alheio é pior do que deixar um número para conferir.
 *
 * O campo "Seguradora" fica de fora DE PROPÓSITO (v1.162): ele é a
 * seguradora da FIANÇA (LOFT), preenchido pelo seletor de fiança. A do
 * incêndio (Porto Seguro) mora na tabela e aparece no rótulo do plano.
 */
function aplicarPlanoIncendio(rotulo) {
  const plano = (planosIncendio || []).find(p => rotuloDoPlano(p) === rotulo);
  const els = ['vr_incendio', 'plano_valor_imovel']
    .map(c => document.getElementById('mf-' + c));
  if (!plano) {
    els.forEach(el => { if (el) { el.readOnly = false; el.style.background = ''; } });
    return;
  }
  const [inc, imo] = els;
  if (inc) inc.value = moedaCampo(plano.premio_cheio);
  if (imo) imo.value = moedaCampo(plano.valor_imovel);
  els.forEach(el => { if (el) { el.readOnly = true; el.style.background = '#f2f9f3'; } });
}

// --- (lead) modalidades do seguro fiança (v1.162) ------------
const FIANCA_ESCOLHER = '— escolher o plano —';
const FIANCA_MANUAL = '✏️ Digitar outra…';

/** "LOFT - Pop", como o Rodrigo escreve. */
function rotuloDaModalidade(m) {
  return `${m.seguradora} - ${m.nome}`;
}

/** Mesmo plano B silencioso do incêndio: sem a tabela (SQL da 1.162
 *  ainda não rodado), os campos seguem livres como sempre foram. */
async function carregarModalidadesFianca() {
  if (modalidadesFianca !== null) return;
  try {
    const { data, error } = await sb.from('fianca_modalidades')
      .select('seguradora,nome,vr_setup,comissao_pct')
      .eq('ativo', true)
      .order('seguradora').order('nome');
    modalidadesFianca = (error || !data) ? [] : data;
  } catch (e) {
    console.warn('[fiança] sem cadastro de planos, seguindo manual:', e.message || e);
    modalidadesFianca = [];
  }
}

/**
 * Escolheu o plano → seguradora e modalidade se preenchem e travam;
 * o Vr. setup recebe o padrão do plano mas CONTINUA editável — é
 * praxe, não lei. "Digitar outra" destrava sem apagar nada.
 */
function aplicarModalidadeFianca(rotulo) {
  const m = (modalidadesFianca || []).find(x => rotuloDaModalidade(x) === rotulo);
  const els = ['seguradora', 'modalidade'].map(c => document.getElementById('mf-' + c));
  if (!m) {
    els.forEach(el => { if (el) { el.readOnly = false; el.style.background = ''; } });
    return;
  }
  const [seg, mod] = els;
  if (seg) seg.value = m.seguradora;
  if (mod) mod.value = m.nome;
  els.forEach(el => { if (el) { el.readOnly = true; el.style.background = '#f2f9f3'; } });
  const setup = document.getElementById('mf-vr_setup');
  if (setup && m.vr_setup !== null && m.vr_setup !== undefined) {
    setup.value = moedaCampo(m.vr_setup);
  }
}

async function recarregarSimulacoes() {
  const { data } = await sb.from('simulacoes').select('*')
    .eq('lead_id', ID).order('criado_em', { ascending: false });
  simulacoes = data || [];
  // a trigger do banco pode ter movido o funil para "Em análise"
  const { data: l } = await sb.from('leads').select('*').eq('id', ID).single();
  if (l) registro = l;
  desenharFicha();
  await recarregarTarefas();
}

// ------------------------------------------------------------
// ENVIAR A SIMULAÇÃO (v1.463) — o texto passa a sair do CRM
//
// O BotConversa foi cancelado, e com ele foi embora o TEXTO: o
// `simulacao_enviar_whatsapp` mandava campos soltos (aluguel, fiança,
// entrada…) para um fluxo que montava a mensagem lá dentro. Sem esse
// fluxo, o botão Enviar não tinha o que dizer.
//
// A troca: o botão abre a MESMA janela de mensagem que já existe na
// ficha (a do 🕒 "Agendar mensagem", v1.343), com o modelo do
// resultado já escolhido e os números da simulação já trocados. Um
// jeito só de mandar WhatsApp no CRM, e o texto passa a morar em
// Administração → Mensagens — o Rodrigo muda sem pedir versão.
//
// O caminho de saída também muda: sai pela FILA da Evolution
// (`mensagem_agendar` + `mensagem_disparar_agora`), a mesma do
// "Enviar agora". A RPC `simulacao_enviar_whatsapp` e o segredo
// `botconversa_simulacao` ficam órfãos de propósito — nada mais os
// chama (ver o sql-01, que não os apaga: primeiro a prova em produção).
// ------------------------------------------------------------
function pedirEnvioSimulacao(id) {
  const s = simulacoes.find(x => String(x.id) === String(id));
  if (!s) return;
  abrirAgendarMensagem({ simulacao: s });
}

// ------------------------------------------------------------
// (Lead) ORÇAMENTO DA LOCAÇÃO (v1.333) — mockup aprovado em 21/08/2026.
//
// O que o inquilino paga nos primeiros meses, com o 1º aluguel
// proporcional, os seguros entrando no mês que o dia de corte manda, e
// o texto pronto para mandar. Substitui a conta feita na calculadora e
// o texto escrito à mão a cada lead.
//
// TRÊS DECISÕES QUE EXPLICAM O CÓDIGO:
//
// 1. A REGRA DO CORTE É A MESMA DO CONTRATO. `orcCompetenciaPorCorte`
//    repete, letra por letra, o que `mesDaPrimeiraParcela` já faz com a
//    apólice: dia da contratação DEPOIS do corte → a 1ª parcela cai na
//    fatura do mês seguinte. Duas contas diferentes para a mesma
//    pergunta seria a tela prometendo um valor e o contrato cobrando
//    outro.
//
// 2. O QUE A TELA CHAMA DE "1º/2º BOLETO" O BANCO CHAMA DE COMPETÊNCIA.
//    O boleto de 10/09 de um contrato que começa em 28/08 é a
//    competência 08 (o `calcular_competencia` empurra o vencimento que
//    cairia antes do início). Por isso a escolha do rádio vira
//    `inicio_competencia` — é assim que ela chega no `contrato_itens`
//    sem tradução.
//
// 3. O CARTÃO NÃO REDESENHA A FICHA A CADA TECLA. `orcRecalcular` só
//    reescreve os pedaços do resultado. Redesenhar a ficha inteira
//    tiraria o foco do campo no meio da digitação — foi o que fez a
//    prévia de gerar parcelas ganhar o `simTimer`.
// ------------------------------------------------------------
let orcamentosLead = [];   // (lead) versões salvas do orçamento
let orcAtual = null;       // a versão aberta na tela (pode ser rascunho novo)
let orcSemFianca = false;  // v1.396 — pediu para montar sem a fiança aprovada
let orcComparando = false;
let orcTextoAtivo = 'longa';

const ORC_DIAS_DIVISOR = 30;   // o divisor é 30 fixo, não os dias do mês (regra da casa)

/** o cartão inteiro. Sem simulação aprovada ele explica em vez de sumir:
 *  quem abre a ficha para orçar precisa saber o que falta. */
function blocoOrcamento() {
  if (ALVO !== 'lead') return '';
  const aprovada = (simulacoes || []).find(s => s.status_fianca === 'Aprovado');
  if (!orcAtual) orcAtual = orcamentosLead.length ? { ...orcamentosLead[0] } : orcNovoRascunho(aprovada);

  const cab = `<h2>Orçamento da locação
    <span class="cnt">(o que o inquilino paga nos primeiros meses)</span>
    <span class="dir">
      ${aprovada ? '<span class="tag tag-verde">' + icone('checkCirculo', 12) + ' fiança aprovada</span>'
                 : '<span class="tag tag-amarela">sem fiança aprovada</span>'}
      ${orcamentosLead.length ? `<select class="orc-versao" onchange="orcTrocarVersao(this.value)">
        ${orcamentosLead.map(o => `<option value="${htm(o.id)}"
          ${orcAtual && orcAtual.id === o.id ? 'selected' : ''}>${htm(orcRotuloVersao(o))}</option>`).join('')}
        ${orcAtual && !orcAtual.id ? '<option value="" selected>rascunho não salvo</option>' : ''}
      </select>` : ''}
      <button class="btn btn-claro" data-perm="leads:editar"
        onclick="orcNovo()">${orcAtual && !orcAtual.id ? 'Recomeçar' : '+ Novo'}</button>
    </span></h2>`;

  // v1.396 — o `orcSemFianca` na conta: sem ele "Montar assim mesmo" chamava
  // orcNovo(), a ficha redesenhava e caía aqui de novo, mostrando o mesmo
  // texto. O botão não abria formulário nenhum.
  if (!aprovada && !orcamentosLead.length && !orcSemFianca) {
    return `<div class="cartao">${cab}<div class="corpo" style="color:var(--texto-suave)">
      Registre a simulação e marque a fiança como <b>Aprovada</b> — os valores do seguro
      vêm dela. Dá para montar o orçamento antes, mas os números do seguro entram à mão.
      <div style="margin-top:10px"><button class="btn btn-claro" data-perm="leads:editar"
        onclick="orcMontarAssimMesmo()">Montar assim mesmo</button></div></div></div>`;
  }

  /* v1.398 — CINCO CARTÕES, NÃO UM SÓ.
   *
   * O orçamento era um cartão único com tudo dentro, e chegou ao ponto
   * de não caber na tela. Dividido, cada parte ganha DE GRAÇA a seta de
   * recolher do `ligarRecolherDosCartoes()` (base.js), que age em todo
   * `.cartao` com `> h2` — e a memória do que fica aberto passa a ser
   * por parte, não do bloco inteiro.
   *
   * Nenhum destes h2 pode ganhar `onclick` próprio: é essa a marca que
   * faz a varredura pular o cartão, e o resultado seria a seta em
   * duplicidade da Home (v1.375). Botão DENTRO do h2 pode — o `.dir` é
   * removido antes de virar chave de memória, e o clique nele não sobe
   * para o cabeçalho porque quem escuta é a seta, não o h2.
   */
  const acoes = `<div class="orc-acoes">
      <button class="btn btn-claro" data-perm="leads:editar" onclick="orcSalvar()">${icone('salvar', 13)} Salvar versão</button>
      <button class="btn btn-claro" onclick="orcAbrirProposta()">${icone('impressora', 13)} Proposta em PDF</button>
      <button class="btn btn-claro" data-perm="leads:editar" onclick="orcAbrirLink()">${icone('elo', 13)} Link público</button>
      <span class="orc-fim"></span>
      <button class="btn btn-claro orc-discreto" data-perm="contratos:criar"
        onclick="orcCriarContrato()">${icone('documento', 13)} Criar o contrato</button>
    </div>`;

  return `<div class="cartao orc-cartoes">${cab}
    <div class="corpo">
      <div id="orc-tiles"></div>
      <div class="orc-avisos" id="orc-avisos"></div>
    </div>
    ${acoes}
    <div id="orc-link">${orcFaixaDoLink()}</div></div>

  <div class="cartao orc-cartoes"><h2>O que entra na conta
    <span class="cnt">os números que montam o orçamento</span></h2>
    <div class="orc-esq">${orcFormulario()}</div></div>

  <div class="cartao orc-cartoes"><h2>Quando cada coisa é paga
    <span class="cnt">a linha do tempo e o detalhe de cada boleto</span></h2>
    <div class="corpo">
      <div class="orc-tempo" id="orc-tempo"></div>
      <h3 class="orc-tit">Detalhe de cada pagamento</h3>
      <div id="orc-saida"></div>
    </div></div>

  <div class="cartao orc-cartoes" data-nasce="fechado"><h2>Comparar com outra data de início
    <span class="cnt">“e se eu entrar no dia 1º?”</span>
    <span class="dir">
      <input type="date" id="orc-inicio-b" class="orc-data-b">
      <button class="btn btn-claro" id="orc-btn-comp" onclick="orcAlternarComp()">Comparar</button>
    </span></h2>
    <div class="corpo orc-comp orc-nu"><div id="orc-comp-corpo"></div></div></div>

  <div class="cartao orc-cartoes"><h2>Mensagem para o lead
    <span class="dir">
      <span class="orc-abas">
        <button id="orc-ab-longa" onclick="orcTrocarTexto('longa')">Completa</button>
        <button id="orc-ab-curta" onclick="orcTrocarTexto('curta')">Curta</button>
      </span>
      <button class="btn btn-claro" onclick="orcCopiar()">${icone('prancheta', 13)} Copiar</button>
      <button class="btn btn-claro" id="orc-btn-zap">${icone('balao', 13)} Abrir no WhatsApp</button>
      <button class="btn" data-perm="leads:editar" onclick="orcPedirEnvio()">${icone('enviar', 13)} Enviar pelo WhatsApp</button>
    </span></h2>
    <div class="corpo orc-msg orc-nu">
      <pre id="orc-msg"></pre>
      <div id="orc-strip"></div>
      <div id="orc-enviada"></div>
    </div></div>`;
}

function orcRotuloVersao(o) {
  return `v${o.versao} · ${dataBr(String(o.criado_em || '').slice(0, 10))}`
       + (o.enviada_em ? ' · enviado' : ' · rascunho');
}

/** O rascunho que nasce da simulação aprovada. Tudo o que o CRM já sabe
 *  vem preenchido: digitar de novo é convite ao erro (mesma razão do
 *  `valor_aluguel` pré-preenchido em novaSimulacao). */
function orcNovoRascunho(sim) {
  const s = sim || (simulacoes || [])[0] || {};
  const sgF = orcSeguradoraPorNome(s.seguradora);
  const sgI = orcSeguradoraDoIncendio();
  return {
    id: null,
    simulacao_id: s.id || null,
    inicio: hojeISO(),
    dia_vencimento: 10,          // ~99% escolhem o dia 10
    dias_minimos: 0,
    // quantas cobranças a fiança terá: o plano é "dura o mesmo tanto
    // do contrato", então o número sai da duração e não de um 12 fixo
    meses_contrato: ORC_MESES_PADRAO,
    valor_aluguel: Number(s.valor_aluguel || registro.aluguel_max || 0) || null,
    fianca_valor: Number(s.vr_fianca || 0) || null,
    fianca_setup: Number(s.vr_setup || 0) || null,
    fianca_corte: sgF ? sgF.dia_corte : null,
    fianca_nas_chaves: true,
    fianca_competencia: null,
    incendio_valor: Number(s.vr_incendio || 0) || null,
    incendio_parcelas: (sgI && sgI.incendio_parcelas) || 6,
    incendio_corte: sgI ? sgI.dia_corte : null,
    incendio_avista: !!(sgI && sgI.incendio_forma === 'avista'),
    incendio_competencia: null,
    taxa_boleto: 0,
    taxa_contrato_digital: 0,
    forma_pagamento: ORC_FORMAS[0],
    canal_boleto: ORC_CANAIS[0],
    o_que_levar: 'Documento com foto e o pagamento da retirada das chaves',
    contas: { 'Água': 'Inquilino', 'Luz': 'Inquilino', 'Gás': 'Não tem',
              'IPTU': 'Inquilino', 'Condomínio': 'Não tem' }
  };
}

const ORC_FORMAS = ['Boleto bancário (com Pix no próprio boleto)', 'Boleto bancário', 'Pix'];
const ORC_CANAIS = ['WhatsApp e e-mail, 5 dias antes do vencimento',
                    'WhatsApp, 5 dias antes do vencimento',
                    'E-mail, 5 dias antes do vencimento'];
const ORC_CONTAS = ['Água', 'Luz', 'Gás', 'IPTU', 'Condomínio'];
const ORC_QUEM   = ['Inquilino', 'Proprietário', 'No boleto', 'Não tem'];
// v1.397 — saíram da tela e viraram o padrão da casa. Continuam
// gravados em cada orçamento: mudar o padrão aqui não reescreve o que
// já foi enviado ao lead.
const ORC_LEVAR_PADRAO = 'Documento com foto e o pagamento da retirada das chaves';
const ORC_MESES_PADRAO = 12;

function orcSeguradoraPorNome(nome) {
  if (!nome) return null;
  return (seguradorasFicha || []).find(s =>
    String(s.nome || '').toLowerCase() === String(nome).toLowerCase()) || null;
}
/** a seguradora do INCÊNDIO é a que tem regra de parcelamento cadastrada;
 *  a da fiança vem da simulação. Sem nenhuma, o cartão segue no manual.
 *
 *  v1.397 — antes bastava ter `incendio_forma` para ser escolhida, e a
 *  LOFT tem esse campo preenchido sem ter o resto: ela ganhava da PORTO
 *  SEGURO, que é quem faz o incêndio, e o `dia_corte` 27 cadastrado na
 *  Porto NUNCA era usado. Dava para digitar por cima no campo da tela;
 *  agora que o campo saiu, a escolha precisa acertar sozinha. Ordem:
 *  cadastro completo primeiro, e só depois qualquer uma com a forma. */
function orcSeguradoraDoIncendio() {
  const l = seguradorasFicha || [];
  return l.find(s => s.incendio_forma && s.incendio_parcelas && s.dia_corte != null)
      || l.find(s => s.incendio_forma && s.incendio_parcelas)
      || l.find(s => s.incendio_forma) || null;
}

// ---------- o formulário (metade esquerda) ----------
/** A dica em balão (v1.397). Substitui os parágrafos que ficavam
 *  sempre na tela: o texto continua ali, mas só quando se procura por
 *  ele. `lado` = 'dir' encosta o balão pela direita, para o campo que
 *  fica na beirada do bloco não jogar o balão para fora. */
function orcDica(texto, lado) {
  return `<span class="dica${lado ? ' ' + lado : ''}" tabindex="0">${icone('informacao', 13)}`
       + `<span class="balao">${texto}</span></span>`;
}

/** O NOME DO IMÓVEL NA LISTA (v1.398). O `endereco` da carteira já vem
 *  com número e complemento ("AMAPÁ, 225, APTO 24, TORRE 01"); o bairro
 *  é o que separa dois "JOSÉ FRIAS GARCIA, 510". O aluguel entra porque
 *  é o número que o orçamento vai usar. */
function orcRotuloImovel(i) {
  const fim = [i.bairro, i.valor_aluguel ? moeda(i.valor_aluguel) : null].filter(Boolean).join(' · ');
  return (i.codigo ? i.codigo + ' · ' : '') + (i.endereco || '(sem endereço)')
       + (fim ? ' — ' + fim : '');
}

/** As opções do seletor: os Disponíveis mais, se preciso, o que já
 *  está escolhido. O imóvel do orçamento pode ter saído da carteira
 *  (alugou para outro) e ele não pode sumir da lista sem aviso — senão
 *  o select trocaria a escolha sozinho ao redesenhar. */
function orcOpcoesDeImovel(atual) {
  const id = atual && atual.id;
  const lista = (imoveisDisponiveis || []).slice();
  if (id && !lista.some(x => x.id === id)) {
    const fora = (listaImoveis || []).find(x => x.id === id);
    lista.unshift(fora
      ? Object.assign({}, fora, { forada: true })
      : { id, endereco: atual.texto, forada: true });
  }
  return `<option value="">— sem imóvel escolhido —</option>`
    + lista.map(i => `<option value="${htm(i.id)}" ${i.id === id ? 'selected' : ''}>${
        htm(orcRotuloImovel(i))}${i.forada ? ' (fora da lista de disponíveis)' : ''}</option>`).join('')
    // o interesse que é anúncio de terceiro não tem id na carteira:
    // continua valendo como texto, mas não vira opção clicável
    + (!id && atual && atual.texto
        ? `<option value="" selected disabled>${htm(atual.texto)} (do interesse, sem cadastro)</option>` : '');
}

function orcFormulario() {
  const o = orcAtual;
  const imv = orcImovelDoLead();
  const cx = (id, rot, valor, extra, dica) => `<div class="orc-campo"><label>${htm(rot)}${dica || ''}</label>
    <input id="orc-${id}" value="${htm(valor == null ? '' : String(valor))}" ${extra || ''}></div>`;

  return `
  <div class="orc-bloco orc-largo"><h3>O imóvel <span class="de-onde">carteira · disponíveis</span></h3>
    <div class="orc-campo"><label>Qual imóvel este orçamento cobre${
      orcDica('A lista traz os imóveis com situação <b>Disponível</b> na carteira. '
        + 'O orçamento fecha sem escolher nenhum — os números não dependem dele —, mas o '
        + 'endereço <b>sai na proposta</b> que o lead recebe, e o contrato nasce com ele já '
        + 'preenchido.'
        + '<span class="conta">Escolher um imóvel traz o aluguel dele, quando o campo está '
        + 'vazio.</span>')}</label>
      <select id="orc-imovel">${orcOpcoesDeImovel(imv)}</select></div>
  </div>

  <div class="orc-bloco"><h3>O contrato <span class="de-onde">do lead</span></h3>
    <div class="orc-linha">
      <div class="orc-campo"><label>Início do contrato<span id="orc-d-prop"></span></label>
        <input type="date" id="orc-inicio" value="${htm(String(o.inicio || '').slice(0, 10))}"></div>
      <div class="orc-campo"><label>Aluguel vence todo dia</label>
        <select id="orc-dia">${[5, 10].map(d => `<option value="${d}"
          ${Number(o.dia_vencimento) === d ? 'selected' : ''}>${String(d).padStart(2, '0')}</option>`).join('')}</select></div>
    </div>
    <div class="orc-linha">
      ${cx('aluguel', 'Valor do aluguel', moedaCampo(o.valor_aluguel))}
      ${cx('diasmin', '1ª parcela mínima (dias)', o.dias_minimos || 0, '',
        orcDica('Abaixo disso não sai boleto curto: os dias entram somados no 1º boleto cheio.', 'dir'))}
    </div>
    <div class="orc-linha">
      ${cx('meses', 'Duração do contrato (meses)', o.meses_contrato || ORC_MESES_PADRAO, '',
        orcDica('É daqui que sai a numeração das cobranças do Seguro-Fiança — <b>1/12, 2/12, 3/12</b>. '
          + 'O plano da fiança está cadastrado como <i>dura o mesmo tanto do contrato</i>, '
          + 'então o número de cobranças é a duração, e não um 12 fixo.', 'dir'))}
      <div class="orc-campo"></div>
    </div>
  </div>

  <div class="orc-bloco"><h3>Seguro-fiança
    <span class="de-onde">${htm(orcNomeDaFianca())}</span></h3>
    <div class="orc-linha">
      ${cx('fianca', 'Cobrança', moedaCampo(o.fianca_valor))}
      ${cx('setup', 'Taxa de ativação', moedaCampo(o.fianca_setup))}
    </div>
    <div class="orc-linha uma">
      <div class="orc-campo"><label>Cobrar a 1ª cobrança</label>
        <label class="orc-check" style="padding-top:4px"><input type="checkbox" id="orc-fianca-chaves"
          ${o.fianca_nas_chaves ? 'checked' : ''}> na retirada das chaves</label></div>
    </div>
    <div class="orc-campo" style="margin-top:6px">
      <label>Nos boletos, a fiança começa a entrar em<span id="orc-d-corte-f"></span></label>
      <div class="orc-radios" id="orc-r-fianca"></div></div>
  </div>

  <div class="orc-bloco"><h3>Seguro incêndio
    <span class="de-onde">${htm((orcSeguradoraDoIncendio() || {}).nome || 'sem cadastro')}</span></h3>
    <div class="orc-linha">
      ${cx('incendio', 'Prêmio cheio (anuidade)', moedaCampo(o.incendio_valor))}
      <div class="orc-campo"><label>Valor da parcela</label>
        <input id="orc-parc-valor" readonly></div>
    </div>
    <div class="orc-campo" style="margin-bottom:8px"><label>Como o inquilino paga o incêndio</label>
      <div class="orc-radios">
        <label class="${o.incendio_avista ? '' : 'on'}"><input type="radio" name="orc-forma-inc"
          value="parcelado" ${o.incendio_avista ? '' : 'checked'}> Parcelado</label>
        <label class="${o.incendio_avista ? 'on' : ''}"><input type="radio" name="orc-forma-inc"
          value="avista" ${o.incendio_avista ? 'checked' : ''}> À vista, na assinatura</label>
      </div></div>
    <div class="orc-linha uma" id="orc-cx-parcelas">
      ${cx('parc', 'Em quantas parcelas', o.incendio_parcelas || 6)}
    </div>
    <div class="orc-campo" style="margin-top:6px" id="orc-cx-inc-quando">
      <label>A 1ª parcela do incêndio cai em<span id="orc-d-corte-i"></span></label>
      <div class="orc-radios" id="orc-r-incendio"></div></div>
  </div>

  <div class="orc-bloco"><h3>Outros itens da cobrança <span class="de-onde">itens padrão</span></h3>
    ${orcItensPadrao()}
  </div>

  <div class="orc-bloco"><h3>Contas do imóvel <span class="de-onde">quem paga</span></h3>
    <div class="orc-contas">${ORC_CONTAS.map(n => `<span>${htm(n)}</span>
      <select data-conta="${htm(n)}">${ORC_QUEM.map(q => `<option
        ${(o.contas || {})[n] === q ? 'selected' : ''}>${htm(q)}</option>`).join('')}</select>`).join('')}</div>
  </div>`;
}

function orcNomeDaFianca() {
  const s = (simulacoes || []).find(x => x.id === (orcAtual || {}).simulacao_id)
         || (simulacoes || []).find(x => x.status_fianca === 'Aprovado') || {};
  return [s.seguradora, s.modalidade].filter(Boolean).join(' · ') || 'da simulação';
}

/** Os itens padrão da cobrança vêm do cadastro (Administração →
 *  Seguros). Sem o cadastro carregado, oferece os dois de sempre — o
 *  boleto e a taxa de contrato digital — para o orçamento não depender
 *  de uma consulta que a ficha do lead não faz. */
function orcItensPadrao() {
  const o = orcAtual;
  const linha = (id, nome, valor, obs) => `<label class="orc-check">
    <input type="checkbox" id="orc-${id}" ${Number(o[id]) > 0 ? 'checked' : ''}
      data-valor="${valor}"> ${htm(nome)} — <b>${moeda(valor)}</b> ${htm(obs)}</label>`;
  return linha('taxa_boleto', 'Taxa de boleto', 4.90, 'em todo boleto')
       + linha('taxa_contrato_digital', 'Taxa de contrato digital', 47.00, 'só no 1º boleto');
}

// ---------- a leitura do formulário ----------
/**
 * O ELEMENTO de um campo do cartão — par do orcLer.
 *
 * Declarada como function DE PROPÓSITO, e não como `const el = id =>
 * document.getElementById(...)`: a conferência estrutural da bateria
 * rastreia esse atalho e cobra o argumento como id de tela — 'dia',
 * 'forma' e 'canal' viraram três erros na v1.333, porque o id real
 * nasce de 'orc-' + nome, dentro do orcFormulario. Mesma razão pela
 * qual o elementoAcao (v1.107) é function.
 */
function orcElemento(n) { return document.getElementById('orc-' + n); }

function orcLer(inicioISO) {
  const el = orcElemento;
  const txt = id => (el(id) ? String(el(id).value || '').trim() : '');
  const din = id => { const v = numeroBr(txt(id)); return v === null ? 0 : v; };
  const inte = id => { const v = numeroBr(txt(id)); return v === null ? null : Math.max(0, Math.round(v)); };
  const marc = id => !!(el(id) && el(id).checked);
  const radioInc = document.querySelector('input[name=orc-forma-inc]:checked');
  const avista = !!radioInc && radioInc.value === 'avista';
  const contas = {};
  document.querySelectorAll('.orc-contas select').forEach(s => { contas[s.dataset.conta] = s.value; });

  // v1.397 — CINCO campos saíram da tela (os dois dias de corte, a
  // forma de pagamento, o canal do boleto e o que levar na assinatura).
  // Eles CONTINUAM valendo: o dia de corte vem do cadastro da
  // seguradora e os outros três do padrão da casa. Sem o `ja`, a
  // primeira leitura devolveria vazio e apagaria o que o rascunho
  // trouxe — o mês do seguro mudaria sozinho e a proposta sairia sem
  // a forma de pagamento.
  const ja = orcAtual || {};
  const guardado = (v, alt) => (v == null || v === '' ? alt : v);

  return {
    inicio: String(inicioISO || txt('inicio') || hojeISO()).slice(0, 10),
    dia_vencimento: Number((orcElemento('dia') || {}).value || 10),
    dias_minimos: inte('diasmin') || 0,
    valor_aluguel: din('aluguel'),
    // v1.398 — o imóvel escolhido na lista. String vazia é o
    // "— sem imóvel escolhido —" e vira null; sem o seletor na tela,
    // guarda o que já estava (mesma regra dos campos que saíram).
    imovel_id: orcElemento('imovel')
      ? (orcElemento('imovel').value || null)
      : (ja.imovel_id !== undefined ? ja.imovel_id : undefined),
    meses_contrato: Math.max(1, inte('meses') || ja.meses_contrato || ORC_MESES_PADRAO),
    fianca_valor: din('fianca'),
    fianca_setup: din('setup'),
    fianca_corte: orcElemento('corte-f') ? inte('corte-f') : (ja.fianca_corte ?? null),
    fianca_nas_chaves: marc('fianca-chaves'),
    incendio_valor: din('incendio'),
    incendio_avista: avista,
    incendio_parcelas: avista ? 1 : Math.max(1, inte('parc') || 1),
    incendio_corte: orcElemento('corte-i') ? inte('corte-i') : (ja.incendio_corte ?? null),
    taxa_boleto: marc('taxa_boleto') ? 4.90 : 0,
    taxa_contrato_digital: marc('taxa_contrato_digital') ? 47.00 : 0,
    forma_pagamento: guardado((orcElemento('forma') || {}).value, guardado(ja.forma_pagamento, ORC_FORMAS[0])),
    canal_boleto: guardado((orcElemento('canal') || {}).value, guardado(ja.canal_boleto, ORC_CANAIS[0])),
    // vazio cai no padrão do mesmo jeito: a proposta impressa não pode
    // sair com a linha "o que levar na assinatura" em branco
    o_que_levar: guardado(orcElemento('levar') ? txt('levar') : null,
                          guardado(ja.o_que_levar, ORC_LEVAR_PADRAO)),
    contas,
    // as escolhas de mês que a pessoa possa ter trocado à mão
    fianca_competencia: (orcAtual || {}).fianca_competencia || null,
    incendio_competencia: (orcAtual || {}).incendio_competencia || null
  };
}

// ---------- as contas ----------
const orcD = iso => new Date(String(iso).slice(0, 10) + 'T12:00');
const orcMes1 = d => new Date(d.getFullYear(), d.getMonth(), 1);
const orcAddM = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
const orcDifD = (a, b) => Math.round((a - b) / 86400000);
const orcISO = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
                  + '-' + String(d.getDate()).padStart(2, '0');
const orcCent = n => Math.round((Number(n) || 0) * 100) / 100;
const orcDifM = (a, b) => (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
/* No TEXTO do WhatsApp as datas vão como o Rodrigo escreve — 10/09, sem o
 * ano (copy aprovada em 21/08/2026). A exceção é a data em que o incêndio
 * acaba: ela fica meses à frente, e "10/04" sozinho não diz qual ano. */
const orcDiaMes = d => dataBr(orcISO(d)).slice(0, 5);

/** "Seguro-Fiança — parcela 2 de 12" → "Seguro-Fiança (2/12)".
 *  O nome do item é gravado por extenso (é dado, e vai para o contrato
 *  assim); "(2/12)" é só como ele aparece para quem lê. */
const orcParcelaCurta = s => String(s).replace(/ — parcela (\d+) de (\d+)/, ' ($1/$2)');

/** O nome do item como ele aparece na LINHA DO TEMPO: sem o período de
 *  datas do aluguel proporcional (que já está no alto da parada) e com
 *  o número da parcela em miúdo.
 *
 *  O recorte das datas é específico de propósito: até a v1.396 era um
 *  `/ \(.*\)/` cego, que passou a levar junto o "(pagamento único)" da
 *  taxa de ativação. Parêntese aqui não é mais sinônimo de data.
 *  Devolve HTML — o que vem do banco passa por htm(). */
function orcNomeCurto(nome) {
  const s = String(nome).replace(/ \(\d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}\)/, '');
  const m = s.match(/^(.*) — parcela (\d+) de (\d+)$/);
  if (m) return htm(m[1]) + ` <i class="p">(${m[2]}/${m[3]})</i>`;
  const u = s.match(/^(.*?) (\([^()]*\))$/);
  if (u) return htm(u[1]) + ' <i class="p">' + htm(u[2]) + '</i>';
  return htm(s);
}

/** MESMA REGRA de mesDaPrimeiraParcela(): contratou depois do dia de
 *  corte → a seguradora só fatura no mês seguinte. Devolve o 1º dia do
 *  mês da 1ª parcela, que é o formato de `contrato_itens.inicio_competencia`. */
function orcCompetenciaPorCorte(inicio, corte) {
  const d = orcD(inicio);
  if (corte && d.getDate() > Number(corte)) d.setMonth(d.getMonth() + 1);
  return orcMes1(d);
}

/**
 * O cálculo inteiro, isolado de propósito: é ele que roda DUAS VEZES no
 * comparador de datas, e é dele que sai tudo o que a tela mostra, o
 * texto do WhatsApp e os itens do contrato. Nada de conta espalhada
 * pelo desenho.
 */
function orcCalcular(c) {
  const inicio = orcD(c.inicio);
  const dia = Number(c.dia_vencimento) || 10;

  // O 1º VENCIMENTO. Começou antes do dia → mesmo mês; a partir dele →
  // mês seguinte. É a regra da casa, e a mesma que o calcular_competencia
  // aplica ao empurrar o vencimento que cairia antes do início.
  let venc1 = new Date(inicio.getFullYear(), inicio.getMonth(), dia, 12);
  if (inicio.getDate() >= dia) venc1 = orcAddM(venc1, 1);

  let dias = orcDifD(venc1, inicio), extra = 0, proporcional = true;
  if (dias < (c.dias_minimos || 0)) {
    // parcela curta demais não nasce: os dias entram somados no 1º cheio
    extra = dias; venc1 = orcAddM(venc1, 1); dias = 0; proporcional = false;
  }

  // A competência do 1º boleto é o MÊS DO INÍCIO — não o mês do
  // vencimento. É por isso que o seguro que "cai no 2º boleto" grava a
  // competência do mês seguinte ao do início.
  const comp1 = orcMes1(inicio);
  const sugF = orcCompetenciaPorCorte(c.inicio, c.fianca_corte);
  const sugI = orcCompetenciaPorCorte(c.inicio, c.incendio_corte);
  const compF = c.fianca_competencia ? orcMes1(orcD(c.fianca_competencia)) : sugF;
  const compI = c.incendio_competencia ? orcMes1(orcD(c.incendio_competencia)) : sugI;
  const iniF = Math.max(1, orcDifM(compF, comp1) + 1);   // índice do boleto (1-based)
  const iniI = Math.max(1, orcDifM(compI, comp1) + 1);
  const parcInc = c.incendio_parcelas ? orcCent(c.incendio_valor / c.incendio_parcelas) : 0;

  // AS COBRANÇAS DA FIANÇA (v1.397). São numeradas como as do
  // incêndio — 1 de 12, 2 de 12 — e a contagem começa na PRIMEIRA
  // COBRANÇA de verdade: se a 1ª cobrança sai na retirada das
  // chaves, ela é a 1 de 12 e o 1º boleto traz a 2 de 12.
  const totF = Math.max(1, Number(c.meses_contrato) || ORC_MESES_PADRAO);
  let nF = 0;                       // quantas cobranças já saíram

  // A RETIRADA DAS CHAVES
  const chaves = [];
  if (c.fianca_nas_chaves && c.fianca_valor)
    chaves.push([`Cobrança do Seguro-Fiança — parcela ${++nF} de ${totF}`, c.fianca_valor]);
  if (c.fianca_setup) chaves.push(['Taxa de ativação do Seguro-Fiança (pagamento único)', c.fianca_setup]);
  if (c.incendio_avista && c.incendio_valor) chaves.push(['Seguro Incêndio (à vista)', c.incendio_valor]);

  // OS BOLETOS. Vão até o fim do incêndio + 1, para a tela poder mostrar
  // a queda da cobrança — que é a pergunta que o Rodrigo faz sempre.
  const qtd = Math.max(3, c.incendio_avista ? 3 : iniI + Number(c.incendio_parcelas || 0));
  const boletos = [];
  for (let i = 1; i <= qtd; i++) {
    const venc = orcAddM(venc1, i - 1), itens = [];
    if (i === 1 && proporcional) {
      itens.push([`Aluguel proporcional de ${dias} dias (${dataBr(orcISO(inicio))} a `
        + `${dataBr(orcISO(new Date(venc1 - 86400000)))})`, orcCent(c.valor_aluguel / ORC_DIAS_DIVISOR * dias)]);
    } else if (i === 1 && extra) {
      itens.push([`Aluguel integral + ${extra} dias`,
        orcCent(c.valor_aluguel + c.valor_aluguel / ORC_DIAS_DIVISOR * extra)]);
    } else itens.push(['Aluguel', c.valor_aluguel]);
    if (c.fianca_valor && i >= iniF && nF < totF)
      itens.push([`Seguro-Fiança — parcela ${++nF} de ${totF}`, c.fianca_valor]);
    if (!c.incendio_avista && parcInc) {
      const n = i - iniI + 1;
      if (n >= 1 && n <= c.incendio_parcelas)
        itens.push([`Seguro Incêndio — parcela ${n} de ${c.incendio_parcelas}`, parcInc]);
    }
    if (c.taxa_contrato_digital && i === 1) itens.push(['Taxa de contrato digital', c.taxa_contrato_digital]);
    if (c.taxa_boleto) itens.push(['Taxa de boleto', c.taxa_boleto]);
    boletos.push({ venc, itens, total: orcCent(itens.reduce((s, x) => s + x[1], 0)) });
  }
  const recorrente = boletos.find((b, i) => i > 1 && b.total !== boletos[1].total);

  return { c, inicio, venc1, dias, extra, proporcional, comp1, sugF, sugI, compF, compI,
    iniF, iniI, parcInc, chaves, totalChaves: orcCent(chaves.reduce((s, x) => s + x[1], 0)),
    boletos, recorrente };
}

// ---------- o resultado (metade direita) ----------
/* v1.398 — `orcResultado()` foi embora: o que ela montava num bloco só
 * agora nasce dividido nos cartões do `blocoOrcamento`. Os ids são os
 * mesmos (orc-tiles, orc-tempo, orc-saida, orc-avisos, orc-comp-corpo,
 * orc-msg), então o `orcRecalcular` continua escrevendo nos mesmos
 * lugares — só que agora eles estão em cartões diferentes. */
/** Recalcula e reescreve SÓ os pedaços do resultado — nunca a ficha
 *  inteira, senão o foco sai do campo no meio da digitação. */
function orcRecalcular() {
  if (!document.getElementById('orc-tiles')) return;
  const c = orcLer();
  const R = orcCalcular(c);
  orcAtual = Object.assign({}, orcAtual, c);

  const pv = document.getElementById('orc-parc-valor');
  if (pv) pv.value = moedaCampo(R.parcInc);
  const esconde = c.incendio_avista ? 'none' : '';
  ['orc-cx-parcelas', 'orc-cx-inc-quando'].forEach(id => {
    const e = document.getElementById(id); if (e) e.style.display = esconde;
  });

  orcRadios('orc-r-fianca', R, R.compF, R.sugF, v => { orcAtual.fianca_competencia = v; orcRecalcular(); });
  orcRadios('orc-r-incendio', R, R.compI, R.sugI, v => { orcAtual.incendio_competencia = v; orcRecalcular(); });

  // v1.397 — os três parágrafos que ficavam abertos na tela viraram
  // dica: o texto é o mesmo, só espera o mouse. `orcPorDica` troca o
  // conteúdo do <span> âncora que o formulário deixou no rótulo.
  orcPorDica('orc-d-prop', R.proporcional
    ? `Começou <b>${htm(dataBr(orcISO(R.inicio)))}</b> — ${R.inicio.getDate() >= c.dia_vencimento
        ? 'a partir do' : 'antes do'} dia ${String(c.dia_vencimento).padStart(2, '0')} —, então o 1º aluguel
       vai para <b>${htm(dataBr(orcISO(R.venc1)))}</b> e cobre <b>${R.dias} dias</b>.
       <span class="conta">${moeda(c.valor_aluguel)} ÷ 30 = ${moeda(c.valor_aluguel / 30)} por dia
       × ${R.dias} = <b>${moeda(orcCent(c.valor_aluguel / 30 * R.dias))}</b></span>`
    : `Sobravam só <b>${R.extra} dias</b> — menos que o mínimo. Não sai boleto curto: o 1º boleto
       é em <b>${htm(dataBr(orcISO(R.venc1)))}</b>, cheio + ${R.extra} dias.`);

  orcNota('orc-d-corte-f', 'o Seguro-Fiança', c.inicio, c.fianca_corte, R, R.sugF, R.compF);
  if (c.incendio_avista)
    orcPorDica('orc-d-corte-i', 'À vista na assinatura — o dia de corte não interfere.');
  else orcNota('orc-d-corte-i', 'o Seguro Incêndio', c.inicio, c.incendio_corte, R, R.sugI, R.compI);

  orcTiles(R); orcTempo(R); orcDetalhe(R); orcAvisos(R); orcComp(R); orcTextos(R); orcPintarTexto();
}

/** Os dois boletos possíveis para a 1ª parcela do seguro. O `value` é a
 *  COMPETÊNCIA, não o número do boleto: é ela que vai para o contrato. */
function orcRadios(id, R, atual, sug, cb) {
  const el = document.getElementById(id);
  if (!el) return;
  const ops = [0, 1].map(k => ({ comp: orcISO(new Date(R.comp1.getFullYear(), R.comp1.getMonth() + k, 1)),
                                 venc: orcAddM(R.venc1, k) }));
  const atu = orcISO(atual), sgs = orcISO(sug);
  el.innerHTML = ops.map(o => `<label class="${o.comp === atu ? 'on' : ''}">
    <input type="radio" name="${htm(id)}" ${o.comp === atu ? 'checked' : ''} data-v="${o.comp}">
    ${htm(dataBr(orcISO(o.venc)))}${o.comp === sgs ? ' · sugerido' : ''}</label>`).join('');
  el.querySelectorAll('input').forEach(i => { i.onchange = () => cb(i.dataset.v); });
}

/** Põe o texto DENTRO de uma dica, no <span> âncora que o formulário
 *  deixou no rótulo. O rótulo é curto e a explicação fica a um passe de
 *  mouse — em vez de um parágrafo aberto embaixo do campo. */
function orcPorDica(id, texto, lado) {
  const el = document.getElementById(id);
  if (el) el.outerHTML = `<span id="${htm(id)}">${orcDica(texto, lado)}</span>`;
}

function orcNota(id, nome, inicio, corte, R, sug, escolhida) {
  if (!document.getElementById(id)) return;
  if (!corte) {
    orcPorDica(id, '<b>Esta seguradora ainda não tem dia de corte cadastrado.</b> '
      + 'Cadastre em ⚙ → Seguradoras e o mês passa a sair sozinho — até lá, escolha aqui.'
      + '<span class="conta">O dia de corte decide se a seguradora ainda fatura neste mês '
      + 'ou só no mês que vem.</span>');
    return;
  }
  const d = orcD(inicio), depois = d.getDate() > Number(corte);
  const iSug = orcDifM(sug, R.comp1);
  orcPorDica(id, `Corte no dia <b>${htm(String(corte).padStart(2, '0'))}</b> · contrato começa em
    <b>${htm(dataBr(String(inicio).slice(0, 10)))}</b> → <b>${depois ? 'depois do corte' : 'até o corte'}</b>,
    a seguradora fatura ${depois ? 'só no mês seguinte' : 'ainda neste mês'}, então ${htm(nome)} entra no
    <b>boleto de ${htm(dataBr(orcISO(orcAddM(R.venc1, iSug))))}</b>.`
    + (orcISO(escolhida) !== orcISO(sug)
        ? `<span class="conta">${icone('aviso', 11)} Você trocou à mão.</span>` : ''));
}

function orcTiles(R) {
  const b1 = R.boletos[0], b2 = R.boletos[1];
  const iguais = R.recorrente ? R.boletos.indexOf(R.recorrente) - 1 : 0;
  document.getElementById('orc-tiles').innerHTML = `<div class="orc-tiles">
    <div class="orc-tile chaves"><span class="r">${icone('chave', 13)} Para pegar as chaves</span>
      <span class="v">${moeda(R.totalChaves)}</span><span class="s">na assinatura do contrato</span></div>
    <div class="orc-tile"><span class="r">1º boleto · ${htm(dataBr(orcISO(b1.venc)))}</span>
      <span class="v">${moeda(b1.total)}</span>
      <span class="s">${R.proporcional ? R.dias + ' dias proporcionais' : 'aluguel cheio + ' + R.extra + ' dias'}</span></div>
    <div class="orc-tile"><span class="r">A partir de ${htm(dataBr(orcISO(b2.venc)))}</span>
      <span class="v">${moeda(b2.total)}</span>
      <span class="s">${iguais > 0 ? 'por ' + iguais + ' meses' : 'cobrança cheia'}</span></div></div>`;
}

function orcTempo(R) {
  const b = R.boletos, ps = [];
  // v1.396 — o ícone vai num campo próprio (`ic`), fora do `q`. O `q` é
  // escapado por htm() lá embaixo; quando o desenho vinha grudado no rótulo,
  // o SVG aparecia como texto na linha do tempo.
  if (R.chaves.length) ps.push({ cls: 'chaves', ic: icone('chave', 12), q: 'chaves', d: 'na assinatura', t: R.totalChaves, itens: R.chaves });
  ps.push({ cls: 'forte', q: '1º boleto', d: dataBr(orcISO(b[0].venc)), t: b[0].total, itens: b[0].itens });
  ps.push({ cls: 'forte', q: '2º boleto', d: dataBr(orcISO(b[1].venc)), t: b[1].total, itens: b[1].itens });
  const iRec = R.recorrente ? b.indexOf(R.recorrente) : b.length;
  if (iRec > 2) ps.push({ cls: '', q: 'e segue igual', d: 'até ' + dataBr(orcISO(b[iRec - 1].venc)),
    t: b[1].total, itens: [[`mais ${iRec - 2} boleto${iRec - 2 > 1 ? 's' : ''} igua${iRec - 2 > 1 ? 'is' : 'l'}`, null]] });
  if (R.recorrente) ps.push({ cls: 'fim', ic: icone('queda', 12), q: 'a cobrança cai', d: dataBr(orcISO(R.recorrente.venc)),
    t: R.recorrente.total, itens: [['o Seguro Incêndio acabou', null]] });
  document.getElementById('orc-tempo').innerHTML = ps.map(p => `<div class="orc-parada ${p.cls}">
    <span class="bola"></span><div class="q">${p.ic ? p.ic + ' ' : ''}${htm(p.q)}</div><div class="d">${htm(p.d)}</div>
    <div class="t">${moeda(p.t)}</div>
    <ul>${p.itens.map(i => i[1] != null
      ? `<li><span>${orcNomeCurto(i[0])}</span><b>${moeda(i[1])}</b></li>`
      : `<li class="solto">${htm(i[0])}</li>`).join('')}</ul></div>`).join('');
}

function orcDetalhe(R) {
  const L = [];
  if (R.chaves.length) L.push({ chaves: true, quando: 'Para retirar as chaves',
    sub: 'na assinatura do contrato', itens: R.chaves, total: R.totalChaves });
  L.push({ quando: 'Vencimento em ' + dataBr(orcISO(R.boletos[0].venc)), sub: '1º boleto',
    itens: R.boletos[0].itens, total: R.boletos[0].total });
  L.push({ quando: 'Vencimento em ' + dataBr(orcISO(R.boletos[1].venc)), sub: '2º boleto',
    itens: R.boletos[1].itens, total: R.boletos[1].total });
  const iRec = R.recorrente ? R.boletos.indexOf(R.recorrente) : R.boletos.length;
  if (iRec > 2) L.push({ repete: true, total: R.boletos[1].total,
    texto: `De <b>${htm(dataBr(orcISO(R.boletos[2].venc)))}</b> a `
         + `<b>${htm(dataBr(orcISO(R.boletos[iRec - 1].venc)))}</b> — ${iRec - 2} boleto`
         + `${iRec - 2 > 1 ? 's iguais' : ' igual'} ao de cima` });
  if (R.recorrente) L.push({ repete: true, fim: true, total: R.recorrente.total,
    texto: `A partir de <b>${htm(dataBr(orcISO(R.recorrente.venc)))}</b> — o Seguro Incêndio acaba e a cobrança cai` });
  document.getElementById('orc-saida').innerHTML = L.map(l => l.repete
    ? `<div class="orc-repete"><div>${l.fim ? icone('queda', 12) + ' ' : ''}${l.texto}</div><div class="v">${moeda(l.total)}</div></div>`
    : `<div class="orc-parcela ${l.chaves ? 'chaves' : ''}">
        <div><div class="quando">${htm(l.quando)}<span class="sub">${htm(l.sub)}</span></div>
        <ul class="itens">${l.itens.map(i => `<li><span>${htm(i[0])}</span><span>${moeda(i[1])}</span></li>`).join('')}</ul></div>
        <div class="total"><span class="r">total</span>${moeda(l.total)}</div></div>`).join('');
}

function orcAvisos(R) {
  const c = R.c, av = [];
  if (!c.valor_aluguel) av.push(['grave', 'Sem valor de aluguel — o orçamento não fecha.']);
  if (R.proporcional && orcCent(c.valor_aluguel / 30 * R.dias) > c.valor_aluguel)
    av.push(['grave', `O 1º boleto ficou <b>maior que um aluguel cheio</b> (${R.dias} dias). Confira o início.`]);
  if (!R.chaves.length) av.push(['', 'Nada a pagar na retirada das chaves. Confira se é isso mesmo.']);
  if (!c.fianca_nas_chaves && c.fianca_valor)
    av.push(['', 'A 1ª cobrança da fiança <b>não</b> está sendo cobrada na retirada das chaves.']);
  if (orcISO(R.compF) !== orcISO(R.sugF))
    av.push(['', 'A entrada da fiança foi <b>mudada à mão</b> — o corte sugeria o outro boleto.']);
  if (!c.incendio_avista && orcISO(R.compI) !== orcISO(R.sugI))
    av.push(['', 'A entrada do incêndio foi <b>mudada à mão</b> — o corte sugeria o outro boleto.']);
  if (!registro.telefone) av.push(['', 'O lead não tem telefone — só dá para copiar o texto.']);
  document.getElementById('orc-avisos').innerHTML = av.map(a =>
    `<div class="orc-aviso ${a[0]}">${a[0] === 'grave' ? icone('proibido', 12) : icone('aviso', 12)} ${a[1]}</div>`).join('');
}

// ---------- comparador ----------
function orcAlternarComp() {
  orcComparando = !orcComparando;
  /* v1.398 — O COMPARADOR AGORA MORA NUM CARTÃO QUE NASCE RECOLHIDO,
   * e o botão "Comparar" fica no cabeçalho, visível mesmo fechado.
   * Sem isto, clicar nele montaria a tabela atrás da seta e pareceria
   * que o botão não fez nada — o mesmo tipo de defeito do "+ Novo" na
   * v1.396. Abrir pela PRÓPRIA seta, e não mexendo na classe à mão,
   * mantém coerentes o estado, a memória do navegador e o
   * aria-expanded; trocar só a classe deixaria a seta apontando para
   * o lado errado. */
  const corpo = document.getElementById('orc-comp-corpo');
  const cartao = corpo && corpo.closest('.cartao');
  if (orcComparando && cartao && cartao.classList.contains('fechado')) {
    const seta = cartao.querySelector('.seta-card');
    if (seta) seta.click();
  }
  orcRecalcular();
}

function orcComp(RA) {
  const btn = document.getElementById('orc-btn-comp');
  if (btn) btn.textContent = orcComparando ? 'Fechar' : 'Comparar';
  const alvo = document.getElementById('orc-comp-corpo');
  const campoB = document.getElementById('orc-inicio-b');
  if (campoB && !campoB.value) {
    // sugestão: o 1º do mês seguinte ao início — a alternativa que o
    // lead sempre propõe ("e se eu entrar no dia 1º?")
    const d = orcAddM(orcMes1(RA.inicio), 1);
    campoB.value = orcISO(d);
  }
  // NÃO mexer em `.fechado` aqui: essa classe passou a ser da seta de
  // recolher do cartão (v1.398). Quem não está comparando só não tem
  // tabela — quem recolhe é a seta.
  if (!orcComparando) {
    alvo.innerHTML = '<div class="orc-comp-vazio">Escolha a outra data aí em cima e clique em '
      + '<b>Comparar</b>: a tabela mostra os dois cenários lado a lado, com a diferença até o '
      + '1º boleto.</div>';
    return;
  }
  const RB = orcCalcular(orcLer(campoB.value));
  const linha = (rot, sub, a, b) => {
    const dif = orcCent(b - a);
    return `<tr><td>${rot}<small>${htm(sub)}</small></td><td>${moeda(a)}</td><td>${moeda(b)}</td>
      <td class="dif ${dif > 0 ? 'mais' : (dif < 0 ? 'menos' : '')}">${dif === 0 ? '—'
        : (dif > 0 ? '+ ' : '− ') + moeda(Math.abs(dif))}</td></tr>`;
  };
  const somaA = orcCent(RA.totalChaves + RA.boletos[0].total);
  const somaB = orcCent(RB.totalChaves + RB.boletos[0].total);
  alvo.innerHTML = `<table>
    <thead><tr><th>Momento</th>
      <th class="${somaA <= somaB ? 'ganha' : ''}">Começando ${htm(dataBr(orcISO(RA.inicio)))}</th>
      <th class="${somaB < somaA ? 'ganha' : ''}">Começando ${htm(dataBr(orcISO(RB.inicio)))}</th>
      <th>diferença</th></tr></thead><tbody>
      ${linha(icone('chave', 12) + ' Para pegar as chaves', 'na assinatura', RA.totalChaves, RB.totalChaves)}
      ${linha('1º boleto', `${dataBr(orcISO(RA.boletos[0].venc))} × ${dataBr(orcISO(RB.boletos[0].venc))}`
        + ` · ${RA.dias} × ${RB.dias} dias`, RA.boletos[0].total, RB.boletos[0].total)}
      ${linha('2º boleto', `${dataBr(orcISO(RA.boletos[1].venc))} × ${dataBr(orcISO(RB.boletos[1].venc))}`,
        RA.boletos[1].total, RB.boletos[1].total)}
      ${linha('<b>Total até o 1º boleto</b>', 'o que sai do bolso dele agora', somaA, somaB)}
    </tbody></table>
    <div class="orc-comp-pe">${somaA === somaB ? 'Os dois cenários custam o mesmo agora.'
      : `Começando <b>${htm(dataBr(orcISO((somaB < somaA ? RB : RA).inicio)))}</b> ele paga
         <b>${moeda(Math.abs(somaB - somaA))} a menos</b> até o 1º boleto.`}
      <button class="btn btn-claro" onclick="orcUsarB()">Usar esta data</button></div>`;
}

function orcUsarB() {
  const b = document.getElementById('orc-inicio-b');
  const a = document.getElementById('orc-inicio');
  if (!b || !a || !b.value) return;
  a.value = b.value;
  orcAtual.fianca_competencia = null; orcAtual.incendio_competencia = null;
  orcComparando = false;
  orcRecalcular();
}

// ---------- os dois textos ----------
let ORC_TXT = { longa: '', curta: '' };

function orcTextos(R) {
  const c = R.c, b1 = R.boletos[0], b2 = R.boletos[1];
  const semParcela = s => String(s).replace(/^(.*) — parcela \d+ de \d+$/, '$1');
  const L = [];
  L.push('Olá! Para facilitar o entendimento dos valores da locação, seguem os pagamentos:');
  L.push('');
  if (R.chaves.length) {
    L.push(`*Para retirada das chaves:* ${moeda(R.totalChaves)}`);
    R.chaves.forEach(i => L.push(`• ${orcParcelaCurta(i[0])}: ${moeda(i[1])}`));
    L.push('');
  }
  L.push(`O contrato terá início em *${orcDiaMes(R.inicio)}* e o aluguel vence todo dia `
    + `*${String(c.dia_vencimento).padStart(2, '0')}*.`);
  L.push('');
  if (R.proporcional) {
    L.push(`*No dia ${orcDiaMes(b1.venc)}*, será pago o primeiro aluguel de forma proporcional `
      + `ao período de *${orcDiaMes(R.inicio)} a ${orcDiaMes(new Date(R.venc1 - 86400000))}* `
      + `(${R.dias} dias), no valor de *${moeda(orcCent(c.valor_aluguel / 30 * R.dias))}*`
      + (b1.itens.length > 1 ? ', mais ' + b1.itens.slice(1).map(i =>
          (String(i[0]).startsWith('Seguro-Fiança') ? 'a cobrança do Seguro-Fiança' : semParcela(i[0]))
          + ' de ' + moeda(i[1])).join(' e ') : '')
      + `, totalizando *${moeda(b1.total)}*.`);
  } else {
    L.push(`*No dia ${orcDiaMes(b1.venc)}* vence o primeiro boleto, de *${moeda(b1.total)}* `
      + `(o aluguel integral já com os ${R.extra} dias somados).`);
  }
  L.push('');
  L.push(`*A partir do vencimento de ${orcDiaMes(b2.venc)}*, os pagamentos serão compostos por:`);
  b2.itens.forEach(i => {
    const m = String(i[0]).match(/^(.*) — parcela \d+ de (\d+)$/);
    L.push(m ? `• ${m[1]}: ${moeda(i[1])} por parcela, em ${m[2]} parcelas` : `• ${i[0]}: ${moeda(i[1])}`);
  });
  L.push('');
  L.push(`*Total do vencimento de ${orcDiaMes(b2.venc)}: ${moeda(b2.total)}.*`);
  if (R.recorrente) {
    L.push('');
    L.push(`Quando o Seguro Incêndio terminar, a partir de *${dataBr(orcISO(R.recorrente.venc))}* `
      + `o valor passa a ser *${moeda(R.recorrente.total)}*.`);
  }
  L.push(''); L.push('*Como você paga*');
  L.push('• ' + c.forma_pagamento);
  L.push('• O boleto chega por ' + c.canal_boleto);
  const contas = ORC_CONTAS.filter(n => (c.contas || {})[n] && c.contas[n] !== 'Não tem')
    .map(n => `${n}: ${String(c.contas[n]).toLowerCase()}`);
  if (contas.length) L.push('• Contas do imóvel — ' + contas.join(' · '));
  if (c.o_que_levar) L.push('• Na assinatura: ' + c.o_que_levar.toLowerCase());
  // O MESMO AVISO DA PROPOSTA, em uma linha. O texto do WhatsApp é o
  // que mais circula — deixar a ressalva só no PDF seria protegê-la no
  // documento que ninguém abre.
  L.push('');
  L.push('_Estes valores são uma simulação (orçamento). A locação só é válida após a '
    + 'assinatura do contrato entre as partes._');
  L.push(''); L.push('Qualquer dúvida, é só chamar. 😊');
  ORC_TXT.longa = L.join('\n');

  const imv = (relacionados || [])[0];
  const S = [];
  S.push('Olá! Resumo dos valores da locação'
    + (imv && imv.endereco ? ' — ' + imv.endereco : '') + ':');
  S.push('');
  if (R.chaves.length) S.push(`🔑 *Para pegar as chaves:* ${moeda(R.totalChaves)}`);
  S.push(`📄 *1º boleto (${orcDiaMes(b1.venc)}):* ${moeda(b1.total)}`
    + (R.proporcional ? `  _(${R.dias} dias proporcionais)_` : ''));
  S.push(`📅 *A partir de ${orcDiaMes(b2.venc)}:* ${moeda(b2.total)} por mês`);
  if (R.recorrente) S.push(`📉 *Depois do incêndio (${dataBr(orcISO(R.recorrente.venc))}):* `
    + moeda(R.recorrente.total));
  S.push('');
  S.push('_Simulação de valores. A locação só é válida após a assinatura do contrato._');
  S.push(''); S.push('Mando o detalhe de tudo se quiser. 😊');
  ORC_TXT.curta = S.join('\n');
}

function orcTrocarTexto(qual) { orcTextoAtivo = qual; orcPintarTexto(); }

function orcPintarTexto() {
  const pre = document.getElementById('orc-msg');
  if (pre) pre.textContent = ORC_TXT[orcTextoAtivo];
  ['longa', 'curta'].forEach(k => {
    const b = document.getElementById('orc-ab-' + k);
    if (b) b.className = orcTextoAtivo === k ? 'on' : '';
  });
  // o link do WhatsApp é montado aqui (e não no HTML) para o texto não
  // passar por dentro de um atributo — urlSegura + encodeURIComponent
  const zap = document.getElementById('orc-btn-zap');
  const dig = String(registro.telefone || '').replace(/\D/g, '');
  if (zap) {
    zap.disabled = !dig;
    zap.onclick = () => window.open('https://wa.me/55' + dig + '?text='
      + encodeURIComponent(ORC_TXT[orcTextoAtivo]), '_blank', 'noopener');
  }
  const env = document.getElementById('orc-enviada');
  if (env) env.innerHTML = (orcAtual && orcAtual.enviada_em)
    ? `<div class="orc-enviada">${icone('enviar', 12)} Enviada por WhatsApp em ${
        htm(dataBr(String(orcAtual.enviada_em).slice(0, 10)))}</div>` : '';
}

function orcCopiar() { copiar(ORC_TXT[orcTextoAtivo], 'Mensagem copiada. É só colar no WhatsApp.'); }

// ---------- versões ----------
/** v1.396 — sem nenhum orçamento salvo a tela já ABRE num rascunho novo, e o
 *  botão recriava esse mesmo rascunho: a tela redesenhava idêntica e o clique
 *  parecia não funcionar. Agora, em cima de um rascunho, ele pergunta antes —
 *  o clique tem resposta, e quem já tinha preenchido os campos não perde o que
 *  digitou sem saber. */
function orcNovo() {
  if (orcAtual && !orcAtual.id &&
      !confirm('Este orçamento ainda não foi salvo.\n\n' +
               'Recomeçar do zero apaga o que está preenchido aqui e volta aos ' +
               'valores sugeridos. Recomeçar?')) return;
  const aprovada = (simulacoes || []).find(s => s.status_fianca === 'Aprovado');
  orcAtual = orcNovoRascunho(aprovada);
  desenharFicha();
}

/** Abre o formulário sem fiança aprovada — os números do seguro entram à mão.
 *  Não pergunta nada: aqui ainda não existe rascunho preenchido para perder. */
function orcMontarAssimMesmo() {
  orcSemFianca = true;
  orcAtual = orcNovoRascunho(null);
  desenharFicha();
}

function orcTrocarVersao(id) {
  const o = orcamentosLead.find(x => String(x.id) === String(id));
  orcAtual = o ? { ...o } : orcNovoRascunho();
  desenharFicha();
}

/**
 * Salva uma VERSÃO — nunca sobrescreve a anterior. Três dias depois o
 * lead pergunta um número e é preciso saber qual foi o mandado; por isso
 * a mensagem também é gravada, exatamente como saiu da tela.
 */
async function orcSalvar() {
  const c = orcLer();
  const R = orcCalcular(c);
  orcTextos(R);
  // A VERSÃO É NUMERADA PELO BANCO (gatilho lead_orcamentos_carimbo).
  // Contar aqui daria a mesma versão para duas abas abertas ao mesmo
  // tempo, e a unique (lead_id, versao) recusaria a segunda com um erro
  // de banco na cara de quem só queria salvar.
  const linha = {
    lead_id: ID, empresa_id: registro.empresa_id,
    simulacao_id: (orcAtual && orcAtual.simulacao_id) || null,
    inicio: c.inicio, dia_vencimento: c.dia_vencimento, dias_minimos: c.dias_minimos,
    valor_aluguel: c.valor_aluguel, meses_contrato: c.meses_contrato,
    fianca_valor: c.fianca_valor, fianca_setup: c.fianca_setup,
    fianca_corte: c.fianca_corte, fianca_nas_chaves: c.fianca_nas_chaves,
    fianca_competencia: orcISO(R.compF),
    incendio_valor: c.incendio_valor, incendio_parcelas: c.incendio_parcelas,
    incendio_corte: c.incendio_corte, incendio_avista: c.incendio_avista,
    incendio_competencia: orcISO(R.compI),
    taxa_boleto: c.taxa_boleto, taxa_contrato_digital: c.taxa_contrato_digital,
    forma_pagamento: c.forma_pagamento, canal_boleto: c.canal_boleto,
    o_que_levar: c.o_que_levar, contas: c.contas,
    imovel_id: c.imovel_id || null,
    imovel_endereco: orcEnderecoDoImovel(),
    mensagem: ORC_TXT.longa, mensagem_curta: ORC_TXT.curta,
    total_chaves: R.totalChaves, total_b1: R.boletos[0].total, total_b2: R.boletos[1].total,
    // o detalhe como a tela mostrou — é ele que a proposta pública lê
    detalhe: orcDetalheJson(R)
  };
  const { data, error } = await sb.from('lead_orcamentos').insert(linha).select('*').single();
  if (error) { alert('Não consegui salvar: ' + error.message); return; }
  orcAtual = data;
  await orcRecarregar();
}

async function orcRecarregar() {
  const { data } = await sb.from('lead_orcamentos').select('*')
    .eq('lead_id', ID).order('versao', { ascending: false });
  orcamentosLead = data || [];
  if (orcAtual && orcAtual.id) {
    const o = orcamentosLead.find(x => x.id === orcAtual.id);
    if (o) orcAtual = { ...o };
  }
  desenharFicha();
}

// ---------- envio ----------
/**
 * v1.466 — SAI PELA FILA DA EVOLUTION, não mais pelo BotConversa.
 *
 * Aqui foi mais simples que na simulação: o texto do orçamento SEMPRE
 * foi montado pelo CRM (o proporcional, os seguros, o "como você
 * paga") e o BotConversa só repassava o campo `mensagem`. Nenhum texto
 * se perdeu com o cancelamento — só o cano. Então trocou-se o cano.
 *
 * Enviar continua exigindo a versão SALVA — é o texto gravado que vai,
 * não o que está na tela; assim o que o lead recebeu fica registrado.
 *
 * O que muda para quem usa: vale o horário protegido (8h–20h, sem
 * domingo), o carimbo recebe o momento em que a mensagem SAI (não o do
 * clique) e a mensagem passa a aparecer na Conversa do lead.
 */
function orcPedirEnvio() {
  const strip = document.getElementById('orc-strip');
  if (!orcAtual || !orcAtual.id) {
    strip.innerHTML = `<div class="orc-strip">Salve a versão antes de enviar — é o texto
      gravado que vai para o lead. <button class="btn" onclick="orcSalvar()">${icone('salvar', 13)} Salvar e voltar</button>
      <button class="btn btn-claro" onclick="orcFecharStrip()">Fechar</button></div>`;
    return;
  }
  if (!registro.telefone) {
    strip.innerHTML = `<div class="orc-strip">Este lead não tem telefone — dá para copiar o texto,
      mas não para enviar daqui. <button class="btn btn-claro" onclick="orcFecharStrip()">Fechar</button></div>`;
    return;
  }
  strip.innerHTML = `<div class="orc-strip">
    Enviar a mensagem <b>${orcTextoAtivo === 'longa' ? 'completa' : 'curta'}</b> para
    <b>${htm(mascaraTelefone(registro.telefone))}</b> (${htm(registro.nome || '')})?
    Vai o texto <b>salvo</b>, pelo WhatsApp da Moralí.
    <button class="btn" onclick="orcConfirmarEnvio()">Enviar agora</button>
    <button class="btn btn-claro" onclick="orcFecharStrip()">Cancelar</button></div>`;
}

function orcFecharStrip() {
  const s = document.getElementById('orc-strip');
  if (s) s.innerHTML = '';
}

async function orcConfirmarEnvio() {
  const strip = document.getElementById('orc-strip');
  strip.innerHTML = '<div class="orc-strip">Enviando…</div>';
  try {
    // uma chamada só: a RPC confere as travas de sempre e põe na fila
    const { data, error } = await sb.rpc('orcamento_enviar_pela_fila',
      { p_orcamento_id: orcAtual.id, p_curta: orcTextoAtivo === 'curta' });
    if (error) throw new Error(error.message);

    orcFecharStrip();
    await orcRecarregar();

    if (data && data.ajustada) {
      // não dá para deixar isso só no carimbo: quem clicou às 22h
      // precisa saber que a mensagem NÃO saiu agora
      alerta('O horário caía fora da janela permitida (8h–20h, sem domingo), então o '
           + 'orçamento foi agendado para ' + dataHoraBr(data.enviar_em) + '. '
           + 'Ele fica na fila, em Administração → Mensagens.');
    } else {
      // o cutucão: o mesmo disparador do cron, sem esperar o relógio.
      // Se falhar, nada se perde — o cron pega em até 5 minutos.
      try { await sb.rpc('mensagem_disparar_agora', { p_id: data.id }); } catch (e) { /* o cron cobre */ }
      alerta('Enviado! O orçamento sai pelo WhatsApp da Moralí em instantes.');
    }
  } catch (e) {
    strip.innerHTML = `<div class="orc-strip"><span style="color:var(--erro)">${htm(e.message)}</span>
      <button class="btn btn-claro" onclick="orcFecharStrip()">Fechar</button></div>`;
  }
}

/**
 * A PROPOSTA COM A MARCA.
 *
 * Uma página inteira, montada aqui e aberta numa aba nova, com o botão
 * de imprimir do navegador (que salva em PDF). NÃO é um link público:
 * link público precisa de token, página no servidor e uma auditoria de
 * segurança própria — e o que ele pediu foi "algo profissional para
 * mandar", que o PDF resolve hoje. O link fica para quando ele quiser.
 *
 * Tudo o que vem do cadastro passa por htm(): a proposta é HTML montado
 * com nome de pessoa, endereço e texto digitado — o mesmo cuidado do
 * resto da ficha.
 *
 * Multa e juros NÃO entram aqui (decisão dele em 21/08/2026): a
 * proposta diz quanto e como se paga; condição contratual é assunto do
 * contrato.
 */
function orcAbrirProposta() {
  const R = orcCalcular(orcLer());
  const emp = (typeof PERM !== 'undefined' && PERM && PERM.empresa) ? PERM.empresa : {};
  const nomeEmp = emp.nome_fantasia || emp.razao_social || 'Moralí';
  // v1.336 — o logotipo cadastrado, o mesmo do cabeçalho do CRM. O
  // `urlImagem` monta o endereço público do balde `logos`; sem
  // logotipo, sai o nome escrito, como sempre saiu.
  const urlLogo = (typeof urlImagem === 'function') ? urlImagem('logos', emp.logo_path) : null;
  const rodape = [emp.razao_social, emp.cnpj ? 'CNPJ ' + emp.cnpj : null,
                  emp.creci ? 'CRECI ' + emp.creci : null].filter(Boolean).join(' · ');
  const imv = (relacionados || [])[0];
  const endereco = imv ? (imv.endereco || imv.imovel_endereco || '') : '';
  const b1 = R.boletos[0], b2 = R.boletos[1];
  const iRec = R.recorrente ? R.boletos.indexOf(R.recorrente) : R.boletos.length;

  // v1.337 — o mesmo passo numerado da página pública. O PDF e o link
  // são o MESMO documento: o lead não pode receber dois desenhos.
  const passo = (n, quando, sub, total, itens, chave) => `
    <div class="passo ${chave ? 'chave' : ''}">
      <div class="n">${n}</div>
      <div class="txt">
        <div class="quando">${htm(quando)}</div>
        <div class="valor">${moeda(total)}</div>
        ${sub ? `<div class="sub">${htm(sub)}</div>` : ''}
        <ul>${itens.map(i => `<li><span>${htm(i[0])}</span><span>${moeda(i[1])}</span></li>`).join('')}</ul>
      </div></div>`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Proposta de locação — ${htm(registro.nome || '')}</title>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--azul:#023047;--verde:#7BBC62;--verde-escuro:#4E8F3C;--fundo:#F3F3F2;
  --borda:#E4E4E2;--texto:#16232B;--texto-suave:#5B6870;--num:#032D60}
*{box-sizing:border-box}
body{margin:0;font-family:'Outfit',-apple-system,Segoe UI,sans-serif;background:var(--fundo);
  color:var(--texto);-webkit-font-smoothing:antialiased}
.folha{max-width:760px;margin:0 auto;background:#fff;min-height:100vh;box-shadow:0 1px 3px rgba(0,0,0,.06)}
.capa{background:var(--azul);color:#fff;padding:26px 34px 24px;position:relative;overflow:hidden}
.capa::after{content:'';position:absolute;right:-60px;bottom:-90px;width:230px;height:230px;
  border-radius:50%;background:rgba(123,188,98,.14)}
.capa .marca{font-size:19px;font-weight:700;letter-spacing:.5px;margin-bottom:22px}
.capa .marca img{display:block;height:38px;max-width:200px;object-fit:contain;
  background:#fff;border-radius:8px;padding:5px 9px;box-sizing:content-box}
.capa .rot{font-size:11px;text-transform:uppercase;letter-spacing:1.2px;opacity:.7;font-weight:600}
.capa h1{margin:5px 0 3px;font-size:26px;font-weight:700;line-height:1.2;position:relative;z-index:1}
.capa .end{font-size:14px;opacity:.85;position:relative;z-index:1}
.capa .para{margin-top:18px;font-size:13px;opacity:.9;border-top:1px solid rgba(255,255,255,.18);
  padding-top:13px;display:flex;gap:26px;flex-wrap:wrap;position:relative;z-index:1}
.capa .para b{display:block;font-size:10.5px;text-transform:uppercase;letter-spacing:.7px;opacity:.6;font-weight:600}
.corpo{padding:28px 34px 8px}
h2{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:var(--texto-suave);
  margin:32px 0 13px;font-weight:700;display:flex;align-items:center;gap:9px}
h2::after{content:'';flex:1;height:1px;background:var(--borda)}
h2:first-child{margin-top:0}
@media(max-width:600px){.resumo{grid-template-columns:1fr}}
.passo{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--borda);
  border-radius:12px;margin-bottom:10px;padding:14px 16px;background:#fff}
.passo.chave{border-color:#CFE3D6;background:#F7FBF6}
.passo .n{width:30px;height:30px;border-radius:50%;background:var(--azul);color:#fff;
  font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.passo.chave .n{background:var(--verde-escuro)}
.passo .txt{min-width:0;flex:1}
.passo .quando{font-size:16px;font-weight:700;color:var(--azul);line-height:1.3}
.passo .valor{font-size:26px;font-weight:600;color:var(--num);letter-spacing:-.5px;
  font-variant-numeric:tabular-nums;line-height:1.2;margin-top:2px}
.passo.chave .valor{color:var(--verde-escuro)}
.passo .sub{font-size:12.5px;color:var(--texto-suave);margin-top:1px}
.passo ul{margin:8px 0 0;padding:0;list-style:none}
.passo li{display:flex;justify-content:space-between;gap:14px;font-size:13.5px;
  padding:3px 0;color:var(--texto-suave)}
.passo li span:last-child{font-variant-numeric:tabular-nums;font-weight:600;color:var(--texto)}
.miudo{font-size:11.5px;color:var(--texto-suave);line-height:1.6;margin-top:20px;
  border-top:1px solid var(--borda);padding-top:14px}
.legal{background:#FFF8EC;border-top:1px solid #F2E2C4;color:#6b4e12;
  padding:14px 34px;font-size:12.5px;line-height:1.65}
.legal b{color:#4a3608}
footer{background:var(--azul);color:rgba(255,255,255,.8);padding:16px 34px;font-size:11.5px;
  line-height:1.6;margin-top:24px}
.imprimir{position:fixed;right:16px;bottom:16px;background:var(--azul);color:#fff;border:0;
  font-family:inherit;font-size:13px;font-weight:600;padding:10px 16px;border-radius:9px;cursor:pointer}
.para .destaque .val{display:block;font-size:21px;font-weight:700;color:#7BBC62;
  line-height:1.15;margin-top:1px;letter-spacing:-.3px;font-variant-numeric:tabular-nums}
/* v1.397 — O PDF SAIA DIFERENTE DO LINK, e a causa nao era o desenho:
   ao "Salvar como PDF" o Chrome vem com "Graficos de plano de fundo"
   DESMARCADO, e nesse modo descarta todo fundo colorido mas mantem a
   cor da letra. A capa e o rodape sao letra branca sobre azul: o azul
   sumia e sobrava branco no branco. O print-color-adjust exact obriga
   o navegador a imprimir as cores como estao na tela. */
@media print{
  *,*::before,*::after{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
  @page{size:A4;margin:10mm}
  html,body{background:#fff !important}
  .folha{box-shadow:none;max-width:none;min-height:0;margin:0}
  .imprimir{display:none !important}
  .capa,.passo,.legal,footer{break-inside:avoid;page-break-inside:avoid}
  h2{break-after:avoid;page-break-after:avoid}
  footer{margin-top:18px}
}
</style></head><body><div class="folha">
  <div class="capa">
    <div class="marca">${urlLogo
      ? `<img src="${htm(urlLogo)}" alt="${htm(nomeEmp)}">` : htm(nomeEmp)}</div>
    <div class="rot">Proposta de locação${orcAtual && orcAtual.versao ? ' · versão ' + htm(String(orcAtual.versao)) : ''}</div>
    <h1>Os valores da sua locação</h1>
    <div class="end">${htm(endereco)}</div>
    <div class="para">
      <div><b>Para</b>${htm(registro.nome || '')}</div>
      <div class="destaque"><b>Valor do aluguel</b><span class="val">${moeda(R.c.valor_aluguel)}</span></div>
      <div><b>Início do contrato</b>${htm(dataBr(orcISO(R.inicio)))}</div>
      <div><b>Vence todo dia</b>${htm(String(R.c.dia_vencimento).padStart(2, '0'))}</div>
    </div>
  </div>
  <div class="corpo">
    <h2>O que você vai pagar</h2>
    ${R.chaves.length ? passo(1, 'Para pegar as chaves', 'no dia da assinatura',
        R.totalChaves, R.chaves, true) : ''}
    ${passo(R.chaves.length ? 2 : 1, 'Dia ' + dataBr(orcISO(b1.venc)),
        R.proporcional ? 'o aluguel é só de ' + R.dias + ' dias' : '',
        b1.total, b1.itens, false)}
    ${passo(R.chaves.length ? 3 : 2,
        'Todo dia ' + String(R.c.dia_vencimento).padStart(2, '0')
          + ', a partir de ' + dataBr(orcISO(b2.venc)),
        '', b2.total, b2.itens, false)}

    <div class="miudo">
      Os valores do Seguro-Fiança e do Seguro Incêndio são os da apólice aprovada em seu nome e
      podem ser revistos pela seguradora até a emissão. O aluguel do primeiro mês é proporcional
      aos dias entre o início do contrato e o primeiro vencimento, calculado por dia
      (aluguel ÷ 30).
    </div>
  </div>
  <div class="legal">
    <b>Este documento é uma simulação de valores (orçamento) e não vale como contrato.</b>
    A locação só se torna válida após a assinatura do contrato de locação entre as partes.
    Os valores aqui apresentados podem ser alterados até a assinatura, inclusive por
    revisão da seguradora.
  </div>
  <footer>${htm(rodape)}</footer>
</div>
<button class="imprimir" onclick="window.print()">${icone('impressora', 13)} Salvar em PDF</button>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) { alert('O navegador bloqueou a aba nova. Libere as janelas para o CRM e tente de novo.'); return; }
  w.document.write(html);
  w.document.close();
}

// ---------- o link público da proposta ----------
/**
 * O LINK PÚBLICO (v1.333). O lead abre no celular, sem login, e vê a
 * proposta com a marca. Quem responde é a `proposta_publica` no banco,
 * pelo token — esta tela nunca manda id de nada para fora.
 *
 * O link NÃO nasce com a proposta: só existe depois de clicar em
 * "Gerar". Vence em 30 dias por padrão, e o botão Revogar mata o
 * endereço na hora. As três travas moram no banco, não aqui.
 */
/**
 * QUAL IMÓVEL É O DESTE ORÇAMENTO (v1.397).
 *
 * Estava errado desde o começo: pegava `relacionados[0].endereco` ou
 * `.imovel_endereco`, e `lead_imoveis` NÃO TEM nenhuma das duas — ela
 * guarda `imovel_id` (quando é da carteira) ou `endereco_texto` /
 * `referencia_externa` (quando é anúncio de terceiro). O endereço do
 * imóvel da carteira mora em `listaImoveis`, que o carregarNomesUsados
 * (v1.238) já traz justamente por causa dos interesses do lead.
 * Resultado do engano: lead COM imóvel ligado via o campo em branco, e
 * a proposta saía sem endereço nenhum. É a mesma leitura que o cartão
 * "Imóveis de interesse" já fazia certo.
 *
 * E a escolha deixou de ser "o primeiro que entrou na lista": o robô
 * sugere vários, e o mais antigo costuma ser justamente o descartado.
 * A ordem agora é o que o lead confirmou → o da carteira → o resto.
 */
function orcImovelDoLead() {
  // v1.398 — ESCOLHA À MÃO MANDA. Quem selecionou na lista quer aquele
  // imóvel; as regras abaixo só existem para adivinhar o primeiro.
  // `imovel_id === null` é escolha também ("— sem imóvel escolhido —"),
  // e por isso o teste é por `undefined`, não por falsidade.
  const escolha = (orcAtual || {}).imovel_id;
  if (escolha !== undefined && escolha !== '') {
    if (!escolha) return null;
    const i = (listaImoveis || []).find(x => x.id === escolha);
    return { id: escolha, texto: i ? orcTextoDoImovel(i) : '(imóvel fora da carteira)' };
  }

  const l = (relacionados || []).filter(i => i.situacao !== 'Descartou');
  const sim = (simulacoes || []).find(s => s.id === (orcAtual || {}).simulacao_id);
  const escolhido =
       (sim && sim.imovel_id && l.find(i => i.imovel_id === sim.imovel_id))
    || (sim && sim.imovel_id && { imovel_id: sim.imovel_id })
    || l.find(i => i.situacao === 'Gostou')
    || l.find(i => i.imovel_id)
    || l[0];
  if (!escolhido) return null;
  const daCarteira = (listaImoveis || []).find(x => x.id === escolhido.imovel_id);
  const texto = daCarteira
    ? orcTextoDoImovel(daCarteira)
    : (escolhido.endereco_texto
       || (escolhido.referencia_externa ? 'anúncio ' + escolhido.referencia_externa : null));
  return texto ? { id: escolhido.imovel_id || null, texto } : null;
}

/** O endereço como ele vai para a PROPOSTA: sem código e sem o valor,
 *  que são coisas de tela interna. O bairro fica — é ele que distingue
 *  dois endereços iguais em ruas homônimas. */
function orcTextoDoImovel(i) {
  return [i.endereco, i.bairro].filter(Boolean).join(' — ');
}

function orcEnderecoDoImovel() {
  const i = orcImovelDoLead();
  return i ? i.texto : null;
}

function orcUrlDaProposta(token) {
  return URL_RAIZ + 'proposta.html?p=' + encodeURIComponent(token);
}

/** O detalhe como a tela mostrou, para a proposta pública só escrever.
 *  Guardar a conta pronta é o que impede a página de dizer um número e
 *  o CRM outro. */
function orcDetalheJson(R) {
  const dia = d => orcISO(d);
  const iRec = R.recorrente ? R.boletos.indexOf(R.recorrente) : R.boletos.length;
  // v1.397 — o detalhe é o que o LEAD lê (proposta e PDF), então os
  // nomes vão na forma curta: "Seguro-Fiança (2/12)", não "— parcela 2
  // de 12". A proposta pública só imprime o que recebe; escrever aqui
  // evita que ela precise conhecer o formato.
  const nomes = l => (l || []).map(i => [orcParcelaCurta(i[0]), i[1]]);
  return {
    // v1.397 — o aluguel entra no detalhe para a CAPA da proposta poder
    // destacá-lo. Vai por aqui, e não por coluna nova, porque `detalhe`
    // já é o que a função proposta_publica entrega ao lead: assim o
    // link ganha o número sem depender de migração no banco.
    aluguel: R.c.valor_aluguel,
    dias: R.dias, proporcional: R.proporcional, extra: R.extra,
    chaves: nomes(R.chaves),
    b1: { venc: dia(R.boletos[0].venc), itens: nomes(R.boletos[0].itens), total: R.boletos[0].total },
    b2: { venc: dia(R.boletos[1].venc), itens: nomes(R.boletos[1].itens), total: R.boletos[1].total },
    ate: iRec > 2 ? dia(R.boletos[iRec - 1].venc) : null,
    meses_iguais: Math.max(0, iRec - 1),
    recorrente: R.recorrente ? { venc: dia(R.recorrente.venc), total: R.recorrente.total } : null
  };
}

function orcFaixaDoLink() {
  const o = orcAtual;
  if (!o || !o.token) return '';
  const url = orcUrlDaProposta(o.token);
  const visto = o.link_usos
    ? `${icone('olho', 11)} aberta ${o.link_usos} vez${o.link_usos > 1 ? 'es' : ''}`
      + (o.link_visto_em ? ` · última em ${htm(dataBr(String(o.link_visto_em).slice(0, 10)))}` : '')
    : 'ainda não foi aberta';
  return `<div class="orc-linkfaixa">
    <span class="url">${htm(url)}</span>
    <span class="obs">${visto}${o.link_expira_em ? ' · ' + orcPrazoDoLink(o.link_expira_em) : ''}</span>
    <button class="btn btn-claro" onclick="orcCopiarLink()">${icone('prancheta', 13)} Copiar link</button>
    <button class="btn btn-claro" data-perm="leads:editar" onclick="orcRevogarLink()">Revogar</button>
  </div>`;
}

/** "vence hoje às 18:42 · faltam 21h" — o prazo do link em horas, que é
 *  como ele foi pedido. Vencido, diz vencido: a faixa não pode dar a
 *  entender que o endereço ainda funciona. */
function orcPrazoDoLink(quando) {
  const d = new Date(quando);
  if (isNaN(d)) return '';
  const hhmm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const faltam = Math.floor((d - new Date()) / 3600000);
  if (faltam < 0) return icone('proibido', 12) + ' o link venceu em ' + dataBr(orcISO(d)) + ' às ' + hhmm;
  const hoje = orcISO(d) === orcISO(new Date());
  return 'vence ' + (hoje ? 'hoje' : 'em ' + dataBr(orcISO(d))) + ' às ' + hhmm
       + (faltam < 48 ? ` · falta${faltam === 1 ? '' : 'm'} ${faltam}h` : '');
}

function orcCopiarLink() {
  if (!orcAtual || !orcAtual.token) return;
  copiar(orcUrlDaProposta(orcAtual.token), 'Link copiado. Cole no WhatsApp.');
}

/** Gera (ou mostra) o link. Exige a versão SALVA: o link aponta para o
 *  que está gravado, não para o que está na tela. */
async function orcAbrirLink() {
  if (!orcAtual || !orcAtual.id) {
    alert('Salve a versão primeiro — o link aponta para o orçamento gravado.');
    return;
  }
  if (orcAtual.token) { orcCopiarLink(); return; }
  abrirAcao('Gerar o link público da proposta', [
    { n: 'horas', r: 'O link vale por quantas horas?', t: 'numero', v: 24 },
    { n: 'aviso', t: 'aviso', r: 'Quem tiver o endereço vê a proposta sem senha: o nome de quem '
      + 'vai receber, o endereço do imóvel e os valores. Não aparecem CPF, telefone nem e-mail. '
      + 'O link vence sozinho na hora marcada, e você pode revogá-lo antes disso a qualquer momento.' }
  ], async () => {
    const horas = valorAcao('horas') ? parseInt(valorAcao('horas'), 10) : 24;
    erroSe(!(horas >= 1 && horas <= 720), 'O prazo precisa estar entre 1 e 720 horas (30 dias).');
    const { data, error } = await sb.rpc('orcamento_gerar_link',
      { p_orcamento_id: orcAtual.id, p_horas: horas });
    if (error) throw new Error(error.message);
    orcAtual.token = data;
    await orcRecarregar();
    copiar(orcUrlDaProposta(data), 'Link gerado e copiado. Cole no WhatsApp.');
  }, 'Gerar e copiar');
}

async function orcRevogarLink() {
  if (!orcAtual || !orcAtual.id || !orcAtual.token) return;
  abrirAcao('Revogar o link da proposta', [
    { n: 'aviso', t: 'aviso', r: 'O endereço para de funcionar na hora. Quem já tiver o link '
      + 'passa a ver "proposta expirada". Dá para gerar um novo depois.' }
  ], async () => {
    const { error } = await sb.rpc('orcamento_revogar_link', { p_orcamento_id: orcAtual.id });
    if (error) throw new Error(error.message);
    orcAtual.token = null;
    await orcRecarregar();
  }, 'Revogar o link');
}

// ---------- o contrato ----------
/**
 * O ORÇAMENTO VIRA CONTRATO. Era aqui que os números eram digitados de
 * novo — e onde a tela e o contrato passavam a divergir. Agora o início,
 * o dia do vencimento, o aluguel e os DOIS itens de seguro (com a
 * competência que o corte mandou) nascem do que o lead recebeu.
 *
 * O que a janela ainda pergunta é o que o orçamento não sabe: qual
 * imóvel, o prazo e a taxa de administração.
 */
async function orcCriarContrato() {
  const c = orcLer();
  const R = orcCalcular(c);
  // v1.398 — o imóvel JÁ FOI ESCOLHIDO no cartão, e a janela não
  // pergunta de novo. Só quando o orçamento está sem imóvel é que ela
  // oferece os interesses do lead, como antes.
  //
  // v1.397 — só imóvel DA CARTEIRA entra aqui: o contrato guarda um
  // `imovel_id`, e o interesse que é anúncio de terceiro não tem um.
  // O rótulo vinha de `x.endereco`, coluna que lead_imoveis não tem —
  // a lista saía com "(imóvel)" repetido, impossível de escolher.
  const doOrcamento = c.imovel_id
    ? (listaImoveis || []).find(x => x.id === c.imovel_id) || { id: c.imovel_id }
    : null;
  const imvs = doOrcamento
    ? [{ imovel_id: doOrcamento.id }]
    : (relacionados || []).filter(x => x.imovel_id && x.situacao !== 'Descartou');
  const rotulo = x => {
    const i = (listaImoveis || []).find(y => y.id === x.imovel_id);
    return i ? [i.codigo, i.endereco, i.bairro].filter(Boolean).join(' · ')
             : (x.endereco_texto || x.referencia_externa || '(imóvel)');
  };

  abrirAcao('Criar o contrato com os números do orçamento', [
    { n: 'aviso', t: 'aviso', r: `Início ${dataBr(orcISO(R.inicio))} · vence dia `
      + `${String(c.dia_vencimento).padStart(2, '0')} · aluguel ${moeda(c.valor_aluguel)}. `
      + `O 1º boleto sai em ${dataBr(orcISO(R.boletos[0].venc))} com ${moeda(R.boletos[0].total)}. `
      + (registro.contato_id ? '' : 'Este lead ainda não é contato — ele vira contato neste passo, como inquilino.') },
    ...(imvs.length > 1
      ? [{ n: 'imovel', r: 'Imóvel do contrato', t: 'select', largo: true, op: imvs.map(rotulo) }]
      : []),
    // v1.397 — o prazo deixou de ser um 30 chutado: o orçamento agora
    // pergunta a duração (é dela que sai a numeração das cobranças
    // da fiança), então a janela abre com o mesmo número que o lead viu.
    { n: 'prazo', r: 'Prazo (meses)', t: 'numero', v: c.meses_contrato || 30 },
    { n: 'taxa', r: 'Taxa de administração (%)', t: 'numero', v: 10 }
  ], async () => {
    erroSe(!c.valor_aluguel, 'O orçamento está sem valor de aluguel.');
    const escolhido = imvs.length > 1
      ? imvs.find(x => rotulo(x) === valorAcao('imovel'))
      : imvs[0];
    erroSe(!escolhido, 'Vincule o imóvel ao lead antes de criar o contrato.');
    const imovelId = escolhido.imovel_id || escolhido.id;

    // 1) o inquilino: o contato do lead (criando-o se preciso)
    let inquilinoId = registro.contato_id;
    if (!inquilinoId) {
      const { data, error } = await sb.rpc('converter_lead', { p_lead_id: ID });
      if (error) throw error;
      inquilinoId = data;
    }

    // 2) o contrato, com os números que o lead recebeu
    const prazo = valorAcao('prazo') ? parseInt(valorAcao('prazo'), 10) : null;
    const fim = prazo ? orcISO(orcAddM(R.inicio, prazo)) : null;
    const { data: novo, error: e2 } = await sb.from('contratos').insert({
      codigo: await proximoCodigo('CON', 'contratos'),
      empresa_id: registro.empresa_id,
      imovel_id: imovelId, inquilino_id: inquilinoId,
      valor_aluguel: c.valor_aluguel,
      dia_vencimento: c.dia_vencimento,
      data_inicio: c.inicio,
      data_fim_prevista: fim,
      prazo_meses: prazo,
      status: 'Ativo',
      garantia_tipo: 'Seguro fiança'
    }).select('id').single();
    if (e2) throw e2;

    // 3) os itens da cobrança, no mês que o corte mandou
    const itens = [];
    if (c.fianca_valor) itens.push({
      contrato_id: novo.id, empresa_id: registro.empresa_id,
      nome: 'Seguro fiança', valor: c.fianca_valor, credito: false,
      parcelas: null, inicio_competencia: orcISO(R.compF), ativo: true,
      atualizado_em: new Date().toISOString() });
    if (c.incendio_valor && !c.incendio_avista) itens.push({
      contrato_id: novo.id, empresa_id: registro.empresa_id,
      nome: 'Seguro incêndio', valor: R.parcInc, credito: false,
      parcelas: c.incendio_parcelas, inicio_competencia: orcISO(R.compI), ativo: true,
      atualizado_em: new Date().toISOString() });
    if (c.taxa_boleto) itens.push({
      contrato_id: novo.id, empresa_id: registro.empresa_id,
      nome: 'Taxa de boleto', valor: c.taxa_boleto, credito: false,
      parcelas: null, inicio_competencia: orcISO(R.comp1), ativo: true,
      atualizado_em: new Date().toISOString() });
    if (itens.length) {
      const { error: e3 } = await sb.from('contrato_itens').insert(itens);
      if (e3) throw e3;
    }

    // 4) o orçamento fica ligado ao contrato que nasceu dele
    if (orcAtual && orcAtual.id) {
      await sb.from('lead_orcamentos').update({ contrato_id: novo.id }).eq('id', orcAtual.id);
    }
    window.location.href = 'contrato.html?id=' + novo.id;
  }, 'Criar contrato');
}

/**
 * Liga os campos do cartão ao recálculo. Chamado no fim do desenharFicha
 * (só na ficha do lead): o cartão é HTML recém-inserido, então os
 * ouvintes têm de ser postos depois — e o `oninput` no atributo faria o
 * texto do usuário passar por dentro do HTML.
 *
 * Mexer no INÍCIO limpa as escolhas de mês feitas à mão: com outra data,
 * o corte manda em outro mês, e manter a escolha antiga esconderia a
 * mudança.
 */
function orcLigar() {
  // v1.398 — os campos agora vivem em CARTÕES diferentes (o formulário
  // num, a data do comparador em outro), então a raiz deixou de ser a
  // grade única: são todos os cartões do orçamento.
  const raizes = document.querySelectorAll('.orc-cartoes');
  if (!raizes.length) return;
  raizes.forEach(raiz => raiz.querySelectorAll('input, select').forEach(el => {
    if (el.dataset.orcLigado) return;
    el.dataset.orcLigado = '1';
    const aoMudar = () => {
      if (el.id === 'orc-inicio') {
        orcAtual.fianca_competencia = null;
        orcAtual.incendio_competencia = null;
      }
      // v1.398 — escolher o imóvel traz o aluguel da carteira, mas SÓ
      // quando o campo está vazio ou zerado. Sobrescrever apagaria o
      // valor negociado com o lead, que é justamente o que costuma
      // divergir da tabela.
      if (el.id === 'orc-imovel' && el.value) {
        const i = (listaImoveis || []).find(x => x.id === el.value);
        const campo = orcElemento('aluguel');
        if (i && i.valor_aluguel && campo && !numeroBr(String(campo.value || '').trim()))
          campo.value = moedaCampo(i.valor_aluguel);
      }
      orcRecalcular();
    };
    el.addEventListener('input', aoMudar);
    el.addEventListener('change', aoMudar);
  }));
  orcRecalcular();
}

// ------------------------------------------------------------
// AGENDA DE VISITAS (v1.117) — substitui a aba Registro de Visitas.
//
// A visita é uma TAREFA tipo Visita com hora marcada (lembrete_em):
// entra na atividade do lead, no próximo contato do painel e na tela
// de Tarefas sem nenhuma tabela nova. A grade mostra os horários do
// dia e marca os já tomados por outras visitas em aberto.
// Fluxo combinado em 30/07: visita se agenda com a fiança APROVADA —
// sem aprovação a grade avisa, mas deixa (existe locação com fiador,
// caução ou capitalização; o aviso barra o esquecimento, não o negócio).
// ------------------------------------------------------------
const AGENDA_VISITA = { inicioH: 8, fimH: 18, passoMin: 30 };  // mude aqui os horários
let visitaSlot = null;   // ISO do horário escolhido na grade

function abrirAgendaVisita() {
  visitaSlot = null;
  let fundo = document.getElementById('modal-visita');
  if (!fundo) {
    fundo = document.createElement('div');
    fundo.id = 'modal-visita';
    fundo.className = 'modal-fundo';
    document.body.appendChild(fundo);
  }
  const d = new Date(); d.setDate(d.getDate() + 1);   // sugere amanhã
  const p = n => String(n).padStart(2, '0');
  const amanha = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const semAprovada = !simulacoes.some(s => s.status_fianca === 'Aprovado');
  fundo.innerHTML = `
    <div class="modal">
      <h2>Agendar visita — ${htm(registro.nome || '')}</h2>
      ${semAprovada && registro.tipo_lead === 'Inquilino' ? `
        <div class="aviso-fin">${icone('aviso', 12)} A fiança deste lead ainda não foi aprovada.
        Agende apenas se a locação for com outra garantia (fiador, caução,
        capitalização) — senão, registre a simulação primeiro.</div>` : ''}
      <div class="campo"><label>Dia da visita</label>
        <input type="date" id="visita-dia" value="${amanha}"></div>
      <div id="visita-grade" class="corpo" style="color:#8a94a1">Escolha o dia…</div>
      <p class="msg-erro" id="visita-erro"></p>
      <div class="acoes">
        <button class="btn btn-claro" onclick="fecharAgendaVisita()">Cancelar</button>
        <button class="btn" id="visita-salvar" disabled onclick="salvarVisita()">Agendar</button>
      </div>
    </div>`;
  fundo.classList.add('aberto');
  document.getElementById('visita-dia').addEventListener('change', desenharGradeVisita);
  desenharGradeVisita();
}

function fecharAgendaVisita() {
  const f = document.getElementById('modal-visita');
  if (f) f.classList.remove('aberto');
}

async function desenharGradeVisita() {
  const dia = document.getElementById('visita-dia').value;
  const caixa = document.getElementById('visita-grade');
  if (!dia) { caixa.textContent = 'Escolha o dia…'; return; }
  caixa.textContent = 'Conferindo a agenda…';
  visitaSlot = null;
  document.getElementById('visita-salvar').disabled = true;

  const [a, m, d] = dia.split('-').map(Number);
  const ini = new Date(a, m - 1, d, 0, 0).toISOString();
  const fim = new Date(a, m - 1, d + 1, 0, 0).toISOString();
  // TODAS as visitas em aberto do dia, de qualquer lead ou imóvel:
  // a agenda é uma só — duas visitas no mesmo horário é gente esperando.
  const { data: ocupadas, error } = await sb.from('tarefas')
    .select('lembrete_em, assunto').eq('tipo', 'Visita').eq('status', 'Aberta')
    .gte('lembrete_em', ini).lt('lembrete_em', fim);
  if (error) { caixa.textContent = 'Não consegui ler a agenda: ' + error.message; return; }

  const ocupado = {};
  (ocupadas || []).forEach(t => {
    const dt = new Date(t.lembrete_em);
    ocupado[`${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`] =
      t.assunto || 'ocupado';
  });

  let html = '<div class="agenda-grade">';
  for (let h = AGENDA_VISITA.inicioH; h < AGENDA_VISITA.fimH; h++) {
    for (let min = 0; min < 60; min += AGENDA_VISITA.passoMin) {
      const rot = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const ocup = ocupado[rot];
      html += ocup
        ? `<button class="slot ocupado" disabled title="${htm(ocup)}">${rot}</button>`
        : `<button class="slot" data-hora="${rot}" onclick="escolherSlotVisita(this)">${rot}</button>`;
    }
  }
  caixa.innerHTML = html + '</div>';
}

function escolherSlotVisita(el) {
  document.querySelectorAll('#visita-grade .slot.on').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  const dia = document.getElementById('visita-dia').value;
  const [a, m, d] = dia.split('-').map(Number);
  const [h, min] = el.dataset.hora.split(':').map(Number);
  visitaSlot = new Date(a, m - 1, d, h, min).toISOString();
  document.getElementById('visita-salvar').disabled = false;
}

async function salvarVisita() {
  const erro = document.getElementById('visita-erro');
  erro.style.display = 'none';
  if (!visitaSlot) return;
  const b = document.getElementById('visita-salvar');
  b.disabled = true;
  try {
    const dia = document.getElementById('visita-dia').value;
    const hora = new Date(visitaSlot);
    const rot = `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;
    const { error } = await sb.from('tarefas').insert({
      lead_id: ID, tipo: 'Visita', status: 'Aberta', prioridade: 'Alta',
      assunto: `Visita ${rot} — ${registro.nome || 'lead'}` +
        (registro.imovel_endereco ? ` — ${registro.imovel_endereco}` : ''),
      vencimento: dia, lembrete_em: visitaSlot,
      descricao: 'Agendada pela grade de visitas da ficha do lead.'
    });
    if (error) throw error;
    // funil anda junto, sempre para a frente (Novo/Em atendimento/Em
    // análise → Visita agendada); de Proposta em diante, não mexe.
    if (['Novo', 'Em atendimento', 'Em análise'].includes(registro.status)) {
      const { error: e2 } = await sb.from('leads')
        .update({ status: 'Visita agendada' }).eq('id', ID);
      if (!e2) registro.status = 'Visita agendada';
    }
    fecharAgendaVisita();
    desenharFicha();
    await recarregarTarefas();
  } catch (e) {
    erro.textContent = 'Não foi possível agendar: ' + e.message;
    erro.style.display = 'block';
    b.disabled = false;
  }
}

/**
 * (Lead) Converter em contato. Chama a função converter_lead() do banco,
 * que reaproveita o contato existente se o CPF ou o telefone já estiverem
 * cadastrados — nunca cria duplicado.
 */
async function converterLead() {
  const { data, error } = await sb.rpc('converter_lead', { p_lead_id: ID });
  if (error) { alerta('Não foi possível converter: ' + error.message); return; }
  // v1.170: a indicação vai junto — sem apagar uma que o contato já tenha
  if (registro.indicado_por) {
    const { data: c } = await sb.from('contatos')
      .select('indicado_por').eq('id', data).maybeSingle();
    if (c && !c.indicado_por) {
      await sb.from('contatos').update({ indicado_por: registro.indicado_por })
        .eq('id', data);
    }
  }
  window.location.href = 'contato.html?id=' + data;
}



/**
 * v1.235 — O DESENHO DE CADA CARTÃO FIXO, POR ID.
 *
 * Antes esta lista era a ordem: uma sequência de chamadas escrita à mão
 * dentro do `desenharFicha`, igual para toda imobiliária. Agora é um
 * MAPA — quem manda na ordem é o layout, e o que sobra vem no fim, na
 * ordem de fábrica. Layout salvo antes desta versão não tem cartão
 * nenhum na lista, então continua desenhando exatamente como hoje.
 *
 * Um id sem produtor aqui simplesmente não aparece; um produtor que
 * devolve '' também não. É de propósito: cartão que não faz sentido no
 * registro (Portal do prestador em quem não é prestador) some sozinho,
 * sem `if` espalhado pelo desenho.
 */
function cartaoDaFichaPorId(id) {
  switch (id) {
    case 'relacionados': return cartaoRelacionados();
    case 'contrato':     return blocoContratoDaParcela();
    case 'imovel':       return blocoImovelDaParcela();
    case 'mes':          return blocoCompetencia();
    case 'itens':        return ALVO === 'competencia' ? blocoItensDaParcela() : blocoItensContrato();
    case 'descontos':    return blocoDescontosDoRepasse();
    case 'repasses':     return ALVO === 'contato' ? blocoRepassesDoProprietario() : '';
    // v1.445 — os mesmos ids servem contrato E contato, cada um com o
    // seu desenho (a receita do 'itens' e do 'dinheiro', logo acima)
    case 'alugueis':     return ALVO === 'contato' ? blocoAlugueisDoContato() : blocoAlugueis();
    case 'comissoes':    return ALVO === 'contato' ? blocoComissoesDoContato() : '';
    // v1.445 — o encaixe da Conversa: o cartão em si quem monta é o
    // carregarConversaFicha (v1.349), DEPOIS que a ficha desenha — aqui
    // só nasce o lugar dele, invisível até ser preenchido. Com o
    // encaixe no layout, a conversa vira cartão de verdade: dá para
    // reordenar, mandar para a direita ou tirar pelo editor.
    case 'conversa':     return ALVO === 'contato' ? '<div id="conv-slot"></div>' : '';
    case 'dinheiro':     return ALVO === 'competencia'
                           ? cartaoDinheiroParcela() : cartaoDinheiroContrato();  // v1.270/72
    case 'radar':        return ALVO === 'competencia'
                           ? cartaoRadarParcela() : cartaoRadarContrato();        // v1.270/72
    case 'papeis':       return cartaoPapeisDoMes();          // v1.272
    case 'regras':       return blocoRegrasDinheiro();
    case 'pessoas':      return ALVO === 'contrato' ? blocoPessoasDoContrato() : '';
    case 'conversas_imovel': return ALVO === 'contrato' ? blocoConversasDoImovel() : '';
    case 'receitas':     return blocoReceitasMorali();
    case 'sinistros':    return ALVO === 'contato' ? blocoSinistrosDoContato() : blocoSinistros();
    case 'reajustes':    return blocoReajustes();
    case 'checklist':    return blocoChecklist();
    case 'documentos':   return blocoDocumentosContrato();
    case 'contratos':    return blocoContratosDoImovel();
    case 'simulacoes':   return blocoSimulacoes();
    case 'orcamento':    return blocoOrcamento();          // v1.333
    case 'vistoria':     return blocoAgendaVistoria();
    case 'financeiro':   return blocoFinanceiro();
    case 'guardiao':     return blocoGuardiao();
    case 'anexos':       return blocoAnexos();
    case 'casos':        return blocoCasosFicha();
    case 'portal':       return (ALVO === 'contato' && usaPortal()) ? blocoPortalPrestador() : '';
    case 'conferencia':  return blocoConferencia();   // v1.284
    case 'formulario':   return blocoFormulario();    // v1.284
    case 'docsficha':    return blocoDocumentosFicha(); // v1.287
    case 'historico':    return blocoHistorico();
    case 'atividade':    return '<aside class="cartao faixa" id="faixa-atividade"></aside>';
    default:             return '';
  }
}

/** o cartão "Relacionados", que muda de nome e de botão conforme a ficha */
function cartaoRelacionados() {
  return `<div class="cartao">
    <h2>${htm(DEF.rotuloRel)}
      <span class="cnt">(${relacionados.length})</span>
      ${ALVO === 'caso' ? `<span class="dir"><button class="btn btn-claro"
         style="padding:5px 12px;font-size:12px" onclick="novoOrcamento()">+ Lançar orçamento</button></span>` : ''}
      ${ALVO === 'contrato' ? `<span class="dir"><button class="btn" data-perm="contratos:editar"
         style="padding:5px 12px;font-size:12px" onclick="abrirNovaApolice()">+ Nova apólice</button></span>` : ''}
      ${ALVO === 'plano' ? `<span class="dir"><button class="btn" data-perm="acoes:criar"
         style="padding:5px 12px;font-size:12px" onclick="novaAcaoDoPlano()">+ Nova ação</button>
         <a class="btn btn-claro" style="padding:5px 12px;font-size:12px"
            href="acoes.html?plano=${encodeURIComponent(registro.codigo || '')}">Ver em quadro</a></span>` : ''}</h2>
    ${blocoRelacionados()}
  </div>`;
}

/**
 * A ORDEM DOS CARTÕES, e em que coluna cada um vai.
 *
 * Devolve { esquerda, direita } já montados. Três regras:
 *  · o que o layout listar vem na ordem e no lado que ele disser;
 *  · o que ele NÃO listar vem depois, na ordem de fábrica — é o que
 *    faz layout antigo continuar completo;
 *  · o que o layout tirou (está no `fora`) não vem.
 */
// ------------------------------------------------------------
// v1.309 — A SEÇÃO QUE SÓ APARECE NUM TIPO DE REGISTRO
//
// O layout ganhou `quando` na seção: vazio = aparece sempre, ou o
// valor do tipo em que ela aparece ("Proprietário"). Quem diz qual
// campo é o tipo é o próprio objeto, em DEFS.<alvo>.tipoRegistro —
// objeto que não declara nada segue como antes.
//
// É o desenho do Dynamic Forms do Salesforce (regra de visibilidade na
// seção) e não o de layout por record type: um layout só, e campo novo
// entra uma vez. Com dois layouts, todo campo criado depois teria de
// ser posicionado duas vezes, e esquecer um deixa a ficha torta sem
// ninguém perceber.
// ------------------------------------------------------------

/** o valor do tipo neste registro ('Inquilino'), ou null se o objeto
 *  não declara tipo nenhum */
function tipoDoRegistro() {
  const t = (typeof DEF !== 'undefined' && DEF) ? DEF.tipoRegistro : null;
  if (!t || !t.campo || !registro) return null;
  return String(registro[t.campo] || '');
}

/** a seção aparece para este tipo? Sem `quando`, aparece sempre. */
function secaoValeParaOTipo(sec, valor) {
  if (!sec || !sec.quando) return true;
  const t = (typeof DEF !== 'undefined' && DEF) ? DEF.tipoRegistro : null;
  if (!t || !t.campo) return true;   // regra salva num objeto sem tipo: ignora
  const atual = String((valor == null ? tipoDoRegistro() : valor) || '');
  // TIPO AINDA EM BRANCO: NÃO ESCONDE NADA.
  //
  // O lead que chega pelo BotConversa nasce sem tipo — quem diz se é
  // inquilino ou proprietário é uma pessoa, depois. Enquanto ninguém
  // disse, esconder as duas seções deixaria a ficha pela metade e sem
  // explicação. Em branco, a ficha é a de sempre: tudo à vista.
  if (!atual) return true;
  return atual === String(sec.quando);
}

/** Os campos que estão em seção de OUTRO tipo. Servem para duas coisas
 *  na janela de edição: sumir da tela e DEIXAR DE SER COBRADOS como
 *  obrigatórios — senão salvar travaria pedindo algo que não está
 *  visível (decisão aprovada em 19/08/2026). */
function camposForaDoTipo(valor) {
  const fora = new Set();
  const secoes = (typeof LAY !== 'undefined' && LAY.secoes) ? LAY.secoes : [];
  secoes.forEach(function (s) {
    if (secaoValeParaOTipo(s, valor)) return;
    (s.campos || []).forEach(function (k) { fora.add(k); });
  });
  return fora;
}

/** Esconde na janela aberta os campos que não são deste tipo. Chamada
 *  ao abrir e a cada troca do seletor de tipo — o dado NÃO é apagado:
 *  ele volta se o tipo mudar de novo. */
function aplicarTipoNaJanela() {
  const t = (typeof DEF !== 'undefined' && DEF) ? DEF.tipoRegistro : null;
  if (!t || !t.campo || !modalDef) return;
  const sel = document.getElementById('mf-' + t.campo);
  const valor = sel ? sel.value : tipoDoRegistro();
  const fora = camposForaDoTipo(valor);
  (modalDef.campos || []).forEach(function (c) {
    const el = document.getElementById('mf-' + c.c);
    const caixa = (el && el.closest) ? el.closest('.campo') : null;
    if (!caixa) return;
    caixa.style.display = fora.has(c.c) ? 'none' : '';
  });
}

/** liga o esconde-e-mostra à janela recém-aberta */
function ligarTipoNaJanela() {
  const t = (typeof DEF !== 'undefined' && DEF) ? DEF.tipoRegistro : null;
  if (!t || !t.campo) return;
  aplicarTipoNaJanela();
  const sel = document.getElementById('mf-' + t.campo);
  if (sel) sel.addEventListener('change', aplicarTipoNaJanela);
}

function cartoesOrdenados(secoes, blocos) {
  const registro_ = cartoesDaFicha(ALVO);
  const fora = (typeof LAY !== 'undefined' && Array.isArray(LAY.cartoesFora))
    ? LAY.cartoesFora : [];

  const usados = {};
  const saida = { esquerda: '', direita: '' };

  const por = (id, lado, recolhida) => {
    if (usados[id]) return;
    usados[id] = 1;
    const def = registro_.find(c => c.id === id);
    if (!def) return;
    let html = cartaoDaFichaPorId(id);
    if (!html) return;
    /* o layout diz como o cartão NASCE; a escolha de quem olha, guardada
     * no navegador, manda mais — e é lida no base.js. */
    if (recolhida) html = html.replace('<div class="cartao"',
      '<div class="cartao" data-nasce="fechado"');
    saida[lado === 'direita' ? 'direita' : 'esquerda'] += html;
  };

  /* v1.270 — a lista do layout é percorrida UMA vez, na ordem salva:
   * seção de campos entra pelo bloco já desenhado, cartão entra pelo
   * produtor dele. É o que deixa um cartão morar entre duas seções. */
  (secoes || []).forEach((sec, i) => {
    if (!sec) return;
    if (sec.cartao) {
      // v1.309 — cartão fixo de outro tipo: sai da ficha. Vai marcado
      // como usado de propósito, senão o laço de baixo (que devolve o
      // que o layout não listou) o traria de volta.
      if (!secaoValeParaOTipo(sec)) { usados[sec.cartao] = 1; return; }
      por(sec.cartao, sec.lado, sec.recolhida); return;
    }
    saida[sec.lado === 'direita' ? 'direita' : 'esquerda'] += (blocos && blocos[i]) || '';
  });
  registro_.forEach(c => {
    if (usados[c.id] || fora.indexOf(c.id) >= 0) return;
    por(c.id, c.lado, false);
  });
  return saida;
}

/**
 * v1.317 — O RESUMO DO CELULAR.
 *
 * É o Compact Layout do Salesforce: uma lista curta de campos que a
 * tela pequena mostra primeiro, escolhida no editor de layout (até 10).
 * O resto da ficha continua inteiro, atrás de "Ver todos os campos" —
 * nada some, só sai da frente.
 *
 * Sem escolha salva, mostra os PRIMEIROS 5 CAMPOS DA PRIMEIRA SEÇÃO,
 * que é o que o celular já mostrava por acaso, rolando. Assim ninguém
 * precisa configurar nada para a ficha melhorar.
 *
 * O bloco é desenhado SEMPRE; quem decide se ele aparece é o CSS, numa
 * media query. Desenhar condicionalmente pelo tamanho da janela daria
 * uma ficha errada em quem gira o telefone.
 */
function blocoResumoCelular() {
  const doLayout = (typeof LAY !== 'undefined' && Array.isArray(LAY.celular) && LAY.celular.length)
    ? LAY.celular : null;
  const daPrimeira = ((typeof LAY !== 'undefined' && LAY.secoes && LAY.secoes[0]
                       && LAY.secoes[0].campos) || DEF.campos.map(c => c.c)).slice(0, 5);
  const ids = doLayout || daPrimeira;

  const linhas = ids
    .map(id => (DEF.campos || []).find(c => c.c === id))
    .filter(Boolean)
    .map(c => `<div class="cel-linha"><span class="r">${htm(c.r)}</span>
                 <span class="v">${valorFormatado(c)}</span></div>`).join('');
  if (!linhas) return '';

  const quantos = (DEF.campos || []).length;
  return `<div class="cel-resumo">
    ${linhas}
    <a class="cel-ver" href="#" onclick="event.preventDefault();verTodosOsCampos(this)"
       >Ver todos os campos (${quantos}) ▾</a>
  </div>`;
}

/** Abre e fecha as seções de campos no celular. A marca vai no <body>
 *  porque o CSS precisa alcançar cartões que estão em duas colunas. */
function verTodosOsCampos(el) {
  const abrindo = !document.body.classList.contains('ver-tudo');
  document.body.classList.toggle('ver-tudo', abrindo);
  if (el) el.innerHTML = abrindo
    ? 'Esconder os campos ▴'
    : 'Ver todos os campos (' + ((DEF.campos || []).length) + ') ▾';
}

/**
 * v1.441 — A FILEIRA DE AÇÕES DO CELULAR (estilo Salesforce mobile,
 * mockup aprovado em 30/08).
 *
 * Até 3 bolas + "Mais". As bolas são as MESMAS ações da barra de
 * sempre (mesmos onclick, mesmas guardas de leadTravado e data-perm) —
 * nenhuma ação nasce aqui. O "Mais" abre a `.acoes-ficha` inteira,
 * que no celular fica guardada atrás dele.
 *
 * Desenhada SEMPRE; quem decide se aparece é o CSS (o acordo do
 * blocoResumoCelular, logo acima): desenhar pelo tamanho da janela
 * daria uma ficha errada em quem gira o telefone.
 *
 * Quem é a principal (bola cheia): no lead, a Conversa — a ficha de
 * lead existe para falar com a pessoa; nas demais, o Editar.
 */
function acoesCelular() {
  const bolas = [];
  const d = String(registro.telefone || '').replace(/\D/g, '');
  const temTel = d.length >= 10;
  const temJanela = (ALVO === 'lead' || ALVO === 'contato') && !leadTravado();

  const conversa = cheia => !temTel ? '' : (temJanela
    ? `<button class="ac${cheia ? ' principal' : ''}" data-perm="${OBJETO_PERM()}:editar"
         onclick="irParaConversa()"><span class="bola">${icone('balao', 20)}</span>Conversa</button>`
    : `<a class="ac${cheia ? ' principal' : ''}" target="_blank" rel="noopener"
         href="https://wa.me/55${d}"><span class="bola">${icone('balao', 20)}</span>WhatsApp</a>`);
  const editar = cheia => `<button class="ac${cheia ? ' principal' : ''}"
      data-perm="${OBJETO_PERM()}:editar" onclick="editarRegistro()"
      ><span class="bola">${icone('papelCaneta', 20)}</span>Editar</button>`;

  if (leadTravado()) {
    // ficha encerrada: só a reserva do WhatsApp, como na barra de sempre
    if (temTel) bolas.push(conversa(false));
  } else if (ALVO === 'lead') {
    if (temTel) bolas.push(conversa(true));
    bolas.push(`<button class="ac" onclick="registrarLigacao()"
      ><span class="bola">${icone('telefone', 20)}</span>Ligar</button>`);
    bolas.push(`<button class="ac" onclick="novaTarefa()"
      ><span class="bola">${icone('prancheta', 20)}</span>Nova tarefa</button>`);
    if (!temTel) bolas.push(editar(false));
  } else {
    bolas.push(editar(true));
    if (temTel) bolas.push(conversa(false));
    bolas.push(`<button class="ac" onclick="novaTarefa()"
      ><span class="bola">${icone('prancheta', 20)}</span>Nova tarefa</button>`);
  }

  const aberta = document.body.classList.contains('fic-acoes-abertas');
  return `<div class="fic-acel">${bolas.slice(0, 3).join('')}
    <button class="ac${aberta ? ' on' : ''}" onclick="alternarAcoesFicha(this)"
      aria-label="Todas as ações desta ficha"
      ><span class="bola">${icone('mais', 20)}</span>Mais</button>
  </div>`;
}

/** O "Mais" mostra e esconde a barra de ações inteira. A marca vai no
 *  <body> para sobreviver ao redesenho da ficha. */
function alternarAcoesFicha(el) {
  const aberta = document.body.classList.toggle('fic-acoes-abertas');
  if (el) el.classList.toggle('on', aberta);
}

/* v1.448 — a cor do objeto no quadrado da ficha: as classes .obj-* do
 * fim do estilo.css, as mesmas do Menu do celular. Objeto sem cor cai
 * no navy de sempre (o .avatar tem o fundo de reserva). */
function corDoObjeto() {
  return ({ contrato: 'obj-contratos', imovel: 'obj-imoveis', caso: 'obj-casos',
    competencia: 'obj-competencias', plano: 'obj-planos', acao: 'obj-planos',
    sinistro: 'obj-sinistros', lead: 'obj-leads', contato: 'obj-contatos',
    ficha: 'obj-fichas' })[ALVO] || '';
}

function desenharFicha() {
  document.title = `${DEF.titulo(registro)} — CRM Moralí`;
  // As seções vêm do layout da empresa (js/layout-ficha.js). Sem layout
  // salvo, vem uma seção só com todos os campos — a ficha de sempre.
  const secoes = (typeof LAY !== 'undefined' && LAY.secoes)
    ? LAY.secoes
    : [{ titulo: 'Detalhes', colunas: 2, campos: DEF.campos.map(c => c.c) }];

  const blocos = secoes.map((sec, iSec) => {
    // v1.309 — seção de outro tipo não é desenhada. Devolver '' (e não
    // filtrar a lista) mantém o índice de cada seção igual ao do
    // layout salvo — é dele que o ✎ da seção se serve.
    if (!secaoValeParaOTipo(sec)) return '';
    // v1.188 — A LARGURA AGORA É ESCOLHA DO LAYOUT.
    // Antes vinha só do tipo do campo (`c.largo`), escrito no código:
    // multiescolha e texto longo ocupavam a linha inteira em toda
    // imobiliária, sempre, sem como mudar pela tela. O layout pode
    // dizer o contrário campo a campo; onde ele não disser nada, o
    // padrão do tipo continua valendo — layout antigo não muda em nada.
    const larguras = sec.larguras || {};
    const ehLargo = c => (c.c in larguras) ? !!larguras[c.c] : !!c.largo;
    const dentro = (sec.campos || [])
      .map(id => (typeof ehEspaco === 'function' && ehEspaco(id))
        ? { c: id, r: '', t: 'espaco' }
        : DEF.campos.find(c => c.c === id))
      .filter(Boolean)
      .map(c => c.t === 'espaco'
        ? '<div class="campo-espaco"></div>'
        : `
        <div class="${ehLargo(c) ? 'largo' : ''}">
          <span class="r">${htm(c.r)}</span>
          ${vFichaHtml(c)}
        </div>`).join('');
    if (!dentro) return '';
    // v1.191 — CADA CARTÃO RECOLHE, E PODE MORAR NA COLUNA DA DIREITA.
    // Na direita são 400px: dois campos lado a lado ficariam espremidos,
    // então lá o cartão é sempre de uma coluna, qualquer que seja a
    // escolha da seção. Layout antigo não tem `lado` nem `recolhida` —
    // cai em "coluna principal, aberto", que é como sempre foi.
    const naDireita = sec.lado === 'direita';
    const fechada = !!sec.recolhida;
    // v1.270 \u2014 a se\u00E7\u00E3o pode ocupar meia linha ou um quarto (escolha do
    // editor de layout), e ganha o \u270E pr\u00F3prio: editar S\u00D3 os campos dela,
    // numa janela pequena. O stopPropagation impede o clique no l\u00E1pis
    // de recolher o cart\u00E3o junto.
    const largura = (!naDireita && (sec.largura === 'metade' || sec.largura === 'quarto'))
      ? ' c-' + sec.largura : '';
    return `<div class="cartao${fechada ? ' fechado' : ''}${largura}" id="sec-${iSec}">
              <h2 style="cursor:pointer" onclick="alternarCartao(${iSec})">${htm(sec.titulo || 'Detalhes')}
                ${leadTravado() ? '' : `<span class="dir"><button class="btn btn-claro" data-perm="${OBJETO_PERM()}:editar"
                  style="padding:3px 9px;font-size:11.5px" title="Editar os campos desta se\u00E7\u00E3o"
                  onclick="event.stopPropagation();editarGrupoFicha(${iSec})">\u270E</button></span>`}
                <span class="seta-card" id="seta-sec-${iSec}"
                  style="display:inline-block${fechada ? '' : ';transform:rotate(180deg)'}">${
                  '\u25BE'}</span></h2>
              <div class="corpo"${fechada ? ' style="display:none"' : ''}><div
                class="campos-ficha${(sec.colunas === 1 || naDireita) ? ' uma-coluna' : ''}">${dentro}</div></div>
            </div>`;
  });

  /* v1.270 — SEÇÕES E CARTÕES SAEM NA ORDEM DO LAYOUT, entrelaçados.
   * Antes toda seção de campos vinha antes de todo cartão, qualquer que
   * fosse a ordem salva no editor — o cartão "O dinheiro deste contrato"
   * não tinha como ficar acima das Condições. Cartão que o layout não
   * lista continua entrando depois, na ordem de fábrica; o que está no
   * `fora` continua fora.
   * v1.271 — o CART é a saída COMPLETA (seções + cartões juntos): a
   * v1.270 ainda somava as duas metades no template e a ficha inteira
   * saía em dobro. */
  const CART = cartoesOrdenados(secoes, blocos);

  document.getElementById('conteudo').innerHTML = `
    <div class="migalha"><a href="${DEF.lista}">${DEF.rotulo}</a> ›
      ${htm(DEF.titulo(registro))}</div>

    <div class="destaque">
      <div class="topo-ficha">
        <div class="avatar ${corDoObjeto()}">${ALVO === 'imovel' ? icone('casa', 24)
          : (ALVO === 'caso' ? icone('chaveInglesa', 24)
          : (ALVO === 'contrato' ? icone('documento', 24)
          : (ALVO === 'competencia' ? icone('calendario', 24)   /* v1.272 — era "C2", as iniciais do endereço */
          : (ALVO === 'plano' ? icone('pin', 24)
          : (ALVO === 'acao' ? icone('checkQuadrado', 24)
          : (ALVO === 'sinistro' ? icone('aviso', 24) : htm(iniciais(DEF.titulo(registro)))))))))}</div>
        <div style="min-width:0">
          <h1>${htm(DEF.titulo(registro))}
            <!-- v1.124: a estrela ao lado do nome, como no Salesforce. O
                 desenho e o estado quem preenche é o cabecalho.js, em
                 atualizarEstrela() — aqui só existe o lugar. -->
            <button class="estrela-registro" onclick="alternarFavorito()"
                    title="Adicionar aos favoritos" aria-label="Favoritar"></button>
          </h1>
          <div class="sub">${subtituloDoRegistro()}${donoLugarNaFicha()}</div>
        </div>
        <div class="acoes-ficha">
          ${(() => {
            /* v1.348 — UM botão de WhatsApp só. No lead e no contato o
               botão é a janela do CRM (enviar agora ou agendar, pelo
               número da imobiliária). O link antigo do wa.me fica como
               reserva: nas fichas SEM a janela (contrato não tem, e o
               lead travado esconde a de cá) o telefone continua a um
               clique. */
            const d = String(registro.telefone || '').replace(/\D/g, '');
            if (d.length < 10) return '';
            const temJanela = (ALVO === 'lead' || ALVO === 'contato') && !leadTravado();
            return temJanela
              ? `<button class="btn btn-claro" data-perm="${OBJETO_PERM()}:editar"
                   title="A conversa inteira, dentro do registro"
                   onclick="irParaConversa()">${icone('balao', 13)} WhatsApp</button>`
              : `<a class="btn btn-claro" target="_blank" rel="noopener"
                   href="https://wa.me/55${d}">${icone('balao', 13)} WhatsApp</a>`;
          })()}
          ${ALVO === 'imovel' ? `<a class="btn btn-claro"
               href="raiox-imovel.html?id=${encodeURIComponent(ID)}">${icone('lupa', 13)} Raio-X</a>` : ''}
          ${ALVO === 'competencia' ? `<a class="btn btn-claro" data-perm="competencias:ver"
               href="demonstrativo.html?id=${encodeURIComponent(ID)}"
               title="Folha com o timbre da Moralí para mandar ao inquilino"
               >${icone('documento', 13)} Demonstrativo</a>${registro.recibo_token
             ? `<a class="btn btn-claro" data-perm="competencias:ver"
                  href="recibo.html?p=${encodeURIComponent(registro.recibo_token)}&i=1"
                  target="_blank" rel="noopener"
                  title="Folha do proprietário — vale antes e depois do repasse"
                  >${icone('documento', 13)} Recibo do proprietário</a>` : ''}` : ''}
          ${leadTravado() ? '' : `
          <button class="btn btn-claro" onclick="registrarLigacao()">${icone('telefone', 13)} Registrar ligação</button>
          <button class="btn btn-claro" onclick="novaTarefa()">+ Nova tarefa</button>`}
          ${ALVO === 'ficha'
            ? `<button class="btn btn-claro" onclick="imprimirFicha()"
                 title="Folha A4 com o timbre da imobiliária — imprimir ou salvar em PDF"
                 >${icone('impressora', 13)} Imprimir / PDF</button>` : ''}
          ${ALVO === 'lead' && !leadEncerrado()
            ? `<button class="btn btn-claro" data-perm="leads:editar"
                 onclick="abrirAgendaVisita()">${icone('calendario', 13)} Agendar visita</button>` : ''}
          ${(ALVO === 'lead' && !registro.contato_id && !leadTravado())
            ? '<button class="btn btn-claro" onclick="converterLead()">✓ Converter em contato</button>' : ''}
          ${(ALVO === 'lead' && registro.tipo_lead === 'Proprietário'
             && registro.status !== 'Perdido' && !leadTravado())
            ? `<button class="btn btn-claro" data-perm="imoveis:criar"
                 onclick="abrirCaptarImovel()">${icone('casa', 13)} Criar o imóvel captado</button>` : ''}
          ${ALVO === 'sinistro' && registro.em_andamento ? `
            <button class="btn btn-claro" data-perm="sinistros:editar"
              onclick="abrirExigencia('${ID}')">+ Exigência</button>
            ${registro.status !== 'Deferido'
              ? `<button class="btn btn-claro" data-perm="sinistros:editar"
                   onclick="abrirDeferir('${ID}')">✓ Deferido</button>`
              : `<button class="btn" data-perm="sinistros:aprovar"
                   onclick="abrirRecebimento('${ID}')">${icone('moeda', 13)} Recebi</button>`}
          ` : ''}
          ${ALVO === 'plano' ? `<button class="btn btn-claro" data-perm="acoes:criar"
               onclick="novaAcaoDoPlano()">+ Nova ação 5W2H</button>` : ''}
          ${(ALVO === 'contato' || ALVO === 'imovel' || ALVO === 'lead'
             || ALVO === 'plano' || ALVO === 'acao' || ALVO === 'ficha')
            ? `<button class="btn btn-claro btn-excluir" id="btn-excluir"
                 data-perm="${OBJETO_PERM()}:excluir"
                 onclick="pedirExcluirRegistro()">${icone('lixeira', 13)} Excluir</button>` : ''}
          <!-- v1.132: o data-perm que faltava. O Excluir ao lado sempre teve;
               o Editar, não — quem não podia editar via o botão, preenchia a
               janela inteira e só descobria no Salvar, com erro do banco.
               A tecla E segue o botão: se ele não está aí, ela não age. -->
          ${leadTravado() ? '' : `<button class="btn" id="btn-editar" data-perm="${OBJETO_PERM()}:editar"
                  title="Editar (tecla E)" onclick="editarRegistro()">Editar</button>`}
        </div>
        ${acoesCelular()}
        <div class="faixa-excluir" id="faixa-excluir" style="display:none"></div>
      </div>
      ${ALVO === 'caso' ? caminhoEtapas() : ''}
      ${ALVO === 'caso' ? blocoAgendaVistoria() : ''}
      ${ALVO === 'competencia' ? caminhoCompetencia() : ''}
      ${ALVO === 'lead' ? caminhoEtapasLead() + faixaLeadEncerrado() : ''}
      ${(ALVO === 'plano' || ALVO === 'acao') ? caminhoSituacao() : ''}
      ${faixaAjudaEtapa()}
      ${faixaPartesContrato()}
      ${faixaVidaContrato()}
      ${faixaPartesParcela()}
      <div class="chips${ALVO === 'contrato' || ALVO === 'competencia' ? ' agora' : ''}">${htmlDosChips()}</div>
      ${blocoResumoCelular()}
      ${ALVO === 'competencia' ? faixaDaBaixa() : ''}
      ${ALVO === 'acao' ? faixaAtrasoAcao() : ''}
    </div>

    <div class="g70">
      <div class="col-esq">
        ${CART.esquerda}
      </div>

      <div>
        ${CART.direita}
      </div>
    </div>`;
  desenharFaixa();
  preencherFaixaLeadEncerrado();   // v1.330 — nome/código nos links da faixa
  // A ficha é desenhada DEPOIS de o permissoes.js ter feito a varredura
  // inicial da página — sem esta chamada, botão com data-perm criado
  // agora (Excluir, cartão de Casos) apareceria para quem não pode.
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
  // depois de a ficha existir na tela: o bloco do portal consulta o banco
  if (ALVO === 'contato' && usaPortal()) carregarPortalPrestador();
  // v1.349 — a conversa de WhatsApp vive DENTRO do registro. Busca por
  // vínculo E por telefone: no instante em que o lead vira contato, o
  // mesmo fio aparece na ficha nova sem esperar mensagem.
  // Lead travado (convertido/perdido) NÃO mostra o cartão: depois da
  // conversão a conversa vive no CONTATO — regra do Rodrigo, 22/08.
  if ((ALVO === 'lead' && !leadTravado()) || ALVO === 'contato') carregarConversaFicha();
  if (ALVO === 'contato') carregarFinanceiroFicha();   // v1.438 — o cartão do dinheiro
  registrarAcessoRecente();
  // v1.182 — o histórico NÃO é mais consultado na abertura: o cartão
  // nasce fechado e a busca só acontece no primeiro clique. É o que faz
  // a ficha abrir mais rápida (pedido do Rodrigo em 06/08).
  ligarRecolherDosCartoes();
  // v1.333 — o cartão do orçamento é HTML recém-inserido: os ouvintes
  // dos campos e a primeira conta só podem vir depois de ele existir.
  if (ALVO === 'lead') orcLigar();
  pintarDonoDoRegistro();          // v1.458 — o dono, depois de a ficha existir
}

// ============================================================
// v1.458 — O PROPRIETÁRIO DO REGISTRO (mockup aprovado 31/08/2026)
//
// O dono de cada registro, como no Salesforce: foto e nome na linha de
// baixo do cabeçalho, e um "trocar" para passar o registro adiante.
//
// Quem CARIMBA é o banco (`proprietario_id` nasce com `default
// auth.uid()`, proprietario-sql-1): a tela não manda o dono ao criar —
// se dependesse do JavaScript, todo caminho novo esqueceria. Aqui a
// tela só MOSTRA e TROCA.
//
// Registro sem responsável não é defeito: é o que entrou por robô,
// ficha pública ou importação, onde não havia ninguém logado. A ficha
// diz isso com todas as letras e oferece "definir".
//
// Os dez objetos com dono estão no SQL; aqui a pergunta é simples — o
// registro aberto tem a coluna? Então tem dono para mostrar.
// ============================================================
let DONO_EQUIPE = null;            // perfis ativos, buscados uma vez

function fichaTemDono() {
  // v1.461 — O IMÓVEL FICA DE FORA, e não é detalhe: lá
  // `proprietario_id` é o DONO DO IMÓVEL (o contato proprietário), que
  // já existia muito antes deste campo. Sem esta linha, a ficha do
  // imóvel mostrava o contato como se fosse conta de usuário — e o
  // "trocar" apagaria o vínculo com o proprietário de verdade.
  // v1.462 — o CONTRATO entrou na mesma lista, e pelo mesmo motivo: lá
  // `proprietario_id` é o proprietário do contrato (que na prática vem
  // do imóvel). Sem esta linha, o "definir" do cabeçalho gravaria um
  // número de conta na coluna que o cartão PROPRIETÁRIO lê.
  if (ALVO === 'imovel' || ALVO === 'contrato') return false;
  return !!registro && Object.prototype.hasOwnProperty.call(registro, 'proprietario_id');
}

/** só o LUGAR do dono no cabeçalho; quem preenche é o pintarDono */
function donoLugarNaFicha() {
  return fichaTemDono() ? ' <span class="dono-reg" id="ficha-dono"></span>' : '';
}

async function donoEquipe() {
  if (DONO_EQUIPE) return DONO_EQUIPE;
  const { data, error } = await sb.from('perfis')
    .select('usuario_id,nome,email,foto_path,ativo').eq('ativo', true).order('nome');
  if (error) { console.warn('equipe:', error.message); return []; }
  DONO_EQUIPE = data || [];
  return DONO_EQUIPE;
}

async function pintarDonoDoRegistro() {
  const alvo = document.getElementById('ficha-dono');
  if (!alvo || !fichaTemDono()) return;
  const equipe = await donoEquipe();
  // a ficha pode ter trocado de registro enquanto a equipe vinha
  const ainda = document.getElementById('ficha-dono');
  if (!ainda) return;
  const dono = equipe.find(p => p.usuario_id === registro.proprietario_id);
  const podeTrocar = typeof pode !== 'function' || pode(OBJETO_PERM(), 'editar');
  const trocar = podeTrocar
    ? ` <span class="trocar" onclick="donoAbrirLista(event)">${
        dono ? 'trocar' : 'definir'}</span>` : '';
  ainda.className = 'dono-reg' + (dono ? '' : ' sem');
  ainda.innerHTML = dono
    ? avatarPessoa(dono, { tamanho: 22, semAnel: true }) + '<b>' + htm(dono.nome) + '</b>' + trocar
    : '<span class="ft">?</span><b>sem responsável</b>' + trocar;
}

/** a listinha da equipe, ancorada no próprio chip */
async function donoAbrirLista(ev) {
  if (ev) ev.stopPropagation();
  const alvo = document.getElementById('ficha-dono');
  if (!alvo) return;
  const aberta = alvo.querySelector('.dono-lista');
  if (aberta) { aberta.remove(); return; }
  const equipe = await donoEquipe();
  const caixa = document.createElement('span');
  caixa.className = 'dono-lista';
  caixa.innerHTML = equipe.map(p =>
      `<button type="button" onclick="donoPassarPara('${jsq(p.usuario_id)}')">${
        avatarPessoa(p, { tamanho: 22, semAnel: true })}<span>${htm(p.nome)}${
        p.usuario_id === registro.proprietario_id ? ' <small>(atual)</small>' : ''}</span></button>`).join('')
    + `<button type="button" class="solta" onclick="donoPassarPara('')">
         <span class="ft">?</span><span>Deixar sem responsável</span></button>`;
  alvo.appendChild(caixa);
  // um clique fora fecha — o mesmo gesto dos outros menus do CRM
  setTimeout(() => document.addEventListener('click', donoFecharLista, { once: true }), 0);
}
function donoFecharLista() {
  const l = document.querySelector('.dono-lista');
  if (l) l.remove();
}

async function donoPassarPara(usuarioId) {
  donoFecharLista();
  const novo = usuarioId || null;
  if (novo === (registro.proprietario_id || null)) return;
  const { error } = await sb.from(DEF.tabela)
    .update({ proprietario_id: novo }).eq('id', ID);
  if (error) { alerta('Não foi possível trocar o proprietário: ' + error.message); return; }
  await carregarFicha();           // a troca entra no histórico como qualquer campo
}

/**
 * O caminho de volta: texto do campo → UTC do banco.
 *
 * O <input type="datetime-local"> tem precisão de MINUTO; o banco guarda
 * segundos e fração. Salvar sem tocar no campo devolvia 11:25:00 onde
 * havia 11:25:00.17433 — valor certo, mas uma "alteração" que ninguém
 * fez, e uma linha de histórico a cada salvamento. Quando o minuto é o
 * mesmo, o valor original volta inteiro.
 *
 * Encontrado em 31/07/2026 pelo próprio histórico, no dia seguinte ao
 * de ele existir — junto com a deriva de fuso que ele já tinha achado.
 */
function datahoraParaBanco(bruto, original) {
  if (!bruto) return null;
  const novo = new Date(bruto);
  if (isNaN(novo.getTime())) return null;
  if (original) {
    const antigo = new Date(original);
    if (!isNaN(antigo.getTime()) && paraCampoLocal(antigo) === paraCampoLocal(novo)) {
      return original;
    }
  }
  return novo.toISOString();
}

/**
 * UTC do banco → o texto que um <input type="datetime-local"> espera,
 * já no fuso de quem está olhando. O caminho de volta continua sendo o
 * `new Date(valor).toISOString()` de sempre, que agora fecha a conta:
 * o campo passa a conter hora local de verdade.
 */
function paraCampoLocal(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return '';
  const dd = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + dd(d.getMonth() + 1) + '-' + dd(d.getDate()) +
         'T' + dd(d.getHours()) + ':' + dd(d.getMinutes());
}

/**
 * ÚLTIMOS ACESSADOS (v1.120) — alimenta a faixa da Home.
 *
 * Fica no navegador de propósito: é preferência de quem está usando, não
 * dado da imobiliária. Não custa tabela, não custa consulta, e não vaza
 * nome de cliente para outro usuário da mesma máquina — some com o
 * histórico do navegador. Cinco registros, sem repetir, o mais recente
 * primeiro; sem botão de salvar nem de fixar, como manda a especificação.
 */
function registrarAcessoRecente() {
  try {
    if (!registro || !ID) return;
    const rotulo = {
      lead: 'Lead', contato: 'Contato', imovel: 'Imóvel',
      contrato: 'Contrato', caso: 'Caso', sinistro: 'Sinistro',
      competencia: 'Aluguel',  // v1.182: a parcela entra nos recentes
      plano: 'Plano de ação', acao: 'Ação',   // v1.241
      ficha: 'Ficha'                          // v1.284
    }[ALVO];
    if (!rotulo) return;
    const item = {
      tipo: rotulo,
      titulo: String(DEF.titulo(registro) || '').slice(0, 70),
      url: ALVO + '.html?id=' + ID   // lead.html, contato.html, imovel.html…
    };

    // v1.124 — A MESMA CONTA SERVE AO FAVORITO.
    // Tipo, título e endereço já estão calculados aqui; o favorito
    // precisa exatamente disso. `window.FAVORITO` é o recado que a tela
    // deixa para o cabeçalho — sem ele a estrela favoritaria "Imóveis",
    // o objeto inteiro, em vez daquele imóvel.
    window.FAVORITO = {
      tipo: 'registro',
      objeto: (DEF.lista || '').replace('.html', ''),
      rotulo: item.titulo,
      url: item.url
    };
    if (typeof atualizarEstrela === 'function') atualizarEstrela();

    const chave = 'crm_recentes';
    let lista = [];
    try { lista = JSON.parse(localStorage.getItem(chave) || '[]'); } catch (e) { lista = []; }
    lista = lista.filter(i => i && i.url !== item.url);
    lista.unshift(item);
    localStorage.setItem(chave, JSON.stringify(lista.slice(0, 5)));
  } catch (e) {
    // modo anônimo ou armazenamento cheio: a Home só mostra o estado vazio
  }
}

/**
 * (Lead, v1.118) A DICA DA ETAPA, onde a pessoa está trabalhando.
 *
 * O texto vem do cadastro (Administração → Funil e réguas), então quem
 * conhece a operação escreve a orientação — não o programador. Mostra
 * também quantos dias o lead está parado nesta etapa e quando é o
 * próximo contato, que é a régua do funil em ação.
 */
// ------------------------------------------------------------
// CAMINHO DE ETAPAS DO LEAD (v1.123)
//
// A mesma barra dos Casos, com três diferenças que vêm do funil ser
// configurável (v1.118):
//
//   • as etapas saem do CADASTRO, não do código — renomear uma etapa em
//     Administração muda a barra sozinho, sem publicação;
//   • cada tipo de lead tem o seu funil (o inquilino passa por análise
//     de fiança; o proprietário, não);
//   • "Perdido" NÃO entra na fila. Perder não é a etapa seguinte de
//     Proposta — é uma saída que pode acontecer em qualquer ponto. A
//     barra mostra ONDE o lead parou ("Perdido em Em análise"), que é a
//     informação que interessa: onde o negócio morre.
// ------------------------------------------------------------
function caminhoEtapasLead() {
  if (typeof etapasDoCaminho !== 'function') return '';
  const tipo = registro.tipo_lead || 'Inquilino';
  const etapas = etapasDoCaminho(tipo);
  if (!etapas.length) return '';

  const desfecho = etapaDesfecho(tipo, registro.status);

  // ---- lead perdido: o caminho para onde ele parou ----
  // v1.441 — as etapas moram num envoltório próprio (.path-etapas):
  // no computador ele é invisível (mesmo flex de sempre); no celular é
  // ele que ROLA de lado, enquanto os botões ficam embaixo, parados —
  // o trilho do mockup de 30/08.
  if (desfecho === 'perda') {
    const parou = registro.etapa_anterior;
    const ate = parou ? etapas.indexOf(parou) : -1;
    const feitas = ate >= 0 ? etapas.slice(0, ate) : [];
    return `<div class="path"><div class="path-etapas">
      ${feitas.map(e => `<div class="et feita">${htm(e)}</div>`).join('')}
      <div class="et perdida">✕ ${htm(registro.status)}${
        parou ? ' em ' + htm(parou) : ''}</div>
    </div></div>` + faixaDaPerda();
  }

  // ---- caminho normal ----
  const i = etapas.indexOf(registro.status);
  const proxima = etapas[i + 1];
  const saida = (typeof etapasDeSaida === 'function' ? etapasDeSaida(tipo) : [])[0];
  const ganhou = desfecho === 'ganho';

  return `<div class="path">
    <div class="path-etapas">${etapas.map((e, k) => {
      const classe = ganhou && k === etapas.length - 1 ? 'ganha'
        : (k < i ? 'feita' : (k === i ? 'atual' : ''));
      const marca = (ganhou && k === etapas.length - 1) ? '✓ ' : '';
      return `<div class="et ${classe}">${marca}${htm(e)}</div>`;
    }).join('')}</div>
    ${(proxima || saida) ? `<div class="path-saida">
      ${proxima ? `<button class="btn btn-verde" data-perm="leads:editar"
         onclick="avancarEtapaLead('${jsq(proxima)}')">✓ Avançar para ${htm(proxima)}</button>` : ''}
      ${saida && !ganhou ? `<button class="btn btn-claro btn-saida" data-perm="leads:editar"
         onclick="abrirMarcarPerdido('${jsq(saida)}')">✕ Marcar ${htm(saida.toLowerCase())}</button>` : ''}
    </div>` : ''}
  </div>`;
}

/** O rodapé do lead perdido: motivo e quando (v1.330: virou a faixa
 *  cinza de arquivo, com o destravar — o desenho do mockup aprovado). */
function faixaDaPerda() {
  const quando = registro.status_desde
    ? dataBr(String(registro.status_desde).slice(0, 10)) : null;
  return `<div class="faixa-lead-encerrado perdido">
    <div class="titulo">${icone('arquivar', 14)} Lead perdido — encerrado sem conversão
      <span class="quando">${quando ? 'em ' + htm(quando) : ''}${
        registro.motivo_perda ? (quando ? ' · ' : '') + 'motivo: ' + htm(registro.motivo_perda) : ''}</span></div>
    <div class="partes">${botaoDestravarLead()}</div>
  </div>`;
}

// ------------------------------------------------------------
// v1.330 — LEAD ENCERRADO VIRA ARQUIVO (padrão Salesforce)
//
// Etapa com `encerra` (Convertido, Perdido, Visita ao imóvel) fecha o
// lead: o trabalho continua no contato e no imóvel, e a ficha vira
// consulta — somem o Editar, o ✎ dos grupos e os botões que geram
// trabalho novo. Nada é apagado: os dados ficam para os indicadores.
// O 🔓 da faixa (permissão de editar leads) devolve os botões até a
// ficha ser fechada — corrigir engano sem abrir brecha no dia a dia.
// ------------------------------------------------------------
let leadDestravado = false;

/** O lead está numa etapa que encerra o funil? */
function leadEncerrado() {
  return ALVO === 'lead' && !!registro
    && typeof etapaEncerra === 'function'
    && etapaEncerra(registro.tipo_lead || 'Inquilino', registro.status);
}

/** Encerrado E ainda não destravado — é o que esconde os botões. */
function leadTravado() {
  return leadEncerrado() && !leadDestravado;
}

function destravarLeadEncerrado() {
  leadDestravado = true;
  desenharFicha();
}

/** O 🔓 da faixa — ou a marca de já destravada. */
function botaoDestravarLead() {
  if (leadDestravado) {
    return '<span class="destravado">' + icone('cadeadoAberto', 12) + ' destravada para correção até fechar a ficha</span>';
  }
  return `<button class="destravar" data-perm="leads:editar"
    onclick="destravarLeadEncerrado()">${icone('cadeadoAberto', 13)} Destravar para corrigir</button>`;
}

/** A faixa verde do lead que fechou GANHANDO: aponta para o contato e,
 *  quando a captação criou, para o(s) imóvel(is). A perda tem a faixa
 *  própria (faixaDaPerda, pendurada no caminho de etapas). */
function faixaLeadEncerrado() {
  if (!leadEncerrado()) return '';
  const tipo = registro.tipo_lead || 'Inquilino';
  if (etapaDesfecho(tipo, registro.status) !== 'ganho') return '';

  const quando = (registro.convertido_em || registro.status_desde || '');
  const imoveis = (relacionados || []).filter(r => r.imovel_id);
  const titulo = registro.contato_id
    ? (imoveis.length
        ? '✓ Captação concluída — o cadastro agora é o contato e o imóvel'
        : '✓ Lead convertido — o cadastro agora é o contato')
    : '✓ Lead ganho — funil encerrado';
  const parte = (ico, rotulo, linkHtml) => `
    <div class="parte"><span class="ico">${ico}</span>
      <div><span class="r">${rotulo}</span><div class="v">${linkHtml}</div></div>
    </div>`;

  return `<div class="faixa-lead-encerrado">
    <div class="titulo">${titulo}
      ${quando ? `<span class="quando">em ${htm(dataBr(String(quando).slice(0, 10)))}</span>` : ''}</div>
    <div class="partes">
      ${registro.contato_id ? parte(icone('pessoa', 16), 'Contato',
        `<a href="contato.html?id=${encodeURIComponent(registro.contato_id)}"
           data-fle="contato">abrir contato</a>`) : ''}
      ${imoveis.map(r => parte(icone('casa', 16), 'Imóvel',
        `<a href="imovel.html?id=${encodeURIComponent(r.imovel_id)}"
           data-fle="imovel" data-id="${encodeURIComponent(r.imovel_id)}">abrir imóvel</a>`)).join('')}
      ${botaoDestravarLead()}
    </div>
  </div>`;
}

/** Troca os "abrir contato"/"abrir imóvel" da faixa pelo nome e código
 *  de verdade — depois do desenho, sem segurar a ficha. Se a consulta
 *  falhar (máscara de papel, rede), o link genérico continua valendo. */
async function preencherFaixaLeadEncerrado() {
  const caixa = document.querySelector('.faixa-lead-encerrado');
  if (!caixa) return;
  const aC = caixa.querySelector('a[data-fle="contato"]');
  if (aC && registro.contato_id) {
    const { data } = await sb.from('contatos').select('codigo,nome')
      .eq('id', registro.contato_id).single();
    if (data && (data.nome || data.codigo)) {
      aC.textContent = [data.nome, data.codigo].filter(Boolean).join(' · ');
    }
  }
  for (const a of caixa.querySelectorAll('a[data-fle="imovel"]')) {
    const { data } = await sb.from('imoveis').select('codigo,endereco')
      .eq('id', decodeURIComponent(a.dataset.id)).single();
    if (data && (data.endereco || data.codigo)) {
      a.textContent = [data.endereco, data.codigo].filter(Boolean).join(' · ');
    }
  }
}

/**
 * Avança uma etapa em um clique — o ganho real desta versão: sem abrir
 * Editar, achar o campo e salvar. A régua do banco (v1.118) reage na
 * hora e agenda o próximo contato com o prazo da etapa nova.
 */
async function avancarEtapaLead(nova) {
  const b = document.querySelector('.path-saida .btn-verde');
  if (b) { b.disabled = true; b.textContent = 'Avançando…'; }
  const linha = { status: nova };
  // entrar numa etapa de ganho limpa o motivo de perda, se havia
  if (etapaDesfecho(registro.tipo_lead || 'Inquilino', nova) === 'ganho') linha.motivo_perda = null;
  const { error } = await sb.from('leads').update(linha).eq('id', ID);
  if (error) { alerta('Não foi possível avançar: ' + error.message); if (b) b.disabled = false; return; }
  await carregarFicha();
}

/** Sair do caminho exige dizer por quê — é o que alimenta a análise de perda. */
function abrirMarcarPerdido(saida) {
  const motivos = (((DEFS.lead.campos) || []).find(c => c.c === 'motivo_perda') || {}).op
    || ['', 'Desistiu', 'Alugou com outro', 'Sem retorno', 'Fora do perfil', 'Duplicado', 'Outro'];
  abrirAcao(`Marcar ${saida.toLowerCase()} — ${DEF.titulo(registro)}`, [
    { n: 'motivo', r: 'Motivo da perda', t: 'select', op: motivos.filter(Boolean), largo: true },
    { n: 'obs', r: 'Observação (opcional)', t: 'textarea' }
  ], async () => {
    const motivo = valorAcao('motivo');
    const obs = valorAcao('obs');
    const linha = { status: saida, motivo_perda: motivo || null };
    if (obs) {
      linha.observacoes = (registro.observacoes ? registro.observacoes + '\n' : '') +
        `[perdido] ${obs}`;
    }
    const { error } = await sb.from('leads').update(linha).eq('id', ID);
    if (error) throw error;
  }, '✕ Marcar ' + saida.toLowerCase());
}

function faixaAjudaEtapa() {
  if (ALVO !== 'lead' || !registro) return '';
  const tipo = registro.tipo_lead || 'Inquilino';
  const ajuda = (calculados && calculados.etapa_ajuda) ||
    (typeof ajudaDaEtapa === 'function' ? ajudaDaEtapa(tipo, registro.status) : '');
  if (!ajuda) return '';

  const dias = calculados ? calculados.dias_na_etapa : null;
  const prox = calculados ? calculados.proximo_contato : null;
  const encerrou = typeof etapaEncerra === 'function' && etapaEncerra(tipo, registro.status);
  const partes = [];
  if (dias !== null && dias !== undefined) {
    partes.push(dias === 0 ? 'entrou nesta etapa hoje' : `nesta etapa há ${dias} dia(s)`);
  }
  if (!encerrou) {
    partes.push(prox ? `próximo contato ${dataBr(String(prox).slice(0, 10))}`
                     : 'sem próximo contato marcado');
  }
  return `<div class="ajuda-etapa">
    <b>${htm(registro.status || 'Etapa')}</b> — ${htm(ajuda)}
    ${partes.length ? `<span class="det">${htm(partes.join(' · '))}</span>` : ''}
  </div>`;
}

// ------------------------------------------------------------
// 4) FAIXA DE ATIVIDADE (a "lista lateral de tarefas")
// ------------------------------------------------------------
function linhaTarefa(t, cor) {
  const feita = t.status === 'Concluída';
  // v1.308 — CANCELADA. A tarefa que não vai acontecer (o lead virou
  // Perdido, a visita caiu) fecha por aqui, e não por "Concluída":
  // concluir carimba `concluida_em`, e a leads_painel tira dali último
  // contato e temperatura — o lead perdido apareceria como contatado
  // hoje. Ela some da agenda e das tarefas do dia (que filtram
  // 'Aberta'), mas fica nesta faixa, riscada, com o motivo na
  // descrição. O ↺ devolve para aberta.
  const cancelada = t.status === 'Cancelada';
  const prazo = feita
    ? 'Concluída em ' + dataBr((t.concluida_em || '').slice(0, 10))
    : cancelada
      ? (t.vencimento ? 'Cancelada — vencia ' + dataBr(t.vencimento) : 'Cancelada')
      : (t.vencimento ? dataBr(t.vencimento) : 'sem prazo');
  // v1.460 — quem aparece aqui é o DONO da tarefa (o e-mail saiu do
  // banco); sem equipe carregada ainda, a linha fica só com o código
  const donoT = (typeof EQUIPE_POR_ID !== 'undefined' && t.proprietario_id)
    ? EQUIPE_POR_ID[t.proprietario_id] : null;
  const meta = [htm(t.codigo || ''), donoT ? htm(String(donoT.nome).split(' ')[0]) : null]
    .filter(Boolean).join(' · ');
  return `
  <div class="task-row ${feita || cancelada ? 'feita' : ''}" id="tr-${t.id}">
    <button class="cb ${feita ? 'on' : ''}" title="${feita || cancelada ? 'Reabrir' : 'Concluir'}"
      onclick="alternar('${t.id}')">${feita ? '✓' : (cancelada ? '↺' : '')}</button>
    <span class="tp" title="${htm(t.tipo)}">${ICONE[t.tipo] || icone('prancheta', 13)}</span>
    <div class="tx" onclick="editarTarefa('${t.id}')">
      <div class="tt">${htm(t.assunto)}
        ${t.prioridade === 'Alta' && !cancelada ? '<span class="tag tag-vermelha">Alta</span>' : ''}
        ${cancelada ? '<span class="tag tag-cinza">Cancelada</span>' : ''}</div>
      <div class="tm"><span class="due ${cor}">${htm(prazo)}</span>${t.lembrete_em && !cancelada ? ' ⏰' : ''}
        ${meta ? ' · ' + meta : ''}</div>
      ${!feita && String(t.descricao || '').trim()
        ? `<div class="tm" title="${htm(t.descricao)}">${icone('papelCaneta', 11)} ${htm(String(t.descricao).slice(0, 120))}${
            String(t.descricao).length > 120 ? '…' : ''}</div>` : ''}
    </div>
    <button class="del" title="Excluir tarefa" onclick="pedirExclusao('${t.id}')">✕</button>
    <span class="conf">Excluir?
      <button class="sim" onclick="excluirTarefa('${t.id}')">Sim</button>
      <button class="nao" onclick="cancelarExclusao('${t.id}')">Não</button></span>
  </div>`;
}

function desenharFaixa() {
  const hoje = hojeISO();
  const abertas = tarefasFicha.filter(t => t.status === 'Aberta');
  const feitas = tarefasFicha.filter(t => t.status === 'Concluída')
    .sort((a, b) => (b.concluida_em || '').localeCompare(a.concluida_em || ''));
  // v1.308 — as canceladas ficam no fim, num grupo só. Sem isto elas
  // sumiriam da faixa inteira (não são nem 'Aberta' nem 'Concluída') e
  // a visita cancelada viraria um buraco na história do lead.
  const canceladas = tarefasFicha.filter(t => t.status === 'Cancelada');

  const grupos = [
    ['ATRASADAS', abertas.filter(t => t.vencimento && t.vencimento < hoje), 'late'],
    ['HOJE', abertas.filter(t => t.vencimento === hoje), 'warn'],
    ['PRÓXIMAS', abertas.filter(t => t.vencimento && t.vencimento > hoje), 'ok'],
    ['SEM PRAZO', abertas.filter(t => !t.vencimento), '']
  ].filter(g => g[1].length);

  let html = `
    <h2>Atividade <span class="cnt">(${abertas.length} aberta${abertas.length === 1 ? '' : 's'})</span></h2>
    <div class="barra-acoes">
      <button onclick="registrarLigacao()">${icone('telefone', 13)} Registrar ligação</button>
      <button onclick="novaTarefa()">+ Nova tarefa</button>
    </div>`;

  if (!tarefasFicha.length) {
    html += '<div class="vazio-faixa">Nenhuma atividade ainda.</div>';
  } else {
    html += grupos.map(([titulo, lista, cor]) => `
      <div class="grupo-cab ${cor}">${titulo} (${lista.length})</div>
      ${lista.map(t => linhaTarefa(t, cor)).join('')}`).join('');

    if (feitas.length) {
      const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      let mesAtual = '';
      const corpo = feitas.slice(0, 30).map(t => {
        const d = (t.concluida_em || '').slice(0, 10);
        const rot = d ? `${MES[parseInt(d.slice(5, 7), 10) - 1]}/${d.slice(0, 4)}` : 'sem data';
        const cab = rot !== mesAtual ? `<div class="mes">${rot}</div>` : '';
        mesAtual = rot;
        return cab + linhaTarefa(t, 'done');
      }).join('');
      html += `<div class="grupo-cab ok">CONCLUÍDAS (${feitas.length})</div>${corpo}`;
    }

    if (canceladas.length) {
      html += `<div class="grupo-cab">CANCELADAS (${canceladas.length})</div>` +
        canceladas.slice(0, 15).map(t => linhaTarefa(t, '')).join('');
    }
  }
  html += `<div class="rodape-faixa"><a href="tarefas.html">Ver todas as tarefas ›</a></div>`;
  /* v1.236 — O CARTÃO PODE NÃO ESTAR NA TELA.
   *
   * Desde a v1.235 a Atividade é um cartão como os outros, e o layout
   * pode tirá-la da ficha. Esta linha era a única do arquivo que
   * escrevia num cartão sem conferir se ele existe — e derrubava a
   * ficha inteira ("Cannot set properties of null") no primeiro save de
   * um layout sem Atividade. As irmãs dela (histórico, portal) já
   * conferiam; esta ficou para trás.
   *
   * Sair calada é o certo: quem tirou o cartão do layout tirou de
   * propósito, e as tarefas continuam na tela de Tarefas. */
  const faixa = document.getElementById('faixa-atividade');
  if (!faixa) return;
  faixa.innerHTML = html;
}

// ---------- concluir / reabrir ----------
async function alternar(id) {
  const t = tarefasFicha.find(x => x.id === id);
  if (!t) return;
  const feita = t.status === 'Concluída';

  // v1.308 — cancelada volta direto para aberta. Precisa vir ANTES do
  // bloco da v1.166: sem isto, o ↺ de uma visita cancelada cairia na
  // janela de "o que tratar na próxima" e a tarefa seria CONCLUÍDA —
  // exatamente a mentira que o cancelamento existe para evitar.
  if (t.status === 'Cancelada') {
    const { error } = await sb.from('tarefas').update(
      { status: 'Aberta', concluida_em: null }).eq('id', id);
    if (error) { alerta('Não foi possível reabrir: ' + error.message); return; }
    await recarregarTarefas();
    return;
  }

  // v1.166: concluir um follow-up de LEAD pergunta o que tratar na
  // próxima — a régua do banco vai criar o próximo passo, e é agora
  // que a pessoa sabe o que combinou. Reabrir e tarefas comuns seguem
  // no clique direto de sempre.
  if (!feita && ALVO === 'lead' && ['Ligação', 'Visita'].includes(t.tipo)) {
    abrirAcao(`Concluir: ${t.assunto || t.codigo || 'tarefa'}`, [
      { n: 'nota', r: 'O que tratar na próxima? (opcional)', t: 'textarea', largo: true,
        v: '', dica: 'em branco, o próximo follow-up herda o comentário desta' }
    ], async () => {
      const { error } = await sb.from('tarefas').update(
        { status: 'Concluída', concluida_em: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      await plantarNotaNaProxima(valorAcao('nota') || '', t);
    }, '✓ Concluir');
    return;
  }
  const { error } = await sb.from('tarefas').update(
    feita ? { status: 'Aberta', concluida_em: null }
          : { status: 'Concluída', concluida_em: new Date().toISOString() }).eq('id', id);
  if (error) { alerta('Não foi possível atualizar: ' + error.message); return; }
  await recarregarTarefas();
}

/**
 * v1.166 — planta a nota no follow-up que a régua do banco acabou de
 * criar. Regra aprovada: nota digitada manda; em branco, o próximo
 * HERDA o comentário da tarefa concluída (pior que sem nota é perder a
 * nota que existia). Só toca em tarefa recém-nascida (2 minutos) e
 * nunca sobrescreve nota que o próximo já tenha.
 */
async function plantarNotaNaProxima(nota, concluida) {
  try {
    if (ALVO !== 'lead') return;
    if (!['Ligação', 'Visita'].includes(concluida.tipo || '')) return;
    const texto = (nota || '').trim();
    const heranca = String(concluida.descricao || '').trim();
    if (!texto && !heranca) return;
    const { data } = await sb.from('tarefas')
      .select('id,descricao,criado_em')
      .eq('lead_id', ID).eq('status', 'Aberta').eq('tipo', 'Ligação')
      .order('criado_em', { ascending: false }).limit(1);
    const prox = data && data[0];
    if (!prox) return;
    const idade = Date.now() - new Date(prox.criado_em).getTime();
    if (!(idade >= 0 && idade < 2 * 60 * 1000)) return;
    if (texto) {
      await sb.from('tarefas').update({ descricao: texto }).eq('id', prox.id);
    } else if (!String(prox.descricao || '').trim()) {
      await sb.from('tarefas').update({ descricao: heranca }).eq('id', prox.id);
    }
  } catch (e) {
    console.warn('[nota do próximo follow-up]', e.message || e);
  }
}

// ---------- excluir com confirmação na própria linha ----------
function pedirExclusao(id) {
  document.querySelectorAll('.task-row.perguntando').forEach(l => l.classList.remove('perguntando'));
  const l = document.getElementById('tr-' + id);
  if (l) l.classList.add('perguntando');
}
function cancelarExclusao(id) {
  const l = document.getElementById('tr-' + id);
  if (l) l.classList.remove('perguntando');
}
async function excluirTarefa(id) {
  const { error } = await sb.from('tarefas').delete().eq('id', id);
  if (error) { alerta('Não foi possível excluir: ' + error.message); return; }
  const l = document.getElementById('tr-' + id);
  if (l) { l.style.transition = 'opacity .18s'; l.style.opacity = 0; }
  setTimeout(recarregarTarefas, 180);
}

async function recarregarTarefas() {
  const filtro = DEF.fk;
  const { data } = await sb.from('tarefas').select('*').eq(filtro, ID)
    .order('vencimento', { ascending: true, nullsFirst: false });
  tarefasFicha = data || [];
  desenharFaixa();
  // os chips do cabeçalho mostram contagem de tarefas: precisam acompanhar
  const caixa = document.querySelector('.chips');
  if (caixa) caixa.innerHTML = htmlDosChips();   // v1.270 — mesmo template do desenho
  // A régua de follow-up saiu daqui na v1.118: agora é gatilho no BANCO
  // (lead_agendar_proximo_contato), então o próximo passo nasce mesmo que
  // ninguém abra esta ficha — furo que a versão da tela tinha.
}

/**
 * v1.389 — como um contrato se apresenta no campo Contrato do caso:
 * "CON-0075 · COLOMBIA, 100". O encerrado é marcado, para ninguém
 * escolher o contrato errado num imóvel que já teve dois.
 */
function rotuloContrato(c2) {
  if (!c2) return '';
  const i = (listaImoveis || []).find(x => x.id === c2.imovel_id);
  return (c2.codigo || '(contrato)')
       + (i && i.endereco ? ' · ' + i.endereco : '')
       + (c2.data_encerramento ? ' (encerrado)' : '');
}

function alerta(msg) {
  const e = document.getElementById('modal-erro');
  if (e) { e.textContent = msg; e.style.display = 'block'; } else { console.error(msg); }
}

// ------------------------------------------------------------
// JANELA DE AÇÃO (v1.107) — para o que NÃO é edição de registro:
// renovar apólice, aplicar reajuste, acionar seguro, lançar exigência,
// deferir, registrar recebimento.
//
// Cada uma dessas ações é uma FUNÇÃO do banco, que faz várias coisas
// numa transação só (grava, muda etapa e escreve no histórico). A tela
// só junta os campos e chama — assim a regra vive num lugar só e vale
// também para quem chamar por SQL.
// ------------------------------------------------------------
let acaoAtual = null;

function abrirAcao(titulo, campos, aoConfirmar, textoBotao) {
  acaoAtual = aoConfirmar;
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-campos').innerHTML = campos.map(c => {
    const id = 'ac-' + c.n;
    // v1.205 — 'aviso' é texto explicativo, não campo. Antes o jeito de
    // avisar era um <select> de uma opção só ("Entendi — pode tirar"),
    // que a pessoa lia como pergunta e o teclado tratava como escolha.
    if (c.t === 'aviso') return `<div class="campo largo" id="${id}"
      style="font-size:13px;line-height:1.6;color:var(--texto-suave)">${htm(c.r)}</div>`;
    if (c.t === 'textarea') return `<div class="campo largo"><label>${htm(c.r)}</label>
      <textarea id="${id}">${htm(c.v || '')}</textarea></div>`;
    if (c.t === 'select') return `<div class="campo ${c.largo ? 'largo' : ''}"><label>${htm(c.r)}</label>
      <select id="${id}">${c.op.map(o => `<option${o === c.v ? ' selected' : ''}>${htm(o)}</option>`).join('')}</select></div>`;
    const tipo = c.t === 'data' ? 'date' : (c.t === 'moeda' || c.t === 'numero' ? 'number' : 'text');
    return `<div class="campo ${c.largo ? 'largo' : ''}"><label>${htm(c.r)}</label>
      <input id="${id}" type="${tipo}" ${c.t === 'moeda' ? 'step="0.01" min="0"' : ''}
        ${c.dica ? `placeholder="${htm(c.dica)}"` : ''} value="${htm(c.v == null ? '' : String(c.v))}"></div>`;
  }).join('');
  document.getElementById('modal-erro').style.display = 'none';
  const b = document.getElementById('btn-salvar');
  b.textContent = textoBotao || 'Confirmar';
  b.setAttribute('onclick', 'confirmarAcao()');
  b.disabled = false;
  document.getElementById('modal').classList.add('aberto');
}

/** O ELEMENTO de um campo da janela de ação — par do valorAcao.
 *  Declarada como function de propósito: a conferência estrutural
 *  rastreia atalhos `const x = id => getElementById(id)` e cobraria
 *  os nomes dos campos como ids de tela; o id real nasce de 'ac-' +
 *  nome dentro do abrirAcao, como aqui. */
function elementoAcao(n) { return document.getElementById('ac-' + n); }

function valorAcao(n) {
  const el = document.getElementById('ac-' + n);
  if (!el) return null;
  const v = String(el.value || '').trim();
  return v === '' ? null : v;
}

async function confirmarAcao() {
  const b = document.getElementById('btn-salvar');
  b.disabled = true;
  try {
    await acaoAtual();
    fecharModal();
    await carregarFicha();
  } catch (e) {
    // A mensagem do banco já vem em português — as travas foram escritas
    // para serem lidas por gente, não por programador.
    alerta(e.message || String(e));
  } finally {
    b.disabled = false;
  }
}

function erroSe(cond, msg) { if (cond) throw new Error(msg); }

/** Aviso simples na janela, quando algo impede a ação de começar. */
function avisar(titulo, msg) {
  acaoAtual = async () => {};
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-campos').innerHTML =
    `<div class="campo largo" style="font-size:14px;line-height:1.6">${htm(msg)}</div>`;
  document.getElementById('modal-erro').style.display = 'none';
  const b = document.getElementById('btn-salvar');
  b.textContent = 'Entendi';
  b.setAttribute('onclick', 'fecharModal()');
  b.disabled = false;
  document.getElementById('modal').classList.add('aberto');
}

/**
 * BLINDAGEM DAS AÇÕES (lição do M24, aplicada de propósito).
 *
 * As funções abaixo são `async` e são chamadas direto do onclick. Se uma
 * delas lançar — apólice sem seguradora, banco fora do ar, permissão —
 * o erro viraria uma PROMESSA REJEITADA sem tratamento: o clique morre
 * em silêncio e a pessoa acha que o botão está quebrado. Foi assim que o
 * cadastro de imóvel parou de salvar sem dar mensagem.
 *
 * `protegida()` envolve cada uma e transforma qualquer erro em aviso na
 * tela. Nenhuma ação nova pode ser ligada a um onclick sem passar por
 * aqui.
 */
function protegida(fn, titulo) {
  return async function (...args) {
    try { await fn.apply(null, args); }
    catch (e) { avisar(titulo || 'Não foi possível continuar', e.message || String(e)); }
  };
}

// --- apólice ------------------------------------------------
// --- corrigir apólice ---------------------------------------
// EXISTE POR UM DEFEITO DE ORIGEM, e vale escrever aqui por quê.
//
// Na importação de 29/07 a planilha não tinha as datas reais das
// apólices — só o aniversário do contrato. Eu preenchi `fim_vigencia`
// com essa data e `inicio_vigencia` com ela menos 12 meses, deixando o
// aviso no campo de observações. Ou seja: as 64 apólices do CRM têm
// vigência ESTIMADA, e o alerta de renovação toca no dia do contrato, não
// no dia da apólice. Imóvel sem cobertura por diferença de datas é
// exatamente o risco que o alerta deveria eliminar.
//
// Havia botão de Renovar e de Acionar, e nenhum de corrigir — para um
// dado que precisa ser conferido 64 vezes, isso era desenho errado.
//
// A SEGURADORA É UM SELETOR, não um campo livre, de propósito: os prazos
// por seguradora são achados comparando o NOME da apólice com o nome do
// cadastro. Nome digitado à mão ("Porto" x "Porto Seguro") não casa, e a
// sugestão de prazo falha em silêncio na hora de abrir um sinistro.

/**
 * v1.226 — CADASTRAR APÓLICE. Mockup aprovado em 09/08/2026.
 *
 * Existe por uma falta constrangedora: as 64 apólices vieram todas da
 * importação de 27/07 e NUNCA houve caminho pela tela para criar uma.
 * A única escrita em contrato_seguros era um update. Uma imobiliária
 * nova entrava com zero apólices e não conseguia cadastrar a primeira.
 *
 * A janela é a do Corrigir com dois campos a mais na frente — o TIPO
 * (que só existia porque veio da planilha) e a pergunta do item da
 * cobrança. Os campos que não servem ao tipo escolhido SAEM da
 * janela em vez de ficarem cinza: fiança é mensal enquanto o contrato
 * durar, incêndio é parcelado.
 */
function _abrirNovaApolice(tipoEscolhido) {
  const tipo = tipoEscolhido || TIPOS_APOLICE[0];
  const inc = ehIncendio(tipo);
  const nomes = (seguradorasFicha || []).map(x => x.nome);
  const planos = (modalidadesFianca || []).map(m => m.nome);

  const campos = [
    { n: 'tipo', r: 'Tipo de seguro', t: 'select', largo: true,
      op: TIPOS_APOLICE, v: tipo },
    ...(nomes.length
      ? [{ n: 'seguradora', r: 'Seguradora', t: 'select', largo: true,
           op: [''].concat(nomes), v: '' }]
      : [{ n: 'seguradora', r: 'Seguradora', t: 'texto', largo: true, v: '',
           dica: 'cadastre em Administração → Seguradoras para ligar prazos e dia de corte' }]),
    { n: 'apolice', r: 'Número da apólice', t: 'texto', v: '', dica: 'como está no documento' },
    ...((!inc && planos.length)
      ? [{ n: 'plano', r: 'Plano', t: 'select', op: [''].concat(planos), v: '' }]
      : [{ n: 'plano', r: 'Plano', t: 'texto', v: '' }]),
    { n: 'inicio', r: 'Início da vigência', t: 'data', v: '' },
    { n: 'fim', r: 'Fim da vigência', t: 'data', v: '', dica: 'a data que está NA APÓLICE' },
    ...(inc
      ? [{ n: 'parcela', r: 'Valor da parcela (R$)', t: 'moeda', v: '' },
         { n: 'parcelas', r: 'Nº de parcelas', t: 'numero', v: '' }]
      : [{ n: 'mensal', r: 'Valor mensal (R$)', t: 'moeda', v: '' }]),
    { n: 'comissao', r: inc ? 'Comissão da Moralí (R$/parcela)' : 'Comissão da Moralí (R$/mês)',
      t: 'moeda', v: '' },
    { n: 'comissao_pct', r: '… ou o % sobre o valor do seguro', t: 'numero', v: '', dica: 'ex.: 16' },
    ...(inc ? [] : [{ n: 'setup', r: 'Taxa de setup — uma vez (R$)', t: 'moeda', v: '' }]),
    { n: 'status', r: 'Situação', t: 'select', v: 'Vigente',
      op: ['Vigente', 'A renovar', 'Renovada', 'Encerrada', 'Cancelada'] },
    { n: 'item', r: 'Criar também o item da cobrança?', t: 'select', largo: true,
      op: ['Sim — cobrar do inquilino', 'Não, eu lanço depois'],
      v: 'Sim — cobrar do inquilino' },
    { n: 'corte', t: 'aviso', r: '' },
    { n: 'obs', r: 'Observações', t: 'textarea', largo: true, v: '' }
  ];

  abrirAcao(`Nova apólice do ${registro.codigo || 'contrato'}`, campos, async () => {
    const inicio = valorAcao('inicio'), fim = valorAcao('fim');
    erroSe(!fim, 'Sem o fim da vigência não há alerta de renovação — é o dado mais '
      + 'importante desta janela.');
    erroSe(inicio && fim && fim <= inicio, 'O fim da vigência tem que ser depois do início.');
    const nome = valorAcao('seguradora');
    const sg = (seguradorasFicha || []).find(x => x.nome === nome) || null;
    const ehInc = ehIncendio(valorAcao('tipo'));
    const mensal = ehInc ? null : valorAcao('mensal');
    const parcela = ehInc ? valorAcao('parcela') : null;
    const parcelas = ehInc ? valorAcao('parcelas') : null;
    erroSe(!mensal && !parcela, 'Informe o valor: mensal na fiança, da parcela no incêndio.');

    const linha = {
      contrato_id: ID, empresa_id: registro.empresa_id,
      tipo: valorAcao('tipo'),
      seguradora: nome, seguradora_id: sg ? sg.id : null,
      apolice: valorAcao('apolice'), plano: valorAcao('plano'),
      inicio_vigencia: inicio, fim_vigencia: fim,
      valor_mensal: mensal, valor_parcela: parcela, parcelas,
      comissao: valorAcao('comissao'), setup: ehInc ? null : valorAcao('setup'),
      status: valorAcao('status'), observacoes: valorAcao('obs')
    };
    const { data, error } = await sb.from('contrato_seguros')
      .insert(linha).select('*').maybeSingle();
    if (error) throw error;

    if (valorAcao('item') === 'Sim — cobrar do inquilino' && data)
      await criarItemDaApolice(data);
  }, '+ Cadastrar apólice');

  // trocar o tipo redesenha a janela: os campos do incêndio não fazem
  // sentido na fiança, e vice-versa
  const selTipo = elementoAcao('tipo');
  if (selTipo) selTipo.onchange = () => abrirNovaApolice(selTipo.value);

  // escolher a seguradora sugere parcelas e explica o dia de corte
  const selSeg = elementoAcao('seguradora');
  if (selSeg) selSeg.onchange = () => { sugerirDaSeguradora(); prefillComissaoNova(true); };
  const elIni = elementoAcao('inicio');
  if (elIni) elIni.onchange = () => sugerirDaSeguradora();
  // v1.447 — o plano (fiança) traz o % e o setup padrão; a seguradora, o % do incêndio
  const selPlano = elementoAcao('plano');
  if (selPlano && selPlano.tagName === 'SELECT') selPlano.onchange = () => prefillComissaoNova(true);
  ligarComissaoPct(inc ? 'parcela' : 'mensal');
  prefillComissaoNova(false);
}

/** v1.447 — pré-preenche o % (e o setup) da comissão a partir do plano
 *  da fiança ou do % de incêndio da seguradora; o R$ sai do % sobre o
 *  valor. `force` sobrescreve (troca de plano); senão só preenche vazio. */
function prefillComissaoNova(force) {
  const inc = ehIncendio(valorAcao('tipo'));
  const elPct = elementoAcao('comissao_pct');
  const elSetup = elementoAcao('setup');
  const elR = elementoAcao('comissao');
  let pct = null, setup = null;
  if (inc) {
    const sg = (seguradorasFicha || []).find(x => x.nome === valorAcao('seguradora'));
    pct = sg && sg.comissao_incendio_pct != null ? sg.comissao_incendio_pct : null;
  } else {
    const m = (modalidadesFianca || []).find(x => x.nome === valorAcao('plano'));
    if (m) {
      pct = m.comissao_pct != null ? m.comissao_pct : null;
      setup = m.vr_setup != null ? m.vr_setup : null;
    }
  }
  if (elPct && pct != null && (force || !elPct.value)) elPct.value = String(pct);
  if (elSetup && setup != null && (force || !elSetup.value)) elSetup.value = String(setup);
  const elV = elementoAcao(inc ? 'parcela' : 'mensal');
  const base = Number(String((elV && elV.value) || '').replace(',', '.')) || 0;
  const p = elPct ? Number(String(elPct.value || '').replace(',', '.')) : NaN;
  if (elR && base > 0 && Number.isFinite(p) && (force || !elR.value))
    elR.value = String(Math.round(base * p) / 100);
}

/** o que a seguradora escolhida já sabe: quantas parcelas o incêndio
 *  tem nela e em que fatura a primeira cai. Escreve na faixa de aviso
 *  da própria janela — cadastro que existe e ninguém vê é cadastro que
 *  não existe. */
function sugerirDaSeguradora() {
  const nota = elementoAcao('corte');
  if (!nota) return;
  const sg = (seguradorasFicha || []).find(x => x.nome === valorAcao('seguradora'));
  if (!sg) { nota.textContent = ''; return; }
  const ehInc = ehIncendio(valorAcao('tipo'));
  const partes = [];

  if (ehInc) {
    const p = parcelasDoIncendio({ seguradora_id: sg.id, parcelas: null });
    const elP = elementoAcao('parcelas');
    if (p && elP && !elP.value) elP.value = p;
    if (p) partes.push(`${sg.nome} parcela o incêndio em ${p}×.`);
  }
  const ini = valorAcao('inicio');
  if (sg.dia_corte && ini) {
    const mes = mesDaPrimeiraParcela({ inicio_vigencia: ini, seguradora_id: sg.id });
    partes.push(`Fecha a fatura no dia ${sg.dia_corte}, então a 1ª parcela cai em `
      + mesCurto(mes) + '.');
  } else if (!sg.dia_corte) {
    partes.push(`${sg.nome} ainda não tem dia de corte cadastrado — o mês do item `
      + 'sai pela data de início. Cadastre em Administração → Seguradoras e a conta passa a sair sozinha.');
  }
  nota.textContent = partes.join(' ');
}

/** o item da cobrança que nasce da apólice — LIGADO a ela.
 *  Antes disto o item era uma cópia: corrigir o valor da apólice não
 *  mexia no item, e ninguém ficava sabendo. */
async function criarItemDaApolice(ap) {
  const inc = ehIncendio(ap.tipo);
  const valor = Number(inc ? ap.valor_parcela : ap.valor_mensal) || 0;
  if (!valor) return;
  const { error } = await sb.from('contrato_itens').insert({
    contrato_id: ID, empresa_id: registro.empresa_id,
    nome: inc ? 'Seguro incêndio' : 'Seguro fiança',
    valor, credito: false,
    parcelas: inc ? (parcelasDoIncendio(ap) || ap.parcelas || null) : null,
    inicio_competencia: mesDaPrimeiraParcela(ap),
    contrato_seguro_id: ap.id, ativo: true,
    atualizado_em: new Date().toISOString()
  });
  if (error) throw error;
}

function _abrirEditarApolice(id) {
  const a = relacionados.find(x => x.id === id);
  if (!a) return;
  // v1.447 — a comissão vive na apólice; o % é sobre o valor do seguro
  const inc = ehIncendio(a.tipo);
  const baseVal = Number(inc ? a.valor_parcela : a.valor_mensal) || 0;
  const pctIni = (a.comissao != null && baseVal) ? Math.round(a.comissao / baseVal * 10000) / 100 : '';
  abrirAcao(`Corrigir apólice de ${a.tipo}`, [
    ...(seguradorasFicha.length
      ? [{ n: 'seguradora', r: 'Seguradora', t: 'select', largo: true,
           op: [''].concat(seguradorasFicha.map(x => x.nome)), v: a.seguradora || '' }]
      : [{ n: 'seguradora', r: 'Seguradora', t: 'texto', largo: true, v: a.seguradora,
           dica: 'cadastre as seguradoras em Administração → Seguradoras para ligar os prazos' }]),
    { n: 'apolice', r: 'Número da apólice', t: 'texto', v: a.apolice,
      dica: 'como está no documento' },
    { n: 'plano', r: 'Plano', t: 'texto', v: a.plano },
    { n: 'inicio', r: 'Início da vigência', t: 'data', v: a.inicio_vigencia },
    { n: 'fim', r: 'Fim da vigência', t: 'data', v: a.fim_vigencia,
      dica: 'a data que está NA APÓLICE' },
    { n: 'mensal', r: 'Valor mensal (R$)', t: 'moeda', v: a.valor_mensal },
    { n: 'parcela', r: 'Valor da parcela (R$)', t: 'moeda', v: a.valor_parcela },
    { n: 'parcelas', r: 'Nº de parcelas', t: 'numero', v: a.parcelas },
    { n: 'comissao', r: inc ? 'Comissão da Moralí (R$/parcela)' : 'Comissão da Moralí (R$/mês)',
      t: 'moeda', v: a.comissao },
    { n: 'comissao_pct', r: '… ou o % sobre o valor do seguro', t: 'numero', v: pctIni, dica: 'ex.: 16' },
    ...(inc ? [] : [{ n: 'setup', r: 'Taxa de setup — uma vez (R$)', t: 'moeda', v: a.setup }]),
    { n: 'status', r: 'Situação', t: 'select', v: a.status,
      op: ['Vigente', 'A renovar', 'Renovada', 'Encerrada', 'Cancelada'] },
    { n: 'obs', r: 'Observações', t: 'textarea', largo: true,
      v: /Importado da planilha/i.test(a.observacoes || '') ? '' : a.observacoes }
  ], async () => {
    const inicio = valorAcao('inicio'), fim = valorAcao('fim');
    // Duas conferências que o banco não faz e o olho deixa passar.
    if (inicio && fim && fim <= inicio)
      throw new Error('O fim da vigência tem que ser depois do início.');
    if (!fim)
      throw new Error('Sem o fim da vigência não há alerta de renovação — é o dado mais importante desta janela.');

    const { error } = await sb.from('contrato_seguros').update({
      seguradora: valorAcao('seguradora'),
      apolice: valorAcao('apolice'),
      plano: valorAcao('plano'),
      inicio_vigencia: inicio,
      fim_vigencia: fim,
      valor_mensal: valorAcao('mensal'),
      valor_parcela: valorAcao('parcela'),
      parcelas: valorAcao('parcelas'),
      comissao: valorAcao('comissao'),
      ...(inc ? {} : { setup: valorAcao('setup') }),
      status: valorAcao('status'),
      // Apaga o aviso de "vigência estimada": a partir de agora o dado
      // foi conferido por uma pessoa com a apólice na mão.
      observacoes: valorAcao('obs')
    }).eq('id', id);
    if (error) throw error;

    /* v1.226 — O ITEM ACOMPANHA A CORREÇÃO.
     *
     * Enquanto o item era cópia, corrigir R$ 198,00 para R$ 210,00 na
     * apólice deixava o inquilino pagando 198 para sempre, sem aviso
     * nenhum. Só as parcelas PREVISTAS mudam — quem já abriu está
     * congelado, e é o gatilho do banco que cuida disso. */
    const ligado = itensContrato.find(x => x.contrato_seguro_id === id);
    if (ligado) {
      const inc = ehIncendio(a.tipo);
      const novoValor = Number(inc ? valorAcao('parcela') : valorAcao('mensal')) || null;
      if (novoValor) {
        const { error: e2 } = await sb.from('contrato_itens').update({
          valor: novoValor,
          parcelas: inc ? (valorAcao('parcelas') || ligado.parcelas) : null,
          atualizado_em: new Date().toISOString()
        }).eq('id', ligado.id);
        if (e2) throw e2;
      }
    }
  }, '✎ Salvar correção');

  ligarComissaoPct(inc ? 'parcela' : 'mensal');
}

function _abrirRenovarApolice(id) {
  const a = relacionados.find(x => x.id === id);
  if (!a) return;
  const inc = ehIncendio(a.tipo);   // v1.447
  const proximo = a.fim_vigencia
    ? new Date(new Date(a.fim_vigencia + 'T12:00:00').getTime() + 86400000).toISOString().slice(0, 10) : '';
  abrirAcao(`Renovar apólice de ${a.tipo}`, [
    { n: 'apolice', r: 'Número da nova apólice', t: 'texto', v: a.apolice, dica: 'deixe igual se a seguradora manteve' },
    ...(seguradorasFicha.length
      ? [{ n: 'seguradora', r: 'Seguradora', t: 'select', largo: true,
           op: [''].concat(seguradorasFicha.map(x => x.nome)), v: a.seguradora || '' }]
      : []),
    { n: 'inicio', r: 'Início da nova vigência', t: 'data', v: proximo },
    { n: 'fim', r: 'Fim da vigência', t: 'data', dica: 'em branco = 12 meses' },
    { n: 'mensal', r: 'Valor mensal (R$)', t: 'moeda', v: a.valor_mensal },
    { n: 'parcela', r: 'Valor da parcela (R$)', t: 'moeda', v: a.valor_parcela },
    { n: 'parcelas', r: 'Nº de parcelas', t: 'numero', v: a.parcelas },
    { n: 'comissao', r: inc ? 'Comissão da Moralí (R$/parcela)' : 'Comissão da Moralí (R$/mês)',
      t: 'moeda', v: a.comissao, dica: 'a comissão da nova apólice' },
    { n: 'comissao_pct', r: '… ou o % sobre o valor do seguro', t: 'numero', v: '', dica: 'ex.: 16' },
    ...(inc ? [] : [{ n: 'setup', r: 'Taxa de setup — uma vez (R$)', t: 'moeda', v: a.setup }])
  ], async () => {
    // v1.163: a janela de CORRIGIR apólice já barrava isto; a de renovar
    // deixava passar uma vigência que termina antes de começar
    const vIni = valorAcao('inicio'), vFim = valorAcao('fim');
    erroSe(vIni && vFim && vFim <= vIni,
      'O fim da vigência tem que ser depois do início.');
    const { error } = await sb.rpc('contrato_renovar_seguro', {
      p_seguro_id: id, p_inicio: valorAcao('inicio'), p_fim: valorAcao('fim'),
      p_apolice: valorAcao('apolice'),
      p_valor_mensal: valorAcao('mensal'), p_valor_parcela: valorAcao('parcela'),
      p_parcelas: valorAcao('parcelas')
    });
    if (error) throw error;

    // v1.447 — a comissão/setup vão na apólice NOVA (a renovação a criou
    // como Vigente). Achamos a vigente deste tipo e gravamos nela.
    const { data: nova } = await sb.from('contrato_seguros').select('id')
      .eq('contrato_id', ID).eq('tipo', a.tipo).eq('status', 'Vigente')
      .order('inicio_vigencia', { ascending: false }).limit(1).maybeSingle();
    if (nova) {
      const { error: e2 } = await sb.from('contrato_seguros').update({
        comissao: valorAcao('comissao'),
        ...(inc ? {} : { setup: valorAcao('setup') })
      }).eq('id', nova.id);
      if (e2) throw e2;
    }
  }, '↻ Renovar');

  ligarComissaoPct(inc ? 'parcela' : 'mensal');
}

// --- reajuste -----------------------------------------------
/**
 * v1.311 — O PERCENTUAL PASSA A CALCULAR O VALOR.
 *
 * A janela pedia o novo valor em reais e o percentual era só anotação:
 * quem digitava "IGPM 3%" e deixava o valor como estava gravava um
 * reajuste de 1.000 → 1.000, com 3% escrito ao lado. O histórico ficava
 * certo, o aluguel não subia, e nada avisava. Aconteceu no CON-0044.
 *
 * Agora os dois campos se calculam nos dois sentidos, e o percentual
 * vem primeiro porque é o que a pessoa sabe (o índice do mês); o valor
 * é a conta. Salvar com o valor igual ao atual só passa se o percentual
 * for 0 escrito à mão — reajuste de 0% existe (IGP-M já veio negativo),
 * mas aí é escolha, não descuido.
 */
function _abrirReajuste() {
  const atual = Number(registro.valor_aluguel) || 0;
  abrirAcao('Aplicar reajuste do aluguel', [
    { n: 'pct', r: 'Percentual aplicado (%)', t: 'numero',
      dica: 'ex.: 5,32 — o valor abaixo se calcula sozinho' },
    { n: 'novo', r: 'Novo valor do aluguel (R$)', t: 'moeda',
      dica: atual ? `atual: ${moeda(atual)}` : 'não há aluguel cadastrado' },
    { n: 'quando', r: 'Aplicado em', t: 'data', v: hojeISO() },
    { n: 'obs', r: 'Observação', t: 'textarea', largo: true }
  ], async () => {
    const novo = valorAcao('novo');
    erroSe(!novo, 'Informe o percentual — ou, se preferir, o novo valor direto.');
    const pct = valorAcao('pct');

    const nNovo = Number(String(novo).replace(',', '.'));
    erroSe(!Number.isFinite(nNovo) || nNovo <= 0,
      'O novo valor do aluguel precisa ser um número maior que zero.');

    // a trava que faltava: valor igual ao atual só passa com 0% escrito
    const zeroDeProposito = pct !== null
      && Number(String(pct).replace(',', '.')) === 0;
    erroSe(atual > 0 && Math.abs(nNovo - atual) < 0.005 && !zeroDeProposito,
      `O novo valor é igual ao aluguel de hoje (${moeda(atual)}) — do jeito que está, `
      + 'nada mudaria. Digite o percentual e deixe o valor se calcular; se o reajuste '
      + 'foi mesmo de 0%, escreva 0 no percentual para confirmar.');

    const { error } = await sb.rpc('contrato_aplicar_reajuste', {
      p_contrato_id: ID, p_valor_novo: nNovo,
      // vírgula não chega aqui pelo campo (é input number), mas chegava
      // como NaN se chegasse — o replace fecha essa porta
      p_percentual: pct === null ? null : Number(String(pct).replace(',', '.')) / 100,
      p_aplicado_em: valorAcao('quando'), p_observacao: valorAcao('obs')
    });
    if (error) throw error;

    // AS PARCELAS PRECISAM SEGUIR O ALUGUEL NOVO.
    // As competências previstas se recalculam sozinhas, mas só às 6h da
    // manhã seguinte. Sem esta chamada, quem reajusta às 14h abre a lista
    // e vê os valores antigos — e conclui que o reajuste não pegou.
    // As já abertas não se mexem: a função só toca nas previstas.
    const { error: e2 } = await sb.rpc('rodar_competencias');
    if (e2) throw new Error('O aluguel foi reajustado, mas as parcelas previstas '
      + 'não foram atualizadas agora: ' + e2.message
      + ' — elas se corrigem sozinhas na virada do dia.');
  }, '＄ Aplicar');

  ligarCalculoDoReajuste(atual);
}

/**
 * v1.311 — liga os dois campos do reajuste, nos dois sentidos.
 *
 * Declarada como `function` de propósito: a conferência estrutural
 * rastreia atalhos `const x = ... getElementById(...)` e cobraria os
 * nomes como ids de tela — o id real nasce de 'ac-' + nome dentro do
 * abrirAcao. Mesmo motivo do `elementoAcao`.
 *
 * Escrever num campo por código NÃO dispara `input`, então os dois
 * `oninput` não se chamam em laço.
 */
function ligarCalculoDoReajuste(atual) {
  const elPct = elementoAcao('pct');
  const elNovo = elementoAcao('novo');
  if (!elPct || !elNovo || !(atual > 0)) return;
  const arred = v => Math.round(v * 100) / 100;
  const num = el => {
    const t = String(el.value || '').trim();
    if (t === '') return null;
    const n = Number(t.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  elPct.oninput = function () {
    const p = num(elPct);
    elNovo.value = p === null ? '' : String(arred(atual * (1 + p / 100)));
  };
  elNovo.oninput = function () {
    const n = num(elNovo);
    elPct.value = n === null ? '' : String(arred((n / atual - 1) * 100));
  };
}

/**
 * v1.447 — liga a comissão da apólice em R$ e % (nos dois sentidos).
 * A base é o valor do seguro que o inquilino paga (mensal na fiança,
 * parcela no incêndio) — lido AO VIVO, para o % acompanhar se o valor
 * mudar na mesma janela. Escrever num campo por código não dispara
 * `input`, então os dois não se chamam em laço.
 */
function ligarComissaoPct(campoValor) {
  const elR = elementoAcao('comissao');
  const elP = elementoAcao('comissao_pct');
  const elV = elementoAcao(campoValor);
  if (!elR || !elP) return;
  const arred = v => Math.round(v * 100) / 100;
  const num = el => {
    if (!el) return null;
    const t = String(el.value || '').trim();
    if (t === '') return null;
    const n = Number(t.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const base = () => num(elV) || 0;
  elR.oninput = () => { const b = base(), r = num(elR);
    elP.value = (b > 0 && r !== null) ? String(arred(r / b * 100)) : ''; };
  elP.oninput = () => { const b = base(), p = num(elP);
    elR.value = (b > 0 && p !== null) ? String(arred(b * p / 100)) : ''; };
  // mudou o valor do seguro? o R$ segue o % que já está na tela
  if (elV) elV.addEventListener('input', () => { const b = base(), p = num(elP);
    if (b > 0 && p !== null) elR.value = String(arred(b * p / 100)); });
}

// --- captação vira imóvel (v1.172) --------------------------
/**
 * O fim do ciclo da captação: o lead Proprietário "Captado" vira um
 * IMÓVEL de verdade, sem redigitar nada — endereço, canal (a origem do
 * lead) e o "quem indicou" atravessam juntos. Se o lead ainda não é
 * contato, ele vira no mesmo passo (proprietário do imóvel).
 */
function _abrirCaptarImovel() {
  const r = registro;
  const canais = ((typeof campo === 'function' && campo('leads', 'origem')) || {}).opcoes
    || ['WhatsApp', 'Site', 'Facebook', 'OLX', 'Indicação', 'Corretor', 'EEmovel',
        'Placa', 'Telefone', 'Balcão', 'Outro'];
  const jaTem = (relacionados || []).length;
  abrirAcao('Criar o imóvel captado', [
    { n: 'endereco', r: 'Endereço (nome de exibição)', t: 'texto', largo: true,
      v: r.imovel_endereco || '', dica: 'Rua, número — como vai aparecer nas listas' },
    { n: 'bairro', r: 'Bairro', t: 'texto' },
    { n: 'valor', r: 'Aluguel pedido (R$) — opcional', t: 'moeda' },
    { n: 'canal', r: 'Canal de captação', t: 'select',
      op: canais, v: canais.includes(r.origem) ? r.origem : 'Outro' },
    { n: 'aviso', r: (r.contato_id
        ? 'O imóvel nasce Disponível, com este lead como proprietário.'
        : 'O lead ainda não é contato: ele VIRA contato neste passo, como proprietário do imóvel.')
        + (jaTem ? ` Atenção: este lead já tem ${jaTem} imóvel(is) vinculado(s).` : ''),
      t: 'select', largo: true, op: ['Entendi'] }
  ], async () => {
    const endereco = valorAcao('endereco');
    erroSe(!endereco, 'O imóvel precisa do endereço.');

    // 1) o proprietário: o contato do lead (criando-o se preciso)
    let contatoId = r.contato_id;
    if (!contatoId) {
      const { data, error } = await sb.rpc('converter_lead', { p_lead_id: ID });
      if (error) throw error;
      contatoId = data;
    }

    // 2) o imóvel, com o que o lead já sabia
    const linha = {
      codigo: await proximoCodigo('IM', 'imoveis'),
      empresa_id: r.empresa_id,
      endereco: (typeof padrao === 'function') ? padrao(endereco) : endereco,
      bairro: valorAcao('bairro')
        ? ((typeof padrao === 'function') ? padrao(valorAcao('bairro')) : valorAcao('bairro'))
        : null,
      situacao: 'Disponível',
      proprietario_id: contatoId,
      canal_captacao: valorAcao('canal'),
      indicado_por: r.indicado_por || null,
      valor_aluguel: valorAcao('valor') !== null ? Number(valorAcao('valor')) : null,
      data_captacao: hojeISO()
    };
    const { data: novo, error: e2 } = await sb.from('imoveis')
      .insert(linha).select('id,codigo').single();
    if (e2) throw e2;

    // 3) o vínculo lead ↔ imóvel (se a tabela recusar, o imóvel já
    // existe — o vínculo é conforto, não requisito)
    try {
      await sb.from('lead_imoveis').insert(
        { lead_id: ID, imovel_id: novo.id, empresa_id: r.empresa_id });
    } catch (e) { console.warn('[captação] sem vínculo lead_imoveis:', e.message || e); }
  }, 'Criar imóvel');
}

// --- multa rescisória (v1.171) ------------------------------
/** meses entre duas datas, contando mês começado como inteiro —
 *  regra combinada: o texto ao cliente fala em MESES, não em dias */
function mesesEntreDatas(deISO, ateISO) {
  const [a1, m1, d1] = String(deISO).split('-').map(Number);
  const [a2, m2, d2] = String(ateISO).split('-').map(Number);
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (d2 > d1) meses += 1;          // mês começado conta inteiro
  return Math.max(meses, 0);
}

function _abrirMultaRescisoria() {
  const r = registro;
  erroSe(!r.data_inicio, 'O contrato precisa da data de início para calcular a multa.');
  const fim = r.data_fim_prevista
    || (r.prazo_meses ? somarMeses(r.data_inicio, r.prazo_meses) : null);
  erroSe(!fim, 'Preencha o Prazo (meses) ou o Fim previsto na ficha — sem um dos dois não há proporção possível.');

  abrirAcao(`Multa rescisória — ${r.codigo || 'contrato'}`, [
    { n: 'saida', r: 'Data prevista da saída', t: 'data', v: hojeISO() },
    { n: 'alugueis', r: 'Multa do contrato (nº de aluguéis)', t: 'numero',
      v: r.multa_rescisoria_alugueis != null ? r.multa_rescisoria_alugueis : 3 }
  ], async () => {
    // o botão COPIA o texto — não grava nada
    const alvo = elementoAcao('texto-multa');
    const texto = alvo ? alvo.textContent : '';
    try { await navigator.clipboard.writeText(texto); }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = texto; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); ta.remove();
    }
  }, 'Copiar texto para o cliente');

  // a memória e o texto entram DEPOIS dos campos, e recalculam ao digitar
  const caixa = document.getElementById('modal-campos');
  caixa.insertAdjacentHTML('beforeend', `
    <div class="campo largo"><label>Memória de cálculo</label>
      <div id="ac-memoria-multa" style="background:#f4f7f9;border:1px solid var(--borda);
        border-radius:8px;padding:12px 14px;font-size:13.5px;line-height:1.8"></div></div>
    <div class="campo largo"><label>Texto para o cliente (o botão abaixo copia)</label>
      <div id="ac-texto-multa" style="border:1px solid var(--borda);border-radius:8px;
        padding:12px 14px;font-size:13px;line-height:1.7;white-space:pre-line;
        max-height:200px;overflow:auto"></div></div>`);

  const recalc = () => {
    const saida = valorAcao('saida');
    const nAl = Number(valorAcao('alugueis') || 0);
    const mem = elementoAcao('memoria-multa');
    const txt = elementoAcao('texto-multa');
    if (!saida || !nAl || nAl <= 0) {
      mem.innerHTML = 'Preencha a data da saída e o nº de aluguéis.';
      txt.textContent = '';
      return;
    }
    const aluguel = Number(r.valor_aluguel || 0);
    const cheia = Math.round(aluguel * nAl * 100) / 100;
    const totalMeses = r.prazo_meses || mesesEntreDatas(r.data_inicio, fim);
    const faltam = Math.min(mesesEntreDatas(saida, fim), totalMeses);
    const cumpridos = Math.max(totalMeses - faltam, 0);

    // CARÊNCIA = PERMANÊNCIA MÍNIMA (corrigido em 18/08/2026).
    //
    // Até a v1.303 isto estava invertido: quem saía DENTRO da carência
    // pagava a multa CHEIA, e quem saía depois pagava proporcional. O
    // contrato da casa diz o contrário — a carência é o tempo mínimo que
    // o inquilino se compromete a ficar; cumprido esse tempo, a multa
    // por desistência não é devida. Quem sai antes paga proporcional ao
    // que falta, como manda o art. 4º da Lei 8.245/91.
    //
    // No CON-0025 a diferença era de R$ 2.250,00 para R$ 1.725,00.
    //
    // "Cumpriu" é a partir do DIA em que a carência fecha (data de
    // início + n meses): quem fica até lá cumpriu o combinado.
    const carencia = Number(r.carencia_meses || 0);
    const fimCarencia = carencia ? somarMeses(r.data_inicio, carencia) : null;
    const carenciaCumprida = !!fimCarencia && saida >= fimCarencia;

    // O MÉTODO DO RODRIGO (04/08/2026), na ordem que se confere de cabeça:
    // 1) multa cheia = aluguel × nº de aluguéis
    // 2) valor da multa POR MÊS = cheia ÷ total de meses (arredondado)
    // 3) multa = valor por mês × meses que faltam
    // A ordem do arredondamento importa: primeiro o por-mês, depois a
    // multiplicação — é o número que o inquilino confere na calculadora.
    const valorMes = Math.round((cheia / totalMeses) * 100) / 100;
    const valor = carenciaCumprida ? 0
      : Math.round(valorMes * faltam * 100) / 100;

    mem.innerHTML = `
      Aluguel vigente: <b>${moeda(aluguel)}</b> · Multa cheia: ${nAl} aluguéis =
      <b>${moeda(cheia)}</b><br>
      Contrato: <b>${dataBr(r.data_inicio)} → ${dataBr(fim)}</b> (${totalMeses} meses)
      ${carencia ? `· carência de ${carencia} meses (até ${dataBr(fimCarencia)})` : ''}<br>
      ${carenciaCumprida
        ? `<b>Carência cumprida:</b> ficou até ${dataBr(fimCarencia)}, então não há multa`
        : `Multa por mês de contrato: ${moeda(cheia)} ÷ ${totalMeses} = <b>${moeda(valorMes)}</b><br>
           Cumpridos até a saída: ${cumpridos} ${cumpridos === 1 ? 'mês' : 'meses'} ·
           <b>Faltam ${faltam} meses</b><br>
           Multa = ${moeda(valorMes)} × ${faltam} meses restantes`}
      <div style="border-top:1.5px solid var(--borda);margin-top:8px;padding-top:8px;
        display:flex;justify-content:space-between;font-size:15px">
        <b>Multa a pagar</b><b>${moeda(valor)}</b></div>`;

    const nomeInq = r.inquilino_nome ? ` ${String(r.inquilino_nome).split(' ')[0]}` : '';
    // O AVISO DO QUE FALTA PARA ZERAR só entra quando ainda dá tempo: dizer
    // "se ficasse mais X meses não pagaria nada" para quem JÁ decidiu sair
    // amanhã é esfregar na cara, não informar.
    const faltamCarencia = (!carenciaCumprida && fimCarencia)
      ? mesesEntreDatas(saida, fimCarencia) : 0;

    txt.textContent = carenciaCumprida
      ? `Olá${nomeInq}! Sobre a rescisão do seu contrato:

• Seu contrato começou em ${dataBr(r.data_inicio)}, com término previsto em ${dataBr(fim)} — ${totalMeses} meses no total — e prevê permanência mínima (carência) de ${carencia} meses, que se completou em ${dataBr(fimCarencia)}.
• Como você permaneceu no imóvel além desse período, com saída em ${dataBr(saida)}, NÃO HÁ MULTA por rescisão antecipada.
• Multa a pagar: ${moeda(0)}.

Seguem valendo as obrigações normais de saída: aluguel e encargos até a entrega das chaves, e o imóvel nas condições da vistoria. Qualquer dúvida, estamos à disposição. — Moralí Gestão Imobiliária`
      : `Olá${nomeInq}! Segue o cálculo da multa por rescisão antecipada do seu contrato, feito como prevê o contrato e a Lei do Inquilinato (art. 4º da Lei 8.245/91):

• Seu contrato começou em ${dataBr(r.data_inicio)}, com término previsto em ${dataBr(fim)} — ${totalMeses} meses no total.
• A multa prevista para desistência antes do fim é de ${nAl} aluguéis: ${nAl} × ${moeda(aluguel)} = ${moeda(cheia)}.
• A lei garante que essa multa seja PROPORCIONAL ao período que falta. Dividindo a multa pelos ${totalMeses} meses do contrato, cada mês corresponde a ${moeda(cheia)} ÷ ${totalMeses} = ${moeda(valorMes)}.
• Com a saída em ${dataBr(saida)}, você terá cumprido ${cumpridos} ${cumpridos === 1 ? 'mês' : 'meses'}, faltando ${faltam} meses.
• Multa: ${moeda(valorMes)} × ${faltam} meses restantes = ${moeda(valor)}.${
  faltamCarencia > 0 ? `
• Observação: seu contrato prevê permanência mínima de ${carencia} meses, que se completa em ${dataBr(fimCarencia)}. Permanecendo até lá (${faltamCarencia} ${faltamCarencia === 1 ? 'mês' : 'meses'} a mais), não haveria multa.` : ''}

Ou seja: quanto mais meses cumpridos, menor a multa. Qualquer dúvida sobre o cálculo, estamos à disposição. — Moralí Gestão Imobiliária`;
  };
  ['saida', 'alugueis'].forEach(n => {
    const el = elementoAcao(n);
    if (el) el.addEventListener('input', recalc);
  });
  recalc();
}

// --- sinistros ----------------------------------------------
/** Busca no cadastro os prazos daquela seguradora + tipo e devolve as
 *  datas já calculadas. Sem cadastro, devolve vazio — e a tela pede as
 *  datas na mão, como antes. Nunca impõe: tudo aparece editável. */
async function sugerirPrazos(seguradora, tipo, dataFato) {
  if (!seguradora) return null;
  const { data, error } = await sb.rpc('prazos_sugeridos', {
    p_seguradora: seguradora, p_tipo: tipo, p_data_fato: dataFato || hojeISO()
  });
  if (error || !data || !data.length) return null;
  return data[0];
}

async function _abrirNovoSinistro(seguroId) {
  const vigentes = relacionados.filter(a => a.status === 'Vigente');
  erroSe(!vigentes.length, 'Não há apólice vigente para acionar.');
  const escolhida = seguroId || vigentes[0].id;
  const ap0 = vigentes.find(a => a.id === escolhida) || {};
  const tipoSugerido = ehIncendio(ap0.tipo) ? 'Incêndio' : 'Inadimplência';
  // já chega com os prazos daquela seguradora, se houver cadastro
  const sug = await sugerirPrazos(ap0.seguradora, tipoSugerido, hojeISO());
  abrirAcao('Acionar o seguro', [
    { n: 'seguro', r: 'Apólice', t: 'select', largo: true,
      op: vigentes.map(a => `${a.tipo}${a.apolice ? ' · ' + a.apolice : ''}`),
      v: (() => { const a = vigentes.find(x => x.id === escolhida);
                  return a ? `${a.tipo}${a.apolice ? ' · ' + a.apolice : ''}` : ''; })() },
    { n: 'tipo', r: 'Tipo de sinistro', t: 'select', v: tipoSugerido,
      op: (typeof TIPOS_SINISTRO !== 'undefined' ? TIPOS_SINISTRO.slice() : ['Outro']) },
    { n: 'fato', r: 'Data do fato', t: 'data', v: hojeISO() },
    { n: 'prazoabrir', r: 'Prazo para comunicar à seguradora', t: 'data',
      v: sug ? sug.prazo_para_abrir : null,
      dica: sug ? 'sugerido pelo cadastro da seguradora — confira'
                : 'está nas condições gerais da apólice' },
    { n: 'prazoretorno', r: 'Prazo de retorno da seguradora', t: 'data',
      v: sug ? sug.prazo_retorno : null,
      dica: sug ? 'sugerido pelo cadastro' : 'até quando ela deve responder' },
    { n: 'pleiteado', r: 'Valor pleiteado (R$)', t: 'moeda' },
    { n: 'meses', r: 'Meses de aluguel cobertos', t: 'numero' },
    { n: 'obs', r: 'Observações', t: 'textarea', largo: true }
  ], async () => {
    const rotulo = valorAcao('seguro');
    const ap = vigentes.find(a => `${a.tipo}${a.apolice ? ' · ' + a.apolice : ''}` === rotulo);
    const { error } = await sb.from('contrato_sinistros').insert({
      contrato_id: ID, seguro_id: ap ? ap.id : null,
      tipo: valorAcao('tipo'), data_fato: valorAcao('fato'),
      prazo_para_abrir: valorAcao('prazoabrir'),
      prazo_retorno: valorAcao('prazoretorno'),
      valor_pleiteado: valorAcao('pleiteado'),
      meses_cobertos: valorAcao('meses'),
      observacoes: valorAcao('obs')
    });
    if (error) throw error;
  }, 'Abrir sinistro');
}

async function _abrirExigencia(sinistroId) {
  const s = sinistrosFicha.find(x => x.id === sinistroId) || {};
  const sug = await sugerirPrazos(s.seguradora, s.tipo, hojeISO());
  const prazoPadrao = sug && sug.dias_exigencia
    ? new Date(Date.now() + sug.dias_exigencia * 86400000).toISOString().slice(0, 10) : null;
  abrirAcao('Registrar exigência da seguradora', [
    { n: 'desc', r: 'O que a seguradora está pedindo', t: 'textarea', largo: true },
    { n: 'prazo', r: 'Prazo para cumprir', t: 'data', v: prazoPadrao,
      dica: prazoPadrao ? 'prazo padrão do cadastro — corrija se ela deu outro' : 'obrigatório' },
    { n: 'quem', r: 'Com quem está a bola', t: 'select', op: ['Nós', 'Seguradora'], v: 'Nós' }
  ], async () => {
    const d = valorAcao('desc'), p = valorAcao('prazo');
    erroSe(!d, 'Escreva o que está sendo exigido.');
    erroSe(!p, 'Toda exigência precisa de prazo — é o que impede o sinistro de ser arquivado por silêncio.');
    const { error } = await sb.rpc('sinistro_registrar_exigencia', {
      p_sinistro_id: sinistroId, p_descricao: d, p_prazo: p, p_de_quem: valorAcao('quem')
    });
    if (error) throw error;
  }, 'Registrar');
}

function _cumprirExigencia(andamentoId) {
  abrirAcao('Cumprir exigência', [
    { n: 'quando', r: 'Cumprida em', t: 'data', v: hojeISO() },
    { n: 'obs', r: 'Como foi enviado (opcional)', t: 'textarea', largo: true,
      dica: 'ex.: por e-mail, protocolo 123' }
  ], async () => {
    const { error } = await sb.rpc('sinistro_cumprir_exigencia', {
      p_andamento_id: andamentoId, p_quando: valorAcao('quando'), p_observacao: valorAcao('obs')
    });
    if (error) throw error;
  }, '✓ Cumpri');
}

async function _abrirDeferir(sinistroId) {
  const s = sinistrosFicha.find(x => x.id === sinistroId) || {};
  const sug = await sugerirPrazos(s.seguradora, s.tipo, hojeISO());
  const previsaoPadrao = sug && sug.dias_pagamento
    ? new Date(Date.now() + sug.dias_pagamento * 86400000).toISOString().slice(0, 10) : null;
  abrirAcao('A seguradora deferiu', [
    { n: 'valor', r: 'Valor deferido (R$)', t: 'moeda', v: s.valor_pleiteado,
      dica: 'o que ela aceitou pagar' },
    { n: 'previsao', r: 'Data prevista do pagamento', t: 'data', v: previsaoPadrao,
      dica: previsaoPadrao ? 'prazo padrão do cadastro — corrija se ela marcou outra' : '' },
    { n: 'obs', r: 'Observação', t: 'textarea', largo: true,
      dica: 'ex.: recusou o 3º mês por estar fora da cobertura' }
  ], async () => {
    const v = valorAcao('valor');
    erroSe(!v, 'Informe o valor que a seguradora aceitou.');
    const { error } = await sb.rpc('sinistro_deferir', {
      p_sinistro_id: sinistroId, p_valor_deferido: Number(v),
      p_previsao_pagamento: valorAcao('previsao'), p_observacao: valorAcao('obs')
    });
    if (error) throw error;
  }, '✓ Deferido');
}

function _abrirRecebimento(sinistroId) {
  const s = sinistrosFicha.find(x => x.id === sinistroId) || {};
  abrirAcao('Registrar a indenização recebida', [
    { n: 'valor', r: 'Valor que caiu na conta (R$)', t: 'moeda', v: s.valor_deferido },
    { n: 'quando', r: 'Recebido em', t: 'data', v: hojeISO() }
  ], async () => {
    const v = valorAcao('valor');
    erroSe(!v, 'Informe o valor recebido.');
    const { error } = await sb.rpc('sinistro_registrar_recebimento', {
      p_sinistro_id: sinistroId, p_valor: Number(v), p_quando: valorAcao('quando')
    });
    if (error) throw error;
  }, 'Registrar');
}

// ------------------------------------------------------------
// EXCLUSÃO DO REGISTRO (v1.101; Lead entrou na v1.116) — Contato,
// Imóvel e Lead, e só SEM vínculos.
//
// Regra de desenho: excluir de verdade é para cadastro que nunca
// aconteceu — teste, duplicata, erro de digitação. Registro com história
// não se apaga: contato se inativa pelo campo Status; lead se marca como
// Perdido; imóvel terá o módulo Inativar. A planilha permitia apagar
// linha com história, e foi assim que ela perdeu a dela.
//
// A confirmação é DENTRO da página, nunca no confirm() do navegador —
// que pode ser suprimido e responder "não" em silêncio (lição do M24).
// ------------------------------------------------------------
async function vinculosDoRegistro() {
  // head:true só conta, não traz linha nenhuma — barato até em tabela grande
  const conta = async (rotulo, tabela, filtro) => {
    try {
      const { count, error } = await filtro(
        sb.from(tabela).select('id', { count: 'exact', head: true }));
      if (error) throw error;
      return { rotulo, n: count || 0 };
    } catch (e) {
      return { rotulo, n: null };   // não consegui conferir — trato como impedimento
    }
  };
  const checagens = (ALVO === 'contato') ? [
    conta('imóvel(is) como proprietário ou inquilino', 'imoveis',
      q => q.or(`proprietario_id.eq.${ID},inquilino_id.eq.${ID}`)),
    conta('caso(s) como prestador ou solicitante', 'casos',
      q => q.or(`prestador_id.eq.${ID},solicitante_id.eq.${ID}`)),
    conta('lead(s) convertido(s) neste contato', 'leads', q => q.eq('contato_id', ID)),
    conta('comissão(ões) como parceiro', 'comissoes', q => q.eq('parceiro_id', ID)),
    conta('tarefa(s) no histórico', 'tarefas', q => q.eq('contato_id', ID))
  ] : (ALVO === 'lead') ? [
    // LEAD (v1.116). O que impede apagar é HISTÓRIA: lead que já virou
    // contato, simulação pedida, imóvel trabalhado, contato concluído.
    //
    // Tarefa de follow-up ABERTA de propósito NÃO entra nesta lista: ela é
    // agenda que a régua de captação cria sozinha (v1.114), então todo lead
    // Proprietário teria uma e o botão nunca serviria para o que ele existe
    // — apagar o cadastro errado. Ela é removida junto, e a confirmação diz
    // quantas são antes de qualquer coisa ser apagada.
    conta('conversão em contato (este lead já virou cadastro)', 'leads',
      q => q.eq('id', ID).not('contato_id', 'is', null)),
    conta('simulação(ões) de seguro', 'simulacoes', q => q.eq('lead_id', ID)),
    conta('imóvel(is) no interesse', 'lead_imoveis', q => q.eq('lead_id', ID)),
    conta('contato(s) já registrado(s) — ligação ou visita concluída', 'tarefas',
      q => q.eq('lead_id', ID).eq('status', 'Concluída'))
  ] : (ALVO === 'ficha') ? [
    // v1.286 — A FICHA NÃO TEM VÍNCULO QUE IMPEÇA.
    //
    // Ela é FOLHA da árvore: nada no CRM depende dela para existir. O
    // contato e o imóvel que ela gerou seguem vivos por conta própria —
    // apagar a ficha não os toca.
    //
    // O que se perde é outra coisa, e é séria: o que a pessoa escreveu,
    // o aceite LGPD com data, hora e IP, e o registro de quais campos
    // entraram no cadastro. Por isso a confirmação (bloco abaixo) diz
    // isso com todas as letras em vez de contar vínculos que não há.
    // lista vazia: não há o que perguntar ao banco, e uma consulta que
    // sempre volta zero seria uma ida ao servidor para nada
  ] : [
    conta('caso(s) do imóvel (manutenção/vistoria)', 'casos', q => q.eq('imovel_id', ID)),
    conta('lead(s) com este imóvel no interesse', 'lead_imoveis', q => q.eq('imovel_id', ID)),
    conta('tarefa(s) no histórico', 'tarefas', q => q.eq('imovel_id', ID))
  ];
  const resultados = await Promise.all(checagens);

  // O que vai ser apagado JUNTO: não impede, mas ninguém pode ser
  // surpreendido por isso depois. Se a contagem falhar, cai em `incerto`
  // e nada é excluído — mesma regra dos impedimentos.
  const avisos = [];
  if (ALVO === 'ficha') {
    const n = Array.isArray(registro.anexos) ? registro.anexos.length : 0;
    if (n) avisos.push(`${n} documento(s) enviado(s), que saem do Storage junto`);
    avisos.push('o que a pessoa escreveu e o aceite LGPD (data, hora e IP)');
    if (registro.status === 'Aprovada') {
      avisos.push('o registro de quais campos entraram no cadastro' +
        (registro.contato_codigo ? ` de ${registro.contato_codigo}` : '') +
        ' — o contato e o imóvel NÃO são apagados, mas some a prova de onde vieram');
    }
  }
  if (ALVO === 'lead') {
    const abertas = await conta('tarefa(s) de follow-up em aberto', 'tarefas',
      q => q.eq('lead_id', ID).neq('status', 'Concluída'));
    resultados.push({ rotulo: abertas.rotulo, n: abertas.n === null ? null : 0 });
    if (abertas.n > 0) avisos.push(`${abertas.n} ${abertas.rotulo}`);
  }

  return {
    impedimentos: resultados.filter(r => r.n > 0).map(r => `${r.n} ${r.rotulo}`),
    incerto: resultados.some(r => r.n === null),
    avisos
  };
}

function faixaExcluirHtml(conteudo) {
  const f = document.getElementById('faixa-excluir');
  if (!f) return;
  f.innerHTML = conteudo;
  f.style.display = conteudo ? 'block' : 'none';
}

async function pedirExcluirRegistro() {
  const b = document.getElementById('btn-excluir');
  if (b) b.disabled = true;
  faixaExcluirHtml('Conferindo os vínculos deste registro…');
  const { impedimentos, incerto, avisos } = await vinculosDoRegistro();
  if (b) b.disabled = false;

  if (incerto) {
    faixaExcluirHtml(`<b>Não consegui conferir todos os vínculos</b> — por segurança,
      nada foi excluído. Tente de novo; persistindo, verifique sua conexão.
      <button class="btn btn-claro" onclick="faixaExcluirHtml('')">Fechar</button>`);
    return;
  }
  if (impedimentos.length) {
    faixaExcluirHtml(`<b>Este registro tem história e não pode ser excluído:</b>
      <ul>${impedimentos.map(i => '<li>' + htm(i) + '</li>').join('')}</ul>
      Registro com história se inativa, não se apaga${ALVO === 'contato'
        ? ' — mude o <b>Status</b> para Inativo na edição'
        : (ALVO === 'lead'
          ? ' — marque a <b>Etapa do funil</b> como Perdido, com o motivo' : '')}.
      <button class="btn btn-claro" onclick="faixaExcluirHtml('')">Fechar</button>`);
    return;
  }
  faixaExcluirHtml(`<b>Excluir definitivamente ${htm(DEF.titulo(registro))}?</b>
    ${(avisos && avisos.length)
      ? `Isto também apaga: ${htm(avisos.join(', '))}.`
      : 'Nenhum vínculo encontrado.'} Esta ação não tem volta.
    <button class="btn btn-perigo" onclick="excluirRegistro()">Excluir de vez</button>
    <button class="btn btn-claro" onclick="faixaExcluirHtml('')">Cancelar</button>`);
}

async function excluirRegistro() {
  faixaExcluirHtml('Excluindo…');

  // Lead (v1.116): as tarefas de follow-up em aberto saem primeiro. Elas
  // não são história (a régua de captação as cria sozinha) e a confirmação
  // já avisou quantas são. Isto vale tanto se a chave estrangeira recusar a
  // exclusão do lead quanto se ela permitir — no segundo caso, sem esta
  // limpeza sobrariam tarefas apontando para um lead que não existe mais.
  if (ALVO === 'lead') {
    const { error: eTar } = await sb.from('tarefas').delete()
      .eq('lead_id', ID).neq('status', 'Concluída');
    if (eTar) {
      faixaExcluirHtml(htm('Não foi possível remover as tarefas de follow-up: ' +
        eTar.message + ' — nada foi excluído.') +
        ` <button class="btn btn-claro" onclick="faixaExcluirHtml('')">Fechar</button>`);
      return;
    }
  }

  // v1.286 — os documentos da ficha saem do Storage ANTES da linha.
  // Depois de apagar a ficha, o caminho dos arquivos some junto e eles
  // ficariam ocupando espaço para sempre, sem ninguém saber de quem são.
  if (ALVO === 'ficha' && Array.isArray(registro.anexos) && registro.anexos.length) {
    for (const a of registro.anexos) {
      if (!a || !a.bucket || !a.caminho) continue;
      try { await sb.storage.from(a.bucket).remove([a.caminho]); } catch (e) { /* segue */ }
    }
  }

  const { error } = await sb.from(DEF.tabela).delete().eq('id', ID);
  if (error) {
    // 23503 = o banco achou um vínculo que a tela não conhece. Melhor
    // mensagem honesta do que o inglês cru do Postgres.
    const msg = String(error.code) === '23503'
      ? 'O banco encontrou um vínculo que a tela não conhece — nada foi excluído. Me avise qual registro é este.'
      : 'Não foi possível excluir: ' + error.message;
    faixaExcluirHtml(htm(msg) +
      ` <button class="btn btn-claro" onclick="faixaExcluirHtml('')">Fechar</button>`);
    return;
  }
  window.location.href = DEF.lista;
}

// ------------------------------------------------------------
// 5) MODAL GENÉRICO — o mesmo motor edita o registro e as tarefas
// ------------------------------------------------------------
let modalDef = null, modalId = null, modalExtra = null, modalDepois = null;

/**
 * v1.315 — "ESTA JANELA É DE QUAL OBJETO?"
 *
 * A resposta era `modalDef === DEFS.contato` — identidade. Só que o ✎
 * de um cartão monta um def NOVO (`Object.assign({}, DEF, { campos })`),
 * e aí a identidade dá falso: TODA regra de salvamento presa a essa
 * comparação parou de valer no editor de cartão, que é como a ficha é
 * editada desde o cockpit da v1.270. Ficaram sem valer, entre outras,
 * a conferência de CPF/CNPJ repetido e as travas de data incoerente.
 *
 * `tabela` sobrevive ao Object.assign, então é ela que responde. As
 * janelas de AÇÃO (Propor data, Aprovar orçamento) compartilham tabela
 * com o caso — mas elas não têm os campos que as regras olham, e a
 * regra vira nada. Conferido um a um.
 */
function ehDef(d, qual) {
  return !!d && !!qual && (d === qual || (!!d.tabela && d.tabela === qual.tabela));
}
let modalAvisoOk = false;  // v1.163: aviso de data improvável já foi visto?
let modalAvisoTelOk = false;  // v1.364: aviso de telefone repetido já foi visto?
// (bandeira própria: se dividisse a modalAvisoOk, o 2º clique do aviso de
// telefone engoliria o aviso de datas sem ninguém o ter lido)

function campoHtml(c) {
  const nome = 'mf-' + c.c;

  // v1.280 — CAMPO SÓ DE LEITURA PARA ESTE PAPEL.
  //
  // Quem barra de verdade é o banco: o gatilho da view preserva o valor
  // que já estava gravado e ignora o que o navegador mandar. Aqui é a
  // tela contando isso antes — um campo que aceita digitação e depois
  // não salva é pior que um campo trancado, porque a pessoa perde o
  // trabalho sem entender por quê.
  // v1.282 — a tabela é a do que a JANELA edita, não a da tela.
  // Esta função só desenha campo de janela (o id nasce com 'mf-'), e a
  // janela às vezes edita OUTRO objeto: pela ficha do contrato se abre
  // o contato, a tarefa, o aluguel. Perguntando pela tabela da tela, o
  // cadeado saía no campo errado — o campo travado do contato aparecia
  // livre, e uma coluna de mesmo nome no contrato travava um campo que
  // ninguém pediu para travar.
  const tabelaDaJanela = (modalDef && modalDef.tabela)
    || (typeof DEF !== 'undefined' && DEF ? DEF.tabela : null);
  const travado = typeof campoSomenteLeitura === 'function'
    && tabelaDaJanela
    && campoSomenteLeitura(tabelaDaJanela, c.c);
  if (c.t === 'check') return `
    <div class="campo largo" style="flex-direction:row;align-items:center;gap:8px">
      <input type="checkbox" id="${nome}" style="width:auto">
      <label for="${nome}" style="font-size:14px;color:var(--texto)">${htm(c.r)}</label></div>`;
  let campo;
  if (c.t === 'multi') {
    // lista de múltipla escolha: caixinhas, porque um <select multiple>
    // no celular é praticamente inusável
    campo = `<div class="flt-multi" id="${nome}">${(c.op || []).map(o =>
      `<label><input type="checkbox" value="${htm(o)}"> ${htm(o)}</label>`).join('')}</div>`;
  }
  else if (c.t === 'textarea') campo = `<textarea id="${nome}"></textarea>`;
  else if (c.t === 'select') campo = `<select id="${nome}">${c.op.map(o =>
      `<option value="${htm(o)}">${htm((c.rotulos && c.rotulos[o]) || o)}</option>`).join('')}</select>`;
  // v1.170 — referência a outro registro é LOOKUP (busca com lupa),
  // não um select com a base inteira: com mil contatos, o select vira
  // rolagem cega. O escolhido mora em dataset.valor (ver base.js).
  else if (c.t === 'ref' || c.t === 'refnome' || c.t === 'refimovel' || c.t === 'refcontrato')
    campo = `<span class="lookup"><input id="${nome}" type="text"
      autocomplete="off" placeholder="Buscar…"><svg class="lupa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span class="lookup-lista"></span></span>`;
  else {
    // v1.133: MOEDA, PERCENTUAL E NÚMERO SAÍRAM DO type="number".
    // Ele recusa a vírgula — "1800,50" virava campo vazio e o valor
    // sumia sem aviso — e aceita "1.800" como um vírgula oito, gravando
    // R$ 1,80 onde a pessoa quis mil e oitocentos. Como texto, o
    // `numeroBr()` entende os dois jeitos e a máscara tira a ambiguidade.
    const tipo = { data: 'date', datahora: 'datetime-local',
      email: 'email' }[c.t] || 'text';
    campo = `<input id="${nome}" type="${tipo}">`;
  }
  if (travado) {
    campo = campo.replace(/<(input|select|textarea)\b/g, '<$1 disabled')
               + '<small class="campo-travado">' + icone('cadeado', 11) + ' Somente leitura — o seu papel não altera este campo</small>';
  }

  // A ajuda virou ÍCONE ao lado do rótulo, em 26/07/2026.
  // Como texto solto embaixo do campo, uma explicação de três linhas
  // (a regra do piso da taxa) empurrava o formulário e virava ruído em
  // quem já sabe. No ícone, ela aparece quando a pessoa procura.
  const dica = '';
  const ajudaIcone = c.ajuda
    ? `<button type="button" class="campo-ajuda" aria-label="O que é isto?"
         title="${htm(c.ajuda)}" onclick="mostrarAjuda(this)"
         data-ajuda="${htm(c.ajuda)}">i</button>` : '';
  return `<div class="campo ${c.largo ? 'largo' : ''}">
    <label>${htm(c.r)}${c.obrig ? ' *' : ''}${ajudaIcone}</label>${campo}${dica}</div>`;
}

function abrirModal(def, titulo, dados, extra, depois) {
  // v1.357 — a janela e o lápis usam a MESMA máquina e não coexistem:
  // se um campo estava em edição pelo lápis, desfaz antes. E a janela
  // nunca nasce invisível — a invisibilidade é só do passeio do lápis,
  // que a põe DEPOIS desta chamada.
  if (typeof lapisColuna !== 'undefined' && lapisColuna) lapisCancelar();
  document.getElementById('modal').classList.remove('modal-invisivel');
  /* v1.238 — as listas completas de contatos e imóveis são buscadas
   * AQUI, não na abertura da ficha. Não se espera por elas: os
   * seletores pedem a fonte por função, no clique, e a essa altura já
   * chegaram. */
  garantirListasCompletas();
  modalDef = def; modalId = dados && dados.id ? dados.id : null;
  modalExtra = extra || {}; modalDepois = depois;
  modalAvisoOk = false;
  modalAvisoTelOk = false;
  document.getElementById('modal-titulo').textContent = titulo;
  // v1.192 — CAMPO CALCULADO NÃO SE DIGITA. Ele aparece na ficha, mas
  // fica fora da janela de edição: uma caixa de texto sobre uma conta
  // só poderia mentir — ou o valor digitado seria descartado no
  // próximo desenho, ou sobrescreveria a fórmula sem aviso.
  const editaveis = def.campos.filter(c => !c.formula);
  document.getElementById('modal-campos').innerHTML = editaveis.map(campoHtml).join('');
  editaveis.forEach(c => {
    const el = document.getElementById('mf-' + c.c);
    if (!el) return;
    const v = (typeof valorDoRegistro === 'function' && c.pers)
      ? valorDoRegistro(dados, c) : (dados ? dados[c.c] : null);
    if (c.t === 'multi') {
      // v1.163: fora dos personalizados o multi grava TEXTO com vírgula
      // ("Casa, Apartamento") — na tela, vira a lista de marcados
      const marcados = Array.isArray(v) ? v
        : String(v || '').split(',').map(x => x.trim()).filter(Boolean);
      el.querySelectorAll('input').forEach(i => { i.checked = marcados.indexOf(i.value) > -1; });
      return;
    }
    if (c.t === 'check') {
      el.checked = !!v;
      // NULO NÃO É "NÃO". Uma caixa desmarcada afirma que o cliente NÃO
      // aceita pet; nulo diz que ninguém perguntou. Como `el.checked` só
      // sabe dizer sim ou não, qualquer salvamento transformava "não
      // informado" em "não" — inclusive salvamentos que nem tocaram no
      // campo. O estado indeterminado do próprio navegador guarda a
      // terceira possibilidade, e some no primeiro clique.
      el.indeterminate = (v === null || v === undefined);
      if (el.indeterminate) el.title = 'Não informado — clique para responder';
    }
    // O FUSO, corrigido na v1.127.
    // O banco guarda o instante em UTC (2026-07-30T22:51Z). Um
    // `datetime-local` fala HORA LOCAL. Recortar a string crua punha o
    // relógio de Londres num campo que significa Catanduva: a tela
    // mostrava 22:51 onde eram 19:51, e ao salvar o `new Date(...)`
    // interpretava aquilo como local e gravava 01:51Z — TRÊS HORAS À
    // FRENTE, a cada salvamento, mesmo sem ninguém tocar no campo.
    // O modo leitura já convertia certo (toLocaleString), então o mesmo
    // campo mostrava dois horários conforme o modo.
    else if (c.t === 'datahora') {
      el.value = paraCampoLocal(v);
      // O valor exato do banco fica guardado no próprio campo. É o que
      // permite, na hora de salvar, saber se o minuto mudou de verdade
      // ou se é só a fração de segundo que o campo não sabe carregar.
      el.dataset.iso = v || '';
    }
    // PERCENTUAL: o banco guarda fração (0.10) e a pessoa lê porcentagem (10).
    // Sem esta linha o campo mostrava "0,1" e, ao salvar, gravava 0.001.
    // `parseFloat(toFixed(4))` evita o lixo de ponto flutuante: 0.07*100 dá
    // 7.000000000000001 em JavaScript, e o campo mostraria isso.
    else if (c.t === 'percentual')
      el.value = (v === null || v === undefined || v === '')
        ? '' : String(parseFloat((Number(v) * 100).toFixed(4))).replace('.', ',');
    // v1.209 — campo `zero` é coluna NOT NULL DEFAULT 0 no banco: vazio
    // ali não é "não informado", é ZERO. Mostra 0,00 em vez de em branco.
    else if (c.t === 'moeda') el.value = moedaCampo(c.zero && (v === null || v === undefined) ? 0 : v);
    else if (c.t === 'numero')
      el.value = (v === null || v === undefined || v === '') ? '' : String(v).replace('.', ',');
    else el.value = (v === null || v === undefined) ? '' : v;
    // v1.172 — select com valor gravado FORA da lista: o valor entra
    // como opção extra em vez de sumir — sem isto, abrir e salvar
    // reescreveria o campo em silêncio (a lição do 'Vistoria', v1.151d,
    // que valia só para casos e agora vale para toda ficha)
    if (c.t === 'select' && v && el.value !== String(v)) {
      el.insertAdjacentHTML('beforeend', `<option>${htm(v)}</option>`);
      el.value = v;
    }
    // v1.170: o lookup liga aqui — a fonte é a lista já carregada, e o
    // valor antigo (mesmo fora da lista) é preservado como escolhido
    if (c.t === 'ref' || c.t === 'refnome' || c.t === 'refimovel' || c.t === 'refcontrato') {
      const fonte = c.t === 'refcontrato'
        ? () => listaContratos.map(c2 => ({ id: c2.id, rotulo: rotuloContrato(c2), apoio: c2.status || '' }))
        : c.t === 'refimovel'
        ? () => listaImoveis.map(i => ({ id: i.id, rotulo: i.endereco, apoio: i.codigo }))
        : () => listaContatos.map(p2 => ({
            id: c.t === 'refnome' ? p2.nome : p2.id, rotulo: p2.nome, apoio: p2.codigo }));
      let ini = null;
      if (v !== null && v !== undefined && v !== '') {
        if (c.t === 'refnome') ini = { id: v, rotulo: String(v) };
        else if (c.t === 'refcontrato') {
          const c2 = listaContratos.find(x => x.id === v);
          ini = { id: v, rotulo: c2 ? rotuloContrato(c2) : '(contrato)' };
        }
        else if (c.t === 'refimovel') {
          const i = listaImoveis.find(x => x.id === v);
          ini = { id: v, rotulo: i ? i.endereco : '(registro)' };
        } else {
          const p2 = listaContatos.find(x => x.id === v);
          ini = { id: v, rotulo: p2 ? p2.nome : '(registro)' };
        }
      }
      ligarLookup(el, fonte, { valorInicial: ini });
    }
    // v1.164: somenteLeitura de verdade — o campo aparece, mas não se
    // edita; quem escreve nele é o banco (gatilho) ou uma ação própria
    if (c.somenteLeitura) { el.disabled = true; el.title = 'Preenchido pelo sistema'; }
    // campos com pontuação automática (CPF/CNPJ, telefone, CEP)
    if (c.t === 'doc' || c.t === 'tel' || c.t === 'cep') ligarMascara(el, c.t);
    if (c.t === 'moeda') ligarMoeda(el);
    if (c.t === 'percentual' || c.t === 'numero') ligarDecimal(el);
  });
  document.getElementById('modal-erro').style.display = 'none';
  // v1.168 — a ficha do LEAD mostra só o que cabe no tipo: inquilino
  // não tem "imóvel oferecido"; proprietário não tem "o que procura".
  if (ehDef(def, DEFS.lead) && document.getElementById('mf-tipo_lead')) {
    const tipoEl = document.getElementById('mf-tipo_lead');
    const PROCURA = ['tipo_imovel', 'aluguel_max', 'quartos_min',
                     'vagas_garagem', 'bairros_desejados', 'aceita_pet'];
    const CAPTACAO = ['imovel_endereco', 'link_anuncio'];
    const ajustarTipo = () => {
      const ehProp = tipoEl && tipoEl.value === 'Proprietário';
      PROCURA.forEach(c => {
        const el = document.getElementById('mf-' + c);
        const cx = el && el.closest('.campo');
        if (cx) cx.style.display = ehProp ? 'none' : '';
      });
      CAPTACAO.forEach(c => {
        const el = document.getElementById('mf-' + c);
        const cx = el && el.closest('.campo');
        if (cx) cx.style.display = ehProp ? '' : 'none';
      });
    };
    if (tipoEl) tipoEl.addEventListener('change', ajustarTipo);
    ajustarTipo();
  }
  // v1.168 — as datas do contrato saem da conta: fim previsto = início +
  // prazo (campo travado); próximo reajuste = início + periodicidade
  // (sugerido, segue editável). Recalcula só quando a pessoa MEXE — o
  // que está gravado não é tocado ao abrir.
  // v1.315 — A CONTA VALE TAMBÉM NO ✎ DE UM CARTÃO SÓ.
  //
  // O cálculo existe desde a v1.168, mas a condição era
  // `def === DEFS.contrato` — comparação por IDENTIDADE. O editor de
  // seção monta um `def` NOVO (`Object.assign({}, DEF, { campos })`),
  // então dava falso e os listeners nunca eram ligados: digitar 30 no
  // Prazo pelo cartão Vigência não preenchia o Fim previsto. Ficou
  // assim desde o cockpit da v1.270, que é quando a ficha passou a ser
  // editada cartão a cartão — ou seja, quebrou justamente onde as
  // pessoas editam.
  //
  // Agora quem manda é a ficha aberta e a existência do campo na tela;
  // cada conta já se protege sozinha se faltar um dos elementos.
  if (ALVO === 'contrato' && document.getElementById('mf-data_inicio')) {
    const ini = document.getElementById('mf-data_inicio');
    const prazo = document.getElementById('mf-prazo_meses');
    const per = document.getElementById('mf-periodicidade_reajuste_meses');
    const fim = document.getElementById('mf-data_fim_prevista');
    const prox = document.getElementById('mf-proximo_reajuste');
    // v1.315 — a carência ganha a data de término, na mesma conta
    const car = document.getElementById('mf-carencia_meses');
    const fimCar = document.getElementById('mf-fim_da_carencia');
    // v1.318 — O FIM É O ÚLTIMO DIA, NÃO O DIA SEGUINTE.
    //
    // A conta era `início + prazo`, e isso dá o dia em que o contrato
    // JÁ ACABOU: 30 meses a partir de 15/10/2025 terminam em
    // 14/04/2028, e não em 15/04. A carteira inteira está gravada
    // assim (20 contratos batem no dia exato) e o
    // `gerar_competencias_do_contrato` já fazia `+ prazo − 1 dia` —
    // só a ficha discordava. Como a v1.315 fez esta conta voltar a
    // rodar no ✎ do cartão, editar a Vigência passaria a estragar a
    // data certa de todo contrato da casa.
    const calcFim = () => {
      if (!fim || !ini || !prazo || typeof somarMeses !== 'function') return;
      const bruto = somarMeses(ini.value, prazo.value);
      fim.value = bruto ? diaAnterior(bruto) : fim.value;
    };
    const calcProx = () => {
      if (prox && ini && per && typeof somarMeses === 'function' && ini.value && per.value)
        prox.value = somarMeses(ini.value, per.value);
    };
    // carência 0 (ou vazia) não tem data de fim — e o campo esvazia,
    // em vez de guardar a data de uma carência que não existe
    const calcCarencia = () => {
      if (fimCar && ini && car && typeof somarMeses === 'function')
        fimCar.value = somarMeses(ini.value, car.value) || '';
    };
    if (ini) ini.addEventListener('input', () => { calcFim(); calcProx(); calcCarencia(); });
    if (car) car.addEventListener('input', calcCarencia);
    if (prazo) prazo.addEventListener('input', calcFim);
    if (per) per.addEventListener('input', calcProx);
  }
  // v1.166: "O que tratar na próxima?" só aparece na ficha do LEAD e com
  // "já concluída" marcada — é quando a régua vai criar o próximo passo
  if (ehDef(def, DEFS.tarefa)) {
    const feitaEl = document.getElementById('mf-_feita');
    const proxEl = document.getElementById('mf-_proxima');
    const caixaProx = proxEl ? proxEl.closest('.campo') : null;
    const ajustar = () => {
      if (caixaProx) caixaProx.style.display =
        (ALVO === 'lead' && feitaEl && feitaEl.checked) ? '' : 'none';
    };
    if (feitaEl) feitaEl.addEventListener('change', ajustar);
    ajustar();
  }
  /* v1.227 — O BOTÃO VOLTA A SER O SALVAR.
   *
   * `abrirAcao()` aponta o #btn-salvar para confirmarAcao() e troca o
   * rótulo. Nada devolvia. Quem abrisse uma ação — "+ Acrescentar
   * item", "+ Nova apólice", "Corrigir apólice" — e depois clicasse em
   * Editar via a janela do registro com o botão "+ Acrescentar"; ao
   * clicar, rodava a AÇÃO ANTERIOR, e o contrato tentava salvar como
   * item: "Dê um nome ao item".
   *
   * Três lugares do arquivo já devolviam o botão à mão (proposta,
   * orçamento, aprovação) — a armadilha era conhecida e consertada caso
   * a caso. Aqui ela morre na origem: toda janela de registro reprograma
   * o botão, e nenhuma ação futura precisa lembrar de limpar.
   *
   * `acaoAtual` também vai a zero: fechada a ação, o retorno dela não
   * pode continuar pendurado esperando um clique.
   *
   * Quem chama abrirModal e DEPOIS quer outro botão (nova proposta,
   * aprovar orçamento) continua funcionando: aquelas linhas rodam
   * depois desta. */
  const btnJanela = document.getElementById('btn-salvar');
  if (btnJanela) {
    btnJanela.setAttribute('onclick', 'salvarModal()');
    btnJanela.textContent = 'Salvar';
    btnJanela.disabled = false;
  }
  acaoAtual = null;

  document.getElementById('modal').classList.add('aberto');
}
/**
 * Mostra a explicação de um campo.
 *
 * Em vez de balão flutuante: um bloco que empurra o conteúdo. Balão
 * posicionado com JS erra a posição dentro de modal com rolagem, e no
 * celular fica meio fora da tela. O bloco sempre cabe.
 */
function mostrarAjuda(botao) {
  const label = botao.parentElement;
  const jaAberto = label.parentElement.querySelector('.campo-ajuda-texto');
  if (jaAberto) { jaAberto.remove(); botao.classList.remove('aberto'); return; }
  // uma ajuda aberta por vez: duas explicações longas na tela viram parede
  document.querySelectorAll('.campo-ajuda-texto').forEach(x => x.remove());
  document.querySelectorAll('.campo-ajuda.aberto').forEach(x => x.classList.remove('aberto'));
  const bloco = document.createElement('div');
  bloco.className = 'campo-ajuda-texto';
  bloco.textContent = botao.dataset.ajuda || '';
  label.insertAdjacentElement('afterend', bloco);
  botao.classList.add('aberto');
}

function fecharModal() { document.getElementById('modal').classList.remove('aberto'); }

/**
 * (Lead, v1.118) Põe no select de etapa só as etapas do funil daquele
 * tipo de lead. Chamada antes de desenhar a ficha e antes de abrir a
 * janela de edição — os dois lugares onde a lista é lida.
 */
function ajustarEtapasDaFicha() {
  if (ALVO !== 'lead' || !registro || typeof etapasDoFunil !== 'function') return;
  const c = ((DEFS.lead.campos) || []).find(x => x.c === 'status');
  const etapas = etapasDoFunil(registro.tipo_lead || 'Inquilino');
  if (c && etapas.length) {
    // a etapa ATUAL entra mesmo se tiver sido desativada no cadastro,
    // senão abrir a janela trocaria o valor sem ninguém pedir
    c.op = etapas.includes(registro.status) || !registro.status
      ? etapas : [registro.status].concat(etapas);
  }
}

/**
 * (Caso, v1.151d) Põe no select de subtipo só os subtipos daquele tipo
 * de caso — a mesma tabela que a tela de abrir chamado usa.
 *
 * Sem isso, a janela de edição oferecia a lista inteira e a vistoria
 * podia sair com subtipo 'Pintura'. Com a lista filtrada, o subtipo
 * gravado ENTRA MESMO SE NÃO ESTIVER na lista do tipo — senão abrir a
 * janela já trocaria o valor sem ninguém pedir, que é exatamente o
 * defeito que esta função existe para consertar.
 *
 * A tabela vem do casos.js quando ele está carregado (a lista de Casos);
 * na ficha, que não carrega aquele arquivo, vale a cópia local.
 */
const SUBTIPOS_CASO = {
  'Vistoria': ['Entrada', 'Saída', 'Periódica', 'Conferência'],
  '_padrao':  ['Hidráulico', 'Elétrico', 'Estrutural', 'Pintura', 'Marcenaria',
               'Limpeza', 'Jardinagem', 'Chaveiro', 'Outro']
};
function subtiposDoTipo(tipo) {
  const t = (typeof SUBTIPOS !== 'undefined' && SUBTIPOS) ? SUBTIPOS : SUBTIPOS_CASO;
  return [''].concat(t[tipo] || t._padrao);
}
function ajustarSubtiposDaFicha() {
  if (ALVO !== 'caso' || !registro) return;
  const c = ((DEFS.caso.campos) || []).find(x => x.c === 'subtipo');
  if (!c) return;
  const lista = subtiposDoTipo(registro.tipo);
  c.op = (!registro.subtipo || lista.includes(registro.subtipo))
    ? lista : [registro.subtipo].concat(lista);
}

/** v1.270 — o ✎ da seção: edita SÓ os campos daquele grupo, numa janela
 *  pequena. A definição derivada reaproveita toda a máquina do modal
 *  (tipos, personalizados, gravação) — só a lista de campos muda. */
function _editarGrupoFicha(iSec) {
  // v1.330 — lead encerrado é arquivo: o botão não está na tela, mas a
  // guarda fica (tecla, código velho em cache, console)
  if (leadTravado()) { alerta('Lead encerrado — use o Destravar para corrigir.'); return; }
  const sec = (typeof LAY !== 'undefined' && LAY.secoes) ? LAY.secoes[iSec] : null;
  if (!sec || sec.cartao) { editarRegistro(); return; }
  const campos = (sec.campos || [])
    .filter(id => !(typeof ehEspaco === 'function' && ehEspaco(id)))
    .map(id => DEF.campos.find(c => c.c === id))
    .filter(Boolean);
  if (!campos.length) { editarRegistro(); return; }
  ajustarEtapasDaFicha();
  ajustarSubtiposDaFicha();
  ajustarEtapasDoCaso();
  abrirModal(Object.assign({}, DEF, { campos }),
    `Editar — ${sec.titulo || 'Detalhes'}`, registro, {}, async () => {
      const { data } = await sb.from(DEF.tabela).select('*').eq('id', ID).single();
      if (data) registro = data;
      desenharFicha();
    });
  ligarTipoNaJanela();   // v1.309
}

function editarRegistro() {
  // v1.330 — mesma guarda do ✎: lead encerrado só edita destravado
  if (leadTravado()) { alerta('Lead encerrado — use o Destravar para corrigir.'); return; }
  ajustarEtapasDaFicha();
  ajustarSubtiposDaFicha();
  ajustarEtapasDoCaso();
  abrirModal(DEF, `Editar ${registro.codigo || ''}`.trim(), registro, {}, async () => {
    const { data } = await sb.from(DEF.tabela).select('*').eq('id', ID).single();
    if (data) registro = data;
    desenharFicha();
  });
  // v1.309 — e esconde/mostra as seções daquele tipo, na hora
  ligarTipoNaJanela();
  // trocar o tipo de lead na própria janela troca as etapas oferecidas
  const selTipo = document.getElementById('mf-tipo_lead');
  const selEtapa = document.getElementById('mf-status');
  if (selTipo && selEtapa) {
    selTipo.addEventListener('change', () => {
      const novas = etapasDoFunil(selTipo.value);
      const atual = selEtapa.value;
      selEtapa.innerHTML = novas.map(o =>
        `<option value="${htm(o)}"${o === atual ? ' selected' : ''}>${htm(o)}</option>`).join('');
    });
  }
  // v1.151d — e no caso, trocar o tipo troca os subtipos oferecidos.
  // Mesmo comportamento da tela de abrir chamado: quem muda de
  // Manutenção para Vistoria vê 'Entrada' na hora, sem salvar e reabrir.
  const selTipoCaso = document.getElementById('mf-tipo');
  const selSub = document.getElementById('mf-subtipo');
  if (ALVO === 'caso' && selTipoCaso && selSub) {
    selTipoCaso.addEventListener('change', () => {
      const novos = subtiposDoTipo(selTipoCaso.value);
      const atual = selSub.value;
      selSub.innerHTML = novos.map(o =>
        `<option value="${htm(o)}"${o === atual ? ' selected' : ''}>${htm(o)}</option>`).join('');
    });
  }
}
function novaTarefa() {
  const base = { tipo: 'Tarefa', prioridade: 'Normal' };
  abrirModal(DEFS.tarefa, 'Nova tarefa', base, vinculo(), recarregarTarefas);
}
function registrarLigacao() {
  const base = { tipo: 'Ligação', prioridade: 'Normal',
    vencimento: hojeISO(), _feita: true,
    assunto: 'Ligação para ' + DEF.titulo(registro) };
  abrirModal(DEFS.tarefa, 'Registrar ligação', base, vinculo(), recarregarTarefas);
}
function editarTarefa(id) {
  const t = tarefasFicha.find(x => x.id === id);
  if (!t) return;
  abrirModal(DEFS.tarefa, `Editar ${t.codigo || 'tarefa'}`,
    { ...t, _feita: t.status === 'Concluída' }, vinculo(), recarregarTarefas);
}
/** Vínculo automático: a tarefa nasce amarrada ao registro que está aberto. */
function vinculo() {
  return { [DEF.fk]: ID };
}

async function salvarModal() {
  const erro = document.getElementById('modal-erro');
  erro.style.display = 'none';
  const linha = { ...modalExtra };
  // campo personalizado não é coluna: vai todo junto numa caixinha só.
  // Parte do que já estava lá (pode haver campo na lixeira com dado
  // guardado), para não apagar nada sem querer.
  let caixa = null;
  const temPers = modalDef.campos.some(c => c.pers);
  if (temPers) caixa = Object.assign({}, (registro && registro.personalizados) || {});

  // v1.309 — CAMPO ESCONDIDO NÃO É COBRADO.
  //
  // Ele continua sendo lido e gravado com o valor que já tinha (o dado
  // não se perde ao trocar o tipo), mas a obrigatoriedade acompanha a
  // visibilidade: exigir o que não está na tela trava o salvar sem
  // dizer onde. O valor lido é o do SELETOR, não o do registro — quem
  // acabou de trocar o tipo já é cobrado pela regra nova.
  const semTipoSel = (typeof DEF !== 'undefined' && DEF && DEF.tipoRegistro)
    ? document.getElementById('mf-' + DEF.tipoRegistro.campo) : null;
  const foraDoTipo = (typeof camposForaDoTipo === 'function')
    ? camposForaDoTipo(semTipoSel ? semTipoSel.value : undefined) : new Set();

  for (const c of modalDef.campos) {
    if (c.c.startsWith('_')) continue;
    if (c.somenteLeitura) continue;   // v1.164: quem escreve é o sistema
    if (c.formula) continue;          // v1.192: calculado, nunca gravado
    const el = document.getElementById('mf-' + c.c);
    if (!el) continue;

    if (c.pers) {
      let pv;
      if (c.t === 'multi') {
        const m = [...el.querySelectorAll('input:checked')].map(i => i.value);
        pv = m.length ? m : null;
      } else if (c.t === 'check') {
        pv = el.indeterminate ? null : el.checked;
      } else {
        const bruto = String(el.value || '').trim();
        if (bruto === '') pv = null;
        else if (c.t === 'numero' || c.t === 'moeda') pv = numeroBr(bruto);
        else if (c.t === 'percentual') {
          const n = numeroBr(bruto); pv = n === null ? null : n / 100;
        }
        else if (c.t === 'datahora') pv = datahoraParaBanco(bruto, el.dataset.iso);
        else pv = bruto;
      }
      if (c.obrig && !foraDoTipo.has(c.c) && (pv === null || pv === '' || pv === false)) {
        erro.textContent = `O campo "${c.r}" é obrigatório.`;
        erro.style.display = 'block'; return;
      }
      if (pv === null) delete caixa[c.pers]; else caixa[c.pers] = pv;
      continue;
    }
    // multi fora dos personalizados (v1.163): grava a lista como texto
    // com vírgula — "Casa, Apartamento" — e vazio vira nulo
    if (c.t === 'multi') {
      const m = [...el.querySelectorAll('input:checked')].map(i => i.value);
      if (c.obrig && !foraDoTipo.has(c.c) && !m.length) {
        erro.textContent = `O campo "${c.r}" é obrigatório.`;
        erro.style.display = 'block'; return;
      }
      linha[c.c] = m.length ? m.join(', ') : null;
      continue;
    }
    // v1.170: lookup grava o ESCOLHIDO (dataset), nunca o texto digitado
    if (c.t === 'ref' || c.t === 'refnome' || c.t === 'refimovel' || c.t === 'refcontrato') {
      const vv = valorDoLookup(el);
      if (c.obrig && !foraDoTipo.has(c.c) && !vv) {
        erro.textContent = `O campo "${c.r}" é obrigatório — escolha da lista.`;
        erro.style.display = 'block'; return;
      }
      linha[c.c] = vv;
      continue;
    }
    // caixa de seleção grava true/false — ou NULO, quando ninguém
    // respondeu ainda (v1.127). Sem o terceiro estado, abrir e salvar
    // uma ficha sem tocar em nada já respondia "não" por conta própria.
    if (c.t === 'check') { linha[c.c] = el.indeterminate ? null : el.checked; continue; }
    let v = el.value;
    if (typeof v === 'string') v = v.trim();
    // pontuação é só da tela: no banco vai só número
    if (c.t === 'doc' || c.t === 'tel' || c.t === 'cep') v = soDigitos(v);
    else if (c.t === 'uf') v = soLetrasUF(v);
    else if (c.alta) v = padrao(v);
    if (c.obrig && !foraDoTipo.has(c.c) && !v) {
      erro.textContent = `O campo "${c.r}" é obrigatório.`;
      erro.style.display = 'block'; return;
    }
    // v1.209 — VAZIO EM CAMPO `zero` VIRA 0, NÃO NULO.
    //
    // A coluna é NOT NULL DEFAULT 0 no banco (valor_aluguel, encargos,
    // juros, outros_creditos, descontos, outros_debitos da competência).
    // Deixar o campo em branco mandava null e o banco recusava a gravação
    // inteira com "null value in column ... violates not-null constraint"
    // — mensagem de banco na cara de quem só queria salvar uma observação.
    // Onde vazio significa mesmo "não aconteceu" (Valor recebido, Valor
    // repassado) o campo NÃO tem `zero` e continua indo nulo.
    if (c.t === 'numero' || c.t === 'moeda')
      v = v === '' ? (c.zero ? 0 : null) : numeroBr(v);
    // PERCENTUAL: o banco guarda FRAÇÃO (0.10 = 10%) e a pessoa digita 10.
    // O imoveis.js sempre converteu nos dois sentidos; o ficha.js, que monta
    // esta tela, nunca converteu. Resultado: o campo mostrava "0,1" e, ao
    // salvar, gravava 0.1/100 = 0.001 — a taxa de 10% virava 0,1%, e o
    // imóvel passava a render R$ 1 por mês em vez de R$ 100.
    // Defeito antigo, encontrado em 26/07/2026 ao renomear o campo.
    else if (c.t === 'percentual') {
      const n = v === '' ? null : numeroBr(v);
      v = n === null ? null : n / 100;
    }
    else if (c.t === 'datahora') v = datahoraParaBanco(v, el.dataset.iso);
    else if (v === '') v = null;
    linha[c.c] = v;
  }
  if (temPers) linha.personalizados = caixa;

  // TAXA DE ADMINISTRAÇÃO: avisar ANTES de o banco recusar.
  // A trava `imoveis_taxa_adm_coerente` recusa percentual junto com valor
  // fixo, e mínimo sem percentual. Sem esta checagem, a pessoa preenche os
  // dois, clica em Salvar e recebe uma mensagem de banco em inglês.
  if ('taxa_adm_percentual' in linha || 'taxa_adm_valor' in linha
      || 'taxa_adm_minimo' in linha) {
    const pct = linha.taxa_adm_percentual, fixo = linha.taxa_adm_valor,
          min = linha.taxa_adm_minimo;
    if (pct != null && fixo != null) {
      erro.textContent = 'Preencha a taxa por PERCENTUAL ou por VALOR FIXO, não as duas. ' +
        'Se a negociação é percentual com piso, use o percentual mais a taxa mínima.';
      erro.style.display = 'block'; return;
    }
    if (min != null && pct == null) {
      erro.textContent = 'A taxa mínima é o piso de um percentual. ' +
        'Preencha também a Taxa Mensal (%), ou deixe o mínimo vazio.';
      erro.style.display = 'block'; return;
    }
    // 0.5 é meio por cento: ninguém cobra isso, e é o sintoma de quem
    // digitou 0,1 achando que eram 10%.
    if (pct != null && pct > 0 && pct < 0.005) {
      erro.textContent = 'Taxa de ' + (pct * 100).toFixed(2) + '% parece baixa demais. ' +
        'Digite 10 para 10%, e não 0,1.';
      erro.style.display = 'block'; return;
    }
    if (pct != null && pct > 1) {
      erro.textContent = 'Taxa de ' + (pct * 100).toFixed(0) + '% é mais que o aluguel inteiro. ' +
        'Confira o valor.';
      erro.style.display = 'block'; return;
    }
  }

  // TAXA DE CONTRATO: a escala mudou em 26/07/2026.
  // O campo passou a ser percentual (100 = um aluguel inteiro) em vez de
  // multiplicador (1 = um aluguel). Quem tem o hábito antigo digita 1 e
  // grava 1% — num aluguel de R$ 1.000, R$ 10 em vez de R$ 1.000.
  //
  // NÃO existe mínimo praticado: a taxa é negociada caso a caso, e 20% é
  // legítimo. Por isso o aviso só dispara abaixo de 5%, que é a faixa em
  // que quase certamente alguém digitou o número velho.
  if ('taxa_locacao' in linha && linha.taxa_locacao != null) {
    const tc = linha.taxa_locacao;
    if (tc > 0 && tc < 0.05) {
      erro.textContent = 'Taxa de contrato de ' + (tc * 100).toFixed(1) + '%? ' +
        'Este campo agora é em porcentagem: digite 100 para um aluguel inteiro, ' +
        '80 para 80% dele.';
      erro.style.display = 'block'; return;
    }
    if (tc > 3) {
      erro.textContent = 'Taxa de contrato de ' + (tc * 100).toFixed(0) + '% ' +
        'equivale a ' + (tc).toFixed(1) + ' aluguéis. Confira o valor.';
      erro.style.display = 'block'; return;
    }
  }

  // regra específica das tarefas: a caixinha "já concluída" define o status
  if (ehDef(modalDef, DEFS.tarefa)) {
    const feita = document.getElementById('mf-_feita').checked;
    const antiga = tarefasFicha.find(x => x.id === modalId);
    // v1.308 — CANCELADA não se reabre por engano. A janela só conhece
    // a caixinha "já concluída": sem esta guarda, corrigir o assunto de
    // uma tarefa cancelada a devolveria para Aberta em silêncio, e ela
    // voltaria à agenda do lead perdido. Reabrir é ato explícito, pelo
    // ↺ da faixa de Atividade.
    if (antiga && antiga.status === 'Cancelada' && !feita) {
      linha.status = 'Cancelada';
      linha.concluida_em = null;
    } else {
      linha.status = feita ? 'Concluída' : 'Aberta';
      linha.concluida_em = feita
        ? (antiga && antiga.concluida_em ? antiga.concluida_em : new Date().toISOString())
        : null;
    }
  }

  // ============================================================
  // AS DATAS QUE NÃO FAZEM SENTIDO (v1.163) — lista aprovada em
  // 04/08/2026. Regra da casa: BARRAR só o impossível; AVISAR o
  // improvável — o aviso pede um segundo clique em Salvar, o mesmo
  // desenho da janela de contratos (avisoConfirmado, lição do M24:
  // nada de confirm() do navegador).
  // ============================================================
  const dataBarra = [], dataAvisa = [];
  const hj = hojeISO();
  if (ehDef(modalDef, DEFS.contrato)) {
    if (linha.data_fim_prevista && linha.data_inicio && linha.data_fim_prevista < linha.data_inicio)
      dataBarra.push('O fim previsto está antes do início do contrato.');
    if (linha.aviso_previo_em && linha.data_inicio && linha.aviso_previo_em < linha.data_inicio)
      dataBarra.push('O aviso prévio está antes do início do contrato.');
  }
  // só ao CRIAR: reabrir uma tarefa antiga com data passada é legítimo,
  // e a caixinha "já concluída" (ligação que acabou de acontecer) também
  if (ehDef(modalDef, DEFS.tarefa) && !modalId && linha.status !== 'Concluída'
      && linha.vencimento && linha.vencimento < hj) {
    if (linha.tipo === 'Visita')
      dataBarra.push('A visita está marcada para uma data que já passou.');
    else
      dataAvisa.push('O vencimento está no passado.');
  }
  if (ehDef(modalDef, DEFS.sinistro)) {
    if (linha.data_abertura && linha.data_fato && linha.data_abertura < linha.data_fato)
      dataBarra.push('Comunicado à seguradora antes da data do fato.');
    if (linha.data_recebimento && linha.data_abertura && linha.data_recebimento < linha.data_abertura)
      dataBarra.push('Recebido antes de o sinistro ser comunicado.');
    if (linha.previsao_pagamento && linha.previsao_pagamento < hj)
      dataAvisa.push('O pagamento previsto está no passado.');
  }
  if (ehDef(modalDef, DEFS.competencia)) {
    if (linha.recebido_em && linha.recebido_em > hj)
      dataBarra.push('"Recebido em" está no futuro — registre depois que o dinheiro entrar.');
    if (linha.repassado_em && linha.repassado_em > hj)
      dataBarra.push('"Repassado em" está no futuro.');
    if (linha.repassado_em && linha.recebido_em && linha.repassado_em < linha.recebido_em)
      dataAvisa.push('O repasse está antes do recebimento.');
  }
  if (ehDef(modalDef, DEFS.caso)) {
    if (linha.concluido_em && linha.iniciado_em && linha.concluido_em < linha.iniciado_em)
      dataBarra.push('Concluído antes do início do serviço.');
    if (linha.pago_em && linha.pago_em > hj)
      dataAvisa.push('"Pago em" está no futuro.');
  }
  if (ehDef(modalDef, DEFS.imovel) && linha.data_locacao && linha.data_captacao
      && linha.data_locacao < linha.data_captacao)
    dataAvisa.push('Alugado antes de ser captado.');
  if (ehDef(modalDef, DEFS.contato) && linha.aniversario && linha.aniversario > hj)
    dataBarra.push('O aniversário está no futuro.');

  // item 4 da revisão: a ficha agora troca imóvel/inquilino — o aviso
  // de "um imóvel, um contrato ativo" (que morava só na janela da
  // lista) vale aqui também, no mesmo desenho de segundo clique
  if (ehDef(modalDef, DEFS.contrato) && linha.status === 'Ativo' && linha.imovel_id) {
    let q = sb.from('contratos').select('id,codigo')
      .eq('imovel_id', linha.imovel_id).eq('status', 'Ativo');
    if (modalId) q = q.neq('id', modalId);
    const { data: outros } = await q;
    if (outros && outros.length)
      dataAvisa.push(`O ${outros[0].codigo} já é um contrato ATIVO deste imóvel — `
        + 'se este substitui o antigo, o certo é encerrar o outro.');
  }

  if (dataBarra.length) {
    erro.textContent = dataBarra.join(' ');
    erro.style.display = 'block'; return;
  }
  if (dataAvisa.length && !modalAvisoOk) {
    modalAvisoOk = true;
    erro.textContent = dataAvisa.join(' ')
      + ' Se estiver certo mesmo, clique em Salvar de novo.';
    erro.style.display = 'block'; return;
  }

  // regra dos contatos: um CPF/CNPJ não pode estar em dois cadastros
  if (ehDef(modalDef, DEFS.contato) && linha.cpf_cnpj) {
    const outro = await donoDoDocumento(linha.cpf_cnpj, modalId);
    if (outro) {
      erro.innerHTML = 'Este CPF/CNPJ já está cadastrado em <b>' + htm(outro.codigo) + ' — '
        + htm(outro.nome) + '</b>. <a href="contato.html?id=' + outro.id + '">Abrir esse cadastro</a>';
      erro.style.display = 'block'; return;
    }
    if (!documentoValido(linha.cpf_cnpj) && !confirm(
      'O CPF/CNPJ digitado não passou na conferência dos dígitos — '
      + 'normalmente isso é erro de digitação.\n\nSalvar assim mesmo?')) return;
  }

  // v1.364 — TELEFONE JÁ EM OUTRO CADASTRO: avisa, não bloqueia.
  // Existe caso legítimo (casal no mesmo número, lead convertido que
  // virou contato) — por isso o desenho é o do aviso de datas: mostra
  // quem é, com o link, e o segundo clique em Salvar confirma. A busca
  // é do telefoneEmUso (base.js): banco inteiro, contatos E leads, com
  // e sem o nono dígito.
  if ((ehDef(modalDef, DEFS.contato) || ehDef(modalDef, DEFS.lead))
      && linha.telefone && typeof telefoneEmUso === 'function' && !modalAvisoTelOk) {
    const dono = await telefoneEmUso(linha.telefone,
      ehDef(modalDef, DEFS.contato) ? { contato: modalId } : { lead: modalId });
    if (dono) {
      modalAvisoTelOk = true;
      erro.innerHTML = icone('aviso', 12) + ' Este telefone já está em <b>' + htm(dono.codigo) + ' — '
        + htm(dono.nome) + '</b> (' + (dono.tabela === 'contato' ? 'contato' : 'lead') + '). '
        + '<a href="' + dono.tabela + '.html?id=' + encodeURIComponent(dono.id)
        + '">Abrir esse cadastro</a>. Se for mesmo outra pessoa com o mesmo número, '
        + 'clique em Salvar de novo.';
      erro.style.display = 'block'; return;
    }
  }

  const botao = document.getElementById('btn-salvar');
  botao.disabled = true;

  // v1.166: a nota do próximo follow-up é lida ANTES de salvar (o campo
  // some com a janela) e plantada DEPOIS, quando a régua já criou o passo
  const notaProxima = (ehDef(modalDef, DEFS.tarefa) && linha.status === 'Concluída')
    ? (document.getElementById('mf-_proxima')?.value || '').trim()
    : '';
  try {
    if (modalId) {
      const { error } = await sb.from(modalDef.tabela).update(linha).eq('id', modalId);
      if (error) throw error;
    } else {
      if (ehDef(modalDef, DEFS.tarefa)) {
        await inserirTarefa(linha);
      } else {
        const { error } = await sb.from(modalDef.tabela).insert(linha);
        if (error) throw error;
      }
    }
    if (ehDef(modalDef, DEFS.tarefa) && linha.status === 'Concluída') {
      await plantarNotaNaProxima(notaProxima, linha);
    }
    fecharModal();
    if (modalDepois) await modalDepois();
  } catch (e) {
    erro.textContent = 'Erro ao salvar: ' + e.message;
    erro.style.display = 'block';
  } finally {
    botao.disabled = false;
  }
}

/**
 * Procura outro contato que já tenha esse mesmo CPF/CNPJ.
 * A comparação é feita só com os números, para achar o duplicado mesmo
 * que um cadastro antigo esteja pontuado e o novo não.
 * Devolve o contato encontrado, ou null.
 */
async function donoDoDocumento(doc, ignorarId) {
  const d = soDigitos(doc);
  if (!d) return null;
  const { data } = await sb.from('contatos').select('id,codigo,nome,cpf_cnpj')
    .not('cpf_cnpj', 'is', null);
  return (data || []).find(c => c.id !== ignorarId && soDigitos(c.cpf_cnpj) === d) || null;
}

// ------------------------------------------------------------
// 5b) INSERIR TAREFA
// ------------------------------------------------------------
// v1.382 — O REMENDO SAIU.
//
// Até aqui a tarefa era o TERCEIRO jeito de numerar do CRM: a
// `proximo_codigo()` do banco devolvia sempre TAR-0001 para esta
// tabela, então este arquivo lia o maior código por conta própria e
// tentava até oito números seguidos até um entrar. Funcionava, mas era
// uma corrida disfarçada de solução — e escondia o defeito de verdade.
//
// O sql-01 desta versão fez a `proximo_codigo()` puxar da MESMA
// sequência do gatilho. Agora ela devolve o número certo para tarefas
// como para todo o resto, e `nextval` garante que dois salvamentos
// simultâneos recebam números diferentes. Sem laço, sem tentativa.
//
// RODE O SQL ANTES DE PUBLICAR: sem ele, a função ainda devolve
// TAR-0001 e a tarefa não salva.
//
// (O mesmo bloco existe em js/tarefas.js — as duas telas criam tarefa.)
async function inserirTarefa(linha) {
  linha.codigo = await proximoCodigo('TAR', 'tarefas');
  const { error } = await sb.from('tarefas').insert(linha);
  if (error) throw error;
}


// As ações protegidas são publicadas AQUI, antes do bloco de
// inicialização — no fim do arquivo elas ficariam reféns de
// qualquer erro anterior, e os botões chamariam função inexistente.
window.abrirNovoSinistro = protegida(_abrirNovoSinistro, 'Não foi possível acionar o seguro');
window.abrirItemContrato = protegida(_abrirItemContrato, 'Não foi possível abrir o item');
window.salvarQuandoItem = protegida(_salvarQuandoItem, 'Não foi possível mudar quando o item começa');
window.recalcularParcelasEmAberto = protegida(_recalcularParcelasEmAberto, 'Não foi possível recalcular as parcelas');
window.abrirCancelarAposFim = protegida(_abrirCancelarAposFim, 'Não foi possível abrir o cancelamento das parcelas');
window.acrescentarItemDaParcela = protegida(_acrescentarItemDaParcela, 'Não foi possível acrescentar o item');
window.editarItemDaParcela = protegida(_editarItemDaParcela, 'Não foi possível mudar o item');
window.zerarItemDaParcela = protegida(_zerarItemDaParcela, 'Não foi possível zerar o item');
window.tirarItemDaParcela = protegida(_tirarItemDaParcela, 'Não foi possível tirar o item');
window.religarItemDaParcela = protegida(_religarItemDaParcela, 'Não foi possível religar o item ao contrato');
window.acrescentarDescontoDoRepasse = protegida(_acrescentarDescontoDoRepasse, 'Não foi possível acrescentar o desconto');
window.editarDescontoDoRepasse = protegida(_editarDescontoDoRepasse, 'Não foi possível mudar o desconto');
window.tirarDescontoDoRepasse = protegida(_tirarDescontoDoRepasse, 'Não foi possível tirar o desconto');
window.religarDescontoDoRepasse = protegida(_religarDescontoDoRepasse, 'Não foi possível religar ao caso');
window.pedirTirarItem = protegida(_pedirTirarItem, 'Não foi possível tirar o item');
window.abrirReceitasMorali = protegida(_abrirReceitasMorali, 'Não foi possível abrir as receitas');
window.abrirMultaRescisoria = protegida(_abrirMultaRescisoria, 'Não foi possível calcular a multa');
window.abrirCaptarImovel = protegida(_abrirCaptarImovel, 'Não foi possível criar o imóvel');
window.abrirExigencia = protegida(_abrirExigencia, 'Não foi possível registrar a exigência');
window.abrirDeferir = protegida(_abrirDeferir, 'Não foi possível registrar o deferimento');
window.abrirRecebimento = protegida(_abrirRecebimento, 'Não foi possível registrar o recebimento');
window.abrirEditarApolice = protegida(_abrirEditarApolice, 'Não foi possível abrir a correção da apólice');
window.abrirNovaApolice = protegida(_abrirNovaApolice, 'Não foi possível abrir o cadastro da apólice');
window.abrirVincularPessoa = protegida(_abrirVincularPessoa, 'Não foi possível abrir a janela de pessoas');
window.tirarVinculoPessoa = protegida(_tirarVinculoPessoa, 'Não foi possível tirar a pessoa');
window.abrirTaxaDeContrato = protegida(_abrirTaxaDeContrato, 'Não foi possível abrir a taxa de contrato');
// v1.270 — o cockpit do contrato
window.abrirItensDoBoleto = protegida(_abrirItensDoBoleto, 'Não foi possível abrir os itens do boleto');
window.abrirTaxasContrato = protegida(_abrirTaxasContrato, 'Não foi possível abrir as taxas');
window.editarGrupoFicha = protegida(_editarGrupoFicha, 'Não foi possível abrir a edição da seção');
// v1.272 — o cockpit da parcela
window.abrirDescontosDoRepasseJanela = protegida(_abrirDescontosDoRepasseJanela,
  'Não foi possível abrir os descontos do repasse');
window.abrirRenovarApolice = protegida(_abrirRenovarApolice, 'Não foi possível renovar a apólice');
window.abrirReajuste = protegida(_abrirReajuste, 'Não foi possível aplicar o reajuste');
window.cumprirExigencia = protegida(_cumprirExigencia, 'Não foi possível cumprir a exigência');

// ------------------------------------------------------------
// 6) INICIALIZAÇÃO
// ------------------------------------------------------------
exigirLogin().then(s => {
  if (s) { sessaoEmail = s.user.email; carregarFicha(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.task-row.perguntando').forEach(l => l.classList.remove('perguntando'));
    fecharModal();
  }
});

// v1.132 — E ABRE A EDIÇÃO.
// O `quando` espelha o botão: se o `aplicarPermissoes()` o escondeu por
// falta de permissão, a tecla também não faz nada. Amarrar o atalho ao
// BOTÃO, e não repetir a regra de permissão aqui, é o que garante que os
// dois nunca discordem.
if (typeof registrarAtalho === 'function') {
  registrarAtalho('e', 'Editar este registro', () => editarRegistro(), () => {
    const b = document.getElementById('btn-editar');
    return !!b && b.offsetParent !== null;
  });
}








// ============================================================
// A CONFERÊNCIA DA FICHA (v1.284)
//
// A tela que decide o que da ficha entra no cadastro — e o que não
// entra. Três colunas: o que já está no CRM, o que veio da ficha, e o
// que vai valer. Nada é gravado sem alguém marcar.
//
// AS DUAS PRÉ-MARCAÇÕES, que são a alma da tela:
//   · campo VAZIO no CRM e preenchido na ficha → já vem marcado para
//     aceitar. É ganho puro, e obrigar a clicar 12 vezes no óbvio faria
//     a pessoa clicar em "aceitar tudo" sem ler — o oposto do objetivo.
//   · campo DIVERGENTE → vem marcado para MANTER, em amarelo. Trocar
//     por padrão significaria sobrescrever cadastro conferido com
//     digitação de formulário, que é a origem errada para vencer.
//
// O que a ficha traz e o CRM não tem onde guardar (RG, voltagem, área
// de lazer…) NÃO some: continua em `dados`, no cartão "O formulário
// como foi preenchido". Inventar coluna para cada um encheria o
// cadastro de campo que ninguém preenche pelas outras portas.
// ============================================================

/** De onde cada coluna do CONTATO vem, na ordem de preferência.
 *  PF, PJ e locatário usam nomes diferentes para a mesma coisa. */
const MAPA_CONTATO = {
  nome:         ['nome_proprietario', 'pf_nome', 'pj_razao', 'loc_nome'],
  cpf_cnpj:     ['pf_cpf', 'pj_cnpj', 'loc_cpf'],
  telefone:     ['whatsapp', 'pf_whatsapp', 'pj_telefone', 'loc_whatsapp'],
  email:        ['email', 'pf_email', 'pj_email', 'loc_email'],
  aniversario:  ['pf_nascimento', 'loc_nascimento'],
  estado_civil: ['pf_estado_civil', 'loc_estado_civil'],
  profissao:    ['loc_profissao']
};

/** E do IMÓVEL — só na ficha de proprietário. */
const MAPA_IMOVEL = {
  endereco:    ['endereco'],
  logradouro:  ['endereco_logradouro'],
  numero:      ['endereco_numero'],
  complemento: ['endereco_complemento'],
  bairro:      ['endereco_bairro'],
  cidade:      ['endereco_cidade'],
  estado:      ['endereco_estado'],
  cep:         ['endereco_cep'],
  tipo:        ['tipo_imovel'],
  num_quartos: ['dormitorios'],
  valor_aluguel: ['valor_aluguel'],
  uc_agua:     ['uc_agua'],
  uc_energia:  ['uc_energia']
};

let confContato = null;    // o contato com quem estamos comparando
let confDecisoes = {};     // { coluna: 'atual' | 'novo' }

// ------------------------------------------------------------
// v1.381 — A FICHA FALA O MESMO PORTUGUÊS DAS LISTAS FECHADAS
//
// O formulário do locatário oferecia "União Estável" (E maiúsculo) e o
// banco só aceita "União estável" — é o CHECK contatos_estado_civil_check,
// da v1.243, que existe para a lista do JS e a do banco serem a mesma.
// Aprovar a ficha morria com a frase de banco de dados
// ("violates check constraint") DEPOIS de a pessoa conferir a ficha
// inteira, e não havia saída: o valor vinha de um menu, não dava para
// digitar por cima.
//
// O rótulo do formulário foi corrigido (repo CadastroLocatario), mas
// isso não conserta as fichas JÁ ENVIADAS — o texto errado está gravado
// no `dados` delas. Por isso a correção mora também aqui: na hora de
// levar a ficha para o cadastro, o valor é encaixado na palavra que o
// CRM usa. O que a pessoa escreveu continua intacto no cartão "O
// formulário como foi preenchido" — só o que ENTRA no cadastro é
// ajustado.
// ------------------------------------------------------------
const LISTAS_FECHADAS = {
  estado_civil: ['Solteiro(a)', 'Casado(a)', 'União estável',
                 'Divorciado(a)', 'Separado(a)', 'Viúvo(a)']
};

/** "União Estável" → "uniaoestavel" (sem acento, sem maiúscula, sem pontuação) */
function soLetras(t) { return semAcento(t).replace(/[^a-z]/g, ''); }

/**
 * Encaixa o valor da ficha na palavra exata da lista do CRM.
 * Se não reconhecer, devolve o que veio — inventar um estado civil que
 * ninguém escolheu seria pior que o erro.
 */
function encaixarNaLista(coluna, valor) {
  const lista = LISTAS_FECHADAS[coluna];
  if (!lista || !valor) return valor;
  const chave = soLetras(valor);
  if (chave.length < 4) return valor;      // curto demais para arriscar
  return lista.find(o => soLetras(o) === chave)
      // "Solteiro" pelo "Solteiro(a)", "União" pela "União estável"
      || lista.find(o => soLetras(o).startsWith(chave) || chave.startsWith(soLetras(o)))
      || valor;
}

/** o primeiro valor não-vazio entre as origens possíveis */
function valorDaFicha(coluna, mapa) {
  const d = (registro && registro.dados) || {};
  for (const k of (mapa[coluna] || [])) {
    const v = d[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return encaixarNaLista(coluna, String(v).trim());
    }
  }
  return '';
}

function blocoConferencia() {
  // v1.307 — 'Perdido' entra aqui junto com os outros dois desfechos.
  // Sem isto, a ficha marcada como perdida continuaria mostrando o painel
  // de "o que entra no cadastro", convidando a aprovar o que já acabou.
  // O verbo é próprio: "foi perdido" soaria errado — a ficha foi PERDIDA.
  const DESFECHOS = { 'Aprovada': 'aprovada', 'Recusada': 'recusada',
                      'Perdido': 'dada como perdida' };
  if (DESFECHOS[registro.status]) {
    return `<div class="cartao"><h2>Conferência</h2>
      <p style="color:var(--texto-suave);font-size:13.5px">
        Esta ficha já foi ${htm(DESFECHOS[registro.status])}${
          registro.decidido_em ? ' em ' + dataHoraBr(registro.decidido_em) : ''}.
        ${registro.motivo_recusa ? '<br>Motivo: ' + htm(registro.motivo_recusa) : ''}
        ${registro.contato_id ? `<br>Contato: <a href="contato.html?id=${registro.contato_id}">${
            htm(registro.contato_codigo || '')} ${htm(registro.contato_nome || '')}</a>` : ''}
        ${registro.imovel_id ? `<br>Imóvel criado: <a href="imovel.html?id=${registro.imovel_id}">abrir</a>` : ''}
      </p></div>`;
  }
  return `<div class="cartao" id="cartao-conferencia">
    <h2>Conferência — o que entra no cadastro</h2>
    <div id="conf-corpo"><div class="vazio">Procurando esta pessoa no CRM…</div></div>
  </div>`;
}

/** Chamado depois que a ficha desenha, como a faixa de Atividade. */
async function carregarConferencia() {
  const caixa = document.getElementById('conf-corpo');
  if (!caixa) return;

  const alvo = registro.contato_id || null;
  if (alvo) {
    const { data } = await sb.from('contatos').select('*').eq('id', alvo).maybeSingle();
    confContato = data || null;
  } else if (registro.candidatos === 1 && registro.candidato_codigo) {
    const { data } = await sb.from('contatos').select('*')
      .eq('codigo', registro.candidato_codigo).maybeSingle();
    confContato = data || null;
  } else {
    confContato = null;
  }

  // pré-marcação: vazio no CRM aceita; divergente mantém
  confDecisoes = {};
  for (const col of Object.keys(MAPA_CONTATO)) {
    const novo = valorDaFicha(col, MAPA_CONTATO);
    if (!novo) continue;
    const atual = confContato ? String(confContato[col] || '').trim() : '';
    if (atual === novo) continue;
    confDecisoes[col] = atual === '' ? 'novo' : 'atual';
  }
  desenharConferencia();
}

function desenharConferencia() {
  const caixa = document.getElementById('conf-corpo');
  if (!caixa) return;
  const semPar = !confContato;

  const linhas = Object.keys(MAPA_CONTATO).map(col => {
    const novo = valorDaFicha(col, MAPA_CONTATO);
    if (!novo) return '';
    const atual = confContato ? String(confContato[col] || '').trim() : '';
    const rot = (campo('contatos', col) || {}).r || col;
    if (atual === novo) {
      return `<tr><td class="fic-campo">${htm(rot)}</td><td>${htm(atual)}</td><td>${htm(novo)}</td>
        <td class="fic-igual">— igual, nada muda</td></tr>`;
    }
    const d = confDecisoes[col] || 'atual';
    const preenche = atual === '';
    return `<tr class="fic-${preenche ? 'aceita' : 'decidir'}">
      <td class="fic-campo">${htm(rot)}</td>
      <td>${atual ? htm(atual) : '<i style="color:#AEB8BE">vazio</i>'}</td>
      <td><b>${htm(novo)}</b></td>
      <td><span class="fic-seg">
        <button class="${d === 'atual' ? 'on' : ''}" onclick="decidirConf('${jsq(col)}','atual')">${
          preenche ? 'deixar vazio' : 'manter'}</button>
        <button class="${d === 'novo' ? 'on verde' : ''}" onclick="decidirConf('${jsq(col)}','novo')">${
          preenche ? 'preencher' : 'usar o novo'}</button>
      </span></td></tr>`;
  }).join('');

  const aceitos = Object.values(confDecisoes).filter(v => v === 'novo').length;
  const mantidos = Object.entries(confDecisoes).filter(([c, v]) =>
    v === 'atual' && confContato && String(confContato[c] || '').trim() !== '').length;

  caixa.innerHTML = `
    <div class="fic-alvo ${semPar ? 'aviso' : ''}">
      ${semPar
        ? icone('aviso', 12) + ' Ninguém no CRM com este CPF, WhatsApp ou e-mail — aprovar vai <b>criar um contato novo</b>.'
        : icone('elo', 12) + ` Comparando com <a href="contato.html?id=${confContato.id}">${
            htm(confContato.codigo || '')} · ${htm(confContato.nome || '')}</a>`}
      ${registro.candidatos > 1
        ? ` <b style="color:var(--erro)">· há ${registro.candidatos} candidatos: escolha um antes</b>` : ''}
    </div>
    <table class="fic-tabela">
      <thead><tr><th>Campo</th><th>${semPar ? '—' : 'Cadastro atual'}</th>
        <th>Veio da ficha</th><th>O que vai valer</th></tr></thead>
      <tbody>${linhas || '<tr><td colspan="4" class="fic-igual">A ficha não trouxe nada que caiba no cadastro.</td></tr>'}</tbody>
    </table>
    <div class="fic-pe">
      <span><b>${aceitos}</b> campo(s) entram · <b>${mantidos}</b> divergência(s) mantida(s)</span>
      <span class="dir">
        <button class="btn btn-claro" onclick="recusarFicha()">Recusar…</button>
        ${registro.tipo === 'Proprietário'
          ? `<button class="btn btn-claro" onclick="aprovarFicha('lead')">Aprovar como Lead</button>
             <button class="btn" onclick="aprovarFicha('imovel')">Aprovar e criar o imóvel</button>`
          : `<button class="btn" onclick="aprovarFicha('nada')">Aprovar e vincular o contato</button>`}
      </span>
    </div>`;
}

function decidirConf(col, v) { confDecisoes[col] = v; desenharConferencia(); }

/** Monta o que vai para o banco: só o que foi marcado como "novo". */
function camposAceitos() {
  const out = {};
  for (const [col, v] of Object.entries(confDecisoes)) {
    if (v === 'novo') out[col] = valorDaFicha(col, MAPA_CONTATO);
  }
  return out;
}

/**
 * v1.381 — o erro do banco vira frase de gente.
 *
 * Quem aprova ficha não sabe o que é "violates check constraint", e a
 * frase crua não diz o que fazer. Cada trava conhecida ganha aqui a sua
 * explicação; o que não estiver na lista continua saindo como veio —
 * esconder o motivo seria pior que mostrar inglês.
 */
function emPortugues(msg) {
  const m = String(msg || '');
  if (m.includes('contatos_estado_civil_check')) {
    return 'o estado civil que veio da ficha não é um dos que o CRM aceita ('
         + LISTAS_FECHADAS.estado_civil.join(', ') + ').\n\n'
         + 'Deixe essa linha em "deixar vazio", aprove, e escolha o estado civil '
         + 'na ficha do contato.';
  }
  if (m.includes('null value in column') && m.includes('tipo_principal')) {
    return 'o contato novo ficaria sem tipo. Vincule a um contato que já existe '
         + 'ou aceite o nome para o CRM criar um.';
  }
  return m;
}

async function aprovarFicha(criar) {
  if (registro.candidatos > 1 && !registro.contato_id) {
    alert('Há mais de um candidato para esta pessoa. Abra o contato certo e vincule antes de aprovar.');
    return;
  }
  const campos = camposAceitos();
  if (!confContato && !campos.nome) {
    alert('Para criar um contato novo, aceite ao menos o nome.');
    return;
  }

  // v1.288 — CONTATO NOVO PRECISA DE TIPO.
  //
  // `contatos_base.tipo_principal` é NOT NULL, e a conferência nunca o
  // oferece: ele não existe no formulário, então nunca vira uma linha
  // "veio da ficha / o que vai valer". O insert saía sem a coluna e o
  // banco recusava com "null value in column tipo_principal", já com a
  // pessoa tendo conferido a ficha inteira.
  //
  // Quem sabe o tipo é a própria ficha: quem preencheu a de proprietário
  // é proprietário; quem preencheu a de locatário é inquilino. Só vale
  // para contato NOVO — vinculando a um já existente, o tipo dele é o que
  // manda, e sobrescrever seria pior que o erro.
  if (!confContato && !campos.tipo_principal) {
    campos.tipo_principal =
      (registro.tipo === 'Proprietário') ? 'Proprietário' :
      (registro.tipo === 'Locatário')    ? 'Inquilino'    : 'Outro';
  }

  let camposCriar = {};
  if (criar === 'imovel') {
    for (const col of Object.keys(MAPA_IMOVEL)) {
      const v = valorDaFicha(col, MAPA_IMOVEL);
      if (v) camposCriar[col] = v;
    }
    if (!camposCriar.endereco && !camposCriar.logradouro) {
      alert('A ficha não trouxe endereço — não dá para criar o imóvel.');
      return;
    }
  } else if (criar === 'lead') {
    camposCriar = { nome: campos.nome || (confContato && confContato.nome) || registro.nome,
                    telefone: campos.telefone || (confContato && confContato.telefone) || '',
                    email: campos.email || (confContato && confContato.email) || '' };
  }

  const { data, error } = await sb.rpc('ficha_aprovar', {
    p_ficha: ID,
    p_contato: confContato ? confContato.id : null,
    p_campos_contato: campos,
    p_criar: criar,
    p_campos_criar: camposCriar,
    p_decisoes: confDecisoes
  });
  if (error) { alert('Não consegui aprovar: ' + emPortugues(error.message)); return; }

  if (criar === 'imovel' && data && data.criado_id) {
    window.location.href = 'imovel.html?id=' + encodeURIComponent(data.criado_id);
  } else if (data && data.contato_id) {
    window.location.href = 'contato.html?id=' + encodeURIComponent(data.contato_id);
  } else {
    window.location.reload();
  }
}

async function recusarFicha() {
  const motivo = prompt('Por que esta ficha está sendo recusada?\n(fica no histórico)');
  if (motivo === null) return;
  if (!motivo.trim()) { alert('O motivo é obrigatório.'); return; }
  const { error } = await sb.from('fichas')
    .update({ status: 'Recusada', motivo_recusa: motivo.trim() }).eq('id', ID);
  if (error) { alert('Não consegui recusar: ' + error.message); return; }
  window.location.reload();
}

// ============================================================
// O FORMULÁRIO COMO FOI PREENCHIDO
//
// Tudo o que a pessoa respondeu, inclusive o que não tem coluna no CRM.
// É este cartão que se abre quando alguém pergunta "o que exatamente
// ele escreveu?" — e é o que se mostra numa auditoria de LGPD.
// ============================================================
// ============================================================
// DOCUMENTOS DA FICHA (v1.287)
//
// O que a pessoa anexou no formulário público. Ficava invisível: o
// arquivo ia para o Storage, o caminho para `fichas.anexos`, e nenhuma
// tela abria. O único código que os enxergava era o da exclusão, que
// os contava para avisar e apagava junto. Quem precisasse ver o RG
// tinha de entrar no painel do Supabase.
//
// POR QUE O ENDEREÇO É GERADO NA HORA DO CLIQUE
// Os baldes `documentos-proprietarios` e `documentos-locatarios` são
// privados, e é para continuarem assim: ali dentro há RG, CNH e
// comprovante de renda de gente que confiou na Moralí. Um endereço
// fixo e público abriria esses arquivos a qualquer um que tivesse o
// link — sem senha e sem registro de quem viu.
//
// O acesso, esse, é permanente: o cartão está sempre na ficha e o
// clique sempre funciona, hoje ou daqui a dois anos. O que se renova é
// o endereço, não o direito de ver. Mesma escolha dos anexos de caso e
// contrato desde a v1.105, e a mesma lição da auditoria de 14/08.
//
// O botão BAIXAR resolve o outro caso: quando o documento precisa sair
// do CRM e virar arquivo seu, numa pasta ou no Drive.
// ============================================================
const DOC_ICONE = { pdf: icone('documento', 16), jpg: icone('crachaId', 16),
                    jpeg: icone('crachaId', 16), png: icone('crachaId', 16),
                    heic: icone('crachaId', 16), webp: icone('crachaId', 16),
                    doc: icone('papelCaneta', 16), docx: icone('papelCaneta', 16) };

function docTamanho(b) {
  if (!b && b !== 0) return '';
  return b < 1024 * 1024 ? Math.round(b / 1024) + ' KB'
                         : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
}

/** Extrai o instante do envio do próprio nome do arquivo: o formulário
 *  grava `{token}/{Date.now()}_{nome}`. Sem isso não há data — a ficha
 *  guarda a lista, não quando cada arquivo subiu. */
function docQuando(caminho) {
  const m = String(caminho || '').match(/\/(\d{13})_/);
  if (!m) return '';
  return dataHoraBr(new Date(Number(m[1])).toISOString());
}

function blocoDocumentosFicha() {
  const lista = Array.isArray(registro && registro.anexos) ? registro.anexos : [];
  // ficha sem anexo não ganha cartão vazio: o envio é opcional no
  // formulário, e a maioria vem sem
  if (!lista.length) return '';

  const linhas = lista.map((a, i) => {
    if (!a || !a.bucket || !a.caminho) return '';
    const nome = a.nome || String(a.caminho).split('/').pop();
    const ext  = (nome.split('.').pop() || '').toLowerCase();
    const quando = docQuando(a.caminho);
    const detalhe = [ext ? ext.toUpperCase() : '', docTamanho(a.tamanho),
                     quando ? 'enviado em ' + quando : ''].filter(Boolean).join(' · ');
    return `<div class="doc-linha">
      <span class="doc-icone">${DOC_ICONE[ext] || icone('clipe', 16)}</span>
      <span class="doc-txt">
        <b>${htm(nome)}</b>
        <small>${htm(detalhe)}</small>
      </span>
      <button type="button" class="doc-acao" data-doc="${i}" data-modo="abrir">abrir ↗</button>
      <button type="button" class="doc-acao" data-doc="${i}" data-modo="baixar">baixar ⤓</button>
    </div>`;
  }).join('');

  return `<div class="cartao"><h2>Documentos enviados
      <span class="cnt">(${lista.length})</span></h2>
    <div class="doc-lista" id="doc-lista">${linhas}</div>
    <p class="msg-erro" id="doc-erro" style="margin:0 16px 14px"></p>
  </div>`;
}

/** Abre ou baixa um documento da ficha. O endereço nasce aqui, vale uma
 *  hora e serve a este clique — tempo de sobra para abrir ou salvar. */
async function usarDocumentoFicha(indice, modo) {
  const erro = document.getElementById('doc-erro');
  if (erro) { erro.style.display = 'none'; erro.textContent = ''; }

  const a = (registro.anexos || [])[indice];
  if (!a || !a.bucket || !a.caminho) return;

  const nome = a.nome || String(a.caminho).split('/').pop();
  const opcoes = modo === 'baixar' ? { download: nome } : undefined;

  const { data, error } = await sb.storage.from(a.bucket)
    .createSignedUrl(a.caminho, 3600, opcoes);

  // Falar a verdade sobre a falha: "não abriu" manda a pessoa tentar de
  // novo para sempre. O caso comum é o arquivo ter sido removido do
  // Storage, e aí clicar mais uma vez não resolve.
  if (error || !data || !data.signedUrl) {
    if (erro) {
      erro.textContent = 'Não foi possível abrir este documento: ' +
        ((error && error.message) || 'o arquivo não está mais no Storage') + '.';
      erro.style.display = 'block';
    }
    return;
  }

  if (modo === 'baixar') {
    const l = document.createElement('a');
    l.href = data.signedUrl; l.download = nome;
    document.body.appendChild(l); l.click(); l.remove();
  } else {
    window.open(data.signedUrl, '_blank', 'noopener');
  }
}

// Um ouvinte só, no documento: o cartão é redesenhado a cada mudança na
// ficha, e ouvinte preso em botão morre junto com o HTML antigo.
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('.doc-acao');
  if (!b) return;
  usarDocumentoFicha(Number(b.dataset.doc), b.dataset.modo);
});

// ============================================================
// v1.379 — A FICHA EM PAPEL (imprimir ou salvar em PDF)
//
// Monta uma folha A4 com o timbre da imobiliária e o que a pessoa
// preencheu, e chama a impressão do navegador — que é quem gera o PDF
// ("Salvar como PDF" no diálogo). Sem biblioteca de fora, como o
// demonstrativo de comissões já fazia desde a v1.267.
//
// O TIMBRE VEM DO CADASTRO, NUNCA DO CÓDIGO: `empresaDoTimbre()`
// (base.js) lê a empresa em foco, e `logoEmpresa()` traz o logotipo
// que o cabeçalho mostra. Quando o CRM atender outra imobiliária, a
// folha sai com a marca dela sozinha.
//
// Compacto por desenho: três colunas, rótulos pequenos, e BLOCO SEM
// NENHUMA RESPOSTA SOME INTEIRO (o cônjuge de quem é solteiro, a área
// de lazer de uma sala comercial). É isso que segura o documento em
// duas folhas — medido: locatário 272mm, proprietário PJ 337mm, e o
// pior caso de cada um em 332mm e 376mm (o útil de duas folhas é 546).
// ============================================================

/** Rótulos humanos dos campos dos dois formulários públicos
 *  (alugar.imoveismorali.com.br e cadastro.imoveismorali.com.br).
 *  Na TELA a ficha mostra a chave crua de propósito — é assim que se
 *  confere contra o que a pessoa viu; no PAPEL isso não serve. */
const FIC_ROTULOS = {
  quem_assina: 'Quem assina o contrato',
  loc_nome: 'Nome completo', loc_cpf: 'CPF', loc_nascimento: 'Nascimento',
  loc_estado_civil: 'Estado civil', loc_endereco: 'Onde mora hoje',
  loc_whatsapp: 'WhatsApp', loc_email: 'E-mail', loc_profissao: 'Em que trabalha',
  loc_tempo_servico: 'Há quanto tempo', loc_renda: 'Renda por mês',
  loc_outra_renda: 'Outra renda',
  conj_loc_nome: 'Nome do cônjuge', conj_loc_cpf: 'CPF do cônjuge',
  conj_loc_nascimento: 'Nascimento', conj_loc_whatsapp: 'WhatsApp',
  mor_nome: 'Nome de quem vai morar', mor_cpf: 'CPF', mor_nascimento: 'Nascimento',
  mor_estado_civil: 'Estado civil', mor_endereco: 'Onde mora hoje',
  mor_whatsapp: 'WhatsApp', mor_email: 'E-mail',
  perfil_reside: 'Quem vai morar no imóvel', perfil_animal: 'Tem animal',
  perfil_social: 'Programa social', data_pagamento: 'Melhor dia de pagamento',
  qtd_pessoas: 'Quantas pessoas',
  ref1_nome: 'Nome', ref1_relacao: 'Relação', ref1_whatsapp: 'WhatsApp',
  ref2_nome: 'Nome', ref2_relacao: 'Relação', ref2_whatsapp: 'WhatsApp',
  proprietario_tipo: 'Tipo de proprietário',
  pf_nome: 'Nome completo', pf_cpf: 'CPF', pf_rg: 'RG', pf_nascimento: 'Nascimento',
  pf_estado_civil: 'Estado civil', pf_whatsapp: 'WhatsApp', pf_email: 'E-mail',
  pf_endereco: 'Endereço residencial',
  pj_razao: 'Razão social', pj_ramo: 'Ramo de atividade', pj_cnpj: 'CNPJ',
  pj_abertura: 'Data de abertura', pj_email: 'E-mail da empresa',
  pj_telefone: 'Telefone da empresa', pj_endereco: 'Endereço da empresa',
  so_nome: 'Nome completo', so_cpf: 'CPF', so_rg: 'RG', so_nascimento: 'Nascimento',
  so_estado_civil: 'Estado civil', so_whatsapp: 'WhatsApp', so_email: 'E-mail',
  so_endereco: 'Endereço residencial',
  endereco_logradouro: 'Logradouro', endereco_numero: 'Número',
  endereco_complemento: 'Complemento', endereco_bairro: 'Bairro',
  endereco_cidade: 'Cidade', endereco_estado: 'Estado', endereco_cep: 'CEP',
  tipo_imovel: 'Tipo do imóvel', dormitorios: 'Dormitórios', banheiros: 'Banheiros',
  suites: 'Suítes', garagem: 'Garagem/Vagas', voltagem: 'Voltagem', andar: 'Andar',
  elevador: 'Elevador', valor_condominio: 'Condomínio (mês)',
  incluso: 'Incluso no condomínio', area_lazer: 'Área de lazer',
  valor_aluguel: 'Aluguel desejado', iptu_responsavel: 'Quem paga o IPTU',
  prazo_contrato: 'Prazo do contrato', uc_agua: 'UC água', uc_energia: 'UC energia',
  diferencial: 'Diferencial do imóvel', restricoes: 'Restrições ao uso',
  observacao: 'O que mais quis contar'
};

/** Os blocos do LOCATÁRIO (alugar.imoveismorali.com.br) */
const FIC_BLOCOS_LOC = [
  { t: 'Quem está pedindo', cs: ['quem_assina'], largos: ['quem_assina'] },
  { t: 'Dados do locatário',
    cs: ['loc_nome','loc_cpf','loc_nascimento','loc_estado_civil','loc_whatsapp',
         'loc_email','loc_profissao','loc_tempo_servico','loc_renda','loc_outra_renda',
         'loc_endereco'],
    largos: ['loc_endereco'], moeda: ['loc_renda'], datas: ['loc_nascimento'] },
  { t: 'Cônjuge', cx: true,
    cs: ['conj_loc_nome','conj_loc_cpf','conj_loc_nascimento','conj_loc_whatsapp'],
    datas: ['conj_loc_nascimento'] },
  { t: 'Quem vai morar (se for outra pessoa)', cx: true,
    cs: ['mor_nome','mor_cpf','mor_nascimento','mor_estado_civil','mor_whatsapp',
         'mor_email','mor_endereco'], largos: ['mor_endereco'], datas: ['mor_nascimento'] },
  { t: 'Perfil da locação',
    cs: ['perfil_reside','qtd_pessoas','perfil_animal','perfil_social','data_pagamento'],
    largos: ['perfil_reside'] },
  { t: 'Referência 1', cx: true, cs: ['ref1_nome','ref1_relacao','ref1_whatsapp'] },
  { t: 'Referência 2', cx: true, cs: ['ref2_nome','ref2_relacao','ref2_whatsapp'] }
];

/** Os do PROPRIETÁRIO (cadastro.imoveismorali.com.br). O bloco da
 *  pessoa física e o da jurídica convivem: o que não foi respondido
 *  some sozinho, então PF e PJ saem certos sem precisar decidir aqui. */
const FIC_BLOCOS_PROP = [
  { t: 'Quem é o proprietário', cs: ['proprietario_tipo'], largos: ['proprietario_tipo'] },
  { t: 'Proprietário — pessoa física',
    cs: ['pf_nome','pf_cpf','pf_rg','pf_nascimento','pf_estado_civil','pf_whatsapp',
         'pf_email','pf_endereco'], largos: ['pf_endereco'], datas: ['pf_nascimento'] },
  { t: 'Proprietário — pessoa jurídica',
    cs: ['pj_razao','pj_cnpj','pj_ramo','pj_abertura','pj_telefone','pj_email','pj_endereco'],
    largos: ['pj_endereco'], datas: ['pj_abertura'] },
  { t: 'Sócio ou representante', cx: true,
    cs: ['so_nome','so_cpf','so_rg','so_nascimento','so_estado_civil','so_whatsapp',
         'so_email','so_endereco'], largos: ['so_endereco'], datas: ['so_nascimento'] },
  { t: 'Endereço do imóvel',
    cs: ['endereco_logradouro','endereco_numero','endereco_complemento','endereco_bairro',
         'endereco_cidade','endereco_estado','endereco_cep'], largos: ['endereco_logradouro'] },
  { t: 'O imóvel',
    cs: ['tipo_imovel','dormitorios','banheiros','suites','garagem','voltagem','andar',
         'elevador','area_lazer'], largos: ['area_lazer'] },
  { t: 'Valores e condições',
    cs: ['valor_aluguel','valor_condominio','incluso','iptu_responsavel','prazo_contrato',
         'uc_agua','uc_energia'],
    moeda: ['valor_aluguel','valor_condominio'], largos: ['incluso','prazo_contrato'] },
  { t: 'Diferencial e restrições', cx: true, cs: ['diferencial','restricoes'],
    largos: ['diferencial','restricoes'] }
];

function ficValor(v, campo, bloco) {
  const cru = String(v === null || v === undefined ? '' : v).trim();
  if (cru === '') return { txt: '—', vazio: true };
  if ((bloco.datas || []).indexOf(campo) > -1 && /^\d{4}-\d{2}-\d{2}/.test(cru))
    return { txt: dataBr(cru), vazio: false };
  if ((bloco.moeda || []).indexOf(campo) > -1) {
    const n = (typeof numeroBr === 'function') ? numeroBr(cru) : Number(cru);
    if (n !== null && !isNaN(n)) return { txt: moeda(n), vazio: false };
  }
  return { txt: cru, vazio: false };
}

function ficBlocosHtml(dados) {
  const ehProp = /propriet/i.test(String(registro.tipo || ''));
  const blocos = ehProp ? FIC_BLOCOS_PROP : FIC_BLOCOS_LOC;
  const usados = {};
  let html = '';

  blocos.forEach(b => {
    const tem = b.cs.some(c => String(dados[c] || '').trim() !== '');
    if (!tem) return;                       // bloco vazio some inteiro
    const itens = b.cs.map(c => {
      usados[c] = true;
      const v = ficValor(dados[c], c, b);
      return `<div class="fic-item${(b.largos || []).indexOf(c) > -1 ? ' largo' : ''}">
        <span class="r">${htm(FIC_ROTULOS[c] || c)}</span>
        <span class="v${v.vazio ? ' vazio' : ''}">${htm(v.txt)}</span></div>`;
    }).join('');
    html += `<div class="fic-bloco"><h3>${htm(b.t)}</h3>
      <div class="fic-grade${b.cx ? ' fic-cx' : ''}">${itens}</div></div>`;
  });

  // o que a pessoa escreveu à mão
  if (String(dados.observacao || '').trim()) {
    usados.observacao = true;
    html += `<div class="fic-bloco"><h3>${htm(FIC_ROTULOS.observacao)}</h3>
      <div class="fic-obs">${htm(String(dados.observacao))}</div></div>`;
  }

  // REDE DE SEGURANÇA: campo que o formulário ganhar amanhã e ninguém
  // puser nos blocos acima cai aqui, em vez de sumir do documento.
  const sobra = Object.keys(dados).filter(k =>
    !usados[k] && k !== 'aceite_lgpd' && String(dados[k] || '').trim() !== '');
  if (sobra.length) {
    html += `<div class="fic-bloco"><h3>Outras respostas</h3>
      <div class="fic-grade">${sobra.map(k => `<div class="fic-item">
        <span class="r">${htm(FIC_ROTULOS[k] || k)}</span>
        <span class="v">${htm(String(dados[k]))}</span></div>`).join('')}</div></div>`;
  }
  return html;
}

async function imprimirFicha() {
  const em = empresaDoTimbre();
  const dados = (registro && registro.dados) || {};
  const hoje = new Date();

  const cabeca = [
    ['Quem enviou', registro.nome || '—', true],
    [registro.cpf_cnpj && String(registro.cpf_cnpj).replace(/\D/g, '').length > 11
      ? 'CNPJ' : 'CPF',
     registro.cpf_cnpj
       ? (typeof mascaraDoc === 'function' ? mascaraDoc(registro.cpf_cnpj) : registro.cpf_cnpj)
       : '—'],
    ['WhatsApp', registro.whatsapp
      ? (typeof mascaraTelefone === 'function' ? mascaraTelefone(registro.whatsapp)
                                               : registro.whatsapp) : '—'],
    ['Situação', (registro.status || '—')
      + (registro.dias_esperando ? ' · ' + registro.dias_esperando + ' dia(s) esperando' : '')]
  ];

  const area = document.getElementById('fic-print');
  area.innerHTML = `
    <div class="dem-topo">
      ${logoEmpresa(em.empresa, { altura: 46 })}
      <div class="dem-marca">
        <h1>${htm(em.nome || '')}</h1>
        <div class="dem-rz">${htm(em.razao || '')}</div>
      </div>
      <div class="dem-titulo">
        <div class="dem-tit">Ficha de cadastro${registro.tipo ? ' — ' + htm(registro.tipo) : ''}</div>
        <div class="dem-mes">${htm(registro.codigo || '')}${
          registro.criado_em ? ' · recebida em ' + htm(dataHoraBr(registro.criado_em)) : ''}</div>
      </div>
    </div>
    <div class="dem-dados">${cabeca.map(([r, v, forte]) => `<div>
      <div class="dem-r">${htm(r)}</div>
      <div class="dem-v">${forte ? '<b>' + htm(v) + '</b>' : htm(v)}</div></div>`).join('')}</div>
    ${ficBlocosHtml(dados)}
    ${registro.aceite_lgpd_em ? `<div class="fic-lgpd"><b>Consentimento (LGPD)</b> — aceito em
      ${htm(dataHoraBr(registro.aceite_lgpd_em))}${
      registro.aceite_lgpd_ip ? ', a partir do IP ' + htm(registro.aceite_lgpd_ip) : ''},
      no formulário público da imobiliária.</div>` : ''}
    <div class="dem-aviso">Documento gerado pelo CRM a partir do que a pessoa preencheu no
      formulário — os valores são declarados por ela e não foram conferidos pela
      imobiliária.</div>
    <div class="dem-pe">
      <div><b>${htm(em.razao || em.nome || '')}</b>${em.creci ? ' · CRECI ' + htm(em.creci) : ''}${
        em.email ? '<br>' + htm(em.email) : ''}${em.telefone ? ' · ' + htm(em.telefone) : ''}${
        em.cidade ? '<br>' + htm(em.cidade) : ''}</div>
      <div class="dem-dir">Documento gerado em ${htm(dataBr(hoje.toISOString().slice(0, 10)))}</div>
    </div>`;

  // O LOGOTIPO VEM DO STORAGE: sem esperar, a folha imprime com o
  // espaço em branco no lugar da marca. Dois segundos de teto para o
  // documento nunca ficar refém de uma imagem que não carrega.
  await Promise.all(Array.prototype.map.call(area.querySelectorAll('img'), img =>
    (img.complete && img.naturalWidth) ? Promise.resolve() : new Promise(pronto => {
      const fim = () => pronto();
      img.addEventListener('load', fim, { once: true });
      img.addEventListener('error', fim, { once: true });
      setTimeout(fim, 2000);
    })));

  document.body.classList.add('imprimindo');
  const sair = () => document.body.classList.remove('imprimindo');
  window.addEventListener('afterprint', sair, { once: true });
  window.print();
}

function blocoFormulario() {
  const d = (registro && registro.dados) || {};
  const chaves = Object.keys(d).filter(k => String(d[k] || '').trim() !== '');
  if (!chaves.length) return '';
  return `<div class="cartao"><h2>O formulário como foi preenchido
      <span class="cnt">(${chaves.length} respostas)</span></h2>
    <div class="fic-grade">${chaves.map(k => `<div>
      <span class="fic-rot">${htm(k)}</span>
      <span class="fic-val">${htm(String(d[k]))}</span></div>`).join('')}</div>
    <p style="font-size:12px;color:var(--texto-suave);padding:0 16px 14px;margin:0">
      Como a pessoa respondeu, sem tratamento. Os nomes são os do formulário —
      é assim que se confere contra o que ela viu na tela.</p>
  </div>`;
}


// ============================================================
// v1.343 — AGENDAR MENSAGEM (WhatsApp pela fila do CRM)
//
// O botão vive na ficha do LEAD e do CONTATO. A janela monta o texto
// (modelo ou do zero), resolve os atalhos {nome}/{imovel}/{valor}/...
// com os dados REAIS do registro, mostra a prévia como bolha de
// WhatsApp e chama a RPC `mensagem_agendar` — que valida de novo tudo
// no banco (telefone, atalho sem valor, horário protegido 8h–20h sem
// domingo, integração no Vault) e põe na fila. Quem envia é o pg_cron
// de 5 em 5 minutos, pela Evolution (msg.morali.app).
//
// A janela reusa o #modal da ficha no MESMO idioma das janelas de itens
// do contrato: monta o innerHTML direto, reprograma o #btn-salvar e
// não devolve nada — a próxima abrirModal() restaura o botão sozinha
// (é o que ela sempre fez, linha do btnJanela).
// ============================================================
let amCtx = null;          // { atalhos: {chave: valor}, modelos: [...] }
let amSim = null;          // v1.463 — a simulação que abriu a janela (ou null)

/** primeiro nome, para o "Oi {nome}" não sair com o nome inteiro */
function amPrimeiroNome(nome) {
  return String(nome || '').trim().split(/\s+/)[0] || '';
}

/**
 * v1.463 — os atalhos da simulação. São OS MESMOS NÚMEROS da linha do
 * cartão (aluguel + fiança, incêndio ÷ 6, entrada = fiança + setup):
 * número que a pessoa não reconhece é número errado, e o cartão é o
 * que o Rodrigo tem na frente quando clica em Enviar.
 *
 * O R$ vem embutido (decisão do Rodrigo, 31/08): no modelo escreve-se
 * `{fianca}`, nunca `R$ {fianca}`. É o mesmo formato do {valor} da
 * mensagem avulsa.
 *
 * Valor ausente NÃO vira zero — a chave simplesmente não nasce, e o
 * atalho fica vermelho na prévia travando o envio. "R$ 0,00" numa
 * mensagem de cliente é pior do que um erro na cara.
 */
function amAtalhosSimulacao(s) {
  const n = v => Number(v || 0);
  const a = {};
  const tem = v => v !== null && v !== undefined && v !== '';

  if (tem(s.status_fianca))  a.resultado   = s.status_fianca;
  if (tem(s.valor_aluguel))  a.aluguel     = moeda(s.valor_aluguel);
  if (tem(s.vr_fianca))      a.fianca      = moeda(s.vr_fianca);
  if (tem(s.valor_aluguel) && tem(s.vr_fianca))
                             a.soma_mensal = moeda(n(s.valor_aluguel) + n(s.vr_fianca));
  // v1.464 — o nome perdeu o dígito de propósito: a trava da
  // `mensagem_agendar` (no banco) procura `\{[a-z_]+\}` e não
  // enxergaria um `{incendio_6x}` deixado para trás. Só-letras faz
  // as DUAS travas valerem, aqui e lá.
  if (tem(s.vr_incendio))    a.incendio_parcela = moeda(n(s.vr_incendio) / 6);
  if (tem(s.vr_setup))       a.setup       = moeda(s.vr_setup);
  if (tem(s.vr_fianca) && tem(s.vr_setup))
                             a.entrada     = moeda(n(s.vr_fianca) + n(s.vr_setup));
  // o CPF sai MASCARADO, como no cartão: mensagem que vai para o
  // número errado não pode levar documento inteiro junto
  if (tem(s.cpf_analisado))  a.cpf = typeof mascaraDoc === 'function'
    ? mascaraDoc(String(s.cpf_analisado)) : String(s.cpf_analisado);
  if (tem(s.seguradora))     a.seguradora  = s.seguradora;
  return a;
}

async function abrirAgendarMensagem(opts) {
  amSim = (opts && opts.simulacao) || null;

  // os atalhos que ESTE registro consegue preencher — só esses viram chip
  const atalhos = { nome: amPrimeiroNome(registro.nome) };

  if (ALVO === 'lead' && registro.imovel_endereco) {
    atalhos.imovel = registro.imovel_endereco;          // v1.114 — captação
  }
  if (ALVO === 'contato') {
    // o contrato ativo do inquilino: uma consulta, só na abertura
    const { data: ct } = await sb.from('contratos')
      .select('codigo,valor_aluguel,dia_vencimento,imovel_id')
      .eq('inquilino_id', ID).eq('status', 'Ativo')
      .order('data_inicio', { ascending: false }).limit(1).maybeSingle();
    if (ct) {
      if (ct.valor_aluguel != null) atalhos.valor = moeda(ct.valor_aluguel);
      if (ct.dia_vencimento)  atalhos.vencimento = 'dia ' + ct.dia_vencimento;
      if (ct.codigo)          atalhos.contrato = ct.codigo;
      if (ct.imovel_id) {
        const { data: im } = await sb.from('imoveis')
          .select('endereco').eq('id', ct.imovel_id).maybeSingle();
        if (im && im.endereco) atalhos.imovel = im.endereco;
      }
    }
  }

  // v1.463 — a simulação empresta os números dela por cima
  if (amSim) Object.assign(atalhos, amAtalhosSimulacao(amSim));

  const { data: todos } = await sb.from('mensagem_modelos')
    .select('id,nome,categoria,texto,resultado_alvo')
    .eq('empresa_id', registro.empresa_id).eq('ativo', true)
    .order('nome');

  // Modelo com `resultado_alvo` é de simulação: fora dela os atalhos
  // {aluguel}/{fianca}/... não têm de onde sair, e o modelo só serviria
  // para o envio morrer no atalho vermelho. Some da lista avulsa.
  const modelos = (todos || []).filter(m => amSim ? m.resultado_alvo : !m.resultado_alvo);

  amCtx = { atalhos, modelos };

  const chips = Object.keys(atalhos).map(k =>
    `<button type="button" class="ma-chip" onclick="amInserir('${k}')">+ ${k}</button>`).join('')
    + `<button type="button" class="ma-chip ma-chip-corte" onclick="amInserirCorte()"
         title="Tudo depois desta linha vira uma mensagem separada">--- quebra a mensagem</button>`;
  const ops = ['<option value="">— escrever do zero —</option>']
    .concat(amCtx.modelos.map((m, i) =>
      `<option value="${i}">${htm(m.nome)}${m.categoria ? ' · ' + htm(m.categoria) : ''}</option>`))
    .join('');

  document.getElementById('modal-titulo').textContent =
    amSim ? 'Enviar simulação por WhatsApp' : 'Agendar mensagem';
  document.getElementById('modal-campos').innerHTML = `
    <div class="campo largo"><p class="aviso-empresa" style="margin:0">Para
      <b>${htm(registro.nome || '')}</b> · ${htm(registro.telefone || '')} — sai pelo WhatsApp
      da Moralí, na hora marcada</p></div>
    <div class="campo largo"><label>Modelo</label>
      <select id="am-modelo" onchange="amPreencherModelo()">${ops}</select>
      ${amSim ? `<small style="color:var(--texto-suave);font-size:12px;margin-top:4px;display:block">
        ${amCtx.modelos.length
          ? 'Vem escolhido pelo resultado da simulação. Para mudar o texto: '
            + 'Administração → Mensagens.'
          : '<b style="color:var(--erro)">Nenhum modelo de simulação cadastrado.</b> '
            + 'Escreva o texto abaixo, ou cadastre o modelo em Administração → Mensagens.'}</small>` : ''}</div>
    <div class="campo largo"><label>Mensagem</label>
      <textarea id="am-texto" rows="${amSim ? 9 : 5}" oninput="amAtualizarPrevia()"></textarea>
      <div class="ma-chips">${chips}</div>
      <small style="color:var(--texto-suave);font-size:12px;margin-top:6px;display:block">
        Clique no atalho para inserir. Na prévia abaixo ele já aparece trocado pelo dado real.
        A linha com <b>---</b> corta o texto: cada pedaço vira uma mensagem separada.</small>
    </div>
    <div class="campo largo"><label>Quando enviar</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:2px">
        <button type="button" class="btn" id="am-qdo-agora"
                style="padding:8px 16px;font-size:13.5px"
                onclick="amEscolheQuando(false)">Agora</button>
        <button type="button" class="btn btn-claro" id="am-qdo-depois"
                style="padding:8px 16px;font-size:13.5px"
                onclick="amEscolheQuando(true)">Marcar dia e hora</button>
      </div></div>
    <div class="campo" id="am-bloco-dia" style="display:none"><label>Dia</label>
      <input type="date" id="am-dia"></div>
    <div class="campo" id="am-bloco-hora" style="display:none"><label>Hora</label>
      <input type="time" id="am-hora" value="09:00"></div>
    <div class="campo largo" id="am-bloco-rapidos" style="display:none">
      <div class="ma-chips" style="margin-top:0">
      <button type="button" class="ma-chip" onclick="amQuandoRapido(0)">Hoje às 17h</button>
      <button type="button" class="ma-chip" onclick="amQuandoRapido(1)">Amanhã às 9h</button>
      <button type="button" class="ma-chip" onclick="amQuandoRapido(2)">Segunda às 9h</button>
    </div></div>
    <div class="campo largo">
      <div class="ma-bolha-caixa" id="am-previa"></div>
      <small style="color:var(--texto-suave);font-size:12px;margin-top:4px;display:block;text-align:center"
             id="am-previa-pe">É exatamente assim que a mensagem vai chegar.</small>
      <small style="color:var(--texto-suave);font-size:12px;margin-top:6px;display:block">
        O CRM não envia antes das 8h, depois das 20h nem aos domingos — o que cair fora é
        empurrado para o próximo horário útil.</small>
    </div>`;

  document.getElementById('modal-erro').style.display = 'none';
  const b = document.getElementById('btn-salvar');
  b.textContent = 'Enviar agora';        // v1.346 — o padrão é já
  b.setAttribute('onclick', 'confirmarAgendarMensagem()');
  b.disabled = false;
  document.getElementById('modal').classList.add('aberto');

  // dia padrão: amanhã, já preenchido para quem trocar para "depois"
  amQuandoRapido(1);
  amEscolheQuando(false);          // v1.347 — reabrir volta ao padrão

  // v1.463 — vindo da simulação, o modelo do RESULTADO já vem escolhido.
  // Mais de um modelo para o mesmo resultado: vence o primeiro em ordem
  // de nome (a lista está ordenada) — e o seletor continua ali para
  // trocar num clique.
  if (amSim) {
    const i = amCtx.modelos.findIndex(m => m.resultado_alvo === amSim.status_fianca);
    if (i >= 0) {
      document.getElementById('am-modelo').value = String(i);
      amPreencherModelo();
    }
  }
  amAtualizarPrevia();
}

/** v1.463 — os pedaços da mensagem: a linha só com --- é a tesoura. */
function amPartes(texto) {
  return String(texto || '').split(/\n[ \t]*-{3,}[ \t]*(?=\n|$)/)
    .map(t => t.trim()).filter(Boolean);
}

/** v1.463 — a tesoura, pelo chip */
function amInserirCorte() {
  const el = document.getElementById('am-texto');
  const p  = el.selectionStart || el.value.length;
  el.value = el.value.slice(0, p) + '\n---\n' + el.value.slice(el.selectionEnd || p);
  el.focus();
  amAtualizarPrevia();
}

/** o texto com os atalhos trocados; o que não tem valor fica marcado */
function amResolver(texto) {
  // v1.464 — O ALFABETO ACEITA DÍGITO. Ele era `[a-z_]+` e o
  // `{incendio_6x}` da v1.463 caía fora dele: não era trocado, e as
  // duas travas de "atalho sem valor" (esta tela e a mensagem_agendar)
  // também não o viam — a chave ia INTEIRA para o cliente. Um atalho
  // que o resolver não conhece tem de ficar VISÍVEL, nunca invisível.
  return String(texto || '').replace(/\{([a-z0-9_]+)\}/g, (tudo, chave) =>
    (amCtx && amCtx.atalhos[chave]) ? amCtx.atalhos[chave] : tudo);
}

function amPreencherModelo() {
  const i = document.getElementById('am-modelo').value;
  if (i === '') return;
  const m = amCtx.modelos[Number(i)];
  if (!m) return;
  document.getElementById('am-texto').value = m.texto;
  amAtualizarPrevia();
}

/** declarada de propósito: id dinâmico só passa nas conferências assim */
function amInserir(chave) {
  const el = document.getElementById('am-texto');
  const p = el.selectionStart || el.value.length;
  el.value = el.value.slice(0, p) + '{' + chave + '}' + el.value.slice(el.selectionEnd || p);
  el.focus();
  amAtualizarPrevia();
}

function amAtualizarPrevia() {
  const cru = document.getElementById('am-texto').value;
  const partes = amPartes(amResolver(cru));
  // atalho sem valor aparece em vermelho — e trava o envio lá no confirmar
  const pintar = t => htm(t).replace(/\{[a-z0-9_]+\}/g,
    x => '<span style="color:var(--erro);font-weight:700">' + x + '</span>');

  // v1.463 — um balão por pedaço, na ordem em que vão sair
  document.getElementById('am-previa').innerHTML = partes.length
    ? partes.map(t => `<div class="ma-bolha">${pintar(t)}</div>`).join('')
    : '<div class="ma-bolha"><span style="opacity:.5">Escreva a mensagem…</span></div>';

  const pe = document.getElementById('am-previa-pe');
  if (pe) pe.textContent = partes.length > 1
    ? `É exatamente assim que as ${partes.length} mensagens vão chegar, nesta ordem.`
    : 'É exatamente assim que a mensagem vai chegar.';
}

/** v1.347 — Agora × Agendar são DOIS BOTÕES (o rádio ficava ilegível
 *  no celular): o escolhido fica escuro, o outro claro — o mesmo
 *  idioma do alternador Planos|Ações.
 *
 *  v1.465 — OS RÓTULOS PERDERAM O "ENVIAR". Eram "Enviar agora" e
 *  "Agendar para depois", os MESMOS do botão de ação lá embaixo. Na
 *  janela da simulação (alta, 1438px numa tela de 671) o único
 *  "Enviar agora" que cabia na dobra era este — que, já escolhido,
 *  não muda nada na tela ao ser clicado. O Rodrigo clicou nele e
 *  disse "o botão não está funcionando", com razão: aqui se ESCOLHE
 *  quando, quem envia é o botão da barra. Agora são "Agora" e
 *  "Marcar dia e hora", e nenhum rótulo se repete na janela.
 *  O padrão continua sendo agora — a
 *  mensagem entra na fila com o horário de agora e a tela cutuca o
 *  disparador com a MIRA no id dela (mensagem_disparar_agora), então
 *  sai em segundos, sem esperar atrás do lote de outra pessoa. */
let amDepois = false;
function amEscolheQuando(depois) {
  amDepois = !!depois;
  document.getElementById('am-qdo-agora').className  =
    'btn' + (amDepois ? ' btn-claro' : '');
  document.getElementById('am-qdo-depois').className =
    'btn' + (amDepois ? '' : ' btn-claro');
  document.getElementById('am-bloco-dia').style.display     = amDepois ? '' : 'none';
  document.getElementById('am-bloco-hora').style.display    = amDepois ? '' : 'none';
  document.getElementById('am-bloco-rapidos').style.display = amDepois ? '' : 'none';
  document.getElementById('btn-salvar').textContent =
    amDepois ? 'Agendar envio' : 'Enviar agora';
}

/** agora, no fuso fixo da casa (-03:00, como no casos.js) */
function amAgoraIso() {
  return amIso(new Date());
}

/** v1.463 — a mesma escrita de data, agora servindo os dois usos */
function amIso(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
       + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '-03:00';
}

/**
 * v1.463 — o mesmo instante, `seg` segundos à frente. É o que dá ORDEM
 * às partes: o disparador percorre a fila por `enviar_em`, então 1
 * segundo entre elas basta para a segunda nunca passar na frente da
 * primeira. A pausa de verdade (5 a 12s, para o WhatsApp não ver
 * rajada) quem põe é o `mensagens_disparar`, no banco.
 */
function amIsoMais(iso, seg) {
  const d = new Date(iso);
  d.setSeconds(d.getSeconds() + seg);
  return amIso(d);
}

function amQuandoRapido(n) {
  const d = new Date();
  if (n === 0)      { document.getElementById('am-hora').value = '17:00'; }
  else if (n === 1) { d.setDate(d.getDate() + 1);
                      document.getElementById('am-hora').value = '09:00'; }
  else              { d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
                      document.getElementById('am-hora').value = '09:00'; }
  document.getElementById('am-dia').value =
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

async function confirmarAgendarMensagem() {
  const erroEl = document.getElementById('modal-erro');
  erroEl.style.display = 'none';
  const texto = amResolver(document.getElementById('am-texto').value).trim();
  const agora = !amDepois;
  const dia   = document.getElementById('am-dia').value;
  const hora  = document.getElementById('am-hora').value;

  const falhar = m => { erroEl.textContent = m; erroEl.style.display = 'block'; };
  if (!texto)                    return falhar('Escreva a mensagem.');
  if (/\{[a-z0-9_]+\}/.test(texto)) return falhar('A mensagem tem atalho sem valor '
    + '(em vermelho na prévia). Apague-o ou preencha o dado na ficha.');
  if (!agora && (!dia || !hora)) return falhar('Escolha o dia e a hora.');

  const iSel = document.getElementById('am-modelo').value;
  const modeloNome = iSel === '' ? null : amCtx.modelos[Number(iSel)].nome;

  // v1.463 — uma linha de fila por pedaço. O `base` é o mesmo instante
  // para todas; cada uma nasce 1 segundo depois da anterior, e é isso
  // que garante a ORDEM (o disparador percorre por `enviar_em`).
  const partes = amPartes(texto);
  // texto só com tesouras: nada a enviar, e o laço passaria batido
  if (!partes.length) return falhar('Escreva a mensagem.');
  const base = agora ? amAgoraIso() : dia + 'T' + hora + ':00-03:00';  // fuso explícito, como no casos.js

  const b = document.getElementById('btn-salvar');
  b.disabled = true;

  const ids = [];
  let primeira = null;
  for (let i = 0; i < partes.length; i++) {
    const { data, error } = await sb.rpc('mensagem_agendar', {
      p_empresa: registro.empresa_id,
      p_lead:    ALVO === 'lead' ? ID : null,
      p_contato: ALVO === 'contato' ? ID : null,
      p_destinatario: registro.nome || '',
      p_telefone: registro.telefone,
      p_texto: partes[i],
      // o contador de usos do modelo conta o ENVIO, não os pedaços
      p_modelo: i === 0 ? modeloNome : null,
      p_quando: amIsoMais(base, i)
    });
    if (error) {
      b.disabled = false;
      // as anteriores já estão na fila e VÃO SAIR — dizer isso é o que
      // impede o "clico de novo" que manda a primeira duas vezes
      return falhar(ids.length
        ? `A mensagem ${i + 1} de ${partes.length} não entrou na fila (${error.message}). `
          + `As ${ids.length} anteriores já foram enviadas — confira em `
          + `Administração → Mensagens antes de tentar de novo.`
        : error.message);
    }
    ids.push(data.id);
    if (i === 0) primeira = data;
  }
  b.disabled = false;

  const ajustada = primeira && primeira.ajustada;
  fecharModal();

  // v1.463 — o carimbo da simulação: a fila aceitou, o envio está
  // contratado. Quem falhar depois aparece em Administração →
  // Mensagens com o motivo, e o botão continua oferecendo "Reenviar".
  if (amSim) {
    const { error: eSim } = await sb.rpc('simulacao_marcar_enviada',
      { p_simulacao_id: amSim.id });
    if (eSim) alerta('As mensagens entraram na fila, mas o carimbo de "enviada" '
                   + 'não gravou: ' + eSim.message);
    amSim = null;
    await recarregarSimulacoes();
  }

  if (agora && !ajustada) {
    // o cutucão: o mesmo disparador do cron, sem esperar o relógio.
    // Se falhar, nada se perde — o cron pega em até 5 minutos.
    //
    // COM MIRA (1 pedaço) sai na hora, sem pausa. SEM MIRA (vários), o
    // disparador manda o lote inteiro com a pausa de 5 a 12s entre um e
    // outro — é a proteção contra rajada, e por isso a chamada não é
    // esperada: ela segura o servidor por ~10s por mensagem extra, e a
    // tela não tem por que ficar parada olhando.
    if (ids.length === 1) {
      try { await sb.rpc('mensagem_disparar_agora', { p_id: ids[0] }); } catch (e) { /* o cron cobre */ }
      alerta('Enviada! A mensagem sai pelo WhatsApp da Moralí em instantes.');
    } else {
      sb.rpc('mensagem_disparar_agora', {}).then(() => {}, () => {});   // o cron cobre
      alerta(`Enviando! As ${ids.length} mensagens saem pelo WhatsApp da Moralí em `
           + 'sequência, com alguns segundos entre elas.');
    }
  } else {
    alerta(ajustada
      ? 'O horário caía fora da janela permitida (8h–20h, sem domingo), então a '
        + (ids.length > 1 ? 'primeira mensagem foi agendada' : 'mensagem foi agendada')
        + ' para ' + dataHoraBr(primeira.enviar_em) + '.'
      : (ids.length > 1 ? `As ${ids.length} mensagens foram agendadas` : 'Mensagem agendada')
        + '. Sai pelo WhatsApp da Moralí na hora marcada; a fila '
        + 'fica em Administração → Mensagens.');
  }
}


// ============================================================
// v1.349 — A CONVERSA DENTRO DA FICHA
//
// O cartão mostra a linha do tempo INTEIRA (o que a fila mandou, o que
// a pessoa respondeu, o que saiu pelo celular) e o compositor embaixo:
// Enviar sai na hora (conversa_enviar, sem horário protegido — é
// reação); o 🕒 abre a janela de agendar de sempre. Registro que nunca
// conversou começa aqui — a conversa nasce no primeiro envio.
//
// O interruptor 🔕 é o "não gravar conversas deste contato": a
// portaria descarta o que chegar; enviadas pela fila continuam. Pedido
// do Rodrigo para o proprietário-amigo com quem o papo é pessoal.
// ============================================================
let convFicha = null;    // a linha de `conversas` deste registro (ou null)
let convFioFoto = '';    // v1.355 — a última pintura do fio; igual = não redesenha
let convFichaCanal = null;   // v1.356 — a assinatura de tempo real (uma por ficha)

function convTelNormalizado() {
  let d = String(registro.telefone || '').replace(/\D/g, '');
  if (d.slice(0, 2) === '55' && (d.length === 12 || d.length === 13)) d = d.slice(2);
  return d;
}

function irParaConversa() {
  const el = document.getElementById('conv-cartao');
  if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const t = document.getElementById('conv-texto'); if (t) t.focus(); }
}

async function carregarConversaFicha() {
  const tel = convTelNormalizado();
  if (tel.length < 10) return;                    // sem telefone, sem cartão

  const partes = [
    ALVO === 'lead' ? 'lead_id.eq.' + ID : 'contato_id.eq.' + ID,
    'telefone.eq.' + tel
  ];
  const { data } = await sb.from('conversas')
    .select('*').or(partes.join(',')).limit(1);
  convFicha = (data && data[0]) || null;

  // v1.445 — no contato o cartão tem LUGAR no layout (o encaixe
  // #conv-slot, id 'conversa' no registro): entra lá, na posição que o
  // editor mandar; encaixe ausente = o layout tirou o cartão, e a
  // conversa continua na tela Conversas. No lead segue como era: o fim
  // da coluna esquerda, como o bloco do portal.
  const slot = document.getElementById('conv-slot');
  const col = document.querySelector('.col-esq');
  if (ALVO === 'contato' && !slot) return;
  if ((!slot && !col) || document.getElementById('conv-cartao')) return;
  const aguarda = convFicha && convFicha.situacao === 'aguardando';
  // id no TEMPLATE literal (e não via .id=): é assim que as
  // conferências do repositório enxergam que o id existe
  const casca = `<div class="cartao" id="conv-cartao">
    <h2>Conversa de WhatsApp
      <span class="cnt" id="conv-estado">${aguarda
        ? '<span style="color:var(--erro);font-weight:700">aguardando resposta</span>' : ''}</span>
      <span class="dir" style="display:flex;gap:6px">
        <button class="btn btn-claro" style="padding:3px 10px;font-size:11.5px"
          title="Fixar no canto da tela — a conversa te acompanha em qualquer tela do CRM"
          onclick="abrirChatFixo('${registro.empresa_id}','${ALVO === 'contato' ? ID : ''}','${
          ALVO === 'lead' ? ID : ''}','${jsq(registro.nome || '')}','${
          String(registro.telefone || '').replace(/\D/g, '')}')">${icone('pin', 13)} Fixar</button>
        <button class="btn btn-claro" style="padding:3px 10px;font-size:11.5px"
          id="conv-btn-gravar" data-perm="${OBJETO_PERM()}:editar"
          onclick="alternarGravarConversa()"></button></span></h2>
    <div class="cv-fio" id="conv-fio" style="max-height:320px"></div>
    <div class="cv-resposta">
      <textarea id="conv-texto" rows="1"
        placeholder="Escrever para ${htm((registro.nome || '').split(' ')[0] || 'a pessoa')}…"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();enviarConversaFicha();}"></textarea>
      <button class="btn btn-claro" title="Agendar em vez de enviar agora"
        style="padding:9px 12px" onclick="abrirAgendarMensagem()">${icone('relogio', 15)}</button>
      <button class="btn" onclick="enviarConversaFicha()">Enviar</button>
    </div>
  </div>`;
  if (slot) slot.innerHTML = casca;
  else col.insertAdjacentHTML('beforeend', casca);
  if (typeof aplicarPermissoes === 'function') aplicarPermissoes();
  pintarGravarConversa();
  await desenharFioFicha();

  // v1.355 — o fio se renova sozinho, no mesmo passo da caixa fixa e
  // da tela Conversas (20s). Sem isto a resposta do cliente aparecia
  // na caixa fixa e "atrasava" no cartão: ele só redesenhava no envio.
  // v1.356 — o relógio virou rede de segurança: quem traz a mensagem
  // na hora é a assinatura de tempo real logo abaixo.
  if (typeof window !== 'undefined' && !window.__convFichaTimer) {
    window.__convFichaTimer = setInterval(atualizarConversaFicha, 20000);
  }
  convFichaAssinar();
}

/**
 * v1.356 — A MENSAGEM CHEGA EMPURRADA. O banco avisa (Realtime do
 * Supabase, tabela mensagens_conversa na publicação — sql-01) e o
 * cartão repinta na hora, sem esperar a batida. O RLS vale na
 * assinatura: só chegam avisos de linha que a pessoa pode ler.
 *
 * Enquanto a conversa não existe, a escuta é pela EMPRESA (a primeira
 * resposta cria a conversa pela portaria); quando a conversa aparece,
 * a escuta afina para só ela. Se o tempo real cair, ninguém percebe:
 * a batida de 20s continua cobrindo.
 */
function convFichaAssinar() {
  try {
    if (typeof sb === 'undefined' || typeof sb.channel !== 'function') return;
    const filtro = convFicha
      ? 'conversa_id=eq.' + convFicha.id
      : 'empresa_id=eq.' + registro.empresa_id;
    if (convFichaCanal) {
      if (convFichaCanal.__filtro === filtro) return;   // nada mudou
      sb.removeChannel(convFichaCanal);
    }
    convFichaCanal = sb.channel('conv-ficha-' + ID)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_conversa', filter: filtro },
        () => { atualizarConversaFicha(); })
      .subscribe();
    convFichaCanal.__filtro = filtro;
  } catch (e) { console.warn('conversa tempo real:', e); }
}

/**
 * v1.355 — A BATIDA DE 20s DO CARTÃO. Reconsulta a conversa (a
 * situação "aguardando resposta", o 🔕 e a conversa que nasceu pela
 * portaria DEPOIS de o cartão abrir) e redesenha o fio. O redesenho é
 * pulado quando nada mudou — ver a foto em desenharFioFicha — para a
 * rolagem de quem está lendo o histórico não pular para o fim.
 */
async function atualizarConversaFicha() {
  try {
    if (!document.getElementById('conv-cartao')) return;
    const caixa = document.getElementById('conv-texto');
    if (caixa && caixa.disabled) return;          // envio em andamento
    const tel = convTelNormalizado();
    if (tel.length < 10) return;

    const partes = [
      ALVO === 'lead' ? 'lead_id.eq.' + ID : 'contato_id.eq.' + ID,
      'telefone.eq.' + tel
    ];
    const { data } = await sb.from('conversas')
      .select('*').or(partes.join(',')).limit(1);
    convFicha = (data && data[0]) || convFicha;

    const est = document.getElementById('conv-estado');
    if (est) est.innerHTML = (convFicha && convFicha.situacao === 'aguardando')
      ? '<span style="color:var(--erro);font-weight:700">aguardando resposta</span>' : '';
    pintarGravarConversa();
    convFichaAssinar();   // v1.356 — a conversa nasceu? afina a escuta
    await desenharFioFicha();
  } catch (e) { console.warn('conversa-ficha:', e); }
}

function pintarGravarConversa() {
  const b = document.getElementById('conv-btn-gravar');
  if (!b) return;
  const gravando = !convFicha || convFicha.gravar !== false;
  b.innerHTML = gravando ? icone('sinoCortado', 13) + ' Não gravar'
    : icone('sino', 13) + ' Voltar a gravar';
  b.title = gravando
    ? 'Parar de guardar as conversas desta pessoa no CRM (enviadas pela fila continuam)'
    : 'Voltar a guardar as conversas desta pessoa no CRM';
}

async function desenharFioFicha() {
  const fio = document.getElementById('conv-fio');
  if (!fio) return;

  if (convFicha && convFicha.gravar === false) {
    convFioFoto = '';   // v1.355 — religar a gravação repinta o fio de verdade
    fio.innerHTML = '<div class="cv-vazio">' + icone('sinoCortado', 13) + ' As conversas desta pessoa <b>não são '
      + 'gravadas</b> no CRM — o que chegar é descartado. Enviar por aqui e pela fila '
      + 'continua funcionando (e fica na aba Mensagens). O que foi gravado antes não é apagado.</div>';
    return;
  }

  const pedacos = [];
  let reacoes = {};
  if (convFicha) {
    // v1.365 — a mídia vem junto e vira bolha de verdade (base.js)
    // v1.454 — wa_id e reage_a: a reação cola na mensagem reagida
    const { data: mc } = await sb.from('mensagens_conversa')
      .select('wa_id,de_mim,autor_nome,tipo,texto,recebida_em,midia_caminho,midia_mime,'
            + 'midia_bytes,reage_a')
      .eq('conversa_id', convFicha.id)
      .order('recebida_em', { ascending: true }).limit(300);
    reacoes = cvReacoesDoFio(mc || []);
    (mc || []).forEach(m => {
      pedacos.push({
        t: m.recebida_em, lado: m.de_mim ? 'nosso' : 'deles',
        autor: m.de_mim ? 'pelo celular' : null,
        texto: (m.tipo === 'texto' || m.tipo === 'reacao') ? (m.texto || '') : '',
        html: (m.tipo !== 'texto' && m.tipo !== 'reacao') ? midiaBolhaHtml(m) : null,
        figurinha: m.tipo === 'figurinha' && !!m.midia_caminho,
        wa: m.wa_id || null,
        // v1.455 — pastilha se o alvo estiver no fio; linha do meio se
        // não estiver (ver conversas-msg.js)
        reacaoSolta: m.tipo === 'reacao' ? (m.reage_a || '—') : null,
        status: ''
      });
    });
  }
  {
    const ids = [ID, convFicha && convFicha.lead_id, convFicha && convFicha.contato_id]
      .filter(Boolean);
    const ou = [];
    ids.forEach(x => { ou.push('lead_id.eq.' + x); ou.push('contato_id.eq.' + x); });
    const { data: ma } = await sb.from('mensagens_agendadas')
      // v1.455 — wa_id: mensagem ainda na fila também pode ser reagida
      .select('wa_id,texto,situacao,enviar_em,enviada_em,criada_por_nome,modelo_nome,erro')
      .or(ou.join(','))
      .order('enviar_em', { ascending: true }).limit(300);
    (ma || []).forEach(m => {
      if (m.situacao === 'cancelada') return;
      pedacos.push({
        t: m.enviada_em || m.enviar_em,
        wa: m.wa_id || null,          // v1.455 — pode receber pastilha
        lado: m.situacao === 'falhou' ? 'falhou' : 'nosso',
        autor: (m.criada_por_nome ? m.criada_por_nome + ' · pela Moralí' : 'pela fila')
             + (m.modelo_nome ? ' · ' + m.modelo_nome : ''),
        texto: m.texto || '',
        status: m.situacao === 'enviada' ? ' ✓✓'
              : m.situacao === 'falhou' ? ' ' + icone('aviso', 11) + ' não saiu'
              : ' ' + icone('relogio', 11) + ' agendada'
      });
    });
  }

  pedacos.sort((a, b) => new Date(a.t) - new Date(b.t));
  const vistos = {};   // wa duplicata visual (mesma msg pela fila e pelo eco) não há:
                       // o banco já dedupa; aqui só desenhamos

  // v1.455 — quais bolhas existem neste fio (ver conversas-msg.js)
  const noFio = new Set(pedacos.filter(p => p.wa && !p.reacaoSolta).map(p => p.wa));

  let dia = '', html = '';
  pedacos.forEach(p => {
    const dd = new Date(p.t), hoje = new Date();
    const chave = dd.toISOString().slice(0, 10);
    const rotulo = chave === hoje.toISOString().slice(0, 10) ? 'hoje' : dataBr(chave);
    // v1.455 — a reação decide o que é ANTES da tarja do dia
    if (p.reacaoSolta) {
      if (noFio.has(p.reacaoSolta) || !p.texto) return;   // é pastilha, ou foi retirada
      if (rotulo !== dia) { html += `<div class="cv-dia"><span>${htm(rotulo)}</span></div>`; dia = rotulo; }
      html += cvReacaoLinhaHtml(p.texto, p.lado === 'nosso');
      return;
    }
    if (rotulo !== dia) { html += `<div class="cv-dia"><span>${htm(rotulo)}</span></div>`; dia = rotulo; }
    const hora = String(dd.getHours()).padStart(2, '0') + ':' + String(dd.getMinutes()).padStart(2, '0');
    // v1.454 — figurinha sem bolha; pastilha da reação na bolha reagida
    const chip = cvReacaoHtml(p.wa ? reacoes[p.wa] : '');
    html += `<div class="${p.figurinha ? 'cv-figurinha' : 'cv-msg'} ${p.lado}${
        chip ? ' com-reacao' : ''}">`
      + (p.autor ? `<span class="cv-autor">${htm(p.autor)}</span>` : '')
      + (p.html || htm(p.texto))
      + chip
      // v1.388 — mesmo conserto do conversas-msg.js: o status traz o
      // SVG do ícone e não pode passar por htm(). Aqui ele é só
      // marcação nossa, sem texto de fora.
      + `<span class="cv-hora">${htm(hora)}${p.status}</span></div>`;
  });

  const conteudo = html || `<div class="cv-vazio">Nenhuma conversa com ${
    htm((registro.nome || '').split(' ')[0] || 'esta pessoa')} ainda. Escreva abaixo e a
    primeira mensagem sai pelo WhatsApp da imobiliária — a resposta chega aqui.</div>`;
  // v1.355 — nada mudou, nada se mexe: a batida de 20s não pode roubar
  // a rolagem de quem está lendo o histórico lá em cima
  if (conteudo === convFioFoto) return;
  convFioFoto = conteudo;
  fio.innerHTML = conteudo;
  fio.scrollTop = fio.scrollHeight;
  // v1.365 — assina os links das mídias e desce de novo depois delas
  if (typeof assinarMidias === 'function') {
    assinarMidias(fio).then(() => { fio.scrollTop = fio.scrollHeight; });
  }
}

async function enviarConversaFicha() {
  const caixa = document.getElementById('conv-texto');
  const texto = caixa.value.trim();
  if (!texto) return;
  caixa.disabled = true;
  const { data, error } = await sb.rpc('conversa_enviar', {
    p_empresa: registro.empresa_id, p_texto: texto,
    p_conversa: convFicha ? convFicha.id : null,
    p_lead: ALVO === 'lead' ? ID : null,
    p_contato: ALVO === 'contato' ? ID : null });
  caixa.disabled = false;
  if (error) { alerta('Não foi possível enviar: ' + error.message); return; }
  caixa.value = '';
  if (!convFicha && data && data.conversa_id) {
    const { data: c } = await sb.from('conversas').select('*')
      .eq('id', data.conversa_id).maybeSingle();
    convFicha = c || null;
    convFichaAssinar();   // v1.356 — o primeiro envio criou a conversa
  }
  await desenharFioFicha();
}

async function alternarGravarConversa() {
  const desligar = !convFicha || convFicha.gravar !== false;
  if (desligar && !confirm('Parar de gravar as conversas desta pessoa no CRM?\n\n'
    + 'O que chegar dela será descartado. Enviar pela fila (recibo, lembrete, '
    + 'aniversário) continua funcionando. O que já foi gravado permanece.')) return;
  const { data, error } = await sb.rpc('conversa_gravar_definir', {
    p_empresa: registro.empresa_id, p_gravar: !desligar,
    p_conversa: convFicha ? convFicha.id : null,
    p_lead: ALVO === 'lead' ? ID : null,
    p_contato: ALVO === 'contato' ? ID : null });
  if (error) { alerta(error.message); return; }
  if (!convFicha && data && data.conversa_id) {
    const { data: c } = await sb.from('conversas').select('*')
      .eq('id', data.conversa_id).maybeSingle();
    convFicha = c || null;
  } else if (convFicha) {
    convFicha.gravar = !desligar;
  }
  pintarGravarConversa();
  await desenharFioFicha();
}

// ============================================================
// v1.438 — FINANCEIRO DESTE CONTATO (mockup aprovado em 30/08/2026)
//
// O cartão que responde "como está o dinheiro deste contato?" sem
// sair da ficha: 3 números (realizado no ano / em aberto / atrasado)
// e a lista dos lançamentos — inquilino vê entradas em verde,
// proprietário vê os repasses em vermelho (valor negativo).
//
// Sem SQL: lê a MESMA tabela do Livro Caixa (`lancamentos`), filtrada
// pelo contato, e calcula a situação com as mesmas palavras de lá.
// Só aparece para quem tem Financeiro·ver (o pode() esconde; a RLS
// recusa por baixo de qualquer jeito — erro = cartão nem nasce).
// Regra da casa (30/08): registro listado é registro clicável — cada
// linha abre a janela do lançamento no Livro Caixa (?lancamento=).
// ============================================================
let FIN_FICHA = [];        // os lançamentos do contato
let FIN_FICHA_TUDO = false;
let FIN_TOKENS = {};       // v1.475 — competencia_id → recibo_token

async function carregarFinanceiroFicha() {
  if (typeof pode === 'function' && !pode('financeiro', 'ver')) return;
  const { data, error } = await sb.from('lancamentos')
    .select('id,historico,valor,data_prevista,data_realizada,competencia_id')
    .eq('contato_id', ID)
    .order('data_prevista', { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) return;                    // sem alcance ao financeiro: sem cartão
  FIN_FICHA = data || [];

  // v1.475 — O RECIBO VEM PARA CÁ. O cartão Repasses saía da ficha e
  // levava junto o único caminho para o documento do mês; ele passa a
  // ser uma coluna daqui. O token não está no lançamento: vem da
  // competência que o lançamento aponta, numa consulta só para todas.
  FIN_TOKENS = {};
  const comps = [...new Set(FIN_FICHA.map(l => l.competencia_id).filter(Boolean))];
  if (comps.length) {
    const { data: cs } = await sb.from('competencias_painel')
      .select('id,recibo_token').in('id', comps);
    (cs || []).forEach(c => { if (c.recibo_token) FIN_TOKENS[c.id] = c.recibo_token; });
  }

  const col = document.querySelector('.col-esq');
  if (!col || document.getElementById('fin-cartao')) return;
  // v1.475 — um cartão de dinheiro só na ficha do contato. O Repasses
  // sai DEPOIS que este entrou, nunca antes: se a consulta acima
  // falhasse (papel sem alcance, rede), o `return` lá em cima já teria
  // acontecido e o Repasses continuaria de pé com o recibo.
  const velho = document.getElementById('rep-cartao');
  if (velho) velho.remove();

  col.insertAdjacentHTML('beforeend', `<div class="cartao" id="fin-cartao">
    <h2>Financeiro deste contato
      <span class="dir">${FIN_FICHA.length
        ? `<a class="btn btn-claro" style="padding:3px 10px;font-size:11.5px"
             href="financeiro.html?contato=${encodeURIComponent(ID)}"
             title="O Livro Caixa filtrado neste contato">Abrir no Livro Caixa ↗</a>` : ''}</span></h2>
    <div id="fin-cartao-miolo"></div>
  </div>`);
  finFichaPintar();
}

function finFichaSituacao(l) {
  if (l.data_realizada) return { r: 'Realizado', cls: 'tag-verde' };
  if (!l.data_prevista) return { r: 'Previsto', cls: 'tag-cinza' };
  const hoje = new Date().toISOString().slice(0, 10);
  if (l.data_prevista < hoje) return { r: 'Atrasado', cls: 'tag-vermelha' };
  if (l.data_prevista === hoje) return { r: 'Vence hoje', cls: 'tag-amarela' };
  return { r: 'No prazo', cls: 'tag-cinza' };
}

function finFichaPintar() {
  const alvo = document.getElementById('fin-cartao-miolo');
  if (!alvo) return;
  if (!FIN_FICHA.length) {   // nem passado nem futuro: contato sem dinheiro nenhum
    alvo.innerHTML = `<div class="corpo" style="font-size:13px;color:var(--texto-suave)">
      Nenhum lançamento para este contato ainda — quando um contrato dele gerar
      aluguel, repasse ou cobrança, aparece aqui.</div>`;
    return;
  }
  const hoje = new Date().toISOString().slice(0, 10);
  const ano = hoje.slice(0, 4);
  const corte = fimDoMesCorrente();

  // v1.475 — O CORTE DO MÊS CORRENTE.
  //
  // O CRM gera os lançamentos do contrato INTEIRO de uma vez. Sem
  // corte, "em aberto (no prazo)" somava três anos de repasses que
  // ninguém viveu ainda — num contrato de 30 meses, −R$ 30.532,50
  // apareciam como se fossem dívida de hoje. Não é lista feia: é
  // número errado em destaque, no cartão que responde "como está o
  // dinheiro deste contato".
  //
  // O mês corrente entra INTEIRO no "em aberto": boleto que vence dia
  // 25 é dívida de verdade. O que passa do fim do mês é FUTURO, e
  // futuro tem a linha própria — não some, mas não vira KPI.
  const futuro = l => !l.data_realizada && l.data_prevista && l.data_prevista > corte;
  const daLista = FIN_FICHA.filter(l => !futuro(l));
  const asFuturas = FIN_FICHA.filter(futuro);

  let realizado = 0, aberto = 0, atrasado = 0, nRealAno = 0, futTotal = 0;
  daLista.forEach(l => {
    const v = Number(l.valor) || 0;
    if (l.data_realizada) {
      if (String(l.data_realizada).slice(0, 4) === ano) { realizado += v; nRealAno++; }
    } else if (l.data_prevista && l.data_prevista < hoje) atrasado += v;
    else aberto += v;
  });
  asFuturas.forEach(l => { futTotal += Number(l.valor) || 0; });
  const din = (v) => (typeof moeda === 'function' ? moeda(v) : 'R$ ' + v.toFixed(2));

  const linhas = (FIN_FICHA_TUDO ? daLista : daLista.slice(0, 5)).map(l => {
    const s = finFichaSituacao(l);
    const d = l.data_realizada || l.data_prevista || '';
    const dBr = d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '—';
    const v = Number(l.valor) || 0;
    const destino = 'financeiro.html?lancamento=' + encodeURIComponent(l.id);
    // o histórico é um <a> de verdade (botão do meio abre em outra aba);
    // a linha inteira também leva, pela regra dos registros clicáveis
    // v1.475 — o recibo, só na linha que É um repasse (tem competência
    // e a competência tem token). Nas outras, um traço: coluna que
    // aparece e some faz a tabela dançar.
    //
    // Os dois botões param o clique: a linha inteira abre o lançamento
    // no Livro Caixa (regra dos registros clicáveis, 30/08), e sem o
    // stopPropagation abriria as duas coisas de uma vez.
    const tk = l.competencia_id ? FIN_TOKENS[l.competencia_id] : null;
    const doc = tk
      ? `<a class="btn btn-claro" href="recibo.html?p=${encodeURIComponent(tk)}&i=1"
            target="_blank" rel="noopener" onclick="event.stopPropagation()"
            title="Abrir o documento deste mês">${icone('documento', 12)} abrir</a>
         <button class="btn btn-claro" title="Copiar o link para mandar ao proprietário"
            onclick="event.stopPropagation();copiarLinkDoRecibo('${jsq(tk)}')"
            >${icone('elo', 13)}</button>`
      : '<span style="color:var(--texto-suave)">—</span>';

    return `<tr onclick="location.href='${destino}'">
      <td class="quando">${htm(dBr)}</td>
      <td><a href="${destino}" onclick="event.stopPropagation()">${htm(l.historico || '')}</a></td>
      <td><span class="tag ${s.cls}">${s.r}</span></td>
      <td class="vr ${v < 0 ? 'menos' : 'mais'}">${htm(din(v))}</td>
      <td class="doc">${doc}</td></tr>`;
  }).join('');

  alvo.innerHTML = `
    <div class="fic-fin-resumo">
      <div class="fic-fin-kpi entrou"><b>${htm(din(realizado))}</b>
        <span>realizado em ${ano} · ${nRealAno} lançamento${nRealAno === 1 ? '' : 's'}</span></div>
      <div class="fic-fin-kpi aberto"><b>${htm(din(aberto))}</b>
        <span>em aberto até ${htm(dataBr(corte).slice(0, 5))}</span></div>
      <div class="fic-fin-kpi atraso"><b>${htm(din(atrasado))}</b><span>atrasado</span></div>
    </div>
    ${asFuturas.length ? `<div style="padding:0 16px 10px;font-size:12px;color:var(--texto-suave)">
      <b>${asFuturas.length}</b> lançamento${asFuturas.length === 1 ? '' : 's'} futuro${
        asFuturas.length === 1 ? '' : 's'}, somando <b>${htm(din(futTotal))}</b> —
      aparece${asFuturas.length === 1 ? '' : 'm'} aqui no mês dele${
        asFuturas.length === 1 ? '' : 's'}.</div>` : ''}
    <table class="fic-fin-tab"><thead><tr><th>Quando</th><th>Lançamento</th>
      <th>Situação</th><th style="text-align:right">Valor</th>
      <th style="text-align:right">Recibo</th></tr></thead>
    <tbody>${linhas || `<tr><td colspan="5" style="color:var(--texto-suave)">
      Nenhum lançamento até ${htm(dataBr(corte))} — o contrato é novo.</td></tr>`}</tbody></table>
    ${daLista.length > 5 && !FIN_FICHA_TUDO
      ? `<div class="fic-fin-pe" onclick="FIN_FICHA_TUDO=true;finFichaPintar()"
           >Mostrar os ${daLista.length} lançamentos ▾</div>` : ''}`;
}
