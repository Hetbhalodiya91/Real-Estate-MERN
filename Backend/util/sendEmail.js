
const sendEmail = async ({ to, subject, text }) => {
    try {
        const BREVO_API_K = process.env.BREVO_API_KEY?.trim();
        const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();

        if (!BREVO_API_K || !senderEmail) {
            throw new Error("BREVO_API_KEY and BREVO_SENDER_EMAIL must be configured");
        }

        if (BREVO_API_K.startsWith("xsmtpsib-")) {
            throw new Error("BREVO_API_KEY must be a Brevo API key starting with xkeysib-, not an SMTP key");
        }

        if (!to || !subject || !text) {
            throw new Error("Email recipient, subject, and content are required");
        }

        const data = {
            sender: {
                name: "Real Estate Management",
                email: senderEmail
            },
            to: [
                {
                    email: to
                }
            ],
            subject,
            htmlContent: text
        };

        const response = await fetch(
            "https://api.brevo.com/v3/smtp/email",
            {
                method: "POST",
                headers: {
                    "api-key": BREVO_API_K,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            }
        );

        const result = await response.json();

        console.log("Sending email to:", to);

        if (response.ok) {
            console.log("Email sent successfully:", result);
            return result;
        }

        throw new Error(result.message || "Failed to send email");
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

export default sendEmail;