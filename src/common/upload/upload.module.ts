import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { OssService } from '../services/oss.service';

@Module({
  controllers: [UploadController],
  providers: [OssService],
  exports: [OssService], // 导出OSS服务供其他模块使用
})
export class UploadModule {}
