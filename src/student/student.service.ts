import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { CreateStudentDto } from './dto/create-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Student } from './student.entity';

/**
 * 学生模块服务
 * @returns 返回学生业务处理结果
 */
@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  /**
   * 分页查询学生
   * @param dto 分页与筛选参数
   * @returns 学生分页结果
   */
  async page(dto: QueryStudentDto): Promise<{
    success: true;
    data: Student[];
    code: 200;
    message: null;
    pageIndex: number;
    pageSize: number;
    total: number;
    pageTotal: number;
  }> {
    const { pageIndex = 1, pageSize = 10, name } = dto;

    if (pageSize > 200) {
      throw new HttpException('每页数量不能超过200', HttpStatus.BAD_REQUEST);
    }

    const where = name ? { name: Like(`%${name}%`) } : {};
    const [list, total] = await this.studentRepository.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (pageIndex - 1) * pageSize,
      take: pageSize,
    });

    return {
      success: true,
      data: list,
      code: 200,
      message: null,
      pageIndex,
      pageSize,
      total,
      pageTotal: Math.ceil(total / pageSize),
    };
  }

  /**
   * 创建学生
   * @param dto 创建参数
   * @returns 创建后的学生记录
   */
  async create(dto: CreateStudentDto): Promise<Student> {
    const student = this.studentRepository.create(dto);
    return this.studentRepository.save(student);
  }

  /**
   * 根据ID获取学生
   * @param id 学生ID
   * @returns 学生详情
   */
  async findOne(id: number): Promise<Student> {
    const student = await this.studentRepository.findOne({ where: { id } });
    if (!student) {
      throw new HttpException('学生不存在', HttpStatus.NOT_FOUND);
    }
    return student;
  }

  /**
   * 更新学生
   * @param id 学生ID
   * @param dto 更新参数
   * @returns 更新后的学生记录
   */
  async update(id: number, dto: UpdateStudentDto): Promise<Student> {
    const student = await this.findOne(id);
    Object.assign(student, dto);
    return this.studentRepository.save(student);
  }

  /**
   * 删除学生
   * @param id 学生ID
   * @returns null
   */
  async remove(id: number): Promise<null> {
    const student = await this.findOne(id);
    await this.studentRepository.remove(student);
    return null;
  }
}
