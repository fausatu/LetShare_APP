<?php
/**
 * Remove console.log() statements from JavaScript files
 * Usage: php scripts/remove_console_logs.php [--dry-run]
 * 
 * Use --dry-run to see what would be removed without actually removing
 */

$dryRun = in_array('--dry-run', $argv);
$jsDir = __DIR__ . '/../js';
$files = glob($jsDir . '/*.js');

if (empty($files)) {
    echo "No JavaScript files found in js/ directory\n";
    exit(1);
}

echo "========================================\n";
echo "Remove console.log() Statements\n";
echo "========================================\n";
if ($dryRun) {
    echo "🔍 DRY RUN MODE - No files will be modified\n";
}
echo "\n";

$totalRemoved = 0;
$filesProcessed = 0;

foreach ($files as $file) {
    $content = file_get_contents($file);
    $originalContent = $content;
    
    // Count console.log statements
    $count = preg_match_all('/console\.log\([^)]*\);?\s*/', $content);
    
    if ($count > 0) {
        $filesProcessed++;
        echo "📄 " . basename($file) . ": Found $count console.log() statement(s)\n";
        
        if (!$dryRun) {
            // Remove console.log statements (keep console.error and console.warn for now)
            // This regex removes: console.log(...); with optional whitespace
            $content = preg_replace('/\s*console\.log\([^)]*\);?\s*\n?/m', '', $content);
            
            // Save if changed
            if ($content !== $originalContent) {
                file_put_contents($file, $content);
                echo "   ✅ Removed $count statement(s)\n";
            }
        }
        
        $totalRemoved += $count;
    }
}

echo "\n========================================\n";
echo "Summary\n";
echo "========================================\n";
echo "Files processed: $filesProcessed\n";
echo "Total console.log() found: $totalRemoved\n";

if ($dryRun) {
    echo "\n🔍 DRY RUN - No files were modified\n";
    echo "Run without --dry-run to actually remove them:\n";
    echo "  php scripts/remove_console_logs.php\n";
} else {
    echo "\n✅ Console.log() statements removed!\n";
    echo "Note: console.error() and console.warn() were kept for debugging.\n";
}

echo "\n";

