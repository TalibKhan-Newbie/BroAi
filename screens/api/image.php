<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

$servername = "";
$username = "";
$password = "";
$dbname = "";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    echo json_encode(['success' => false, 'error' => 'Connection failed: ' . $e->getMessage()]);
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

switch ($action) {
    case 'create_generation':
        $input = json_decode(file_get_contents('php://input'), true);
        $uid = $input['uid'] ?? '';
        $title = $input['title'] ?? 'New Image Generation';
        $model = $input['model'] ?? 'flux-dev';
        
        if (empty($uid)) {
            error_log('Create generation failed: User ID is empty');
            echo json_encode(['success' => false, 'error' => 'User ID is required']);
            exit;
        }

        try {
            $stmt = $conn->prepare("INSERT INTO chats (user_id, title, model, created_at, updated_at) VALUES (:user_id, :title, :model, NOW(), NOW())");
            $stmt->execute([
                'user_id' => $uid,
                'title' => $title,
                'model' => $model
            ]);
            $gen_id = $conn->lastInsertId();
            echo json_encode(['success' => true, 'gen_id' => $gen_id]);
        } catch(PDOException $e) {
            error_log('Create generation PDO error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => 'Failed to create generation: ' . $e->getMessage()]);
        }
        break;

    case 'get_generations':
        $uid = $_GET['uid'] ?? '';
        if (empty($uid)) {
            error_log('Get generations failed: User ID is empty');
            echo json_encode(['success' => false, 'error' => 'User ID is required']);
            exit;
        }

        try {
            $stmt = $conn->prepare("SELECT id, user_id, title, model, created_at, updated_at FROM chats WHERE user_id = :user_id ORDER BY updated_at DESC");
            $stmt->execute(['user_id' => $uid]);
            $generations = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($generations as &$gen) {
                $stmt = $conn->prepare("SELECT id, chat_id, role, content, model, created_at FROM messages WHERE chat_id = :chat_id ORDER BY created_at ASC");
                $stmt->execute(['chat_id' => $gen['id']]);
                $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $gen['messages'] = array_map(function($msg) {
                    return [
                        'id' => $msg['id'],
                        'chat_id' => $msg['chat_id'],
                        'role' => $msg['role'],
                        'content' => $msg['content'],
                        'type' => strpos($msg['content'], 'http') === 0 ? 'image' : 'text',
                        'timestamp' => $msg['created_at']
                    ];
                }, $messages);
            }

            echo json_encode(['success' => true, 'generations' => $generations]);
        } catch(PDOException $e) {
            error_log('Get generations PDO error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => 'Failed to fetch generations: ' . $e->getMessage()]);
        }
        break;

    case 'save_prompt':
        $input = json_decode(file_get_contents('php://input'), true);
        $gen_id = $input['gen_id'] ?? '';
        $uid = $input['uid'] ?? '';
        $prompt = $input['prompt'] ?? '';

        if (empty($gen_id) || empty($uid) || empty($prompt)) {
            error_log('Save prompt failed: Missing parameters - gen_id: ' . $gen_id . ', uid: ' . $uid . ', prompt: ' . $prompt);
            echo json_encode(['success' => false, 'error' => 'Missing required parameters']);
            exit;
        }

        try {
            $stmt = $conn->prepare("INSERT INTO messages (chat_id, role, content, model, created_at) VALUES (:chat_id, :role, :content, :model, NOW())");
            $stmt->execute([
                'chat_id' => $gen_id,
                'role' => 'user',
                'content' => $prompt,
                'model' => $input['model'] ?? 'flux-dev'
            ]);

            $stmt = $conn->prepare("UPDATE chats SET title = :title, updated_at = NOW() WHERE id = :id AND user_id = :user_id");
            $stmt->execute([
                'id' => $gen_id,
                'user_id' => $uid,
                'title' => $input['title'] ?? generateGenerationTitle($prompt)
            ]);

            echo json_encode(['success' => true]);
        } catch(PDOException $e) {
            error_log('Save prompt PDO error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => 'Failed to save prompt: ' . $e->getMessage()]);
        }
        break;

    case 'delete_generation':
        $input = json_decode(file_get_contents('php://input'), true);
        $gen_id = $input['gen_id'] ?? '';
        $uid = $input['uid'] ?? '';

        if (empty($gen_id) || empty($uid)) {
            error_log('Delete generation failed: Missing parameters - gen_id: ' . $gen_id . ', uid: ' . $uid);
            echo json_encode(['success' => false, 'error' => 'Missing required parameters']);
            exit;
        }

        try {
            $stmt = $conn->prepare("DELETE FROM messages WHERE chat_id = :chat_id");
            $stmt->execute(['chat_id' => $gen_id]);

            $stmt = $conn->prepare("DELETE FROM chats WHERE id = :id AND user_id = :user_id");
            $stmt->execute(['id' => $gen_id, 'user_id' => $uid]);

            echo json_encode(['success' => true]);
        } catch(PDOException $e) {
            error_log('Delete generation PDO error: ' . $e->getMessage());
            echo json_encode(['success' => false, 'error' => 'Failed to delete generation: ' . $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        break;
}

function generateGenerationTitle($prompt) {
    $words = explode(' ', trim($prompt));
    $title = implode(' ', array_slice($words, 0, 6));
    return strlen($title) > 50 ? substr($title, 0, 50) . '...' : ($title ?: 'New Image Generation');
}

$conn = null;
?>