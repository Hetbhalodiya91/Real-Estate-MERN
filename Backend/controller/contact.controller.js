import Contact from "../model/contact.model.js";
import sendEmail from "../util/sendEmail.js";

export const createContact = async (req, res) => {
  try {
    const { name, email, phone, role, message } = req.body;
    const contact = new Contact({ name, email, phone, role, message });

    await contact.save();

    // Notify Admin via Brevo
    const adminEmail = process.env.EMAIL_USER;
    const adminMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                <h2 style="color: #0d9488;">New Contact Request</h2>
                <p>You have received a new message from the platform.</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone || "N/A"}</p>
                    <p><strong>Role:</strong> ${role}</p>
                    <p style="margin-top: 15px;"><strong>Message:</strong></p>
                    <p style="font-style: italic; color: #475569;">"${message}"</p>
                </div>
                </div>
            </div>
        `;

    try {
      await sendEmail({
        to: adminEmail,
        subject: `New Contact Message from ${name}`,
        text: adminMessage,
      });
    } catch (err) {
      console.log("Admin notification email failed: ", err.message);
    }
    res.status(201).json({
      success: true,
      message: "Message Sent successfully",
    });
  } catch (err) {
    console.log("Contact Error", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to send message",
    });
  }
};

export const getAllContact = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      contacts,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contacts",
    });
  }
};
