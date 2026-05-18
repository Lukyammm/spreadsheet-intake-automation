# UPSHEET 🚀

Sistema web de importação inteligente para planilhas Google, com foco em operação diária, padronização de dados e redução de retrabalho manual.

---

## Nome do sistema

**UPSHEET — Sheet Intake WebApp**

---

## Descrição objetiva

O UPSHEET é um WebApp em Google Apps Script que recebe arquivos (CSV e fluxo compatível com Excel convertido), analisa o layout, sugere roteamento automático e grava os dados na planilha/aba correta com regras de importação configuráveis.

A proposta é transformar um processo manual e sujeito a erro em um fluxo confiável, auditável e repetível.

---

## Problema que o sistema resolve

Em muitas operações, equipes recebem arquivos de diferentes origens e precisam copiar/colar dados em planilhas internas. Isso normalmente gera:

- Erros de colagem e sobrescrita;
- Divergência de formato entre arquivos;
- Dependência de pessoas específicas para “entender a planilha”;
- Baixa rastreabilidade do que foi importado, quando e para onde;
- Tempo alto para tarefas simples de rotina.

O UPSHEET resolve esse cenário com um fluxo guiado, regras de destino e log de importações.

---

## Principais funcionalidades

- 📥 **Ingestão de arquivo** com validação de payload e tratamento de erros.
- 🧭 **Sugestão automática de rota** baseada em regras por palavras-chave.
- 🧱 **Detecção e ajuste de layout** (cabeçalho, coluna inicial e alinhamento).
- 🧼 **Padronização de dados** antes da gravação.
- 🗂️ **Gestão de destinos** (planilhas alvo) com persistência.
- ⚙️ **Gestão de regras de roteamento** (chave, palavras-chave, aba e modo).
- 🔁 **Modos de importação**:
  - `APPEND` (acrescenta dados);
  - `REPLACE` (substitui conteúdo da aba).
- 🧾 **Log operacional** em planilha dedicada (`LOG_IMPORT`).
- 👤 **Preferências por usuário** e memória de última configuração.

---

## Tecnologias utilizadas

- **Google Apps Script (V8)** — backend e endpoints do WebApp;
- **Google Sheets API nativa do Apps Script** — leitura, escrita e persistência;
- **HTML5 + CSS3 + JavaScript** — interface web do operador;
- **PropertiesService** — armazenamento de destinos, regras e preferências.

---

## Estrutura do projeto

```bash
UPSHEET/
├─ Code.gs                 # Backend (APIs, regras, ingestão e importação)
├─ index.html              # Estrutura principal da interface
├─ styles.html             # Estilos da aplicação
├─ app.js.html             # Lógica frontend (eventos, estado e chamadas)
├─ ANALISE_ARQUITETURA_UX.md
└─ README.md
```

---

## Fluxo de funcionamento

1. **Bootstrap da aplicação**
   - O WebApp carrega destinos, regras, preferências e abas disponíveis.
2. **Upload/ingestão**
   - O operador envia o arquivo e o sistema valida formato e conteúdo.
3. **Pré-processamento**
   - O UPSHEET detecta layout, monta preview e sugere rota de importação.
4. **Confirmação operacional**
   - O usuário ajusta modo (`APPEND`/`REPLACE`) e opções de padronização.
5. **Commit da importação**
   - Dados são gravados na aba destino com escrita em blocos.
6. **Rastreabilidade**
   - O evento é registrado no log com tempo de execução e metadados.

---

## Capturas de tela

> Substitua os caminhos abaixo pelos prints reais do projeto.

- Tela inicial / upload
  - `docs/screenshots/home-upload.png`
- Gestão de destinos e regras
  - `docs/screenshots/config-destinations-rules.png`
- Preview e confirmação de importação
  - `docs/screenshots/preview-commit.png`
- Resultado e feedback operacional
  - `docs/screenshots/success-feedback.png`

---

## Como executar

### Pré-requisitos

- Conta Google com acesso ao Apps Script;
- Uma planilha Google para operação e logs;
- Permissões de edição na planilha destino.

### Passo a passo

1. Crie um projeto no **Google Apps Script**.
2. Copie os arquivos deste repositório para o projeto:
   - `Code.gs`
   - `index.html`
   - `styles.html`
   - `app.js.html`
3. Salve e publique como **Web App**:
   - Executar como: **Você**
   - Acesso: conforme política da organização (ex.: usuários autenticados do domínio)
4. Abra a URL publicada e configure:
   - Destinos (nome + planilha);
   - Regras (chave + palavras-chave + aba + modo).
5. Faça um upload de teste e valide o log `LOG_IMPORT`.

---

## Melhorias futuras

- ✏️ Edição completa de regras e destinos por tabela (não apenas inclusão/remoção);
- ✅ Teste de conexão visual por destino;
- 🧠 Aplicação total das opções avançadas de padronização no backend;
- 📊 Painel operacional com métricas de volume, erro e tempo médio;
- 🔐 Perfis de acesso por tipo de usuário.

---

## Autor

Projeto desenvolvido por **Rafael de Oliveira** (UPSHEET) para operações orientadas a dados em Google Workspace.

Se quiser, você pode adicionar aqui:

- LinkedIn
- Portfólio
- E-mail profissional

