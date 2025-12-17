#!/usr/bin/env tsx
/**
 * 验证 app.config.json 配置文件的完整性
 * 确保从环境变量迁移到配置文件后，所有配置都正确映射
 */
import appConfig from '../app.config.json';

console.log('🔍 验证配置映射...\n');

const mainConfig = appConfig.components.main as any;

// 定义期望的映射关系
const expectedMappings = {
  'DATABASE': {
    'DB_TYPE': {
      config: mainConfig.middlewareDependencies.mainDb?.config.type,
      description: 'Database type'
    },
    'DB_ADDRESS': {
      config: mainConfig.middlewareDependencies.mainDb?.config.address,
      description: 'Database address',
      note: '对于 pglite 是 file://appdb，对于 postgresql 是连接字符串'
    }
  },
  'JWT AUTH': {
    'JWT_SECRET': {
      config: mainConfig.applicationConfig.jwt?.secret,
      description: 'JWT secret key'
    },
    'USER_ID_FIELD': {
      config: mainConfig.applicationConfig.jwt?.userIdField,
      description: 'JWT user ID field'
    }
  },
  'ROOT USER': {
    'ROOT_PASSWORD': {
      config: mainConfig.applicationConfig.rootUser?.password,
      description: 'Root user password'
    }
  },
  'OBJECT STORAGE': {
    'S3_ACCESS_KEY_ID': {
      config: mainConfig.middlewareDependencies.objectStorage?.config.accessKeyId,
      description: 'S3/TOS Access Key ID'
    },
    'S3_SECRET_ACCESS_KEY': {
      config: mainConfig.middlewareDependencies.objectStorage?.config.secretAccessKey,
      description: 'S3/TOS Secret Access Key'
    },
    'S3_REGION': {
      config: mainConfig.middlewareDependencies.objectStorage?.config.region,
      description: 'S3/TOS Region'
    },
    'S3_ENDPOINT': {
      config: mainConfig.middlewareDependencies.objectStorage?.config.endpoint,
      description: 'S3/TOS Endpoint'
    },
    'S3_BUCKET': {
      config: mainConfig.middlewareDependencies.objectStorage?.config.bucket,
      description: 'S3/TOS Bucket'
    }
  },
  'KAFKA': {
    'VOLC_KAFKA_BROKER': {
      config: mainConfig.middlewareDependencies.messageQueue?.config.broker,
      description: 'Kafka broker address'
    },
    'VOLC_KAFKA_INSTANCE_ID': {
      config: mainConfig.middlewareDependencies.messageQueue?.config.instanceId,
      description: 'Kafka instance ID'
    },
    'VOLC_KAFKA_USERNAME': {
      config: mainConfig.middlewareDependencies.messageQueue?.config.username,
      description: 'Kafka username',
      optional: true
    },
    'VOLC_KAFKA_PASSWORD': {
      config: mainConfig.middlewareDependencies.messageQueue?.config.password,
      description: 'Kafka password',
      optional: true
    },
    'VOLC_KAFKA_SSL': {
      config: mainConfig.middlewareDependencies.messageQueue?.config.ssl,
      description: 'Kafka SSL enabled',
      type: 'boolean'
    }
  },
  'VOLC TTS': {
    'VOLC_SPEECH_APP_ID': {
      config: mainConfig.externalServices.volcTts?.config.appId,
      description: 'VolcTTS App ID',
      optional: !mainConfig.externalServices.volcTts?.enabled
    },
    'VOLC_SPEECH_ACCESS_TOKEN': {
      config: mainConfig.externalServices.volcTts?.config.accessToken,
      description: 'VolcTTS Access Token',
      optional: !mainConfig.externalServices.volcTts?.enabled
    },
    'VOLC_SPEECH_RESOURCE_ID': {
      config: mainConfig.externalServices.volcTts?.config.resourceId,
      description: 'VolcTTS Resource ID',
      optional: !mainConfig.externalServices.volcTts?.enabled
    },
    'VOLC_SPEECH_API_ENDPOINT': {
      config: mainConfig.externalServices.volcTts?.config.apiEndpoint,
      description: 'VolcTTS API Endpoint',
      optional: !mainConfig.externalServices.volcTts?.enabled
    },
    'VOLC_SPEECH_SPEAKER': {
      config: mainConfig.externalServices.volcTts?.config.speaker,
      description: 'VolcTTS Speaker',
      optional: !mainConfig.externalServices.volcTts?.enabled
    }
  },
  'VOLC FANGZHOU IMAGE': {
    'VOLC_FANGZHOU_API_KEY': {
      config: mainConfig.externalServices.volcFangzhouImage?.config.apiKey,
      description: 'VolcFangzhou API Key',
      optional: !mainConfig.externalServices.volcFangzhouImage?.enabled
    },
    'VOLC_FANGZHOU_IAMGE_GEN_BASE_URL': {
      config: mainConfig.externalServices.volcFangzhouImage?.config.baseUrl,
      description: 'VolcFangzhou Image Gen Base URL',
      optional: !mainConfig.externalServices.volcFangzhouImage?.enabled
    },
    'VOLC_FANGZHOU_IMAGE_MODEL': {
      config: mainConfig.externalServices.volcFangzhouImage?.config.model,
      description: 'VolcFangzhou Image Model',
      optional: !mainConfig.externalServices.volcFangzhouImage?.enabled
    }
  },
  'VOLC FANGZHOU VIDEO': {
    'VOLC_FANGZHOU_VIDEO_GEN_BASE_URL': {
      config: mainConfig.externalServices.volcFangzhouVideo?.config.baseUrl,
      description: 'VolcFangzhou Video Gen Base URL',
      optional: !mainConfig.externalServices.volcFangzhouVideo?.enabled
    },
    'VOLC_FANGZHOU_VIDEO_MODEL': {
      config: mainConfig.externalServices.volcFangzhouVideo?.config.model,
      description: 'VolcFangzhou Video Model',
      optional: !mainConfig.externalServices.volcFangzhouVideo?.enabled
    }
  },
  'COMPONENT PORTS': {
    'PORT (main)': {
      config: mainConfig.port,
      description: 'Main component port',
      expected: 3000
    }
  }
};

let hasError = false;
let warningCount = 0;

// 验证每个映射
for (const [category, mappings] of Object.entries(expectedMappings)) {
  console.log(`📦 ${category}:`);
  
  for (const [envVar, info] of Object.entries(mappings)) {
    const value = info.config;
    const isOptional = (info as any).optional || false;
    
    if (value === undefined || value === null || value === '') {
      if (isOptional) {
        console.log(`   ⚠️  ${envVar}: (未设置，但为可选)`);
        warningCount++;
      } else {
        console.log(`   ❌ ${envVar}: 缺失 - ${info.description}`);
        hasError = true;
      }
    } else {
      const displayValue = typeof value === 'string' && value.length > 50 
        ? value.substring(0, 50) + '...' 
        : value;
      console.log(`   ✅ ${envVar}: ${displayValue}`);
      
      if ((info as any).note) {
        console.log(`      ℹ️  ${(info as any).note}`);
      }
    }
  }
  
  console.log('');
}

// 验证外部服务的启用状态
console.log('🔌 外部服务状态:');
console.log(`   volcTts: ${mainConfig.externalServices.volcTts?.enabled ? '✅ 启用' : '❌ 禁用'}`);
console.log(`   volcFangzhouImage: ${mainConfig.externalServices.volcFangzhouImage?.enabled ? '✅ 启用' : '❌ 禁用'}`);
console.log(`   volcFangzhouVideo: ${mainConfig.externalServices.volcFangzhouVideo?.enabled ? '✅ 启用' : '❌ 禁用'}`);
console.log('');

// 输出结果
if (hasError) {
  console.log('❌ 配置验证失败：存在缺失的必填配置');
  process.exit(1);
} else if (warningCount > 0) {
  console.log(`⚠️  配置验证通过，但有 ${warningCount} 个警告`);
  process.exit(0);
} else {
  console.log('✅ 配置验证通过：所有映射正确');
  process.exit(0);
}

