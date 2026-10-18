import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const Payment = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);

  const LISTING_FEE = 499;
  // Fetch property details
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        let response;
        try {
          response = await axios.get(`${API_URL}/property/my/${propertyId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (detailError) {
          if (detailError.response?.status !== 404) throw detailError;

          const propertiesResponse = await axios.get(`${API_URL}/property/my`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const property = (propertiesResponse.data.properties || []).find(
            (item) => item._id === propertyId,
          );

          if (!property) {
            throw new Error("This property is not in your seller account.", {
              cause: detailError,
            });
          }

          setProperty(property);
          return;
        }

        if (response.data.success) {
          setProperty(response.data.property);
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load property details",
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperty();
  }, [propertyId, token]);

  // Handle payment creation and open Razorpay checkout
  const handlePayment = async () => {
    if (!paymentMethod) {
      setError("Please select a payment method");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      if (!token) {
        setError("Authentication required");
        setProcessing(false);
        return;
      }

      // Step 1: Create payment record and get Razorpay order ID
      const response = await axios.post(
        `${API_URL}/payments/create`,
        {
          propertyId,
          paymentMethod,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.data.success) {
        setError(response.data.message || "Failed to create payment");
        setProcessing(false);
        return;
      }

      const paymentData = response.data.payment;
      setPaymentDetails(paymentData);
      let attemptClosed = false;
      const closePaymentAttempt = async (message) => {
        if (attemptClosed) return;
        attemptClosed = true;
        try {
          await axios.post(
            `${API_URL}/payments/fail`,
            { paymentId: paymentData.id },
            { headers: { Authorization: `Bearer ${token}` } },
          );
        } catch (closeError) {
          console.error("Could not close payment attempt:", closeError);
        }
        setPaymentDetails(null);
        setError(message);
        setProcessing(false);
      };

      // Step 2: Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "your_razorpay_key_id",
        amount: LISTING_FEE * 100, // Amount in paise
        currency: "INR",
        name: "EstateHub",
        description: "Property Listing Fee",
        order_id: paymentData.gatewayOrderId,
        modal: {
          ondismiss: () =>
            closePaymentAttempt(
              "Payment cancelled. You can try again anytime.",
            ),
        },
        handler: async (razorpayResponse) => {
          attemptClosed = true;
          try {
            // Step 3: Verify payment on backend
            const verifyResponse = await axios.post(
              `${API_URL}/payments/verify`,
              {
                paymentId: paymentData.id,
                razorpayOrderId: razorpayResponse.razorpay_order_id,
                razorpayPaymentId: razorpayResponse.razorpay_payment_id,
                razorpaySignature: razorpayResponse.razorpay_signature,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            );

            if (verifyResponse.data.success) {
              setSuccess(true);
              setTimeout(() => {
                navigate("/my-properties");
              }, 2000);
            } else {
              setPaymentDetails(null);
              setError(
                verifyResponse.data.message || "Payment verification failed",
              );
            }
          } catch (verifyErr) {
            setPaymentDetails(null);
            setError(
              verifyErr.response?.data?.message ||
                "Error verifying payment. Please try again.",
            );
            console.error("Payment verification error:", verifyErr);
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          method: paymentMethod.toLowerCase(),
        },
        theme: {
          color: "#3399cc",
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", function (response) {
        closePaymentAttempt(
          `Payment failed: ${response.error.description || "Unknown error"}. You can try again.`,
        );
      });

      razorpay.open();
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      setError(
        err.response?.data?.message ||
          "Error creating payment. Please try again.",
      );
      console.error("Payment creation error:", err);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-lg">
            {error || "Property not found"}
          </p>
          <button
            onClick={() => navigate("/my-properties")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to My Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/my-properties")}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Back to My Properties
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Complete Payment</h1>
          <p className="text-gray-600 mt-2">
            Pay the listing fee to submit your property for admin verification
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Property Summary */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Property Summary
              </h2>

              <div className="flex gap-4 mb-4">
                {property.images && property.images[0] && (
                  <img
                    src={property.images[0]}
                    alt={property.title}
                    className="w-32 h-32 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {property.title}
                  </h3>
                  <p className="text-gray-600 mt-1">{property.description}</p>
                  <p className="text-blue-600 font-semibold mt-2">
                    ₹{property.price?.toLocaleString("en-IN")}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {property.city}, {property.area}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Method Selection */}
            {!paymentDetails && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Select Payment Method
                </h2>

                <div className="space-y-3">
                  {["UPI", "CARD", "NET_BANKING", "WALLET"].map((method) => (
                    <label
                      key={method}
                      className="flex items-center p-3 border-2 rounded cursor-pointer transition"
                      style={{
                        borderColor:
                          paymentMethod === method ? "#2563eb" : "#e5e7eb",
                        backgroundColor:
                          paymentMethod === method ? "#eff6ff" : "white",
                      }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="ml-3 text-gray-900 font-medium">
                        {method === "NET_BANKING"
                          ? "Net Banking"
                          : method === "WALLET"
                            ? "Digital Wallet"
                            : method}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Development Notice */}
            {paymentDetails && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Development Mode:</strong> Payment gateway integration
                  is pending. This is a test environment only.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 font-semibold">
                  ✓ Payment successful! Your property has been submitted for
                  admin verification.
                </p>
                <p className="text-green-700 text-sm mt-2">
                  Redirecting to your properties...
                </p>
              </div>
            )}
          </div>

          {/* Payment Summary Card */}
          <div>
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Payment Details
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Listing Fee</span>
                  <span className="font-semibold text-gray-900">
                    ₹{LISTING_FEE}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Currency</span>
                  <span className="font-semibold text-gray-900">INR</span>
                </div>
                {paymentDetails && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment ID</span>
                      <span className="font-mono text-sm text-gray-900">
                        {paymentDetails.id.substring(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status</span>
                      <span
                        className={`font-semibold ${paymentDetails.status === "SUCCESS" ? "text-green-600" : "text-yellow-600"}`}
                      >
                        {paymentDetails.status}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-6">
                  <span className="text-lg font-semibold text-gray-900">
                    Amount Due
                  </span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₹{LISTING_FEE}
                  </span>
                </div>

                {!success ? (
                  <button
                    onClick={handlePayment}
                    disabled={processing || paymentDetails}
                    className="w-full bg-blue-600 text-white py-3 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {processing ? "Processing..." : `Pay ₹${LISTING_FEE}`}
                  </button>
                ) : null}
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                Your payment information is secure
              </p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            What happens next?
          </h3>
          <ul className="text-blue-800 space-y-2 text-sm">
            <li>
              ✓ After successful payment, your property will be submitted for
              admin verification
            </li>
            <li>✓ Admin will review and approve your property</li>
            <li>✓ Once approved, your property will be live on the platform</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Payment;
