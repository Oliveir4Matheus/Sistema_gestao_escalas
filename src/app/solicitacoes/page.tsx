'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Filter, Clock, User, CheckCircle, XCircle, Calendar, MessageSquare, X } from 'lucide-react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { SolicitacaoAlteracao } from '@/types/solicitacoes';
import LoadingScreen from '@/components/ui/LoadingScreen';

interface SolicitacaoComDados extends SolicitacaoAlteracao {
  solicitante: {
    id: string;
    nome: string;
    matricula: string;
  };
  colaborador: {
    id: string;
    nome: string;
    matricula: string;
    funcao: string;
  };
  aprovador?: {
    id: string;
    nome: string;
    matricula: string;
  };
}

function SolicitacoesContent() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoComDados[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [userRole, setUserRole] = useState('');
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<SolicitacaoComDados | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalData, setApprovalData] = useState({
    status: '',
    comentario: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    loadUserProfile();
    loadSolicitacoes();
  }, [statusFilter]);

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const loadSolicitacoes = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/');
        return;
      }

      let url = '/api/solicitacoes';
      if (statusFilter) {
        url += `?status=${statusFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSolicitacoes(data.solicitacoes || []);
      } else if (response.status === 403) {
        alert('Acesso negado. Você não tem permissão para visualizar solicitações.');
        router.push('/dashboard');
      } else {
        console.error('Erro ao carregar solicitações:', response.status);
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = (solicitacao: SolicitacaoComDados, status: 'aprovado' | 'rejeitado') => {
    setSelectedSolicitacao(solicitacao);
    setApprovalData({ status, comentario: '' });
    setShowApprovalModal(true);
  };

  const submitApproval = async () => {
    if (!selectedSolicitacao) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/solicitacoes/${selectedSolicitacao.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: approvalData.status,
          comentario_aprovador: approvalData.comentario
        })
      });

      if (response.ok) {
        alert(`Solicitação ${approvalData.status} com sucesso!`);
        setShowApprovalModal(false);
        loadSolicitacoes(); // Recarregar lista
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Erro ao processar solicitação:', error);
      alert('Erro ao processar solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Pendente
        </span>;
      case 'aprovado':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aprovado
        </span>;
      case 'rejeitado':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Rejeitado
        </span>;
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  const canApprove = ['analista', 'gerencia'].includes(userRole);
  const isPointUser = userRole === 'ponto';

  if (isLoading) {
    return <LoadingScreen message="Carregando solicitações" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-[95%] mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {userRole === 'ponto' ? 'Solicitações Aprovadas' : 'Solicitações de Alteração'}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="w-[95%] mx-auto px-4 py-6">
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            {!isPointUser && (
              <div className="flex items-center space-x-4">
                <Filter className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Filtrar por status:</span>
                <select
                  className="input-field"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="rejeitado">Rejeitado</option>
                </select>
              </div>
            )}
            <div className="text-sm text-gray-600">
              {solicitacoes.length} {isPointUser ? 'solicitações aprovadas' : 'solicitações encontradas'}
            </div>
          </div>
        </div>

        {/* Solicitações Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solicitante</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data Escala</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alteração</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  {canApprove && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {solicitacoes.length === 0 ? (
                  <tr>
                    <td colSpan={canApprove ? 8 : 7} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma solicitação encontrada
                    </td>
                  </tr>
                ) : (
                  solicitacoes.map((solicitacao) => (
                    <tr key={solicitacao.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(solicitacao.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-900">{solicitacao.solicitante.nome}</div>
                          <div className="text-gray-500">Mat: {solicitacao.solicitante.matricula}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-900">{solicitacao.colaborador.nome}</div>
                          <div className="text-gray-500">{solicitacao.colaborador.funcao}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(solicitacao.data_escala).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500">{solicitacao.valor_atual || '-'}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium text-blue-600">{solicitacao.valor_novo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium">{solicitacao.motivo}</div>
                          <div className="text-gray-500 text-xs truncate max-w-32" title={solicitacao.justificativa}>
                            {solicitacao.justificativa}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(solicitacao.status)}
                        {solicitacao.aprovador && (
                          <div className="text-xs text-gray-500 mt-1">
                            Por: {solicitacao.aprovador.nome}
                          </div>
                        )}
                      </td>
                      {canApprove && (
                        <td className="px-4 py-3 text-sm">
                          {solicitacao.status === 'pendente' ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleApproval(solicitacao, 'aprovado')}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Aprovar
                              </button>
                              <button
                                onClick={() => handleApproval(solicitacao, 'rejeitado')}
                                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                Rejeitar
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Processado</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Aprovação/Rejeição */}
      {showApprovalModal && selectedSolicitacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {approvalData.status === 'aprovado' ? 'Aprovar' : 'Rejeitar'} Solicitação
              </h2>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Detalhes da Solicitação:</h3>
                <div className="bg-gray-50 rounded p-3 text-sm">
                  <p><strong>Colaborador:</strong> {selectedSolicitacao.colaborador.nome}</p>
                  <p><strong>Data:</strong> {new Date(selectedSolicitacao.data_escala).toLocaleDateString('pt-BR')}</p>
                  <p><strong>Alteração:</strong> {selectedSolicitacao.valor_atual || '-'} → {selectedSolicitacao.valor_novo}</p>
                  <p><strong>Motivo:</strong> {selectedSolicitacao.motivo}</p>
                  <p><strong>Justificativa:</strong> {selectedSolicitacao.justificativa}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentário {approvalData.status === 'rejeitado' ? '(obrigatório)' : '(opcional)'}
                </label>
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder={`Adicione um comentário sobre a ${approvalData.status === 'aprovado' ? 'aprovação' : 'rejeição'}...`}
                  value={approvalData.comentario}
                  onChange={(e) => setApprovalData(prev => ({ ...prev, comentario: e.target.value }))}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={submitApproval}
                  className={`btn-primary ${approvalData.status === 'rejeitado' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  disabled={isSubmitting || (approvalData.status === 'rejeitado' && !approvalData.comentario.trim())}
                >
                  {isSubmitting ? 'Processando...' : (approvalData.status === 'aprovado' ? 'Aprovar' : 'Rejeitar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SolicitacoesPage() {
  return (
    <ProtectedRoute allowedRoles={['supervisor', 'analista', 'gerencia', 'treinamento', 'ponto']}>
      <SolicitacoesContent />
    </ProtectedRoute>
  );
}