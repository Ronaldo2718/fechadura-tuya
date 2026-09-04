import { useState } from "react";
import Head from "next/head";

export default function Teste() {
  const [carregando, setCarregando] = useState(null); // "teste1" | "teste2" | null
  const [resultados, setResultados] = useState({});

  async function rodarTeste(modo) {
    setCarregando(modo);
    try {
      const resp = await fetch("/api/teste-diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo }),
      });
      const dados = await resp.json();
      setResultados((r) => ({ ...r, [modo]: { status: resp.status, dados } }));
    } catch (e) {
      setResultados((r) => ({ ...r, [modo]: { erro: e.message } }));
    } finally {
      setCarregando(null);
    }
  }

  return (
    <>
      <Head>
        <title>Diagnóstico — Fechadura</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ maxWidth: 640, margin: "0 auto", padding: 24, fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 22 }}>Página de diagnóstico</h1>
        <p style={{ color: "#555" }}>
          Cria uma senha de teste válida pelas próximas 2 horas, usando cada método pedido pela
          Tuya. Depois de rodar cada um, tente a senha mostrada no teclado físico da fechadura e
          anote o resultado.
        </p>

        <section style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h2 style={{ fontSize: 17 }}>Teste 1 — janela específica (não o dia inteiro)</h2>
          <button onClick={() => rodarTeste("teste1")} disabled={carregando === "teste1"}>
            {carregando === "teste1" ? "Rodando…" : "Rodar teste 1"}
          </button>
          {resultados.teste1 && (
            <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 12, marginTop: 12 }}>
              {JSON.stringify(resultados.teste1, null, 2)}
            </pre>
          )}
        </section>

        <section style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <h2 style={{ fontSize: 17 }}>Teste 2 — API alternativa (Smart Lock Basic API)</h2>
          <button onClick={() => rodarTeste("teste2")} disabled={carregando === "teste2"}>
            {carregando === "teste2" ? "Rodando…" : "Rodar teste 2"}
          </button>
          {resultados.teste2 && (
            <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 12, marginTop: 12 }}>
              {JSON.stringify(resultados.teste2, null, 2)}
            </pre>
          )}
        </section>
      </main>
    </>
  );
}
