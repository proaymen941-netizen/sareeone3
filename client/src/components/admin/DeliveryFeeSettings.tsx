import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { Trash2, Plus, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const DeliveryFeeSettings: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newFee, setNewFee] = useState({ minDistance: '', maxDistance: '', fee: '' });

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['/api/admin/delivery-fees'],
    queryFn: async () => {
      const res = await fetch('/api/admin/delivery-fees');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (fee: any) => {
      await apiRequest('POST', '/api/admin/delivery-fees', fee);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/delivery-fees'] });
      setNewFee({ minDistance: '', maxDistance: '', fee: '' });
      toast({ title: 'تمت إضافة رسوم التوصيل بنجاح' });
    }
  });

  const handleAdd = () => {
    if (!newFee.minDistance || !newFee.maxDistance || !newFee.fee) return;
    createMutation.mutate({
      minDistance: parseFloat(newFee.minDistance),
      maxDistance: parseFloat(newFee.maxDistance),
      fee: parseFloat(newFee.fee),
      isActive: true
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          إعدادات رسوم التوصيل حسب المسافة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Input 
            placeholder="من مسافة (كم)" 
            type="number" 
            value={newFee.minDistance}
            onChange={e => setNewFee({...newFee, minDistance: e.target.value})}
          />
          <Input 
            placeholder="إلى مسافة (كم)" 
            type="number"
            value={newFee.maxDistance}
            onChange={e => setNewFee({...newFee, maxDistance: e.target.value})}
          />
          <Input 
            placeholder="الرسوم" 
            type="number"
            value={newFee.fee}
            onChange={e => setNewFee({...newFee, fee: e.target.value})}
          />
          <Button onClick={handleAdd} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة نطاق
          </Button>
        </div>

        <Table dir="rtl">
          <TableHeader>
            <TableRow>
              <TableHead>من (كم)</TableHead>
              <TableHead>إلى (كم)</TableHead>
              <TableHead>الرسوم</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fees.map((fee: any) => (
              <TableRow key={fee.id}>
                <TableCell>{fee.minDistance}</TableCell>
                <TableCell>{fee.maxDistance}</TableCell>
                <TableCell>{fee.fee}</TableCell>
                <TableCell>{fee.isActive ? 'نشط' : 'معطل'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {fees.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                  لا توجد قواعد لرسوم التوصيل بعد
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
