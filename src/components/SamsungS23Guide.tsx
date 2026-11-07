import React, { useState } from 'react';
import {
  Smartphone,
  Tablet,
  Download,
  Check,
  Share2,
  PlusSquare,
  Shield,
  Cpu,
  Zap,
  WifiOff,
  X,
  Compass,
  CheckCircle2,
  Laptop
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { soundManager } from '../utils/audio';

interface DeviceInstallGuideProps {
  onClose?: () => void;
}

export const SamsungS23Guide: React.FC<DeviceInstallGuideProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, isSamsungBrowser, isSamsungDevice, install } = usePWAInstall();
  const [deviceTab, setDeviceTab] = useState<'android' | 'ipad' | 'features'>('android');

  const handleInstallClick = async () => {
    soundManager.vibrate(25);
    const success = await install();
    if (success) {
      soundManager.playSuccessSound();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                Instalar BioCheck en tus Dispositivos
              </h2>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 font-mono px-2 py-0.5 rounded-full border border-cyan-800">
                PWA / APK
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Compatible con Samsung S23 Ultra, Android e iPad Air 2 (iOS 15+)
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Device Selection Tabs */}
      <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
        <button
          onClick={() => {
            soundManager.playKeypadClick();
            setDeviceTab('android');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
            deviceTab === 'android'
              ? 'bg-cyan-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Android / S23 Ultra</span>
        </button>

        <button
          onClick={() => {
            soundManager.playKeypadClick();
            setDeviceTab('ipad');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
            deviceTab === 'ipad'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tablet className="w-4 h-4" />
          <span>iPad Air 2 (iOS 15+)</span>
        </button>

        <button
          onClick={() => {
            soundManager.playKeypadClick();
            setDeviceTab('features');
          }}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
            deviceTab === 'features'
              ? 'bg-slate-800 text-cyan-300 shadow-md border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Ventajas</span>
        </button>
      </div>

      {/* TAB 1: Android & Samsung S23 Ultra */}
      {deviceTab === 'android' && (
        <div className="flex flex-col gap-4">
          {/* Main Direct Install Button */}
          {isInstallable && !isInstalled && (
            <div className="bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border border-cyan-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-cyan-400" />
                  Instalar como APK / App Nativa en Android
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Se creará el icono de la aplicación en el menú principal y funcionará a pantalla completa sin barra de navegador.
                </p>
              </div>
              <button
                onClick={handleInstallClick}
                className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-lg transition active:scale-95 shrink-0"
              >
                Instalar Ahora
              </button>
            </div>
          )}

          {isInstalled && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3 text-emerald-200">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <strong>¡App instalada en este dispositivo!</strong> Está ejecutándose en modo autónomo nativo con soporte offline y aceleración gráfica.
              </div>
            </div>
          )}

          {/* Browser-specific steps for Android */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Google Chrome for Android */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                  C
                </div>
                <h5 className="text-xs font-bold text-white">Google Chrome (Android / WebAPK)</h5>
              </div>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Abre esta URL en <strong>Google Chrome</strong> en tu móvil Android o S23 Ultra.</li>
                <li>Toca el menú de <strong>tres puntos verticales (⋮)</strong> en la esquina superior derecha.</li>
                <li>Selecciona <strong>«Instalar aplicación»</strong> o <strong>«Agregar a pantalla principal»</strong>.</li>
                <li>Confirma en <strong>«Instalar»</strong>. El sistema generará el APK nativo.</li>
              </ol>
            </div>

            {/* Samsung Internet Browser */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  S
                </div>
                <h5 className="text-xs font-bold text-white">Samsung Internet (Galaxy One UI)</h5>
              </div>
              <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Abre la aplicación en <strong>Samsung Internet</strong>.</li>
                <li>Toca el botón de <strong>Menú (≡)</strong> abajo a la derecha o la flecha de descarga en la barra de URL.</li>
                <li>Selecciona <strong>«Añadir página a»</strong>.</li>
                <li>Toca <strong>«Pantalla de inicio»</strong> para fijar el icono en One UI.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: iPad Air 2 & iOS 15+ */}
      {deviceTab === 'ipad' && (
        <div className="flex flex-col gap-4">
          <div className="bg-gradient-to-r from-blue-950/70 to-indigo-950/70 border border-blue-500/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
              <Tablet className="w-4 h-4 text-cyan-400" />
              <span>Instalación en iPad Air 2 (iPadOS 15.0.0 a 15.8.x)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              En iPadOS 15, Apple permite instalar aplicaciones web directamente como apps nativas independientes a través de Safari, sin pasar por App Store ni requerir jailbreak.
            </p>
          </div>

          {/* 4-Step Guide with Icons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-700/60 text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">
                1
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  Abrir en Safari
                </h5>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Asegúrate de abrir este enlace en el navegador <strong>Safari</strong> de tu iPad (los navegadores de terceros en iOS no permiten agregar a la pantalla de inicio).
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-700/60 text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">
                2
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                  Tocar botón Compartir
                </h5>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Toca el icono de <strong>Compartir</strong> (un cuadrado con una flecha hacia arriba <span className="font-mono bg-slate-800 px-1 py-0.5 rounded text-cyan-300">[↑]</span>) en la barra superior de Safari.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-700/60 text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">
                3
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <PlusSquare className="w-3.5 h-3.5 text-cyan-400" />
                  «Añadir a pantalla de inicio»
                </h5>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  En el menú de opciones desplegado, desplázate hacia abajo y pulsa <strong>«Añadir a pantalla de inicio»</strong> (o <em>Add to Home Screen</em>).
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-700/60 text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">
                4
              </div>
              <div>
                <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Confirmar y Añadir
                </h5>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Comprueba el nombre <strong>«BioCheck HN»</strong> y pulsa <strong>«Añadir»</strong> en la esquina superior derecha. Se creará el icono de app en el iPad.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-300 flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Compatibilidad iPadOS 15:</strong> La aplicación funcionará a pantalla completa Retina, con cámara web para fotos de enrolamiento y almacenamiento local sin requerir conexión constante a internet.
            </span>
          </div>
        </div>
      )}

      {/* TAB 3: Features & Optimizations */}
      {deviceTab === 'features' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
            <Zap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-white">Pantalla Completa Standalone</h5>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Sin barras de URL ni pestañas de navegador; funciona exactamente como una app nativa descargada de la tienda.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
            <Cpu className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-white">Cámara de Enrolamiento WebRTC</h5>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Captura de fotografía de los colaboradores directamente usando la cámara frontal o trasera de tu iPad o Android.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-white">Modo Offline (Sin Internet)</h5>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Service Worker precachea los modelos 3D y la base de datos para permitir registrar entradas incluso sin señal Wi-Fi.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-white">DNI Honduras & Municipios (Langue, Valle)</h5>
              <p className="text-slate-400 mt-0.5 leading-relaxed">
                Validación de 13 dígitos con reconocimiento municipal (código 1707 para Langue, Valle), evaluación estricta a las 7:30 AM y eliminación individual de marcajes de hoy.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
