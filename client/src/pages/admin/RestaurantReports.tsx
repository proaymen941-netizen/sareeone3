import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, DollarSign, ShoppingBag, Percent } from "lucide-react";

export default function RestaurantReports() {
  const { data: reports, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/reports/restaurants"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">تقارير المطاعم</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports?.reduce((sum: number, r: any) => sum + r.totalSales, 0).toLocaleString()} ريال
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reports?.reduce((sum: number, r: any) => sum + r.totalOrders, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>أداء المطاعم التفصيلي</CardTitle>
        </CardHeader>
        <CardContent>
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead>المطعم</TableHead>
                <TableHead>الطلبات</TableHead>
                <TableHead>المبيعات</TableHead>
                <TableHead>متوسط الطلب</TableHead>
                <TableHead>العمولة</TableHead>
                <TableHead>المستحق</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports?.map((report: any) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.name}</TableCell>
                  <TableCell>{report.totalOrders}</TableCell>
                  <TableCell>{report.totalSales.toLocaleString()} ريال</TableCell>
                  <TableCell>{report.avgOrderValue.toFixed(2)} ريال</TableCell>
                  <TableCell>{report.commissionRate}%</TableCell>
                  <TableCell className="text-green-600 font-bold">{report.amountDue.toLocaleString()} ريال</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
