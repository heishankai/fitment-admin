import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { Public } from '../../auth/public.decorator';
import { GeolocationService } from '../services/geolocation.service';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';

@Controller('geolocation')
export class GeolocationController {
  constructor(private readonly geolocationService: GeolocationService) {}

  /**
   * 根据经纬度获取地址信息（逆地理编码）
   * @param body { longitude: number, latitude: number }
   * @returns 地址信息
   */
  @Public()
  @Post('reverse-geocode')
  async reverseGeocode(@Body(ValidationPipe) body: ReverseGeocodeDto) {
    try {
      const { longitude, latitude, coordType } = body;
      // 如果未指定坐标类型，默认使用2（GCJ02，微信小程序标准坐标系）
      return await this.geolocationService.reverseGeocode(
        longitude,
        latitude,
        coordType || 2,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '获取地址信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
