/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Interfaz de Captura en Vivo con Calibrador de Terreno y Telemetría Biomecánica
 * =========================================================================================
 */

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Camera,
  CheckCircle2,
  Compass,
  Download,
  Eye,
  FileText,
  FileVideo,
  Flame,
  FolderOpen,
  Gauge,
  Layers,
  Maximize2,
  MessageSquare,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  StopCircle,
  SwitchCamera,
  Target,
  ThumbsUp,
  UploadCloud,
  Video,
  Volume2,
  VolumeX,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';
import api from '../services/api.js';
import { AnimatePresence } from 'framer-motion';
import { EASE_OUT, SteppedProgress, motion } from '../components/Motion.jsx';
import { createRequestId } from '../services/requestId.js';
import { uploadVideo } from '../services/videoUpload.js';
import { validateVideoFile } from '../services/videoValidation.js';

const MAX_RECORD_SECONDS = 120;
const RECORDER_TYPES = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];

export default function LiveCapture() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);
  const lastRecordingRef = useRef(null);

  // Estados de cámara y sensores
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' o 'user'
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Inclinación real del dispositivo (null mientras no llegue ninguna lectura del sensor)
  const [orientation, setOrientation] = useState(null);
  const isLevel = orientation ? Math.abs(orientation.roll) < 2.5 : null;

  // Cámara y subida de la grabación a la cola de análisis
  const [cameraError, setCameraError] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [uploadState, setUploadState] = useState({ status: 'idle', percent: 0, message: '' });

  // Atleta seleccionado para la toma desde la base de datos
  const [athletesList, setAthletesList] = useState([]);
  const [athleteLoadError, setAthleteLoadError] = useState('');
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState('Seleccionar atleta');
  const [countdown, setCountdown] = useState(null); // null | 3 | 2 | 1 | '¡YA!'
  const [isUploadingToCv, setIsUploadingToCv] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  useEffect(() => {
    async function fetchAthletes() {
      try {
        const athletes = await api.athletes.getAll();
        setAthletesList(athletes || []);
        if (athletes && athletes.length > 0) {
          setSelectedAthleteId(athletes[0].id);
          setSelectedAthlete(athletes[0].name);
        }
      } catch (e) {
        setAthletesList([]);
        setSelectedAthleteId('');
        setSelectedAthlete('Seleccionar atleta');
        setAthleteLoadError(e.message || 'No se pudieron cargar tus atletas.');
      }
    }
    fetchAthletes();
  }, []);

  const startCountdownAndRecord = () => {
    setCaptureError('');
    if (!selectedAthleteId) {
      setCaptureError('Selecciona un atleta antes de iniciar la captura.');
      return;
    }
    if (!consentOk) {
      setCaptureError('Este atleta no tiene consentimiento registrado. Regístralo en Mis atletas antes de grabar.');
      return;
    }
    if (!cameraActive || !streamRef.current) {
      setCaptureError('Primero activa la cámara.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      setCaptureError('Este navegador no puede grabar desde la vista previa. Usa "Grabar o subir carrera" con la cámara nativa.');
      return;
    }

    const audioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext || window.webkitAudioContext)() : null;
    const playBeep = (freq, dur) => {
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = freq;
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
        osc.stop(audioCtx.currentTime + dur);
      } catch (e) {}
    };

    setCountdown(3);
    playBeep(440, 0.12);

    let sec = 3;
    const interval = setInterval(() => {
      sec--;
      if (sec > 0) {
        setCountdown(sec);
        playBeep(440, 0.12);
      } else if (sec === 0) {
        setCountdown('¡YA!');
        playBeep(880, 0.3);
        clearInterval(interval);
        setTimeout(() => {
          setCountdown(null);
          startActualMediaRecording();
        }, 600);
      }
    }, 1000);
  };

  const startActualMediaRecording = () => {
    const stream = streamRef.current;
    if (!stream) { setCaptureError('La cámara se apagó antes de empezar. Actívala de nuevo.'); return; }
    try {
      const mime = RECORDER_TYPES.find(type => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const athleteId = selectedAthleteId;
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onerror = () => setCaptureError('La grabación falló. Vuelve a intentarlo.');
      recorder.onstop = () => {
        const type = (recorder.mimeType || recordedChunksRef.current[0]?.type || 'video/webm').split(';')[0];
        const blob = new Blob(recordedChunksRef.current, { type });
        recordedChunksRef.current = [];
        if (!blob.size) { setCaptureError('La grabación quedó vacía. Vuelve a intentarlo.'); return; }
        const file = new File([blob], 'pasada-' + Date.now() + (type.includes('mp4') ? '.mp4' : '.webm'), { type });
        const check = validateVideoFile(file);
        if (!check.ok) { setCaptureError(check.error); return; }
        lastRecordingRef.current = { file, requestId: createRequestId(), athleteId };
        uploadRecording();
      };
      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setUploadState({ status: 'idle', percent: 0, message: '' });
      setIsRecording(true);
    } catch (err) {
      console.warn('Error iniciando MediaRecorder:', err);
      setCaptureError('Este dispositivo no pudo iniciar la grabación. Usa "Grabar o subir carrera" con la cámara nativa.');
    }
  };

  // Sube la última grabación a la misma cola que usa "Grabar o subir carrera".
  // El requestId se conserva al reintentar, así la API no duplica el video.
  const uploadRecording = async () => {
    const pending = lastRecordingRef.current;
    if (!pending) return;
    setUploadState({ status: 'uploading', percent: 0, message: '' });
    try {
      const saved = await uploadVideo({
        query: 'requestId=' + pending.requestId + '&filename=' + encodeURIComponent(pending.file.name) + '&athleteId=' + encodeURIComponent(pending.athleteId),
        file: pending.file,
        onProgress: (sent, total) => setUploadState(prev => ({ ...prev, percent: total ? Math.min(100, Math.round(sent / total * 100)) : 0 }))
      });
      lastRecordingRef.current = null;
      setUploadState({
        status: 'done', percent: 100, sessionId: saved.sessionId,
        message: saved.status === 'completed'
          ? 'Este video ya estaba analizado; no se duplicó.'
          : 'Video guardado y en cola. MediaPipe lo analiza en segundo plano; puedes grabar otra pasada.'
      });
    } catch (err) {
      setUploadState({ status: 'error', percent: 0, message: err.message || 'No se pudo subir el video.' });
    }
  };

  // Modo de operación: 'camera' o 'video_upload'
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'video_upload'
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoProcessingStep, setVideoProcessingStep] = useState('');
  const [realAnalysisData, setRealAnalysisData] = useState(null);
  const [previewFrameIndex, setPreviewFrameIndex] = useState(0);
  const [videoError, setVideoError] = useState(null);
  // Estado real del servicio de visión: 'checking' | 'ok' | 'down'
  const [cvHealth, setCvHealth] = useState('checking');

  useEffect(() => {
    if (activeTab !== 'video_upload') return;
    let alive = true;
    setCvHealth('checking');
    fetch((import.meta.env.VITE_API_BASE || '') + '/api/cv/health', { cache: 'no-store' })
      .then(r => { if (alive) setCvHealth(r.ok ? 'ok' : 'down'); })
      .catch(() => { if (alive) setCvHealth('down'); });
    return () => { alive = false; };
  }, [activeTab]);

  const handleSaveRealSession = async () => {
    if (!realAnalysisData || !selectedAthleteId) return;
    try {
      const ipt = realAnalysisData.ipt_evaluation?.ipt_score || 0;
      await api.sessions.create({
        athleteId: selectedAthleteId,
        sessionDate: new Date().toISOString(),
        iptScore: ipt,
        analysis: {
          ipt_evaluation: realAnalysisData.ipt_evaluation,
          summary_metrics: realAnalysisData.summary_metrics,
          video_info: realAnalysisData.video_info
        }
      });
      alert('¡Sesión guardada exitosamente en el historial con puntaje IPT!');
      navigate('/sessions');
    } catch (err) {
      alert(`Error al guardar sesión: ${err.message}`);
    }
  };

  const handleProcessVideoUpload = async (useSample = false) => {
    setIsProcessingVideo(true);
    setVideoError(null);
    setVideoProcessingStep('1/1: Enviando el video y esperando el análisis de MediaPipe…');

    try {
      const apiUrl = '/api/cv/process-video';

      const formData = new FormData();
      if (!selectedVideoFile) {
        if (!(useSample && import.meta.env.VITE_ENABLE_DEMO === 'true')) {
          throw new Error('Selecciona un video real del atleta. El video de muestra está deshabilitado.');
        }
        formData.append('use_sample', 'true');
      } else {
        formData.append('file', selectedVideoFile);
        formData.append('use_sample', 'false');
      }
      formData.append('sample_stride', '3');
      formData.append('max_frames', '90');

      // El servicio de visión se alcanza a través de la API, que exige sesión iniciada.
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + (localStorage.getItem('metahub_token') || '') },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setRealAnalysisData(result);
        setPreviewFrameIndex(0);
        return;
      }
      const failure = await response.json().catch(() => ({}));
      throw new Error(failure.error || failure.detail || `El servicio de visión respondió con error (HTTP ${response.status}).`);
    } catch (err) {
      // Los datos de ejemplo solo se muestran en modo demostración (ADR-018): nunca como si fueran un análisis real.
      if (import.meta.env.VITE_ENABLE_DEMO === 'true') try {
        console.warn('Modo demostración: se muestran datos de análisis de ejemplo.', err);
        const fallbackResp = await fetch('/sample_analysis_result.json');
        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          setRealAnalysisData(fallbackData);
          setPreviewFrameIndex(0);
          return;
        }
      } catch (e2) { }

      setVideoError(err.message || 'No se pudo conectar con el servicio de visión.');
    } finally {
      setIsProcessingVideo(false);
    }
  };

  const handleDownloadRealDataJson = () => {
    if (!realAnalysisData) return;
    const blob = new Blob([JSON.stringify(realAnalysisData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `metahub_mediapipe_real_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Iniciar / detener cámara real
  const startCamera = async () => {
    setCameraError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('La cámara en vivo requiere HTTPS o localhost. Usa "Grabar o subir carrera" con la cámara nativa del celular.');
      return;
    }
    // iOS solo entrega el giroscopio si se pide permiso durante un toque del usuario.
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        await DeviceOrientationEvent.requestPermission();
      }
    } catch { /* sin permiso: la pantalla indica que no hay lectura de inclinación */ }
    try {
      streamRef.current?.getTracks().forEach(track => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      streamRef.current = null;
      setCameraActive(false);
      setCameraError(err?.name === 'NotAllowedError' ? 'Permiso de cámara denegado. Habilítalo para este sitio en el navegador.'
        : err?.name === 'NotFoundError' ? 'No se encontró una cámara en este dispositivo.'
        : 'No fue posible abrir la cámara. Puede estar ocupada por otra aplicación.');
    }
  };

  const stopCamera = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setIsRecording(false);
  };

  // Apagar la cámara al salir de la pantalla o al pasar a la pestaña de subida.
  useEffect(() => () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);
  useEffect(() => { if (activeTab !== 'camera' && cameraActive) stopCamera(); }, [activeTab]);

  // Inclinación del dispositivo (giroscopio). En horizontal la rotación relevante es beta.
  useEffect(() => {
    const handleOrientation = (e) => {
      if (e.beta === null || e.gamma === null) return;
      const angle = (window.screen?.orientation?.angle ?? window.orientation ?? 0);
      const roll = angle === 90 ? -e.beta : (angle === 270 || angle === -90) ? e.beta : e.gamma;
      setOrientation({ pitch: Number(e.beta.toFixed(1)), roll: Number(roll.toFixed(1)) });
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // Temporizador de grabación con tope de duración
  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => setRecordSeconds(prev => prev + 1), 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);
  useEffect(() => { if (isRecording && recordSeconds >= MAX_RECORD_SECONDS) handleFinishRecording(); }, [recordSeconds, isRecording]);

  // Guías de encuadre y horizonte sobre la cámara. No se dibuja ningún esqueleto:
  // la detección corporal la hace MediaPipe en el servidor, después de subir el video.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const tone = isLevel === null ? 'rgba(148, 163, 184, 0.6)' : isLevel ? '#00f5a0' : '#ff3366';

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 194, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(w * 0.2, 0); ctx.lineTo(w * 0.2, h);
      ctx.moveTo(w * 0.8, 0); ctx.lineTo(w * 0.8, h);
      ctx.stroke();
      ctx.strokeStyle = isLevel === null ? 'rgba(148, 163, 184, 0.35)' : isLevel ? 'rgba(0, 245, 160, 0.4)' : 'rgba(255, 51, 102, 0.4)';
      ctx.strokeRect(w * 0.22, h * 0.12, w * 0.56, h * 0.76);
      ctx.restore();

      ctx.save();
      const horizonY = h * 0.5;
      const tiltOffset = (orientation?.roll || 0) * 4;
      ctx.strokeStyle = tone;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, horizonY - tiltOffset);
      ctx.lineTo(w * 0.35, horizonY - tiltOffset);
      ctx.moveTo(w * 0.65, horizonY + tiltOffset);
      ctx.lineTo(w * 0.9, horizonY + tiltOffset);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w * 0.5, horizonY, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [isLevel, orientation, cameraActive, activeTab]);

    const toggleFacingMode = () => {
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };
    // Con la cámara encendida, cambiar de cámara la vuelve a abrir.
    useEffect(() => { if (cameraActive && !isRecording) startCamera(); }, [facingMode]);

    const handleFinishRecording = () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
      setIsRecording(false);
    };

    const selectedAthleteRow = athletesList.find(a => String(a.id) === String(selectedAthleteId));
    const consentOk = Boolean(selectedAthleteRow?.consent);

    return (
      <Layout>
      {athleteLoadError && <p role="alert">{athleteLoadError}</p>}
        <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>

          {/* Cabecera Superior */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button
              onClick={() => navigate('/sessions')}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '12px',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} />
              <span>Volver a Sesiones</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: isLevel === null ? 'rgba(148, 163, 184, 0.15)' : isLevel ? 'rgba(0, 245, 160, 0.15)' : 'rgba(255, 51, 102, 0.15)',
                color: isLevel === null ? '#94a3b8' : isLevel ? '#00f5a0' : '#ff3366',
                border: `1px solid ${isLevel === null ? 'rgba(148, 163, 184, 0.3)' : isLevel ? 'rgba(0, 245, 160, 0.3)' : 'rgba(255, 51, 102, 0.3)'}`,
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Compass size={14} />
                <span>{isLevel === null ? 'SIN LECTURA DE INCLINACIÓN' : isLevel ? 'CELULAR NIVELADO ✓' : `AJUSTAR INCLINACIÓN (${orientation.roll}°)`}</span>
              </span>

              <span style={{
                background: 'rgba(0, 194, 255, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(0, 194, 255, 0.3)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '800',
                fontFamily: 'monospace'
              }}>
                {isRecording ? `● GRABANDO ${recordSeconds}s / ${MAX_RECORD_SECONDS}s` : cameraActive ? 'CÁMARA ACTIVA' : 'CÁMARA APAGADA'}
              </span>
            </div>
          </div>

          {/* SELECTOR DE MODO: CÁMARA EN VIVO vs SUBIR VIDEO REAL (MEDIAPIPE) */}
          <div style={{
            display: 'flex',
            background: 'rgba(16, 26, 46, 0.75)',
            padding: '6px',
            borderRadius: '16px',
            gap: '8px',
            marginBottom: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <button
              onClick={() => setActiveTab('camera')}
              style={{
                flex: 1,
                minHeight: '42px', padding: '6px 10px', lineHeight: 1.2,
                background: activeTab === 'camera' ? 'linear-gradient(135deg, #0284c7 0%, #00f5a0 100%)' : 'transparent',
                color: activeTab === 'camera' ? '#04121d' : '#94a3b8',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: activeTab === 'camera' ? '0 4px 18px rgba(0, 245, 160, 0.3)' : 'none',
              }}
            >
              <Camera size={18} />
              <span>Cámara en Vivo y Calibrador Sagital</span>
            </button>

            <button
              onClick={() => setActiveTab('video_upload')}
              style={{
                flex: 1,
                minHeight: '42px', padding: '6px 10px', lineHeight: 1.2,
                background: activeTab === 'video_upload' ? 'linear-gradient(135deg, #00f5a0 0%, #00c2ff 100%)' : 'transparent',
                color: activeTab === 'video_upload' ? '#04121d' : '#94a3b8',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: activeTab === 'video_upload' ? '0 4px 18px rgba(0, 194, 255, 0.3)' : 'none',
              }}
            >
              <FileVideo size={18} />
              <span>Subir Video (Extracción MediaPipe Real)</span>
            </button>
          </div>

          {activeTab === 'camera' ? (
            <>
              {/* CONTENEDOR DEL VISOR DE CÁMARA & CALIBRADOR (VIEWFINDER) */}
              <div style={{
                position: 'relative',
                width: '100%',
                height: '520px',
                background: '#040812',
                borderRadius: '24px',
                overflow: 'hidden',
                border: '1px solid rgba(0, 194, 255, 0.3)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 194, 255, 0.15)',
                marginBottom: '16px'
              }}>

                {/* Feed de Video Real */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />

                {/* Canvas de Procesamiento Articular y Calibración en Vivo */}
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 10
                  }}
                />

                {/* OVERLAY DE CUENTA REGRESIVA (3, 2, 1, ¡YA!) */}
                <AnimatePresence>{countdown !== null && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(4, 18, 29, 0.88)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    backdropFilter: 'blur(10px)'
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#00c2ff', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                      INICIANDO CAPTURA EN PISTA
                    </span>
                    <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={String(countdown)}
                      initial={{ opacity: 0, scale: 0.55 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.35 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                      style={{ display: 'inline-block', fontSize: '88px', fontWeight: '900', color: countdown === '¡YA!' ? '#00f5a0' : '#ffffff', fontFamily: 'JetBrains Mono, monospace', textShadow: '0 0 35px rgba(0, 245, 160, 0.7)' }}>
                      {countdown}
                    </motion.span>
                    </AnimatePresence>
                    <span style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '12px' }}>
                      Atleta a registrar: <strong style={{ color: '#00f5a0' }}>{selectedAthlete}</strong>
                    </span>
                  </motion.div>
                )}</AnimatePresence>

                {/* Overlay de Estado en Vivo (Top Inside) */}
                <div style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  right: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  zIndex: 20
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={selectedAthleteId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedAthleteId(id);
                        const ath = athletesList.find(a => String(a.id) === String(id));
                        if (ath) setSelectedAthlete(ath.name);
                      }}
                      style={{
                        background: 'rgba(9, 15, 28, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        backdropFilter: 'blur(8px)',
                        outline: 'none'
                      }}
                    >
                      {athletesList.length > 0 ? (
                        athletesList.map(a => (
                          <option key={a.id} value={a.id}>
                            🏃 {a.name} ({a.category || 'Atleta'})
                          </option>
                        ))
                      ) : (
                        <option value="">Sin atletas registrados</option>
                      )}
                    </select>

                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={toggleFacingMode}
                      title="Cambiar Cámara (Frontal / Trasera)"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(9, 15, 28, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <SwitchCamera size={18} />
                    </button>
                  </div>
                </div>

                {/* CÁMARA APAGADA: activarla con un toque (también pide el giroscopio en iOS) */}
                {!cameraActive && (
                  <div style={{ position: 'absolute', inset: 0, zIndex: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px', textAlign: 'center', color: '#cbd5e1' }}>
                    <Camera size={40} color="#38bdf8" />
                    <strong style={{ color: 'white', fontSize: '15px' }}>Encuadra la pasada con la cámara del dispositivo</strong>
                    <span style={{ fontSize: '12px', maxWidth: '420px', lineHeight: 1.5 }}>
                      Al detener la grabación, el video se guarda en la ficha del atleta y MediaPipe lo analiza en el servidor.
                    </span>
                    <button type="button" onClick={startCamera} className="primary-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Camera size={17} /> Activar cámara
                    </button>
                    {cameraError && <p role="alert" style={{ margin: 0, fontSize: '12px' }}>{cameraError}</p>}
                  </div>
                )}

                {/* ESTADO REAL DE LA SUBIDA DE LA ÚLTIMA GRABACIÓN */}
                {(captureError || uploadState.status !== 'idle') && (
                  <div role="status" aria-live="polite" style={{
                    position: 'absolute', bottom: '80px', left: '16px', right: '16px', zIndex: 20,
                    background: 'rgba(9, 15, 28, 0.9)', backdropFilter: 'blur(16px)',
                    border: `1px solid ${captureError || uploadState.status === 'error' ? 'rgba(255, 51, 102, 0.5)' : 'rgba(0, 245, 160, 0.35)'}`,
                    borderRadius: '16px', padding: '12px 16px', color: '#e2e8f0', fontSize: '12px', display: 'grid', gap: '8px'
                  }}>
                    {captureError && <span style={{ color: '#fda4af' }}>{captureError}</span>}
                    {uploadState.status === 'uploading' && <>
                      <span><UploadCloud size={14} style={{ verticalAlign: '-2px' }} /> Subiendo la grabación… {uploadState.percent}%</span>
                      <div className="mh-upload-bar" role="progressbar" aria-label="Progreso de la subida" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadState.percent}>
                        <motion.span className="mh-upload-bar-fill" initial={{ scaleX: 0 }} animate={{ scaleX: uploadState.percent / 100 }} transition={{ duration: 0.25, ease: 'easeOut' }} />
                      </div>
                    </>}
                    {uploadState.status === 'done' && <span style={{ color: '#6ee7b7' }}>
                      <CheckCircle2 size={14} style={{ verticalAlign: '-2px' }} /> {uploadState.message}{uploadState.sessionId ? ` Sesión #${uploadState.sessionId}.` : ''}{' '}
                      <button type="button" onClick={() => navigate('/capture')} style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Ver el avance del análisis</button>
                    </span>}
                    {uploadState.status === 'error' && <span style={{ color: '#fda4af', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {uploadState.message}
                      <button type="button" onClick={uploadRecording} className="secondary-button" style={{ padding: '4px 10px', fontSize: '11px' }}>
                        <RefreshCw size={13} /> Reintentar subida
                      </button>
                    </span>}
                  </div>
                )}

                {/* BARRA INFERIOR DE DISPARO Y GRABACIÓN */}
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '16px',
                  right: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  zIndex: 20
                }}>
                  {!isRecording ? (
                    <button
                      onClick={startCountdownAndRecord}
                      disabled={countdown !== null || !cameraActive || uploadState.status === 'uploading'}
                      style={{
                        height: '52px',
                        padding: '0 28px',
                        background: countdown !== null || !cameraActive || uploadState.status === 'uploading' ? '#475569' : 'linear-gradient(135deg, #ff3366, #e11d48)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '26px',
                        fontSize: '13px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 0 25px rgba(255, 51, 102, 0.4)',
                        cursor: countdown !== null || !cameraActive || uploadState.status === 'uploading' ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'white' }}></div>
                      <span>{countdown !== null ? `INICIANDO EN ${countdown}...` : uploadState.status === 'uploading' ? 'SUBIENDO GRABACIÓN…' : 'INICIAR CAPTURA DE PASADA (3s)'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleFinishRecording}
                      style={{
                        height: '52px',
                        padding: '0 28px',
                        background: 'linear-gradient(135deg, #00f5a0, #00c2ff)',
                        color: '#04121d',
                        border: 'none',
                        borderRadius: '26px',
                        fontSize: '13px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 0 25px rgba(0, 245, 160, 0.4)',
                        cursor: 'pointer'
                      }}
                    >
                      <StopCircle size={20} />
                      <span>DETENER Y ENVIAR AL ANÁLISIS ({recordSeconds}s)</span>
                    </button>
                  )}
                </div>

              </div>

              {/* Ficha explicativa del Calibrador y Guía de Terreno */}
              <div style={{
                background: 'rgba(16, 26, 46, 0.75)',
                backdropFilter: 'blur(14px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '16px 20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00f5a0', marginBottom: '4px' }}>
                    <Compass size={16} />
                    <strong style={{ fontSize: '12px' }}>1. Nivelación de Horizonte</strong>
                  </div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                    El giroscopio del celular indica si la cámara está nivelada. Ubícala perpendicular al carril para evitar distorsión de perspectiva en la cinemática 2D.
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00c2ff', marginBottom: '4px' }}>
                    <Layers size={16} />
                    <strong style={{ fontSize: '12px' }}>2. Distancia Focal Óptima</strong>
                  </div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                    Ubica el trípode o tu posición a 4 metros de la recta de carrera para encuadrar la zancada completa de despegue y recobro.
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fde047', marginBottom: '4px' }}>
                    <Sparkles size={16} />
                    <strong style={{ fontSize: '12px' }}>3. Análisis en el servidor</strong>
                  </div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                    Al detener, el video entra a la cola y MediaPipe calcula los ángulos de rodilla (cadera-rodilla-tobillo) con <code>atan2</code>. Durante la grabación no se muestran ángulos.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Banner de Estado del Microservicio Python */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(0, 194, 255, 0.1)',
                border: '1px solid rgba(0, 194, 255, 0.25)',
                borderRadius: '16px',
                padding: '12px 18px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: cvHealth === 'ok' ? '#00f5a0' : cvHealth === 'checking' ? '#94a3b8' : '#ff3366',
                    boxShadow: cvHealth === 'ok' ? '0 0 10px #00f5a0' : 'none'
                  }}></span>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#38bdf8', display: 'block' }}>Servicio de visión (MediaPipe)</strong>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>FastAPI + OpenCV + BlazePose, a través de la API</span>
                  </div>
                </div>
                <span style={{
                  background: cvHealth === 'ok' ? 'rgba(0, 245, 160, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                  color: cvHealth === 'ok' ? '#00f5a0' : cvHealth === 'checking' ? '#94a3b8' : '#ff3366',
                  border: `1px solid ${cvHealth === 'ok' ? 'rgba(0, 245, 160, 0.3)' : 'rgba(148, 163, 184, 0.3)'}`,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '800'
                }}>{cvHealth === 'ok' ? 'DISPONIBLE ✓' : cvHealth === 'checking' ? 'COMPROBANDO…' : 'NO DISPONIBLE'}</span>
              </div>

              {/* Dropzone / Carga de Video */}
              <div style={{
                background: 'rgba(16, 26, 46, 0.75)',
                border: '2px dashed rgba(0, 194, 255, 0.35)',
                borderRadius: '20px',
                padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: 'rgba(0, 194, 255, 0.15)',
                  border: '1px solid rgba(0, 194, 255, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '12px',
                  color: '#00c2ff'
                }}>
                  <UploadCloud size={28} />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'white' }}>Cargar Video de Carrera de Velocidad</h3>
                <p style={{ margin: '0 auto 16px', fontSize: '12px', color: '#94a3b8', maxWidth: '460px', lineHeight: 1.4 }}>
                  Sube un video del atleta (.mp4 / .webm / .mov). Se extraen los fotogramas y MediaPipe devuelve las coordenadas articulares detectadas. Este análisis rápido no guarda el video; para conservarlo usa la cámara o "Grabar o subir carrera".
                </p>

                <input
                  type="file"
                  id="realVideoInputReact"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedVideoFile(e.target.files[0]);
                    }
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '380px', margin: '0 auto' }}>
                  <button
                    onClick={() => document.getElementById('realVideoInputReact').click()}
                    style={{
                      height: '42px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <FolderOpen size={16} />
                    <span>{selectedVideoFile ? `Archivo: ${selectedVideoFile.name}` : 'Seleccionar Video de tu Dispositivo'}</span>
                  </button>

                  {selectedVideoFile && (
                    <button
                      onClick={() => handleProcessVideoUpload(false)}
                      disabled={isProcessingVideo}
                      style={{
                        height: '44px',
                        background: 'linear-gradient(135deg, #0284c7 0%, #00f5a0 100%)',
                        color: '#04121d',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 18px rgba(0, 245, 160, 0.3)'
                      }}
                    >
                      <Play size={16} />
                      <span>Procesar Video Seleccionado con MediaPipe</span>
                    </button>
                  )}

                  {/* Video de muestra: solo en desarrollo (VITE_ENABLE_DEMO=true), nunca en operación real (ADR-018) */}
                  {import.meta.env.VITE_ENABLE_DEMO === 'true' && (
                  <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }}></div>
                    <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', textTransform: 'uppercase' }}>o prueba al instante</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }}></div>
                  </div>

                  <button
                    onClick={() => handleProcessVideoUpload(true)}
                    disabled={isProcessingVideo}
                    style={{
                      height: '44px',
                      background: 'linear-gradient(135deg, #00f5a0 0%, #00c2ff 100%)',
                      color: '#04121d',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 18px rgba(0, 245, 160, 0.3)'
                    }}
                  >
                    <Zap size={16} />
                    <span>⚡ Analizar Video Real de Velocista (1-Click)</span>
                  </button>
                  </>
                  )}
                </div>
              </div>

              {/* Spinner de Carga */}
              <AnimatePresence>{isProcessingVideo && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} style={{
                  background: 'rgba(16, 26, 46, 0.95)',
                  border: '1px solid rgba(0, 245, 160, 0.4)',
                  borderRadius: '18px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'white', marginBottom: '10px' }}>
                    <SteppedProgress text={videoProcessingStep} label="Avance del análisis del video" />
                  </div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, textAlign: 'left' }}>
                    Extrayendo fotogramas con OpenCV y detectando 33 puntos anatómicos en cada cuadro con BlazePose.
                  </p>
                </motion.div>
              )}</AnimatePresence>

              {/* Error si ocurre */}
              {videoError && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0, x: [0, -5, 4, -2, 0] }} transition={{ duration: 0.3, x: { duration: 0.32 } }} style={{
                  background: 'rgba(255, 51, 102, 0.15)',
                  border: '1px solid #ff3366',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  fontSize: '12px',
                  color: '#ff3366'
                }}>
                  ⚠️ {videoError}
                </motion.div>
              )}

              {/* CONTENEDOR DE RESULTADOS REALES */}
              {realAnalysisData && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Cuadro Resumen de Detección */}
                  <div style={{
                    background: 'rgba(16, 26, 46, 0.8)',
                    border: '1px solid rgba(0, 245, 160, 0.3)',
                    borderRadius: '18px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#00f5a0', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          RESULTADOS MEDIAPIPE REALES
                        </span>
                        <h4 style={{ margin: '2px 0 0', fontSize: '15px', color: 'white' }}>{realAnalysisData.video_info.filename}</h4>
                      </div>
                      <button
                        onClick={handleDownloadRealDataJson}
                        style={{
                          background: 'rgba(0, 194, 255, 0.15)',
                          border: '1px solid rgba(0, 194, 255, 0.3)',
                          color: '#38bdf8',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Download size={14} />
                        <span>Descargar JSON</span>
                      </button>
                    </div>

                    {/* KPIs Reales */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '10px 4px' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>CUADROS CON POSE</span>
                        <strong style={{ fontSize: '16px', color: '#38bdf8', fontFamily: 'monospace' }}>
                          {realAnalysisData.video_info.frames_with_pose} / {realAnalysisData.video_info.analyzed_frames}
                        </strong>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '10px 4px' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>PICO EXTENSIÓN</span>
                        <strong style={{ fontSize: '16px', color: '#00f5a0', fontFamily: 'monospace' }}>
                          {realAnalysisData.summary_metrics.peak_knee_extension.toFixed(1)}°
                        </strong>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '10px 4px' }}>
                        <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>SIMETRÍA MEDIA</span>
                        <strong style={{ fontSize: '16px', color: '#fde047', fontFamily: 'monospace' }}>
                          {realAnalysisData.summary_metrics.avg_symmetry_score.toFixed(1)}%
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* SELLO DE AUTORÍA Y METODOLOGÍA UCT */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(0, 194, 255, 0.12), rgba(0, 245, 160, 0.08))',
                    border: '1px solid rgba(0, 194, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#00f5a0', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        📐 Metodología UCT · Modelo en 3 Fases
                      </span>
                      <h4 style={{ margin: '2px 0 0', fontSize: '14px', color: 'white', fontWeight: '800' }}>
                        Modelo Cinemático Arellano & Henríquez
                      </h4>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Tesis de Grado UCT · Profesor Guía: Dr. Marcos Lévano
                      </span>
                    </div>
                    <span style={{
                      background: 'rgba(0, 194, 255, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(0, 194, 255, 0.3)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: '800'
                    }}>
                      AUTORÍA UCT
                    </span>
                  </div>

                  {/* ÍNDICE PROPIETARIO DE PERFECCIONAMIENTO TÉCNICO (IPT) */}
                  {realAnalysisData.ipt_evaluation && (
                    <div style={{
                      background: 'rgba(16, 26, 46, 0.9)',
                      border: '1px solid rgba(0, 245, 160, 0.35)',
                      borderRadius: '18px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <span style={{ fontSize: '10px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            ÍNDICE PROPIETARIO METAHUB
                          </span>
                          <h3 style={{ margin: '2px 0 0', fontSize: '16px', color: 'white', fontWeight: '800' }}>
                            Índice de Perfeccionamiento Técnico (IPT)
                          </h3>
                        </div>
                        <div style={{
                          background: `${realAnalysisData.ipt_evaluation.color || '#00f5a0'}22`,
                          border: `1px solid ${realAnalysisData.ipt_evaluation.color || '#00f5a0'}`,
                          color: realAnalysisData.ipt_evaluation.color || '#00f5a0',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          textTransform: 'uppercase'
                        }}>
                          {realAnalysisData.ipt_evaluation.badge}
                        </div>
                      </div>

                      {/* Score y Diagnóstico */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        background: 'rgba(0, 0, 0, 0.35)',
                        borderRadius: '14px',
                        padding: '14px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ textAlign: 'center', minWidth: '90px' }}>
                          <span style={{ fontSize: '36px', fontWeight: '900', color: realAnalysisData.ipt_evaluation.color || '#00f5a0', fontFamily: 'monospace', lineHeight: 1 }}>
                            {realAnalysisData.ipt_evaluation.ipt_score.toFixed(1)}
                          </span>
                          <span style={{ display: 'block', fontSize: '10px', color: '#64748b', fontWeight: '700' }}>/ 100 PTS</span>
                        </div>
                        <div style={{ flex: 1, borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '14px' }}>
                          <strong style={{ fontSize: '13px', color: 'white', display: 'block', marginBottom: '4px' }}>
                            {realAnalysisData.ipt_evaluation.categoria}
                          </strong>
                          <p style={{ margin: 0, fontSize: '11px', color: '#cbd5e1', lineHeight: 1.4 }}>
                            {realAnalysisData.ipt_evaluation.diagnostico}
                          </p>
                        </div>
                      </div>

                      {/* Fórmula Formal de la Tesis */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '11px',
                        color: '#94a3b8',
                        fontFamily: 'monospace',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>IPT = (0.40·S₁) + (0.35·S₂) + (0.25·Simetría)</span>
                        <span style={{ color: '#00f5a0', fontWeight: '700' }}>Validado UCT</span>
                      </div>
                    </div>
                  )}

                  {/* DESGLOSE EN 3 SECTORES CINEMÁTICOS DE ZANCADA */}
                  {realAnalysisData.ipt_evaluation?.desglose_sectores && (
                    <div style={{
                      background: 'rgba(16, 26, 46, 0.75)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '18px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <strong style={{ fontSize: '13px', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          📊 Desglose de los 3 Sectores Cinemáticos (UCT)
                        </strong>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>3 Fases por Ciclo</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Sector 1: Propulsión */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px', padding: '10px 14px', borderLeft: '3px solid #ffaa00' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#ffaa00' }}>SECTOR 1: PROPULSIÓN (40%)</span>
                            <strong style={{ fontSize: '13px', color: '#ffaa00', fontFamily: 'monospace' }}>
                              {realAnalysisData.ipt_evaluation.desglose_sectores.sector_1_propulsion?.score} pts
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                            <span>Triple Extensión: <strong style={{ color: 'white' }}>{realAnalysisData.ipt_evaluation.desglose_sectores.sector_1_propulsion?.angulo_real?.toFixed(1)}°</strong></span>
                            <span>Objetivo: 165° - 175°</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #ffaa00, #00f5a0)', transform: `scaleX(${Math.max(0, Math.min(100, Number(realAnalysisData.ipt_evaluation.desglose_sectores.sector_1_propulsion?.score) || 0)) / 100})`, transformOrigin: 'left center', transition: 'transform 0.6s ease' }} />
                          </div>
                        </div>

                        {/* Sector 2: Vuelo / Recobro */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px', padding: '10px 14px', borderLeft: '3px solid #00c2ff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#00c2ff' }}>SECTOR 2: VUELO / RECOBRO (35%)</span>
                            <strong style={{ fontSize: '13px', color: '#00c2ff', fontFamily: 'monospace' }}>
                              {realAnalysisData.ipt_evaluation.desglose_sectores.sector_2_recobro?.score} pts
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                            <span>Péndulo Corto (talón a glúteo): <strong style={{ color: 'white' }}>{realAnalysisData.ipt_evaluation.desglose_sectores.sector_2_recobro?.angulo_real?.toFixed(1)}°</strong></span>
                            <span>Objetivo: &lt; 70° (Rodilla &gt; 85°)</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #ff3366, #00c2ff)', transform: `scaleX(${Math.max(0, Math.min(100, Number(realAnalysisData.ipt_evaluation.desglose_sectores.sector_2_recobro?.score) || 0)) / 100})`, transformOrigin: 'left center', transition: 'transform 0.6s ease' }} />
                          </div>
                        </div>

                        {/* Sector 3: Contacto / Simetría */}
                        <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px', padding: '10px 14px', borderLeft: '3px solid #00f5a0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#00f5a0' }}>SECTOR 3: CONTACTO / SIMETRÍA (25%)</span>
                            <strong style={{ fontSize: '13px', color: '#00f5a0', fontFamily: 'monospace' }}>
                              {realAnalysisData.ipt_evaluation.desglose_sectores.simetria_bilateral?.score} pts
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                            <span>Simetría Bilateral de Apoyo: <strong style={{ color: 'white' }}>{realAnalysisData.ipt_evaluation.desglose_sectores.simetria_bilateral?.porcentaje_real?.toFixed(1)}%</strong></span>
                            <span>Objetivo: ≥ 92.0%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #00c2ff, #00f5a0)', transform: `scaleX(${Math.max(0, Math.min(100, Number(realAnalysisData.ipt_evaluation.desglose_sectores.simetria_bilateral?.score) || 0)) / 100})`, transformOrigin: 'left center', transition: 'transform 0.6s ease' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PRESCRIPCIÓN PERSONALIZADA Y CONSEJOS IA (PLAN PROGRESIVO DE CORRECCIÓN) */}
                  {realAnalysisData.ipt_evaluation && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(255, 51, 102, 0.12), rgba(16, 26, 46, 0.92))',
                      border: '1px solid rgba(255, 51, 102, 0.35)',
                      borderRadius: '16px',
                      padding: '16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Target size={16} color="#ff3366" />
                          <strong style={{ fontSize: '13px', color: '#ff3366', textTransform: 'uppercase' }}>
                            Prescripción Metodológica IA (Plan Progresivo)
                          </strong>
                        </div>
                        <span style={{
                          background: 'rgba(255, 51, 102, 0.2)',
                          color: '#ff3366',
                          border: '1px solid #ff3366',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: '800'
                        }}>
                          {realAnalysisData.ipt_evaluation.sector_prioritario}
                        </span>
                      </div>

                      {/* Causa Raíz Biomecánica */}
                      {realAnalysisData.ipt_evaluation.prescripcion_completa?.causa_biomecanica && (
                        <p style={{
                          fontSize: '11px',
                          color: '#cbd5e1',
                          margin: '0 0 10px',
                          lineHeight: 1.4,
                          background: 'rgba(0, 0, 0, 0.25)',
                          padding: '8px 12px',
                          borderRadius: '8px'
                        }}>
                          {realAnalysisData.ipt_evaluation.prescripcion_completa.causa_biomecanica}
                        </p>
                      )}

                      {/* Clave Motora (Cue Verbal) */}
                      {realAnalysisData.ipt_evaluation.prescripcion_completa?.cue_verbal && (
                        <div style={{
                          background: 'rgba(0, 194, 255, 0.1)',
                          border: '1px solid rgba(0, 194, 255, 0.25)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          marginBottom: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}>
                          <span style={{ fontSize: '16px' }}>🗣️</span>
                          <div>
                            <span style={{ fontSize: '9px', color: '#38bdf8', fontWeight: '800', display: 'block', textTransform: 'uppercase' }}>
                              CLAVE MOTORA (CUE VERBAL DEL ENTRENADOR)
                            </span>
                            <strong style={{ fontSize: '12px', color: '#00f5a0', display: 'block' }}>
                              {realAnalysisData.ipt_evaluation.prescripcion_completa.cue_verbal}
                            </strong>
                          </div>
                        </div>
                      )}

                      {/* Lista de Ejercicios Progresivos */}
                      {realAnalysisData.ipt_evaluation.prescripcion_completa?.ejercicios && (
                        <div style={{ marginBottom: '10px' }}>
                          <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                            🏋️‍♂️ Plan de Ejercicios Correctivos Progresivos
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {realAnalysisData.ipt_evaluation.prescripcion_completa.ejercicios.map((ex, idx) => (
                              <div key={idx} style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', padding: '8px 12px', borderLeft: '3px solid #00c2ff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                  <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: '800', textTransform: 'uppercase' }}>{ex.fase}</span>
                                  <span style={{ fontSize: '9px', background: 'rgba(0, 245, 160, 0.15)', color: '#00f5a0', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>OBJETIVO</span>
                                </div>
                                <strong style={{ fontSize: '12px', color: 'white', display: 'block' }}>{ex.nombre}</strong>
                                <span style={{ fontSize: '10px', color: '#fde047', display: 'block' }}>⏱️ Protocolo: {ex.protocolo}</span>
                                <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>🎯 Foco: {ex.foco}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Error a Evitar */}
                      {realAnalysisData.ipt_evaluation.prescripcion_completa?.error_evitar && (
                        <div style={{ background: 'rgba(255, 170, 0, 0.1)', borderLeft: '3px solid #ffaa00', borderRadius: '8px', padding: '8px 12px', fontSize: '10.5px', color: '#fde047' }}>
                          <strong>⚠️ Qué debe evitar el atleta:</strong> <span style={{ color: '#cbd5e1' }}>{realAnalysisData.ipt_evaluation.prescripcion_completa.error_evitar}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* VISOR DE FOTOGRAMAS REALES CON ESQUELETO DIBUJADO */}
                  {realAnalysisData.preview_frames && realAnalysisData.preview_frames.length > 0 && (
                    <div style={{
                      background: '#040711',
                      border: '1px solid rgba(0, 194, 255, 0.3)',
                      borderRadius: '20px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        padding: '10px 16px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Eye size={16} />
                          <span>Cuadro Real con Esqueleto MediaPipe</span>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {(() => {
                            const cur = realAnalysisData.preview_frames[previewFrameIndex];
                            const full = cur && realAnalysisData.processed_frames?.find(f => f.frame_index === cur.frame_index);
                            const sec = full?.metrics?.phase_sector;
                            if (!sec) return null;
                            return (
                              <span style={{
                                background: `${sec.color}22`,
                                color: sec.color,
                                border: `1px solid ${sec.color}`,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: '800'
                              }}>
                                {sec.tag}
                              </span>
                            );
                          })()}
                          <span style={{
                            background: 'rgba(0, 245, 160, 0.15)',
                            color: '#00f5a0',
                            border: '1px solid rgba(0, 245, 160, 0.3)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '800',
                            fontFamily: 'monospace'
                          }}>
                            t = {realAnalysisData.preview_frames[previewFrameIndex]?.time_sec}s (Frame #{realAnalysisData.preview_frames[previewFrameIndex]?.frame_index})
                          </span>
                        </div>
                      </div>

                      {/* Imagen Real con Esqueleto */}
                      <div style={{ position: 'relative', width: '100%', height: '320px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={realAnalysisData.preview_frames[previewFrameIndex]?.image_base64}
                          alt="MediaPipe Real Skeleton"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>

                      {/* Selector / Slider de Cuadros */}
                      <div style={{ padding: '12px 18px', background: 'rgba(9, 15, 28, 0.95)', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                          <span>Deslizar entre fotogramas procesados:</span>
                          <strong style={{ color: '#00f5a0' }}>{previewFrameIndex + 1} de {realAnalysisData.preview_frames.length}</strong>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={realAnalysisData.preview_frames.length - 1}
                          value={previewFrameIndex}
                          onChange={(e) => setPreviewFrameIndex(parseInt(e.target.value))}
                          style={{ width: '100%', accentColor: '#00f5a0', cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* FICHA DE COORDENADAS ARTICULARES REALES (LANDMARKS) */}
                  <div style={{
                    background: 'rgba(16, 26, 46, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '18px',
                    padding: '16px'
                  }}>
                    <strong style={{ fontSize: '12px', color: '#38bdf8', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      📍 Puntos Anatómicos Reales (MediaPipe Landmarks)
                    </strong>

                    {(() => {
                      const currentPreview = realAnalysisData.preview_frames && realAnalysisData.preview_frames[previewFrameIndex];
                      const fullFrame = currentPreview && realAnalysisData.processed_frames && realAnalysisData.processed_frames.find(f => f.frame_index === currentPreview.frame_index);
                      const kp = fullFrame?.keypoints;
                      const m = fullFrame?.metrics;

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px', fontFamily: 'monospace' }}>
                          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '8px 12px', borderRadius: '10px', borderLeft: '3px solid #00c2ff' }}>
                            <span style={{ color: '#94a3b8', display: 'block' }}>Cadera Izquierda (23):</span>
                            <strong style={{ color: 'white' }}>X: {kp?.left_hip?.[0] ?? '—'} · Y: {kp?.left_hip?.[1] ?? '—'}</strong>
                          </div>
                          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '8px 12px', borderRadius: '10px', borderLeft: '3px solid #00f5a0' }}>
                            <span style={{ color: '#94a3b8', display: 'block' }}>Rodilla Izquierda (25):</span>
                            <strong style={{ color: 'white' }}>X: {kp?.left_knee?.[0] ?? '—'} · Y: {kp?.left_knee?.[1] ?? '—'}</strong>
                          </div>
                          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '8px 12px', borderRadius: '10px', borderLeft: '3px solid #fde047' }}>
                            <span style={{ color: '#94a3b8', display: 'block' }}>Tobillo Izquierdo (27):</span>
                            <strong style={{ color: 'white' }}>X: {kp?.left_ankle?.[0] ?? '—'} · Y: {kp?.left_ankle?.[1] ?? '—'}</strong>
                          </div>
                          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '8px 12px', borderRadius: '10px', borderLeft: '3px solid #ff3366' }}>
                            <span style={{ color: '#94a3b8', display: 'block' }}>Ángulo Vectorial Rodilla:</span>
                            <strong style={{ color: '#00f5a0' }}>{m?.left_knee_angle != null ? `${m.left_knee_angle}°` : '—'} (Sim: {m?.symmetry_score != null ? `${m.symmetry_score}%` : '—'})</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* EVALUACIÓN DEL ASISTENTE VIRTUAL IA */}
                  <div style={{
                    background: 'rgba(0, 245, 160, 0.08)',
                    border: '1px solid rgba(0, 245, 160, 0.25)',
                    borderRadius: '16px',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Bot size={20} color="#00f5a0" />
                      <strong style={{ fontSize: '13px', color: '#00f5a0', textTransform: 'uppercase' }}>
                        Diagnóstico del Asistente Virtual IA Basado en Datos Reales
                      </strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {realAnalysisData.ai_evaluations?.praises?.map((p, i) => (
                        <div key={i} style={{ color: '#00f5a0', marginBottom: '6px' }}>
                          ✨ <strong>{p.badge}:</strong> {p.message}
                        </div>
                      ))}
                      {realAnalysisData.ai_evaluations?.anomalies?.map((a, i) => (
                        <div key={i} style={{ color: a.color, marginBottom: '6px' }}>
                          ⚠️ <strong>{a.badge}:</strong> {a.message} <br />
                          <span style={{ color: '#fde047' }}>💡 Consejo: {a.advice}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GUARDAR SESIÓN AL ATLETA SELECCIONADO */}
                  <div style={{
                    background: 'rgba(16, 26, 46, 0.95)',
                    border: '1px solid rgba(0, 245, 160, 0.4)',
                    borderRadius: '18px',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    boxShadow: '0 8px 30px rgba(0, 245, 160, 0.12)'
                  }}>
                    <div>
                      <span style={{ fontSize: '10px', color: '#00f5a0', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        GUARDAR EN FICHA DEL ATLETA
                      </span>
                      <h4 style={{ margin: '3px 0', fontSize: '16px', color: 'white', fontWeight: '800' }}>
                        Vincular evaluación a: {selectedAthlete}
                      </h4>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Puntaje IPT: <strong style={{ color: '#00f5a0' }}>{realAnalysisData.ipt_evaluation?.ipt_score || 0} pts</strong> · Detección: <strong>{realAnalysisData.video_info?.detection_rate_pct}%</strong>
                      </span>
                    </div>

                    <button
                      onClick={handleSaveRealSession}
                      style={{
                        height: '46px',
                        padding: '0 24px',
                        background: 'linear-gradient(135deg, #00f5a0, #00c2ff)',
                        color: '#04121d',
                        border: 'none',
                        borderRadius: '14px',
                        fontSize: '13px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 18px rgba(0, 245, 160, 0.4)'
                      }}
                    >
                      <CheckCircle2 size={18} />
                      <span>Guardar Sesión en Base de Datos ✓</span>
                    </button>
                  </div>

                </motion.div>
              )}
            </div>
          )}

        </div>
      </Layout>
    );
  }
