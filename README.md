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
- O dispositivo (fechadura) precisa estar vinculado ao projeto em *Devices > Link Tuya App Account*
  (vinculando a conta do app onde a fechadura está cadastrada).
- Anote em *Overview* do projeto: **Client ID**, **Client Secret**, e o **Device ID** da fechadura
  (em *Devices*).
- Confira a região/data center da sua conta (Américas, Europa, China, Índia) — isso define
  a `TUYA_BASE_URL`.

## 2. Rodar localmente (opcional)

```bash
npm install
cp .env.example .env.local
# edite .env.local com suas credenciais
npm run dev
```

Abra http://localhost:3000.

## 3. Publicar no Vercel

1. Suba esta pasta para um repositório no GitHub (ou use `vercel` CLI direto).
2. Em [vercel.com](https://vercel.com), clique em **Add New > Project** e importe o repositório.
3. Em **Settings > Environment Variables**, adicione:
   - `TUYA_CLIENT_ID`
   - `TUYA_CLIENT_SECRET`
   - `TUYA_DEVICE_ID`
   - `TUYA_BASE_URL`
4. Deploy. Pronto — a URL que o Vercel gerar é a página que você usa (dá pra acessar do celular).

## Notas

- A senha gerada é numérica, de 6 dígitos, escolhida aleatoriamente a cada pedido.
- Se a Tuya recusar o pedido, a página mostra o código de erro devolvido por ela —
  os mais comuns são credenciais erradas, dispositivo não vinculado ao projeto, ou
  região (`TUYA_BASE_URL`) errada.
- Depois que a fechadura confirma a senha, pode levar alguns segundos até ela ficar
  ativa fisicamente na porta (a Tuya processa isso de forma assíncrona).
