// Auto-generated OpenAPI specification
// Generated on: 2025-12-07T03:07:04.244Z

export const openapiSpec = {
  "openapi": "3.0.3",
  "info": {
    "title": "Interaqt API",
    "version": "1.0.0",
    "description": "Auto-generated API specification for Interaqt backend"
  },
  "servers": [
    {
      "url": "/api",
      "description": "API server"
    }
  ],
  "paths": {
    "/interaction/ViewUserChannels": {
      "post": {
        "operationId": "ViewUserChannels",
        "summary": "Query ViewUserChannels",
        "description": "Query interaction: ViewUserChannels",
        "tags": [
          "Queries"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ViewUserChannelsRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/QueryResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/ViewChannelFeedStream": {
      "post": {
        "operationId": "ViewChannelFeedStream",
        "summary": "Query ViewChannelFeedStream",
        "description": "Query interaction: ViewChannelFeedStream",
        "tags": [
          "Queries"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ViewChannelFeedStreamRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/QueryResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/ViewChannelMediaContent": {
      "post": {
        "operationId": "ViewChannelMediaContent",
        "summary": "Query ViewChannelMediaContent",
        "description": "Query interaction: ViewChannelMediaContent",
        "tags": [
          "Queries"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ViewChannelMediaContentRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/QueryResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/ViewChannelDetails": {
      "post": {
        "operationId": "ViewChannelDetails",
        "summary": "Query ViewChannelDetails",
        "description": "Query interaction: ViewChannelDetails",
        "tags": [
          "Queries"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ViewChannelDetailsRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/QueryResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/ViewNanobanana2ImageGenerationStatus": {
      "post": {
        "operationId": "ViewNanobanana2ImageGenerationStatus",
        "summary": "Query ViewNanobanana2ImageGenerationStatus",
        "description": "Query interaction: ViewNanobanana2ImageGenerationStatus",
        "tags": [
          "Queries"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ViewNanobanana2ImageGenerationStatusRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/QueryResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/ViewSora2VideoGenerationStatus": {
      "post": {
        "operationId": "ViewSora2VideoGenerationStatus",
        "summary": "Query ViewSora2VideoGenerationStatus",
        "description": "Query interaction: ViewSora2VideoGenerationStatus",
        "tags": [
          "Queries"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ViewSora2VideoGenerationStatusRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/QueryResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/CreateChannel": {
      "post": {
        "operationId": "CreateChannel",
        "summary": "Execute CreateChannel",
        "description": "Mutation interaction: CreateChannel",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateChannelRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/UpdateChannel": {
      "post": {
        "operationId": "UpdateChannel",
        "summary": "Execute UpdateChannel",
        "description": "Mutation interaction: UpdateChannel",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateChannelRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/DeleteChannel": {
      "post": {
        "operationId": "DeleteChannel",
        "summary": "Execute DeleteChannel",
        "description": "Mutation interaction: DeleteChannel",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeleteChannelRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/AddMediaToFeedStream": {
      "post": {
        "operationId": "AddMediaToFeedStream",
        "summary": "Execute AddMediaToFeedStream",
        "description": "Mutation interaction: AddMediaToFeedStream",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AddMediaToFeedStreamRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/RemoveMediaFromFeedStream": {
      "post": {
        "operationId": "RemoveMediaFromFeedStream",
        "summary": "Execute RemoveMediaFromFeedStream",
        "description": "Mutation interaction: RemoveMediaFromFeedStream",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RemoveMediaFromFeedStreamRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/ReorderFeedStream": {
      "post": {
        "operationId": "ReorderFeedStream",
        "summary": "Execute ReorderFeedStream",
        "description": "Mutation interaction: ReorderFeedStream",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ReorderFeedStreamRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/UploadMediaToChannel": {
      "post": {
        "operationId": "UploadMediaToChannel",
        "summary": "Execute UploadMediaToChannel",
        "description": "Mutation interaction: UploadMediaToChannel",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UploadMediaToChannelRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/DeleteMediaContent": {
      "post": {
        "operationId": "DeleteMediaContent",
        "summary": "Execute DeleteMediaContent",
        "description": "Mutation interaction: DeleteMediaContent",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/DeleteMediaContentRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/GenerateImageFromUploadedImage": {
      "post": {
        "operationId": "GenerateImageFromUploadedImage",
        "summary": "Execute GenerateImageFromUploadedImage",
        "description": "Mutation interaction: GenerateImageFromUploadedImage",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GenerateImageFromUploadedImageRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/GenerateVideoFromPrompt": {
      "post": {
        "operationId": "GenerateVideoFromPrompt",
        "summary": "Execute GenerateVideoFromPrompt",
        "description": "Mutation interaction: GenerateVideoFromPrompt",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GenerateVideoFromPromptRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/RetryNanobanana2ImageGeneration": {
      "post": {
        "operationId": "RetryNanobanana2ImageGeneration",
        "summary": "Execute RetryNanobanana2ImageGeneration",
        "description": "Mutation interaction: RetryNanobanana2ImageGeneration",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RetryNanobanana2ImageGenerationRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/interaction/RetrySora2VideoGeneration": {
      "post": {
        "operationId": "RetrySora2VideoGeneration",
        "summary": "Execute RetrySora2VideoGeneration",
        "description": "Mutation interaction: RetrySora2VideoGeneration",
        "tags": [
          "Mutations"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RetrySora2VideoGenerationRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/MutationResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/custom/register": {
      "post": {
        "operationId": "register",
        "summary": "Call register API",
        "description": "Custom API endpoint: register",
        "tags": [
          "Custom APIs"
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RegisterParams"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/RegisterResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "security": [
          {}
        ]
      }
    },
    "/custom/login": {
      "post": {
        "operationId": "login",
        "summary": "Call login API",
        "description": "Custom API endpoint: login",
        "tags": [
          "Custom APIs"
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/LoginParams"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/LoginResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        },
        "security": [
          {}
        ]
      }
    },
    "/custom/getUploadUrl": {
      "post": {
        "operationId": "getUploadUrl",
        "summary": "Call getUploadUrl API",
        "description": "Custom API endpoint: getUploadUrl",
        "tags": [
          "Custom APIs"
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/GetUploadUrlParams"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/GetUploadUrlResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/custom/queryNanobanana2ImageGenerationStatus": {
      "post": {
        "operationId": "queryNanobanana2ImageGenerationStatus",
        "summary": "Call queryNanobanana2ImageGenerationStatus API",
        "description": "Custom API endpoint: queryNanobanana2ImageGenerationStatus",
        "tags": [
          "Custom APIs"
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/QueryNanobanana2ImageGenerationStatusParams"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/QueryNanobanana2ImageGenerationStatusResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    },
    "/custom/querySora2VideoGenerationStatus": {
      "post": {
        "operationId": "querySora2VideoGenerationStatus",
        "summary": "Call querySora2VideoGenerationStatus API",
        "description": "Custom API endpoint: querySora2VideoGenerationStatus",
        "tags": [
          "Custom APIs"
        ],
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/QuerySora2VideoGenerationStatusParams"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Successful response",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/QuerySora2VideoGenerationStatusResponse"
                }
              }
            }
          },
          "400": {
            "description": "Bad request",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          },
          "401": {
            "description": "Unauthorized",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ErrorResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "AttributeQueryData": {
        "description": "Recursive attribute query data for querying related entities. Can be a string (attribute name) or a tuple [relationName, { attributeQuery?: AttributeQueryData }]",
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AttributeQueryItem"
        }
      },
      "AttributeQueryItem": {
        "description": "Single item in AttributeQueryData - either an attribute name or a relation query tuple",
        "oneOf": [
          {
            "type": "string",
            "description": "Attribute name (e.g., \"id\", \"name\", \"*\")"
          },
          {
            "$ref": "#/components/schemas/RelationQueryTuple"
          }
        ]
      },
      "RelationQueryTuple": {
        "description": "Tuple format for querying related entities: [relationName, { attributeQuery?: AttributeQueryData }]",
        "type": "array",
        "items": {},
        "minItems": 2,
        "maxItems": 2
      },
      "RelationQueryOptions": {
        "description": "Options for relation query containing nested attributeQuery",
        "type": "object",
        "properties": {
          "attributeQuery": {
            "$ref": "#/components/schemas/AttributeQueryData"
          }
        }
      },
      "MatchExpression": {
        "description": "Match expression for filtering records",
        "type": "object",
        "properties": {
          "key": {
            "type": "string",
            "description": "The field key to match (e.g., \"id\", \"owner.id\")"
          },
          "value": {
            "type": "array",
            "description": "Tuple of [operator, value] (e.g., [\"=\", \"123\"])",
            "items": {},
            "minItems": 2,
            "maxItems": 2
          }
        },
        "required": [
          "key",
          "value"
        ]
      },
      "QueryModifier": {
        "description": "Query modifier for pagination and sorting",
        "type": "object",
        "properties": {
          "limit": {
            "type": "integer",
            "description": "Maximum number of records to return"
          },
          "offset": {
            "type": "integer",
            "description": "Number of records to skip"
          },
          "orderBy": {
            "type": "object",
            "description": "Field ordering (e.g., { \"createdAt\": \"DESC\" })",
            "additionalProperties": {
              "type": "string",
              "enum": [
                "ASC",
                "DESC"
              ]
            }
          }
        }
      },
      "UserQueryParams": {
        "description": "Query parameters for query-type interactions",
        "type": "object",
        "properties": {
          "match": {
            "$ref": "#/components/schemas/MatchExpression"
          },
          "attributeQuery": {
            "$ref": "#/components/schemas/AttributeQueryData"
          },
          "modifier": {
            "$ref": "#/components/schemas/QueryModifier"
          }
        }
      },
      "QueryResponse": {
        "description": "Response from query-type interactions",
        "type": "object",
        "properties": {
          "data": {
            "type": "array",
            "description": "Array of matching records",
            "items": {
              "type": "object",
              "additionalProperties": true
            }
          },
          "error": {
            "type": "object",
            "description": "Error information if the query failed",
            "nullable": true
          },
          "effects": {
            "type": "object",
            "description": "Side effects from the query",
            "nullable": true
          }
        },
        "required": [
          "data"
        ]
      },
      "MutationResponse": {
        "description": "Response from mutation-type interactions",
        "type": "object",
        "properties": {
          "data": {
            "type": "object",
            "description": "Result data from the mutation",
            "additionalProperties": true,
            "nullable": true
          },
          "error": {
            "type": "object",
            "description": "Error information if the mutation failed",
            "nullable": true
          },
          "effects": {
            "type": "object",
            "description": "Side effects from the mutation",
            "nullable": true
          }
        }
      },
      "ErrorResponse": {
        "description": "Error response",
        "type": "object",
        "properties": {
          "error": {
            "type": "string",
            "description": "Error message"
          },
          "details": {
            "type": "string",
            "description": "Additional error details",
            "nullable": true
          }
        },
        "required": [
          "error"
        ]
      },
      "ViewUserChannelsRequest": {
        "description": "Request body for ViewUserChannels interaction",
        "type": "object",
        "properties": {
          "query": {
            "$ref": "#/components/schemas/UserQueryParams"
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "ViewChannelFeedStreamRequest": {
        "description": "Request body for ViewChannelFeedStream interaction",
        "type": "object",
        "properties": {
          "query": {
            "$ref": "#/components/schemas/UserQueryParams"
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "ViewChannelMediaContentRequest": {
        "description": "Request body for ViewChannelMediaContent interaction",
        "type": "object",
        "properties": {
          "query": {
            "$ref": "#/components/schemas/UserQueryParams"
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "ViewChannelDetailsRequest": {
        "description": "Request body for ViewChannelDetails interaction",
        "type": "object",
        "properties": {
          "query": {
            "$ref": "#/components/schemas/UserQueryParams"
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "ViewNanobanana2ImageGenerationStatusRequest": {
        "description": "Request body for ViewNanobanana2ImageGenerationStatus interaction",
        "type": "object",
        "properties": {
          "query": {
            "$ref": "#/components/schemas/UserQueryParams"
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "ViewSora2VideoGenerationStatusRequest": {
        "description": "Request body for ViewSora2VideoGenerationStatus interaction",
        "type": "object",
        "properties": {
          "query": {
            "$ref": "#/components/schemas/UserQueryParams"
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "CreateChannelPayload": {
        "description": "Payload for CreateChannel interaction",
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "prompt": {
            "type": "string"
          },
          "referenceImageUrl": {
            "type": "string"
          }
        },
        "required": [
          "name",
          "prompt",
          "referenceImageUrl"
        ]
      },
      "CreateChannelRequest": {
        "description": "Request body for CreateChannel interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string"
              },
              "description": {
                "type": "string"
              },
              "prompt": {
                "type": "string"
              },
              "referenceImageUrl": {
                "type": "string"
              }
            },
            "required": [
              "name",
              "prompt",
              "referenceImageUrl"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "UpdateChannelPayload": {
        "description": "Payload for UpdateChannel interaction",
        "type": "object",
        "properties": {
          "channelId": {
            "type": "string"
          },
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          }
        },
        "required": [
          "channelId"
        ]
      },
      "UpdateChannelRequest": {
        "description": "Request body for UpdateChannel interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "channelId": {
                "type": "string"
              },
              "name": {
                "type": "string"
              },
              "description": {
                "type": "string"
              }
            },
            "required": [
              "channelId"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "DeleteChannelPayload": {
        "description": "Payload for DeleteChannel interaction",
        "type": "object",
        "properties": {
          "channelId": {
            "type": "string"
          }
        },
        "required": [
          "channelId"
        ]
      },
      "DeleteChannelRequest": {
        "description": "Request body for DeleteChannel interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "channelId": {
                "type": "string"
              }
            },
            "required": [
              "channelId"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "AddMediaToFeedStreamPayload": {
        "description": "Payload for AddMediaToFeedStream interaction",
        "type": "object",
        "properties": {
          "channelId": {
            "type": "string"
          },
          "mediaContentId": {
            "type": "string"
          },
          "order": {
            "type": "number"
          }
        },
        "required": [
          "channelId",
          "mediaContentId"
        ]
      },
      "AddMediaToFeedStreamRequest": {
        "description": "Request body for AddMediaToFeedStream interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "channelId": {
                "type": "string"
              },
              "mediaContentId": {
                "type": "string"
              },
              "order": {
                "type": "number"
              }
            },
            "required": [
              "channelId",
              "mediaContentId"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "RemoveMediaFromFeedStreamPayload": {
        "description": "Payload for RemoveMediaFromFeedStream interaction",
        "type": "object",
        "properties": {
          "feedItemId": {
            "type": "string"
          }
        },
        "required": [
          "feedItemId"
        ]
      },
      "RemoveMediaFromFeedStreamRequest": {
        "description": "Request body for RemoveMediaFromFeedStream interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "feedItemId": {
                "type": "string"
              }
            },
            "required": [
              "feedItemId"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "ReorderFeedStreamPayload": {
        "description": "Payload for ReorderFeedStream interaction",
        "type": "object",
        "properties": {
          "channelId": {
            "type": "string"
          },
          "feedItemOrders": {
            "type": "array",
            "items": {
              "type": "object",
              "additionalProperties": true
            },
            "description": "Collection of object"
          }
        },
        "required": [
          "channelId",
          "feedItemOrders"
        ]
      },
      "ReorderFeedStreamRequest": {
        "description": "Request body for ReorderFeedStream interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "channelId": {
                "type": "string"
              },
              "feedItemOrders": {
                "type": "array",
                "items": {
                  "type": "object",
                  "additionalProperties": true
                },
                "description": "Collection of object"
              }
            },
            "required": [
              "channelId",
              "feedItemOrders"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "UploadMediaToChannelPayload": {
        "description": "Payload for UploadMediaToChannel interaction",
        "type": "object",
        "properties": {
          "channelId": {
            "type": "string"
          },
          "mediaUrl": {
            "type": "string"
          },
          "fileName": {
            "type": "string"
          },
          "contentType": {
            "type": "string"
          },
          "fileSize": {
            "type": "number"
          }
        },
        "required": [
          "channelId",
          "mediaUrl",
          "fileName",
          "contentType"
        ]
      },
      "UploadMediaToChannelRequest": {
        "description": "Request body for UploadMediaToChannel interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "channelId": {
                "type": "string"
              },
              "mediaUrl": {
                "type": "string"
              },
              "fileName": {
                "type": "string"
              },
              "contentType": {
                "type": "string"
              },
              "fileSize": {
                "type": "number"
              }
            },
            "required": [
              "channelId",
              "mediaUrl",
              "fileName",
              "contentType"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "DeleteMediaContentPayload": {
        "description": "Payload for DeleteMediaContent interaction",
        "type": "object",
        "properties": {
          "mediaContentId": {
            "type": "string"
          }
        },
        "required": [
          "mediaContentId"
        ]
      },
      "DeleteMediaContentRequest": {
        "description": "Request body for DeleteMediaContent interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "mediaContentId": {
                "type": "string"
              }
            },
            "required": [
              "mediaContentId"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "GenerateImageFromUploadedImagePayload": {
        "description": "Payload for GenerateImageFromUploadedImage interaction",
        "type": "object",
        "properties": {
          "channelId": {
            "type": "string"
          },
          "sourceMediaContentId": {
            "type": "string"
          },
          "prompt": {
            "type": "string"
          }
        },
        "required": [
          "channelId",
          "sourceMediaContentId",
          "prompt"
        ]
      },
      "GenerateImageFromUploadedImageRequest": {
        "description": "Request body for GenerateImageFromUploadedImage interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "channelId": {
                "type": "string"
              },
              "sourceMediaContentId": {
                "type": "string"
              },
              "prompt": {
                "type": "string"
              }
            },
            "required": [
              "channelId",
              "sourceMediaContentId",
              "prompt"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "GenerateVideoFromPromptPayload": {
        "description": "Payload for GenerateVideoFromPrompt interaction",
        "type": "object",
        "properties": {
          "channelId": {
            "type": "string"
          },
          "prompt": {
            "type": "string"
          }
        },
        "required": [
          "channelId",
          "prompt"
        ]
      },
      "GenerateVideoFromPromptRequest": {
        "description": "Request body for GenerateVideoFromPrompt interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "channelId": {
                "type": "string"
              },
              "prompt": {
                "type": "string"
              }
            },
            "required": [
              "channelId",
              "prompt"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "RetryNanobanana2ImageGenerationPayload": {
        "description": "Payload for RetryNanobanana2ImageGeneration interaction",
        "type": "object",
        "properties": {
          "channelId": {
            "type": "string"
          }
        },
        "required": [
          "channelId"
        ]
      },
      "RetryNanobanana2ImageGenerationRequest": {
        "description": "Request body for RetryNanobanana2ImageGeneration interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "channelId": {
                "type": "string"
              }
            },
            "required": [
              "channelId"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "RetrySora2VideoGenerationPayload": {
        "description": "Payload for RetrySora2VideoGeneration interaction",
        "type": "object",
        "properties": {
          "channelId": {
            "type": "string"
          },
          "sora2CallId": {
            "type": "string"
          }
        },
        "required": [
          "channelId",
          "sora2CallId"
        ]
      },
      "RetrySora2VideoGenerationRequest": {
        "description": "Request body for RetrySora2VideoGeneration interaction",
        "type": "object",
        "properties": {
          "payload": {
            "type": "object",
            "properties": {
              "channelId": {
                "type": "string"
              },
              "sora2CallId": {
                "type": "string"
              }
            },
            "required": [
              "channelId",
              "sora2CallId"
            ]
          },
          "activity": {
            "type": "string",
            "description": "Activity name for activity-based interactions",
            "nullable": true
          },
          "activityId": {
            "type": "string",
            "description": "Activity instance ID",
            "nullable": true
          }
        }
      },
      "RegisterParams": {
        "description": "Parameters for register API",
        "type": "object",
        "properties": {
          "username": {
            "type": "string"
          },
          "email": {
            "type": "string"
          },
          "password": {
            "type": "string"
          }
        }
      },
      "RegisterResponse": {
        "description": "Response from register API",
        "type": "object",
        "additionalProperties": true
      },
      "LoginParams": {
        "description": "Parameters for login API",
        "type": "object",
        "properties": {
          "identifier": {
            "type": "string"
          },
          "password": {
            "type": "string"
          }
        }
      },
      "LoginResponse": {
        "description": "Response from login API",
        "type": "object",
        "additionalProperties": true
      },
      "GetUploadUrlParams": {
        "description": "Parameters for getUploadUrl API",
        "type": "object",
        "properties": {
          "fileName": {
            "type": "string"
          },
          "contentType": {
            "type": "string",
            "nullable": true
          },
          "expiresIn": {
            "type": "number",
            "nullable": true
          }
        }
      },
      "GetUploadUrlResponse": {
        "description": "Response from getUploadUrl API",
        "type": "object",
        "additionalProperties": true
      },
      "QueryNanobanana2ImageGenerationStatusParams": {
        "description": "Parameters for queryNanobanana2ImageGenerationStatus API",
        "type": "object",
        "properties": {
          "apiCallId": {
            "type": "string"
          }
        }
      },
      "QueryNanobanana2ImageGenerationStatusResponse": {
        "description": "Response from queryNanobanana2ImageGenerationStatus API",
        "type": "object",
        "additionalProperties": true
      },
      "QuerySora2VideoGenerationStatusParams": {
        "description": "Parameters for querySora2VideoGenerationStatus API",
        "type": "object",
        "properties": {
          "apiCallId": {
            "type": "string"
          }
        }
      },
      "QuerySora2VideoGenerationStatusResponse": {
        "description": "Response from querySora2VideoGenerationStatus API",
        "type": "object",
        "additionalProperties": true
      }
    },
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT token authentication"
      },
      "cookieAuth": {
        "type": "apiKey",
        "in": "cookie",
        "name": "token",
        "description": "Cookie-based authentication"
      }
    }
  },
  "security": [
    {
      "bearerAuth": []
    },
    {
      "cookieAuth": []
    }
  ]
} as const;

export type OpenAPISpec = typeof openapiSpec;
