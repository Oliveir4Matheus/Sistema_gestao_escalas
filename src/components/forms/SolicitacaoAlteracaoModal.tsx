'use client';

import { useState } from 'react';
import { X, Calendar, User, Clock } from 'lucide-react';
import { MotivoSolicitacao, StatusEscala } from '@/types/solicitacoes';

interface Colaborador {
  id: string;
  matricula: string;
  nome: string;
  grupo: string;
  funcao: string;
  cod_escala: string;
  horario_trabalho: string;
}

interface SolicitacaoAlteracaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  colaborador: Colaborador;
  dia: number;
  mes: number;
  ano: number;
  valorAtual: string;
}

const motivos: MotivoSolicitacao[] = [
  'Atestado',
  'Férias', 
  'Troca',
  'Emergência',
  'Outros'
];

const statusOptions: { value: StatusEscala | string; label: string }[] = [
  { value: 'FR', label: 'FR - Folga Remunerada' },
  { value: 'FT', label: 'FT - Falta' },
  { value: 'TR', label: 'TR - Treinamento' },
  { value: 'FC', label: 'FC - Folga Compensatória' },
  { value: 'DT', label: 'DT - Dia Trabalhado' },
  { value: 'custom', label: 'Horário Personalizado' }
];

export default function SolicitacaoAlteracaoModal({
  isOpen,
  onClose,
  onSubmit,
  colaborador,
  dia,
  mes,
  ano,
  valorAtual
}: SolicitacaoAlteracaoModalProps) {
  const [formData, setFormData] = useState({
    valor_novo: '',
    horario_personalizado: '',
    motivo: '',
    justificativa: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({});

  if (!isOpen) return null;

  const dataEscala = new Date(ano, mes - 1, dia);
  const dataFormatada = dataEscala.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validações
    const newErrors: any = {};
    
    if (!formData.valor_novo) {
      newErrors.valor_novo = 'Selecione o novo valor';
    }
    
    if (formData.valor_novo === 'custom' && !formData.horario_personalizado) {
      newErrors.horario_personalizado = 'Digite o horário personalizado';
    }
    
    if (!formData.motivo) {
      newErrors.motivo = 'Selecione o motivo';
    }
    
    if (!formData.justificativa.trim()) {
      newErrors.justificativa = 'Digite a justificativa';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const dataEscalaFormatted = `${ano}-${mes.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
      
      console.log('🔵 DT_DEBUG - DATA CONSTRUCTION:', {
        dia_original: dia,
        mes_original: mes,
        ano_original: ano,
        dataEscalaFormatted,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        date_now: new Date(),
        date_test: new Date(dataEscalaFormatted)
      });
      
      const valor_novo_processado = formData.valor_novo === 'DT' ? '' : 
                                    formData.valor_novo === 'custom' ? formData.horario_personalizado : 
                                    formData.valor_novo;
      
      const payload = {
        colaborador_id: colaborador.id,
        data_escala: dataEscalaFormatted,
        valor_atual: valorAtual,
        valor_novo: valor_novo_processado,
        motivo: formData.motivo,
        justificativa: formData.justificativa
      };

      console.log('🔵 DT_DEBUG - SolicitacaoAlteracaoModal PAYLOAD:', {
        original_valor_novo: formData.valor_novo,
        processed_valor_novo: valor_novo_processado,
        isDT: formData.valor_novo === 'DT',
        payload
      });

      console.log('🔵 DT_DEBUG - SolicitacaoAlteracaoModal BEFORE onSubmit');
      await onSubmit(payload);
      console.log('🔵 DT_DEBUG - SolicitacaoAlteracaoModal AFTER onSubmit');
    } catch (error) {
      console.error('🔵 DT_DEBUG - SolicitacaoAlteracaoModal ERROR:', error);
    } finally {
      console.log('🔵 DT_DEBUG - SolicitacaoAlteracaoModal FINALLY - Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    console.log('🔵 DT_DEBUG - SolicitacaoAlteracaoModal:', { field, value, isDT: value === 'DT' });
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: any) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Solicitar Alteração de Escala
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Informações do Colaborador */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="flex items-center text-sm font-medium text-gray-900 mb-3">
              <User className="h-4 w-4 mr-2" />
              Informações do Colaborador
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Nome:</span>
                <span className="ml-2 font-medium">{colaborador.nome}</span>
              </div>
              <div>
                <span className="text-gray-500">Matrícula:</span>
                <span className="ml-2 font-medium">{colaborador.matricula}</span>
              </div>
              <div>
                <span className="text-gray-500">Grupo:</span>
                <span className="ml-2 font-medium">{colaborador.grupo}</span>
              </div>
              <div>
                <span className="text-gray-500">Função:</span>
                <span className="ml-2 font-medium">{colaborador.funcao}</span>
              </div>
            </div>
          </div>

          {/* Data da Alteração */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="flex items-center text-sm font-medium text-gray-900 mb-2">
              <Calendar className="h-4 w-4 mr-2" />
              Data da Alteração
            </h3>
            <p className="text-lg font-semibold text-blue-700">{dataFormatada}</p>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                Valor Atual
              </label>
              <div className="input-field bg-gray-50" style={{ padding: '0.75rem' }}>
                {valorAtual === '-' ? 'Não definido' : valorAtual}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Novo Valor *
              </label>
              <select
                className={`input-field ${errors.valor_novo ? 'border-red-500' : ''}`}
                value={formData.valor_novo}
                onChange={(e) => handleInputChange('valor_novo', e.target.value)}
              >
                <option value="">Selecione o novo valor</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.valor_novo && (
                <p className="text-red-500 text-xs mt-1">{errors.valor_novo}</p>
              )}
            </div>
          </div>

          {/* Horário Personalizado */}
          {formData.valor_novo === 'custom' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horário Personalizado *
              </label>
              <input
                type="text"
                placeholder="Ex: 06:00-14:00, 14:00-22:00"
                className={`input-field ${errors.horario_personalizado ? 'border-red-500' : ''}`}
                value={formData.horario_personalizado}
                onChange={(e) => handleInputChange('horario_personalizado', e.target.value)}
              />
              {errors.horario_personalizado && (
                <p className="text-red-500 text-xs mt-1">{errors.horario_personalizado}</p>
              )}
            </div>
          )}

          {/* Motivo */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo *
            </label>
            <select
              className={`input-field ${errors.motivo ? 'border-red-500' : ''}`}
              value={formData.motivo}
              onChange={(e) => handleInputChange('motivo', e.target.value)}
            >
              <option value="">Selecione o motivo</option>
              {motivos.map(motivo => (
                <option key={motivo} value={motivo}>
                  {motivo}
                </option>
              ))}
            </select>
            {errors.motivo && (
              <p className="text-red-500 text-xs mt-1">{errors.motivo}</p>
            )}
          </div>

          {/* Justificativa */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Justificativa *
            </label>
            <textarea
              rows={4}
              placeholder="Descreva detalhadamente o motivo da alteração..."
              className={`input-field resize-none ${errors.justificativa ? 'border-red-500' : ''}`}
              value={formData.justificativa}
              onChange={(e) => handleInputChange('justificativa', e.target.value)}
            />
            {errors.justificativa && (
              <p className="text-red-500 text-xs mt-1">{errors.justificativa}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}