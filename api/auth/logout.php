<?php
require_once __DIR__ . '/../config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
session_destroy();

sendResponse(true, 'Logged out successfully');

