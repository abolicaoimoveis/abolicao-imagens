# v1.122 — "Entrou em" vira "Primeiro contato"

Versão de uma linha (bem, três). Só o **rótulo** muda; a coluna do banco
(`data_entrada`) e todos os dados continuam iguais.

## Por que esse nome

Ele fecha uma linha do tempo que já existia pela metade na ficha do lead:

| campo | o que diz |
|---|---|
| **Primeiro contato** | quando o cliente falou com vocês pela primeira vez |
| **Último contato** | a última ligação ou visita concluída |
| **Próximo contato** | o que a régua agendou |

Antes, o primeiro elemento dessa sequência se chamava "Entrou em" e não
conversava com os outros dois.

## Os 3 arquivos do commit

| arquivo | o que muda |
|---|---|
| `js/campos.js` | rótulo da coluna na lista, filtro e exportação |
| `js/ficha.js` | rótulo na ficha do lead |
| `js/config.js` | CRM_VERSAO → **'1.122'** |

Título: `Versão 1.122 — "Entrou em" passa a se chamar "Primeiro contato"`

## O que NÃO muda

- A coluna no banco continua `data_entrada` — nenhum SQL, nenhuma migração.
- Os dados continuam intactos: os 77 leads importados mantêm a data da
  planilha; os que entram pelo BotConversa usam a hora da chegada.
- Nada muda no comportamento: a ordenação padrão da lista de Leads, o cálculo
  de "dias sem contato" (quando ainda não houve contato) e a temperatura
  continuam usando esse mesmo campo.
- Quem tiver esse campo numa **visão salva** ou num relatório continua vendo a
  mesma informação, com o nome novo.

## Conferido antes de entregar

Diff das três linhas (nada além delas mudou) e comparação da lista de campos
do catálogo e da ficha: idênticas à v1.120/1.119 aprovadas. Sintaxe verificada
nos três arquivos. Como só o texto do rótulo muda, o teste de paridade da
bateria não é afetado.

## Se um dia quiser mudar de novo

O rótulo aparece em dois lugares: `js/campos.js` (lista, filtro, exportação e
seletor de colunas) e `js/ficha.js` (a ficha). São os mesmos dois lugares para
qualquer campo — e é justamente essa duplicação que a revisão de 29/07
recomendou unificar um dia, para renomear passar a ser uma edição só.
