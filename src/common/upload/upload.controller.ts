import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { OssService } from '../services/oss.service';
import { UPLOAD_CONFIG } from '../constants/app.constants';
import { Public } from '../../auth/public.decorator';

@Controller('upload')
export class UploadController {
  constructor(private readonly ossService: OssService) {}

  /**
   * 通用文件上传接口
   * @param file 上传的文件
   * @param body 包含folder参数，指定上传到哪个文件夹
   * @returns 上传结果
   */
  @Public()
  @Post()
  async uploadFile(@Req() req: FastifyRequest) {
    try {
      if (!req.isMultipart()) {
        throw new HttpException(
          '请使用 multipart/form-data 上传，字段名 file',
          HttpStatus.BAD_REQUEST,
        );
      }

      let folder: string | undefined;
      let buffer: Buffer | undefined;
      let mimetype = 'application/octet-stream';
      let originalname = 'file';

      for await (const part of req.parts()) {
        if (part.type === 'file' && part.fieldname === 'file') {
          buffer = await part.toBuffer();
          mimetype = part.mimetype || mimetype;
          originalname = part.filename || originalname;
        } else if (part.type === 'field' && part.fieldname === 'folder') {
          folder = String(part.value);
        }
      }

      if (!buffer) {
        throw new HttpException('没有接收到文件', HttpStatus.BAD_REQUEST);
      }

      // 与 OssService 约定的内存文件结构（与 Multer 在内存中存储时一致）
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname,
        encoding: '7bit',
        mimetype,
        size: buffer.length,
        buffer,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      const targetFolder = folder || UPLOAD_CONFIG.defaultFolder;
      const result = await this.ossService.uploadFile(file, targetFolder);

      return {
        url: result.url,
        name: result.name,
        originalName: result.originalName,
        size: result.size,
        type: result.type,
      };
    } catch (error) {
      console.error('文件上传失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      if (this.isFileSizeLimitError(error)) {
        throw new HttpException(
          this.getFileSizeLimitMessage(),
          HttpStatus.PAYLOAD_TOO_LARGE,
        );
      }
      throw new HttpException(
        error.message || '文件上传失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getFileSizeLimitMessage() {
    return `文件大小不能超过 ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`;
  }

  private isFileSizeLimitError(error: any) {
    const message = String(error?.message || '').toLowerCase();
    return (
      error?.statusCode === HttpStatus.PAYLOAD_TOO_LARGE ||
      error?.code === 'FST_REQ_FILE_TOO_LARGE' ||
      error?.name === 'RequestFileTooLargeError' ||
      message.includes('file too large') ||
      message.includes('request file too large')
    );
  }

  /**
   * 删除文件接口
   * @param body 包含fileUrl参数，指定要删除的文件URL
   * @returns 删除结果
   */
  @Public()
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
