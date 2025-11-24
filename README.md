# SEO Audit Tool for OpenCart

A comprehensive SEO audit application designed specifically for OpenCart 3 websites. Analyzes URLs, detects SEO issues, validates robots.txt and sitemaps, and provides actionable recommendations.

## Features

### SEO Analysis
- **HTTP Status Checks**: Detects 404, 5xx, and redirect errors
- **Title Analysis**: Identifies missing, duplicate, too short/long titles
- **Meta Description**: Checks for missing or improperly sized descriptions
- **H1 Tags**: Validates H1 presence and count
- **Canonical URLs**: Ensures proper canonical implementation
- **Image Optimization**: Finds images without alt attributes
- **Content Quality**: Identifies thin content pages
- **Technical SEO**: HTTPS validation, mixed content detection

### Robots.txt Analysis
- Syntax validation
- Identifies blocked important paths
- Provides corrected version for copy/paste
- Suggests improvements

### Sitemap Analysis
- Validates sitemap structure
- Identifies URLs with errors
- Detects pages with noindex in sitemap
- Finds missing important URLs

### URL Monitoring
- Tracks HTTP status changes
- Monitors redirect chains
- Response time tracking
- Content length monitoring

### Exclusion Management
- API for managing URL exclusions
- Automatic exclusion of 404 pages
- Exclusion of noindex pages
- Robots.txt integration

## Installation

### 1. Prerequisites
- Node.js 18+ and npm
- PHP 7.4+ with MySQLi and cURL extensions
- PostgreSQL database (Supabase)
- OpenCart 3.x website

### 2. Setup Web Application

```bash
# Clone or extract files
cd /path/to/project

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
# Run development server
npm run dev

# Build for production
npm run build
```

### 3. Setup PHP Scripts

Copy PHP scripts to your OpenCart root directory:

```bash
# Copy URL collector
cp public/opencart-url-collector.php /var/www/www-root/data/www/atlantcabel.ru/

# Copy improved sitemap generator
cp public/sitemap-generator-improved.php /var/www/www-root/data/www/atlantcabel.ru/

# Copy exclusions API
cp public/api-exclusions.php /var/www/www-root/data/www/atlantcabel.ru/
```

### 4. Configure PHP Scripts

Edit `opencart-url-collector.php`:
```php
$DB_HOST = 'localhost';
$DB_USER = 'your_db_user';
$DB_PASS = 'your_db_password';
$DB_NAME = 'your_db_name';
$SITE_URL = 'https://atlantpro24.ru';
```

Edit `sitemap-generator-improved.php`:
```php
$SITE_URL = 'https://atlantpro24.ru';
$ROOT_DIR = __DIR__;
$CONFIG_PATH = $ROOT_DIR . '/config.php';
```

## Usage

### Running a URL Collection

Generate JSON file with all site URLs:

```bash
cd /var/www/www-root/data/www/atlantcabel.ru/
php opencart-url-collector.php > urls.json
```

The output includes:
- Products with SEO URLs and metadata
- Categories with product counts
- Manufacturers/brands
- Information pages
- Blog posts
- System pages

### Starting an Audit

1. Open the web application
2. Click "New Audit"
3. Enter your site URL
4. Upload or paste the `urls.json` file
5. Optionally fetch or paste robots.txt content
6. Enter sitemap URL (e.g., `https://yoursite.com/sitemap.xml`)
7. Click "Start Audit"

The audit will:
- Crawl each URL
- Check HTTP status
- Extract SEO elements
- Identify issues
- Analyze robots.txt
- Validate sitemap

### Viewing Results

Results are organized into tabs:

- **Overview**: Summary statistics and issue distribution
- **Issues**: Detailed list of all SEO problems with severity levels
- **URLs**: Complete list of crawled URLs with key metrics
- **Robots.txt**: Analysis with recommendations and corrected version
- **Sitemap**: Validation results and missing URL detection

### Managing Exclusions

Add URLs to exclude from sitemap:

```bash
# Via API
curl -X POST https://yoursite.com/api-exclusions.php \
  -H "Content-Type: application/json" \
  -d '{"url_pattern": "/admin/", "reason": "404 error"}'

# List exclusions
curl https://yoursite.com/api-exclusions.php

# Remove exclusion
curl -X DELETE "https://yoursite.com/api-exclusions.php?pattern=/admin/"
```

Or add directly to exclusion rules in the audit results interface.

### Regenerating Sitemap with Exclusions

```bash
cd /var/www/www-root/data/www/atlantcabel.ru/

# Run with exclusions
php sitemap-generator-improved.php --full --exclusions=/path/to/sitemap-exclusions.json

# The generator will:
# - Skip excluded URLs
# - Respect robots.txt disallow rules
# - Validate each URL
# - Create optimized sitemaps
```

## Issue Types & Severity

### Critical Issues
- 404 errors
- 5xx server errors
- Missing title tags
- No HTTPS

### High Priority
- Missing H1 tags
- Missing meta descriptions
- Pages with noindex
- Mixed content

### Medium Priority
- Multiple H1 tags
- 302 redirects instead of 301
- Missing canonical URLs
- Images without alt text

### Low Priority
- Title too short/long
- Meta description length issues

## Sitemap Generator Improvements

The improved sitemap generator (`sitemap-generator-improved.php`) adds:

1. **Exclusion Support**: Reads exclusion rules from JSON file
2. **Robots.txt Integration**: Automatically respects disallow rules
3. **URL Validation**: Checks HTTP status before including
4. **Noindex Detection**: Excludes pages with noindex meta tag
5. **Statistics**: Reports excluded URL count

### Exclusion File Format

`sitemap-exclusions.json`:
```json
[
  {
    "url_pattern": "/admin/",
    "reason": "404 error",
    "added_at": "2025-11-13T12:00:00+00:00",
    "exclude_from_sitemap": true
  },
  {
    "url_pattern": "/test-page",
    "reason": "Temporary page with noindex",
    "added_at": "2025-11-13T12:05:00+00:00",
    "exclude_from_sitemap": true
  }
]
```

## Automation

### Cron Jobs

Set up automated audits:

```bash
# Collect URLs daily at 2 AM
0 2 * * * cd /var/www/www-root/data/www/atlantcabel.ru && php opencart-url-collector.php > urls.json

# Regenerate sitemap daily at 3 AM
0 3 * * * cd /var/www/www-root/data/www/atlantcabel.ru && php sitemap-generator-improved.php --full

# Weekly comprehensive audit (requires custom script)
0 4 * * 0 /usr/local/bin/run-weekly-audit.sh
```

## Database Schema

The application uses Supabase with the following tables:

- `audits`: Audit sessions
- `url_checks`: Individual URL analysis results
- `seo_issues`: Identified SEO problems
- `robots_txt_analysis`: Robots.txt validation results
- `sitemap_analysis`: Sitemap validation data
- `exclusion_rules`: URL exclusion patterns

## API Endpoints

### Exclusions API

- `GET /api-exclusions.php` - List all exclusions
- `POST /api-exclusions.php` - Add new exclusion
- `DELETE /api-exclusions.php?pattern=/path/` - Remove exclusion

## Troubleshooting

### URLs not appearing in sitemap
- Check exclusion rules
- Verify robots.txt isn't blocking
- Ensure page returns 200 status
- Check for noindex meta tag

### Audit taking too long
- Reduce URL count in JSON file
- Increase timeout settings
- Run audit in smaller batches

### PHP memory errors
- Increase `memory_limit` in php.ini
- Reduce `PRODUCTS_PER_BATCH` in sitemap generator

## Performance Optimization

- Limit concurrent crawls to avoid overwhelming server
- Use rate limiting between requests
- Cache frequently accessed data
- Batch database inserts
- Use indexes on large tables

## Security Considerations

- Never expose database credentials
- Use HTTPS for all API requests
- Validate and sanitize all inputs
- Implement rate limiting
- Use prepared statements for database queries

## License

This tool is provided as-is for SEO analysis and optimization purposes.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs in `sitemap-generator.log`
3. Verify database connectivity
4. Ensure all dependencies are installed
