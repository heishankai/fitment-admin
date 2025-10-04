export class CreateUserDto {
  username: string;
  password: string;
  role: string;
  active?: boolean; // 可选字段，默认为 true
  avatar: string;
}
