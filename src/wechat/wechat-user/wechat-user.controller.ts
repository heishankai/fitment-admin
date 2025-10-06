import { Controller, Get, Query } from '@nestjs/common';
import { WechatUserService } from './wechat-user.service';
import { Public } from '../../admin/auth/public.decorator';

@Controller('wechat/wechat-user')
export class WechatUserController {
  constructor(private readonly wechatUserService: WechatUserService) {}

  /**
   * 微信用户登录
   * @param query { code: string }
   * @returns 用户信息和token
   */
  @Public()
  @Get('login')
  async wechatLogin(@Query() query: { code: string }) {
    return this.wechatUserService.wechatLogin(query.code);
  }
}
