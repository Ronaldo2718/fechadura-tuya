const { google } = require("googleapis");

function formatarDataHora(data) {
  return data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

async function registrarSenhaNaPlanilha({ nomeHospede, senha, entrada, saida }) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const chaveBruta = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !chaveBruta || !sheetId) {
    throw new Error(
      "Faltam variáveis de ambiente do Google Sheets (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID)."
    );
  }

  const chave = chaveBruta.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT(email, null, chave, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "A:E",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [
        [
          formatarDataHora(new Date()),
          nomeHospede,
          senha,
          formatarDataHora(entrada),
          formatarDataHora(saida),
        ],
      ],
    },
  });
}

module.exports = { registrarSenhaNaPlanilha };
