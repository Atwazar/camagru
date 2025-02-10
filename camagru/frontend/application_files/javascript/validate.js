export function setValidateAccountView(container, token = null) {
    if (!token) {
        showError("Invalid or missing verification link.");
        return;
    }

    fetch(`/api/users/validate-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showError("Invalid or expired verification link.");
        } else {
            showSuccess("Your account has been successfully verified!");
        }
    })
    .catch(() => {
        showError("An error occurred while verifying your account.");
    });

    function showSuccess(message) {
        container.innerHTML = `
            <p class="success">${message}</p>
            <a href="#login" class="btn">Go to Login</a>
        `;
    }

    function showError(message) {
        container.innerHTML = `
            <p class="error">${message}</p>
            <a href="#register" class="btn">Register</a>
        `;
    }
}
