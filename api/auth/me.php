<?php
require_once '../config.php';

$user = requireAuth();

sendResponse(true, 'User data retrieved', ['user' => $user]);

