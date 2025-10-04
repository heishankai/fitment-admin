import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * 权限守卫
 * 通过实现 CanActivate 接口，定义 canActivate 方法来处理权限控制
 * 在 canActivate 方法中，获取请求上下文，并返回是否允许访问
 */
@Injectable()
export class AuthGuard implements CanActivate {
  /**
   * 权限控制
   * @param context 请求上下文
   * @return boolean 是否允许访问
   */
  canActivate(context: ExecutionContext): boolean {
    console.log('AuthGuard');
    return true;
  }
}
