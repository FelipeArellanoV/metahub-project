"""Validación del ángulo del sistema frente a la referencia manual (Kinovea). T-07, versión preliminar.

Uso:
    python analysis/validar_kinovea.py sistema.csv observador_A.csv observador_B.csv [salida.json]

Entradas (CSV con encabezado): sistema.csv = frame,tiempo_s,articulacion,sistema_deg
                               observador_X.csv = frame,tiempo_s,articulacion,angulo_deg
Calcula por articulación y global:
  * Sistema vs referencia (media de los dos observadores): sesgo, MAE, RMSE, límites de Bland-Altman.
  * Acuerdo entre observadores: MAE y ICC(2,1) (dos vías, efectos aleatorios, acuerdo absoluto, medida única).
  * Criterio del protocolo: MAE del sistema <= 5 grados.
Con menos de 20 cuadros distintos los resultados son preliminares y no permiten conclusiones firmes.
"""
import csv, json, math, sys


def leer(path, col):
    out = {}
    with open(path, newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            v = (r.get(col) or '').strip().replace(',', '.')
            if v == '':
                continue
            out[(int(r['frame']), r['articulacion'])] = float(v)
    return out


def icc_2_1(a, b):
    """ICC(2,1) para dos evaluadores. Retorna None si no hay varianza o n < 3."""
    n, k = len(a), 2
    if n < 3:
        return None
    gm = (sum(a) + sum(b)) / (n * k)
    rm = [(x + y) / 2 for x, y in zip(a, b)]
    cm = [sum(a) / n, sum(b) / n]
    ssr = k * sum((m - gm) ** 2 for m in rm)
    ssc = n * sum((m - gm) ** 2 for m in cm)
    sst = sum((x - gm) ** 2 for x in a) + sum((x - gm) ** 2 for x in b)
    sse = sst - ssr - ssc
    msr, msc, mse = ssr / (n - 1), ssc / (k - 1), sse / ((n - 1) * (k - 1))
    den = msr + (k - 1) * mse + k * (msc - mse) / n
    return None if den == 0 else (msr - mse) / den


def resumen(pred, ref):
    d = [p - r for p, r in zip(pred, ref)]
    n = len(d)
    if n == 0:
        return None
    sesgo = sum(d) / n
    sd = math.sqrt(sum((x - sesgo) ** 2 for x in d) / (n - 1)) if n > 1 else 0.0
    return {'n': n, 'sesgo': round(sesgo, 2), 'MAE': round(sum(abs(x) for x in d) / n, 2),
            'RMSE': round(math.sqrt(sum(x * x for x in d) / n), 2),
            'LoA_inf': round(sesgo - 1.96 * sd, 2), 'LoA_sup': round(sesgo + 1.96 * sd, 2)}


def main(sis_p, a_p, b_p, out=None):
    S, A, B = leer(sis_p, 'sistema_deg'), leer(a_p, 'angulo_deg'), leer(b_p, 'angulo_deg')
    claves = sorted(set(S) & set(A) & set(B))
    if not claves:
        sys.exit('No hay cuadros completos (sistema y ambos observadores).')
    res = {}
    grupos = {'global': claves}
    for c in claves:
        grupos.setdefault(c[1], []).append(c)
    for g, ks in grupos.items():
        s, a, b = [S[k] for k in ks], [A[k] for k in ks], [B[k] for k in ks]
        ref = [(x + y) / 2 for x, y in zip(a, b)]
        sv = resumen(s, ref)
        icc = icc_2_1(a, b)
        res[g] = {'sistema_vs_referencia': sv,
                  'entre_observadores': {'MAE': resumen(a, b)['MAE'], 'ICC_2_1': None if icc is None else round(icc, 3)},
                  'cumple_MAE_5': bool(sv['MAE'] <= 5.0), 'preliminar': len({k[0] for k in ks}) < 20}
    print(json.dumps(res, ensure_ascii=False, indent=2))
    if out:
        json.dump(res, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)


if __name__ == '__main__':
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    main(*sys.argv[1:5])
