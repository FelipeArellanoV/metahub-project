"""Pruebas de la cinemática por evento y del IPT v2 referenciado (ADR-023). Uso: python test_cinematica_eventos.py

Se genera un corredor sintético con valores conocidos en el contacto, el despegue y el balanceo, y se
verifica que el detector los recupere, que la comparación con la referencia sea correcta y que con
muestreo insuficiente no se compare.
"""
import math
import sys

sys.path.insert(0, '.')
from cinematica_eventos import analizar_cinematica_eventos, resumen_estadistico, comparar_con_referencia
from metrics_engine import calculate_ipt_referenciado, ipt_desde_z
from recomendaciones import generar_recomendaciones

LT, LS = 200.0, 200.0                      # muslo y pierna en píxeles
CADERA = (600.0, 300.0)
SUELO = CADERA[1] + LT + LS + 10.0


def _lerp(a, b, f):
    return a + (b - a) * f


def _pierna(fase, p, sentido):
    """Puntos de una pierna en una fase 0-1 del ciclo (apoyo primero)."""
    apoyo = p["apoyo"]
    if fase < apoyo:
        f = fase / apoyo
        muslo, rodilla = _lerp(p["muslo_td"], p["muslo_to"], f), _lerp(p["rod_td"], p["rod_to"], f)
        dist = _lerp(p["dist_td"], -p["dist_to"], f)              # % del largo de pierna, + delante
        en_suelo, altura = True, 0.0
    else:
        f = (fase - apoyo) / (1 - apoyo)
        # muslo: del despegue al máximo (60 % del balanceo) y luego al contacto
        muslo = (_lerp(p["muslo_to"], p["muslo_max"], (1 - math.cos(math.pi * f / 0.6)) / 2) if f < 0.6 else
                 _lerp(p["muslo_max"], p["muslo_td"], (1 - math.cos(math.pi * (f - 0.6) / 0.4)) / 2))
        # rodilla: del despegue al mínimo (45 %) y luego al contacto
        rodilla = (_lerp(p["rod_to"], p["rod_min"], (1 - math.cos(math.pi * f / 0.45)) / 2) if f < 0.45 else
                   _lerp(p["rod_min"], p["rod_td"], (1 - math.cos(math.pi * (f - 0.45) / 0.55)) / 2))
        dist, en_suelo, altura = None, False, 0.35 * (LT + LS) * math.sin(math.pi * f)
    th = math.radians(muslo)
    rodilla_xy = (CADERA[0] + LT * math.sin(th) * sentido, CADERA[1] + LT * math.cos(th))
    phi = th - math.radians(180.0 - rodilla)
    tobillo = (rodilla_xy[0] + LS * math.sin(phi) * sentido, rodilla_xy[1] + LS * math.cos(phi))
    if en_suelo:
        punta_x = CADERA[0] + dist / 100.0 * (LT + LS) * sentido
        punta, talon = (punta_x, SUELO), (punta_x - 40 * sentido, SUELO)
    else:
        # la punta avanza de forma continua desde detrás de la cadera hasta el siguiente contacto
        d = _lerp(-p["dist_to"], p["dist_td"], (1 - math.cos(math.pi * f)) / 2)
        punta_x, y = CADERA[0] + d / 100.0 * (LT + LS) * sentido, SUELO - altura
        punta, talon = (punta_x, y), (punta_x - 40 * sentido, y)
    return rodilla_xy, tobillo, punta, talon


def corredor(fs=120.0, dur=4.0, sentido=1, periodo=0.44, asim=0.0, apoyo=None, **cambios):
    p = {"apoyo": apoyo if apoyo is not None else 0.104 / 0.44, "muslo_td": 33.0, "muslo_to": -28.7, "muslo_max": 70.3, "rod_td": 152.3,
         "rod_to": 155.4, "rod_min": 31.6, "dist_td": 49.8, "dist_to": 72.4}
    p.update(cambios)
    cuadros = []
    for i in range(int(dur * fs)):
        t = round(i / fs, 4)
        kp = {"left_hip": list(CADERA), "right_hip": list(CADERA),
              "nose": [CADERA[0] + 30 * sentido, CADERA[1] - 260],
              "left_ear": [CADERA[0], CADERA[1] - 265], "right_ear": [CADERA[0], CADERA[1] - 265],
              "left_shoulder": [CADERA[0], CADERA[1] - 220], "right_shoulder": [CADERA[0], CADERA[1] - 220]}
        for lado, desfase in (("left", 0.0), ("right", 0.5)):
            pl = dict(p)
            if lado == "right" and asim:
                pl["rod_min"] = p["rod_min"] + asim
            r, a, pt, tl = _pierna(((t / periodo) + desfase) % 1.0, pl, sentido)
            kp.update({f"{lado}_knee": list(r), f"{lado}_ankle": list(a), f"{lado}_foot_index": list(pt),
                       f"{lado}_heel": list(tl)})
        cuadros.append({"t": t, "kp": kp})
    return cuadros


def test_recupera_los_valores_de_referencia_a_120_hz():
    r = analizar_cinematica_eventos(corredor(), 120.0, edad=20)
    assert r["valida"] and r["regularidad"]["regular"], (r.get("motivo"), r["regularidad"])
    assert r["simetria_por_alternancia"] is True
    v = r["variables"]
    assert abs(v["rodilla_min_balanceo"]["media"] - 31.6) < 1.5
    assert abs(v["muslo_max_elevacion"]["media"] - 70.3) < 1.5
    assert abs(v["rodilla_contacto"]["media"] - 152.3) < 4.0
    assert abs(v["rodilla_despegue"]["media"] - 155.4) < 4.0
    assert abs(v["distancia_relativa_contacto"]["media"] - 49.8) < 4.0
    assert abs(v["frecuencia_paso_hz"]["media_global"] - 1 / 0.22) < 0.1
    c = r["comparacion"]
    for clave in ("rodilla_min_balanceo", "rodilla_contacto", "rodilla_despegue", "distancia_relativa_contacto"):
        assert c[clave]["estado"] == "dentro_de_referencia", (clave, c[clave])


def test_sentido_de_carrera_hacia_la_izquierda():
    r = analizar_cinematica_eventos(corredor(sentido=-1), 120.0)
    assert r["sentido_de_carrera"]["sentido"] == -1
    assert abs(r["variables"]["muslo_max_elevacion"]["media"] - 70.3) < 1.5


def test_a_30_hz_no_compara_instantes_de_contacto():
    cuadros = [c for i, c in enumerate(corredor()) if i % 4 == 0]
    r = analizar_cinematica_eventos(cuadros, 30.0)
    c = r["comparacion"]
    assert c["rodilla_contacto"]["estado"] == "no_comparable"
    assert c["tiempo_apoyo_s"]["estado"] == "no_comparable"
    assert c["rodilla_min_balanceo"]["estado"] in ("dentro_de_referencia", "dentro_del_error_del_metodo")


def test_alteracion_exige_2_de_y_superar_el_error_del_metodo():
    # Recobro de 55°: z = 4,2 y diferencia 23,4° > 14,6° -> alteración.
    r = analizar_cinematica_eventos(corredor(rod_min=55.0), 120.0)
    assert r["comparacion"]["rodilla_min_balanceo"]["estado"] == "alteracion"
    # Recobro de 44°: z = 2,2 pero 12,4° < 14,6° -> dentro del error del método, no se atribuye al atleta.
    r = analizar_cinematica_eventos(corredor(rod_min=44.0), 120.0)
    assert r["comparacion"]["rodilla_min_balanceo"]["estado"] == "dentro_del_error_del_metodo"


def test_sobrezancada_se_detecta_en_distancia_relativa():
    r = analizar_cinematica_eventos(corredor(dist_td=65.0), 120.0)
    c = r["comparacion"]["distancia_relativa_contacto"]
    assert c["estado"] == "alteracion" and c["sentido"] == "mayor"


def _intercambiar(kp):
    for p in ("hip", "knee", "ankle", "heel", "foot_index"):
        kp[f"left_{p}"], kp[f"right_{p}"] = kp[f"right_{p}"], kp[f"left_{p}"]


def test_no_depende_de_los_rotulos_izquierda_derecha():
    base = analizar_cinematica_eventos(corredor(), 120.0)
    # 1) rótulos intercambiados al azar en 30 % de los cuadros
    import random
    rng = random.Random(3)
    azar = corredor()
    for c in azar:
        if rng.random() < 0.3:
            _intercambiar(c["kp"])
    # 2) lo que se observó en videos reales: "izquierda" es siempre la pierna de adelante
    adelante = corredor()
    for c in adelante:
        kp = c["kp"]
        if kp["right_knee"][0] > kp["left_knee"][0]:      # corre hacia +x: adelante = x mayor
            _intercambiar(kp)
    for cuadros in (azar, adelante):
        r = analizar_cinematica_eventos(cuadros, 120.0)
        assert r["regularidad"]["regular"], r["regularidad"]
        for clave in ("rodilla_min_balanceo", "rodilla_contacto", "rodilla_despegue", "distancia_relativa_contacto"):
            assert abs(r["variables"][clave]["media"] - base["variables"][clave]["media"]) < 0.5, clave


def test_trote_no_se_compara_con_la_referencia_de_sprint():
    # 0,8 s por zancada = 2,5 pasos/s: ritmo de trote.
    r = analizar_cinematica_eventos(corredor(periodo=0.8, apoyo=0.3 / 0.8, dur=6.0), 120.0)
    assert r["es_sprint"]["es_sprint"] is False and "trote" in r["es_sprint"]["motivo"]
    assert all(v["estado"] == "no_comparable" for v in r["comparacion"].values())
    assert calculate_ipt_referenciado(r["comparacion"])["ipt_score"] is None


def test_camara_lenta_con_factor_recupera_el_tiempo_real():
    # Sprint a 240 cuadros/s guardado a 30 (x8): con el factor, el ritmo y la comparación son los reales.
    lento = [{"t": c["t"] * 8, "kp": c["kp"]} for c in corredor(fs=240.0, dur=2.5)]
    sin_factor = analizar_cinematica_eventos(lento, 30.0)
    assert not sin_factor["regularidad"]["regular"] or not sin_factor["es_sprint"]["es_sprint"]
    con_factor = analizar_cinematica_eventos([{"t": c["t"] / 8, "kp": c["kp"]} for c in lento], 240.0)
    assert con_factor["es_sprint"]["es_sprint"] and con_factor["regularidad"]["regular"]
    assert abs(con_factor["variables"]["frecuencia_paso_hz"]["media_global"] - 1 / 0.22) < 0.15


def test_depuracion_descarta_contactos_falsos_y_corta_en_pasos_perdidos():
    import numpy as np
    from cinematica_eventos import depurar_apoyos
    t = np.round(np.arange(0, 6, 0.01), 2)
    idx = lambda s: int(round(s * 100))
    reales = [0.2, 0.42, 0.64, 0.86, 1.08, 1.30, 2.18, 2.40, 2.62, 2.84]    # hueco 1,30 -> 2,18 (pasos perdidos)
    falsos = [0.50, 2.47]                                                   # contactos falsos breves
    apoyos = sorted([{"td": idx(x), "to": idx(x) + 10} for x in reales] +
                    [{"td": idx(x), "to": idx(x) + 1} for x in falsos], key=lambda a: a["td"])
    d = depurar_apoyos(apoyos, t)
    assert abs(d["paso_dominante_s"] - 0.22) < 0.01
    assert [round(t[a["td"]], 2) for a in d["apoyos"]] == reales
    assert len({a["tramo"] for a in d["apoyos"]}) == 2


def test_apoyos_demasiado_cortos_bloquean_las_variables_de_instante():
    from cinematica_eventos import comparar_con_referencia
    variables = {"rodilla_contacto": {"n": 6, "media": 152.0}, "rodilla_min_balanceo": {"n": 6, "media": 32.0}}
    c = comparar_con_referencia(variables, 120.0, 20, True, {"regular": True},
                                {"estable": False, "motivo": "pie inestable"}, {"es_sprint": True})
    assert c["rodilla_contacto"]["estado"] == "no_comparable"
    assert c["rodilla_min_balanceo"]["estado"] == "dentro_de_referencia"


def test_sin_datos_no_inventa():
    r = analizar_cinematica_eventos([{"t": i / 60, "kp": {}} for i in range(120)], 60.0)
    assert r["valida"] is False and r["variables"] == {}
    assert resumen_estadistico([]) == {"n": 0}


def test_resumen_estadistico():
    s = resumen_estadistico([10, 12, 14])
    assert s["n"] == 3 and s["media"] == 12 and s["de"] == 2 and s["ic95"][0] < 12 < s["ic95"][1]


def test_escala_del_ipt_sigue_la_convencion_del_gdi():
    # 100 = igual a la referencia; cada 10 puntos menos = 1 DE de alejamiento medio (RMS).
    assert ipt_desde_z([0, 0, 0]) == 100.0
    assert ipt_desde_z([1, -1, 1]) == 90.0
    assert ipt_desde_z([2, 0]) == round(100 - 10 * (2 ** 2 / 2) ** 0.5, 1)
    assert ipt_desde_z([15, 15]) == 0.0            # acotado a 0
    assert ipt_desde_z([]) is None


def test_ipt_sin_ponderaciones_todas_las_variables_pesan_igual():
    from cinematica_eventos import comparar_con_referencia
    def ipt(**v):
        variables = {k: {"n": 6, "media": x} for k, x in v.items()}
        return calculate_ipt_referenciado(comparar_con_referencia(variables, 120.0, 20, True))["ipt_score"]
    # Una desviación de 2 DE en una variable de contacto o en una de recobro restan lo mismo.
    a = ipt(rodilla_contacto=152.3 + 2 * 5.6, rodilla_min_balanceo=31.6)
    b = ipt(rodilla_contacto=152.3, rodilla_min_balanceo=31.6 + 2 * 5.6)
    assert a == b


def test_ipt_cerca_de_la_referencia_con_perfil_e_intervalo():
    r = analizar_cinematica_eventos(corredor(), 120.0)
    bueno = calculate_ipt_referenciado(r["comparacion"], r["pasos"])
    assert bueno["ipt_score"] >= 90 and bueno["version"].startswith("3.")
    assert bueno["ic95"][0] <= bueno["ipt_score"] <= bueno["ic95"][1]
    assert bueno["provisional"] is False and "frecuencia_paso_hz" not in bueno["variables_usadas"]
    r2 = analizar_cinematica_eventos(corredor(rod_min=60.0, dist_td=66.0), 120.0)
    malo = calculate_ipt_referenciado(r2["comparacion"], r2["pasos"])
    assert malo["ipt_score"] < bueno["ipt_score"] and malo["ic95"][1] < bueno["ic95"][0]
    assert malo["perfil"][0]["variable"] in ("rodilla_min_balanceo", "distancia_relativa_contacto")
    assert malo["sector_prioritario"] in ("Recobro", "Contacto")


def test_ipt_con_30_hz_es_provisional():
    cuadros = [c for i, c in enumerate(corredor()) if i % 4 == 0]
    ipt = calculate_ipt_referenciado(analizar_cinematica_eventos(cuadros, 30.0)["comparacion"])
    assert ipt["ipt_score"] is not None and ipt["provisional"] is True
    assert "contacto" not in ipt["fases_evaluadas"]


def test_ipt_sin_variables_comparables_no_inventa_puntaje():
    ipt = calculate_ipt_referenciado({})
    assert ipt["ipt_score"] is None and "60 cuadros" in ipt["motivo"]


def test_asimetria_genera_hallazgo_de_simetria():
    r = analizar_cinematica_eventos(corredor(asim=25.0), 120.0)
    ipt = calculate_ipt_referenciado(r["comparacion"])
    rec = generar_recomendaciones(ipt, {"articulaciones_evaluadas": 3},
                                  {"valid_rate_pct": 95, "valid_frames": 400}, 15)
    assert any(h["tipo"] == "simetria" for h in rec["hallazgos"])


def test_referencia_adulta_se_declara_en_menores():
    c = comparar_con_referencia({"rodilla_min_balanceo": {"n": 5, "media": 33.0}}, 120.0, 14, True)
    assert "adultos" in c["rodilla_min_balanceo"]["nota_poblacion"]


if __name__ == "__main__":
    pruebas = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for prueba in pruebas:
        prueba()
        print("OK  ", prueba.__name__)
    print(len(pruebas), "pasadas")
