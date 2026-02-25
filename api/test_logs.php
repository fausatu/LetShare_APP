<?php
// Test where error_log writes to
error_log('TEST LOG MESSAGE - This is a test');

// Also show PHP configuration
echo "error_log setting: " . ini_get('error_log') . "\n";
echo "PHP version: " . phpversion() . "\n";
echo "Server: " . php_uname() . "\n";

// Try to write to custom log file
$customLog = __DIR__ . '/api_debug.log';
file_put_contents($customLog, "TEST: Custom log file at " . date('Y-m-d H:i:s') . "\n", FILE_APPEND);
echo "Custom log written to: " . $customLog . "\n";
?>
