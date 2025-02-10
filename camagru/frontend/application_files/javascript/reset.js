export function setResetPasswordView(container, token) {
    container.innerHTML = `
        <h2>Reset Password</h2>
        <input type="password" id="newPassword" placeholder="New password" required>
        <button id="resetBtn">Reset Password</button>
        <p id="message"></p>
        <a href=#login class="btn">Back to Log in</a>
    `;

    document.getElementById("resetBtn").addEventListener("click", async () => {
        const password = document.getElementById("newPassword").value;

        if (!password) {
            document.getElementById("message").textContent = "Please enter a new password.";
            return;
        }

        try {
            const response = await fetch("/api/users/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            });

            const data = await response.json();
            document.getElementById("message").textContent = data.message || "Password reset successful!";
        } catch (error) {
            document.getElementById("message").textContent = "Error resetting password.";
        }
    });
}
