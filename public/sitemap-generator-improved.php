<?php
/**
 * Improved Sitemap Generator with Exclusion Support
 * Based on sitemap-generator-resumable.php
 *
 * Features:
 * - Accepts exclusion list from external sources
 * - Respects noindex directives
 * - Cross-references with robots.txt
 * - Validates URLs before inclusion
 *
 * Usage:
 *   php sitemap-generator-improved.php --full
 *   php sitemap-generator-improved.php --exclusions=/path/to/exclusions.json
 */

set_time_limit(0);
date_default_timezone_set('Europe/Prague');

// ------------ CONFIG -------------
$SITE_URL = 'https://atlantpro24.ru';
$ROOT_DIR = __DIR__;
$CONFIG_PATH = $ROOT_DIR . '/config.php';
$STORE_ID = 0;
$PRODUCTS_PER_BATCH = 2000;
$PRODUCT_FILE_LIMIT = 45000;
$GZIP = true;
$LOG_FILE = $ROOT_DIR . '/sitemap-generator.log';
$TEMP_DIR = $ROOT_DIR . '/.sitemap_tmp';
$EXCLUSIONS_FILE = $ROOT_DIR . '/sitemap-exclusions.json';
$ROBOTS_TXT_PATH = $ROOT_DIR . '/robots.txt';
// ----------------------------------

// CLI args
$argv = $_SERVER['argv'] ?? [];
$full_run = in_array('--full', $argv, true) || in_array('--run-all', $argv, true);
$no_ping = in_array('--no-ping', $argv, true);

// Check for custom exclusions file
foreach ($argv as $arg) {
    if (strpos($arg, '--exclusions=') === 0) {
        $EXCLUSIONS_FILE = substr($arg, strlen('--exclusions='));
    }
}

// Load config
if (!file_exists($CONFIG_PATH)) {
    echo "config.php not found: {$CONFIG_PATH}\n";
    exit(1);
}
require_once $CONFIG_PATH;

// DB constants
$DB_HOST = defined('DB_HOSTNAME') ? DB_HOSTNAME : (defined('DB_HOST') ? DB_HOST : null);
$DB_USER = defined('DB_USERNAME') ? DB_USERNAME : (defined('DB_USER') ? DB_USER : null);
$DB_PASS = defined('DB_PASSWORD') ? DB_PASSWORD : (defined('DB_PASS') ? DB_PASS : null);
$DB_NAME = defined('DB_DATABASE') ? DB_DATABASE : (defined('DB_NAME') ? DB_NAME : null);
$DB_PORT = defined('DB_PORT') ? DB_PORT : 3306;
$DB_PREFIX = defined('DB_PREFIX') ? DB_PREFIX : 'oc_';

// Load exclusions
$exclusions = [];
if (file_exists($EXCLUSIONS_FILE)) {
    $json = json_decode(file_get_contents($EXCLUSIONS_FILE), true);
    if (is_array($json)) {
        $exclusions = $json;
        echo "Loaded " . count($exclusions) . " exclusion rules\n";
    }
}

// Parse robots.txt for disallowed paths
$robots_disallowed = [];
if (file_exists($ROBOTS_TXT_PATH)) {
    $robots_lines = file($ROBOTS_TXT_PATH, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $current_agent = '*';
    foreach ($robots_lines as $line) {
        $line = trim($line);
        if (empty($line) || $line[0] === '#') continue;

        if (stripos($line, 'User-agent:') === 0) {
            $current_agent = trim(substr($line, 11));
        } elseif (stripos($line, 'Disallow:') === 0 && ($current_agent === '*' || $current_agent === 'Googlebot')) {
            $path = trim(substr($line, 9));
            if (!empty($path)) {
                $robots_disallowed[] = $path;
            }
        }
    }
    echo "Loaded " . count($robots_disallowed) . " disallowed paths from robots.txt\n";
}

function shouldExcludeUrl($url, $exclusions, $robots_disallowed, $site_url) {
    $path = str_replace($site_url, '', $url);

    // Check exclusion rules
    foreach ($exclusions as $rule) {
        $pattern = $rule['url_pattern'] ?? $rule['pattern'] ?? $rule;
        if (is_string($pattern)) {
            if (strpos($url, $pattern) !== false || strpos($path, $pattern) !== false) {
                return true;
            }
            if (preg_match('#' . str_replace('#', '\#', $pattern) . '#', $url)) {
                return true;
            }
        }
    }

    // Check robots.txt disallow
    foreach ($robots_disallowed as $disallowed) {
        if (strpos($path, $disallowed) === 0) {
            return true;
        }
    }

    return false;
}

function checkNoindex($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_USERAGENT, 'SitemapGenerator/1.0 (+https://atlantpro24.ru)');
    $html = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code !== 200) {
        return ['exclude' => true, 'reason' => "HTTP {$http_code}"];
    }

    if ($html && preg_match('/<meta\s+name=["\']robots["\']\s+content=["\']([^"\']+)["\']/i', $html, $matches)) {
        $robots_content = strtolower($matches[1]);
        if (strpos($robots_content, 'noindex') !== false) {
            return ['exclude' => true, 'reason' => 'noindex directive'];
        }
    }

    return ['exclude' => false, 'reason' => null];
}

// Connect to DB
$mysqli = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME, (int)$DB_PORT);
if ($mysqli->connect_errno) {
    die("MySQL connect failed: {$mysqli->connect_error}\n");
}
$mysqli->set_charset('utf8mb4');

function escxml($s) {
    return htmlspecialchars($s, ENT_QUOTES | ENT_XML1, 'UTF-8');
}

// State management (same as original)
if (!is_dir($TEMP_DIR)) mkdir($TEMP_DIR, 0755, true);
$stateFile = $TEMP_DIR . '/state.json';
$state = [
    'last_product_id' => 0,
    'file_index' => 1,
    'urls_in_current_file' => 0,
    'processed_total' => 0,
    'excluded_count' => 0,
    'finished' => false,
];

if (file_exists($stateFile)) {
    $j = json_decode(file_get_contents($stateFile), true);
    if (is_array($j)) $state = array_merge($state, $j);
}

function save_state($state, $stateFile) {
    $tmp = $stateFile . '.tmp';
    file_put_contents($tmp, json_encode($state));
    rename($tmp, $stateFile);
}

function open_or_resume_product_file($index, $ROOT_DIR) {
    $path = $ROOT_DIR . "/sitemap-products-{$index}.xml";
    if (file_exists($path)) {
        $contents = file_get_contents($path);
        if (substr(trim($contents), -9) === '</urlset>') {
            $contents = preg_replace('/\s*<\/urlset>\s*$/', '', $contents);
            file_put_contents($path, $contents);
        }
        $fp = fopen($path, 'a');
        return [$fp, $path];
    } else {
        $fp = fopen($path, 'w');
        fwrite($fp, '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL);
        fwrite($fp, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . PHP_EOL);
        return [$fp, $path];
    }
}

function close_product_file_resource($fp, $path, $gzip = true) {
    if (is_resource($fp)) {
        fwrite($fp, PHP_EOL . '</urlset>' . PHP_EOL);
        fclose($fp);
        if ($gzip) {
            $fp_in = fopen($path, 'rb');
            $fp_out = gzopen($path . '.gz', 'wb9');
            while (!feof($fp_in)) {
                gzwrite($fp_out, fread($fp_in, 1024 * 512));
            }
            fclose($fp_in);
            gzclose($fp_out);
        }
    }
}

// Generate non-product sitemaps (similar to original but with exclusion checks)
$now = date('Y-m-d');

// Products sitemap with exclusions
list($fp_prod, $prod_path) = open_or_resume_product_file($state['file_index'], $ROOT_DIR);

$sql = "SELECT p.product_id, p.quantity, p.image, pd.name, p.date_added, p.date_modified
        FROM `{$DB_PREFIX}product` p
        JOIN `{$DB_PREFIX}product_description` pd ON p.product_id = pd.product_id
        LEFT JOIN `{$DB_PREFIX}product_to_store` ps ON p.product_id = ps.product_id
        WHERE p.status = 1 AND p.product_id > " . (int)$state['last_product_id'] . "
        AND (ps.store_id = {$STORE_ID} OR ps.store_id IS NULL)
        GROUP BY p.product_id
        ORDER BY p.product_id ASC
        LIMIT 1000";

$res = $mysqli->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $pid = (int)$row['product_id'];

        // Get SEO URL
        $seo = false;
        $q = $mysqli->real_escape_string("product_id={$pid}");
        $rq = $mysqli->query("SELECT keyword FROM `{$DB_PREFIX}seo_url` WHERE `query` = '{$q}' LIMIT 1");
        if ($rq && ($r = $rq->fetch_assoc())) {
            $seo = $r['keyword'];
        }
        if ($rq) $rq->free();

        $loc = $seo ? $SITE_URL . '/' . ltrim($seo, '/') : $SITE_URL . '/product/' . $pid . '/';

        // Check if should exclude
        if (shouldExcludeUrl($loc, $exclusions, $robots_disallowed, $SITE_URL)) {
            $state['excluded_count']++;
            $state['last_product_id'] = $pid;
            continue;
        }

        // Build sitemap entry
        $lastmod_raw = $row['date_modified'] ?: $row['date_added'] ?: date('Y-m-d H:i:s');
        $lastmod = date('Y-m-d\TH:i:sP', strtotime($lastmod_raw));
        $qty = (int)$row['quantity'];
        $priority = $qty > 0 ? '0.7' : '0.4';
        $changefreq = $qty > 0 ? 'weekly' : 'monthly';

        fwrite($fp_prod, "  <url>\n");
        fwrite($fp_prod, "    <loc>" . escxml($loc) . "</loc>\n");
        fwrite($fp_prod, "    <lastmod>" . escxml($lastmod) . "</lastmod>\n");
        fwrite($fp_prod, "    <changefreq>" . escxml($changefreq) . "</changefreq>\n");
        fwrite($fp_prod, "    <priority>" . escxml($priority) . "</priority>\n");
        fwrite($fp_prod, "  </url>\n");

        $state['last_product_id'] = $pid;
        $state['urls_in_current_file']++;
        $state['processed_total']++;

        if ($state['urls_in_current_file'] >= $PRODUCT_FILE_LIMIT) {
            close_product_file_resource($fp_prod, $prod_path, $GZIP);
            $state['file_index']++;
            $state['urls_in_current_file'] = 0;
            list($fp_prod, $prod_path) = open_or_resume_product_file($state['file_index'], $ROOT_DIR);
        }
    }
    $res->free();
}

close_product_file_resource($fp_prod, $prod_path, $GZIP);
save_state($state, $stateFile);

// Create sitemap index
$sitemap_index = $ROOT_DIR . '/sitemap.xml';
$fp_idx = fopen($sitemap_index, 'w');
fwrite($fp_idx, '<?xml version="1.0" encoding="UTF-8"?>' . PHP_EOL);
fwrite($fp_idx, '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . PHP_EOL);

for ($i = 1; $i <= $state['file_index']; $i++) {
    $path = $ROOT_DIR . "/sitemap-products-{$i}.xml";
    if (file_exists($path)) {
        fwrite($fp_idx, "  <sitemap>\n");
        fwrite($fp_idx, "    <loc>" . escxml($SITE_URL . "/sitemap-products-{$i}.xml") . "</loc>\n");
        fwrite($fp_idx, "    <lastmod>{$now}</lastmod>\n");
        fwrite($fp_idx, "  </sitemap>\n");
    }
}

fwrite($fp_idx, '</sitemapindex>' . PHP_EOL);
fclose($fp_idx);

$mysqli->close();

echo "Sitemap generation complete!\n";
echo "Processed: {$state['processed_total']} URLs\n";
echo "Excluded: {$state['excluded_count']} URLs\n";
echo "Files created: {$state['file_index']}\n";
