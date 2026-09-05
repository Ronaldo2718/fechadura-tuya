# Senha da fechadura — kitnetes

App simples para gerar uma senha numérica temporária na fechadura Tuya (NEO Avant Stark
Handle WiFi), válida só entre a entrada e a saída do hóspede.

## Como funciona

1. Você preenche nome do hóspede, entrada e saída.
2. O servidor (rota `/api/gerar-senha`) fala com a Tuya Cloud API:
   - pega um token de acesso;
   - pede um "ticket" de senha para o dispositivo;
   - cifra uma senha de 6 dígitos gerada na hora com a chave do ticket;
   - envia a senha cifrada pra Tuya, com o prazo de validade.
3. A senha aparece na tela pra você repassar ao hóspede.

As credenciais da Tuya (Client ID, Client Secret, Device ID) ficam só no servidor,
como variáveis de ambiente — nunca aparecem no navegador.

## 1. Configurar o projeto na Tuya IoT Platform

Isso você já deve ter feito, mas pra conferir:

- No [Tuya IoT Platform](https://iot.tuya.com), seu projeto precisa ter o serviço
  **Smart Lock Open Service** (ou "Smart Door Lock") assinado em *Cloud > Service API*.
- Cada fechadura (dispositivo) precisa estar vinculada ao projeto em *Devices > Link Tuya App Account*.
- Anote em *Overview* do projeto: **Client ID** e **Client Secret** (são os mesmos para
  todas as fechaduras do mesmo projeto).
- Para CADA fechadura/studio, anote o **Device ID** dela (em *Devices*).
- Confira a região/data center da sua conta (Américas, Europa, China, Índia).

## 2. Configurar os studios

Cada studio é um par de variáveis de ambiente numeradas:

```
STUDIO_1_NOME=Studio A
STUDIO_1_DEVICE_ID=xxxxxxxxxxxxxxxxxxxx
STUDIO_2_NOME=Studio B
STUDIO_2_DEVICE_ID=yyyyyyyyyyyyyyyyyyyy
```

Pra adicionar um studio novo no futuro, basta criar mais um par (`STUDIO_3_NOME` /
`STUDIO_3_DEVICE_ID`) nas variáveis de ambiente do Vercel e fazer um redeploy — não precisa
mexer no código.

## 3. Rodar localmente (opcional)

```bash
npm install
cp .env.example .env.local
# edite .env.local com suas credenciais
npm run dev
```

Abra http://localhost:3000.

## 4. Publicar no Vercel

1. Suba esta pasta para um repositório no GitHub (ou use `vercel` CLI direto).
2. Em [vercel.com](https://vercel.com), clique em **Add New > Project** e importe o repositório.
3. Em **Settings > Environment Variables**, adicione:
   - `TUYA_CLIENT_ID`
   - `TUYA_CLIENT_SECRET`
   - `TUYA_BASE_URL`
   - `STUDIO_1_NOME` / `STUDIO_1_DEVICE_ID` (e mais pares conforme os studios)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID` (planilha)
4. Deploy. Pronto — a URL que o Vercel gerar é a página que você usa (dá pra acessar do celular).

## Notas

- A senha gerada é numérica, de 7 dígitos (padrão da Tuya para fechaduras WiFi).
- Cada studio tem sua própria "gaveta" de senhas na fechadura; o app limpa
  automaticamente as senhas já vencidas a cada nova criação, pra não lotar.
- Se a Tuya recusar o pedido, a página mostra o código de erro devolvido por ela.
- A planilha registra: Studio, Data/Hora de criação, nome do hóspede, senha, início e fim
  da validade — mantendo o histórico de todos os studios na mesma aba.

