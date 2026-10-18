import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const MAX_PROPERTY_IMAGES = 5;

const initialState = {
  title: "",
  description: "",
  price: "",
  city: "",
  area: "",
  pincode: "",
  propertyType: "flat",
  bhk: "2",
  bathrooms: "2",
  areaSize: "",
  furnishing: "semi-furnished",
  listingType: "sale",
  amenities: "Parking, Security, Power Backup",
};

const residentialTypes = [
  "flat",
  "apartment",
  "villa",
  "house",
  "studio",
  "penthouse",
  "townhouse",
];

const SellPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [form, setForm] = useState(initialState);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      if (name !== "propertyType") return { ...prev, [name]: value };

      const isResidential = residentialTypes.includes(value);
      return {
        ...prev,
        propertyType: value,
        bhk: isResidential ? prev.bhk || "2" : "",
        bathrooms: value === "plot" ? "" : prev.bathrooms || "2",
        furnishing: value === "plot" ? "" : prev.furnishing || "semi-furnished",
      };
    });
  };

  const handleImagesChange = (e) => {
    const selectedImages = Array.from(e.target.files || []);
    if (selectedImages.length > MAX_PROPERTY_IMAGES) {
      setImages([]);
      e.target.value = "";
      setError(`You can upload a maximum of ${MAX_PROPERTY_IMAGES} photos.`);
      return;
    }

    setImages(selectedImages);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== "seller") {
      navigate("/login");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== "") payload.append(key, value);
      });
      images.forEach((image) => payload.append("images", image));
      payload.append("status", "sale");

      const response = await axios.post(`${API_URL}/property`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        navigate(`/payment/${response.data.property._id}`);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create property listing.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Sell with confidence
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          List your property
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            minLength={5}
            maxLength={100}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            placeholder="Modern 3 BHK Apartment (5-100 characters)"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            rows={4}
            minLength={20}
            maxLength={2000}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            placeholder="Describe the property and neighborhood (20-2000 characters)"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Price
          </label>
          <input
            name="price"
            type="number"
            min="1000"
            max="1000000000"
            step="1"
            value={form.price}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            placeholder="₹1,000 to ₹1,00,00,00,000"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            City
          </label>
          <input
            name="city"
            value={form.city}
            onChange={handleChange}
            required
            minLength={2}
            maxLength={80}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            placeholder="Bengaluru"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Area
          </label>
          <input
            name="area"
            value={form.area}
            onChange={handleChange}
            required
            minLength={2}
            maxLength={80}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            placeholder="Koramangala"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Pincode
          </label>
          <input
            name="pincode"
            type="text"
            value={form.pincode}
            onChange={handleChange}
            required
            inputMode="numeric"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            placeholder="6-digit pincode"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Property type
          </label>
          <select
            name="propertyType"
            value={form.propertyType}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
          >
            <option value="flat">Flat</option>
            <option value="apartment">Apartment</option>
            <option value="villa">Villa</option>
            <option value="house">House</option>
            <option value="studio">Studio</option>
            <option value="plot">Plot</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>

        {residentialTypes.includes(form.propertyType) && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              BHK
            </label>
            <select
              name="bhk"
              value={form.bhk}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4 BHK</option>
              <option value="5">5+ BHK</option>
            </select>
          </div>
        )}

        {form.propertyType !== "plot" && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Bathrooms
            </label>
            <input
              name="bathrooms"
              type="number"
              min="1"
              max="20"
              step="0.5"
              value={form.bathrooms}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
              placeholder="2"
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Area size (sq ft)
          </label>
          <input
            name="areaSize"
            type="number"
            min="100"
            max="1000000"
            step="1"
            value={form.areaSize}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            placeholder="100 to 1,000,000 sq ft"
          />
        </div>

        {form.propertyType !== "plot" && (
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Furnishing
            </label>
            <select
              name="furnishing"
              value={form.furnishing}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            >
              <option value="furnished">Furnished</option>
              <option value="semi-furnished">Semi-furnished</option>
              <option value="unfurnished">Unfurnished</option>
            </select>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Listing type
          </label>
          <select
            name="listingType"
            value={form.listingType}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
          >
            <option value="sale">For sale</option>
            <option value="rent">For rent</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Amenities
          </label>
          <input
            name="amenities"
            value={form.amenities}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500 focus:bg-white"
            placeholder="Parking, Swimming Pool, Garden"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Property images
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImagesChange}
            className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3"
          />
          <p className="mt-2 text-sm text-slate-500">
            {images.length} / {MAX_PROPERTY_IMAGES} photos selected
          </p>
        </div>

        {error && (
          <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-slate-900 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Submitting..." : "Submit property"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SellPage;
