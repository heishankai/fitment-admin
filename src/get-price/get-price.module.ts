import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { GetPrice } from './get-price.entity';
import { GetPriceService } from './get-price.service';
import { GetPriceController } from './get-price.controller';
import { GetPriceGateway } from './get-price.gateway';
import { JWT_CONFIG } from '../common/constants/app.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([GetPrice]),
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { expiresIn: JWT_CONFIG.expiresIn },
    }),
  ],
  controllers: [GetPriceController],
  providers: [GetPriceService, GetPriceGateway],
  exports: [GetPriceService, GetPriceGateway],
})
export class GetPriceModule {}

