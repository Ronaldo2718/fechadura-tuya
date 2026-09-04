import { useState } from "react";
import Head from "next/head";

function agoraLocalISO(offsetMinutos = 0) {
  const d = new Date(Date.now() + offsetMinutos * 60000);
  d.setSeconds(0, 0);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

export default function Home() {
  const [nomeHospede, setNomeHospede] = useState("");
  const [entrada, setEntrada] = useState(agoraLocalISO());
  const [saida, setSaida] = useState(agoraLocalISO(24 * 60));
  const [modoSenha, setModoSenha] = useState("auto"); // "auto" | "escolher"
  const [senhaEscolhida, setSenhaEscolhida] = useState("");
  const [estado, setEstado] = useState("idle"); // idle | carregando | sucesso | erro
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);

  async function aoEnviar(e) {
    e.preventDefault();

    if (modoSenha === "escolher" && !/^\d{7}$/.test(senhaEscolhida)) {
      setErro("A senha precisa ter exatamente 7 dígitos numéricos.");
      setEstado("erro");
      return;
    }

    setEstado("carregando");
    setErro("");
    setCopiado(false);
    try {
      const entradaEpoch = Math.floor(new Date(entrada).getTime() / 1000);
      const saidaEpoch = Math.floor(new Date(saida).getTime() / 1000);
      const resp = await fetch("/api/gerar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomeHospede,
          entradaEpoch,
          saidaEpoch,
          senhaEscolhida: modoSenha === "escolher" ? senhaEscolhida : undefined,
        }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.erro || "Falha ao gerar a senha.");
      setSenha(dados.senha);
      setEstado("sucesso");
    } catch (err) {
      setErro(err.message);
      setEstado("erro");
    }
  }

  function copiarSenha() {
    navigator.clipboard.writeText(senha).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function novaSenha() {
    setEstado("idle");
    setSenha("");
    setErro("");
    setNomeHospede("");
    setModoSenha("auto");
    setSenhaEscolhida("");
  }

  return (
    <>
      <Head>
        <title>Senha da fechadura — Kitnetes</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className="pagina">
        <div className="cartao">
          <header className="cabecalho">
            <h1>Senha da fechadura</h1>
            <p className="subtitulo">
              Gere uma senha temporária para a porta, válida só durante a estadia do hóspede.
            </p>
          </header>

          {estado !== "sucesso" && (
            <form onSubmit={aoEnviar} className="formulario">
              <label className="campo">
                <span>Nome do hóspede</span>
                <input
                  type="text"
                  value={nomeHospede}
                  onChange={(e) => setNomeHospede(e.target.value)}
                  placeholder="Ex.: Mariana Souza"
                  required
                  disabled={estado === "carregando"}
                />
              </label>

              <label className="campo">
                <span>Entrada</span>
                <input
                  type="datetime-local"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  required
                  disabled={estado === "carregando"}
                />
              </label>

              <label className="campo">
                <span>Saída</span>
                <input
                  type="datetime-local"
                  value={saida}
                  onChange={(e) => setSaida(e.target.value)}
                  required
                  disabled={estado === "carregando"}
                />
              </label>

              <div className="campo">
                <span>Senha</span>
                <div className="opcoes-senha">
                  <label className="opcao-radio">
                    <input
                      type="radio"
                      name="modoSenha"
                      checked={modoSenha === "auto"}
                      onChange={() => setModoSenha("auto")}
                      disabled={estado === "carregando"}
                    />
                    Gerar automaticamente
                  </label>
                  <label className="opcao-radio">
                    <input
                      type="radio"
                      name="modoSenha"
                      checked={modoSenha === "escolher"}
                      onChange={() => setModoSenha("escolher")}
                      disabled={estado === "carregando"}
                    />
                    Escolher a senha
                  </label>
                </div>
                {modoSenha === "escolher" && (
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={7}
                    value={senhaEscolhida}
                    onChange={(e) => setSenhaEscolhida(e.target.value.replace(/\D/g, ""))}
                    placeholder="7 dígitos, ex.: 1234567"
                    required
                    disabled={estado === "carregando"}
                  />
                )}
              </div>

              {estado === "erro" && <p className="mensagem-erro">{erro}</p>}

              <button type="submit" className="botao" disabled={estado === "carregando"}>
                {estado === "carregando" ? "Gerando…" : "Gerar senha"}
              </button>
            </form>
          )}

          {estado === "sucesso" && (
            <div className="resultado">
              <p className="resultado-legenda">Senha para {nomeHospede}</p>
              <p className="resultado-senha">{senha}</p>
              <p className="resultado-validade">
                Válida de {new Date(entrada).toLocaleString("pt-BR")} até{" "}
                {new Date(saida).toLocaleString("pt-BR")}
              </p>
              <div className="acoes">
                <button onClick={copiarSenha} className="botao botao-secundario" type="button">
                  {copiado ? "Copiada!" : "Copiar senha"}
                </button>
                <button onClick={novaSenha} className="botao botao-texto" type="button">
                  Gerar outra
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap");

        :root {
          --bg: #f6f2ea;
          --ink: #2c2925;
          --ink-soft: #6b6459;
          --linha: #e2d9c9;
          --verde: #3f5a48;
          --verde-escuro: #2e4436;
          --terra: #a85a2e;
          --erro: #a4392c;
          --branco: #fffdf9;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: "Inter", -apple-system, sans-serif;
        }

        .pagina {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .cartao {
          width: 100%;
          max-width: 420px;
          background: var(--branco);
          border: 1px solid var(--linha);
          border-radius: 18px;
          padding: 36px 30px;
        }

        .cabecalho h1 {
          font-family: "Fraunces", serif;
          font-weight: 600;
          font-size: 28px;
          margin: 0 0 8px;
          color: var(--verde-escuro);
        }

        .subtitulo {
          margin: 0 0 28px;
          color: var(--ink-soft);
          font-size: 15px;
          line-height: 1.5;
          max-width: 34ch;
        }

        .formulario {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .campo {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 14px;
          color: var(--ink-soft);
        }

        .campo input {
          font-family: "Inter", sans-serif;
          font-size: 16px;
          color: var(--ink);
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid var(--linha);
          background: var(--bg);
        }

        .opcoes-senha {
          display: flex;
          gap: 18px;
          margin-bottom: 4px;
        }

        .opcao-radio {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: var(--ink);
          cursor: pointer;
        }

        .opcao-radio input {
          width: auto;
        }

        .campo input:focus {
          outline: 2px solid var(--verde);
          outline-offset: 1px;
        }

        .botao {
          font-family: "Inter", sans-serif;
          font-size: 16px;
          font-weight: 600;
          padding: 13px 18px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          background: var(--verde);
          color: var(--branco);
          margin-top: 6px;
        }

        .botao:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .botao-secundario {
          background: var(--branco);
          color: var(--verde-escuro);
          border: 1px solid var(--verde);
        }

        .botao-texto {
          background: transparent;
          color: var(--ink-soft);
          text-decoration: underline;
        }

        .mensagem-erro {
          background: #f7e7e3;
          color: var(--erro);
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          margin: 0;
        }

        .resultado {
          text-align: center;
        }

        .resultado-legenda {
          color: var(--ink-soft);
          margin: 0 0 6px;
          font-size: 14px;
        }

        .resultado-senha {
          font-family: "Fraunces", serif;
          font-weight: 600;
          font-size: 52px;
          letter-spacing: 6px;
          color: var(--terra);
          margin: 0 0 12px;
        }

        .resultado-validade {
          color: var(--ink-soft);
          font-size: 13px;
          margin: 0 0 24px;
        }

        .acoes {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
      `}</style>
    </>
  );
}
