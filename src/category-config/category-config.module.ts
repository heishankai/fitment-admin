import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryConfigService } from './category-config.service';
import { CategoryConfigController } from './category-config.controller';
import { CategoryConfig } from './category-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryConfig])],
  controllers: [CategoryConfigController],
  providers: [CategoryConfigService],
  exports: [CategoryConfigService],
})
export class CategoryConfigModule {}
