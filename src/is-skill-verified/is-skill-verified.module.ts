import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IsSkillVerifiedService } from './is-skill-verified.service';
import { IsSkillVerifiedController } from './is-skill-verified.controller';
import { IsSkillVerified } from './is-skill-verified.entity';
import { CraftsmanUser } from '../craftsman-user/craftsman-user.entity';
import { WorkKind } from '../work-kind/work-kind.entity';
import { SystemNotificationModule } from '../system-notification/system-notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([IsSkillVerified, CraftsmanUser, WorkKind]),
    SystemNotificationModule,
  ],
  controllers: [IsSkillVerifiedController],
  providers: [IsSkillVerifiedService],
  exports: [IsSkillVerifiedService],
})
export class IsSkillVerifiedModule {}

