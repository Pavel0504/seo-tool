<?php
/**
 * OpenCart URL Collector
 * Collects all URLs from OpenCart database and exports as JSON
 * Usage: php opencart-url-collector.php > urls.json
 */

set_time_limit(0);
date_default_timezone_set('Europe/Prague');

// Database configuration - adjust these to match your OpenCart config
$DB_HOST = 'localhost';
$DB_USER = 'your_db_user';
$DB_PASS = 'your_db_password';
$DB_NAME = 'your_db_name';
$DB_PORT = 3306;
$DB_PREFIX = 'oc_';
$SITE_URL = 'https://atlantpro24.ru';
$STORE_ID = 0;

// Connect to database
$mysqli = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME, (int)$DB_PORT);
if ($mysqli->connect_errno) {
    die(json_encode(['error' => 'Database connection failed: ' . $mysqli->connect_error]));
}
$mysqli->set_charset('utf8mb4');

$urls = [
    'products' => [],
    'categories' => [],
    'manufacturers' => [],
    'information' => [],
    'system' => [],
    'blog' => [],
    'other' => []
];

// Collect product URLs
$sql = "SELECT p.product_id, pd.name, p.status, p.date_added, p.date_modified, p.quantity
        FROM `{$DB_PREFIX}product` p
        JOIN `{$DB_PREFIX}product_description` pd ON p.product_id = pd.product_id AND pd.language_id = 1
        LEFT JOIN `{$DB_PREFIX}product_to_store` ps ON p.product_id = ps.product_id
        WHERE ps.store_id = {$STORE_ID} OR ps.store_id IS NULL
        GROUP BY p.product_id
        ORDER BY p.product_id";

$res = $mysqli->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $pid = (int)$row['product_id'];

        // Get SEO URL
        $seo_url = null;
        $q = $mysqli->real_escape_string("product_id={$pid}");
        $rq = $mysqli->query("SELECT keyword FROM `{$DB_PREFIX}seo_url` WHERE `query` = '{$q}' AND store_id = {$STORE_ID} AND language_id = 1 LIMIT 1");
        if ($rq && ($r = $rq->fetch_assoc())) {
            $seo_url = $r['keyword'];
        }
        if ($rq) $rq->free();

        // Fallback to url_alias
        if (!$seo_url) {
            $rq = $mysqli->query("SELECT keyword FROM `{$DB_PREFIX}url_alias` WHERE `query` = '{$q}' LIMIT 1");
            if ($rq && ($r = $rq->fetch_assoc())) {
                $seo_url = $r['keyword'];
            }
            if ($rq) $rq->free();
        }

        $url = $seo_url ? $SITE_URL . '/' . ltrim($seo_url, '/') : $SITE_URL . '/index.php?route=product/product&product_id=' . $pid;

        $urls['products'][] = [
            'id' => $pid,
            'url' => $url,
            'name' => $row['name'],
            'status' => (int)$row['status'],
            'in_stock' => (int)$row['quantity'] > 0,
            'date_added' => $row['date_added'],
            'date_modified' => $row['date_modified'],
            'type' => 'product'
        ];
    }
    $res->free();
}

// Collect category URLs
$sql = "SELECT c.category_id, cd.name, c.status, c.date_added, c.date_modified
        FROM `{$DB_PREFIX}category` c
        JOIN `{$DB_PREFIX}category_description` cd ON c.category_id = cd.category_id AND cd.language_id = 1
        LEFT JOIN `{$DB_PREFIX}category_to_store` cs ON c.category_id = cs.category_id
        WHERE cs.store_id = {$STORE_ID} OR cs.store_id IS NULL
        GROUP BY c.category_id
        ORDER BY c.category_id";

$res = $mysqli->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $cid = (int)$row['category_id'];

        $seo_url = null;
        $q = $mysqli->real_escape_string("category_id={$cid}");
        $rq = $mysqli->query("SELECT keyword FROM `{$DB_PREFIX}seo_url` WHERE `query` = '{$q}' AND store_id = {$STORE_ID} AND language_id = 1 LIMIT 1");
        if ($rq && ($r = $rq->fetch_assoc())) {
            $seo_url = $r['keyword'];
        }
        if ($rq) $rq->free();

        if (!$seo_url) {
            $rq = $mysqli->query("SELECT keyword FROM `{$DB_PREFIX}url_alias` WHERE `query` = '{$q}' LIMIT 1");
            if ($rq && ($r = $rq->fetch_assoc())) {
                $seo_url = $r['keyword'];
            }
            if ($rq) $rq->free();
        }

        $url = $seo_url ? $SITE_URL . '/' . ltrim($seo_url, '/') : $SITE_URL . '/index.php?route=product/category&path=' . $cid;

        $urls['categories'][] = [
            'id' => $cid,
            'url' => $url,
            'name' => $row['name'],
            'status' => (int)$row['status'],
            'date_added' => $row['date_added'],
            'date_modified' => $row['date_modified'],
            'type' => 'category'
        ];
    }
    $res->free();
}

// Collect manufacturer/brand URLs
$sql = "SELECT manufacturer_id, name FROM `{$DB_PREFIX}manufacturer` ORDER BY manufacturer_id";
$res = $mysqli->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $mid = (int)$row['manufacturer_id'];

        $seo_url = null;
        $q = $mysqli->real_escape_string("manufacturer_id={$mid}");
        $rq = $mysqli->query("SELECT keyword FROM `{$DB_PREFIX}seo_url` WHERE `query` = '{$q}' AND store_id = {$STORE_ID} AND language_id = 1 LIMIT 1");
        if ($rq && ($r = $rq->fetch_assoc())) {
            $seo_url = $r['keyword'];
        }
        if ($rq) $rq->free();

        if (!$seo_url) {
            $rq = $mysqli->query("SELECT keyword FROM `{$DB_PREFIX}url_alias` WHERE `query` = '{$q}' LIMIT 1");
            if ($rq && ($r = $rq->fetch_assoc())) {
                $seo_url = $r['keyword'];
            }
            if ($rq) $rq->free();
        }

        $url = $seo_url ? $SITE_URL . '/' . ltrim($seo_url, '/') : $SITE_URL . '/index.php?route=product/manufacturer/info&manufacturer_id=' . $mid;

        $urls['manufacturers'][] = [
            'id' => $mid,
            'url' => $url,
            'name' => $row['name'],
            'type' => 'manufacturer'
        ];
    }
    $res->free();
}

// Collect information pages
$sql = "SELECT i.information_id, id.title, i.status
        FROM `{$DB_PREFIX}information` i
        JOIN `{$DB_PREFIX}information_description` id ON i.information_id = id.information_id AND id.language_id = 1
        LEFT JOIN `{$DB_PREFIX}information_to_store` its ON i.information_id = its.information_id
        WHERE its.store_id = {$STORE_ID} OR its.store_id IS NULL
        GROUP BY i.information_id
        ORDER BY i.information_id";

$res = $mysqli->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $iid = (int)$row['information_id'];

        $seo_url = null;
        $q = $mysqli->real_escape_string("information_id={$iid}");
        $rq = $mysqli->query("SELECT keyword FROM `{$DB_PREFIX}seo_url` WHERE `query` = '{$q}' AND store_id = {$STORE_ID} AND language_id = 1 LIMIT 1");
        if ($rq && ($r = $rq->fetch_assoc())) {
            $seo_url = $r['keyword'];
        }
        if ($rq) $rq->free();

        if (!$seo_url) {
            $rq = $mysqli->query("SELECT keyword FROM `{$DB_PREFIX}url_alias` WHERE `query` = '{$q}' LIMIT 1");
            if ($rq && ($r = $rq->fetch_assoc())) {
                $seo_url = $r['keyword'];
            }
            if ($rq) $rq->free();
        }

        $url = $seo_url ? $SITE_URL . '/' . ltrim($seo_url, '/') : $SITE_URL . '/index.php?route=information/information&information_id=' . $iid;

        $urls['information'][] = [
            'id' => $iid,
            'url' => $url,
            'title' => $row['title'],
            'status' => (int)$row['status'],
            'type' => 'information'
        ];
    }
    $res->free();
}

// Collect blog posts (if prostore_news extension is installed)
$sql = "SHOW TABLES LIKE '{$DB_PREFIX}prostorecatblog'";
$res = $mysqli->query($sql);
if ($res && $res->num_rows > 0) {
    $sql = "SELECT blog_id, title, status FROM `{$DB_PREFIX}prostorecatblog` WHERE language_id = 1 ORDER BY blog_id";
    $res2 = $mysqli->query($sql);
    if ($res2) {
        while ($row = $res2->fetch_assoc()) {
            $bid = (int)$row['blog_id'];

            $seo_url = null;
            $q = $mysqli->real_escape_string("prostorecatblog_id={$bid}");
            $rq = $mysqli->query("SELECT keyword FROM `{$DB_PREFIX}seo_url` WHERE `query` = '{$q}' AND store_id = {$STORE_ID} AND language_id = 1 LIMIT 1");
            if ($rq && ($r = $rq->fetch_assoc())) {
                $seo_url = $r['keyword'];
            }
            if ($rq) $rq->free();

            $url = $seo_url ? $SITE_URL . '/' . ltrim($seo_url, '/') : $SITE_URL . '/index.php?route=extension/module/prostore_news/getnews&blog_id=' . $bid;

            $urls['blog'][] = [
                'id' => $bid,
                'url' => $url,
                'title' => $row['title'],
                'status' => (int)$row['status'],
                'type' => 'blog'
            ];
        }
        $res2->free();
    }
}
if ($res) $res->free();

// Collect system/special pages from seo_url
$system_routes = [
    'account/voucher', 'account/wishlist', 'account/account', 'checkout/cart', 'checkout/checkout',
    'account/login', 'account/logout', 'account/order', 'account/newsletter', 'product/special',
    'product/manufacturer', 'information/contact', 'information/sitemap', 'product/search',
    'extension/module/prostore_news/getnewslist', 'extension/module/prostore_review_shop/getshopreviews'
];

foreach ($system_routes as $route) {
    $q = $mysqli->real_escape_string($route);
    $sql = "SELECT keyword FROM `{$DB_PREFIX}seo_url` WHERE `query` = '{$q}' AND store_id = {$STORE_ID} AND language_id = 1 LIMIT 1";
    $res = $mysqli->query($sql);
    if ($res && ($row = $res->fetch_assoc())) {
        $urls['system'][] = [
            'url' => $SITE_URL . '/' . ltrim($row['keyword'], '/'),
            'route' => $route,
            'type' => 'system'
        ];
    }
    if ($res) $res->free();
}

// Add homepage
$urls['system'][] = [
    'url' => $SITE_URL . '/',
    'route' => 'common/home',
    'type' => 'home'
];

$mysqli->close();

// Output JSON
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'generated_at' => date('c'),
    'site_url' => $SITE_URL,
    'total_urls' => array_sum(array_map('count', $urls)),
    'urls' => $urls,
    'stats' => [
        'products' => count($urls['products']),
        'categories' => count($urls['categories']),
        'manufacturers' => count($urls['manufacturers']),
        'information' => count($urls['information']),
        'blog' => count($urls['blog']),
        'system' => count($urls['system']),
        'other' => count($urls['other'])
    ]
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
