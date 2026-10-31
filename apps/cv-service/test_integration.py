"""Prueba de integración del servicio de visión (T-02, T-03, T-05).

Ejecuta el endpoint real /api/cv/process-video con el video de muestra del repositorio
(MediaPipe PoseLandmarker real) y verifica contrato, cobertura y rangos físicos.
Uso: python test_integration.py
"""
import sys
import traceback
from fastapi.testclient import TestClient
import main

client = TestClient(main.app)


def test_health():
    assert client.get('/health').status_code == 200


def test_process_sample_full_scan():
    r = client.post('/api/cv/process-video', data={'use_sample': 'true', 'scan_full_video': 'true'})
    assert r.status_code == 200, r.text
    j = r.json()
    info = j['video_info']
    assert info['analyzed_frames'] > 0
    assert info['detection_rate_pct'] >= 80, info
    m = j['summary_metrics']
    assert 0 < m['peak_knee_extension'] <= 180
    assert 0 <= m['avg_symmetry_score'] <= 100
    assert 0 <= j['ipt_evaluation']['ipt_score'] <= 100
    ipt = j['ipt_evaluation']
    assert ipt['estado_validacion'] == 'experimental_no_validado' and ipt['advertencia']
    assert 'rodilla_p95' in ipt['inputs_robustos']
    assert ipt['inputs_robustos']['rodilla_p95'] <= m['peak_knee_extension']
    assert m['symmetry_method'] == 'rom_por_pierna_en_sesion'
    az = j['analisis_zancadas']
    assert az['metodo'] == 'maximo_local_tobillo_vertical' and 'conteo_zancadas' in az


def test_rejects_out_of_range_params():
    r = client.post('/api/cv/process-video', data={'use_sample': 'true', 'sample_stride': '0'})
    assert r.status_code == 422
    r = client.post('/api/cv/process-video', data={'use_sample': 'true', 'max_samples': '10'})
    assert r.status_code == 422


class _P:
    def __init__(self, x, y, v=0.9, p=0.9):
        self.x, self.y, self.visibility, self.presence = x, y, v, p


def test_filter_omits_low_confidence_and_out_of_frame_points():
    lm = [_P(0.5, 0.5) for _ in range(33)]
    lm[25] = _P(0.5, 0.5, v=0.2)          # rodilla izquierda: baja visibilidad
    lm[28] = _P(1.3, 0.5)                 # tobillo derecho: fuera del encuadre
    kp = main.reliable_keypoints(lm)
    assert 'left_knee' not in kp and 'right_ankle' not in kp
    assert 'left_hip' in kp and 'right_knee' in kp
    m = main.compute_biomechanical_metrics(kp)
    assert 'left_knee_angle' not in m and 'right_knee_angle' not in m


def test_filter_drops_physiologically_impossible_knee():
    kp = {'left_hip': [0.5, 0.3], 'left_knee': [0.5, 0.5], 'left_ankle': [0.5, 0.31]}  # tobillo sobre el muslo: ~0 grados
    assert main.drop_implausible_knees(kp) == 1
    assert 'left_knee' not in kp
    ok = {'right_hip': [0.5, 0.3], 'right_knee': [0.5, 0.5], 'right_ankle': [0.5, 0.7]}  # pierna extendida: 180 grados
    assert main.drop_implausible_knees(ok) == 0


def test_sample_summary_has_no_nonphysical_values():
    j = client.post('/api/cv/process-video', data={'use_sample': 'true', 'scan_full_video': 'true'}).json()
    assert j['video_info']['valid_frames'] > 0
    assert j['summary_metrics']['min_knee_flexion'] >= main.MIN_PLAUSIBLE_KNEE_DEG
    assert j['video_info']['low_confidence'] is False


def test_angle_is_independent_of_image_aspect_ratio():
    # En píxeles: BA = (0,-300) y BC = (300,300) => 135 grados exactos, sea cual sea la resolución.
    for w, h in ((1920, 1080), (1080, 1920), (1000, 1000)):
        # misma geometría en píxeles; solo cambia cómo se normaliza
        kp = {'left_hip': [960, 300], 'left_knee': [960, 600], 'left_ankle': [1260, 900]}
        norm = {k: [v[0] / w, v[1] / h] for k, v in kp.items()}
        px = main.to_pixel_space(norm, w, h)
        assert abs(main.compute_biomechanical_metrics(px)['left_knee_angle'] - 135.0) < 0.01


def test_normalized_coordinates_without_correction_are_distorted():
    # Documenta el defecto corregido: calcular sobre coordenadas normalizadas 16:9 NO da 135 grados.
    w, h = 1920, 1080
    kp = {'left_hip': [960 / w, 300 / h], 'left_knee': [960 / w, 600 / h], 'left_ankle': [1260 / w, 900 / h]}
    assert abs(main.calculate_angle(kp['left_hip'], kp['left_knee'], kp['left_ankle']) - 135.0) > 5


def test_metrics_endpoint_corrects_with_image_size():
    w, h = 1920, 1080
    body = {'left_hip': [960 / w, 300 / h], 'left_knee': [960 / w, 600 / h], 'left_ankle': [1260 / w, 900 / h],
            'right_hip': [960 / w, 300 / h], 'right_knee': [960 / w, 600 / h], 'right_ankle': [960 / w, 900 / h],
            'image_width': w, 'image_height': h}
    r = client.post('/api/cv/metrics', json=body)
    assert r.status_code == 200
    m = r.json()['metrics']
    assert abs(m['left_knee_angle'] - 135.0) < 0.01 and abs(m['right_knee_angle'] - 180.0) < 0.01
    bad = dict(body); bad.pop('image_height')
    assert client.post('/api/cv/metrics', json=bad).status_code == 400


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
