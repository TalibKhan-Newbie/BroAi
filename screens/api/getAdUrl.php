<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Ad URLs array - add your ad URLs here
$adUrls = [
    'https://www.example-ad1.com',
    'https://www.example-ad2.com',
    'https://www.example-ad3.com',
    'https://www.example-ad4.com',
    'https://www.example-ad5.com',
    'https://www.example-ad6.com',
    'https://www.example-ad7.com',
    'https://www.example-ad8.com',
    'https://www.example-ad9.com',
    'https://www.example-ad10.com',
];

try {
    // Shuffle array for randomness
    shuffle($adUrls);
    
    // Return random URL
    $randomUrl = $adUrls[0];
    
    echo json_encode([
        'success' => true,
        'url' => $randomUrl,
        'duration' => 15, // seconds
        'message' => 'Ad URL fetched successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fetch ad URL: ' . $e->getMessage()
    ]);
}
?>