import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const BuyerInquiriesPage = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadInquiries = setTimeout(async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(`${API_URL}/inquiry/buyer`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInquiries(response.data.inquiries || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load inquiries.");
      } finally {
        setLoading(false);
      }
    }, 0);
    return () => clearTimeout(loadInquiries);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Buyer inbox
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">My inquiries</h1>
        <p className="mt-2 text-slate-600">
          See replies from property sellers.
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
          You have not sent any inquiries yet.
        </div>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <article
              key={inquiry._id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {inquiry.property?.title || "Property inquiry"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Seller: {inquiry.seller?.name || "Seller"}
              </p>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-slate-700">
                <span className="font-semibold">Your message:</span>{" "}
                {inquiry.message}
              </div>
              <div
                className={`mt-3 rounded-2xl p-4 ${inquiry.sellerReply ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
              >
                {inquiry.sellerReply ? (
                  <>
                    <span className="font-semibold">Seller reply:</span>{" "}
                    {inquiry.sellerReply}
                  </>
                ) : (
                  "Waiting for the seller's reply."
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerInquiriesPage;
