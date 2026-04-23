import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  ValidationPipe,
} from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Student } from './student.entity';
import { StudentService } from './student.service';
import { Public } from '../auth/public.decorator';

/**
 * 学生模块控制器
 * @returns 返回学生相关接口结果（由全局拦截器统一包装）
 */
@Public() // 公共接口
@Controller('student')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  /**
   * 分页查询学生列表
   * @param dto 分页与筛选参数
   * @returns 学生分页数据
   */
  @Post('page')
  async page(@Body(ValidationPipe) dto: QueryStudentDto) {
    return this.studentService.page(dto);
  }

  /**
   * 创建学生
   * @param dto 学生创建参数
   * @returns 创建后的学生记录
   */
  @Post()
  async create(@Body(ValidationPipe) dto: CreateStudentDto): Promise<Student> {
    return this.studentService.create(dto);
  }

  /**
   * 根据ID查询学生详情
   * @param id 学生ID
   * @returns 学生详情
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Student> {
    return this.studentService.findOne(id);
  }

  /**
   * 更新学生信息
   * @param id 学生ID
   * @param dto 学生更新参数
   * @returns 更新后的学生记录
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) dto: UpdateStudentDto,
  ): Promise<Student> {
    return this.studentService.update(id, dto);
  }

  /**
   * 删除学生
   * @param id 学生ID
   * @returns null
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<null> {
    return this.studentService.remove(id);
  }
}
