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
  return result;
}

function decryptTicketKey(ticketKeyHex) {
  const isHex32 = /^[0-9a-fA-F]{32}$/.test(CLIENT_SECRET);

  if (isHex32) {
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

async function criarSenhaTemporaria({ nomeHospede, effectiveTime, invalidTime, modo = "producao", senha: senhaEscolhida }) {
  const accessToken = await getAccessToken();
  const { ticket_id, ticket_key } = await getPasswordTicket(accessToken);
  const realKey = decryptTicketKey(ticket_key);

  // Se a página forneceu uma senha de 7 dígitos, usamos exatamente essa.
  // Caso contrário, mantemos o comportamento anterior e geramos uma senha.
  const senha = senhaEscolhida || gerarSenhaNumerica(7);
  if (!/^\d{7}$/.test(String(senha))) {
    throw new Error("A senha precisa ter exatamente 7 dígitos numéricos.");
  }
  const senhaCifrada = encryptPassword(String(senha), realKey);

  const effectiveEpoch = Math.floor(effectiveTime.getTime() / 1000);
  const invalidEpoch = Math.floor(invalidTime.getTime() / 1000);

  if (modo === "teste1") {
    const resultado = await tuyaFetch(
      "POST",
      `/v1.0/devices/${DEVICE_ID}/door-lock/temp-password`,
      {
        accessToken,
        body: {
          name: nomeHospede,
          password: senhaCifrada,
          password_type: "ticket",
          ticket_id,
          effective_time: effectiveEpoch,
          invalid_time: invalidEpoch,
          phone: "",
          time_zone: "",
          schedule_list: [{ effective_time: 720, invalid_time: 1080, working_day: 0 }],
        },
      }
    );
    return { senha, resultado };
  }

  if (modo === "teste2") {
    const resultado = await tuyaFetch(
      "POST",
      `/v1.0/smart-lock/device/${DEVICE_ID}/template/temp-password`,
      {
        accessToken,
        body: {
          name: nomeHospede,
          password: senhaCifrada,
          password_type: "ticket",
          ticket_id,
          effective_time: effectiveEpoch,
          invalid_time: invalidEpoch,
          time_zone: "America/Sao_Paulo",
        },
      }
    );
    return { senha, resultado };
  }

  const resultado = await tuyaFetch(
    "POST",
    `/v1.0/devices/${DEVICE_ID}/door-lock/temp-password`,
    {
      accessToken,
      body: {
        name: nomeHospede,
        password: senhaCifrada,
        password_type: "ticket",
        ticket_id,
        effective_time: effectiveEpoch,
        invalid_time: invalidEpoch,
        time_zone: "America/Sao_Paulo",
        schedule_list: [{ all_day: true, effective_time: 0, invalid_time: 1439, working_day: 127 }],
      },
    }
  );
  return { senha, resultado };
}

module.exports = { criarSenhaTemporaria };
