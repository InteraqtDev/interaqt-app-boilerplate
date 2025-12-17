// Auto-generated API types and metadata
// Generated on: 2025-12-16T10:58:10.994Z
// This file only contains types and interaction definitions
// The actual fetch logic is handled by APIClient

// Strict query parameter types (generated from schema)
import type {
  ViewPublicChannelFeedQueryParams,
  ViewAllChannelsQueryParams,
  ViewOwnChannelsQueryParams,
  ViewChannelMediaContentQueryParams,
  ViewOwnMediaContentQueryParams,
  ViewChannelGenerationTasksQueryParams,
  ViewNanobanana2GenerationStatusQueryParams,
  ViewFangzhouGenerationStatusQueryParams,
  ViewChatRoomMessagesQueryParams,
  ViewChatRoomMembershipQueryParams,
  ViewAvailableChatRoomsQueryParams,
  ViewCommentsOnContentQueryParams,
  ViewCommentCountQueryParams,
  ViewVolcDoubaoASRStatusQueryParams,
  ViewContentWithLikeCountQueryParams,
  ViewUserLikeStatusQueryParams,
  ViewUserLikedContentsQueryParams
} from './attributeQuery-types.generated';

// Response types from interaqt framework
// Query responses always have data field as an array
export interface QueryResponse<T = any> {
  data: T[];
  error?: any;
  effects?: any;
}

// Mutation responses have optional data, error, and effects
export interface MutationResponse<T = any> {
  data?: T;
  error?: any;
  effects?: any;
}

// User query parameters for query-type interactions
// @deprecated Use interaction-specific types from attributeQuery-types.generated.ts instead
// AttributeQueryData is a recursive type that matches interaqt framework's structure
// It can be:
// - A string representing an attribute name (e.g., 'id', 'name', '*')
// - A tuple [relationName, { attributeQuery?: AttributeQueryData }] for nested queries
export type AttributeQueryData = (string | [string, { attributeQuery?: AttributeQueryData }])[];

export interface UserQueryParams {
  match?: {
    key: string;
    value: [string, any];
  };
  attributeQuery?: AttributeQueryData;
  modifier?: {
    limit?: number;
    offset?: number;
    orderBy?: {
      [field: string]: 'ASC' | 'DESC';
    };
  };
}

export interface CreateChannelPayload {
  name?: string;
  initialPrompt: string;
  referenceImageKey: string;
  referenceImageUrl: string;
}

export interface UploadMediaToChannelPayload {
  channelId: string;
  mediaType: string;
  fileKey: string;
  fileName: string;
  contentType: string;
  url: string;
}

export interface GenerateImageFromImagePayload {
  channelId: string;
  sourceImageId: string;
  prompt: string;
}

export interface GenerateVideoFromImagePayload {
  channelId: string;
  firstFrameImageId: string;
  prompt: string;
}

export interface AddMediaToFeedPayload {
  channelId: string;
  mediaContentId: string;
  displayOrder?: number;
}

export interface RemoveMediaFromFeedPayload {
  channelId: string;
  mediaContentId: string;
}

export interface RetryNanobanana2ImageGenerationPayload {
  channelId: string;
  originalCallId: string;
}

export interface RetryFangzhouVideoGenerationPayload {
  channelId: string;
  originalCallId: string;
}

export interface SendChatMessagePayload {
  chatRoomId: string;
  content: string;
}

export interface JoinChatRoomPayload {
  chatRoomId: string;
}

export interface LeaveChatRoomPayload {
  chatRoomId: string;
}

export interface CreateTextCommentPayload {
  mediaContentId: string;
  textContent: string;
}

export interface CreateVoiceCommentPayload {
  mediaContentId: string;
  voiceUrl: string;
  voiceDuration?: number;
}

export interface DeleteCommentPayload {
  commentId: string;
}

export interface RetryVolcDoubaoASRPayload {
  commentId: string;
}

export interface LikeContentPayload {
  mediaContentId: string;
}

export interface UnlikeContentPayload {
  mediaContentId: string;
}

// Interaction metadata for APIClient
export type InteractionType = 'query' | 'mutation';

export interface InteractionDefinition {
  name: string;
  type: InteractionType;
}

export const interactions: Record<string, InteractionDefinition> = {
  ViewPublicChannelFeed: { name: 'ViewPublicChannelFeed', type: 'query' },
  ViewAllChannels: { name: 'ViewAllChannels', type: 'query' },
  ViewOwnChannels: { name: 'ViewOwnChannels', type: 'query' },
  ViewChannelMediaContent: { name: 'ViewChannelMediaContent', type: 'query' },
  ViewOwnMediaContent: { name: 'ViewOwnMediaContent', type: 'query' },
  ViewChannelGenerationTasks: { name: 'ViewChannelGenerationTasks', type: 'query' },
  ViewNanobanana2GenerationStatus: { name: 'ViewNanobanana2GenerationStatus', type: 'query' },
  ViewFangzhouGenerationStatus: { name: 'ViewFangzhouGenerationStatus', type: 'query' },
  CreateChannel: { name: 'CreateChannel', type: 'mutation' },
  UploadMediaToChannel: { name: 'UploadMediaToChannel', type: 'mutation' },
  GenerateImageFromImage: { name: 'GenerateImageFromImage', type: 'mutation' },
  GenerateVideoFromImage: { name: 'GenerateVideoFromImage', type: 'mutation' },
  AddMediaToFeed: { name: 'AddMediaToFeed', type: 'mutation' },
  RemoveMediaFromFeed: { name: 'RemoveMediaFromFeed', type: 'mutation' },
  RetryNanobanana2ImageGeneration: { name: 'RetryNanobanana2ImageGeneration', type: 'mutation' },
  RetryFangzhouVideoGeneration: { name: 'RetryFangzhouVideoGeneration', type: 'mutation' },
  ViewChatRoomMessages: { name: 'ViewChatRoomMessages', type: 'query' },
  ViewChatRoomMembership: { name: 'ViewChatRoomMembership', type: 'query' },
  ViewAvailableChatRooms: { name: 'ViewAvailableChatRooms', type: 'query' },
  SendChatMessage: { name: 'SendChatMessage', type: 'mutation' },
  JoinChatRoom: { name: 'JoinChatRoom', type: 'mutation' },
  LeaveChatRoom: { name: 'LeaveChatRoom', type: 'mutation' },
  ViewCommentsOnContent: { name: 'ViewCommentsOnContent', type: 'query' },
  ViewCommentCount: { name: 'ViewCommentCount', type: 'query' },
  ViewVolcDoubaoASRStatus: { name: 'ViewVolcDoubaoASRStatus', type: 'query' },
  CreateTextComment: { name: 'CreateTextComment', type: 'mutation' },
  CreateVoiceComment: { name: 'CreateVoiceComment', type: 'mutation' },
  DeleteComment: { name: 'DeleteComment', type: 'mutation' },
  RetryVolcDoubaoASR: { name: 'RetryVolcDoubaoASR', type: 'mutation' },
  ViewContentWithLikeCount: { name: 'ViewContentWithLikeCount', type: 'query' },
  ViewUserLikeStatus: { name: 'ViewUserLikeStatus', type: 'query' },
  ViewUserLikedContents: { name: 'ViewUserLikedContents', type: 'query' },
  LikeContent: { name: 'LikeContent', type: 'mutation' },
  UnlikeContent: { name: 'UnlikeContent', type: 'mutation' },
};

// Union types for all payloads
export type AnyPayload = CreateChannelPayload | UploadMediaToChannelPayload | GenerateImageFromImagePayload | GenerateVideoFromImagePayload | AddMediaToFeedPayload | RemoveMediaFromFeedPayload | RetryNanobanana2ImageGenerationPayload | RetryFangzhouVideoGenerationPayload | SendChatMessagePayload | JoinChatRoomPayload | LeaveChatRoomPayload | CreateTextCommentPayload | CreateVoiceCommentPayload | DeleteCommentPayload | RetryVolcDoubaoASRPayload | LikeContentPayload | UnlikeContentPayload;

// Type-safe API method signatures
export interface APIMethodMap {
  ViewPublicChannelFeed: (payload: undefined, query?: ViewPublicChannelFeedQueryParams) => Promise<QueryResponse>;
  ViewAllChannels: (payload: undefined, query?: ViewAllChannelsQueryParams) => Promise<QueryResponse>;
  ViewOwnChannels: (payload: undefined, query?: ViewOwnChannelsQueryParams) => Promise<QueryResponse>;
  ViewChannelMediaContent: (payload: undefined, query?: ViewChannelMediaContentQueryParams) => Promise<QueryResponse>;
  ViewOwnMediaContent: (payload: undefined, query?: ViewOwnMediaContentQueryParams) => Promise<QueryResponse>;
  ViewChannelGenerationTasks: (payload: undefined, query?: ViewChannelGenerationTasksQueryParams) => Promise<QueryResponse>;
  ViewNanobanana2GenerationStatus: (payload: undefined, query?: ViewNanobanana2GenerationStatusQueryParams) => Promise<QueryResponse>;
  ViewFangzhouGenerationStatus: (payload: undefined, query?: ViewFangzhouGenerationStatusQueryParams) => Promise<QueryResponse>;
  CreateChannel: (payload: CreateChannelPayload) => Promise<MutationResponse>;
  UploadMediaToChannel: (payload: UploadMediaToChannelPayload) => Promise<MutationResponse>;
  GenerateImageFromImage: (payload: GenerateImageFromImagePayload) => Promise<MutationResponse>;
  GenerateVideoFromImage: (payload: GenerateVideoFromImagePayload) => Promise<MutationResponse>;
  AddMediaToFeed: (payload: AddMediaToFeedPayload) => Promise<MutationResponse>;
  RemoveMediaFromFeed: (payload: RemoveMediaFromFeedPayload) => Promise<MutationResponse>;
  RetryNanobanana2ImageGeneration: (payload: RetryNanobanana2ImageGenerationPayload) => Promise<MutationResponse>;
  RetryFangzhouVideoGeneration: (payload: RetryFangzhouVideoGenerationPayload) => Promise<MutationResponse>;
  ViewChatRoomMessages: (payload: undefined, query?: ViewChatRoomMessagesQueryParams) => Promise<QueryResponse>;
  ViewChatRoomMembership: (payload: undefined, query?: ViewChatRoomMembershipQueryParams) => Promise<QueryResponse>;
  ViewAvailableChatRooms: (payload: undefined, query?: ViewAvailableChatRoomsQueryParams) => Promise<QueryResponse>;
  SendChatMessage: (payload: SendChatMessagePayload) => Promise<MutationResponse>;
  JoinChatRoom: (payload: JoinChatRoomPayload) => Promise<MutationResponse>;
  LeaveChatRoom: (payload: LeaveChatRoomPayload) => Promise<MutationResponse>;
  ViewCommentsOnContent: (payload: undefined, query?: ViewCommentsOnContentQueryParams) => Promise<QueryResponse>;
  ViewCommentCount: (payload: undefined, query?: ViewCommentCountQueryParams) => Promise<QueryResponse>;
  ViewVolcDoubaoASRStatus: (payload: undefined, query?: ViewVolcDoubaoASRStatusQueryParams) => Promise<QueryResponse>;
  CreateTextComment: (payload: CreateTextCommentPayload) => Promise<MutationResponse>;
  CreateVoiceComment: (payload: CreateVoiceCommentPayload) => Promise<MutationResponse>;
  DeleteComment: (payload: DeleteCommentPayload) => Promise<MutationResponse>;
  RetryVolcDoubaoASR: (payload: RetryVolcDoubaoASRPayload) => Promise<MutationResponse>;
  ViewContentWithLikeCount: (payload: undefined, query?: ViewContentWithLikeCountQueryParams) => Promise<QueryResponse>;
  ViewUserLikeStatus: (payload: undefined, query?: ViewUserLikeStatusQueryParams) => Promise<QueryResponse>;
  ViewUserLikedContents: (payload: undefined, query?: ViewUserLikedContentsQueryParams) => Promise<QueryResponse>;
  LikeContent: (payload: LikeContentPayload) => Promise<MutationResponse>;
  UnlikeContent: (payload: UnlikeContentPayload) => Promise<MutationResponse>;
}

// Type helpers for extracting parameter and return types
export type APIMethodParams<T extends keyof APIMethodMap> = Parameters<APIMethodMap[T]>[0];
export type APIMethodReturn<T extends keyof APIMethodMap> = ReturnType<APIMethodMap[T]>;
