import { Download } from 'lucide-react';
import { exportErrorsToCSV } from '../lib/csvExport';
import { UrlCheck, SeoIssue } from '../lib/supabase';

interface Props {
  urlChecks: UrlCheck[];
  seoIssues: SeoIssue[];
}

export function AuditErrorsExport({ urlChecks, seoIssues }: Props) {
  return (
    <button
      onClick={() => exportErrorsToCSV(urlChecks, seoIssues)}
      className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
    >
      <Download className="w-4 h-4" />
      <span>Экспорт ошибок CSV</span>
    </button>
  );
}
