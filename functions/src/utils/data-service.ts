/**
 * DataService - Camada de abstração para acesso a dados dual-mode
 * 
 * DUAL-MODE PERMANENTE:
 * - Modo "legacy": Acessa coleções raiz (alunos/, mentores/, etc.)
 *   Usado pela mentoria original do Mário Machado.
 *   NUNCA alterado, NUNCA migrado.
 * 
 * - Modo "multi-tenant": Acessa subcoleções (mentorias/{id}/alunos/, etc.)
 *   Usado por novos clientes white label.
 * 
 * REGRA DE OURO: Código legacy NUNCA é alterado.
 * Este serviço é usado APENAS por novas funcionalidades e pelo gestor.
 */

import * as admin from "firebase-admin";
import { MentoriaConfig, MentoriaLimites, MentoriaPlan, LIMITES_POR_PLANO } from "../types/mentoria";

const db = admin.firestore();

// ID fixo da mentoria legacy (Mário Machado)
export const LEGACY_MENTORIA_ID = "mentoria-mario";

export class DataService {
  private mentoriaId: string;
  private config: MentoriaConfig | null = null;

  constructor(mentoriaId: string) {
    this.mentoriaId = mentoriaId;
  }

  async loadConfig(): Promise<MentoriaConfig | null> {
    const configDoc = await db.doc(`mentorias/${this.mentoriaId}`).get();
    if (configDoc.exists) {
      this.config = { id: configDoc.id, ...configDoc.data() } as MentoriaConfig;
    }
    return this.config;
  }

  isLegacy(): boolean {
    return this.mentoriaId === LEGACY_MENTORIA_ID || 
           !this.config || 
           this.config.modo === "legacy";
  }

  getCollectionPath(collectionName: string): string {
    if (this.isLegacy()) {
      return collectionName;
    }
    return `mentorias/${this.mentoriaId}/${collectionName}`;
  }

  collection(collectionName: string): FirebaseFirestore.CollectionReference {
    return db.collection(this.getCollectionPath(collectionName));
  }

  doc(collectionName: string, docId: string): FirebaseFirestore.DocumentReference {
    return db.doc(`${this.getCollectionPath(collectionName)}/${docId}`);
  }

  subcollection(
    collectionName: string,
    docId: string,
    subcollectionName: string
  ): FirebaseFirestore.CollectionReference {
    return db.collection(
      `${this.getCollectionPath(collectionName)}/${docId}/${subcollectionName}`
    );
  }

  getMentoriaId(): string {
    return this.mentoriaId;
  }

  getConfig(): MentoriaConfig | null {
    return this.config;
  }
}

export async function detectMentoriaForUser(uid: string): Promise<string> {
  const userDoc = await db.doc(`users/${uid}`).get();
  if (userDoc.exists) {
    const data = userDoc.data();
    if (data?.mentoriaId) {
      return data.mentoriaId;
    }
  }
  return LEGACY_MENTORIA_ID;
}

export async function createDataServiceForUser(uid: string): Promise<DataService> {
  const mentoriaId = await detectMentoriaForUser(uid);
  const service = new DataService(mentoriaId);
  await service.loadConfig();
  return service;
}

export async function createDataServiceForMentoria(mentoriaId: string): Promise<DataService> {
  const service = new DataService(mentoriaId);
  await service.loadConfig();
  return service;
}

export async function listAllMentorias(): Promise<MentoriaConfig[]> {
  const snapshot = await db.collection("mentorias").get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MentoriaConfig[];
}

export async function createMentoria(
  id: string,
  config: {
    nome: string;
    plano: MentoriaPlan;
    branding: MentoriaConfig["branding"];
    limites?: Partial<MentoriaLimites>;
    gestorId: string;
    gestorNome?: string;
    gestorEmail?: string;
  }
): Promise<void> {
  const limitesPadrao = LIMITES_POR_PLANO[config.plano];
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.doc(`mentorias/${id}`).set({
    nome: config.nome,
    modo: "multi-tenant",
    status: "ativo",
    plano: config.plano,
    branding: config.branding,
    limites: { ...limitesPadrao, ...(config.limites || {}) },
    gestorId: config.gestorId,
    gestorNome: config.gestorNome || "",
    gestorEmail: config.gestorEmail || "",
    criadoEm: now,
    atualizadoEm: now,
  });
}

export async function updateMentoria(
  id: string,
  updates: Partial<Omit<MentoriaConfig, "id" | "criadoEm">>
): Promise<void> {
  await db.doc(`mentorias/${id}`).update({
    ...updates,
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function getMentoriaStats(mentoriaId: string): Promise<{
  alunosAtivos: number;
  alunosInativos: number;
  mentoresAtivos: number;
}> {
  const service = new DataService(mentoriaId);
  await service.loadConfig();

  const alunosSnapshot = await service.collection("alunos").get();
  const mentoresSnapshot = await service.collection("mentores").get();

  let alunosAtivos = 0;
  let alunosInativos = 0;
  alunosSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.ativo === false) {
      alunosInativos++;
    } else {
      alunosAtivos++;
    }
  });

  return {
    alunosAtivos,
    alunosInativos,
    mentoresAtivos: mentoresSnapshot.size,
  };
}
