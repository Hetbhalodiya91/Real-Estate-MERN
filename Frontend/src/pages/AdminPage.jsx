import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const AdminPage = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProperties: 0,
    activeListings: 0,
    soldProperties: 0,
  });
  const [users, setUsers] = useState([]);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [reviewProperty, setReviewProperty] = useState(null);
  const [rejectionProperty, setRejectionProperty] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [verificationAction, setVerificationAction] = useState(null);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const propertyCounts = properties.reduce(
    (counts, property) => {
      const status = String(
        property.verificationStatus ||
          (property.isVerified ? "APPROVED" : "PENDING"),
      ).toUpperCase();
      if (Object.hasOwn(counts, status)) counts[status] += 1;
      return counts;
    },
    { PENDING: 0, APPROVED: 0, REJECTED: 0 },
  );
  const listingFee = Number(stats.listingFee || 499);
  const totalFeesCollected = propertyCounts.APPROVED * listingFee;
  const totalRefunds = propertyCounts.REJECTED * listingFee;

  useEffect(() => {
    const token = localStorage.getItem("token");
    const fetchAdminData = async () => {
      try {
        const [statsRes, usersRes, sellersRes, propertiesRes] =
          await Promise.all([
            axios.get(`${API_URL}/admin/stats`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`${API_URL}/admin/users`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`${API_URL}/admin/pending-sellers`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get(`${API_URL}/admin/properties`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

        setStats(statsRes.data.stats || {});
        setUsers(usersRes.data.users || []);
        setPendingSellers(sellersRes.data.pendingSellers || []);
        setProperties(propertiesRes.data.properties || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const handleApproveSeller = async (sellerId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `${API_URL}/admin/approve-seller/${sellerId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setPendingSellers((prev) =>
        prev.filter((seller) => seller._id !== sellerId),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleBlock = async (userId, isBlocked) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `${API_URL}/admin/users/${userId}/block`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUsers((prev) =>
        prev.map((user) =>
          user._id === userId ? { ...user, isBlock: !isBlocked } : user,
        ),
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handlePropertyVerification = async (
    propertyId,
    status,
    reason = "",
  ) => {
    const token = localStorage.getItem("token");
    setVerificationAction(`${propertyId}:${status}`);
    setVerificationMessage("");
    setVerificationError("");
    try {
      const response = await axios.patch(
        `${API_URL}/admin/properties/${propertyId}/verification`,
        { status, reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setProperties((prev) =>
        prev.map((property) =>
          property._id === propertyId ? response.data.property : property,
        ),
      );
      try {
        const statsResponse = await axios.get(`${API_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(statsResponse.data.stats || {});
      } catch (statsError) {
        console.error("Could not refresh admin dashboard stats:", statsError);
      }
      if (status === "REJECTED") {
        setRejectionProperty(null);
        setRejectionReason("");
      }
      setVerificationMessage(
        response.data.message || "Property status updated.",
      );
    } catch (error) {
      setVerificationError(
        error.response?.data?.message ||
          "Could not update property verification status.",
      );
    } finally {
      setVerificationAction(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center text-slate-600">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Admin area
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Platform overview
        </h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total users", value: stats.totalUsers },
          { label: "Total properties", value: properties.length },
          { label: "Active listings", value: stats.activeListings },
          { label: "Awaiting review", value: propertyCounts.PENDING },
          { label: "Approved listings", value: propertyCounts.APPROVED },
          { label: "Rejected listings", value: propertyCounts.REJECTED },
          { label: "Pending sellers", value: pendingSellers.length },
          {
            label: "Fees collected",
            value: `₹${totalFeesCollected.toLocaleString("en-IN")}`,
          },
          {
            label: "Refunds issued",
            value: `₹${totalRefunds.toLocaleString("en-IN")}`,
          },
          {
            label: "Net listing revenue",
            value: `₹${(totalFeesCollected - totalRefunds).toLocaleString("en-IN")}`,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="text-sm text-slate-500">{item.label}</div>
            <div className="mt-3 text-3xl font-black text-slate-900">
              {item.value}
            </div>
            {item.detail && (
              <div className="mt-1 text-xs text-slate-500">{item.detail}</div>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Pending seller approvals
          </h2>
          <div className="mt-5 space-y-3">
            {pendingSellers.length === 0 ? (
              <p className="text-slate-500">No pending seller approvals.</p>
            ) : (
              pendingSellers.map((seller) => (
                <div
                  key={seller._id}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      {seller.name}
                    </div>
                    <div className="text-sm text-slate-500">{seller.email}</div>
                  </div>
                  <button
                    onClick={() => handleApproveSeller(seller._id)}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-900">
            Property verification
          </h2>
          {verificationMessage && (
            <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {verificationMessage}
            </p>
          )}
          {verificationError && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {verificationError}
            </p>
          )}
          <div className="mt-5 space-y-3">
            {properties.length === 0 ? (
              <p className="text-slate-500">No properties submitted yet.</p>
            ) : (
              properties.map((property) => {
                const isPaid = property.paymentStatus === "PAID";
                const verificationStatus =
                  property.verificationStatus || "PENDING";

                return (
                  <div
                    key={property._id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {property.title}
                      </div>
                      <div className="text-sm text-slate-500">
                        {property.seller?.name || "Unknown seller"} ·{" "}
                        {property.seller?.email || ""}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Fee:{" "}
                        {property.paymentStatus === "REFUNDED"
                          ? "Refunded"
                          : isPaid
                            ? "Paid"
                            : "Unpaid"}{" "}
                        · Verification: {verificationStatus}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setReviewProperty(property)}
                        type="button"
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Review
                      </button>
                      <button
                        onClick={() =>
                          handlePropertyVerification(property._id, "APPROVED")
                        }
                        type="button"
                        disabled={
                          !isPaid ||
                          verificationStatus === "APPROVED" ||
                          verificationAction !== null
                        }
                        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {verificationAction === `${property._id}:APPROVED`
                          ? "Approving..."
                          : "Approve"}
                      </button>
                      <button
                        onClick={() => {
                          setRejectionProperty(property);
                          setRejectionReason("");
                        }}
                        type="button"
                        disabled={
                          !isPaid ||
                          verificationStatus === "REJECTED" ||
                          verificationAction !== null
                        }
                        className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">User management</h2>
          <div className="mt-5 space-y-3">
            {users.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"
              >
                <div>
                  <div className="font-semibold text-slate-800">
                    {user.name}
                  </div>
                  <div className="text-sm text-slate-500">
                    {user.email} • {user.role}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleBlock(user._id, user.isBlock)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${user.isBlock ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}
                >
                  {user.isBlock ? "Unblock" : "Block"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      {reviewProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="property-review-title"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <header className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Property review
                </p>
                <h2
                  id="property-review-title"
                  className="mt-1 text-2xl font-bold text-slate-900"
                >
                  {reviewProperty.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReviewProperty(null)}
                aria-label="Close property review"
                className="rounded-full border border-slate-300 px-3 py-1 text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </header>

            <div className="space-y-6 p-6">
              {reviewProperty.images?.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {reviewProperty.images.map((image, index) => (
                    <img
                      key={image}
                      src={image}
                      alt={`${reviewProperty.title}, image ${index + 1}`}
                      className="h-48 w-full rounded-xl object-cover"
                    />
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  [
                    "Price",
                    `₹${Number(reviewProperty.price || 0).toLocaleString("en-IN")}`,
                  ],
                  [
                    "Listing type",
                    `For ${reviewProperty.listingType || "sale"}`,
                  ],
                  [
                    "Property type",
                    reviewProperty.propertyType || "Not specified",
                  ],
                  [
                    "Location",
                    `${reviewProperty.area || ""}, ${reviewProperty.city || ""} ${reviewProperty.pincode || ""}`,
                  ],
                  ["Bedrooms", reviewProperty.bhk || "Not specified"],
                  ["Bathrooms", reviewProperty.bathrooms || "Not specified"],
                  [
                    "Area",
                    reviewProperty.areaSize
                      ? `${reviewProperty.areaSize} sq ft`
                      : "Not specified",
                  ],
                  ["Furnishing", reviewProperty.furnishing || "Not specified"],
                  ["Payment", reviewProperty.paymentStatus || "Not specified"],
                  [
                    "Verification",
                    reviewProperty.verificationStatus || "PENDING",
                  ],
                  [
                    "Rejection reason",
                    reviewProperty.rejectionReason || "Not applicable",
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-4">
                    <div className="text-sm text-slate-500">{label}</div>
                    <div className="mt-1 font-semibold capitalize text-slate-900">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">Description</h3>
                <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">
                  {reviewProperty.description || "No description provided."}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">Amenities</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {reviewProperty.amenities?.length ? (
                    reviewProperty.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800"
                      >
                        {amenity}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      No amenities listed.
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900">Seller</h3>
                <p className="mt-2 text-sm text-slate-700">
                  {reviewProperty.seller?.name || "Unknown seller"}
                </p>
                <p className="text-sm text-slate-600">
                  {reviewProperty.seller?.email || "Email unavailable"}
                </p>
                <p className="text-sm text-slate-600">
                  {reviewProperty.seller?.phone || "Phone unavailable"}
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {rejectionProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="property-rejection-title"
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
          >
            <h2
              id="property-rejection-title"
              className="text-xl font-bold text-slate-900"
            >
              Reject {rejectionProperty.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              A full listing-fee refund will be initiated, and the seller will
              receive this reason by email.
            </p>
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                handlePropertyVerification(
                  rejectionProperty._id,
                  "REJECTED",
                  rejectionReason,
                );
              }}
            >
              <label
                className="block text-sm font-medium text-slate-700"
                htmlFor="rejection-reason"
              >
                Reason for rejection
              </label>
              <textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                maxLength={1000}
                required
                rows={4}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-red-500"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectionProperty(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    verificationAction !== null || !rejectionReason.trim()
                  }
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {verificationAction === `${rejectionProperty._id}:REJECTED`
                    ? "Rejecting..."
                    : "Reject and refund"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
