<?php
/**
 * Diagnostic IONOS - À placer à la racine de letshare-app.fr
 * Accéder via: https://letshare-app.fr/diagnostic.php
 * SUPPRIMER après diagnostic !
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>LetShare - Diagnostic IONOS</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #fff; }
        .section { margin: 20px 0; padding: 15px; background: #2a2a2a; border-radius: 5px; }
        .ok { color: #10b981; }
        .error { color: #ef4444; }
        .warning { color: #f59e0b; }
        h2 { color: #3b82f6; }
        pre { background: #000; padding: 10px; overflow: auto; }
    </style>
</head>
<body>
    <h1>🔍 Diagnostic LetShare sur IONOS</h1>
    
    <div class="section">
        <h2>1. PHP Version</h2>
        <?php
        $phpVersion = phpversion();
        $phpOk = version_compare($phpVersion, '7.4.0', '>=');
        echo '<p class="' . ($phpOk ? 'ok' : 'error') . '">';
        echo $phpOk ? '✅' : '❌';
        echo " PHP Version: $phpVersion";
        if (!$phpOk) echo " (Minimum requis: 7.4)";
        echo '</p>';
        ?>
    </div>
    
    <div class="section">
        <h2>2. Extensions PHP</h2>
        <?php
        $requiredExtensions = ['pdo', 'pdo_mysql', 'curl', 'openssl', 'mbstring', 'json'];
        foreach ($requiredExtensions as $ext) {
            $loaded = extension_loaded($ext);
            echo '<p class="' . ($loaded ? 'ok' : 'error') . '">';
            echo $loaded ? '✅' : '❌';
            echo " $ext</p>";
        }
        ?>
    </div>
    
    <div class="section">
        <h2>3. Composer & Vendor</h2>
        <?php
        $vendorExists = file_exists(__DIR__ . '/vendor/autoload.php');
        echo '<p class="' . ($vendorExists ? 'ok' : 'error') . '">';
        echo $vendorExists ? '✅' : '❌';
        echo " vendor/autoload.php</p>";
        
        if ($vendorExists) {
            require_once __DIR__ . '/vendor/autoload.php';
            
            // Test Dotenv
            $dotenvExists = class_exists('Dotenv\Dotenv');
            echo '<p class="' . ($dotenvExists ? 'ok' : 'error') . '">';
            echo $dotenvExists ? '✅' : '❌';
            echo " Dotenv\\Dotenv class</p>";
            
            // Test WebPush
            $webPushExists = class_exists('Minishlink\WebPush\WebPush');
            echo '<p class="' . ($webPushExists ? 'ok' : 'error') . '">';
            echo $webPushExists ? '✅' : '❌';
            echo " Minishlink\\WebPush\\WebPush class</p>";
        } else {
            echo '<p class="error">⚠️ Composer non installé ! Exécutez:</p>';
            echo '<pre>composer install --no-dev --optimize-autoloader</pre>';
        }
        ?>
    </div>
    
    <div class="section">
        <h2>4. Fichier .env</h2>
        <?php
        $envExists = file_exists(__DIR__ . '/.env');
        echo '<p class="' . ($envExists ? 'ok' : 'error') . '">';
        echo $envExists ? '✅' : '❌';
        echo " .env file</p>";
        
        if ($envExists) {
            $envReadable = is_readable(__DIR__ . '/.env');
            echo '<p class="' . ($envReadable ? 'ok' : 'error') . '">';
            echo $envReadable ? '✅' : '❌';
            echo " .env readable</p>";
            
            // Try to load .env
            if ($vendorExists && $envReadable) {
                try {
                    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
                    $dotenv->load();
                    echo '<p class="ok">✅ .env loaded successfully</p>';
                    
                    // Check critical variables
                    $criticalVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'JWT_SECRET', 'APP_ENV'];
                    echo '<h3>Variables critiques:</h3>';
                    foreach ($criticalVars as $var) {
                        $exists = isset($_ENV[$var]) && !empty($_ENV[$var]);
                        echo '<p class="' . ($exists ? 'ok' : 'error') . '">';
                        echo $exists ? '✅' : '❌';
                        echo " $var";
                        if ($exists && $var !== 'DB_PASS' && $var !== 'JWT_SECRET') {
                            echo " = " . $_ENV[$var];
                        }
                        echo '</p>';
                    }
                } catch (Exception $e) {
                    echo '<p class="error">❌ Erreur chargement .env: ' . htmlspecialchars($e->getMessage()) . '</p>';
                }
            }
        } else {
            echo '<p class="error">⚠️ Fichier .env manquant ! Créez-le avec:</p>';
            echo '<pre>APP_ENV=production
DB_HOST=db5019392479.hosting-data.io
DB_NAME=dbs15171326
DB_USER=dbu1946148
DB_PASS=votre_mot_de_passe
JWT_SECRET=votre_secret_key
DEBUG_MODE=false</pre>';
        }
        ?>
    </div>
    
    <div class="section">
        <h2>5. Connexion Base de Données</h2>
        <?php
        if ($vendorExists && $envExists && isset($_ENV['DB_HOST'])) {
            try {
                $pdo = new PDO(
                    'mysql:host=' . $_ENV['DB_HOST'] . ';dbname=' . $_ENV['DB_NAME'] . ';charset=utf8mb4',
                    $_ENV['DB_USER'],
                    $_ENV['DB_PASS'],
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
                );
                echo '<p class="ok">✅ Connexion DB réussie</p>';
                echo '<p class="ok">Host: ' . $_ENV['DB_HOST'] . '</p>';
                echo '<p class="ok">Database: ' . $_ENV['DB_NAME'] . '</p>';
                
                // Test table users
                $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
                $userTableExists = $stmt->rowCount() > 0;
                echo '<p class="' . ($userTableExists ? 'ok' : 'error') . '">';
                echo $userTableExists ? '✅' : '❌';
                echo " Table 'users' exists</p>";
                
            } catch (PDOException $e) {
                echo '<p class="error">❌ Erreur connexion DB: ' . htmlspecialchars($e->getMessage()) . '</p>';
            }
        } else {
            echo '<p class="warning">⚠️ Impossible de tester (vendor ou .env manquant)</p>';
        }
        ?>
    </div>
    
    <div class="section">
        <h2>6. Permissions Dossiers</h2>
        <?php
        $dirs = [
            'Post_images' => __DIR__ . '/Post_images',
            'Univ_Logo' => __DIR__ . '/Univ_Logo',
            'api' => __DIR__ . '/api',
        ];
        
        foreach ($dirs as $name => $path) {
            $exists = is_dir($path);
            $writable = $exists && is_writable($path);
            
            echo '<p class="' . ($exists ? ($writable ? 'ok' : 'warning') : 'error') . '">';
            if (!$exists) echo '❌';
            elseif ($writable) echo '✅';
            else echo '⚠️';
            echo " $name/";
            if ($exists) {
                $perms = substr(sprintf('%o', fileperms($path)), -4);
                echo " (permissions: $perms)";
                if (!$writable) echo " - NON WRITABLE !";
            } else {
                echo " - N'EXISTE PAS !";
            }
            echo '</p>';
        }
        ?>
    </div>
    
    <div class="section">
        <h2>7. Fichiers API Critiques</h2>
        <?php
        $files = [
            'api/config.php',
            'api/auth/login.php',
            'api/users.php',
            'api/items.php',
        ];
        
        foreach ($files as $file) {
            $path = __DIR__ . '/' . $file;
            $exists = file_exists($path);
            $readable = $exists && is_readable($path);
            
            echo '<p class="' . ($readable ? 'ok' : 'error') . '">';
            echo ($readable ? '✅' : '❌');
            echo " $file</p>";
        }
        ?>
    </div>
    
    <div class="section">
        <h2>8. Configuration Serveur</h2>
        <p><strong>Document Root:</strong> <?php echo $_SERVER['DOCUMENT_ROOT']; ?></p>
        <p><strong>Script Path:</strong> <?php echo __DIR__; ?></p>
        <p><strong>Server Software:</strong> <?php echo $_SERVER['SERVER_SOFTWARE'] ?? 'N/A'; ?></p>
        <p><strong>PHP SAPI:</strong> <?php echo php_sapi_name(); ?></p>
    </div>
    
    <div class="section">
        <h2>9. Test API Login (si tout OK)</h2>
        <?php
        if ($vendorExists && $envExists && isset($_ENV['DB_HOST'])) {
            echo '<p class="warning">⚠️ Testez manuellement:</p>';
            echo '<pre>curl -X POST https://letshare-app.fr/api/auth/login.php \\
  -H "Content-Type: application/json" \\
  -d \'{"email":"test@test.com","password":"test"}\'</pre>';
        } else {
            echo '<p class="error">❌ Corrigez d\'abord les erreurs ci-dessus</p>';
        }
        ?>
    </div>
    
    <hr>
    <p class="warning">⚠️ <strong>IMPORTANT:</strong> Supprimez ce fichier après diagnostic pour sécurité !</p>
    <p>Commande: <code>rm diagnostic.php</code></p>
    
</body>
</html>
