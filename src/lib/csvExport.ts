export function exportErrorsToCSV(urlChecks: any[], seoIssues: any[]) {
  const rows = seoIssues
    .filter(issue => issue.severity !== 'success')
    .map(issue => {
      const urlCheck = urlChecks.find(u => u.id === issue.url_check_id);
      return {
        url: urlCheck?.url || '',
        severity: issue.severity,
        issueType: issue.issue_type,
        issueCode: issue.issue_code,
        description: issue.description,
        recommendation: issue.recommendation || '',
        httpStatus: urlCheck?.http_status || '',
        inSitemap: urlCheck?.in_sitemap ? 'Да' : 'Нет',
        robotsAllowed: urlCheck?.robots_allowed ? 'Да' : 'Нет',
        sitemapRobotsIssues: urlCheck?.sitemap_robots_issues || '',
      };
    });

  const csv = [
    ['URL', 'Критичность', 'Тип', 'Код', 'Описание', 'Рекомендация', 'HTTP Статус', 'В Sitemap', 'Robots Разрешено', 'Проблемы Sitemap/Robots'].join(','),
    ...rows.map(row => [
      `"${row.url.replace(/"/g, '""')}"`,
      row.severity,
      row.issueType,
      row.issueCode,
      `"${row.description.replace(/"/g, '""')}"`,
      `"${row.recommendation.replace(/"/g, '""')}"`,
      row.httpStatus,
      row.inSitemap,
      row.robotsAllowed,
      `"${row.sitemapRobotsIssues.replace(/"/g, '""')}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `seo-errors-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
