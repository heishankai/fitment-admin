import {
  WORK_KIND_CODE_PLUMBING,
  WORK_KIND_CODE_TILER,
} from '../common/constants/app.constants';

/**
 * 工匠用户分页：`work_kind_code` 必须与 `work_kind.work_kind_code` 一致，
 * 服务端会校验是否存在；以下为常见工种编码常量，可按业务在 `work_kind` 表中同步扩充。
 *
 * （泥工 / 水电编码与同文件 app.constants 中工长里程碑配置一致）
 */
export enum CraftsmanUserPageWorkKindCode {
  NIGONG = WORK_KIND_CODE_TILER,
  SHUIDIAN = WORK_KIND_CODE_PLUMBING,
}
