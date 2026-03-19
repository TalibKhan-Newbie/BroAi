<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Log raw input for debugging
$rawInput = file_get_contents('php://input');
error_log('Raw input: ' . $rawInput);

// Check autoloader
if (!file_exists(__DIR__ . '/vendor/autoload.php')) {
    error_log('Autoloader not found in ' . __DIR__ . '/vendor/autoload.php');
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'Autoloader not found. Run composer install.']));
}

require __DIR__ . '/vendor/autoload.php';

use Google\Auth\Credentials\ServiceAccountCredentials;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

// Database connection
$servername = "localhost";
$username = "";
$password = "";
$dbname = "";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    error_log('Database connection failed: ' . $conn->connect_error);
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'Connection failed: ' . $conn->connect_error]));
}

// Firebase setup
$serviceAccountFile = __DIR__ . '/aibro.json';
if (!file_exists($serviceAccountFile)) {
    error_log('Service account file not found: ' . $serviceAccountFile);
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'Service account file not found']));
}

$scopes = ['https://www.googleapis.com/auth/firebase.messaging'];
try {
    $credentials = new ServiceAccountCredentials($scopes, $serviceAccountFile);
} catch (Exception $e) {
    error_log('Failed to initialize credentials: ' . $e->getMessage());
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'Credentials error: ' . $e->getMessage()]));
}

$client = new Client();

function getAccessToken($credentials) {
    try {
        $token = $credentials->fetchAuthToken();
        if (empty($token['access_token'])) {
            throw new Exception('Failed to fetch OAuth token');
        }
        return $token['access_token'];
    } catch (Exception $e) {
        error_log('Token fetch error: ' . $e->getMessage());
        http_response_code(500);
        die(json_encode(['success' => false, 'message' => 'Token fetch error: ' . $e->getMessage()]));
    }
}

$data = json_decode($rawInput, true);
if ($data === null) {
    error_log('Invalid JSON input: ' . json_last_error_msg());
    http_response_code(400);
    die(json_encode(['success' => false, 'message' => 'Invalid JSON input: ' . json_last_error_msg()]));
}
$action = $data['action'] ?? 'send_notification';

if ($action === 'save_token') {
    $userId = $data['userId'] ?? '';
    $fcmToken = $data['fcmToken'] ?? '';

    if (empty($userId) || empty($fcmToken)) {
        echo json_encode(['success' => false, 'message' => 'Invalid input']);
        exit;
    }

    $sql = "INSERT INTO user_fcm_tokens (user_id, fcm_token, notifications_allowed, last_active) 
            VALUES (?, ?, TRUE, CURRENT_TIMESTAMP) 
            ON DUPLICATE KEY UPDATE 
            fcm_token = ?, 
            notifications_allowed = TRUE,
            updated_at = CURRENT_TIMESTAMP,
            last_active = CURRENT_TIMESTAMP";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        error_log('Prepare failed: ' . $conn->error);
        http_response_code(500);
        die(json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]));
    }
    $stmt->bind_param("sss", $userId, $fcmToken, $fcmToken);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Token saved successfully']);
    } else {
        error_log('Execute failed: ' . $stmt->error);
        echo json_encode(['success' => false, 'message' => 'Error saving token: ' . $stmt->error]);
    }

    $stmt->close();

} elseif ($action === 'send_notification') {
    $title = $data['title'] ?? 'Special Offer!';
    $body = $data['body'] ?? 'Check out our latest deals!';
    $image = $data['image'] ?? '';
    $click_action = $data['click_action'] ?? 'myapp://open/offer';
    $sendAfterWeek = $data['sendAfterWeek'] ?? false;

    if (empty($title) || empty($body)) {
        echo json_encode(['success' => false, 'message' => 'Title and body are required']);
        exit;
    }

    $sql = "SELECT fcm_token, user_id FROM user_fcm_tokens WHERE notifications_allowed = TRUE";
    if ($sendAfterWeek) {
        $sql .= " AND last_active < DATE_SUB(NOW(), INTERVAL 7 DAY)";
    }

    $result = $conn->query($sql);
    if ($result === false) {
        error_log('Token query failed: ' . $conn->error);
        http_response_code(500);
        die(json_encode(['success' => false, 'message' => 'Token query failed: ' . $conn->error]));
    }

    $fcmData = [];
    while ($row = $result->fetch_assoc()) {
        $fcmData[] = [
            'token' => $row['fcm_token'],
            'user_id' => $row['user_id']
        ];
    }

    if (empty($fcmData)) {
        echo json_encode(['success' => false, 'message' => 'No eligible users found']);
        $conn->close();
        exit;
    }

    $logFile = __DIR__ . '/fcm_notifications.log';
    $successCount = 0;
    $failCount = 0;
    $invalidTokens = [];

    try {
        $accessToken = getAccessToken($credentials);
    } catch (Exception $e) {
        error_log('Access token error: ' . $e->getMessage());
        http_response_code(500);
        die(json_encode(['success' => false, 'message' => 'Access token error: ' . $e->getMessage()]));
    }

    $serviceAccountData = json_decode(file_get_contents($serviceAccountFile), true);
    if (!$serviceAccountData || empty($serviceAccountData['project_id'])) {
        error_log('Invalid service account JSON');
        http_response_code(500);
        die(json_encode(['success' => false, 'message' => 'Invalid service account JSON']));
    }
    $projectId = $serviceAccountData['project_id'];

    foreach ($fcmData as $data) {
        $token = $data['token'];
        $userId = $data['user_id'];

        $notification = [
            'title' => $title,
            'body' => $body,
        ];
        if (!empty($image)) {
            $notification['image'] = $image;
        }

        $payload = [
            'message' => [
                'token' => $token,
                'notification' => $notification,
                'data' => [
                    'route' => 'ImageScreen',
                    'click_action' => $click_action,
                    'title' => $title,
                    'body' => $body,
                ],
                'android' => [
                    'priority' => 'high',
                    'notification' => [
                        'sound' => 'default',
                        'channel_id' => 'default',
                    ],
                ],
                'apns' => [
                    'payload' => [
                        'aps' => [
                            'badge' => 1,
                            'sound' => 'default',
                        ],
                    ],
                ],
            ],
        ];

        try {
            $response = $client->post("https://fcm.googleapis.com/v1/projects/$projectId/messages:send", [
                'headers' => [
                    'Authorization' => 'Bearer ' . $accessToken,
                    'Content-Type' => 'application/json',
                ],
                'json' => $payload,
            ]);
            $httpCode = $response->getStatusCode();
            $responseBody = $response->getBody()->getContents();

            $logEntry = date('Y-m-d H:i:s') . " | User: $userId | Code: $httpCode | Response: $responseBody\n";
            file_put_contents($logFile, $logEntry, FILE_APPEND);

            if ($httpCode == 200) {
                $successCount++;
            }
        } catch (RequestException $e) {
            $failCount++;
            $httpCode = $e->hasResponse() ? $e->getResponse()->getStatusCode() : 0;
            $responseBody = $e->hasResponse() ? $e->getResponse()->getBody()->getContents() : $e->getMessage();

            $logEntry = date('Y-m-d H:i:s') . " | User: $userId | Code: $httpCode | Error: $responseBody\n";
            file_put_contents($logFile, $logEntry, FILE_APPEND);

            $responseData = json_decode($responseBody, true);
            if (isset($responseData['error']['status']) && 
                in_array($responseData['error']['status'], ['NOT_FOUND', 'UNREGISTERED', 'INVALID_ARGUMENT'])) {
                $invalidTokens[] = $token;
            }
        }

        usleep(100000); // 0.1 second delay
    }

    if (!empty($invalidTokens)) {
        foreach ($invalidTokens as $invalidToken) {
            $deleteSql = "DELETE FROM user_fcm_tokens WHERE fcm_token = ?";
            $stmt = $conn->prepare($deleteSql);
            if ($stmt) {
                $stmt->bind_param("s", $invalidToken);
                $stmt->execute();
                $stmt->close();
            }
        }
    }

    echo json_encode([
        'success' => true,
        'message' => "Sent to $successCount users successfully" . 
                     ($failCount > 0 ? ", $failCount failed" : ""),
        'details' => [
            'total_attempted' => count($fcmData),
            'success' => $successCount,
            'failed' => $failCount,
            'invalid_tokens_removed' => count($invalidTokens)
        ]
    ]);

} else {
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

$conn->close();
?>