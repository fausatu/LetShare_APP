<?php
/**
 * Database configuration file
 * Uses environment variables for sensitive data
 * 
 * Setup:
 * 1. Copy env.example.txt to .env in the root directory
 * 2. Fill in your actual values
 * 3. Never commit .env to version control
 */

// Load Composer autoloader (for web-push library and dotenv)
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

// Load environment variables from .env file
$envPath = __DIR__ . '/../.env';
if (file_exists($envPath)) {
    try {
        $dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
        $dotenv->load();
    } catch (Exception $e) {
        // Log the error and use fallback configuration
        error_log('ERROR: Failed to load .env file: ' . $e->getMessage());
        error_log('The .env file may be corrupted. Please check the file format.');
        // Continue with fallback values below
    }
} else {
    // Fallback: use hardcoded values if .env doesn't exist (development only)
    // WARNING: This should never happen in production!
    if (php_sapi_name() !== 'cli') {
        error_log('WARNING: .env file not found. Using fallback configuration. This should not happen in production!');
    }
}

// Determine environment (defaults to development for safety)
$appEnv = $_ENV['APP_ENV'] ?? 'development';
$isDevelopment = ($appEnv === 'development');

// Database configuration
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'letshare_db');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('DB_CHARSET', $_ENV['DB_CHARSET'] ?? 'utf8mb4');

// JWT Secret key - MUST be set in production
$jwtSecret = $_ENV['JWT_SECRET'] ?? 'your-secret-key-change-this-in-production';
if (!$isDevelopment && $jwtSecret === 'your-secret-key-change-this-in-production') {
    error_log('ERROR: JWT_SECRET must be changed in production!');
}
define('JWT_SECRET', $jwtSecret);

// Google OAuth Configuration
define('GOOGLE_CLIENT_ID', $_ENV['GOOGLE_CLIENT_ID'] ?? '');
define('GOOGLE_CLIENT_SECRET', $_ENV['GOOGLE_CLIENT_SECRET'] ?? '');
define('GOOGLE_REDIRECT_URI', $_ENV['GOOGLE_REDIRECT_URI'] ?? '');

// Email Configuration (for email verification)
define('SMTP_HOST', $_ENV['SMTP_HOST'] ?? 'smtp.gmail.com');
define('SMTP_PORT', intval($_ENV['SMTP_PORT'] ?? 587));
define('SMTP_USERNAME', $_ENV['SMTP_USERNAME'] ?? '');
define('SMTP_PASSWORD', $_ENV['SMTP_PASSWORD'] ?? '');
define('SMTP_FROM_EMAIL', $_ENV['SMTP_FROM_EMAIL'] ?? '');
define('SMTP_FROM_NAME', $_ENV['SMTP_FROM_NAME'] ?? 'LetShare');

// Application Base URL
define('APP_BASE_URL', $_ENV['APP_BASE_URL'] ?? '');

// VAPID Keys for Push Notifications
define('VAPID_PUBLIC_KEY', $_ENV['VAPID_PUBLIC_KEY'] ?? '');
define('VAPID_PRIVATE_KEY', $_ENV['VAPID_PRIVATE_KEY'] ?? '');

// Debug Mode - NEVER true in production
$debugMode = isset($_ENV['DEBUG_MODE']) ? ($_ENV['DEBUG_MODE'] === 'true' || $_ENV['DEBUG_MODE'] === '1') : false;
if (!$isDevelopment && $debugMode) {
    error_log('WARNING: DEBUG_MODE should be false in production!');
    $debugMode = false; // Force false in production
}
define('DEBUG_MODE', $debugMode);

// CORS configuration - MUST be set before any output
$requestOrigin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : null;

// CORS allowed origins configuration
$corsAllowedOrigins = [];
if (!$isDevelopment) {
    // Production: Use allowed origins from environment
    $allowedOriginsEnv = $_ENV['CORS_ALLOWED_ORIGINS'] ?? '';
    if (!empty($allowedOriginsEnv)) {
        $corsAllowedOrigins = array_map('trim', explode(',', $allowedOriginsEnv));
    }
} else {
    // Development: Allow common development origins
    $corsAllowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5500',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5500',
        'http://127.0.0.1:8080',
        'http://localhost',
        'http://127.0.0.1',
    ];
    
    // Allow any IP in local network (192.168.x.x) for testing
    if ($requestOrigin && preg_match('/^http:\/\/192\.168\.\d+\.\d+/', $requestOrigin)) {
        $corsAllowedOrigins[] = $requestOrigin;
    }
}

// Determine CORS origin
$corsOrigin = null;
if ($isDevelopment) {
    // Development: Allow the request origin if in allowed list, or use wildcard
    if ($requestOrigin && in_array($requestOrigin, $corsAllowedOrigins)) {
        $corsOrigin = $requestOrigin;
    } elseif ($requestOrigin) {
        $corsOrigin = $requestOrigin; // Allow any origin in dev
    } else {
        $corsOrigin = '*';
    }
} else {
    // Production: Only allow specific origins
    if ($requestOrigin && in_array($requestOrigin, $corsAllowedOrigins)) {
        $corsOrigin = $requestOrigin;
    } else {
        // In production, reject if origin not allowed
        $corsOrigin = null;
    }
}

// Set CORS headers
if (!headers_sent()) {
    if ($corsOrigin) {
        header('Access-Control-Allow-Origin: ' . $corsOrigin);
        if ($corsOrigin !== '*') {
            header('Access-Control-Allow-Credentials: true');
        }
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
    header('Vary: Origin');
    
    // Only add ngrok header in development
    if ($isDevelopment) {
        header('ngrok-skip-browser-warning: true');
    }
}

// Handle preflight requests (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (!headers_sent()) {
        http_response_code(200);
    }
    exit();
}

/**
 * Database connection
 */
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        // Log detailed error for debugging
        error_log('Database connection failed: ' . $e->getMessage());
        
        // Return generic error to user (don't expose DB details)
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed. Please try again later.'
        ]);
        exit();
    }
}

/**
 * Check if we're in development mode
 */
function isDevelopment() {
    return (defined('DEBUG_MODE') && DEBUG_MODE) || 
           (isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'development');
}

/**
 * Send JSON response
 */
function sendResponse($success, $message, $data = null, $statusCode = 200) {
    // Make sure no output has been sent
    if (ob_get_level()) {
        ob_clean();
    }
    
    // Set headers if not already sent
    if (!headers_sent()) {
        // CORS headers - reuse the same logic
        $requestOrigin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : null;
        $isDevelopment = isDevelopment();
        
        if ($isDevelopment) {
            // Development: permissive CORS
            $allowedOrigins = [
                'http://localhost:3000',
                'http://localhost:5500',
                'http://localhost:8080',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:5500',
                'http://127.0.0.1:8080',
                'http://localhost',
                'http://127.0.0.1',
            ];
            
            if ($requestOrigin && preg_match('/^http:\/\/192\.168\.\d+\.\d+/', $requestOrigin)) {
                $allowedOrigins[] = $requestOrigin;
            }
            
            $origin = ($requestOrigin && in_array($requestOrigin, $allowedOrigins)) ? $requestOrigin : ($requestOrigin ?: '*');
            header('Access-Control-Allow-Origin: ' . $origin);
            if ($origin !== '*') {
                header('Access-Control-Allow-Credentials: true');
            }
            header('ngrok-skip-browser-warning: true');
        } else {
            // Production: use configured allowed origins
            $corsAllowedOriginsEnv = $_ENV['CORS_ALLOWED_ORIGINS'] ?? '';
            $allowedOrigins = !empty($corsAllowedOriginsEnv) ? array_map('trim', explode(',', $corsAllowedOriginsEnv)) : [];
            
            if ($requestOrigin && in_array($requestOrigin, $allowedOrigins)) {
                header('Access-Control-Allow-Origin: ' . $requestOrigin);
                header('Access-Control-Allow-Credentials: true');
            }
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
        header('Vary: Origin');
        
        // Response headers
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
    }
    
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if ($data !== null) {
        $response['data'] = $data;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

/**
 * Get request data (JSON or form data)
 */
function getRequestData() {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        $rawInput = file_get_contents('php://input');
        
        // Only log in development
        if (isDevelopment()) {
            error_log('getRequestData - Raw input: ' . substr($rawInput, 0, 500));
        }
        
        $data = json_decode($rawInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            if (isDevelopment()) {
                error_log('getRequestData - JSON decode error: ' . json_last_error_msg());
            }
            return [];
        }
        return $data ?? [];
    }
    
    return $_POST;
}

/**
 * Start session if not already started
 */
function startSessionIfNotStarted() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

/**
 * Verify JWT token (simple implementation - use a library in production)
 */
function verifyToken($token) {
    // Simple token verification - in production, use a proper JWT library
    // For now, we'll use session-based authentication
    startSessionIfNotStarted();
    
    if (isset($_SESSION['user_id']) && isset($_SESSION['token']) && $_SESSION['token'] === $token) {
        return [
            'user_id' => $_SESSION['user_id'],
            'email' => $_SESSION['email'] ?? null
        ];
    }
    
    return false;
}

/**
 * Get current user from session
 */
function getCurrentUser() {
    startSessionIfNotStarted();
    
    if (!isset($_SESSION['user_id'])) {
        return null;
    }
    
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("
            SELECT u.id, u.name, u.email, u.department, u.avatar, u.language, u.university_id,
                   u.show_department, u.show_email, u.allow_messages_from_anyone,
                   univ.name as university_name, univ.code as university_code, univ.logo as university_logo
            FROM users u
            LEFT JOIN universities univ ON u.university_id = univ.id
            WHERE u.id = ?
        ");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        
        // Convert boolean fields
        if ($user) {
            $user['show_department'] = (bool)($user['show_department'] ?? true);
            $user['show_email'] = (bool)($user['show_email'] ?? false);
            $user['allow_messages_from_anyone'] = (bool)($user['allow_messages_from_anyone'] ?? true);
        }
        
        return $user;
    } catch (PDOException $e) {
        // Log error but don't expose details
        error_log('Error getting current user: ' . $e->getMessage());
        return null;
    }
}

/**
 * Require authentication
 */
function requireAuth() {
    // Make sure CORS headers are set before sending any response
    if (!headers_sent()) {
        $requestOrigin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : null;
        $isDevelopment = isDevelopment();
        
        if ($isDevelopment) {
            // Development: permissive CORS
            $allowedOrigins = [
                'http://localhost:3000',
                'http://localhost:5500',
                'http://localhost:8080',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:5500',
                'http://127.0.0.1:8080',
                'http://localhost',
                'http://127.0.0.1',
            ];
            
            if ($requestOrigin && preg_match('/^http:\/\/192\.168\.\d+\.\d+/', $requestOrigin)) {
                $allowedOrigins[] = $requestOrigin;
            }
            
            $origin = ($requestOrigin && in_array($requestOrigin, $allowedOrigins)) ? $requestOrigin : ($requestOrigin ?: '*');
            header('Access-Control-Allow-Origin: ' . $origin);
            if ($origin !== '*') {
                header('Access-Control-Allow-Credentials: true');
            }
            header('ngrok-skip-browser-warning: true');
        } else {
            // Production: use configured allowed origins
            $corsAllowedOriginsEnv = $_ENV['CORS_ALLOWED_ORIGINS'] ?? '';
            $allowedOrigins = !empty($corsAllowedOriginsEnv) ? array_map('trim', explode(',', $corsAllowedOriginsEnv)) : [];
            
            if ($requestOrigin && in_array($requestOrigin, $allowedOrigins)) {
                header('Access-Control-Allow-Origin: ' . $requestOrigin);
                header('Access-Control-Allow-Credentials: true');
            }
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
        header('Access-Control-Max-Age: 86400');
        header('Vary: Origin');
    }
    
    $user = getCurrentUser();
    
    if (!$user) {
        sendResponse(false, 'Authentication required', null, 401);
    }
    
    return $user;
}

/**
 * Handle database errors securely
 * Logs detailed error in development, returns generic message in production
 */
function handleDatabaseError($e, $context = '') {
    $isDev = isDevelopment();
    
    // Always log detailed error
    $logMessage = 'Database error';
    if (!empty($context)) {
        $logMessage .= ' in ' . $context;
    }
    $logMessage .= ': ' . $e->getMessage();
    error_log($logMessage);
    
    if ($isDev) {
        // Development: return detailed error
        sendResponse(false, 'Database error: ' . $e->getMessage(), null, 500);
    } else {
        // Production: return generic error
        sendResponse(false, 'A database error occurred. Please try again later.', null, 500);
    }
}

/**
 * Handle general errors securely
 * Logs detailed error in development, returns generic message in production
 */
function handleError($e, $context = '', $genericMessage = 'An error occurred. Please try again later.') {
    $isDev = isDevelopment();
    
    // Always log detailed error
    $logMessage = 'Error';
    if (!empty($context)) {
        $logMessage .= ' in ' . $context;
    }
    $logMessage .= ': ' . $e->getMessage();
    error_log($logMessage);
    
    if ($isDev) {
        // Development: return detailed error
        sendResponse(false, 'Error: ' . $e->getMessage(), null, 500);
    } else {
        // Production: return generic error
        sendResponse(false, $genericMessage, null, 500);
    }
}

/**
 * Rate limiting function
 * Limits requests per IP or user ID
 * 
 * @param string $key Unique key for rate limiting (e.g., 'login_attempts_' . $ip)
 * @param int $maxAttempts Maximum number of attempts allowed
 * @param int $windowSeconds Time window in seconds
 * @param string|null $identifier IP address or user ID (optional, defaults to IP)
 * @return bool|array Returns false if rate limit exceeded, or array with remaining attempts and reset time
 */
function checkRateLimit($key, $maxAttempts = 60, $windowSeconds = 60, $identifier = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Use IP address if identifier not provided
    if ($identifier === null) {
        $identifier = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    
    $rateLimitKey = $key . '_' . md5($identifier);
    $currentTime = time();
    
    // Initialize or get existing rate limit data
    if (!isset($_SESSION[$rateLimitKey])) {
        $_SESSION[$rateLimitKey] = [
            'count' => 0,
            'first_attempt' => $currentTime,
            'last_attempt' => $currentTime
        ];
    }
    
    $rateLimit = $_SESSION[$rateLimitKey];
    
    // Reset if window expired
    if ($currentTime - $rateLimit['first_attempt'] > $windowSeconds) {
        $_SESSION[$rateLimitKey] = [
            'count' => 0,
            'first_attempt' => $currentTime,
            'last_attempt' => $currentTime
        ];
        $rateLimit = $_SESSION[$rateLimitKey];
    }
    
    // Check if rate limit exceeded
    if ($rateLimit['count'] >= $maxAttempts) {
        $resetTime = $rateLimit['first_attempt'] + $windowSeconds;
        $remainingTime = $resetTime - $currentTime;
        return [
            'allowed' => false,
            'remaining' => 0,
            'reset_time' => $resetTime,
            'remaining_seconds' => max(0, $remainingTime)
        ];
    }
    
    // Increment count
    $_SESSION[$rateLimitKey]['count']++;
    $_SESSION[$rateLimitKey]['last_attempt'] = $currentTime;
    
    $remaining = $maxAttempts - $_SESSION[$rateLimitKey]['count'];
    $resetTime = $rateLimit['first_attempt'] + $windowSeconds;
    
    return [
        'allowed' => true,
        'remaining' => $remaining,
        'reset_time' => $resetTime,
        'remaining_seconds' => max(0, $resetTime - $currentTime)
    ];
}

/**
 * Apply rate limiting and send error if exceeded
 * Helper function that checks rate limit and sends response if exceeded
 * 
 * @param string $key Rate limit key
 * @param int $maxAttempts Maximum attempts
 * @param int $windowSeconds Time window
 * @param string|null $identifier Optional identifier
 * @return bool True if allowed, false if rate limited (response already sent)
 */
function applyRateLimit($key, $maxAttempts = 60, $windowSeconds = 60, $identifier = null) {
    $result = checkRateLimit($key, $maxAttempts, $windowSeconds, $identifier);
    
    if (!$result['allowed']) {
        $remainingMinutes = ceil($result['remaining_seconds'] / 60);
        sendResponse(
            false, 
            'Too many requests. Please try again in ' . $remainingMinutes . ' minute(s).', 
            [
                'retry_after' => $result['remaining_seconds']
            ], 
            429
        );
        return false;
    }
    
    return true;
}
