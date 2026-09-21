import { redirect } from 'next/navigation';

export default function ScannerIndexPage() {
  redirect('/scanner/login');
}
