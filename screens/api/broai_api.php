<?php
// broai_api.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class BroAIAPI {
    private $host = '';
    private $username = '';
    private $password = '';
    private $database = '';
    private $conn;

    public function __construct() {
        $this->connectDatabase();
        $this->createTables();
    }

    private function connectDatabase() {
        try {
            $this->conn = new mysqli($this->host, $this->username, $this->password, $this->database);
            if ($this->conn->connect_error) {
                throw new Exception("Connection failed: " . $this->conn->connect_error);
            }
            $this->conn->set_charset("utf8mb4");
        } catch (Exception $e) {
            $this->sendResponse(false, "Database connection error: " . $e->getMessage());
        }
    }

    private function createTables() {
        // Users table
        $userTable = "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            uid VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) NOT NULL,
            display_name VARCHAR(255),
            email_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_uid (uid),
            INDEX idx_email (email)
        )";

        // Image chats table
        $chatTable = "CREATE TABLE IF NOT EXISTS image_chats (
            id INT AUTO_INCREMENT PRIMARY KEY,
            chat_id VARCHAR(255) NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            prompt TEXT NOT NULL,
            image_url TEXT NOT NULL,
            model VARCHAR(255) NOT NULL,
            upscaled BOOLEAN DEFAULT FALSE,
            upscaled_url TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_chat_id (chat_id),
            INDEX idx_user_id (user_id),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
        )";

        // Image Reports Table
        $reportTable = "CREATE TABLE IF NOT EXISTS image_reports (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            report_id CHAR(16) NOT NULL UNIQUE,
            user_id VARCHAR(255) NOT NULL,
            chat_id VARCHAR(255) NOT NULL,
            prompt TEXT,
            image_url TEXT,
            task_uuid VARCHAR(255),
            reported TINYINT DEFAULT 0,
            report_reason VARCHAR(255),
            report_details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reported_at DATETIME NULL,
            INDEX(user_id),
            INDEX(report_id),
            INDEX(chat_id)
        )";

        // User responses (chat messages)
        $responseTable = "CREATE TABLE IF NOT EXISTS user_responses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            chat_id VARCHAR(255) NOT NULL,
            report_id CHAR(16) NULL,
            message_type ENUM('user', 'assistant') NOT NULL,
            content TEXT NOT NULL,
            message_data JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_chat_id (chat_id),
            INDEX idx_report_id (report_id),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
        )";

        try {
            $this->conn->query($userTable);
            $this->conn->query($chatTable);
            $this->conn->query($reportTable);
            $this->conn->query($responseTable);

            $this->ensureTableStructure();
        } catch (Exception $e) {
            error_log("Table creation error: " . $e->getMessage());
        }
    }

    private function ensureTableStructure() {
        // Check and add report_id column to user_responses if it doesn't exist
        $checkReportId = $this->conn->query("SHOW COLUMNS FROM user_responses LIKE 'report_id'");
        if ($checkReportId->num_rows === 0) {
            $alterQuery = "ALTER TABLE user_responses 
                          ADD COLUMN report_id CHAR(16) NULL AFTER chat_id,
                          ADD INDEX idx_report_id (report_id)";
            $this->conn->query($alterQuery);
            error_log("Added report_id column to user_responses table");
        }
    }

    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];

        if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['action'])) {
                $this->sendResponse(false, "Invalid request format");
            }

            switch ($input['action']) {
                case 'save_chat':
                    $this->saveChatData($input);
                    break;
                case 'save_user':
                    $this->saveUserData($input);
                    break;
                case 'get_chat_history':
                case 'GET_get_chat_history':
                    $this->getChatHistory($input);
                    break;
                case 'update_upscale':
                    $this->updateUpscaleData($input);
                    break;
                case 'delete_chat':
                    $this->deleteChat($input);
                    break;
                case 'submit_report':
                    $this->submitReport($input);
                    break;
                default:
                    $this->sendResponse(false, "Invalid action");
            }
        } else if ($method === 'GET') {
            $this->getStats();
        } else {
            $this->sendResponse(false, "Method not allowed");
        }
    }

    private function saveChatData($data) {
        try {
            $required = ['user_id', 'chat_id', 'prompt', 'image_url', 'model'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    $this->sendResponse(false, "Missing required field: $field");
                }
            }

            // ✅ TRY TO DOWNLOAD AND SAVE IMAGE TO usergeneration FOLDER
            $uploadedImagePath = $this->downloadAndSaveImage($data['image_url'], $data['user_id']);
            
            // ✅ FALLBACK TO ORIGINAL URL IF UPLOAD FAILS
            if (!$uploadedImagePath) {
                error_log("Image upload failed, using original Runware URL");
                $uploadedImagePath = $data['image_url'];
            }

            // Ensure user exists
            $this->ensureUserExists($data['user_id']);

            // Generate unique report_id
            $report_id = bin2hex(random_bytes(8));

            // Check if chat exists
            $checkSql = "SELECT id FROM image_chats WHERE chat_id = ? AND user_id = ?";
            $checkStmt = $this->conn->prepare($checkSql);
            if (!$checkStmt) {
                $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
            }
            $checkStmt->bind_param("ss", $data['chat_id'], $data['user_id']);
            $checkStmt->execute();
            $exists = $checkStmt->get_result()->num_rows > 0;
            $checkStmt->close();

            if ($exists) {
                $updateSql = "UPDATE image_chats SET prompt = ?, image_url = ?, model = ?, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ? AND user_id = ?";
                $updateStmt = $this->conn->prepare($updateSql);
                if (!$updateStmt) {
                    $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
                }
                $updateStmt->bind_param("sssss", $data['prompt'], $uploadedImagePath, $data['model'], $data['chat_id'], $data['user_id']);
                $updateStmt->execute();
                $updateStmt->close();
            } else {
                $insertSql = "INSERT INTO image_chats (chat_id, user_id, prompt, image_url, model) VALUES (?, ?, ?, ?, ?)";
                $insertStmt = $this->conn->prepare($insertSql);
                if (!$insertStmt) {
                    $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
                }
                $insertStmt->bind_param("sssss", $data['chat_id'], $data['user_id'], $data['prompt'], $uploadedImagePath, $data['model']);
                $insertStmt->execute();
                $insertStmt->close();
            }

            // Save to image_reports
            $task_uuid = $data['task_uuid'] ?? null;
            $reportSql = "INSERT INTO image_reports 
                (report_id, user_id, chat_id, prompt, image_url, task_uuid) 
                VALUES (?, ?, ?, ?, ?, ?)";
            $reportStmt = $this->conn->prepare($reportSql);
            if (!$reportStmt) {
                $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
            }
            $reportStmt->bind_param("ssssss", $report_id, $data['user_id'], $data['chat_id'], $data['prompt'], $uploadedImagePath, $task_uuid);
            $reportStmt->execute();
            $reportStmt->close();

            // Save user & assistant messages
            $this->saveUserResponse($data['user_id'], $data['chat_id'], 'user', $data['prompt'], null, $report_id);
            $this->saveUserResponse($data['user_id'], $data['chat_id'], 'assistant', $uploadedImagePath, [
                'type' => 'image',
                'prompt' => $data['prompt'],
                'model' => $data['model']
            ], $report_id);

            // ✅ SEND CLEAR JSON RESPONSE
            $this->sendResponse(true, "Chat saved successfully", [
                'report_id' => $report_id,
                'image_url' => $uploadedImagePath,
                'uploaded_to_server' => ($uploadedImagePath !== $data['image_url'])
            ]);
            
        } catch (Exception $e) {
            error_log("Save chat error: " . $e->getMessage());
            $this->sendResponse(false, "Database error: " . $e->getMessage());
        }
    }

    // ✅ NEW FUNCTION: DOWNLOAD AND SAVE IMAGE TO usergeneration FOLDER
    private function downloadAndSaveImage($imageUrl, $userId) {
        try {
            // usergeneration folder ke andar user-specific directory
            $uploadDir = __DIR__ . '/usergeneration/';
            
            // Create directory if not exists
            if (!is_dir($uploadDir)) {
                if (!mkdir($uploadDir, 0755, true)) {
                    error_log("Failed to create directory: " . $uploadDir);
                    return false;
                }
            }

            // Check if directory is writable
            if (!is_writable($uploadDir)) {
                error_log("Directory not writable: " . $uploadDir);
                return false;
            }

            // Generate unique filename
            $filename = 'img_' . time() . '_' . bin2hex(random_bytes(4)) . '.jpg';
            $filepath = $uploadDir . $filename;

            // Set timeout for file_get_contents
            $context = stream_context_create([
                'http' => [
                    'timeout' => 30,
                    'ignore_errors' => true
                ]
            ]);

            // Download image from Runware URL
            $imageData = @file_get_contents($imageUrl, false, $context);
            
            if ($imageData === false) {
                error_log("Failed to download image from: " . $imageUrl);
                return false;
            }

            // Validate image data
            if (strlen($imageData) < 100) {
                error_log("Downloaded image too small, possibly corrupted");
                return false;
            }

            // Save image to server
            $saved = file_put_contents($filepath, $imageData);
            
            if ($saved === false) {
                error_log("Failed to save image to: " . $filepath);
                return false;
            }

            // Return public URL (WITHOUT user_id in path since folder structure is just usergeneration/)
            $publicUrl = '/usergeneration/' . $filename;
            
            error_log("Image saved successfully: " . $publicUrl);
            return $publicUrl;
            
        } catch (Exception $e) {
            error_log("Image download error: " . $e->getMessage());
            return false;
        }
    }

    private function submitReport($data) {
        try {
            $required = ['report_id', 'reason'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    $this->sendResponse(false, "Missing required field: $field");
                }
            }

            $details = $data['details'] ?? '';
            $user_id = $data['user_id'] ?? '';

            $sql = "UPDATE image_reports 
                    SET reported = 1, 
                        report_reason = ?, 
                        report_details = ?, 
                        reported_at = NOW()
                    WHERE report_id = ? AND user_id = ?";
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
            }
            $stmt->bind_param("ssss", $data['reason'], $details, $data['report_id'], $user_id);
            $stmt->execute();

            if ($stmt->affected_rows > 0) {
                $this->sendResponse(true, "Image reported successfully");
            } else {
                $this->sendResponse(false, "Report ID not found or already reported");
            }
            $stmt->close();
        } catch (Exception $e) {
            error_log("Submit report error: " . $e->getMessage());
            $this->sendResponse(false, "Database error");
        }
    }

    private function saveUserResponse($userId, $chatId, $messageType, $content, $messageData = null, $reportId = null) {
        try {
            $sql = "INSERT INTO user_responses (user_id, chat_id, report_id, message_type, content, message_data) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                error_log("Prepare error in saveUserResponse: " . $this->conn->error);
                return;
            }
            $messageDataJson = $messageData ? json_encode($messageData) : null;
            $stmt->bind_param("ssssss", $userId, $chatId, $reportId, $messageType, $content, $messageDataJson);
            $stmt->execute();
            $stmt->close();
        } catch (Exception $e) {
            error_log("Error saving user response: " . $e->getMessage());
        }
    }

    private function saveUserData($data) {
        try {
            $required = ['uid', 'email'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    $this->sendResponse(false, "Missing required field: $field");
                }
            }

            $displayName = $data['display_name'] ?? '';
            $emailVerified = $data['email_verified'] ?? false;

            $checkSql = "SELECT id FROM users WHERE uid = ?";
            $checkStmt = $this->conn->prepare($checkSql);
            if (!$checkStmt) {
                $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
            }
            $checkStmt->bind_param("s", $data['uid']);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            $checkStmt->close();

            if ($result->num_rows > 0) {
                $updateSql = "UPDATE users SET email = ?, display_name = ?, email_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE uid = ?";
                $updateStmt = $this->conn->prepare($updateSql);
                if (!$updateStmt) {
                    $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
                }
                $updateStmt->bind_param("ssbs", $data['email'], $displayName, $emailVerified, $data['uid']);
                $updateStmt->execute();
                $updateStmt->close();
                $this->sendResponse(true, "User updated successfully");
            } else {
                $insertSql = "INSERT INTO users (uid, email, display_name, email_verified) VALUES (?, ?, ?, ?)";
                $insertStmt = $this->conn->prepare($insertSql);
                if (!$insertStmt) {
                    $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
                }
                $insertStmt->bind_param("ssss", $data['uid'], $data['email'], $displayName, $emailVerified);
                $insertStmt->execute();
                $lastId = $this->conn->insert_id;
                $insertStmt->close();
                $this->sendResponse(true, "User saved successfully", ['id' => $lastId]);
            }
        } catch (Exception $e) {
            error_log("Save user error: " . $e->getMessage());
            $this->sendResponse(false, "Database error: " . $e->getMessage());
        }
    }

    // ✅ FIXED: Get chat history from user_responses table
    private function getChatHistory($data) {
        try {
            $userId = $data['user_id'] ?? '';
            $limit = (int)($data['limit'] ?? 50);
            $offset = (int)($data['offset'] ?? 0);
            
            if (empty($userId)) {
                $this->sendResponse(false, "User ID is required");
            }

            // ✅ Step 1: Get unique chat_ids for user from user_responses
            $chatIdsSql = "SELECT DISTINCT chat_id, MAX(created_at) as last_message_time
                          FROM user_responses
                          WHERE user_id = ?
                          GROUP BY chat_id
                          ORDER BY last_message_time DESC
                          LIMIT ? OFFSET ?";

            $chatIdsStmt = $this->conn->prepare($chatIdsSql);
            if (!$chatIdsStmt) {
                $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
            }
            $chatIdsStmt->bind_param("sii", $userId, $limit, $offset);
            $chatIdsStmt->execute();
            $chatIdsResult = $chatIdsStmt->get_result();

            $chats = [];
            while ($chatRow = $chatIdsResult->fetch_assoc()) {
                $chatId = $chatRow['chat_id'];
                
                // ✅ Step 2: Get all messages for this chat_id from user_responses
                $messageSql = "SELECT 
                                    ur.message_type, 
                                    ur.content, 
                                    ur.message_data, 
                                    ur.report_id,
                                    ur.created_at,
                                    CASE 
                                        WHEN ir.report_id IS NOT NULL AND ir.reported = 1 THEN 1 
                                        ELSE 0 
                                    END AS isReported
                               FROM user_responses ur
                               LEFT JOIN image_reports ir ON ur.report_id = ir.report_id
                               WHERE ur.chat_id = ? AND ur.user_id = ?
                               ORDER BY ur.created_at ASC";

                $messageStmt = $this->conn->prepare($messageSql);
                if (!$messageStmt) {
                    error_log("Message prepare error: " . $this->conn->error);
                    continue;
                }
                $messageStmt->bind_param("ss", $chatId, $userId);
                $messageStmt->execute();
                $messageResult = $messageStmt->get_result();

                $messages = [];
                $firstUserPrompt = '';
                
                while ($msgRow = $messageResult->fetch_assoc()) {
                    $messageData = $msgRow['message_data'] ? json_decode($msgRow['message_data'], true) : [];

                    // ✅ For user messages, content is the prompt text
                    if ($msgRow['message_type'] === 'user' && empty($firstUserPrompt)) {
                        $firstUserPrompt = $msgRow['content'];
                    }

                    $messages[] = [
                        'role' => $msgRow['message_type'],
                        'content' => $msgRow['content'], // ✅ This will be image URL for assistant, text for user
                        'reportId' => $msgRow['report_id'],
                        'isReported' => (int)$msgRow['isReported'],
                        'timestamp' => $msgRow['created_at'],
                        'type' => $messageData['type'] ?? null,
                        'prompt' => $messageData['prompt'] ?? null,
                        'model' => $messageData['model'] ?? null,
                    ];
                }
                $messageStmt->close();

                // ✅ Use first user prompt as chat title
                $chatTitle = !empty($firstUserPrompt) 
                    ? (substr($firstUserPrompt, 0, 50) . (strlen($firstUserPrompt) > 50 ? '...' : ''))
                    : 'Chat ' . substr($chatId, 0, 8);

                $chats[] = [
                    'id' => $chatId,
                    'messages' => $messages,
                    'timestamp' => $chatRow['last_message_time'],
                    'title' => $chatTitle,
                ];
            }
            $chatIdsStmt->close();

            $this->sendResponse(true, "Chat history retrieved successfully", ['chats' => $chats]);
        } catch (Exception $e) {
            error_log("Get chat history error: " . $e->getMessage());
            $this->sendResponse(false, "Database error: " . $e->getMessage());
        }
    }

    private function updateUpscaleData($data) {
        try {
            $required = ['chat_id', 'user_id', 'upscaled_url'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    $this->sendResponse(false, "Missing required field: $field");
                }
            }

            $sql = "UPDATE image_chats SET upscaled = TRUE, upscaled_url = ?, updated_at = CURRENT_TIMESTAMP WHERE chat_id = ? AND user_id = ?";
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) {
                $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
            }
            $stmt->bind_param("sss", $data['upscaled_url'], $data['chat_id'], $data['user_id']);
            $stmt->execute();

            $affected = $stmt->affected_rows > 0;
            $stmt->close();
            
            $this->sendResponse($affected, $affected ? "Upscale data updated" : "Failed to update");
        } catch (Exception $e) {
            error_log("Update upscale error: " . $e->getMessage());
            $this->sendResponse(false, "Database error");
        }
    }

    private function deleteChat($data) {
        try {
            $required = ['chat_id', 'user_id'];
            foreach ($required as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    $this->sendResponse(false, "Missing required field: $field");
                }
            }

            $this->conn->begin_transaction();

            $deleteResponsesSql = "DELETE FROM user_responses WHERE chat_id = ? AND user_id = ?";
            $deleteResponsesStmt = $this->conn->prepare($deleteResponsesSql);
            if (!$deleteResponsesStmt) {
                $this->conn->rollback();
                $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
            }
            $deleteResponsesStmt->bind_param("ss", $data['chat_id'], $data['user_id']);
            $deleteResponsesStmt->execute();
            $deleteResponsesStmt->close();

            $deleteChatSql = "DELETE FROM image_chats WHERE chat_id = ? AND user_id = ?";
            $deleteChatStmt = $this->conn->prepare($deleteChatSql);
            if (!$deleteChatStmt) {
                $this->conn->rollback();
                $this->sendResponse(false, "Database prepare error: " . $this->conn->error);
            }
            $deleteChatStmt->bind_param("ss", $data['chat_id'], $data['user_id']);
            $deleteChatStmt->execute();
            $affected = $deleteChatStmt->affected_rows > 0;
            $deleteChatStmt->close();

            if ($affected) {
                $this->conn->commit();
                $this->sendResponse(true, "Chat deleted successfully");
            } else {
                $this->conn->rollback();
                $this->sendResponse(false, "Chat not found");
            }
        } catch (Exception $e) {
            $this->conn->rollback();
            error_log("Delete chat error: " . $e->getMessage());
            $this->sendResponse(false, "Database error");
        }
    }

    private function getStats() {
        try {
            $totalUsers = $this->conn->query("SELECT COUNT(*) as count FROM users")->fetch_assoc()['count'];
            $totalChats = $this->conn->query("SELECT COUNT(*) as count FROM image_chats")->fetch_assoc()['count'];
            $totalUpscaled = $this->conn->query("SELECT COUNT(*) as count FROM image_chats WHERE upscaled = TRUE")->fetch_assoc()['count'];
            $recentChats = $this->conn->query("SELECT COUNT(*) as count FROM image_chats WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)")->fetch_assoc()['count'];

            $stats = [
                'total_users' => (int)$totalUsers,
                'total_chats' => (int)$totalChats,
                'total_upscaled' => (int)$totalUpscaled,
                'recent_chats_24h' => (int)$recentChats,
                'server_time' => date('Y-m-d H:i:s')
            ];

            $this->sendResponse(true, "Stats retrieved successfully", $stats);
        } catch (Exception $e) {
            error_log("Get stats error: " . $e->getMessage());
            $this->sendResponse(false, "Database error");
        }
    }

    private function ensureUserExists($userId) {
        try {
            $checkSql = "SELECT id FROM users WHERE uid = ?";
            $checkStmt = $this->conn->prepare($checkSql);
            if (!$checkStmt) {
                error_log("Prepare error in ensureUserExists: " . $this->conn->error);
                return;
            }
            $checkStmt->bind_param("s", $userId);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            $checkStmt->close();

            if ($result->num_rows === 0) {
                $insertSql = "INSERT INTO users (uid, email, display_name) VALUES (?, ?, ?)";
                $insertStmt = $this->conn->prepare($insertSql);
                if (!$insertStmt) {
                    error_log("Prepare error in ensureUserExists insert: " . $this->conn->error);
                    return;
                }
                $email = $userId . '@';
                $displayName = 'User ' . substr($userId, -8);
                $insertStmt->bind_param("sss", $userId, $email, $displayName);
                $insertStmt->execute();
                $insertStmt->close();
            }
        } catch (Exception $e) {
            error_log("Ensure user exists error: " . $e->getMessage());
        }
    }

    private function sendResponse($success, $message, $data = null) {
        $response = [
            'success' => $success,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        if ($data !== null) $response['data'] = $data;
        echo json_encode($response);
        exit();
    }

    public function __destruct() {
        if ($this->conn) $this->conn->close();
    }
}

try {
    $api = new BroAIAPI();
    $api->handleRequest();
} catch (Exception $e) {
    error_log("Server error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ]);
}
?>