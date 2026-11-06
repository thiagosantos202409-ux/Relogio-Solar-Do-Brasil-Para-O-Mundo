import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { 
  Camera, 
  Eye, 
  MapPin, 
  Maximize2, 
  Minimize2, 
  Layers, 
  RotateCcw, 
  Sun, 
  Globe, 
  Compass, 
  Clock, 
  Sparkles, 
  X, 
  Plus, 
  Trash2, 
  Sliders, 
  Check, 
  ExternalLink,
  Navigation,
  Info,
  Building,
  Video,
  VideoOff
} from 'lucide-react';
import SunCalc from 'suncalc';

export interface SpatialXRBlocksAppProps {
  latitude: number;
  longitude: number;
  locationName?: string;
  solarDate: Date;
  altitude: number;
  azimuth: number;
  civilTimeStr: string;
  solarTimeStr: string;
  dateStr: string;
  onClose: () => void;
  onSelectLocation?: (lat: number, lon: number, name: string) => void;
}

export interface XRBlockData {
  id: string;
  title: string;
  type: 'solar_clock' | 'location' | 'solar_vector' | 'daylight' | 'compass' | 'custom';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  icon: string;
  visible: boolean;
  valueText: string;
  subText: string;
}

export const SpatialXRBlocksApp: React.FC<SpatialXRBlocksAppProps> = ({
  latitude,
  longitude,
  locationName = 'Localização Atual',
  solarDate,
  altitude,
  azimuth,
  civilTimeStr,
  solarTimeStr,
  dateStr,
  onClose,
  onSelectLocation
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mode states
  const [isCameraFullScreen, setIsCameraFullScreen] = useState<boolean>(true);
  const [isCameraFeedActive, setIsCameraFeedActive] = useState<boolean>(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showLocationDrawer, setShowLocationDrawer] = useState<boolean>(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('solar_clock');
  const [isWebXRSupported, setIsWebXRSupported] = useState<boolean>(false);
  const [isXRActive, setIsXRActive] = useState<boolean>(false);
  const [isHudCollapsed, setIsHudCollapsed] = useState<boolean>(false);

  // Custom blocks management state
  const [blocks, setBlocks] = useState<XRBlockData[]>([
    {
      id: 'solar_clock',
      title: 'Relógio Solar Spatial 3D',
      type: 'solar_clock',
      position: [-1.2, 0.4, -2.5],
      rotation: [0, 0.2, 0],
      scale: [1, 1, 1],
      color: '#f59e0b',
      icon: 'clock',
      visible: true,
      valueText: solarTimeStr,
      subText: `Civil: ${civilTimeStr}`
    },
    {
      id: 'location',
      title: 'Bloco de Localização',
      type: 'location',
      position: [1.2, 0.5, -2.5],
      rotation: [0, -0.2, 0],
      scale: [1, 1, 1],
      color: '#3b82f6',
      icon: 'mappin',
      visible: true,
      valueText: locationName,
      subText: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`
    },
    {
      id: 'solar_vector',
      title: 'Vetor & Azimute Solar',
      type: 'solar_vector',
      position: [0, -0.5, -2.2],
      rotation: [0.1, 0, 0],
      scale: [1, 1, 1],
      color: '#ec4899',
      icon: 'sun',
      visible: true,
      valueText: `Alt: ${altitude.toFixed(1)}°`,
      subText: `Az: ${azimuth.toFixed(1)}°`
    },
    {
      id: 'daylight',
      title: 'Ciclo Luz & Estação',
      type: 'daylight',
      position: [-1.4, -0.6, -2.8],
      rotation: [0, 0.3, 0],
      scale: [1, 1, 1],
      color: '#10b981',
      icon: 'sparkles',
      visible: true,
      valueText: dateStr,
      subText: altitude >= 0 ? 'Dia Solar' : 'Noite'
    },
    {
      id: 'compass',
      title: 'Bússola Espacial XR',
      type: 'compass',
      position: [1.4, -0.6, -2.8],
      rotation: [0, -0.3, 0],
      scale: [1, 1, 1],
      color: '#8b5cf6',
      icon: 'compass',
      visible: true,
      valueText: `Rumo ${Math.round(azimuth)}°`,
      subText: 'Norte Geográfico'
    }
  ]);

  // Sun calculation details for Location viewer
  const sunTimes = useMemo(() => {
    return SunCalc.getTimes(solarDate, latitude, longitude);
  }, [solarDate, latitude, longitude]);

  const sunriseStr = useMemo(() => {
    if (!sunTimes.sunrise || isNaN(sunTimes.sunrise.getTime())) return '--:--';
    return sunTimes.sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [sunTimes]);

  const sunsetStr = useMemo(() => {
    if (!sunTimes.sunset || isNaN(sunTimes.sunset.getTime())) return '--:--';
    return sunTimes.sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [sunTimes]);

  // Check WebXR capability
  useEffect(() => {
    if ('xr' in navigator && (navigator as any).xr) {
      (navigator as any).xr.isSessionSupported('immersive-ar').then((supported: boolean) => {
        setIsWebXRSupported(supported);
      }).catch(() => {
        setIsWebXRSupported(false);
      });
    }
  }, []);

  // Handle device camera pass-through stream for Full Screen Camera mode
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    if (isCameraFeedActive) {
      navigator.mediaDevices?.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      }).then((stream) => {
        activeStream = stream;
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }).catch((err) => {
        console.warn('Câmera indisponível ou permissão negada:', err);
        setIsCameraFeedActive(false);
      });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraStream(null);
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isCameraFeedActive]);

  // WebGL Three.js Renderer Setup
  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      65,
      mountNode.clientWidth / mountNode.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    mountNode.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xf59e0b, 1.5, 10);
    pointLight.position.set(0, 0.5, -2);
    scene.add(pointLight);

    // Group for holding 3D spatial blocks
    const blocksGroup = new THREE.Group();
    scene.add(blocksGroup);

    // Grid Helper
    const gridHelper = new THREE.GridHelper(10, 20, 0x3b82f6, 0x1e293b);
    gridHelper.position.set(0, -1.8, -3);
    scene.add(gridHelper);

    // Map of block meshes
    const meshMap = new Map<string, THREE.Group>();

    // Helper function to create procedural 3D block geometry
    const createBlockMesh = (block: XRBlockData): THREE.Group => {
      const group = new THREE.Group();
      group.name = block.id;

      // Base Glass Cube Frame
      const boxGeo = new THREE.BoxGeometry(0.85, 0.55, 0.15);
      const boxMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(block.color),
        roughness: 0.2,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85,
        clearcoat: 0.8,
        clearcoatRoughness: 0.1
      });
      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      group.add(boxMesh);

      // Glowing Inner Core Ring
      const ringGeo = new THREE.TorusGeometry(0.22, 0.03, 16, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(block.color),
        wireframe: true
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(-0.25, 0, 0.09);
      group.add(ringMesh);

      // Glowing Accent Bevel
      const borderGeo = new THREE.RingGeometry(0.28, 0.31, 32);
      const borderMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const borderMesh = new THREE.Mesh(borderGeo, borderMat);
      borderMesh.position.set(-0.25, 0, 0.095);
      group.add(borderMesh);

      group.position.set(...block.position);
      group.rotation.set(...block.rotation);
      group.scale.set(...block.scale);

      return group;
    };

    // Populate block meshes
    blocks.forEach(b => {
      if (b.visible) {
        const meshGroup = createBlockMesh(b);
        meshMap.set(b.id, meshGroup);
        blocksGroup.add(meshGroup);
      }
    });

    // Sun Sphere Indicator in 3D Space
    const sunDistance = 8;
    const sunPhi = (90 - altitude) * (Math.PI / 180);
    const sunTheta = (azimuth + 180) * (Math.PI / 180);

    const sunGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfcb900 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(
      sunDistance * Math.sin(sunPhi) * Math.cos(sunTheta),
      sunDistance * Math.cos(sunPhi),
      sunDistance * Math.sin(sunPhi) * Math.sin(sunTheta)
    );
    scene.add(sunMesh);

    // Sun Rays / Orbit Arc
    const curvePoints: THREE.Vector3[] = [];
    for (let a = -90; a <= 90; a += 5) {
      const p = (90 - a) * (Math.PI / 180);
      curvePoints.push(new THREE.Vector3(
        sunDistance * Math.sin(p) * Math.cos(sunTheta),
        sunDistance * Math.cos(p),
        sunDistance * Math.sin(p) * Math.sin(sunTheta)
      ));
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const arcMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 0.3,
      gapSize: 0.15,
      scale: 1
    });
    const arcLine = new THREE.Line(arcGeo, arcMat);
    arcLine.computeLineDistances();
    scene.add(arcLine);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const renderTick = () => {
      const elapsed = clock.getElapsedTime();

      // Gentle floating animation for spatial XR blocks
      meshMap.forEach((group, id) => {
        const blockDef = blocks.find(b => b.id === id);
        if (blockDef) {
          const hoverY = Math.sin(elapsed * 1.5 + blockDef.position[0]) * 0.04;
          group.position.y = blockDef.position[1] + hoverY;
          group.rotation.y = blockDef.rotation[1] + Math.sin(elapsed * 0.8) * 0.03;
        }
      });

      // Slowly pulse sun sphere
      const sunScale = 1 + Math.sin(elapsed * 3) * 0.05;
      sunMesh.scale.set(sunScale, sunScale, sunScale);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(renderTick);
    };

    renderTick();

    // Window Resize Handler
    const handleResize = () => {
      if (!mountNode) return;
      camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      scene.clear();
      renderer.dispose();
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement);
      }
    };
  }, [blocks, altitude, azimuth]);

  // Toggle Camera Feed (Passthrough / AR mode)
  const toggleCameraFeed = () => {
    setIsCameraFeedActive(prev => !prev);
  };

  // WebXR Session Start
  const startWebXRSession = async () => {
    if (!('xr' in navigator)) return;
    try {
      const xr = (navigator as any).xr;
      const session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor']
      });
      setIsXRActive(true);
      session.addEventListener('end', () => {
        setIsXRActive(false);
      });
    } catch (e) {
      console.warn('Sessão WebXR não pôde ser iniciada:', e);
      alert('Sessão WebXR AR indisponível no navegador atual. Usando modo Câmera / 3D Full Screen.');
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-slate-950 text-white font-sans overflow-hidden select-none">
      {/* --- VIDEO CAMERA PASSTHROUGH BACKGROUND (Full-Screen Camera Mode) --- */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none z-0 ${
          isCameraFeedActive ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Fallback Camera Simulation Background (if device camera disabled) */}
      {!isCameraFeedActive && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 opacity-60"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 30%, rgba(245, 158, 11, 0.25), rgba(15, 23, 42, 0.95)), linear-gradient(to bottom, #020617, #0f172a)`
          }}
        />
      )}

      {/* --- THREE.JS SPATIAL XR CANVAS VIEWPORT (Edge-to-Edge Full Screen) --- */}
      <div 
        ref={mountRef} 
        className="absolute inset-0 w-full h-full z-10 cursor-grab active:cursor-grabbing"
      />

      {/* --- TOP FLOATING NAVIGATION BAR (Minimalist Glass Overlay) --- */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: App Title & XR Status */}
        <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-xl border border-white/10 px-3.5 py-2 rounded-2xl shadow-xl pointer-events-auto">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 bg-clip-text text-transparent">
                Spatial WebXR Blocks
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full">
                3D XR
              </span>
            </div>
            <span className="text-[9.5px] font-mono text-white/60 truncate max-w-[150px] sm:max-w-[220px]">
              {locationName}
            </span>
          </div>
        </div>

        {/* Right Action Tools: FullScreen Camera Toggle & Location Viewer Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* OPTION TO VIEW LOCATION WHEN REQUESTED */}
          <button
            onClick={() => setShowLocationDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600/80 to-indigo-600/80 hover:from-blue-500 hover:to-indigo-500 text-white font-mono text-xs font-bold rounded-2xl border border-blue-400/40 shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all cursor-pointer"
            title="Ver Detalhes do Local e Posição Solar"
          >
            <MapPin className="w-4 h-4 text-blue-200" />
            <span className="hidden sm:inline">Ver Local</span>
          </button>

          {/* Camera Feed Toggle (Full Screen Real Camera vs 3D Sky) */}
          <button
            onClick={toggleCameraFeed}
            className={`flex items-center gap-1.5 px-3 py-2 font-mono text-xs font-bold rounded-2xl border transition-all cursor-pointer ${
              isCameraFeedActive
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/80 hover:bg-slate-800 border-white/10 text-white/80'
            }`}
            title={isCameraFeedActive ? "Desativar Câmera Passthrough" : "Ativar Câmera Real em Tela Cheia"}
          >
            {isCameraFeedActive ? <Video className="w-4 h-4 text-emerald-400" /> : <VideoOff className="w-4 h-4 text-white/50" />}
            <span className="hidden sm:inline">{isCameraFeedActive ? 'Câmera Ativa' : 'Modo Câmera'}</span>
          </button>

          {/* Toggle Camera Mode Full Screen Viewport */}
          <button
            onClick={() => setIsCameraFullScreen(!isCameraFullScreen)}
            className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-white/10 rounded-2xl text-white/80 hover:text-white transition-colors cursor-pointer"
            title={isCameraFullScreen ? "Restaurar Painéis" : "Tela Cheia Total Câmera"}
          >
            {isCameraFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close App Overlay */}
          <button
            onClick={onClose}
            className="p-2 bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/40 rounded-2xl text-rose-300 transition-colors cursor-pointer"
            title="Fechar Modo WebXR"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* --- INTERACTIVE FLOATING XR BLOCKS CARDS (HUD 2D Projection Overlay) --- */}
      <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4">
        <div />

        {/* Dynamic Display of Active Spatial XR Blocks */}
        {!isHudCollapsed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pointer-events-auto max-w-6xl mx-auto w-full mb-16">
            {blocks.map((block) => (
              <div
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`p-3 rounded-2xl border backdrop-blur-xl transition-all duration-300 cursor-pointer flex flex-col gap-1.5 shadow-xl ${
                  selectedBlockId === block.id
                    ? 'bg-slate-900/90 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.25)] scale-[1.02]'
                    : 'bg-slate-950/70 border-white/10 hover:border-white/30 hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="text-[10px] font-bold font-mono text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block" 
                      style={{ backgroundColor: block.color, boxShadow: `0 0 8px ${block.color}` }}
                    />
                    {block.title}
                  </span>
                  <span className="text-[8px] font-mono text-white/40 uppercase">XR Block</span>
                </div>

                <div className="flex items-baseline justify-between pt-0.5">
                  <span className="text-sm font-extrabold font-mono text-amber-300 truncate">
                    {block.valueText}
                  </span>
                </div>
                <span className="text-[9.5px] font-mono text-white/60 truncate">
                  {block.subText}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- COLLAPSIBLE BOTTOM DOCK (Clean Unobstructed Viewport Discipline) --- */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-3xl w-[94%] flex flex-col items-center gap-2 pointer-events-auto">
        {/* Dock Collapse Toggle Handle */}
        <button
          onClick={() => setIsHudCollapsed(!isHudCollapsed)}
          className="px-3 py-1 bg-slate-950/90 border border-white/10 rounded-t-xl text-[9px] font-mono text-white/60 hover:text-white uppercase tracking-widest flex items-center gap-1 cursor-pointer shadow-lg"
        >
          <span>{isHudCollapsed ? '▲ Expandir Blocos XR' : '▼ Ocultar Interface (Tela Cheia)'}</span>
        </button>

        {!isHudCollapsed && (
          <div className="w-full bg-slate-950/85 backdrop-blur-2xl border border-white/10 p-2.5 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            {/* Quick WebXR AR Session Launcher */}
            <button
              onClick={startWebXRSession}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer flex-shrink-0 ${
                isWebXRSupported
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-800 text-white/50 border border-white/5 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isWebXRSupported ? 'Entrar em WebXR AR' : 'Simulador AR Spatial'}</span>
            </button>

            {/* View Location Details Button */}
            <button
              onClick={() => setShowLocationDrawer(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl text-xs font-mono text-white font-semibold flex items-center gap-2 cursor-pointer flex-shrink-0"
            >
              <Globe className="w-4 h-4 text-blue-400" />
              <span>Inspeção do Local</span>
            </button>

            {/* Toggle Real Camera Feed */}
            <button
              onClick={toggleCameraFeed}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold flex items-center gap-2 cursor-pointer flex-shrink-0 ${
                isCameraFeedActive
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border border-white/10 text-white'
              }`}
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>{isCameraFeedActive ? 'Câmera HD On' : 'Ativar Passthrough'}</span>
            </button>

            {/* Telemetry Summary */}
            <div className="flex items-center gap-3 px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl font-mono text-[10px] text-white/70 flex-shrink-0">
              <div className="flex flex-col">
                <span className="text-[7px] text-white/40 uppercase">Sol Alt</span>
                <span className="font-bold text-amber-300">{altitude.toFixed(1)}°</span>
              </div>
              <div className="w-[1px] h-5 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[7px] text-white/40 uppercase">Azimute</span>
                <span className="font-bold text-sky-300">{azimuth.toFixed(1)}°</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- OPÇÃO PARA VER O LOCAL QUANDO PEDIU (LOCATION INSPECTION DRAWER MODAL) --- */}
      {showLocationDrawer && (
        <div className="fixed inset-0 z-[600] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/40 text-blue-300 flex items-center justify-center shadow-lg">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base font-extrabold font-mono text-white flex items-center gap-2">
                    Inspeção do Local Solicitado
                  </h3>
                  <span className="text-xs font-mono text-white/60">
                    Dados Geográficos & Astrônomicos
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowLocationDrawer(false)}
                className="p-2 text-white/40 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Coordinates & Location Summary Card */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-white/10 flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-white/50 text-[10px] uppercase">Nome do Local</span>
                <span className="font-bold text-amber-300 text-sm">{locationName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[9px] text-white/40 uppercase">Latitude</span>
                  <span className="font-bold text-white">{latitude.toFixed(4)}°</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[9px] text-white/40 uppercase">Longitude</span>
                  <span className="font-bold text-white">{longitude.toFixed(4)}°</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[9px] text-white/40 uppercase">Hora Civil Local</span>
                  <span className="font-bold text-emerald-300">{civilTimeStr}</span>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[9px] text-white/40 uppercase">Hora Solar Aparente</span>
                  <span className="font-bold text-amber-400">{solarTimeStr}</span>
                </div>
              </div>
            </div>

            {/* Astronomical Sun Conditions */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="bg-slate-950 p-3 rounded-2xl border border-white/10 flex items-center gap-3">
                <Sun className="w-6 h-6 text-amber-400 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] text-white/40 uppercase">Nascer do Sol</span>
                  <span className="font-bold text-amber-300">{sunriseStr}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-2xl border border-white/10 flex items-center gap-3">
                <Sun className="w-6 h-6 text-orange-400 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[9px] text-white/40 uppercase">Pôr do Sol</span>
                  <span className="font-bold text-orange-300">{sunsetStr}</span>
                </div>
              </div>
            </div>

            {/* Spatial Positioning Status */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl font-mono text-xs text-amber-200/90 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Blocos Spatial XR alinhados diretamente aos eixos solares e geográficos de <strong>{locationName}</strong>.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowLocationDrawer(false)}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-mono text-xs font-bold rounded-2xl border border-blue-400/30 shadow-lg transition-all cursor-pointer text-center"
              >
                Voltar ao Espaço XR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
