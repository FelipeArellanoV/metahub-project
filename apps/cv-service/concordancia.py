"""
Concordancia entre el análisis de MetaHub y la revisión de un profesional (ADR-019).

Entrada: CSV con columnas  video_id, sector, metahub, profesional
  sector      : propulsion | recobro | simetria
  metahub     : 1 si MetaHub marcó un hallazgo en ese sector, 0 si no
  profesional : 1 si el profesional, viendo el video sin conocer la salida de MetaHub,
                observó el problema, 0 si no

Salida: acuerdo observado, kappa de Cohen, sensibilidad y especificidad por sector y global.
Sirve para calibrar los umbrales (75/50) con datos reales, no para aprobar el método.
Uso: python concordancia.py revisiones.csv
"""
import csv
import sys
from collections import defaultdict

SECTORES = ("propulsion", "recobro", "simetria")


def _bin(v):
    v = str(v).strip().lower()
    if v in ("1", "si", "sí", "true"):
        return 1
    if v in ("0", "no", "false"):
        return 0
    raise ValueError(f"Valor no binario: {v!r}")


def metricas(pares):
    """pares: lista de (metahub, profesional) con valores 0/1."""
    n = len(pares)
    if n == 0:
        return {"n": 0}
    a = sum(1 for m, p in pares if m == 1 and p == 1)
    b = sum(1 for m, p in pares if m == 1 and p == 0)
    c = sum(1 for m, p in pares if m == 0 and p == 1)
    d = sum(1 for m, p in pares if m == 0 and p == 0)
    po = (a + d) / n
    pe = ((a + b) * (a + c) + (c + d) * (b + d)) / (n * n)
    kappa = None if pe == 1 else (po - pe) / (1 - pe)
    return {
        "n": n, "acuerdo": po, "kappa": kappa,
        "sensibilidad": a / (a + c) if (a + c) else None,
        "especificidad": d / (b + d) if (b + d) else None,
        "tabla": {"ambos": a, "solo_metahub": b, "solo_profesional": c, "ninguno": d},
    }


def leer(ruta):
    por_sector = defaultdict(list)
    with open(ruta, newline="", encoding="utf-8") as f:
        for fila in csv.DictReader(f):
            sector = fila["sector"].strip().lower()
            if sector not in SECTORES:
                raise ValueError(f"Sector desconocido: {sector!r}")
            por_sector[sector].append((_bin(fila["metahub"]), _bin(fila["profesional"])))
    return por_sector


def resumen(por_sector):
    out = {s: metricas(por_sector[s]) for s in SECTORES if por_sector.get(s)}
    todos = [p for s in por_sector.values() for p in s]
    out["global"] = metricas(todos)
    return out


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Uso: python concordancia.py revisiones.csv")
    for nombre, m in resumen(leer(sys.argv[1])).items():
        f = lambda x: "n/d" if x is None else f"{x:.2f}"
        print(f"{nombre:11s} n={m['n']} acuerdo={f(m.get('acuerdo'))} kappa={f(m.get('kappa'))} "
              f"sens={f(m.get('sensibilidad'))} espec={f(m.get('especificidad'))}")
