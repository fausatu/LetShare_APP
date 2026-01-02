<?php
// Supprimer l'avertissement ngrok
header('ngrok-skip-browser-warning: true');
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vérification Email - LetShare</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .verification-container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            padding: 50px 40px;
            text-align: center;
        }
        
        .logo {
            margin-bottom: 30px;
        }
        
        .logo img {
            max-width: 120px;
            height: auto;
        }
        
        .icon {
            width: 100px;
            height: 100px;
            margin: 0 auto 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 50px;
            font-weight: bold;
        }
        
        .icon.success {
            background: #d1fae5;
            color: #10b981;
        }
        
        .icon.error {
            background: #fee2e2;
            color: #ef4444;
        }
        
        .icon.expired {
            background: #fef3c7;
            color: #f59e0b;
        }
        
        h1 {
            color: #1f2937;
            margin-bottom: 20px;
            font-size: 32px;
            font-weight: 700;
        }
        
        .message {
            background: #f9fafb;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            color: #374151;
            font-size: 16px;
            line-height: 1.6;
            border-left: 4px solid;
        }
        
        .message.success {
            background: #f0fdf4;
            border-color: #10b981;
            color: #059669;
        }
        
        .message.error {
            background: #fef2f2;
            border-color: #ef4444;
            color: #dc2626;
        }
        
        .message.expired {
            background: #fffbeb;
            border-color: #f59e0b;
            color: #d97706;
        }
        
        .btn {
            display: inline-block;
            padding: 14px 40px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);
        }
        
        .btn:active {
            transform: translateY(0);
        }
        
        .btn-secondary {
            background: #6b7280;
            box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
        }
        
        .btn-secondary:hover {
            box-shadow: 0 8px 24px rgba(107, 114, 128, 0.4);
        }
    </style>
</head>
<body>
    <div class="verification-container">
        
        <?php
        $status = $_GET['status'] ?? 'error';
        $message = $_GET['message'] ?? 'Une erreur est survenue';
        
        if ($status === 'success') {
            echo '<div class="icon success">✓</div>';
            echo '<h1>Email Vérifié !</h1>';
            echo '<div class="message success">' . htmlspecialchars($message) . '</div>';
            echo '<a href="Test.html" class="btn">Aller sur LetShare</a>';
        } elseif ($status === 'expired') {
            echo '<div class="icon expired">⏰</div>';
            echo '<h1>Lien Expiré</h1>';
            echo '<div class="message expired">' . htmlspecialchars($message) . '</div>';
            echo '<a href="login.html" class="btn">Aller à la Connexion</a>';
        } else {
            echo '<div class="icon error">✗</div>';
            echo '<h1>Échec de la Vérification</h1>';
            echo '<div class="message error">' . htmlspecialchars($message) . '</div>';
            echo '<div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">';
            echo '<a href="register.html" class="btn">Réessayer</a>';
            echo '<a href="login.html" class="btn btn-secondary">Se Connecter</a>';
            echo '</div>';
        }
        ?>
    </div>
</body>
</html>

