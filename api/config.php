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

// Application Constants
define('ONLINE_THRESHOLD_SECONDS', 300); // 5 minutes - user considered online if seen within this time
define('EMAIL_CODE_EXPIRY_SECONDS', 600); // 10 minutes - verification codes expire after this
define('TERMS_VERSION', $_ENV['TERMS_VERSION'] ?? '2026-01-12'); // Current terms version

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
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
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
        
        // Throw exception instead of exit() to allow proper error handling
        // This allows calling functions to handle the error gracefully
        throw new PDOException('Database connection failed: ' . $e->getMessage(), (int)$e->getCode(), $e);
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
    // Clean all output buffers to prevent any output before JSON
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Start a new output buffer
    ob_start();
    
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
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
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
    
    // Clean output buffer and send JSON
    ob_clean();
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    ob_end_flush();
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
 * Verify authentication token
 * 
 * This validates the token against both the session AND the database to ensure:
 * 1. The session is valid
 * 2. The user still exists in the database
 * 3. The token hasn't been tampered with
 * 
 * @param string $token The authentication token
 * @return array|false User data if valid, false otherwise
 */
function verifyToken($token) {
    if (empty($token)) {
        return false;
    }
    
    startSessionIfNotStarted();
    
    // Check session token matches
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['token'])) {
        return false;
    }
    
    // Use timing-safe comparison to prevent timing attacks
    if (!hash_equals($_SESSION['token'], $token)) {
        return false;
    }
    
    // Verify user still exists in database and is valid
    try {
        $pdo = getDBConnection();
        $stmt = $pdo->prepare("SELECT id, email FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        
        if (!$user) {
            // User was deleted, invalidate session
            session_destroy();
            return false;
        }
        
        // Verify email matches (in case of session hijacking with different user)
        if (isset($_SESSION['email']) && $user['email'] !== $_SESSION['email']) {
            session_destroy();
            return false;
        }
        
        return [
            'user_id' => $user['id'],
            'email' => $user['email']
        ];
    } catch (Exception $e) {
        error_log('Token verification error: ' . $e->getMessage());
        return false;
    }
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
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
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
 * Debug log - only logs if DEBUG_MODE is enabled
 * Use this for verbose/debug logs that shouldn't appear in production
 * 
 * @param string $message The message to log
 * @param string $context Optional context (e.g., function name)
 */
function debugLog($message, $context = '') {
    if (defined('DEBUG_MODE') && DEBUG_MODE) {
        $logMessage = $context ? "[$context] $message" : $message;
        error_log($logMessage);
    }
}

/**
 * Error log - always logs (for real errors)
 * Use this for actual errors that should always be logged
 * 
 * @param string $message The error message
 * @param string $context Optional context
 */
function errorLog($message, $context = '') {
    $logMessage = $context ? "ERROR [$context] $message" : "ERROR: $message";
    error_log($logMessage);
}

/**
 * CSRF Token Functions
 * Protects against Cross-Site Request Forgery attacks
 */

/**
 * Generate or retrieve CSRF token from session
 * 
 * @return string The CSRF token
 */
function getCSRFToken() {
    startSessionIfNotStarted();
    
    // Generate new token if not exists or expired (1 hour expiry)
    if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_token_time']) || 
        (time() - $_SESSION['csrf_token_time']) > 3600) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_token_time'] = time();
    }
    
    return $_SESSION['csrf_token'];
}

/**
 * Validate CSRF token from request
 * 
 * @param string|null $token Token from request header or body
 * @return bool True if valid
 */
function validateCSRFToken($token = null) {
    startSessionIfNotStarted();
    
    // Get token from header if not provided
    if ($token === null) {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
    }
    
    // Also check in request body as fallback
    if ($token === null) {
        $data = getRequestData();
        $token = $data['_csrf_token'] ?? null;
    }
    
    if (empty($token) || !isset($_SESSION['csrf_token'])) {
        return false;
    }
    
    // Timing-safe comparison
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Require valid CSRF token for state-changing requests
 * Call this at the start of POST/PUT/DELETE endpoints
 * 
 * @param bool $skipInDev Skip CSRF check in development (default: false)
 */
function requireCSRFToken($skipInDev = false) {
    // Skip for OPTIONS (preflight) requests
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        return;
    }
    
    // Skip for GET requests (they should be idempotent)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        return;
    }
    
    // Optionally skip in development for easier testing
    if ($skipInDev && isDevelopment()) {
        return;
    }
    
    if (!validateCSRFToken()) {
        sendResponse(false, 'Invalid or missing CSRF token', null, 403);
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
function applyRateLimit($key, $maxAttempts = 60, $windowSeconds = 60, $identifier = null, $customMessage = null) {
    $result = checkRateLimit($key, $maxAttempts, $windowSeconds, $identifier);
    
    if (!$result['allowed']) {
        $remainingMinutes = ceil($result['remaining_seconds'] / 60);
        
        // Use custom message if provided, otherwise default
        if ($customMessage) {
            $message = str_replace(['{minutes}', '{seconds}'], [$remainingMinutes, $result['remaining_seconds']], $customMessage);
        } else {
            $message = 'Too many requests. Please try again in ' . $remainingMinutes . ' minute(s).';
        }
        
        sendResponse(
            false, 
            $message, 
            [
                'retry_after' => $result['remaining_seconds']
            ], 
            429
        );
        return false;
    }
    
    return true;
}

/**
 * Get client identifier (IP address or user agent hash)
 * @return string
 */
function getClientIdentifier() {
    // Try to get real IP address
    $ip = '';
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
        $ip = $_SERVER['REMOTE_ADDR'];
    }
    
    // Fallback to user agent if no IP
    if (empty($ip)) {
        $ip = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    }
    
    return $ip;
}

/**
 * Reset rate limit counter for a key
 * @param string $key The rate limit key
 * @param string|null $identifier Optional identifier (defaults to IP)
 */
function resetRateLimit($key, $identifier = null) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $clientIdentifier = $identifier ?: getClientIdentifier();
    $rateLimitKey = 'rate_limit_' . $key . '_' . md5($clientIdentifier);
    
    // Remove from session
    if (isset($_SESSION[$rateLimitKey])) {
        unset($_SESSION[$rateLimitKey]);
    }
}

/**
 * Get user-friendly security messages
 */
function getSecurityMessage($type, $minutes) {
    $messages = [
        'login_failed' => [
            'fr' => "Trop de tentatives de connexion échouées. Pour votre sécurité, veuillez attendre {minutes} minute(s) avant de réessayer.",
            'en' => "Too many failed login attempts. For your security, please wait {minutes} minute(s) before trying again."
        ],
        'forgot_password' => [
            'fr' => "Trop de demandes de réinitialisation. Veuillez attendre {minutes} minute(s) avant de faire une nouvelle demande.",
            'en' => "Too many password reset requests. Please wait {minutes} minute(s) before making another request."
        ],
        'email_code' => [
            'fr' => "Trop de demandes de code. Veuillez attendre {minutes} minute(s) avant de demander un nouveau code.",
            'en' => "Too many code requests. Please wait {minutes} minute(s) before requesting a new code."
        ]
    ];
    
    // Get user language preference (default to French)
    $lang = 'fr';
    if (isset($_SESSION['user_language'])) {
        $lang = $_SESSION['user_language'];
    } elseif (isset($_COOKIE['user_language'])) {
        $lang = $_COOKIE['user_language'];
    } else {
        // Try to get from user settings in localStorage via Accept-Language header
        $acceptLang = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';
        if (strpos($acceptLang, 'en') !== false && strpos($acceptLang, 'en') < strpos($acceptLang, 'fr')) {
            $lang = 'en';
        }
    }
    
    if (isset($messages[$type][$lang])) {
        return str_replace('{minutes}', $minutes, $messages[$type][$lang]);
    }
    
    // Fallback to French
    return str_replace('{minutes}', $minutes, $messages[$type]['fr'] ?? "Veuillez attendre {minutes} minute(s) avant de réessayer.");
}
