<?php
/**
 * Production Readiness Check Script
 * Run this script before deploying to production
 * Usage: php scripts/check_production.php
 */

echo "========================================\n";
echo "LetShare Production Readiness Check\n";
echo "========================================\n\n";

$errors = [];
$warnings = [];
$info = [];

// 1. Check .env file
echo "1. Checking .env file...\n";
if (!file_exists(__DIR__ . '/../.env')) {
    $errors[] = ".env file does not exist. Copy env.example.txt to .env and configure it.";
} else {
    $info[] = ".env file exists.";
    
    // Check if using default values
    $envContent = file_get_contents(__DIR__ . '/../.env');
    // Check if JWT_SECRET contains the default value
    if (preg_match('/^JWT_SECRET\s*=\s*(.+)$/mi', $envContent, $matches)) {
        $jwtValue = trim($matches[1]);
        if ($jwtValue === 'your-secret-key-change-this-in-production' || empty($jwtValue)) {
            $errors[] = "JWT_SECRET is still set to default value. Change it in .env";
        }
    } else {
        $errors[] = "JWT_SECRET not found in .env";
    }
    if (strpos($envContent, 'yourdomain.com') !== false) {
        $warnings[] = "APP_BASE_URL contains 'yourdomain.com'. Update with your actual domain.";
    }
    if (strpos($envContent, 'APP_ENV=development') !== false) {
        $warnings[] = "APP_ENV is set to 'development'. Should be 'production' in production.";
    }
    if (strpos($envContent, 'DEBUG_MODE=true') !== false) {
        $errors[] = "DEBUG_MODE is set to 'true'. Must be 'false' in production.";
    }
}

// 2. Check database configuration
echo "2. Checking database configuration...\n";
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES);
    $dbPass = '';
    foreach ($lines as $line) {
        if (strpos($line, 'DB_PASS=') === 0) {
            $dbPass = substr($line, 8);
            break;
        }
    }
    if (empty($dbPass)) {
        $warnings[] = "Database password is empty. Use a strong password in production.";
    }
}

// 3. Check sensitive files are not accessible
echo "3. Checking file security...\n";
$sensitiveFiles = ['.env', 'composer.json', 'composer.lock'];
foreach ($sensitiveFiles as $file) {
    if (file_exists(__DIR__ . '/../' . $file)) {
        $info[] = "Protected file: $file (should be blocked by .htaccess)";
    }
}

// 4. Check .htaccess exists
echo "4. Checking .htaccess configuration...\n";
if (!file_exists(__DIR__ . '/../.htaccess')) {
    $warnings[] = ".htaccess file not found in root directory.";
} else {
    $htaccess = file_get_contents(__DIR__ . '/../.htaccess');
    if (strpos($htaccess, 'ngrok-skip-browser-warning') !== false && strpos($htaccess, '#') === false) {
        $warnings[] = ".htaccess still contains ngrok header. Should be commented out in production.";
    }
}

// 5. Check API .htaccess
if (!file_exists(__DIR__ . '/../api/.htaccess')) {
    $warnings[] = ".htaccess file not found in api directory.";
}

// 6. Check for console.log in JavaScript (warnings only)
echo "5. Checking JavaScript files...\n";
$jsFiles = glob(__DIR__ . '/../js/*.js');
$consoleLogCount = 0;
foreach ($jsFiles as $file) {
    $content = file_get_contents($file);
    $count = substr_count($content, 'console.log');
    if ($count > 0) {
        $consoleLogCount += $count;
    }
}
if ($consoleLogCount > 10) {
    $warnings[] = "Found $consoleLogCount console.log() statements. Consider removing them for production.";
}

// 7. Check if vendor directory exists (Composer dependencies)
echo "6. Checking dependencies...\n";
if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
    $errors[] = "vendor/autoload.php not found. Run 'composer install' to install dependencies.";
} else {
    $info[] = "Composer dependencies installed.";
}

// 8. Check database migrations
echo "7. Checking database migrations...\n";
$migrationDir = __DIR__ . '/../database';
if (!is_dir($migrationDir)) {
    $errors[] = "database directory not found.";
} else {
    $migrations = glob($migrationDir . '/migration_*.sql');
    $info[] = "Found " . count($migrations) . " migration files.";
}

// 9. Check Service Worker
echo "8. Checking Service Worker...\n";
if (!file_exists(__DIR__ . '/../sw.js')) {
    $errors[] = "sw.js (Service Worker) not found in root directory. Push notifications won't work.";
} else {
    $info[] = "Service Worker file exists.";
}

// 10. Check SSL/HTTPS (can't verify programmatically, just a note)
echo "9. SSL/HTTPS Configuration...\n";
$info[] = "Note: Ensure SSL certificate is configured. Push notifications require HTTPS.";

// 11. Check CORS configuration
echo "10. Checking CORS configuration...\n";
if (file_exists(__DIR__ . '/../.env')) {
    $envContent = file_get_contents(__DIR__ . '/../.env');
    if (strpos($envContent, 'CORS_ALLOWED_ORIGINS=') === false) {
        $warnings[] = "CORS_ALLOWED_ORIGINS not found in .env. Configure allowed origins for production.";
    } elseif (strpos($envContent, 'CORS_ALLOWED_ORIGINS=*') !== false || 
              strpos($envContent, 'CORS_ALLOWED_ORIGINS=https://yourdomain.com') !== false) {
        $errors[] = "CORS_ALLOWED_ORIGINS is set to wildcard or placeholder. Configure specific domains.";
    }
}

// Summary
echo "\n========================================\n";
echo "SUMMARY\n";
echo "========================================\n\n";

if (!empty($info)) {
    echo "✅ INFO:\n";
    foreach ($info as $item) {
        echo "   - $item\n";
    }
    echo "\n";
}

if (!empty($warnings)) {
    echo "⚠️  WARNINGS (" . count($warnings) . "):\n";
    foreach ($warnings as $item) {
        echo "   - $item\n";
    }
    echo "\n";
}

if (!empty($errors)) {
    echo "❌ ERRORS (" . count($errors) . ") - MUST FIX BEFORE PRODUCTION:\n";
    foreach ($errors as $item) {
        echo "   - $item\n";
    }
    echo "\n";
    exit(1);
} else {
    echo "✅ No critical errors found!\n";
    if (!empty($warnings)) {
        echo "⚠️  Please review warnings above.\n";
        exit(0);
    } else {
        echo "✅ Ready for production!\n";
        exit(0);
    }
}

