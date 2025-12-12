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
   * 根据经纬度获取地址信息（逆地理编码）- 使用腾讯地图
   * @param body { longitude: number, latitude: number, coordType?: number }
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

  /**
   * 根据经纬度获取地址信息（逆地理编码）- 使用高德地图
   * 兼容微信小程序：默认使用GCJ02坐标系（autonavi），可直接传入小程序获取的经纬度
   * @param body { longitude: number, latitude: number, coordType?: number }
   * @returns 地址信息
   */
  @Public()
  @Post('reverse-geocode-amap')
  async reverseGeocodeWithAmap(@Body(ValidationPipe) body: ReverseGeocodeDto) {
    try {
      const { longitude, latitude, coordType } = body;
      // 如果未指定坐标类型，默认使用autonavi（GCJ02，微信小程序标准坐标系）
      // 微信小程序 wx.getLocation() 返回的就是GCJ02坐标系，无需转换
      // coordType转换：1=GPS(WGS84) -> 'gps', 2=GCJ02 -> 'autonavi', 5=百度(BD09) -> 'baidu'
      const amapCoordType = coordType 
        ? (coordType === 1 ? 'gps' : coordType === 5 ? 'baidu' : 'autonavi')
        : 'autonavi';
      return await this.geolocationService.reverseGeocodeWithAmap(
        longitude,
        latitude,
        amapCoordType,
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
