"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff, Zap } from "lucide-react";

export function SlowConnectionDetector() {
  const [isVisible, setIsVisible] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'slow' | 'poor'>('good');
  
  useEffect(() => {
    let startTime: number;
    let endTime: number;
    let loadTime: number;
    let timeoutId: NodeJS.Timeout;
    
    // Verificar se estamos no navegador
    if (typeof window === 'undefined') return;

    // Medir o tempo de carregamento da página
    startTime = performance.now();
    
    const checkConnectionSpeed = () => {
      endTime = performance.now();
      loadTime = endTime - startTime;
      
      // Analisar qualidade de conexão
      if (loadTime > 10000) {
        setConnectionQuality('poor');
        setIsVisible(true);
      } else if (loadTime > 5000) {
        setConnectionQuality('slow');
        setIsVisible(true);
      } else {
        setConnectionQuality('good');
      }
    };
    
    // Verificar no evento load
    window.addEventListener('load', checkConnectionSpeed);
    
    // Verificar também a conexão após uma espera
    timeoutId = setTimeout(() => {
      if (navigator.onLine === false) {
        setConnectionQuality('poor');
        setIsVisible(true);
      }
    }, 8000);
    
    // Monitorar eventos de online/offline
    const handleOffline = () => {
      setConnectionQuality('poor');
      setIsVisible(true);
    };
    
    const handleOnline = () => {
      // Fazer uma requisição simples para testar a conexão
      fetch('/api/health-check', { method: 'HEAD', cache: 'no-store' })
        .then(() => {
          setConnectionQuality('good');
          setIsVisible(false);
        })
        .catch(() => {
          setConnectionQuality('slow');
          setIsVisible(true);
        });
    };
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('load', checkConnectionSpeed);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearTimeout(timeoutId);
    };
  }, []);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs">
      <div className={`p-4 rounded-lg shadow-lg animate-in slide-in-from-right duration-300 ${
        connectionQuality === 'poor' 
          ? 'bg-red-900/90 border border-red-700/50' 
          : 'bg-yellow-900/90 border border-yellow-700/50'
      }`}>
        <div className="flex items-start gap-3">
          {connectionQuality === 'poor' ? (
            <WifiOff className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
          ) : (
            <Wifi className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          )}
          
          <div>
            <h3 className="font-medium text-white mb-1">
              {connectionQuality === 'poor' 
                ? 'Problemas de conexão' 
                : 'Conexão lenta detectada'
              }
            </h3>
            
            <p className="text-sm text-white/80 mb-3">
              {connectionQuality === 'poor'
                ? 'Parece que você está offline ou com uma conexão muito instável.'
                : 'O aplicativo está demorando mais que o normal para carregar os dados.'
              }
            </p>
            
            <div className="space-y-2 text-sm">
              <p className="text-white/90 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-yellow-400" />
                Tente:
              </p>
              <ul className="list-disc pl-5 text-white/80 space-y-1">
                <li>Verificar sua conexão com a internet</li>
                <li>Desativar VPN ou proxy, se estiver usando</li>
                <li>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="text-yellow-300 hover:text-yellow-200 underline"
                  >
                    Recarregar a página
                  </button>
                </li>
              </ul>
            </div>
            
            <button 
              onClick={() => setIsVisible(false)}
              className="mt-3 w-full text-center py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
            >
              Fechar aviso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 