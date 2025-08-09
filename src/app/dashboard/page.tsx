'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Clock, 
  AlertCircle, 
  Bell,
  Calendar,
  Filter,
  Search,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { User, DashboardStats, Escala, EscalaFilter } from '@/types';

interface SolicitacaoRecente {
  id: string;
  colaborador: {
    nome: string;
  };
  data_escala: string;
  valor_atual: string;
  valor_novo: string;
  motivo: string;
  status: string;
  created_at: string;
}
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import UploadEscalaModal from '@/components/forms/UploadEscalaModal';
import NotificationBadge from '@/components/notifications/NotificationBadge';
import LoadingScreen from '@/components/ui/LoadingScreen';

function DashboardContent() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [filter, setFilter] = useState<EscalaFilter>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [solicitacoesRecentes, setSolicitacoesRecentes] = useState<SolicitacaoRecente[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Carregar dados do usuário
      const userResponse = await fetch('/api/user/profile', { headers });
      let userData = null;

      if (userResponse.ok) {
        userData = await userResponse.json();
        setUser(userData.user);
      } else {
        console.error('Erro ao carregar usuário:', userResponse.status);
        if (userResponse.status === 401) {
          localStorage.removeItem('token');
          router.push('/');
          return;
        }
      }

      // Carregar estatísticas
      const statsResponse = await fetch('/api/dashboard/stats', { headers });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        console.error('Erro ao carregar estatísticas:', statsResponse.status);
      }

      // Carregar escalas - usar POST para evitar URL muito longa
      const escalasResponse = await fetch('/api/escalas', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mes: new Date().getMonth() + 1,
          ano: new Date().getFullYear()
        })
      });

      if (escalasResponse.ok) {
        const escalasData = await escalasResponse.json();
        setEscalas(escalasData.escalas || []);
      } else {
        console.error('Erro ao carregar escalas:', escalasResponse.status);
      }

      // Carregar solicitações recentes (só para supervisor e treinamento)
      if (userData?.user?.role === 'supervisor' || userData?.user?.role === 'treinamento') {
        console.log('🔍 Carregando solicitações para role:', userData.user.role);
        const solicitacoesResponse = await fetch('/api/solicitacoes?limit=5', { headers });
        console.log('📡 Response status solicitações:', solicitacoesResponse.status);
        
        if (solicitacoesResponse.ok) {
          const solicitacoesData = await solicitacoesResponse.json();
          console.log('📋 Dados de solicitações recebidos:', solicitacoesData);
          setSolicitacoesRecentes(solicitacoesData.solicitacoes || []);
        } else {
          const errorData = await solicitacoesResponse.json();
          console.error('❌ Erro ao carregar solicitações:', errorData);
        }
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'aprovado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejeitado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Rejeitado';
      default:
        return status;
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Carregando dashboard" />;
  }

  // Debug log
  console.log('🏠 Dashboard render - User role:', user?.role, 'Solicitações:', solicitacoesRecentes.length);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Sistema de Gestão de Escala
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notificações */}
              <NotificationBadge 
                userRole={user?.role || ''} 
                onClick={() => router.push('/solicitacoes')}
              />
              
              {/* Menu do usuário */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.nome}</p>
                  <p className="text-xs text-gray-500">{user?.role?.toUpperCase()}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-secondary text-sm"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de Colaboradores
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.total_colaboradores || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Solicitações Pendentes
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.solicitacoes_pendentes || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Alterações este Mês
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.alteracoes_mes || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Bell className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Notificações
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats?.notificacoes_nao_lidas || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => router.push('/escalas')}
                className="btn-primary flex items-center space-x-2"
              >
                <Calendar className="h-4 w-4" />
                <span>Ver Escalas</span>
              </button>
              
              {/* Upload Escala - Apenas para analistas */}
              {user?.role === 'analista' && (
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload Escala</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar colaborador..."
                  className="input-field pl-10 w-64"
                />
              </div>
              
              <button className="btn-secondary flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ações Rápidas</h3>
            <div className="space-y-3">
              <button 
                onClick={() => router.push('/escalas')}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Visualizar Escalas</div>
                <div className="text-sm text-gray-500">Ver todas as escalas dos colaboradores</div>
              </button>
              
              {user?.role === 'supervisor' && (
                <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-gray-900">Solicitar Alteração</div>
                  <div className="text-sm text-gray-500">Solicitar mudança na escala</div>
                </button>
              )}
              
              {(user?.role === 'analista' || user?.role === 'gerencia' || user?.role === 'supervisor' || user?.role === 'treinamento') && (
                <button 
                  onClick={() => router.push('/solicitacoes')}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">
                    {(user?.role === 'supervisor' || user?.role === 'treinamento') ? 'Minhas Solicitações' : 'Aprovar Solicitações'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {(user?.role === 'supervisor' || user?.role === 'treinamento') ? 'Ver suas solicitações enviadas' : 'Revisar solicitações pendentes'}
                  </div>
                </button>
              )}

              {user?.role === 'ponto' && (
                <button 
                  onClick={() => router.push('/solicitacoes?status=aprovado')}
                  className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">Solicitações Aprovadas</div>
                  <div className="text-sm text-gray-500">Ver todas as alterações aprovadas para ponto</div>
                </button>
              )}
            </div>
          </div>

          {/* Widget de Solicitações - Só para quem pode fazer solicitações */}
          {(user?.role === 'supervisor' || user?.role === 'treinamento') && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Minhas Solicitações Recentes</h3>
                <button
                  onClick={() => router.push('/solicitacoes')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Ver todas
                </button>
              </div>
              
              <div className="space-y-3">
                {solicitacoesRecentes.length === 0 ? (
                  <div className="text-center py-4">
                    <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <div className="text-sm text-gray-500">
                      Nenhuma solicitação ainda
                    </div>
                    <button
                      onClick={() => router.push('/escalas')}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                    >
                      Fazer nova solicitação
                    </button>
                  </div>
                ) : (
                  solicitacoesRecentes.map((solicitacao) => (
                    <div
                      key={solicitacao.id}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => router.push('/solicitacoes')}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon(solicitacao.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {solicitacao.colaborador.nome}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(solicitacao.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">{solicitacao.valor_atual || '-'}</span>
                          <span className="text-xs text-gray-400">→</span>
                          <span className="text-xs font-medium text-blue-600">{solicitacao.valor_novo}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{solicitacao.motivo}</span>
                          <span className="text-xs font-medium">
                            {getStatusText(solicitacao.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="card p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Atividade Recente</h3>
            <div className="space-y-3">
              <div className="text-sm text-gray-500">
                Nenhuma atividade recente
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      <UploadEscalaModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          setShowUploadModal(false);
          loadDashboardData(); // Recarregar dados após sucesso
        }}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}