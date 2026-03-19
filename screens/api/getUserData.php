<?php
// api/getUserData.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$servername = "";
$username = "";
$password = "";
$dbname = "";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Connection failed: " . $conn->connect_error]));
}

// Get the POST data
$input = json_decode(file_get_contents('php://input'), true);
$userId = isset($input['user_id']) ? $input['user_id'] : '';

if (empty($userId)) {
    echo json_encode(["success" => false, "message" => "User ID is required"]);
    exit;
}

// Use prepared statement to prevent SQL injection
$stmt = $conn->prepare("SELECT `uid`, `email`, `displayName`, `photoURL`, `emailVerified`, `tokens`, `lastLoginAt`, `created_at`, `updated_at`, `phoneNumber` FROM `users` WHERE `uid` = ?");
$stmt->bind_param("s", $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $user = $result->fetch_assoc();
    echo json_encode(["success" => true, "user" => $user]);
} else {
    echo json_encode(["success" => false, "message" => "User not found"]);
}

$stmt->close();
$conn->close();
?>