import { fetchWithToken } from "./fetch.js";

export async function setAddNewPictureView(container) {
    container.innerHTML = `
        <div class="picture-view">
            <div class="camera-container">
                <video id="webcam" autoplay></video>
                <canvas id="photoCanvas"></canvas>
                <img id="overlay" class="hidden" />
            </div>

            <div class="controls">
                <div class="accessories">
                    <button class="accessory" data-src="/uploads/assets/hat.png">🎩 Chapeau</button>
                    <button class="accessory" data-src="/uploads/assets/glasses.png">🕶 Lunettes</button>
                    <button class="accessory" data-src="/uploads/assets/mustache.png">👨 Moustache</button>
                </div>
                <input type="file" id="fileInput" accept="image/*" class="hidden">
                <button id="uploadButton">📂 Importer une photo</button>
                <button id="captureButton" disabled>📸 Prendre la photo</button>
            </div>

            <!-- 🖼 Galerie de l’utilisateur -->
            <div class="gallery">
                <h3>Mes Photos</h3>
                <div id="userPhotos"></div>
            </div>
        </div>
    `;

    const webcam = document.getElementById("webcam");
    const canvas = document.getElementById("photoCanvas");
    const overlay = document.getElementById("overlay");
    const captureButton = document.getElementById("captureButton");
    const fileInput = document.getElementById("fileInput");
    const uploadButton = document.getElementById("uploadButton");
    let selectedAccessory = null;

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => { webcam.srcObject = stream; })
        .catch(err => console.error("Erreur accès caméra:", err));

    document.querySelectorAll(".accessory").forEach(button => {
        button.addEventListener("click", () => {
            selectedAccessory = button.dataset.src;
            overlay.src = selectedAccessory;
            overlay.classList.remove("hidden");
            captureButton.disabled = false;
        });
    });

    captureButton.addEventListener("click", () => {
        const ctx = canvas.getContext("2d");
        canvas.width = webcam.videoWidth;
        canvas.height = webcam.videoHeight;

        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);

        if (selectedAccessory) {
            ctx.drawImage(overlay, 50, 50, 150, 150);
        }

        const imageData = canvas.toDataURL("image/png");
        uploadPhoto(imageData, selectedAccessory);
    });

    uploadButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", event => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => uploadPhoto(e.target.result, null);
            reader.readAsDataURL(file);
        }
    });

    loadUserPhotos();
}

async function uploadPhoto(imageData, accessoryUrl) {
    const response = await fetchWithToken("/api/photos", JSON.stringify({ 
        photo: imageData, 
        accessory: accessoryUrl 
    }), "POST");

    if (response.ok) {
        console.log("Photo ajoutée !");
        loadUserPhotos();
    } else {
        console.error("Erreur d'upload");
    }
}

async function loadUserPhotos() {
    const response = await fetchWithToken("/api/photos?mine=true");
    const photos = await response.json();
    const gallery = document.getElementById("userPhotos");
    gallery.innerHTML = photos.map(photo => `
        <div class="photo-item">
            <img src="${photo.photo_url}" class="user-photo">
            ${photo.accessory_url ? `<img src="${photo.accessory_url}" class="accessory-preview">` : ""}
        </div>
    `).join("");
}
