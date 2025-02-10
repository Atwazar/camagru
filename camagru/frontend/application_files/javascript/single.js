import { fetchWithToken } from "./fetch.js";

export async function setSinglePhotoView(container, photoId) {
    const response = await fetchWithToken(`/api/photos/${photoId}`);
    const photo = await response.json();

    container.innerHTML = `
        <div class="single-photo-container">
            <div class="photo-section">
                <img src="${photo.photo_url}" alt="Photo by ${photo.user_username}" class="single-photo">
            </div>
            <div class="comments-section">
                <h3>Comments</h3>
                <div class="comments-list">
                    ${photo.comments.map(comment => `
                        <div class="comment">
                            <strong>${comment.username}</strong>: ${comment.content}
                        </div>
                    `).join('')}
                </div>
                <textarea id="commentInput" placeholder="Write a comment..."></textarea>
                <button id="postCommentButton" class="comment-button">Post</button>
            </div>
        </div>
    `;

    document.getElementById("postCommentButton").addEventListener("click", async () => {
        const commentText = document.getElementById("commentInput").value.trim();
        if (commentText) {
            const response = await fetchWithToken(`/api/photos/${photoId}/comments`, JSON.stringify({ text: commentText }), "POST");
            if (response.ok) {
                setSinglePhotoView(container, photoId);
            } else {
                console.error("Error posting comment");
            }
        }
    });
}
