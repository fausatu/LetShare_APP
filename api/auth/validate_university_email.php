<?php
/**
 * Helper function to validate university email and get university_id
 * This can be used by both email and Google OAuth registration
 */
require_once '../config.php';

function validateUniversityEmail($email) {
    try {
        $pdo = getDBConnection();
    } catch (PDOException $e) {
        error_log('Database connection error in validateUniversityEmail: ' . $e->getMessage());
        // Return error instead of letting getDBConnection() exit
        return [
            'valid' => false,
            'message' => 'Database connection error. Please try again later.'
        ];
    } catch (Exception $e) {
        error_log('Error getting DB connection in validateUniversityEmail: ' . $e->getMessage());
        return [
            'valid' => false,
            'message' => 'Server error. Please try again later.'
        ];
    }
    
    // Extract domain from email
    $emailParts = explode('@', $email);
    if (count($emailParts) !== 2) {
        return [
            'valid' => false,
            'message' => 'Format d\'email invalide. Veuillez entrer une adresse email valide.',
            'error_type' => 'invalid_format'
        ];
    }
    
    $domain = '@' . $emailParts[1];
    
    try {
        // Check if domain matches any partner university
        $stmt = $pdo->prepare("
            SELECT id, name, code, email_domains 
            FROM universities 
            WHERE is_active = TRUE
        ");
        $stmt->execute();
        $universities = $stmt->fetchAll();
        
        foreach ($universities as $university) {
            $emailDomains = json_decode($university['email_domains'], true);
            if (is_array($emailDomains) && in_array($domain, $emailDomains)) {
                return [
                    'valid' => true,
                    'university_id' => (int)$university['id'],
                    'university_name' => $university['name'],
                    'university_code' => $university['code']
                ];
            }
        }
        
        return [
            'valid' => false,
            'message' => 'Votre université n\'est pas encore partenaire. Contactez-nous pour ajouter votre université à LetShare.',
            'error_type' => 'university_not_partner'
        ];
    } catch (PDOException $e) {
        error_log('Database query error in validateUniversityEmail: ' . $e->getMessage());
        return [
            'valid' => false,
            'message' => 'Database error. Please try again later.'
        ];
    } catch (Exception $e) {
        error_log('Unexpected error in validateUniversityEmail: ' . $e->getMessage());
        return [
            'valid' => false,
            'message' => 'An error occurred. Please try again later.'
        ];
    }
}

