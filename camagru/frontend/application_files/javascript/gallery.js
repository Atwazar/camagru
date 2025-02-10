import { fetchWithToken } from "./fetch.js";
import { setNavbarHtml } from "./app.js";

export async function setGalleryView(container) {
    const response = await fetchWithToken('/api/photos');
    const photos = await response.json();
    container.innerHTML = '';

    for (let photo of photos) {
        const photoElement = document.createElement('div');
        photoElement.classList.add('photo-card');

        const photoLink = document.createElement('a');
        photoLink.href = `#single-picture/${photo.id}`;

        const photoImg = document.createElement('img');
        photoImg.src = photo.photo_url;
        photoImg.alt = `Photo by ${photo.user_username}`;

        photoLink.appendChild(photoImg);
        photoElement.appendChild(photoLink);

        const likeBar = document.createElement('div');
        likeBar.classList.add('like-bar');

        const likeCount = document.createElement('span');
        likeCount.textContent = `${photo.likes_count} Likes`;
        likeBar.appendChild(likeCount);

        const likeButton = document.createElement('button');
        likeButton.textContent = photo.is_liked ? '💔 I don\'t like it anymore' : '❤️ Like';
        likeButton.classList.add('like-button');
        likeButton.onclick = () => toggleLike(photo.id, photo.is_liked, container);
        likeBar.appendChild(likeButton);

        if (photo.is_owner) {
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '🗑️ Delete';
            deleteButton.classList.add('delete-button');
            deleteButton.onclick = () => deletePhoto(photo.id, container);
            likeBar.appendChild(deleteButton);

            const setProfileButton = document.createElement('button');
            setProfileButton.textContent = '🖼️ Set as Profile Picture';
            setProfileButton.classList.add('profile-button');
            setProfileButton.onclick = () => setProfilePicture(photo.id, container);
            likeBar.appendChild(setProfileButton);
        }

        photoElement.appendChild(likeBar);
        container.appendChild(photoElement);
    }
}

async function toggleLike(photoId, isLiked, container) {
    const response = isLiked 
        ? await fetchWithToken(`/api/photos/like/${photoId}`, null, "DELETE") 
        : await fetchWithToken('/api/photos/like', JSON.stringify({ photoId }), "POST");

    if (response.ok) {
        await setGalleryView(container);
    } else {
        console.error('Liking Error');
    }
}

async function deletePhoto(photoId, container) {
    const response = await fetchWithToken(`/api/photos/${photoId}`, null, "DELETE");

    if (response.ok) {
        await setGalleryView(container);
    } else {
        console.error('Suppression Error');
    }
}

async function setProfilePicture(photoId, container) {
    const response = await fetchWithToken('/api/users/profile-picture', JSON.stringify({ photoId }), "PUT");

    if (response.ok) {
        const response = await fetchWithToken('/api/users/getuser/');
		const data = await response.json();
        const user = data.user;
        setNavbarHtml(user);
        await setGalleryView(container);
    } else {
        console.error('Error while change of profile picture');
    }
}
