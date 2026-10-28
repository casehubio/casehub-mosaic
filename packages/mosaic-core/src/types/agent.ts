import type { Manifest } from './manifest.js';
import type { MbtiType, EnneagramType, DiscType, BelbinType, SdiType, BigFiveDimension, BigFivePole } from './personality-vocab.js';

export interface PersonalityProfile {
  profession?: string;
  role?: string;
  mbti?: MbtiType;
  enneagram?: EnneagramType;
  disc?: DiscType;
  belbin?: { primary: BelbinType; secondaries: BelbinType[] };
  sdi?: SdiType;
  bigFive?: Partial<Record<BigFiveDimension, BigFivePole>>;
}

export interface FullAgentDescriptor {
  readonly agentId: string;
  readonly name: string;
  readonly tenancyId: string;
  readonly archetypeFamily?: string;
  readonly subArchetype?: string;
  readonly archetypeAdjectives?: readonly string[];
  readonly avatar?: string;
  readonly description?: string;
  readonly personality?: PersonalityProfile;
  readonly manifest?: Manifest;
  readonly preferredAlias?: string;
  readonly profession?: string;
  readonly role?: string;
}
