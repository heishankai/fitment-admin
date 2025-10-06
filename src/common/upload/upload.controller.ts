import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OssService } from '../services/oss.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly ossService: OssService) {}

  /**
   * 通用文件上传接口
   * @param file 上传的文件
   * @param body 包含folder参数，指定上传到哪个文件夹
   * @returns 上传结果
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { folder?: string },
  ) {
    try {
      if (!file) {
        throw new HttpException('没有接收到文件', HttpStatus.BAD_REQUEST);
      }

      // 默认上传到uploads文件夹，可以通过body.folder指定
      const folder = body.folder || 'uploads';

      // 上传到OSS
      const result = await this.ossService.uploadFile(file, folder);

      return {
        url: result.url,
        name: result.name,
        originalName: result.originalName,
        size: result.size,
        type: result.type,
        folder: folder,
      };
    } catch (error) {
      console.error('文件上传失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || '文件上传失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 图片上传接口（专门用于图片）
   * @param file 上传的图片文件
   * @param body 包含folder参数
   * @returns 上传结果
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { folder?: string },
  ) {
    try {
      if (!file) {
        throw new HttpException('没有接收到文件', HttpStatus.BAD_REQUEST);
      }

      // 验证是否为图片文件
      if (!file.mimetype.startsWith('image/')) {
        throw new HttpException('只能上传图片文件', HttpStatus.BAD_REQUEST);
      }

      const folder = body.folder || 'images';

      const result = await this.ossService.uploadFile(file, folder);

      return {
        url: result.url,
        name: result.name,
        originalName: result.originalName,
        size: result.size,
        type: result.type,
        folder: folder,
      };
    } catch (error) {
      console.error('图片上传失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || '图片上传失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * 删除文件接口
   * @param body 包含fileUrl参数，指定要删除的文件URL
   * @returns 删除结果
   */
  @Post('delete')
  async deleteFile(@Body() body: { fileUrl: string }) {
    try {
      if (!body.fileUrl) {
        throw new HttpException(
          '请提供要删除的文件URL',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 从URL中提取objectName
      const url = new URL(body.fileUrl);
      const objectName = url.pathname.substring(1); // 去掉开头的/

      await this.ossService.deleteFile(objectName);

      return {
        success: true,
        message: '文件删除成功',
      };
    } catch (error) {
      console.error('文件删除失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || '文件删除失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
