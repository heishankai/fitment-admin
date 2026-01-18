import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WelcomeService } from './welcome.service';
import { WelcomeController } from './welcome.controller';
import { Welcome } from './welcome.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Welcome])],
  controllers: [WelcomeController],
  providers: [WelcomeService],
  exports: [WelcomeService],
})
export class WelcomeModule {}
