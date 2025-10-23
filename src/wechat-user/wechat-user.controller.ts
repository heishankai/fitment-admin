import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { WechatUserService } from './wechat-user.service';
import { Public } from '../auth/public.decorator';
import { GetPhoneDto } from './dto/get-phone.dto';

@Public()
@Controller('wechat/wechat-user')
export class WechatUserController {
  constructor(private readonly wechatUserService: WechatUserService) {}

  /**
   * 微信用户登录
   * @param query { code: string }
   * @returns { openid: string }
   */
  @Get('login')
  async wechatLogin(@Query() query: { code: string }) {
    return this.wechatUserService.wechatLogin(query.code);
  }

  /**
   * 获取微信用户手机号码并创建/更新用户信息
   * @param body { code: string, openid: string }
   * @returns 完整的用户信息（包含token）
   */
  @Post('phone')
  async getPhoneNumberAndUpdateUser(@Body() body: GetPhoneDto) {
    return this.wechatUserService.getPhoneNumberAndUpdateUser(
      body.code,
      body.openid,
    );
  }
}
