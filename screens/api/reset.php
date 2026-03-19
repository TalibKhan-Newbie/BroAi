<?php
// Database connection parameters
$host = '';
$dbname = '';
$username = '';
$password = '';

// Create connection
$conn = new mysqli($host, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    error_log('Database connection failed: ' . $conn->connect_error);
    exit();
}

try {
    // Update all users' tokens to 0
    $sql = "UPDATE users SET tokens = 0, updated_at = NOW()";
    $stmt = $conn->prepare($sql);
    
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    // Check if any row was affected
    if ($stmt->affected_rows > 0) {
        error_log('Tokens reset to 0 for ' . $stmt->affected_rows . ' users');
    } else {
        error_log('No users found or no changes made');
    }
    
    $stmt->close();
    
} catch (Exception $e) {
    error_log('Error resetting tokens: ' . $e->getMessage());
}

// Close connection
$conn->close();
?>