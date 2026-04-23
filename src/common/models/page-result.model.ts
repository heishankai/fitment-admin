export interface PageResultOptions<T> {
  list: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export class PageResult<T = any> {
  list: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
  pageTotal: number;

  constructor(options: PageResultOptions<T>) {
    this.list = options.list;
    this.total = options.total;
    this.pageIndex = options.pageIndex;
    this.pageSize = options.pageSize;
    this.pageTotal = Math.ceil(options.total / options.pageSize);
  }
}
