<?php
// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Set timezone to IST
date_default_timezone_set('Asia/Kolkata');

// Include Firebase dependencies
require __DIR__ . '/vendor/autoload.php';
use Google\Auth\Credentials\ServiceAccountCredentials;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;

// Database connection
$servername = "";
$username = "";
$password = "";
$dbname = "";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}

// Create notifications table if not exists
$conn->query("
    CREATE TABLE IF NOT EXISTS festival_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        festival_date VARCHAR(10),
        session_time DATETIME,
        festival_name_english VARCHAR(255),
        festival_name_hindi VARCHAR(255),
        festival_type VARCHAR(100),
        notification_sent BOOLEAN DEFAULT FALSE,
        sent_at DATETIME,
        UNIQUE KEY unique_festival_session (festival_date, session_time)
    )
");

// Create user notification tracking table
$conn->query("
    CREATE TABLE IF NOT EXISTS user_notification_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255),
        festival_date VARCHAR(10),
        session_time DATETIME,
        notification_sent_at DATETIME,
        UNIQUE KEY unique_user_festival_session (user_id, festival_date, session_time)
    )
");

// Read JSON data from file
$jsonFile = 'month.json';
$jsonData = file_get_contents($jsonFile);

// Check if file was read successfully
if ($jsonData === false) {
    die("Error: Could not read month.json. Check file path or permissions.");
}

// Decode JSON data to PHP array
$jsonArray = json_decode($jsonData, true);

// Check if JSON decoding was successful
if (json_last_error() !== JSON_ERROR_NONE) {
    die("Error: Invalid JSON format in month.json - " . json_last_error_msg());
}

// Access the full calendar data
$festivalData = $jsonArray['full_calendar_of_days_and_observances'] ?? [];

// Get current date and time
$currentDateTime = new DateTime();
$currentYear = $currentDateTime->format('Y');

// Map month names to numbers
$monthMap = [
    'January' => '01', 'February' => '02', 'March' => '03', 'April' => '04',
    'May' => '05', 'June' => '06', 'July' => '07', 'August' => '08',
    'September' => '09', 'October' => '10', 'November' => '11', 'December' => '12'
];

// Find the next upcoming special day (earliest future festival)
$nextFestival = null;
$minFutureDate = null;

foreach ($festivalData as $monthData) {
    $monthName = $monthData['month'] ?? '';
    $monthNumber = $monthMap[$monthName] ?? null;
    if (!$monthNumber) continue;

    foreach ($monthData['days'] as $day) {
        // Skip complex dates like "Second Sunday", "1-7", "4-10", etc.
        if (!is_numeric($day['date']) || strpos($day['date'], '-') !== false || strpos($day['date'], ' ') !== false) {
            continue;
        }

        $dayNumber = sprintf('%02d', $day['date']);
        $festivalDateStr = "$currentYear-$monthNumber-$dayNumber";
        $festivalDate = DateTime::createFromFormat('Y-m-d', $festivalDateStr);

        if ($festivalDate === false) continue;

        // If it's a future date or today, track the earliest one
        $today = (new DateTime())->setTime(0, 0, 0);
        if ($festivalDate >= $today) {
            if ($minFutureDate === null || $festivalDate < $minFutureDate) {
                $minFutureDate = $festivalDate;
                $nextFestival = [
                    'date' => $dayNumber,
                    'month' => $monthNumber,
                    'month_name' => $monthName,
                    'name_hindi' => $day['name_hindi'] ?? '',
                    'name_english' => $day['name_english'] ?? '',
                    'type' => $day['type'] ?? '',
                    'datetime' => $festivalDate
                ];
            }
        }
    }
}

// If no next festival found, output message
if (!$nextFestival) {
    echo "<p>No upcoming special days found.</p>";
    $conn->close();
    exit;
}

// Fixed session times: 4:15 PM IST
$fixedSessionTimes = ['14:44:00'];
$sessions = [];
$festivalDateStr = $nextFestival['month'] . '-' . $nextFestival['date'];

foreach ($fixedSessionTimes as $time) {
    $sessionDateTime = clone $nextFestival['datetime'];
    $sessionDateTime->setTime((int)substr($time, 0, 2), (int)substr($time, 3, 2), 0);

    // Include sessions for today or future dates
    $today = (new DateTime())->setTime(0, 0, 0);
    if ($sessionDateTime >= $today) {
        $sessions[] = [
            'time_str' => $sessionDateTime->format('Y-m-d H:i:s'),
            'display_time' => $sessionDateTime->format('M j, g:i A'),
            'date_str' => $sessionDateTime->format('M j')
        ];
    }
}

// Check and send notifications for matching session times
$serviceAccountFile = __DIR__ . '/aibro.json';
$credentials = new ServiceAccountCredentials(['https://www.googleapis.com/auth/firebase.messaging'], $serviceAccountFile);
$token = $credentials->fetchAuthToken();
$accessToken = $token['access_token'];
$serviceAccountData = json_decode(file_get_contents($serviceAccountFile), true);
$projectId = $serviceAccountData['project_id'];
$client = new Client();

// Log file for debugging
$logFile = __DIR__ . '/notification_log.txt';

foreach ($sessions as &$session) {
    $sessionTime = new DateTime($session['time_str']);

    // Check if notification entry exists in DB
    $stmt = $conn->prepare("SELECT notification_sent, sent_at FROM festival_notifications WHERE festival_date = ? AND session_time = ?");
    $stmt->bind_param("ss", $festivalDateStr, $session['time_str']);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    $stmt->close();

    $session['notification_sent'] = $row ? $row['notification_sent'] : false;
    $session['sent_at'] = $row && $row['sent_at'] ? $row['sent_at'] : null;

    // Check if current time is within 5 minutes of session time and notification hasn't been sent
    $timeDiff = abs($currentDateTime->getTimestamp() - $sessionTime->getTimestamp());
    file_put_contents($logFile, "Checking session {$session['time_str']}, Time Diff: $timeDiff seconds\n", FILE_APPEND);

    if ($timeDiff <= 300 && !$session['notification_sent']) { // 5-minute window
        file_put_contents($logFile, "Sending notification for {$nextFestival['name_english']} at {$session['time_str']}\n", FILE_APPEND);

        // Insert into festival_notifications table
        $stmt = $conn->prepare("
            INSERT INTO festival_notifications (festival_date, session_time, festival_name_english, festival_name_hindi, festival_type, notification_sent, sent_at)
            VALUES (?, ?, ?, ?, ?, TRUE, NOW())
            ON DUPLICATE KEY UPDATE notification_sent = TRUE, sent_at = NOW()
        ");
        $stmt->bind_param("sssss", $festivalDateStr, $session['time_str'], $nextFestival['name_english'], $nextFestival['name_hindi'], $nextFestival['type']);
        $stmt->execute();
        $stmt->close();

        // Get all users who should receive notifications
        $sql = "SELECT fcm_token, user_id FROM user_fcm_tokens WHERE notifications_allowed = TRUE";
        $result = $conn->query($sql);
        $fcmData = [];
        while ($row = $result->fetch_assoc()) {
            $fcmData[] = [
                'token' => $row['fcm_token'],
                'user_id' => $row['user_id']
            ];
        }

        // Send notifications to users who haven't received this specific notification
        foreach ($fcmData as $data) {
            // Check if user has already received this notification
            $checkStmt = $conn->prepare("SELECT id FROM user_notification_tracking WHERE user_id = ? AND festival_date = ? AND session_time = ?");
            $checkStmt->bind_param("sss", $data['user_id'], $festivalDateStr, $session['time_str']);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            $checkStmt->close();

            // If user hasn't received this notification, send it
            if ($checkResult->num_rows === 0) {
                $payload = [
                    'message' => [
                        'token' => $data['token'],
                        'notification' => [
                            'title' => "{$nextFestival['name_english']}",
                            'body' => "Create Greeting for {$nextFestival['name_hindi']} on {$session['display_time']}!",
                        ],
                        'data' => [
                            'route' => 'ImageScreen',
                            'click_action' => 'myapp://open/festival',
                        ],
                        'android' => [
                            'priority' => 'high',
                            'notification' => [
                                'channel_id' => 'broai_notifications',
                                'sound' => 'default',
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
                    $client->post("https://fcm.googleapis.com/v1/projects/$projectId/messages:send", [
                        'headers' => [
                            'Authorization' => 'Bearer ' . $accessToken,
                            'Content-Type' => 'application/json',
                        ],
                        'json' => $payload,
                    ]);

                    // Record that this user received this notification
                    $trackStmt = $conn->prepare("
                        INSERT INTO user_notification_tracking (user_id, festival_date, session_time, notification_sent_at)
                        VALUES (?, ?, ?, NOW())
                    ");
                    $trackStmt->bind_param("sss", $data['user_id'], $festivalDateStr, $session['time_str']);
                    $trackStmt->execute();
                    $trackStmt->close();

                    file_put_contents($logFile, "Notification sent to user {$data['user_id']} for {$nextFestival['name_english']} at {$session['time_str']}\n", FILE_APPEND);
                } catch (RequestException $e) {
                    file_put_contents($logFile, "Notification failed for user {$data['user_id']}: " . $e->getMessage() . "\n", FILE_APPEND);
                }
                usleep(100000); // Small delay between notifications
            }
        }

        $session['notification_sent'] = true;
        $session['sent_at'] = $currentDateTime->format('Y-m-d H:i:s');
    }
}

// Output the table
echo "<h2>Next Special Day: " . htmlspecialchars($nextFestival['name_english']) . "</h2>";
echo "<p>Festival Date: " . htmlspecialchars($nextFestival['month_name'] . ' ' . $nextFestival['date']) . "</p>";
echo "<table border='1' cellpadding='10' cellspacing='0'>";
echo "<tr>
        <th>Session Time</th>
        <th>Date</th>
        <th>Hindi Name</th>
        <th>English Name</th>
        <th>Type</th>
        <th>Notification Sent</th>
      </tr>";

foreach ($sessions as $session) {
    echo "<tr>";
    echo "<td>" . htmlspecialchars($session['display_time']) . "</td>";
    echo "<td>" . htmlspecialchars($nextFestival['month'] . '-' . $nextFestival['date']) . "</td>";
    echo "<td>" . htmlspecialchars($nextFestival['name_hindi']) . "</td>";
    echo "<td>" . htmlspecialchars($nextFestival['name_english']) . "</td>";
    echo "<td>" . htmlspecialchars($nextFestival['type']) . "</td>";
    echo "<td>" . ($session['notification_sent'] ? "✓ Sent at " . $session['sent_at'] : "Pending") . "</td>";
    echo "</tr>";
}
echo "</table>";

$conn->close();
?>