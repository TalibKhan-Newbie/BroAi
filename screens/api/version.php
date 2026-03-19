<?php
header('Content-Type: application/json');

// Define the current app version (you can fetch this from a database or config file)
$version = "1.7";

// Return JSON response
echo json_encode(['version' => $version]);
?>