import { Switch, Route, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminDrivers from "./AdminDrivers";
import AdminOrders from "./AdminOrders";
import AdminRestaurants from "./AdminRestaurants";
import AdminMenuItems from "./AdminMenuItems";
import AdminOffers from "./AdminOffers";
import AdminCategories from "./AdminCategories";
import AdminUsers from "./AdminUsers";
import AdminProfile from "./AdminProfile";
import AdminUiSettings from "./admin/AdminUiSettings";
import AdminFinancialReports from "./AdminFinancialReports";
import AdminHRManagement from "./AdminHRManagement";
import AdminSecurity from "./AdminSecurity";
import AdminDashboard from "./admin/AdminDashboard";
import AdminDeliveryFees from "./admin/AdminDeliveryFees";
import AdminBackup from "./admin/AdminBackup";
import AdminCoupons from "./admin/AdminCoupons";
import AdminPaymentMethods from "./admin/AdminPaymentMethods";
import AdminRestaurantAccounts from "./admin/AdminRestaurantAccounts";
import RestaurantStatementPage from "./admin/RestaurantStatementPage";
import AdminFlutterNotifications from "./admin/AdminFlutterNotifications";
import AdminWasalniRequests from "./admin/AdminWasalniRequests";
import AdminDriverTracking from "./admin/AdminDriverTracking";
import AdminInvoiceDesign from "./admin/AdminInvoiceDesign";
import AdminBusinessHours from "./AdminBusinessHours";
import AdminSpecialOffers from "./AdminSpecialOffers";
import AdminSettings from "./AdminSettings";
import RestaurantSections from "./RestaurantSections";
import RatingsManagement from "./RatingsManagement";
import WalletManagement from "./WalletManagement";
import NotFound from "./not-found";
import React from "react";
import AdminErrorBoundary from "@/components/AdminErrorBoundary";

interface AdminAppProps {
  onLogout?: () => void;
}

export const AdminApp: React.FC<AdminAppProps> = () => {
  return (
    <AdminLayout>
      <AdminErrorBoundary>
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/restaurants" component={AdminRestaurants} />
        <Route path="/admin/menu-items" component={AdminMenuItems} />
        <Route path="/admin/drivers" component={AdminDrivers} />
        <Route path="/admin/driver-tracking" component={AdminDriverTracking} />
        <Route path="/admin/delivery-fees" component={AdminDeliveryFees} />
        <Route path="/admin/offers" component={AdminOffers} />
        <Route path="/admin/special-offers" component={AdminSpecialOffers} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/profile" component={AdminProfile} />
        <Route path="/admin/financial-reports" component={AdminFinancialReports} />
        <Route path="/admin/hr-management" component={AdminHRManagement} />
        <Route path="/admin/security" component={AdminSecurity} />
        <Route path="/admin/ui-settings" component={AdminUiSettings} />
        <Route path="/admin/settings" component={() => { const [, setLocation] = useLocation(); React.useEffect(() => { setLocation('/admin/ui-settings'); }, []); return null; }} />
        <Route path="/admin/ratings" component={RatingsManagement} />
        <Route path="/admin/wallet" component={WalletManagement} />
        <Route path="/admin/backup" component={AdminBackup} />
        <Route path="/admin/coupons" component={AdminCoupons} />
        <Route path="/admin/payment-methods" component={AdminPaymentMethods} />
        <Route path="/admin/restaurant-accounts" component={AdminRestaurantAccounts} />
        <Route path="/admin/restaurant-accounts/:restaurantId/statement" component={RestaurantStatementPage} />
        <Route path="/admin/restaurant-sections" component={RestaurantSections} />
        <Route path="/admin/business-hours" component={AdminBusinessHours} />
        <Route path="/admin/notifications" component={AdminFlutterNotifications} />
        <Route path="/admin/wasalni" component={AdminWasalniRequests} />
        <Route path="/admin/invoice-design" component={AdminInvoiceDesign} />
        <Route component={NotFound} />
      </Switch>
      </AdminErrorBoundary>
    </AdminLayout>
  );
};

export default AdminApp;
