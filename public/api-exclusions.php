<?php
/**
 * API endpoint for managing sitemap exclusions
 *
 * Usage:
 *   GET  /api-exclusions.php - Get all exclusions
 *   POST /api-exclusions.php - Add exclusion
 *        Body: {"url_pattern": "/admin/", "reason": "404 error"}
 *   DELETE /api-exclusions.php?pattern=/admin/ - Remove exclusion
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$EXCLUSIONS_FILE = __DIR__ . '/sitemap-exclusions.json';

function loadExclusions($file) {
    if (!file_exists($file)) {
        return [];
    }
    $json = file_get_contents($file);
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
}

function saveExclusions($file, $exclusions) {
    $json = json_encode($exclusions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return file_put_contents($file, $json, LOCK_EX) !== false;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            $exclusions = loadExclusions($EXCLUSIONS_FILE);
            echo json_encode([
                'success' => true,
                'count' => count($exclusions),
                'exclusions' => $exclusions
            ]);
            break;

        case 'POST':
            $input = json_decode(file_get_contents('php://input'), true);

            if (!isset($input['url_pattern'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'url_pattern is required']);
                exit;
            }

            $exclusions = loadExclusions($EXCLUSIONS_FILE);

            $newRule = [
                'url_pattern' => $input['url_pattern'],
                'reason' => $input['reason'] ?? '',
                'added_at' => date('c'),
                'exclude_from_sitemap' => $input['exclude_from_sitemap'] ?? true
            ];

            $exclusions[] = $newRule;

            if (saveExclusions($EXCLUSIONS_FILE, $exclusions)) {
                echo json_encode(['success' => true, 'rule' => $newRule]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'Failed to save exclusions']);
            }
            break;

        case 'DELETE':
            $pattern = $_GET['pattern'] ?? null;

            if (!$pattern) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'pattern parameter is required']);
                exit;
            }

            $exclusions = loadExclusions($EXCLUSIONS_FILE);
            $original_count = count($exclusions);

            $exclusions = array_filter($exclusions, function($rule) use ($pattern) {
                return $rule['url_pattern'] !== $pattern;
            });

            $exclusions = array_values($exclusions);

            if (count($exclusions) < $original_count) {
                saveExclusions($EXCLUSIONS_FILE, $exclusions);
                echo json_encode(['success' => true, 'removed' => $original_count - count($exclusions)]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Pattern not found']);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
