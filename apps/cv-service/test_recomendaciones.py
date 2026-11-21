"""Pruebas del motor de recomendaciones (ADR-018): sin dato no hay recomendación."""
from recomendaciones import banda_edad, evaluar_confianza, generar_recomendaciones
from metrics_engine import calculate_ipt_referenciado

VIDEO_OK = {"valid_rate_pct": 90.0, "valid_frames": 120, "low_confidence": False}
ARTIC_OK = {"articulaciones_evaluadas": 3, "articulaciones": {
    "rodilla": {"evaluable": True, "simetria": 77.0},
    "cadera": {"evaluable": True, "simetria": 85.5},
    "tobillo": {"evaluable": True, "simetria": 60.0}}}


def ipt(**valores):
    """IPT v2 a partir de la comparación con la referencia (ADR-023)."""
    from cinematica_eventos import comparar_con_referencia
    variables = {k: {"n": 6, "media": v, "por_pierna": {}} for k, v in valores.items()}
    return calculate_ipt_referenciado(comparar_con_referencia(variables, 120.0, 15, True))


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
    r = generar_recomendaciones(ipt(rodilla_min_balanceo=60.0), ARTIC_OK, {"valid_rate_pct": 45.0, "valid_frames": 80}, 15)
    assert r["disponible"] is False and "repite el video" in r["motivo_no_disponible"]
    r = generar_recomendaciones(ipt(rodilla_min_balanceo=60.0), ARTIC_OK, {"valid_rate_pct": 90.0, "valid_frames": 12}, 15)
    assert r["disponible"] is False
    r = generar_recomendaciones(ipt(rodilla_min_balanceo=60.0), ARTIC_OK, None, 15)
    assert r["confianza"]["nivel"] == "baja" and r["disponible"] is False
    r = generar_recomendaciones(ipt(rodilla_min_balanceo=60.0), ARTIC_OK, {**VIDEO_OK, "low_confidence": True}, 15)
    assert r["disponible"] is False


def test_tecnica_en_rango_no_genera_hallazgos():
    r = generar_recomendaciones(ipt(rodilla_min_balanceo=32.0, rodilla_despegue=156.0), ARTIC_OK, VIDEO_OK, 15)
    assert r["disponible"] is True and r["hallazgos"] == [] and "mensaje" in r


def test_hallazgos_con_referencia_publicada():
    r = generar_recomendaciones(ipt(rodilla_min_balanceo=60.0, distancia_relativa_contacto=66.0,
                                    rodilla_despegue=160.0), ARTIC_OK, VIDEO_OK, 15)
    ids = [h["id"] for h in r["hallazgos"]]
    assert ids == ["rodilla_min_balanceo", "distancia_relativa_contacto"]   # ordenados por |z|
    for h in r["hallazgos"]:
        assert h["fuente"].startswith("Miyashiro") and h["estado_respaldo"] == "referencia_publicada"
        assert h["metrica"] and h["umbral"] and h["severidad"] == "alta"
    por_id = {h["id"]: h for h in r["hallazgos"]}
    assert por_id["rodilla_min_balanceo"]["tipo"] == "recobro"
    assert por_id["distancia_relativa_contacto"]["tipo"] == "contacto"
    assert "sobrezancada" in por_id["distancia_relativa_contacto"]["interpretacion"]
    assert "adultos" in por_id["rodilla_min_balanceo"]["interpretacion"]      # atleta de 15 años


def test_diferencia_menor_que_el_error_del_metodo_no_genera_hallazgo():
    # 44° en el recobro: z = 2,2 pero 12,4° no supera el error del método (14,6°).
    r = generar_recomendaciones(ipt(rodilla_min_balanceo=44.0), ARTIC_OK, VIDEO_OK, 15)
    assert r["hallazgos"] == []


def test_variables_no_comparables_se_declaran():
    r = generar_recomendaciones(ipt(rodilla_min_balanceo=32.0), ARTIC_OK, VIDEO_OK, 15)
    assert any(t.startswith("Rodilla al contacto") for t in r["no_evaluado"])
    assert any("tronco" in t for t in r["no_evaluado"])


def test_edad_desconocida_se_declara():
    r = generar_recomendaciones(ipt(rodilla_min_balanceo=60.0), ARTIC_OK, VIDEO_OK, None)
    assert r["banda_edad"]["etiqueta"] is None and "Edad no registrada" in r["advertencia"]


def test_confianza_media_por_pocas_articulaciones():
    c = evaluar_confianza({"valid_rate_pct": 90.0, "valid_frames": 100}, {"articulaciones_evaluadas": 1})
    assert c["nivel"] == "media"


if __name__ == "__main__":
    pruebas = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for prueba in pruebas:
        prueba()
    print(f"[OK] {len(pruebas)} pruebas del motor de recomendaciones aprobadas.")
