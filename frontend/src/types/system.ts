export interface SapSystem {
  id: string;
  name: string;
  url: string;
  user: string;
  client: string;
  language: string;
  allowUnauthorizedCerts: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSystemInput {
  name: string;
  url: string;
  user: string;
  password: string;
  client?: string;
  language?: string;
  allowUnauthorizedCerts?: boolean;
}
