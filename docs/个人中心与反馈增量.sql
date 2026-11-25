-- 个人中心与用户反馈增量脚本
-- 仅新增反馈表，不修改或删除现有数据表。

USE `strawberry_guild`;

CREATE TABLE IF NOT EXISTS `user_feedback` (
    `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '反馈ID',
    `user_id`    BIGINT UNSIGNED NOT NULL COMMENT '提交用户ID',
    `type`       VARCHAR(20)     NOT NULL COMMENT '反馈类型：BUG/FEATURE/OTHER',
    `content`    VARCHAR(1000)   NOT NULL COMMENT '反馈内容',
    `contact`    VARCHAR(100)    DEFAULT NULL COMMENT '联系邮箱',
    `page_url`   VARCHAR(500)    NOT NULL DEFAULT '' COMMENT '提交时页面路径',
    `status`     TINYINT         NOT NULL DEFAULT 0 COMMENT '处理状态：0待处理 1处理中 2已处理',
    `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
    PRIMARY KEY (`id`),
    KEY `idx_feedback_user_created` (`user_id`, `created_at`),
    KEY `idx_feedback_status_created` (`status`, `created_at`),
    CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`)
        REFERENCES `sys_user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '用户反馈表';
