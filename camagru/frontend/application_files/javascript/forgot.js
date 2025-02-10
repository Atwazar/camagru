export function setForgotPasswordView(container) {
    container.innerHTML = `
        <h2>Forgot Password</h2>
        <p>Enter your email to receive a reset link:</p>
        <input type="email" id="emailInput" placeholder="Your email" required>
        <button id="sendResetBtn">Send Reset Link</button>
        <p id="message"></p>
    `;

    document.getElementById("sendResetBtn").addEventListener("click", async () => {
        const email = document.getElementById("emailInput").value;
        if (!email) {
            document.getElementById("message").textContent = "Please enter your email.";
            return;
        }

        try {
            const response = await fetch("/api/users/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            document.getElementById("message").textContent = data.message || "Check your email for a reset link.";
        } catch (error) {
            document.getElementById("message").textContent = "Error sending reset link.";
        }
    });
}
