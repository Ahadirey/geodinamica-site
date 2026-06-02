#!/usr/bin/env python3
"""
Geodinâmica – Adicionar modelo ao portfólio
Uso: python3 add_modelo.py
"""

import json
import base64
import urllib.request
import urllib.error
import getpass
import sys
from datetime import datetime

# ─── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────
GITHUB_USER   = "Ahadirey"
GITHUB_REPO   = "geodinamica-site"
GITHUB_FILE   = "modelos.json"
GITHUB_BRANCH = "main"
R2_BASE_URL   = "https://pub-2a76e30d86404683aa14800e5a945b61.r2.dev"
# ──────────────────────────────────────────────────────────────────────────────

def github_request(method, path, token, data=None):
    url = f"https://api.github.com/{path}"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "geodinamica-script"
    }
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"\n❌ Erro GitHub {e.code}: {e.read().decode()}")
        sys.exit(1)

def color(text, code): return f"\033[{code}m{text}\033[0m"
def verde(t):   return color(t, "32")
def amarelo(t): return color(t, "33")
def azul(t):    return color(t, "34")
def negrito(t): return color(t, "1")

def perguntar(pergunta, opcoes=None, padrao=None):
    if opcoes:
        opts = "/".join(negrito(o.upper()) if o == padrao else o for o in opcoes)
        while True:
            resp = input(f"  {pergunta} [{opts}]: ").strip().lower()
            if not resp and padrao: return padrao
            if resp in opcoes: return resp
            print(f"  {amarelo('→')} Digite: {', '.join(opcoes)}")
    else:
        while True:
            resp = input(f"  {pergunta}: ").strip()
            if resp: return resp
            if padrao is not None: return padrao
            print(f"  {amarelo('→')} Campo obrigatório.")

def main():
    print()
    print(negrito("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"))
    print(negrito("  GEODINÂMICA – Adicionar Modelo 3D"))
    print(negrito("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"))
    print()

    print(azul("🔑 Token do GitHub"))
    print("   Gere em: github.com/settings/tokens → New token (classic)")
    print("   Permissão necessária: repo → contents (write)")
    print()
    token = getpass.getpass("  Token: ")
    if not token:
        print("❌ Token obrigatório.")
        sys.exit(1)

    print()
    print(azul("📁 Dados do modelo"))
    print()

    nome      = perguntar("Nome do projeto (ex: Fazenda Rio Negro)")
    descricao = perguntar("Descrição (ex: Aerolevantamento · 240 ha)")
    arquivo   = perguntar("Nome do arquivo no R2 (ex: fazenda-rio-negro.glb)")
    tipo      = perguntar("Tipo", ["topografia", "geologia", "ambiental", "mineracao", "rural"], "topografia")
    publico   = perguntar("Aparecer no portfólio público?", ["s", "n"], "s") == "s"

    url_modelo = f"{R2_BASE_URL}/{arquivo}"

    print()
    print(negrito("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"))
    print(negrito("  Resumo"))
    print(negrito("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"))
    print(f"  Nome:      {verde(nome)}")
    print(f"  Descrição: {descricao}")
    print(f"  Arquivo:   {arquivo}")
    print(f"  URL:       {azul(url_modelo)}")
    print(f"  Tipo:      {tipo}")
    print(f"  Público:   {verde('Sim') if publico else amarelo('Não (link privado)')}")
    print()

    confirma = perguntar("Confirma?", ["s", "n"], "s")
    if confirma != "s":
        print("\n  Cancelado.")
        sys.exit(0)

    print()
    print("  Buscando modelos.json no GitHub...")

    file_data = github_request("GET", f"repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{GITHUB_FILE}?ref={GITHUB_BRANCH}", token)
    sha = file_data["sha"]
    modelos = json.loads(base64.b64decode(file_data["content"]).decode())

    novo = {
        "id":       arquivo.replace(".glb", "").replace(" ", "-").lower(),
        "nome":     nome,
        "descricao": descricao,
        "arquivo":  arquivo,
        "url":      url_modelo,
        "tipo":     tipo,
        "publico":  publico,
        "data":     datetime.now().strftime("%Y-%m-%d")
    }
    modelos.append(novo)

    novo_json  = json.dumps(modelos, ensure_ascii=False, indent=2)
    encoded    = base64.b64encode(novo_json.encode()).decode()
    github_request("PUT", f"repos/{GITHUB_USER}/{GITHUB_REPO}/contents/{GITHUB_FILE}", token, {
        "message": f"Adiciona modelo: {nome}",
        "content": encoded,
        "sha": sha,
        "branch": GITHUB_BRANCH
    })

    print()
    print(verde("✅ Modelo adicionado com sucesso!"))
    print()
    print(f"  Portfólio:  https://geodinamica-site.vercel.app/modelos.html")
    print(f"  Visualizar: https://geodinamica-site.vercel.app/viewer.html?modelo={url_modelo}&nome={nome.replace(' ', '+')}")
    print()

if __name__ == "__main__":
    main()
