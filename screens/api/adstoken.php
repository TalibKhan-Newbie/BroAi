<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Enable error logging for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Database connection parameters
$host = 'localhost';
$dbname = '';
$username = '';
$password = '';

// Create connection
$conn = new mysqli($host, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $conn->connect_error
    ]));
}

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Get the raw POST data
    $input = file_get_contents('php://input');
    
    // Log the received data for debugging
    error_log("Received data: " . $input);
    
    $data = json_decode($input, true);
    
    // Check if JSON decoding was successful
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid JSON data: ' . json_last_error_msg()
        ]);
        exit();
    }
    
    // Log decoded data
    error_log("Decoded data: " . print_r($data, true));
    
    // Validate required parameters
    if (!isset($data['user_id']) || !isset($data['tokens'])) {
        echo json_encode([
            'success' => false,
            'message' => 'User ID and tokens are required',
            'received_data' => $data
        ]);
        exit();
    }
    
    $user_id = $conn->real_escape_string($data['user_id']);
    $tokens_to_add = floatval($data['tokens']);
    
    // Log what we're processing
    error_log("Processing: User ID = $user_id, Tokens to add = $tokens_to_add");
    
    try {
        // First, check if user exists and get current balance
        $check_sql = "SELECT uid, tokens FROM users WHERE uid = ?";
        $check_stmt = $conn->prepare($check_sql);
        $check_stmt->bind_param("s", $user_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        
        if ($check_result->num_rows === 0) {
            error_log("User not found with ID: $user_id");
            echo json_encode([
                'success' => false,
                'message' => 'User not found with ID: ' . $user_id
            ]);
            $check_stmt->close();
            exit();
        }
        
        $current_data = $check_result->fetch_assoc();
        $current_balance = floatval($current_data['tokens']);
        $check_stmt->close();
        
        error_log("Current balance for user $user_id: $current_balance");
        
        // CORRECTED: Update tokens and updated_at (not last_updated)
        $sql = "UPDATE users SET tokens = tokens + ?, updated_at = NOW() WHERE uid = ?";
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("ds", $tokens_to_add, $user_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        error_log("Update executed. Affected rows: " . $stmt->affected_rows);
        
        // Check if any row was affected
        if ($stmt->affected_rows > 0) {
            // Get the updated token balance
            $select_sql = "SELECT tokens, updated_at FROM users WHERE uid = ?";
            $select_stmt = $conn->prepare($select_sql);
            $select_stmt->bind_param("s", $user_id);
            $select_stmt->execute();
            $result = $select_stmt->get_result();
            $user_data = $result->fetch_assoc();
            $new_balance = floatval($user_data['tokens']);
            $select_stmt->close();
            
            error_log("New balance for user $user_id: $new_balance");
            
            echo json_encode([
                'success' => true,
                'message' => 'Tokens added successfully',
                'user_id' => $user_id,
                'tokens_added' => $tokens_to_add,
                'previous_balance' => $current_balance,
                'new_balance' => $new_balance,
                'timestamp' => date('Y-m-d H:i:s'),
                'updated_at' => $user_data['updated_at']
            ]);
        } else {
            error_log("No rows updated for user: $user_id");
            echo json_encode([
                'success' => false,
                'message' => 'No rows were updated. User might not exist.',
                'user_id' => $user_id
            ]);
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
        error_log("Error updating tokens: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Error updating tokens: ' . $e->getMessage(),
            'user_id' => $user_id,
            'tokens_to_add' => $tokens_to_add
        ]);
    }
    
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Only POST requests are allowed. Received: ' . $_SERVER['REQUEST_METHOD']
    ]);
}

// Close connection
$conn->close();
?>