<?php
// Simple debug file to check if we can access the auth directory
echo "AUTH DIRECTORY TEST - " . date('Y-m-d H:i:s');
echo "<br>File: " . __FILE__;
echo "<br>Server: " . ($_SERVER['HTTP_HOST'] ?? 'unknown');
echo "<br>Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'unknown');

// Check if files exist
$files_to_check = [
    'send_email_code.php',
    'verify_email_code.php', 
    '../config.php'
];

echo "<h3>Files Check:</h3>";
foreach ($files_to_check as $file) {
    $path = __DIR__ . '/' . $file;
    if (file_exists($path)) {
        echo "✅ $file exists<br>";
    } else {
        echo "❌ $file NOT FOUND at: $path<br>";
    }
}

// Test basic PHP functions
echo "<h3>PHP Test:</h3>";
echo "PHP Version: " . phpversion() . "<br>";
echo "JSON extension: " . (extension_loaded('json') ? '✅' : '❌') . "<br>";
echo "PDO extension: " . (extension_loaded('pdo') ? '✅' : '❌') . "<br>";

// Try to include config
echo "<h3>Config Test:</h3>";
try {
    if (file_exists(__DIR__ . '/../config.php')) {
        echo "Config file exists ✅<br>";
        // Don't actually include it, just test if readable
        if (is_readable(__DIR__ . '/../config.php')) {
            echo "Config file is readable ✅<br>";
        } else {
            echo "Config file not readable ❌<br>";
        }
    } else {
        echo "Config file NOT FOUND ❌<br>";
    }
} catch (Exception $e) {
    echo "Config test error: " . $e->getMessage() . "<br>";
}

echo "<hr>";
echo "<a href='../../email_login.html'>← Back to login</a>";
?>