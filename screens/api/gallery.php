<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Cache-Control: no-cache, must-revalidate");

// Base URL for images
$baseUrl = '/usergeneration/';

// Path to the images folder (adjust this to match your server structure)
// If this PHP file is in the same directory as usergeneration folder:
$imagesPath = __DIR__ . '/usergeneration/';

// If usergeneration is in a different location, adjust accordingly:
// $imagesPath = '/path/to/broai/usergeneration/';

try {
    // Check if directory exists
    if (!is_dir($imagesPath)) {
        throw new Exception("Directory not found: " . $imagesPath);
    }

    // Get all files from the directory
    $files = scandir($imagesPath);
    
    // Filter only image files
    $imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    $images = [];
    
    foreach ($files as $file) {
        // Skip . and ..
        if ($file === '.' || $file === '..') {
            continue;
        }
        
        // Get file extension
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        
        // Check if it's an image file
        if (in_array($extension, $imageExtensions)) {
            $images[] = [
                'filename' => $file,
                'image_url' => $baseUrl . $file,
                'full_path' => $baseUrl . $file
            ];
        }
    }
    
    // Shuffle to make it random
    shuffle($images);
    
    echo json_encode([
        'status' => 'success',
        'data' => $images,
        'total_images' => count($images),
        'base_url' => $baseUrl,
        'message' => 'Images loaded successfully'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ], JSON_PRETTY_PRINT);
}
?>