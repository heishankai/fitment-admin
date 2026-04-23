import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateStudentDto {
  @IsString({ message: '姓名必须是字符串' })
  @IsNotEmpty({ message: '姓名不能为空' })
  @MaxLength(64, { message: '姓名长度不能超过64个字符' })
  name: string;

  @IsInt({ message: '年龄必须是整数' })
  @Min(0, { message: '年龄不能小于0' })
  @Max(150, { message: '年龄不能大于150' })
  age: number;
}
