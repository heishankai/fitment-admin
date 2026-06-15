ALTER TABLE craftsman_user
  ADD COLUMN openid VARCHAR(64) NULL COMMENT '工匠端微信小程序 openid' AFTER phone,
  ADD UNIQUE KEY uk_craftsman_user_openid (openid);
