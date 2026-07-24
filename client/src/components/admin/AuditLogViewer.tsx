import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Activity, ShieldCheck } from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['/api/admin/audit-logs'],
    queryFn: async () => {
      const res = await fetch('/api/admin/audit-logs');
      return res.json();
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          سجل النشاطات والعمليات (Audit Logs)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead>التوقيت</TableHead>
              <TableHead>المسؤول</TableHead>
              <TableHead>العملية</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الوصف</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">{formatDate(new Date(log.createdAt))}</TableCell>
                <TableCell>{log.userId || 'نظام'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{log.action}</Badge>
                </TableCell>
                <TableCell>{log.entityType}</TableCell>
                <TableCell className="max-w-xs truncate">{log.description}</TableCell>
                <TableCell>
                  <Badge className={log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {log.status === 'success' ? 'نجاح' : 'فشل'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                  <Activity className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  لا توجد سجلات نشاط بعد
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
