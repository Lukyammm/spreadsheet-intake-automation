# UPSHEET — Importação Inteligente para Operações com Google Sheets 📊⚙️

> Um sistema web criado para transformar rotinas manuais de importação em um processo confiável, rápido e com rastreabilidade real.

---

## Introdução estratégica e visual

O **UPSHEET** nasceu para resolver um gargalo comum em times operacionais: receber arquivos em formatos variados e depender de processos manuais para consolidar dados em planilhas de gestão.

Em vez de tratar planilha como tela final, o sistema organiza a operação com cara de produto: fluxo guiado, regras claras, validações, memória de preferências e histórico de execução.

---

## Contexto do problema operacional

Antes de um fluxo estruturado, a rotina costuma envolver:

- Download de arquivos de múltiplas fontes;
- Abertura manual, ajustes visuais e cópia/cola;
- Dúvida constante sobre “qual aba recebe qual arquivo”;
- Sobrescrita acidental e divergência entre equipes;
- Falta de histórico para auditoria rápida.

Esse cenário aumenta custo operacional, reduz previsibilidade e gera retrabalho silencioso.

---

## Como o sistema melhorou o processo

Com o UPSHEET, a importação passou a seguir uma trilha operacional padronizada:

1. **Arquivo entra no WebApp** com validações iniciais;
2. **Layout é analisado automaticamente** para reduzir ajuste manual;
3. **Rota de destino é sugerida** por regras configuráveis;
4. **Modo de gravação é definido** (`APPEND` ou `REPLACE`);
5. **Importação é registrada em log** com dados de execução.

Resultado: menos decisões improvisadas e mais previsibilidade no dia a dia.

---

## Diferenciais técnicos e funcionais

- 🧭 **Roteamento por regras de negócio** (não por memória de operador);
- 🧠 **Detecção de layout e preview** antes do commit;
- 🗃️ **Persistência de destinos e preferências** por usuário/operação;
- 🧾 **Registro de importações** para rastreabilidade e suporte;
- ⚡ **Escrita em blocos** para suportar volume com melhor estabilidade;
- 🧩 Arquitetura enxuta em **Apps Script + Google Sheets**, sem stack complexa.

---

## Principais automações

- Sugestão automática de aba de destino por palavras-chave;
- Aplicação de layout para alinhar cabeçalhos e colunas;
- Normalização de estrutura antes da gravação;
- Persistência de configuração “não perguntar novamente”;
- Criação e uso de planilha de log operacional.

---

## Resultados e impacto

### Eficiência operacional
- Redução do tempo gasto por importação;
- Menos etapas manuais entre recebimento e publicação dos dados.

### Qualidade de dados
- Menos risco de erro humano em colagem/sobrescrita;
- Processo mais consistente entre operadores.

### Governança
- Histórico centralizado de execução (arquivo, destino, modo, tempo);
- Melhor suporte para auditoria interna e melhoria contínua.

> **Impacto prático:** o processo deixa de depender do “operador que conhece a planilha” e passa a depender de regra, fluxo e sistema.

---

## Tecnologias utilizadas

- **Google Apps Script** (backend do WebApp)
- **Google Sheets** (base operacional e log)
- **HTML, CSS e JavaScript** (camada de interface)
- **PropertiesService** (persistência de configurações)

---

## Prints / mockups destacados 🖼️

> Espaço preparado para inserir evidências visuais do produto em uso.

- Upload e ingestão de arquivo
  - `docs/portfolio/01-upload.png`
- Configuração de destinos e regras
  - `docs/portfolio/02-config.png`
- Preview + confirmação de importação
  - `docs/portfolio/03-preview-confirm.png`
- Feedback final + log operacional
  - `docs/portfolio/04-result-log.png`

---

## Conclusão (produto e solução real)

O UPSHEET não é apenas uma interface sobre planilhas: é uma camada de operação que organiza entrada de dados, reduz falhas manuais e cria padrão de execução para times que precisam de velocidade com segurança.

É o tipo de solução que funciona no contexto real de empresas que usam Google Workspace como base operacional e precisam escalar processo antes de escalar stack.

