// ============================================================
// CATÁLOGO DE CAMPOS
//
// POR QUE ISTO EXISTE
// O Salesforce só consegue "escolher os campos para exibir", filtrar por
// qualquer campo e exportar porque cada objeto tem um catálogo: nome
// técnico, rótulo, tipo. Aqui as colunas estavam escritas à mão dentro
// do HTML e do .js de cada tela — o que obrigava a mexer em três lugares
// para acrescentar uma coluna, e tornava impossível deixar a PESSOA
// escolher o que vê.
//
// Este arquivo é a única fonte de verdade sobre "quais campos existem".
// Dele saem: as colunas da tabela, o construtor de filtro, a exportação,
// o Kanban e a edição em linha.
//
// COMO LER UM CAMPO
//   c        coluna no banco
//   r        rótulo que a pessoa vê
//   t        tipo: texto | numero | moeda | data | datahora | escolha |
//            tag | telefone | doc | email | ref | dias | sim_nao
//   busca    entra na busca rápida da tela
//   filtro   aparece no construtor de filtro
//   soma     somado no rodapé da lista
//   editavel pode ser alterado direto na lista (edição em linha)
//   opcoes   lista fixa de valores (escolha/tag)
//   cores    mapa valor → classe de etiqueta
//   larg     largura sugerida da coluna
//
// Carregar DEPOIS de base.js e formatos.js.
// ============================================================

const CORES_SITUACAO_IMOVEL = {
  'Disponível': 'tag-azul', 'Alugada': 'tag-verde', 'Em reforma': 'tag-amarela',
  'Vendida': 'tag-cinza', 'Perdida p/ concorrente': 'tag-vermelha', 'Encerrada': 'tag-cinza'
};
// ETAPAS DO FUNIL — vêm do CADASTRO desde a v1.118 (tabela
// funil_etapas), não daqui. Um funil por TIPO DE LEAD: o inquilino
// passa por análise de fiança e visita antes de fechar; o proprietário
// é convencido, capta-se o imóvel e só DEPOIS se visita para fotos.
//
// Estas constantes são só PLANO B: se o banco não responder (rede
// caindo, ou o SQL da 1.118 ainda não rodado), a tela abre com as
// etapas de sempre em vez de um seletor vazio.
let ETAPAS_FUNIL = {
  'Inquilino':    ['Novo', 'Em atendimento', 'Em análise', 'Visita agendada',
                   'Proposta', 'Convertido', 'Perdido'],
  'Proprietário': ['Novo', 'Em contato', 'Proposta enviada', 'Captado',
                   'Visita ao imóvel', 'Perdido']
};
/** ajuda e metadados por "Tipo|Etapa" — preenchidos pelo banco */
let INFO_ETAPA = {};
const CORES_ETAPA_LEAD = {
  'Novo': 'tag-azul', 'Em atendimento': 'tag-azul', 'Em análise': 'tag-amarela',
  'Visita agendada': 'tag-amarela', 'Proposta': 'tag-amarela',
  'Em contato': 'tag-azul', 'Proposta enviada': 'tag-amarela',
  'Captado': 'tag-verde', 'Visita ao imóvel': 'tag-verde',
  'Convertido': 'tag-verde', 'Perdido': 'tag-cinza'
};

/** Todas as etapas de todos os funis, sem repetir — é o que a COLUNA
 *  "Etapa" da lista precisa oferecer, já que a lista mistura os dois
 *  tipos de lead. O select da FICHA usa só as do tipo daquele lead. */
function etapasDeTodosOsFunis() {
  const vistas = [];
  ['Inquilino', 'Proprietário'].forEach(t =>
    (ETAPAS_FUNIL[t] || []).forEach(e => { if (!vistas.includes(e)) vistas.push(e); }));
  return vistas;
}

/** Etapas de um tipo de lead, na ordem do funil. */
function etapasDoFunil(tipoLead) {
  return (ETAPAS_FUNIL[tipoLead] || ETAPAS_FUNIL['Inquilino'] || []).slice();
}

/** A dica da etapa (aparece na ficha do lead). */
function ajudaDaEtapa(tipoLead, etapa) {
  const i = INFO_ETAPA[tipoLead + '|' + etapa];
  return (i && i.ajuda) || '';
}

/** Etapa que encerra o funil (não gera follow-up). */
function etapaEncerra(tipoLead, etapa) {
  const i = INFO_ETAPA[tipoLead + '|' + etapa];
  return i ? !!i.encerra : ['Convertido', 'Perdido', 'Captado', 'Visita ao imóvel'].includes(etapa);
}
const CORES_TEMPERATURA = {
  'Quente': 'tag-verde', 'Morno': 'tag-amarela', 'Frio': 'tag-cinza', 'Encerrado': 'tag-cinza'
};
const CORES_STATUS_TAREFA = {
  'Aberta': 'tag-azul', 'Em andamento': 'tag-amarela',
  'Concluída': 'tag-verde', 'Cancelada': 'tag-cinza'
};

const CATALOGO = {

  // =====================================================================
  contatos: {
    rotulo: 'Contatos', singular: 'contato', tabela: 'contatos',
    ficha: 'contato.html', ordemPadrao: { campo: 'nome', asc: true },
    colunasPadrao: ['codigo', 'nome', 'tipo_principal', 'telefone', 'email', 'status'],
    campos: [
      { c: 'codigo',          r: 'Código',        t: 'texto',    busca: true, filtro: true, larg: 90 },
      { c: 'nome',            r: 'Nome',          t: 'texto',    busca: true, filtro: true, editavel: true, larg: 200 },
      // Lista alinhada à trava contatos_tipo_principal_check do banco
      // (v1.115): o catálogo oferecia 'Fiador' e 'Prestador', que o CHECK
      // recusa — a edição em linha morreria como o caso 'Placa' da 1.114.
      // A ficha sempre teve a lista certa; agora as duas são iguais.
      { c: 'tipo_principal',  r: 'Tipo',          t: 'tag',      filtro: true, editavel: true,
        opcoes: ['Proprietário', 'Inquilino', 'Indicador', 'Prestador Serviço', 'Fornecedor', 'Outro'],
        cores: { 'Proprietário': 'tag-azul', 'Inquilino': 'tag-cinza', 'Indicador': 'tag-amarela',
                 'Prestador Serviço': 'tag-verde', 'Fornecedor': 'tag-verde', 'Outro': 'tag-cinza' }, larg: 130 },
      { c: 'outros_tipos',    r: 'Outros tipos',  t: 'texto',    filtro: true },
      { c: 'status',          r: 'Situação',      t: 'tag',      filtro: true, editavel: true,
        opcoes: ['Ativo', 'Inativo'],
        cores: { 'Ativo': 'tag-verde', 'Inativo': 'tag-cinza' }, larg: 100 },
      { c: 'telefone',        r: 'Telefone',      t: 'telefone', busca: true, filtro: true, editavel: true, larg: 140 },
      { c: 'email',           r: 'E-mail',        t: 'email',    busca: true, filtro: true, editavel: true, larg: 190 },
      { c: 'cpf_cnpj',        r: 'CPF / CNPJ',    t: 'doc',      busca: true, filtro: true, larg: 150 },
      { c: 'aniversario',     r: 'Aniversário',   t: 'data',     filtro: true, larg: 110 },
      { c: 'bairro',          r: 'Bairro',        t: 'texto',    busca: true, filtro: true },
      { c: 'cidade',          r: 'Cidade',        t: 'texto',    filtro: true },
      { c: 'logradouro',      r: 'Logradouro',    t: 'texto',    busca: true, filtro: true },
      { c: 'numero',          r: 'Número',        t: 'texto' },
      // complemento e estado existiam no banco e na ficha desde o SQL de
      // endereço, mas nunca entraram no catálogo — sem catálogo não há
      // coluna, filtro nem layout (achado do Rodrigo em 28/07)
      { c: 'complemento',     r: 'Complemento',   t: 'texto' },
      { c: 'estado',          r: 'Estado (UF)',   t: 'texto',    filtro: true, larg: 70 },
      { c: 'cep',             r: 'CEP',           t: 'texto',    filtro: true },
      { c: 'banco_pix',       r: 'Chave PIX',     t: 'texto',    filtro: true },
      // VOCABULÁRIO DO ASAAS — não traduzir (v1.116).
      //
      // Estes cinco valores não são rótulos nossos: são o que a API do
      // Asaas usa para tipo de chave PIX, e o que a planilha (coluna
      // validada, alimentada pelo robô Espelho CRM) aceita. Em 29/07 a
      // 1.115 os traduziu para português achando que PHONE/EMAIL era lixo
      // de importação: o espelho parou com "os dados violam o conjunto de
      // regras de validação. Insira um destes valores: CPF, PHONE, CNPJ,
      // EMAIL, EVP".
      //
      // Regra que ficou: campo que sai para integração fala a língua da
      // integração. A trava tipo_chave_pix_asaas no banco garante isso
      // mesmo por SQL. EVP = chave aleatória.
      { c: 'tipo_chave_pix',  r: 'Tipo da chave (Asaas)', t: 'escolha',  filtro: true,
        opcoes: ['CPF', 'PHONE', 'CNPJ', 'EMAIL', 'EVP'] },
      { c: 'data_cadastro',   r: 'Cadastrado em', t: 'data',     filtro: true, larg: 120 },
      { c: 'observacoes',     r: 'Observações',   t: 'texto',    busca: true },
      { c: 'criado_em',       r: 'Criado em',     t: 'datahora', filtro: true }
    ]
  },

  // =====================================================================
  imoveis: {
    rotulo: 'Imóveis', singular: 'imóvel', tabela: 'imoveis',
    ficha: 'imovel.html', ordemPadrao: { campo: 'endereco', asc: true },
    // o select traz o nome do proprietário e do inquilino junto
    select: '*, proprietario:proprietario_id(id,codigo,nome), inquilino:inquilino_id(id,codigo,nome)',
    colunasPadrao: ['codigo', 'endereco', 'bairro', 'tipo', 'proprietario', 'inquilino', 'valor_aluguel', 'situacao'],
    kanban: { campo: 'situacao', titulo: 'endereco', apoio: 'bairro', valor: 'valor_aluguel' },
    campos: [
      { c: 'codigo',       r: 'Código',       t: 'texto',  busca: true, filtro: true, larg: 80 },
      { c: 'endereco',     r: 'Endereço',     t: 'texto',  busca: true, filtro: true, editavel: true, larg: 180 },
      { c: 'bairro',       r: 'Bairro',       t: 'texto',  busca: true, filtro: true, editavel: true, larg: 120 },
      // Alinhado à trava imoveis_categoria_check (v1.115): o banco aceita
      // Residencial/Comercial/Misto — 'Terreno' e 'Rural' aqui eram
      // promessa que o CHECK recusava na edição em linha.
      { c: 'categoria',    r: 'Categoria',    t: 'escolha', filtro: true, editavel: true,
        opcoes: ['Residencial', 'Comercial', 'Misto'] },
      // 'tipo' não tem trava no banco e a ficha era texto livre — por isso
      // existem 'Sala Comercial'/'Salão Comercial' gravados. Lista da
      // 1.115 = união do que existe gravado + o que faltava; a ficha
      // passou a usar a MESMA lista (deixou de ser texto livre).
      { c: 'tipo',         r: 'Tipo',         t: 'escolha', filtro: true, editavel: true,
        opcoes: ['Casa', 'Apartamento', 'Kitnet', 'Sobrado', 'Edícula', 'Sala Comercial',
                 'Salão Comercial', 'Barracão', 'Terreno', 'Chácara'], larg: 105 },
      { c: 'proprietario', r: 'Proprietário', t: 'ref',    ref: 'proprietario', busca: true, larg: 140 },
      { c: 'inquilino',    r: 'Inquilino',    t: 'ref',    ref: 'inquilino',    busca: true, larg: 140 },
      { c: 'valor_aluguel', r: 'Aluguel',     t: 'moeda',  filtro: true, soma: true, editavel: true, larg: 105 },
      { c: 'situacao',     r: 'Situação',     t: 'tag',    filtro: true, editavel: true,
        opcoes: ['Disponível', 'Alugada', 'Em reforma', 'Vendida', 'Perdida p/ concorrente', 'Encerrada'],
        cores: CORES_SITUACAO_IMOVEL, larg: 115 },
      { c: 'num_quartos',  r: 'Quartos',      t: 'numero', filtro: true, editavel: true, larg: 80 },
      // OS TRÊS CAMPOS DE TAXA, corrigidos em 26/07/2026.
      //
      // Estavam classificados de forma que a lista e o relatório mentiam:
      //
      //   taxa_locacao era 'moeda' → a coluna mostrava "R$ 1,00" e
      //     "R$ 0,80". Não é dinheiro. Virou 'numero' e, no mesmo dia,
      //     'percentual': o valor guardado (1,00 / 0,80) significa 100% e
      //     80% DO ALUGUEL, que é o que a imobiliária recebe na assinatura
      //     do contrato. Mesma escala do taxa_adm_percentual — a diferença
      //     é só a faixa usada: contrato fica perto de 100%, administração
      //     entre 8% e 12%. O DADO NÃO MUDOU; mudou como é lido.
      //
      //   taxa_adm_percentual era 'numero' → mostrava "0,1" onde deveria
      //     mostrar "10%". O banco guarda FRAÇÃO (0.1000 = 10%); o
      //     imoveis.js converte ×100 na ficha e nada mais convertia.
      //
      // `soma` saiu dos dois: somar percentual não significa nada
      // ("total de 6.830%"). Quem soma é taxa_adm_valor, que é moeda de
      // verdade, e taxa_adm_mes na base de relatório com taxas calculadas.
      { c: 'taxa_locacao',        r: 'Taxa de contrato (%)',       t: 'percentual', filtro: true },
      { c: 'taxa_adm_percentual', r: 'Taxa adm. (%)',              t: 'percentual', filtro: true },
      { c: 'taxa_adm_minimo',     r: 'Taxa adm. mínima (R$)',      t: 'moeda',      filtro: true },
      { c: 'taxa_adm_valor',      r: 'Taxa adm. (R$ fixo)',        t: 'moeda',      filtro: true, soma: true },
      { c: 'canal_captacao', r: 'Canal de captação', t: 'texto', filtro: true },
      { c: 'indicado_por', r: 'Indicado por', t: 'texto',  filtro: true },
      { c: 'logradouro',   r: 'Logradouro',   t: 'texto',  busca: true, filtro: true },
      { c: 'numero',       r: 'Número',       t: 'texto' },
      { c: 'complemento',  r: 'Complemento',  t: 'texto' },
      { c: 'cep',          r: 'CEP',          t: 'texto',  busca: true, filtro: true },
      { c: 'cidade',       r: 'Cidade',       t: 'texto',  filtro: true },
      // estado faltava também aqui — mesmo achado de 28/07 (contatos)
      { c: 'estado',       r: 'Estado (UF)',  t: 'texto',  filtro: true, larg: 70 },
      { c: 'ponto_referencia', r: 'Ponto de referência', t: 'texto', busca: true },
      { c: 'uc_agua',      r: 'UC da água',   t: 'texto',  filtro: true },
      { c: 'num_locacoes', r: 'Nº de locações', t: 'numero', filtro: true },
      { c: 'data_captacao',    r: 'Captado em',      t: 'data', filtro: true, larg: 120 },
      { c: 'disponivel_desde', r: 'Disponível desde', t: 'data', filtro: true, larg: 130 },
      { c: 'data_locacao',     r: 'Alugado em',      t: 'data', filtro: true, larg: 120 },
      { c: 'observacoes',  r: 'Observações',  t: 'texto',  busca: true },
      { c: 'criado_em',    r: 'Criado em',    t: 'datahora', filtro: true }
    ]
  },

  // =====================================================================
  // Leads lê a VISÃO leads_painel, não a tabela: é ela que traz
  // temperatura, dias sem contato e último/próximo contato, tudo
  // calculado a partir das tarefas e nunca digitado.
  // A edição em linha grava na TABELA leads (ver gravarEm).
  // =====================================================================
  // CONTRATOS (v1.104) — a tabela existia desde o M19 (61 contratos,
  // criados na importação das comissões; casos e comissões já apontam
  // para ela) e o objeto já estava na matriz de permissões. Só faltava
  // a tela. O join do imóvel apelida endereco como nome (nome:endereco)
  // porque o tipo 'ref' da lista lê sempre .nome.
  contratos: {
    // Lê da VIEW contratos_painel (traz imóvel, inquilino, os dias que
    // faltam para cada vencimento e o alerta, calculados no banco) e
    // grava na TABELA contratos — mesmo arranjo dos leads.
    rotulo: 'Contratos', singular: 'contrato', tabela: 'contratos_painel',
    gravarEm: 'contratos', ficha: 'contrato.html',
    ordemPadrao: { campo: 'codigo', asc: true },
    colunasPadrao: ['codigo', 'imovel_endereco', 'inquilino_nome', 'valor_aluguel',
      'dia_vencimento', 'proximo_reajuste', 'proxima_renovacao', 'status', 'alerta'],
    campos: [
      { c: 'codigo',        r: 'Código',            t: 'texto', busca: true, filtro: true, larg: 95 },
      { c: 'imovel_endereco', r: 'Imóvel',          t: 'texto', busca: true, filtro: true, larg: 180 },
      { c: 'imovel_bairro', r: 'Bairro',            t: 'texto', busca: true, filtro: true },
      { c: 'inquilino_nome', r: 'Inquilino',        t: 'texto', busca: true, filtro: true, larg: 150 },
      { c: 'inquilino_telefone', r: 'Telefone do inquilino', t: 'telefone' },
      { c: 'valor_aluguel', r: 'Aluguel',           t: 'moeda', filtro: true, soma: true, editavel: true, larg: 105 },
      { c: 'dia_vencimento', r: 'Dia venc.',        t: 'numero', filtro: true, editavel: true, larg: 85 },
      { c: 'data_inicio',   r: 'Início',            t: 'data',  filtro: true, larg: 105 },
      { c: 'data_fim_prevista', r: 'Fim previsto',  t: 'data',  filtro: true, larg: 105 },
      { c: 'data_encerramento', r: 'Encerrado em',  t: 'data',  filtro: true },
      { c: 'status',        r: 'Status',            t: 'tag',   filtro: true, editavel: true,
        opcoes: ['Ativo', 'Aviso Prévio', 'Seguro Acionado', 'Encerrado'],
        cores: { 'Ativo': 'tag-verde', 'Aviso Prévio': 'tag-amarela',
                 'Seguro Acionado': 'tag-vermelha', 'Encerrado': 'tag-cinza' }, larg: 130 },
      // mesma escala da taxa de contrato do imóvel: banco guarda fração
      // (1,00 = um aluguel inteiro), a pessoa digita/lê 100
      { c: 'taxa_contrato_percentual', r: 'Taxa de contrato (%)', t: 'percentual', filtro: true },
      { c: 'taxa_contrato_valor',      r: 'Taxa de contrato (R$)', t: 'moeda', filtro: true },

      // --- vigência e reajuste (M27) ---
      { c: 'indice_reajuste', r: 'Índice',          t: 'escolha', filtro: true, editavel: true,
        opcoes: ['IGPM', 'IPCA', 'INCC', 'IGP-DI', 'INPC', 'Sem reajuste'], larg: 95 },
      { c: 'proximo_reajuste', r: 'Próximo reajuste', t: 'data', filtro: true, larg: 115 },
      { c: 'ultimo_reajuste', r: 'Último reajuste', t: 'data', filtro: true },
      { c: 'dias_para_reajuste', r: 'Dias p/ reajuste', t: 'dias', filtro: true, larg: 95 },
      { c: 'dias_para_fim',   r: 'Dias p/ fim',     t: 'dias', filtro: true, larg: 90 },
      { c: 'prazo_meses',   r: 'Prazo (meses)',     t: 'numero', filtro: true },
      { c: 'carencia_meses', r: 'Carência (meses)', t: 'numero', filtro: true },
      { c: 'fim_da_carencia', r: 'Fim da carência', t: 'data', filtro: true },
      { c: 'garantia_tipo', r: 'Garantia',          t: 'escolha', filtro: true, editavel: true,
        opcoes: ['Seguro fiança', 'Fiador', 'Caução', 'Título de capitalização', 'Sem garantia'], larg: 130 },
      { c: 'aviso_previo_em', r: 'Aviso prévio em', t: 'data', filtro: true },

      // --- seguros (vêm das apólices vigentes, pela view) ---
      { c: 'tipos_vigentes', r: 'Seguros vigentes', t: 'texto', filtro: true, larg: 130 },
      { c: 'proxima_renovacao', r: 'Renovar seguro em', t: 'data', filtro: true, larg: 125 },
      { c: 'dias_para_renovar_seguro', r: 'Dias p/ renovar', t: 'dias', filtro: true, larg: 100 },
      { c: 'seguro_mensal', r: 'Seguro mensal (R$)', t: 'moeda', filtro: true, soma: true },
      { c: 'apolices_vigentes', r: 'Nº de apólices', t: 'numero', filtro: true },
      { c: 'sem_apolice_de_fianca',  r: 'Sem apólice de fiança',  t: 'sim_nao', filtro: true },
      { c: 'sem_apolice_de_incendio', r: 'Sem apólice de incêndio', t: 'sim_nao', filtro: true },

      // O ALERTA é o que interessa numa varredura de manhã: filtre por
      // ele para ver só o que precisa de providência hoje.
      { c: 'alerta',        r: 'Alerta',            t: 'tag',   filtro: true, larg: 145,
        opcoes: ['Contrato vencido', 'Seguro vencido', 'Reajuste atrasado',
                 'Fim em 60 dias', 'Seguro a renovar', 'Reajuste em 30 dias'],
        cores: { 'Contrato vencido': 'tag-vermelha', 'Seguro vencido': 'tag-vermelha',
                 'Reajuste atrasado': 'tag-vermelha', 'Fim em 60 dias': 'tag-amarela',
                 'Seguro a renovar': 'tag-amarela', 'Reajuste em 30 dias': 'tag-amarela' } },

      { c: 'sinistros_abertos', r: 'Sinistros abertos', t: 'numero', filtro: true, larg: 95 },
      { c: 'sinistro_alerta', r: 'Alerta do sinistro', t: 'texto', filtro: true, larg: 150 },
      { c: 'observacoes',   r: 'Observações',       t: 'texto', busca: true },
      { c: 'criado_em',     r: 'Criado em',         t: 'datahora', filtro: true }
    ]
  },

  // =====================================================================
  // SINISTROS (v1.109) — objeto de primeira classe. Lê da view (que traz
  // contrato, imóvel, apólice e os dias de cada prazo) e grava na tabela.
  // A ordem padrão é pelo PRÓXIMO PRAZO: o que está estourando aparece
  // em cima sem ninguém precisar filtrar.
  sinistros: {
    rotulo: 'Sinistros', singular: 'sinistro', tabela: 'sinistros_painel',
    gravarEm: 'contrato_sinistros', ficha: 'sinistro.html',
    ordemPadrao: { campo: 'proximo_prazo', asc: true },
    colunasPadrao: ['codigo', 'imovel_endereco', 'tipo', 'status', 'alerta',
      'proximo_prazo', 'aguardando', 'valor_pleiteado', 'saldo_a_receber'],
    campos: [
      { c: 'codigo',          r: 'Código',       t: 'texto', busca: true, filtro: true, larg: 95 },
      { c: 'contrato_codigo', r: 'Contrato',     t: 'texto', busca: true, filtro: true, larg: 95 },
      { c: 'imovel_endereco', r: 'Imóvel',       t: 'texto', busca: true, filtro: true, larg: 180 },
      { c: 'imovel_bairro',   r: 'Bairro',       t: 'texto', busca: true, filtro: true },
      { c: 'inquilino_nome',  r: 'Inquilino',    t: 'texto', busca: true, filtro: true, larg: 150 },
      { c: 'inquilino_telefone', r: 'Telefone',  t: 'telefone' },
      { c: 'tipo',            r: 'Tipo',         t: 'tag',   filtro: true, editavel: true, larg: 130,
        opcoes: ['Inadimplência', 'Incêndio', 'Danos ao imóvel', 'Multa rescisória', 'Outro'],
        cores: { 'Inadimplência': 'tag-amarela', 'Incêndio': 'tag-vermelha',
                 'Danos ao imóvel': 'tag-amarela', 'Multa rescisória': 'tag-azul', 'Outro': 'tag-cinza' } },
      { c: 'status',          r: 'Etapa',        t: 'tag',   filtro: true, larg: 115,
        opcoes: ['Aberto', 'Em análise', 'Exigência', 'Deferido', 'Pago', 'Indeferido', 'Cancelado'],
        cores: { 'Aberto': 'tag-azul', 'Em análise': 'tag-azul', 'Exigência': 'tag-amarela',
                 'Deferido': 'tag-verde', 'Pago': 'tag-verde',
                 'Indeferido': 'tag-vermelha', 'Cancelado': 'tag-cinza' } },
      // O ALERTA é a coluna da varredura da manhã: filtre por ela e você
      // vê só o que precisa de providência hoje.
      { c: 'alerta',          r: 'Alerta',       t: 'tag',   filtro: true, larg: 175,
        opcoes: ['PERDEU o prazo de abertura', 'Exigência VENCIDA', 'Indenização atrasada',
                 'Seguradora não respondeu', 'Abrir em até 7 dias',
                 'Exigência vence em 7 dias', 'Indenização prevista'],
        cores: { 'PERDEU o prazo de abertura': 'tag-vermelha', 'Exigência VENCIDA': 'tag-vermelha',
                 'Indenização atrasada': 'tag-vermelha', 'Seguradora não respondeu': 'tag-vermelha',
                 'Abrir em até 7 dias': 'tag-amarela', 'Exigência vence em 7 dias': 'tag-amarela',
                 'Indenização prevista': 'tag-azul' } },
      { c: 'proximo_prazo',   r: 'Próximo prazo', t: 'data',  filtro: true, larg: 115 },
      { c: 'dias_para_o_proximo_prazo', r: 'Dias', t: 'dias', filtro: true, larg: 70 },
      { c: 'aguardando',      r: 'Bola com',     t: 'tag',   filtro: true, larg: 105,
        opcoes: ['Nós', 'Seguradora'],
        cores: { 'Nós': 'tag-amarela', 'Seguradora': 'tag-azul' } },
      { c: 'exigencias_abertas', r: 'Exigências abertas', t: 'numero', filtro: true, larg: 95 },
      { c: 'seguradora',      r: 'Seguradora',   t: 'texto', busca: true, filtro: true },
      { c: 'apolice_numero',  r: 'Apólice',      t: 'texto', busca: true, filtro: true },
      { c: 'protocolo',       r: 'Protocolo',    t: 'texto', busca: true, filtro: true, editavel: true },
      { c: 'data_fato',       r: 'Data do fato', t: 'data',  filtro: true },
      { c: 'prazo_para_abrir', r: 'Prazo p/ abrir', t: 'data', filtro: true },
      { c: 'data_abertura',   r: 'Aberto em',    t: 'data',  filtro: true, larg: 105 },
      { c: 'dias_em_aberto',  r: 'Dias em aberto', t: 'numero', filtro: true },
      { c: 'prazo_retorno',   r: 'Retorno até',  t: 'data',  filtro: true },
      { c: 'previsao_pagamento', r: 'Pagamento previsto', t: 'data', filtro: true, larg: 120 },
      { c: 'data_recebimento', r: 'Recebido em', t: 'data',  filtro: true },
      { c: 'valor_pleiteado', r: 'Pleiteado',    t: 'moeda', filtro: true, soma: true, larg: 110 },
      { c: 'valor_deferido',  r: 'Deferido',     t: 'moeda', filtro: true, soma: true, larg: 110 },
      { c: 'valor_recebido',  r: 'Recebido',     t: 'moeda', filtro: true, soma: true, larg: 110 },
      { c: 'saldo_a_receber', r: 'A receber',    t: 'moeda', filtro: true, soma: true, larg: 110 },
      { c: 'meses_cobertos',  r: 'Meses cobertos', t: 'numero', filtro: true },
      { c: 'motivo_indeferimento', r: 'Motivo do indeferimento', t: 'texto', busca: true },
      { c: 'responsavel_email', r: 'Responsável', t: 'texto', filtro: true },
      { c: 'observacoes',     r: 'Observações',  t: 'texto', busca: true },
      { c: 'criado_em',       r: 'Criado em',    t: 'datahora', filtro: true }
    ]
  },

  // =====================================================================
  leads: {
    rotulo: 'Leads', singular: 'lead', tabela: 'leads_painel', gravarEm: 'leads',
    ficha: 'lead.html', ordemPadrao: { campo: 'data_entrada', asc: false },
    colunasPadrao: ['codigo', 'nome', 'telefone', 'tipo_imovel', 'aluguel_max', 'status', 'temperatura', 'dias_sem_contato'],
    kanban: { campo: 'status', titulo: 'nome', apoio: 'telefone', valor: 'aluguel_max',
              ordem: ['Novo', 'Em atendimento', 'Em análise', 'Visita agendada', 'Proposta', 'Convertido', 'Perdido'],
              alerta: l => l.dias_sem_contato >= 3 && !['Convertido', 'Perdido'].includes(l.status) },
    campos: [
      { c: 'codigo',      r: 'Código',       t: 'texto', busca: true, filtro: true, larg: 90 },
      { c: 'nome',        r: 'Lead',         t: 'texto', busca: true, filtro: true, editavel: true, larg: 175 },
      // estava na ficha e no banco, mas fora do catálogo — achado da
      // auditoria de paridade de 28/07 (mesma família do Estado/Complemento)
      { c: 'resumo_agente', r: 'Primeira mensagem do cliente', t: 'texto', busca: true },
      { c: 'telefone',    r: 'Telefone',     t: 'telefone', busca: true, filtro: true, editavel: true, larg: 140 },
      { c: 'telefone_2',  r: 'Telefone 2',   t: 'telefone', busca: true, filtro: true, editavel: true, larg: 140 },
      { c: 'tipo_lead',   r: 'Tipo',         t: 'escolha', filtro: true, editavel: true,
        opcoes: ['Inquilino', 'Proprietário'], larg: 120 },
      // --- captação (lead Proprietário): o imóvel oferecido (v1.114).
      // Vieram da planilha "Registro de Abordagens" — sem endereço e link
      // do anúncio a abordagem vira um nome solto na lista.
      { c: 'imovel_endereco', r: 'Imóvel (endereço)', t: 'texto', busca: true, filtro: true, larg: 180 },
      { c: 'link_anuncio',    r: 'Link do anúncio',   t: 'texto', busca: true },
      // Alinhado à trava leads_tipo_imovel_check (v1.115): o banco aceita
      // esta lista — Edícula/Sala/Salão/Barracão aqui eram promessa que o
      // CHECK recusava na edição em linha. A ficha sempre teve a certa.
      { c: 'tipo_imovel', r: 'Procura',      t: 'escolha', filtro: true, editavel: true,
        opcoes: ['Casa', 'Apartamento', 'Kitnet', 'Sobrado', 'Chácara', 'Comercial', 'Terreno'], larg: 115 },
      { c: 'bairros_desejados', r: 'Bairros', t: 'texto', busca: true, filtro: true },
      { c: 'aluguel_max', r: 'Até',          t: 'moeda', filtro: true, soma: true, editavel: true, larg: 110 },
      { c: 'quartos_min', r: 'Quartos mín.', t: 'numero', filtro: true, editavel: true, larg: 100 },
      { c: 'vagas_garagem', r: 'Vagas',      t: 'numero', filtro: true, editavel: true, larg: 80 },
      { c: 'aceita_pet',  r: 'Aceita pet',   t: 'sim_nao', filtro: true, editavel: true, larg: 100 },
      // As opções são reescritas por carregarEtapasDoFunil() (v1.118) com
      // a união dos dois funis — a lista mistura inquilino e proprietário,
      // então precisa oferecer as etapas de ambos. Na FICHA o select mostra
      // só as do tipo daquele lead.
      { c: 'status',      r: 'Etapa',        t: 'tag',   filtro: true, editavel: true,
        opcoes: ['Novo', 'Em atendimento', 'Em análise', 'Visita agendada', 'Proposta',
                 'Em contato', 'Proposta enviada', 'Captado', 'Visita ao imóvel',
                 'Convertido', 'Perdido'],
        cores: CORES_ETAPA_LEAD, larg: 125 },
      // Calculado na view (a partir de leads.status_desde), como temperatura
      // e dias_sem_contato: a ficha o mostra na faixa da etapa, nunca como
      // campo editável. Está declarado em EXCECOES.lead.soCatalogo da
      // bateria (v1.119) — sem isso o teste de paridade barra a publicação.
      // Serve para a varredura "quem está travado nesta etapa?": filtre
      // "Nesta etapa há" maior que 7 e ordene pela coluna.
      { c: 'dias_na_etapa', r: 'Nesta etapa há', t: 'dias', filtro: true, larg: 110 },
      { c: 'temperatura', r: 'Temperatura',  t: 'tag',   filtro: true,
        opcoes: ['Quente', 'Morno', 'Frio', 'Encerrado'], cores: CORES_TEMPERATURA, larg: 110 },
      { c: 'dias_sem_contato', r: 'Sem contato', t: 'dias', filtro: true, larg: 100 },
      // Unificada com a ficha em 1.114 (Placa novo nas duas). Em 1.115
      // saíram Presencial e Portal: a trava leads_origem_check nunca os
      // aceitou — nenhum lead os tem, e a edição em linha morreria no CHECK.
      { c: 'origem',      r: 'Origem',       t: 'escolha', filtro: true, editavel: true,
        opcoes: ['WhatsApp', 'Site', 'Facebook', 'OLX', 'Indicação', 'Corretor', 'EEmovel',
                 'Placa', 'Telefone', 'Balcão', 'Outro'], larg: 120 },
      { c: 'origem_detalhe', r: 'Detalhe da origem', t: 'texto', busca: true, filtro: true },
      { c: 'responsavel_email', r: 'Responsável', t: 'texto', filtro: true, editavel: true, larg: 180 },
      { c: 'email',       r: 'E-mail',       t: 'email', busca: true, filtro: true },
      { c: 'cpf_cnpj',    r: 'CPF / CNPJ',   t: 'doc',   busca: true, filtro: true },
      { c: 'motivo_perda', r: 'Motivo da perda', t: 'texto', filtro: true },
      { c: 'data_entrada', r: 'Primeiro contato',   t: 'datahora', filtro: true, larg: 130 },
      { c: 'ultimo_contato',  r: 'Último contato',  t: 'datahora', filtro: true, larg: 140 },
      { c: 'proximo_contato', r: 'Próximo contato', t: 'data', filtro: true, larg: 130 },
      { c: 'qtd_imoveis',    r: 'Imóveis',    t: 'numero', larg: 90 },
      { c: 'qtd_simulacoes', r: 'Simulações', t: 'numero', larg: 100 },
      { c: 'observacoes', r: 'Observações',  t: 'texto', busca: true }
    ]
  },

  // =====================================================================
  tarefas: {
    rotulo: 'Tarefas', singular: 'tarefa', tabela: 'tarefas',
    ficha: null, ordemPadrao: { campo: 'vencimento', asc: true },
    colunasPadrao: ['codigo', 'assunto', 'tipo', 'prioridade', 'vencimento', 'responsavel_email', 'status'],
    // Kanban e listas alinhados às travas do banco (v1.115):
    // tarefas_status_check só aceita Aberta/Concluída — as colunas
    // 'Em andamento' e 'Cancelada' eram cartões que nunca chegariam lá
    // (arrastar morria no CHECK); tarefas_tipo_check tem Observação e
    // não tem E-mail/Reunião, que nenhum formulário criava.
    kanban: { campo: 'status', titulo: 'assunto', apoio: 'responsavel_email',
              ordem: ['Aberta', 'Concluída'] },
    campos: [
      { c: 'codigo',    r: 'Código',   t: 'texto', busca: true, filtro: true, larg: 100 },
      { c: 'assunto',   r: 'Assunto',  t: 'texto', busca: true, filtro: true, editavel: true, larg: 260 },
      { c: 'tipo',      r: 'Tipo',     t: 'escolha', filtro: true, editavel: true,
        opcoes: ['Tarefa', 'Ligação', 'Visita', 'Observação'], larg: 110 },
      { c: 'prioridade', r: 'Prioridade', t: 'tag', filtro: true, editavel: true,
        opcoes: ['Baixa', 'Normal', 'Alta'],
        cores: { 'Alta': 'tag-vermelha', 'Normal': 'tag-cinza', 'Baixa': 'tag-cinza' }, larg: 110 },
      { c: 'status',    r: 'Situação', t: 'tag', filtro: true, editavel: true,
        opcoes: ['Aberta', 'Concluída'],
        cores: CORES_STATUS_TAREFA, larg: 120 },
      { c: 'vencimento', r: 'Vence em', t: 'data', filtro: true, editavel: true, larg: 110 },
      { c: 'responsavel_email', r: 'Responsável', t: 'texto', busca: true, filtro: true, editavel: true, larg: 190 },
      { c: 'relacionado_texto', r: 'Relacionado a', t: 'texto', busca: true },
      { c: 'descricao', r: 'Descrição', t: 'texto', busca: true },
      { c: 'concluida_em', r: 'Concluída em', t: 'datahora', filtro: true },
      { c: 'criado_em', r: 'Criada em', t: 'datahora', filtro: true }
    ]
  }
};

// ------------------------------------------------------------
// Consultas ao catálogo
// ------------------------------------------------------------
function catalogo(objeto) { return CATALOGO[objeto] || null; }

function campo(objeto, coluna) {
  const cat = catalogo(objeto);
  return cat ? cat.campos.find(f => f.c === coluna) : null;
}

/** Só os campos que fazem sentido no construtor de filtro. */
function camposFiltraveis(objeto) {
  const cat = catalogo(objeto);
  return cat ? cat.campos.filter(f => f.filtro) : [];
}

/** Campos usados pela busca rápida (a caixa de texto da tela). */
function camposDeBusca(objeto) {
  const cat = catalogo(objeto);
  // 'ref' não entra: o nome do proprietário está em OUTRA tabela e o
  // PostgREST não procura nela com um "or" simples. A busca por
  // proprietário continua sendo feita na tela de Imóveis, em memória.
  return cat ? cat.campos.filter(f => f.busca && f.t !== 'ref').map(f => f.c) : [];
}

// ------------------------------------------------------------
// Como cada tipo vira texto na tela
// ------------------------------------------------------------
function valorDoCampo(linha, f) {
  if (f.t === 'ref') { const o = linha[f.ref]; return o ? o.nome : null; }
  // campo personalizado: o valor mora dentro da caixinha jsonb, e não
  // numa coluna. É o único ponto do sistema que precisa saber disso.
  if (f.pers) {
    const v = (linha.personalizados || {})[f.pers];
    return Array.isArray(v) ? v.join(', ') : (v === undefined ? null : v);
  }
  return linha[f.c];
}

function formatarCampo(linha, f) {
  const v = valorDoCampo(linha, f);
  if (v === null || v === undefined || v === '') return '—';
  switch (f.t) {
    case 'moeda':   return moeda(v);
    // O banco guarda FRAÇÃO (0.1000 = 10%). Sem esta linha, a lista e o
    // relatório mostravam "0,1" e a pessoa lia como um décimo de por cento.
    // A ficha já convertia ×100; o resto do sistema, não.
    case 'percentual': return (Number(v) * 100)
      .toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';
    // Número cru caía no `default` e saía com PONTO decimal — "0.8" em vez
    // de "0,8", numa tela em português. Só apareceu quando taxa_locacao
    // deixou de ser moeda.
    case 'numero':  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
    case 'data':    return dataBr(v);
    case 'datahora': return dataBr(String(v).slice(0, 10));
    case 'telefone': return typeof mascaraTelefone === 'function' ? mascaraTelefone(String(v)) : v;
    case 'doc':     return typeof mascaraDoc === 'function' ? mascaraDoc(String(v)) : v;
    case 'sim_nao': return v === true ? 'Sim' : (v === false ? 'Não' : '—');
    case 'dias':    return v === 0 ? 'hoje' : v + 'd';
    default:        return String(v);
  }
}

/** Como o valor sai na planilha: sem etiqueta, sem HTML, pronto para somar. */
function valorParaPlanilha(linha, f) {
  const v = valorDoCampo(linha, f);
  if (v === null || v === undefined) return '';
  if (f.t === 'moeda' || f.t === 'numero') return String(v).replace('.', ',');
  // Na planilha o percentual vai como NÚMERO na escala que a pessoa lê (10,
  // não 0,1) e sem o sinal de %: assim o Excel soma e faz média. Com "%" no
  // meio, a célula viraria texto.
  if (f.t === 'percentual') return String(Number(v) * 100).replace('.', ',');
  if (f.t === 'sim_nao') return v ? 'Sim' : 'Não';
  if (f.t === 'data' || f.t === 'datahora') return dataBr(String(v).slice(0, 10));
  return String(v);
}

/** A célula pronta, com etiqueta colorida quando for o caso. */
function celulaDoCampo(linha, f) {
  const texto = formatarCampo(linha, f);
  if (f.t === 'tag') {
    const v = valorDoCampo(linha, f);
    if (!v) return '—';
    const cor = (f.cores && f.cores[v]) || 'tag-cinza';
    return `<span class="tag ${cor}">${htm(v)}</span>`;
  }
  if (f.t === 'dias') {
    const v = valorDoCampo(linha, f);
    if (v === null || v === undefined) return '—';
    const cor = v >= 7 ? 'var(--erro)' : (v >= 3 ? 'var(--alerta)' : 'var(--texto-suave)');
    return `<b style="color:${cor}">${htm(texto)}</b>`;
  }
  // Telefone vira ação (v1.114): o balão abre a conversa no WhatsApp.
  // stopPropagation porque a linha inteira abre a ficha (lista-ficha.js) —
  // sem ele, clicar no balão abriria as duas coisas ao mesmo tempo.
  if (f.t === 'telefone') {
    const dig = String(valorDoCampo(linha, f) || '').replace(/\D/g, '');
    if (dig.length >= 10) return htm(texto) +
      ` <a class="zap" href="https://wa.me/55${dig}" target="_blank" rel="noopener"` +
      ` title="Conversar no WhatsApp" onclick="event.stopPropagation()">💬</a>`;
  }
  return htm(texto);
}

// ============================================================
// TIPOS DE SINISTRO — vindos do CADASTRO, não escritos aqui (M32)
//
// Até a v1.111 os cinco tipos estavam escritos à mão em SEIS lugares:
// este catálogo, duas janelas do ficha.js, a tela de seguradoras e dois
// gatilhos do banco. Acrescentar "rescisão antecipada" era mexer em
// código — coisa que uma imobiliária cliente nunca poderia fazer.
//
// Agora a lista vive na tabela `sinistro_tipos`. Esta é a única cópia no
// navegador, e ela serve só como PLANO B: se o banco não responder (rede
// caindo, ou o SQL do M32 ainda não rodado), a tela continua abrindo com
// os cinco de sempre em vez de mostrar um seletor vazio.
let TIPOS_SINISTRO = ['Inadimplência', 'Incêndio', 'Danos ao imóvel',
                      'Multa rescisória', 'Outro'];
let CORES_SINISTRO = { 'Inadimplência': 'tag-amarela', 'Incêndio': 'tag-vermelha',
  'Danos ao imóvel': 'tag-amarela', 'Multa rescisória': 'tag-azul', 'Outro': 'tag-cinza' };

/**
 * Lê os tipos do banco e reescreve o catálogo com eles.
 * Chamada uma vez por tela, logo depois das permissões (permissoes.js).
 * Falha em silêncio de propósito: sem os tipos a tela ainda funciona com
 * o plano B — derrubar a página inteira por causa da cor de uma etiqueta
 * seria pior do que a etiqueta sair cinza.
 */
async function carregarTiposDeSinistro() {
  try {
    if (typeof sb === 'undefined') return;
    const { data, error } = await sb.from('sinistro_tipos')
      .select('nome,cor,ativo').order('ordem').order('nome');
    if (error || !data || !data.length) return;

    // Os INATIVOS entram nas cores (para o histórico continuar colorido)
    // e ficam de fora da lista de escolha (para ninguém criar sinistro
    // novo com um tipo que a empresa aposentou).
    CORES_SINISTRO = {};
    data.forEach(t => { CORES_SINISTRO[t.nome] = t.cor || 'tag-cinza'; });
    TIPOS_SINISTRO = data.filter(t => t.ativo).map(t => t.nome);

    const f = (((CATALOGO.sinistros || {}).campos) || []).find(x => x.c === 'tipo');
    if (f) { f.opcoes = TIPOS_SINISTRO.slice(); f.cores = CORES_SINISTRO; }
  } catch (e) {
    console.warn('[tipos de sinistro] usando a lista padrão:', e.message || e);
  }
}

// ============================================================
// ETAPAS DO FUNIL — DO CADASTRO, NÃO DO CÓDIGO (v1.118)
//
// Antes da 1.118 a lista de etapas do lead estava escrita em CINCO
// lugares (este catálogo, a ficha, o cadastro rápido, o funil da tela e
// a trava do banco) e a régua de follow-up era um [1,3,7,10,15] fixo
// dentro do ficha.js, válido só para Proprietário. Acrescentar uma etapa
// era mexer em código — coisa que uma imobiliária cliente nunca poderia
// fazer, e mudar um prazo de retorno exigia publicação.
//
// Agora tudo mora na tabela `funil_etapas`: um funil por TIPO DE LEAD,
// com nome, ordem, dias de retorno, texto de ajuda, cor e a marca de
// etapa final. Esta função é o único ponto que lê essa tabela; ela
// reescreve o catálogo e alimenta os auxiliares do topo do arquivo.
//
// Falha em silêncio de propósito: sem as etapas do banco a tela ainda
// abre com o PLANO B do topo — melhor um funil desatualizado do que uma
// tela em branco.
// ============================================================
async function carregarEtapasDoFunil() {
  try {
    if (typeof sb === 'undefined') return;
    const { data, error } = await sb.from('funil_etapas')
      .select('tipo_lead,nome,ordem,dias_retorno,ajuda,cor,encerra,ativo')
      .order('tipo_lead').order('ordem');
    if (error || !data || !data.length) return;

    const porTipo = { 'Inquilino': [], 'Proprietário': [] };
    const cores = {};
    INFO_ETAPA = {};
    data.forEach(e => {
      // inativa entra nas cores e na ajuda (o histórico continua legível)
      // mas fica fora da lista de escolha
      cores[e.nome] = e.cor || 'tag-cinza';
      INFO_ETAPA[e.tipo_lead + '|' + e.nome] = {
        ordem: e.ordem, ajuda: e.ajuda, encerra: e.encerra,
        dias: e.dias_retorno || [], ativo: e.ativo
      };
      if (e.ativo && porTipo[e.tipo_lead]) porTipo[e.tipo_lead].push(e.nome);
    });
    ['Inquilino', 'Proprietário'].forEach(t => {
      if (porTipo[t].length) ETAPAS_FUNIL[t] = porTipo[t];
    });
    Object.assign(CORES_ETAPA_LEAD, cores);

    const f = (((CATALOGO.leads || {}).campos) || []).find(x => x.c === 'status');
    if (f) { f.opcoes = etapasDeTodosOsFunis(); f.cores = CORES_ETAPA_LEAD; }
    const cat = CATALOGO.leads;
    if (cat && cat.kanban) {
      // o kanban da lista mistura os dois tipos: usa a união, na ordem
      // dos funis, para nenhum cartão ficar sem coluna
      cat.kanban.ordem = etapasDeTodosOsFunis();
    }
  } catch (e) {
    console.warn('[etapas do funil] usando as etapas padrão:', e.message || e);
  }
}
