"""Pruebas de referencias publicadas y concordancia (ADR-019). Uso: python test_referencias.py"""
import csv
import os
import sys
import tempfile
import traceback

import concordancia
import recomendaciones
import referencias


def test_ninguna_metrica_principal_se_declara_plenamente_comparable():
    for k, v in referencias.COMPARABILIDAD.items():
        assert v["comparable"] is not True, k
        assert v["motivo"]


def test_contexto_declara_error_de_metodo_y_no_normativo():
    c = referencias.contexto_referencias(15)
    assert c["estado"] == 'referencias_contextuales_no_normativas'
    assert c["error_metodo"]["mae_grados"]["mae_izquierda"] > 10
    assert c["poblacion_referencia"]["edad_dentro_del_rango"] is True
    assert referencias.contexto_referencias(12)["poblacion_referencia"]["edad_dentro_del_rango"] is False
    assert referencias.contexto_referencias(None)["poblacion_referencia"]["edad_dentro_del_rango"] is False


def test_recomendaciones_incluyen_referencias_incluso_sin_hallazgos():
    r = recomendaciones.generar_recomendaciones(None, None, None, 15)
    assert r['disponible'] is False and 'referencias' in r


def test_concordancia_perfecta_y_azar():
    m = concordancia.metricas([(1, 1), (0, 0), (1, 1), (0, 0)])
    assert m['acuerdo'] == 1.0 and m['kappa'] == 1.0
    m = concordancia.metricas([(1, 1), (1, 0), (0, 1), (0, 0)])
    assert m['acuerdo'] == 0.5 and abs(m['kappa']) < 1e-9
    assert m['sensibilidad'] == 0.5 and m['especificidad'] == 0.5


def test_concordancia_lee_csv_y_rechaza_sector_invalido():
    with tempfile.TemporaryDirectory() as d:
        ruta = os.path.join(d, 'r.csv')
        with open(ruta, 'w', newline='') as f:
            w = csv.writer(f)
            w.writerow(['video_id', 'sector', 'metahub', 'profesional'])
            w.writerow(['v1', 'propulsion', 1, 1]); w.writerow(['v1', 'recobro', 0, 0])
        res = concordancia.resumen(concordancia.leer(ruta))
        assert res['global']['n'] == 2 and res['global']['acuerdo'] == 1.0
        with open(ruta, 'w', newline='') as f:
            f.write('video_id,sector,metahub,profesional\nv1,tronco,1,1\n')
        try:
            concordancia.leer(ruta)
            assert False
        except ValueError:
            pass


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
