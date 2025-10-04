import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>, // 注入用户仓库
  ) {}

  /**
   * 查询单个用户信息
   * @param id 用户id
   * @returns 用户信息
   */
  getOneUser(id: number): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  /**
   * 查询所有用户信息
   * @returns 用户信息
   */
  getAllUser(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * 创建用户
   * @param user 用户信息
   * @returns 用户信息
   */
  createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = new User();
    user.username = createUserDto.username;
    user.password = createUserDto.password;
    user.role = createUserDto.role;
    user.active = createUserDto.active ?? true;
    user.avatar = createUserDto.avatar;
    return this.userRepository.save(user);
  }

  /**
   * 删除用户
   * @param id 用户id
   * @returns 删除结果
   */
  deleteUser(id: string): Promise<DeleteResult> {
    return this.userRepository.delete(id);
  }

  /**
   * 根据用户名查询用户
   * @param username 用户名
   * @returns 用户信息
   */
  findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOneBy({ username });
  }
}
