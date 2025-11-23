import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformNoticeService } from './platform-notice.service';
import { PlatformNoticeController } from './platform-notice.controller';
import { PlatformNotice } from './platform-notice.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformNotice])],
  controllers: [PlatformNoticeController],
  providers: [PlatformNoticeService],
  exports: [PlatformNoticeService],
})
export class PlatformNoticeModule {}

