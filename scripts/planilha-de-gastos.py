# Gera a planilha de gastos grátis do site (site-static/calculadoras/planilha-de-gastos.xlsx).
# Uso: python3 scripts/planilha-de-gastos.py
# As categorias precisam ser as mesmas de CATEGORIAS_GASTOS em site-static/calculadoras/calc.js.
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule

CATEGORIAS = [
    "Moradia", "Contas da casa", "Mercado", "Comer fora e delivery", "Transporte", "Saúde",
    "Educação", "Lazer", "Compras pessoais", "Dívidas e cartão", "Outros",
]
PAGAMENTOS = ["Pix", "Dinheiro", "Débito", "Crédito", "Boleto"]
LINHAS = 300
PRIMEIRA = 8
ULTIMA = PRIMEIRA + LINHAS - 1

VERDE = "0E4A3B"
MENTA = "D7EEE4"
PAPEL = "F7F5EF"
REAL = '"R$" #,##0.00'
fino = Side(style="thin", color="E3E0D6")
borda = Border(left=fino, right=fino, top=fino, bottom=fino)
titulo = Font(name="Calibri", size=16, bold=True, color=VERDE)
cab = Font(bold=True, color="FFFFFF")
cab_fundo = PatternFill("solid", fgColor=VERDE)
entrada = PatternFill("solid", fgColor=PAPEL)
destaque = PatternFill("solid", fgColor=MENTA)

wb = Workbook()

# Aba 1: onde a pessoa anota os gastos.
g = wb.active
g.title = "Gastos"
g["A1"] = "Planilha de gastos do mês"
g["A1"].font = titulo
g["A2"] = "Feita pelo Dá Conta: ericksantosdasilva600-creator.github.io/D-Conta"
g["A2"].font = Font(italic=True, color="5B6A63")
g["A4"] = "Mês"
g["A5"] = "Renda do mês (salário e outras entradas)"
for c in ("A4", "A5"):
    g[c].font = Font(bold=True)
for c in ("B4", "B5"):
    g[c].fill = entrada
    g[c].border = borda
g["B5"].number_format = REAL
g["D4"] = "Preencha só as células claras. O resumo é calculado sozinho na aba Resumo."
g["D4"].font = Font(color="5B6A63")
for i, nome in enumerate(["Data", "Descrição", "Categoria", "Forma de pagamento", "Valor"], start=1):
    cel = g.cell(row=PRIMEIRA - 1, column=i, value=nome)
    cel.font = cab
    cel.fill = cab_fundo
    cel.border = borda
for r in range(PRIMEIRA, ULTIMA + 1):
    for col in range(1, 6):
        cel = g.cell(row=r, column=col)
        cel.border = borda
    g.cell(row=r, column=1).number_format = "dd/mm/yyyy"
    g.cell(row=r, column=5).number_format = REAL
g.cell(row=PRIMEIRA, column=2, value="Ex.: aluguel (apague esta linha)")
g.cell(row=PRIMEIRA, column=3, value="Moradia")
g.cell(row=PRIMEIRA, column=4, value="Pix")
g.cell(row=PRIMEIRA, column=5, value=0)
g.column_dimensions["A"].width = 14
g.column_dimensions["B"].width = 38
g.column_dimensions["C"].width = 24
g.column_dimensions["D"].width = 20
g.column_dimensions["E"].width = 16
g.freeze_panes = f"A{PRIMEIRA}"

faixa_cat = f"Resumo!$A$12:$A${11 + len(CATEGORIAS)}"
dv_cat = DataValidation(type="list", formula1=faixa_cat, allow_blank=True, showErrorMessage=True,
                        errorTitle="Categoria", error="Escolha uma categoria da lista.")
dv_pag = DataValidation(type="list", formula1='"' + ",".join(PAGAMENTOS) + '"', allow_blank=True)
dv_val = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="0", allow_blank=True,
                        showErrorMessage=True, errorTitle="Valor", error="Digite um valor igual ou maior que zero.")
for dv in (dv_cat, dv_pag, dv_val):
    g.add_data_validation(dv)
dv_cat.add(f"C{PRIMEIRA}:C{ULTIMA}")
dv_pag.add(f"D{PRIMEIRA}:D{ULTIMA}")
dv_val.add(f"E{PRIMEIRA}:E{ULTIMA}")

# Aba 2: resumo com fórmulas.
r = wb.create_sheet("Resumo")
r["A1"] = "Resumo do mês"
r["A1"].font = titulo
valores = f"Gastos!$E${PRIMEIRA}:$E${ULTIMA}"
cats = f"Gastos!$C${PRIMEIRA}:$C${ULTIMA}"
linhas = [
    ("Mês", "=IF(Gastos!B4=\"\",\"\",Gastos!B4)", None),
    ("Renda do mês", "=N(Gastos!B5)", REAL),
    ("Total gasto", f"=SUM({valores})", REAL),
    ("Quanto sobrou", "=B4-B5", REAL),
    ("Parte da renda que foi gasta", "=IF(B4>0,B5/B4,0)", "0%"),
    ("Pago no crédito (vai para a fatura)", f"=SUMIF(Gastos!$D${PRIMEIRA}:$D${ULTIMA},\"Crédito\",{valores})", REAL),
]
for i, (rot, f, fmt) in enumerate(linhas, start=3):
    r.cell(row=i, column=1, value=rot).font = Font(bold=True)
    cel = r.cell(row=i, column=2, value=f)
    cel.border = borda
    if fmt:
        cel.number_format = fmt
r["B6"].fill = destaque
r["B6"].font = Font(bold=True, size=13)
r.conditional_formatting.add("B6", CellIsRule(operator="lessThan", formula=["0"], font=Font(bold=True, color="B3261E")))
r["A9"] = "Gastos por categoria"
r["A9"].font = Font(bold=True, size=13, color=VERDE)
r["A10"] = "Escreva na coluna D quanto pretende gastar em cada categoria. A coluna E mostra se passou."
r["A10"].font = Font(color="5B6A63")
for i, nome in enumerate(["Categoria", "Total gasto", "% do total", "Limite planejado", "Ainda pode gastar"], start=1):
    cel = r.cell(row=11, column=i, value=nome)
    cel.font = cab
    cel.fill = cab_fundo
    cel.border = borda
for i, nome in enumerate(CATEGORIAS):
    lin = 12 + i
    r.cell(row=lin, column=1, value=nome)
    r.cell(row=lin, column=2, value=f"=SUMIF({cats},A{lin},{valores})").number_format = REAL
    r.cell(row=lin, column=3, value=f"=IF($B$5>0,B{lin}/$B$5,0)").number_format = "0%"
    lim = r.cell(row=lin, column=4)
    lim.number_format = REAL
    lim.fill = entrada
    r.cell(row=lin, column=5, value=f"=IF(D{lin}=\"\",\"\",D{lin}-B{lin})").number_format = REAL
    for col in range(1, 6):
        r.cell(row=lin, column=col).border = borda
fim = 11 + len(CATEGORIAS)
tot = fim + 1
r.cell(row=tot, column=1, value="Total").font = Font(bold=True)
r.cell(row=tot, column=2, value=f"=SUM(B12:B{fim})").number_format = REAL
r.cell(row=tot, column=3, value=f"=IF($B$5>0,B{tot}/$B$5,0)").number_format = "0%"
r.cell(row=tot, column=4, value=f"=SUM(D12:D{fim})").number_format = REAL
for col in range(1, 6):
    r.cell(row=tot, column=col).border = borda
    r.cell(row=tot, column=col).fill = destaque
r.conditional_formatting.add(f"E12:E{fim}", CellIsRule(operator="lessThan", formula=["0"], font=Font(bold=True, color="B3261E")))
r.cell(row=tot + 2, column=1, value="Sem categoria? Gastos sem categoria entram no Total gasto, mas não aparecem na tabela.").font = Font(color="5B6A63")
r.column_dimensions["A"].width = 36
for col in "BCDE":
    r.column_dimensions[col].width = 18

# Aba 3: instruções.
c = wb.create_sheet("Como usar")
passos = [
    "Como usar a planilha de gastos",
    "",
    "1. Na aba Gastos, escreva o mês e quanto entrou de dinheiro (salário, bicos, pensão).",
    "2. A cada gasto, anote a data, uma descrição curta, a categoria (escolha na lista), a forma de pagamento e o valor.",
    "3. Abra a aba Resumo para ver o total, quanto sobrou e para onde foi o dinheiro.",
    "4. Na aba Resumo, preencha o limite de cada categoria para o próximo mês e acompanhe se está dentro.",
    "5. No mês seguinte, faça uma cópia do arquivo e apague os gastos antigos.",
    "",
    "Dica: anote no mesmo dia. Gasto pequeno esquecido (café, lanche, aplicativo) é o que mais faz falta no fim do mês.",
    "Funciona no Excel, no Google Planilhas (Arquivo > Importar) e no LibreOffice.",
    "",
    "Prefere no celular? O app Dá Conta é grátis e anota gastos, contas a pagar e metas:",
    "https://ericksantosdasilva600-creator.github.io/D-Conta/app/",
]
for i, t in enumerate(passos, start=1):
    c.cell(row=i, column=1, value=t)
c["A1"].font = titulo
c.column_dimensions["A"].width = 110
for row in c.iter_rows():
    for cel in row:
        cel.alignment = Alignment(wrap_text=True, vertical="top")

wb.calculation.fullCalcOnLoad = True
wb.properties.creator = "Dá Conta"
wb.properties.title = "Planilha de gastos do mês"
wb.save("site-static/calculadoras/planilha-de-gastos.xlsx")
print("ok")
