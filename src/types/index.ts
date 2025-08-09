export type UserRole = 
  | 'supervisor'
  | 'analista'
  | 'gerencia'
  | 'treinamento'
  | 'rh'
  | 'qhse'
  | 'occ'
  | 'ponto';

export type StatusType = 'FR' | 'FT' | 'TR' | 'FC' | 'DT';

export type RequestStatus = 'pendente' | 'aprovado' | 'rejeitado';

export type SpecialChangeType = 'responsavel' | 'departamento' | 'funcao' | 'jornada' | 'cod_escala';

export interface User {
  id: string;
  matricula: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  primeiro_acesso: boolean;
  created_at: string;
  updated_at: string;
}

export interface Colaborador {
  id: string;
  matricula: string;
  nome: string;
  responsavel?: string;
  departamento?: string;
  grupo?: string;
  funcao?: string;
  cod_escala?: string;
  horario_trabalho?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Escala {
  id: string;
  colaborador_id: string;
  mes: number;
  ano: number;
  upload_file_name?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at: string;
  colaborador?: Colaborador;
  dias?: EscalaDia[];
}

export interface EscalaDia {
  id: string;
  escala_id: string;
  dia: number;
  status?: StatusType;
  horario?: string;
  observacao?: string;
  alterado: boolean;
  alterado_por?: string;
  alterado_em?: string;
  created_at: string;
  updated_at: string;
}

export interface SolicitacaoAlteracao {
  id: string;
  solicitante_id: string;
  colaborador_id: string;
  escala_dia_id?: string;
  tipo_alteracao: StatusType;
  dia: number;
  mes: number;
  ano: number;
  motivo: string;
  status: RequestStatus;
  aprovado_por?: string;
  motivo_rejeicao?: string;
  created_at: string;
  updated_at: string;
  solicitante?: User;
  colaborador?: Colaborador;
  aprovador?: User;
}

export interface SolicitacaoEspecial {
  id: string;
  solicitante_id: string;
  colaborador_id: string;
  tipo_alteracao: SpecialChangeType;
  valor_atual?: string;
  valor_novo: string;
  motivo: string;
  status: RequestStatus;
  aprovado_por?: string;
  motivo_rejeicao?: string;
  created_at: string;
  updated_at: string;
  solicitante?: User;
  colaborador?: Colaborador;
  aprovador?: User;
}

export interface Notificacao {
  id: string;
  usuario_id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  solicitacao_id?: string;
  created_at: string;
}

export interface UsuarioAlteracoes {
  id: string;
  usuario_id: string;
  mes: number;
  ano: number;
  total_alteracoes: number;
  updated_at: string;
}

export interface EscalaFilter {
  responsavel?: string;
  departamento?: string;
  grupo?: string;
  funcao?: string;
  cod_escala?: string;
  mes?: number;
  ano?: number;
}

export interface DashboardStats {
  total_colaboradores: number;
  solicitacoes_pendentes: number;
  alteracoes_mes: number;
  notificacoes_nao_lidas: number;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  supervisor: 'Supervisor',
  analista: 'Analista',
  gerencia: 'Gerência',
  treinamento: 'Treinamento',
  rh: 'RH',
  qhse: 'QHSE',
  occ: 'OCC',
  ponto: 'Ponto'
};

export const STATUS_TYPE_LABELS: Record<StatusType, string> = {
  FR: 'Folga Remunerada',
  FT: 'Falta',
  TR: 'Treinamento',
  FC: 'Folga Compensatória',
  DT: 'Dia Trabalhado'
};

export const STATUS_TYPE_COLORS: Record<StatusType, string> = {
  FR: 'bg-status-fr text-white',
  FT: 'bg-status-ft text-white',
  TR: 'bg-status-tr text-white',
  FC: 'bg-status-fc text-white',
  DT: 'bg-blue-500 text-white'
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado'
};

export const SPECIAL_CHANGE_TYPE_LABELS: Record<SpecialChangeType, string> = {
  responsavel: 'Responsável',
  departamento: 'Departamento',
  funcao: 'Função',
  jornada: 'Jornada',
  cod_escala: 'Código da Escala'
};