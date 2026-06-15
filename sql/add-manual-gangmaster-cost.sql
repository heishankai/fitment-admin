ALTER TABLE `order`
  ADD COLUMN `gangmaster_cost_source` varchar(20) NOT NULL DEFAULT 'auto' COMMENT '工长费来源：auto 自动计算，manual 手动填写' AFTER `gangmaster_cost`,
  ADD COLUMN `manual_gangmaster_cost` decimal(10, 2) NULL COMMENT '手动填写的工长费总额' AFTER `gangmaster_cost_source`;
