<?php
/**
 * Fix Production Configuration
 * This script automatically fixes common production configuration issues
 * Usage: php scripts/fix_production_config.php
 */

echo "========================================\n";
echo "LetShare Production Configuration Fix\n";
echo "========================================\n\n";

$envFile = __DIR__ . '/../.env';

if (!file_exists($envFile)) {
    echo "❌ ERROR: .env file not found!\n";
    echo "Please create .env file first by copying env.example.txt\n";
    exit(1);
}

echo "📝 Reading .env file...\n";
$envContent = file_get_contents($envFile);
$lines = file($envFile, FILE_IGNORE_NEW_LINES);
$modified = false;

// Track what we're fixing
$fixes = [];

echo "\n🔧 Applying fixes...\n\n";

// 1. Fix DEBUG_MODE (check both formats: DEBUG_MODE=true and DEBUG_MODE = true)
if (preg_match('/^DEBUG_MODE\s*=\s*true\s*$/mi', $envContent)) {
    $envContent = preg_replace('/^DEBUG_MODE\s*=\s*true\s*$/mi', 'DEBUG_MODE=false', $envContent);
    $fixes[] = "✅ Changed DEBUG_MODE from 'true' to 'false'";
    $modified = true;
    echo "✅ Fixed DEBUG_MODE: true → false\n";
} elseif (preg_match('/^DEBUG_MODE\s*=\s*["\']?true["\']?\s*$/mi', $envContent)) {
    $envContent = preg_replace('/^DEBUG_MODE\s*=\s*["\']?true["\']?\s*$/mi', 'DEBUG_MODE=false', $envContent);
    $fixes[] = "✅ Changed DEBUG_MODE from 'true' to 'false'";
    $modified = true;
    echo "✅ Fixed DEBUG_MODE: true → false\n";
}

// 2. Fix APP_ENV (check both formats)
if (preg_match('/^APP_ENV\s*=\s*development\s*$/mi', $envContent)) {
    $envContent = preg_replace('/^APP_ENV\s*=\s*development\s*$/mi', 'APP_ENV=production', $envContent);
    $fixes[] = "✅ Changed APP_ENV from 'development' to 'production'";
    $modified = true;
    echo "✅ Fixed APP_ENV: development → production\n";
} elseif (preg_match('/^APP_ENV\s*=\s*["\']?development["\']?\s*$/mi', $envContent)) {
    $envContent = preg_replace('/^APP_ENV\s*=\s*["\']?development["\']?\s*$/mi', 'APP_ENV=production', $envContent);
    $fixes[] = "✅ Changed APP_ENV from 'development' to 'production'";
    $modified = true;
    echo "✅ Fixed APP_ENV: development → production\n";
}

// 3. Fix JWT_SECRET (check if it's the default value)
if (preg_match('/^JWT_SECRET\s*=\s*your-secret-key-change-this-in-production\s*$/mi', $envContent) ||
    preg_match('/^JWT_SECRET\s*=\s*your-secret-key-change-this-in-production/mi', $envContent)) {
    // Generate a new JWT_SECRET
    $newSecret = base64_encode(random_bytes(32));
    // Replace the line
    $envContent = preg_replace(
        '/^JWT_SECRET\s*=\s*your-secret-key-change-this-in-production.*$/mi',
        'JWT_SECRET=' . $newSecret,
        $envContent
    );
    $fixes[] = "✅ Generated new JWT_SECRET";
    $modified = true;
    echo "✅ Fixed JWT_SECRET: Generated new secure secret\n";
}

// 4. Check DB_PASS (can't auto-fix, but warn)
if (preg_match('/^DB_PASS\s*=\s*$/', $envContent) || preg_match('/^DB_PASS\s*=\s*$/m', $envContent)) {
    echo "⚠️  WARNING: DB_PASS is empty. Please set a strong database password manually.\n";
    echo "   Edit .env and set: DB_PASS=your_strong_password_here\n\n";
}

// Save if modified
if ($modified) {
    // Backup original
    $backupFile = $envFile . '.backup.' . date('YmdHis');
    copy($envFile, $backupFile);
    echo "\n💾 Backed up original .env to: " . basename($backupFile) . "\n";
    
    // Write new content
    file_put_contents($envFile, $envContent);
    echo "✅ Saved updated .env file\n\n";
    
    echo "========================================\n";
    echo "Fixes Applied:\n";
    echo "========================================\n";
    foreach ($fixes as $fix) {
        echo "$fix\n";
    }
    echo "\n";
} else {
    echo "ℹ️  No fixes needed. Configuration looks good!\n\n";
}

// Summary
echo "========================================\n";
echo "Remaining Actions (Manual):\n";
echo "========================================\n";
echo "1. ⚠️  Set DB_PASS in .env (if empty)\n";
echo "2. ⚠️  Update APP_BASE_URL with your actual domain\n";
echo "3. ⚠️  Update CORS_ALLOWED_ORIGINS with your domains\n";
echo "4. ⚠️  Configure SMTP credentials\n";
echo "5. ⚠️  Configure VAPID keys for push notifications\n";
echo "\n";

echo "✅ Configuration fixes complete!\n";
echo "Run 'php scripts/check_production.php' again to verify.\n\n";

