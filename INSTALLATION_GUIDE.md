# SEO Audit Tool - Installation Guide

## Quick Start

This guide will help you set up the complete SEO audit system for your OpenCart 3 website.

## Prerequisites

- OpenCart 3.x installation at `/var/www/www-root/data/www/atlantcabel.ru/`
- Node.js 18+ and npm
- PHP 7.4+ with MySQLi and cURL
- Supabase account (free tier works)
- SSH access to your server

## Step 1: Setup Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be ready
3. The database schema has already been created via migrations
4. Copy your project URL and anon key from Settings > API

## Step 2: Configure Environment Variables

Create `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 3: Install and Build Web Application

```bash
# Install dependencies
npm install

# Build for production
npm run build

# The built files will be in the dist/ folder
```

## Step 4: Deploy Web Application

Option A: Deploy to a hosting service (Vercel, Netlify, etc.)
```bash
# Upload dist/ folder contents
```

Option B: Serve from your own server
```bash
# Copy built files
scp -r dist/* user@yourserver:/var/www/seo-audit/

# Configure nginx or apache to serve the files
```

## Step 5: Setup PHP Scripts on OpenCart Server

### 5.1 Upload PHP Files

```bash
# Connect to your server
ssh user@atlantpro24.ru

# Navigate to OpenCart root
cd /var/www/www-root/data/www/atlantcabel.ru/

# Create directory for scripts (optional)
mkdir -p seo-tools
```

Upload these files to your OpenCart root:
- `opencart-url-collector.php`
- `sitemap-generator-improved.php`
- `api-exclusions.php`

```bash
# From your local machine
scp public/opencart-url-collector.php user@server:/var/www/www-root/data/www/atlantcabel.ru/
scp public/sitemap-generator-improved.php user@server:/var/www/www-root/data/www/atlantcabel.ru/
scp public/api-exclusions.php user@server:/var/www/www-root/data/www/atlantcabel.ru/
```

### 5.2 Configure opencart-url-collector.php

Edit the file and update these lines:

```php
$DB_HOST = 'localhost';
$DB_USER = 'your_opencart_db_user';
$DB_PASS = 'your_opencart_db_password';
$DB_NAME = 'your_opencart_db_name';
$DB_PREFIX = 'oc_';
$SITE_URL = 'https://atlantpro24.ru';
$STORE_ID = 0;
```

### 5.3 Test URL Collector

```bash
cd /var/www/www-root/data/www/atlantcabel.ru/
php opencart-url-collector.php > urls.json

# Check the output
head urls.json
```

You should see JSON output with your site's URLs.

### 5.4 Configure sitemap-generator-improved.php

Edit the file and update:

```php
$SITE_URL = 'https://atlantpro24.ru';
$ROOT_DIR = __DIR__;
```

The script will automatically read database config from OpenCart's `config.php`.

## Step 6: First Audit Run

1. Open your web application
2. Click "New Audit"
3. Enter site URL: `https://atlantpro24.ru`
4. Upload the `urls.json` file generated earlier
5. Click "Fetch from Site" for robots.txt
6. Enter sitemap URL: `https://atlantpro24.ru/sitemap.xml`
7. Click "Start Audit"

The audit will:
- Check each URL for HTTP status
- Extract SEO elements (title, meta, H1)
- Identify SEO issues
- Analyze robots.txt
- Validate sitemap

## Step 7: Review and Fix Issues

1. Review the audit results in different tabs
2. Export the report for documentation
3. Add exclusions for problematic URLs:
   - Navigate to "Exclusions" tab
   - Add URL patterns for 404 pages
   - Add patterns for noindex pages
   - Export the exclusions JSON

## Step 8: Update Sitemap with Exclusions

```bash
# Upload exclusions file
scp sitemap-exclusions.json user@server:/var/www/www-root/data/www/atlantcabel.ru/

# SSH to server
ssh user@atlantpro24.ru
cd /var/www/www-root/data/www/atlantcabel.ru/

# Backup existing sitemap
cp sitemap.xml sitemap.xml.backup

# Generate new sitemap with exclusions
php sitemap-generator-improved.php --full

# Check results
ls -lh sitemap*.xml
```

## Step 9: Setup Automation (Optional)

Create cron jobs for automated tasks:

```bash
# Edit crontab
crontab -e

# Add these lines:

# Collect URLs daily at 2 AM
0 2 * * * cd /var/www/www-root/data/www/atlantcabel.ru && php opencart-url-collector.php > urls.json 2>&1

# Regenerate sitemap daily at 3 AM
0 3 * * * cd /var/www/www-root/data/www/atlantcabel.ru && php sitemap-generator-improved.php --full >> /var/log/sitemap-gen.log 2>&1

# Weekly comprehensive audit (requires custom script)
# 0 4 * * 0 /path/to/run-weekly-audit.sh
```

## Common Issues and Solutions

### Issue: "Database connection failed"

**Solution:** Check database credentials in the PHP scripts. Ensure the MySQL user has access.

```bash
# Test database connection
mysql -u your_user -p your_database -e "SELECT 1;"
```

### Issue: "Memory limit exceeded"

**Solution:** Increase PHP memory limit

```bash
# Edit php.ini
memory_limit = 512M

# Or in the script
ini_set('memory_limit', '512M');
```

### Issue: URLs not appearing in sitemap

**Solution:**
1. Check if URL is in exclusions list
2. Verify robots.txt isn't blocking
3. Ensure page returns 200 status
4. Check for noindex meta tag

```bash
# Test URL
curl -I https://atlantpro24.ru/your-page/

# Check robots.txt
curl https://atlantpro24.ru/robots.txt
```

### Issue: Audit taking too long

**Solution:**
1. Limit URLs in JSON file (take first 100 for testing)
2. Increase timeout in crawler
3. Run audit in batches

```bash
# Create smaller test file
head -n 20 urls.json > urls-test.json
```

### Issue: CORS errors in web app

**Solution:** Ensure API endpoints have correct CORS headers. Check `api-exclusions.php`:

```php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
```

## Security Best Practices

1. **Never expose database credentials** in public files
2. **Use HTTPS** for all API requests
3. **Restrict file permissions**:
   ```bash
   chmod 600 config.php
   chmod 644 *.json
   ```
4. **Use .htaccess** to protect sensitive files:
   ```apache
   <Files "sitemap-exclusions.json">
       Require all denied
   </Files>
   ```
5. **Implement rate limiting** for API endpoints
6. **Regular backups** of database and exclusion rules

## Performance Optimization

1. **Cache frequently accessed data**
2. **Use database indexes** (already created in migration)
3. **Batch API requests** when possible
4. **Limit concurrent crawls** to avoid server overload
5. **Use CDN** for static assets

## Monitoring and Maintenance

### Daily Tasks
- Check audit status
- Review new issues
- Update exclusions if needed

### Weekly Tasks
- Run comprehensive audit
- Review trend reports
- Update sitemap

### Monthly Tasks
- Clean old audit data
- Optimize database
- Review and update exclusion rules
- Check for duplicate content

## Getting Help

If you encounter issues:

1. Check logs:
   ```bash
   tail -f /var/www/www-root/data/www/atlantcabel.ru/sitemap-generator.log
   ```

2. Test individual components:
   ```bash
   # Test URL collector
   php opencart-url-collector.php | head

   # Test sitemap generator
   php sitemap-generator-improved.php --full
   ```

3. Verify database connectivity:
   ```bash
   php -r "require 'config.php'; echo DB_DATABASE;"
   ```

4. Check PHP version and extensions:
   ```bash
   php -v
   php -m | grep -E "curl|mysqli|json"
   ```

## Next Steps

After successful installation:

1. Run your first audit
2. Review and fix critical issues
3. Set up exclusions for problematic URLs
4. Regenerate sitemap with exclusions
5. Submit new sitemap to search engines
6. Schedule regular audits
7. Monitor improvements over time

## Support Resources

- Check the main README.md for detailed feature documentation
- Review inline code comments for technical details
- OpenCart documentation: https://docs.opencart.com/
- Supabase documentation: https://supabase.com/docs
