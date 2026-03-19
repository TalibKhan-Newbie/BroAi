<?php
// chat_api.php - Complete Chat API with MySQL Database
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Database Configuration
class Database {
    private $host = 'localhost';
    private $username = '';
    private $password = '';
    private $database = '';
    private $connection;
    
    public function __construct() {
        $this->connect();
    }
    
    private function connect() {
        try {
            $this->connection = new PDO(
                "mysql:host={$this->host};dbname={$this->database};charset=utf8mb4",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                ]
            );
        } catch(PDOException $e) {
            die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
        }
    }
    
    public function getConnection() {
        return $this->connection;
    }
}

// Chat API Class
class ChatAPI {
    private $db;
    
    public function __construct() {
        $this->db = (new Database())->getConnection();
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $_GET['action'] ?? '';
        
        switch($method . '_' . $action) {
            case 'POST_create_user':
                return $this->createUser();
            case 'GET_user':
                return $this->getUser();
            case 'POST_create_chat':
                return $this->createChat();
            case 'GET_chats':
                return $this->getChats();
            case 'GET_chat':
                return $this->getChat();
            case 'POST_send_message':
                return $this->sendMessage();
            case 'PUT_update_chat':
                return $this->updateChat();
            case 'DELETE_delete_chat':
                return $this->deleteChat();
            case 'DELETE_delete_all_chats':
                return $this->deleteAllChats();
            case 'GET_user_tokens':
                return $this->getUserTokens();
            case 'POST_update_tokens':
                return $this->updateUserTokens();
            case 'POST_report_message':
                return $this->reportMessage();
            default:
                return $this->error('Invalid action', 400);
        }
    }
    

private function createUser() {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['uid'])) {
        return $this->error('UID is required', 400);
    }

    try {
        // Pehle check karo user exists ya nahi
        $stmt = $this->db->prepare("SELECT tokens FROM users WHERE uid = ?");
        $stmt->execute([$input['uid']]);
        $existingUser = $stmt->fetch();

        if ($existingUser) {
            // Existing user hai → sirf profile update karo, tokens mat touch karo
            $stmt = $this->db->prepare("
                UPDATE users SET
                    email = ?,
                    displayName = ?,
                    photoURL = ?,
                    emailVerified = ?,
                    lastLoginAt = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE uid = ?
            ");
            $stmt->execute([
                $input['email'] ?? null,
                $input['displayName'] ?? null,
                $input['photoURL'] ?? null,
                $input['emailVerified'] ?? false,
                $input['lastLoginAt'] ?? date('Y-m-d H:i:s'),
                $input['uid']
            ]);
            return $this->success(['message' => 'User profile updated, tokens preserved']);
        } else {
            // New user hai → 10,000 tokens do
            $initialTokens = 10000;
            $stmt = $this->db->prepare("
                INSERT INTO users
                    (uid, email, displayName, photoURL, emailVerified, lastLoginAt, tokens, updated_at)
                VALUES
                    (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ");
            $stmt->execute([
                $input['uid'],
                $input['email'] ?? null,
                $input['displayName'] ?? null,
                $input['photoURL'] ?? null,
                $input['emailVerified'] ?? false,
                $input['lastLoginAt'] ?? date('Y-m-d H:i:s'),
                $initialTokens
            ]);
            return $this->success(['message' => 'New user created, 10k tokens granted']);
        }
    } catch(PDOException $e) {
        return $this->error('Database error: ' . $e->getMessage(), 500);
    }
}
    
    // ============ GET USER ============
    private function getUser() {
        $uid = $_GET['uid'] ?? '';
        
        if (!$uid) {
            return $this->error('UID is required', 400);
        }
        
        try {
            $stmt = $this->db->prepare("SELECT * FROM users WHERE uid = ?");
            $stmt->execute([$uid]);
            $user = $stmt->fetch();
            
            if (!$user) {
                return $this->error('User not found', 404);
            }
            
            return $this->success(['user' => $user]);
            
        } catch(PDOException $e) {
            return $this->error('Failed to fetch user: ' . $e->getMessage(), 500);
        }
    }
    
    // ============ CREATE CHAT ============
    private function createChat() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['uid'])) {
            return $this->error('UID is required', 400);
        }
        
        try {
            $chatId = $input['chat_id'] ?? $this->generateUUID();
            $title = $input['title'] ?? 'New Chat';
            $model = $input['model'] ?? 'gpt-4o-mini';
            
            $stmt = $this->db->prepare("
                INSERT INTO chats (id, user_id, title, model) 
                VALUES (?, ?, ?, ?)
            ");
            
            $stmt->execute([$chatId, $input['uid'], $title, $model]);
            
            return $this->success([
                'chat_id' => $chatId,
                'message' => 'Chat created successfully'
            ]);
            
        } catch(PDOException $e) {
            return $this->error('Failed to create chat: ' . $e->getMessage(), 500);
        }
    }
    
    // ============ GET CHATS ============
    private function getChats() {
        $uid = $_GET['uid'] ?? '';
        
        if (!$uid) {
            return $this->error('UID is required', 400);
        }
        
        try {
            $stmt = $this->db->prepare("
                SELECT c.*, 
                       COUNT(m.id) as message_count,
                       MAX(m.created_at) as last_message_at
                FROM chats c 
                LEFT JOIN messages m ON c.id = m.chat_id 
                WHERE c.user_id = ? 
                GROUP BY c.id 
                ORDER BY c.updated_at DESC
            ");
            
            $stmt->execute([$uid]);
            $chats = $stmt->fetchAll();
            
            return $this->success(['chats' => $chats]);
            
        } catch(PDOException $e) {
            return $this->error('Failed to fetch chats: ' . $e->getMessage(), 500);
        }
    }
    
private function getChat() {
    $chatId = $_GET['chat_id'] ?? '';
    $uid = $_GET['uid'] ?? '';
    
    if (!$chatId || !$uid) {
        return $this->error('Chat ID and UID are required', 400);
    }
    
    try {
        // Get chat details
        $stmt = $this->db->prepare("
            SELECT * FROM chats 
            WHERE id = ? AND user_id = ?
        ");
        $stmt->execute([$chatId, $uid]);
        $chat = $stmt->fetch();
        
        if (!$chat) {
            return $this->error('Chat not found', 404);
        }
        
        // Get messages WITH report status
        $stmt = $this->db->prepare("
            SELECT 
                id,
                role, 
                content, 
                tokens_used, 
                model, 
                is_booster, 
                report_id,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM reports r 
                        WHERE r.report_id = messages.report_id 
                        AND r.status != 'dismissed'
                    ) THEN 1 
                    ELSE 0 
                END as isReported,
                created_at as timestamp 
            FROM messages 
            WHERE chat_id = ? 
            ORDER BY created_at ASC
        ");
        $stmt->execute([$chatId]);
        $messages = $stmt->fetchAll();
        
        return $this->success([
            'chat' => $chat,
            'messages' => $messages
        ]);
        
    } catch(PDOException $e) {
        return $this->error('Failed to fetch chat: ' . $e->getMessage(), 500);
    }
}

// ============ REPORT MESSAGE (UPDATED) ============
private function reportMessage() {
    $input = json_decode(file_get_contents('php://input'), true);
    $messageId = $input['message_id'] ?? null;
    $uid = $input['uid'] ?? null;
    $reason = $input['reason'] ?? 'Other';
    $category = $input['category'] ?? 'inappropriate';

    if (!$messageId || !$uid) {
        return $this->error('message_id and uid are required', 400);
    }

    try {
        // Get message details
        $stmt = $this->db->prepare("
            SELECT m.*, c.user_id FROM messages m
            JOIN chats c ON m.chat_id = c.id
            WHERE m.id = ? AND c.user_id = ? AND m.role = 'assistant'
        ");
        $stmt->execute([$messageId, $uid]);
        $message = $stmt->fetch();

        if (!$message) {
            return $this->error('Message not found or unauthorized', 404);
        }

        // Create report entry
        $stmt = $this->db->prepare("
            INSERT INTO reports 
            (user_id, category, reason, content, content_type, status, report_id, created_at)
            VALUES (?, ?, ?, ?, 'message', 'pending', ?, CURRENT_TIMESTAMP)
        ");
        
        $reportId = $message['report_id'] ?: $this->generateUUID();
        
        $stmt->execute([
            $uid,
            $category,
            $reason,
            $message['content'],
            $reportId
        ]);

        // Update message is_reported flag
        $stmt = $this->db->prepare("
            UPDATE messages 
            SET is_reported = 1 
            WHERE id = ?
        ");
        $stmt->execute([$messageId]);

        return $this->success([
            'message' => 'Message reported successfully',
            'report_id' => $reportId,
            'status' => 'pending'
        ]);

    } catch(Exception $e) {
        return $this->error('Report failed: ' . $e->getMessage(), 500);
    }
}
    
    // ============ SEND MESSAGE ============
    private function sendMessage() {
        $input = json_decode(file_get_contents('php://input'), true);
       
        if (!$input || !isset($input['chat_id']) || !isset($input['uid'])) {
            return $this->error('Chat ID and UID are required', 400);
        }
       
        try {
            $chatId = $input['chat_id'];
            $uid = $input['uid'];
            $userMessage = $input['message'] ?? '';
            $aiResponse = $input['ai_response'] ?? '';
            $tokensUsed = $input['tokens_used'] ?? 0;
            $model = $input['model'] ?? 'gpt-4o-mini';
            $isBooster = $input['is_booster'] ?? false;
            $reportId = $input['report_id'] ?? $this->generateUUID();

            // Verify chat ownership
            $stmt = $this->db->prepare("SELECT id FROM chats WHERE id = ? AND user_id = ?");
            $stmt->execute([$chatId, $uid]);
            if (!$stmt->fetch()) {
                return $this->error('Chat not found or access denied', 404);
            }

            // Save user message
            if (!empty($userMessage)) {
                $this->saveMessage($chatId, 'user', $userMessage, 0, $model, false, null);
            }
           
            // Save AI response with report_id
            if (!empty($aiResponse)) {
                $this->saveMessage($chatId, 'assistant', $aiResponse, $tokensUsed, $model, $isBooster, $reportId);
            }

            if (!empty($userMessage)) {
                $this->updateChatTitle($chatId, $userMessage);
            }

            $stmt = $this->db->prepare("UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$chatId]);

            return $this->success([
                'message' => 'Messages saved successfully',
                'report_id' => $reportId,
                'remaining_tokens' => $this->getUserTokensCount($uid)
            ]);

        } catch(Exception $e) {
            return $this->error('Failed to send message: ' . $e->getMessage(), 500);
        }
    }
    
    // ============ UPDATE USER TOKENS ============
    private function updateUserTokens() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['uid']) || !isset($input['tokens_used'])) {
            return $this->error('UID and tokens_used are required', 400);
        }
        
        try {
            $uid = $input['uid'];
            $tokensUsed = $input['tokens_used'];
            
            // Check if user has enough tokens
            $userTokens = $this->getUserTokensCount($uid);
            if ($userTokens < $tokensUsed) {
                return $this->error('Insufficient tokens', 402);
            }
            
            // Deduct tokens from user
            $this->deductUserTokens($uid, $tokensUsed);
            
            return $this->success([
                'tokens_deducted' => $tokensUsed,
                'remaining_tokens' => $userTokens - $tokensUsed
            ]);
            
        } catch(Exception $e) {
            return $this->error('Failed to update tokens: ' . $e->getMessage(), 500);
        }
    }
    
    // ============ GET USER TOKENS ============
    private function getUserTokens() {
        $uid = $_GET['uid'] ?? '';
        
        if (!$uid) {
            return $this->error('UID is required', 400);
        }
        
        try {
            $tokens = $this->getUserTokensCount($uid);
            return $this->success(['tokens' => $tokens]);
        } catch(PDOException $e) {
            return $this->error('Failed to fetch tokens: ' . $e->getMessage(), 500);
        }
    }
    
    // ============ HELPER FUNCTIONS ============
    private function getUserTokensCount($uid) {
        $stmt = $this->db->prepare("SELECT tokens FROM users WHERE uid = ?");
        $stmt->execute([$uid]);
        $user = $stmt->fetch();
        return $user ? (int)$user['tokens'] : 0;
    }
    
    private function deductUserTokens($uid, $tokens) {
        $stmt = $this->db->prepare("UPDATE users SET tokens = GREATEST(0, tokens - ?) WHERE uid = ?");
        $stmt->execute([$tokens, $uid]);
    }
    
    // ============ UPDATE CHAT ============
    private function updateChat() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['chat_id']) || !isset($input['uid'])) {
            return $this->error('Chat ID and UID are required', 400);
        }
        
        try {
            $updates = [];
            $params = [];
            
            if (isset($input['title'])) {
                $updates[] = "title = ?";
                $params[] = $input['title'];
            }
            
            if (empty($updates)) {
                return $this->error('No fields to update', 400);
            }
            
            $params[] = $input['chat_id'];
            $params[] = $input['uid'];
            
            $sql = "UPDATE chats SET " . implode(', ', $updates) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            if ($stmt->rowCount() === 0) {
                return $this->error('Chat not found or no changes made', 404);
            }
            
            return $this->success(['message' => 'Chat updated successfully']);
            
        } catch(PDOException $e) {
            return $this->error('Failed to update chat: ' . $e->getMessage(), 500);
        }
    }
    
    // ============ DELETE CHAT ============
    private function deleteChat() {
        $chatId = $_GET['chat_id'] ?? '';
        $uid = $_GET['uid'] ?? '';
        
        if (!$chatId || !$uid) {
            return $this->error('Chat ID and UID are required', 400);
        }
        
        try {
            $stmt = $this->db->prepare("DELETE FROM messages WHERE chat_id = ?");
            $stmt->execute([$chatId]);
            
            $stmt = $this->db->prepare("DELETE FROM chats WHERE id = ? AND user_id = ?");
            $stmt->execute([$chatId, $uid]);
            
            if ($stmt->rowCount() === 0) {
                return $this->error('Chat not found', 404);
            }
            
            return $this->success(['message' => 'Chat deleted successfully']);
            
        } catch(PDOException $e) {
            return $this->error('Failed to delete chat: ' . $e->getMessage(), 500);
        }
    }
    
    // ============ DELETE ALL CHATS ============
    private function deleteAllChats() {
        $uid = $_GET['uid'] ?? '';
        
        if (!$uid) {
            return $this->error('UID is required', 400);
        }
        
        try {
            $stmt = $this->db->prepare("
                DELETE m FROM messages m 
                JOIN chats c ON m.chat_id = c.id 
                WHERE c.user_id = ?
            ");
            $stmt->execute([$uid]);
            
            $stmt = $this->db->prepare("DELETE FROM chats WHERE user_id = ?");
            $stmt->execute([$uid]);
            
            return $this->success(['message' => 'All chats deleted successfully']);
            
        } catch(PDOException $e) {
            return $this->error('Failed to delete all chats: ' . $e->getMessage(), 500);
        }
    }
    
    // ============ SAVE MESSAGE ============
    private function saveMessage($chatId, $role, $content, $tokens, $model, $isBooster = false, $reportId = null) {
        $stmt = $this->db->prepare("
            INSERT INTO messages 
            (chat_id, role, content, tokens_used, model, is_booster, report_id, is_reported)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        ");
        $stmt->execute([$chatId, $role, $content, $tokens, $model, $isBooster ? 1 : 0, $reportId]);
        return $this->db->lastInsertId();
    }
    
    // ============ UPDATE CHAT TITLE ============
    private function updateChatTitle($chatId, $firstMessage) {
        $stmt = $this->db->prepare("SELECT title FROM chats WHERE id = ?");
        $stmt->execute([$chatId]);
        $chat = $stmt->fetch();
        
        if ($chat && $chat['title'] === 'New Chat') {
            $title = $this->generateChatTitle($firstMessage);
            $stmt = $this->db->prepare("UPDATE chats SET title = ? WHERE id = ?");
            $stmt->execute([$title, $chatId]);
        }
    }
    
    // ============ GENERATE CHAT TITLE ============
    private function generateChatTitle($message) {
        $words = explode(' ', $message);
        $title = implode(' ', array_slice($words, 0, 5));
        return strlen($title) > 50 ? substr($title, 0, 50) . '...' : $title;
    }
    
    // ============ GENERATE UUID ============
    private function generateUUID() {
        return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );
    }
    
    // ============ RESPONSE HELPERS ============
    private function success($data) {
        http_response_code(200);
        echo json_encode(['success' => true] + $data);
        exit;
    }
    
    private function error($message, $code = 400) {
        http_response_code($code);
        echo json_encode(['success' => false, 'error' => $message]);
        exit;
    }
}

// Initialize and handle request
try {
    $api = new ChatAPI();
    $api->handleRequest();
} catch(Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Internal server error']);
}
?>