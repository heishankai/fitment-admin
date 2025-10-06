import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// entitly
import { Craftsman } from './craftsman.entity';
// service
import { CraftsmanService } from './craftsman.service';
// controller
import { CraftsmanController } from './craftsman.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Craftsman])], // 注册实体
  controllers: [CraftsmanController], // 注册控制器
  providers: [CraftsmanService], // 注册服务
  exports: [CraftsmanService], // 允许其他模块进行使用
})
export class CraftsmanModule {}
