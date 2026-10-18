import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const MyPropertiesPage = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMyProperties = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/property/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProperties(response.data.properties || []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load your properties.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadProperties = setTimeout(fetchMyProperties, 0);
    return () => clearTimeout(loadProperties);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Seller dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            My properties
          </h1>
        </div>
        <Link
          to="/sell"
          className="rounded-full bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700"
        >
          + Add property
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-xl font-semibold text-slate-900">
            No listings yet
          </h3>
          <p className="mt-2 text-slate-600">
            Start by adding your first property to the marketplace.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) =>
            (() => {
              const isPaid = property.paymentStatus === "PAID";
              const isRefunded = property.paymentStatus === "REFUNDED";
              const isRejected = property.verificationStatus === "REJECTED";
              const verificationStatus =
                property.verificationStatus || "PENDING";

              return (
                <div
                  key={property._id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <img
                    src={
                      property.images?.[0] ||
                      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80"
                    }
                    alt={property.title}
                    className="h-52 w-full object-cover"
                  />
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {property.title}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {property.city}, {property.area}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isRefunded
                            ? "bg-blue-50 text-blue-700"
                            : isPaid
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {isRefunded
                          ? "Fee refunded"
                          : isPaid
                            ? "Fee paid"
                            : "Fee unpaid"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>
                        ₹{Number(property.price).toLocaleString("en-IN")}
                      </span>
                      <span>
                        {verificationStatus === "PENDING"
                          ? isPaid
                            ? "Awaiting admin review"
                            : "Payment required"
                          : verificationStatus}
                      </span>
                    </div>

                    {isRejected && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        <p className="font-semibold">
                          This listing was rejected.
                        </p>
                        {property.rejectionReason && (
                          <p className="mt-1">
                            Reason: {property.rejectionReason}
                          </p>
                        )}
                        <p className="mt-1">
                          Your listing fee refund has been initiated and should
                          appear in your original payment account within 2-3
                          working days.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Link
                        to={`/property/${property._id}?owner=1`}
                        className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-center font-medium text-slate-700 hover:bg-slate-100"
                      >
                        View
                      </Link>
                      {!isPaid && !isRejected && !isRefunded && (
                        <Link
                          to={`/payment/${property._id}`}
                          className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center font-medium text-white hover:bg-emerald-700"
                        >
                          Pay fee
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })(),
          )}
        </div>
      )}
    </div>
  );
};

export default MyPropertiesPage;
