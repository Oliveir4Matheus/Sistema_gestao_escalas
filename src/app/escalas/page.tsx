'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Filter, Search, Calendar, Eye, Edit3 } from 'lucide-react';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import SolicitacaoAlteracaoModal from '@/components/forms/SolicitacaoAlteracaoModal';
import AlteracaoAlertaModal from '@/components/forms/AlteracaoAlertaModal';
import NotificationBadge from '@/components/notifications/NotificationBadge';
import LoadingScreen from '@/components/ui/LoadingScreen';

interface Colaborador {
  id: string;
  matricula: string;
  nome: string;
  responsavel: string;
  departamento: string;
  grupo: string;
  funcao: string;
  cod_escala: string;
  horario_trabalho: string;
}

interface EscalaDia {
  id: string;
  dia: number;
  status: string;
  horario: string;
  alterado: boolean;
}

interface Escala {
  id: string;
  mes: number;
  ano: number;
  colaboradores: Colaborador;
  escala_dias: EscalaDia[];
}

function EscalasContent() {
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<any>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [showSolicitacaoModal, setShowSolicitacaoModal] = useState(false);
  const [selectedCelula, setSelectedCelula] = useState<{
    colaborador: Colaborador;
    dia: number;
    valorAtual: string;
  } | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const recordsPerPage = 200;
  
  const router = useRouter();
  
  // Refs para sincronizar scroll horizontal
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  // Função para verificar permissões de edição por role
  const getEditPermissions = (role: string) => {
    switch (role) {
      case 'analista':
      case 'gerencia':
        return {
          canEdit: true,
          allowedStatuses: ['FR', 'FT', 'TR', 'FC', 'custom'],
          canApplyDirect: true
        };
      case 'supervisor':
        return {
          canEdit: true,
          allowedStatuses: ['FR', 'FT', 'TR', 'FC', 'custom'],
          canApplyDirect: false
        };
      case 'treinamento':
        return {
          canEdit: true,
          allowedStatuses: ['TR', 'DT'], // Pode marcar como treinamento ou dia trabalhado
          canApplyDirect: false
        };
      default:
        return {
          canEdit: false,
          allowedStatuses: [],
          canApplyDirect: false
        };
    }
  };

  useEffect(() => {
    loadEscalas();
    loadUserProfile();
  }, [mes, ano, currentPage]);

  const loadUserProfile = async () => {
    try {
      console.log('🔍 Loading user profile...');
      const token = localStorage.getItem('token');
      console.log('🔑 Token:', token ? 'exists' : 'missing');
      
      if (!token) {
        console.log('❌ No token found');
        return;
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Profile response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('👤 Profile data received:', data);
        console.log('🎭 User object:', data.user);
        console.log('🎭 Direct role:', data.role);
        
        // Tentar múltiplos caminhos para o role
        const role = data.role || data.user?.role || '';
        console.log('🎭 Final role selected:', role);
        setUserRole(role);
      } else {
        console.log('❌ Profile request failed:', response.status);
        const errorText = await response.text();
        console.log('Error details:', errorText);
      }
    } catch (error) {
      console.error('💥 Error loading profile:', error);
    }
  };

  const loadEscalas = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('❌ No token found, redirecting to login');
        router.push('/');
        return;
      }

      console.log('🔵 DT_DEBUG - Loading escalas:', { mes, ano, currentPage, recordsPerPage });

      const response = await fetch('/api/escalas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          mes, 
          ano, 
          page: currentPage, 
          limit: recordsPerPage 
        })
      });

      console.log('🔵 DT_DEBUG - Escalas API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔵 DT_DEBUG - Escalas data received:', {
          escalas_count: data.escalas?.length || 0,
          has_filters: !!data.filters,
          has_pagination: !!data.pagination
        });
        
        setEscalas(data.escalas || []);
        setFilters(data.filters || {});
        
        // Atualizar informações de paginação do backend
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalRecords(data.pagination.totalRecords);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error('🔵 DT_DEBUG - Error loading escalas:', { status: response.status, error: errorData });
        // Não fazer alert aqui para não spammar o usuário
      }
    } catch (error) {
      console.error('🔵 DT_DEBUG - Catch error loading escalas:', error);
      // Tentar recuperar sem quebrar a aplicação
      setEscalas([]);
      setFilters({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const currentDate = new Date(ano, mes - 1);
    
    if (direction === 'prev') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    setMes(currentDate.getMonth() + 1);
    setAno(currentDate.getFullYear());
  };

  const getDaysInMonth = () => {
    return new Date(ano, mes, 0).getDate();
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'text-xs text-gray-500';
    
    switch (status) {
      case 'FR': return 'bg-gray-400 text-white text-xs px-1 py-0.5 rounded shadow-sm';
      case 'FT': return 'bg-red-400 text-white text-xs px-1 py-0.5 rounded shadow-sm';
      case 'TR': return 'bg-orange-400 text-white text-xs px-1 py-0.5 rounded shadow-sm';
      case 'FC': return 'bg-green-400 text-white text-xs px-1 py-0.5 rounded shadow-sm';
      case 'DT': return 'bg-blue-400 text-white text-xs px-1 py-0.5 rounded shadow-sm';
      case 'AFS': return 'bg-red-400 text-white text-xs px-1 py-0.5 rounded shadow-sm';
      case 'FE': return 'bg-yellow-400 text-gray-800 text-xs px-1 py-0.5 rounded shadow-sm';
      default: return 'text-xs text-gray-500 bg-gray-50 px-1 py-0.5 rounded';
    }
  };

  const handleCellClick = (colaborador: Colaborador, dia: number, valorAtual: string) => {
    const permissions = getEditPermissions(userRole);
    
    console.log('🔍 Cell clicked!', { 
      isEditMode, 
      userRole, 
      permissions,
      colaborador: colaborador.nome,
      dia,
      valorAtual
    });
    
    if (!isEditMode) {
      console.log('❌ Click blocked - Not in edit mode');
      return;
    }
    
    if (!permissions.canEdit) {
      console.log('❌ Click blocked - No edit permissions');
      return;
    }
    
    console.log('✅ Opening modal...');
    setSelectedCelula({
      colaborador,
      dia,
      valorAtual
    });
    setShowSolicitacaoModal(true);
  };

  const handleModalClose = () => {
    setShowSolicitacaoModal(false);
    setSelectedCelula(null);
  };

  const handleSolicitacaoSubmit = async (data: any) => {
    console.log('🔵 DT_DEBUG - handleSolicitacaoSubmit START:', { data, userRole });
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ No token, redirecting to login');
      router.push('/');
      return;
    }

    try {
      let response: Response;
      
      // Se é aplicação direta (analista/gerencia), usar API de alteração direta
      if (data.aplicar_direto && ['analista', 'gerencia'].includes(userRole)) {
        console.log('🔵 DT_DEBUG - Using direct API: /api/escalas/alterar');
        
        // Timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        response = await fetch('/api/escalas/alterar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('🔵 DT_DEBUG - Direct API response status:', response.status);

        if (response.ok) {
          const successData = await response.json();
          console.log('🔵 DT_DEBUG - Direct API success:', successData);
          alert('Alteração aplicada com sucesso!');
          handleModalClose();
          loadEscalas();
          return; // IMPORTANTE: retornar aqui
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          console.log('🔵 DT_DEBUG - Direct API error:', errorData);
          alert(`Erro ao aplicar alteração: ${errorData.error || 'Erro desconhecido'}`);
          return; // IMPORTANTE: retornar aqui
        }
      } else {
        // Solicitação normal (supervisor/treinamento)
        console.log('🔵 DT_DEBUG - Using request API: /api/solicitacoes');
        
        // Timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        response = await fetch('/api/solicitacoes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('🔵 DT_DEBUG - Request API response status:', response.status);

        if (response.ok) {
          const successData = await response.json();
          console.log('🔵 DT_DEBUG - Request API success:', successData);
          alert('Solicitação enviada com sucesso! Aguarde a aprovação.');
          handleModalClose();
          return; // IMPORTANTE: retornar aqui
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
          console.log('🔵 DT_DEBUG - Request API error:', errorData);
          alert(`Erro ao enviar solicitação: ${errorData.error || 'Erro desconhecido'}`);
          return; // IMPORTANTE: retornar aqui
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('🔵 DT_DEBUG - REQUEST TIMEOUT');
        alert('Timeout: A operação demorou muito. Tente novamente.');
      } else {
        console.error('🔵 DT_DEBUG - CATCH ERROR:', error);
        alert('Erro ao processar alteração. Verifique o console para detalhes.');
      }
    }
    
    console.log('🔵 DT_DEBUG - handleSolicitacaoSubmit END');
  };

  // Filtrar escalas (agora apenas frontend, paginação vem do backend)
  const filteredEscalas = escalas.filter(escala => {
    const colaborador = escala.colaboradores;
    if (!colaborador) return false;

    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matches = 
        colaborador.nome?.toLowerCase().includes(term) ||
        colaborador.matricula?.toLowerCase().includes(term) ||
        colaborador.grupo?.toLowerCase().includes(term) ||
        colaborador.funcao?.toLowerCase().includes(term);
      
      if (!matches) return false;
    }

    // Filtros ativos
    if (activeFilters.grupo && colaborador.grupo !== activeFilters.grupo) return false;
    if (activeFilters.funcao && colaborador.funcao !== activeFilters.funcao) return false;

    return true;
  });

  // Cálculos de paginação (agora baseados no backend)
  const startIndex = (currentPage - 1) * recordsPerPage + 1;
  const endIndex = Math.min(currentPage * recordsPerPage, totalRecords);
  const displayedEscalas = filteredEscalas; // Já vem paginado do backend

  // Funções de navegação
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset página quando filtros mudam
  const resetPagination = () => {
    setCurrentPage(1);
  };
  
  // Sincronizar scroll horizontal entre cabeçalho e corpo
  const handleHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };
  
  const handleBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Resetar paginação quando filtros ou busca mudam
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, activeFilters]);

  if (isLoading) {
    return <LoadingScreen message="Carregando escalas" />;
  }

  return (
    <div className="min-h-screen bg-gray-25">
      {/* Header - Minimalista */}
      <header className="bg-white border-b border-gray-100">
        <div className="w-[95%] mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-medium text-gray-800">
                Escalas
              </h1>
            </div>
            
            <div className="flex items-center">
              <NotificationBadge 
                userRole={userRole} 
                onClick={() => router.push('/solicitacoes')}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="w-[95%] mx-auto px-4 py-3">
        <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            {/* Month Navigation - Compacto */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => handleMonthChange('prev')}
                className="p-1.5 hover:bg-gray-50 rounded-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <span className="text-sm font-medium min-w-[120px] text-center">
                {new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </span>
              
              <button
                onClick={() => handleMonthChange('next')}
                className="p-1.5 hover:bg-gray-50 rounded-md"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Search and Controls - Compacto */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="text-xs border border-gray-200 rounded-md pl-7 pr-3 py-1.5 w-40"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`text-xs px-2 py-1.5 rounded border transition-colors ${showFilters ? 'bg-blue-25 border-blue-200 text-blue-600' : 'bg-gray-25 border-gray-200 text-gray-500'}`}
              >
                <Filter className="h-3 w-3 inline mr-1" />
                Filtros
              </button>

              {/* Botão Toggle Modo Edição */}
              {['supervisor', 'analista', 'gerencia', 'treinamento'].includes(userRole) && (
                <button
                  onClick={() => {
                    console.log('🔄 Toggle edit mode:', { 
                      from: isEditMode, 
                      to: !isEditMode, 
                      userRole,
                      permissions: getEditPermissions(userRole)
                    });
                    setIsEditMode(!isEditMode);
                  }}
                  className={`text-xs px-2 py-1.5 rounded border transition-all duration-200 ${
                    isEditMode 
                      ? 'bg-orange-25 text-orange-600 border-orange-200 shadow-sm' 
                      : 'bg-gray-25 text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {isEditMode ? (
                    <>
                      <Edit3 className="h-3 w-3 inline mr-1" />
                      Edição
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 inline mr-1" />
                      Visualizar
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Filters Panel - Discreto */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
                  <select
                    className="text-xs border border-gray-200 rounded px-2 py-1.5 w-full bg-white text-gray-700 focus:border-blue-300 focus:ring-0"
                    value={activeFilters.grupo || ''}
                    onChange={(e) => setActiveFilters((prev: any) => ({ ...prev, grupo: e.target.value || undefined }))}
                  >
                    <option value="">Todos</option>
                    {filters.grupos?.map((grupo: string) => (
                      <option key={grupo} value={grupo}>{grupo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Função</label>
                  <select
                    className="text-xs border border-gray-200 rounded px-2 py-1.5 w-full bg-white text-gray-700 focus:border-blue-300 focus:ring-0"
                    value={activeFilters.funcao || ''}
                    onChange={(e) => setActiveFilters((prev: any) => ({ ...prev, funcao: e.target.value || undefined }))}
                  >
                    <option value="">Todas</option>
                    {filters.funcoes?.map((funcao: string) => (
                      <option key={funcao} value={funcao}>{funcao}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Info and Pagination Controls - Compacto */}
        <div className="mb-3 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            {startIndex}-{endIndex} de {totalRecords} | Pág. {currentPage}/{totalPages}
          </p>
          
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className={`px-2 py-1 rounded text-xs ${
                  currentPage === 1 
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-25'
                }`}
              >
                Ant
              </button>
              
              {/* Números das páginas */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-2 py-1 rounded text-xs min-w-[28px] ${
                        currentPage === pageNum
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-25'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`px-2 py-1 rounded text-xs ${
                  currentPage === totalPages 
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-25'
                }`}
              >
                Prox
              </button>
            </div>
          )}
        </div>

        {/* Escalas Table - Estilo Excel com Cabeçalhos Fixos */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm relative">
          {/* Cabeçalho Global Fixo */}
          <div className="sticky top-0 z-30 bg-gray-50 border-b border-gray-200">
            <div className="flex">
              {/* Cabeçalhos das colunas fixas */}
              <div className="flex-shrink-0 border-r border-gray-200">
                <div className="flex bg-gray-50">
                  <div className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-20 border-r border-gray-100">Grupo</div>
                  <div className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-48 border-r border-gray-100">Nome</div>
                  <div className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-32 border-r border-gray-100">Função</div>
                  <div className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-20 border-r border-gray-100">Chapa</div>
                  <div className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-24 border-r border-gray-100">Jornada</div>
                  <div className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-20 border-r border-gray-100">Escala</div>
                  <div className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-20">Status</div>
                </div>
              </div>
              
              {/* Cabeçalhos dos dias com scroll horizontal */}
              <div className="flex-1 overflow-x-auto" ref={headerScrollRef} onScroll={handleHeaderScroll}>
                <div className="flex bg-gray-50" style={{ minWidth: 'max-content' }}>
                  {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map(day => (
                    <div key={day} className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide min-w-[44px] w-11 border-r border-gray-100 flex-shrink-0">
                      {day}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Corpo da tabela com scroll */}
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="flex">
              {/* Dados das colunas fixas */}
              <div className="flex-shrink-0 border-r border-gray-200 bg-white">
                <div>
                  {displayedEscalas.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500 w-96">
                      Nenhuma escala encontrada
                    </div>
                  ) : (
                    displayedEscalas.map((escala, index) => (
                      <div key={`fixed-${escala.id}`} className={`flex hover:bg-gray-25 transition-colors ${index !== displayedEscalas.length - 1 ? 'border-b border-gray-50' : ''}`}>
                        <div className="px-2 py-1.5 text-xs text-gray-700 w-20 border-r border-gray-100">{escala.colaboradores?.grupo || '-'}</div>
                        <div className="px-2 py-1.5 text-xs font-medium text-gray-900 whitespace-nowrap w-48 border-r border-gray-100">{escala.colaboradores?.nome || '-'}</div>
                        <div className="px-2 py-1.5 text-xs text-gray-700 w-32 border-r border-gray-100">{escala.colaboradores?.funcao || '-'}</div>
                        <div className="px-2 py-1.5 text-xs text-gray-700 w-20 border-r border-gray-100">{escala.colaboradores?.matricula || '-'}</div>
                        <div className="px-2 py-1.5 text-xs text-gray-700 w-24 border-r border-gray-100">{escala.colaboradores?.horario_trabalho || '-'}</div>
                        <div className="px-2 py-1.5 text-xs text-gray-700 w-20 border-r border-gray-100">{escala.colaboradores?.cod_escala || '-'}</div>
                        <div className="px-2 py-1.5 text-xs w-20">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            Ativo
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Dados dos dias com scroll horizontal */}
              <div className="flex-1 overflow-x-auto" ref={bodyScrollRef} onScroll={handleBodyScroll}>
                <div style={{ minWidth: 'max-content' }}>
                  {displayedEscalas.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
                      -
                    </div>
                  ) : (
                    displayedEscalas.map((escala, index) => (
                      <div key={`days-${escala.id}`} className={`flex hover:bg-gray-25 transition-colors ${index !== displayedEscalas.length - 1 ? 'border-b border-gray-50' : ''}`}>
                        {Array.from({ length: getDaysInMonth() }, (_, i) => i + 1).map(day => {
                          const diaEscala = escala.escala_dias?.find(d => d.dia === day);
                          const valorAtual = diaEscala?.status || diaEscala?.horario || '-';
                          const permissions = getEditPermissions(userRole);
                          const isClickable = isEditMode && permissions.canEdit;
                          
                          return (
                            <div
                              key={day} 
                              className={`p-0.5 text-center w-11 h-11 min-w-[44px] flex items-center justify-center border-r border-gray-100 flex-shrink-0 ${
                                isClickable ? 'cursor-pointer hover:bg-blue-25 border-2 border-dashed border-transparent hover:border-blue-200' : ''
                              }`}
                              onClick={() => isClickable && handleCellClick(escala.colaboradores, day, valorAtual)}
                              title={isClickable ? "Clique para alterar" : ""}
                            >
                              {diaEscala?.status ? (
                                <div className={`${getStatusColor(diaEscala.status)} w-full h-full flex items-center justify-center rounded text-xs font-medium`}>
                                  {diaEscala.status}
                                  {diaEscala.alterado && <span className="ml-0.5 text-xs">*</span>}
                                </div>
                              ) : diaEscala?.horario ? (
                                <div className={`${getStatusColor(diaEscala.horario)} w-full h-full flex items-center justify-center rounded text-xs font-medium`}>
                                  {diaEscala.horario}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300">-</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Solicitação/Alteração */}
      {(() => {
        console.log('🎭 Modal render check:', { 
          showSolicitacaoModal, 
          selectedCelula: !!selectedCelula,
          userRole 
        });
        return null;
      })()}
      
      {showSolicitacaoModal && selectedCelula && (
        <AlteracaoAlertaModal
          isOpen={showSolicitacaoModal}
          onClose={handleModalClose}
          onSubmit={handleSolicitacaoSubmit}
          colaborador={selectedCelula.colaborador}
          dia={selectedCelula.dia}
          mes={mes}
          ano={ano}
          valorAtual={selectedCelula.valorAtual}
          userRole={userRole}
        />
      )}
    </div>
  );
}

export default function EscalasPage() {
  return (
    <ProtectedRoute>
      <EscalasContent />
    </ProtectedRoute>
  );
}