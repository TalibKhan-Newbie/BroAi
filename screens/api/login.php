<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database configuration
$servername = "localhost";
$username = "";
$password = "";
$dbname = "";

try {
    $pdo = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$required_fields = ['uid'];
foreach ($required_fields as $field) {
    if (!isset($input[$field]) || empty($input[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Field $field is required"]);
        exit();
    }
}

// Extract user data
$uid = $input['uid'];
$email = isset($input['email']) && !empty($input['email']) ? $input['email'] : null;
$phoneNumber = isset($input['phoneNumber']) && !empty($input['phoneNumber']) ? $input['phoneNumber'] : null;
$displayName = isset($input['displayName']) ? $input['displayName'] : null;
$photoURL = isset($input['photoURL']) ? $input['photoURL'] : null;
$emailVerified = isset($input['emailVerified']) ? (bool)$input['emailVerified'] : false;
$tokens = isset($input['tokens']) ? $input['tokens'] : 0;
$lastLoginAt = isset($input['lastLoginAt']) ? $input['lastLoginAt'] : date('Y-m-d H:i:s');

// Validate phone number format if provided
if ($phoneNumber && !preg_match('/^\+\d{10,15}$/', $phoneNumber)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid phone number format']);
    exit();
}

try {
    // Check if user already exists
    $checkStmt = $pdo->prepare("SELECT uid FROM users WHERE uid = ? OR email = ? OR phoneNumber = ?");
    $checkStmt->execute([$uid, $email, $phoneNumber]);
    
    if ($checkStmt->rowCount() > 0) {
        // Update existing user
        $updateStmt = $pdo->prepare("
            UPDATE users 
            SET email = ?, 
                phoneNumber = ?,
                displayName = ?, 
                photoURL = ?, 
                emailVerified = ?, 
                tokens = ?, 
                lastLoginAt = ?, 
                updated_at = NOW() 
            WHERE uid = ?
        ");
        
        $updateStmt->execute([
            $email,
            $phoneNumber,
            $displayName,
            $photoURL,
            $emailVerified ? 1 : 0,
            $tokens,
            $lastLoginAt,
            $uid
        ]);
        
        // Get updated user data
        $selectStmt = $pdo->prepare("
            SELECT uid, email, phoneNumber, displayName, photoURL, emailVerified, tokens, lastLoginAt, created_at, updated_at 
            FROM users 
            WHERE uid = ?
        ");
        $selectStmt->execute([$uid]);
        $userData = $selectStmt->fetch(PDO::FETCH_ASSOC);
        
        http_response_code(200);
        echo json_encode([
            'success' => true, 
            'message' => 'User updated successfully',
            'action' => 'updated',
            'user' => $userData
        ]);
        
    } else {
        // Insert new user with 2000 welcome tokens for first-time registration
        $welcomeTokens = 100000;
        
        $insertStmt = $pdo->prepare("
            INSERT INTO users (uid, email, phoneNumber, displayName, photoURL, emailVerified, tokens, lastLoginAt, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ");
        
        $insertStmt->execute([
            $uid,
            $email,
            $phoneNumber,
            $displayName,
            $photoURL,
            $emailVerified ? 1 : 0,
            $welcomeTokens,
            $lastLoginAt
        ]);
        
        // Get inserted user data
        $selectStmt = $pdo->prepare("
            SELECT uid, email, phoneNumber, displayName, photoURL, emailVerified, tokens, lastLoginAt, created_at, updated_at 
            FROM users 
            WHERE uid = ?
        ");
        $selectStmt->execute([$uid]);
        $userData = $selectStmt->fetch(PDO::FETCH_ASSOC);
        
        http_response_code(201);
        echo json_encode([
            'success' => true, 
            'message' => 'User created successfully with welcome tokens',
            'action' => 'created',
            'user' => $userData
        ]);
    }
    
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>