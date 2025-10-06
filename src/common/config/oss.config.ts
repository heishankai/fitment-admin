/**
 * 阿里云OSS配置
 */
export const OSS_CONFIG = {
  // 阿里云OSS配置
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '', // AccessKey ID
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '', // AccessKey Secret
  bucket: process.env.OSS_BUCKET || '', // 存储桶名称
  region: process.env.OSS_REGION || 'oss-cn-hangzhou', // 存储桶所在的区域
  folder: 'system-upload/', // 存储文件夹

  // 上传配置
  uploadPath: 'uploads/', // 上传路径前缀
  maxFileSize: 50 * 1024 * 1024, // 最大文件大小 50MB
  allowedMimeTypes: [
    // 允许的文件类型
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};
