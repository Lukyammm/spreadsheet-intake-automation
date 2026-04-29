# Análise de Arquitetura, POO e UX — UPSHEET

## Visão geral
O sistema já tem uma interface visual funcional para o fluxo principal de importação, com backend separado no Apps Script e frontend em HTML/CSS/JS. Ainda assim, há pontos que deixam a solução com cara de “planilha com tela” em vez de “aplicação para usuário comum”.

## Pontos fortes
- Fluxo visual de upload e importação com feedback de status.
- CRUD básico de destinos e regras por interface.
- Backend valida campos críticos nas APIs.
- Persistência de preferências por usuário e log de importações.

## Principais problemas e melhorias objetivas

### 1) Interface antes da base
**Problema:** o usuário precisa informar `Spreadsheet ID` manualmente para cadastrar destinos.

**Impacto:** exige conhecimento técnico da URL interna do Google Sheets.

**Melhoria:** criar fluxo visual de “Selecionar planilha” (picker/lista validada) e esconder o ID no backend.

**Fluxos sugeridos:**
- Botão “Conectar planilha” com confirmação de acesso.
- Tela de gestão de destinos com tabela (Nome, Planilha, Última validação, Ações).
- Ação “Testar conexão” e status visual (ok/erro).

### 2) Base como camada interna
**Problema:** regra e configuração dependem de detalhes internos (nome de aba, ID), expostos diretamente.

**Impacto:** erros operacionais e manutenção difícil para usuário não técnico.

**Melhoria:** usar objetos de domínio (Destino, Regra) com seleção por nome amigável e resolução técnica no backend.

### 3) Separação de responsabilidades
**Problema:** `Code.gs` concentra entrada HTTP, APIs, regras de negócio, persistência, detecção de layout e logging.

**Impacto:** baixo isolamento de responsabilidades e maior risco ao evoluir.

**Melhoria estrutural sugerida:**
- `ui/` (HTML/CSS + controller JS)
- `application/` (use cases: ingestão, roteamento, importação)
- `domain/` (entidades e validações de negócio)
- `infrastructure/` (SheetsRepository, PropertiesRepository, Logger)
- `config/` (constantes e chaves)

### 4) Encapsulamento
**Problema:** alguns detalhes técnicos estão bem centralizados em `APP`, mas outros aparecem em múltiplos pontos (ex.: nomes de modos, estrutura de payload, mensagens técnicas).

**Impacto:** acoplamento alto entre frontend e backend.

**Melhoria:** contrato único de DTOs e enums (ex.: `ImportMode`, `LayoutConfig`, `StandardizeOptions`) compartilhado por camadas.

### 5) Responsabilidade correta por camada
**Problema:** frontend contém textos de marketing genéricos (“Interface moderna • Zero drama”), não orientados à tarefa.

**Impacto:** ruído de UX e menor clareza operacional.

**Melhoria:** substituir por ajuda prática (“Formatos aceitos: CSV, XLS, XLSX. Tamanho máximo recomendado: X MB.”).

### 6) Fluxo de cadastro e manutenção
**Problema:** há cadastro/remoção de destino e regra, porém sem listagem estruturada, edição explícita, confirmação de exclusão e prevenção visível de duplicidade por chave.

**Impacto:** manutenção pouco segura para operação diária.

**Melhoria:**
- Tabela de regras com ações Editar/Excluir.
- Modal de confirmação para exclusão.
- Validação de unicidade para chave de regra e destino.
- Mensagens de erro por campo (não só texto geral).

### 7) Validação em backend
**Problema:** opções enviadas pelo frontend (`dedupeHeaders`, `numberCoerce`, `dateCoerce`) não são aplicadas no backend de padronização.

**Impacto:** expectativa do usuário diverge do resultado real.

**Melhoria:** implementar de fato as regras correspondentes no backend ou remover opções da UI até estarem prontas.

## Conclusão profissional
Hoje o sistema já é utilizável, mas ainda depende de conhecimento técnico em pontos críticos e mantém muito comportamento em um arquivo central. Com modularização por camadas, contratos explícitos e fluxos completos de gestão (listar/editar/excluir/confirmar), ele evolui de “planilha com interface” para “app operacional de verdade”.
