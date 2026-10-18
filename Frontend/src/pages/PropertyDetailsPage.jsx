import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const PropertyDetailsPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const ownerView =
    searchParams.get("owner") === "1" && user?.role === "seller";
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishlist, setWishlist] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const response = await axios.get(
          ownerView
            ? `${API_URL}/property/my/${id}`
            : `${API_URL}/property/${id}`,
          ownerView ? { headers: { Authorization: `Bearer ${token}` } } : {},
        );
        if (response.data.success) setProperty(response.data.property);
      } catch (err) {
        setError(err.response?.data?.message || "Property not found.");
      } finally {
        setLoading(false);
      }
    };

    const fetchWishlist = async () => {
      if (!token || user?.role !== "buyer") return;
      try {
        const response = await axios.get(`${API_URL}/wishlist`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ids = (response.data || []).map(
          (item) => item.property?._id || item.property,
        );
        setWishlist(ids.includes(id));
      } catch (error) {
        console.error(error);
      }
    };

    fetchProperty();
    fetchWishlist();
  }, [id, ownerView, token, user?.role]);

  const gallery = useMemo(() => {
    if (!property?.images?.length)
      return [
        "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
      ];
    return property.images;
  }, [property]);

  const handleWishlistToggle = async () => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    if (user?.role !== "buyer") return;

    try {
      if (wishlist) {
        await axios.delete(`${API_URL}/wishlist/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(
          `${API_URL}/wishlist/${id}`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      }
      setWishlist((prev) => !prev);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartChat = async () => {
    if (!token || user?.role !== "buyer") {
      window.location.href = "/login";
      return;
    }

    setStartingChat(true);
    try {
      const response = await axios.post(
        `${API_URL}/chat/start`,
        { propertyId: id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      navigate(`/chats/${response.data.chat._id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Unable to start chat");
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center text-slate-600">
        Loading property details...
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        {error || "Property not found."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 md:grid-cols-2">
          <img
            src={gallery[0]}
            alt={property.title}
            className="h-[420px] w-full rounded-2xl object-cover"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {gallery.slice(1, 5).map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${property.title} ${index + 1}`}
                className="h-48 w-full rounded-2xl object-cover"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-600">
                  {property.propertyType}
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">
                  {property.title}
                </h1>
              </div>
              {user?.role === "buyer" && (
                <button
                  onClick={handleWishlistToggle}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {wishlist ? "♥ Saved to wishlist" : "♡ Add to wishlist"}
                </button>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {property.city}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {property.area}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {property.bhk || "N/A"} BHK
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">
                {property.furnishing || "Unspecified"}
              </span>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="text-3xl font-black text-emerald-600">
                ₹{Number(property.price).toLocaleString("en-IN")}
              </div>
              <p className="mt-4 leading-7 text-slate-600">
                {property.description}
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-2xl font-bold text-slate-900">Key features</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Bathrooms</div>
                <div className="mt-2 text-xl font-semibold">
                  {property.bathrooms || "N/A"}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Area size</div>
                <div className="mt-2 text-xl font-semibold">
                  {property.areaSize || "N/A"} sq ft
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Listing type</div>
                <div className="mt-2 text-xl font-semibold capitalize">
                  For {property.listingType || "sale"}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Amenities
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {(property.amenities || []).map((amenity) => (
                  <span
                    key={amenity}
                    className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Contact seller</h2>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">
                {property.seller?.name || "Seller"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {property.seller?.email || "Email unavailable"}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {property.seller?.phone || "Phone unavailable"}
              </div>
            </div>

            {user?.role === "buyer" && (
              <button
                onClick={handleStartChat}
                disabled={startingChat}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {startingChat ? "Opening chat..." : "Message seller"}
              </button>
            )}
            {user?.role === "seller" && (
              <Link
                to={`/payment/${property._id}`}
                className="mt-3 block w-full rounded-xl border border-slate-300 px-4 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Pay listing fee
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PropertyDetailsPage;
