/**
 * Strict AttributeQuery Zod Schemas
 * 
 * Auto-generated from schema.json
 * Generated: 2025-12-16T10:58:10.770Z
 * Default max recursion depth: 3
 * 
 * DO NOT EDIT MANUALLY
 */

import { z } from 'zod';


// ============== Common Types ==============

/**
 * Safe parse result type (re-exported from Zod for convenience)
 */
export type SafeParseResult = z.ZodSafeParseResult<any>;

// ============== Common Schemas ==============

/**
 * Match expression schema for filtering query results
 */
export const MatchExpressionSchema = z.object({
  key: z.string(),
  value: z.tuple([z.string(), z.any()])
});

/**
 * Order direction enum schema
 */
export const OrderDirectionSchema = z.enum(['ASC', 'DESC', 'asc', 'desc']);

/**
 * Query modifier schema for pagination and ordering
 */
export const QueryModifierSchema = z.object({
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  orderBy: z.record(z.string(), OrderDirectionSchema).optional()
});


// ============== Entity Property Schemas ==============

const UserPropertyNameSchema = z.enum(['id', 'username', 'email', 'passwordHash', 'createdAt']);
const ChannelPropertyNameSchema = z.enum(['id', 'name', 'initialPrompt', 'createdAt']);
const MediaContentPropertyNameSchema = z.enum(['id', 'mediaType', 'sourceType', 'url', 'fileKey', 'fileName', 'contentType', 'generationPrompt', 'createdAt', 'likeCount']);
const Nanobanana2CallPropertyNameSchema = z.enum(['id', 'status', 'externalId', 'requestParams', 'responseData', 'createdAt', 'startedAt', 'completedAt', 'attempts', 'error']);
const Nanobanana2EventPropertyNameSchema = z.enum(['id', 'eventType', 'entityId', 'externalId', 'status', 'createdAt', 'data']);
const FangzhouCallPropertyNameSchema = z.enum(['id', 'status', 'externalId', 'requestParams', 'responseData', 'createdAt', 'startedAt', 'completedAt', 'attempts', 'error']);
const FangzhouEventPropertyNameSchema = z.enum(['id', 'eventType', 'entityId', 'externalId', 'status', 'createdAt', 'data']);
const ChatRoomPropertyNameSchema = z.enum(['id', 'createdAt']);
const ChatMessagePropertyNameSchema = z.enum(['id', 'content', 'createdAt']);
const CommentPropertyNameSchema = z.enum(['id', 'commentType', 'textContent', 'voiceUrl', 'voiceDuration', 'createdAt']);
const VolcDoubaoASRCallPropertyNameSchema = z.enum(['id', 'status', 'externalId', 'requestParams', 'responseData', 'createdAt', 'startedAt', 'completedAt', 'attempts', 'error']);
const VolcDoubaoASREventPropertyNameSchema = z.enum(['id', 'eventType', 'entityId', 'externalId', 'status', 'createdAt', 'data']);

// ============== Relation Property Schemas (for & accessor) ==============

const Channel_feedItems_feedChannels_MediaContentRelationPropertyNameSchema = z.enum(['id', 'displayOrder', 'addedAt']);
const User_joinedChatRooms_members_ChatRoomRelationPropertyNameSchema = z.enum(['id', 'joinedAt']);
const UserMediaContentLikeRelationRelationPropertyNameSchema = z.enum(['id', 'createdAt']);

// ============== Relation Property Schemas ==============

const Channel_feedItems_feedChannels_MediaContentPropertyNameSchema = z.enum(['id', 'displayOrder', 'addedAt', 'source', 'target']);
const User_joinedChatRooms_members_ChatRoomPropertyNameSchema = z.enum(['id', 'joinedAt', 'source', 'target']);
const UserMediaContentLikeRelationPropertyNameSchema = z.enum(['id', 'createdAt', 'source', 'target']);

// ============== Entity AttributeQuery Schema Factories ==============

/**
 * Create AttributeQuery schema for User with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createUserAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return UserPropertyNameSchema;
    }

    
    // At depth > 0, allow property names and relation queries
    // For n:n relations with properties, also support '&' special property for relation fields
    return z.union([
      UserPropertyNameSchema,
      z.tuple([
        z.literal('channels'),
        z.object({
          attributeQuery: createChannelAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('mediaContents'),
        z.object({
          attributeQuery: createMediaContentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('joinedChatRooms'),
        z.object({
          attributeQuery: z.array(z.union([
            ChatRoomPropertyNameSchema,
            // '&' special property for accessing relation-specific fields
            z.tuple([
              z.literal('&'),
              z.object({
                attributeQuery: z.array(User_joinedChatRooms_members_ChatRoomRelationPropertyNameSchema).optional()
              })
            ])
          ])).optional()
        })
      ]),
      z.tuple([
        z.literal('chatMessages'),
        z.object({
          attributeQuery: createChatMessageAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('comments'),
        z.object({
          attributeQuery: createCommentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('likedMediaContents'),
        z.object({
          attributeQuery: z.array(z.union([
            MediaContentPropertyNameSchema,
            // '&' special property for accessing relation-specific fields
            z.tuple([
              z.literal('&'),
              z.object({
                attributeQuery: z.array(UserMediaContentLikeRelationRelationPropertyNameSchema).optional()
              })
            ])
          ])).optional()
        })
      ]),
    ]);

  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for Channel with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createChannelAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return ChannelPropertyNameSchema;
    }

    
    // At depth > 0, allow property names and relation queries
    // For n:n relations with properties, also support '&' special property for relation fields
    return z.union([
      ChannelPropertyNameSchema,
      z.tuple([
        z.literal('creator'),
        z.object({
          attributeQuery: createUserAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('mediaContents'),
        z.object({
          attributeQuery: createMediaContentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('feedItems'),
        z.object({
          attributeQuery: z.array(z.union([
            MediaContentPropertyNameSchema,
            // '&' special property for accessing relation-specific fields
            z.tuple([
              z.literal('&'),
              z.object({
                attributeQuery: z.array(Channel_feedItems_feedChannels_MediaContentRelationPropertyNameSchema).optional()
              })
            ])
          ])).optional()
        })
      ]),
      z.tuple([
        z.literal('nanobanana2Calls'),
        z.object({
          attributeQuery: createNanobanana2CallAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('fangzhouCalls'),
        z.object({
          attributeQuery: createFangzhouCallAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('initialReferenceImage'),
        z.object({
          attributeQuery: createMediaContentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('chatRoom'),
        z.object({
          attributeQuery: createChatRoomAttributeQuerySchema(depth - 1).optional()
        })
      ]),
    ]);

  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for MediaContent with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createMediaContentAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return MediaContentPropertyNameSchema;
    }

    
    // At depth > 0, allow property names and relation queries
    // For n:n relations with properties, also support '&' special property for relation fields
    return z.union([
      MediaContentPropertyNameSchema,
      z.tuple([
        z.literal('channel'),
        z.object({
          attributeQuery: createChannelAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('uploader'),
        z.object({
          attributeQuery: createUserAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('feedChannels'),
        z.object({
          attributeQuery: z.array(z.union([
            ChannelPropertyNameSchema,
            // '&' special property for accessing relation-specific fields
            z.tuple([
              z.literal('&'),
              z.object({
                attributeQuery: z.array(Channel_feedItems_feedChannels_MediaContentRelationPropertyNameSchema).optional()
              })
            ])
          ])).optional()
        })
      ]),
      z.tuple([
        z.literal('sourceImage'),
        z.object({
          attributeQuery: createMediaContentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('derivedContents'),
        z.object({
          attributeQuery: createMediaContentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('nanobanana2Call'),
        z.object({
          attributeQuery: createNanobanana2CallAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('fangzhouCall'),
        z.object({
          attributeQuery: createFangzhouCallAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('channelsAsReference'),
        z.object({
          attributeQuery: createChannelAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('comments'),
        z.object({
          attributeQuery: createCommentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('likedByUsers'),
        z.object({
          attributeQuery: z.array(z.union([
            UserPropertyNameSchema,
            // '&' special property for accessing relation-specific fields
            z.tuple([
              z.literal('&'),
              z.object({
                attributeQuery: z.array(UserMediaContentLikeRelationRelationPropertyNameSchema).optional()
              })
            ])
          ])).optional()
        })
      ]),
    ]);

  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for Nanobanana2Call with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createNanobanana2CallAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return Nanobanana2CallPropertyNameSchema;
    }

    
    // At depth > 0, allow property names and relation queries
    // For n:n relations with properties, also support '&' special property for relation fields
    return z.union([
      Nanobanana2CallPropertyNameSchema,
      z.tuple([
        z.literal('channel'),
        z.object({
          attributeQuery: createChannelAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('generatedMediaContents'),
        z.object({
          attributeQuery: createMediaContentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
    ]);

  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for Nanobanana2Event with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createNanobanana2EventAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return Nanobanana2EventPropertyNameSchema;
    }

    
    // No relations, only property names at any depth
    return Nanobanana2EventPropertyNameSchema;

  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for FangzhouCall with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createFangzhouCallAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return FangzhouCallPropertyNameSchema;
    }

    
    // At depth > 0, allow property names and relation queries
    // For n:n relations with properties, also support '&' special property for relation fields
    return z.union([
      FangzhouCallPropertyNameSchema,
      z.tuple([
        z.literal('channel'),
        z.object({
          attributeQuery: createChannelAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('generatedMediaContent'),
        z.object({
          attributeQuery: createMediaContentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
    ]);

  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for FangzhouEvent with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createFangzhouEventAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return FangzhouEventPropertyNameSchema;
    }

    
    // No relations, only property names at any depth
    return FangzhouEventPropertyNameSchema;

  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for ChatRoom with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createChatRoomAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return ChatRoomPropertyNameSchema;
    }

    
    // At depth > 0, allow property names and relation queries
    // For n:n relations with properties, also support '&' special property for relation fields
    return z.union([
      ChatRoomPropertyNameSchema,
      z.tuple([
        z.literal('channel'),
        z.object({
          attributeQuery: createChannelAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('members'),
        z.object({
          attributeQuery: z.array(z.union([
            UserPropertyNameSchema,
            // '&' special property for accessing relation-specific fields
            z.tuple([
              z.literal('&'),
              z.object({
                attributeQuery: z.array(User_joinedChatRooms_members_ChatRoomRelationPropertyNameSchema).optional()
              })
            ])
          ])).optional()
        })
      ]),
      z.tuple([
        z.literal('messages'),
        z.object({
          attributeQuery: createChatMessageAttributeQuerySchema(depth - 1).optional()
        })
      ]),
    ]);

  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for ChatMessage with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createChatMessageAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return ChatMessagePropertyNameSchema;
    }

    
    // At depth > 0, allow property names and relation queries
    // For n:n relations with properties, also support '&' special property for relation fields
    return z.union([
      ChatMessagePropertyNameSchema,
      z.tuple([
        z.literal('sender'),
        z.object({
          attributeQuery: createUserAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('chatRoom'),
        z.object({
          attributeQuery: createChatRoomAttributeQuerySchema(depth - 1).optional()
        })
      ]),
    ]);

  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for Comment with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createCommentAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return CommentPropertyNameSchema;
    }

    
    // At depth > 0, allow property names and relation queries
    // For n:n relations with properties, also support '&' special property for relation fields
    return z.union([
      CommentPropertyNameSchema,
      z.tuple([
        z.literal('mediaContent'),
        z.object({
          attributeQuery: createMediaContentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('author'),
        z.object({
          attributeQuery: createUserAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('volcDoubaoASRCalls'),
        z.object({
          attributeQuery: createVolcDoubaoASRCallAttributeQuerySchema(depth - 1).optional()
        })
      ]),
    ]);

  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for VolcDoubaoASRCall with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createVolcDoubaoASRCallAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return VolcDoubaoASRCallPropertyNameSchema;
    }

    
    // At depth > 0, allow property names and relation queries
    // For n:n relations with properties, also support '&' special property for relation fields
    return z.union([
      VolcDoubaoASRCallPropertyNameSchema,
      z.tuple([
        z.literal('comment'),
        z.object({
          attributeQuery: createCommentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
    ]);

  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for VolcDoubaoASREvent with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createVolcDoubaoASREventAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return VolcDoubaoASREventPropertyNameSchema;
    }

    
    // No relations, only property names at any depth
    return VolcDoubaoASREventPropertyNameSchema;

  };
  
  return z.array(createSchema(maxDepth));
}

// ============== Relation AttributeQuery Schema Factories ==============

/**
 * Create AttributeQuery schema for Channel_feedItems_feedChannels_MediaContent relation with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createChannel_feedItems_feedChannels_MediaContentAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return Channel_feedItems_feedChannels_MediaContentPropertyNameSchema;
    }
    
    // At depth > 0, allow property names and source/target queries
    // Note: nested attributeQuery uses create...Schema directly (which returns z.array)
    return z.union([
      Channel_feedItems_feedChannels_MediaContentPropertyNameSchema,
      z.tuple([
        z.literal('source'),
        z.object({
          attributeQuery: createChannelAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('target'),
        z.object({
          attributeQuery: createMediaContentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
    ]);
  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for User_joinedChatRooms_members_ChatRoom relation with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createUser_joinedChatRooms_members_ChatRoomAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return User_joinedChatRooms_members_ChatRoomPropertyNameSchema;
    }
    
    // At depth > 0, allow property names and source/target queries
    // Note: nested attributeQuery uses create...Schema directly (which returns z.array)
    return z.union([
      User_joinedChatRooms_members_ChatRoomPropertyNameSchema,
      z.tuple([
        z.literal('source'),
        z.object({
          attributeQuery: createUserAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('target'),
        z.object({
          attributeQuery: createChatRoomAttributeQuerySchema(depth - 1).optional()
        })
      ]),
    ]);
  };
  
  return z.array(createSchema(maxDepth));
}

/**
 * Create AttributeQuery schema for UserMediaContentLikeRelation relation with depth limit
 * @param maxDepth Maximum recursion depth
 */
export function createUserMediaContentLikeRelationAttributeQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  const createSchema = (depth: number): z.ZodType<any> => {
    if (depth <= 0) {
      // At depth 0, only property names are allowed
      return UserMediaContentLikeRelationPropertyNameSchema;
    }
    
    // At depth > 0, allow property names and source/target queries
    // Note: nested attributeQuery uses create...Schema directly (which returns z.array)
    return z.union([
      UserMediaContentLikeRelationPropertyNameSchema,
      z.tuple([
        z.literal('source'),
        z.object({
          attributeQuery: createUserAttributeQuerySchema(depth - 1).optional()
        })
      ]),
      z.tuple([
        z.literal('target'),
        z.object({
          attributeQuery: createMediaContentAttributeQuerySchema(depth - 1).optional()
        })
      ]),
    ]);
  };
  
  return z.array(createSchema(maxDepth));
}

// ============== Interaction Query Schemas ==============

/**
 * Create query schema for ViewPublicChannelFeed
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewPublicChannelFeedQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createChannel_feedItems_feedChannels_MediaContentAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewAllChannels
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewAllChannelsQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createChannelAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewOwnChannels
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewOwnChannelsQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createChannelAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewChannelMediaContent
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewChannelMediaContentQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createMediaContentAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewOwnMediaContent
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewOwnMediaContentQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createMediaContentAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewChannelGenerationTasks
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewChannelGenerationTasksQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createNanobanana2CallAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewNanobanana2GenerationStatus
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewNanobanana2GenerationStatusQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createNanobanana2CallAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewFangzhouGenerationStatus
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewFangzhouGenerationStatusQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createFangzhouCallAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewChatRoomMessages
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewChatRoomMessagesQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createChatMessageAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewChatRoomMembership
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewChatRoomMembershipQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createUser_joinedChatRooms_members_ChatRoomAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewAvailableChatRooms
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewAvailableChatRoomsQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createChatRoomAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewCommentsOnContent
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewCommentsOnContentQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createCommentAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewCommentCount
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewCommentCountQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createCommentAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewVolcDoubaoASRStatus
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewVolcDoubaoASRStatusQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createVolcDoubaoASRCallAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewContentWithLikeCount
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewContentWithLikeCountQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createMediaContentAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewUserLikeStatus
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewUserLikeStatusQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createUserMediaContentLikeRelationAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

/**
 * Create query schema for ViewUserLikedContents
 * @param maxDepth Maximum recursion depth for attributeQuery
 */
export function createViewUserLikedContentsQuerySchema(maxDepth: number = 3): z.ZodType<any> {
  return z.object({
    match: MatchExpressionSchema.optional(),
    attributeQuery: createUserMediaContentLikeRelationAttributeQuerySchema(maxDepth).optional(),
    modifier: QueryModifierSchema.optional()
  });
}

// ============== Validation Functions ==============

/**
 * Validate ViewPublicChannelFeed query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewPublicChannelFeedQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewPublicChannelFeedQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewPublicChannelFeed query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewPublicChannelFeedQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewPublicChannelFeedQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewAllChannels query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewAllChannelsQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewAllChannelsQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewAllChannels query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewAllChannelsQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewAllChannelsQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewOwnChannels query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewOwnChannelsQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewOwnChannelsQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewOwnChannels query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewOwnChannelsQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewOwnChannelsQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewChannelMediaContent query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewChannelMediaContentQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewChannelMediaContentQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewChannelMediaContent query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewChannelMediaContentQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewChannelMediaContentQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewOwnMediaContent query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewOwnMediaContentQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewOwnMediaContentQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewOwnMediaContent query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewOwnMediaContentQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewOwnMediaContentQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewChannelGenerationTasks query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewChannelGenerationTasksQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewChannelGenerationTasksQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewChannelGenerationTasks query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewChannelGenerationTasksQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewChannelGenerationTasksQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewNanobanana2GenerationStatus query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewNanobanana2GenerationStatusQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewNanobanana2GenerationStatusQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewNanobanana2GenerationStatus query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewNanobanana2GenerationStatusQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewNanobanana2GenerationStatusQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewFangzhouGenerationStatus query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewFangzhouGenerationStatusQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewFangzhouGenerationStatusQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewFangzhouGenerationStatus query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewFangzhouGenerationStatusQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewFangzhouGenerationStatusQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewChatRoomMessages query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewChatRoomMessagesQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewChatRoomMessagesQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewChatRoomMessages query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewChatRoomMessagesQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewChatRoomMessagesQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewChatRoomMembership query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewChatRoomMembershipQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewChatRoomMembershipQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewChatRoomMembership query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewChatRoomMembershipQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewChatRoomMembershipQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewAvailableChatRooms query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewAvailableChatRoomsQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewAvailableChatRoomsQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewAvailableChatRooms query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewAvailableChatRoomsQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewAvailableChatRoomsQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewCommentsOnContent query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewCommentsOnContentQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewCommentsOnContentQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewCommentsOnContent query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewCommentsOnContentQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewCommentsOnContentQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewCommentCount query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewCommentCountQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewCommentCountQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewCommentCount query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewCommentCountQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewCommentCountQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewVolcDoubaoASRStatus query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewVolcDoubaoASRStatusQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewVolcDoubaoASRStatusQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewVolcDoubaoASRStatus query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewVolcDoubaoASRStatusQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewVolcDoubaoASRStatusQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewContentWithLikeCount query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewContentWithLikeCountQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewContentWithLikeCountQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewContentWithLikeCount query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewContentWithLikeCountQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewContentWithLikeCountQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewUserLikeStatus query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewUserLikeStatusQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewUserLikeStatusQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewUserLikeStatus query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewUserLikeStatusQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewUserLikeStatusQuerySchema(maxDepth).safeParse(query);
}

/**
 * Validate ViewUserLikedContents query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns true if valid, throws if invalid
 */
export function validateViewUserLikedContentsQuery(query: unknown, maxDepth: number = 3): boolean {
  createViewUserLikedContentsQuerySchema(maxDepth).parse(query);
  return true;
}

/**
 * Safely validate ViewUserLikedContents query
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result with success/error
 */
export function safeParseViewUserLikedContentsQuery(query: unknown, maxDepth: number = 3): SafeParseResult {
  return createViewUserLikedContentsQuerySchema(maxDepth).safeParse(query);
}

// ============== Validator Map ==============

/**
 * Map of interaction names to their query schema factories
 */
export const querySchemaFactories = {
  ViewPublicChannelFeed: createViewPublicChannelFeedQuerySchema,
  ViewAllChannels: createViewAllChannelsQuerySchema,
  ViewOwnChannels: createViewOwnChannelsQuerySchema,
  ViewChannelMediaContent: createViewChannelMediaContentQuerySchema,
  ViewOwnMediaContent: createViewOwnMediaContentQuerySchema,
  ViewChannelGenerationTasks: createViewChannelGenerationTasksQuerySchema,
  ViewNanobanana2GenerationStatus: createViewNanobanana2GenerationStatusQuerySchema,
  ViewFangzhouGenerationStatus: createViewFangzhouGenerationStatusQuerySchema,
  ViewChatRoomMessages: createViewChatRoomMessagesQuerySchema,
  ViewChatRoomMembership: createViewChatRoomMembershipQuerySchema,
  ViewAvailableChatRooms: createViewAvailableChatRoomsQuerySchema,
  ViewCommentsOnContent: createViewCommentsOnContentQuerySchema,
  ViewCommentCount: createViewCommentCountQuerySchema,
  ViewVolcDoubaoASRStatus: createViewVolcDoubaoASRStatusQuerySchema,
  ViewContentWithLikeCount: createViewContentWithLikeCountQuerySchema,
  ViewUserLikeStatus: createViewUserLikeStatusQuerySchema,
  ViewUserLikedContents: createViewUserLikedContentsQuerySchema,
};

/**
 * Validate a query for any interaction
 * @param interactionName The name of the interaction
 * @param query The query to validate
 * @param maxDepth Maximum recursion depth (default: 3)
 * @returns Validation result
 */
export function validateInteractionQuery(
  interactionName: keyof typeof querySchemaFactories,
  query: unknown,
  maxDepth: number = 3
): SafeParseResult {
  const factory = querySchemaFactories[interactionName];
  if (!factory) {
    // Return a failed result for unknown interactions
    return z.object({}).safeParse({ __unknown_interaction__: interactionName });
  }
  return factory(maxDepth).safeParse(query);
}
