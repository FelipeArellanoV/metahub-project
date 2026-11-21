"""Pruebas de calidad del video y coherencia de datos (ADR-019). Uso: python test_calidad_video.py"""
import sys
import traceback

import numpy as np

import calidad_video as cv
import recomendaciones


def _buen_video(**kw):
    t = {"width": 1920, "height": 1080, "fps": 60, "fps_valido": True, "duracion_s": 6.0}
    t.update(kw)
    m = [{"nitidez": 120.0, "brillo": 120.0, "altura_cuerpo": 0.6, "cortado": False, "razon_hombros": 0.3}] * 40
    return t, m


def _estado(res, id_):
    return next(c["estado"] for c in res["chequeos"] if c["id"] == id_)


def test_video_bueno_es_adecuado():
    t, m = _buen_video()
    r = cv.evaluar_calidad_video(t, m, 95.0)
    assert r["nivel"] == "adecuada" and r["apta_para_analisis"] and not r["fallas"] and not r["avisos"]


def test_resolucion_fps_y_duracion_bajas_fallan_con_como_corregir():
    t, m = _buen_video(width=320, height=240, fps=10, duracion_s=0.8)
    r = cv.evaluar_calidad_video(t, m, 95.0)
    assert r["nivel"] == "insuficiente" and not r["apta_para_analisis"]
    assert {"resolucion", "fps", "duracion"} <= set(r["fallas"])
    assert all(c["como_corregir"] for c in r["chequeos"] if c["estado"] == "falla")


def test_avisos_dejan_calidad_limitada():
    t, m = _buen_video(width=1280, height=720, fps=25)
    r = cv.evaluar_calidad_video(t, m, 95.0)
    assert r["nivel"] == "limitada" and "fps" in r["avisos"]
    assert _estado(r, "resolucion") == "ok"


def test_borroso_oscuro_pequeno_cortado_y_frontal():
    malo = [{"nitidez": 3.0, "brillo": 20.0, "altura_cuerpo": 0.1, "cortado": True, "razon_hombros": 1.2}] * 40
    t, _ = _buen_video()
    r = cv.evaluar_calidad_video(t, malo, 95.0)
    assert _estado(r, "nitidez") == "falla" and _estado(r, "tamano_atleta") == "falla"
    assert _estado(r, "iluminacion") == "aviso" and _estado(r, "encuadre") == "aviso"
    assert _estado(r, "plano_lateral") == "aviso"


def test_sin_deteccion_falla_y_sin_datos_no_inventa():
    t, _ = _buen_video()
    r = cv.evaluar_calidad_video(t, [{"nitidez": 100.0, "brillo": 100.0}] * 5, 30.0)
    assert _estado(r, "deteccion") == "falla"
    assert _estado(r, "tamano_atleta") == "sin_datos" and _estado(r, "plano_lateral") == "sin_datos"


def test_datos_coherentes_con_carrera_y_datos_planos():
    rng = np.random.default_rng(0)
    ok = list(100 + 70 * np.abs(np.sin(np.linspace(0, 12, 80))) + rng.normal(0, 1, 80))
    r = cv.evaluar_datos_obtenidos(ok, ok, [0.9] * 20, [0.88] * 20, {"conteo_zancadas": 6})
    assert r["nivel"] == "coherente"
    plano = list(150 + rng.normal(0, 1, 80))
    r = cv.evaluar_datos_obtenidos(plano, ok, [0.9] * 20, [0.9] * 20, {"conteo_zancadas": 6})
    assert r["nivel"] == "limitada"
    r = cv.evaluar_datos_obtenidos([150.0] * 3, ok, [0.9], [0.9], None)
    assert r["nivel"] == "insuficiente"


def test_oclusion_de_una_pierna_se_avisa():
    ok = list(100 + 70 * np.abs(np.sin(np.linspace(0, 12, 80))))
    r = cv.evaluar_datos_obtenidos(ok, ok, [0.95] * 20, [0.4] * 20, {"conteo_zancadas": 6})
    assert any(c["id"] == "oclusion_pierna" and c["estado"] == "aviso" for c in r["chequeos"])


def test_calidad_insuficiente_bloquea_recomendaciones_y_explica_como_mejorar():
    t, m = _buen_video(width=320, height=240)
    info = {"valid_rate_pct": 95, "valid_frames": 100, "low_confidence": False,
            "calidad_video": cv.evaluar_calidad_video(t, m, 95.0), "calidad_datos": {"chequeos": []}}
    ipt = {"comparacion_referencia": {"rodilla_min_balanceo": {"etiqueta": "Rodilla mínima en el recobro", "estado": "alteracion", "z": 5.1, "valor": 60.0, "unidad": "°", "sentido": "mayor", "referencia": {"media": 31.6, "de": 5.6}}}}
    r = recomendaciones.generar_recomendaciones(ipt, {"articulaciones_evaluadas": 3}, info, 15)
    assert r["disponible"] is False and r["hallazgos"] == []
    assert "Grabar en 720p" in r["motivo_no_disponible"]
    assert r["confianza"]["nivel"] == "baja"


def test_calidad_limitada_baja_la_confianza_a_media_sin_bloquear():
    t, m = _buen_video(width=1280, height=720, fps=25)
    info = {"valid_rate_pct": 95, "valid_frames": 100, "low_confidence": False,
            "calidad_video": cv.evaluar_calidad_video(t, m, 95.0), "calidad_datos": {"chequeos": []}}
    c = recomendaciones.evaluar_confianza(info, {"articulaciones_evaluadas": 3})
    assert c["nivel"] == "media" and c["como_mejorar_el_video"]


if __name__ == '__main__':
    tests = [v for k, v in sorted(globals().items()) if k.startswith('test_')]
    fails = 0
    for t in tests:
        try:
            t(); print('OK  ', t.__name__)
        except Exception as e:
            fails += 1; print('FAIL', t.__name__, repr(e)[:200]); traceback.print_exc()
    print(f'{len(tests)-fails} pasadas, {fails} falladas')
    sys.exit(1 if fails else 0)
