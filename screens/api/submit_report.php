<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$servername = "";
$username   = "";
$password   = "";
$dbname     = "";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $data = json_decode(file_get_contents("php://input"), true);

    // === GET DATA FROM APP ===
    $user_id    = $data['user_id'] ?? null;
    $report_id  = $data['report_id'] ?? null;      // ✅ taskUUID
    $category   = $data['reason'] ?? null;         // Picker value
    $details    = $data['details'] ?? null;        // Textarea value

    // === VALIDATION ===
    if (!$user_id || !$report_id || !$category) {
        echo json_encode([
            "success" => false, 
            "message" => "Missing required fields"
        ]);
        exit;
    }

    // ✅ CHECK - पहले देखो कि यह report_id पहले से report हो चुका है या नहीं
    $checkDuplicate = $conn->prepare("
        SELECT id FROM reports 
        WHERE report_id = ?
    ");
    $checkDuplicate->execute([$report_id]);
    
    if ($checkDuplicate->fetch()) {
        echo json_encode([
            "success" => false, 
            "message" => "This content has already been reported"
        ]);
        exit;
    }

    // === INSERT INTO reports TABLE ===
    $insert = $conn->prepare("
        INSERT INTO reports 
        (user_id, report_id, category, reason, content, content_type, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    ");

    $result = $insert->execute([
        $user_id,           // user_id
        $report_id,         // report_id (taskUUID)
        $category,          // category (from reason picker)
        $details,           // reason (from textarea)
        '',                 // content (empty for now)
        'image',            // content_type
        'pending'           // status
    ]);

    if ($result) {
        echo json_encode([
            "success" => true, 
            "message" => "Report submitted successfully",
            "data" => [
                "id" => $conn->lastInsertId(),
                "report_id" => $report_id
            ]
        ]);
    } else {
        echo json_encode([
            "success" => false, 
            "message" => "Failed to submit report"
        ]);
    }

} catch (PDOException $e) {
    error_log("Report submission error: " . $e->getMessage());
    echo json_encode([
        "success" => false, 
        "message" => "Database error"
    ]);
}
?>