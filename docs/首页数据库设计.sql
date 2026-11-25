-- =============================================================
-- 莓攻略 · 首页数据库设计
-- 数据库：MySQL 8.0+
-- 字符集：utf8mb4
-- 对应文档：docs/首页接口文档.md
--
-- 表关系：
--   sys_user 1 ── N post            帖子作者
--   post     1 ── N post_image      帖子配图
--   post     N ── N tag             通过 post_tag 关联
--   sys_user N ── N post            通过 post_like / post_collect 记录互动
--   sys_user N ── N sys_user        通过 user_follow 记录关注关系
-- =============================================================


CREATE DATABASE IF NOT EXISTS `strawberry_guild`
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `strawberry_guild`;

-- -------------------------------------------------------------
-- 1. 用户表
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user` (
                            `id`         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '用户ID',
                            `username`   VARCHAR(50)      NOT NULL                COMMENT '登录名，唯一',
                            `password`   VARCHAR(100)     NOT NULL                COMMENT '密码（BCrypt 加密存储）',
                            `nickname`   VARCHAR(50)      NOT NULL                COMMENT '昵称，展示用',
                            `avatar`     VARCHAR(255)     NOT NULL DEFAULT ''     COMMENT '头像URL，空则前端用昵称首字母生成',
                            `level`      TINYINT UNSIGNED NOT NULL DEFAULT 1      COMMENT '用户等级',
                            `status`     TINYINT          NOT NULL DEFAULT 1      COMMENT '状态：1正常 0禁用',
                            `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            PRIMARY KEY (`id`),
                            UNIQUE KEY `uk_username` (`username`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '用户表';

-- -------------------------------------------------------------
-- 2. 帖子表（首页帖子流核心表）
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `post`;
CREATE TABLE `post` (
                        `id`            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '帖子ID',
                        `author_id`     BIGINT UNSIGNED  NOT NULL                COMMENT '作者ID',
                        `title`         VARCHAR(200)     NOT NULL DEFAULT ''     COMMENT '标题，可为空',
                        `content`       TEXT             NOT NULL                COMMENT '正文',
                        `category`      VARCHAR(20)      NOT NULL DEFAULT '推荐' COMMENT '分类：游戏/影视/AI/推荐',
                        `cover`         VARCHAR(255)     NOT NULL DEFAULT ''     COMMENT '封面图URL',
                        `like_count`    INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '点赞数（冗余计数）',
                        `comment_count` INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '评论数（冗余计数）',
                        `collect_count` INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '收藏数（冗余计数）',
                        `share_count`   INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '分享数（冗余计数）',
                        `view_count`    INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '浏览数（冗余计数）',
                        `status`        TINYINT          NOT NULL DEFAULT 1      COMMENT '状态：1已发布 0草稿/已删除',
                        `created_at`    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        `updated_at`    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        PRIMARY KEY (`id`),
    -- 推荐流 / Tab 分类：WHERE category=? ORDER BY created_at DESC
                        KEY `idx_category_created` (`category`, `created_at` DESC),
    -- 推荐流：ORDER BY created_at DESC
                        KEY `idx_created` (`created_at` DESC),
    -- 最热排序：ORDER BY like_count DESC
                        KEY `idx_like` (`like_count` DESC),
    -- 关注流 / 作者主页：WHERE author_id=? ORDER BY created_at DESC
                        KEY `idx_author_created` (`author_id`, `created_at` DESC),
    -- 关键词搜索（中文 ngram 分词，MySQL 5.7.6+ 支持）
                        FULLTEXT KEY `ft_title_content` (`title`, `content`) WITH PARSER ngram,
                        CONSTRAINT `fk_post_author` FOREIGN KEY (`author_id`)
                            REFERENCES `sys_user` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '帖子表';

-- -------------------------------------------------------------
-- 3. 标签表
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `tag`;
CREATE TABLE `tag` (
                       `id`         BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '标签ID',
                       `name`       VARCHAR(30)      NOT NULL                COMMENT '标签名',
                       `post_count` INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '关联帖子数（冗余，用于热门标签排序）',
                       `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       PRIMARY KEY (`id`),
                       UNIQUE KEY `uk_name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '标签表';

-- -------------------------------------------------------------
-- 4. 帖子-标签关联表
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `post_tag`;
CREATE TABLE `post_tag` (
                            `post_id`    BIGINT UNSIGNED NOT NULL,
                            `tag_id`     BIGINT UNSIGNED NOT NULL,
                            `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (`post_id`, `tag_id`),
                            KEY `idx_tag` (`tag_id`),
                            CONSTRAINT `fk_pt_post` FOREIGN KEY (`post_id`)
                                REFERENCES `post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
                            CONSTRAINT `fk_pt_tag` FOREIGN KEY (`tag_id`)
                                REFERENCES `tag` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '帖子标签关联表';

-- -------------------------------------------------------------
-- 5. 帖子配图表
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `post_image`;
CREATE TABLE `post_image` (
                              `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                              `post_id`    BIGINT UNSIGNED NOT NULL COMMENT '帖子ID',
                              `url`        VARCHAR(255)    NOT NULL COMMENT '图片URL',
                              `sort_order` INT             NOT NULL DEFAULT 0 COMMENT '展示顺序，从0开始',
                              `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              PRIMARY KEY (`id`),
                              KEY `idx_post_sort` (`post_id`, `sort_order`),
                              CONSTRAINT `fk_img_post` FOREIGN KEY (`post_id`)
                                  REFERENCES `post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '帖子配图表';

-- -------------------------------------------------------------
-- 6. 点赞记录表
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `post_like`;
CREATE TABLE `post_like` (
                             `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                             `post_id`    BIGINT UNSIGNED NOT NULL,
                             `user_id`    BIGINT UNSIGNED NOT NULL,
                             `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             PRIMARY KEY (`id`),
                             UNIQUE KEY `uk_like_post_user` (`post_id`, `user_id`),
                             KEY `idx_like_user` (`user_id`),
                             CONSTRAINT `fk_like_post` FOREIGN KEY (`post_id`)
                                 REFERENCES `post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
                             CONSTRAINT `fk_like_user` FOREIGN KEY (`user_id`)
                                 REFERENCES `sys_user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '帖子点赞记录表';

-- -------------------------------------------------------------
-- 7. 收藏记录表
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `post_collect`;
CREATE TABLE `post_collect` (
                                `id`         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                                `post_id`    BIGINT UNSIGNED NOT NULL,
                                `user_id`    BIGINT UNSIGNED NOT NULL,
                                `created_at` DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                PRIMARY KEY (`id`),
                                UNIQUE KEY `uk_collect_post_user` (`post_id`, `user_id`),
                                KEY `idx_collect_user` (`user_id`),
                                CONSTRAINT `fk_collect_post` FOREIGN KEY (`post_id`)
                                    REFERENCES `post` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
                                CONSTRAINT `fk_collect_user` FOREIGN KEY (`user_id`)
                                    REFERENCES `sys_user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '帖子收藏记录表';

-- -------------------------------------------------------------
-- 8. 用户关注关系表
-- -------------------------------------------------------------
DROP TABLE IF EXISTS `user_follow`;
CREATE TABLE `user_follow` (
                               `id`           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                               `follower_id`  BIGINT UNSIGNED NOT NULL COMMENT '关注发起人',
                               `following_id` BIGINT UNSIGNED NOT NULL COMMENT '被关注人',
                               `created_at`   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               PRIMARY KEY (`id`),
                               UNIQUE KEY `uk_follow` (`follower_id`, `following_id`),
                               KEY `idx_following` (`following_id`),
                               CONSTRAINT `fk_follow_follower` FOREIGN KEY (`follower_id`)
                                   REFERENCES `sys_user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
                               CONSTRAINT `fk_follow_following` FOREIGN KEY (`following_id`)
                                   REFERENCES `sys_user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT = '用户关注关系表';

-- -------------------------------------------------------------
-- 9. 触发器：防止自己关注自己
--    （MySQL 限制：外键带 ON DELETE/UPDATE CASCADE 时，
--     引用列不能出现在 CHECK 约束中，故改用触发器）
-- -------------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_user_follow_not_self_insert`;
DROP TRIGGER IF EXISTS `trg_user_follow_not_self_update`;

DELIMITER //

CREATE TRIGGER `trg_user_follow_not_self_insert`
    BEFORE INSERT ON `user_follow`
    FOR EACH ROW
BEGIN
    IF NEW.follower_id = NEW.following_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '不能关注自己';
    END IF;
END //

CREATE TRIGGER `trg_user_follow_not_self_update`
    BEFORE UPDATE ON `user_follow`
    FOR EACH ROW
BEGIN
    IF NEW.follower_id = NEW.following_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '不能关注自己';
    END IF;
END //

DELIMITER ;
-- =============================================================
-- 首页核心查询参考 SQL（对应接口文档）
-- =============================================================

-- 【接口1】推荐流 / 最新
-- SELECT p.*, u.nickname AS author, u.avatar, u.level
-- FROM post p JOIN sys_user u ON u.id = p.author_id
-- WHERE p.status = 1 AND p.category = '游戏'
-- ORDER BY p.created_at DESC
-- LIMIT 0, 10;

-- 【接口1】推荐流 / 最热
-- SELECT p.*, u.nickname AS author, u.avatar, u.level
-- FROM post p JOIN sys_user u ON u.id = p.author_id
-- WHERE p.status = 1
-- ORDER BY p.like_count DESC
-- LIMIT 0, 10;

-- 【接口1】关注流（feed=follow，需登录）
-- SELECT p.*, u.nickname AS author, u.avatar, u.level
-- FROM post p
-- JOIN sys_user u ON u.id = p.author_id
-- JOIN user_follow f ON f.following_id = p.author_id AND f.follower_id = :currentUserId
-- WHERE p.status = 1
-- ORDER BY p.created_at DESC
-- LIMIT 0, 10;

-- 【接口1】关键词搜索（keyword）
-- SELECT p.*, u.nickname AS author, u.avatar, u.level
-- FROM post p JOIN sys_user u ON u.id = p.author_id
-- WHERE p.status = 1
--   AND MATCH(p.title, p.content) AGAINST (:keyword IN NATURAL LANGUAGE MODE)
-- ORDER BY p.created_at DESC
-- LIMIT 0, 10;

-- 【接口1】当前用户是否已点赞/收藏（列表查询时 LEFT JOIN 补充 liked / collected）
-- SELECT p.id,
--        (l.id IS NOT NULL) AS liked,
--        (c.id IS NOT NULL) AS collected
-- FROM post p
-- LEFT JOIN post_like l   ON l.post_id = p.id AND l.user_id = :currentUserId
-- LEFT JOIN post_collect c ON c.post_id = p.id AND c.user_id = :currentUserId
-- WHERE p.id IN (:postIds);

-- 【接口5】全站热榜（无需建热榜表，实时计算；数据量大后可加缓存或定时表）
-- SELECT
--   ROW_NUMBER() OVER (
--     ORDER BY (p.view_count + p.like_count * 3 + p.collect_count * 2) DESC
--   ) AS `rank`,
--   p.id AS postId,
--   COALESCE(NULLIF(p.title, ''), LEFT(p.content, 30)) AS title,
--   CAST(p.view_count + p.like_count * 3 + p.collect_count * 2 AS CHAR) AS heat
-- FROM post p
-- WHERE p.status = 1
-- ORDER BY (p.view_count + p.like_count * 3 + p.collect_count * 2) DESC
-- LIMIT 10;

-- 【接口6】热门标签
-- SELECT id, name, post_count AS count
-- FROM tag
-- ORDER BY post_count DESC
-- LIMIT 20;

-- 【接口3/4】点赞 / 取消点赞（切换式，事务内维护 post.like_count）
-- 点赞：
-- INSERT IGNORE INTO post_like (post_id, user_id) VALUES (:postId, :userId);
-- UPDATE post SET like_count = like_count + 1 WHERE id = :postId AND ROW_COUNT() = 1;
-- 取消：
-- DELETE FROM post_like WHERE post_id = :postId AND user_id = :userId;
-- UPDATE post SET like_count = GREATEST(like_count - 1, 0) WHERE id = :postId AND ROW_COUNT() = 1;
-- 收藏逻辑与点赞一致，操作 post_collect / post.collect_count。

-- =============================================================
-- 设计说明
-- =============================================================
-- 1. 计数冗余：post 表中的 like_count / comment_count / collect_count / share_count
--    / view_count 为冗余字段，用于列表排序与展示，避免每次 COUNT(*)。
--    点赞、收藏、评论等操作需在同一事务中同步更新计数。
-- 2. 软删除：post 用 status 标记，不物理删除，便于恢复与统计。
-- 3. 关键词搜索：MySQL 8 需开启 ngram 分词（my.cnf 中 ngram_token_size 默认 2 即可），
--    否则中文 FULLTEXT 检索效果差；数据量大建议改用 Elasticsearch。
-- 4. 热榜：默认实时聚合查询，10 万级以内性能可接受；后续可加 Redis 缓存或
--    定时生成 hot_topic 快照表（字段：rank_no / post_id / title / heat / period）。
-- 5. 认证：建议 JWT 无状态登录，无需 Token 表；若需服务端强制注销，
--    可新增 user_token（id / user_id / token / expire_at）做黑名单。
-- 6. 评论功能：首页仅展示 comment_count。后续做评论时新增 comment 表
--    （id / post_id / user_id / parent_id / content / created_at）。
-- 7. 时间：数据库存 DATETIME，接口返回毫秒时间戳，由后端转换。
