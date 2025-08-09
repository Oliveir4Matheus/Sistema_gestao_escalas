import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '@/types';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      matricula: user.matricula,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export function checkPermission(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

export const ROLE_PERMISSIONS = {
  // Analista tem todas as permissões
  analista: ['read', 'write', 'approve', 'admin'],
  
  // Supervisores podem visualizar e solicitar alterações
  supervisor: ['read', 'request'],
  
  // Gerência tem acesso de leitura e algumas aprovações
  gerencia: ['read', 'approve'],
  
  // Outros departamentos têm acesso específico
  treinamento: ['read', 'request'],
  rh: ['read', 'request', 'approve'],
  qhse: ['read'],
  occ: ['read'],
  ponto: ['read', 'approve'],
} as const;