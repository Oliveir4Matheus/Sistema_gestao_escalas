'use client';

import { useState } from 'react';
import { Upload, FileText, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface UploadEscalaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UploadResult {
  success: boolean;
  message: string;
  stats?: {
    colaboradores: number;
    dias: number;
    errors?: string[];
  };
}

export default function UploadEscalaModal({ isOpen, onClose, onSuccess }: UploadEscalaModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Verificar se é um arquivo CSV
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        alert('Por favor, selecione um arquivo CSV.');
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const simulateProgress = () => {
    const phases = [
      { phase: 'Verificando arquivo...', progress: 10 },
      { phase: 'Verificando escalas existentes...', progress: 25 },
      { phase: 'Processando colaboradores...', progress: 45 },
      { phase: 'Importando dias de escala...', progress: 70 },
      { phase: 'Validando dados...', progress: 85 },
      { phase: 'Finalizando...', progress: 95 }
    ];

    let currentPhaseIndex = 0;
    const interval = setInterval(() => {
      if (currentPhaseIndex < phases.length) {
        const current = phases[currentPhaseIndex];
        setUploadPhase(current.phase);
        setUploadProgress(current.progress);
        currentPhaseIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return interval;
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Por favor, selecione um arquivo CSV.');
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setUploadProgress(0);
    setUploadPhase('Iniciando upload...');

    // Iniciar simulação de progresso
    const progressInterval = simulateProgress();

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mes', mes.toString());
      formData.append('ano', ano.toString());

      const token = localStorage.getItem('token');
      const response = await fetch('/api/escalas/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      // Parar simulação e completar progresso
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadPhase('Upload concluído!');

      if (response.ok) {
        setUploadResult({
          success: true,
          message: result.message,
          stats: result.stats,
        });
        
        // Limpar o arquivo após sucesso
        setFile(null);
        
        // Chamar callback de sucesso
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } else {
        setUploadResult({
          success: false,
          message: result.message || 'Erro ao fazer upload da escala',
        });
      }
    } catch (error) {
      // Parar simulação em caso de erro
      clearInterval(progressInterval);
      setUploadResult({
        success: false,
        message: 'Erro de conexão. Tente novamente.',
      });
    } finally {
      setIsUploading(false);
      // Reset progresso após delay
      setTimeout(() => {
        setUploadProgress(0);
        setUploadPhase('');
      }, 3000);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setUploadResult(null);
      setUploadProgress(0);
      setUploadPhase('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload de Escala"
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        {/* Seleção de Mês/Ano */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mês
            </label>
            <select
              className="input-field"
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
              disabled={isUploading}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {new Date(0, month - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ano
            </label>
            <select
              className="input-field"
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value))}
              disabled={isUploading}
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload de Arquivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Arquivo da Escala (CSV)
          </label>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="escala-file"
              disabled={isUploading}
            />
            
            <label
              htmlFor="escala-file"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <Upload className="h-8 w-8 text-gray-400" />
              <div className="text-sm text-gray-600">
                Clique para selecionar ou arraste o arquivo aqui
              </div>
              <div className="text-xs text-gray-500">
                Apenas arquivos CSV são aceitos
              </div>
            </label>
          </div>

          {file && (
            <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
              <FileText className="h-4 w-4" />
              <span>{file.name}</span>
              <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        {/* Barra de Progresso */}
        {isUploading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{uploadPhase}</span>
              <span className="text-gray-500">{uploadProgress}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${uploadProgress}%` }}
              >
                <div className="h-full bg-white bg-opacity-20 animate-pulse"></div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span>Processando arquivo...</span>
              </div>
            </div>
          </div>
        )}

        {/* Resultado do Upload */}
        {uploadResult && (
          <div className={`p-4 rounded-lg ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-start space-x-3">
              {uploadResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {uploadResult.message}
                </p>
                
                {uploadResult.success && uploadResult.stats && (
                  <div className="mt-2 text-sm text-green-700">
                    <p>• {uploadResult.stats.colaboradores} colaboradores processados</p>
                    <p>• {uploadResult.stats.dias} dias de escala importados</p>
                  </div>
                )}
                
                {!uploadResult.success && uploadResult.stats?.errors && (
                  <div className="mt-2 text-sm text-red-700">
                    <p>Erros encontrados:</p>
                    <ul className="list-disc list-inside">
                      {uploadResult.stats.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {uploadResult.stats.errors.length > 5 && (
                        <li>... e mais {uploadResult.stats.errors.length - 5} erros</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Formato esperado do CSV:</p>
              <ul className="text-xs space-y-1">
                <li>• Primeira linha: cabeçalhos</li>
                <li>• Colunas: MATRICULA, NOME, RESPONSAVEL, DEPART, GRUPO, FUNÇÃO, COD_ESCALA</li>
                <li>• Dias do mês: colunas numeradas de 1 a 31</li>
                <li>• Valores: FR, FT, TR, FC ou horário de trabalho</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary"
            disabled={isUploading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUpload}
            className="btn-primary disabled:opacity-50"
            disabled={!file || isUploading}
          >
            {isUploading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processando...</span>
              </div>
            ) : (
              'Fazer Upload'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}