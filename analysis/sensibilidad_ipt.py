"""
Análisis de sensibilidad del IPT (T-10, Etapa 3).

Pregunta: ¿cuánto depende la categoría del IPT de las decisiones de diseño (pesos y umbrales)?
No valida el IPT (eso exige una referencia externa); mide su robustez interna.

Uso: python analysis/sensibilidad_ipt.py respuesta_cv.json [salida.json]
El JSON es la respuesta de /api/cv/metrics (con processed_frames).
"""
import json, sys, os
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "cv-service"))
from metrics_engine import calculate_ipt_evaluation, calcular_simetria_sesion

def cargar(ruta):
    d = json.load(open(ruta, encoding="utf-8"))
    K, L, R, H = [], [], [], []
    for f in d["processed_frames"]:
        m = f.get("metrics") or {}
        if "left_knee_angle" in m: K.append(m["left_knee_angle"]); L.append(m["left_knee_angle"])
        if "right_knee_angle" in m: K.append(m["right_knee_angle"]); R.append(m["right_knee_angle"])
        if "left_hip_angle" in m: H.append(m["left_hip_angle"])
    return np.array(K), L, R, np.array(H)

def categoria(v):
    return "I (>=90)" if v >= 90 else ("II (75-90)" if v >= 75 else "III (<75)")

def main(ruta, salida=None, n=5000, seed=7):
    K, L, R, H = cargar(ruta)
    sym = calcular_simetria_sesion(L, R)
    entradas = {"rodilla_p95": float(np.percentile(K, 95)), "rodilla_p5": float(np.percentile(K, 5)),
                "cadera_p95": float(np.percentile(H, 95)), "simetria": sym["symmetry"], "sim_valida": sym["valid"]}
    base = calculate_ipt_evaluation(entradas["rodilla_p95"], entradas["rodilla_p5"],
                                    entradas["simetria"] or 0.0, entradas["cadera_p95"],
                                    symmetry_available=sym["valid"])
    sc = {k: base["desglose_sectores"][k]["score"] for k in ("sector_1_propulsion", "sector_2_recobro", "simetria_bilateral")}
    rng = np.random.default_rng(seed)
    # (a) pesos: Dirichlet centrada en (0.40, 0.35, 0.25), desviación cercana a 0.07
    w = rng.dirichlet(np.array([0.40, 0.35, 0.25]) * 30, size=n)
    vals_w = w @ np.array([sc["sector_1_propulsion"], sc["sector_2_recobro"], sc["simetria_bilateral"]])
    # (b) pesos extremos: cada sector con 0.20-0.50 (suma 1)
    # (c) umbral de simetría 85-95 y propulsión desplazada +-5 grados
    vals_u = []
    for _ in range(n):
        dk = rng.uniform(-5, 5)
        r = calculate_ipt_evaluation(entradas["rodilla_p95"] - dk, entradas["rodilla_p5"] + rng.uniform(-5, 5),
                                     (entradas["simetria"] or 0.0) + rng.uniform(-5, 5), entradas["cadera_p95"],
                                     symmetry_available=sym["valid"])
        vals_u.append(r["ipt_score"])
    vals_u = np.array(vals_u)
    def resumen(v):
        cats = {}
        for x in v: cats[categoria(x)] = cats.get(categoria(x), 0) + 1
        return {"media": round(float(v.mean()), 1), "p5": round(float(np.percentile(v, 5)), 1),
                "p95": round(float(np.percentile(v, 95)), 1),
                "categorias_pct": {k: round(c / len(v) * 100, 1) for k, c in sorted(cats.items())}}
    out = {"entradas_robustas": {k: (round(v, 1) if isinstance(v, float) else v) for k, v in entradas.items()},
           "ipt_base": base["ipt_score"], "scores_sector": sc, "simetria_sesion": sym,
           "sensibilidad_pesos": resumen(vals_w), "sensibilidad_entradas_5grados": resumen(vals_u), "n": n}
    print(json.dumps(out, indent=2, ensure_ascii=False))
    if salida: json.dump(out, open(salida, "w", encoding="utf-8"), indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
