import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { TENCENT_MAP_CONFIG, AMAP_CONFIG } from '../constants/app.constants';
import * as crypto from 'crypto';

/**
 * POI（兴趣点）信息接口
 */
export interface PoiInfo {
  id: string; // POI ID
  title: string; // POI名称
  address: string; // POI地址
  category: string; // POI类别
  distance: number; // 距离（米）
  location: {
    lat: number; // 纬度
    lng: number; // 经度
  };
}

/**
 * 地理位置信息接口
 */
export interface LocationInfo {
  province: string; // 省份
  city: string; // 城市
  district: string; // 区县
  street: string; // 街道
  streetNumber: string; // 街道号码
  address: string; // 详细地址
  formattedAddress: string; // 格式化后的完整地址（推荐格式）
  roughAddress: string; // 粗略地址
  adcode: string; // 区域编码
  nearestPoi?: PoiInfo; // 最近的POI信息（用于精确定位）
  pois?: PoiInfo[]; // 周边POI列表
}

@Injectable()
export class GeolocationService {
  /**
   * 根据经纬度获取地址信息（逆地理编码）
   * @param longitude 经度
   * @param latitude 纬度
   * @param coordType 坐标类型：1=GPS(WGS84), 2=腾讯地图(GCJ02), 5=百度(BD09)。默认为2（微信小程序返回的是GCJ02）
   * @returns 地址信息
   */
  async reverseGeocode(
    longitude: number,
    latitude: number,
    coordType: number = 2, // 默认使用GCJ02坐标系（微信小程序标准）
  ): Promise<LocationInfo> {
    try {
      // 验证经纬度范围
      if (
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        throw new HttpException('经纬度格式不正确', HttpStatus.BAD_REQUEST);
      }

      // 调用腾讯地图逆地理编码API（优化参数提高精度）
      const url = TENCENT_MAP_CONFIG.baseUrl;
      const response = await axios.get(url, {
        params: {
          key: TENCENT_MAP_CONFIG.key,
          location: `${latitude},${longitude}`, // 腾讯地图格式：纬度,经度
          get_poi: 1, // 是否返回周边POI列表，1返回，0不返回
          poi_options: 'address=1;radius=300;page_size=5', // POI选项：300米半径内最多5个
          coord_type: coordType, // 坐标类型：1=GPS(WGS84), 2=腾讯地图(GCJ02), 5=百度(BD09)
        },
      });

      // 检查API返回状态
      if (response.data.status !== 0) {
        throw new HttpException(
          `地理编码服务错误: ${response.data.message || '未知错误'}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const result = response.data.result;
      if (!result || !result.address_component) {
        throw new HttpException('无法解析地址信息', HttpStatus.NOT_FOUND);
      }

      const addressComponent = result.address_component;

      // 解析POI信息（用于精确定位）
      let nearestPoi: PoiInfo | undefined;
      let pois: PoiInfo[] | undefined;

      if (result.pois && result.pois.length > 0) {
        // 按距离排序，找到最近的POI
        const sortedPois = result.pois
          .filter((poi: any) => poi.distance !== undefined)
          .sort((a: any, b: any) => a.distance - b.distance);

        pois = sortedPois.map((poi: any) => ({
          id: poi.id || '',
          title: poi.title || poi.name || '',
          address: poi.address || '',
          category: poi.category || poi.type || '',
          distance: poi.distance || 0,
          location: {
            lat: parseFloat(poi.location?.lat || poi.lat || latitude.toString()),
            lng: parseFloat(poi.location?.lng || poi.lng || longitude.toString()),
          },
        }));

        if (pois && pois.length > 0) {
          nearestPoi = pois[0];
        }
      }

      // 构建更精确的地址信息
      const street = addressComponent.street || result.road || addressComponent.township || '';
      const streetNumber = addressComponent.street_number || '';
      
      // 使用POI信息增强地址精度（如果POI在50米内，优先使用POI地址）
      let preciseAddress = result.formatted_addresses?.recommend || result.address || '';
      if (nearestPoi && nearestPoi.distance < 50) {
        // 如果最近的POI在50米内，使用POI名称作为更精确的地址
        preciseAddress = `${nearestPoi.title}${preciseAddress ? `（${preciseAddress}）` : ''}`;
      }

      // 构建完整地址（包含更多层级信息）
      const fullAddressParts = [
        addressComponent.province,
        addressComponent.city || addressComponent.province,
        addressComponent.district,
        addressComponent.township || addressComponent.street,
        streetNumber,
      ].filter(Boolean);

      const fullAddress = fullAddressParts.join('') || preciseAddress;
      
      // 构建粗略地址（省市区）
      const roughAddress = [
        addressComponent.province,
        addressComponent.city || addressComponent.province,
        addressComponent.district,
      ]
        .filter(Boolean)
        .join('') || '';

      // 解析地址信息
      const locationInfo: LocationInfo = {
        province: addressComponent.province || '',
        city: addressComponent.city || addressComponent.province || '',
        district: addressComponent.district || '',
        street: street,
        streetNumber: streetNumber,
        address: fullAddress,
        formattedAddress: preciseAddress,
        roughAddress: roughAddress,
        adcode: addressComponent.adcode || '',
        nearestPoi,
        pois,
      };

      return locationInfo;
    } catch (error) {
      console.error('逆地理编码失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.response) {
        throw new HttpException(
          `地图服务请求失败: ${error.response.data?.message || error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        '获取地址信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 使用高德地图根据经纬度获取地址信息（逆地理编码）
   * @param longitude 经度
   * @param latitude 纬度
   * @param coordType 坐标类型：gps=GPS(WGS84), autonavi=高德地图(GCJ02), baidu=百度(BD09)。默认为autonavi（微信小程序返回的是GCJ02）
   * @returns 地址信息
   */
  async reverseGeocodeWithAmap(
    longitude: number,
    latitude: number,
    coordType: string = 'autonavi', // 默认使用GCJ02坐标系（微信小程序标准）
  ): Promise<LocationInfo> {
    try {
      // 验证经纬度范围
      if (
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        throw new HttpException('经纬度格式不正确', HttpStatus.BAD_REQUEST);
      }

      // 构建请求参数
      const params: any = {
        key: AMAP_CONFIG.key,
        location: `${longitude},${latitude}`, // 高德地图格式：经度,纬度（注意与腾讯地图相反）
        radius: 300, // 搜索半径（米）
        extensions: 'all', // 返回详细信息，包括POI
        roadlevel: 1, // 道路等级：0-返回所有道路，1-只返回主干道
        output: 'json', // 返回格式
      };

      // 如果指定了坐标类型，添加坐标类型参数
      if (coordType && coordType !== 'autonavi') {
        params.coordsys = coordType; // gps, autonavi, baidu
      }

      // 如果需要签名验证，生成签名
      // 高德地图Web服务API签名规则：对参数进行排序后拼接，然后MD5加密
      const sortedKeys = Object.keys(params).sort();
      const queryString = sortedKeys
        .map((key) => `${key}=${params[key]}`)
        .join('&');
      const signature = crypto
        .createHash('md5')
        .update(queryString + AMAP_CONFIG.secret)
        .digest('hex');
      params.sig = signature;

      // 调用高德地图逆地理编码API
      const url = AMAP_CONFIG.baseUrl;
      const response = await axios.get(url, { params });

      // 检查API返回状态
      if (response.data.status !== '1') {
        throw new HttpException(
          `高德地图服务错误: ${response.data.info || '未知错误'}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const regeocode = response.data.regeocode;
      if (!regeocode || !regeocode.addressComponent) {
        throw new HttpException('无法解析地址信息', HttpStatus.NOT_FOUND);
      }

      const addressComponent = regeocode.addressComponent;

      // 解析POI信息（用于精确定位）
      let nearestPoi: PoiInfo | undefined;
      let pois: PoiInfo[] | undefined;

      if (regeocode.pois && regeocode.pois.length > 0) {
        // 按距离排序，找到最近的POI
        const sortedPois = regeocode.pois
          .filter((poi: any) => poi.distance !== undefined)
          .sort((a: any, b: any) => parseFloat(a.distance) - parseFloat(b.distance));

        pois = sortedPois.map((poi: any) => ({
          id: poi.id || poi.poiid || '',
          title: poi.name || '',
          address: poi.address || '',
          category: poi.type || poi.business_area || '',
          distance: parseFloat(poi.distance || '0'),
          location: {
            lat: parseFloat(poi.location?.split(',')[1] || poi.lat || latitude.toString()),
            lng: parseFloat(poi.location?.split(',')[0] || poi.lng || longitude.toString()),
          },
        }));

        if (pois && pois.length > 0) {
          nearestPoi = pois[0];
        }
      }

      // 构建地址信息
      const street = addressComponent.street || addressComponent.township || '';
      const streetNumber = addressComponent.number || '';
      
      // 使用POI信息增强地址精度（如果POI在50米内，优先使用POI地址）
      let preciseAddress = regeocode.formatted_address || 
        (addressComponent.province || '') + 
        (addressComponent.city || '') + 
        (addressComponent.district || '') + 
        street + streetNumber;
      if (nearestPoi && nearestPoi.distance < 50) {
        // 如果最近的POI在50米内，使用POI名称作为更精确的地址
        preciseAddress = `${nearestPoi.title}${preciseAddress ? `（${preciseAddress}）` : ''}`;
      }

      // 构建完整地址（包含更多层级信息）
      const fullAddressParts = [
        addressComponent.province,
        addressComponent.city || addressComponent.province,
        addressComponent.district,
        addressComponent.township || addressComponent.street,
        streetNumber,
      ].filter(Boolean);

      const fullAddress = fullAddressParts.join('') || preciseAddress;
      
      // 构建粗略地址（省市区）
      const roughAddress = [
        addressComponent.province,
        addressComponent.city || addressComponent.province,
        addressComponent.district,
      ]
        .filter(Boolean)
        .join('') || '';

      // 解析地址信息
      const locationInfo: LocationInfo = {
        province: addressComponent.province || '',
        city: addressComponent.city || addressComponent.province || '',
        district: addressComponent.district || '',
        street: street,
        streetNumber: streetNumber,
        address: fullAddress,
        formattedAddress: preciseAddress,
        roughAddress: roughAddress,
        adcode: addressComponent.adcode || '',
        nearestPoi,
        pois,
      };

      return locationInfo;
    } catch (error) {
      console.error('高德地图逆地理编码失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.response) {
        throw new HttpException(
          `高德地图服务请求失败: ${error.response.data?.info || error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      throw new HttpException(
        '获取地址信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 批量逆地理编码（多个经纬度点）
   * @param locations 经纬度数组 [{longitude, latitude}, ...]
   * @returns 地址信息数组
   */
  async batchReverseGeocode(
    locations: Array<{ longitude: number; latitude: number }>,
  ): Promise<LocationInfo[]> {
    try {
      // 腾讯地图批量逆地理编码需要循环调用单个接口
      // 或者使用批量接口（如果腾讯地图支持）
      // 默认使用GCJ02坐标系（微信小程序标准）
      const results = await Promise.all(
        locations.map((loc) =>
          this.reverseGeocode(loc.longitude, loc.latitude, 2),
        ),
      );

      return results;
    } catch (error) {
      console.error('批量逆地理编码失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '批量获取地址信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 使用高德地图批量逆地理编码（多个经纬度点）
   * @param locations 经纬度数组 [{longitude, latitude}, ...]
   * @returns 地址信息数组
   */
  async batchReverseGeocodeWithAmap(
    locations: Array<{ longitude: number; latitude: number }>,
  ): Promise<LocationInfo[]> {
    try {
      // 高德地图批量逆地理编码需要循环调用单个接口
      // 默认使用GCJ02坐标系（微信小程序标准）
      const results = await Promise.all(
        locations.map((loc) =>
          this.reverseGeocodeWithAmap(loc.longitude, loc.latitude, 'autonavi'),
        ),
      );

      return results;
    } catch (error) {
      console.error('高德地图批量逆地理编码失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        '批量获取地址信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

