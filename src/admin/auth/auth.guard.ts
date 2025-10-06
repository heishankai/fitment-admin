import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JWT_CONFIG } from '../../common/constants/app.constants';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * 权限守卫
 * 通过实现 CanActivate 接口，定义 canActivate 方法来处理权限控制
 * 在 canActivate 方法中，获取请求上下文，并返回是否允许访问
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * 权限控制
   * @param context 请求上下文
   * @return boolean 是否允许访问
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否为公共路由
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      console.log('Public route, skipping authentication');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = extractToken(request);

    if (!token) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: JWT_CONFIG.secret,
      });

      // 兼容admin和微信两种token格式
      if (payload.type === 'wechat') {
        // 微信用户token格式
        request['user'] = {
          username: `wechat_${payload.openid}`,
          userid: payload.userId,
          openid: payload.openid,
          type: 'wechat',
        };
      } else {
        // admin用户token格式
        request['user'] = payload;
      }
    } catch (error) {
      throw new HttpException('未授权', HttpStatus.UNAUTHORIZED);
    }

    return true;
  }
}

/**
 * 提取token
 * @param request 请求
 * @returns token
 */
const extractToken = (request: any): string => {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];

  return type === 'Bearer' ? token : '';
};
