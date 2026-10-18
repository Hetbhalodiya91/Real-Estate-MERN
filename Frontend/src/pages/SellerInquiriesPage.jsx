import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const SellerInquiriesPage = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  const fetchInquiries = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Authentication required.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/inquiry/seller`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInquiries(response.data.inquiries || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load inquiries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadInquiries = setTimeout(fetchInquiries, 0);
    return () => clearTimeout(loadInquiries);
  }, []);

  const markAsRead = async (inquiryId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `${API_URL}/inquiry/${inquiryId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setInquiries((current) =>
        current.map((inquiry) =>
          inquiry._id === inquiryId ? { ...inquiry, isRead: true } : inquiry,
        ),
      );
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update inquiry.");
    }
  };

  const sendReply = async (inquiryId) => {
    const reply = replyDrafts[inquiryId]?.trim();
    if (!reply) return;

    const token = localStorage.getItem("token");
    setReplyingTo(inquiryId);
    setError("");
    try {
      const response = await axios.patch(
        `${API_URL}/inquiry/${inquiryId}/reply`,
        { reply },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setInquiries((current) =>
        current.map((inquiry) =>
          inquiry._id === inquiryId
            ? { ...inquiry, ...response.data.inquiry }
            : inquiry,
        ),
      );
      setReplyDrafts((current) => ({ ...current, [inquiryId]: "" }));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send reply.");
    } finally {
      setReplyingTo(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Seller inbox
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Buyer inquiries
        </h1>
        <p className="mt-2 text-slate-600">
          Questions sent by buyers about your properties.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl bg-white p-12 text-center text-slate-600">
          Loading inquiries...
        </div>
      ) : inquiries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-600">
          No buyer inquiries yet.
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <article
              key={inquiry._id}
              className={`rounded-3xl border bg-white p-6 shadow-sm ${
                inquiry.isRead ? "border-slate-200" : "border-emerald-300"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {inquiry.property?.title || "Property inquiry"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    From {inquiry.buyer?.name || "Buyer"} ·{" "}
                    {inquiry.buyer?.email || "No email"}
                  </p>
                </div>
                <span className="text-sm text-slate-500">
                  {new Date(inquiry.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-slate-700">
                {inquiry.message}
              </p>
              {inquiry.sellerReply && (
                <p className="mt-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900">
                  <span className="font-semibold">Your reply:</span>{" "}
                  {inquiry.sellerReply}
                </p>
              )}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={replyDrafts[inquiry._id] || ""}
                  onChange={(event) =>
                    setReplyDrafts((current) => ({
                      ...current,
                      [inquiry._id]: event.target.value,
                    }))
                  }
                  placeholder="Write a reply to the buyer..."
                  className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2 outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => sendReply(inquiry._id)}
                  disabled={
                    replyingTo === inquiry._id ||
                    !replyDrafts[inquiry._id]?.trim()
                  }
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {replyingTo === inquiry._id ? "Sending..." : "Send reply"}
                </button>
              </div>
              {!inquiry.isRead && (
                <button
                  type="button"
                  onClick={() => markAsRead(inquiry._id)}
                  className="mt-4 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Mark as read
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerInquiriesPage;
