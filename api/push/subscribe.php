<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display, but log
ini_set('log_errors', 1);

// Set error handler to catch all errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    error_log("PHP Error [$errno]: $errstr in $errfile on line $errline");
    if ($errno === E_ERROR || $errno === E_PARSE || $errno === E_CORE_ERROR) {
        sendResponse(false, 'PHP Error: ' . $errstr, [
            'file' => $errfile,
            'line' => $errline
        ], 500);
        exit;
    }
    return false; // Let PHP handle the error normally
});

// Set exception handler
set_exception_handler(function($exception) {
    error_log('Uncaught exception: ' . $exception->getMessage());
    error_log('Stack trace: ' . $exception->getTraceAsString());
    sendResponse(false, 'Uncaught exception: ' . $exception->getMessage(), [
        'file' => $exception->getFile(),
        'line' => $exception->getLine()
    ], 500);
    exit;
});

require_once '../config.php';

try {
    $user = requireAuth();
} catch (Exception $authError) {
    error_log('Auth error in push subscribe: ' . $authError->getMessage());
    sendResponse(false, 'Authentication required: ' . $authError->getMessage(), null, 401);
}

// Log request info before reading input
error_log('Push subscribe - Content-Type: ' . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
error_log('Push subscribe - Request method: ' . ($_SERVER['REQUEST_METHOD'] ?? 'not set'));

$data = getRequestData();

// Log received data for debugging
error_log('Push subscribe - Received data: ' . json_encode($data));
error_log('Push subscribe - Data keys: ' . implode(', ', array_keys($data)));

$subscription = $data['subscription'] ?? null;
$userId = $data['userId'] ?? $user['id'];

if (!$subscription) {
    error_log('Push subscribe - No subscription data provided');
    sendResponse(false, 'Subscription data is required', null, 400);
}

// Validate subscription structure
if (!isset($subscription['endpoint'])) {
    error_log('Push subscribe - Missing endpoint in subscription');
    sendResponse(false, 'Subscription endpoint is required', null, 400);
}

// Extract keys - handle both object and array formats
$p256dh = '';
$auth = '';

if (isset($subscription['keys']) && is_array($subscription['keys'])) {
    $p256dh = $subscription['keys']['p256dh'] ?? $subscription['keys']['p256dh'] ?? '';
    $auth = $subscription['keys']['auth'] ?? $subscription['keys']['auth'] ?? '';
} else {
    // Try direct access (in case keys are at root level)
    $p256dh = $subscription['p256dh'] ?? '';
    $auth = $subscription['auth'] ?? '';
}

if (empty($p256dh) || empty($auth)) {
    error_log('Push subscribe - Missing keys. Subscription structure: ' . json_encode($subscription));
    sendResponse(false, 'Subscription keys (p256dh and auth) are required', null, 400);
}

try {
    $pdo = getDBConnection();
    
    // First, try to fix endpoint column if it exists and is too small
    // This must be done BEFORE creating the table to avoid conflicts
    try {
        $checkTable = $pdo->query("SHOW TABLES LIKE 'push_subscriptions'");
        if ($checkTable->rowCount() > 0) {
            // Table exists, check and fix endpoint column
            $columns = $pdo->query("SHOW COLUMNS FROM push_subscriptions LIKE 'endpoint'");
            if ($columns->rowCount() > 0) {
                $columnInfo = $columns->fetch(PDO::FETCH_ASSOC);
                $columnType = strtoupper($columnInfo['Type']);
                // If it's VARCHAR or has a size limit, change it to TEXT
                if (strpos($columnType, 'VARCHAR') !== false || (strpos($columnType, 'TEXT') === false)) {
                    error_log('Fixing endpoint column from ' . $columnType . ' to TEXT');
                    $pdo->exec("ALTER TABLE push_subscriptions MODIFY COLUMN endpoint TEXT NOT NULL");
                    error_log('Endpoint column fixed to TEXT');
                }
            }
        }
    } catch (PDOException $e) {
        error_log('Column fix attempt note: ' . $e->getMessage());
    }
    
    // Try to ensure table exists (create if not exists)
    // This is a simple approach that won't fail if table already exists
    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                endpoint TEXT NOT NULL,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_user_id (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
        
        // Note: We don't create a unique constraint on endpoint because:
        // 1. TEXT columns require prefix length which can cause issues
        // 2. We'll handle uniqueness manually in the insert/update logic
        // Try to drop existing unique constraint if it exists (to avoid errors)
        try {
            $pdo->exec("ALTER TABLE push_subscriptions DROP INDEX unique_user_endpoint");
        } catch (PDOException $e) {
            // Index doesn't exist, that's fine
        }
        
        // Try to add foreign key (ignore if already exists)
        try {
            $pdo->exec("
                ALTER TABLE push_subscriptions 
                ADD CONSTRAINT fk_push_user 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ");
        } catch (PDOException $e) {
            // Foreign key might already exist, ignore
            if (strpos($e->getMessage(), 'Duplicate key name') === false && 
                strpos($e->getMessage(), 'already exists') === false &&
                strpos($e->getMessage(), 'Duplicate foreign key') === false) {
                error_log('Foreign key error (non-critical): ' . $e->getMessage());
            }
        }
    } catch (PDOException $e) {
        // If table creation fails for other reasons, log but continue
        error_log('Table setup note: ' . $e->getMessage());
    }
    
    // Validate data before insert
    if (empty($subscription['endpoint'])) {
        sendResponse(false, 'Endpoint is required', null, 400);
    }
    
    if (empty($p256dh) || empty($auth)) {
        error_log('Missing keys - p256dh: ' . (empty($p256dh) ? 'empty' : 'present') . ', auth: ' . (empty($auth) ? 'empty' : 'present'));
        sendResponse(false, 'Subscription keys are required', null, 400);
    }
    
    // Insert or update subscription
    // Note: We use a simple INSERT with manual duplicate check since TEXT columns
    // can't easily have unique constraints with prefix indexes
    // First, try to update existing subscription
    error_log('Checking for existing subscription for user ' . $userId . ' with endpoint length: ' . strlen($subscription['endpoint']));
    
    // Use LIKE for TEXT column comparison (more reliable than = for TEXT)
    $checkStmt = $pdo->prepare("SELECT id FROM push_subscriptions WHERE user_id = ? AND endpoint LIKE ?");
    $checkStmt->execute([(int)$userId, $subscription['endpoint']]);
    $existing = $checkStmt->fetch();
    
    if ($existing) {
        error_log('Updating existing subscription ID: ' . $existing['id']);
        // Update existing subscription
        $stmt = $pdo->prepare("
            UPDATE push_subscriptions 
            SET p256dh = ?, auth = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        
        try {
            $result = $stmt->execute([
                $p256dh,
                $auth,
                $existing['id']
            ]);
            
            if ($result) {
                error_log('Push subscription updated successfully for user ' . $userId);
                sendResponse(true, 'Push subscription updated');
                return;
            } else {
                $errorInfo = $stmt->errorInfo();
                error_log('Update failed: ' . json_encode($errorInfo));
                throw new PDOException('Update failed: ' . ($errorInfo[2] ?? 'Unknown error'));
            }
        } catch (PDOException $e) {
            error_log('PDO Exception during update: ' . $e->getMessage());
            throw $e;
        }
    } else {
        error_log('Inserting new subscription for user ' . $userId);
        // Insert new subscription
        $stmt = $pdo->prepare("
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
            VALUES (?, ?, ?, ?)
        ");
        
        error_log('Executing insert with userId: ' . $userId . ', endpoint length: ' . strlen($subscription['endpoint']) . ', p256dh length: ' . strlen($p256dh) . ', auth length: ' . strlen($auth));
        
        try {
            $result = $stmt->execute([
                (int)$userId,
                $subscription['endpoint'],
                $p256dh,
                $auth
            ]);
            
            if ($result) {
                error_log('Push subscription inserted successfully for user ' . $userId);
                sendResponse(true, 'Push subscription saved');
                return;
            } else {
                $errorInfo = $stmt->errorInfo();
                error_log('Insert failed: ' . json_encode($errorInfo));
                error_log('SQL State: ' . ($errorInfo[0] ?? 'N/A') . ', Error Code: ' . ($errorInfo[1] ?? 'N/A') . ', Error Message: ' . ($errorInfo[2] ?? 'N/A'));
                throw new PDOException('Insert failed: ' . ($errorInfo[2] ?? 'Unknown error'));
            }
        } catch (PDOException $e) {
            error_log('PDO Exception during insert: ' . $e->getMessage());
            error_log('PDO Exception code: ' . $e->getCode());
            throw $e;
        }
    }
} catch (PDOException $e) {
    // Special handling for duplicate subscription (constraint violation)
    if ($e->getCode() == 23000) {
        $isDev = isDevelopment();
        error_log('Push subscribe constraint violation: ' . $e->getMessage());
        if ($isDev) {
            sendResponse(false, 'Subscription already exists or constraint violation: ' . $e->getMessage(), null, 400);
        } else {
            sendResponse(false, 'Subscription already exists', null, 400);
        }
    } else {
        handleDatabaseError($e, 'push_subscribe');
    }
} catch (Exception $e) {
    handleError($e, 'push_subscribe');
}

