-- 通知与邮件功能增量脚本
USE `strawberry_guild`;

CREATE TABLE IF NOT EXISTS `user_notification` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '通知ID',
    `user_id`    BIGINT UNSIGNED NOT NULL COMMENT '接收用户ID',
    `title`      VARCHAR(100)    NOT NULL COMMENT '标题',
    `content`    TEXT            NOT NULL COMMENT '内容',
    `type`       VARCHAR(20)     NOT NULL DEFAULT 'SYSTEM' COMMENT '类型：SYSTEM/COMMENT/FOLLOW/LIKE',
    `is_read`    TINYINT         NOT NULL DEFAULT 0 COMMENT '0未读 1已读',
    `email_sent` TINYINT         NOT NULL DEFAULT 0 COMMENT '0未发送邮件 1已发送',
    `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_read` (`user_id`, `is_read`),
    KEY `idx_user_created` (`user_id`, `created_at`),
    CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`)
        REFERENCES `sys_user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户站内通知表';
