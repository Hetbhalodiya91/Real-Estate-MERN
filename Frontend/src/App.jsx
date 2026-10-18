import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import PropertiesPage from "./pages/PropertiesPage";
import PropertyDetailsPage from "./pages/PropertyDetailsPage";
import SellPage from "./pages/SellPage";
import MyPropertiesPage from "./pages/MyPropertiesPage";
import PaymentPage from "./pages/Payment";
import PaymentHistoryPage from "./pages/PaymentHistory";
import AdminPage from "./pages/AdminPage";
import SellerInquiriesPage from "./pages/SellerInquiriesPage";
import BuyerInquiriesPage from "./pages/BuyerInquiriesPage";
import WishlistPage from "./pages/WishlistPage";
import ChatsPage from "./pages/ChatsPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/property/:id" element={<PropertyDetailsPage />} />
        <Route
          path="/sell"
          element={
            <ProtectedRoute allowRoles={["seller"]}>
              <SellPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-properties"
          element={
            <ProtectedRoute allowRoles={["seller"]}>
              <MyPropertiesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment/:propertyId"
          element={
            <ProtectedRoute allowRoles={["seller"]}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payment-history"
          element={
            <ProtectedRoute allowRoles={["seller"]}>
              <PaymentHistoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller/inquiries"
          element={
            <ProtectedRoute allowRoles={["seller"]}>
              <SellerInquiriesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/inquiries"
          element={
            <ProtectedRoute allowRoles={["buyer"]}>
              <BuyerInquiriesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chats"
          element={
            <ProtectedRoute allowRoles={["buyer", "seller"]}>
              <ChatsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chats/:chatId"
          element={
            <ProtectedRoute allowRoles={["buyer", "seller"]}>
              <ChatsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/wishlist"
          element={
            <ProtectedRoute allowRoles={["buyer"]}>
              <WishlistPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowRoles={["admin"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
