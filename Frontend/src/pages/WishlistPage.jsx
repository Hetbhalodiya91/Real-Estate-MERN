import { useEffect, useState } from "react";
import axios from "axios";
import PropertyCard from "../components/PropertyCard";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const WishlistPage = () => {
  const { token } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const response = await axios.get(`${API_URL}/wishlist`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProperties(
          (response.data || []).map((item) => item.property).filter(Boolean),
        );
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load your wishlist.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [token]);

  const removeFromWishlist = async (propertyId) => {
    try {
      await axios.delete(`${API_URL}/wishlist/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProperties((current) =>
        current.filter((property) => property._id !== propertyId),
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to update your wishlist.",
      );
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Your saved homes
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Wishlist</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-600">
          Loading your wishlist...
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            Your wishlist is empty
          </h2>
          <p className="mt-2 text-slate-600">
            Save properties you like and they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property._id}
              property={property}
              isSaved
              onWishlistToggle={removeFromWishlist}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default WishlistPage;
