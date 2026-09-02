const crypto = require("crypto");

const BASE_URL = process.env.TUYA_BASE_URL || "https://openapi.tuyaus.com";
const CLIENT_ID = process.env.TUYA_CLIENT_ID;
const CLIENT_SECRET = process.env.TUYA_CLIENT_SECRET;
const DEVICE_ID = process.env.TUYA_DEVICE_ID;

function assertConfig() {
  const missing = [];
  if (!CLIENT_ID) missing.push("TUYA_CLIENT_ID");
  if (!CLIENT_SECRET) missing.push("TUYA_CLIENT_SECRET");
  if (!DEVICE_ID) missing.push("TUYA_DEVICE_ID");
  if (missing.length) {
    throw new Error(
      `Faltam variáveis de ambiente: ${missing.join(", ")}. Configure-as no Vercel (Settings > Environment Variables).`
    );
  }
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input || "", "utf8").digest("hex");
}

function hmacSha256Upper(key, str) {
  return crypto.createHmac("sha256", key).update(str, "utf8").digest("hex").toUpperCase();
}

function buildStringToSign(method, url, body) {
  const contentHash = sha256Hex(body || "");
  // Headers assinados: nenhum, nesta implementação.
  return `${method}\n${contentHash}\n\n${url}`;
}

function nonce() {
  return crypto.randomBytes(8).toString("hex");
}

async function tuyaFetch(method, path, { body, accessToken } = {}) {
  assertConfig();
  const t = Date.now().toString();
  const n = nonce();
  const bodyStr = body ? JSON.stringify(body) : "";
  const stringToSign = buildStringToSign(method, path, bodyStr);
  const signBase = accessToken
    ? CLIENT_ID + accessToken + t + n + stringToSign
    : CLIENT_ID + t + n + stringToSign;
  const sign = hmacSha256Upper(CLIENT_SECRET, signBase);

  const headers = {
    "Content-Type": "application/json",
    client_id: CLIENT_ID,
    sign_method: "HMAC-SHA256",
    t,
    nonce: n,
    sign,
  };
  if (accessToken) headers.access_token = accessToken;

  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: method === "GET" ? undefined : bodyStr,
  });

  const json = await res.json();
  if (!json.success) {
    const err = new Error(json.msg || "Erro na API da Tuya");
    err.tuyaCode = json.code;
    err.tuyaResponse = json;
    throw err;
  }
  return json.result;
}

async function getAccessToken() {
  const result = await tuyaFetch("GET", "/v1.0/token?grant_type=1");
  return result.access_token;
}

async function getPasswordTicket(accessToken) {
  const result = await tuyaFetch(
    "POST",
    `/v1.0/devices/${DEVICE_ID}/door-lock/password-ticket`,
    { accessToken }
  );
  return result; // { ticket_id, ticket_key, expire_time }
}

// A ticket_key vem cifrada com AES-256-ECB usando o client secret como chave.
// Depois de decifrada (UTF-8), o resultado é a chave real usada para cifrar a senha.
function decryptTicketKey(ticketKeyHex) {
  const isHex32 = /^[0-9a-fA-F]{32}$/.test(CLIENT_SECRET);

  if (isHex32) {
    // Esquema mais comum: o client secret (32 caracteres hex) é decodificado
    // como 16 bytes crus e usado como chave AES-128 direto.
    try {
      const decipher = crypto.createDecipheriv(
        "aes-128-ecb",
        Buffer.from(CLIENT_SECRET, "hex"),
        null
      );
      decipher.setAutoPadding(true);
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(ticketKeyHex, "hex")),
        decipher.final(),
      ]);
      return decrypted.toString("utf8");
    } catch (e) {
      // cai para o método alternativo abaixo
    }
  }

  // Método alternativo: client secret como string UTF-8 (32 bytes), AES-256.
  const decipher = crypto.createDecipheriv(
    "aes-256-ecb",
    Buffer.from(CLIENT_SECRET, "utf8"),
    null
  );
  decipher.setAutoPadding(true);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ticketKeyHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

function encryptPassword(password, realKeyUtf8) {
  const keyBuf = Buffer.from(realKeyUtf8, "utf8");
  const algo =
    keyBuf.length === 16 ? "aes-128-ecb" : keyBuf.length === 24 ? "aes-192-ecb" : "aes-256-ecb";
  const cipher = crypto.createCipheriv(algo, keyBuf, null);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return encrypted.toString("hex").toUpperCase();
}

function gerarSenhaNumerica(tamanho = 6) {
  let senha = "";
  for (let i = 0; i < tamanho; i++) {
    senha += crypto.randomInt(0, 10).toString();
  }
  return senha;
}

// effectiveTime / invalidTime: Date objects
async function criarSenhaTemporaria({ nomeHospede, effectiveTime, invalidTime }) {
  const accessToken = await getAccessToken();
  const { ticket_id, ticket_key } = await getPasswordTicket(accessToken);
  const realKey = decryptTicketKey(ticket_key);

  const senha = gerarSenhaNumerica(7);
  const senhaCifrada = encryptPassword(senha, realKey);

  await tuyaFetch("POST", `/v1.0/devices/${DEVICE_ID}/door-lock/temp-password`, {
    accessToken,
    body: {
      name: nomeHospede,
      password: senhaCifrada,
      password_type: "ticket",
      ticket_id,
      effective_time: Math.floor(effectiveTime.getTime() / 1000),
      invalid_time: Math.floor(invalidTime.getTime() / 1000),
      time_zone: "America/Sao_Paulo",
      schedule_list: [{ effective_time: 0, invalid_time: 1439, working_day: 127 }],
    },
  });

  return senha;
}

module.exports = { criarSenhaTemporaria };
