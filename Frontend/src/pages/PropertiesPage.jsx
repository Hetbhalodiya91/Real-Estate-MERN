import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import PropertyCard from "../components/PropertyCard";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const defaultFilters = {
  city: "",
  propertyType: "",
  listingType: "",
  bhk: "",
  minPrice: "",
  maxPrice: "",
  furnishing: "",
};

const PropertiesPage = () => {
  const { user, token } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(defaultFilters);
  const [wishlist, setWishlist] = useState([]);

  const fetchProperties = async (params = {}) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) query.append(key, value);
      });

      const response = await axios.get(
        `${API_URL}/property?${query.toString()}`,
      );
      setProperties(response.data.properties || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load listings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = setTimeout(() => {
      fetchProperties();
      if (user?.role === "buyer" && token) {
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
      }
    }, 0);
    return () => clearTimeout(loadData);
  }, [token, user?.role]);

  const filteredCount = useMemo(() => properties.length, [properties]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = () => {
    fetchProperties(filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    fetchProperties();
  };

  const toggleWishlist = async (propertyId) => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    if (user?.role !== "buyer") return;

    try {
      const isSaved = wishlist.includes(propertyId);
      if (isSaved) {
        await axios.delete(`${API_URL}/wishlist/${propertyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setWishlist((prev) => prev.filter((id) => id !== propertyId));
      } else {
        await axios.post(
          `${API_URL}/wishlist/${propertyId}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setWishlist((prev) => [...prev, propertyId]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 to-slate-700 p-8 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Find your home
        </p>
        <h1 className="mt-3 text-3xl font-black md:text-5xl">
          Search properties that match your lifestyle
        </h1>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
          <input
            name="city"
            value={filters.city}
            onChange={handleFilterChange}
            placeholder="City"
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
          />
          <select
            name="propertyType"
            value={filters.propertyType}
            onChange={handleFilterChange}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
          >
            <option value="">Property type</option>
            <option value="flat">Flat</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="house">House</option>
            <option value="plot">Plot</option>
            <option value="commercial">Commercial</option>
          </select>
          <select
            name="listingType"
            value={filters.listingType}
            onChange={handleFilterChange}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
          >
            <option value="">Sale or rent</option>
            <option value="sale">For sale</option>
            <option value="rent">For rent</option>
          </select>
          <select
            name="bhk"
            value={filters.bhk}
            onChange={handleFilterChange}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
          >
            <option value="">BHK</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4 BHK</option>
            <option value="5+">5+ BHK</option>
          </select>
          <input
            name="minPrice"
            type="number"
            value={filters.minPrice}
            onChange={handleFilterChange}
            placeholder="Min price"
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
          />
          <input
            name="maxPrice"
            type="number"
            value={filters.maxPrice}
            onChange={handleFilterChange}
            placeholder="Max price"
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
          />
          <select
            name="furnishing"
            value={filters.furnishing}
            onChange={handleFilterChange}
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
          >
            <option value="">Furnishing</option>
            <option value="furnished">Furnished</option>
            <option value="semi-furnished">Semi-furnished</option>
            <option value="unfurnished">Unfurnished</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleApplyFilters}
            className="rounded-full bg-emerald-600 px-5 py-2.5 font-medium text-white hover:bg-emerald-700"
          >
            Apply filters
          </button>
          <button
            onClick={handleReset}
            className="rounded-full border border-slate-300 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100"
          >
            Reset
          </button>
          <span className="self-center text-sm text-slate-500">
            {filteredCount} listings
          </span>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-80 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <h3 className="text-xl font-semibold text-slate-900">
            No properties found
          </h3>
          <p className="mt-2 text-slate-500">
            Try clearing the filters or expand your search range.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
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
    </div>
  );
};

export default PropertiesPage;
