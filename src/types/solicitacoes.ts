export interface SolicitacaoAlteracao {
  id: string;
  solicitante_id: string;
  colaborador_id: string;
  data_escala: string;
  valor_atual: string;
  valor_novo: string;
  motivo: string;
  justificativa: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  comentario_aprovador?: string;
  aprovado_por?: string;
  aprovado_em?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSolicitacaoRequest {
  colaborador_id: string;
  data_escala: string;
  valor_atual: string;
  valor_novo: string;
  motivo: string;
  justificativa: string;
}

export interface UpdateSolicitacaoRequest {
  status: 'aprovado' | 'rejeitado';
  comentario_aprovador?: string;
}

export type MotivoSolicitacao = 
  | 'Atestado'
  | 'Férias'
  | 'Troca'
  | 'Emergência'
  | 'Outros';

export type StatusEscala = 
  | 'FR'  // Folga Remunerada
  | 'FT'  // Falta
  | 'TR'  // Treinamento
  | 'FC'  // Folga Compensatória
  | 'DT'; // Dia Trabalhado