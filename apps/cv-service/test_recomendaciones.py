"""Pruebas del motor de recomendaciones (ADR-018): sin dato no hay recomendación."""
from recomendaciones import banda_edad, evaluar_confianza, generar_recomendaciones

VIDEO_OK = {"valid_rate_pct": 90.0, "valid_frames": 120, "low_confidence": False}
ARTIC_OK = {"articulaciones_evaluadas": 3, "articulaciones": {
    "rodilla": {"evaluable": True, "simetria": 77.0},
    "cadera": {"evaluable": True, "simetria": 85.5},
    "tobillo": {"evaluable": True, "simetria": 60.0}}}


def ipt(s1=94.0, s2=100.0, s3=90.0, ang1=170.0, ang2=60.0, sim=92.0, excluida=False):
    return {"desglose_sectores": {
        "sector_1_propulsion": {"score": s1, "angulo_real": ang1, "rango_optimo": "165° - 175°"},
        "sector_2_recobro": {"score": s2, "angulo_real": ang2, "rango_optimo": "< 70°"},
        "simetria_bilateral": {"score": s3, "porcentaje_real": sim, "rango_optimo": "≥ 92.0%"}},
        "symmetry_excluded": excluida}


def test_banda_de_edad():
    assert banda_edad(12)["etiqueta"] == "Sub-14"
    assert banda_edad(13)["etiqueta"] == "Sub-14"
    assert banda_edad(14)["etiqueta"] == "Sub-16"
    assert banda_edad(15)["etiqueta"] == "Sub-16"
    assert banda_edad(16)["etiqueta"] == "Sub-18"
    assert banda_edad(17)["etiqueta"] == "Sub-18"
    for fuera in (None, 9, 18, 40, "abc"):
        assert banda_edad(fuera)["etiqueta"] is None          # no se inventa una banda


def test_sin_metricas_no_recomienda():
    r = generar_recomendaciones(None, None, VIDEO_OK, 15)
    assert r["disponible"] is False and r["hallazgos"] == []
    r = generar_recomendaciones({}, None, VIDEO_OK, 15)
    assert r["disponible"] is False


def test_baja_confianza_no_recomienda():
    r = generar_recomendaciones(ipt(s3=40.0), ARTIC_OK, {"valid_rate_pct": 45.0, "valid_frames": 80}, 15)
    assert r["disponible"] is False and "repite el video" in r["motivo_no_disponible"]
    r = generar_recomendaciones(ipt(s3=40.0), ARTIC_OK, {"valid_rate_pct": 90.0, "valid_frames": 12}, 15)
    assert r["disponible"] is False
    r = generar_recomendaciones(ipt(s3=40.0), ARTIC_OK, None, 15)
    assert r["confianza"]["nivel"] == "baja" and r["disponible"] is False
    r = generar_recomendaciones(ipt(s3=40.0), ARTIC_OK, {**VIDEO_OK, "low_confidence": True}, 15)
    assert r["disponible"] is False


def test_tecnica_en_rango_no_genera_hallazgos():
    r = generar_recomendaciones(ipt(), ARTIC_OK, VIDEO_OK, 15)
    assert r["disponible"] is True and r["hallazgos"] == [] and "mensaje" in r


def test_hallazgos_por_sector_con_fuente_y_estado():
    r = generar_recomendaciones(ipt(s1=60.0, ang1=150.0, s2=40.0, ang2=95.0, s3=43.2, sim=77.4),
                                ARTIC_OK, VIDEO_OK, 15)
    ids = [h["id"] for h in r["hallazgos"]]
    assert ids == ["propulsion", "recobro", "simetria"]
    for h in r["hallazgos"]:
        assert h["fuente"] and h["estado_respaldo"] and h["metrica"] and h["umbral"]
    por_id = {h["id"]: h for h in r["hallazgos"]}
    assert por_id["propulsion"]["severidad"] == "media" and por_id["recobro"]["severidad"] == "alta"
    assert por_id["recobro"]["estado_respaldo"] == "respaldo_parcial"
    assert por_id["simetria"]["valor"] == 77.4
    assert "tobillo" in por_id["simetria"]["interpretacion"]      # la articulación menos simétrica
    assert "2D" in por_id["simetria"]["interpretacion"]


def test_simetria_excluida_no_genera_hallazgo():
    r = generar_recomendaciones(ipt(s3=0.0, excluida=True), ARTIC_OK, VIDEO_OK, 15)
    assert all(h["id"] != "simetria" for h in r["hallazgos"])
    assert any("Simetría" in t for t in r["no_evaluado"])


def test_no_se_recomienda_por_cadencia_ni_tronco():
    r = generar_recomendaciones(ipt(s1=60.0), ARTIC_OK, VIDEO_OK, 15)
    assert all(h["tipo"] in ("propulsion", "recobro", "simetria") for h in r["hallazgos"])
    assert any("Cadencia" in t for t in r["no_evaluado"])


def test_edad_desconocida_se_declara():
    r = generar_recomendaciones(ipt(s1=60.0), ARTIC_OK, VIDEO_OK, None)
    assert r["banda_edad"]["etiqueta"] is None and "Edad no registrada" in r["advertencia"]


def test_confianza_media_por_pocas_articulaciones():
    c = evaluar_confianza({"valid_rate_pct": 90.0, "valid_frames": 100}, {"articulaciones_evaluadas": 1})
    assert c["nivel"] == "media"


if __name__ == "__main__":
    test_banda_de_edad()
    test_sin_metricas_no_recomienda()
    test_baja_confianza_no_recomienda()
    test_tecnica_en_rango_no_genera_hallazgos()
    test_hallazgos_por_sector_con_fuente_y_estado()
    test_simetria_excluida_no_genera_hallazgo()
    test_no_se_recomienda_por_cadencia_ni_tronco()
    test_edad_desconocida_se_declara()
    test_confianza_media_por_pocas_articulaciones()
    print("[OK] Pruebas del motor de recomendaciones aprobadas.")
