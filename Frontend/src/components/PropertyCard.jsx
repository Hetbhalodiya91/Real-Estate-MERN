import { Link } from "react-router-dom";

const defaultImage =
  "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80";

const PropertyCard = ({ property, onWishlistToggle, isSaved = false }) => {
  const firstImage = property?.images?.[0] || defaultImage;

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative">
        <img
          src={firstImage}
          alt={property?.title || "Property"}
          className="h-56 w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
          {property?.propertyType || "Property"}
        </div>
        {onWishlistToggle && (
          <button
            type="button"
            onClick={() => onWishlistToggle(property?._id)}
            className="absolute right-4 top-4 flex h-10 items-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white"
            aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
            title={isSaved ? "Remove from wishlist" : "Add to wishlist"}
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {isSaved ? "♥" : "♡"}
            </span>
            {isSaved ? "Saved" : "Save"}
          </button>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {property?.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {property?.city}, {property?.area}
            </p>
          </div>
          <span className="text-lg font-bold text-emerald-600">
            ₹{Number(property?.price || 0).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-2 py-1">
            {property?.bhk || "N/A"} BHK
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1">
            {property?.furnishing || "Unspecified"}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-1">
            {property?.listingType === "rent" ? "For rent" : "For sale"}
          </span>
        </div>

        <p className="line-clamp-2 text-sm text-slate-600">
          {property?.description}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {property?.amenities?.length || 0} amenities
          </span>
          <Link
            to={`/property/${property?._id}`}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
