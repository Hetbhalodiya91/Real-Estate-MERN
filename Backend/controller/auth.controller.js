import User from "../model/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../util/sendEmail.js";
import crypto from "crypto";

const sellerApprovalMessage =
  "Your account is created successfully, but it needs admin approval before you sign in, so kindly wait 1-2 days for your verification.";

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    console.log(req.body);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomInt(100000, 1000000).toString();
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      isApproved: role === "seller" ? false : true,
      verificationToken,
      verificationCodeSentAt: new Date(),
    });

    await user.save();
    try {
      await sendEmail({
        to: req.body.email,
        subject: "Email Verification",
        text: `
        <p>Your verification code is <strong>${verificationToken}</strong></p>
        <p>Please use this code to verify your email address.</p>
    `,
      });
    } catch (err) {
      console.error("Failed to send verification email:", err);
    }

    res.status(201).json({
      message:
        role === "seller"
          ? sellerApprovalMessage
          : "User registered successfully. Please check your email for verification instructions.",
      requiresApproval: role === "seller",
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
      resendCooldownSeconds: 60,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const resendVerificationCode = async (req, res) => {
  try {
    const email = req.body.email?.trim();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user || user.isVerified) {
      return res.status(200).json({
        message:
          "If an unverified account exists for that email, a new code will be sent.",
      });
    }

    const cooldownMs = 60 * 1000;
    const lastSentAt = user.verificationCodeSentAt?.getTime() || 0;
    const retryAfterSeconds = Math.ceil(
      (cooldownMs - (Date.now() - lastSentAt)) / 1000,
    );
    if (retryAfterSeconds > 0) {
      return res.status(429).json({
        message: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
        retryAfterSeconds,
      });
    }

    const previousToken = user.verificationToken;
    const previousSentAt = user.verificationCodeSentAt;
    user.verificationToken = crypto.randomInt(100000, 1000000).toString();
    user.verificationCodeSentAt = new Date();
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        subject: "Email Verification",
        text: `
          <p>Your verification code is <strong>${user.verificationToken}</strong></p>
          <p>Please use this code to verify your email address.</p>
        `,
      });
    } catch (error) {
      user.verificationToken = previousToken;
      user.verificationCodeSentAt = previousSentAt;
      await user.save();
      return res.status(500).json({
        message: "Could not send verification email. Please try again.",
      });
    }

    return res.status(200).json({
      message: "A new verification code has been sent to your email.",
      resendCooldownSeconds: 60,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to resend verification code",
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    if (user.isBlock) {
      return res
        .status(403)
        .json({ message: "Your account is blocked. Please contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    if (user.role === "seller" && !user.isApproved) {
      return res.status(403).json({ message: sellerApprovalMessage });
    }
    if (!user.isVerified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { email, verificationToken } = req.body;
    if (!email || !verificationToken) {
      return res
        .status(400)
        .json({ message: "Email and verification token are required" });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid verification token" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }
    console.log(user.verificationToken);
    if (user.verificationToken !== verificationToken) {
      return res.status(400).json({ message: "Invalid verification token" });
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationCodeSentAt = undefined;
    await user.save();
    const requiresApproval = user.role === "seller" && !user.isApproved;
    res.status(200).json({
      message: requiresApproval
        ? "Your email is verified. Your account still needs admin approval before you sign in; please wait 1-2 days for verification."
        : "Email verified successfully",
      requiresApproval,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(email);
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "No user found with that email address" });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.resetPasswordExpire = resetPasswordExpire;
    await user.save();

    const clientUrl = "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
    const message = `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset. Please click on the link below to reset your password:</p>
            <a href="${resetUrl}" clicktracking="off">${resetUrl}</a>
            <p>This link will expire in 15 minutes.</p>
        `;

    try {
      await sendEmail({
        to: user.email,
        subject: "Password Reset - Real Estate Platform",
        text: message,
      });
      res
        .status(200)
        .json({ message: "Password reset email sent", success: true });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res
        .status(500)
        .json({ message: "Could not send email", success: false });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { resetToken } = req.params;
    const { newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res
        .status(400)
        .json({ message: "Reset token and new password are required" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
