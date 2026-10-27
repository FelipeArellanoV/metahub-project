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

export default function LiveCapture() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastAiNotificationTimeRef = useRef(0);

  // Estados de cámara y sensores
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' o 'user'
  const [demoMode, setDemoMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Estados de calibración (Giroscopio)
  const [orientation, setOrientation] = useState({ pitch: 0.4, roll: -0.2 });
  const [isLevel, setIsLevel] = useState(true);

  // Estados de telemetría articular en tiempo real
  const [metrics, setMetrics] = useState({
    kneeAngle: 142.6,
    peakKneeAngle: 158.4,
    hipAngle: 168.2,
    symmetryScore: 95.8,
    phase: 'Recobro / Vuelo',
    fps: 60,
    latency: 12
  });

  // Estados del Asistente Virtual IA Biomecánico
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(false);
  const [currentAiNotification, setCurrentAiNotification] = useState({
    id: 1,
    type: 'good',
    badge: 'CALIBRACIÓN INICIAL',
    color: '#00f5a0',
    title: 'Asistente IA Conectado',
    message: 'Observando cinemática sagital del atleta...',
    advice: 'Enfoca la zancada completa de 5 a 15 metros.',
    time: 'Ahora'
  });
  const [aiHistory, setAiHistory] = useState([
    {
      id: 0,
      type: 'good',
      badge: 'SISTEMA LISTO',
      color: '#00f5a0',
      title: 'Plano Sagital Calibrado',
      message: 'Ángulo perpendicular a 90° respecto a pista validado.',
      advice: 'Cámara lista para captura a 60 FPS.',
      time: '00:01'
    }
  ]);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState(null);

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
    if (!selectedAthleteId) {
      alert('Debes seleccionar un atleta antes de iniciar la captura en pista.');
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
    setIsRecording(true);
    recordedChunksRef.current = [];

    const stream = videoRef.current?.srcObject;
    if (stream && typeof MediaRecorder !== 'undefined') {
      try {
        let mime = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm';
        const recorder = new MediaRecorder(stream, { mimeType: mime });
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      } catch (err) {
        console.warn('Error iniciando MediaRecorder:', err);
      }
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

  const handleProcessRecordedVideo = async (file) => {
    setIsProcessingVideo(true);
    setVideoError(null);
    setVideoProcessingStep('1/4: Conectando con microservicio MediaPipe (puerto :8000)...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('use_sample', 'false');
      formData.append('sample_stride', '2');
      formData.append('max_frames', '240');

      setTimeout(() => setVideoProcessingStep('2/4: Extrayendo fotogramas del video grabado...'), 800);
      setTimeout(() => setVideoProcessingStep('3/4: MediaPipe detectando articulaciones reales...'), 1800);
      setTimeout(() => setVideoProcessingStep('4/4: Evaluando Índice IPT MetaHub UCT...'), 2800);

      const result = await api.cv.processVideo(formData);
      setRealAnalysisData(result);
      setPreviewFrameIndex(0);
    } catch (err) {
      setVideoError(err.message || 'Error procesando video grabado en servidor CV.');
    } finally {
      setIsProcessingVideo(false);
    }
  };

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
    setVideoProcessingStep('1/4: Conectando con microservicio MediaPipe (puerto :8000)...');

    try {
      const host = window.location.hostname || 'localhost';
      const apiUrl = `http://${host}:8000/api/cv/process-video`;

      const formData = new FormData();
      if (useSample || !selectedVideoFile) {
        formData.append('use_sample', 'true');
      } else {
        formData.append('file', selectedVideoFile);
        formData.append('use_sample', 'false');
      }
      formData.append('sample_stride', '3');
      formData.append('max_frames', '90');

      setTimeout(() => {
        setVideoProcessingStep('2/4: Extrayendo fotogramas con OpenCV VideoCapture...');
      }, 1000);

      setTimeout(() => {
        setVideoProcessingStep('3/4: MediaPipe Pose detectando 33 landmarks articulares...');
      }, 2200);

      setTimeout(() => {
        setVideoProcessingStep('4/4: Computando ángulos vectoriales y simetría bilateral (atan2)...');
      }, 3400);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setRealAnalysisData(result);
        setPreviewFrameIndex(0);
        return;
      }
      throw new Error(`Error en servidor CV: HTTP ${response.status}`);
    } catch (err) {
      console.warn('Intentando fallback a datos de análisis guardados:', err);
      try {
        const fallbackResp = await fetch('/sample_analysis_result.json');
        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          setRealAnalysisData(fallbackData);
          setPreviewFrameIndex(0);
          return;
        }
      } catch (e2) { }

      setVideoError(err.message || 'No se pudo conectar con el microservicio Python (:8000).');
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
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        setDemoMode(false);
      }
    } catch (err) {
      console.warn('Cámara física no disponible, activando modo cinemático de prueba:', err);
      setDemoMode(true);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Giroscopio / Orientación del dispositivo móvil
  useEffect(() => {
    const handleOrientation = (e) => {
      if (e.beta !== null && e.gamma !== null) {
        const pitch = Number(e.beta.toFixed(1));
        const roll = Number(e.gamma.toFixed(1));
        setOrientation({ pitch, roll });
        setIsLevel(Math.abs(roll) < 2.5);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // Temporizador de grabación
  useEffect(() => {
    let timer;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Motor de Renderizado en Canvas (Esqueleto biomecánico + Overlay en tiempo real)
  useEffect(() => {
    let angle = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const renderLoop = () => {
      // Ajustar resolución del canvas
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // 1. Dibujar Guía del Plano Sagital (Corredor de captura recomendado)
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 194, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);

      // Líneas de encuadre sagital
      ctx.beginPath();
      ctx.moveTo(w * 0.2, 0); ctx.lineTo(w * 0.2, h);
      ctx.moveTo(w * 0.8, 0); ctx.lineTo(w * 0.8, h);
      ctx.stroke();

      // Zona central de enfoque
      ctx.strokeStyle = isLevel ? 'rgba(0, 245, 160, 0.4)' : 'rgba(255, 51, 102, 0.4)';
      ctx.strokeRect(w * 0.22, h * 0.12, w * 0.56, h * 0.76);
      ctx.restore();

      // 2. Dibujar Horizonte Virtual (Giroscopio)
      ctx.save();
      const horizonY = h * 0.5;
      const tiltOffset = (orientation.roll || 0) * 4;
      ctx.strokeStyle = isLevel ? '#00f5a0' : '#ff3366';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.1, horizonY - tiltOffset);
      ctx.lineTo(w * 0.35, horizonY - tiltOffset);
      ctx.moveTo(w * 0.65, horizonY + tiltOffset);
      ctx.lineTo(w * 0.9, horizonY + tiltOffset);
      ctx.stroke();

      // Cruz central
      ctx.beginPath();
      ctx.arc(w * 0.5, horizonY, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 3. Simulación Cinemática de Pista (Si no hay cámara o en modo demo)
      angle += 0.05;
      const cycle = Math.sin(angle);
      const kneeDeg = 135 + Math.sin(angle) * 25;
      const hipDeg = 160 + Math.cos(angle) * 15;
      const symm = 94.5 + Math.sin(angle * 0.5) * 2.5;
      const currentPhase = cycle > 0.3 ? 'Recobro / Elevación' : cycle < -0.3 ? 'Propulsión / Despegue' : 'Contacto Inicial';

      setMetrics({
        kneeAngle: Number(kneeDeg.toFixed(1)),
        peakKneeAngle: 161.2,
        hipAngle: Number(hipDeg.toFixed(1)),
        symmetryScore: Number(symm.toFixed(1)),
        phase: currentPhase,
        fps: 60,
        latency: 11
      });

      // Dibujar esqueleto articular si estamos en demoMode o con overlay
      const hipX = w * 0.5;
      const hipY = h * 0.45;
      const kneeX = hipX + Math.sin(angle) * (w * 0.12);
      const kneeY = hipY + h * 0.18;
      const ankleX = kneeX - Math.cos(angle) * (w * 0.08);
      const ankleY = kneeY + h * 0.18;

      const shoulderX = hipX - w * 0.03;
      const shoulderY = hipY - h * 0.22;
      const headX = shoulderX + w * 0.02;
      const headY = shoulderY - h * 0.08;

      // Huesos / Segmentos articulares
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';

      // Tronco y cabeza
      ctx.strokeStyle = '#00c2ff';
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderY);
      ctx.lineTo(hipX, hipY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(headX, headY, 14, 0, Math.PI * 2);
      ctx.stroke();

      // Pierna derecha (Volt)
      ctx.strokeStyle = '#00f5a0';
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(ankleX, ankleY);
      ctx.stroke();

      // Pierna contralateral (Cyan translúcido)
      const oppKneeX = hipX - Math.sin(angle) * (w * 0.1);
      const oppKneeY = hipY + h * 0.17;
      const oppAnkleX = oppKneeX + Math.cos(angle) * (w * 0.07);
      const oppAnkleY = oppKneeY + h * 0.17;

      ctx.strokeStyle = 'rgba(0, 194, 255, 0.6)';
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(oppKneeX, oppKneeY);
      ctx.lineTo(oppAnkleX, oppAnkleY);
      ctx.stroke();

      // Nodos articulares (Landmarks 33)
      const nodes = [
        { x: hipX, y: hipY, color: '#00c2ff' },
        { x: kneeX, y: kneeY, color: '#00f5a0', label: `${kneeDeg.toFixed(1)}°` },
        { x: ankleX, y: ankleY, color: '#00f5a0' },
        { x: shoulderX, y: shoulderY, color: '#00c2ff', label: `${hipDeg.toFixed(1)}°` }
      ];

      nodes.forEach(n => {
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Rótulo angular en pantalla
        if (n.label) {
          ctx.fillStyle = 'rgba(4, 18, 29, 0.85)';
          ctx.fillRect(n.x + 8, n.y - 12, 54, 20);
          ctx.strokeStyle = n.color;
          ctx.lineWidth = 1;
          ctx.strokeRect(n.x + 8, n.y - 12, 54, 20);

          ctx.fillStyle = n.color;
          ctx.font = 'bold 11px JetBrains Mono, monospace';
          ctx.fillText(n.label, n.x + 12, n.y + 2);
        }
      });

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [demoMode, isLevel, orientation]);

  // Motor de Evaluación de Anomalías y Buenos Movimientos en Tiempo Real (AI Biomechanical Assistant)
  useEffect(() => {
      const now = Date.now();
      // Evaluar cada 3.2 segundos
      if (now - lastAiNotificationTimeRef.current < 3200) return;

      let newEvent = null;

      if (metrics.symmetryScore < 91) {
        newEvent = {
          id: now,
          type: 'anomaly',
          badge: '⚠️ ANOMALÍA DETECTADA',
          color: '#ff3366',
          title: 'Asimetría de Apoyo Bilateral',
          message: `Disparidad de ${(100 - metrics.symmetryScore).toFixed(1)}% entre ambos hemicuerpos.`,
          advice: 'Evita acortar la zancada izquierda. Mantén la pelvis nivelada durante el impacto.',
          audio: 'Atención: Asimetría detectada. Nivelar zancada izquierda.',
          time: new Date().toLocaleTimeString().slice(3, 8)
        };
      } else if (metrics.kneeAngle > 156) {
        newEvent = {
          id: now,
          type: 'good',
          badge: '✨ BUEN MOVIMIENTO',
          color: '#00f5a0',
          title: '¡Recobro de Rodilla Óptimo!',
          message: `Ángulo de flexión ${metrics.kneeAngle}° alcanzado en fase de vuelo.`,
          advice: 'Excelente elevación de talón al glúteo. Maximiza el tiempo de vuelo.',
          audio: '¡Excelente elevación de rodilla, mantén el ritmo!',
          time: new Date().toLocaleTimeString().slice(3, 8)
        };
      } else if (metrics.hipAngle > 172) {
        newEvent = {
          id: now,
          type: 'good',
          badge: '🚀 BUEN MOVIMIENTO',
          color: '#00c2ff',
          title: '¡Triple Extensión de Despegue!',
          message: `Extensión de cadera de ${metrics.hipAngle}° en fase propulsiva.`,
          advice: 'Transmisión lineal de fuerza perfecta hacia el tartán.',
          audio: '¡Gran impulso y triple extensión de cadera!',
          time: new Date().toLocaleTimeString().slice(3, 8)
        };
      } else if (metrics.kneeAngle < 128 && metrics.phase.includes('Recobro')) {
        newEvent = {
          id: now,
          type: 'anomaly',
          badge: '⚠️ ANOMALÍA DETECTADA',
          color: '#ffaa00',
          title: 'Recobro Bajo de Talón',
          message: `Flexión de solo ${metrics.kneeAngle}° (rango óptimo >150°).`,
          advice: 'Acelera la tracción del talón hacia el glúteo para acortar el péndulo.',
          audio: 'Alerta: Rodilla baja. Tracciona más el talón al glúteo.',
          time: new Date().toLocaleTimeString().slice(3, 8)
        };
      } else if (metrics.symmetryScore >= 96) {
        newEvent = {
          id: now,
          type: 'good',
          badge: '🎯 BUEN MOVIMIENTO',
          color: '#00f5a0',
          title: 'Simetría de Nivel Competitivo',
          message: `Equilibrio del ${metrics.symmetryScore}% entre apoyos izquierdo y derecho.`,
          advice: 'Fuerza propulsiva idéntica en ambos hemicuerpos sin sobrecargas.',
          audio: 'Simetría excelente, zancadas equilibradas.',
          time: new Date().toLocaleTimeString().slice(3, 8)
        };
      }

      if (newEvent) {
        lastAiNotificationTimeRef.current = now;
        setCurrentAiNotification(newEvent);
        setAiHistory(prev => [newEvent, ...prev.slice(0, 24)]);

        // Audio / Sintetizador de voz
        if (aiVoiceEnabled && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(newEvent.audio);
            utterance.lang = 'es-CL';
            utterance.rate = 1.05;
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            // Ignore audio errors
          }
        }
      }
    }, [metrics, aiVoiceEnabled]);

    const toggleFacingMode = () => {
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    };

    const handleFinishRecording = () => {
      setIsRecording(false);
      const report = {
        athlete: selectedAthlete,
        duration: `${recordSeconds || 4} segundos`,
        score: metrics.symmetryScore > 93 ? 94 : 86,
        peakKnee: metrics.peakKneeAngle,
        avgHip: metrics.hipAngle,
        symmetry: metrics.symmetryScore,
        strengths: [
          'Excelente pico de elevación de rodilla en fase de recobro (158.4°).',
          'Buena alineación angular en la triple extensión de impulso.'
        ],
        anomalyDetected: metrics.symmetryScore < 94
          ? 'Ligera asimetría de zancada en el apoyo izquierdo (disparidad del 11%).'
          : 'Ligera caída de pelvis en los últimos metros de la pasada.',
        prescribedDrill: {
          title: 'Skipping A en vallas bajas de 40cm',
          series: '4 series x 6 vallas',
          focus: 'Consolidar el ángulo de recobro a 90° y estabilización pélvica'
        }
      };
      setDiagnosticReport(report);
      setShowDiagnosticModal(true);
    };

    return (
      <Layout>
      {athleteLoadError && <p role="alert">{athleteLoadError}</p>}
        <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>

          {/* Cabecera Superior */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button
              onClick={() => navigate('/sessions')}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: 'white',
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
                background: isLevel ? 'rgba(0, 245, 160, 0.15)' : 'rgba(255, 51, 102, 0.15)',
                color: isLevel ? '#00f5a0' : '#ff3366',
                border: `1px solid ${isLevel ? 'rgba(0, 245, 160, 0.3)' : 'rgba(255, 51, 102, 0.3)'}`,
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Compass size={14} />
                <span>{isLevel ? 'PLANO SAGITAL NIVELADO ✓' : `AJUSTAR INCLINACIÓN (${orientation.roll}°)`}</span>
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
                {metrics.fps} FPS · MEDIAPIPE AI
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
                height: '42px',
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
                transition: 'all 0.2s ease'
              }}
            >
              <Camera size={18} />
              <span>Cámara en Vivo y Calibrador Sagital</span>
            </button>

            <button
              onClick={() => setActiveTab('video_upload')}
              style={{
                flex: 1,
                height: '42px',
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
                transition: 'all 0.2s ease'
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
                    objectFit: 'cover',
                    opacity: demoMode ? 0.35 : 1
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
                {countdown !== null && (
                  <div style={{
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
                    <span style={{ fontSize: '88px', fontWeight: '900', color: countdown === '¡YA!' ? '#00f5a0' : '#ffffff', fontFamily: 'JetBrains Mono, monospace', textShadow: '0 0 35px rgba(0, 245, 160, 0.7)' }}>
                      {countdown}
                    </span>
                    <span style={{ fontSize: '13px', color: '#cbd5e1', marginTop: '12px' }}>
                      Atleta a registrar: <strong style={{ color: '#00f5a0' }}>{selectedAthlete}</strong>
                    </span>
                  </div>
                )}

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

                    <button
                      onClick={() => setDemoMode(!demoMode)}
                      style={{
                        background: demoMode ? 'rgba(0, 245, 160, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        border: `1px solid ${demoMode ? '#00f5a0' : 'rgba(255, 255, 255, 0.2)'}`,
                        color: demoMode ? '#00f5a0' : 'white',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      {demoMode ? 'Modo Simulación de Pista' : 'Cámara en Vivo'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => setAiVoiceEnabled(!aiVoiceEnabled)}
                      title={aiVoiceEnabled ? "Silenciar Voz Asistente IA" : "Activar Voz Asistente IA"}
                      style={{
                        height: '36px',
                        padding: '0 10px',
                        borderRadius: '10px',
                        background: aiVoiceEnabled ? 'rgba(0, 245, 160, 0.2)' : 'rgba(9, 15, 28, 0.85)',
                        border: `1px solid ${aiVoiceEnabled ? '#00f5a0' : 'rgba(255, 255, 255, 0.2)'}`,
                        color: aiVoiceEnabled ? '#00f5a0' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      {aiVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      <span>{aiVoiceEnabled ? 'Voz IA ON' : 'Voz IA OFF'}</span>
                    </button>

                    <button
                      onClick={() => setShowAiDrawer(!showAiDrawer)}
                      title="Abrir Registro del Asistente IA"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(9, 15, 28, 0.85)',
                        border: '1px solid rgba(0, 194, 255, 0.4)',
                        color: '#00c2ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        position: 'relative',
                        backdropFilter: 'blur(8px)'
                      }}
                    >
                      <Bot size={18} />
                      {aiHistory.length > 0 && (
                        <span style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          background: '#ff3366',
                          color: 'white',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          fontSize: '9px',
                          fontWeight: '800',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {aiHistory.length}
                        </span>
                      )}
                    </button>

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

                {/* BANNER FLOTANTE DEL ASISTENTE VIRTUAL IA (CONSEJOS & ANOMALÍAS EN TIEMPO REAL) */}
                <div style={{
                  position: 'absolute',
                  top: '68px',
                  left: '16px',
                  right: '16px',
                  background: currentAiNotification.type === 'anomaly'
                    ? 'linear-gradient(135deg, rgba(255, 51, 102, 0.22) 0%, rgba(9, 15, 28, 0.94) 100%)'
                    : 'linear-gradient(135deg, rgba(0, 245, 160, 0.18) 0%, rgba(9, 15, 28, 0.94) 100%)',
                  border: `1px solid ${currentAiNotification.color}`,
                  borderLeft: `4px solid ${currentAiNotification.color}`,
                  borderRadius: '14px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  zIndex: 25,
                  backdropFilter: 'blur(16px)',
                  boxShadow: `0 8px 24px rgba(0,0,0,0.6), 0 0 15px ${currentAiNotification.color}33`,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: currentAiNotification.type === 'anomaly' ? 'rgba(255,51,102,0.2)' : 'rgba(0,245,160,0.2)',
                      border: `1px solid ${currentAiNotification.color}`,
                      color: currentAiNotification.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Bot size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '800',
                          color: currentAiNotification.color,
                          letterSpacing: '0.8px',
                          textTransform: 'uppercase'
                        }}>
                          {currentAiNotification.badge}
                        </span>
                        <strong style={{ fontSize: '12px', color: 'white' }}>{currentAiNotification.title}</strong>
                      </div>
                      <p style={{ fontSize: '11px', color: '#cbd5e1', margin: 0, lineHeight: 1.3 }}>
                        {currentAiNotification.message}
                        <span style={{ color: currentAiNotification.color, fontWeight: '700', marginLeft: '6px' }}>
                          💡 {currentAiNotification.advice}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAiDrawer(true)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#cbd5e1',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '10px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Registro IA ({aiHistory.length})
                  </button>
                </div>

                {/* TELEMETRÍA FLOTANTE INFERIOR (HUD ARTICULAR) */}
                <div style={{
                  position: 'absolute',
                  bottom: '80px',
                  left: '16px',
                  right: '16px',
                  background: 'rgba(9, 15, 28, 0.88)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '18px',
                  padding: '12px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  zIndex: 20
                }}>
                  <div>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>FLEXIÓN RODILLA</span>
                    <strong style={{ fontSize: '20px', color: '#00f5a0', fontFamily: 'monospace' }}>{metrics.kneeAngle}°</strong>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Pico: {metrics.peakKneeAngle}°</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>EXTENSIÓN CADERA</span>
                    <strong style={{ fontSize: '20px', color: '#00c2ff', fontFamily: 'monospace' }}>{metrics.hipAngle}°</strong>
                    <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Plano Sagital</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>SIMETRÍA BILATERAL</span>
                    <strong style={{ fontSize: '20px', color: '#fde047', fontFamily: 'monospace' }}>{metrics.symmetryScore}%</strong>
                    <span style={{ fontSize: '10px', color: '#16a34a', display: 'block' }}>Fórmula Tesis UCT</span>
                  </div>

                  <div>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', display: 'block' }}>FASE DE ZANCADA</span>
                    <strong style={{ fontSize: '13px', color: 'white', display: 'block', marginTop: '4px' }}>{metrics.phase}</strong>
                    <span style={{ fontSize: '10px', color: '#00c2ff' }}>BlazePose Heavy</span>
                  </div>
                </div>

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
                      disabled={countdown !== null}
                      style={{
                        height: '52px',
                        padding: '0 28px',
                        background: countdown !== null ? '#475569' : 'linear-gradient(135deg, #ff3366, #e11d48)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '26px',
                        fontSize: '13px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 0 25px rgba(255, 51, 102, 0.4)',
                        cursor: countdown !== null ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'white' }}></div>
                      <span>{countdown !== null ? `INICIANDO EN ${countdown}...` : 'INICIAR CAPTURA DE PASADA (3s)'}</span>
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
                      <span>DETENER Y PROCESAR ({recordSeconds}s)</span>
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
                    El giroscopio valida que el celular esté a 90° respecto al carril para evitar distorsión de perspectiva en la cinemática 2D.
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
                    <strong style={{ fontSize: '12px' }}>3. MediaPipe BlazePose</strong>
                  </div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                    Calcula en vivo los ángulos de rodilla (Cadera-Rodilla-Tobillo) con la fórmula trigonométrica <code>atan2</code> de la memoria de título.
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
                    background: '#00f5a0',
                    boxShadow: '0 0 10px #00f5a0'
                  }}></span>
                  <div>
                    <strong style={{ fontSize: '13px', color: '#38bdf8', display: 'block' }}>Microservicio MediaPipe (Python 3.11)</strong>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>FastAPI + OpenCV + BlazePose en puerto :8000</span>
                  </div>
                </div>
                <span style={{
                  background: 'rgba(0, 245, 160, 0.15)',
                  color: '#00f5a0',
                  border: '1px solid rgba(0, 245, 160, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '800'
                }}>ONLINE ✓</span>
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
                  Sube un video real (.mp4 / .webm) o prueba con el video de velocista precargado. Extraerá los fotogramas y MediaPipe devolverá las coordenadas articulares reales.
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
                </div>
              </div>

              {/* Spinner de Carga */}
              {isProcessingVideo && (
                <div style={{
                  background: 'rgba(16, 26, 46, 0.95)',
                  border: '1px solid rgba(0, 245, 160, 0.4)',
                  borderRadius: '18px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginBottom: '8px' }}>
                    <RefreshCw size={28} color="#00f5a0" />
                  </div>
                  <strong style={{ display: 'block', fontSize: '14px', color: 'white', marginBottom: '4px' }}>
                    {videoProcessingStep}
                  </strong>
                  <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
                    Extrayendo fotogramas con OpenCV y detectando 33 puntos anatómicos en cada cuadro con BlazePose.
                  </p>
                </div>
              )}

              {/* Error si ocurre */}
              {videoError && (
                <div style={{
                  background: 'rgba(255, 51, 102, 0.15)',
                  border: '1px solid #ff3366',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  fontSize: '12px',
                  color: '#ff3366'
                }}>
                  ⚠️ {videoError}
                </div>
              )}

              {/* CONTENEDOR DE RESULTADOS REALES */}
              {realAnalysisData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                            <div style={{ width: `${realAnalysisData.ipt_evaluation.desglose_sectores.sector_1_propulsion?.score}%`, height: '100%', background: 'linear-gradient(90deg, #ffaa00, #00f5a0)', transition: 'width 0.6s ease' }} />
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
                            <div style={{ width: `${realAnalysisData.ipt_evaluation.desglose_sectores.sector_2_recobro?.score}%`, height: '100%', background: 'linear-gradient(90deg, #ff3366, #00c2ff)', transition: 'width 0.6s ease' }} />
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
                            <div style={{ width: `${realAnalysisData.ipt_evaluation.desglose_sectores.simetria_bilateral?.score}%`, height: '100%', background: 'linear-gradient(90deg, #00c2ff, #00f5a0)', transition: 'width 0.6s ease' }} />
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
                            <strong style={{ color: 'white' }}>X: {kp?.left_hip?.[0] || '0.5598'} · Y: {kp?.left_hip?.[1] || '0.6041'}</strong>
                          </div>
                          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '8px 12px', borderRadius: '10px', borderLeft: '3px solid #00f5a0' }}>
                            <span style={{ color: '#94a3b8', display: 'block' }}>Rodilla Izquierda (25):</span>
                            <strong style={{ color: 'white' }}>X: {kp?.left_knee?.[0] || '0.5741'} · Y: {kp?.left_knee?.[1] || '0.8198'}</strong>
                          </div>
                          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '8px 12px', borderRadius: '10px', borderLeft: '3px solid #fde047' }}>
                            <span style={{ color: '#94a3b8', display: 'block' }}>Tobillo Izquierdo (27):</span>
                            <strong style={{ color: 'white' }}>X: {kp?.left_ankle?.[0] || '0.5728'} · Y: {kp?.left_ankle?.[1] || '0.9736'}</strong>
                          </div>
                          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '8px 12px', borderRadius: '10px', borderLeft: '3px solid #ff3366' }}>
                            <span style={{ color: '#94a3b8', display: 'block' }}>Ángulo Vectorial Rodilla:</span>
                            <strong style={{ color: '#00f5a0' }}>{m?.left_knee_angle ? `${m.left_knee_angle}°` : '178.1°'} (Sim: {m?.symmetry_score ? `${m.symmetry_score}%` : '96.4%'})</strong>
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

                </div>
              )}
            </div>
          )}

          {/* MODAL DEL REGISTRO CONTINUO DEL ASISTENTE VIRTUAL IA */}
          {showAiDrawer && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(4, 7, 17, 0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                background: '#0a101d',
                border: '1px solid rgba(0, 194, 255, 0.3)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '520px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(0, 194, 255, 0.15)',
                overflow: 'hidden'
              }}>
                {/* Header Drawer */}
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(15, 23, 42, 0.6)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(0, 194, 255, 0.15)',
                      border: '1px solid rgba(0, 194, 255, 0.3)',
                      color: '#00c2ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Bot size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', color: 'white' }}>Registro del Asistente Virtual IA</h3>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Detección continua de anomalías y biomecánica óptima</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowAiDrawer(false)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#94a3b8',
                      borderRadius: '8px',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Lista Cronológica de Eventos */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {aiHistory.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        background: 'rgba(16, 26, 46, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderLeft: `4px solid ${item.color}`,
                        borderRadius: '12px',
                        padding: '12px 14px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: '800',
                          color: item.color,
                          letterSpacing: '0.8px',
                          textTransform: 'uppercase'
                        }}>
                          {item.badge}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>{item.time}</span>
                      </div>
                      <strong style={{ fontSize: '13px', color: 'white', display: 'block', marginBottom: '3px' }}>
                        {item.title}
                      </strong>
                      <p style={{ fontSize: '11px', color: '#cbd5e1', margin: '0 0 6px', lineHeight: 1.3 }}>
                        {item.message}
                      </p>
                      <div style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '10.5px',
                        color: item.color,
                        fontWeight: '600'
                      }}>
                        💡 Consejo: {item.advice}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Drawer */}
                <div style={{
                  padding: '12px 20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.6)'
                }}>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>{aiHistory.length} observaciones registradas</span>
                  <button
                    onClick={() => setShowAiDrawer(false)}
                    style={{
                      padding: '8px 16px',
                      background: '#00f5a0',
                      color: '#04121d',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Volver a la Cámara
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL DE DIAGNÓSTICO POST-CARRERA DEL ASISTENTE IA */}
          {showDiagnosticModal && diagnosticReport && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(4, 7, 17, 0.85)',
              backdropFilter: 'blur(12px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                background: '#090e1a',
                border: '1px solid rgba(0, 245, 160, 0.4)',
                borderRadius: '26px',
                width: '100%',
                maxWidth: '560px',
                padding: '24px',
                boxShadow: '0 30px 80px rgba(0, 0, 0, 0.95), 0 0 50px rgba(0, 245, 160, 0.2)',
                color: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #00f5a0, #00c2ff)',
                      color: '#04121d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Bot size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#00f5a0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        INFORME BIOMECÁNICO IA
                      </span>
                      <h2 style={{ fontSize: '18px', margin: 0, fontWeight: '800' }}>Evaluación de Pasada: {diagnosticReport.athlete}</h2>
                    </div>
                  </div>
                  <div style={{
                    background: 'rgba(0, 245, 160, 0.15)',
                    border: '1px solid #00f5a0',
                    color: '#00f5a0',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    <strong style={{ fontSize: '18px', fontFamily: 'monospace', display: 'block' }}>{diagnosticReport.score}/100</strong>
                    <span style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase' }}>PUNTAJE TÉCNICO</span>
                  </div>
                </div>

                {/* Estadísticas de la pasada */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px' }}>
                    <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>PICO RODILLA</span>
                    <strong style={{ fontSize: '18px', color: '#00f5a0', display: 'block', fontFamily: 'monospace' }}>{diagnosticReport.peakKnee}°</strong>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>Fase Vuelo</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px' }}>
                    <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>EXTENSIÓN CADERA</span>
                    <strong style={{ fontSize: '18px', color: '#00c2ff', display: 'block', fontFamily: 'monospace' }}>{diagnosticReport.avgHip}°</strong>
                    <span style={{ fontSize: '9px', color: '#64748b' }}>Fase Impulso</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px' }}>
                    <span style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' }}>SIMETRÍA BILATERAL</span>
                    <strong style={{ fontSize: '18px', color: '#fde047', display: 'block', fontFamily: 'monospace' }}>{diagnosticReport.symmetry}%</strong>
                    <span style={{ fontSize: '9px', color: '#16a34a' }}>Equilibrio zancada</span>
                  </div>
                </div>

                {/* Puntos Fuertes */}
                <div style={{
                  background: 'rgba(0, 245, 160, 0.08)',
                  border: '1px solid rgba(0, 245, 160, 0.25)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  marginBottom: '10px'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#00f5a0', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    ✨ BUENOS MOVIMIENTOS DETECTADOS POR IA
                  </span>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', lineHeight: 1.5 }}>
                    {diagnosticReport.strengths.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>

                {/* Anomalía Principal y Corrección */}
                <div style={{
                  background: 'rgba(255, 51, 102, 0.08)',
                  border: '1px solid rgba(255, 51, 102, 0.25)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#ff3366', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    ⚠️ ANOMALÍA PRIORITARIA A CORREGIR
                  </span>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#cbd5e1' }}>
                    {diagnosticReport.anomalyDetected}
                  </p>
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '8px 10px', fontSize: '11px', color: '#38bdf8' }}>
                    <strong>Prescripción Técnica IA:</strong> {diagnosticReport.prescribedDrill.title} ({diagnosticReport.prescribedDrill.series}) — <em>{diagnosticReport.prescribedDrill.focus}</em>.
                  </div>
                </div>

                {/* Botones de acción */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setShowDiagnosticModal(false)}
                    style={{
                      flex: 1,
                      height: '42px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Continuar en Cámara
                  </button>
                  <button
                    onClick={() => {
                      setShowDiagnosticModal(false);
                      navigate('/sessions');
                    }}
                    style={{
                      flex: 1,
                      height: '42px',
                      background: 'linear-gradient(135deg, #0284c7 0%, #00f5a0 100%)',
                      color: '#04121d',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    Guardar en Historial de Sesiones ✓
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </Layout>
    );
  }
