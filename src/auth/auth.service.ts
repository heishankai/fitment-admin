import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.userService.findByUsername(username);

    if (user?.password !== password) {
      throw new HttpException('用户名或密码错误', HttpStatus.BAD_REQUEST);
    }

    const payload = {
      username: user.username,
      userid: user.id,
    };

    return {
      token: this.jwtService.sign(payload),
    };
  }
}
