import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { verifyEmail, resendVerificationCode } = useAuth();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [verificationToken, setVerificationToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(
    location.state?.resendCooldown || 0,
  );
  const sellerApprovalMessage = location.state?.sellerApprovalMessage || "";

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setTimeout(() => {
      setResendCooldown((remaining) => Math.max(remaining - 1, 0));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await verifyEmail(email, verificationToken);
      setSuccess(response.message || "Email verified successfully.");
      if (response.requiresApproval) return;
      setTimeout(() => navigate("/login", { state: { email } }), 800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Verification failed. Check the code and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setResending(true);
    try {
      const response = await resendVerificationCode(email);
      setSuccess(response.message || "A new verification code has been sent.");
      setVerificationToken("");
      setResendCooldown(response.resendCooldownSeconds || 60);
    } catch (err) {
      const retryAfter = err.response?.data?.retryAfterSeconds;
      if (retryAfter) setResendCooldown(retryAfter);
      setError(
        err.response?.data?.message ||
          "Unable to resend the code. Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Verify your email</h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter the six-digit code sent to your email address.
        </p>
      </div>

      {sellerApprovalMessage && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {sellerApprovalMessage}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Verification code
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={verificationToken}
            onChange={(event) =>
              setVerificationToken(event.target.value.replace(/\D/g, ""))
            }
            required
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-center text-xl tracking-[0.35em] outline-none transition focus:border-emerald-500 focus:bg-white"
            placeholder="000000"
          />
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          {loading ? "Verifying..." : "Verify email"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || loading || !email.trim() || resendCooldown > 0}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          {resending
            ? "Sending new code..."
            : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : "Resend verification code"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already verified?{" "}
        <Link to="/login" className="font-semibold text-emerald-600">
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default VerifyEmailPage;
