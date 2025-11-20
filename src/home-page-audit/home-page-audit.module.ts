import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomePageAuditService } from './home-page-audit.service';
import { HomePageAuditController } from './home-page-audit.controller';
import { HomePageAudit } from './home-page-audit.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HomePageAudit, CraftsmanUser])],
  controllers: [HomePageAuditController],
  providers: [HomePageAuditService],
  exports: [HomePageAuditService],
})
export class HomePageAuditModule {}

