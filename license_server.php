<?php
/**
 * LICENSE SERVER (PHP + SQLite)
 * 
 * 1. Upload this file to your Hostinger subdomain (e.g., public_html/license/license_server.php).
 * 2. It will automatically create 'licenses.db' in the same folder.
 * 3. Change the ADMIN_PASSWORD below to something secure!
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, x-admin-password");
header("Content-Type: application/json");

// --- CONFIGURATION ---
// CHANGE THIS PASSWORD BEFORE DEPLOYING!
$ADMIN_PASSWORD = '$Winwin$0127870735$win$';
$DB_FILE = __DIR__ . '/licenses.db';

// --- DATABASE INIT ---
try {
    $db = new PDO("sqlite:$DB_FILE");
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create table if it doesn't exist
    $db->exec("CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_code TEXT UNIQUE NOT NULL,
        owner TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    exit;
}

// --- HELPER FUNCTIONS ---
function sendError($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(["valid" => false, "message" => $msg]);
    exit;
}

function checkAdminAuth() {
    global $ADMIN_PASSWORD;
    $headers = getallheaders();
    // Some servers normalize headers to lowercase, check both
    $pass = isset($headers['x-admin-password']) ? $headers['x-admin-password'] : 
           (isset($headers['X-Admin-Password']) ? $headers['X-Admin-Password'] : '');
           
    if ($pass !== $ADMIN_PASSWORD) {
        sendError("Unauthorized", 401);
    }
}

// --- HANDLE REQUESTS ---
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Handle CORS Preflight
if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. VERIFY LICENSE (Public)
// POST body: { "licenseKey": "..." }
if ($method === 'POST' && empty($action)) {
    $input = json_decode(file_get_contents('php://input'), true);
    $key = isset($input['licenseKey']) ? trim($input['licenseKey']) : '';

    if (empty($key)) sendError("No key provided");

    $stmt = $db->prepare("SELECT * FROM licenses WHERE key_code = :key");
    $stmt->execute([':key' => $key]);
    $license = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($license && $license['active'] == 1) {
        echo json_encode([
            "valid" => true,
            "owner" => $license['owner'],
            "message" => "License verified"
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            "valid" => false, 
            "message" => "Invalid or inactive license key."
        ]);
    }
    exit;
}

// 2. ADMIN ACTIONS (Protected)
// All below require ?action=... and x-admin-password header

if (!empty($action)) {
    checkAdminAuth();

    // LIST KEYS
    if ($action === 'list' && $method === 'GET') {
        $stmt = $db->query("SELECT * FROM licenses ORDER BY created_at DESC");
        $keys = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // Map to frontend expected format
        $mapped = array_map(function($k) {
            return [
                "key" => $k['key_code'],
                "owner" => $k['owner'],
                "active" => (bool)$k['active'],
                "createdAt" => $k['created_at']
            ];
        }, $keys);
        echo json_encode($mapped);
        exit;
    }

    // ADD KEY
    if ($action === 'add' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $key = isset($input['key']) ? trim($input['key']) : '';
        $owner = isset($input['owner']) ? trim($input['owner']) : '';

        if (empty($key) || empty($owner)) sendError("Missing key or owner");

        try {
            $stmt = $db->prepare("INSERT INTO licenses (key_code, owner) VALUES (:key, :owner)");
            $stmt->execute([':key' => $key, ':owner' => $owner]);
            echo json_encode(["success" => true, "message" => "Key added"]);
        } catch (PDOException $e) {
            sendError("Key already exists or database error");
        }
        exit;
    }

    // TOGGLE ACTIVE
    if ($action === 'toggle' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $key = isset($input['key']) ? $input['key'] : '';
        
        $stmt = $db->prepare("UPDATE licenses SET active = NOT active WHERE key_code = :key");
        $stmt->execute([':key' => $key]);
        echo json_encode(["success" => true]);
        exit;
    }

    // DELETE KEY
    if ($action === 'delete' && $method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $key = isset($input['key']) ? $input['key'] : '';

        $stmt = $db->prepare("DELETE FROM licenses WHERE key_code = :key");
        $stmt->execute([':key' => $key]);
        echo json_encode(["success" => true]);
        exit;
    }
}

// Fallback
sendError("Invalid endpoint", 404);
?>
