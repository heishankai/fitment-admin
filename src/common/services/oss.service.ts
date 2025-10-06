import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OSS from 'ali-oss';
import { OSS_CONFIG, UPLOAD_CONFIG } from '../constants/app.constants';

@Injectable()
export class OssService {
  private client: OSS;

  constructor() {
    this.client = new OSS({
      region: OSS_CONFIG.region,
      accessKeyId: OSS_CONFIG.accessKeyId,
      accessKeySecret: OSS_CONFIG.accessKeySecret,
      bucket: OSS_CONFIG.bucket,
      secure: true, // 强制使用HTTPS
    });
  }

  /**
   * 上传文件到OSS
   * @param file 文件对象
   * @param folder 文件夹名称，默认为 UPLOAD_CONFIG.defaultFolder
   * @returns 上传结果
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = UPLOAD_CONFIG.defaultFolder,
  ): Promise<{
    url: string;
    name: string;
    originalName: string;
    size: number;
    type: string;
  }> {
    try {
      // 验证文件大小
      if (file.size > UPLOAD_CONFIG.maxFileSize) {
        throw new HttpException(
          `文件大小不能超过 ${UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 验证文件类型
      if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
        throw new HttpException('不支持的文件类型', HttpStatus.BAD_REQUEST);
      }

      // 生成唯一文件名，保留原始文件名信息
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileExtension = this.getFileExtension(file.originalname);
      const originalName = file.originalname.replace(fileExtension, ''); // 去掉扩展名的原始名称
      const fileName = `${timestamp}_${randomStr}_${originalName}${fileExtension}`;
      const objectName = `${folder}/${fileName}`;

      // 上传到OSS
      const result = await this.client.put(objectName, file.buffer);

      return {
        url: result.url,
        name: fileName,
        originalName: file.originalname, // 保留原始文件名
        size: file.size,
        type: file.mimetype,
      };
    } catch (error) {
      console.error('OSS上传失败:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('文件上传失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 删除OSS文件
   * @param objectName 文件在OSS中的名称
   */
  async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.delete(objectName);
    } catch (error) {
      console.error('OSS删除失败:', error);
      throw new HttpException('文件删除失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 获取文件扩展名
   * @param filename 文件名
   * @returns 文件扩展名
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }

  /**
   * 生成文件访问URL（带签名）
   * @param objectName 文件在OSS中的名称
   * @param expires 过期时间（秒），默认1小时
   * @returns 带签名的URL
   */
  async getSignedUrl(
    objectName: string,
    expires: number = 3600,
  ): Promise<string> {
    try {
      return await this.client.signatureUrl(objectName, { expires });
    } catch (error) {
      console.error('生成签名URL失败:', error);
      throw new HttpException(
        '生成文件访问链接失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
