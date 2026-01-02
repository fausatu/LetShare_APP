<?php
/**
 * Diagnostic script to check push_subscriptions table structure
 * Access this via browser to see table status
 */
require_once '../config.php';

header('Content-Type: text/html; charset=utf-8');

try {
    $pdo = getDBConnection();
    
    echo "<h2>Push Subscriptions Table Diagnostic</h2>";
    
    // Check if table exists
    $checkTable = $pdo->query("SHOW TABLES LIKE 'push_subscriptions'");
    if ($checkTable->rowCount() == 0) {
        echo "<p style='color: red;'>❌ Table 'push_subscriptions' does NOT exist</p>";
        echo "<p>Run the migration script: database/migration_create_push_subscriptions.sql</p>";
    } else {
        echo "<p style='color: green;'>✅ Table 'push_subscriptions' exists</p>";
        
        // Show table structure
        echo "<h3>Table Structure:</h3>";
        $structure = $pdo->query("DESCRIBE push_subscriptions");
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
        while ($row = $structure->fetch(PDO::FETCH_ASSOC)) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($row['Field']) . "</td>";
            echo "<td>" . htmlspecialchars($row['Type']) . "</td>";
            echo "<td>" . htmlspecialchars($row['Null']) . "</td>";
            echo "<td>" . htmlspecialchars($row['Key']) . "</td>";
            echo "<td>" . htmlspecialchars($row['Default'] ?? 'NULL') . "</td>";
            echo "<td>" . htmlspecialchars($row['Extra']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        // Show indexes
        echo "<h3>Indexes:</h3>";
        $indexes = $pdo->query("SHOW INDEXES FROM push_subscriptions");
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>Key Name</th><th>Column</th><th>Non Unique</th><th>Index Type</th></tr>";
        while ($row = $indexes->fetch(PDO::FETCH_ASSOC)) {
            echo "<tr>";
            echo "<td>" . htmlspecialchars($row['Key_name']) . "</td>";
            echo "<td>" . htmlspecialchars($row['Column_name']) . "</td>";
            echo "<td>" . htmlspecialchars($row['Non_unique']) . "</td>";
            echo "<td>" . htmlspecialchars($row['Index_type']) . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        // Show foreign keys
        echo "<h3>Foreign Keys:</h3>";
        try {
            $fks = $pdo->query("
                SELECT 
                    CONSTRAINT_NAME,
                    COLUMN_NAME,
                    REFERENCED_TABLE_NAME,
                    REFERENCED_COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'push_subscriptions'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ");
            $fkCount = 0;
            echo "<table border='1' cellpadding='5'>";
            echo "<tr><th>Constraint Name</th><th>Column</th><th>References Table</th><th>References Column</th></tr>";
            while ($row = $fks->fetch(PDO::FETCH_ASSOC)) {
                $fkCount++;
                echo "<tr>";
                echo "<td>" . htmlspecialchars($row['CONSTRAINT_NAME']) . "</td>";
                echo "<td>" . htmlspecialchars($row['COLUMN_NAME']) . "</td>";
                echo "<td>" . htmlspecialchars($row['REFERENCED_TABLE_NAME']) . "</td>";
                echo "<td>" . htmlspecialchars($row['REFERENCED_COLUMN_NAME']) . "</td>";
                echo "</tr>";
            }
            echo "</table>";
            if ($fkCount == 0) {
                echo "<p style='color: orange;'>⚠️ No foreign keys found (this is OK if users table doesn't exist or FK creation failed)</p>";
            }
        } catch (PDOException $e) {
            echo "<p style='color: orange;'>⚠️ Could not check foreign keys: " . htmlspecialchars($e->getMessage()) . "</p>";
        }
        
        // Count records
        $count = $pdo->query("SELECT COUNT(*) FROM push_subscriptions")->fetchColumn();
        echo "<h3>Records:</h3>";
        echo "<p>Total subscriptions: <strong>$count</strong></p>";
    }
    
} catch (PDOException $e) {
    echo "<p style='color: red;'>❌ Database Error: " . htmlspecialchars($e->getMessage()) . "</p>";
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error: " . htmlspecialchars($e->getMessage()) . "</p>";
}

