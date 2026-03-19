<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Database configuration
$servername = "";
$username = "";
$password = ;
$dbname = "";

try {
    // Create connection
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method allowed');
    }
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($input['user_id']) || empty($input['user_id'])) {
        throw new Exception('User ID is required');
    }
    
    if (!isset($input['tokens']) || !is_numeric($input['tokens']) || $input['tokens'] <= 0) {
        throw new Exception('Valid token amount is required');
    }
    
    $user_id = trim($input['user_id']);
    $telegram_tokens = floatval($input['tokens']); // Should be 1000
    
    // Start transaction
    $conn->beginTransaction();
    
    try {
        // Check if user exists and hasn't already claimed telegram reward
        $stmt = $conn->prepare("
            SELECT uid, tokens, telegram_claimed, displayName 
            FROM users 
            WHERE uid = :user_id
        ");
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_STR);
        $stmt->execute();
        
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            throw new Exception('User not found');
        }
        
        // Check if user has already claimed telegram reward
        if ($user['telegram_claimed'] == 1) {
            throw new Exception('Telegram reward already claimed');
        }
        
        // Calculate new token balance
        $current_tokens = floatval($user['tokens']);
        $new_token_balance = $current_tokens + $telegram_tokens;
        
        // Update user tokens and mark telegram as claimed
        $update_stmt = $conn->prepare("
            UPDATE users 
            SET tokens = :new_tokens, 
                telegram_claimed = 1,
                updated_at = NOW()
            WHERE uid = :user_id
        ");
        $update_stmt->bindParam(':new_tokens', $new_token_balance, PDO::PARAM_STR);
        $update_stmt->bindParam(':user_id', $user_id, PDO::PARAM_STR);
        $update_stmt->execute();
        
        // Log the transaction (optional - create this table if you want to track rewards)
        try {
            $log_stmt = $conn->prepare("
                INSERT INTO reward_logs (user_id, reward_type, tokens_awarded, created_at) 
                VALUES (:user_id, 'telegram_join', :tokens, NOW())
            ");
            $log_stmt->bindParam(':user_id', $user_id, PDO::PARAM_STR);
            $log_stmt->bindParam(':tokens', $telegram_tokens, PDO::PARAM_STR);
            $log_stmt->execute();
        } catch (Exception $e) {
            // Log table might not exist, continue without logging
            error_log("Reward log failed: " . $e->getMessage());
        }
        
        // Commit transaction
        $conn->commit();
        
        // Return success response
        echo json_encode([
            'success' => true,
            'message' => 'Telegram reward claimed successfully',
            'data' => [
                'user_id' => $user_id,
                'tokens_awarded' => $telegram_tokens,
                'new_token_balance' => $new_token_balance,
                'previous_balance' => $current_tokens
            ]
        ]);
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $conn->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    // Return error response
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => 'TELEGRAM_REWARD_ERROR'
    ]);
    
} catch (PDOException $e) {
    // Database connection error
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed',
        'error_code' => 'DATABASE_ERROR'
    ]);
    error_log("Database Error: " . $e->getMessage());
}

// Close connection
$conn = null;
?>