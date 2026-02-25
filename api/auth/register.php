<?php
require_once __DIR__ . '/../config.php';
require_once 'validate_university_email.php';
require_once 'send_verification_email.php';

$data = getRequestData();
$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$department = trim($data['department'] ?? '');
$language = $data['language'] ?? 'en';
$termsAccepted = $data['termsAccepted'] ?? false; // Consent to terms
$auth_provider = 'email'; // Default to email registration
$google_id = null;

// Check terms acceptance
if (!$termsAccepted) {
    sendResponse(false, 'You must accept the Terms of Service and Privacy Policy', null, 400);
}

// Check if this is a Google OAuth registration (data from session)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (isset($_SESSION['google_oauth_data'])) {
    $googleData = $_SESSION['google_oauth_data'];
    // Use Google data if email matches
    if ($email === $googleData['email']) {
        $auth_provider = 'google';
        $google_id = $googleData['google_id'];
        // Name might come from Google
        if (empty($name) && !empty($googleData['name'])) {
            $name = $googleData['name'];
        }
        // Password not required for Google auth
        if (empty($password)) {
            $password = null;
        }
    }
}

// Validation
if (empty($name) || empty($email)) {
    sendResponse(false, 'Name and email are required', null, 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendResponse(false, 'Invalid email format', null, 400);
}

// Password required only for email registration
if ($auth_provider === 'email' && (empty($password) || strlen($password) < 6)) {
    sendResponse(false, 'Password must be at least 6 characters', null, 400);
}

// Rate limiting: max 3 registrations per hour per IP
if (!applyRateLimit('register_attempts', 3, 3600)) {
    return; // Response already sent by applyRateLimit
}

// Validate university email
$emailValidation = validateUniversityEmail($email);
if (!$emailValidation['valid']) {
    sendResponse(false, $emailValidation['message'], null, 400);
}

$universityId = $emailValidation['university_id'];

try {
    $pdo = getDBConnection();
    
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        sendResponse(false, 'Email already registered', null, 409);
    }
    
    // Hash password (only if provided)
    $hashedPassword = null;
    if (!empty($password)) {
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    }
    
    // Generate email verification token
    $verificationToken = bin2hex(random_bytes(32));
    $verificationTokenExpires = date('Y-m-d H:i:s', strtotime('+24 hours'));
    
    // For Google OAuth users, email is already verified by Google
    $emailVerified = ($auth_provider === 'google') ? 1 : 0; // Use integer for MySQL BOOLEAN
    
    // Terms acceptance timestamp
    $termsAcceptedAt = date('Y-m-d H:i:s');
    $termsVersion = TERMS_VERSION; // Version of terms accepted
    
    // Insert new user with university_id and terms acceptance
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password, department, university_id, language, auth_provider, google_id, email_verified, email_verification_token, email_verification_token_expires_at, terms_accepted_at, terms_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$name, $email, $hashedPassword, $department, $universityId, $language, $auth_provider, $google_id, $emailVerified, $emailVerified ? null : $verificationToken, $emailVerified ? null : $verificationTokenExpires, $termsAcceptedAt, $termsVersion]);
    
    // Clear Google OAuth session data if used
    if (isset($_SESSION['google_oauth_data'])) {
        unset($_SESSION['google_oauth_data']);
    }
    
    $userId = $pdo->lastInsertId();
    
    // Send verification email if not Google OAuth
    if ($auth_provider === 'email') {
        $emailSent = sendVerificationEmail($email, $name, $verificationToken);
        if (!$emailSent) {
            // Log error but don't fail registration
            error_log('Failed to send verification email to: ' . $email);
        }
    }
    
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Only create session if email is verified (Google OAuth) or allow limited access
    if ($emailVerified == 1) {
        $_SESSION['user_id'] = $userId;
        $_SESSION['email'] = $email;
        $_SESSION['token'] = bin2hex(random_bytes(32));
    }
    
    // Get created user with university info
    $stmt = $pdo->prepare("
        SELECT u.id, u.name, u.email, u.department, u.avatar, u.language, u.university_id, u.email_verified,
               univ.name as university_name, univ.code as university_code, univ.logo as university_logo
        FROM users u
        LEFT JOIN universities univ ON u.university_id = univ.id
        WHERE u.id = ?
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    $message = ($emailVerified == 1)
        ? 'Registration successful' 
        : 'Registration successful! Please check your email to verify your account.';
    
    sendResponse(true, $message, [
        'user' => $user,
        'token' => ($emailVerified == 1) ? ($_SESSION['token'] ?? null) : null,
        'email_verified' => (bool)$emailVerified
    ]);
    
} catch (PDOException $e) {
    handleDatabaseError($e, 'register');
} catch (Exception $e) {
    handleError($e, 'register');
}

