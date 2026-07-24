
### 1. 用户表 (`users`)
| 列名 | 类型 | 约束/默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | 用户唯一ID |
| `username` | TEXT | UNIQUE NOT NULL | 用户名 |
| `password_hash` | TEXT | NOT NULL | 密码哈希值 |
| `created_at` | INTEGER | NOT NULL | 创建时间戳 |

### 2. 对话表 (`conversations`)
| 列名 | 类型 | 约束/默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | 对话唯一ID |
| `user_id` | TEXT | NOT NULL, FOREIGN KEY | 关联用户ID (ON DELETE CASCADE) |
| `title` | TEXT | NOT NULL DEFAULT '新对话' | 对话标题 |
| `model` | TEXT | NOT NULL DEFAULT 'deepseek-chat'| 当前对话默认模型 |
| `created_at` | INTEGER | NOT NULL | 创建时间戳 |
| `updated_at` | INTEGER | NOT NULL | 最后更新时间戳 |

**索引：**
- `idx_conversations_user_id`: ON `user_id`
- `idx_conversations_updated_at`: ON `user_id, updated_at DESC`

### 3. 消息表 (`messages`)
| 列名 | 类型 | 约束/默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | 消息唯一ID |
| `conversation_id` | TEXT | NOT NULL, FOREIGN KEY | 关联对话ID (ON DELETE CASCADE) |
| `role` | TEXT | NOT NULL | 角色 |
| `content` | TEXT | NOT NULL DEFAULT '' | 消息正文内容 |
| `timestamp` | INTEGER | NOT NULL | 发送时间戳 |
| `files` | TEXT | (可空) | 关联文件JSON字符串 |
| `reasoning_content`| TEXT | (可空) | 深度思考/推理内容 |
| `partial` | INTEGER | DEFAULT 0 | 截断/继续生成标记 (0:完整, 1:截断) |
| `prompt_tokens` | INTEGER | DEFAULT 0 | 输入Token消耗 |
| `completion_tokens`| INTEGER | DEFAULT 0 | 输出Token消耗 |
| `model` | TEXT | (可空) | 生成该消息的具体模型 |

**索引：**
- `idx_messages_conversation_id`: ON `conversation_id, timestamp DESC`

### 4. 文件表 (`uploaded_files`)
| 列名 | 类型 | 约束/默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | 文件唯一ID |
| `user_id` | TEXT | NOT NULL, FOREIGN KEY | 关联用户ID (ON DELETE CASCADE) |
| `original_name` | TEXT | NOT NULL | 原始文件名 |
| `mime_type` | TEXT | NOT NULL | 文件MIME类型 |
| `size` | INTEGER | NOT NULL | 文件大小(字节) |
| `stored_path` | TEXT | NOT NULL | 服务器存储路径 |
| `extracted_text` | TEXT | (可空) | 提取的文本内容 |
| `created_at` | INTEGER | NOT NULL | 上传时间戳 |

**索引：**
- `idx_uploaded_files_user_id`: ON `user_id`

### 5. 用户记忆表 (`user_memories`)
| 列名 | 类型 | 约束/默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `id` | TEXT | PRIMARY KEY | 记忆唯一ID |
| `user_id` | TEXT | NOT NULL, FOREIGN KEY | 关联用户ID (ON DELETE CASCADE) |
| `category` | TEXT | NOT NULL, CHECK | 分类(identity/address/preference/background/other) |
| `key` | TEXT | NOT NULL | 记忆键名 |
| `value` | TEXT | NOT NULL | 记忆内容 |
| `confidence` | REAL | NOT NULL DEFAULT 1.0 | 置信度 |
| `source` | TEXT | NOT NULL DEFAULT 'auto' | 来源(auto/manual) |
| `created_at` | INTEGER | NOT NULL | 创建时间戳 |
| `updated_at` | INTEGER | NOT NULL | 更新时间戳 |

**约束与索引：**
- 组合唯一约束: `UNIQUE(user_id, key)`
- 索引: `idx_user_memories_user_id` ON `user_id`