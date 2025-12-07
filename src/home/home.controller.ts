import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { HomeService } from './home.service';
import { QueryHomeStatisticsDto } from './dto/query-home-statistics.dto';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /**
   * 获取首页统计数据
   * @param queryDto 查询参数
   * @returns 统计数据
   */
  @Get('statistics')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getHomeStatistics(@Query() queryDto: QueryHomeStatisticsDto) {
    return await this.homeService.getHomeStatistics(queryDto.month);
  }
}
