export const dynamic = 'force-dynamic';
export const revalidate = 0;

import AdminClientLayout from './AdminClientLayout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminClientLayout>{children}</AdminClientLayout>;
}
