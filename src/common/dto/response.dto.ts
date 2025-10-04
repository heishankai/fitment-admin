/**
 * 统一响应格式 DTO
 */

export class ApiResponseDto<T = any> {
  success: boolean;
  data: T | null;
  code: number;
  message: string | null;

  constructor(
    success: boolean,
    data: T | null,
    code: number,
    message: string | null = null,
  ) {
    this.success = success;
    this.data = data;
    this.code = code;
    this.message = message;
  }

  /**
   * 成功响应
   */
  static success<T>(
    data: T,
    code: number = 200,
    message: string | null = null,
  ): ApiResponseDto<T> {
    return new ApiResponseDto(true, data, code, message);
  }

  /**
   * 失败响应
   */
  static error(
    code: number,
    message: string,
    data: any = null,
  ): ApiResponseDto<null> {
    return new ApiResponseDto(false, data, code, message);
  }
}
