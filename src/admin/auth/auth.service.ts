import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(private readonly userService: UserService) {}

  async login(username: string, password: string) {
    const user = await this.userService.findByUsername(username);
    console.log(user, 'user');

    if (user?.password !== password) {
      throw new UnauthorizedException('密码错误');
    }

    return {
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        // 注意：实际项目中不应该返回密码
        // password: user.password
      },
      token: 'jwt-token-placeholder', // 实际项目中应该生成JWT token
      timestamp: new Date().toISOString(),
    };
  }
}
