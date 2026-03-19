<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Database connection parameters
$host = '';
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
    $data = json_decode($input, true);
    
    // Validate required parameters
    if (!isset($data['user_id']) || !isset($data['tokens'])) {
        echo json_encode([
            'success' => false,
            'message' => 'User ID and tokens are required'
        ]);
        exit();
    }
    
    $user_id = $conn->real_escape_string($data['user_id']);
    $tokens = floatval($data['tokens']);
    
    try {
        // Update user tokens
        $sql = "UPDATE users SET tokens = ?, last_updated = NOW() WHERE uid = ?";
        $stmt = $conn->prepare($sql);
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("ds", $tokens, $user_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        // Check if any row was affected
        if ($stmt->affected_rows > 0) {
            echo json_encode([
                'success' => true,
                'message' => 'Tokens updated successfully',
                'tokens' => $tokens
            ]);
        } else {
            // If no rows were affected, the user might not exist
            echo json_encode([
                'success' => false,
                'message' => 'User not found or no changes made'
            ]);
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error updating tokens: ' . $e->getMessage()
        ]);
    }
    
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Only POST requests are allowed'
    ]);
}

// Close connection
$conn->close();
?>