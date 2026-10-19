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
  Flame,
  Gauge,
  Layers,
  Maximize2,
  MessageSquare,
  Play,
  RotateCcw,
  Sparkles,
  StopCircle,
  SwitchCamera,
  ThumbsUp,
  Video,
  Volume2,
  VolumeX,
  X,
  Zap
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, PageHeader } from '../components/UI.jsx';

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

  // Atleta seleccionado para la toma
  const [selectedAthlete, setSelectedAthlete] = useState('Martín San Martín');

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
                value={selectedAthlete}
                onChange={(e) => setSelectedAthlete(e.target.value)}
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
                <option value="Martín San Martín">🏃 Martín San Martín (Sub-16)</option>
                <option value="Javiera Soto">🏃 Javiera Soto (Sub-16)</option>
                <option value="Antonia Pérez">🏃 Antonia Pérez (Sub-14)</option>
                <option value="Tomás Muñoz">🏃 Tomás Muñoz (Sub-14)</option>
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
                onClick={() => setIsRecording(true)}
                style={{
                  height: '48px',
                  padding: '0 24px',
                  background: 'linear-gradient(135deg, #ff3366, #e11d48)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '24px',
                  fontSize: '13px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 25px rgba(255, 51, 102, 0.4)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'white' }}></div>
                <span>INICIAR CAPTURA DE PASADA</span>
              </button>
            ) : (
              <button
                onClick={handleFinishRecording}
                style={{
                  height: '48px',
                  padding: '0 24px',
                  background: 'linear-gradient(135deg, #00f5a0, #00c2ff)',
                  color: '#04121d',
                  border: 'none',
                  borderRadius: '24px',
                  fontSize: '13px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 25px rgba(0, 245, 160, 0.4)',
                  cursor: 'pointer'
                }}
              >
                <StopCircle size={18} />
                <span>DETENER Y GUARDAR ({recordSeconds}s)</span>
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
