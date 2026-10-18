import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import PropertyCard from "../components/PropertyCard";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const HomePage = () => {
  const { user, token } = useAuth();
  const canListProperty = !user || user.role === "seller";
  const [featured, setFeatured] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const response = await axios.get(`${API_URL}/property`);
        setFeatured((response.data.properties || []).slice(0, 4));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadFeatured();
  }, []);

  useEffect(() => {
    if (user?.role !== "buyer" || !token) {
      return;
    }

    axios
      .get(`${API_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) =>
        setWishlist(
          (response.data || []).map(
            (item) => item.property?._id || item.property,
          ),
        ),
      )
      .catch(() => setWishlist([]));
  }, [token, user?.role]);

  const toggleWishlist = async (propertyId) => {
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      if (wishlist.includes(propertyId)) {
        await axios.delete(`${API_URL}/wishlist/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWishlist((current) => current.filter((id) => id !== propertyId));
      } else {
        await axios.post(
          `${API_URL}/wishlist/${propertyId}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        setWishlist((current) => [...current, propertyId]);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-xl md:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50">
              Trusted real estate platform
            </span>
            <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
              Discover your next address.
            </h1>
            <p className="mt-4 max-w-xl text-base text-emerald-50 md:text-lg">
              Explore premium homes, investment-ready properties, and verified
              listings from trusted sellers.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/properties"
                className="rounded-full bg-white px-6 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50"
              >
                Browse properties
              </Link>
              {canListProperty && (
                <Link
                  to="/sell"
                  className="rounded-full border border-white/60 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  List your property
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-[28px] bg-white/10 p-5 backdrop-blur-sm ring-1 ring-white/20">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-sm text-emerald-50">New listings</div>
                <div className="mt-2 text-3xl font-black">480+</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-sm text-emerald-50">Happy buyers</div>
                <div className="mt-2 text-3xl font-black">12k</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-sm text-emerald-50">Average ROI</div>
                <div className="mt-2 text-3xl font-black">18%</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <div className="text-sm text-emerald-50">Verified agents</div>
                <div className="mt-2 text-3xl font-black">230</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Featured homes
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Popular properties
            </h2>
          </div>
          <Link
            to="/properties"
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Explore all →
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-80 animate-pulse rounded-2xl bg-slate-200"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featured.map((property) => (
              <PropertyCard
                key={property._id}
                property={property}
                isSaved={wishlist.includes(property._id)}
                onWishlistToggle={
                  user?.role === "buyer" ? toggleWishlist : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Prime residential neighborhoods",
            text: "Find homes in the most in-demand communities with strong amenities and excellent commute access.",
          },
          {
            title: "Investment-focused buying",
            text: "Track high-growth areas, rising demand zones, and properties with long-term value potential.",
          },
          {
            title: "Transparent, secure deals",
            text: "Every listing is verified and every transaction is backed by a clear, trusted process.",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 h-12 w-12 rounded-xl bg-emerald-100 text-2xl">
              ✓
            </div>
            <h3 className="text-xl font-semibold text-slate-900">
              {feature.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {feature.text}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default HomePage;
