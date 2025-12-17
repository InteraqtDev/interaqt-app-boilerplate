/**
 * Strict AttributeQuery Types
 * 
 * Auto-generated from schema.json
 * Generated: 2025-12-16T10:58:10.561Z
 * Max recursion depth: 3
 * 
 * DO NOT EDIT MANUALLY
 */


// ============== Common Types ==============

/**
 * Match expression for filtering query results
 * Supports nested key paths like 'owner.id' or 'channel.name'
 */
export interface MatchExpression {
  key: string;
  value: [string, any];
}

/**
 * Query modifier for pagination and ordering
 */
export interface QueryModifier {
  limit?: number;
  offset?: number;
  orderBy?: Record<string, 'ASC' | 'DESC' | 'asc' | 'desc'>;
}


// ============== Relation Property Types (for & accessor) ==============

// These types define properties accessible via the & special property in n:n relation queries

export type Channel_feedItems_feedChannels_MediaContentRelationPropertyName = 'id' | 'displayOrder' | 'addedAt';
export type User_joinedChatRooms_members_ChatRoomRelationPropertyName = 'id' | 'joinedAt';
export type UserMediaContentLikeRelationRelationPropertyName = 'id' | 'createdAt';

// ============== Entity AttributeQuery Types ==============

// --- User ---
export type UserPropertyName = 'id' | 'username' | 'email' | 'passwordHash' | 'createdAt';

export type UserAttributeQueryD0 = UserPropertyName;

export type UserRelationQueryD1 =
  | ['channels', { attributeQuery?: ChannelPropertyName[] }]
  | ['mediaContents', { attributeQuery?: MediaContentPropertyName[] }]
  | ['joinedChatRooms', { attributeQuery?: (ChatRoomPropertyName | ['&', { attributeQuery?: User_joinedChatRooms_members_ChatRoomRelationPropertyName[] }])[] }]
  | ['chatMessages', { attributeQuery?: ChatMessagePropertyName[] }]
  | ['comments', { attributeQuery?: CommentPropertyName[] }]
  | ['likedMediaContents', { attributeQuery?: (MediaContentPropertyName | ['&', { attributeQuery?: UserMediaContentLikeRelationRelationPropertyName[] }])[] }];

export type UserAttributeQueryD1 = UserPropertyName | UserRelationQueryD1;

export type UserRelationQueryD2 =
  | ['channels', { attributeQuery?: ChannelAttributeQueryD1[] }]
  | ['mediaContents', { attributeQuery?: MediaContentAttributeQueryD1[] }]
  | ['joinedChatRooms', { attributeQuery?: (ChatRoomAttributeQueryD1 | ['&', { attributeQuery?: User_joinedChatRooms_members_ChatRoomRelationPropertyName[] }])[] }]
  | ['chatMessages', { attributeQuery?: ChatMessageAttributeQueryD1[] }]
  | ['comments', { attributeQuery?: CommentAttributeQueryD1[] }]
  | ['likedMediaContents', { attributeQuery?: (MediaContentAttributeQueryD1 | ['&', { attributeQuery?: UserMediaContentLikeRelationRelationPropertyName[] }])[] }];

export type UserAttributeQueryD2 = UserPropertyName | UserRelationQueryD2;

export type UserRelationQueryD3 =
  | ['channels', { attributeQuery?: ChannelAttributeQueryD2[] }]
  | ['mediaContents', { attributeQuery?: MediaContentAttributeQueryD2[] }]
  | ['joinedChatRooms', { attributeQuery?: (ChatRoomAttributeQueryD2 | ['&', { attributeQuery?: User_joinedChatRooms_members_ChatRoomRelationPropertyName[] }])[] }]
  | ['chatMessages', { attributeQuery?: ChatMessageAttributeQueryD2[] }]
  | ['comments', { attributeQuery?: CommentAttributeQueryD2[] }]
  | ['likedMediaContents', { attributeQuery?: (MediaContentAttributeQueryD2 | ['&', { attributeQuery?: UserMediaContentLikeRelationRelationPropertyName[] }])[] }];

export type UserAttributeQueryD3 = UserPropertyName | UserRelationQueryD3;

/** AttributeQuery type for User with max depth 3 */
export type UserAttributeQuery = UserAttributeQueryD3[];

// --- Channel ---
export type ChannelPropertyName = 'id' | 'name' | 'initialPrompt' | 'createdAt';

export type ChannelAttributeQueryD0 = ChannelPropertyName;

export type ChannelRelationQueryD1 =
  | ['creator', { attributeQuery?: UserPropertyName[] }]
  | ['mediaContents', { attributeQuery?: MediaContentPropertyName[] }]
  | ['feedItems', { attributeQuery?: (MediaContentPropertyName | ['&', { attributeQuery?: Channel_feedItems_feedChannels_MediaContentRelationPropertyName[] }])[] }]
  | ['nanobanana2Calls', { attributeQuery?: Nanobanana2CallPropertyName[] }]
  | ['fangzhouCalls', { attributeQuery?: FangzhouCallPropertyName[] }]
  | ['initialReferenceImage', { attributeQuery?: MediaContentPropertyName[] }]
  | ['chatRoom', { attributeQuery?: ChatRoomPropertyName[] }];

export type ChannelAttributeQueryD1 = ChannelPropertyName | ChannelRelationQueryD1;

export type ChannelRelationQueryD2 =
  | ['creator', { attributeQuery?: UserAttributeQueryD1[] }]
  | ['mediaContents', { attributeQuery?: MediaContentAttributeQueryD1[] }]
  | ['feedItems', { attributeQuery?: (MediaContentAttributeQueryD1 | ['&', { attributeQuery?: Channel_feedItems_feedChannels_MediaContentRelationPropertyName[] }])[] }]
  | ['nanobanana2Calls', { attributeQuery?: Nanobanana2CallAttributeQueryD1[] }]
  | ['fangzhouCalls', { attributeQuery?: FangzhouCallAttributeQueryD1[] }]
  | ['initialReferenceImage', { attributeQuery?: MediaContentAttributeQueryD1[] }]
  | ['chatRoom', { attributeQuery?: ChatRoomAttributeQueryD1[] }];

export type ChannelAttributeQueryD2 = ChannelPropertyName | ChannelRelationQueryD2;

export type ChannelRelationQueryD3 =
  | ['creator', { attributeQuery?: UserAttributeQueryD2[] }]
  | ['mediaContents', { attributeQuery?: MediaContentAttributeQueryD2[] }]
  | ['feedItems', { attributeQuery?: (MediaContentAttributeQueryD2 | ['&', { attributeQuery?: Channel_feedItems_feedChannels_MediaContentRelationPropertyName[] }])[] }]
  | ['nanobanana2Calls', { attributeQuery?: Nanobanana2CallAttributeQueryD2[] }]
  | ['fangzhouCalls', { attributeQuery?: FangzhouCallAttributeQueryD2[] }]
  | ['initialReferenceImage', { attributeQuery?: MediaContentAttributeQueryD2[] }]
  | ['chatRoom', { attributeQuery?: ChatRoomAttributeQueryD2[] }];

export type ChannelAttributeQueryD3 = ChannelPropertyName | ChannelRelationQueryD3;

/** AttributeQuery type for Channel with max depth 3 */
export type ChannelAttributeQuery = ChannelAttributeQueryD3[];

// --- MediaContent ---
export type MediaContentPropertyName = 'id' | 'mediaType' | 'sourceType' | 'url' | 'fileKey' | 'fileName' | 'contentType' | 'generationPrompt' | 'createdAt' | 'likeCount';

export type MediaContentAttributeQueryD0 = MediaContentPropertyName;

export type MediaContentRelationQueryD1 =
  | ['channel', { attributeQuery?: ChannelPropertyName[] }]
  | ['uploader', { attributeQuery?: UserPropertyName[] }]
  | ['feedChannels', { attributeQuery?: (ChannelPropertyName | ['&', { attributeQuery?: Channel_feedItems_feedChannels_MediaContentRelationPropertyName[] }])[] }]
  | ['sourceImage', { attributeQuery?: MediaContentPropertyName[] }]
  | ['derivedContents', { attributeQuery?: MediaContentPropertyName[] }]
  | ['nanobanana2Call', { attributeQuery?: Nanobanana2CallPropertyName[] }]
  | ['fangzhouCall', { attributeQuery?: FangzhouCallPropertyName[] }]
  | ['channelsAsReference', { attributeQuery?: ChannelPropertyName[] }]
  | ['comments', { attributeQuery?: CommentPropertyName[] }]
  | ['likedByUsers', { attributeQuery?: (UserPropertyName | ['&', { attributeQuery?: UserMediaContentLikeRelationRelationPropertyName[] }])[] }];

export type MediaContentAttributeQueryD1 = MediaContentPropertyName | MediaContentRelationQueryD1;

export type MediaContentRelationQueryD2 =
  | ['channel', { attributeQuery?: ChannelAttributeQueryD1[] }]
  | ['uploader', { attributeQuery?: UserAttributeQueryD1[] }]
  | ['feedChannels', { attributeQuery?: (ChannelAttributeQueryD1 | ['&', { attributeQuery?: Channel_feedItems_feedChannels_MediaContentRelationPropertyName[] }])[] }]
  | ['sourceImage', { attributeQuery?: MediaContentAttributeQueryD1[] }]
  | ['derivedContents', { attributeQuery?: MediaContentAttributeQueryD1[] }]
  | ['nanobanana2Call', { attributeQuery?: Nanobanana2CallAttributeQueryD1[] }]
  | ['fangzhouCall', { attributeQuery?: FangzhouCallAttributeQueryD1[] }]
  | ['channelsAsReference', { attributeQuery?: ChannelAttributeQueryD1[] }]
  | ['comments', { attributeQuery?: CommentAttributeQueryD1[] }]
  | ['likedByUsers', { attributeQuery?: (UserAttributeQueryD1 | ['&', { attributeQuery?: UserMediaContentLikeRelationRelationPropertyName[] }])[] }];

export type MediaContentAttributeQueryD2 = MediaContentPropertyName | MediaContentRelationQueryD2;

export type MediaContentRelationQueryD3 =
  | ['channel', { attributeQuery?: ChannelAttributeQueryD2[] }]
  | ['uploader', { attributeQuery?: UserAttributeQueryD2[] }]
  | ['feedChannels', { attributeQuery?: (ChannelAttributeQueryD2 | ['&', { attributeQuery?: Channel_feedItems_feedChannels_MediaContentRelationPropertyName[] }])[] }]
  | ['sourceImage', { attributeQuery?: MediaContentAttributeQueryD2[] }]
  | ['derivedContents', { attributeQuery?: MediaContentAttributeQueryD2[] }]
  | ['nanobanana2Call', { attributeQuery?: Nanobanana2CallAttributeQueryD2[] }]
  | ['fangzhouCall', { attributeQuery?: FangzhouCallAttributeQueryD2[] }]
  | ['channelsAsReference', { attributeQuery?: ChannelAttributeQueryD2[] }]
  | ['comments', { attributeQuery?: CommentAttributeQueryD2[] }]
  | ['likedByUsers', { attributeQuery?: (UserAttributeQueryD2 | ['&', { attributeQuery?: UserMediaContentLikeRelationRelationPropertyName[] }])[] }];

export type MediaContentAttributeQueryD3 = MediaContentPropertyName | MediaContentRelationQueryD3;

/** AttributeQuery type for MediaContent with max depth 3 */
export type MediaContentAttributeQuery = MediaContentAttributeQueryD3[];

// --- Nanobanana2Call ---
export type Nanobanana2CallPropertyName = 'id' | 'status' | 'externalId' | 'requestParams' | 'responseData' | 'createdAt' | 'startedAt' | 'completedAt' | 'attempts' | 'error';

export type Nanobanana2CallAttributeQueryD0 = Nanobanana2CallPropertyName;

export type Nanobanana2CallRelationQueryD1 =
  | ['channel', { attributeQuery?: ChannelPropertyName[] }]
  | ['generatedMediaContents', { attributeQuery?: MediaContentPropertyName[] }];

export type Nanobanana2CallAttributeQueryD1 = Nanobanana2CallPropertyName | Nanobanana2CallRelationQueryD1;

export type Nanobanana2CallRelationQueryD2 =
  | ['channel', { attributeQuery?: ChannelAttributeQueryD1[] }]
  | ['generatedMediaContents', { attributeQuery?: MediaContentAttributeQueryD1[] }];

export type Nanobanana2CallAttributeQueryD2 = Nanobanana2CallPropertyName | Nanobanana2CallRelationQueryD2;

export type Nanobanana2CallRelationQueryD3 =
  | ['channel', { attributeQuery?: ChannelAttributeQueryD2[] }]
  | ['generatedMediaContents', { attributeQuery?: MediaContentAttributeQueryD2[] }];

export type Nanobanana2CallAttributeQueryD3 = Nanobanana2CallPropertyName | Nanobanana2CallRelationQueryD3;

/** AttributeQuery type for Nanobanana2Call with max depth 3 */
export type Nanobanana2CallAttributeQuery = Nanobanana2CallAttributeQueryD3[];

// --- Nanobanana2Event ---
export type Nanobanana2EventPropertyName = 'id' | 'eventType' | 'entityId' | 'externalId' | 'status' | 'createdAt' | 'data';

export type Nanobanana2EventAttributeQueryD0 = Nanobanana2EventPropertyName;

export type Nanobanana2EventAttributeQueryD1 = Nanobanana2EventPropertyName;

export type Nanobanana2EventAttributeQueryD2 = Nanobanana2EventPropertyName;

export type Nanobanana2EventAttributeQueryD3 = Nanobanana2EventPropertyName;

/** AttributeQuery type for Nanobanana2Event with max depth 3 */
export type Nanobanana2EventAttributeQuery = Nanobanana2EventAttributeQueryD3[];

// --- FangzhouCall ---
export type FangzhouCallPropertyName = 'id' | 'status' | 'externalId' | 'requestParams' | 'responseData' | 'createdAt' | 'startedAt' | 'completedAt' | 'attempts' | 'error';

export type FangzhouCallAttributeQueryD0 = FangzhouCallPropertyName;

export type FangzhouCallRelationQueryD1 =
  | ['channel', { attributeQuery?: ChannelPropertyName[] }]
  | ['generatedMediaContent', { attributeQuery?: MediaContentPropertyName[] }];

export type FangzhouCallAttributeQueryD1 = FangzhouCallPropertyName | FangzhouCallRelationQueryD1;

export type FangzhouCallRelationQueryD2 =
  | ['channel', { attributeQuery?: ChannelAttributeQueryD1[] }]
  | ['generatedMediaContent', { attributeQuery?: MediaContentAttributeQueryD1[] }];

export type FangzhouCallAttributeQueryD2 = FangzhouCallPropertyName | FangzhouCallRelationQueryD2;

export type FangzhouCallRelationQueryD3 =
  | ['channel', { attributeQuery?: ChannelAttributeQueryD2[] }]
  | ['generatedMediaContent', { attributeQuery?: MediaContentAttributeQueryD2[] }];

export type FangzhouCallAttributeQueryD3 = FangzhouCallPropertyName | FangzhouCallRelationQueryD3;

/** AttributeQuery type for FangzhouCall with max depth 3 */
export type FangzhouCallAttributeQuery = FangzhouCallAttributeQueryD3[];

// --- FangzhouEvent ---
export type FangzhouEventPropertyName = 'id' | 'eventType' | 'entityId' | 'externalId' | 'status' | 'createdAt' | 'data';

export type FangzhouEventAttributeQueryD0 = FangzhouEventPropertyName;

export type FangzhouEventAttributeQueryD1 = FangzhouEventPropertyName;

export type FangzhouEventAttributeQueryD2 = FangzhouEventPropertyName;

export type FangzhouEventAttributeQueryD3 = FangzhouEventPropertyName;

/** AttributeQuery type for FangzhouEvent with max depth 3 */
export type FangzhouEventAttributeQuery = FangzhouEventAttributeQueryD3[];

// --- ChatRoom ---
export type ChatRoomPropertyName = 'id' | 'createdAt';

export type ChatRoomAttributeQueryD0 = ChatRoomPropertyName;

export type ChatRoomRelationQueryD1 =
  | ['channel', { attributeQuery?: ChannelPropertyName[] }]
  | ['members', { attributeQuery?: (UserPropertyName | ['&', { attributeQuery?: User_joinedChatRooms_members_ChatRoomRelationPropertyName[] }])[] }]
  | ['messages', { attributeQuery?: ChatMessagePropertyName[] }];

export type ChatRoomAttributeQueryD1 = ChatRoomPropertyName | ChatRoomRelationQueryD1;

export type ChatRoomRelationQueryD2 =
  | ['channel', { attributeQuery?: ChannelAttributeQueryD1[] }]
  | ['members', { attributeQuery?: (UserAttributeQueryD1 | ['&', { attributeQuery?: User_joinedChatRooms_members_ChatRoomRelationPropertyName[] }])[] }]
  | ['messages', { attributeQuery?: ChatMessageAttributeQueryD1[] }];

export type ChatRoomAttributeQueryD2 = ChatRoomPropertyName | ChatRoomRelationQueryD2;

export type ChatRoomRelationQueryD3 =
  | ['channel', { attributeQuery?: ChannelAttributeQueryD2[] }]
  | ['members', { attributeQuery?: (UserAttributeQueryD2 | ['&', { attributeQuery?: User_joinedChatRooms_members_ChatRoomRelationPropertyName[] }])[] }]
  | ['messages', { attributeQuery?: ChatMessageAttributeQueryD2[] }];

export type ChatRoomAttributeQueryD3 = ChatRoomPropertyName | ChatRoomRelationQueryD3;

/** AttributeQuery type for ChatRoom with max depth 3 */
export type ChatRoomAttributeQuery = ChatRoomAttributeQueryD3[];

// --- ChatMessage ---
export type ChatMessagePropertyName = 'id' | 'content' | 'createdAt';

export type ChatMessageAttributeQueryD0 = ChatMessagePropertyName;

export type ChatMessageRelationQueryD1 =
  | ['sender', { attributeQuery?: UserPropertyName[] }]
  | ['chatRoom', { attributeQuery?: ChatRoomPropertyName[] }];

export type ChatMessageAttributeQueryD1 = ChatMessagePropertyName | ChatMessageRelationQueryD1;

export type ChatMessageRelationQueryD2 =
  | ['sender', { attributeQuery?: UserAttributeQueryD1[] }]
  | ['chatRoom', { attributeQuery?: ChatRoomAttributeQueryD1[] }];

export type ChatMessageAttributeQueryD2 = ChatMessagePropertyName | ChatMessageRelationQueryD2;

export type ChatMessageRelationQueryD3 =
  | ['sender', { attributeQuery?: UserAttributeQueryD2[] }]
  | ['chatRoom', { attributeQuery?: ChatRoomAttributeQueryD2[] }];

export type ChatMessageAttributeQueryD3 = ChatMessagePropertyName | ChatMessageRelationQueryD3;

/** AttributeQuery type for ChatMessage with max depth 3 */
export type ChatMessageAttributeQuery = ChatMessageAttributeQueryD3[];

// --- Comment ---
export type CommentPropertyName = 'id' | 'commentType' | 'textContent' | 'voiceUrl' | 'voiceDuration' | 'createdAt';

export type CommentAttributeQueryD0 = CommentPropertyName;

export type CommentRelationQueryD1 =
  | ['mediaContent', { attributeQuery?: MediaContentPropertyName[] }]
  | ['author', { attributeQuery?: UserPropertyName[] }]
  | ['volcDoubaoASRCalls', { attributeQuery?: VolcDoubaoASRCallPropertyName[] }];

export type CommentAttributeQueryD1 = CommentPropertyName | CommentRelationQueryD1;

export type CommentRelationQueryD2 =
  | ['mediaContent', { attributeQuery?: MediaContentAttributeQueryD1[] }]
  | ['author', { attributeQuery?: UserAttributeQueryD1[] }]
  | ['volcDoubaoASRCalls', { attributeQuery?: VolcDoubaoASRCallAttributeQueryD1[] }];

export type CommentAttributeQueryD2 = CommentPropertyName | CommentRelationQueryD2;

export type CommentRelationQueryD3 =
  | ['mediaContent', { attributeQuery?: MediaContentAttributeQueryD2[] }]
  | ['author', { attributeQuery?: UserAttributeQueryD2[] }]
  | ['volcDoubaoASRCalls', { attributeQuery?: VolcDoubaoASRCallAttributeQueryD2[] }];

export type CommentAttributeQueryD3 = CommentPropertyName | CommentRelationQueryD3;

/** AttributeQuery type for Comment with max depth 3 */
export type CommentAttributeQuery = CommentAttributeQueryD3[];

// --- VolcDoubaoASRCall ---
export type VolcDoubaoASRCallPropertyName = 'id' | 'status' | 'externalId' | 'requestParams' | 'responseData' | 'createdAt' | 'startedAt' | 'completedAt' | 'attempts' | 'error';

export type VolcDoubaoASRCallAttributeQueryD0 = VolcDoubaoASRCallPropertyName;

export type VolcDoubaoASRCallRelationQueryD1 =
  | ['comment', { attributeQuery?: CommentPropertyName[] }];

export type VolcDoubaoASRCallAttributeQueryD1 = VolcDoubaoASRCallPropertyName | VolcDoubaoASRCallRelationQueryD1;

export type VolcDoubaoASRCallRelationQueryD2 =
  | ['comment', { attributeQuery?: CommentAttributeQueryD1[] }];

export type VolcDoubaoASRCallAttributeQueryD2 = VolcDoubaoASRCallPropertyName | VolcDoubaoASRCallRelationQueryD2;

export type VolcDoubaoASRCallRelationQueryD3 =
  | ['comment', { attributeQuery?: CommentAttributeQueryD2[] }];

export type VolcDoubaoASRCallAttributeQueryD3 = VolcDoubaoASRCallPropertyName | VolcDoubaoASRCallRelationQueryD3;

/** AttributeQuery type for VolcDoubaoASRCall with max depth 3 */
export type VolcDoubaoASRCallAttributeQuery = VolcDoubaoASRCallAttributeQueryD3[];

// --- VolcDoubaoASREvent ---
export type VolcDoubaoASREventPropertyName = 'id' | 'eventType' | 'entityId' | 'externalId' | 'status' | 'createdAt' | 'data';

export type VolcDoubaoASREventAttributeQueryD0 = VolcDoubaoASREventPropertyName;

export type VolcDoubaoASREventAttributeQueryD1 = VolcDoubaoASREventPropertyName;

export type VolcDoubaoASREventAttributeQueryD2 = VolcDoubaoASREventPropertyName;

export type VolcDoubaoASREventAttributeQueryD3 = VolcDoubaoASREventPropertyName;

/** AttributeQuery type for VolcDoubaoASREvent with max depth 3 */
export type VolcDoubaoASREventAttributeQuery = VolcDoubaoASREventAttributeQueryD3[];

// ============== Relation AttributeQuery Types ==============

// --- Channel_feedItems_feedChannels_MediaContent ---
export type Channel_feedItems_feedChannels_MediaContentPropertyName = 'id' | 'displayOrder' | 'addedAt' | 'source' | 'target';

export type Channel_feedItems_feedChannels_MediaContentAttributeQueryD0 = Channel_feedItems_feedChannels_MediaContentPropertyName;

export type Channel_feedItems_feedChannels_MediaContentRelationQueryD1 =
  | ['source', { attributeQuery?: ChannelPropertyName[] }]
  | ['target', { attributeQuery?: MediaContentPropertyName[] }];

export type Channel_feedItems_feedChannels_MediaContentAttributeQueryD1 = Channel_feedItems_feedChannels_MediaContentPropertyName | Channel_feedItems_feedChannels_MediaContentRelationQueryD1;

export type Channel_feedItems_feedChannels_MediaContentRelationQueryD2 =
  | ['source', { attributeQuery?: ChannelAttributeQueryD1[] }]
  | ['target', { attributeQuery?: MediaContentAttributeQueryD1[] }];

export type Channel_feedItems_feedChannels_MediaContentAttributeQueryD2 = Channel_feedItems_feedChannels_MediaContentPropertyName | Channel_feedItems_feedChannels_MediaContentRelationQueryD2;

export type Channel_feedItems_feedChannels_MediaContentRelationQueryD3 =
  | ['source', { attributeQuery?: ChannelAttributeQueryD2[] }]
  | ['target', { attributeQuery?: MediaContentAttributeQueryD2[] }];

export type Channel_feedItems_feedChannels_MediaContentAttributeQueryD3 = Channel_feedItems_feedChannels_MediaContentPropertyName | Channel_feedItems_feedChannels_MediaContentRelationQueryD3;

/** AttributeQuery type for Channel_feedItems_feedChannels_MediaContent relation with max depth 3 */
export type Channel_feedItems_feedChannels_MediaContentAttributeQuery = Channel_feedItems_feedChannels_MediaContentAttributeQueryD3[];

// --- User_joinedChatRooms_members_ChatRoom ---
export type User_joinedChatRooms_members_ChatRoomPropertyName = 'id' | 'joinedAt' | 'source' | 'target';

export type User_joinedChatRooms_members_ChatRoomAttributeQueryD0 = User_joinedChatRooms_members_ChatRoomPropertyName;

export type User_joinedChatRooms_members_ChatRoomRelationQueryD1 =
  | ['source', { attributeQuery?: UserPropertyName[] }]
  | ['target', { attributeQuery?: ChatRoomPropertyName[] }];

export type User_joinedChatRooms_members_ChatRoomAttributeQueryD1 = User_joinedChatRooms_members_ChatRoomPropertyName | User_joinedChatRooms_members_ChatRoomRelationQueryD1;

export type User_joinedChatRooms_members_ChatRoomRelationQueryD2 =
  | ['source', { attributeQuery?: UserAttributeQueryD1[] }]
  | ['target', { attributeQuery?: ChatRoomAttributeQueryD1[] }];

export type User_joinedChatRooms_members_ChatRoomAttributeQueryD2 = User_joinedChatRooms_members_ChatRoomPropertyName | User_joinedChatRooms_members_ChatRoomRelationQueryD2;

export type User_joinedChatRooms_members_ChatRoomRelationQueryD3 =
  | ['source', { attributeQuery?: UserAttributeQueryD2[] }]
  | ['target', { attributeQuery?: ChatRoomAttributeQueryD2[] }];

export type User_joinedChatRooms_members_ChatRoomAttributeQueryD3 = User_joinedChatRooms_members_ChatRoomPropertyName | User_joinedChatRooms_members_ChatRoomRelationQueryD3;

/** AttributeQuery type for User_joinedChatRooms_members_ChatRoom relation with max depth 3 */
export type User_joinedChatRooms_members_ChatRoomAttributeQuery = User_joinedChatRooms_members_ChatRoomAttributeQueryD3[];

// --- UserMediaContentLikeRelation ---
export type UserMediaContentLikeRelationPropertyName = 'id' | 'createdAt' | 'source' | 'target';

export type UserMediaContentLikeRelationAttributeQueryD0 = UserMediaContentLikeRelationPropertyName;

export type UserMediaContentLikeRelationRelationQueryD1 =
  | ['source', { attributeQuery?: UserPropertyName[] }]
  | ['target', { attributeQuery?: MediaContentPropertyName[] }];

export type UserMediaContentLikeRelationAttributeQueryD1 = UserMediaContentLikeRelationPropertyName | UserMediaContentLikeRelationRelationQueryD1;

export type UserMediaContentLikeRelationRelationQueryD2 =
  | ['source', { attributeQuery?: UserAttributeQueryD1[] }]
  | ['target', { attributeQuery?: MediaContentAttributeQueryD1[] }];

export type UserMediaContentLikeRelationAttributeQueryD2 = UserMediaContentLikeRelationPropertyName | UserMediaContentLikeRelationRelationQueryD2;

export type UserMediaContentLikeRelationRelationQueryD3 =
  | ['source', { attributeQuery?: UserAttributeQueryD2[] }]
  | ['target', { attributeQuery?: MediaContentAttributeQueryD2[] }];

export type UserMediaContentLikeRelationAttributeQueryD3 = UserMediaContentLikeRelationPropertyName | UserMediaContentLikeRelationRelationQueryD3;

/** AttributeQuery type for UserMediaContentLikeRelation relation with max depth 3 */
export type UserMediaContentLikeRelationAttributeQuery = UserMediaContentLikeRelationAttributeQueryD3[];

// ============== Interaction Query Parameter Types ==============

export interface ViewPublicChannelFeedQueryParams {
  match?: MatchExpression;
  attributeQuery?: Channel_feedItems_feedChannels_MediaContentAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewAllChannelsQueryParams {
  match?: MatchExpression;
  attributeQuery?: ChannelAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewOwnChannelsQueryParams {
  match?: MatchExpression;
  attributeQuery?: ChannelAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewChannelMediaContentQueryParams {
  match?: MatchExpression;
  attributeQuery?: MediaContentAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewOwnMediaContentQueryParams {
  match?: MatchExpression;
  attributeQuery?: MediaContentAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewChannelGenerationTasksQueryParams {
  match?: MatchExpression;
  attributeQuery?: Nanobanana2CallAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewNanobanana2GenerationStatusQueryParams {
  match?: MatchExpression;
  attributeQuery?: Nanobanana2CallAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewFangzhouGenerationStatusQueryParams {
  match?: MatchExpression;
  attributeQuery?: FangzhouCallAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewChatRoomMessagesQueryParams {
  match?: MatchExpression;
  attributeQuery?: ChatMessageAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewChatRoomMembershipQueryParams {
  match?: MatchExpression;
  attributeQuery?: User_joinedChatRooms_members_ChatRoomAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewAvailableChatRoomsQueryParams {
  match?: MatchExpression;
  attributeQuery?: ChatRoomAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewCommentsOnContentQueryParams {
  match?: MatchExpression;
  attributeQuery?: CommentAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewCommentCountQueryParams {
  match?: MatchExpression;
  attributeQuery?: CommentAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewVolcDoubaoASRStatusQueryParams {
  match?: MatchExpression;
  attributeQuery?: VolcDoubaoASRCallAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewContentWithLikeCountQueryParams {
  match?: MatchExpression;
  attributeQuery?: MediaContentAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewUserLikeStatusQueryParams {
  match?: MatchExpression;
  attributeQuery?: UserMediaContentLikeRelationAttributeQuery;
  modifier?: QueryModifier;
}

export interface ViewUserLikedContentsQueryParams {
  match?: MatchExpression;
  attributeQuery?: UserMediaContentLikeRelationAttributeQuery;
  modifier?: QueryModifier;
}

// ============== Query Type Map ==============

/**
 * Map of interaction names to their query parameter types
 */
export interface QueryInteractionMap {
  ViewPublicChannelFeed: ViewPublicChannelFeedQueryParams;
  ViewAllChannels: ViewAllChannelsQueryParams;
  ViewOwnChannels: ViewOwnChannelsQueryParams;
  ViewChannelMediaContent: ViewChannelMediaContentQueryParams;
  ViewOwnMediaContent: ViewOwnMediaContentQueryParams;
  ViewChannelGenerationTasks: ViewChannelGenerationTasksQueryParams;
  ViewNanobanana2GenerationStatus: ViewNanobanana2GenerationStatusQueryParams;
  ViewFangzhouGenerationStatus: ViewFangzhouGenerationStatusQueryParams;
  ViewChatRoomMessages: ViewChatRoomMessagesQueryParams;
  ViewChatRoomMembership: ViewChatRoomMembershipQueryParams;
  ViewAvailableChatRooms: ViewAvailableChatRoomsQueryParams;
  ViewCommentsOnContent: ViewCommentsOnContentQueryParams;
  ViewCommentCount: ViewCommentCountQueryParams;
  ViewVolcDoubaoASRStatus: ViewVolcDoubaoASRStatusQueryParams;
  ViewContentWithLikeCount: ViewContentWithLikeCountQueryParams;
  ViewUserLikeStatus: ViewUserLikeStatusQueryParams;
  ViewUserLikedContents: ViewUserLikedContentsQueryParams;
}

/**
 * Helper type to get the AttributeQuery type for an interaction
 */
export type InteractionAttributeQuery<T extends keyof QueryInteractionMap> = 
  QueryInteractionMap[T]['attributeQuery'];


// ============== Backward Compatibility ==============

/**
 * Legacy loose AttributeQuery type for backward compatibility
 * @deprecated Use interaction-specific types instead (e.g., ChannelAttributeQuery)
 */
export type AttributeQueryDataLegacy = (string | [string, { attributeQuery?: AttributeQueryDataLegacy }])[];
