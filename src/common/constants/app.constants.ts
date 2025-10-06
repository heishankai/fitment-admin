/**
 * 应用常量配置
 * 统一管理核心配置项
 */

// 阿里云OSS配置
export const OSS_CONFIG = {
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.OSS_BUCKET || 'din-dang-zhi-zhuang',
  secure: true, // 强制使用HTTPS
} as const;

// 文件上传配置
export const UPLOAD_CONFIG = {
  // 文件大小限制 (50MB)
  maxFileSize: 50 * 1024 * 1024,
  
  // 允许的文件类型
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as string[],
  
  // 默认上传文件夹
  defaultFolder: 'uploads',
  
  // 图片上传文件夹
  imageFolder: 'images',
} as const;

// 数据库配置
export const DATABASE_CONFIG = {
  type: 'mysql',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'fitment_db_dev',
  synchronize: process.env.NODE_ENV !== 'production', // 生产环境关闭
  autoLoadEntities: true,
} as const;

// JWT配置
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '3d', // 3天过期
} as const;