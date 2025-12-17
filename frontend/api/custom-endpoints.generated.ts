// Auto-generated custom API endpoints
// Generated on: 2025-12-16T10:58:10.109Z
// This file contains type definitions for custom API endpoints
// Types are generated from OpenAPI spec when available

import { CustomEndpoint } from './APIClient';

// ============================================
// Parameter Type Definitions
// ============================================

export interface AuthRegisterParams {
  username: string;
  email: string;
  password: string;
}

export interface AuthLoginParams {
  identifier: string;
  password: string;
}

export interface CentrifugoGenerateCentrifugoConnectionTokenParams {

}

export interface CentrifugoGenerateChannelSubscriptionTokenParams {
  chatRoomId: string;
}

export interface FangzhouVideoGenerationFetchPendingTasksParams {}

export interface FangzhouVideoGenerationQueryFangzhouVideoStatusParams {
  apiCallId: string;
}

export interface FangzhouVideoGenerationReportFangzhouVideoResultParams {
  apiCallId: string;
  status: string;
  taskId?: string;
  videoUrl?: string;
  error?: string;
}

export interface Nanobanana2ImageGenerationFetchPendingTasksParams {}

export interface Nanobanana2ImageGenerationQueryNanobanana2StatusParams {
  apiCallId: string;
}

export interface Nanobanana2ImageGenerationReportNanobanana2ResultParams {
  workflowId?: string;
  status: string;
  apiCallId: string;
  externalId?: string;
  imageUrls?: string[];
  error?: string;
}

export interface ObjectStorageGetUploadUrlParams {
  fileName: string;
  contentType?: string;
  expiresIn?: number;
}

export interface VolcDoubaoASRFetchPendingTasksParams {}

export interface VolcDoubaoASRQueryVolcDoubaoASRStatusParams {
  apiCallId: string;
}

export interface VolcDoubaoASRReportVolcDoubaoASRResultParams {
  workflowId?: string;
  status: string;
  apiCallId: string;
  taskId?: string;
  text?: string;
  confidence?: number;
  error?: string;
}

// ============================================
// Response Type Definitions
// ============================================

export interface AuthRegisterResponse {
  success: boolean;
  message: string;
  userId: string;
}

export interface AuthLoginResponse {
  token: string;
  user: {
  id: string;
  username: string;
  email: string;
};
}

export interface CentrifugoGenerateCentrifugoConnectionTokenResponse {
  token: string;
}

export interface CentrifugoGenerateChannelSubscriptionTokenResponse {
  token: string;
  channel: string;
}

export type FangzhouVideoGenerationFetchPendingTasksResponse = any; // TODO: Define specific response type

export interface FangzhouVideoGenerationQueryFangzhouVideoStatusResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface FangzhouVideoGenerationReportFangzhouVideoResultResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export type Nanobanana2ImageGenerationFetchPendingTasksResponse = any; // TODO: Define specific response type

export interface Nanobanana2ImageGenerationQueryNanobanana2StatusResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface Nanobanana2ImageGenerationReportNanobanana2ResultResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ObjectStorageGetUploadUrlResponse {
  success: boolean;
  uploadUrl: string;
  objectKey: string;
  downloadUrl: string;
  expiresAt: number;
}

export type VolcDoubaoASRFetchPendingTasksResponse = any; // TODO: Define specific response type

export interface VolcDoubaoASRQueryVolcDoubaoASRStatusResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VolcDoubaoASRReportVolcDoubaoASRResultResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================
// Endpoint Definitions (Nested by Namespace)
// ============================================

export interface NamespacedCustomEndpoints {
  auth: {
    register: CustomEndpoint;
    login: CustomEndpoint;
  };
  centrifugo: {
    generateCentrifugoConnectionToken: CustomEndpoint;
    generateChannelSubscriptionToken: CustomEndpoint;
  };
  fangzhouVideoGeneration: {
    fetchPendingTasks: CustomEndpoint;
    queryFangzhouVideoStatus: CustomEndpoint;
    reportFangzhouVideoResult: CustomEndpoint;
  };
  nanobanana2ImageGeneration: {
    fetchPendingTasks: CustomEndpoint;
    queryNanobanana2Status: CustomEndpoint;
    reportNanobanana2Result: CustomEndpoint;
  };
  objectStorage: {
    getUploadUrl: CustomEndpoint;
  };
  volcDoubaoASR: {
    fetchPendingTasks: CustomEndpoint;
    queryVolcDoubaoASRStatus: CustomEndpoint;
    reportVolcDoubaoASRResult: CustomEndpoint;
  };
}

export const customEndpoints: NamespacedCustomEndpoints = {
  auth: {
    register: {
      path: 'auth/register',
      method: 'POST' as const,
    },
    login: {
      path: 'auth/login',
      method: 'POST' as const,
    },
  },
  centrifugo: {
    generateCentrifugoConnectionToken: {
      path: 'centrifugo/generateCentrifugoConnectionToken',
      method: 'POST' as const,
    },
    generateChannelSubscriptionToken: {
      path: 'centrifugo/generateChannelSubscriptionToken',
      method: 'POST' as const,
    },
  },
  fangzhouVideoGeneration: {
    fetchPendingTasks: {
      path: 'fangzhouVideoGeneration/fetchPendingTasks',
      method: 'POST' as const,
    },
    queryFangzhouVideoStatus: {
      path: 'fangzhouVideoGeneration/queryFangzhouVideoStatus',
      method: 'POST' as const,
    },
    reportFangzhouVideoResult: {
      path: 'fangzhouVideoGeneration/reportFangzhouVideoResult',
      method: 'POST' as const,
    },
  },
  nanobanana2ImageGeneration: {
    fetchPendingTasks: {
      path: 'nanobanana2ImageGeneration/fetchPendingTasks',
      method: 'POST' as const,
    },
    queryNanobanana2Status: {
      path: 'nanobanana2ImageGeneration/queryNanobanana2Status',
      method: 'POST' as const,
    },
    reportNanobanana2Result: {
      path: 'nanobanana2ImageGeneration/reportNanobanana2Result',
      method: 'POST' as const,
    },
  },
  objectStorage: {
    getUploadUrl: {
      path: 'objectStorage/getUploadUrl',
      method: 'POST' as const,
    },
  },
  volcDoubaoASR: {
    fetchPendingTasks: {
      path: 'volcDoubaoASR/fetchPendingTasks',
      method: 'POST' as const,
    },
    queryVolcDoubaoASRStatus: {
      path: 'volcDoubaoASR/queryVolcDoubaoASRStatus',
      method: 'POST' as const,
    },
    reportVolcDoubaoASRResult: {
      path: 'volcDoubaoASR/reportVolcDoubaoASRResult',
      method: 'POST' as const,
    },
  },
};

// ============================================
// Type-safe API Method Map (Nested by Namespace)
// ============================================

export interface CustomAPIMethodMap {
  auth: {
    register: (params: AuthRegisterParams) => Promise<AuthRegisterResponse>;
    login: (params: AuthLoginParams) => Promise<AuthLoginResponse>;
  };
  centrifugo: {
    generateCentrifugoConnectionToken: (params?: CentrifugoGenerateCentrifugoConnectionTokenParams) => Promise<CentrifugoGenerateCentrifugoConnectionTokenResponse>;
    generateChannelSubscriptionToken: (params: CentrifugoGenerateChannelSubscriptionTokenParams) => Promise<CentrifugoGenerateChannelSubscriptionTokenResponse>;
  };
  fangzhouVideoGeneration: {
    fetchPendingTasks: (params?: FangzhouVideoGenerationFetchPendingTasksParams) => Promise<FangzhouVideoGenerationFetchPendingTasksResponse>;
    queryFangzhouVideoStatus: (params: FangzhouVideoGenerationQueryFangzhouVideoStatusParams) => Promise<FangzhouVideoGenerationQueryFangzhouVideoStatusResponse>;
    reportFangzhouVideoResult: (params: FangzhouVideoGenerationReportFangzhouVideoResultParams) => Promise<FangzhouVideoGenerationReportFangzhouVideoResultResponse>;
  };
  nanobanana2ImageGeneration: {
    fetchPendingTasks: (params?: Nanobanana2ImageGenerationFetchPendingTasksParams) => Promise<Nanobanana2ImageGenerationFetchPendingTasksResponse>;
    queryNanobanana2Status: (params: Nanobanana2ImageGenerationQueryNanobanana2StatusParams) => Promise<Nanobanana2ImageGenerationQueryNanobanana2StatusResponse>;
    reportNanobanana2Result: (params: Nanobanana2ImageGenerationReportNanobanana2ResultParams) => Promise<Nanobanana2ImageGenerationReportNanobanana2ResultResponse>;
  };
  objectStorage: {
    getUploadUrl: (params: ObjectStorageGetUploadUrlParams) => Promise<ObjectStorageGetUploadUrlResponse>;
  };
  volcDoubaoASR: {
    fetchPendingTasks: (params?: VolcDoubaoASRFetchPendingTasksParams) => Promise<VolcDoubaoASRFetchPendingTasksResponse>;
    queryVolcDoubaoASRStatus: (params: VolcDoubaoASRQueryVolcDoubaoASRStatusParams) => Promise<VolcDoubaoASRQueryVolcDoubaoASRStatusResponse>;
    reportVolcDoubaoASRResult: (params: VolcDoubaoASRReportVolcDoubaoASRResultParams) => Promise<VolcDoubaoASRReportVolcDoubaoASRResultResponse>;
  };
}

// Type helpers for extracting parameter and return types
// For namespaced APIs, use CustomAPIMethodParams<'namespace', 'apiName'>
export type CustomAPIMethodParams<
  NS extends keyof CustomAPIMethodMap,
  API extends keyof CustomAPIMethodMap[NS]
> = CustomAPIMethodMap[NS][API] extends (...args: infer P) => any ? P[0] : never;

export type CustomAPIMethodReturn<
  NS extends keyof CustomAPIMethodMap,
  API extends keyof CustomAPIMethodMap[NS]
> = CustomAPIMethodMap[NS][API] extends (...args: any) => infer R ? R : never;
