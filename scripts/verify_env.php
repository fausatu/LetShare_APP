<?php
$env = file_get_contents(__DIR__ . '/../.env');
preg_match('/^JWT_SECRET\s*=\s*(.+)$/mi', $env, $matches);
if (isset($matches[1])) {
    $value = trim($matches[1]);
    if ($value === 'your-secret-key-change-this-in-production') {
        echo "❌ JWT_SECRET is still default\n";
    } else {
        echo "✅ JWT_SECRET is set (length: " . strlen($value) . " chars)\n";
        echo "   First 20 chars: " . substr($value, 0, 20) . "...\n";
    }
} else {
    echo "❌ JWT_SECRET not found\n";
}

