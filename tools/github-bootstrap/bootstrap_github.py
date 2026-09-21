#!/usr/bin/env python3
"""
Bootstrap do GitHub do Easy Finance (M0).

Configura, via GitHub CLI (gh), tudo o que dá para tratar como "configuração como código":
labels, milestones, ajustes do repositório, recursos de segurança, issues, GitHub Project
(board) e a ruleset da branch main.

Os dados vêm dos arquivos JSON desta pasta (labels, milestones, issues, ruleset-main).
Para mudar o backlog ou as labels, edite os JSON e rode de novo: o script é idempotente
(não duplica labels, milestones, issues nem itens do project).

Uso:
    python bootstrap_github.py all --dry-run     # só mostra o que faria
    python bootstrap_github.py all               # executa tudo, exceto a ruleset
    python bootstrap_github.py ruleset           # só depois do merge do PR do M0
    python bootstrap_github.py labels issues     # passos específicos

Passos: preflight, labels, milestones, settings, security, issues, project, ruleset
("all" = todos, menos "ruleset").

Requisitos: GitHub CLI (https://cli.github.com), autenticado com `gh auth login`.
Para o passo "project": `gh auth refresh -s project`.
"""

import argparse
import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path
from types import SimpleNamespace

HERE = Path(__file__).resolve().parent
DRY_RUN = False

DESCRIPTION = (
    "API REST de controle financeiro pessoal em Java/Spring Boot. "
    "Substituto da planilha de gastos do dia a dia."
)
TOPICS = [
    "java", "spring-boot", "rest-api", "postgresql", "personal-finance",
    "maven", "docker", "github-actions",
]
PROJECT_TITLE = "Easy Finance"
PRIORITY_LABEL = {"high": "Alta", "medium": "Média", "low": "Baixa"}


# --------------------------------------------------------------------------- util
def load(name):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def fmt(cmd):
    return " ".join(f'"{c}"' if (" " in c or not c) else c for c in cmd)


def run(cmd, input_text=None, check=True, read_only=False):
    """Executa um comando. Em --dry-run apenas imprime (leituras retornam vazio)."""
    if DRY_RUN:
        if not read_only:
            print(f"    [dry-run] {fmt(cmd)}")
        return ""
    proc = subprocess.run(
        cmd, input=input_text, capture_output=True, text=True, encoding="utf-8"
    )
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout).strip()
        if check:
            raise SystemExit(f"\nErro ao executar: {fmt(cmd)}\n{detail}")
        first = detail.splitlines()[0] if detail else "sem detalhes"
        print(f"    ! ignorado (faça manualmente se necessário): {first}")
        return None
    return proc.stdout


def gh_json(cmd):
    out = run(cmd, read_only=True)
    return json.loads(out) if out else None


def lines(out):
    return [ln for ln in (out or "").splitlines() if ln.strip()]


def pause(seconds=0.6):
    """Evita o rate limit secundário do GitHub em operações em sequência."""
    if not DRY_RUN:
        time.sleep(seconds)


# -------------------------------------------------------------------------- passos
def step_preflight(ctx):
    print("→ Pré-requisitos")
    if DRY_RUN:
        print("    (dry-run: verificação do gh ignorada)")
        return
    if shutil.which("gh") is None:
        raise SystemExit(
            "GitHub CLI (gh) não encontrado. Instale em https://cli.github.com e rode `gh auth login`."
        )
    run(["gh", "auth", "status"])
    print(f"    gh autenticado; repositório alvo: {ctx.repo}")


def step_labels(ctx):
    print("→ Labels")
    for lab in load("labels.json"):
        run([
            "gh", "label", "create", lab["name"],
            "--color", lab["color"],
            "--description", lab["description"],
            "--force", "--repo", ctx.repo,
        ])
    print("    ok")


def step_milestones(ctx):
    print("→ Milestones")
    existing = set(lines(run(
        ["gh", "api", f"repos/{ctx.repo}/milestones?state=all&per_page=100",
         "--paginate", "--jq", ".[].title"], read_only=True)))
    for m in load("milestones.json"):
        if m["title"] in existing:
            print(f"    já existe: {m['title']}")
            continue
        run(["gh", "api", f"repos/{ctx.repo}/milestones", "--method", "POST",
             "-f", f"title={m['title']}", "-f", f"description={m['description']}"])
        print(f"    {'(simulado) ' if DRY_RUN else ''}criado: {m['title']}")


def step_settings(ctx):
    print("→ Configurações do repositório")
    run([
        "gh", "repo", "edit", ctx.repo,
        "--description", DESCRIPTION,
        "--add-topic", ",".join(TOPICS),
        "--enable-issues=true",
        "--enable-wiki=false",          # a documentação vive em /docs
        "--enable-projects=true",
        "--enable-squash-merge=true",
        "--enable-merge-commit=false",
        "--enable-rebase-merge=false",
        "--enable-auto-merge=true",
        "--delete-branch-on-merge=true",
    ], check=False)
    # Mensagem do squash = título do PR (que segue Conventional Commits).
    run([
        "gh", "api", "--method", "PATCH", f"repos/{ctx.repo}",
        "-f", "squash_merge_commit_title=PR_TITLE",
        "-f", "squash_merge_commit_message=BLANK",
        "-F", "allow_update_branch=true",
    ], check=False)


def step_security(ctx):
    print("→ Segurança")
    repo = ctx.repo
    run(["gh", "api", "--method", "PUT", f"repos/{repo}/vulnerability-alerts"], check=False)
    run(["gh", "api", "--method", "PUT", f"repos/{repo}/automated-security-fixes"], check=False)
    run(["gh", "api", "--method", "PUT", f"repos/{repo}/private-vulnerability-reporting"], check=False)
    payload = json.dumps({"security_and_analysis": {
        "secret_scanning": {"status": "enabled"},
        "secret_scanning_push_protection": {"status": "enabled"},
    }})
    run(["gh", "api", "--method", "PATCH", f"repos/{repo}", "--input", "-"],
        input_text=payload, check=False)
    # CodeQL "default setup" (analisa o Java do protótipo legado até o backend existir).
    run(["gh", "api", "--method", "PATCH", f"repos/{repo}/code-scanning/default-setup",
         "-f", "state=configured", "-f", "query_suite=default", "-f", "languages[]=java-kotlin"],
        check=False)


def step_issues(ctx):
    print("→ Issues")
    existing = set(lines(run(
        ["gh", "issue", "list", "--repo", ctx.repo, "--state", "all", "--limit", "1000",
         "--json", "title", "--jq", ".[].title"], read_only=True)))
    created = 0
    for issue in load("issues.json"):
        if issue["title"] in existing:
            print(f"    já existe: {issue['title']}")
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False, encoding="utf-8") as f:
            f.write(issue["body"])
            body_path = f.name
        try:
            cmd = ["gh", "issue", "create", "--repo", ctx.repo,
                   "--title", issue["title"], "--body-file", body_path,
                   "--milestone", issue["milestone"]]
            for label in issue["labels"]:
                cmd += ["--label", label]
            out = run(cmd)
            print(f"    {'(simulado) ' if DRY_RUN else ''}criada: {issue['title']} {out.strip() if out else ''}")
            created += 1
            pause()
        finally:
            os.unlink(body_path)
    print(f"    {created} issue(s) {'simulada(s)' if DRY_RUN else 'criada(s)'}")


def step_project(ctx):
    print("→ GitHub Project (board)")
    owner = ctx.repo.split("/")[0]
    base = ["--owner", owner]

    if DRY_RUN:
        print("    [dry-run] gh project create/field-create/link/item-add/item-edit ...")
        print("    (leituras e IDs dependem do GitHub; omitidos no dry-run)")
        return

    projects = gh_json(["gh", "project", "list", *base, "--format", "json"]) or {"projects": []}
    number = next((p["number"] for p in projects["projects"] if p["title"] == PROJECT_TITLE), None)
    if number is None:
        created = json.loads(run(["gh", "project", "create", *base, "--title", PROJECT_TITLE,
                                  "--format", "json"]))
        number = created["number"]
        print(f"    project criado (#{number})")
    else:
        print(f"    project já existe (#{number})")
    n = str(number)

    # Campos personalizados
    field_list = gh_json(["gh", "project", "field-list", n, *base, "--format", "json"])
    existing_fields = {f["name"] for f in field_list["fields"]}
    for name, options in (("Prioridade", "Alta,Média,Baixa"), ("Tamanho", "P,M,G")):
        if name not in existing_fields:
            run(["gh", "project", "field-create", n, *base, "--name", name,
                 "--data-type", "SINGLE_SELECT", "--single-select-options", options], check=False)

    run(["gh", "project", "link", n, *base, "--repo", ctx.repo], check=False)

    # Adiciona as issues que ainda não estão no project
    item_list = gh_json(["gh", "project", "item-list", n, *base, "--format", "json", "--limit", "500"])
    in_project = {it["content"]["url"] for it in item_list["items"] if it.get("content", {}).get("url")}
    urls = lines(run(["gh", "issue", "list", "--repo", ctx.repo, "--state", "all", "--limit", "1000",
                      "--json", "url", "--jq", ".[].url"], read_only=True))
    for url in urls:
        if url not in in_project:
            run(["gh", "project", "item-add", n, *base, "--url", url], check=False)
            pause(0.4)

    # Preenche Prioridade e Tamanho a partir do issues.json (melhor esforço)
    try:
        set_field_values(ctx, n, base)
    except Exception as exc:  # noqa: BLE001 - melhor esforço, não deve derrubar o script
        print(f"    ! não foi possível preencher os campos automaticamente: {exc}")
        print("      Preencha Prioridade/Tamanho manualmente no board.")


def set_field_values(ctx, n, base):
    project = gh_json(["gh", "project", "view", n, *base, "--format", "json"])
    fields = {f["name"]: f for f in gh_json(
        ["gh", "project", "field-list", n, *base, "--format", "json"])["fields"]}
    items = gh_json(["gh", "project", "item-list", n, *base, "--format", "json",
                     "--limit", "500"])["items"]
    item_by_title = {it["content"]["title"]: it["id"] for it in items if it.get("content")}

    def option_id(field_name, option_name):
        field = fields.get(field_name)
        if not field:
            return None, None
        opt = next((o["id"] for o in field.get("options", []) if o["name"] == option_name), None)
        return field["id"], opt

    for issue in load("issues.json"):
        item_id = item_by_title.get(issue["title"])
        if not item_id:
            continue
        for field_name, value in (("Prioridade", PRIORITY_LABEL[issue["priority"]]),
                                  ("Tamanho", issue["size"])):
            field_id, opt_id = option_id(field_name, value)
            if field_id and opt_id:
                run(["gh", "project", "item-edit", "--id", item_id, "--project-id", project["id"],
                     "--field-id", field_id, "--single-select-option-id", opt_id], check=False)
                pause(0.3)
    print("    campos Prioridade/Tamanho preenchidos")


def step_ruleset(ctx):
    print("→ Ruleset da main")
    payload = (HERE / "ruleset-main.json").read_text(encoding="utf-8")
    ids = run(["gh", "api", f"repos/{ctx.repo}/rulesets", "--jq",
               '.[] | select(.name=="main-protection") | .id'], read_only=True)
    existing = lines(ids)
    if existing:
        run(["gh", "api", "--method", "PUT", f"repos/{ctx.repo}/rulesets/{existing[0]}",
             "--input", "-"], input_text=payload)
        print("    (simulado) ruleset atualizada" if DRY_RUN else "    ruleset atualizada")
    else:
        run(["gh", "api", "--method", "POST", f"repos/{ctx.repo}/rulesets", "--input", "-"],
            input_text=payload)
        print("    (simulado) ruleset criada" if DRY_RUN else "    ruleset criada")


STEPS = {
    "preflight": step_preflight,
    "labels": step_labels,
    "milestones": step_milestones,
    "settings": step_settings,
    "security": step_security,
    "issues": step_issues,
    "project": step_project,
    "ruleset": step_ruleset,
}
ALL_STEPS = ["preflight", "labels", "milestones", "settings", "security", "issues", "project"]


def detect_repo(arg):
    if arg:
        return arg
    if DRY_RUN:
        return "IgorPacheco1/Easy-finance"
    out = run(["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"])
    return out.strip()


def main():
    global DRY_RUN
    parser = argparse.ArgumentParser(description="Bootstrap do GitHub do Easy Finance (M0)")
    parser.add_argument("steps", nargs="+", choices=[*STEPS, "all"],
                        help="passos a executar ('all' = todos, exceto ruleset)")
    parser.add_argument("--dry-run", action="store_true", help="mostra os comandos sem executá-los")
    parser.add_argument("--repo", help="OWNER/REPO (padrão: repositório do diretório atual)")
    args = parser.parse_args()

    DRY_RUN = args.dry_run
    steps = ALL_STEPS if "all" in args.steps else args.steps
    ctx = SimpleNamespace(repo=detect_repo(args.repo))

    print(f"Repositório: {ctx.repo}{'  (dry-run)' if DRY_RUN else ''}\n")
    for name in steps:
        STEPS[name](ctx)
        print()
    print("Concluído.")


if __name__ == "__main__":
    main()
