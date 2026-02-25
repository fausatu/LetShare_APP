<?php
$logFile = '/home/www/test_debug.log';
file_put_contents($logFile, "=== TEST FEEDBACK " . date('Y-m-d H:i:s') . " ===\n", FILE_APPEND);

// Test 1: Basic file write
file_put_contents($logFile, "Test 1: File write OK\n", FILE_APPEND);

// Test 2: Config and DB
try {
    require_once 'config.php';
    file_put_contents($logFile, "Test 2: Config loaded\n", FILE_APPEND);
    
    $pdo = getDBConnection();
    file_put_contents($logFile, "Test 3: Database connected\n", FILE_APPEND);
    
    // Check conversations table
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM conversations");
    $result = $stmt->fetch();
    file_put_contents($logFile, "Test 4: Conversations count = " . $result['cnt'] . "\n", FILE_APPEND);
    
    // Check exchange_feedback table
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM exchange_feedback");
    $result = $stmt->fetch();
    file_put_contents($logFile, "Test 5: Feedback count = " . $result['cnt'] . "\n", FILE_APPEND);
    
    // List recent conversations
    $stmt = $pdo->query("SELECT id, status, owner_id, requester_id FROM conversations ORDER BY id DESC LIMIT 3");
    $convs = $stmt->fetchAll();
    file_put_contents($logFile, "Test 6: Recent conversations:\n", FILE_APPEND);
    foreach ($convs as $c) {
        file_put_contents($logFile, "  - ID: " . $c['id'] . ", Status: " . $c['status'] . ", Owner: " . $c['owner_id'] . ", Requester: " . $c['requester_id'] . "\n", FILE_APPEND);
    }
    
    file_put_contents($logFile, "ALL TESTS PASSED\n\n", FILE_APPEND);
    echo "Tests OK - check /home/www/test_debug.log";
    
} catch (Exception $e) {
    file_put_contents($logFile, "ERROR: " . $e->getMessage() . "\n\n", FILE_APPEND);
    echo "Error: " . $e->getMessage();
}
?>
