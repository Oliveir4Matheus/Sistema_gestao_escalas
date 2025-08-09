'use client';

import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Carregando..." }: LoadingScreenProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center relative">
      {/* Subtle background animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-50 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-indigo-50 rounded-full opacity-40 animate-pulse delay-1000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center animate-fade-in">
        {/* Enhanced spinner */}
        <div className="mb-6">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 rounded-full animate-spin mx-auto"></div>
            <div className="absolute top-0 left-0 w-12 h-12 border-3 border-transparent border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
        
        {/* Loading text with dots animation */}
        <p className="text-base text-gray-600 mb-4 animate-fade-in delay-300">
          {message}
          <span className="inline-block w-6 text-left text-blue-500">{dots}</span>
        </p>

        {/* Subtle pulse indicator */}
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>

      {/* Developer credit */}
      <div className="absolute bottom-8 text-center animate-fade-in delay-1000">
        <div className="bg-white/70 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500">
            <span className="text-gray-400">dev by</span>{' '}
            <span className="text-gray-600 font-medium">
              Matheus de Oliveira
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}